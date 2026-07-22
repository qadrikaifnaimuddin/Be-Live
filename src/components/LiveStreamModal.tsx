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
  Plus,
  Play,
  ArrowLeft
} from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface ActiveLiveStream {
  id: string;
  host_id: string;
  title: string;
  stream_type: 'video' | 'audio';
  status: 'live' | 'ended';
  viewer_count: number;
  peak_viewers: number;
  total_hearts: number;
  created_at: string;
  hostProfile?: {
    id: string;
    username: string;
    name: string;
    avatar: string;
    is_anonymous_mode?: boolean;
    anon_username?: string;
    anon_emoji?: string;
  };
}

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  mode?: 'broadcast' | 'view' | 'browse';
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
  mode = 'browse',
  activeStreamId,
  initialHost,
  initialTitle,
  streamType = 'video',
  onViewProfile,
  onToggleFollow
}: LiveStreamModalProps) {
  // Discovery & Active Streams State
  const [activeStep, setActiveStep] = useState<'discovery' | 'config' | 'live' | 'summary'>('discovery');
  const [activeStreams, setActiveStreams] = useState<ActiveLiveStream[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);

  // Stream View Mode ('broadcast' when we host, 'view' when watching someone, 'browse' when discovering)
  const [streamMode, setStreamMode] = useState<'broadcast' | 'view' | 'browse'>('browse');
  const [selectedHostUser, setSelectedHostUser] = useState<User | null>(initialHost || null);

  // Broadcasting Setup States
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
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch all active live streams from Supabase
  const fetchActiveStreams = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setLoadingStreams(true);
    try {
      const { data: streams, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          hostProfile:profiles!live_streams_host_id_fkey(id, username, name, avatar, is_anonymous_mode, anon_username, anon_emoji)
        `)
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("[LiveStream Discovery Error]:", error);
      } else if (streams) {
        setActiveStreams(streams as any[]);
      }
    } catch (e) {
      console.warn("Failed to load active streams:", e);
    } finally {
      setLoadingStreams(false);
    }
  };

  // Realtime subscription for active streams discovery
  useEffect(() => {
    if (!isOpen) return;

    fetchActiveStreams();

    if (isSupabaseConfigured && supabase) {
      const discoveryCh = supabase
        .channel('live-streams-discovery-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_streams' },
          () => {
            fetchActiveStreams();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(discoveryCh);
      };
    }
  }, [isOpen]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      if (activeStreamId && initialHost) {
        // Direct View Mode
        setStreamMode('view');
        setSelectedHostUser(initialHost);
        setCurrentStreamId(activeStreamId);
        setStreamTitle(initialTitle || 'Live Stream 🌟');
        setLiveType(streamType);
        setActiveStep('live');
        setIsLive(true);
        initializeWebRTC(activeStreamId, 'view');
      } else if (mode === 'broadcast') {
        setStreamMode('broadcast');
        setActiveStep('config');
        setIsLive(false);
      } else {
        setStreamMode('browse');
        setActiveStep('discovery');
        setIsLive(false);
      }

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
          text: 'Welcome to Be-Live Streaming System! 🌟',
          isSystem: true
        }
      ]);
      setFloatingHearts([]);
      setIsScreenSharing(false);
      setMicOn(true);
      setCameraOn(true);
      setSpeakerOn(true);
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
    if (isOpen && streamMode === 'broadcast' && (activeStep === 'config' || activeStep === 'live') && liveType === 'video' && cameraOn) {
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

    return () => {};
  }, [isOpen, streamMode, activeStep, liveType, cameraFacing]);

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
    if (!isLive || activeStep !== 'live') return;
    const timer = setInterval(() => {
      setLiveDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isLive, activeStep]);

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
  const initializeWebRTC = (streamId: string, currentRole: 'broadcast' | 'view' = streamMode === 'view' ? 'view' : 'broadcast') => {
    if (!isSupabaseConfigured || !supabase) return;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionRef.current = pc;

    // Attach local stream if broadcaster
    if (currentRole === 'broadcast') {
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
        if (payload.from !== currentUser.id && currentRole === 'view') {
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
        if (payload.from !== currentUser.id && currentRole === 'broadcast') {
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
        if (currentRole === 'view') {
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
          setActiveStep('summary');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentRole === 'broadcast') {
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

  // Join Existing Active Live Stream as Viewer
  const handleJoinStream = async (stream: ActiveLiveStream) => {
    if (!isSupabaseConfigured || !supabase) return;

    await cleanUpStream();

    const hostProfile = stream.hostProfile;
    const isAnon = !!hostProfile?.is_anonymous_mode;
    const hostUserObj: User = {
      id: stream.host_id,
      username: isAnon ? (hostProfile?.anon_username || 'anonymous') : (hostProfile?.username || 'user'),
      name: isAnon ? (hostProfile?.anon_username || 'Anonymous Host') : (hostProfile?.name || 'Live Host'),
      avatar: isAnon ? (hostProfile?.anon_emoji || '🕵️‍♂️') : (hostProfile?.avatar || ''),
      bio: '',
      email: '',
      followers: [],
      following: [],
      isAnonymousMode: isAnon
    };

    setSelectedHostUser(hostUserObj);
    setStreamMode('view');
    setCurrentStreamId(stream.id);
    setStreamTitle(stream.title);
    setLiveType(stream.stream_type);
    setViewerCount(stream.viewer_count + 1);
    setTotalHearts(stream.total_hearts || 0);
    setIsLive(true);
    setActiveStep('live');

    setMessages([
      {
        id: 'sys_joined',
        senderId: 'system',
        username: 'System',
        avatar: '',
        text: `Joined ${hostUserObj.name}'s live stream ✨`,
        isSystem: true
      }
    ]);

    // Increment viewer count in DB
    try {
      await supabase
        .from('live_streams')
        .update({ viewer_count: stream.viewer_count + 1 })
        .eq('id', stream.id);
    } catch (e) {
      console.warn("Could not increment viewer count:", e);
    }

    initializeWebRTC(stream.id, 'view');
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
      setStreamMode('broadcast');
      setActiveStep('live');
      setIsLive(true);
      initializeWebRTC(streamId, 'broadcast');
    } catch (err: any) {
      console.error("[LiveStream Start Error]:", err);
      alert("Could not start live stream: " + err.message);
    }
  };

  // End live broadcast or leave viewing stream
  const handleEndBroadcast = async () => {
    if (currentStreamId && isSupabaseConfigured && supabase) {
      if (streamMode === 'broadcast') {
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
      } else {
        // Decrement viewer count in DB
        try {
          await supabase
            .from('live_streams')
            .update({ viewer_count: Math.max(0, viewerCount - 1) })
            .eq('id', currentStreamId);
        } catch (e) {}
      }
    }

    setIsLive(false);
    setActiveStep('summary');
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
    const x = Math.floor(Math.random() * 60) + 20;
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

  // Active Host Details
  const activeHost = streamMode === 'broadcast' ? currentUser : (selectedHostUser || currentUser);
  const isHostAnon = !!activeHost.isAnonymousMode;
  const hostNameVal = isHostAnon ? (activeHost.anonUsername || 'Anonymous Host') : activeHost.name;
  const hostUsernameVal = isHostAnon ? (activeHost.anonUsername || 'Anonymous') : activeHost.username;
  const hostAvatarVal = isHostAnon ? (activeHost.anonEmoji || '🕵️‍♂️') : activeHost.avatar;

  const displayTitle = streamMode === 'broadcast' 
    ? (streamTitle.trim() || 'My Live Session 🌟') 
    : (streamTitle || initialTitle || 'Live Session 🌟');

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
              {activeStep !== 'discovery' && (
                <button
                  onClick={() => {
                    if (isLive && streamMode === 'broadcast') {
                      if (confirm("End your broadcast and return to discovery?")) handleEndBroadcast();
                    } else {
                      cleanUpStream();
                      setActiveStep('discovery');
                    }
                  }}
                  className="p-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-850 text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  title="Back to Discovery"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl">
                <Radio className="w-5 h-5 animate-pulse text-rose-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {activeStep === 'discovery' ? 'Live Stream Hub' : displayTitle}
                  </h3>
                  {isLive && activeStep === 'live' && (
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {activeStep === 'discovery' 
                    ? 'Watch ongoing broadcasts or go live real-time' 
                    : (streamMode === 'broadcast' ? 'You are broadcasting' : `Hosted by @${hostUsernameVal}`)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLive && activeStep === 'live' && (
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

              {activeStep === 'discovery' && (
                <button
                  onClick={() => {
                    setStreamMode('broadcast');
                    setActiveStep('config');
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Go Live</span>
                </button>
              )}

              <button 
                onClick={() => {
                  if (isLive && streamMode === 'broadcast') {
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

          {/* Main Body Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-stone-950/40">

            {/* 1. DISCOVERY HUB (Browse Ongoing Active Live Streams) */}
            {activeStep === 'discovery' && (
              <div className="flex-1 p-4 sm:p-6 flex flex-col overflow-y-auto space-y-6">
                
                {/* Banner Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-stone-900 border border-rose-500/20 p-5 rounded-3xl gap-4">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block"></span>
                      <span className="text-xs font-black text-rose-400 uppercase tracking-widest">REALTIME STREAMING</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-white">Active Live Stream Hub</h2>
                    <p className="text-xs text-neutral-400">Join any active user's stream below or start your own broadcast!</p>
                  </div>

                  <button
                    onClick={() => {
                      setStreamMode('broadcast');
                      setActiveStep('config');
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl cursor-pointer flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Start My Broadcast</span>
                  </button>
                </div>

                {/* Direct Join by Stream ID / Room Code Box */}
                <div className="bg-stone-900 border border-stone-850 p-4 rounded-3xl flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 text-left w-full">
                    <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">
                      Direct Join by Stream ID / Link
                    </label>
                    <input
                      type="text"
                      placeholder="Paste Stream ID or Code..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const clean = inputText.trim();
                      if (!clean) return;
                      handleJoinStream({
                        id: clean,
                        host_id: 'unknown',
                        title: 'Live Stream Session 🌟',
                        stream_type: 'video',
                        status: 'live',
                        viewer_count: 1,
                        peak_viewers: 1,
                        total_hearts: 0,
                        created_at: new Date().toISOString()
                      });
                      setInputText('');
                    }}
                    disabled={!inputText.trim()}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all self-end ${
                      inputText.trim() 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-lg' 
                        : 'bg-stone-950 text-neutral-600 cursor-not-allowed border border-stone-850'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Join Room</span>
                  </button>
                </div>

                {/* Stream Grid */}
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-300">
                      Ongoing Live Sessions ({activeStreams.length})
                    </h3>
                    <button 
                      onClick={fetchActiveStreams} 
                      className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>

                  {loadingStreams && activeStreams.length === 0 ? (
                    <div className="p-12 text-center text-neutral-500 space-y-2">
                      <Radio className="w-8 h-8 mx-auto animate-pulse text-rose-500" />
                      <p className="text-xs font-bold uppercase tracking-wider">Discovering active streams...</p>
                    </div>
                  ) : activeStreams.length === 0 ? (
                    <div className="bg-stone-900/60 border border-stone-850 p-10 rounded-3xl text-center space-y-4">
                      <div className="w-14 h-14 rounded-full bg-stone-950 border border-stone-850 flex items-center justify-center mx-auto text-neutral-500">
                        <Radio className="w-6 h-6 text-neutral-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">No active live streams right now</h4>
                        <p className="text-xs text-neutral-400">Be the first to go live and share your stream with everyone!</p>
                      </div>
                      <button
                        onClick={() => {
                          setStreamMode('broadcast');
                          setActiveStep('config');
                        }}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider cursor-pointer inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Go Live Now
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeStreams.map(stream => {
                        const host = stream.hostProfile;
                        const isAnon = !!host?.is_anonymous_mode;
                        const name = isAnon ? (host?.anon_username || 'Anonymous') : (host?.name || 'Host');
                        const avatar = isAnon ? (host?.anon_emoji || '🕵️‍♂️') : (host?.avatar || '');

                        return (
                          <div 
                            key={stream.id}
                            className="bg-stone-900 border border-stone-850 hover:border-rose-500/50 p-4.5 rounded-3xl space-y-4 flex flex-col justify-between transition-all group shadow-md"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  {isAnon ? (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-lg shadow">
                                      {avatar}
                                    </div>
                                  ) : (
                                    <img src={avatar || ''} className="w-9 h-9 rounded-full object-cover border border-stone-700" />
                                  )}
                                  <div className="text-left">
                                    <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{name}</h4>
                                    <p className="text-[10px] text-neutral-500">@{host?.username || 'user'}</p>
                                  </div>
                                </div>

                                <span className="px-2 py-0.5 bg-rose-600/20 border border-rose-500/30 text-rose-400 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                  LIVE
                                </span>
                              </div>

                              <div className="text-left space-y-1">
                                <h3 className="text-xs font-black text-white group-hover:text-rose-400 transition-colors line-clamp-2">
                                  {stream.title}
                                </h3>
                                <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-indigo-400" />
                                    {stream.viewer_count || 1} watching
                                  </span>
                                  <span className="uppercase tracking-wider px-1.5 py-0.5 bg-stone-950 border border-stone-800 rounded-md text-[9px]">
                                    {stream.stream_type}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleJoinStream(stream)}
                              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-2xl uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Join Stream
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. CONFIG STEP (Broadcaster Setup) */}
            {activeStep === 'config' && (
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

                <div className="pt-4 border-t border-stone-850 w-full flex gap-3">
                  <button
                    onClick={() => setActiveStep('discovery')}
                    className="px-4 py-4 bg-stone-950 hover:bg-stone-800 text-neutral-400 font-bold text-xs rounded-2xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartBroadcast}
                    className="flex-1 py-4 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl uppercase tracking-widest active:scale-98 transition-transform cursor-pointer flex items-center justify-center gap-2 shadow-xl"
                  >
                    <Radio className="w-5 h-5" />
                    Start Broadcast
                  </button>
                </div>
              </div>
            )}

            {/* 3. END STREAM SUMMARY SCREEN */}
            {activeStep === 'summary' && (
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
                    onClick={() => setActiveStep('discovery')}
                    className="w-full py-4 bg-stone-800 hover:bg-stone-700 text-white font-extrabold text-sm rounded-2xl uppercase tracking-widest active:scale-98 transition-transform cursor-pointer"
                  >
                    Back to Stream Hub
                  </button>
                </div>
              </div>
            )}

            {/* 4. ACTIVE RUNNING STREAM VIEW (Video feed, chat, reactions) */}
            {activeStep === 'live' && (
              <>
                {/* Media Screen Panel */}
                <div className="flex-1 bg-stone-950 relative flex flex-col justify-center items-center overflow-hidden min-h-[220px] md:min-h-0">
                  
                  {/* Remote / Local Video Feeds */}
                  <video
                    ref={streamMode === 'broadcast' ? localVideoRef : remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={streamMode === 'broadcast'}
                    className={`w-full h-full object-cover ${streamMode === 'broadcast' ? 'scale-x-[-1]' : ''} ${
                      (streamMode === 'broadcast' && cameraOn && liveType === 'video') || (streamMode === 'view' && remoteStream) ? 'block' : 'hidden'
                    }`}
                  />

                  {/* Audio Mode or Camera Off Splash Screen */}
                  {((streamMode === 'broadcast' && (!cameraOn || liveType === 'audio')) || (streamMode === 'view' && !remoteStream)) && (
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
                        <p className="text-xs text-neutral-400">{liveType === 'audio' ? 'Audio Lounge Session' : 'Connecting stream feed...'}</p>
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

                  {/* Media Controls Toolbar */}
                  <div className="absolute bottom-4 right-4 bg-stone-950/80 backdrop-blur-md border border-stone-850 p-2 rounded-2xl flex items-center gap-2 z-30 shadow-xl">
                    {streamMode === 'broadcast' && (
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

                    {streamMode === 'view' && (
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
