/**
 * useWebRTC — Be-Live Real-Time Calls
 * Full WebRTC implementation with Supabase Realtime signaling.
 * Supports audio and video calls between two users.
 *
 * Signaling protocol (via Supabase broadcast):
 *   channel: `call:${[uid1, uid2].sort().join(':')}`
 *   messages: offer | answer | ice_candidate | hangup | reject
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface CallerInfo {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

// ── ICE Server Config ──────────────────────────────────────────────
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// ── Types ──────────────────────────────────────────────────────────
export type CallStatus =
  | 'idle'        // no call
  | 'calling'     // outgoing, waiting for answer
  | 'incoming'    // incoming, waiting for user to accept
  | 'connecting'  // answer received, ICE connecting
  | 'connected'   // fully connected
  | 'ended';      // call finished

export interface RemoteUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export interface WebRTCState {
  status: CallStatus;
  callType: 'audio' | 'video';
  remoteUser: RemoteUser | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  error: string | null;
}

interface SignalPayload {
  type: 'offer' | 'answer' | 'ice_candidate' | 'hangup' | 'reject';
  from: string;
  fromName: string;
  fromUsername: string;
  fromAvatar: string;
  callType: 'audio' | 'video';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// Callback fired when any call terminates so the consumer can persist to DB
export interface CallEndedRecord {
  remoteUserId:   string;
  remoteUserName: string;
  remoteAvatar:   string;
  callType:       'audio' | 'video';
  status:         'completed' | 'missed' | 'declined' | 'failed';
  duration:       number; // seconds
}

// ── Hook ──────────────────────────────────────────────────────────
export function useWebRTC(
  currentUser: CallerInfo | null,
  onCallEnd?: (record: CallEndedRecord) => void,
  onCallStart?: (info: { remoteUserId: string; callType: 'audio' | 'video' }) => void
) {
  const currentUserId = currentUser?.id ?? null;
  // State
  const [state, setState] = useState<WebRTCState>({
    status: 'idle',
    callType: 'audio',
    remoteUser: null,
    isMuted: false,
    isVideoOff: false,
    callDuration: 0,
    error: null,
  });

  // Refs — do NOT trigger re-renders
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteUserRef    = useRef<RemoteUser | null>(null);
  const callTypeRef      = useRef<'audio' | 'video'>('audio');
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const callStartTimeRef = useRef<number | null>(null); // epoch ms when 'connected'

  // ── Helpers ────────────────────────────────────────────────────
  const channelName = useCallback(
    (otherUserId: string) =>
      `call:${[currentUserId, otherUserId].sort().join(':')}`,
    [currentUserId]
  );

  const updateState = useCallback((partial: Partial<WebRTCState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    callStartTimeRef.current = Date.now(); // record wall-clock start
    timerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    // Stop timer
    stopTimer();

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    // Close peer connection
    pcRef.current?.close();
    pcRef.current = null;

    // Remove signaling channel
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    remoteStreamRef.current = null;
    pendingCandidates.current = [];
  }, [stopTimer]);

  // ── Create RTCPeerConnection ───────────────────────────────────
  const createPeerConnection = useCallback(
    (otherUserId: string) => {
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      // Send ICE candidates via signaling
      pc.onicecandidate = ({ candidate }) => {
        if (!candidate || !channelRef.current) return;
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice_candidate',
            from: currentUserId,
            fromName: '',
            fromUsername: '',
            fromAvatar: '',
            callType: callTypeRef.current,
            candidate: candidate.toJSON(),
          } satisfies SignalPayload,
        });
      };

      // Receive remote stream
      pc.ontrack = ({ streams }) => {
        if (streams[0]) {
          remoteStreamRef.current = streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = streams[0];
          }
        }
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'connected') {
          updateState({ status: 'connected' });
          startTimer();
        } else if (s === 'failed' || s === 'disconnected' || s === 'closed') {
          if (state.status !== 'idle' && state.status !== 'ended') {
            endCall();
          }
        }
      };

      return pc;
    },
    [currentUserId, startTimer, updateState]
  );

  // ── Subscribe to signaling channel ─────────────────────────────
  const subscribeToChannel = useCallback(
    (otherUserId: string, onSignal: (payload: SignalPayload) => void) => {
      if (!supabase || !isSupabaseConfigured) return;
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const ch = supabase
        .channel(channelName(otherUserId))
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          // Only process messages not from ourselves
          if (payload?.from !== currentUserId) {
            onSignal(payload as SignalPayload);
          }
        })
        .subscribe();

      channelRef.current = ch;
    },
    [channelName, currentUserId]
  );

  // ── Global incoming call listener ──────────────────────────────
  // Listens on a personal channel for any incoming offers
  useEffect(() => {
    if (!currentUserId || !supabase || !isSupabaseConfigured) return;

    const incomingCh = supabase
      .channel(`incoming:${currentUserId}`)
      .on('broadcast', { event: 'call_invite' }, ({ payload }) => {
        const p = payload as SignalPayload & { to: string };
        if (p.type !== 'offer' || p.from === currentUserId) return;
        // Ignore if already in a call
        if (state.status !== 'idle') return;

        const caller: RemoteUser = {
          id: p.from,
          name: p.fromName,
          username: p.fromUsername,
          avatar: p.fromAvatar,
        };
        remoteUserRef.current = caller;
        callTypeRef.current = p.callType;

        // Store the offer SDP to use when accepting
        pendingCandidates.current = [];
        (window as any).__pendingOffer = p.sdp;
        (window as any).__callerId = p.from;

        updateState({
          status: 'incoming',
          callType: p.callType,
          remoteUser: caller,
          error: null,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incomingCh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ── Start outgoing call ────────────────────────────────────────
  const startCall = useCallback(
    async (targetUser: RemoteUser, type: 'audio' | 'video') => {
      if (!currentUserId || !supabase) return;
      try {
        // Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video' ? { width: 1280, height: 720 } : false,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current && type === 'video') {
          localVideoRef.current.srcObject = stream;
        }

        remoteUserRef.current = targetUser;
        callTypeRef.current = type;
        updateState({
          status: 'calling',
          callType: type,
          remoteUser: targetUser,
          isMuted: false,
          isVideoOff: false,
          callDuration: 0,
          error: null,
        });

        if (onCallStart) {
          onCallStart({ remoteUserId: targetUser.id, callType: type });
        }

        // Subscribe to signaling channel
        subscribeToChannel(targetUser.id, async (payload) => {
          if (payload.type === 'answer' && pcRef.current) {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(payload.sdp!)
            );
            updateState({ status: 'connecting' });
            // Flush pending candidates
            for (const c of pendingCandidates.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            }
            pendingCandidates.current = [];
          } else if (payload.type === 'ice_candidate' && pcRef.current) {
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate!));
            } else {
              pendingCandidates.current.push(payload.candidate!);
            }
          } else if (payload.type === 'hangup' || payload.type === 'reject') {
            endCall();
          }
        });

        // Create offer
        const pc = createPeerConnection(targetUser.id);
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === 'video',
        });
        await pc.setLocalDescription(offer);

        // Send offer via personal incoming channel of the target
        supabase.channel(`incoming:${targetUser.id}`).send({
          type: 'broadcast',
          event: 'call_invite',
          payload: {
            type: 'offer',
            from: currentUserId,
            fromName: currentUser?.name ?? '',
            fromUsername: currentUser?.username ?? '',
            fromAvatar: currentUser?.avatar ?? '',
            callType: type,
            sdp: offer,
          } satisfies SignalPayload,
        });
      } catch (err: any) {
        let error = 'Could not start call.';
        if (err?.name === 'NotAllowedError') error = 'Microphone/camera permission denied. Please allow access in your browser settings.';
        else if (err?.name === 'NotFoundError') error = 'No camera/microphone found on this device.';
        updateState({ status: 'idle', error });
        cleanup();
      }
    },
    [currentUserId, subscribeToChannel, createPeerConnection, cleanup, updateState]
  );

  // ── Accept incoming call ───────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!currentUserId || !supabase) return;
    const callerId: string = (window as any).__callerId;
    const offerSdp: RTCSessionDescriptionInit = (window as any).__pendingOffer;
    if (!callerId || !offerSdp) return;

    try {
      const type = callTypeRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: 1280, height: 720 } : false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      updateState({ status: 'connecting' });

      // Subscribe to signaling channel
      subscribeToChannel(callerId, async (payload) => {
        if (payload.type === 'ice_candidate' && pcRef.current) {
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate!));
          } else {
            pendingCandidates.current.push(payload.candidate!);
          }
        } else if (payload.type === 'hangup') {
          endCall();
        }
      });

      // Create peer connection and set remote description (offer)
      const pc = createPeerConnection(callerId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Flush any ICE candidates that arrived before accept
      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates.current = [];

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'answer',
          from: currentUserId,
          fromName: '',
          fromUsername: '',
          fromAvatar: '',
          callType: type,
          sdp: answer,
        } satisfies SignalPayload,
      });
    } catch (err: any) {
      let error = 'Could not accept call.';
      if (err?.name === 'NotAllowedError') error = 'Camera/microphone permission denied.';
      updateState({ status: 'idle', error });
      cleanup();
    }
  }, [currentUserId, subscribeToChannel, createPeerConnection, cleanup, updateState]);

  // ── Reject incoming call ───────────────────────────────────────
  const rejectCall = useCallback(() => {
    const callerId: string = (window as any).__callerId;
    if (callerId && supabase) {
      supabase.channel(`incoming:${callerId}`).send({
        type: 'broadcast',
        event: 'call_invite',
        payload: { type: 'reject', from: currentUserId } as any,
      });
    }
    // Fire callback: this user declined the incoming call
    if (remoteUserRef.current && onCallEnd) {
      onCallEnd({
        remoteUserId:   remoteUserRef.current.id,
        remoteUserName: remoteUserRef.current.name,
        remoteAvatar:   remoteUserRef.current.avatar,
        callType:       callTypeRef.current,
        status:         'declined',
        duration:       0,
      });
    }
    callStartTimeRef.current = null;
    (window as any).__pendingOffer = null;
    (window as any).__callerId = null;
    updateState({ status: 'idle', remoteUser: null });
  }, [currentUserId, onCallEnd, updateState]);

  // ── End active call ────────────────────────────────────────────
  const endCall = useCallback((overrideStatus?: 'completed' | 'missed' | 'declined' | 'failed') => {
    const remoteId   = remoteUserRef.current?.id;
    const remoteName = remoteUserRef.current?.name ?? '';
    const remoteAvt  = remoteUserRef.current?.avatar ?? '';
    const cType      = callTypeRef.current;
    // Compute real duration from wall-clock (more accurate than state counter)
    const duration = callStartTimeRef.current
      ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
      : 0;
    callStartTimeRef.current = null;

    // Determine status
    const callStatus = overrideStatus ?? (duration > 0 ? 'completed' : 'missed');

    // Fire callback so consumer can persist to DB
    if (remoteId && onCallEnd) {
      onCallEnd({
        remoteUserId:   remoteId,
        remoteUserName: remoteName,
        remoteAvatar:   remoteAvt,
        callType:       cType,
        status:         callStatus,
        duration,
      });
    }

    if (remoteId && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'hangup',
          from: currentUserId,
          fromName: '',
          fromUsername: '',
          fromAvatar: '',
          callType: cType,
        } satisfies SignalPayload,
      });
    }
    cleanup();
    updateState({
      status: 'ended',
      callDuration: 0,
    });
    // Brief "ended" flash then go idle
    setTimeout(() => updateState({ status: 'idle', remoteUser: null, error: null }), 1500);
  }, [cleanup, currentUserId, onCallEnd, updateState]);

  // ── Toggle mute ────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
    }
  }, []);

  // ── Toggle video ───────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
    }
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => () => { cleanup(); }, [cleanup]);

  return {
    state,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    localVideoRef,
    remoteVideoRef,
    updateCallerInfo: (name: string, username: string, avatar: string) => {
      // Patch the caller info on outgoing invites
      (window as any).__callerName = name;
      (window as any).__callerUsername = username;
      (window as any).__callerAvatar = avatar;
    },
  };
}
