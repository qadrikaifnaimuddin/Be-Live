import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Radio, Users, Lock, Shield, Heart, Send, Check, 
  Mic, MicOff, Video, VideoOff, MessageSquare, Sparkles, 
  Trash2, UserCheck, UserX, AlertCircle, Volume2, HelpCircle,
  Play, Pause, VolumeX, Music, Tv, Activity, Sliders, Paintbrush, MapPin,
  ChevronDown, ChevronUp, Gamepad2, Trophy, Timer, Coins, Hand, ExternalLink,
  Megaphone, Flame, Zap, BarChart2, Smile, Clock, Hourglass, Eye, EyeOff, Settings,
  Search, Coffee
} from 'lucide-react';
import { User, LoungeRoom, LoungeRoomParticipant, JoinRequest } from '../types';
import { VOICE_PROFILES, speakProceduralVocal } from '../lib/voiceChanger';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import LoungeInteractive3D from './LoungeInteractive3D';

interface SocialLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  onUpdateProfile?: (updatedFields: Partial<User>) => void;
  onViewProfile?: (userId: string) => void;
}

interface DoodlePoint {
  x: number;
  y: number;
}

interface DoodleLine {
  points: DoodlePoint[];
  color: string;
  size: number;
  mode: 'brush' | 'neon' | 'highlighter' | 'eraser';
}

interface SandboxItem {
  id: string;
  type: 'sticker' | 'emoji' | 'text';
  content: string; // emoji char, sticker img name, or text content
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scale?: number;
  rotation?: number;
  fontStyle?: string;
  creatorId: string;
  creatorUsername: string;
}

interface LoungeMessage {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  is_ephemeral?: boolean;
  burn_after_seconds?: number;
  custom_voice_profile?: string;
  created_at: string;
  // mapped properties
  username?: string;
  avatar?: string;
}

interface LoungeSnap {
  id: string;
  room_id: string;
  creator_id: string;
  bg_style: string;
  caption: string;
  duration: number;
  created_at: string;
  // mapped properties
  creatorUsername?: string;
  creatorAvatar?: string;
}

const MEME_FONTS = [
  { id: 'impact', name: 'Impact Modern' },
  { id: 'comic', name: 'Comic Yellow' },
  { id: 'serif', name: 'Elegant Serif' },
  { id: 'cyber', name: 'Cyber Neon' }
];

const STICKER_PRESETS = [
  { id: 'doge', name: 'Doge Wow', char: '🐕' },
  { id: 'gigachad', name: 'Giga Chad', char: '🗿' },
  { id: 'drake', name: 'Drake Approve', char: '🔥' },
  { id: 'galaxy', name: 'Galaxy Brain', char: '🧠' },
  { id: 'boyfriend', name: 'Distracted Guy', char: '👀' },
  { id: 'success', name: 'Success Kid', char: '✊' }
];

const TRIVIA_QUESTIONS = [
  {
    question: "Which web layout model was introduced in CSS3 to design flexible 1-dimensional structures?",
    options: ["Grid Layout", "Flexbox", "Table-cell", "Absolute positioning"],
    answerIndex: 1,
    explanation: "Flexbox is designed for 1-dimensional layouts, while CSS Grid is designed for 2-dimensional layouts."
  },
  {
    question: "Which of the following is NOT a hook built into React core?",
    options: ["useState", "useEffect", "useFetcher", "useContext"],
    answerIndex: 2,
    explanation: "useFetcher is not a built-in React core hook (it is often provided by third-party routing libraries like React Router)."
  },
  {
    question: "What does the 'S' stand for in the SOLID design principles?",
    options: ["State Machine", "Single Responsibility", "Simple Architecture", "Scope Isolation"],
    answerIndex: 1,
    explanation: "The 'S' in SOLID stands for Single Responsibility Principle."
  },
  {
    question: "In standard coordinates, which continent lies in all four hemispheres (North, South, East, West)?",
    options: ["Africa", "Asia", "South America", "Europe"],
    answerIndex: 0,
    explanation: "Africa spans across all four hemispheres of the Earth."
  }
];

