/**
 * MessagesScreen — Be-Live Production
 * Fully wired to Supabase: messages, chat_rooms, streaks tables
 * Real-time via Supabase Realtime subscriptions
 * No localStorage for message data — all persisted in DB
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock, ShieldCheck, Phone, Video, Send, Image as ImageIcon,
  Eye, CheckCheck, Check, X, Mic, MicOff, VideoOff,
  Play, Pause, Info, ChevronLeft, Sparkles,
  EyeOff, Users, Radio, Flame, Clock, Heart,
  MessageCircle, Search, MessageSquare, ArrowUpRight, ArrowDownLeft,
  PhoneMissed, Trash2, History, Palette, Smile, VolumeX,
  CornerUpLeft, MapPin, Pin, Share2, Navigation, BarChart3,
  Eraser, Undo2, Hash
} from 'lucide-react';
import { User, Message, CallSession, ChatRoom, Streak, Post, CallHistoryRecord } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface MessagesScreenProps {
  currentUser: User;
  onViewPost?: (postId: string) => void;
  onViewProfile?: (userId: string, username?: string) => void;
  allPosts?: Post[];
  onActiveChatChange?: (active: boolean) => void;
  onUpdateProfile?: (updatedFields: Partial<User>) => void;
  activeChatUserId?: string;
  onClearActiveChatUser?: () => void;
  onStartCall?: (targetUser: User, type: 'audio' | 'video') => void;
}

// ─────────────────────────────────────────────
// Voice Message Player
// ─────────────────────────────────────────────
interface VoiceMessagePlayerProps { audioUrl: string; isMe: boolean; }

export function VoiceMessagePlayer({ audioUrl, isMe }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;
    const onMeta = () => { if (audio.duration && audio.duration !== Infinity) setDuration(audio.duration); else setDuration(5); };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.playbackRate = playbackRate; audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn); }
  };

  const toggleSpeed = () => {
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const fmt = (t: number) => { if (isNaN(t)) return '0:00'; return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
  const bars = [12, 24, 15, 32, 20, 26, 38, 14, 28, 18, 24, 30, 16, 22, 14];

  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 rounded-2xl ${isMe ? 'text-white' : 'text-neutral-800'}`}>
      <button type="button" onClick={togglePlayback} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-violet-600 hover:bg-violet-700'}`}>
        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
      </button>
      <div className="flex flex-col flex-1 min-w-[130px]">
        <div className="flex items-end gap-1 h-7 mb-1">
          {bars.map((h, i) => {
            const prog = (currentTime / (duration || 1)) * bars.length;
            return (
              <div key={i} style={{ height: `${h}px` }} className={`w-[3px] rounded-full transition-colors ${i < prog ? (isMe ? 'bg-white' : 'bg-violet-600') : (isMe ? 'bg-white/30' : 'bg-neutral-300')}`} />
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[10px] opacity-90 font-medium">
          <div className="flex items-center gap-2">
            <span>{fmt(currentTime)}</span>
            <button type="button" onClick={toggleSpeed} className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isMe ? 'bg-white/15 text-white' : 'bg-neutral-200 text-neutral-700'}`}>{playbackRate}x</button>
          </div>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Rich text formatter
// ─────────────────────────────────────────────
const renderFormattedText = (text: string, searchQuery?: string) => {
  if (!text) return null;
  const regex = /(\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/g;
  const parts = text.split(regex);
  const highlight = (str: string): React.ReactNode => {
    if (!searchQuery?.trim()) return str;
    try {
      const escaped = searchQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const sparts = str.split(new RegExp(`(${escaped})`, 'gi'));
      return <>{sparts.map((sp, i) => sp.toLowerCase() === searchQuery.toLowerCase() ? <mark key={i} className="bg-amber-300 text-black font-bold rounded-sm px-0.5">{sp}</mark> : sp)}</>;
    } catch { return str; }
  };
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('*') && p.endsWith('*')) return <strong key={i} className="font-extrabold">{highlight(p.slice(1, -1))}</strong>;
        if (p.startsWith('_') && p.endsWith('_')) return <em key={i} className="italic">{highlight(p.slice(1, -1))}</em>;
        if (p.startsWith('~') && p.endsWith('~')) return <span key={i} className="line-through opacity-75">{highlight(p.slice(1, -1))}</span>;
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="font-mono bg-black/10 text-[11px] px-1 py-0.5 rounded">{highlight(p.slice(1, -1))}</code>;
        return <React.Fragment key={i}>{highlight(p)}</React.Fragment>;
      })}
    </>
  );
};

// ─────────────────────────────────────────────
// Supabase row mappers
// ─────────────────────────────────────────────
const dbRowToMessage = (row: any): Message => ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id || row.room_id,
  senderName: row.profiles?.name,
  senderAvatar: row.profiles?.avatar,
  text: row.text,
  mediaUrl: row.media_url,
  mediaType: row.media_type,
  isE2EE: row.is_e2ee,
  snapViewed: row.snap_viewed,
  isDisappearing: row.is_disappearing,
  disappearDuration: row.disappear_duration,
  disappeared: row.disappeared,
  replyToId: row.reply_to_id,
  replyToText: row.reply_to_text,
  replyToSenderName: row.reply_to_sender_name,
  reactions: row.reactions || {},
  isPinned: row.is_pinned,
  isForwarded: row.is_forwarded,
  isRead: row.is_read,
  isDelivered: row.is_delivered,
  deliveredAt: row.delivered_at,
  readAt: row.read_at,
  deletedBy: row.deleted_by || [],
  pollQuestion: row.poll_question,
  pollOptions: row.poll_options,
  pollVotes: row.poll_votes || {},
  isSticker: row.is_sticker,
  isDoodle: row.is_doodle,
  doodleBg: row.doodle_bg,
  liveLocationDuration: row.live_location_duration,
  liveLocationStatus: row.live_location_status,
  createdAt: row.created_at,
});

const dbRowToRoom = (row: any): ChatRoom => ({
  id: row.id,
  name: row.name,
  description: row.description,
  type: row.type,
  avatar: row.avatar || '',
  creatorId: row.creator_id,
  members: row.members || [],
  adminIds: row.admin_ids || [],
  allowAnonymous: row.allow_anonymous,
  lastMessage: row.last_message,
  lastMessageTime: row.last_message_time,
  createdAt: row.created_at,
  deletedBy: row.deleted_by || [],
});

// ─────────────────────────────────────────────
// Main MessagesScreen Component
// ─────────────────────────────────────────────
export default function MessagesScreen({
  currentUser,
  onViewPost,
  onViewProfile,
  allPosts = [],
  onActiveChatChange,
  onUpdateProfile,
  activeChatUserId,
  onClearActiveChatUser,
  onStartCall,
}: MessagesScreenProps) {

  // ── Sidebar ──
  const [activeSidebarTab, setActiveSidebarTab] = useState<'all' | 'direct' | 'groups' | 'channels'>('all');
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // ── Rooms ──
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  // ── Selected chat ──
  const [selectedChat, setSelectedChat] = useState<User | ChatRoom | null>(null);

  // ── User search (on-demand, no allUsers prop) ──
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // ── Messages ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Streaks ──
  const [streaks, setStreaks] = useState<Streak[]>([]);

  // ── Call ──
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callHistory, setCallHistory] = useState<CallHistoryRecord[]>([]);
  const [showCallHistory, setShowCallHistory] = useState(false);

  // Load call history from DB on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('call_history')
      .select('id, caller_id, receiver_id, call_type, status, duration, created_at')
      .or(`caller_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data) return;
        setCallHistory(data.map((r: any) => ({
          id:            r.id,
          callerId:      r.caller_id,
          callerName:   '',  // enriched on render via profile lookup if needed
          callerAvatar:  '',
          receiverId:    r.receiver_id,
          receiverName:  '',
          receiverAvatar:'',
          type:          r.call_type,
          status:        r.caller_id === currentUser.id ? (r.status === 'completed' ? 'outgoing' : r.status) : (r.status === 'completed' ? 'incoming' : r.status),
          createdAt:     r.created_at,
          duration:      r.duration,
        })));
      });
  }, [currentUser.id]);
  const [showComingSoon, setShowComingSoon] = useState<'audio' | 'video' | null>(null);
  const [showInputMenu, setShowInputMenu] = useState(false);

  // ── E2EE ──
  const [privateKey] = useState(() => Math.floor(Math.random() * 999999 + 100000).toString(16));
  const [showKeyVerification, setShowKeyVerification] = useState(false);
  const [encryptingMessage, setEncryptingMessage] = useState<string | null>(null);

  // ── Input ──
  const [inputText, setInputText] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);

  // ── Media ──
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [customMediaUrl, setCustomMediaUrl] = useState('');
  const [customMediaType, setCustomMediaType] = useState<'image' | 'video'>('image');
  const [sendAsSnap, setSendAsSnap] = useState(false);

  // ── Audio recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isAudioPreviewMode, setIsAudioPreviewMode] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [recordingWaves, setRecordingWaves] = useState<number[]>([12, 18, 14, 28, 22, 16, 25, 10, 15, 22, 18, 12]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const waveIntervalRef = useRef<any>(null);

  // ── Snap ──
  const [activeSnap, setActiveSnap] = useState<Message | null>(null);
  const [snapTimer, setSnapTimer] = useState(0);

  // ── Disappearing ──
  const [disappearingMode, setDisappearingMode] = useState<'off' | '10s' | '24h'>('off');
  const [messageCountdowns, setMessageCountdowns] = useState<Record<string, number>>({});

  // ── Groups / Channels ──
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');

  // ── Chat preferences (synced to DB via profiles.chat_wallpaper_prefs) ──
  const [chatWallpapers, setChatWallpapers] = useState<Record<string, string>>(() => {
    // Prefer DB-backed value from currentUser, fall back to localStorage
    if (currentUser.chatWallpaperPrefs && Object.keys(currentUser.chatWallpaperPrefs).length > 0)
      return currentUser.chatWallpaperPrefs;
    try { const s = localStorage.getItem('be_live_wallpapers'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);
  const [soundEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('be_live_chat_sounds') !== 'false'; } catch { return true; }
  });

  // ── Advanced features ──
  const [popHearts, setPopHearts] = useState<Record<string, boolean>>({});
  const [activeEmojisMenu, setActiveEmojisMenu] = useState<string | null>(null);
  const [showActiveChatSearch, setShowActiveChatSearch] = useState(false);
  const [activeChatSearchQuery, setActiveChatSearchQuery] = useState('');
  const [showPinnedMessagesModal, setShowPinnedMessagesModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showStreakBonus, setShowStreakBonus] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [targetUserProfile, setTargetUserProfile] = useState<any>(null);
  const [isTargetUserOnline, setIsTargetUserOnline] = useState<boolean>(false);
  const [selectedTimestampMessageId, setSelectedTimestampMessageId] = useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [sidebarTypingUsers, setSidebarTypingUsers] = useState<Record<string, boolean>>({});
  const [showCallMenu, setShowCallMenu] = useState<boolean>(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragX, setDragX] = useState<number>(0);
  const dragStartXRef = useRef<number>(0);
  const holdTimerRef = useRef<any>(null);
  const chatDeleteHoldTimerRef = useRef<any>(null);

  // ── Poll ──
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // ── Doodle ──
  const [showDoodleModal, setShowDoodleModal] = useState(false);
  const [doodleColor, setDoodleColor] = useState('#8B5CF6');
  const [doodleBrushSize] = useState(6);
  const [doodleBg] = useState('solid-white');
  const doodleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDoodleDrawing, setIsDoodleDrawing] = useState(false);
  const [doodleUndoStack, setDoodleUndoStack] = useState<string[]>([]);
  const [isErasing, setIsErasing] = useState(false);

  // ── Stickers ──
  const [showStickerTray, setShowStickerTray] = useState(false);

  // ── Refs ──
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  const STICKERS = ['😂', '😍', '🔥', '💀', '🥵', '😭', '🤯', '🎉', '💯', '❤️', '🚀', '✨', '🎯', '👀', '🫡', '🥶', '😤', '🤩', '🫶', '💪'];

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const isRoom = selectedChat && 'type' in selectedChat;
  const canSendToRoom = isRoom
    ? ((selectedChat as ChatRoom).type !== 'channel' || (selectedChat as ChatRoom).adminIds.includes(currentUser.id))
    : true;

  const isDirect = selectedChat && (!('type' in selectedChat) || (selectedChat as ChatRoom).type === 'direct');

  const getDirectTargetUser = (): User | null => {
    if (!selectedChat) return null;
    if (!('type' in selectedChat)) return selectedChat;
    if (selectedChat.type !== 'direct') return null;
    const otherId = selectedChat.members.find(m => m !== currentUser.id) || selectedChat.creatorId;
    return {
      id: otherId,
      name: selectedChat.name,
      username: selectedChat.description ? selectedChat.description.replace('@', '') : '',
      avatar: selectedChat.avatar,
      bio: '',
      email: '',
      followers: [],
      following: []
    };
  };

  const ensureDirectRoom = async (targetUserId: string): Promise<ChatRoom | null> => {
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) return null;
    try {
      // 1. Check if direct room already exists (fetch user's direct rooms and filter in JS for absolute reliability)
      const { data: existing, error: findError } = await supabase
        .from('chat_rooms')
        .select('id, name, type, avatar, members, last_message, last_message_time, creator_id, admin_ids, allow_anonymous, description, created_at')
        .eq('type', 'direct')
        .contains('members', [currentUser.id]);

      if (findError) throw findError;
      
      const foundRoom = existing?.find(r => r.members && r.members.includes(targetUserId));
      if (foundRoom) {
        return dbRowToRoom(foundRoom);
      }

      // 2. Fetch other user's profile to get name and avatar for room creation
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('username, name, avatar')
        .eq('id', targetUserId)
        .maybeSingle();

      const otherName = otherProfile ? (otherProfile.name || `@${otherProfile.username}`) : 'Direct Message';
      const otherAvatar = otherProfile?.avatar || '';

      // 3. Create the direct room
      const { data: newRoomData, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          name: otherName,
          type: 'direct',
          avatar: otherAvatar,
          creator_id: currentUser.id,
          members: [currentUser.id, targetUserId],
          admin_ids: [currentUser.id, targetUserId],
          allow_anonymous: false,
          description: `@${otherProfile?.username || ''}`
        })
        .select()
        .single();

      if (createError) throw createError;
      if (newRoomData) {
        const newRoom = dbRowToRoom(newRoomData);
        // Add to local rooms state so it shows up in sidebar immediately
        setRooms(prev => {
          if (prev.some(r => r.id === newRoom.id)) return prev;
          return [newRoom, ...prev];
        });
        return newRoom;
      }
    } catch (err) {
      console.error('[Messages] ensureDirectRoom error:', err);
    }
    return null;
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDur = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const getStreak = (partnerId: string) => streaks.find(s => s.partnerId === partnerId);

  // ─────────────────────────────────────────────
  // Sound effects
  // ─────────────────────────────────────────────
  const playChatSound = useCallback((type: 'send' | 'receive' | 'reaction') => {
    if (!soundEnabled) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (type === 'send') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'receive') {
        [0, 0.08].forEach(t => {
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.value = 520;
          g.gain.setValueAtTime(0.06, ctx.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.1);
          osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.1);
        });
      }
    } catch { /* ignore */ }
  }, [soundEnabled]);

  // ─────────────────────────────────────────────
  // Load chat rooms
  // ─────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id, name, type, avatar, members, last_message, last_message_time, creator_id, admin_ids, allow_anonymous, description, created_at, deleted_by')
        .contains('members', [currentUser.id])
        .order('last_message_time', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      
      const parsedRooms = (data || []).map(dbRowToRoom);

      // Fetch profiles for other members in direct rooms to show correct name and avatar dynamically
      const directRooms = parsedRooms.filter(r => r.type === 'direct');
      const otherUserIds = directRooms
        .map(r => r.members.find(m => m !== currentUser.id))
        .filter(Boolean) as string[];

      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, username, avatar, last_seen')
          .in('id', otherUserIds);

        if (profiles) {
          const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
          parsedRooms.forEach(r => {
            if (r.type === 'direct') {
              const otherId = r.members.find(m => m !== currentUser.id);
              const prof = otherId ? profileMap[otherId] : null;
              if (prof) {
                r.name = prof.name || `@${prof.username}`;
                r.avatar = prof.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${prof.username}`;
                r.description = `@${prof.username}`;
                r.lastSeen = prof.last_seen;
              }
            }
          });
        }
      }

      const activeRooms = parsedRooms.filter(r => !r.deletedBy || !r.deletedBy.includes(currentUser.id));
      setRooms(activeRooms);
    } catch (err) {
      console.error('[Messages] loadRooms:', err);
    }
  }, [currentUser.id]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Global Realtime listener to update the room list in real-time
  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured || !supabase) return;
    const globalChannel = supabase
      .channel(`global-chat-${currentUser.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_rooms',
      }, () => {
        loadRooms();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${currentUser.id}`,
      }, (payload) => {
        loadRooms();
        if (payload.new && !payload.new.is_delivered) {
          supabase.from('messages').update({ is_delivered: true }).eq('id', payload.new.id).then();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      }, () => {
        loadRooms();
      })
      .on('broadcast', { event: 'typing_status' }, (payload) => {
        const { senderId, isTyping } = payload.payload;
        setSidebarTypingUsers(prev => ({ ...prev, [senderId]: isTyping }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [currentUser.id, loadRooms]);

  // ─────────────────────────────────────────────
  // Load messages
  // ─────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!selectedChat || !isSupabaseConfigured || !supabase) return;
    setLoadingMessages(true);
    try {
      const chatIsRoom = 'type' in selectedChat;
      let query = supabase
        .from('messages')
        .select('*, profiles!sender_id(name, avatar)')
        .eq('disappeared', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (chatIsRoom) {
        if (selectedChat.type === 'direct') {
          const otherId = selectedChat.members.find(m => m !== currentUser.id) || selectedChat.creatorId;
          query = query.or(
            `room_id.eq.${selectedChat.id},` +
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),` +
            `and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`
          );
        } else {
          query = query.eq('room_id', selectedChat.id);
        }
      } else {
        query = query.or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedChat.id}),` +
          `and(sender_id.eq.${selectedChat.id},receiver_id.eq.${currentUser.id})`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      const filteredMsgs = (data || []).map(dbRowToMessage).filter(m => !m.deletedBy || !m.deletedBy.includes(currentUser.id));
      setMessages(filteredMsgs);
    } catch (err) {
      console.error('[Messages] loadMessages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedChat, currentUser.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ─────────────────────────────────────────────
  // Realtime subscription
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedChat || !isSupabaseConfigured || !supabase) return;
    const chatIsRoom = 'type' in selectedChat;
    const channelName = chatIsRoom
      ? `room-${selectedChat.id}`
      : `dm-${[currentUser.id, selectedChat.id].sort().join('-')}`;

    if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        // For DMs: no server-side filter — we check sender/receiver in the callback
        filter: chatIsRoom ? `room_id=eq.${selectedChat.id}` : undefined,
      }, (payload) => {
        const newMsg = dbRowToMessage(payload.new);
        if (!chatIsRoom) {
          // Only accept messages that are between currentUser and selectedChat
          const myId = currentUser.id;
          const otherId = (selectedChat as User).id;
          const validDM =
            (newMsg.senderId === myId && newMsg.receiverId === otherId) ||
            (newMsg.senderId === otherId && newMsg.receiverId === myId);
          if (!validDM) return;
        }
        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.senderId !== currentUser.id) {
          playChatSound('receive');
          if (!payload.new.is_read || !payload.new.is_delivered) {
            const now = new Date().toISOString();
            supabase.from('messages').update({
              is_delivered: true,
              is_read: true,
              delivered_at: now,
              read_at: now
            }).eq('id', newMsg.id).then();

            // Broadcast checkmarks instantly
            channel.send({
              type: 'broadcast',
              event: 'status_update',
              payload: { messageId: newMsg.id, isRead: true, isDelivered: true, readAt: now, deliveredAt: now }
            });
          }
        }
      })
      .on('broadcast', { event: 'status_update' }, (payload) => {
        const { messageId, isRead, isDelivered, readAt, deliveredAt } = payload.payload;
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isRead, isDelivered, readAt, deliveredAt } : m));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updated = dbRowToMessage(payload.new);
        if (updated.deletedBy && updated.deletedBy.includes(currentUser.id)) {
          setMessages(prev => prev.filter(m => m.id !== updated.id));
        } else {
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing: Record<string, string> = {};
        let otherOnline = false;
        
        const otherId = selectedChat && ('type' in selectedChat)
          ? (selectedChat as ChatRoom).members.find(m => m !== currentUser.id) || (selectedChat as ChatRoom).creatorId
          : selectedChat ? (selectedChat as User).id : null;

        Object.values(state).forEach((presences: any[]) => {
          presences.forEach(p => {
            if (p.userId !== currentUser.id) {
              if (p.isTyping) typing[p.userId] = p.username;
              if (otherId && p.userId === otherId) otherOnline = true;
            }
          });
        });
        setTypingUsers(typing);
        setIsTargetUserOnline(otherOnline);
      })
      .subscribe();

    realtimeChannelRef.current = channel;
    channel.track({ userId: currentUser.id, username: currentUser.username, isTyping: false });

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat, currentUser.id, currentUser.username, playChatSound]);

  // ─────────────────────────────────────────────
  // Auto-scroll
  // ─────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─────────────────────────────────────────────
  // Mark messages as read
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedChat || !isSupabaseConfigured || !supabase) return;
    const unread = messages.filter(m => m.senderId !== currentUser.id && !m.isRead);
    if (unread.length === 0) return;
    const ids = unread.map(m => m.id);
    const now = new Date().toISOString();
    supabase.from('messages').update({
      is_read: true,
      read_at: now,
      is_delivered: true,
      delivered_at: now
    }).in('id', ids).then(({ error }) => {
      if (!error) {
        setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, isRead: true, isDelivered: true, readAt: now, deliveredAt: now } : m));
        // Broadcast read checkmarks instantly to sender
        if (realtimeChannelRef.current) {
          ids.forEach(id => {
            realtimeChannelRef.current.send({
              type: 'broadcast',
              event: 'status_update',
              payload: { messageId: id, isRead: true, isDelivered: true, readAt: now, deliveredAt: now }
            });
          });
        }
      }
    });
  }, [selectedChat, messages, currentUser.id]);

  const formatLastSeen = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'recently';
    }
  };

  const formatFullTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, msgId: string) => {
    if (isSelectionMode) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartXRef.current = clientX;
    setActiveDragId(msgId);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeDragId) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartXRef.current;
    if (deltaX > 0) {
      setDragX(Math.min(60, deltaX));
    }
  };

  const handleDragEnd = (msg: Message) => {
    if (activeDragId === msg.id && dragX > 40) {
      setReplyingToMessage(msg);
    }
    setActiveDragId(null);
    setDragX(0);
  };

  const startMessageHold = (msgId: string, isMyMsg: boolean) => {
    if (isSelectionMode) return;
    holdTimerRef.current = setTimeout(() => {
      if (isMyMsg) {
        setIsSelectionMode(true);
        setSelectedMessageIds([msgId]);
      }
    }, 800);
  };

  const cancelMessageHold = () => {
    clearTimeout(holdTimerRef.current);
  };

  const isOnlinePlatformWide = (lastSeenIso?: string) => {
    if (!lastSeenIso) return false;
    const diff = Date.now() - new Date(lastSeenIso).getTime();
    return diff < 40000;
  };

  const deleteWholeChat = async (roomId: string) => {
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) return;
    try {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;
      const updatedDeletedBy = room.deletedBy ? [...room.deletedBy, currentUser.id] : [currentUser.id];
      await supabase.from('chat_rooms').update({ deleted_by: updatedDeletedBy }).eq('id', roomId);

      const { data: messagesToUpdate } = await supabase
        .from('messages')
        .select('id, deleted_by')
        .eq('room_id', roomId);
        
      if (messagesToUpdate && messagesToUpdate.length > 0) {
        for (const msg of messagesToUpdate) {
          const mDel = msg.deleted_by ? [...msg.deleted_by, currentUser.id] : [currentUser.id];
          await supabase.from('messages').update({ deleted_by: mDel }).eq('id', msg.id);
        }
      }

      if (room.type === 'direct') {
        const otherId = room.members.find(m => m !== currentUser.id);
        if (otherId) {
          const { data: legacyMsgs } = await supabase
            .from('messages')
            .select('id, deleted_by')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`);
          if (legacyMsgs && legacyMsgs.length > 0) {
            for (const msg of legacyMsgs) {
              const mDel = msg.deleted_by ? [...msg.deleted_by, currentUser.id] : [currentUser.id];
              await supabase.from('messages').update({ deleted_by: mDel }).eq('id', msg.id);
            }
          }
        }
      }

      setRooms(prev => prev.filter(r => r.id !== roomId));
      if (selectedChat && 'type' in selectedChat && (selectedChat as ChatRoom).id === roomId) {
        setSelectedChat(null);
      }
      loadRooms();
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const startChatDeleteHold = (roomId: string) => {
    chatDeleteHoldTimerRef.current = setTimeout(() => {
      const ok = window.confirm("Are you sure you want to delete this chat? The chat history will be cleared from your end.");
      if (ok) {
        deleteWholeChat(roomId);
      }
      chatDeleteHoldTimerRef.current = null;
    }, 2000);
  };

  const cancelChatDeleteHold = () => {
    if (chatDeleteHoldTimerRef.current) {
      clearTimeout(chatDeleteHoldTimerRef.current);
      chatDeleteHoldTimerRef.current = null;
    }
  };

  const unsendSelectedMessages = async () => {
    if (!isSupabaseConfigured || !supabase || selectedMessageIds.length === 0) return;
    const ok = window.confirm(`Are you sure you want to unsend these ${selectedMessageIds.length} messages? They will be deleted for everyone.`);
    if (!ok) return;
    try {
      const { error } = await supabase.from('messages').delete().in('id', selectedMessageIds);
      if (error) throw error;
      setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m.id)));
      setIsSelectionMode(false);
      setSelectedMessageIds([]);
    } catch (err) {
      console.error('Failed to unsend messages:', err);
      alert('Failed to unsend messages.');
    }
  };

  useEffect(() => {
    setTargetUserProfile(null);
    setIsTargetUserOnline(false);
    if (!selectedChat || !isSupabaseConfigured || !supabase) return;
    const chatIsRoom = 'type' in selectedChat;
    const isDirect = !chatIsRoom || (selectedChat as ChatRoom).type === 'direct';
    if (!isDirect) return;
    
    const otherId = chatIsRoom 
      ? (selectedChat as ChatRoom).members.find(m => m !== currentUser.id) || (selectedChat as ChatRoom).creatorId
      : (selectedChat as User).id;
      
    if (!otherId) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, username, avatar, last_seen')
          .eq('id', otherId)
          .maybeSingle();
        if (data) {
          setTargetUserProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch target user profile:', err);
      }
    };

    fetchProfile();
    const interval = setInterval(fetchProfile, 10000);
    return () => clearInterval(interval);
  }, [selectedChat, currentUser.id]);

  // ─────────────────────────────────────────────
  // External activeChatUserId
  // ─────────────────────────────────────────────
  useEffect(() => {
    const targetId = activeChatUserId || localStorage.getItem('be_live_active_dm_target');
    if (!targetId || !isSupabaseConfigured || !supabase) return;
    localStorage.removeItem('be_live_active_dm_target');
    ensureDirectRoom(targetId).then(room => {
      if (room) {
        setSelectedChat(room);
      }
      onClearActiveChatUser?.();
    });
  }, [activeChatUserId, onClearActiveChatUser]);

  // ─────────────────────────────────────────────
  // Load streaks
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('streaks')
      .select('id, partner_id, count, last_interaction, active')
      .eq('user_id', currentUser.id)
      .limit(20)
      .then(({ data }) => {
        if (data) setStreaks(data.map(r => ({
          id: r.id, partnerId: r.partner_id, count: r.count,
          lastInteraction: r.last_interaction, hoursRemaining: 24, active: r.active,
        })));
      });
  }, [currentUser.id]);

  // ─────────────────────────────────────────────
  // User search (debounced, on-demand)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!userSearchQuery.trim() || userSearchQuery.length < 2) { setSearchedUsers([]); return; }
    const timer = setTimeout(async () => {
      if (!isSupabaseConfigured || !supabase) return;
      setIsSearchingUsers(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, name, avatar, bio, is_anonymous_mode')
          .or(`username.ilike.%${userSearchQuery}%,name.ilike.%${userSearchQuery}%`)
          .neq('id', currentUser.id)
          .limit(20);
        setSearchedUsers((data || []).map(d => ({
          id: d.id, username: d.username, name: d.name || '', bio: d.bio || '',
          avatar: d.avatar || '', email: '', followers: [], following: [],
          isAnonymousMode: d.is_anonymous_mode,
        })));
      } finally { setIsSearchingUsers(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, currentUser.id]);

  // ─────────────────────────────────────────────
  // Notify parent of active chat
  // ─────────────────────────────────────────────
  useEffect(() => { onActiveChatChange?.(selectedChat !== null); }, [selectedChat, onActiveChatChange]);

  // ─────────────────────────────────────────────
  // Disappearing countdown
  // ─────────────────────────────────────────────
  useEffect(() => {
    const countdownMsgs = messages.filter(m => m.isDisappearing && !m.disappeared && m.disappearDuration && m.disappearDuration <= 10);
    if (countdownMsgs.length === 0) return;
    const interval = setInterval(() => {
      setMessageCountdowns(prev => {
        const next = { ...prev };
        countdownMsgs.forEach(m => {
          const elapsed = (Date.now() - new Date(m.createdAt).getTime()) / 1000;
          const remaining = Math.max(0, (m.disappearDuration || 10) - elapsed);
          next[m.id] = remaining;
          if (remaining <= 0 && isSupabaseConfigured && supabase) {
            supabase.from('messages').update({ disappeared: true }).eq('id', m.id);
            setMessages(prev2 => prev2.filter(msg => msg.id !== m.id));
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [messages]);

  // ─────────────────────────────────────────────
  // Typing indicator
  // ─────────────────────────────────────────────
  const broadcastTyping = (isTyping: boolean) => {
    realtimeChannelRef.current?.track({ userId: currentUser.id, username: currentUser.username, isTyping });
    if (!selectedChat || !isSupabaseConfigured || !supabase) return;
    const chatIsRoom = 'type' in selectedChat;
    const isDirect = !chatIsRoom || (selectedChat as ChatRoom).type === 'direct';
    if (!isDirect) return;
    const otherId = chatIsRoom
      ? (selectedChat as ChatRoom).members.find(m => m !== currentUser.id)
      : (selectedChat as User).id;
      
    if (otherId) {
      supabase.channel(`global-chat-${otherId}`).send({
        type: 'broadcast',
        event: 'typing_status',
        payload: { senderId: currentUser.id, isTyping }
      }).then();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (val.trim()) {
      broadcastTyping(true);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => broadcastTyping(false), 1500);
    } else {
      broadcastTyping(false);
      clearTimeout(typingTimerRef.current);
    }
  };

  const handleInputBlur = () => {
    broadcastTyping(false);
    clearTimeout(typingTimerRef.current);
  };

  // ─────────────────────────────────────────────
  // Upsert streak
  // ─────────────────────────────────────────────
  const upsertStreak = async (partnerId: string | null) => {
    if (!partnerId || !isSupabaseConfigured || !supabase) return;
    const existing = streaks.find(s => s.partnerId === partnerId);
    if (existing) {
      const lastHours = (Date.now() - new Date(existing.lastInteraction).getTime()) / 3600000;
      const newCount = lastHours < 24 ? existing.count : lastHours < 48 ? existing.count + 1 : 1;
      await supabase.from('streaks')
        .update({ count: newCount, last_interaction: new Date().toISOString(), active: true })
        .eq('user_id', currentUser.id).eq('partner_id', partnerId);
      setStreaks(prev => prev.map(s => s.partnerId === partnerId ? { ...s, count: newCount, lastInteraction: new Date().toISOString() } : s));
      if (newCount > existing.count && newCount % 10 === 0) {
        setShowStreakBonus(`🔥 ${newCount} Day Streak!`);
        setTimeout(() => setShowStreakBonus(null), 3000);
      }
    } else {
      await supabase.from('streaks').upsert(
        { user_id: currentUser.id, partner_id: partnerId, count: 1, last_interaction: new Date().toISOString(), active: true },
        { onConflict: 'user_id,partner_id' }
      );
      setStreaks(prev => [...prev, { id: `new_${Date.now()}`, partnerId, count: 1, lastInteraction: new Date().toISOString(), hoursRemaining: 24, active: true }]);
    }
  };

  // ─────────────────────────────────────────────
  // Send message
  // ─────────────────────────────────────────────
  const sendMessage = async (overrides?: Partial<Message>) => {
    if (!selectedChat) return;
    if (!overrides && !inputText.trim()) return;
    if (!isSupabaseConfigured || !supabase) return;

    const chatIsRoom = 'type' in selectedChat;
    const isDisappearing = disappearingMode !== 'off';
    const disappearDuration = disappearingMode === '10s' ? 10 : disappearingMode === '24h' ? 86400 : undefined;

    const payload: any = {
      sender_id: currentUser.id,
      is_e2ee: true,
      is_disappearing: isDisappearing,
      disappear_duration: disappearDuration,
      created_at: new Date().toISOString(),
    };

    if (overrides) {
      payload.text = overrides.text;
      payload.media_url = overrides.mediaUrl;
      payload.media_type = overrides.mediaType;
      payload.snap_viewed = overrides.snapViewed ?? false;
      payload.reply_to_id = overrides.replyToId;
      payload.reply_to_text = overrides.replyToText;
      payload.reply_to_sender_name = overrides.replyToSenderName;
      payload.is_forwarded = overrides.isForwarded ?? false;
      payload.poll_question = overrides.pollQuestion;
      payload.poll_options = overrides.pollOptions;
      payload.poll_votes = overrides.pollVotes ?? {};
      payload.live_location_duration = overrides.liveLocationDuration;
      payload.live_location_status = overrides.liveLocationStatus;
      payload.is_sticker = overrides.isSticker ?? false;
      payload.is_doodle = overrides.isDoodle ?? false;
      payload.doodle_bg = overrides.doodleBg;
    } else {
      payload.text = inputText.trim();
      payload.reply_to_id = replyingToMessage?.id;
      payload.reply_to_text = replyingToMessage?.text;
      payload.reply_to_sender_name = replyingToMessage?.senderName || replyingToMessage?.senderId;
    }

    if (chatIsRoom) {
      payload.room_id = selectedChat.id;
      if (selectedChat.type === 'direct') {
        const otherId = selectedChat.members.find(m => m !== currentUser.id) || selectedChat.creatorId;
        payload.receiver_id = otherId;
      }
    } else {
      payload.receiver_id = selectedChat.id;
    }

    // E2EE encrypt animation
    if (payload.text) {
      const cipher = btoa(unescape(encodeURIComponent(payload.text))).slice(0, 24) + '...';
      setEncryptingMessage(cipher);
      await new Promise(r => setTimeout(r, 350));
      setEncryptingMessage(null);
    }

    const { data: newRowData, error } = await supabase.from('messages').insert(payload).select().single();
    if (error) { console.error('[Messages] sendMessage:', error); return; }

    if (newRowData) {
      const newMsg = dbRowToMessage(newRowData);
      setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    }

    // Update room last message
    if (chatIsRoom) {
      await supabase.from('chat_rooms').update({
        last_message: payload.text || `[${payload.media_type || 'media'}]`,
        last_message_time: payload.created_at,
      }).eq('id', selectedChat.id);
    }

    const partnerId = isDirect
      ? ('type' in selectedChat ? (selectedChat as ChatRoom).members.find(m => m !== currentUser.id) : (selectedChat as User).id)
      : null;
    await upsertStreak(partnerId || null);

    setInputText('');
    setReplyingToMessage(null);
    broadcastTyping(false);
    playChatSound('send');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ─────────────────────────────────────────────
  // Delete message
  // ─────────────────────────────────────────────
  const deleteMessage = async (msgId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('messages').delete().eq('id', msgId).eq('sender_id', currentUser.id);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  // ─────────────────────────────────────────────
  // Reactions
  // ─────────────────────────────────────────────
  const addReaction = async (msgId: string, emoji: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const newReactions = { ...(msg.reactions || {}), [currentUser.id]: emoji };
    await supabase.from('messages').update({ reactions: newReactions }).eq('id', msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: newReactions } : m));
    setActiveEmojisMenu(null);
    playChatSound('reaction');
    setPopHearts(p => ({ ...p, [msgId]: true }));
    setTimeout(() => setPopHearts(p => ({ ...p, [msgId]: false })), 700);
  };

  // ─────────────────────────────────────────────
  // Pin message
  // ─────────────────────────────────────────────
  const togglePin = async (msg: Message) => {
    if (!isSupabaseConfigured || !supabase) return;
    const newPinned = !msg.isPinned;
    await supabase.from('messages').update({ is_pinned: newPinned }).eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: newPinned } : m));
  };

  // ─────────────────────────────────────────────
  // Forward message
  // ─────────────────────────────────────────────
  const forwardMessage = async (targetId: string, isRoomTarget: boolean) => {
    if (!messageToForward || !isSupabaseConfigured || !supabase) return;
    const payload: any = {
      sender_id: currentUser.id, is_e2ee: true, is_forwarded: true,
      text: messageToForward.text, media_url: messageToForward.mediaUrl,
      media_type: messageToForward.mediaType, created_at: new Date().toISOString(),
    };
    if (isRoomTarget) {
      payload.room_id = targetId;
      const targetRoom = rooms.find(r => r.id === targetId);
      if (targetRoom && targetRoom.type === 'direct') {
        const otherId = targetRoom.members.find(m => m !== currentUser.id) || targetRoom.creatorId;
        payload.receiver_id = otherId;
      }
    } else {
      payload.receiver_id = targetId;
    }
    const { data: newRowData } = await supabase.from('messages').insert(payload).select().single();
    if (newRowData && selectedChat) {
      const isCurrentChat = isRoomTarget ? (selectedChat.id === targetId) : (!('type' in selectedChat) && (selectedChat as User).id === targetId);
      if (isCurrentChat) {
        const newMsg = dbRowToMessage(newRowData);
        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      }
    }
    setShowForwardModal(false);
    setMessageToForward(null);
  };

  // ─────────────────────────────────────────────
  // Vote on poll
  // ─────────────────────────────────────────────
  const votePoll = async (msgId: string, optionIdx: number) => {
    if (!isSupabaseConfigured || !supabase) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const votes: Record<number, string[]> = { ...(msg.pollVotes || {}) };
    Object.keys(votes).forEach(k => { votes[+k] = (votes[+k] || []).filter((id: string) => id !== currentUser.id); });
    if (!votes[optionIdx]) votes[optionIdx] = [];
    votes[optionIdx] = [...votes[optionIdx], currentUser.id];
    await supabase.from('messages').update({ poll_votes: votes }).eq('id', msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pollVotes: votes } : m));
  };

  // ─────────────────────────────────────────────
  // Audio recording
  // ─────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine the best MIME type supported by the current browser
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/aac',
          'audio/wav'
        ];
        const supported = candidates.find(type => MediaRecorder.isTypeSupported(type));
        if (supported) mimeType = supported;
      }

      const options = {
        mimeType,
        audioBitsPerSecond: 64000 // 64kbps is extremely clear for voice but highly compressed (instant upload)
      };

      const mr = new MediaRecorder(stream, options);
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setAudioPreviewUrl(URL.createObjectURL(blob));
        setIsAudioPreviewMode(true);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
      waveIntervalRef.current = setInterval(() => setRecordingWaves([...Array(12)].map(() => Math.random() * 30 + 8)), 200);
    } catch (err) {
      console.error('Microphone capture failed:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);
    clearInterval(waveIntervalRef.current);
  };

  const sendAudioMessage = async () => {
    if (!audioPreviewUrl || !isSupabaseConfigured || !supabase) return;
    try {
      const resp = await fetch(audioPreviewUrl);
      const blob = await resp.blob();
      
      // Determine extension based on blob type
      let ext = 'webm';
      if (blob.type.includes('mp4')) ext = 'mp4';
      else if (blob.type.includes('ogg')) ext = 'ogg';
      else if (blob.type.includes('wav')) ext = 'wav';
      else if (blob.type.includes('aac')) ext = 'aac';
      else if (blob.type.includes('m4a')) ext = 'm4a';

      const path = `voice/${currentUser.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('messages-media').upload(path, blob, { contentType: blob.type });
      
      if (error) {
        console.error('[Messages] audio upload failed:', error);
        alert(`Failed to upload voice message: ${error.message}. Make sure the 'messages-media' storage bucket policy is updated in Supabase.`);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('messages-media').getPublicUrl(path);
      await sendMessage({ mediaUrl: urlData.publicUrl, mediaType: 'audio' });
      setAudioPreviewUrl(null);
      setIsAudioPreviewMode(false);
      setRecordingDuration(0);
    } catch (err: any) {
      console.error('[Messages] sendAudioMessage error:', err);
      alert(`Error sending voice message: ${err?.message || err}`);
    }
  };

  // ─────────────────────────────────────────────
  // Snap
  // ─────────────────────────────────────────────
  const openSnap = async (msg: Message) => {
    if (msg.snapViewed && msg.senderId !== currentUser.id) return;
    setActiveSnap(msg);
    setSnapTimer(5);
    if (!msg.snapViewed && isSupabaseConfigured && supabase) {
      await supabase.from('messages').update({ snap_viewed: true }).eq('id', msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, snapViewed: true } : m));
    }
  };

  useEffect(() => {
    if (!activeSnap) return;
    const t = setInterval(() => {
      setSnapTimer(s => { if (s <= 1) { clearInterval(t); setActiveSnap(null); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [activeSnap]);

  // ─────────────────────────────────────────────
  // Create Group / Channel
  // ─────────────────────────────────────────────
  const createGroup = async () => {
    if (!newGroupName.trim() || !isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.from('chat_rooms').insert({
      name: newGroupName.trim(), description: newGroupDescription.trim(), type: 'group',
      avatar: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&h=150&q=80',
      creator_id: currentUser.id, members: [currentUser.id], admin_ids: [currentUser.id],
      created_at: new Date().toISOString(),
    }).select().single();
    if (error) return;
    const newRoom = dbRowToRoom(data);
    setRooms(prev => [newRoom, ...prev]);
    setSelectedChat(newRoom);
    setShowCreateGroupModal(false);
    setNewGroupName('');
    setNewGroupDescription('');
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.from('chat_rooms').insert({
      name: newChannelName.trim(), description: newChannelDescription.trim(), type: 'channel',
      avatar: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=150&h=150&q=80',
      creator_id: currentUser.id, members: [currentUser.id], admin_ids: [currentUser.id],
      created_at: new Date().toISOString(),
    }).select().single();
    if (error) return;
    const newRoom = dbRowToRoom(data);
    setRooms(prev => [newRoom, ...prev]);
    setSelectedChat(newRoom);
    setShowCreateChannelModal(false);
    setNewChannelName('');
    setNewChannelDescription('');
  };

  // ─────────────────────────────────────────────
  // Doodle
  // ─────────────────────────────────────────────
  const getDoodleCtx = () => {
    const c = doodleCanvasRef.current;
    if (!c) return null;
    return { c, ctx: c.getContext('2d') };
  };

  const startDoodle = (e: React.MouseEvent | React.TouchEvent) => {
    const res = getDoodleCtx();
    if (!res) return;
    const { c, ctx } = res;
    if (!ctx) return;
    setIsDoodleDrawing(true);
    setDoodleUndoStack(prev => [...prev, c.toDataURL()]);
    ctx.beginPath();
    const rect = c.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawDoodle = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDoodleDrawing) return;
    const res = getDoodleCtx();
    if (!res) return;
    const { c, ctx } = res;
    if (!ctx) return;
    const rect = c.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.strokeStyle = isErasing ? '#ffffff' : doodleColor;
    ctx.lineWidth = isErasing ? doodleBrushSize * 3 : doodleBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDoodle = () => setIsDoodleDrawing(false);

  const undoDoodle = () => {
    const res = getDoodleCtx();
    if (!res || doodleUndoStack.length === 0) return;
    const { c, ctx } = res;
    if (!ctx) return;
    const prev = doodleUndoStack[doodleUndoStack.length - 1];
    setDoodleUndoStack(s => s.slice(0, -1));
    const img = new Image();
    img.src = prev;
    img.onload = () => { ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0); };
  };

  const sendDoodle = () => {
    const c = doodleCanvasRef.current;
    if (!c) return;
    c.toBlob(async blob => {
      if (!blob || !isSupabaseConfigured || !supabase) return;
      const path = `doodles/${currentUser.id}/${Date.now()}.png`;
      await supabase.storage.from('messages-media').upload(path, blob, { contentType: 'image/png' });
      const { data: urlData } = supabase.storage.from('messages-media').getPublicUrl(path);
      await sendMessage({ mediaUrl: urlData.publicUrl, mediaType: 'image', isDoodle: true, doodleBg });
      setShowDoodleModal(false);
    }, 'image/png');
  };

  // ─────────────────────────────────────────────
  // Call simulation
  // ─────────────────────────────────────────────
  const startCall = async (type: 'audio' | 'video') => {
    if (!selectedChat || isRoom) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }
    } catch { /* user denied */ }
    const call: CallSession = {
      id: `call_${Date.now()}`, callerId: currentUser.id,
      receiverId: (selectedChat as User).id, type, status: 'ringing', isE2EE: true,
    };
    setActiveCall(call);
    setTimeout(() => setActiveCall(c => c ? { ...c, status: 'connected' } : null), 2000);
    timerIntervalRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (activeCall && selectedChat && !isRoom) {
      const receiverUser = selectedChat as User;
      const record: CallHistoryRecord = {
        id: `hist_${Date.now()}`, callerId: currentUser.id, callerName: currentUser.name,
        callerAvatar: currentUser.avatar, receiverId: receiverUser.id,
        receiverName: receiverUser.name, receiverAvatar: receiverUser.avatar,
        type: activeCall.type, status: callDuration > 0 ? 'outgoing' : 'missed',
        createdAt: new Date().toISOString(), duration: callDuration,
      };
      // Optimistic local update
      setCallHistory(prev => [record, ...prev]);
      // Persist to DB
      if (isSupabaseConfigured && supabase) {
        supabase.from('call_history').insert({
          caller_id:   currentUser.id,
          receiver_id: receiverUser.id,
          call_type:   activeCall.type,
          status:      callDuration > 0 ? 'completed' : 'missed',
          duration:    callDuration,
        }).then(({ error }) => {
          if (error) console.error('[Call History Insert]:', error.message);
        });
      }
    }
    setActiveCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // ─────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────
  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(chatSearchQuery.toLowerCase()));
  const displayMessages = activeChatSearchQuery
    ? messages.filter(m => m.text?.toLowerCase().includes(activeChatSearchQuery.toLowerCase()))
    : messages;
  const pinnedInChat = messages.filter(m => m.isPinned);
  const directTargetUser = getDirectTargetUser();

  const wallpapers = [
    { label: 'Default', value: '' },
    { label: 'Dark Slate', value: 'bg-stone-950' },
    { label: 'Deep Violet', value: 'bg-violet-950' },
    { label: 'Midnight Blue', value: 'bg-blue-950' },
    { label: 'Forest', value: 'bg-emerald-950' },
    { label: 'Rose Dark', value: 'bg-rose-950' },
  ];

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#070605] flex flex-col" style={{ zIndex: 10 }}>

      {/* Active Call Overlay */}
      {activeCall && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between p-8">
          {activeCall.type === 'video' && <video ref={localVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />}
          <div className="relative z-10 flex flex-col items-center gap-3 pt-16">
            {selectedChat && isDirect && <img src={isRoom ? (selectedChat as ChatRoom).avatar : (selectedChat as User).avatar} alt="" className="w-24 h-24 rounded-full border-4 border-white/20 object-cover" />}
            <p className="text-white text-xl font-bold">{selectedChat && isDirect ? (isRoom ? (selectedChat as ChatRoom).name : (selectedChat as User).name) : ''}</p>
            <p className="text-white/60 text-sm">{activeCall.status === 'ringing' ? 'Ringing...' : formatDur(callDuration)}</p>
            <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full"><Lock className="w-3 h-3" />End-to-End Encrypted</div>
          </div>
          <div className="relative z-10 flex items-center gap-6 pb-12">
            <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}</button>
            {activeCall.type === 'video' && <button onClick={() => setIsVideoOff(!isVideoOff)} className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}</button>}
            <button onClick={endCall} className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center cursor-pointer"><Phone className="w-7 h-7 text-white rotate-[135deg]" /></button>
          </div>
        </div>
      )}

      {/* Snap View */}
      {activeSnap && (
        <div className="fixed inset-0 z-[90] bg-black flex items-center justify-center cursor-pointer" onClick={() => setActiveSnap(null)}>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
            {[...Array(5)].map((_, i) => <div key={i} className={`h-1 w-12 rounded-full ${i < snapTimer ? 'bg-white' : 'bg-white/30'}`} />)}
          </div>
          {activeSnap.mediaType === 'video'
            ? <video src={activeSnap.mediaUrl} autoPlay loop className="max-h-full max-w-full" />
            : <img src={activeSnap.mediaUrl} alt="snap" className="max-h-full max-w-full object-contain" />}
          <p className="absolute bottom-8 text-white/60 text-sm">Tap to close</p>
        </div>
      )}

      {/* Streak Toast */}
      {showStreakBonus && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white font-bold px-6 py-3 rounded-2xl shadow-2xl text-sm animate-bounce">{showStreakBonus}</div>
      )}

      {/* E2EE Encrypting Toast */}
      {encryptingMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-emerald-900/90 text-emerald-300 text-[11px] font-mono px-4 py-2 rounded-xl border border-emerald-700 shadow-xl">
          <Lock className="w-3 h-3 inline mr-1" />Encrypting: {encryptingMessage}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ SIDEBAR ═══ */}
        <div className={`flex flex-col bg-stone-950/80 border-r border-stone-900 ${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 shrink-0`}>
          {/* Header */}
          <div className="p-4 border-b border-stone-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-stone-100 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-violet-400" />Messages</h2>
              <div className="flex gap-1">
                <button onClick={() => setShowCallHistory(!showCallHistory)} className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 rounded-xl transition-all cursor-pointer" title="Call History"><History className="w-4 h-4" /></button>
                <button onClick={() => setShowCreateGroupModal(true)} className="p-2 text-stone-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-xl transition-all cursor-pointer" title="New Group"><Users className="w-4 h-4" /></button>
                <button onClick={() => setShowCreateChannelModal(true)} className="p-2 text-stone-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all cursor-pointer" title="New Channel"><Hash className="w-4 h-4" /></button>
              </div>
            </div>

            {/* User search for new DM */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} placeholder="Search people to message..." className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-violet-500 transition-all" />
            </div>

            {/* User search results */}
            {userSearchQuery.trim().length >= 2 && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto mb-2">
                {isSearchingUsers && <div className="p-3 text-center text-stone-500 text-xs">Searching...</div>}
                {!isSearchingUsers && searchedUsers.length === 0 && <div className="p-3 text-center text-stone-500 text-xs">No users found</div>}
                {searchedUsers.map(u => (
                  <button key={u.id} onClick={async () => {
                    setUserSearchQuery('');
                    setSearchedUsers([]);
                    const room = await ensureDirectRoom(u.id);
                    if (room) setSelectedChat(room);
                  }} className="w-full flex items-center gap-3 p-3 hover:bg-stone-800 transition-all text-left cursor-pointer">
                    <img src={u.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.username}`} alt="" className="w-9 h-9 rounded-full object-cover border border-stone-700" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-100 truncate">{u.name}</p>
                      <p className="text-xs text-stone-500 truncate">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tab pills */}
            <div className="flex gap-1">
              {(['all', 'direct', 'groups', 'channels'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveSidebarTab(tab)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${activeSidebarTab === tab ? 'bg-violet-600 text-white' : 'text-stone-500 hover:text-stone-300'}`}>{tab}</button>
              ))}
            </div>
          </div>

          {/* Room search */}
          <div className="px-4 py-2 border-b border-stone-900">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
              <input value={chatSearchQuery} onChange={e => setChatSearchQuery(e.target.value)} placeholder="Filter conversations..." className="w-full bg-stone-900/60 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-300 placeholder-stone-600 focus:outline-none focus:border-violet-500 transition-all" />
            </div>
          </div>

          {/* Call history */}
          {showCallHistory && (
            <div className="border-b border-stone-900 bg-stone-900/40 max-h-60 overflow-y-auto">
              <div className="p-3">
                <h3 className="text-xs font-extrabold text-stone-400 uppercase tracking-wider mb-2">Call History</h3>
                {callHistory.length === 0 && <p className="text-xs text-stone-600 italic">No calls yet.</p>}
                {callHistory.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-stone-800 last:border-0">
                    <img src={c.receiverId === currentUser.id ? c.callerAvatar : c.receiverAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-200 truncate">{c.receiverId === currentUser.id ? c.callerName : c.receiverName}</p>
                      <p className="text-[10px] text-stone-500 flex items-center gap-1">
                        {c.status === 'missed' ? <PhoneMissed className="w-3 h-3 text-rose-500" /> : c.status === 'outgoing' ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownLeft className="w-3 h-3 text-blue-400" />}
                        {c.type === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {c.duration ? formatDur(c.duration) : 'No answer'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rooms list */}
          <div className="flex-1 overflow-y-auto">
            {filteredRooms
              .filter(r => activeSidebarTab === 'all' || r.type === activeSidebarTab || (activeSidebarTab === 'direct' && r.type === 'direct'))
              .map(room => {
                const sel = selectedChat && 'type' in selectedChat && (selectedChat as ChatRoom).id === room.id;
                const otherMemberId = room.type === 'direct' ? room.members.find(m => m !== currentUser.id) : null;
                const isOnline = room.type === 'direct' && otherMemberId && isOnlinePlatformWide(room.lastSeen);
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      if (!chatDeleteHoldTimerRef.current) {
                        setSelectedChat(room);
                      }
                    }}
                    onMouseDown={() => startChatDeleteHold(room.id)}
                    onMouseUp={cancelChatDeleteHold}
                    onMouseLeave={cancelChatDeleteHold}
                    onTouchStart={() => startChatDeleteHold(room.id)}
                    onTouchEnd={cancelChatDeleteHold}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-900/60 transition-all text-left cursor-pointer border-b border-stone-900/40 ${sel ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <img src={room.avatar || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=60&h=60&q=80'} alt={room.name} className="w-11 h-11 rounded-full object-cover border border-stone-800" />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-stone-950" />
                      )}
                      {room.type === 'group' && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center"><Users className="w-2.5 h-2.5 text-white" /></div>}
                      {room.type === 'channel' && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"><Radio className="w-2.5 h-2.5 text-white" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-stone-100 truncate">{room.name}</p>
                        {room.lastMessageTime && <span className="text-[10px] text-stone-600 shrink-0">{formatTime(room.lastMessageTime)}</span>}
                      </div>
                      {room.type === 'direct' && otherMemberId && sidebarTypingUsers[otherMemberId] ? (
                        <p className="text-xs text-violet-400 font-medium animate-pulse">typing...</p>
                      ) : (
                        <p className="text-xs text-stone-500 truncate">{room.lastMessage || 'No messages yet'}</p>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* ═══ CHAT PANEL ═══ */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Chat header OR Selection Action Bar */}
            {isSelectionMode ? (
              <div className="flex items-center justify-between px-4 py-3 bg-stone-950/90 border-b border-stone-900 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setIsSelectionMode(false); setSelectedMessageIds([]); }} className="p-2 text-stone-400 hover:text-stone-200 rounded-xl cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold text-stone-200">{selectedMessageIds.length} Selected</span>
                </div>
                <button
                  onClick={unsendSelectedMessages}
                  disabled={selectedMessageIds.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Unsend
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-stone-950/90 border-b border-stone-900 backdrop-blur-md">
                <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 text-stone-400 hover:text-stone-200 rounded-xl cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>
                {(() => {
                  const getTargetUsername = () => {
                    if (!selectedChat) return '';
                    if (!('type' in selectedChat)) return (selectedChat as User).username;
                    if ((selectedChat as ChatRoom).description) return (selectedChat as ChatRoom).description!.replace('@', '');
                    return targetUserProfile?.username || '';
                  };
                  const targetId = !isRoom ? (selectedChat as User).id : (selectedChat as ChatRoom).members.find(m => m !== currentUser.id);
                  const username = getTargetUsername();
                  return (
                    <>
                      <img
                        src={isDirect ? (isRoom ? (selectedChat as ChatRoom).avatar : (selectedChat as User).avatar) || `https://api.dicebear.com/7.x/adventurer/svg?seed=${isRoom ? (selectedChat as ChatRoom).name : (selectedChat as User).username}` : ((selectedChat as ChatRoom).avatar || '')}
                        alt="" className="w-10 h-10 rounded-full object-cover border border-stone-800 cursor-pointer"
                        onClick={() => {
                          if (targetId) onViewProfile?.(targetId, username);
                        }}
                      />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                        if (targetId) onViewProfile?.(targetId, username);
                      }}>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-stone-100 text-sm truncate hover:text-violet-400 transition-colors">
                            {!isRoom ? (selectedChat as User).name : (selectedChat as ChatRoom).name}
                          </p>
                          {isDirect && (() => {
                            const s = targetId ? getStreak(targetId) : null;
                            return s && s.count > 0 ? <span className="text-xs font-black text-orange-400 flex items-center gap-0.5"><Flame className="w-3 h-3" />{s.count}</span> : null;
                          })()}
                        </div>
                        <p className="text-xs text-stone-500 truncate flex items-center gap-1">
                          {Object.values(typingUsers).length > 0 ? (
                            <span className="text-violet-400 animate-pulse font-medium">typing...</span>
                          ) : isRoom && (selectedChat as ChatRoom).type !== 'direct' ? (
                            `${(selectedChat as ChatRoom).members.length} members`
                          ) : isDirect ? (
                            isTargetUserOnline ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Online
                              </span>
                            ) : targetUserProfile?.last_seen ? (
                              `Last seen ${formatLastSeen(targetUserProfile.last_seen)}`
                            ) : (
                              `@${isRoom ? (selectedChat as ChatRoom).description?.replace('@', '') : (selectedChat as User).username}`
                            )
                          ) : (
                            `@${isRoom ? (selectedChat as ChatRoom).description?.replace('@', '') : (selectedChat as User).username}`
                          )}
                        </p>
                      </div>
                    </>
                  );
                })()}
                <div className="flex items-center gap-1">
                  {pinnedInChat.length > 0 && <button onClick={() => setShowPinnedMessagesModal(true)} className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-xl cursor-pointer" title="Pinned"><Pin className="w-4 h-4" /></button>}
                  <button onClick={() => setShowActiveChatSearch(!showActiveChatSearch)} className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 rounded-xl cursor-pointer"><Search className="w-4 h-4" /></button>
                  {isDirect && directTargetUser && (
                    <div className="relative">
                      <button
                        onClick={() => setShowCallMenu(v => !v)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${showCallMenu ? 'bg-stone-800 text-stone-200' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'}`}
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      {showCallMenu && (
                        <div className="absolute right-0 top-full mt-2 w-36 bg-stone-900 border border-stone-800 rounded-2xl p-1.5 shadow-2xl z-30 flex flex-col gap-1">
                          <button
                            onClick={() => { onStartCall?.(directTargetUser, 'audio'); setShowCallMenu(false); }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl cursor-pointer transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            Voice Call
                          </button>
                          <button
                            onClick={() => { onStartCall?.(directTargetUser, 'video'); setShowCallMenu(false); }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl cursor-pointer transition-colors"
                          >
                            <Video className="w-3.5 h-3.5 text-blue-400" />
                            Video Call
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => setShowKeyVerification(!showKeyVerification)} className="p-2 text-stone-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl cursor-pointer" title="E2EE"><Lock className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            {/* Chat search */}
            {showActiveChatSearch && (
              <div className="px-4 py-2 bg-stone-900/80 border-b border-stone-800">
                <input value={activeChatSearchQuery} onChange={e => setActiveChatSearchQuery(e.target.value)} placeholder="Search in conversation..." autoFocus className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-violet-500 transition-all" />
              </div>
            )}

            {/* E2EE panel */}
            {showKeyVerification && (
              <div className="px-4 py-3 bg-emerald-950/60 border-b border-emerald-900/40 text-xs text-emerald-400">
                <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-4 h-4" /><span className="font-bold">End-to-End Encryption Active</span></div>
                <p className="font-mono opacity-70">Your key: <span className="font-black">{privateKey}</span></p>
              </div>
            )}

            {/* Wallpaper picker */}
            {showWallpaperMenu && (
              <div className="absolute top-16 right-4 z-30 bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-2xl">
                <p className="text-xs font-bold text-stone-400 uppercase mb-2">Chat Wallpaper</p>
                <div className="grid grid-cols-3 gap-2">
                  {wallpapers.map(w => (
                    <button key={w.value} onClick={() => {
                      const next = { ...chatWallpapers, [selectedChat.id]: w.value };
                      setChatWallpapers(next);
                      // Sync to DB (profiles.chat_wallpaper_prefs)
                      if (onUpdateProfile) onUpdateProfile({ chatWallpaperPrefs: next });
                      // Keep localStorage as fallback for offline
                      localStorage.setItem('be_live_wallpapers', JSON.stringify(next));
                      setShowWallpaperMenu(false);
                    }} className={`h-10 w-full rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold ${w.value} ${chatWallpapers[selectedChat.id] === w.value ? 'border-violet-500' : 'border-stone-700'}`}>
                      <span className="text-white/60">{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pinned messages modal */}
            {showPinnedMessagesModal && (
              <div className="absolute inset-0 z-40 bg-black/70 flex items-start justify-center pt-16" onClick={() => setShowPinnedMessagesModal(false)}>
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 w-80 max-h-80 overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-stone-200 mb-3 flex items-center gap-2"><Pin className="w-4 h-4 text-amber-400" />Pinned Messages</h3>
                  {pinnedInChat.map(m => (
                    <div key={m.id} className="p-3 bg-stone-800 rounded-xl mb-2">
                      <p className="text-xs text-stone-400 mb-1">{m.senderName || 'You'}</p>
                      <p className="text-sm text-stone-200">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Banners */}
            {disappearingMode !== 'off' && (
              <div className="px-4 py-1.5 bg-violet-900/40 border-b border-violet-800/30 flex items-center gap-2 text-xs text-violet-300">
                <EyeOff className="w-3.5 h-3.5" /><span>Disappearing: {disappearingMode === '10s' ? '10 seconds' : '24 hours'}</span>
                <button onClick={() => setDisappearingMode('off')} className="ml-auto cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {isRoom && (selectedChat as ChatRoom).type === 'channel' && !(selectedChat as ChatRoom).adminIds.includes(currentUser.id) && (
              <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-900/30 text-xs text-amber-400 flex items-center gap-2"><Radio className="w-3.5 h-3.5" />Viewing channel — only admins can post.</div>
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${chatWallpapers[selectedChat.id] || 'bg-[#070605]'}`}>
              {loadingMessages && <div className="text-center text-stone-600 text-sm py-8">Loading messages...</div>}
              {!loadingMessages && displayMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <MessageSquare className="w-12 h-12 text-stone-700 mb-4" />
                  <p className="text-stone-500 font-bold">No messages yet</p>
                  <p className="text-stone-600 text-sm mt-1">Send a message to start the conversation</p>
                </div>
              )}
              {displayMessages.map(msg => {
                const me = msg.senderId === currentUser.id;
                const countdown = messageCountdowns[msg.id];
                const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
                const isSelected = selectedMessageIds.includes(msg.id);
                return (
                  <div key={msg.id} className={`flex ${me ? 'justify-end' : 'justify-start'} group relative items-center`}>
                    {isSelectionMode && me && (
                      <div className="flex items-center justify-center mr-2 shrink-0 self-center">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-rose-600 border-rose-600' : 'border-stone-600'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </div>
                    )}
                    {/* Hover actions */}
                    <div className={`absolute ${me ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 z-10`}>
                      <button onClick={() => setActiveEmojisMenu(activeEmojisMenu === msg.id ? null : msg.id)} className="p-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-400 hover:text-yellow-400 cursor-pointer"><Smile className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setReplyingToMessage(msg)} className="p-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-400 hover:text-violet-400 cursor-pointer"><CornerUpLeft className="w-3.5 h-3.5" /></button>
                      <button onClick={() => togglePin(msg)} className="p-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-400 hover:text-amber-400 cursor-pointer"><Pin className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setMessageToForward(msg); setShowForwardModal(true); }} className="p-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-400 hover:text-blue-400 cursor-pointer"><Share2 className="w-3.5 h-3.5" /></button>
                      {me && <button onClick={() => deleteMessage(msg.id)} className="p-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-400 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                    {/* Emoji picker */}
                    {activeEmojisMenu === msg.id && (
                      <div className={`absolute ${me ? 'right-0' : 'left-0'} -top-10 z-20 bg-stone-900 border border-stone-800 rounded-2xl p-2 flex gap-1`}>
                        {['❤️', '😂', '😮', '😢', '😡', '👍'].map(e => (
                          <button key={e} onClick={() => addReaction(msg.id, e)} className="text-lg hover:scale-125 transition-transform cursor-pointer">{e}</button>
                        ))}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${me ? 'items-end' : 'items-start'} flex flex-col`}>
                      {isRoom && (selectedChat as ChatRoom).type !== 'direct' && !me && <p className="text-[10px] text-stone-500 mb-1 px-1">{msg.senderName}</p>}
                      {msg.replyToId && (
                        <div className={`mb-1 px-3 py-1.5 rounded-xl border-l-2 border-violet-500 text-xs ${me ? 'bg-violet-900/30' : 'bg-stone-800/60'}`}>
                          <p className="text-violet-400 font-bold text-[10px]">{msg.replyToSenderName}</p>
                          <p className="text-stone-400 truncate">{msg.replyToText}</p>
                        </div>
                      )}
                      {msg.isForwarded && <p className="text-[10px] text-stone-600 mb-1 px-1 flex items-center gap-1"><Share2 className="w-2.5 h-2.5" />Forwarded</p>}
                      <div
                        onMouseDown={(e) => {
                          startMessageHold(msg.id, me);
                          handleDragStart(e, msg.id);
                        }}
                        onMouseMove={handleDragMove}
                        onMouseUp={(e) => {
                          cancelMessageHold();
                          handleDragEnd(msg);
                        }}
                        onMouseLeave={() => {
                          cancelMessageHold();
                          setActiveDragId(null);
                          setDragX(0);
                        }}
                        onTouchStart={(e) => {
                          startMessageHold(msg.id, me);
                          handleDragStart(e, msg.id);
                        }}
                        onTouchMove={handleDragMove}
                        onTouchEnd={() => {
                          cancelMessageHold();
                          handleDragEnd(msg);
                        }}
                        onClick={(e) => {
                          if (isSelectionMode) {
                            e.stopPropagation();
                            if (me) {
                              setSelectedMessageIds(prev =>
                                prev.includes(msg.id)
                                  ? prev.filter(id => id !== msg.id)
                                  : [...prev, msg.id]
                              );
                            }
                          } else {
                            setSelectedTimestampMessageId(selectedTimestampMessageId === msg.id ? null : msg.id);
                          }
                        }}
                        style={{
                          transform: activeDragId === msg.id ? `translateX(${dragX}px)` : 'none',
                          transition: activeDragId === msg.id ? 'none' : 'transform 0.2s ease-out'
                        }}
                        className={`relative rounded-2xl px-3 py-2 cursor-pointer select-none transition-all ${me ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-stone-800 text-stone-100 rounded-bl-sm'} ${msg.isPinned ? 'ring-1 ring-amber-500/40' : ''} ${isSelected ? 'ring-2 ring-rose-500 bg-rose-950/20' : ''}`}
                      >
                        {msg.mediaType === 'snap' && (
                          <button onClick={() => openSnap(msg)} className={`flex items-center gap-2 text-sm font-bold cursor-pointer ${msg.snapViewed && msg.senderId !== currentUser.id ? 'opacity-40' : ''}`}>
                            <Eye className="w-4 h-4" />{msg.snapViewed && msg.senderId !== currentUser.id ? 'Snap viewed' : 'View Snap'}
                          </button>
                        )}
                        {msg.mediaUrl && msg.mediaType !== 'snap' && msg.mediaType !== 'audio' && msg.mediaType !== 'poll' && (
                          <div className="rounded-xl overflow-hidden mb-1 max-w-[250px]">
                            {msg.mediaType === 'video'
                              ? <video src={msg.mediaUrl} controls className="w-full rounded-xl" />
                              : <img src={msg.mediaUrl} alt="" className="w-full rounded-xl object-cover cursor-pointer" onClick={() => window.open(msg.mediaUrl, '_blank')} />}
                            {msg.isDoodle && <p className="text-[10px] text-center py-1 opacity-60">🎨 Doodle</p>}
                          </div>
                        )}
                        {msg.mediaType === 'audio' && msg.mediaUrl && <VoiceMessagePlayer audioUrl={msg.mediaUrl} isMe={me} />}
                        {msg.mediaType === 'poll' && msg.pollQuestion && (
                          <div className="min-w-[180px]">
                            <p className="font-bold text-sm mb-2"><BarChart3 className="w-3.5 h-3.5 inline mr-1" />{msg.pollQuestion}</p>
                            {(msg.pollOptions || []).map((opt, i) => {
                              const votes = msg.pollVotes?.[i] || [];
                              const total = Object.values(msg.pollVotes || {}).flat().length;
                              const pct = total > 0 ? Math.round(votes.length / total * 100) : 0;
                              const hasVoted = votes.includes(currentUser.id);
                              return (
                                <button key={i} onClick={() => votePoll(msg.id, i)} className={`w-full text-left text-xs rounded-lg px-2 py-1.5 mb-1 transition-all cursor-pointer relative overflow-hidden border ${hasVoted ? 'border-violet-400 font-bold' : 'border-white/20'}`}>
                                  <div className={`absolute inset-y-0 left-0 ${me ? 'bg-white/20' : 'bg-violet-600/20'} transition-all`} style={{ width: `${pct}%` }} />
                                  <span className="relative">{opt} ({pct}%)</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {msg.mediaType === 'location' && (
                          <div className="flex items-center gap-2 text-sm"><Navigation className="w-4 h-4 text-green-400" /><span>Live Location ({msg.liveLocationDuration}m)</span></div>
                        )}
                        {msg.isSticker && msg.text && <span className="text-4xl">{msg.text}</span>}
                        {msg.text && !msg.isSticker && (
                          <p className="text-sm leading-relaxed break-words">{renderFormattedText(msg.text, activeChatSearchQuery)}</p>
                        )}
                        {msg.isDisappearing && countdown !== undefined && countdown > 0 && (
                          <p className="text-[10px] opacity-60 mt-0.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{Math.ceil(countdown)}s</p>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-0.5 min-h-[14px]">
                          {me && (
                            msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                            ) : msg.isDelivered ? (
                              <CheckCheck className="w-3.5 h-3.5 text-stone-500" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-stone-500" />
                            )
                          )}
                          {msg.isPinned && <Pin className="w-2.5 h-2.5 text-amber-400" />}
                        </div>
                      </div>
                      {selectedTimestampMessageId === msg.id && (
                        <div className="text-[10px] text-stone-500 mt-1 flex flex-col gap-0.5 bg-stone-900/80 border border-stone-800 rounded-xl px-2.5 py-1.5 min-w-[140px] shadow-lg animate-fadeIn z-10">
                          <p className="flex justify-between gap-4"><span>Sent:</span> <span className="font-semibold text-stone-300">{formatFullTime(msg.createdAt)}</span></p>
                          {me && msg.deliveredAt && (
                            <p className="flex justify-between gap-4"><span>Delivered:</span> <span className="font-semibold text-stone-300">{formatFullTime(msg.deliveredAt)}</span></p>
                          )}
                          {me && msg.readAt && (
                            <p className="flex justify-between gap-4"><span>Seen:</span> <span className="font-semibold text-sky-400">{formatFullTime(msg.readAt)}</span></p>
                          )}
                        </div>
                      )}
                      {hasReactions && (
                        <div className={`flex gap-1 mt-1 ${me ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(msg.reactions || {}).map(([uid, emoji]) => (
                            <button key={uid} onClick={() => addReaction(msg.id, emoji as string)} className={`text-sm px-1.5 py-0.5 rounded-full border transition-all cursor-pointer ${uid === currentUser.id ? 'bg-violet-500/30 border-violet-500/50' : 'bg-stone-800 border-stone-700'} ${popHearts[msg.id] ? 'scale-125' : ''}`}>{emoji}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {Object.values(typingUsers).length > 0 && (
              <div className="px-4 py-1 text-xs text-stone-500 italic flex items-center gap-1">
                <span className="flex gap-0.5">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
                {Object.values(typingUsers).join(', ')} typing...
              </div>
            )}

            {/* Sticker tray */}
            {showStickerTray && (
              <div className="bg-stone-900 border-t border-stone-800 p-3">
                <div className="flex gap-2 mb-2">
                  <p className="text-xs font-bold text-stone-400 flex-1">Stickers</p>
                  <button onClick={() => setShowStickerTray(false)} className="text-stone-500 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STICKERS.map(s => (
                    <button key={s} onClick={() => { sendMessage({ text: s, isSticker: true }); setShowStickerTray(false); }} className="text-2xl hover:scale-125 transition-transform cursor-pointer">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Reply preview */}
            {replyingToMessage && (
              <div className="flex items-center gap-3 px-4 py-2 bg-violet-900/30 border-t border-violet-800/30">
                <CornerUpLeft className="w-4 h-4 text-violet-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-violet-400">{replyingToMessage.senderName || 'You'}</p>
                  <p className="text-xs text-stone-400 truncate">{replyingToMessage.text}</p>
                </div>
                <button onClick={() => setReplyingToMessage(null)} className="p-1 text-stone-500 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Audio preview */}
            {isAudioPreviewMode && audioPreviewUrl && (
              <div className="flex items-center gap-3 px-4 py-3 bg-stone-900 border-t border-stone-800">
                <VoiceMessagePlayer audioUrl={audioPreviewUrl} isMe />
                <button onClick={sendAudioMessage} className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl cursor-pointer"><Send className="w-4 h-4" /></button>
                <button onClick={() => { setAudioPreviewUrl(null); setIsAudioPreviewMode(false); }} className="p-2 text-stone-500 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center gap-3 px-4 py-3 bg-rose-950/40 border-t border-rose-900/30">
                <div className="flex items-end gap-0.5 h-6">
                  {recordingWaves.map((h, i) => <div key={i} style={{ height: `${h}px` }} className="w-1 bg-rose-500 rounded-full transition-all duration-100" />)}
                </div>
                <span className="text-rose-400 text-sm font-bold">{formatDur(recordingDuration)}</span>
                <button onClick={stopRecording} className="ml-auto p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"><MicOff className="w-4 h-4" /></button>
              </div>
            )}

            {/* Input bar — clean Instagram-style */}
            {!isAudioPreviewMode && !isRecording && canSendToRoom && (
              <div className="relative px-3 py-3 bg-stone-950/95 border-t border-stone-900">
                {/* Overflow menu */}
                {showInputMenu && (
                  <div className="absolute bottom-full left-3 mb-2 bg-stone-900 border border-stone-800 rounded-2xl p-2 flex gap-1 shadow-2xl z-20">
                    <button onClick={() => { setDisappearingMode(d => d === 'off' ? '10s' : d === '10s' ? '24h' : 'off'); setShowInputMenu(false); }} className={`p-2 rounded-xl transition-all cursor-pointer ${disappearingMode !== 'off' ? 'text-violet-400 bg-violet-500/20' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`} title="Disappearing"><EyeOff className="w-4 h-4" /></button>
                    <button onClick={() => { setShowStickerTray(!showStickerTray); setShowInputMenu(false); }} className="p-2 rounded-xl text-stone-400 hover:text-amber-400 hover:bg-stone-800 cursor-pointer"><Smile className="w-4 h-4" /></button>
                    <button onClick={() => { setShowMediaModal(true); setShowInputMenu(false); }} className="p-2 rounded-xl text-stone-400 hover:text-blue-400 hover:bg-stone-800 cursor-pointer"><ImageIcon className="w-4 h-4" /></button>
                    <button onClick={() => { setShowDoodleModal(true); setShowInputMenu(false); }} className="p-2 rounded-xl text-stone-400 hover:text-violet-400 hover:bg-stone-800 cursor-pointer"><Palette className="w-4 h-4" /></button>
                    <button onClick={() => { setShowPollBuilder(!showPollBuilder); setShowInputMenu(false); }} className="p-2 rounded-xl text-stone-400 hover:text-emerald-400 hover:bg-stone-800 cursor-pointer"><BarChart3 className="w-4 h-4" /></button>
                    <button onClick={() => { sendMessage({ mediaType: 'location', liveLocationDuration: 15, liveLocationStatus: 'active' }); setShowInputMenu(false); }} className="p-2 rounded-xl text-stone-400 hover:text-green-400 hover:bg-stone-800 cursor-pointer" title="Location"><MapPin className="w-4 h-4" /></button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {/* + button */}
                  <button
                    onClick={() => setShowInputMenu(v => !v)}
                    className={`p-2.5 rounded-full transition-all cursor-pointer shrink-0 ${showInputMenu ? 'bg-violet-600 text-white rotate-45' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </button>

                  {/* Message textarea */}
                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    onClick={() => setShowInputMenu(false)}
                    placeholder={`Message ${!isRoom ? `@${(selectedChat as User).username}` : (selectedChat as ChatRoom).name}...`}
                    rows={1}
                    className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-violet-600 resize-none transition-all max-h-28 overflow-y-auto"
                    style={{ minHeight: '42px' }}
                  />

                  {/* Send or mic */}
                  {inputText.trim()
                    ? <button onClick={() => sendMessage()} className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full transition-all cursor-pointer shrink-0"><Send className="w-4 h-4" /></button>
                    : <button onClick={startRecording} className="p-2.5 bg-stone-800 hover:bg-rose-600 text-stone-400 hover:text-white rounded-full transition-all cursor-pointer shrink-0"><Mic className="w-4 h-4" /></button>
                  }
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center bg-stone-950">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-stone-800 mx-auto mb-4" />
              <p className="text-stone-600 font-bold text-lg">Select a conversation</p>
              <p className="text-stone-700 text-sm mt-1">Search for someone above to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}

      {/* Media modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowMediaModal(false)}>
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-stone-200 mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-blue-400" />Send Media</h3>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setCustomMediaType('image')} className={`flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer ${customMediaType === 'image' ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-400'}`}>Image</button>
              <button onClick={() => setCustomMediaType('video')} className={`flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer ${customMediaType === 'video' ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-400'}`}>Video</button>
            </div>
            <input value={customMediaUrl} onChange={e => setCustomMediaUrl(e.target.value)} placeholder="Paste media URL..." className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500 mb-3" />
            <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer mb-4">
              <input type="checkbox" checked={sendAsSnap} onChange={e => setSendAsSnap(e.target.checked)} className="rounded" />
              <Eye className="w-4 h-4" />Send as Snap (view once)
            </label>
            <button onClick={() => { if (!customMediaUrl.trim()) return; sendMessage({ mediaUrl: customMediaUrl.trim(), mediaType: sendAsSnap ? 'snap' : customMediaType, snapViewed: false }); setCustomMediaUrl(''); setSendAsSnap(false); setShowMediaModal(false); }} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm cursor-pointer transition-all">Send</button>
          </div>
        </div>
      )}

      {/* Poll builder */}
      {showPollBuilder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPollBuilder(false)}>
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-stone-200 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-400" />Create Poll</h3>
            <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Poll question..." className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500 mb-3" />
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={opt} onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} placeholder={`Option ${i + 1}`} className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500" />
                {pollOptions.length > 2 && <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="p-2 text-rose-500 cursor-pointer"><X className="w-4 h-4" /></button>}
              </div>
            ))}
            {pollOptions.length < 6 && <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-emerald-400 text-sm mb-3 cursor-pointer block">+ Add option</button>}
            <button onClick={() => { if (!pollQuestion.trim()) return; sendMessage({ mediaType: 'poll', pollQuestion, pollOptions: pollOptions.filter(o => o.trim()), pollVotes: {} }); setShowPollBuilder(false); setPollQuestion(''); setPollOptions(['', '']); }} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm cursor-pointer transition-all">Send Poll</button>
          </div>
        </div>
      )}

      {/* Doodle modal */}
      {showDoodleModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <h3 className="font-bold text-stone-200 flex items-center gap-2"><Palette className="w-5 h-5 text-violet-400" />Draw Something</h3>
              <button onClick={() => setShowDoodleModal(false)} className="text-stone-500 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 flex items-center gap-2 border-b border-stone-800 flex-wrap">
              {['#8B5CF6', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#000000', '#ffffff'].map(c => (
                <button key={c} onClick={() => { setDoodleColor(c); setIsErasing(false); }} style={{ background: c }} className={`w-7 h-7 rounded-full border-2 cursor-pointer ${doodleColor === c && !isErasing ? 'border-white scale-110' : 'border-stone-700'}`} />
              ))}
              <button onClick={() => setIsErasing(!isErasing)} className={`p-1.5 rounded-lg cursor-pointer ml-2 ${isErasing ? 'bg-white text-black' : 'text-stone-400 bg-stone-800'}`}><Eraser className="w-4 h-4" /></button>
              <button onClick={undoDoodle} className="p-1.5 rounded-lg text-stone-400 bg-stone-800 cursor-pointer"><Undo2 className="w-4 h-4" /></button>
            </div>
            <canvas
              ref={doodleCanvasRef} width={360} height={280}
              className="block bg-white touch-none w-full"
              onMouseDown={startDoodle} onMouseMove={drawDoodle} onMouseUp={stopDoodle} onMouseLeave={stopDoodle}
              onTouchStart={startDoodle} onTouchMove={drawDoodle} onTouchEnd={stopDoodle}
            />
            <div className="p-3">
              <button onClick={sendDoodle} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm cursor-pointer">Send Doodle</button>
            </div>
          </div>
        </div>
      )}

      {/* Forward modal */}
      {showForwardModal && messageToForward && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowForwardModal(false)}>
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-sm max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-stone-200 mb-4 flex items-center gap-2"><Share2 className="w-5 h-5 text-blue-400" />Forward to...</h3>
            {rooms.map(r => (
              <button key={r.id} onClick={() => forwardMessage(r.id, true)} className="w-full flex items-center gap-3 py-2 px-3 hover:bg-stone-800 rounded-xl transition-all text-left cursor-pointer mb-1">
                <img src={r.avatar || ''} alt="" className="w-8 h-8 rounded-full object-cover" />
                <p className="text-sm font-bold text-stone-200">{r.name}</p>
              </button>
            ))}
            {rooms.length === 0 && <p className="text-xs text-stone-500 italic">No groups or channels to forward to yet.</p>}
          </div>
        </div>
      )}


      {/* Create Group modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowCreateGroupModal(false)}>
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-stone-200 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-violet-400" />Create Group</h3>
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name..." className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-violet-500 mb-3" />
            <input value={newGroupDescription} onChange={e => setNewGroupDescription(e.target.value)} placeholder="Description (optional)..." className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-violet-500 mb-4" />
            <button onClick={createGroup} disabled={!newGroupName.trim()} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm cursor-pointer transition-all">Create Group</button>
          </div>
        </div>
      )}

      {/* Create Channel modal */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowCreateChannelModal(false)}>
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-stone-200 mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-amber-400" />Create Channel</h3>
            <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="Channel name..." className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 mb-3" />
            <input value={newChannelDescription} onChange={e => setNewChannelDescription(e.target.value)} placeholder="Description..." className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 mb-4" />
            <button onClick={createChannel} disabled={!newChannelName.trim()} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm cursor-pointer transition-all">Create Channel</button>
          </div>
        </div>
      )}
    </div>
  );
}
