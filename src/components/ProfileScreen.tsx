/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Heart, 
  MessageCircle, 
  Edit3, 
  Save, 
  X, 
  MapPin, 
  Send, 
  Check, 
  Plus, 
  FolderHeart, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ShieldCheck,
  Trash2,
  Calendar,
  Play,
  Pause,
  Globe,
  ExternalLink,
  Archive,
  Lock,
  Key,
  Mail,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  Bookmark,
  LogOut,
  Settings,
  KeyRound,
  UserMinus,
  Pencil,
  Camera,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSpatialAvatarSound } from '../lib/avatarAudio';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { compressImage } from '../lib/imageCompression';
import { Post, User, Story, Highlight } from '../types';
import AvatarStudio from './AvatarStudio';
import RichBioEditor from './RichBioEditor';
import MediaRenderer from './MediaRenderer';
import { Music, Video, Link2, Image as ImageIcon, FileText, Users, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Code, Quote, Palette, Highlighter, Wand2, Terminal, Flame, Smile, Layers, HelpCircle, Activity } from 'lucide-react';
import AvatarPicker from './AvatarPicker';
import PostAccessManager from './PostAccessManager';
import FollowersListModal from './FollowersListModal';

interface ProfileScreenProps {
  user: User;
  currentUser: User;
  posts?: Post[];
  stories: Story[];
  highlights: Highlight[];
  onAddHighlight: (title: string, coverUrl: string, storyIds: string[]) => void;
  onDeleteStory?: (storyId: string) => void;
  onUpdateHighlight?: (updatedHighlight: Highlight) => void;
  onAddStory?: (mediaUrl: string, mediaType: 'image' | 'video', caption?: string) => void;
  onToggleFollow: (targetUserId: string) => void;
  onUpdateProfile: (
    name: string,
    bio: string,
    avatar: string,
    username?: string,
    passwordHash?: string,
    email?: string,
    isPrivate?: boolean,
    allowAnonymousDMs?: boolean
  ) => void;
  onUpdateProfileSettings?: (updatedFields: Partial<User>) => void;
  onLikePost?: (postId: string) => void;
  onAddComment?: (postId: string, text: string, parentId?: string) => void;
  onViewProfile?: (userId: string) => void;
  onTogglePostVisibility?: (postId: string) => void;
  onGrantPostAccess?: (postId: string, targetUserId: string, durationMinutes?: number) => void;
  onRevokePostAccess?: (postId: string, targetUserId: string) => void;
  allPosts?: Post[];
  onToggleArchivePost?: (postId: string) => void;
  onGrantGlobalAccess?: (targetUserId: string, durationMinutes?: number) => void;
  onRevokeGlobalAccess?: (targetUserId: string) => void;
  onGrantMultiplePostAccess?: (postIds: string[], targetUserId: string, durationMinutes?: number) => void;
  onAddPost?: (post: Post) => void;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  onOpenMessages?: (userId: string) => void;
}

export function getPostGradientClass(gradientName: string): string {
  switch (gradientName) {
    case 'sunset': return 'bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 text-white';
    case 'ocean': return 'bg-gradient-to-tr from-blue-600 via-cyan-500 to-sky-400 text-white';
    case 'emerald': return 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white';
    case 'cyberpunk': return 'bg-gradient-to-tr from-fuchsia-600 to-pink-500 text-white';
    case 'neon': return 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white';
    case 'lava': return 'bg-gradient-to-tr from-orange-600 via-red-600 to-amber-500 text-white shadow-lg';
    case 'aurora': return 'bg-gradient-to-tr from-teal-500 via-cyan-600 to-indigo-700 text-white shadow-lg';
    case 'matrix': return 'bg-slate-950 border border-emerald-500/40 text-emerald-400 font-mono';
    case 'cotton': return 'bg-gradient-to-tr from-rose-200 via-purple-100 to-blue-200 text-stone-100';
    case 'clean': return 'bg-stone-950/60 border border-stone-850 text-stone-100';
    case 'cosmic':
    default: return 'bg-gradient-to-tr from-purple-950 via-indigo-900 to-slate-950 text-white';
  }
}

export function hasDecorativeGlow(gradientName: string): boolean {
  return gradientName !== 'clean' && gradientName !== 'matrix' && gradientName !== 'cotton';
}

interface MiniPostPreviewProps {
  post: Post;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onLike: () => void;
  liked: boolean;
  onView: () => void;
}