export default function SocialLoungeModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  users, 
  onUpdateProfile, 
  onViewProfile 
}: SocialLoungeModalProps) {
  if (!isOpen || !currentUser) return null;

  // View States
  const [viewState, setViewState] = useState<'dashboard' | 'create' | 'room'>('dashboard');
  const [activeTab, setActiveTab] = useState<'stage' | 'sandbox' | 'ambient' | 'games' | 'snap'>('stage');
  
  // Realtime Database states
  const [rooms, setRooms] = useState<LoungeRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<LoungeRoom | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<LoungeRoomParticipant[]>([]);
  const [messages, setMessages] = useState<LoungeMessage[]>([]);
  const [doodleLines, setDoodleLines] = useState<DoodleLine[]>([]);
  const [sandboxItems, setSandboxItems] = useState<SandboxItem[]>([]);
  const [sandboxTheme, setSandboxTheme] = useState<string>('gradient-sunset');
  const [activePoll, setActivePoll] = useState<any | null>(null);
  const [snaps, setSnaps] = useState<LoungeSnap[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  // Local user settings
  const [localMicOn, setLocalMicOn] = useState(true);
  const [localCameraOn, setLocalCameraOn] = useState(false);
  const [localAnonymous, setLocalAnonymous] = useState(currentUser.isAnonymousMode || false);

  // Forms / Input States
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPrivacy, setCreatePrivacy] = useState<'public' | 'private'>('public');
  const [createRoomType, setCreateRoomType] = useState<'audio' | 'video' | 'both'>('both');
  const [createAllowAnonymous, setCreateAllowAnonymous] = useState(true);
  
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [selectedVoiceProfile, setSelectedVoiceProfile] = useState<string>('normal');
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [openHostMenuUserId, setOpenHostMenuUserId] = useState<string | null>(null);

  // Drawing Canvas States
  const [brushColor, setBrushColor] = useState('#E11D48');
  const [brushSize, setBrushSize] = useState(4);
  const [brushMode, setBrushMode] = useState<'brush' | 'neon' | 'highlighter' | 'eraser'>('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Sandbox Drag States
  const [selectedSandboxText, setSelectedSandboxText] = useState('');
  const [studioFont, setStudioFont] = useState<'impact' | 'comic' | 'serif' | 'cyber'>('impact');
  const [draggingItem, setDraggingItem] = useState<string | null>(null);

  // Polls form
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestionInput, setPollQuestionInput] = useState('');
  const [pollOptionsInputs, setPollOptionsInputs] = useState<string[]>(['', '', '', '']);
  const [pollIsQuiz, setPollIsQuiz] = useState(false);
  const [pollCorrectOptionIndex, setPollCorrectOptionIndex] = useState<number>(0);
  const [ephemeralTime, setEphemeralTime] = useState<number>(0);

  // Polaroid snap form
  const [snapCreateBg, setSnapCreateBg] = useState<string>('gradient-sunset');
  const [snapCreateCaption, setSnapCreateCaption] = useState<string>('');
  const [snapCreateDuration, setSnapCreateDuration] = useState<number>(5);
  const [activeViewingSnap, setActiveViewingSnap] = useState<any | null>(null);
  const [snapViewTimeLeft, setSnapViewTimeLeft] = useState<number>(5);

  // Games states
  const [triviaStatus, setTriviaStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [triviaCurrentQuestion, setTriviaCurrentQuestion] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaSelectedAnswer, setTriviaSelectedAnswer] = useState<number | null>(null);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  
  const [charadesPrompt, setCharadesPrompt] = useState('');
  const [charadesTimer, setCharadesTimer] = useState(0);
  const [isCharadesTimerRunning, setIsCharadesTimerRunning] = useState(false);
  
  const [rolledDice, setRolledDice] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  // Music ambient
  const [ambientTrack, setAmbientTrack] = useState<string>('none');
  const [ambientVolume, setAmbientVolume] = useState<number>(50);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);

  // User Profile popup
  const [selectedLoungeProfile, setSelectedLoungeProfile] = useState<User | null>(null);
  const [highFivesSent, setHighFivesSent] = useState<Record<string, number>>({});

  const handleUserClick = async (userId: string) => {
    if (!userId) return;
    playSynthSound('coin');
    
    // Check if clicking self
    if (userId === currentUser.id) {
      setSelectedLoungeProfile(currentUser);
      return;
    }
    
    // Attempt to load from database profiles
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (data) {
          setSelectedLoungeProfile({
            id: data.id,
            username: data.username,
            email: data.email || '',
            name: data.name,
            bio: data.bio || '',
            avatar: data.avatar || '',
            followers: [],
            following: [],
            isPrivate: data.is_private || false,
            avatarConfig: data.avatar_config || null
          });
          return;
        }
      } catch (err) {
        console.error('Error fetching participant profile:', err);
      }
    }

    // Fallback if offline/local
    const part = roomParticipants.find(p => p.userId === userId);
    if (part) {
      setSelectedLoungeProfile({
        id: part.userId,
        username: part.username,
        email: '',
        name: part.name,
        bio: '',
        avatar: part.avatar,
        followers: [],
        following: []
      });
    }
  };

  // Ref fields
  const sandboxCanvasRef = useRef<HTMLCanvasElement>(null);
  const isPaintingRef = useRef(false);
  const currentLineRef = useRef<DoodlePoint[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  // Procedural Sound effects Web Audio API
  const playSynthSound = (type: string) => {
    if (isSoundMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'magic') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.50, now + 0.24);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(980, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(261.63, now);
        osc.frequency.setValueAtTime(329.63, now + 0.06);
        osc.frequency.setValueAtTime(392.00, now + 0.12);
        osc.frequency.setValueAtTime(523.25, now + 0.18);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (type === 'coin') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.setValueAtTime(1318.51, now + 0.08);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'buzzer') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.warn("AudioContext block failed", e);
    }
  };

  // 1. Fetch Active Rooms List
  const fetchLoungeRooms = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: dbRooms, error } = await supabase
        .from('lounge_rooms')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (dbRooms) {
        const mappedRooms: LoungeRoom[] = await Promise.all(
          dbRooms.map(async (room: any) => {
            // Fetch participants count
            const { count } = await supabase
              .from('lounge_participants')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id);

            // Fetch host info
            const { data: hostProfile } = await supabase
              .from('profiles')
              .select('username, name, avatar')
              .eq('id', room.host_id)
              .maybeSingle();

            // Fetch participants
            const { data: partsData } = await supabase
              .from('lounge_participants')
              .select('*, profiles(username, name, avatar)')
              .eq('room_id', room.id);

            const participantsList: LoungeRoomParticipant[] = (partsData || []).map((p: any) => ({
              userId: p.user_id,
              username: p.profiles?.username || 'user',
              name: p.profiles?.name || 'User',
              avatar: p.profiles?.avatar || '',
              isMicOn: p.is_mic_on,
              isCameraOn: p.is_camera_on,
              isMutedByAdmin: p.is_muted_by_admin,
              isAnonymous: p.is_anonymous
            }));

            return {
              id: room.id,
              title: room.title,
              description: room.description || '',
              hostId: room.host_id,
              hostName: hostProfile?.name || 'Host',
              hostAvatar: hostProfile?.avatar || '',
              privacy: room.privacy as 'public' | 'private',
              roomType: room.room_type as 'audio' | 'video' | 'both',
              participants: participantsList,
              viewerCount: count || 0,
              createdAt: room.created_at,
              active: room.active,
              allowAnonymous: room.allow_anonymous,
              locationName: room.location_name || '',
              coords: room.latitude && room.longitude ? [room.latitude, room.longitude] : undefined
            };
          })
        );
        setRooms(mappedRooms);
      }
    } catch (err) {
      console.error('[fetchLoungeRooms Error]:', err);
    }
  };

  useEffect(() => {
    fetchLoungeRooms();

    if (!isSupabaseConfigured || !supabase) return;

    // Realtime subscription for rooms directory
    const roomsCh = supabase
      .channel('lounge-rooms-directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lounge_rooms' }, () => {
        fetchLoungeRooms();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lounge_participants' }, () => {
        fetchLoungeRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsCh);
    };
  }, [isOpen]);

  // 2. Fetch Active Room State
  const fetchRoomState = async (roomId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Fetch participants list
      const { data: parts, error: partsErr } = await supabase
        .from('lounge_participants')
        .select('*, profiles(username, name, avatar)')
        .eq('room_id', roomId);
      if (partsErr) throw partsErr;

      const pList: LoungeRoomParticipant[] = (parts || []).map((p: any) => ({
        userId: p.user_id,
        username: p.profiles?.username || 'user',
        name: p.profiles?.name || 'User',
        avatar: p.profiles?.avatar || '',
        isMicOn: p.is_mic_on,
        isCameraOn: p.is_camera_on,
        isMutedByAdmin: p.is_muted_by_admin,
        isAnonymous: p.is_anonymous
      }));
      setRoomParticipants(pList);

      // Update activeRoom participants
      setActiveRoom(prev => prev ? { ...prev, participants: pList } : null);

      // 2. Fetch messages
      const { data: dbMessages } = await supabase
        .from('lounge_messages')
        .select('*, profiles(username, avatar)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (dbMessages) {
        setMessages(
          dbMessages.map((m: any) => ({
            id: m.id,
            room_id: m.room_id,
            sender_id: m.sender_id,
            text: m.text,
            is_ephemeral: m.is_ephemeral,
            burn_after_seconds: m.burn_after_seconds,
            custom_voice_profile: m.custom_voice_profile,
            created_at: m.created_at,
            username: m.profiles?.username || 'user',
            avatar: m.profiles?.avatar || ''
          }))
        );
      }

      // 3. Fetch whiteboard doodles
      const { data: doodleData } = await supabase
        .from('lounge_doodles')
        .select('lines')
        .eq('room_id', roomId)
        .maybeSingle();

      if (doodleData?.lines) {
        setDoodleLines(doodleData.lines as DoodleLine[]);
      } else {
        setDoodleLines([]);
      }

      // 4. Fetch sandbox decorations
      const { data: sandboxData } = await supabase
        .from('lounge_sandbox')
        .select('items, theme')
        .eq('room_id', roomId)
        .maybeSingle();

      if (sandboxData) {
        setSandboxItems((sandboxData.items || []) as SandboxItem[]);
        setSandboxTheme(sandboxData.theme || 'gradient-sunset');
      } else {
        setSandboxItems([]);
        setSandboxTheme('gradient-sunset');
      }

      // 5. Fetch snaps
      const { data: snapsData } = await supabase
        .from('lounge_snaps')
        .select('*, profiles(username, avatar)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (snapsData) {
        setSnaps(
          snapsData.map((s: any) => ({
            id: s.id,
            room_id: s.room_id,
            creator_id: s.creator_id,
            bg_style: s.bg_style,
            caption: s.caption,
            duration: s.duration,
            created_at: s.created_at,
            creatorUsername: s.profiles?.username || 'user',
            creatorAvatar: s.profiles?.avatar || ''
          }))
        );
      }

      // 6. Fetch poll
      const { data: pollData } = await supabase
        .from('lounge_polls')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (pollData) {
        setActivePoll({
          id: 'room_poll',
          question: pollData.question,
          options: (pollData.options || []) as { text: string; votes: string[] }[],
          votedUsers: (pollData.voted_users || {}) as Record<string, number>,
          isQuiz: pollData.is_quiz,
          correctIndex: pollData.correct_index,
          creatorId: pollData.creator_id
        });
      } else {
        setActivePoll(null);
      }

    } catch (err) {
      console.error('[fetchRoomState Error]:', err);
    }
  };

  // Subscribe to realtime room modifications
  useEffect(() => {
    if (viewState !== 'room' || !activeRoom || !isSupabaseConfigured || !supabase) return;

    const roomId = activeRoom.id;

    const roomCh = supabase
      .channel(`lounge-room-${roomId}`)
      // Participants update
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lounge_participants',
        filter: `room_id=eq.${roomId}`
      }, () => {
        fetchRoomState(roomId);
      })
      // Messages update
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'lounge_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const newMessage = payload.new as any;
        supabase
          .from('profiles')
          .select('username, avatar')
          .eq('id', newMessage.sender_id)
          .maybeSingle()
          .then(({ data: pData }) => {
            const mapped: LoungeMessage = {
              id: newMessage.id,
              room_id: newMessage.room_id,
              sender_id: newMessage.sender_id,
              text: newMessage.text,
              is_ephemeral: newMessage.is_ephemeral,
              burn_after_seconds: newMessage.burn_after_seconds,
              custom_voice_profile: newMessage.custom_voice_profile,
              created_at: newMessage.created_at,
              username: pData?.username || 'user',
              avatar: pData?.avatar || ''
            };
            setMessages(prev => {
              if (prev.some(m => m.id === mapped.id)) return prev;
              return [...prev, mapped];
            });
            
            // Speak custom synthesizer tone if selected voice filter isn't normal
            if (mapped.custom_voice_profile && mapped.custom_voice_profile !== 'normal' && mapped.sender_id !== currentUser.id) {
              speakProceduralVocal(mapped.custom_voice_profile);
            }
          });
      })
      // Whiteboard drawings update
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lounge_doodles',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const newData = payload.new as any;
        if (newData && newData.lines) {
          setDoodleLines(newData.lines as DoodleLine[]);
        }
      })
      // Sandbox items update
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lounge_sandbox',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const newData = payload.new as any;
        if (newData) {
          setSandboxItems((newData.items || []) as SandboxItem[]);
          setSandboxTheme(newData.theme || 'gradient-sunset');
        }
      })
      // Polls updates
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lounge_polls',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const newData = payload.new as any;
        if (newData) {
          setActivePoll({
            id: 'room_poll',
            question: newData.question,
            options: (newData.options || []) as { text: string; votes: string[] }[],
            votedUsers: (newData.voted_users || {}) as Record<string, number>,
            isQuiz: newData.is_quiz,
            correctIndex: newData.correct_index,
            creatorId: newData.creator_id
          });
        } else {
          setActivePoll(null);
        }
      })
      // Snaps updates
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lounge_snaps',
        filter: `room_id=eq.${roomId}`
      }, () => {
        fetchRoomState(roomId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomCh);
    };
  }, [viewState, activeRoom?.id]);

  // Redraw doodle lines when drawing canvas changes
  useEffect(() => {
    if (activeTab === 'sandbox' && viewState === 'room') {
      const canvas = sandboxCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawAllDoodles(canvas, ctx, doodleLines);
        }
      }
    }
  }, [activeTab, viewState, doodleLines]);

  // Whiteboard drawing helper functions
  const drawAllDoodles = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, lines: DoodleLine[]) => {
    lines.forEach(line => {
      if (!line.points || line.points.length < 2) return;
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = line.size;

      if (line.mode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      } else if (line.mode === 'neon') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = line.color;
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 1;
      } else if (line.mode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = line.color;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.4;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = line.color;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      const startX = (line.points[0].x / 100) * canvas.width;
      const startY = (line.points[0].y / 100) * canvas.height;
      ctx.moveTo(startX, startY);

      for (let i = 1; i < line.points.length; i++) {
        const px = (line.points[i].x / 100) * canvas.width;
        const py = (line.points[i].y / 100) * canvas.height;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  const getEventCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sandboxCanvasRef.current;
    if (!canvas) return;
    isPaintingRef.current = true;
    setIsDrawing(true);
    const coords = getEventCoords(e, canvas);
    currentLineRef.current = [coords];
  };

  const drawLine = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current) return;
    const canvas = sandboxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);
    currentLineRef.current.push(coords);

    // Draw lines locally in real-time
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const tempLines = [...doodleLines, {
      points: currentLineRef.current,
      color: brushColor,
      size: brushSize,
      mode: brushMode
    }];
    drawAllDoodles(canvas, ctx, tempLines);
  };

  const stopDrawing = async () => {
    if (!isPaintingRef.current) return;
    isPaintingRef.current = false;
    setIsDrawing(false);

    if (currentLineRef.current.length > 1 && activeRoom && isSupabaseConfigured && supabase) {
      const newLine: DoodleLine = {
        points: currentLineRef.current,
        color: brushColor,
        size: brushSize,
        mode: brushMode
      };
      const updatedLines = [...doodleLines, newLine];
      setDoodleLines(updatedLines);

      // Save drawing path in database
      await supabase
        .from('lounge_doodles')
        .upsert({
          room_id: activeRoom.id,
          lines: updatedLines,
          updated_at: new Date().toISOString()
        });
    }
    currentLineRef.current = [];
  };

  const clearCanvasBoard = async () => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('laser');
    setDoodleLines([]);
    
    const canvas = sandboxCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    await supabase
      .from('lounge_doodles')
      .upsert({
        room_id: activeRoom.id,
        lines: [],
        updated_at: new Date().toISOString()
      });
  };

  // Sandbox drag & drop items helpers
  const addSandboxEmoji = async (emoji: string) => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('magic');
    const newItem: SandboxItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'emoji',
      content: emoji,
      x: 45 + Math.random() * 10,
      y: 45 + Math.random() * 10,
      scale: 1,
      rotation: 0,
      creatorId: currentUser.id,
      creatorUsername: currentUser.username
    };

    const nextItems = [...sandboxItems, newItem];
    setSandboxItems(nextItems);

    await supabase
      .from('lounge_sandbox')
      .upsert({
        room_id: activeRoom.id,
        items: nextItems,
        updated_at: new Date().toISOString()
      });
  };

  const addSandboxSticker = async (stickerId: string) => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    const match = STICKER_PRESETS.find(s => s.id === stickerId);
    if (!match) return;
    playSynthSound('magic');

    const newItem: SandboxItem = {
      id: `item_${Date.now()}`,
      type: 'sticker',
      content: match.char,
      x: 40 + Math.random() * 15,
      y: 40 + Math.random() * 15,
      scale: 1.5,
      rotation: 0,
      creatorId: currentUser.id,
      creatorUsername: currentUser.username
    };

    const nextItems = [...sandboxItems, newItem];
    setSandboxItems(nextItems);

    await supabase
      .from('lounge_sandbox')
      .upsert({
        room_id: activeRoom.id,
        items: nextItems,
        updated_at: new Date().toISOString()
      });
  };

  const addSandboxTextItem = async () => {
    if (!selectedSandboxText.trim() || !activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('magic');

    const newItem: SandboxItem = {
      id: `item_${Date.now()}`,
      type: 'text',
      content: selectedSandboxText.trim(),
      x: 40,
      y: 40,
      scale: 1,
      rotation: 0,
      fontStyle: studioFont,
      creatorId: currentUser.id,
      creatorUsername: currentUser.username
    };

    const nextItems = [...sandboxItems, newItem];
    setSandboxItems(nextItems);
    setSelectedSandboxText('');

    await supabase
      .from('lounge_sandbox')
      .upsert({
        room_id: activeRoom.id,
        items: nextItems,
        updated_at: new Date().toISOString()
      });
  };

  const handleUpdateSandboxTheme = async (themeName: string) => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('coin');
    setSandboxTheme(themeName);

    await supabase
      .from('lounge_sandbox')
      .upsert({
        room_id: activeRoom.id,
        theme: themeName,
        updated_at: new Date().toISOString()
      });
  };

  const deleteSandboxItem = async (itemId: string) => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('laser');
    const filtered = sandboxItems.filter(item => item.id !== itemId);
    setSandboxItems(filtered);

    await supabase
      .from('lounge_sandbox')
      .upsert({
        room_id: activeRoom.id,
        items: filtered,
        updated_at: new Date().toISOString()
      });
  };

  const updateItemPosition = async (itemId: string, x: number, y: number) => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    const nextItems = sandboxItems.map(item => 
      item.id === itemId ? { ...item, x: Math.max(2, Math.min(92, x)), y: Math.max(2, Math.min(92, y)) } : item
    );
    setSandboxItems(nextItems);

    await supabase
      .from('lounge_sandbox')
      .upsert({
        room_id: activeRoom.id,
        items: nextItems,
        updated_at: new Date().toISOString()
      });
  };

  // Lobby actions: Create and Join Rooms
  const handleCreateLoungeRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !isSupabaseConfigured || !supabase) return;
    playSynthSound('success');

    try {
      // 1. Insert room row
      const { data: newRoom, error: roomErr } = await supabase
        .from('lounge_rooms')
        .insert({
          title: createTitle.trim(),
          description: createDesc.trim(),
          host_id: currentUser.id,
          privacy: createPrivacy,
          room_type: createRoomType,
          allow_anonymous: createAllowAnonymous,
          active: true
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // 2. Add creator to participants table
      const { error: partErr } = await supabase
        .from('lounge_participants')
        .insert({
          room_id: newRoom.id,
          user_id: currentUser.id,
          is_mic_on: localMicOn,
          is_camera_on: localCameraOn,
          is_anonymous: localAnonymous
        });

      if (partErr) throw partErr;

      // Reset create forms
      setCreateTitle('');
      setCreateDesc('');
      setViewState('room');
      fetchLoungeRooms();
      fetchRoomState(newRoom.id);
      
      const hostPart: LoungeRoomParticipant = {
        userId: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        avatar: currentUser.avatar,
        isMicOn: localMicOn,
        isCameraOn: localCameraOn,
        isAnonymous: localAnonymous
      };

      setActiveRoom({
        id: newRoom.id,
        title: newRoom.title,
        description: newRoom.description || '',
        hostId: currentUser.id,
        hostName: currentUser.name,
        hostAvatar: currentUser.avatar,
        privacy: newRoom.privacy,
        roomType: newRoom.room_type,
        participants: [hostPart],
        viewerCount: 1,
        createdAt: newRoom.created_at,
        active: true
      });

    } catch (err) {
      console.error('[handleCreateLoungeRoom Error]:', err);
    }
  };

  const handleJoinLoungeRoom = async (room: LoungeRoom) => {
    if (!isSupabaseConfigured || !supabase) return;
    playSynthSound('coin');

    try {
      // 1. Add row to lounge_participants
      const { error: joinErr } = await supabase
        .from('lounge_participants')
        .insert({
          room_id: room.id,
          user_id: currentUser.id,
          is_mic_on: localMicOn,
          is_camera_on: localCameraOn && room.roomType !== 'audio',
          is_anonymous: localAnonymous
        });

      if (joinErr) throw joinErr;

      setViewState('room');
      fetchLoungeRooms();
      fetchRoomState(room.id);
      setActiveRoom(room);

    } catch (err) {
      console.error('[handleJoinLoungeRoom Error]:', err);
    }
  };

  const handleLeaveLoungeRoom = async () => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('laser');

    try {
      // 1. Remove from participants
      const { error: leaveErr } = await supabase
        .from('lounge_participants')
        .delete()
        .eq('room_id', activeRoom.id)
        .eq('user_id', currentUser.id);

      if (leaveErr) throw leaveErr;

      // 2. If host leaves, make room inactive
      if (activeRoom.hostId === currentUser.id) {
        await supabase
          .from('lounge_rooms')
          .update({ active: false })
          .eq('id', activeRoom.id);
      }

      setViewState('dashboard');
      setActiveRoom(null);
      setRoomParticipants([]);
      setMessages([]);
      setDoodleLines([]);
      setSandboxItems([]);
      fetchLoungeRooms();

    } catch (err) {
      console.error('[handleLeaveLoungeRoom Error]:', err);
    }
  };

  // Toggle user audio/video states
  const handleToggleMic = async () => {
    const nextMic = !localMicOn;
    setLocalMicOn(nextMic);
    playSynthSound('coin');

    if (activeRoom && isSupabaseConfigured && supabase) {
      await supabase
        .from('lounge_participants')
        .update({ is_mic_on: nextMic })
        .eq('room_id', activeRoom.id)
        .eq('user_id', currentUser.id);
    }
  };

  const handleToggleCamera = async () => {
    const nextCam = !localCameraOn;
    setLocalCameraOn(nextCam);
    playSynthSound('coin');

    if (activeRoom && isSupabaseConfigured && supabase) {
      await supabase
        .from('lounge_participants')
        .update({ is_camera_on: nextCam })
        .eq('room_id', activeRoom.id)
        .eq('user_id', currentUser.id);
    }
  };

  // Host Moderation actions
  const handleHostToggleMuteParticipant = async (targetUserId: string) => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('laser');
    
    const part = roomParticipants.find(p => p.userId === targetUserId);
    if (!part) return;

    await supabase
      .from('lounge_participants')
      .update({ is_mic_on: false, is_muted_by_admin: true })
      .eq('room_id', activeRoom.id)
      .eq('user_id', targetUserId);
  };

  const handleHostKickParticipant = async (targetUserId: string) => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('laser');

    await supabase
      .from('lounge_participants')
      .delete()
      .eq('room_id', activeRoom.id)
      .eq('user_id', targetUserId);
  };

  const handleHostPromoteParticipant = async (targetUserId: string) => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('success');

    await supabase
      .from('lounge_rooms')
      .update({ host_id: targetUserId })
      .eq('id', activeRoom.id);

    setActiveRoom(prev => prev ? { ...prev, hostId: targetUserId } : null);
  };

  // Chat message submission
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageInput.trim() || !activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('laser');

    const rawText = chatMessageInput.trim();
    setChatMessageInput('');

    // Synthesis procedurally if voice profile isn't normal
    if (selectedVoiceProfile !== 'normal') {
      speakProceduralVocal(selectedVoiceProfile);
    }

    await supabase
      .from('lounge_messages')
      .insert({
        room_id: activeRoom.id,
        sender_id: currentUser.id,
        text: rawText,
        is_ephemeral: ephemeralTime > 0,
        burn_after_seconds: ephemeralTime,
        custom_voice_profile: selectedVoiceProfile
      });
  };

  // Chat scroll anchor
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Poll submissions & voting
  const handleCreatePollSubmit = async () => {
    if (!pollQuestionInput.trim() || !activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('success');

    const validOptions = pollOptionsInputs.filter(o => o.trim() !== '').map(text => ({
      text: text.trim(),
      votes: []
    }));

    if (validOptions.length < 2) return;

    await supabase
      .from('lounge_polls')
      .upsert({
        room_id: activeRoom.id,
        question: pollQuestionInput.trim(),
        options: validOptions,
        voted_users: {},
        is_quiz: pollIsQuiz,
        correct_index: pollIsQuiz ? pollCorrectOptionIndex : null,
        creator_id: currentUser.id
      });

    setShowPollCreator(false);
    setPollQuestionInput('');
    setPollOptionsInputs(['', '', '', '']);
  };

  const handleVoteOnPoll = async (optionIndex: number) => {
    if (!activePoll || !activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('coin');

    const currentVoted = activePoll.votedUsers || {};
    if (currentUser.id in currentVoted) return; // Allow single vote only

    const nextVoted = { ...currentVoted, [currentUser.id]: optionIndex };
    const nextOptions = activePoll.options.map((opt: any, index: number) => {
      if (index === optionIndex) {
        return { ...opt, votes: [...opt.votes, currentUser.id] };
      }
      return opt;
    });

    await supabase
      .from('lounge_polls')
      .upsert({
        room_id: activeRoom.id,
        question: activePoll.question,
        options: nextOptions,
        voted_users: nextVoted,
        is_quiz: activePoll.isQuiz,
        correct_index: activePoll.correctIndex,
        creator_id: activePoll.creatorId
      });
  };

  // Polaroid snap creations
  const handleCreateSnapSubmit = async () => {
    if (!activeRoom || !isSupabaseConfigured || !supabase) return;
    playSynthSound('success');

    const cap = snapCreateCaption.trim();
    setSnapCreateCaption('');

    await supabase
      .from('lounge_snaps')
      .insert({
        room_id: activeRoom.id,
        creator_id: currentUser.id,
        bg_style: snapCreateBg,
        caption: cap,
        duration: snapCreateDuration
      });
  };

  // Games: Trivia Answers
  const handleAnswerTriviaQuestion = (optionIndex: number) => {
    if (triviaAnswered) return;
    setTriviaSelectedAnswer(optionIndex);
    setTriviaAnswered(true);

    const question = TRIVIA_QUESTIONS[triviaCurrentQuestion];
    if (optionIndex === question.answerIndex) {
      setTriviaScore(prev => prev + 10);
      playSynthSound('success');
    } else {
      playSynthSound('buzzer');
    }
  };

  const handleNextTriviaQuestion = () => {
    setTriviaSelectedAnswer(null);
    setTriviaAnswered(false);
    if (triviaCurrentQuestion + 1 < TRIVIA_QUESTIONS.length) {
      setTriviaCurrentQuestion(prev => prev + 1);
    } else {
      setTriviaStatus('gameover');
    }
  };

  const handleResetTrivia = () => {
    setTriviaStatus('playing');
    setTriviaCurrentQuestion(0);
    setTriviaScore(0);
    setTriviaSelectedAnswer(null);
    setTriviaAnswered(false);
  };

  // Games: Dice rolling
  const rollDiceAction = (count: number) => {
    if (isRolling) return;
    setIsRolling(true);
    playSynthSound('coin');
    setTimeout(() => {
      const results = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
      setRolledDice(results);
      setIsRolling(false);
      playSynthSound('success');
    }, 800);
  };

  // Ambient sound system music toggle
  const handleAmbientPlayPause = (track: string) => {
    if (track === 'none') {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
      setIsAmbientPlaying(false);
      setAmbientTrack('none');
      return;
    }

    if (ambientTrack === track) {
      if (isAmbientPlaying) {
        ambientAudioRef.current?.pause();
        setIsAmbientPlaying(false);
      } else {
        ambientAudioRef.current?.play();
        setIsAmbientPlaying(true);
      }
    } else {
      // Load new track stream
      let trackUrl = '';
      if (track === 'lofi') trackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      else if (track === 'cyber') trackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3';
      else if (track === 'space') trackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3';
      else if (track === 'jazz') trackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3';

      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
      ambientAudioRef.current = new Audio(trackUrl);
      ambientAudioRef.current.volume = ambientVolume / 100;
      ambientAudioRef.current.loop = true;
      ambientAudioRef.current.play();
      setIsAmbientPlaying(true);
      setAmbientTrack(track);
    }
  };

  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = ambientVolume / 100;
    }
  }, [ambientVolume]);

  useEffect(() => {
    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
    };
  }, []);

  const getMemeFontStyle = (style: string) => {
    switch (style) {
      case 'comic':
        return 'font-sans text-yellow-300 font-bold italic tracking-wide uppercase [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]';
      case 'serif':
        return 'font-serif text-amber-100 font-extrabold italic uppercase [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]';
      case 'cyber':
        return 'font-mono text-emerald-400 font-extrabold uppercase tracking-tight [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]';
      case 'impact':
      default:
        return 'font-sans text-white font-extrabold tracking-wider uppercase leading-tight [text-shadow:_-1.5px_-1.5px_0_#000,_1.5px_-1.5px_0_#000,_-1.5px_1.5px_0_#000,_1.5px_1.5px_0_#000]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md select-none text-stone-100 font-sans">
      <div className="w-full h-full md:max-w-5xl md:h-[85vh] bg-[#0C0B0A] md:rounded-[28px] border border-stone-850 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header Section */}
        <header className="px-6 py-4 bg-stone-950/70 border-b border-stone-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/10 to-yellow-500/10 border border-amber-500/20 text-amber-400">
              <Coffee className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-wide text-stone-100 flex items-center gap-1.5">
                {activeRoom ? activeRoom.title : 'Live Social Lounge'}
              </h1>
              <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">
                {activeRoom ? `${roomParticipants.length} Connected Members` : 'Create or join voice & sandbox channels'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeRoom && (
              <button
                onClick={handleLeaveLoungeRoom}
                className="px-4 py-1.5 bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/60 text-rose-400 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
              >
                Leave Room
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Inner Body */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-gradient-to-b from-[#080706] to-[#0d0c0a]">
          
          {/* ViewState 1: Main Directory Dashboard */}
          {viewState === 'dashboard' && (
            <div className="p-6 flex flex-col gap-6 flex-1 max-w-4xl mx-auto w-full">
              
              {/* Creator Banner Bar */}
              <div className="bg-gradient-to-r from-amber-950/20 via-[#181512] to-stone-950/20 border border-amber-950/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-base font-black text-amber-400 tracking-wide">Spark a Conversation 🎙️</h3>
                  <p className="text-xs text-stone-400 mt-1">Setup your private drawing sandbox, stream lofi audio, or roll dice with friends.</p>
                </div>
                <button
                  onClick={() => { playSynthSound('coin'); setViewState('create'); }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black rounded-xl text-xs uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Create New Lounge
                </button>
              </div>

              {/* Lounge Listing Container */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Available Lounges</h4>
                  <div className="relative w-48">
                    <input
                      type="text"
                      placeholder="Search Lounges..."
                      value={roomSearchQuery}
                      onChange={(e) => setRoomSearchQuery(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-900 rounded-lg pl-8 pr-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500/40"
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-600" />
                  </div>
                </div>

                {rooms.length === 0 ? (
                  <div className="p-12 border border-dashed border-stone-900 rounded-2xl flex flex-col items-center justify-center text-center">
                    <Radio className="w-8 h-8 text-stone-700 animate-pulse mb-3" />
                    <p className="text-xs font-bold text-stone-400">No lounges are active right now</p>
                    <p className="text-[10px] text-stone-600 mt-1">Be the first to spark a live conversation by creating a room!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rooms.filter(r => r.title.toLowerCase().includes(roomSearchQuery.toLowerCase())).map((room) => (
                      <div
                        key={room.id}
                        className="bg-stone-950/40 border border-stone-900 hover:border-stone-800 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden group"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent pointer-events-none" />
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 bg-stone-900/60 border border-stone-850 px-2 py-0.5 rounded text-[8px] font-bold text-stone-400">
                              {room.privacy === 'private' ? <Lock className="w-2.5 h-2.5 text-amber-500" /> : <Users className="w-2.5 h-2.5 text-emerald-400" />}
                              <span className="uppercase tracking-wider">{room.privacy}</span>
                            </div>
                            <span className="text-[8px] font-mono text-stone-500">{new Date(room.createdAt).toLocaleDateString()}</span>
                          </div>

                          <h3 className="font-extrabold text-stone-200 text-sm group-hover:text-amber-400 transition-colors leading-snug">
                            {room.title}
                          </h3>
                          {room.description && (
                            <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">
                              {room.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-stone-900/60 pt-3.5 mt-2">
                          <div className="flex items-center gap-2">
                            {room.hostAvatar ? (
                              <img
                                src={room.hostAvatar}
                                alt="Host"
                                className="w-6 h-6 rounded-full object-cover border border-stone-800"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-stone-850 flex items-center justify-center text-[10px] font-black border border-stone-800">
                                👑
                              </div>
                            )}
                            <div className="text-left">
                              <span className="text-[9px] text-stone-400 block font-semibold leading-tight">👑 Host</span>
                              <span className="text-[8px] text-stone-600 block truncate max-w-[80px]">@{room.hostName}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              🎙️ {room.roomType.toUpperCase()}
                            </span>
                            <button
                              onClick={() => handleJoinLoungeRoom(room)}
                              className="px-3.5 py-1.5 bg-stone-900 border border-stone-850 hover:bg-amber-500 hover:border-amber-500 hover:text-stone-950 font-bold rounded-xl text-[10px] transition-all cursor-pointer"
                            >
                              Join Lounge
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ViewState 2: Create Lounge Form */}
          {viewState === 'create' && (
            <div className="p-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
              <div className="bg-stone-950/60 border border-stone-900 rounded-3xl p-6 shadow-xl relative text-left">
                <h2 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-4">Launch New Lounge</h2>
                
                <form onSubmit={handleCreateLoungeRoom} className="flex flex-col gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-stone-400 font-bold">Lounge Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Design review and coffee chill ☕"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      maxLength={80}
                      required
                      className="w-full bg-[#0d0c0b] border border-stone-900 rounded-xl p-3 text-stone-200 focus:outline-none focus:border-amber-500/40"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-stone-400 font-bold">Short Description (Optional)</label>
                    <textarea
                      placeholder="Share details or guidelines..."
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                      maxLength={180}
                      rows={3}
                      className="w-full bg-[#0d0c0b] border border-stone-900 rounded-xl p-3 text-stone-200 focus:outline-none focus:border-amber-500/40 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-stone-400 font-bold">Room Privacy</label>
                      <select
                        value={createPrivacy}
                        onChange={(e: any) => setCreatePrivacy(e.target.value)}
                        className="w-full bg-[#0d0c0b] border border-stone-900 rounded-xl p-3 text-stone-200 focus:outline-none focus:border-amber-500/40 cursor-pointer"
                      >
                        <option value="public">🔓 Public</option>
                        <option value="private">🔒 Private</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-stone-400 font-bold">Stream Type</label>
                      <select
                        value={createRoomType}
                        onChange={(e: any) => setCreateRoomType(e.target.value)}
                        className="w-full bg-[#0d0c0b] border border-stone-900 rounded-xl p-3 text-stone-200 focus:outline-none focus:border-amber-500/40 cursor-pointer"
                      >
                        <option value="both">🎙️ Audio & Video</option>
                        <option value="audio">🎙️ Audio Only</option>
                        <option value="video">📹 Video Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-900/60 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => { playSynthSound('laser'); setViewState('dashboard'); }}
                      className="px-4 py-2 bg-stone-900 border border-stone-850 hover:bg-stone-800 text-stone-400 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black rounded-xl uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md shadow-amber-500/10"
                    >
                      Open Lounge
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ViewState 3: Live Lounge Room */}
          {viewState === 'room' && activeRoom && (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              
              {/* Tab Nav Bar */}
              <div className="px-6 bg-stone-950/40 border-b border-stone-900/60 flex items-center justify-between z-10">
                <div className="flex items-center gap-1.5 overflow-x-auto py-2">
                  {(['stage', 'sandbox', 'ambient', 'games', 'snap'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { playSynthSound('coin'); setActiveTab(tab); }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        activeTab === tab 
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-extrabold shadow' 
                          : 'bg-transparent border-transparent text-stone-500 hover:text-stone-300'
                      }`}
                    >
                      {tab === 'stage' && <Radio className="w-3.5 h-3.5" />}
                      {tab === 'sandbox' && <Paintbrush className="w-3.5 h-3.5" />}
                      {tab === 'ambient' && <Music className="w-3.5 h-3.5" />}
                      {tab === 'games' && <Gamepad2 className="w-3.5 h-3.5" />}
                      {tab === 'snap' && <Tv className="w-3.5 h-3.5" />}
                      <span>{tab}</span>
                    </button>
                  ))}
                </div>

                {/* Local Mute/Cam toggle overlays */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMic}
                    className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      localMicOn 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}
                  >
                    {localMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  {activeRoom.roomType !== 'audio' && (
                    <button
                      onClick={handleToggleCamera}
                      className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                        localCameraOn 
                          ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {localCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Inner Tab Panels */}
              <div className="flex-1 overflow-hidden flex flex-col relative">
                
                {/* 1. Stage Tab Panel */}
                {activeTab === 'stage' && (
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6">
                    
                    {/* Left: 3D Visualization */}
                    <div className="flex-1 min-h-[220px] bg-stone-950/60 border border-stone-900 rounded-3xl overflow-hidden relative flex flex-col justify-between p-4">
                      <div className="absolute inset-0 z-0">
                        <LoungeInteractive3D />
                      </div>
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="bg-black/60 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider text-amber-400 border border-white/5">
                          Virtual Pulse Room
                        </span>
                      </div>
                      <div className="relative z-10 text-left">
                        <p className="text-[10px] text-stone-500 max-w-xs leading-relaxed font-semibold">
                          Slide mouse or drag touch screen over particle structure to trigger spatial resonance distortion.
                        </p>
                      </div>
                    </div>

                    {/* Right: Stage Grid & Chat */}
                    <div className="w-full lg:w-96 flex flex-col overflow-hidden gap-4">
                      
                      {/* Grid */}
                      <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto">
                        {roomParticipants.map((part) => {
                          const isLocalUser = part.userId === currentUser.id;
                          return (
                            <div 
                              key={part.userId}
                              className="relative h-28 bg-[#121110] border border-stone-850 rounded-2xl flex flex-col items-center justify-center p-3 text-center overflow-hidden"
                            >
                              {part.isMicOn && (
                                <div className="absolute -inset-0.5 rounded-2xl border border-pink-500/40 animate-pulse pointer-events-none" />
                              )}
                              
                              {/* Video placeholder or avatar */}
                              {part.isCameraOn ? (
                                <div className="absolute inset-0 bg-stone-900 flex items-center justify-center">
                                  {part.avatar ? (
                                    <img src={part.avatar} alt="Live feed" onClick={() => handleUserClick(part.userId)} className="w-full h-full object-cover blur-[0.5px] scale-105 brightness-75 cursor-pointer hover:brightness-90 transition-all" />
                                  ) : (
                                    <span className="text-xl">📹</span>
                                  )}
                                  <div className="absolute inset-0 bg-black/30" />
                                </div>
                              ) : (
                                <div className="relative">
                                  {part.isMicOn && (
                                    <>
                                      <div className="absolute -inset-2 rounded-full border border-pink-500/20 animate-ping" />
                                      <div className="absolute -inset-1 rounded-full border border-pink-500/30 animate-pulse" />
                                    </>
                                  )}
                                  {part.avatar ? (
                                    <img src={part.avatar} alt="Avatar" onClick={() => handleUserClick(part.userId)} className="w-10 h-10 rounded-full object-cover border-2 border-stone-800 cursor-pointer hover:scale-105 transition-all" />
                                  ) : (
                                    <div onClick={() => handleUserClick(part.userId)} className="w-10 h-10 rounded-full bg-stone-850 flex items-center justify-center text-xs border border-stone-800 cursor-pointer hover:scale-105 transition-all">👤</div>
                                  )}
                                </div>
                              )}

                              {/* Host actions overlay */}
                              {activeRoom.hostId === currentUser.id && !isLocalUser && (
                                <div className="absolute top-1.5 right-1.5 z-20">
                                  <button
                                    onClick={() => setOpenHostMenuUserId(openHostMenuUserId === part.userId ? null : part.userId)}
                                    className="p-1 bg-black/60 rounded border border-white/5 text-stone-400 hover:text-white"
                                  >
                                    <Settings className="w-3 h-3" />
                                  </button>
                                  {openHostMenuUserId === part.userId && (
                                    <div className="absolute right-0 mt-1 bg-stone-950 border border-stone-850 rounded-lg py-1 shadow-lg text-left w-24 text-[8px] z-30 font-bold">
                                      <button
                                        onClick={() => { handleHostToggleMuteParticipant(part.userId); setOpenHostMenuUserId(null); }}
                                        className="w-full px-2 py-1.5 hover:bg-stone-900 text-stone-200 hover:text-white flex items-center gap-1 cursor-pointer"
                                      >
                                        <MicOff className="w-2.5 h-2.5" /> Mute
                                      </button>
                                      <button
                                        onClick={() => { handleHostKickParticipant(part.userId); setOpenHostMenuUserId(null); }}
                                        className="w-full px-2 py-1.5 hover:bg-stone-900 text-rose-400 hover:text-rose-300 flex items-center gap-1 border-t border-stone-900 cursor-pointer"
                                      >
                                        <UserX className="w-2.5 h-2.5" /> Kick
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between z-10 bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
                                <span className="text-[8px] font-black text-stone-200 block truncate max-w-[55px]">
                                  {isLocalUser ? 'You' : `@${part.username}`}
                                </span>
                                <span className="text-[7px] text-stone-500 font-bold block">
                                  {part.userId === activeRoom.hostId ? '👑' : part.isAnonymous ? '🕵️‍♂️' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 flex flex-col bg-stone-950/40 border border-stone-900 rounded-3xl overflow-hidden p-4 h-64 lg:h-auto">
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 text-[10px] text-left">
                          {messages.length === 0 ? (
                            <div className="my-auto text-center p-4">
                              <MessageSquare className="w-6 h-6 text-stone-800 mx-auto mb-2" />
                              <p className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">Lounge chat is empty</p>
                              <p className="text-[8px] text-stone-700 mt-0.5">Send a message to start sharing.</p>
                            </div>
                          ) : (
                            messages.map((m) => (
                              <div key={m.id} className="flex gap-2 items-start">
                                {m.avatar ? (
                                  <img src={m.avatar} alt="Sender" className="w-6 h-6 rounded-full object-cover border border-stone-850 mt-0.5" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-stone-850 flex items-center justify-center text-[10px] border border-stone-800 mt-0.5">👤</div>
                                )}
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-stone-200 text-[9px]">{m.username === currentUser.username ? 'You' : `@${m.username}`}</span>
                                    <span className="text-[7px] text-stone-600 font-mono">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-stone-300 leading-normal mt-0.5 break-words bg-stone-900/40 px-2 py-1 rounded border border-stone-900/60 max-w-[80%] inline-block">
                                    {m.text}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={chatScrollRef} />
                        </div>

                        {/* Input bar */}
                        <form onSubmit={handleSendChatMessage} className="mt-3 flex items-center gap-2 border-t border-stone-900/60 pt-3">
                          <input
                            type="text"
                            placeholder="Type a message..."
                            value={chatMessageInput}
                            onChange={(e) => setChatMessageInput(e.target.value)}
                            className="flex-1 bg-[#0d0c0b] border border-stone-900 rounded-xl px-3 py-2 text-[10px] text-stone-200 focus:outline-none focus:border-amber-500/40"
                          />
                          <button
                            type="submit"
                            className="p-2 bg-amber-500 text-stone-950 rounded-xl hover:opacity-90 transition-all cursor-pointer active:scale-95"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </form>
                      </div>

                    </div>
                  </div>
                )}

                {/* 2. Sandbox Tab Panel */}
                {activeTab === 'sandbox' && (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6">
                    
                    {/* Left: Interactive Sandbox Grid & Drag/Drop Display */}
                    <div className="flex-1 bg-stone-950/60 border border-stone-900 rounded-3xl overflow-hidden relative flex flex-col justify-between p-4 min-h-[300px]">
                      
                      {/* Theme Background */}
                      <div className={`absolute inset-0 z-0 bg-gradient-to-tr ${
                        sandboxTheme === 'gradient-sunset' ? 'from-orange-950/20 via-pink-950/10 to-stone-950' :
                        sandboxTheme === 'cozy-woodland' ? 'from-amber-950/30 via-emerald-950/15 to-[#0b0c0a]' :
                        sandboxTheme === 'neon-future' ? 'from-indigo-950/30 via-purple-950/15 to-[#0b0b0d]' :
                        'from-stone-900 via-stone-950 to-black'
                      }`} />

                      {/* Whiteboard Board Canvas */}
                      <canvas 
                        ref={sandboxCanvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={drawLine}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={drawLine}
                        onTouchEnd={stopDrawing}
                        className="absolute inset-0 z-10 w-full h-full cursor-crosshair touch-none"
                        width={600}
                        height={400}
                      />

                      {/* Drag items rendered inside */}
                      <div className="absolute inset-0 z-20 pointer-events-none">
                        {sandboxItems.map((item) => (
                          <div
                            key={item.id}
                            style={{ left: `${item.x}%`, top: `${item.y}%`, position: 'absolute' }}
                            className={`pointer-events-auto select-none p-1.5 rounded-xl flex items-center gap-1.5 cursor-move ${
                              item.type === 'text' ? getMemeFontStyle(item.fontStyle || 'impact') : 'text-3xl'
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const dragStart = { x: e.clientX, y: e.clientY };
                              const startPos = { x: item.x, y: item.y };
                              const rect = (e.currentTarget.parentNode as HTMLElement).getBoundingClientRect();
                              
                              const handleMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = ((moveEvent.clientX - dragStart.x) / rect.width) * 100;
                                const deltaY = ((moveEvent.clientY - dragStart.y) / rect.height) * 100;
                                updateItemPosition(item.id, startPos.x + deltaX, startPos.y + deltaY);
                              };
                              
                              const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                              };
                              
                              window.addEventListener('mousemove', handleMouseMove);
                              window.addEventListener('mouseup', handleMouseUp);
                            }}
                          >
                            <span>{item.content}</span>
                            {item.creatorId === currentUser.id && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteSandboxItem(item.id); }}
                                className="p-0.5 bg-black/60 rounded border border-white/10 text-stone-500 hover:text-rose-400 pointer-events-auto"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Overlay Controls */}
                      <div className="relative z-30 flex items-center justify-between w-full pointer-events-none">
                        <span className="bg-black/60 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider text-amber-400 border border-white/5 pointer-events-auto">
                          Board theme: {sandboxTheme.replace('-', ' ').toUpperCase()}
                        </span>
                        
                        <div className="flex gap-2 pointer-events-auto">
                          <button
                            onClick={clearCanvasBoard}
                            className="px-2.5 py-1 bg-stone-900 border border-stone-850 hover:bg-rose-950/40 text-stone-400 hover:text-rose-400 rounded-lg text-[9px] font-bold transition-all active:scale-95"
                          >
                            Clear Board
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Sandbox Control Deck */}
                    <div className="w-full md:w-80 flex flex-col overflow-y-auto gap-4 pr-1 text-left">
                      
                      {/* Theme Selector */}
                      <div className="bg-[#121110] border border-stone-850 rounded-2xl p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">Backdrop Selection</h4>
                        <div className="grid grid-cols-2 gap-2 text-[9px] font-bold">
                          {(['gradient-sunset', 'cozy-woodland', 'neon-future'] as const).map(theme => (
                            <button
                              key={theme}
                              onClick={() => handleUpdateSandboxTheme(theme)}
                              className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                                sandboxTheme === theme 
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                                  : 'bg-stone-950 border-stone-900 text-stone-500 hover:text-stone-300'
                              }`}
                            >
                              {theme.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Drawing Brush configs */}
                      <div className="bg-[#121110] border border-stone-850 rounded-2xl p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">Whiteboard brush</h4>
                        
                        <div className="flex items-center justify-between gap-3 text-[9px]">
                          <span className="text-stone-500">Color:</span>
                          <div className="flex items-center gap-1.5">
                            {['#E11D48', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#FFFFFF'].map(c => (
                              <button
                                key={c}
                                onClick={() => setBrushColor(c)}
                                style={{ backgroundColor: c }}
                                className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${brushColor === c ? 'border-amber-400 scale-110' : 'border-stone-800'}`}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-3 text-[9px] mt-3">
                          <span className="text-stone-500">Size:</span>
                          <input
                            type="range"
                            min="2"
                            max="20"
                            value={brushSize}
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="flex-1 accent-amber-500 h-1 bg-stone-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Decors & Memes placement */}
                      <div className="bg-[#121110] border border-stone-850 rounded-2xl p-4 flex flex-col gap-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400">Sandbox Items Gallery</h4>
                        
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-stone-500 font-bold">Collaborative Stickers:</span>
                          <div className="grid grid-cols-3 gap-2 mt-1.5 text-[9px] font-bold">
                            {STICKER_PRESETS.map(item => (
                              <button
                                key={item.id}
                                onClick={() => addSandboxSticker(item.id)}
                                className="bg-stone-950 border border-stone-900 hover:border-amber-500/40 p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all cursor-pointer hover:scale-105"
                              >
                                <span className="text-xl">{item.char}</span>
                                <span className="text-[7px] text-stone-500 block truncate w-full">{item.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-stone-500 font-bold">Emojis:</span>
                          <div className="flex items-center gap-2.5 mt-1.5">
                            {['🍔', '🍕', '🎮', '💡', '🔔', '🚀', '🔥', '👑'].map(em => (
                              <button
                                key={em}
                                onClick={() => addSandboxEmoji(em)}
                                className="text-xl hover:scale-125 transition-all cursor-pointer"
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-stone-900/60 pt-3">
                          <span className="text-[8px] uppercase tracking-wider text-stone-500 font-bold">Place Text Label:</span>
                          <div className="flex flex-col gap-2 mt-1.5">
                            <input
                              type="text"
                              placeholder="Type text label..."
                              value={selectedSandboxText}
                              onChange={(e) => setSelectedSandboxText(e.target.value)}
                              className="w-full bg-stone-950 border border-stone-900 rounded-lg p-2 text-[9px] text-stone-200 focus:outline-none"
                            />
                            
                            <div className="flex items-center justify-between">
                              <select
                                value={studioFont}
                                onChange={(e: any) => setStudioFont(e.target.value)}
                                className="bg-stone-950 border border-stone-900 rounded-lg p-1.5 text-[8px] text-stone-400 font-bold cursor-pointer"
                              >
                                {MEME_FONTS.map(f => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={addSandboxTextItem}
                                className="px-3 py-1 bg-amber-500 text-stone-950 font-bold rounded-lg text-[9px] transition-all cursor-pointer"
                              >
                                Place Text
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 3. Ambient Tab Panel */}
                {activeTab === 'ambient' && (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6 text-left">
                    
                    {/* Left Panel: Soundtrack Playlist */}
                    <div className="flex-1 bg-stone-950/60 border border-stone-900 rounded-3xl p-6 flex flex-col justify-between">
                      <div className="flex flex-col gap-4 text-xs">
                        <h3 className="font-extrabold text-amber-400 uppercase tracking-widest text-xs">Lounge Soundscapes</h3>
                        <p className="text-stone-500 text-[10px]">Select background music tracks to enhance the vibe. Audio streams loop automatically.</p>
                        
                        <div className="flex flex-col gap-3 mt-3">
                          {[
                            { id: 'lofi', name: 'Cozy Lo-Fi Coffee Shop ☕', desc: 'Chill beats, acoustic guitars, and low frequency warmth.' },
                            { id: 'cyber', name: 'Cyberpunk Neon Lounge 🪐', desc: 'Futuristic retrowave synthesizers with deep analog bass.' },
                            { id: 'space', name: 'Deep Space Ambient Echo 🌌', desc: 'Ethereal pad waves, cosmic reverb, and pitch shifted pads.' },
                            { id: 'jazz', name: 'Late Night Rainy Jazz 🎷', desc: 'Slow upright bass, soft piano scales, and rain fall backdrop.' }
                          ].map((track) => (
                            <div 
                              key={track.id}
                              className={`p-3 border rounded-2xl flex items-center justify-between transition-all ${
                                ambientTrack === track.id 
                                  ? 'bg-amber-500/5 border-amber-500/20' 
                                  : 'bg-[#121110] border-stone-900'
                              }`}
                            >
                              <div className="text-left">
                                <span className="font-extrabold text-stone-200 block text-[11px]">{track.name}</span>
                                <span className="text-[9px] text-stone-600 block mt-0.5">{track.desc}</span>
                              </div>
                              <button
                                onClick={() => handleAmbientPlayPause(track.id)}
                                className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
                                  ambientTrack === track.id && isAmbientPlaying
                                    ? 'bg-amber-500 text-stone-950'
                                    : 'bg-stone-950 hover:bg-stone-900 border border-stone-850 text-stone-400'
                                }`}
                              >
                                {ambientTrack === track.id && isAmbientPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Volume selector */}
                      {ambientTrack !== 'none' && (
                        <div className="flex items-center gap-4 bg-stone-950 border border-stone-900 rounded-2xl p-4 mt-6">
                          <Volume2 className="w-4 h-4 text-stone-500" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={ambientVolume}
                            onChange={(e) => setAmbientVolume(parseInt(e.target.value))}
                            className="flex-1 accent-amber-500 h-1 bg-stone-900 rounded-lg cursor-pointer"
                          />
                          <span className="text-[10px] text-stone-400 font-mono w-8">{ambientVolume}%</span>
                        </div>
                      )}
                    </div>

                    {/* Right Panel: Synthesizer Board */}
                    <div className="w-full md:w-80 bg-stone-950/60 border border-stone-900 rounded-3xl p-6 flex flex-col gap-4 text-xs">
                      <h4 className="font-extrabold text-stone-300 uppercase tracking-wider text-xs">Sound Effect Synthesizer</h4>
                      <p className="text-stone-600 text-[9px] leading-relaxed">Trigger custom arpeggios, sub bass sweeps, and retro arcade powerup sounds using Web Audio API oscillators.</p>
                      
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {[
                          { id: 'magic', name: '✨ Magic Arp', color: 'from-purple-950 to-indigo-950 border-purple-900' },
                          { id: 'laser', name: '⚡ Sci-Fi Laser', color: 'from-cyan-950 to-indigo-950 border-cyan-900' },
                          { id: 'success', name: '🏆 Victory Fanfare', color: 'from-amber-950 to-orange-950 border-amber-900' },
                          { id: 'coin', name: '🪙 Retro Arcade', color: 'from-yellow-950 to-amber-950 border-yellow-900' },
                          { id: 'buzzer', name: '🚨 Warning Alert', color: 'from-rose-950 to-red-950 border-rose-900' }
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => playSynthSound(btn.id)}
                            className={`p-4 border rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer bg-gradient-to-tr ${btn.color} hover:scale-105 active:scale-95`}
                          >
                            <span className="font-extrabold text-stone-100 text-[10px] uppercase tracking-wider">{btn.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Games Tab Panel */}
                {activeTab === 'games' && (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6 text-left">
                    
                    {/* Left: Interactive Mini-Games Board */}
                    <div className="flex-1 bg-stone-950/60 border border-stone-900 rounded-3xl p-6 flex flex-col justify-between min-h-[300px]">
                      
                      {/* Sub-game Selection */}
                      <div className="flex items-center gap-2 border-b border-stone-900 pb-3">
                        <Gamepad2 className="w-5 h-5 text-amber-500" />
                        <span className="text-xs font-black uppercase tracking-wider text-stone-300">Lounge Games Deck</span>
                      </div>

                      {/* Games Area */}
                      <div className="flex-1 flex flex-col justify-center my-6">
                        
                        {/* Game 1: Trivia Quiz */}
                        {triviaStatus === 'idle' && (
                          <div className="text-center p-6">
                            <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-3 animate-bounce" />
                            <h3 className="font-extrabold text-stone-200 text-sm">Tech & Layout Trivia Quiz</h3>
                            <p className="text-[10px] text-stone-500 mt-1 max-w-xs mx-auto">Test your front-end layout styling and general CS architectures. Multi-player scoreboards are active.</p>
                            <button
                              onClick={handleResetTrivia}
                              className="px-5 py-2 bg-amber-500 text-stone-950 font-black rounded-xl text-[10px] uppercase tracking-widest mt-4 transition-all cursor-pointer hover:opacity-90 active:scale-95"
                            >
                              Start Trivia
                            </button>
                          </div>
                        )}

                        {triviaStatus === 'playing' && (
                          <div className="flex flex-col gap-4 text-xs text-left max-w-md mx-auto w-full">
                            <div className="flex items-center justify-between text-[10px] font-bold text-stone-500">
                              <span>Question {triviaCurrentQuestion + 1} of {TRIVIA_QUESTIONS.length}</span>
                              <span className="text-amber-400">Score: {triviaScore} pts</span>
                            </div>

                            <p className="font-extrabold text-stone-100 text-xs leading-normal">
                              {TRIVIA_QUESTIONS[triviaCurrentQuestion].question}
                            </p>

                            <div className="flex flex-col gap-2 mt-2">
                              {TRIVIA_QUESTIONS[triviaCurrentQuestion].options.map((opt, idx) => {
                                const isCorrect = idx === TRIVIA_QUESTIONS[triviaCurrentQuestion].answerIndex;
                                const isSelected = idx === triviaSelectedAnswer;
                                let btnStyle = 'bg-stone-950 border-stone-900 text-stone-300 hover:border-stone-850';
                                
                                if (triviaAnswered) {
                                  if (isCorrect) btnStyle = 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400';
                                  else if (isSelected) btnStyle = 'bg-rose-950/40 border-rose-500/30 text-rose-400';
                                }

                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleAnswerTriviaQuestion(idx)}
                                    disabled={triviaAnswered}
                                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-[10px] font-semibold cursor-pointer ${btnStyle}`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {triviaAnswered && (
                              <div className="bg-stone-900/60 p-3 rounded-xl border border-stone-850 mt-2 text-[9px] text-stone-400 leading-normal text-left">
                                <strong className="text-stone-200">Explanation: </strong>
                                {TRIVIA_QUESTIONS[triviaCurrentQuestion].explanation}
                                
                                <button
                                  onClick={handleNextTriviaQuestion}
                                  className="w-full mt-3 px-4 py-2 bg-amber-500 text-stone-950 font-black rounded-lg text-[9px] text-center transition-all cursor-pointer active:scale-95"
                                >
                                  {triviaCurrentQuestion + 1 < TRIVIA_QUESTIONS.length ? 'Next Question' : 'Complete Quiz'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {triviaStatus === 'gameover' && (
                          <div className="text-center p-6">
                            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                            <h3 className="font-extrabold text-stone-200 text-sm">Trivia Finished! 🏆</h3>
                            <p className="text-xs text-stone-400 mt-1">You scored a total of <span className="text-amber-400 font-extrabold">{triviaScore} points</span>.</p>
                            <button
                              onClick={handleResetTrivia}
                              className="px-5 py-2 bg-stone-900 border border-stone-850 hover:bg-stone-800 text-stone-200 font-black rounded-xl text-[10px] uppercase tracking-widest mt-4 transition-all cursor-pointer active:scale-95"
                            >
                              Play Again
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Panel: Party Dice roller */}
                    <div className="w-full md:w-80 bg-stone-950/60 border border-stone-900 rounded-3xl p-6 flex flex-col justify-between text-left">
                      <div className="flex flex-col gap-4 text-xs">
                        <h4 className="font-extrabold text-stone-300 uppercase tracking-wider text-xs">Dice roller</h4>
                        <p className="text-stone-600 text-[9px] leading-relaxed">Roll 1, 2, or 3 standard dice to resolve charades order or select game coordinates.</p>
                        
                        <div className="flex justify-center gap-4 my-6">
                          {rolledDice.length === 0 ? (
                            <div className="w-14 h-14 bg-stone-900 border border-stone-850 rounded-2xl flex items-center justify-center text-stone-600 text-3xl font-black">?</div>
                          ) : (
                            rolledDice.map((d, i) => (
                              <motion.div
                                key={i}
                                animate={isRolling ? { rotate: 360 } : { rotate: 0 }}
                                transition={{ duration: 0.5 }}
                                className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-yellow-500 text-stone-950 border border-amber-400 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-500/10"
                              >
                                {d}
                              </motion.div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          {[1, 2, 3].map(cnt => (
                            <button
                              key={cnt}
                              onClick={() => rollDiceAction(cnt)}
                              className="flex-1 py-2 bg-stone-900 border border-stone-850 hover:border-amber-500/40 text-stone-400 hover:text-stone-200 font-bold rounded-xl text-[10px] transition-all cursor-pointer active:scale-95"
                            >
                              {cnt} Dice
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Snap Tab Panel */}
                {activeTab === 'snap' && (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6 text-left">
                    
                    {/* Left: Snaps creation polaroid cards */}
                    <div className="flex-1 bg-stone-950/60 border border-stone-900 rounded-3xl p-6 flex flex-col justify-between">
                      <div className="flex flex-col gap-4 text-xs">
                        <h3 className="font-extrabold text-amber-400 uppercase tracking-widest text-xs">Polaroid Snap Studio</h3>
                        <p className="text-stone-500 text-[10px]">Create temporary snapshot notes that other participants can click to open and view. Snaps self-destruct after duration.</p>
                        
                        <div className="flex flex-col gap-3 mt-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-stone-500 text-[9px] font-bold">Caption:</span>
                            <input
                              type="text"
                              placeholder="Write caption notes..."
                              value={snapCreateCaption}
                              onChange={(e) => setSnapCreateCaption(e.target.value)}
                              className="w-full bg-[#0d0c0b] border border-stone-900 rounded-xl p-2.5 text-[10px] text-stone-200 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-stone-500 text-[9px] font-bold">Theme Style:</span>
                              <select
                                value={snapCreateBg}
                                onChange={(e) => setSnapCreateBg(e.target.value)}
                                className="w-full bg-[#0d0c0b] border border-stone-900 rounded-xl p-2 text-[10px] text-stone-400 font-bold cursor-pointer"
                              >
                                <option value="gradient-sunset">🌅 Sunset Gold</option>
                                <option value="gradient-wood">🌲 Woodland Green</option>
                                <option value="gradient-cyber">👾 Cyber Neon</option>
                                <option value="gradient-luxe">💎 Luxe Velvet</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-stone-500 text-[9px] font-bold">Self-Destruct duration:</span>
                              <select
                                value={snapCreateDuration}
                                onChange={(e) => setSnapCreateDuration(parseInt(e.target.value))}
                                className="w-full bg-[#0d0c0b] border border-stone-900 rounded-xl p-2 text-[10px] text-stone-400 font-bold cursor-pointer"
                              >
                                <option value="3">3 Seconds</option>
                                <option value="5">5 Seconds</option>
                                <option value="10">10 Seconds</option>
                                <option value="30">30 Seconds</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleCreateSnapSubmit}
                        className="w-full py-2.5 bg-amber-500 hover:opacity-90 text-stone-950 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all mt-6 active:scale-95 cursor-pointer shadow-lg shadow-amber-500/10"
                      >
                        Publish Snap Card
                      </button>
                    </div>

                    {/* Right Panel: Shared snaps list */}
                    <div className="w-full md:w-80 bg-stone-950/60 border border-stone-900 rounded-3xl p-6 flex flex-col gap-4 text-xs relative">
                      <h4 className="font-extrabold text-stone-300 uppercase tracking-wider text-xs">Shared snaps in room</h4>
                      <p className="text-stone-600 text-[9px] leading-relaxed">Click any card to open the disappearing snap view.</p>
                      
                      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 max-h-64">
                        {snaps.length === 0 ? (
                          <div className="my-auto text-center p-4">
                            <Tv className="w-6 h-6 text-stone-800 mx-auto mb-2" />
                            <p className="text-[8px] text-stone-600 font-bold uppercase tracking-wider">No active snaps</p>
                          </div>
                        ) : (
                          snaps.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                playSynthSound('coin');
                                setActiveViewingSnap(s);
                                setSnapViewTimeLeft(s.duration);
                                const timer = setInterval(() => {
                                  setSnapViewTimeLeft(prev => {
                                    if (prev <= 1) {
                                      clearInterval(timer);
                                      setActiveViewingSnap(null);
                                      playSynthSound('buzzer');
                                      return 0;
                                    }
                                    return prev - 1;
                                  });
                                }, 1000);
                              }}
                              className={`p-3 bg-[#121110] border border-stone-900 hover:border-amber-500/30 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer hover:scale-[1.02]`}
                            >
                              <div>
                                <span className="text-[10px] font-extrabold text-stone-200 block truncate w-36">@{s.creatorUsername}'s Snap</span>
                                <span className="text-[8px] text-stone-600 font-bold uppercase tracking-widest block mt-0.5">⏱️ {s.duration}s Card</span>
                              </div>
                              <span className="text-stone-600 text-lg">📸</span>
                            </button>
                          ))
                        )}
                      </div>

                      {/* Snap Disappear Viewer Modal */}
                      {activeViewingSnap && (
                        <div className="absolute inset-0 bg-stone-950/95 z-50 rounded-3xl p-5 flex flex-col justify-between items-center text-center">
                          <div className="flex items-center justify-between w-full">
                            <span className="bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-rose-400 border border-rose-900/20">
                              ⏱️ Self-Destruct in {snapViewTimeLeft}s
                            </span>
                          </div>
                          
                          <div className={`w-full aspect-square rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg bg-gradient-to-tr ${
                            activeViewingSnap.bg_style === 'gradient-sunset' ? 'from-orange-500/20 to-yellow-500/20 text-yellow-300' :
                            activeViewingSnap.bg_style === 'gradient-wood' ? 'from-amber-950/20 to-emerald-800/20 text-emerald-300' :
                            activeViewingSnap.bg_style === 'gradient-cyber' ? 'from-indigo-950/30 to-purple-800/30 text-emerald-400' :
                            'from-purple-950/20 to-pink-800/20 text-rose-300'
                          }`}>
                            <p className="text-xs font-black uppercase tracking-wider leading-relaxed px-4 break-words">
                              {activeViewingSnap.caption}
                            </p>
                          </div>

                          <span className="text-[8px] text-stone-600 font-mono">Disappearing Polaroid Card</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
            {/* User Profile Popover Modal */}
            <AnimatePresence>
              {selectedLoungeProfile && (
                <div
                  className="absolute inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 text-center"
                  onClick={() => setSelectedLoungeProfile(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-stone-900 border border-stone-850 rounded-3xl p-6 shadow-2xl relative max-w-sm w-full text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => setSelectedLoungeProfile(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col items-center text-center mt-2 mb-4">
                      <div className="relative">
                        {selectedLoungeProfile.avatar ? (
                          <img
                            src={selectedLoungeProfile.avatar}
                            alt={selectedLoungeProfile.username}
                            className="w-20 h-20 rounded-full object-cover border-4 border-stone-850 bg-neutral-800 shadow-xl"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-stone-800 flex items-center justify-center text-4xl shadow-xl border-4 border-stone-850">
                            👤
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-stone-900 rounded-full flex items-center justify-center text-[9px] font-bold text-white">●</span>
                      </div>

                      <h3 className="font-extrabold text-base text-stone-100 mt-3">
                        {selectedLoungeProfile.name}
                      </h3>
                      <p className="text-xs text-stone-400 font-mono">
                        @{selectedLoungeProfile.username}
                      </p>

                      <p className="text-xs text-stone-300 px-4 mt-3 leading-relaxed italic text-center">
                        "{selectedLoungeProfile.bio || 'Exploring the live chat lounge.'}"
                      </p>
                    </div>

                    {/* Stats rows */}
                    <div className="grid grid-cols-2 gap-2 py-3 border-y border-stone-850 my-4 text-center">
                      <div className="border-r border-stone-850">
                        <strong className="text-stone-100 text-sm font-extrabold block">
                          {selectedLoungeProfile.followers?.length || 0}
                        </strong>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400">Followers</span>
                      </div>
                      <div>
                        <strong className="text-stone-100 text-sm font-extrabold block">
                          {selectedLoungeProfile.following?.length || 0}
                        </strong>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400">Following</span>
                      </div>
                    </div>

                    <div className="bg-stone-950/50 rounded-2xl p-3 flex items-center justify-between mb-4 border border-stone-850">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-stone-950 shadow">
                          <Hand className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <span className="text-[8px] text-stone-500 font-extrabold block uppercase tracking-wider">High-Fives Exchanged</span>
                          <span className="text-[10px] font-bold text-stone-300">
                            You sent {highFivesSent[selectedLoungeProfile.id] || 0} high-fives
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          playSynthSound('coin');
                          setHighFivesSent(prev => ({
                            ...prev,
                            [selectedLoungeProfile.id]: (prev[selectedLoungeProfile.id] || 0) + 1
                          }));

                          // Broadcast/insert high five message
                          if (activeRoom && isSupabaseConfigured && supabase) {
                            await supabase
                              .from('lounge_messages')
                              .insert({
                                room_id: activeRoom.id,
                                sender_id: currentUser.id,
                                text: `✋ sent @${selectedLoungeProfile.username} a warm high-five!`
                              });
                          }
                        }}
                        className="px-2.5 py-1.5 bg-amber-500 text-stone-950 font-black rounded-lg text-[9px] transition-all cursor-pointer active:scale-95"
                      >
                        Wave ✋
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => setSelectedLoungeProfile(null)}
                        className="py-2 rounded-xl bg-stone-950 border border-stone-850 text-stone-400 hover:text-stone-200 font-bold text-xs text-center transition-all cursor-pointer"
                      >
                        Keep Browsing
                      </button>
                      <button
                        onClick={() => {
                          const profileId = selectedLoungeProfile.id;
                          setSelectedLoungeProfile(null);
                          onClose();
                          if (onViewProfile) {
                            onViewProfile(profileId);
                          }
                        }}
                        className="py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md"
                      >
                        <span>Full Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
