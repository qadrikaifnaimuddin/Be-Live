/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  X, 
  Send, 
  Heart, 
  Sparkles, 
  Users, 
  Radio, 
  Flame, 
  Volume2, 
  VolumeX, 
  Share2, 
  User as UserIcon,
  RotateCw,
  Monitor,
  Check,
  ShieldCheck,
  Award,
  Clock,
  MessageSquare
} from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  mode: 'broadcast' | 'view';
  activeStreamId?: string;
  initialHost?: User;
  initialTitle?: string;
  streamType?: 'video' | 'audio';
  onUpdateProfile?: (updatedFields: Partial<User>) => void;
  onViewProfile?: (userId: string) => void;
  onToggleFollow?: (userId: string, isPrivate?: boolean) => void;
}

interface LiveMessage {
  id: string;
  senderId: string;
  username: string;
  avatar: string;
  text: string;
  isSystem?: boolean;
}

interface FloatingHeart {
  id: string;
  emoji: string;
  x: number;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const HEART_EMOJIS = ['❤️', '💖', '🔥', '✨', '👏', '😍', '🎉', '💯'];

export default function LiveStreamModal({
  isOpen,
  onClose,
  currentUser,
  mode,
  activeStreamId,
  initialHost,
  initialTitle,
  streamType = 'video',
  onViewProfile,
  onToggleFollow
}: LiveStreamModalProps) {
  // Broadcasting Setup States
  const [setupStep, setSetupStep] = useState<'config' | 'live'>('config');
  const [streamTitle, setStreamTitle] = useState('');
  const [liveType, setLiveType] = useState<'video' | 'audio'>(streamType);
  
  // Running Stream States
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(activeStreamId || null);
  const [isLive, setIsLive] = useState(false);
  const [liveDuration, setLiveDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(1);
  const [peakViewers, setPeakViewers] = useState(1);
  const [totalHearts, setTotalHearts] = useState(0);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  
  // Media Controls & Streams
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  // Local & Remote Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Video Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Realtime Broadcast Channels
  const signalChannelRef = useRef<any>(null);

  // End Summary Screen State
  const [showSummary, setShowSummary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Host Info
  const hostUser = mode === 'broadcast' ? currentUser : (initialHost || currentUser);
  const isHostAnon = !!hostUser.isAnonymousMode;
  const hostNameVal = isHostAnon ? (hostUser.anonUsername || 'Anonymous Host') : hostUser.name;
  const hostUsernameVal = isHostAnon ? (hostUser.anonUsername || 'Anonymous') : hostUser.username;
  const hostAvatarVal = isHostAnon ? (hostUser.anonEmoji || '🕵️‍♂️') : hostUser.avatar;

  const displayTitle = mode === 'broadcast' 
    ? (streamTitle.trim() || 'My Live Session 🌟') 
    : (initialTitle || 'Live Session 🌟');

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setSetupStep(mode === 'broadcast' ? 'config' : 'live');
      setIsLive(mode === 'view');
      setLiveDuration(0);
      setViewerCount(1);
      setPeakViewers(1);
      setTotalHearts(0);
      setMessages([
        {
          id: 'sys_welcome',
          senderId: 'system',
          username: 'System',
          avatar: '',
          text: mode === 'broadcast' 
            ? 'Configure your live stream settings and click Go Live!' 
            : `Joined ${hostNameVal}'s live stream ✨`,
          isSystem: true
        }
      ]);
      setFloatingHearts([]);
      setIsScreenSharing(false);
      setMicOn(true);
      setCameraOn(true);
      setSpeakerOn(true);
      setShowSummary(false);
      setCurrentStreamId(activeStreamId || null);
    } else {
      cleanUpStream();
    }
  }, [isOpen, mode, activeStreamId]);

  // Clean up WebRTC & Media streams
  const cleanUpStream = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (signalChannelRef.current) {
      if (isSupabaseConfigured && supabase) supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
  };

  // Local camera media initialization when broadcasting
  useEffect(() => {
    if (isOpen && mode === 'broadcast' && liveType === 'video' && cameraOn) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      .then(stream => {
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        // Swap or add tracks to peer connection if active
        if (peerConnectionRef.current) {
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];
          const senders = peerConnectionRef.current.getSenders();
          
          if (videoTrack) {
            const vSender = senders.find(s => s.track?.kind === 'video');
            if (vSender) vSender.replaceTrack(videoTrack);
            else peerConnectionRef.current.addTrack(videoTrack, stream);
          }
          if (audioTrack) {
            const aSender = senders.find(s => s.track?.kind === 'audio');
            if (aSender) aSender.replaceTrack(audioTrack);
            else peerConnectionRef.current.addTrack(audioTrack, stream);
          }
        }
      })
      .catch(err => {
        console.warn("[LiveStream] Camera permission error:", err);
      });
    }