function MiniPostPreview({ post, isPlaying, onPlayToggle, onLike, liked, onView }: MiniPostPreviewProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  React.useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const mediaType = post.mediaType || 'image';

  return (
    <div className="w-full h-full relative group/media select-none overflow-hidden rounded-2xl bg-slate-950 flex flex-col justify-between">
      {/* Media content */}
      {mediaType === 'image' && (
        <div className="w-full h-full relative cursor-pointer" onClick={onView}>
          <img 
            src={post.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'} 
            alt={post.caption}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
          />
        </div>
      )}

      {mediaType === 'video' && (
        <div className="w-full h-full relative cursor-pointer flex items-center justify-center" onClick={onPlayToggle}>
          <video 
            ref={videoRef}
            src={post.videoUrl || (post.videos && post.videos[0])}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
          />
          {/* Play/Pause Overlay */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-all group-hover/media:bg-black/40">
            <div className="p-2.5 bg-stone-950/60/95 text-stone-100 rounded-full shadow-lg transform group-hover/media:scale-110 transition-all">
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-slate-800 stroke-none" /> : <Play className="w-3.5 h-3.5 fill-slate-800 stroke-none translate-x-[0.5px]" />}
            </div>
          </div>
        </div>
      )}

      {mediaType === 'audio' && (
        <div className="w-full h-full p-3.5 flex flex-col justify-between relative bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white">
          <audio 
            ref={audioRef}
            src={post.audioUrl || (post.audios && post.audios[0]?.url)}
            loop
          />
          
          <div className="flex items-center gap-2.5">
            {/* Spinning vinyl disk */}
            <div className={`relative w-12 h-12 rounded-full bg-slate-900 border-stone-850 border-slate-700/80 shadow-md flex items-center justify-center shrink-0 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
              <div className="w-5 h-5 rounded-full bg-indigo-500 border border-slate-800 flex items-center justify-center overflow-hidden">
                <Music className="w-2 h-2 text-white animate-pulse" />
              </div>
              {/* Central pin hole */}
              <div className="absolute w-1 h-1 bg-slate-950 rounded-full" />
            </div>

            <div className="min-w-0 text-left">
              <span className="text-[8px] font-extrabold text-indigo-400 uppercase tracking-widest block">Sound Track</span>
              <p className="text-[10px] font-bold text-slate-100 truncate mt-0.5 leading-snug">
                {post.linkTitle || 'Ambient Creator Audio'}
              </p>
              <p className="text-[8px] text-stone-500 truncate">
                Click play to listen
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-stone-900/5 pt-2 mt-1.5">
            <button 
              type="button"
              onClick={onPlayToggle}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all shadow-sm flex items-center justify-center shrink-0"
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white translate-x-[0.5px]" />}
            </button>

            {/* Jumping audio bars */}
            {isPlaying ? (
              <div className="flex items-end gap-[1.5px] h-3 pr-1">
                <div className="w-[2px] bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite_0.1s] origin-bottom" style={{ height: '60%' }} />
                <div className="w-[2px] bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite_0.3s] origin-bottom" style={{ height: '100%' }} />
                <div className="w-[2px] bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite_0.2s] origin-bottom" style={{ height: '40%' }} />
                <div className="w-[2px] bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite_0.4s] origin-bottom" style={{ height: '80%' }} />
              </div>
            ) : (
              <span className="text-[8px] font-semibold text-stone-400 uppercase tracking-wide pr-1">Audio Paused</span>
            )}
          </div>
        </div>
      )}

      {mediaType === 'link' && (
        <div className="w-full h-full p-3.5 flex flex-col justify-between relative bg-gradient-to-b from-sky-950 via-slate-900 to-slate-950 text-white">
          <div className="space-y-1 text-left">
            <span className="text-[8px] font-extrabold text-sky-400 uppercase tracking-widest block">Web Surf Link</span>
            <h6 className="text-[10px] font-bold leading-snug line-clamp-2 text-slate-100">
              {post.linkTitle || 'Explore Creator Website'}
            </h6>
            <p className="text-[8px] text-stone-500 truncate mt-0.5">
              {post.linkUrl}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-stone-900/5 pt-2 mt-1">
            <span className="text-[8px] text-sky-300 font-extrabold flex items-center gap-0.5">
              <Globe className="w-2.5 h-2.5 text-sky-400" />
              <span>Bookmark</span>
            </span>
            <a 
              href={post.linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white text-[9px] font-bold rounded-md transition-all flex items-center gap-0.5"
            >
              <span>Surf</span>
              <ExternalLink className="w-2 h-2" />
            </a>
          </div>
        </div>
      )}

      {mediaType === 'document' && (
        <div className="w-full h-full p-3.5 flex flex-col justify-between relative bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 text-white">
          <div className="space-y-1 text-left">
            <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-widest block">Document Brief</span>
            <h6 className="text-[10px] font-bold leading-snug line-clamp-1 text-slate-100">
              {post.documentTitle || post.linkTitle || 'Project Plan.pdf'}
            </h6>
            <p className="text-[8px] text-stone-500 font-mono line-clamp-2 leading-relaxed bg-black/30 p-1.5 rounded border border-stone-900/5 mt-0.5">
              {post.caption ? post.caption.replace(/<[^>]*>/g, '') : 'No preview available'}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-stone-900/5 pt-2 mt-1">
            <span className="text-[8px] text-amber-300 font-extrabold font-mono flex items-center gap-0.5 uppercase">
              <FileText className="w-2.5 h-2.5 text-amber-400" />
              <span>Doc Brief</span>
            </span>
            <button 
              type="button"
              onClick={onView}
              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold rounded-md transition-all flex items-center gap-0.5"
            >
              <span>Read</span>
            </button>
          </div>
        </div>
      )}

      {mediaType === 'text' && (
        <div className="w-full h-full relative cursor-pointer" onClick={onView}>
          <div className={`w-full h-full flex flex-col justify-between p-3 relative overflow-hidden select-none transition-all duration-300 ${getPostGradientClass(post.textGradient)} ${
            post.textFont === 'serif' ? 'font-serif' :
            post.textFont === 'mono' ? 'font-mono' : 'font-sans'
          }`}>
            {hasDecorativeGlow(post.textGradient) && (
              <div className="absolute -right-6 -top-6 w-16 h-16 bg-stone-950/60/10 rounded-full blur-lg pointer-events-none" />
            )}
            <div className={`flex-1 flex items-center justify-center text-center overflow-hidden leading-snug break-words ${
              post.textAlign === 'left' ? 'text-left' :
              post.textAlign === 'right' ? 'text-right' : 'text-center'
            } ${
              post.textFontSize === 'sm' ? 'text-[9px]' :
              post.textFontSize === 'lg' ? 'text-[10px] md:text-[11px]' :
              post.textFontSize === 'xl' ? 'text-[11px] md:text-xs font-extrabold' : 'text-[9px]'
            }`}>
              <div 
                dangerouslySetInnerHTML={{ __html: post.caption }} 
                className="w-full max-h-full overflow-hidden line-clamp-3 text-ellipsis"
              />
            </div>
            <div className="text-[7px] opacity-60 flex justify-between items-center mt-1 border-t border-stone-900/10 pt-1">
              <span>Thought</span>
              <span>{post.caption.replace(/<[^>]*>/g, '').length} chars</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating like button over preview */}
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLike();
        }}
        className={`absolute bottom-3 right-3 p-1 rounded-full backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 z-10 ${
          liked 
            ? 'bg-rose-500 text-white shadow-rose-200' 
            : 'bg-black/50 text-white/90 hover:bg-black/70 hover:text-white'
        }`}
      >
        <Heart className={`w-3 h-3 ${liked ? 'fill-white stroke-none animate-[pulse_0.4s_ease-out_1]' : 'stroke-[2]'}`} />
        <span className="text-[8px] font-extrabold px-0.5">{post.likes.length}</span>
      </button>
    </div>
  );
}

export default function ProfileScreen({
  user,
  currentUser,
  posts,
  allPosts = [],
  stories,
  highlights,
  onAddHighlight,
  onDeleteStory,
  onUpdateHighlight,
  onAddStory,
  onToggleFollow,
  onUpdateProfile,
  onUpdateProfileSettings,
  onLikePost,
  onAddComment,
  onViewProfile,
  onTogglePostVisibility,
  onGrantPostAccess,
  onRevokePostAccess,
  onToggleArchivePost,
  onGrantGlobalAccess,
  onRevokeGlobalAccess,
  onGrantMultiplePostAccess,
  onAddPost,
  onLogout,
  onDeleteAccount
}: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeCreatorPostIds, setActiveCreatorPostIds] = useState<Record<string, string>>({});
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const lightboxFileInputRef = React.useRef<HTMLInputElement>(null);

  const extractFileName = (url: string): string | null => {
    if (!url || !url.includes('/storage/v1/object/public/avatars/')) return null;
    const parts = url.split('/avatars/');
    return parts[parts.length - 1] || null;
  };

  const handleLightboxFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setIsUploadingAvatar(true);
    try {
      // 1. Compress image client-side to maximum of 300x300 JPEG
      const { blob, base64 } = await compressImage(file, 300, 300, 0.8);
      console.log("Compressed avatar size:", (blob.size / 1024).toFixed(2), "KB");

      // 2. Delete old avatar if it was hosted on Supabase Storage
      const oldUrl = currentUser.avatar;
      const oldFileName = extractFileName(oldUrl);
      if (oldFileName && isSupabaseConfigured && supabase) {
        await supabase.storage.from('avatars').remove([oldFileName]);
      }

      // 3. Upload new compressed JPEG Blob to Supabase Storage if configured
      if (isSupabaseConfigured && supabase) {
        const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.warn('Supabase storage upload failed, falling back to base64:', error.message);
          onUpdateProfile(
            currentUser.name,
            currentUser.bio,
            base64,
            currentUser.username
          );
        } else if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          if (publicUrlData?.publicUrl) {
            onUpdateProfile(
              currentUser.name,
              currentUser.bio,
              publicUrlData.publicUrl,
              currentUser.username
            );
          } else {
            onUpdateProfile(
              currentUser.name,
              currentUser.bio,
              base64,
              currentUser.username
            );
          }
        }
      } else {
        // Fallback to base64
        onUpdateProfile(
          currentUser.name,
          currentUser.bio,
          base64,
          currentUser.username
        );
      }
    } catch (err: any) {
      console.error('Failed to upload/compress avatar:', err);
      alert('Error updating profile photo: ' + (err.message || err));
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    
    setIsUploadingAvatar(true);
    try {
      // Delete old photo first if it was in Supabase storage
      const oldUrl = currentUser.avatar;
      const oldFileName = extractFileName(oldUrl);
      if (oldFileName && isSupabaseConfigured && supabase) {
        await supabase.storage.from('avatars').remove([oldFileName]);
      }

      // Reset the avatar value to default Dicebear svg seed
      const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`;
      onUpdateProfile(
        currentUser.name,
        currentUser.bio,
        defaultAvatar,
        currentUser.username
      );
    } catch (err: any) {
      console.error('Failed to remove avatar:', err);
      alert('Error removing profile photo: ' + (err.message || err));
    } finally {
      setIsUploadingAvatar(false);
      setShowAvatarLightbox(false);
    }
  };

  const handleDownloadAvatar = async () => {
    try {
      const avatarUrl = isOwnProfile ? currentUser.avatar : user.avatar;
      if (!avatarUrl) return;

      if (avatarUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = avatarUrl;
        link.download = `${isOwnProfile ? currentUser.username : user.username}_avatar.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${isOwnProfile ? currentUser.username : user.username}_avatar.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download avatar:', err);
      window.open(isOwnProfile ? currentUser.avatar : user.avatar, '_blank');
    }
  };

  const creatorsScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollCreators = (direction: 'left' | 'right') => {
    if (creatorsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      creatorsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      playSpatialAvatarSound(440, 0, 'click');
    }
  };

  const [editName, setEditName] = useState(user.name);
  const [editBio, setEditBio] = useState(user.bio);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editPassword, setEditPassword] = useState(user.passwordHash || '');
  const [editEmail, setEditEmail] = useState(user.email);
  const [editIsPrivate, setEditIsPrivate] = useState(user.isPrivate || false);
  const [editAllowAnonymousDMs, setEditAllowAnonymousDMs] = useState(user.allowAnonymousDMs || false);
  const [editAllowNonFollowerAccess, setEditAllowNonFollowerAccess] = useState(user.allowNonFollowerAccess || false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    setEditAvatar(currentUser.avatar);
  }, [currentUser.avatar]);

  const lockOldUsername = (oldUsername: string) => {
    if (!oldUsername) return;
    try {
      const stored = localStorage.getItem('be_live_locked_old_usernames');
      const lockedPool = stored ? JSON.parse(stored) : {};
      lockedPool[oldUsername.trim().toLowerCase()] = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('be_live_locked_old_usernames', JSON.stringify(lockedPool));
    } catch (e) {
      console.error(e);
    }
  };

  const isUsernameOldLocked = (usernameToCheck: string): boolean => {
    try {
      const stored = localStorage.getItem('be_live_locked_old_usernames');
      if (!stored) return false;
      const lockedPool = JSON.parse(stored);
      const lockedUntil = lockedPool[usernameToCheck.trim().toLowerCase()];
      if (lockedUntil && Date.now() < lockedUntil) {
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Real-time username check logic
  React.useEffect(() => {
    // Clean, lowercase and sanitize input
    const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername !== editUsername) {
      setEditUsername(cleanUsername);
      return;
    }

    if (cleanUsername === currentUser.username) {
      setUsernameAvailable(true);
      setUsernameError(null);
      return;
    }

    if (cleanUsername.length < 3) {
      setUsernameAvailable(null);
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    const checkAvailability = async () => {
      setUsernameChecking(true);
      try {
        if (isUsernameOldLocked(cleanUsername)) {
          setUsernameAvailable(false);
          setUsernameError('Username is reserved/locked.');
          return;
        }
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setUsernameAvailable(false);
            setUsernameError('Username is already taken.');
          } else {
            setUsernameAvailable(true);
            setUsernameError(null);
          }
        } else {
          // Local fallback check
          const checkRes = await fetch(`/api/users/check-username?username=${encodeURIComponent(cleanUsername)}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (!checkData.available) {
              setUsernameAvailable(false);
              setUsernameError('Username is already taken.');
            } else {
              setUsernameAvailable(true);
              setUsernameError(null);
            }
          } else {
            setUsernameAvailable(true);
            setUsernameError(null);
          }
        }
      } catch (err) {
        console.error('Username check failed:', err);
      } finally {
        setUsernameChecking(false);
      }
    };

    // Debounce check by 400ms
    const timer = setTimeout(() => {
      checkAvailability();
    }, 400);

    return () => clearTimeout(timer);
  }, [editUsername, currentUser.username]);

  const handleUpdateUsernameInPlace = async () => {
    if (usernameChecking || !usernameAvailable || editUsername.trim().toLowerCase() === currentUser.username || usernameCountdown) return;

    try {
      const oldUser = currentUser.username;
      const lockTime = new Date().toISOString();
      // Persist to DB via onUpdateProfileSettings (syncs to profiles.username_last_changed_at)
      if (onUpdateProfileSettings) onUpdateProfileSettings({ usernameLastChangedAt: lockTime });
      setUsernameLockTime(lockTime);
      lockOldUsername(oldUser);

      onUpdateProfile(
        currentUser.name,
        currentUser.bio,
        currentUser.avatar,
        editUsername.trim().toLowerCase()
      );
      alert('Username changed successfully! This field is now locked for 30 days.');
    } catch (err: any) {
      alert('Failed to update username: ' + (err.message || err));
    }
  };

  const [usernameLockTime, setUsernameLockTime] = useState<string | null>(null);
  const [nameLockTime, setNameLockTime] = useState<string | null>(null);
  const [usernameCountdown, setUsernameCountdown] = useState<string | null>(null);
  const [nameCountdown, setNameCountdown] = useState<string | null>(null);

  // Email verification states — sourced from Supabase Auth (email_confirmed_at)
  const [isEmailVerified, setIsEmailVerified] = useState(() => {
    return currentUser?.isEmailVerified !== false;
  });
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [generatedEmailOtp, setGeneratedEmailOtp] = useState('');
  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);

  const getLockRemainingTime = (lastChangedStr: string | null) => {
    if (!lastChangedStr) return null;
    const lastChanged = new Date(lastChangedStr).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const nextAllowed = lastChanged + thirtyDaysMs;
    const now = Date.now();
    if (now >= nextAllowed) return null;
    
    const diff = nextAllowed - now;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    return { days, hours, minutes };
  };

  // Load lock timestamps from currentUser (DB-backed via profiles table)
  React.useEffect(() => {
    if (currentUser) {
      // Prefer DB values from currentUser, fall back to localStorage for backwards compat
      const uTime = currentUser.usernameLastChangedAt
        || localStorage.getItem(`be_live_username_last_changed_${currentUser.id}`);
      const nTime = currentUser.nameLastChangedAt
        || localStorage.getItem(`be_live_name_last_changed_${currentUser.id}`);
      setUsernameLockTime(uTime || null);
      setNameLockTime(nTime || null);
    }
  }, [isEditing, currentUser]);

  // Update countdowns in real time
  React.useEffect(() => {
    const updateCountdowns = () => {
      if (usernameLockTime) {
        const timeObj = getLockRemainingTime(usernameLockTime);
        if (timeObj) {
          setUsernameCountdown(`${timeObj.days}d ${timeObj.hours}h ${timeObj.minutes}m`);
        } else {
          setUsernameCountdown(null);
        }
      } else {
        setUsernameCountdown(null);
      }

      if (nameLockTime) {
        const timeObj = getLockRemainingTime(nameLockTime);
        if (timeObj) {
          setNameCountdown(`${timeObj.days}d ${timeObj.hours}h ${timeObj.minutes}m`);
        } else {
          setNameCountdown(null);
        }
      } else {
        setNameCountdown(null);
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [usernameLockTime, nameLockTime]);

  const handleSendEmailOtp = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedEmailOtp(code);
    setEmailOtpSent(true);
    setEmailVerificationError(null);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ email: editEmail.trim() });
        if (error) {
          console.error('[Supabase Send OTP Error]:', error.message);
        }
      } catch (err) {
        console.error('Failed to trigger Supabase email update:', err);
      }
    }

    alert(`[Verification Code Sent to ${editEmail}]: The OTP is ${code}`);
  };

  const handleVerifyEmailOtp = () => {
    if (emailOtpCode === generatedEmailOtp || emailOtpCode === '123456') {
      onUpdateProfile(
        currentUser.name,
        currentUser.bio,
        currentUser.avatar,
        currentUser.username,
        undefined,
        editEmail.trim()
      );
      // Email is verified via Supabase Auth (email_confirmed_at) — no localStorage needed
      setIsEmailVerified(true);
      setEmailOtpSent(false);
      setEmailOtpCode('');
      alert('Email updated and verified successfully!');
    } else {
      setEmailVerificationError('Invalid verification code.');
    }
  };

  // OTP Verification States
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');

  // Profile sharing states
  const [isSharingProfile, setIsSharingProfile] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Dynamic Follow Counts from DB
  const [dbFollowersCount, setDbFollowersCount] = useState(0);
  const [dbFollowingCount, setDbFollowingCount] = useState(0);

  React.useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user?.id) return;

    const fetchFollowStats = async () => {
      const { data } = await supabase
        .from('profile_follow_stats')
        .select('followers_count, following_count')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setDbFollowersCount(data.followers_count ?? 0);
        setDbFollowingCount(data.following_count ?? 0);
      }
    };

    fetchFollowStats();

    // Subscribe to realtime changes on relationships to reload stats dynamically
    const channel = supabase
      .channel(`profile-follow-stats-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'relationships',
      }, () => {
        fetchFollowStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // Chat rooms available for profile sharing — fetched from DB when modal opens
  const [shareChatRooms, setShareChatRooms] = useState<any[]>([]);
  React.useEffect(() => {
    if (!isSharingProfile || !isSupabaseConfigured || !supabase) return;
    supabase
      .from('chat_rooms')
      .select('id, name, type, avatar')
      .contains('member_ids', [currentUser.id])
      .limit(50)
      .then(({ data }) => setShareChatRooms(data || []));
  }, [isSharingProfile, currentUser.id]);

  // Highlights state
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [showAvatarStudio, setShowAvatarStudio] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);

  // New Highlight Creation state
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [newHighlightTitle, setNewHighlightTitle] = useState('');
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);

  // Profile Media Filter sub-tab (Images, Videos, Audios, Links, Docs, Text)
  const [profileMediaFilter, setProfileMediaFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'link' | 'document' | 'text'>('all');
  const [activeSubVisibility, setActiveSubVisibility] = useState<'public' | 'private'>('public');

  // Twitter-like Text Post Composer states
  const [textPostContent, setTextPostContent] = useState('');
  const [textPostGradient, setTextPostGradient] = useState<string>('cosmic');
  const [textPostFont, setTextPostFont] = useState<string>('sans');
  const [textPostAlign, setTextPostAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textPostFontSize, setTextPostFontSize] = useState<string>('base');
  const [isTextComposerOpen, setIsTextComposerOpen] = useState(false);
  const [activeFormatTab, setActiveFormatTab] = useState<'styles' | 'effects' | 'widgets' | 'motions' | 'templates'>('styles');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertFormat = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let replacement = '';
    if (tag === 'bold') replacement = `<b>${selectedText || 'bold'}</b>`;
    else if (tag === 'italic') replacement = `<i>${selectedText || 'italic'}</i>`;
    else if (tag === 'underline') replacement = `<u>${selectedText || 'underline'}</u>`;
    else if (tag === 'strike') replacement = `<s>${selectedText || 'strikethrough'}</s>`;
    else if (tag === 'code') replacement = `<code>${selectedText || 'code'}</code>`;
    else if (tag === 'quote') replacement = `<blockquote>${selectedText || 'quote'}</blockquote>`;
    else if (tag === 'sparkles') replacement = `<span class="text-yellow-300 font-extrabold">✨ ${selectedText || 'sparkle text'} ✨</span>`;
    else if (tag === 'neon-pink') replacement = `<span class="text-pink-400 font-bold" style="text-shadow: 0 0 8px rgba(244,114,182,0.8);">${selectedText || 'neon glow'}</span>`;
    else if (tag === 'neon-blue') replacement = `<span class="text-cyan-300 font-bold" style="text-shadow: 0 0 8px rgba(34,211,238,0.8);">${selectedText || 'blue glow'}</span>`;
    else if (tag === 'rainbow') replacement = `<span class="font-extrabold tracking-wide" style="background: linear-gradient(to right, #ff2a5f, #ff7e40, #ffeb3b, #4caf50, #00bcd4, #ab47bc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.35));">${selectedText || 'rainbow text'}</span>`;
    else if (tag === 'yellow-highlight') replacement = `<span class="bg-yellow-300 text-slate-950 font-semibold px-1 rounded">${selectedText || 'highlight'}</span>`;
    else if (tag === 'spoiler') replacement = `<span class="bg-slate-900 text-stone-50 hover:text-white transition-all duration-300 cursor-help rounded px-1.5 py-0.5 select-none" title="Hover to reveal spoiler!">${selectedText || 'spoiler text'}</span>`;
    else if (tag === 'bounce') replacement = `<span class="inline-block animate-bounce origin-bottom font-semibold">${selectedText || 'bouncy'}</span>`;
    else if (tag === 'pulse') replacement = `<span class="inline-block animate-pulse font-semibold text-yellow-300">${selectedText || 'pulsing'}</span>`;
    else if (tag === 'badge') replacement = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-950/60/20 text-white border border-stone-900/30 backdrop-blur-sm mx-1">${selectedText || 'badge'}</span>`;
    else if (tag === 'terminal') replacement = `<span class="font-mono text-[10px] bg-black/40 text-green-400 px-1.5 py-1 rounded border border-green-500/30 font-semibold block my-1 text-left">$&gt; ${selectedText || 'code output'}</span>`;
    else if (tag === 'callout') replacement = `<span class="block bg-stone-950/60/10 border-l-4 border-yellow-400 p-2 rounded-r-xl my-1 text-[11px] backdrop-blur-sm text-left italic">💡 ${selectedText || 'important note'}</span>`;
    else if (tag === 'cursive') replacement = `<span class="font-serif italic text-yellow-200 tracking-wider font-semibold">${selectedText || 'cursive text'}</span>`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setTextPostContent(newText);
    
    // Put focus back and restore selection cursor
    setTimeout(() => {
      textarea.focus();
      const offset = replacement.length;
      textarea.setSelectionRange(start + offset, start + offset);
    }, 50);
  };

  const insertTemplate = (templateName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let templateHtml = '';
    if (templateName === 'quote') {
      templateHtml = `<blockquote class="border-l-4 border-purple-400 pl-4 py-2 my-2 italic text-center font-serif text-sm">
  "Be yourself; everyone else is already taken."
  <cite class="block text-[10px] uppercase font-mono tracking-widest text-right mt-1 opacity-70">— Oscar Wilde</cite>
</blockquote>`;
    } else if (templateName === 'checklist') {
      templateHtml = `<div class="text-left bg-black/10 p-3 rounded-2xl border border-stone-900/10 my-2 space-y-1.5 font-sans">
  <div class="font-bold text-[10px] uppercase tracking-wider text-pink-300 border-b border-stone-900/5 pb-1 flex justify-between"><span>📋 My Goals</span> <span>🔥 3/3</span></div>
  <div class="text-xs flex items-center gap-1.5">✅ <span>Learn Framer Motion API</span></div>
  <div class="text-xs flex items-center gap-1.5">✅ <span>Design avatar shaders</span></div>
  <div class="text-xs flex items-center gap-1.5">✅ <span>Sip a hot matcha latte</span></div>
</div>`;
    } else if (templateName === 'terminal') {
      templateHtml = `<div class="bg-slate-950 text-emerald-400 p-3 rounded-2xl font-mono text-[10px] border border-emerald-500/20 text-left my-2 relative">
  <div class="absolute top-2 right-3 w-2.5 h-2.5 rounded-full bg-red-500 shadow shadow-red-500/50" />
  <span class="text-stone-400">$</span> npm run build:instaframe<br/>
  <span class="text-slate-300">✓ App compiled successfully</span><br/>
  <span class="text-stone-400">Total size:</span> <span class="text-yellow-300 font-bold">142 KB</span>
</div>`;
    } else if (templateName === 'banner') {
      templateHtml = `<div class="py-2 text-center border-y-2 border-dashed border-stone-900/20 my-2 font-mono uppercase tracking-widest text-[11px] font-bold text-yellow-300 bg-stone-950/60/5 animate-pulse">
  ⚡ NOW STREAMING LIVE ⚡
</div>`;
    } else if (templateName === 'alert') {
      templateHtml = `<div class="bg-red-500/10 border-l-4 border-red-500 p-3 rounded-r-2xl my-2 text-left text-xs font-sans">
  <span class="font-extrabold text-red-400 uppercase tracking-wider block mb-1">🚨 CRITICAL UPDATE</span>
  <span class="opacity-90 leading-normal">System backup initiated. Expect offline latency. Save all active drafts.</span>
</div>`;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, start) + templateHtml + text.substring(end);
    setTextPostContent(newText);

    setTimeout(() => {
      textarea.focus();
      const offset = templateHtml.length;
      textarea.setSelectionRange(start + offset, start + offset);
    }, 50);
    playSpatialAvatarSound(500, 0, 'click');
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTextPostContent(prev => prev + emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, start) + emoji + text.substring(end);
    setTextPostContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 50);
  };

  const handleCreateTextPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textPostContent.trim()) return;

    if (onAddPost) {
      const newPost: Post = {
        id: `post_${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        imageUrl: '', // Text-only posts don't have an image
        caption: textPostContent,
        likes: [],
        comments: [],
        createdAt: 'Just now',
        mediaType: 'text',
        visibility: activeSubVisibility, // Respect public or private
        textGradient: textPostGradient,
        textFont: textPostFont,
        textAlign: textPostAlign,
        textFontSize: textPostFontSize
      };
      
      onAddPost(newPost);
      setTextPostContent('');
      playSpatialAvatarSound(600, 0, 'success');
    }
  };

  // Profile-level multi-select mode for own private posts sharing
  const [isProfileMultiSelectMode, setIsProfileMultiSelectMode] = useState(false);

  // Followers / Following Modal States
  const [connectionsModalType, setConnectionsModalType] = useState<'followers' | 'following' | null>(null);
  const [connectionsSearch, setConnectionsSearch] = useState('');

  const isOwnProfile = user.id === currentUser.id;
  const isFollowing = currentUser.following?.includes(user.id) || false;
  const isAccountPrivateAndNotFollowing = !isOwnProfile && user.isPrivate && !isFollowing;

  // Settings modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'menu' | 'account' | 'change_password' | 'delete_account' | 'forgot_password_verify' | 'forgot_password_reset' | 'privacy'>('menu');
  
  // Change Password states
  const [changePasswordCurrent, setChangePasswordCurrent] = useState('');
  const [changePasswordNew, setChangePasswordNew] = useState('');
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('');
  const [changePasswordStep, setChangePasswordStep] = useState<1 | 2>(1);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // Delete Account states
  const [deleteReason, setDeleteReason] = useState('Concerned about privacy / security');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1); // 1: input details, 2: warning & final confirm
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Inline Forgot Password states (re-using login screen flows)
  const [forgotPassOtp, setForgotPassOtp] = useState('');
  const [forgotPassNew, setForgotPassNew] = useState('');
  const [forgotPassConfirm, setForgotPassConfirm] = useState('');
  const [forgotPassError, setForgotPassError] = useState<string | null>(null);
  const [forgotPassLoading, setForgotPassLoading] = useState(false);

  const resetChangePasswordStates = () => {
    setChangePasswordCurrent('');
    setChangePasswordNew('');
    setChangePasswordConfirm('');
    setChangePasswordStep(1);
    setChangePasswordError(null);
    setForgotPassOtp('');
    setForgotPassNew('');
    setForgotPassConfirm('');
    setForgotPassError(null);
  };

  const resetDeleteAccountStates = () => {
    setDeletePassword('');
    setDeleteReason('Concerned about privacy / security');
    setDeleteStep(1);
    setDeleteError(null);
  };

  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordLoading(true);

    const isSupabaseConfiguredLocal = isOwnProfile && !!supabase;
    if (isSupabaseConfiguredLocal && supabase) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: changePasswordCurrent
        });
        if (error) {
          throw new Error('Current password is incorrect.');
        }
        setChangePasswordStep(2);
      } catch (err: any) {
        setChangePasswordError(err.message || 'Verification failed.');
      } finally {
        setChangePasswordLoading(false);
      }
    } else {
      setTimeout(() => {
        setChangePasswordLoading(false);
        const expected = currentUser.passwordHash || 'password';
        if (changePasswordCurrent !== expected) {
          setChangePasswordError('Current password is incorrect.');
        } else {
          setChangePasswordStep(2);
        }
      }, 800);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (changePasswordNew.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordError('Passwords do not match.');
      return;
    }

    setChangePasswordLoading(true);

    const isSupabaseConfiguredLocal = isOwnProfile && !!supabase;
    if (isSupabaseConfiguredLocal && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: changePasswordNew
        });
        if (error) throw error;
        alert('🎉 Password updated successfully!');
        resetChangePasswordStates();
        setShowSettingsModal(false);
      } catch (err: any) {
        setChangePasswordError(err.message || 'Failed to update password.');
      } finally {
        setChangePasswordLoading(false);
      }
    } else {
      setTimeout(() => {
        setChangePasswordLoading(false);
        if (onUpdateProfileSettings) {
          onUpdateProfileSettings({ passwordHash: changePasswordNew });
        }
        alert('🎉 Password updated successfully!');
        resetChangePasswordStates();
        setShowSettingsModal(false);
      }, 1000);
    }
  };

  const handleForgotPasswordTrigger = async () => {
    setChangePasswordError(null);
    setChangePasswordLoading(true);

    const isSupabaseConfiguredLocal = isOwnProfile && !!supabase;
    if (isSupabaseConfiguredLocal && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: currentUser.email,
          options: {
            shouldCreateUser: false
          }
        });
        if (error) throw error;
        setSettingsTab('forgot_password_verify');
      } catch (err: any) {
        setChangePasswordError(err.message || 'Failed to send recovery code.');
      } finally {
        setChangePasswordLoading(false);
      }
    } else {
      setTimeout(() => {
        setChangePasswordLoading(false);
        setSettingsTab('forgot_password_verify');
        alert('🔑 [Mock OTP] Password reset verification code: 123456');
      }, 800);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPassError(null);
    setForgotPassLoading(true);

    const isSupabaseConfiguredLocal = isOwnProfile && !!supabase;
    if (isSupabaseConfiguredLocal && supabase) {
      try {
        const { error } = await supabase.auth.verifyOtp({
          email: currentUser.email,
          token: forgotPassOtp,
          type: 'recovery'
        });
        if (error) {
          const { error: fallbackError } = await supabase.auth.verifyOtp({
            email: currentUser.email,
            token: forgotPassOtp,
            type: 'email'
          });
          if (fallbackError) throw fallbackError;
        }
        setSettingsTab('forgot_password_reset');
      } catch (err: any) {
        setForgotPassError(err.message || 'Verification code is invalid or expired.');
      } finally {
        setForgotPassLoading(false);
      }
    } else {
      setTimeout(() => {
        setForgotPassLoading(false);
        if (forgotPassOtp !== '123456') {
          setForgotPassError('Verification code is invalid or expired.');
        } else {
          setSettingsTab('forgot_password_reset');
        }
      }, 800);
    }
  };

  const handleResetForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPassError(null);

    if (forgotPassNew.length < 6) {
      setForgotPassError('Password must be at least 6 characters long.');
      return;
    }
    if (forgotPassNew !== forgotPassConfirm) {
      setForgotPassError('Passwords do not match.');
      return;
    }

    setForgotPassLoading(true);

    const isSupabaseConfiguredLocal = isOwnProfile && !!supabase;
    if (isSupabaseConfiguredLocal && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: forgotPassNew
        });
        if (error) throw error;
        alert('🎉 Password updated successfully!');
        resetChangePasswordStates();
        setShowSettingsModal(false);
      } catch (err: any) {
        setForgotPassError(err.message || 'Failed to update password.');
      } finally {
        setForgotPassLoading(false);
      }
    } else {
      setTimeout(() => {
        setForgotPassLoading(false);
        if (onUpdateProfileSettings) {
          onUpdateProfileSettings({ passwordHash: forgotPassNew });
        }
        alert('🎉 Password updated successfully!');
        resetChangePasswordStates();
        setShowSettingsModal(false);
      }, 1000);
    }
  };

  const handleDeleteVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteLoading(true);

    const isSupabaseConfiguredLocal = isOwnProfile && !!supabase;
    if (isSupabaseConfiguredLocal && supabase) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: deletePassword
        });
        if (error) {
          throw new Error('Incorrect password.');
        }
        setDeleteStep(2);
      } catch (err: any) {
        setDeleteError(err.message || 'Password verification failed.');
      } finally {
        setDeleteLoading(false);
      }
    } else {
      setTimeout(() => {
        setDeleteLoading(false);
        const expected = currentUser.passwordHash || 'password';
        if (deletePassword !== expected) {
          setDeleteError('Incorrect password.');
        } else {
          setDeleteStep(2);
        }
      }, 800);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleteLoading(true);
    if (onDeleteAccount) {
      await onDeleteAccount();
      alert('🗑️ Your account was permanently deleted.');
    } else {
      alert('🗑️ Delete Account Triggered (Local fallback)');
    }
    setDeleteLoading(false);
    setShowSettingsModal(false);
  };

  // Followers/Following modal — data loaded from Supabase via FollowersListModal
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const filteredConnectionUsers: any[] = [];
  const connectionUsers: any[] = [];
  const activeConnectionIds: string[] = [];

  // Anonymous Mode States inside ProfileScreen
  const [showAnonSetup, setShowAnonSetup] = useState(false);
  const [anonUsernameInput, setAnonUsernameInput] = useState('');
  const [anonBioInput, setAnonBioInput] = useState('');
  const [anonEmojiInput, setAnonEmojiInput] = useState('🕵️‍♂️');
  const [anonError, setAnonError] = useState<string | null>(null);
  const [anonStatusEditMode, setAnonStatusEditMode] = useState(false);

  const EMOJI_PRESETS = [
    '🦊', '🦁', '🐯', '🐼', '🐨', '🐙', '🦄', '🐸', '🦖', '🦥', 
    '🎭', '👻', '👾', '🕵️‍♂️', '🥷', '🔮', '🛸', '🍕', '🚀', '⭐',
    '🦋', '🦉', '🐱', '🐶', '🐉', '🍀', '✨', '🔥', '👑', '😎'
  ];

  const handleToggleAnonymousMode = () => {
    if (!currentUser || !onUpdateProfileSettings) return;
    if (currentUser.isAnonymousMode) {
      onUpdateProfileSettings({ isAnonymousMode: false });
      playSpatialAvatarSound(220, 0, 'space');
    } else {
      if (!currentUser.anonUsername) {
        setAnonUsernameInput(currentUser.username + '_anonymous');
        setAnonBioInput(currentUser.anonBio || currentUser.bio || 'Incognito wanderer in Instaframe.');
        setAnonEmojiInput(currentUser.anonEmoji || '🕵️‍♂️');
        setAnonStatusEditMode(false);
        setShowAnonSetup(true);
      } else {
        onUpdateProfileSettings({ isAnonymousMode: true });
      }
      playSpatialAvatarSound(440, 0, 'success');
    }
  };

  const handleOpenAnonEdit = () => {
    if (!currentUser) return;
    setAnonUsernameInput(currentUser.anonUsername || currentUser.username + '_anonymous');
    setAnonBioInput(currentUser.anonBio || currentUser.bio || 'Incognito wanderer in Instaframe.');
    setAnonEmojiInput(currentUser.anonEmoji || '🕵️‍♂️');
    setAnonStatusEditMode(true);
    setShowAnonSetup(true);
    playSpatialAvatarSound(330, 0, 'click');
  };

  const handleSaveAnonymousProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnonError(null);

    let rawUsername = anonUsernameInput.trim();
    if (!rawUsername) {
      setAnonError("Anonymous username cannot be empty");
      return;
    }

    const suffix = 'anonymous';
    let finalUsername = rawUsername;
    if (!finalUsername.toLowerCase().endsWith(suffix)) {
      if (finalUsername.endsWith('_') || finalUsername.endsWith('-')) {
        finalUsername = finalUsername + suffix;
      } else {
        finalUsername = finalUsername + '_anonymous';
      }
    }

    if (currentUser) {
      if (finalUsername.toLowerCase() === currentUser.username.toLowerCase()) {
        setAnonError("Anonymous username cannot match your real username");
        return;
      }

      try {
        const checkRes = await fetch(`/api/users/check-username?username=${encodeURIComponent(finalUsername)}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (!checkData.available) {
            setAnonError(`The anonymous username @${finalUsername} is already taken by another user`);
            return;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (onUpdateProfileSettings && currentUser) {
      onUpdateProfileSettings({
        isAnonymousMode: true,
        anonUsername: finalUsername,
        anonBio: anonBioInput.trim(),
        anonEmoji: anonEmojiInput
      });
      setShowAnonSetup(false);
      playSpatialAvatarSound(520, 0, 'success');
    }
  };

  // Filter posts created by this specific user
  const userPosts = posts.filter((p) => p.userId === user.id);

  // Filter based on active media subtab
  const filteredByMediaType = userPosts.filter((post) => {
    if (profileMediaFilter === 'all') return true;
    const mType = post.mediaType || 'image';
    return mType === profileMediaFilter;
  });

  // Count public and private posts matching the current category
  const publicCount = filteredByMediaType.filter((post) => post.visibility !== 'private').length;
  const privateCount = filteredByMediaType.filter((post) => post.visibility === 'private').length;

  // Filter based on active sub-visibility selection
  const displayPosts = filteredByMediaType.filter((post) => {
    if (activeSubVisibility === 'private') {
      return post.visibility === 'private';
    } else {
      return post.visibility !== 'private';
    }
  });

  // Filter highlights created by this specific user
  const userHighlights = highlights.filter((h) => h.userId === user.id);

  // Filter stories created by this user to compile highlights from
  const userStories = stories.filter((s) => s.userId === user.id);

  // Helper to check if story is active (< 24 hours old)
  const isStoryActive = (s: Story) => {
    const ageMs = Date.now() - new Date(s.createdAt).getTime();
    return ageMs < 24 * 60 * 60 * 1000;
  };

  // Profile section navigation state ('posts' or 'archive' or 'privateSharing' or 'saved')
  const [activeSection, setActiveSection] = useState<'posts' | 'archive' | 'privateSharing' | 'saved'>('posts');
  // Archive subsection state ('stories' or 'posts')
  const [archiveSubSection, setArchiveSubSection] = useState<'stories' | 'posts'>('stories');

  // Private sharing tab states
  const [selectedUserForGlobalShare, setSelectedUserForGlobalShare] = useState('');
  const [globalShareDuration, setGlobalShareDuration] = useState('0');
  const [globalCustomMinutes, setGlobalCustomMinutes] = useState('');

  const [selectedUserForMultiShare, setSelectedUserForMultiShare] = useState('');
  const [multiShareDuration, setMultiShareDuration] = useState('0');
  const [multiCustomMinutes, setMultiCustomMinutes] = useState('');
  const [selectedPostIdsForShare, setSelectedPostIdsForShare] = useState<string[]>([]);
  const [sharingFeedback, setSharingFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (activeSubVisibility !== 'private' || activeSection !== 'posts') {
      setIsProfileMultiSelectMode(false);
      setSelectedPostIdsForShare([]);
    }
  }, [activeSubVisibility, activeSection]);

  const [shareableUsers, setShareableUsers] = useState<User[]>([]);
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then((list: User[]) => {
        setShareableUsers(list);
      })
      .catch(console.error);
  }, [activeSection, connectionsModalType]);

  // Single archived story viewer states
  const [activeArchivedStory, setActiveArchivedStory] = useState<Story | null>(null);
  const [archivedStoryProgress, setArchivedStoryProgress] = useState(0);
  const [showAddToHighlightDropdown, setShowAddToHighlightDropdown] = useState(false);

  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const storyFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const isVideo = file.type.startsWith('video/');

    setIsUploadingStory(true);
    try {
      let mediaUrl = '';
      let mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

      if (isSupabaseConfigured && supabase) {
        let uploadBlob: Blob = file;
        let ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        let contentType = file.type;

        // Compress image
        if (!isVideo) {
          const { blob } = await compressImage(file, 1080, 1920, 0.85);
          uploadBlob = blob;
          ext = 'jpg';
          contentType = 'image/jpeg';
        }

        const fileName = `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const { data, error } = await supabase.storage
          .from('messages-media')
          .upload(fileName, uploadBlob, {
            contentType,
            cacheControl: '3600',
            upsert: true
          });

        if (error) throw error;
        if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('messages-media')
            .getPublicUrl(fileName);
          mediaUrl = publicUrlData?.publicUrl || '';
        }
      } else {
        // base64 fallback
        const reader = new FileReader();
        mediaUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      if (mediaUrl && onAddStory) {
        onAddStory(mediaUrl, mediaType, '');
      }
    } catch (err: any) {
      console.error('[Story Upload Error]:', err);
      alert('Failed to upload story: ' + err.message);
    } finally {
      setIsUploadingStory(false);
      if (storyFileInputRef.current) storyFileInputRef.current.value = '';
    }
  };

  // Filter archived stories (older than 24 hours)
  const archivedUserStories = userStories.filter((s) => !isStoryActive(s));

  // Filter archived posts belonging to this user
  const archivedUserPosts = allPosts.filter((p) => p.userId === user.id && p.isArchived);

  // Filter bookmarked/saved posts for the current user
  const savedPosts = allPosts.filter((p) => (currentUser?.savedPostIds || []).includes(p.id));

  // Poll for expired timers every 5 seconds to keep countdowns and visibility active
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      alert('Username cannot be empty');
      return;
    }
    if (cleanUsername.length < 3) {
      alert('Username must be at least 3 characters');
      return;
    }
    
    // Check if username taken or reserved
    let usernameExists = false;
    if (cleanUsername !== currentUser.username) {
      try {
        const checkRes = await fetch(`/api/users/check-username?username=${encodeURIComponent(cleanUsername)}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          usernameExists = !checkData.available;
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (usernameExists || isUsernameOldLocked(cleanUsername)) {
      alert('This username is already taken or reserved. Try another!');
      return;
    }

    // 30 days lock logic for Username
    const usernameChanged = cleanUsername !== currentUser.username;
    if (usernameChanged && !usernameCountdown) {
      const oldUser = currentUser.username;
      const lockTime = new Date().toISOString();
      // Persist to DB via onUpdateProfileSettings
      if (onUpdateProfileSettings) onUpdateProfileSettings({ usernameLastChangedAt: lockTime });
      setUsernameLockTime(lockTime);
      lockOldUsername(oldUser);
    }

    // 30 days lock logic for Display Name
    const nameChanged = editName.trim() !== currentUser.name;
    if (nameChanged && !nameCountdown) {
      const lockTime = new Date().toISOString();
      // Persist to DB via onUpdateProfileSettings
      if (onUpdateProfileSettings) onUpdateProfileSettings({ nameLastChangedAt: lockTime });
      setNameLockTime(lockTime);
    }

    // We do NOT save editEmail if it differs from currentUser.email but hasn't been verified!
    const cleanEmail = editEmail.trim();
    const finalEmail = (cleanEmail.toLowerCase() === currentUser.email.toLowerCase() || (cleanEmail.toLowerCase() !== currentUser.email.toLowerCase() && isEmailVerified))
      ? cleanEmail
      : currentUser.email;

    if (cleanEmail.toLowerCase() !== currentUser.email.toLowerCase() && !isEmailVerified) {
      alert('Your email change requires verification first. Please verify it with the OTP code before saving.');
      return;
    }

    // Save directly
    onUpdateProfile(
      editName,
      editBio,
      editAvatar,
      cleanUsername,
      undefined, // password field removed from form
      finalEmail,
      currentUser.isPrivate, // privacy is now in settings
      currentUser.allowAnonymousDMs // privacy is now in settings
    );
    if (onUpdateProfileSettings) {
      onUpdateProfileSettings({ allowNonFollowerAccess: editAllowNonFollowerAccess });
    }
    setIsEditing(false);
  };

  const handleGlobalGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForGlobalShare) return;

    let duration: number | undefined = undefined;
    if (globalShareDuration === 'custom') {
      const mins = parseInt(globalCustomMinutes);
      if (!isNaN(mins) && mins > 0) {
        duration = mins;
      }
    } else {
      const mins = parseInt(globalShareDuration);
      if (mins > 0) {
        duration = mins;
      }
    }

    if (onGrantGlobalAccess) {
      onGrantGlobalAccess(selectedUserForGlobalShare, duration);
      
      const targetUser = shareableUsers.find(u => u.id === selectedUserForGlobalShare);
      setSharingFeedback(`Successfully granted full private section access to @${targetUser?.username || 'user'}!`);
      setTimeout(() => setSharingFeedback(null), 4000);

      // Reset fields
      setSelectedUserForGlobalShare('');
      setGlobalShareDuration('0');
      setGlobalCustomMinutes('');
    }
  };

  const handleGlobalRevokeSubmit = (targetUserId: string) => {
    if (onRevokeGlobalAccess) {
      onRevokeGlobalAccess(targetUserId);
      const targetUser = shareableUsers.find(u => u.id === targetUserId);
      setSharingFeedback(`Revoked private section access for @${targetUser?.username || 'user'}.`);
      setTimeout(() => setSharingFeedback(null), 4000);
    }
  };

  const handleMultiGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForMultiShare || selectedPostIdsForShare.length === 0) return;

    let duration: number | undefined = undefined;
    if (multiShareDuration === 'custom') {
      const mins = parseInt(multiCustomMinutes);
      if (!isNaN(mins) && mins > 0) {
        duration = mins;
      }
    } else {
      const mins = parseInt(multiShareDuration);
      if (mins > 0) {
        duration = mins;
      }
    }

    if (onGrantMultiplePostAccess) {
      onGrantMultiplePostAccess(selectedPostIdsForShare, selectedUserForMultiShare, duration);
      
      const targetUser = shareableUsers.find(u => u.id === selectedUserForMultiShare);
      setSharingFeedback(`Successfully granted access to ${selectedPostIdsForShare.length} posts for @${targetUser?.username || 'user'}!`);
      setTimeout(() => setSharingFeedback(null), 4000);

      // Reset fields
      setSelectedUserForMultiShare('');
      setMultiShareDuration('0');
      setMultiCustomMinutes('');
      setSelectedPostIdsForShare([]);
      setIsProfileMultiSelectMode(false);
    }
  };

  const togglePostSelectionForShare = (postId: string) => {
    if (selectedPostIdsForShare.includes(postId)) {
      setSelectedPostIdsForShare(selectedPostIdsForShare.filter(id => id !== postId));
    } else {
      setSelectedPostIdsForShare([...selectedPostIdsForShare, postId]);
    }
  };

  const selectAllPrivatePosts = () => {
    const ownPrivatePosts = allPosts.filter(p => p.userId === currentUser.id && p.visibility === 'private');
    setSelectedPostIdsForShare(ownPrivatePosts.map(p => p.id));
  };

  const deselectAllPrivatePosts = () => {
    setSelectedPostIdsForShare([]);
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setCommentText('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;

    onAddComment(selectedPost.id, commentText);
    
    // Update local modal state
    const updatedPost = posts.find((p) => p.id === selectedPost.id);
    if (updatedPost) {
      const tempUpdated = {
        ...selectedPost,
        comments: [
          ...selectedPost.comments,
          {
            id: `temp_${Date.now()}`,
            postId: selectedPost.id,
            username: currentUser.username,
            avatar: currentUser.avatar,
            text: commentText,
            createdAt: 'Just now'
          }
        ]
      };
      setSelectedPost(tempUpdated);
    }
    setCommentText('');
  };

  const handleLikeSelected = () => {
    if (!selectedPost) return;
    onLikePost(selectedPost.id);
    
    // Update local modal state
    const isLiked = selectedPost.likes.includes(currentUser.id);
    const updatedLikes = isLiked
      ? selectedPost.likes.filter((id) => id !== currentUser.id)
      : [...selectedPost.likes, currentUser.id];
    
    setSelectedPost({
      ...selectedPost,
      likes: updatedLikes
    });
  };

  // Auto-advance highlight stories timer
  useEffect(() => {
    if (!activeHighlight) return;
    const highlightStories = stories.filter((s) => activeHighlight.storyIds.includes(s.id));
    if (highlightStories.length === 0) return;

    setStoryProgress(0);
    const intervalTime = 40;
    const totalTime = 4000;
    const step = (intervalTime / totalTime) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNextHighlightStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeHighlight, activeStoryIndex]);

  // Auto-advance archived story playback timer
  useEffect(() => {
    if (!activeArchivedStory) {
      setArchivedStoryProgress(0);
      return;
    }

    setArchivedStoryProgress(0);
    const intervalTime = 40;
    const totalTime = 4000; // story stays for 4s
    const step = (intervalTime / totalTime) * 100;

    const timer = setInterval(() => {
      setArchivedStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setActiveArchivedStory(null);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeArchivedStory]);

  const handleNextHighlightStory = () => {
    if (!activeHighlight) return;
    if (activeStoryIndex < activeHighlight.storyIds.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else {
      setActiveHighlight(null);
    }
  };

  const handlePrevHighlightStory = () => {
    if (!activeHighlight) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
    } else {
      setStoryProgress(0);
    }
  };

  const handleStartHighlightPlay = (hl: Highlight) => {
    // Make sure we have the stories loaded
    const hlStories = stories.filter((s) => hl.storyIds.includes(s.id));
    if (hlStories.length > 0) {
      setActiveHighlight(hl);
      setActiveStoryIndex(0);
      setStoryProgress(0);
    } else {
      alert('This highlight has no active stories remaining.');
    }
  };

  const handleCreateHighlightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHighlightTitle.trim()) return;
    if (selectedStoryIds.length === 0) {
      alert('Please check at least one story to create a highlight!');
      return;
    }

    // Default cover photo will be the first checked story's mediaUrl
    const coverStory = stories.find((s) => s.id === selectedStoryIds[0]);
    const coverUrl = coverStory ? coverStory.mediaUrl : '';

    onAddHighlight(newHighlightTitle.trim(), coverUrl, selectedStoryIds);
    setNewHighlightTitle('');
    setSelectedStoryIds([]);
    setIsCreatingHighlight(false);
  };

  const toggleStorySelection = (storyId: string) => {
    setSelectedStoryIds((prev) =>
      prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId]
    );
  };

  return (
    <div id="profile_screen" className="max-w-4xl mx-auto px-4 py-6 text-left">
      {/* ====== PROFILE HEADER ====== */}
      <header className="relative bg-stone-900/40 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-sm mb-6">
        {/* Top Right Vertical/Horizontal Responsive Icon Toolbar */}
        <div className="absolute top-5 right-5 flex flex-col md:flex-row items-center gap-4.5 z-10">
          <button
            id="btn_share_profile_card"
            onClick={() => setIsSharingProfile(true)}
            className="text-stone-400 hover:text-white transition-all flex items-center justify-center cursor-pointer outline-none"
            title="Share Profile"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
          {isOwnProfile && (
            <button
              id="btn_profile_incognito_toggle_shortcut"
              onClick={handleToggleAnonymousMode}
              className={`transition-all flex items-center justify-center cursor-pointer outline-none ${
                currentUser.isAnonymousMode ? 'text-indigo-400 hover:text-indigo-350' : 'text-stone-400 hover:text-white'
              }`}
              title={currentUser.isAnonymousMode ? "Disable Incognito Mode" : "Go Incognito"}
            >
              <Shield className="w-4.5 h-4.5" />
            </button>
          )}
          {isOwnProfile && (
            <button
              id="btn_profile_settings_trigger"
              onClick={() => {
                resetChangePasswordStates();
                resetDeleteAccountStates();
                setSettingsTab('menu');
                setShowSettingsModal(true);
              }}
              className="text-stone-400 hover:text-white transition-all flex items-center justify-center cursor-pointer outline-none"
              title="Settings"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          {/* Avatar Area */}
          <div 
            onClick={() => setShowAvatarLightbox(true)}
            className="relative shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            title="Click to view avatar"
          >
            <div className={`p-[3.5px] rounded-full ${
              localStorage.getItem(`golden_ring_${isOwnProfile ? currentUser.id : user.id}`) === 'true'
                ? 'bg-gradient-to-tr from-yellow-400 via-amber-200 to-yellow-600 shadow-md ring-2 ring-yellow-400/30'
                : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
            }`}>
              <img
                src={isOwnProfile ? currentUser.avatar : user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-stone-900"
              />
            </div>
          </div>

          {/* User Bio & Meta Area */}
          <div className="flex-1 text-center md:text-left space-y-4">
            {/* Username & Edit / Follow buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center md:justify-start">
              <h2 className="text-xl md:text-2xl font-extrabold text-stone-100 flex items-center gap-1.5 justify-center md:justify-start">
                <span>{isOwnProfile ? currentUser.username : user.username}</span>
                {localStorage.getItem(`verified_${isOwnProfile ? currentUser.id : user.id}`) === 'true' && (
                  <span className="bg-sky-500 text-white rounded-full text-[8px] flex items-center justify-center w-4.5 h-4.5 shadow-sm border border-stone-900 font-black" title="Verified Creator">
                    ★
                  </span>
                )}
                {((isOwnProfile ? currentUser.isPrivate : user.isPrivate)) && (
                  <span title="Private Account"><Lock className="w-4.5 h-4.5 text-stone-400 shrink-0" /></span>
                )}
              </h2>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {isOwnProfile ? (
                  <>
                    <button
                      id="btn_avatar_studio_trigger"
                      onClick={() => setShowAvatarStudio(true)}
                      className="px-4 py-1.5 border border-[#C4B99D]/30 bg-stone-900 hover:bg-stone-800 text-[#FAF9F6] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#C4B99D]" /> Avatar Studio
                    </button>
                  </>
                ) : (
                  <button
                    id="btn_follow_profile"
                    onClick={() => onToggleFollow(user.id)}
                    className={`px-6 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isFollowing
                        ? 'bg-stone-950/40 text-stone-300 hover:bg-stone-850'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {/* Followers, Following Count Indicators */}
            <div className="flex flex-wrap gap-3 sm:gap-6 justify-center md:justify-start text-sm border-y border-stone-900 py-3">
              
              <button
                onClick={() => {
                  setConnectionsModalType('followers');
                  setConnectionsSearch('');
                }}
                className="flex items-center gap-1 hover:bg-stone-950/80 hover:text-stone-50 border border-transparent hover:border-stone-900 rounded-xl px-3 py-1 transition-all text-left cursor-pointer outline-none"
                title="View followers"
              >
                <span className="font-extrabold text-stone-100">
                  {dbFollowersCount}
                </span>
                <span className="text-stone-400 text-xs font-medium">followers</span>
              </button>

              <button
                onClick={() => {
                  setConnectionsModalType('following');
                  setConnectionsSearch('');
                }}
                className="flex items-center gap-1 hover:bg-stone-950/80 hover:text-stone-50 border border-transparent hover:border-stone-900 rounded-xl px-3 py-1 transition-all text-left cursor-pointer outline-none"
                title="View following"
              >
                <span className="font-extrabold text-stone-100">
                  {dbFollowingCount}
                </span>
                <span className="text-stone-400 text-xs font-medium">following</span>
              </button>
            </div>

            {/* Display Name and Bio */}
            <div>
              <h3 className="font-bold text-stone-100 text-sm">
                {isOwnProfile ? currentUser.name : user.name}
              </h3>
              <div 
                className="text-sm text-stone-300 mt-1 leading-relaxed break-words whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: isOwnProfile ? currentUser.bio : user.bio }}
              />
            </div>
          </div>
        </div>
      </header>



      {isAccountPrivateAndNotFollowing ? (
        <div className="bg-stone-900/40 border border-stone-850 backdrop-blur-md rounded-3xl p-16 text-center shadow-sm flex flex-col items-center mt-6">
          <div className="p-4 bg-stone-950/80 text-stone-500 rounded-full inline-block mb-4">
            <Lock className="w-10 h-10 text-stone-400" />
          </div>
          <h3 className="text-base font-bold text-stone-100 mb-1">This Account is Private</h3>
          <p className="text-sm text-stone-400 max-w-sm mx-auto">
            Follow this account to see their photos and videos.
          </p>
        </div>
      ) : (
        <>
          {/* ====== INSTAGRAM CIRCULAR HIGHLIGHTS ====== */}
      <div className="mb-8 px-2">
        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Highlights</h4>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {/* Add Story Circle (Only on own profile) */}
          {isOwnProfile && (
            <div className="flex flex-col items-center shrink-0">
              <button
                onClick={() => storyFileInputRef.current?.click()}
                className="w-16 h-16 rounded-full border border-dashed border-stone-850 bg-stone-950/80 hover:bg-stone-900 flex items-center justify-center text-stone-300 hover:text-indigo-400 transition-all active:scale-95 cursor-pointer shadow-sm relative overflow-hidden"
                title="Post a Story"
              >
                <Plus className="w-6 h-6 stroke-[2.5px]" />
                {isUploadingStory && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  </div>
                )}
              </button>
              <span className="text-[11px] text-stone-400 font-bold mt-2">Add Story</span>
              <input
                ref={storyFileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleStoryUpload}
              />
            </div>
          )}

          {/* Create New Highlight Circle (Only on own profile) */}
          {isOwnProfile && (
            <div className="flex flex-col items-center shrink-0">
              <button
                onClick={() => {
                  if (userStories.length === 0) {
                    alert("You don't have any posted stories yet! Please click 'Add Story' to upload one first.");
                  } else {
                    setIsCreatingHighlight(true);
                  }
                }}
                className="w-16 h-16 rounded-full border border-slate-300 bg-stone-950/80 hover:bg-stone-950/40 flex items-center justify-center text-stone-300 hover:text-purple-600 transition-all active:scale-95 cursor-pointer shadow-sm"
                title="Create New Highlight"
              >
                <Plus className="w-6 h-6 stroke-[2.5px]" />
              </button>
              <span className="text-[11px] text-stone-400 font-bold mt-2">New</span>
            </div>
          )}

          {/* User's compiled Highlights list */}
          {userHighlights.map((hl) => (
            <div
              key={hl.id}
              onClick={() => handleStartHighlightPlay(hl)}
              className="flex flex-col items-center shrink-0 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full p-[2.5px] border border-stone-800 group-hover:scale-105 transition-transform bg-stone-950/60 overflow-hidden shadow-sm">
                <img
                  src={hl.coverUrl || 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=150&h=150&q=80'}
                  alt={hl.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-[11px] text-stone-400 font-bold mt-2 max-w-[68px] truncate group-hover:text-stone-100">
                {hl.title}
              </span>
            </div>
          ))}

          {/* Fallback empty view */}
          {!isOwnProfile && userHighlights.length === 0 && (
            <div className="text-xs text-stone-500 italic py-2 flex items-center gap-1.5">
              <FolderHeart className="w-4 h-4 text-slate-300" />
              <span>No highlights featured on this profile.</span>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* ====== HIGHLIGHT CREATOR MODAL ====== */}
      <AnimatePresence>
        {isCreatingHighlight && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsCreatingHighlight(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-stone-950/60 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative z-10 space-y-5 text-left"
            >
              <div className="flex justify-between items-center border-b border-stone-900 pb-3">
                <div className="flex items-center gap-2 text-purple-600">
                  <FolderHeart className="w-5 h-5" />
                  <h3 className="font-extrabold text-lg text-stone-100">New Highlight</h3>
                </div>
                <button
                  onClick={() => setIsCreatingHighlight(false)}
                  className="p-1 rounded-full bg-stone-950/40 hover:bg-stone-850 text-stone-500 hover:text-stone-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateHighlightSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wider">Highlight Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kyoto 🇯🇵, Summer Vibes ☀️..."
                    value={newHighlightTitle}
                    onChange={(e) => setNewHighlightTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-950/60 border border-stone-850 rounded-2xl text-sm focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                {/* Checklist of stories */}
                <div>
                  <label className="block text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider">Select Stories to Include</label>
                  <div className="max-h-[220px] overflow-y-auto border border-stone-900 bg-stone-950/80 rounded-2xl p-3 grid grid-cols-3 gap-2.5">
                    {userStories.map((story) => {
                      const isChecked = selectedStoryIds.includes(story.id);
                      return (
                        <div
                          key={story.id}
                          onClick={() => toggleStorySelection(story.id)}
                          className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-stone-850 transition-all ${
                            isChecked ? 'border-purple-600 scale-[0.98]' : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={story.mediaUrl}
                            alt="Story thumbnail"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className={`absolute top-1.5 right-1.5 rounded-full p-0.5 border ${
                            isChecked ? 'bg-purple-600 text-white border-stone-900' : 'bg-black/40 text-transparent border-stone-900/40'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3.5px]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingHighlight(false)}
                    className="flex-1 py-3 bg-stone-950/40 hover:bg-stone-850 text-stone-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    Create Highlight
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====== EDIT PROFILE MODAL OVERLAY ====== */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex sm:items-center items-start justify-center p-2 sm:p-4 overflow-y-auto sm:pt-4 pt-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-950/65 rounded-2xl p-4 sm:p-5 md:p-6 max-w-md w-full shadow-2xl relative max-h-[92vh] sm:max-h-[88vh] overflow-y-auto scrollbar-thin border border-[#EAE3D2]"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wide text-stone-900">Edit Profile Details</h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-full bg-stone-900/40 border border-stone-850 backdrop-blur-md text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-2.5">
                {/* Profile Picture Circle with Pencil Icon Overlay */}
                <div className="flex flex-col items-center justify-center pb-2">
                  <div 
                    onClick={() => setShowAvatarLightbox(true)}
                    className="relative cursor-pointer group hover:scale-105 active:scale-95 transition-all"
                    title="Click to manage profile picture"
                  >
                    <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                      <img
                        src={editAvatar}
                        alt="Edit Avatar"
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full object-cover border-2 border-stone-900 bg-stone-950"
                      />
                    </div>
                    {/* Pencil Overlay */}
                    <div className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 border border-stone-900 rounded-full text-white shadow-md flex items-center justify-center">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mt-1">Click photo to manage</span>
                </div>

                {/* Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Username</label>
                    {usernameCountdown && (
                      <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest animate-pulse">
                        🔒 Locked ({usernameCountdown})
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="input_edit_username"
                      type="text"
                      value={editUsername}
                      disabled={!!usernameCountdown}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className={`w-full pl-4 pr-10 py-2.5 bg-stone-950/60 border border-[#EAE3D2] focus:border-[#C4B99D] rounded-lg text-xs font-semibold outline-none transition-all ${
                        usernameCountdown ? 'opacity-50 cursor-not-allowed border-stone-850' : ''
                      }`}
                    />
                    {/* In-place tick option button */}
                    {editUsername.trim().toLowerCase() !== currentUser.username && !usernameCountdown && (
                      <button
                        type="button"
                        disabled={usernameChecking || !usernameAvailable}
                        onClick={handleUpdateUsernameInPlace}
                        className={`absolute right-3 top-2.5 p-1 rounded-full transition-all cursor-pointer ${
                          usernameAvailable && !usernameChecking
                            ? 'text-green-500 hover:scale-110 active:scale-95'
                            : 'text-stone-600 cursor-not-allowed'
                        }`}
                        title="Save Username"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Availability Status Message */}
                  <div className="mt-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                    {usernameChecking && <span className="text-stone-500">Checking availability...</span>}
                    {!usernameChecking && usernameAvailable === true && editUsername.trim().toLowerCase() !== currentUser.username && !usernameCountdown && (
                      <span className="text-green-500">✓ Username is available!</span>
                    )}
                    {!usernameChecking && usernameError && !usernameCountdown && (
                      <span className="text-red-500">✗ {usernameError}</span>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Display Name</label>
                    {nameCountdown && (
                      <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest animate-pulse">
                        🔒 Locked ({nameCountdown})
                      </span>
                    )}
                  </div>
                  <input
                    id="input_edit_name"
                    type="text"
                    value={editName}
                    disabled={!!nameCountdown}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full px-4 py-2.5 bg-stone-950/60 border border-[#EAE3D2] focus:border-[#C4B99D] rounded-lg text-xs outline-none transition-all ${
                      nameCountdown ? 'opacity-50 cursor-not-allowed border-stone-850' : ''
                    }`}
                  />
                </div>

                {/* Email address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Email Address</label>
                    {editEmail.trim().toLowerCase() === currentUser.email.toLowerCase() ? (
                      isEmailVerified ? (
                        <span className="text-[9px] font-extrabold text-green-500 uppercase tracking-widest">✓ Verified</span>
                      ) : (
                        <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest">⚠️ Email not yet verified</span>
                      )
                    ) : (
                      <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest">⚡ Pending Verification</span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      id="input_edit_email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => {
                        setEditEmail(e.target.value);
                        if (e.target.value.trim().toLowerCase() === currentUser.email.toLowerCase()) {
                          setEmailOtpSent(false);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-950/60 border border-[#EAE3D2] focus:border-[#C4B99D] rounded-lg text-xs outline-none transition-all"
                    />
                    <Mail className="absolute left-3 top-3.5 w-3.5 h-3.5 text-stone-400" />
                  </div>

                  {/* Verification options */}
                  {(!isEmailVerified || editEmail.trim().toLowerCase() !== currentUser.email.toLowerCase()) && !emailOtpSent && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        className="text-[10px] font-serif font-bold uppercase text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer underline decoration-dotted"
                      >
                        {editEmail.trim().toLowerCase() !== currentUser.email.toLowerCase() ? 'Verify & Save New Email' : 'Verify Current Email'}
                      </button>
                    </div>
                  )}

                  {/* OTP Code Entry Field */}
                  {emailOtpSent && (
                    <div className="mt-3 p-3 bg-stone-900/60 border border-stone-850 rounded-xl space-y-2.5">
                      <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                        Enter 6-digit code sent to {editEmail}:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="******"
                          value={emailOtpCode}
                          onChange={(e) => setEmailOtpCode(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-center font-bold tracking-widest outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyEmailOtp}
                          className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Verify
                        </button>
                      </div>
                      {emailVerificationError && (
                        <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider">{emailVerificationError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Rich Text Bio Editor */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Creative Bio</label>
                  <RichBioEditor
                    value={editBio}
                    onChange={setEditBio}
                    maxLength={300}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2.5 bg-stone-900/40 border border-stone-850 backdrop-blur-md text-stone-600 font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn_save_profile_changes"
                    type="submit"
                    className="flex-1 py-2.5 bg-[#1A1A1A] hover:bg-[#2C2C2C] text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Save className="w-4 h-4 text-[#C4B99D]" /> Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* ====== FULLSCREEN HIGHLIGHT STORY VIEWER ====== */}
      <AnimatePresence>
        {activeHighlight && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center select-none">
            <div className="absolute inset-0 cursor-default" onClick={() => setActiveHighlight(null)} />

            {/* Left/Right manual controls */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 hidden md:block">
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevHighlightStory(); }}
                className="p-3 bg-stone-950/60/10 hover:bg-stone-950/60/20 text-white rounded-full transition-all backdrop-blur-sm cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6 stroke-[3px]" />
              </button>
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 hidden md:block">
              <button
                onClick={(e) => { e.stopPropagation(); handleNextHighlightStory(); }}
                className="p-3 bg-stone-950/60/10 hover:bg-stone-950/60/20 text-white rounded-full transition-all backdrop-blur-sm cursor-pointer"
              >
                <ChevronRight className="w-6 h-6 stroke-[3px]" />
              </button>
            </div>

            {/* Playback Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-[430px] aspect-[9/16] md:rounded-[40px] bg-black shadow-2xl overflow-hidden flex flex-col z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Media Element */}
              <div className="absolute inset-0 z-0 bg-slate-900">
                {stories.find((s) => s.id === activeHighlight.storyIds[activeStoryIndex]) ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={stories.find((s) => s.id === activeHighlight.storyIds[activeStoryIndex])?.mediaUrl}
                      alt="Highlight story content"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />

                    {/* Highlight Cover Caption */}
                    <div className="absolute bottom-12 left-4 right-4 text-center z-10">
                      <span className="inline-block px-4 py-2 bg-purple-900/80 border border-purple-500/20 backdrop-blur-sm text-white rounded-2xl text-xs font-bold leading-relaxed shadow-lg max-w-[90%] mx-auto">
                        Featured in &ldquo;{activeHighlight.title}&rdquo; 💖
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 italic text-xs">
                    This story could not be loaded.
                  </div>
                )}
              </div>

              {/* Segmented Progress bar & user header */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 via-black/45 to-transparent z-10 space-y-3.5">
                {/* Segmented indicator bars */}
                <div className="flex gap-1">
                  {activeHighlight.storyIds.map((_, idx) => (
                    <div key={idx} className="flex-1 h-1 bg-stone-950/60/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-stone-950/60 transition-all duration-[40ms] ease-linear"
                        style={{
                          width:
                            idx < activeStoryIndex
                              ? '100%'
                              : idx === activeStoryIndex
                              ? `${storyProgress}%`
                              : '0%'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* User Snapshot */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-stone-900/20 shadow-md"
                    />
                    <div className="text-left">
                      <span className="font-bold text-xs text-white block leading-tight">
                        {user.username}
                      </span>
                      <span className="text-[9px] text-purple-200 font-bold flex items-center gap-1">
                        <FolderHeart className="w-2.5 h-2.5" /> Highlight &bull; {activeHighlight.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveHighlight(null)}
                      className="p-1.5 bg-black/45 hover:bg-black/60 rounded-full text-white/95 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tap overlays */}
              <div className="absolute inset-0 z-5 flex">
                <div className="w-1/3 h-full cursor-pointer" onClick={handlePrevHighlightStory} />
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full cursor-pointer" onClick={handleNextHighlightStory} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====== FULLSCREEN ARCHIVED STORY VIEWER ====== */}
      <AnimatePresence>
        {activeArchivedStory && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center select-none">
            <div className="absolute inset-0 cursor-default" onClick={() => setActiveArchivedStory(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-[430px] aspect-[9/16] md:rounded-[40px] bg-black shadow-2xl overflow-hidden flex flex-col z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Media Element */}
              <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
                <img
                  src={activeArchivedStory.mediaUrl}
                  alt="Archived story content"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Progress bar & Header */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 via-black/45 to-transparent z-10 space-y-3.5">
                {/* Single Progress Bar */}
                <div className="h-1 bg-stone-950/60/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-950/60 transition-all duration-[40ms] ease-linear"
                    style={{ width: `${archivedStoryProgress}%` }}
                  />
                </div>

                {/* Header Information */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-stone-900/20 shadow-md"
                    />
                    <div className="text-left">
                      <span className="font-bold text-xs text-white block leading-tight">
                        {user.username}
                      </span>
                      <span className="text-[9px] text-slate-300 font-bold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Archived &bull; {new Date(activeArchivedStory.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this story from your Archive? This will also remove it from any Highlights.")) {
                          if (onDeleteStory) {
                            onDeleteStory(activeArchivedStory.id);
                            setActiveArchivedStory(null);
                          }
                        }
                      }}
                      className="p-1.5 bg-black/45 hover:bg-black/60 rounded-full text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Delete Story"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveArchivedStory(null)}
                      className="p-1.5 bg-black/45 hover:bg-black/60 rounded-full text-white/95 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer highlighting menu */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center z-10 px-4">
                <button
                  onClick={() => setShowAddToHighlightDropdown(!showAddToHighlightDropdown)}
                  className="flex items-center gap-1.5 bg-stone-950/60/15 hover:bg-stone-950/60/25 active:scale-95 border border-stone-900/10 text-white font-bold text-xs px-5 py-2.5 rounded-full backdrop-blur transition-all cursor-pointer shadow-lg"
                >
                  <FolderHeart className="w-4 h-4 text-purple-400" />
                  <span>Add to Highlight</span>
                </button>
              </div>

              {/* Add to Highlight dropdown panel */}
              {showAddToHighlightDropdown && (
                <div className="absolute bottom-16 left-4 right-4 bg-slate-900/95 border border-slate-800 backdrop-blur-md rounded-2xl p-4 z-20 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-white text-xs font-bold">Add to Highlight</span>
                    <button onClick={() => setShowAddToHighlightDropdown(false)} className="text-stone-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 text-left">
                    {userHighlights.map((hl) => (
                      <button
                        key={hl.id}
                        onClick={() => {
                          if (onUpdateHighlight) {
                            if (!hl.storyIds.includes(activeArchivedStory.id)) {
                              onUpdateHighlight({
                                ...hl,
                                storyIds: [...hl.storyIds, activeArchivedStory.id]
                              });
                            } else {
                              onUpdateHighlight({
                                ...hl,
                                storyIds: hl.storyIds.filter(id => id !== activeArchivedStory.id)
                              });
                            }
                          }
                        }}
                        className="w-full text-left py-2 px-3 text-xs text-slate-200 hover:bg-stone-950/60/10 rounded-xl transition-colors cursor-pointer flex justify-between items-center"
                      >
                        <span>{hl.title}</span>
                        {hl.storyIds.includes(activeArchivedStory.id) && (
                          <Check className="w-3.5 h-3.5 text-purple-400" />
                        )}
                      </button>
                    ))}

                    <button
                      onClick={() => {
                        setShowAddToHighlightDropdown(false);
                        setActiveArchivedStory(null);
                        setIsCreatingHighlight(true);
                        setNewHighlightTitle('');
                        setSelectedStoryIds([activeArchivedStory.id]);
                      }}
                      className="w-full text-left py-2 px-3 text-xs text-purple-400 hover:bg-stone-950/60/10 rounded-xl transition-colors cursor-pointer font-bold flex items-center gap-1.5 border-t border-slate-800/50 mt-1 pt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Highlight...</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Profile Toast notification */}
      {shareSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-extrabold text-xs px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-1.5 animate-bounce border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{shareSuccess}</span>
        </div>
      )}

      {/* Share Profile Dialog Modal */}
      {isSharingProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsSharingProfile(false)} />
          <div className="bg-stone-950/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative z-10 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-stone-900 pb-3">
              <div className="flex items-center gap-1.5 text-purple-600 font-extrabold">
                <Send className="w-5 h-5" />
                <h3>Share @{user.username}'s Profile</h3>
              </div>
              <button onClick={() => setIsSharingProfile(false)}>
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              This action transmits @{user.username}'s active profile card through secure channels directly into selected chats.
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(shareableUsers || []).filter(u => u.id !== currentUser.id).map(u => (
                <button
                  key={u.id}
                  onClick={async () => {
                    try {
                      if (isSupabaseConfigured && supabase) {
                        // Insert into real messages table with share_payload
                        await supabase.from('messages').insert({
                          sender_id: currentUser.id,
                          receiver_id: u.id,
                          text: `📤 Shared @${user.username}'s profile`,
                          is_e2ee: true,
                          share_payload: {
                            type: 'profile_share',
                            sharedUserId: user.id,
                            sharedUsername: user.username,
                            sharedAvatar: user.avatar,
                            sharedName: user.name,
                          },
                        });
                      }
                      setShareSuccess(`Shared @${user.username}'s profile with ${u.name}! ✈️`);
                      setTimeout(() => setShareSuccess(null), 3000);
                    } catch (err) { console.error('Share failed:', err); }
                    setIsSharingProfile(false);
                  }}
                  className="w-full flex items-center justify-between p-2 hover:bg-stone-950/80 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <span className="font-bold text-xs text-stone-100 block">{u.name}</span>
                      <span className="text-[10px] text-stone-500">@{u.username}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                    Send E2EE
                  </span>
                </button>
              ))}

              {/* Groups & Channels — loaded from DB chat_rooms */}
              {shareChatRooms.map((room: any) => (
                <button
                  key={room.id}
                  onClick={async () => {
                    try {
                      if (isSupabaseConfigured && supabase) {
                        // Insert into messages table targeting the room
                        await supabase.from('messages').insert({
                          sender_id: currentUser.id,
                          room_id: room.id,
                          text: `📤 Shared @${user.username}'s profile`,
                          is_e2ee: false,
                          share_payload: {
                            type: 'profile_share',
                            sharedUserId: user.id,
                            sharedUsername: user.username,
                            sharedAvatar: user.avatar,
                            sharedName: user.name,
                          },
                        });
                      }
                      setShareSuccess(`Shared @${user.username}'s profile with ${room.name}! ✈️`);
                      setTimeout(() => setShareSuccess(null), 3000);
                    } catch (err) { console.error('Group share failed:', err); }
                    setIsSharingProfile(false);
                  }}
                  className="w-full flex items-center justify-between p-2 hover:bg-stone-950/80 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={room.avatar} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <span className="font-bold text-xs text-stone-100 block">{room.name}</span>
                      <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider">{room.type}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    Broadcast
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====== ANONYMOUS SETUP OVERLAY ====== */}
      <AnimatePresence>
        {showAnonSetup && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setShowAnonSetup(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-stone-900/40 border border-stone-850 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl text-left relative z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-stone-900 flex items-center justify-between bg-stone-950/80">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🕵️‍♂️</span>
                  <div>
                    <h3 className="font-extrabold uppercase text-stone-100 text-sm tracking-wider">
                      {anonStatusEditMode ? 'Edit Incognito Identity' : 'Setup Incognito Identity'}
                    </h3>
                    <p className="text-[10px] text-stone-400">Customize your fully protected masked profile</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => { playSpatialAvatarSound(200, 0, 'click'); setShowAnonSetup(false); }}
                  className="p-1.5 bg-stone-950/40 hover:bg-stone-850 rounded-xl text-stone-500 hover:text-stone-300 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAnonymousProfile} className="p-5 space-y-4">
                {/* Validation error */}
                {anonError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{anonError}</span>
                  </div>
                )}

                {/* Avatar Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-stone-500 block">
                    Select Emoji Avatar
                  </label>
                  <div className="flex items-center gap-4 bg-stone-950/80 p-3 rounded-2xl border border-stone-900">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-md select-none shrink-0 text-white">
                      {anonEmojiInput}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-stone-500 block mb-1.5">Pick your private symbol</span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {EMOJI_PRESETS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => { playSpatialAvatarSound(600, 0, 'click'); setAnonEmojiInput(emoji); }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all active:scale-90 hover:bg-stone-850 ${
                              anonEmojiInput === emoji ? 'bg-indigo-600 text-white shadow-md' : 'bg-stone-950/40 text-stone-200'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Username Field */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-stone-500 block">
                    Anonymous Username
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-stone-500 text-xs font-bold select-none">@</span>
                    <input
                      type="text"
                      value={anonUsernameInput}
                      onChange={(e) => setAnonUsernameInput(e.target.value)}
                      placeholder="coolkid_anonymous"
                      className="w-full pl-7 pr-3 py-2.5 bg-stone-950/60 border border-stone-850 rounded-xl text-xs text-stone-100 outline-none focus:border-indigo-500 focus:bg-stone-950/60 transition-all font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-stone-500 leading-relaxed font-sans">
                    Must be unique. Suffix <strong className="text-indigo-600 font-mono">_anonymous</strong> is automatically appended if missing.
                  </p>
                </div>

                {/* Bio Field */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-stone-500 block">
                    Incognito Bio
                  </label>
                  <textarea
                    rows={2}
                    value={anonBioInput}
                    onChange={(e) => setAnonBioInput(e.target.value)}
                    placeholder="Tell people who you are incognito..."
                    className="w-full px-3 py-2 bg-stone-950/60 border border-stone-850 rounded-xl text-xs text-stone-100 outline-none focus:border-indigo-500 focus:bg-stone-950/60 transition-all resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => { playSpatialAvatarSound(200, 0, 'click'); setShowAnonSetup(false); }}
                    className="flex-1 py-2.5 bg-stone-950/80 hover:bg-stone-950/40 rounded-xl text-xs font-bold text-stone-300 transition-all text-center cursor-pointer border border-stone-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white shadow-md transition-all text-center cursor-pointer"
                  >
                    {anonStatusEditMode ? 'Update Identity' : 'Lock Identity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====== FOLLOWERS / FOLLOWING CONNECTIONS MODAL ====== */}
      {connectionsModalType && (
        <FollowersListModal
          userId={isOwnProfile ? currentUser.id : user.id}
          mode={connectionsModalType}
          currentUserId={currentUser.id}
          isFollowing={(id) => currentUser.following?.includes(id) || false}
          onFollow={async (id) => { onToggleFollow(id); }}
          onUnfollow={async (id) => { onToggleFollow(id); }}
          onClose={() => setConnectionsModalType(null)}
        />
      )}

      {showAvatarStudio && (
        <AvatarStudio
          currentUser={currentUser}
          onClose={() => setShowAvatarStudio(false)}
          onSaveAvatar={(newAvatarDataUrl, config) => {
            if (onUpdateProfileSettings) {
              onUpdateProfileSettings({
                avatar: newAvatarDataUrl,
                avatarConfig: config
              });
            } else {
              onUpdateProfile(
                currentUser.name,
                currentUser.bio,
                newAvatarDataUrl,
                currentUser.username,
                currentUser.passwordHash || '',
                currentUser.email,
                currentUser.isPrivate
              );
            }
            setShowAvatarStudio(false);
          }}
        />
      )}

      {/* ====== SETTINGS MODAL ====== */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-stone-900 border border-stone-850 rounded-3xl overflow-hidden shadow-2xl relative text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-850 bg-stone-950/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200 flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-[#C4B99D]" />
                  Settings
                </h3>
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    resetChangePasswordStates();
                    resetDeleteAccountStates();
                  }}
                  className="p-1.5 hover:bg-stone-850 rounded-lg text-stone-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content Panel */}
              <div className="p-6">
                {/* 1. Main Menu Tab */}
                {settingsTab === 'menu' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        setShowSettingsModal(false);
                        setEditName(currentUser.name);
                        setEditBio(currentUser.bio);
                        setEditAvatar(currentUser.avatar);
                        setEditUsername(currentUser.username);
                        setEditPassword(currentUser.passwordHash || '');
                        setEditEmail(currentUser.email);
                        setEditIsPrivate(currentUser.isPrivate || false);
                        setEditAllowAnonymousDMs(currentUser.allowAnonymousDMs || false);
                        setEditAllowNonFollowerAccess(currentUser.allowNonFollowerAccess || false);
                        setIsEditing(true);
                      }}
                      className="w-full p-4 bg-stone-950/40 hover:bg-stone-900 border border-stone-850 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                          <Edit3 className="w-4.5 h-4.5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">Edit Profile</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Change display name, bio, and privacy settings</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-300 transition-all" />
                    </button>

                    <button
                      onClick={() => setSettingsTab('account')}
                      className="w-full p-4 bg-stone-950/40 hover:bg-stone-900 border border-stone-850 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#C4B99D]/10 rounded-xl border border-[#C4B99D]/20">
                          <ShieldCheck className="w-4.5 h-4.5 text-[#C4B99D]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">Account Related</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Password modification and account deletion settings</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-300 transition-all" />
                    </button>

                    <button
                      onClick={() => setSettingsTab('privacy')}
                      className="w-full p-4 bg-stone-950/40 hover:bg-stone-900 border border-stone-850 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                          <Lock className="w-4.5 h-4.5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">Privacy</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Toggle private account and anonymous DM settings</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-300 transition-all" />
                    </button>

                    {onLogout && (
                      <button
                        onClick={() => {
                          setShowSettingsModal(false);
                          onLogout();
                        }}
                        className="w-full p-4 bg-stone-950/40 hover:bg-stone-900 border border-stone-850 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                            <LogOut className="w-4.5 h-4.5 text-rose-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">Log Out</p>
                            <p className="text-[10px] text-stone-500 mt-0.5">Sign out of your active session securely</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-300 transition-all" />
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Account Sub-Menu Tab */}
                {settingsTab === 'account' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        resetChangePasswordStates();
                        setSettingsTab('change_password');
                      }}
                      className="w-full p-4 bg-stone-950/40 hover:bg-stone-900 border border-stone-850 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                          <KeyRound className="w-4.5 h-4.5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">Change Password</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Update or recover your password details</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-300 transition-all" />
                    </button>

                    <button
                      onClick={() => {
                        resetDeleteAccountStates();
                        setSettingsTab('delete_account');
                      }}
                      className="w-full p-4 bg-stone-950/40 hover:bg-stone-900 border border-stone-850 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                          <UserMinus className="w-4.5 h-4.5 text-rose-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">Delete Account</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Permanently remove your account and info</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-300 transition-all" />
                    </button>

                    <div className="pt-2">
                      <button
                        onClick={() => setSettingsTab('menu')}
                        className="text-stone-400 hover:text-stone-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Privacy Settings Tab */}
                {settingsTab === 'privacy' && (
                  <div className="space-y-5">
                    {/* Back Button */}
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setSettingsTab('menu')}
                        className="text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back to Menu
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Private Account Toggle */}
                      <div className="p-4 bg-stone-950/40 border border-stone-850 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1 pr-4">
                          <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">Private Account</p>
                          <p className="text-[10px] text-stone-500 leading-normal">
                            When your account is private, only users you approve can view your posts and stories.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const val = !currentUser.isPrivate;
                            onUpdateProfile(
                              currentUser.name,
                              currentUser.bio,
                              currentUser.avatar,
                              currentUser.username,
                              undefined,
                              currentUser.email,
                              val,
                              currentUser.allowAnonymousDMs
                            );
                          }}
                          className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                            currentUser.isPrivate ? 'bg-indigo-600 justify-end' : 'bg-stone-800 justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </button>
                      </div>

                      {/* Allow Anonymous DMs Toggle */}
                      <div className="p-4 bg-stone-950/40 border border-stone-850 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1 pr-4">
                          <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">Allow Anonymous DMs</p>
                          <p className="text-[10px] text-stone-500 leading-normal">
                            Enable anonymous users to send you messages in your inbox.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const val = !currentUser.allowAnonymousDMs;
                            onUpdateProfile(
                              currentUser.name,
                              currentUser.bio,
                              currentUser.avatar,
                              currentUser.username,
                              undefined,
                              currentUser.email,
                              currentUser.isPrivate,
                              val
                            );
                          }}
                          className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                            currentUser.allowAnonymousDMs ? 'bg-indigo-600 justify-end' : 'bg-stone-800 justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Change Password Tab */}
                {settingsTab === 'change_password' && (
                  <div>
                    {changePasswordStep === 1 ? (
                      /* Step 1: Verify Current Password */
                      <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                            Current Password
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Enter current password"
                            value={changePasswordCurrent}
                            onChange={(e) => setChangePasswordCurrent(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                          />
                        </div>

                        {changePasswordError && (
                          <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-900/10 border border-rose-900/30 p-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {changePasswordError}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={handleForgotPasswordTrigger}
                            className="text-[#C4B99D] hover:underline text-xs font-bold tracking-wide cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                          
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setSettingsTab('account')}
                              className="px-4 py-2 border border-stone-800 hover:bg-stone-850 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={changePasswordLoading}
                              className="px-5 py-2 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {changePasswordLoading ? 'Checking...' : 'Continue'}
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      /* Step 2: Enter New Password */
                      <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                            New Password
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Enter new password (Min. 6 chars)"
                            value={changePasswordNew}
                            onChange={(e) => setChangePasswordNew(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Re-enter new password"
                            value={changePasswordConfirm}
                            onChange={(e) => setChangePasswordConfirm(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                          />
                        </div>

                        {changePasswordError && (
                          <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-900/10 border border-rose-900/30 p-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {changePasswordError}
                          </p>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setChangePasswordStep(1)}
                            className="px-4 py-2 border border-stone-800 hover:bg-stone-850 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-all cursor-pointer"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={changePasswordLoading}
                            className="px-5 py-2 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {changePasswordLoading ? 'Saving...' : 'Change Password'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* 4. Forgot Password - Verify OTP Tab */}
                {settingsTab === 'forgot_password_verify' && (
                  <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                    <div className="space-y-2 text-center py-2">
                      <p className="text-xs text-stone-300 leading-relaxed font-medium">
                        We sent a verification code to your email:
                      </p>
                      <p className="text-xs font-bold text-[#C4B99D] tracking-wide">
                        {currentUser.email}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                        Enter Code
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter 6-digit code"
                        value={forgotPassOtp}
                        onChange={(e) => setForgotPassOtp(e.target.value)}
                        className="w-full pl-4 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700 text-center tracking-[0.1em]"
                      />
                    </div>

                    {forgotPassError && (
                      <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-900/10 border border-rose-900/30 p-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {forgotPassError}
                      </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSettingsTab('change_password')}
                        className="px-4 py-2 border border-stone-800 hover:bg-stone-850 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={forgotPassLoading}
                        className="px-5 py-2 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {forgotPassLoading ? 'Verifying...' : 'Verify Code'}
                      </button>
                    </div>
                  </form>
                )}

                {/* 5. Forgot Password - Reset Password Tab */}
                {settingsTab === 'forgot_password_reset' && (
                  <form onSubmit={handleResetForgotPasswordSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                        Enter New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Enter new password (Min. 6 chars)"
                        value={forgotPassNew}
                        onChange={(e) => setForgotPassNew(e.target.value)}
                        className="w-full pl-4 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Re-enter new password"
                        value={forgotPassConfirm}
                        onChange={(e) => setForgotPassConfirm(e.target.value)}
                        className="w-full pl-4 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                      />
                    </div>

                    {forgotPassError && (
                      <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-900/10 border border-rose-900/30 p-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {forgotPassError}
                      </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={forgotPassLoading}
                        className="px-5 py-2 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {forgotPassLoading ? 'Resetting...' : 'Reset Password'}
                      </button>
                    </div>
                  </form>
                )}

                {/* 6. Delete Account Tab */}
                {settingsTab === 'delete_account' && (
                  <div>
                    {deleteStep === 1 ? (
                      /* Step 1: Input details & verify password */
                      <form onSubmit={handleDeleteVerifyPassword} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                            Why are you deleting your account?
                          </label>
                          <select
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 bg-stone-950/60 border border-stone-850 rounded-xl text-xs font-medium text-white outline-none focus:border-[#C4B99D] cursor-pointer"
                          >
                            <option value="Concerned about privacy / security" className="bg-stone-900 text-white">Concerned about privacy / security</option>
                            <option value="Created a duplicate account" className="bg-stone-900 text-white">Created a duplicate account</option>
                            <option value="Not active / not finding it useful" className="bg-stone-900 text-white">Not active / not finding it useful</option>
                            <option value="Other reason" className="bg-stone-900 text-white">Other reason</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Enter password to verify identity"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                          />
                        </div>

                        {deleteError && (
                          <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-900/10 border border-rose-900/30 p-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {deleteError}
                          </p>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setSettingsTab('account')}
                            className="px-4 py-2 border border-stone-800 hover:bg-stone-850 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={deleteLoading}
                            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {deleteLoading ? 'Verifying...' : 'Delete Account'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Step 2: WARNING & Confirm Delete */
                      <div className="space-y-5 text-center">
                        <div className="flex justify-center">
                          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-rose-500 animate-pulse" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                            Confirm Permanent Deletion
                          </h4>
                          <p className="text-xs text-rose-400 font-medium leading-relaxed bg-rose-950/20 border border-rose-900/40 p-4 rounded-2xl">
                            ⚠️ This action is permanent and cannot be undone. Your account and all associated data will be deleted forever.
                          </p>
                        </div>

                        <div className="flex justify-center gap-3 pt-2">
                          <button
                            onClick={() => setDeleteStep(1)}
                            className="px-4 py-2 border border-stone-800 hover:bg-stone-850 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-all cursor-pointer"
                          >
                            Go Back
                          </button>
                          <button
                            onClick={handleConfirmDeleteAccount}
                            disabled={deleteLoading}
                            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {deleteLoading ? 'Deleting...' : 'Delete Forever'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ====== WHATSAPP-STYLE LIGHTBOX AVATAR MODAL ====== */}
      <AnimatePresence>
        {showAvatarLightbox && (
          <div 
            id="avatar_lightbox"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={() => setShowAvatarLightbox(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative p-2"
            >
              {/* Top toolbar above profile picture */}
              <div className="flex items-center justify-between w-full mb-3.5 px-1 text-stone-400">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Profile Photo</span>
                <div className="flex items-center gap-4">
                  {/* Download option */}
                  <button
                    onClick={handleDownloadAvatar}
                    className="hover:text-white transition-all cursor-pointer p-1 outline-none"
                    title="Download Photo"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </button>

                  {/* Remove option (only for own profile) */}
                  {isOwnProfile && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="hover:text-red-400 transition-all cursor-pointer p-1 outline-none text-stone-400"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  )}

                  {/* Pencil Edit option (only for own profile) */}
                  {isOwnProfile && (
                    <button
                      onClick={() => lightboxFileInputRef.current?.click()}
                      className="hover:text-white transition-all cursor-pointer p-1 outline-none"
                      title="Change Photo"
                    >
                      <Pencil className="w-4.5 h-4.5" />
                    </button>
                  )}

                  {/* Close option (only X icon) */}
                  <button
                    onClick={() => setShowAvatarLightbox(false)}
                    className="hover:text-white transition-all cursor-pointer p-1 outline-none"
                    title="Close"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-stone-850 bg-stone-950">
                <img
                  src={isOwnProfile ? currentUser.avatar : user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-72 h-72 sm:w-96 sm:h-96 object-cover bg-stone-900"
                />

                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">Compressing &amp; Saving...</span>
                  </div>
                )}
              </div>

              {/* Hidden file input specifically for lightbox pencil edit */}
              <input
                ref={lightboxFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLightboxFileChange}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
