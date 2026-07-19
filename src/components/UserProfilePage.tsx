/**
 * UserProfilePage — Be-Live Production
 * Full Instagram-style public profile at /:username
 * Fetches data from Supabase by username slug.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, UserCheck, MessageCircle, Lock,
  Loader2, BadgeCheck, Users, Clock
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { User } from '../types';
import FollowersListModal from './FollowersListModal';

interface ProfileData {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

interface Post {
  id: string;
  imageUrl: string;
  createdAt: string;
}

interface UserProfilePageProps {
  currentUser: User | null;
  isFollowing: (id: string) => boolean;
  hasPendingRequest: (id: string) => boolean;
  onFollow: (id: string, isPrivate: boolean) => Promise<void>;
  onUnfollow: (id: string) => Promise<void>;
  onOpenDM: (userId: string) => void;
}

const relativeNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

export default function UserProfilePage({
  currentUser, isFollowing, hasPendingRequest, onFollow, onUnfollow, onOpenDM
}: UserProfilePageProps) {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [followersModal, setFollowersModal] = useState<'followers' | 'following' | null>(null);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }

      // Fetch profile
      const { data: p } = await supabase
        .from('profiles')
        .select('id, username, name, avatar, bio, is_private')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (!p) { setNotFound(true); setLoading(false); return; }

      // Fetch follow stats
      const { data: stats } = await supabase
        .from('profile_follow_stats')
        .select('followers_count, following_count')
        .eq('id', p.id)
        .maybeSingle();

      setProfile({
        id: p.id,
        username: p.username,
        name: p.name || '',
        avatar: p.avatar || '',
        bio: p.bio || '',
        isPrivate: p.is_private || false,
        followersCount: stats?.followers_count ?? 0,
        followingCount: stats?.following_count ?? 0,
        postsCount: 0,
      });

      setPosts([]);

      setLoading(false);
    };
    load();
  }, [username]);

  const handleFollowToggle = async () => {
    if (!profile || !currentUser) return;
    setLoadingFollow(true);
    try {
      if (isFollowing(profile.id)) {
        // Unfollow
        await onUnfollow(profile.id);
        setProfile(prev => prev ? { ...prev, followersCount: Math.max(0, prev.followersCount - 1) } : prev);
      } else if (hasPendingRequest(profile.id)) {
        // Cancel pending follow request
        await onUnfollow(profile.id);
      } else {
        // Follow / Request
        await onFollow(profile.id, profile.isPrivate);
        if (!profile.isPrivate) {
          setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : prev);
        }
      }
    } finally {
      setLoadingFollow(false);
    }
  };

  const isSelf = currentUser?.id === profile?.id;
  const following = profile ? isFollowing(profile.id) : false;
  const pending = profile ? hasPendingRequest(profile.id) : false;
  const canSeeContent = !profile?.isPrivate || following || isSelf;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-center px-6">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-xl font-black text-stone-200 mb-2">Page not found</h1>
        <p className="text-stone-500 text-sm mb-6">The link you followed may be broken, or the page may have been removed.</p>
        <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-violet-600 text-white rounded-2xl font-bold text-sm cursor-pointer hover:bg-violet-700 transition-all">
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070605] text-stone-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-950/95 border-b border-stone-900 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-all cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-black text-stone-100 text-base">@{profile.username}</span>
            {profile.isPrivate && <Lock className="w-4 h-4 text-stone-500" />}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Profile header */}
        <div className="flex items-start gap-5 mb-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={profile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.username}`}
              alt={profile.username}
              className="w-20 h-20 rounded-full object-cover border-2 border-stone-800"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.username}`; }}
            />
          </div>

          {/* Stats row */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-lg font-black text-stone-100 leading-tight">{profile.name || profile.username}</h1>
                <p className="text-stone-500 text-sm">@{profile.username}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-5">
              <div className="text-center cursor-pointer" onClick={() => setFollowersModal(null)}>
                <p className="font-black text-stone-100 text-base leading-tight">{relativeNum(profile.postsCount)}</p>
                <p className="text-xs text-stone-500">posts</p>
              </div>
              <div className="text-center cursor-pointer" onClick={() => setFollowersModal('followers')}>
                <p className="font-black text-stone-100 text-base leading-tight">{relativeNum(profile.followersCount)}</p>
                <p className="text-xs text-stone-500">followers</p>
              </div>
              <div className="text-center cursor-pointer" onClick={() => setFollowersModal('following')}>
                <p className="font-black text-stone-100 text-base leading-tight">{relativeNum(profile.followingCount)}</p>
                <p className="text-xs text-stone-500">following</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bio — strip HTML tags so raw markup isn't visible */}
        {profile.bio && (
          <p className="text-sm text-stone-300 leading-relaxed mb-4 whitespace-pre-wrap">
            {profile.bio.replace(/<[^>]+>/g, '')}
          </p>
        )}


        {/* Action buttons */}
        {!isSelf && currentUser && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleFollowToggle}
              disabled={loadingFollow}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${
                following
                  ? 'bg-stone-800 text-stone-200 border border-stone-700 hover:bg-rose-900/20 hover:text-rose-400'
                  : pending
                  ? 'bg-stone-800 text-stone-400 border border-stone-700'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {loadingFollow ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : following ? (
                <><UserCheck className="w-4 h-4" />Following</>
              ) : pending ? (
                <><Clock className="w-4 h-4" />Requested</>
              ) : (
                <><UserPlus className="w-4 h-4" />{profile.isPrivate ? 'Request' : 'Follow'}</>
              )}
            </button>

            <button
              onClick={() => onOpenDM(profile.id)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />Message
            </button>
          </div>
        )}

        {/* Private account guard */}
        {!canSeeContent ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-stone-800 rounded-2xl">
            <Lock className="w-12 h-12 text-stone-700 mb-4" />
            <p className="font-black text-stone-300 text-base">This account is private</p>
            <p className="text-stone-500 text-sm mt-1">Follow to see their stories & highlights</p>
          </div>
        ) : (
          <>
          <div className="border-t border-stone-800 pt-8 pb-12 flex flex-col items-center justify-center text-center">
            <p className="text-stone-500 font-bold text-sm">Stories & Highlights will appear here</p>
          </div>
          </>
        )}
      </div>

      {/* Followers/Following modal */}
      {followersModal && profile && currentUser && (
        <FollowersListModal
          userId={profile.id}
          mode={followersModal}
          currentUserId={currentUser.id}
          isFollowing={isFollowing}
          onFollow={onFollow}
          onUnfollow={onUnfollow}
          onClose={() => setFollowersModal(null)}
        />
      )}
    </div>
  );
}
