import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Send, Video, MessageSquare, Sparkles, RefreshCw, AlertCircle,
  VideoOff, Mic, MicOff, Shield, ShieldCheck, Smile, Flame, Plus, Lock, Globe, Shuffle, Play
} from 'lucide-react';
import { User } from '../types';

interface StrangerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  onUpdateProfile?: (updatedFields: Partial<User>) => void;
  onViewProfile?: (userId: string) => void;
}

interface DuoMessage {
  id: string;
  sender: 'you' | 'stranger' | 'system';
  text: string;
  time: string;
}

const PRESET_INTERESTS = [
  "Gaming", "Coding", "Music", "Anime", "Movies", 
  "Travel", "Food", "Art", "Fitness", "Memes", "Life", "Love"
];

// High-quality looping video assets to simulate strangers' webcams in Video mode
const STRANGER_VIDEOS: Record<string, string> = {
  'travel_journal': 'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-looping-background-41710-large.mp4',
  'chef_maya': 'https://assets.mixkit.co/videos/preview/mixkit-wave-in-the-ocean-near-the-shore-43022-large.mp4',
  'fire_and_logs': 'https://assets.mixkit.co/videos/preview/mixkit-cozy-fireplace-with-burning-logs-41610-large.mp4',
  'forest_walks': 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
  'default_1': 'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-looping-background-41710-large.mp4',
  'default_2': 'https://assets.mixkit.co/videos/preview/mixkit-wave-in-the-ocean-near-the-shore-43022-large.mp4'
};