    return () => {
      // Do not destroy stream on facing toggle unless unmounting
    };
  }, [isOpen, mode, liveType, cameraFacing]);

  // Synchronize video refs
  useEffect(() => {
    const activeStream = localStreamRef.current || localStream;
    if (activeStream && localVideoRef.current) {
      localVideoRef.current.srcObject = activeStream;
    }
  }, [localStream, cameraOn]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.volume = 1.0;
    }
  }, [remoteStream]);

  // Live Timer Clock
  useEffect(() => {
    if (!isLive || showSummary) return;
    const timer = setInterval(() => {
      setLiveDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isLive, showSummary]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Setup WebRTC Broadcast/Viewer Connection
  const initializeWebRTC = (streamId: string) => {
    if (!isSupabaseConfigured || !supabase) return;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionRef.current = pc;

    // Attach local stream if broadcaster
    if (mode === 'broadcast') {
      const activeStream = localStreamRef.current || localStream;
      if (activeStream) {
        activeStream.getTracks().forEach(track => {
          pc.addTrack(track, activeStream);
        });
      }
    }

    // Capture remote stream if viewer
    pc.ontrack = (event) => {
      console.log("[LiveStream] ontrack event:", event.track.kind);
      const incoming = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      const updatedStream = new MediaStream(incoming.getTracks());
      setRemoteStream(updatedStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = updatedStream;
        remoteVideoRef.current.volume = 1.0;
        remoteVideoRef.current.play().catch(e => console.warn("Live stream video play error:", e));
      }
    };

    // Broadcast local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalChannelRef.current) {
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, from: currentUser.id }
        });
      }
    };

    // Signaling broadcast channel
    const signalCh = supabase.channel(`live-stream-${streamId}`);
    signalChannelRef.current = signalCh;

    signalCh
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.from !== currentUser.id && mode === 'view') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          signalCh.send({
            type: 'broadcast',
            event: 'answer',
            payload: { sdp: answer, from: currentUser.id }
          });
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.from !== currentUser.id && mode === 'broadcast') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from !== currentUser.id && payload.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn("ICE Candidate Error:", e);
          }
        }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages(prev => [...prev.slice(-49), payload]);
      })
      .on('broadcast', { event: 'heart' }, ({ payload }) => {
        setTotalHearts(prev => prev + 1);
        spawnFloatingHeart(payload.emoji);
      })
      .on('broadcast', { event: 'end-stream' }, () => {
        if (mode === 'view') {
          setMessages(prev => [
            ...prev,
            {
              id: `sys_ended_${Date.now()}`,
              senderId: 'system',
              username: 'System',
              avatar: '',
              text: 'The host has ended this live stream. Thank you for watching! 👋',
              isSystem: true
            }
          ]);
          setIsLive(false);
          setShowSummary(true);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && mode === 'broadcast') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signalCh.send({
            type: 'broadcast',
            event: 'offer',
            payload: { sdp: offer, from: currentUser.id }
          });
        }
      });
  };

  // Broadcaster starts live session
  const handleStartBroadcast = async () => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          host_id: currentUser.id,
          title: streamTitle.trim() || 'My Live Stream 🌟',
          stream_type: liveType,
          status: 'live',
          viewer_count: 1,
          peak_viewers: 1,
          total_hearts: 0
        })
        .select()
        .single();

      if (error) throw error;

      const streamId = data.id;
      setCurrentStreamId(streamId);
      setSetupStep('live');
      setIsLive(true);
      initializeWebRTC(streamId);
    } catch (err: any) {
      console.error("[LiveStream Start Error]:", err);
      alert("Could not start live stream: " + err.message);
    }
  };

  // End live broadcast
  const handleEndBroadcast = async () => {
    if (currentStreamId && isSupabaseConfigured && supabase && mode === 'broadcast') {
      await supabase
        .from('live_streams')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          peak_viewers: peakViewers,
          total_hearts: totalHearts
        })
        .eq('id', currentStreamId);

      if (signalChannelRef.current) {
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'end-stream',
          payload: {}
        });
      }
    }

    setIsLive(false);
    setShowSummary(true);
    cleanUpStream();
  };

  // Toggle Camera
  const toggleCamera = () => {
    const nextState = !cameraOn;
    setCameraOn(nextState);
    const activeStream = localStreamRef.current || localStream;
    if (activeStream) {
      const videoTrack = activeStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = nextState;
    }
  };

  // Toggle Mic
  const toggleMic = () => {
    const nextState = !micOn;
    setMicOn(nextState);
    const activeStream = localStreamRef.current || localStream;
    if (activeStream) {
      const audioTrack = activeStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = nextState;
    }
  };

  // Flip Camera Orientation
  const flipCamera = () => {
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Screen Share Toggle
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        if (peerConnectionRef.current && screenTrack) {
          const senders = peerConnectionRef.current.getSenders();
          const vSender = senders.find(s => s.track?.kind === 'video');
          if (vSender) vSender.replaceTrack(screenTrack);
        }
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          const activeStream = localStreamRef.current || localStream;
          if (activeStream && peerConnectionRef.current) {
            const camTrack = activeStream.getVideoTracks()[0];
            const senders = peerConnectionRef.current.getSenders();
            const vSender = senders.find(s => s.track?.kind === 'video');
            if (vSender && camTrack) vSender.replaceTrack(camTrack);
          }
        };
      } catch (e) {
        console.warn("Screen share cancelled:", e);
      }
    } else {
      setIsScreenSharing(false);
      const activeStream = localStreamRef.current || localStream;
      if (activeStream && peerConnectionRef.current) {
        const camTrack = activeStream.getVideoTracks()[0];
        const senders = peerConnectionRef.current.getSenders();
        const vSender = senders.find(s => s.track?.kind === 'video');
        if (vSender && camTrack) vSender.replaceTrack(camTrack);
      }
    }
  };

  // Send Chat Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    const isAnon = !!currentUser.isAnonymousMode;
    const msg: LiveMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      username: isAnon ? (currentUser.anonUsername || 'Anonymous') : currentUser.username,
      avatar: isAnon ? (currentUser.anonEmoji || '🕵️‍♂️') : currentUser.avatar,
      text: clean
    };

    setMessages(prev => [...prev.slice(-49), msg]);

    if (signalChannelRef.current) {
      signalChannelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: msg
      });
    }

    setInputText('');
  };

  // Send Floating Heart Reaction
  const handleSendHeart = (emoji = '❤️') => {
    setTotalHearts(prev => prev + 1);
    spawnFloatingHeart(emoji);

    if (signalChannelRef.current) {
      signalChannelRef.current.send({
        type: 'broadcast',
        event: 'heart',
        payload: { emoji, from: currentUser.id }
      });
    }
  };

  // Spawn floating heart particle
  const spawnFloatingHeart = (emoji: string) => {
    const id = `heart_${Date.now()}_${Math.random()}`;
    const x = Math.floor(Math.random() * 60) + 20; // 20% to 80% horizontal position
    setFloatingHearts(prev => [...prev.slice(-15), { id, emoji, x }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 2500);
  };

  // Copy Stream Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        id="live_stream_modal_overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/95 backdrop-blur-md p-0 sm:p-4 overflow-hidden"
      >
        <motion.div
          id="live_stream_modal_content"
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="w-full sm:max-w-5xl h-full sm:h-[85vh] bg-stone-900 border-0 sm:border border-stone-850 rounded-none sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl relative"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-850 bg-stone-900/60 shrink-0 z-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl">
                <Radio className="w-5 h-5 animate-pulse text-rose-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">{displayTitle}</h3>
                  {isLive && (
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {mode === 'broadcast' ? 'You are broadcasting' : `Hosted by @${hostUsernameVal}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLive && (
                <>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs font-bold text-neutral-300">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>{formatTime(liveDuration)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs font-bold text-neutral-300">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{viewerCount}</span>
                  </div>
                </>
              )}

              <button 
                onClick={() => {
                  if (isLive && mode === 'broadcast') {
                    if (confirm("End your live broadcast?")) handleEndBroadcast();
                  } else {
                    onClose();
                  }
                }}
                className="p-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-850 text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

            {/* Config Step (Broadcaster Setup) */}
            {mode === 'broadcast' && setupStep === 'config' && !showSummary && (
              <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto max-w-xl mx-auto space-y-6">
                <div className="space-y-6 text-left w-full">
                  <div className="text-center space-y-2 pt-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 p-0.5 mx-auto shadow-xl">
                      <div className="w-full h-full bg-stone-900 rounded-full flex items-center justify-center">
                        <Radio className="w-8 h-8 text-rose-400 animate-pulse" />
                      </div>
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Go Live on Be-Live</h2>
                    <p className="text-xs text-neutral-400">Broadcast your video or audio stream directly to all users real-time.</p>
                  </div>

                  {/* Title Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">Stream Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Late night chat & chill session ☕"
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-2xl text-xs text-white placeholder-neutral-500 outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>

                  {/* Mode Select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">Stream Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setLiveType('video')}
                        className={`p-4 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                          liveType === 'video' 
                            ? 'bg-rose-600/20 border-rose-500 text-white' 
                            : 'bg-stone-950 border-stone-850 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <Video className={`w-6 h-6 ${liveType === 'video' ? 'text-rose-400' : ''}`} />
                        <span className="text-xs font-bold">Video Cam Stream</span>
                      </button>

                      <button
                        onClick={() => setLiveType('audio')}
                        className={`p-4 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                          liveType === 'audio' 
                            ? 'bg-purple-600/20 border-purple-500 text-white' 
                            : 'bg-stone-950 border-stone-850 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <Mic className={`w-6 h-6 ${liveType === 'audio' ? 'text-purple-400' : ''}`} />
                        <span className="text-xs font-bold">Audio Lounge Stream</span>
                      </button>
                    </div>
                  </div>

                  {/* Incognito Notice */}
                  <div className="bg-stone-950/60 border border-stone-850 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-purple-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Incognito Mode</h4>
                        <p className="text-[10px] text-neutral-400">Broadcasting as {hostNameVal}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isHostAnon ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-stone-900 text-neutral-500'}`}>
                      {isHostAnon ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-850 w-full">
                  <button
                    onClick={handleStartBroadcast}
                    className="w-full py-4 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl uppercase tracking-widest active:scale-98 transition-transform cursor-pointer flex items-center justify-center gap-2 shadow-xl"
                  >
                    <Radio className="w-5 h-5" />
                    Start Live Stream
                  </button>
                </div>
              </div>
            )}

            {/* End Stream Performance Summary Screen */}
            {showSummary && (
              <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto max-w-xl mx-auto space-y-6">
                <div className="space-y-6 text-center w-full pt-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 mx-auto shadow-xl flex items-center justify-center text-white">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Stream Session Summary</h2>
                    <p className="text-xs text-neutral-400">Great broadcast! Here are your session statistics.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-stone-950 border border-stone-850 p-4 rounded-2xl space-y-1">
                      <Clock className="w-5 h-5 text-rose-500 mx-auto" />
                      <span className="text-base font-black text-white block">{formatTime(liveDuration)}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Duration</span>
                    </div>

                    <div className="bg-stone-950 border border-stone-850 p-4 rounded-2xl space-y-1">
                      <Users className="w-5 h-5 text-indigo-400 mx-auto" />
                      <span className="text-base font-black text-white block">{peakViewers}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Peak Viewers</span>
                    </div>

                    <div className="bg-stone-950 border border-stone-850 p-4 rounded-2xl space-y-1">
                      <Flame className="w-5 h-5 text-amber-400 mx-auto" />
                      <span className="text-base font-black text-white block">{totalHearts}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Hearts Received</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-850 w-full space-y-3">
                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-stone-800 hover:bg-stone-700 text-white font-extrabold text-sm rounded-2xl uppercase tracking-widest active:scale-98 transition-transform cursor-pointer"
                  >
                    Close Session
                  </button>
                </div>
              </div>
            )}

            {/* Active Running Stream View */}
            {((setupStep === 'live' && !showSummary) || (mode === 'view' && !showSummary)) && (
              <>
                {/* Media Screen Panel (Left Column on Desktop, Top on Mobile) */}
                <div className="flex-1 bg-stone-950 relative flex flex-col justify-center items-center overflow-hidden min-h-[220px] md:min-h-0">
                  
                  {/* Remote / Local Video Feeds */}
                  <video
                    ref={mode === 'broadcast' ? localVideoRef : remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={mode === 'broadcast'}
                    className={`w-full h-full object-cover ${mode === 'broadcast' ? 'scale-x-[-1]' : ''} ${
                      (mode === 'broadcast' && cameraOn && liveType === 'video') || (mode === 'view' && remoteStream) ? 'block' : 'hidden'
                    }`}
                  />

                  {/* Audio Mode or Camera Off Splash Screen */}
                  {((mode === 'broadcast' && (!cameraOn || liveType === 'audio')) || (mode === 'view' && !remoteStream)) && (
                    <div className="space-y-4 text-center p-6 z-10">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 p-1 mx-auto shadow-2xl animate-pulse">
                        {isHostAnon ? (
                          <div className="w-full h-full bg-stone-900 rounded-full flex items-center justify-center text-4xl">
                            {hostAvatarVal}
                          </div>
                        ) : (
                          <img 
                            src={hostAvatarVal || ''} 
                            className="w-full h-full rounded-full object-cover border-2 border-stone-900"
                          />
                        )}
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-white">@{hostUsernameVal}</h4>
                        <p className="text-xs text-neutral-400">{liveType === 'audio' ? 'Audio Lounge Session' : 'Video Feed Off'}</p>
                      </div>
                    </div>
                  )}

                  {/* Floating Hearts Animation Layer */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                    <AnimatePresence>
                      {floatingHearts.map(heart => (
                        <motion.div
                          key={heart.id}
                          initial={{ opacity: 1, y: '80%', x: `${heart.x}%`, scale: 0.8 }}
                          animate={{ opacity: 0, y: '10%', scale: 1.5 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 2.2, ease: "easeOut" }}
                          className="absolute text-3xl select-none"
                        >
                          {heart.emoji}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Media Controls Toolbar (Broadcaster & Viewer Controls) */}
                  <div className="absolute bottom-4 right-4 bg-stone-950/80 backdrop-blur-md border border-stone-850 p-2 rounded-2xl flex items-center gap-2 z-30 shadow-xl">
                    {mode === 'broadcast' && (
                      <>
                        <button
                          onClick={toggleCamera}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            cameraOn ? 'bg-rose-600 text-white' : 'bg-stone-900 text-neutral-400'
                          }`}
                          title="Toggle Camera"
                        >
                          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={toggleMic}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            micOn ? 'bg-rose-600 text-white' : 'bg-stone-900 text-neutral-400'
                          }`}
                          title="Toggle Microphone"
                        >
                          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={toggleScreenShare}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            isScreenSharing ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-neutral-400'
                          }`}
                          title="Share Screen"
                        >
                          <Monitor className="w-4 h-4" />
                        </button>

                        <button
                          onClick={flipCamera}
                          className="p-2 bg-stone-900 text-neutral-400 hover:text-white rounded-xl cursor-pointer"
                          title="Flip Camera"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {mode === 'view' && (
                      <button
                        onClick={() => setSpeakerOn(!speakerOn)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          speakerOn ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-neutral-400'
                        }`}
                        title="Toggle Sound"
                      >
                        {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={handleCopyLink}
                      className="p-2 bg-stone-900 text-neutral-400 hover:text-white rounded-xl cursor-pointer relative"
                      title="Share Stream"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Right Column: Real-time Live Chat & Reactions */}
                <div className="flex-1 flex flex-col overflow-hidden bg-stone-900/40 border-t md:border-t-0 md:border-l border-stone-850 md:max-w-md">
                  
                  {/* Chat Messages Feed */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 text-left">
                    {messages.map(msg => {
                      if (msg.isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-1.5">
                            <div className="px-3.5 py-1 bg-rose-500/10 border border-rose-500/20 text-[10.5px] font-bold text-rose-400 rounded-full text-center">
                              {msg.text}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className="flex items-start gap-2.5">
                          <img 
                            src={msg.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                            className="w-7 h-7 rounded-full object-cover border border-stone-800 shrink-0 mt-0.5"
                          />
                          <div className="space-y-0.5 max-w-[85%]">
                            <span className="text-[10px] font-black text-rose-400 tracking-wider">@{msg.username}</span>
                            <div className="px-3 py-2 bg-stone-950 border border-stone-850 rounded-2xl text-xs text-neutral-200 leading-relaxed">
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Reaction Buttons Bar */}
                  <div className="px-4 py-2 bg-stone-950/40 border-t border-stone-850 flex items-center gap-2 overflow-x-auto shrink-0">
                    {HEART_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleSendHeart(emoji)}
                        className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-850 rounded-xl text-sm transition-transform active:scale-125 cursor-pointer shrink-0"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Chat Text Input */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-stone-850 bg-stone-900/60 flex items-center gap-2 shrink-0">
                    <input 
                      type="text"
                      placeholder="Comment on live stream..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-stone-950 border border-stone-850 rounded-2xl text-xs text-white placeholder-neutral-500 outline-none focus:border-rose-500 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                        inputText.trim() 
                          ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer' 
                          : 'bg-stone-900 text-neutral-600 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
