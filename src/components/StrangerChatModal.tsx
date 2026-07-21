import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Send, Video, MessageSquare, Sparkles, RefreshCw, AlertCircle,
  VideoOff, Mic, MicOff, Shield, ShieldCheck, Smile, Flame, Plus, Lock, Globe, Shuffle, Play, Volume2, VolumeX, RotateCw
} from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface StrangerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUpdateProfile?: (updatedFields: Partial<User>) => void;
  onViewProfile?: (userId: string) => void;
}

interface StrangerMessage {
  id: string;
  sender: 'you' | 'stranger' | 'system';
  text: string;
  time: string;
}

const PRESET_INTERESTS = [
  "Gaming", "Coding", "Music", "Anime", "Movies", 
  "Travel", "Food", "Art", "Fitness", "Memes", "Life", "Love"
];

// ICE Configuration
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

export default function StrangerChatModal({ 
  isOpen, 
  onClose, 
  currentUser,
  onUpdateProfile,
  onViewProfile 
}: StrangerChatModalProps) {
  // Config & Match status
  const [matchState, setMatchState] = useState<'idle' | 'searching' | 'connected' | 'ended'>('idle');
  const [chatMode, setChatMode] = useState<'text' | 'video'>('text');
  
  // Hobbies / Tags
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  
  // Matchmaking State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  const updateSessionId = (id: string | null) => {
    setActiveSessionId(id);
    activeSessionIdRef.current = id;
  };

  const [partner, setPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<StrangerMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [matchedCommonInterests, setMatchedCommonInterests] = useState<string[]>([]);
  
  // Skip control states
  const [confirmStop, setConfirmStop] = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  
  // WebRTC & Audio/Video states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  
  // Realtime Broadcast channels
  const queueChannelRef = useRef<any>(null);
  const signalChannelRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Video Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectMonitorChRef = useRef<any>(null);

  // Clean up WebRTC session & channel connections
  const cleanUpSession = async (shouldCleanDB = true) => {
    // 1. Close WebRTC peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // 2. Unsubscribe signaling channel
    if (signalChannelRef.current) {
      signalChannelRef.current.unsubscribe();
      signalChannelRef.current = null;
    }

    // Unsubscribe disconnect monitor channel
    if (disconnectMonitorChRef.current) {
      disconnectMonitorChRef.current.unsubscribe();
      disconnectMonitorChRef.current = null;
    }

    // 3. Remove session row from DB
    const currentSessionId = activeSessionIdRef.current;
    if (shouldCleanDB && currentSessionId && isSupabaseConfigured && supabase) {
      updateSessionId(null);
      await supabase
        .from('stranger_sessions')
        .delete()
        .eq('id', currentSessionId);
    }
    updateSessionId(null);
  };

  // Keyboard shortcut Esc to skip matching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (matchState === 'connected') {
          if (!confirmStop) {
            setConfirmStop(true);
          } else {
            handleStopChat();
          }
        } else if (matchState === 'ended' || matchState === 'idle') {
          startMatching();
        } else if (matchState === 'searching') {
          handleStopChat();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, matchState, confirmStop]);

  // Request local camera stream
  useEffect(() => {
    if (isOpen && chatMode === 'video' && cameraOn) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: true
      })
      .then(stream => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // If we have an active WebRTC peer connection, swap tracks
        if (peerConnectionRef.current) {
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];
          const senders = peerConnectionRef.current.getSenders();
          
          const vSender = senders.find(s => s.track?.kind === 'video');
          if (vSender && videoTrack) vSender.replaceTrack(videoTrack);

          const aSender = senders.find(s => s.track?.kind === 'audio');
          if (aSender && audioTrack) aSender.replaceTrack(audioTrack);
        }
      })
      .catch(err => {
        console.warn("[StrangerChat] Local camera stream failed:", err);
        setChatMode('text');
        setMessages(prev => [
          ...prev,
          {
            id: `sys_perm_fail_${Date.now()}`,
            sender: 'system',
            text: 'Camera or Mic permission denied. Reverting to Text Mode.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      });
    } else {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
      }
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen, chatMode, cameraOn, cameraFacing]);

  // Handle speaker toggle
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !speakerOn;
    }
  }, [speakerOn, remoteStream]);

  // clean up all signaling on unmount
  useEffect(() => {
    return () => {
      cleanUpSession(true);
      if (queueChannelRef.current) {
        queueChannelRef.current.unsubscribe();
      }
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Before unload hook to automatically remove user from queue and session
  useEffect(() => {
    const handleUnload = () => {
      if (currentUser && isSupabaseConfigured && supabase) {
        supabase.from('stranger_queue').delete().eq('user_id', currentUser.id).then();
        const currentSessionId = activeSessionIdRef.current;
        if (currentSessionId) {
          supabase.from('stranger_sessions').delete().eq('id', currentSessionId).then();
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentUser]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleInterest = (tag: string) => {
    if (selectedInterests.includes(tag)) {
      setSelectedInterests(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedInterests(prev => [...prev, tag]);
    }
  };

  const handleAddCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInterest.trim();
    if (!clean) return;
    if (!selectedInterests.includes(clean)) {
      setSelectedInterests(prev => [...prev, clean]);
    }
    setCustomInterest('');
  };

  // Toggle local streams
  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraOn;
      }
    }
    setCameraOn(!cameraOn);
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
      }
    }
    setMicOn(!micOn);
  };

  const flipCamera = () => {
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Setup direct WebRTC P2P connection logic
  const initializeWebRTC = (sessionId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionRef.current = pc;

    // 12-second WebRTC connection timeout
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(() => {
      if (peerConnectionRef.current && (peerConnectionRef.current.connectionState === 'new' || peerConnectionRef.current.connectionState === 'connecting')) {
        console.warn("[StrangerChat] Connection timed out. Auto skipping.");
        setMessages(prev => [
          ...prev,
          {
            id: `sys_timeout_${Date.now()}`,
            sender: 'system',
            text: 'Connection timed out. Finding another stranger...',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        handleStopChat();
      }
    }, 12000);

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      }
    };

    // Attach local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Capture remote stream track
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Gather and broadcast local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalChannelRef.current) {
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, from: currentUser?.id }
        });
      }
    };

    // Subscribing to signaling broadcast channel
    const signalCh = supabase.channel(`stranger-session-${sessionId}`);
    signalChannelRef.current = signalCh;

    signalCh
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.from !== currentUser?.id) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          signalCh.send({
            type: 'broadcast',
            event: 'answer',
            payload: { sdp: answer, from: currentUser?.id }
          });
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.from !== currentUser?.id) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from !== currentUser?.id && payload.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn("Error adding ICE candidate:", e);
          }
        }
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        if (payload.senderId !== currentUser?.id) {
          setMessages(prev => [
            ...prev,
            {
              id: payload.id,
              sender: 'stranger',
              text: payload.text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && isInitiator) {
          // If initiator, trigger SDP offer exchange
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signalCh.send({
            type: 'broadcast',
            event: 'offer',
            payload: { sdp: offer, from: currentUser?.id }
          });
        }
      });
  };

  // Matchmaking process
  const startMatching = async () => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    
    // Clean up previous call and session
    await cleanUpSession(true);
    setPartner(null);
    setMessages([]);
    setConfirmStop(false);
    setMatchedCommonInterests([]);
    setReconnectCountdown(null);
    setMatchState('searching');

    try {
      // 1. Invoke PostgreSQL atomic join RPC
      const { data, error } = await supabase.rpc('join_stranger_chat', {
        p_user_id: currentUser.id,
        p_chat_mode: chatMode,
        p_interests: selectedInterests
      });

      if (error) throw error;

      if (data) {
        // MATCH FOUND IN QUEUE! (We are the initiator)
        const sessId = data.session_id;
        const oppId = data.opponent_id;
        updateSessionId(sessId);
        setMatchedCommonInterests(data.shared_interests || []);

        // Fetch opponent user profile
        const { data: oppProfile } = await supabase
          .from('profiles')
          .select('id, username, name, avatar, is_anonymous_mode')
          .eq('id', oppId)
          .maybeSingle();

        const opponent: User = {
          id: oppId,
          username: oppProfile?.username || 'stranger',
          name: oppProfile?.name || 'Stranger',
          avatar: oppProfile?.avatar || '',
          isAnonymousMode: oppProfile?.is_anonymous_mode || false,
          bio: '',
          email: '',
          followers: [],
          following: []
        };

        setPartner(opponent);
        setMatchState('connected');

        setMessages([
          {
            id: 'sys_1',
            sender: 'system',
            text: "You're now chatting with a random Stranger. Say hi! 🤝",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        // Start WebRTC connection setup
        initializeWebRTC(sessId, true);

        // Start listening to the session row deletion (indicating partner left/skipped)
        listenSessionDeletion(sessId);

      } else {
        // NO IMMEDIATE MATCH WAITING: Put in queue and listen to stranger_sessions insertion
        if (queueChannelRef.current) queueChannelRef.current.unsubscribe();

        const queueCh = supabase
          .channel('stranger-session-queue-wait')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'stranger_sessions' },
            async (payload) => {
              const session = payload.new;
              // Check if we are part of this new session
              if (session.user_1_id === currentUser.id || session.user_2_id === currentUser.id) {
                const oppId = session.user_1_id === currentUser.id ? session.user_2_id : session.user_1_id;
                updateSessionId(session.id);
                queueCh.unsubscribe();
                queueChannelRef.current = null;

                // Fetch partner profile
                const { data: oppProfile } = await supabase
                  .from('profiles')
                  .select('id, username, name, avatar, is_anonymous_mode')
                  .eq('id', oppId)
                  .maybeSingle();

                const opponent: User = {
                  id: oppId,
                  username: oppProfile?.username || 'stranger',
                  name: oppProfile?.name || 'Stranger',
                  avatar: oppProfile?.avatar || '',
                  isAnonymousMode: oppProfile?.is_anonymous_mode || false,
                  bio: '',
                  email: '',
                  followers: [],
                  following: []
                };

                setPartner(opponent);
                setMatchState('connected');

                setMessages([
                  {
                    id: 'sys_1',
                    sender: 'system',
                    text: "You're now chatting with a random Stranger. Say hi! 🤝",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);

                // Start WebRTC connection (We are the receiver/listener)
                initializeWebRTC(session.id, false);

                // Start listening to the session row deletion (indicating partner left/skipped)
                listenSessionDeletion(session.id);
              }
            }
          )
          .subscribe();

        queueChannelRef.current = queueCh;
      }

    } catch (err: any) {
      console.error("[Stranger Chat Error]:", err);
      setMatchState('idle');
      alert("Matchmaking error: " + err.message);
    }
  };

  // Subscribes to table deletes to detect if partner left/skipped
  const listenSessionDeletion = (sessionId: string) => {
    if (!isSupabaseConfigured || !supabase) return;

    if (disconnectMonitorChRef.current) {
      disconnectMonitorChRef.current.unsubscribe();
      disconnectMonitorChRef.current = null;
    }
    
    const sessDelCh = supabase
      .channel(`stranger-session-disconnect-monitor-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'stranger_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          handlePartnerDisconnect();
          sessDelCh.unsubscribe();
          disconnectMonitorChRef.current = null;
        }
      )
      .subscribe();

    disconnectMonitorChRef.current = sessDelCh;
  };

  const handlePartnerDisconnect = () => {
    cleanUpSession(false);
    setMatchState('ended');
    setMessages(prev => [
      ...prev,
      {
        id: `sys_disc_${Date.now()}`,
        sender: 'system',
        text: 'Stranger has disconnected.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (autoReconnect) {
      triggerAutomaticReconnection();
    }
  };

  // Auto skip/reconnection countdown
  const triggerAutomaticReconnection = () => {
    let countdown = 3;
    setReconnectCountdown(countdown);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setReconnectCountdown(null);
        startMatching();
      } else {
        setReconnectCountdown(countdown);
      }
    }, 1000);
  };

  // Stop chat session or skip to next stranger
  const handleStopChat = async () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setConfirmStop(false);

    if (matchState === 'connected' || matchState === 'searching') {
      // 1. Remove self from queue
      if (currentUser && isSupabaseConfigured && supabase) {
        await supabase.from('stranger_queue').delete().eq('user_id', currentUser.id);
      }
      if (queueChannelRef.current) {
        queueChannelRef.current.unsubscribe();
        queueChannelRef.current = null;
      }

      // 2. Delete active session
      await cleanUpSession(true);

      setMessages(prev => [
        ...prev,
        {
          id: `sys_stop_${Date.now()}`,
          sender: 'system',
          text: 'You have disconnected.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setMatchState('ended');

      if (autoReconnect) {
        triggerAutomaticReconnection();
      }
    } else {
      setMatchState('idle');
    }
  };

  // Broadcast text message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || matchState !== 'connected' || !signalChannelRef.current) return;

    // Send via broadcast
    signalChannelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        id: `msg_${Date.now()}`,
        text: clean,
        senderId: currentUser?.id
      }
    });

    setMessages(prev => [
      ...prev,
      {
        id: `msg_you_${Date.now()}`,
        sender: 'you',
        text: clean,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInputText('');
  };

  const handleClose = () => {
    cleanUpSession(true);
    if (queueChannelRef.current) {
      queueChannelRef.current.unsubscribe();
      queueChannelRef.current = null;
    }
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    // Clear local camera tracks
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    onClose();
  };

  const handleProfilePicClick = (userId: string) => {
    if (!userId) return;
    const targetUser = userId === currentUser?.id ? currentUser : (partner?.id === userId ? partner : null);
    if (!targetUser) return;
    
    if (targetUser.isAnonymousMode) {
      alert("🔒 This user is in Anonymous (Incognito) Mode. Profile access is hidden to protect their privacy!");
      return;
    }
    
    if (onViewProfile) {
      handleClose();
      onViewProfile(userId);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          id="stranger_chat_modal_overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/95 backdrop-blur-md p-4 overflow-hidden"
        >
          <motion.div
            id="stranger_chat_modal_content"
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-5xl h-[85vh] bg-stone-900 border border-stone-850 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative"
          >
            {/* Top Bar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-850 bg-stone-900/50 shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-2xl">
                  <Globe className="w-5 h-5 animate-pulse text-pink-500" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-wider uppercase flex items-center gap-2">
                    Stranger Chat <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">Live P2P</span>
                  </h2>
                  <p className="text-[10px] text-neutral-400 font-medium">Connect instantly and chat with random like-minded strangers.</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {matchState === 'idle' && (
                  <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-850">
                    <button
                      onClick={() => setChatMode('text')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        chatMode === 'text' 
                          ? 'bg-neutral-800 text-white' 
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                      Text Chat
                    </button>
                    <button
                      onClick={() => setChatMode('video')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        chatMode === 'video' 
                          ? 'bg-neutral-800 text-white animate-pulse' 
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5 text-pink-500" />
                      Video Cam
                    </button>
                  </div>
                )}

                {matchState !== 'idle' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-400 text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping inline-block"></span>
                    <span>{matchState === 'searching' ? 'Queueing' : 'Connected'}</span>
                  </div>
                )}

                {/* Top-bar Anonymous Toggle */}
                <button
                  onClick={() => {
                    if (onUpdateProfile && currentUser) {
                      onUpdateProfile({ isAnonymousMode: !currentUser.isAnonymousMode });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    currentUser?.isAnonymousMode 
                      ? 'bg-purple-600/20 border-purple-500/30 text-purple-400' 
                      : 'bg-stone-900 border-stone-850 text-neutral-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${currentUser?.isAnonymousMode ? 'text-purple-400' : 'text-neutral-500'}`} />
                  <span className="text-[11px] hidden sm:inline">
                    {currentUser?.isAnonymousMode ? 'Incognito ON' : 'Incognito OFF'}
                  </span>
                </button>

                <button 
                  onClick={handleClose}
                  className="p-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-850 text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-stone-950/40">
              
              {/* Left Column: Interests / Video Stream Screens */}
              <div className={`flex-1 flex flex-col overflow-hidden ${
                matchState === 'idle' ? 'md:max-w-md border-r border-stone-850' : (chatMode === 'video' ? 'md:flex-[1.2] border-r border-stone-850' : 'hidden')
              }`}>
                {matchState === 'idle' ? (
                  /* Matching Configuration Settings Dashboard */
                  <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
                    <div className="space-y-5 text-left">
                      <div className="bg-stone-900/60 border border-stone-850 p-4.5 rounded-2xl space-y-2.5">
                        <div className="flex items-center gap-2 text-pink-500">
                          <ShieldCheck className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Direct P2P Calling</h4>
                        </div>
                        <p className="text-xs text-neutral-400 leading-normal">
                          Lounge Stranger Chat works securely peer-to-peer. Your feeds do not pass through servers. Filter matches dynamically by tags below.
                        </p>
                      </div>

                      {/* Anonymous Toggle Option */}
                      <div className="flex items-center justify-between bg-stone-900/40 border border-stone-850/80 p-3.5 rounded-xl">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs font-bold text-white">Anonymous Mode</span>
                          </div>
                          <span className="text-[10px] text-neutral-500">Hide your user details from strangers</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!currentUser?.isAnonymousMode} 
                            onChange={(e) => {
                              if (onUpdateProfile && currentUser) {
                                onUpdateProfile({ isAnonymousMode: e.target.checked });
                              }
                            }}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white"></div>
                        </label>
                      </div>

                      {/* Auto Reconnect */}
                      <div className="flex items-center justify-between bg-stone-900/40 border border-stone-850/80 p-3.5 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">Auto-Skip Matching</span>
                          <span className="text-[10px] text-neutral-500">Auto-match next user when session ends</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={autoReconnect} 
                            onChange={(e) => setAutoReconnect(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 peer-checked:after:bg-white"></div>
                        </label>
                      </div>

                      {/* Interests selection */}
                      <div className="space-y-3">
                        <label className="block text-xs font-extrabold text-neutral-400 uppercase tracking-widest">
                          Filter Interests (Optional)
                        </label>
                        
                        <form onSubmit={handleAddCustomInterest} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add interest tag..."
                            value={customInterest}
                            onChange={(e) => setCustomInterest(e.target.value)}
                            className="flex-1 px-3.5 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-pink-500"
                          />
                          <button
                            type="submit"
                            className="p-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl cursor-pointer"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </form>

                        <div className="flex flex-wrap gap-2 pt-1.5 max-h-48 overflow-y-auto pr-1">
                          {PRESET_INTERESTS.map(tag => {
                            const isSelected = selectedInterests.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => handleToggleInterest(tag)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-pink-600 text-white border border-pink-500' 
                                    : 'bg-stone-900 text-neutral-400 border border-stone-800 hover:border-neutral-700'
                                }`}
                              >
                                #{tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-850">
                      <button
                        onClick={startMatching}
                        className="w-full py-4.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl uppercase tracking-widest active:scale-98 transition-transform cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Shuffle className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                        Start Chatting
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active Media Feeds Screen Panel */
                  <div className="flex-1 flex flex-col p-4 bg-stone-950 gap-4 overflow-y-auto">
                    
                    {/* Stranger remote stream */}
                    <div className="flex-1 min-h-[160px] bg-stone-900 border border-stone-850 rounded-2xl overflow-hidden relative flex flex-col justify-center items-center group">
                      {remoteStream ? (
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="space-y-3 text-center">
                          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center border border-stone-850 mx-auto text-neutral-500">
                            <Shuffle className="w-8 h-8 animate-spin text-pink-500" />
                          </div>
                          <p className="text-xs text-neutral-400 font-black tracking-widest uppercase animate-pulse">
                            {matchState === 'searching' ? 'Finding Partner...' : 'Connecting P2P...'}
                          </p>
                        </div>
                      )}

                      <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-md border border-stone-800 px-3 py-1.5 rounded-xl flex items-center gap-2 z-10">
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse inline-block"></span>
                        <span className="text-[10px] font-black text-white tracking-widest uppercase">STRANGER</span>
                      </div>
                    </div>

                    {/* Local Stream Screen */}
                    <div className="flex-1 min-h-[160px] bg-stone-900 border border-stone-850 rounded-2xl overflow-hidden relative flex flex-col justify-center items-center group">
                      {cameraOn ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      ) : (
                        <div className="space-y-2 text-center p-4">
                          {currentUser?.isAnonymousMode ? (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 border-2 border-purple-500 mx-auto flex items-center justify-center text-2xl shadow-md">
                              {currentUser.anonEmoji || '🕵️‍♂️'}
                            </div>
                          ) : (
                            <img 
                              src={currentUser?.avatar || ''} 
                              className="w-14 h-14 rounded-full object-cover border-2 border-stone-700 mx-auto"
                            />
                          )}
                          <p className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase">Camera Off</p>
                        </div>
                      )}

                      <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-md border border-stone-800 px-3 py-1.5 rounded-xl flex items-center gap-2 z-10">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                        <span className="text-[10px] font-black text-white tracking-widest uppercase">YOU</span>
                      </div>

                      {/* Device Media Toggles overlay */}
                      <div className="absolute bottom-3 right-3 bg-stone-950/80 backdrop-blur-md border border-stone-850 p-1.5 rounded-xl flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={toggleCamera}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            cameraOn ? 'bg-pink-600 text-white' : 'bg-stone-900 text-neutral-400'
                          }`}
                        >
                          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={toggleMic}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            micOn ? 'bg-pink-600 text-white' : 'bg-stone-900 text-neutral-400'
                          }`}
                        >
                          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => setSpeakerOn(!speakerOn)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            speakerOn ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-neutral-400'
                          }`}
                          title="Loudspeaker Output"
                        >
                          {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={flipCamera}
                          className="p-1.5 bg-stone-900 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
                          title="Flip Camera orientation"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Chat Screen log */}
              <div className="flex-1 flex flex-col overflow-hidden bg-stone-950/20">
                {matchState === 'idle' ? (
                  /* Idle splash banner */
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500">
                      <Shuffle className="w-10 h-10 animate-bounce" />
                    </div>
                    <div className="space-y-2.5 max-w-sm">
                      <h3 className="text-lg font-black text-white">Stranger Chat Roulette</h3>
                      <p className="text-xs text-neutral-400 leading-normal">
                        Choose a chat mode, select filter tags, and pair up peer-to-peer instantly.
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] uppercase font-bold text-neutral-500 tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        P2E WebRTC Encrypted
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Connected Active Chat messages list */
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {matchState === 'searching' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-850 flex items-center justify-center text-pink-500">
                            <RefreshCw className="w-5 h-5 animate-spin text-pink-500" />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-xs font-black text-white uppercase tracking-widest animate-pulse">Finding a random stranger...</p>
                            {selectedInterests.length > 0 && (
                              <p className="text-[10px] text-neutral-500">Matching tags: {selectedInterests.join(', ')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {matchState !== 'searching' && (
                        <>
                          <div className="bg-stone-900/40 border border-stone-850/80 rounded-2xl p-3 mb-5 flex items-center justify-between shrink-0">
                            {/* Partner User card info */}
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => handleProfilePicClick(partner?.id || '')}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-transform hover:scale-105 cursor-pointer overflow-hidden ${
                                  partner?.isAnonymousMode 
                                    ? 'bg-gradient-to-tr from-pink-600 to-purple-600 border-pink-500 text-base' 
                                    : 'border-stone-700'
                                }`}
                              >
                                {partner && !partner.isAnonymousMode ? (
                                  <img src={partner.avatar} className="w-full h-full object-cover" />
                                ) : (
                                  <span>🕵️‍♂️</span>
                                )}
                              </button>
                              <div className="text-left">
                                <h4 className="text-xs font-black text-white">
                                  {partner?.isAnonymousMode ? 'Stranger' : (partner?.name || 'Stranger')}
                                </h4>
                                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  {partner?.isAnonymousMode ? '🕵️‍♂️ Anonymous' : '👥 Public'}
                                </p>
                              </div>
                            </div>

                            {/* Self User card info */}
                            <div className="flex items-center gap-2.5 text-right flex-row-reverse">
                              <button
                                onClick={() => handleProfilePicClick(currentUser?.id || '')}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-transform hover:scale-105 cursor-pointer overflow-hidden ${
                                  currentUser?.isAnonymousMode 
                                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 border-purple-500 text-base' 
                                    : 'border-stone-700'
                                }`}
                              >
                                {currentUser && !currentUser.isAnonymousMode ? (
                                  <img src={currentUser.avatar} className="w-full h-full object-cover" />
                                ) : (
                                  <span>🕵️‍♂️</span>
                                )}
                              </button>
                              <div className="text-right">
                                <h4 className="text-xs font-black text-white">
                                  {currentUser?.isAnonymousMode ? 'You' : (currentUser?.name || 'You')}
                                </h4>
                                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  {currentUser?.isAnonymousMode ? '🔒 Incognito' : '🌍 Public'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {messages.map(msg => {
                            if (msg.sender === 'system') {
                              return (
                                <div key={msg.id} className="flex justify-center my-2">
                                  <div className="px-4 py-1.5 bg-pink-500/10 border border-pink-500/20 text-[10.5px] font-black tracking-wide text-pink-500 rounded-full text-center">
                                    {msg.text}
                                  </div>
                                </div>
                              );
                            }

                            const isMe = msg.sender === 'you';
                            const displayName = isMe ? 'You' : 'Stranger';

                            return (
                              <div key={msg.id} className={`flex gap-3.5 items-end ${isMe ? 'flex-row-reverse justify-start' : 'justify-start'}`}>
                                <div className="max-w-[75%] space-y-1">
                                  <span className={`text-[10px] font-black uppercase tracking-wider block ${
                                    isMe ? 'text-indigo-400 text-right' : 'text-pink-500 text-left'
                                  }`}>
                                    {displayName}
                                  </span>
                                  <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                                    isMe 
                                      ? 'bg-indigo-600 text-white rounded-tr-none border border-indigo-500' 
                                      : 'bg-stone-900 text-neutral-100 rounded-tl-none border border-stone-850'
                                  }`}>
                                    {msg.text}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {reconnectCountdown !== null && (
                            <div className="flex justify-center my-4">
                              <div className="px-5 py-2.5 bg-pink-600/20 border border-pink-500/30 text-[11px] font-extrabold tracking-widest text-pink-400 rounded-xl text-center flex items-center gap-2 animate-pulse">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>SKIPPING IN {reconnectCountdown}s...</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Text Input and Disconnection Controls */}
                    <div className="p-4 border-t border-stone-850 bg-stone-900/60 flex items-center gap-3 shrink-0">
                      {matchState === 'connected' || matchState === 'searching' ? (
                        <button
                          onClick={() => {
                            if (!confirmStop) {
                              setConfirmStop(true);
                            } else {
                              handleStopChat();
                            }
                          }}
                          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                            confirmStop 
                              ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 animate-pulse' 
                              : 'bg-stone-950 hover:bg-stone-800 border border-stone-800 text-neutral-400 hover:text-rose-500'
                          }`}
                        >
                          {confirmStop ? 'Confirm (Esc)' : 'Skip (Esc)'}
                        </button>
                      ) : (
                        matchState === 'ended' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={startMatching}
                              className="px-5 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Next (Esc)
                            </button>
                            <button
                              onClick={() => setMatchState('idle')}
                              className="px-3 py-3 bg-stone-950 hover:bg-stone-800 border border-stone-850 text-neutral-400 rounded-2xl font-bold text-xs"
                            >
                              Setup
                            </button>
                          </div>
                        )
                      )}

                      <form onSubmit={handleSendMessage} className="flex-1 flex bg-stone-950 rounded-2xl border border-stone-850 pl-4 pr-1.5 py-1.5 items-center">
                        <input
                          type="text"
                          placeholder={
                            matchState === 'connected' 
                              ? 'Type message to stranger...' 
                              : (matchState === 'searching' ? 'Matching queue active...' : 'Session disconnected')
                          }
                          disabled={matchState !== 'connected'}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 outline-none border-none py-1"
                        />
                        <button
                          type="submit"
                          disabled={!inputText.trim() || matchState !== 'connected'}
                          className={`p-2 rounded-xl transition-all shrink-0 ${
                            inputText.trim() && matchState === 'connected'
                              ? 'bg-pink-600 hover:bg-pink-500 text-white cursor-pointer'
                              : 'text-neutral-600 bg-stone-900/40 cursor-not-allowed'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