export default function StrangerChatModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  users,
  onUpdateProfile,
  onViewProfile 
}: StrangerChatModalProps) {
  // Config & Matching state
  const [matchState, setMatchState] = useState<'idle' | 'searching' | 'connected' | 'ended'>('idle');
  const [chatMode, setChatMode] = useState<'text' | 'video'>('text');
  
  // Interests management
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  
  // Active Chat states
  const [partner, setPartner] = useState<User | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [messages, setMessages] = useState<DuoMessage[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Stop & Disconnect states
  const [confirmStop, setConfirmStop] = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  
  // Media devices states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  
  // Matching detail
  const [matchedCommonInterests, setMatchedCommonInterests] = useState<string[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const msgTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoReconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut Esc for rapid skip-matching
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
          setMatchState('idle');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, matchState, confirmStop]);

  // Request/Cleanup local camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (isOpen && chatMode === 'video' && matchState !== 'idle' && cameraOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          activeStream = stream;
          setLocalStream(stream);
          setCameraError(false);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Camera blocked or unavailable. Falling back to avatar presentation.", err);
          setCameraError(true);
        });
    } else {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen, chatMode, matchState, cameraOn]);

  // Clear timers on unmount or close
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current);
    if (autoReconnectTimerRef.current) clearTimeout(autoReconnectTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  // Handle toggles
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

  const handleProfilePicClick = (userId: string) => {
    if (!userId) return;
    const targetUser = userId === currentUser?.id ? currentUser : (partner?.id === userId ? partner : null);
    if (!targetUser) return;
    
    if (targetUser.isAnonymousMode) {
      alert("🔒 This user is in Anonymous (Incognito) Mode. Profile access is hidden to protect their privacy!");
      return;
    }
    
    if (onViewProfile) {
      handleClose(); // Close the modal to view the profile
      onViewProfile(userId);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Preset interest tag selection helper
  const handleToggleInterest = (tag: string) => {
    if (selectedInterests.includes(tag)) {
      setSelectedInterests(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedInterests(prev => [...prev, tag]);
    }
  };

  // Add custom interest
  const handleAddCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInterest.trim();
    if (!clean) return;
    if (!selectedInterests.includes(clean)) {
      setSelectedInterests(prev => [...prev, clean]);
    }
    setCustomInterest('');
  };

  // Run matching sequence
  const startMatching = () => {
    // Reset previous session states
    setPartner(null);
    setMessages([]);
    setIsPartnerTyping(false);
    setConfirmStop(false);
    setMatchedCommonInterests([]);
    setReconnectCountdown(null);
    setMatchState('searching');

    clearAllTimers();

    // Dynamic delay simulating server queue lookup
    const searchDelay = 1200 + Math.random() * 1500;
    
    setTimeout(() => {
      // Find a pool of candidates from seed users or fake ones
      const baseCandidates = [
        ...users.filter(u => u.id !== currentUser?.id).map(u => ({
          ...u,
          isAnonymousMode: u.isAnonymousMode ?? (Math.random() > 0.6)
        })),
        // Dynamic simulated users
        { id: 'stranger_sam', name: 'Sam Peterson', username: 'lofi_coder', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', bio: 'Ambient vibes, coding late night', isAnonymousMode: Math.random() > 0.5, anonUsername: 'LofiShadow', anonEmoji: '🎧', anonBio: 'Vibing & coding late.' },
        { id: 'stranger_sarah', name: 'Sarah Connor', username: 'nature_wild', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80', bio: 'Fitness coach, hiking addict', isAnonymousMode: Math.random() > 0.5, anonUsername: 'TrailBlazer', anonEmoji: '🥾', anonBio: 'Always in search of outdoor thrill!' },
        { id: 'stranger_alex', name: 'Alex Rivera', username: 'game_master', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80', bio: 'Competitive FPS gamer, anime fan', isAnonymousMode: Math.random() > 0.5, anonUsername: 'ApexPixel', anonEmoji: '🎮', anonBio: 'Noob slayer, esports addict.' },
        { id: 'stranger_elena', name: 'Elena Rostova', username: 'elena_art', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', bio: 'Art designer, loves lofi and cooking', isAnonymousMode: Math.random() > 0.5, anonUsername: 'PaletteMystic', anonEmoji: '🎨', anonBio: 'Doodles, acrylic canvas enthusiast.' }
      ];

      // Assign realistic simulated interests for matching
      const userInterestsMap: Record<string, string[]> = {
        'user_1': ['Travel', 'Art', 'Movies'], // Leo
        'user_2': ['Food', 'Life', 'Travel'], // Maya
        'user_3': ['Coding', 'Gaming', 'Music'], // Marcus
        'user_4': ['Anime', 'Movies', 'Music'], // Chloe
        'stranger_sam': ['Coding', 'Music', 'Gaming'],
        'stranger_sarah': ['Fitness', 'Life', 'Food'],
        'stranger_alex': ['Gaming', 'Anime', 'Movies'],
        'stranger_elena': ['Art', 'Food', 'Music']
      };

      let selectedCandidate = baseCandidates[Math.floor(Math.random() * baseCandidates.length)];
      
      // If user specified interests, try to match with someone sharing at least one interest!
      if (selectedInterests.length > 0) {
        const matchingCandidates = baseCandidates.filter(c => {
          const cInterests = userInterestsMap[c.id] || ['Life'];
          return cInterests.some(tag => selectedInterests.includes(tag));
        });

        if (matchingCandidates.length > 0) {
          selectedCandidate = matchingCandidates[Math.floor(Math.random() * matchingCandidates.length)];
        }
      }

      // Extract common interests
      const candidateInterests = userInterestsMap[selectedCandidate.id] || ['Life'];
      const shared = selectedInterests.filter(tag => candidateInterests.includes(tag));

      setPartner(selectedCandidate as User);
      setMatchedCommonInterests(shared);
      setMatchState('connected');

      // Add connection greetings
      const greetingMsgs: DuoMessage[] = [
        {
          id: `sys_1`,
          sender: 'system',
          text: `You're now chatting with a random Stranger. Say hi!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];

      if (shared.length > 0) {
        greetingMsgs.push({
          id: `sys_2`,
          sender: 'system',
          text: `You both like: ${shared.join(', ')}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      setMessages(greetingMsgs);

      // Trigger first stranger message simulation
      triggerStrangerResponse(selectedCandidate.id, shared, []);

      // Trigger potential early stranger disconnection to showcase automatic reconnection
      triggerRandomStrangerDisconnect(selectedCandidate.id);
    }, searchDelay);
  };

  // Simulates a stranger randomly disconnecting after some conversation turns or time
  const triggerRandomStrangerDisconnect = (partnerId: string) => {
    if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current);
    
    // Random disconnect time between 25 and 45 seconds to keep simulation realistic
    const randomDisconnectTime = 30000 + Math.random() * 20000;
    
    msgTimeoutRef.current = setTimeout(() => {
      handlePartnerDisconnect();
    }, randomDisconnectTime);
  };

  // Generate dynamic, context-specific responses from Strangers
  const triggerStrangerResponse = (partnerId: string, sharedTags: string[], prevHistory: DuoMessage[]) => {
    setIsPartnerTyping(true);

    const isMarcus = partnerId === 'user_3' || partnerId === 'stranger_sam';
    const isMaya = partnerId === 'user_2' || partnerId === 'stranger_sarah';
    const isLeo = partnerId === 'user_1' || partnerId === 'stranger_elena';

    // Typing delay feels natural
    const typingDelay = 1800 + Math.random() * 2000;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsPartnerTyping(false);
      
      let replyText = "Hey! What's up?";
      const userMsgCount = prevHistory.filter(m => m.sender === 'you').length;

      // Simple keyword response tree
      if (userMsgCount === 0) {
        // First greeting
        const greetings = [
          "Hey! m or f?",
          "Hello there! How's your day going?",
          "Hey stranger! What are you up to?",
          "Hi! Cool to connect.",
          "Ooo hello! Are you also bored?"
        ];
        replyText = greetings[Math.floor(Math.random() * greetings.length)];
      } else {
        const lastUserMsg = prevHistory.filter(m => m.sender === 'you').pop()?.text.toLowerCase() || '';

        if (lastUserMsg.includes('m or f') || lastUserMsg.includes('mof') || lastUserMsg.match(/\b(asl|gender|age)\b/)) {
          replyText = isMarcus ? "19 m, u?" : (isMaya ? "21 f, what about you?" : "20 m, and you?");
        } else if (lastUserMsg.match(/\b(hi|hello|hey|yo|sup|hola)\b/)) {
          replyText = "Where are you from, stranger? I'm hanging out here in our workspace lounge!";
        } else if (lastUserMsg.match(/\b(from|live|where|country|city)\b/)) {
          replyText = "Oh nice! I'm based in the San Francisco Bay Area. Love it here. What are your hobbies?";
        } else if (lastUserMsg.match(/\b(hobby|hobbies|like|interest|interests|love|do you)\b/)) {
          if (sharedTags.length > 0) {
            replyText = `Yeah, we both like ${sharedTags[0]}! Honestly that's my favorite. How long have you been into that?`;
          } else {
            replyText = isMarcus 
              ? "I code a lot and play video games. Do you like gaming?" 
              : (isMaya ? "I love cooking and hanging out near the beach! What about you?" : "I am heavily into photography and traveling around!");
          }
        } else if (lastUserMsg.match(/\b(game|gaming|coder|coding|program|react|code|javascript)\b/) && isMarcus) {
          replyText = "Dude, yes! I'm writing some React code right now. Tailwind is literally a lifesaver. What frameworks do you use?";
        } else if (lastUserMsg.match(/\b(food|cook|recipe|chef|eat)\b/) && isMaya) {
          replyText = "Yesss! Cooking is my therapy. I love making pasta from scratch. Are you a foodie or do you cook yourself?";
        } else if (lastUserMsg.match(/\b(travel|japan|beach|ocean|hiking|trip)\b/) && isLeo) {
          replyText = "Travel is life! I visited Kyoto last month and it was pure magic. Have you ever been to Asia?";
        } else if (lastUserMsg.match(/\b(bye|gtg|leaving|go|stop)\b/)) {
          replyText = "Aww okay, nice talking to you! Catch you later!";
          // Trigger partner disconnection shortly after
          setTimeout(() => {
            handlePartnerDisconnect();
          }, 1500);
        } else {
          // General answers
          const casualReplies = [
            "Haha that's neat!",
            "Oh really? Tell me more about it.",
            "Wow, interesting! I wasn't expecting that.",
            "Honestly same, I totally agree.",
            "Haha that is too funny. So what's your vibe today?",
            "Wait, really? That is so cool!"
          ];
          replyText = casualReplies[Math.floor(Math.random() * casualReplies.length)];
        }
      }

      // Add reply to messages
      const newMsg: DuoMessage = {
        id: `stranger_${Date.now()}`,
        sender: 'stranger',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, newMsg]);
    }, typingDelay);
  };

  // Triggered when simulated stranger leaves
  const handlePartnerDisconnect = () => {
    clearAllTimers();
    setIsPartnerTyping(false);
    
    setMessages(prev => [
      ...prev,
      {
        id: `sys_disconnect_${Date.now()}`,
        sender: 'system',
        text: `Stranger has disconnected.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setMatchState('ended');

    // Trigger automatic reconnection if autoReconnect is enabled
    if (autoReconnect) {
      triggerAutomaticReconnection();
    }
  };

  // Automated Reconnection Cycle with count-down
  const triggerAutomaticReconnection = () => {
    let countdown = 3;
    setReconnectCountdown(countdown);

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

  // Trigger user manual disconnection
  const handleStopChat = () => {
    clearAllTimers();
    setIsPartnerTyping(false);
    setConfirmStop(false);

    if (matchState === 'connected') {
      setMessages(prev => [
        ...prev,
        {
          id: `sys_stopped_${Date.now()}`,
          sender: 'system',
          text: `You have disconnected.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setMatchState('ended');

      // Trigger automatic reconnection if autoReconnect is enabled
      if (autoReconnect) {
        triggerAutomaticReconnection();
      }
    } else {
      setMatchState('idle');
    }
  };

  // Sending message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || matchState !== 'connected') return;

    const newMsg: DuoMessage = {
      id: `you_${Date.now()}`,
      sender: 'you',
      text: clean,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMsgs = [...messages, newMsg];
    setMessages(updatedMsgs);
    setInputText('');

    // Stranger replies dynamically based on history
    if (partner) {
      triggerStrangerResponse(partner.id, matchedCommonInterests, updatedMsgs);
    }
  };

  // Close cleanup
  const handleClose = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    clearAllTimers();
    onClose();
  };

  // Determine video feed source for the stranger
  const getPartnerVideoSrc = () => {
    if (!partner) return STRANGER_VIDEOS.default;
    return STRANGER_VIDEOS[partner.username] || STRANGER_VIDEOS.default_1;
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
            className="w-full max-w-5xl h-[85vh] bg-stone-900 border border-stone-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative"
          >
            {/* Top Bar Navigation / Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/50 shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-2xl">
                  <Globe className="w-5 h-5 animate-pulse text-pink-500" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-wider uppercase flex items-center gap-2">
                    Stranger Chat <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">Omegle Clone</span>
                  </h2>
                  <p className="text-[10px] text-neutral-400 font-medium">Connect instantly and chat with random like-minded strangers.</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Mode Selector */}
                {matchState === 'idle' && (
                  <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
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
                    <span>{matchState === 'searching' ? 'Finding Partner' : 'Live Connected'}</span>
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
                      : 'bg-stone-900 border-stone-800 text-neutral-400 hover:text-white'
                  }`}
                  title={currentUser?.isAnonymousMode ? "Anonymous Mode is ON (Click to make Public)" : "Anonymous Mode is OFF (Click to go Anonymous)"}
                >
                  <ShieldCheck className={`w-4 h-4 ${currentUser?.isAnonymousMode ? 'text-purple-400' : 'text-neutral-500'}`} />
                  <span className="text-[11px] hidden sm:inline">
                    {currentUser?.isAnonymousMode ? 'Incognito ON' : 'Incognito OFF'}
                  </span>
                </button>

                <button 
                  onClick={handleClose}
                  className="p-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Interactive Stage */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-stone-950/40">
              
              {/* Left / Top Side: CONFIG OR VIDEO CAMERA FEEDS */}
              <div className={`flex-1 flex flex-col overflow-hidden ${
                matchState === 'idle' ? 'md:max-w-md border-r border-stone-800' : (chatMode === 'video' ? 'md:flex-[1.2] border-r border-stone-800' : 'hidden')
              }`}>
                {matchState === 'idle' ? (
                  /* INTEREST CONFIGURATION STAGE */
                  <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
                    <div className="space-y-5">
                      <div className="bg-stone-900/60 border border-stone-850 p-4.5 rounded-2xl space-y-2.5">
                        <div className="flex items-center gap-2 text-pink-500">
                          <ShieldCheck className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">100% Anonymous Chat</h4>
                        </div>
                        <p className="text-xs text-neutral-400 leading-normal">
                          Connect instantly and anonymously. Your user profile, name, avatar, and other data remain completely private. Click below to begin matchmaking.
                        </p>
                      </div>

                      {/* Anonymous Mode Option */}
                      <div className="flex items-center justify-between bg-stone-900/40 border border-stone-800/80 p-3.5 rounded-xl">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs font-bold text-white">Anonymous (Incognito) Mode</span>
                          </div>
                          <span className="text-[10px] text-neutral-500">Hide your profile details from strangers completely</span>
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
                          <div className="w-11 h-6 bg-stone-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white"></div>
                        </label>
                      </div>

                      {/* Auto-reconnect option */}
                      <div className="flex items-center justify-between bg-stone-900/40 border border-stone-800/80 p-3.5 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">Auto-Reconnect Mode</span>
                          <span className="text-[10px] text-neutral-500">Instantly search for a new partner when one leaves</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={autoReconnect} 
                            onChange={(e) => setAutoReconnect(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-stone-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 peer-checked:after:bg-white"></div>
                        </label>
                      </div>

                      {/* Add Interests */}
                      <div className="space-y-3">
                        <label className="block text-xs font-extrabold text-neutral-400 uppercase tracking-widest">
                          Prioritize Interests (Optional)
                        </label>
                        <p className="text-[11px] text-neutral-500 leading-normal">
                          Add interests to prioritize finding strangers who share similar hobbies!
                        </p>
                        
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

                        {/* Preset List */}
                        <div className="flex flex-wrap gap-2 pt-1.5 max-h-48 overflow-y-auto pr-1">
                          {PRESET_INTERESTS.map(tag => {
                            const isSelected = selectedInterests.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => handleToggleInterest(tag)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-pink-600 text-white border border-pink-500 shadow-md shadow-pink-500/20' 
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

                    <div className="pt-4 border-t border-stone-800/80">
                      <button
                        onClick={startMatching}
                        className="w-full py-4.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl uppercase tracking-widest shadow-xl shadow-pink-600/10 active:scale-98 transition-transform cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Shuffle className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                        Start Chatting
                      </button>
                    </div>
                  </div>
                ) : (
                  /* LIVE WEBCAM SPLIT SCREEN */
                  <div className="flex-1 flex flex-col p-4 bg-stone-950 gap-4 overflow-y-auto">
                    {/* Stranger's Webcam screen (Top) */}
                    <div className="flex-1 min-h-[160px] bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden relative flex flex-col justify-center items-center group shadow-inner">
                      {matchState === 'connected' && partner ? (
                        <video
                          src={getPartnerVideoSrc()}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="space-y-3 text-center">
                          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center border border-stone-800 mx-auto text-neutral-500">
                            <Shuffle className="w-8 h-8 animate-spin text-pink-500" />
                          </div>
                          <p className="text-xs text-neutral-400 font-black tracking-widest uppercase animate-pulse">Finding a partner...</p>
                        </div>
                      )}

                      {/* Header HUD info overlays */}
                      <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-md border border-stone-800 px-3 py-1.5 rounded-xl flex items-center gap-2 z-10">
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse inline-block"></span>
                        <span className="text-[10px] font-black text-white tracking-widest uppercase">STRANGER</span>
                      </div>
                    </div>

                    {/* Local Webcam screen (Bottom) */}
                    <div className="flex-1 min-h-[160px] bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden relative flex flex-col justify-center items-center group shadow-inner">
                      {cameraOn && !cameraError ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      ) : (
                        <div className="space-y-2 text-center p-4">
                          {currentUser?.isAnonymousMode ? (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 border-2 border-purple-500 mx-auto flex items-center justify-center text-2xl shadow-md select-none">
                              {currentUser.anonEmoji || '🕵️‍♂️'}
                            </div>
                          ) : (
                            <img 
                              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'} 
                              className="w-14 h-14 rounded-full object-cover border-2 border-stone-700 mx-auto opacity-75"
                            />
                          )}
                          <p className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase">
                            {currentUser?.isAnonymousMode ? 'Incognito Mode Active' : 'Your Webcam Offline'}
                          </p>
                        </div>
                      )}

                      {/* Header HUD overlay */}
                      <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-md border border-stone-800 px-3 py-1.5 rounded-xl flex items-center gap-2 z-10">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                        <span className="text-[10px] font-black text-white tracking-widest uppercase">YOU (CAMERA)</span>
                      </div>

                      {/* Camera / Audio toggles HUD bar */}
                      <div className="absolute bottom-3 right-3 bg-stone-950/80 backdrop-blur-md border border-stone-800 p-1.5 rounded-xl flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: CHAT / MESSAGE CONTAINER */}
              <div className="flex-1 flex flex-col overflow-hidden bg-stone-950/20">
                {matchState === 'idle' ? (
                  /* SPLASH IDLE SCREEN ON THE CHAT VIEW */
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500">
                      <Shuffle className="w-10 h-10 animate-bounce" />
                    </div>
                    <div className="space-y-2.5 max-w-sm">
                      <h3 className="text-lg font-black text-white">Stranger Chat Roulette</h3>
                      <p className="text-xs text-neutral-400 leading-normal">
                        Select either <strong>Text Chat</strong> or <strong>Video Cam</strong> mode, add optional interests, and click Start Chatting to pair up 1-on-1 instantly.
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] uppercase font-bold text-neutral-500 tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Fully Encrypted
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-pink-400 animate-spin" style={{ animationDuration: '10s' }} />
                        Global Pool
                      </div>
                    </div>
                  </div>
                ) : (
                  /* LIVE CONNECTED CHAT LOG */
                  <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* Active chat log view */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {matchState === 'searching' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-pink-500">
                            <RefreshCw className="w-5 h-5 animate-spin text-pink-500" />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-xs font-black text-white uppercase tracking-widest animate-pulse">Finding a random stranger...</p>
                            {selectedInterests.length > 0 ? (
                              <p className="text-[10px] text-neutral-500">Matching tags: {selectedInterests.join(', ')}</p>
                            ) : (
                              <p className="text-[10px] text-neutral-500">Searching global pool randomly</p>
                            )}
                          </div>
                        </div>
                      )}

                      {matchState !== 'searching' && (
                        <>
                          {/* Live Chat header panel */}
                          <div className="bg-stone-900/40 border border-stone-850/80 rounded-2xl p-3 mb-5 flex items-center justify-between shrink-0">
                            {/* Stranger info */}
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => handleProfilePicClick(partner?.id || '')}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-transform hover:scale-105 cursor-pointer overflow-hidden ${
                                  partner?.isAnonymousMode 
                                    ? 'bg-gradient-to-tr from-pink-600 to-purple-600 border-pink-500 text-base' 
                                    : 'border-stone-700'
                                }`}
                                title={partner?.isAnonymousMode ? "🔒 Stranger is Anonymous" : "👥 Stranger Profile"}
                              >
                                {partner && !partner.isAnonymousMode ? (
                                  <img src={partner.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <span>{partner?.anonEmoji || '🕵️‍♂️'}</span>
                                )}
                              </button>
                              <div className="text-left">
                                <h4 className="text-xs font-black text-white">
                                  {partner?.isAnonymousMode ? `@${partner?.anonUsername || 'Anonymous'}` : (partner?.name || 'Stranger')}
                                </h4>
                                <p className="text-[9px] text-neutral-500 font-bold tracking-wider uppercase">
                                  {partner?.isAnonymousMode ? '🕵️‍♂️ Incognito Partner' : '👥 Public Profile'}
                                </p>
                              </div>
                            </div>

                            {/* Mutual connection indicator */}
                            <div className="hidden sm:flex items-center gap-1 bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20 text-pink-400 text-[9px] font-black uppercase tracking-wider">
                              <Shuffle className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
                              <span>Live Match</span>
                            </div>

                            {/* Your info */}
                            <div className="flex items-center gap-2.5 text-right flex-row-reverse">
                              <button
                                onClick={() => handleProfilePicClick(currentUser?.id || '')}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-transform hover:scale-105 cursor-pointer overflow-hidden ${
                                  currentUser?.isAnonymousMode 
                                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 border-purple-500 text-base' 
                                    : 'border-stone-700'
                                }`}
                                title={currentUser?.isAnonymousMode ? "🔒 You are Anonymous" : "👥 Your Profile"}
                              >
                                {currentUser && !currentUser.isAnonymousMode ? (
                                  <img src={currentUser.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <span>{currentUser?.anonEmoji || '🕵️‍♂️'}</span>
                                )}
                              </button>
                              <div className="text-right">
                                <h4 className="text-xs font-black text-white">
                                  {currentUser?.isAnonymousMode ? `@${currentUser?.anonUsername || 'Anonymous'}` : (currentUser?.name || 'You')}
                                </h4>
                                <p className="text-[9px] text-neutral-500 font-bold tracking-wider uppercase">
                                  {currentUser?.isAnonymousMode ? '🔒 Incognito ON' : '🌍 Public Mode'}
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
                            const displayName = isMe 
                              ? (currentUser?.isAnonymousMode ? `@${currentUser?.anonUsername || 'Anonymous'}` : 'You')
                              : (partner?.isAnonymousMode ? `@${partner?.anonUsername || 'Anonymous'}` : 'Stranger');

                            const showAvatar = isMe 
                              ? (!currentUser?.isAnonymousMode ? currentUser?.avatar : null)
                              : (!partner?.isAnonymousMode ? partner?.avatar : null);

                            const emojiAvatar = isMe
                              ? (currentUser?.anonEmoji || '🕵️‍♂️')
                              : (partner?.anonEmoji || '🕵️‍♂️');

                            return (
                              <div key={msg.id} className={`flex gap-3.5 items-end ${isMe ? 'flex-row-reverse justify-start' : 'justify-start'}`}>
                                {/* Clickable Avatar */}
                                <button
                                  onClick={() => handleProfilePicClick(isMe ? currentUser?.id || '' : partner?.id || '')}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border select-none transition-transform hover:scale-110 active:scale-95 cursor-pointer overflow-hidden ${
                                    isMe 
                                      ? (currentUser?.isAnonymousMode ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 border-purple-500 text-sm' : 'border-indigo-500/30') 
                                      : (partner?.isAnonymousMode ? 'bg-gradient-to-tr from-pink-600 to-purple-600 border-pink-500 text-sm' : 'border-stone-700')
                                  }`}
                                  title={`${isMe ? 'You' : 'Stranger'} (Click to view profile)`}
                                >
                                  {showAvatar ? (
                                    <img src={showAvatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span>{emojiAvatar}</span>
                                  )}
                                </button>

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

                          {/* Stranger typing indicator */}
                          {isPartnerTyping && (
                            <div className="flex justify-start gap-3.5 items-end">
                              {/* Clicking the stranger avatar */}
                              <button
                                onClick={() => handleProfilePicClick(partner?.id || '')}
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border select-none transition-transform hover:scale-110 active:scale-95 cursor-pointer overflow-hidden ${
                                  partner?.isAnonymousMode 
                                    ? 'bg-gradient-to-tr from-pink-600 to-purple-600 border-pink-500 text-sm' 
                                    : 'border-stone-700'
                                }`}
                                title="Stranger (Click to view profile)"
                              >
                                {partner && !partner.isAnonymousMode ? (
                                  <img src={partner.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <span>{partner?.anonEmoji || '🕵️‍♂️'}</span>
                                )}
                              </button>

                              <div className="max-w-[75%] space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider block text-pink-500">
                                  {partner?.isAnonymousMode ? `@${partner?.anonUsername || 'Anonymous'}` : 'Stranger'} is typing
                                </span>
                                <div className="bg-stone-900 border border-stone-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Automatic Reconnection Countdown Overlay */}
                          {reconnectCountdown !== null && (
                            <div className="flex justify-center my-4">
                              <div className="px-5 py-2.5 bg-pink-600/20 border border-pink-500/30 text-[11px] font-extrabold tracking-widest text-pink-400 rounded-xl text-center flex items-center gap-2 animate-pulse">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>RECONNECTING IN {reconnectCountdown}s...</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Bottom Chat Inputs Panel */}
                    <div className="p-4 border-t border-stone-800 bg-stone-900/60 flex items-center gap-3 shrink-0">
                      {/* Stop/Disconnect Button */}
                      {matchState === 'connected' ? (
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
                          {confirmStop ? 'Really? (Esc)' : 'Stop (Esc)'}
                        </button>
                      ) : (
                        matchState === 'ended' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={startMatching}
                              className="px-5 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              New (Esc)
                            </button>
                            <button
                              onClick={() => setMatchState('idle')}
                              className="px-3 py-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-neutral-400 rounded-2xl font-bold text-xs"
                            >
                              Setup
                            </button>
                          </div>
                        )
                      )}

                      {/* Chat TextInput Form */}
                      <form onSubmit={handleSendMessage} className="flex-1 flex bg-stone-950 rounded-2xl border border-stone-800 pl-4 pr-1.5 py-1.5 items-center">
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
