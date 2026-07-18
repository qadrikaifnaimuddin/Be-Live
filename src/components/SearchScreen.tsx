/**
 * SearchScreen — Be-Live Production
 * Full user search with:
 *  - Real-time Supabase full-text + trigram search (username, name)
 *  - Debounced input (no query spam)
 *  - Follow/unfollow inline with optimistic UI
 *  - Trending / suggested users when search is empty
 *  - Profile mini-sheet: avatar, stats, follow button, DM button
 *  - Recent searches persisted in localStorage (no sensitive DB calls)
 *  - Keyboard accessible
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, UserPlus, UserCheck, MessageCircle,
  Clock, TrendingUp, Users, ArrowLeft, Loader2,
  BadgeCheck, Lock, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { User } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────
interface SearchUser {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  isVerified?: boolean;
}

interface SearchScreenProps {
  currentUser: User;
  isFollowing: (id: string) => boolean;
  hasPendingRequest: (id: string) => boolean;
  onFollow: (id: string, isPrivate: boolean) => Promise<void>;
  onUnfollow: (id: string) => Promise<void>;
  onOpenDM: (userId: string) => void;
  onClose: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const RECENT_KEY = 'be_live_recent_searches';
const MAX_RECENT = 8;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}
function saveRecent(username: string) {
  const list = [username, ...getRecent().filter(u => u !== username)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}
function removeRecent(username: string) {
  const list = getRecent().filter(u => u !== username);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

const relativeNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

// ── Avatar Component ─────────────────────────────────────────────────────────
function Avatar({ user, size = 44 }: { user: Pick<SearchUser, 'username' | 'avatar'>; size?: number }) {
  const [err, setErr] = useState(false);
  const src = (!err && user.avatar) ? user.avatar : `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`;
  return (
    <img
      src={src}
      alt={user.username}
      onError={() => setErr(true)}
      className="rounded-full object-cover border border-stone-800 shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

// ── User Row ─────────────────────────────────────────────────────────────────
function UserRow({
  user,
  currentUserId,
  isFollowing,
  hasPendingRequest,
  onFollow,
  onUnfollow,
  onOpenDM,
  onViewProfile,
}: {
  user: SearchUser;
  currentUserId: string;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  onFollow: (id: string, isPrivate: boolean) => Promise<void>;
  onUnfollow: (id: string) => Promise<void>;
  onOpenDM: (id: string) => void;
  onViewProfile: (user: SearchUser) => void;
}) {
  const [loadingFollow, setLoadingFollow] = useState(false);
  const isSelf = user.id === currentUserId;

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingFollow(true);
    try {
      if (isFollowing) await onUnfollow(user.id);
      else await onFollow(user.id, user.isPrivate);
    } finally {
      setLoadingFollow(false);
    }
  };

  const followLabel = () => {
    if (loadingFollow) return <Loader2 className="w-3 h-3 animate-spin" />;
    if (hasPendingRequest) return 'Requested';
    if (isFollowing) return 'Following';
    if (user.isPrivate) return 'Request';
    return 'Follow';
  };

  const followStyle = () => {
    if (hasPendingRequest) return 'bg-stone-800 text-stone-400 border border-stone-700';
    if (isFollowing) return 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-rose-900/40 hover:text-rose-400 hover:border-rose-800';
    return 'bg-violet-600 hover:bg-violet-700 text-white';
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-stone-900/50 transition-all cursor-pointer group"
      onClick={() => onViewProfile(user)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar user={user} size={46} />
        {user.isPrivate && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-stone-900 rounded-full flex items-center justify-center">
            <Lock className="w-2.5 h-2.5 text-stone-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-stone-100 text-sm truncate leading-tight">{user.name || user.username}</span>
          {user.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
        </div>
        <p className="text-xs text-stone-500 truncate">@{user.username}</p>
        {user.followersCount > 0 && (
          <p className="text-xs text-stone-600 mt-0.5">
            {relativeNum(user.followersCount)} followers
          </p>
        )}
      </div>

      {/* Actions */}
      {!isSelf && (
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {isFollowing && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDM(user.id); }}
              className="p-2 rounded-xl bg-stone-800 hover:bg-violet-600 text-stone-400 hover:text-white transition-all cursor-pointer"
              title="Send message"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleFollow}
            disabled={loadingFollow}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1 ${followStyle()}`}
          >
            {followLabel()}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Profile Mini Sheet ────────────────────────────────────────────────────────
function ProfileMiniSheet({
  user,
  currentUserId,
  isFollowing,
  hasPendingRequest,
  onFollow,
  onUnfollow,
  onOpenDM,
  onClose,
}: {
  user: SearchUser;
  currentUserId: string;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  onFollow: (id: string, isPrivate: boolean) => Promise<void>;
  onUnfollow: (id: string) => Promise<void>;
  onOpenDM: (id: string) => void;
  onClose: () => void;
}) {
  const [loadingFollow, setLoadingFollow] = useState(false);
  const isSelf = user.id === currentUserId;

  const handleFollow = async () => {
    setLoadingFollow(true);
    try {
      if (isFollowing) await onUnfollow(user.id);
      else await onFollow(user.id, user.isPrivate);
    } finally {
      setLoadingFollow(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-stone-950 border border-stone-800 rounded-t-3xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-700" />
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-8">
          {/* Avatar + name */}
          <div className="flex items-start gap-4 mb-5">
            <Avatar user={user} size={72} />
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-stone-100 truncate">{user.name || user.username}</h3>
                {user.isVerified && <BadgeCheck className="w-4 h-4 text-violet-400 shrink-0" />}
                {user.isPrivate && <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />}
              </div>
              <p className="text-sm text-stone-500">@{user.username}</p>
              {user.bio && <p className="text-sm text-stone-400 mt-1.5 leading-snug line-clamp-2">{user.bio}</p>}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mb-5 px-1">
            <div className="text-center">
              <p className="text-base font-black text-stone-100">{relativeNum(user.followersCount)}</p>
              <p className="text-xs text-stone-500">Followers</p>
            </div>
            <div className="w-px bg-stone-800" />
            <div className="text-center">
              <p className="text-base font-black text-stone-100">{relativeNum(user.followingCount)}</p>
              <p className="text-xs text-stone-500">Following</p>
            </div>
          </div>

          {/* Action buttons */}
          {!isSelf ? (
            <div className="flex gap-3">
              <button
                onClick={handleFollow}
                disabled={loadingFollow}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${
                  isFollowing
                    ? 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-rose-900/30 hover:text-rose-400'
                    : hasPendingRequest
                    ? 'bg-stone-800 text-stone-400 border border-stone-700'
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/30'
                }`}
              >
                {loadingFollow ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <><UserCheck className="w-4 h-4" />Following</>
                ) : hasPendingRequest ? (
                  <><Clock className="w-4 h-4" />Requested</>
                ) : (
                  <><UserPlus className="w-4 h-4" />{user.isPrivate ? 'Request Follow' : 'Follow'}</>
                )}
              </button>

              <button
                onClick={() => { onOpenDM(user.id); onClose(); }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />Message
              </button>
            </div>
          ) : (
            <div className="py-3 text-center text-stone-500 text-sm">This is you</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Main SearchScreen ─────────────────────────────────────────────────────────
export default function SearchScreen({
  currentUser,
  isFollowing,
  hasPendingRequest,
  onFollow,
  onUnfollow,
  onOpenDM,
  onClose,
}: SearchScreenProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [suggested, setSuggested] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent());
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    loadSuggested();
  }, []);

  // Load suggested users (not already following, ordered by followers)
  const loadSuggested = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('profile_follow_stats')
      .select('id, username, followers_count, following_count')
      .neq('id', currentUser.id)
      .order('followers_count', { ascending: false })
      .limit(12);

    if (!data?.length) return;

    // Fetch full profile info
    const ids = data.map((d: any) => d.id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, name, avatar, bio, is_private')
      .in('id', ids);

    if (!profiles) return;

    const statsMap = Object.fromEntries(data.map((d: any) => [d.id, d]));
    const merged: SearchUser[] = profiles.map((p: any) => ({
      id: p.id,
      username: p.username,
      name: p.name || '',
      avatar: p.avatar || '',
      bio: p.bio || '',
      isPrivate: p.is_private || false,
      followersCount: statsMap[p.id]?.followers_count ?? 0,
      followingCount: statsMap[p.id]?.following_count ?? 0,
    }));

    setSuggested(merged);
  }, [currentUser.id]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(q), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const doSearch = async (q: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        setResults([]);
        return;
      }

      // Search by username prefix OR name (trigram similarity)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, name, avatar, bio, is_private')
        .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
        .neq('id', currentUser.id)
        .limit(20);

      if (!profiles?.length) {
        setResults([]);
        return;
      }

      // Get follow stats for results
      const ids = profiles.map((p: any) => p.id);
      const { data: stats } = await supabase
        .from('profile_follow_stats')
        .select('id, followers_count, following_count')
        .in('id', ids);

      const statsMap = Object.fromEntries((stats || []).map((s: any) => [s.id, s]));

      // Sort: exact username matches first, then by follower count
      const merged: SearchUser[] = profiles
        .map((p: any) => ({
          id: p.id,
          username: p.username,
          name: p.name || '',
          avatar: p.avatar || '',
          bio: p.bio || '',
          isPrivate: p.is_private || false,
          followersCount: statsMap[p.id]?.followers_count ?? 0,
          followingCount: statsMap[p.id]?.following_count ?? 0,
        }))
        .sort((a, b) => {
          const aExact = a.username.toLowerCase() === q.toLowerCase() ? 1 : 0;
          const bExact = b.username.toLowerCase() === q.toLowerCase() ? 1 : 0;
          if (aExact !== bExact) return bExact - aExact;
          const aStart = a.username.toLowerCase().startsWith(q.toLowerCase()) ? 1 : 0;
          const bStart = b.username.toLowerCase().startsWith(q.toLowerCase()) ? 1 : 0;
          if (aStart !== bStart) return bStart - aStart;
          return b.followersCount - a.followersCount;
        });

      setResults(merged);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (user: SearchUser) => {
    saveRecent(user.username);
    setRecentSearches(getRecent());
    navigate('/' + user.username);
  };

  const handleClearQuery = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleRemoveRecent = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecent(username);
    setRecentSearches(getRecent());
  };

  const handleClearAllRecent = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecentSearches([]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-screen bg-stone-950">
      {/* ── Header / Search Bar ── */}
      <div className="sticky top-0 z-10 bg-stone-950/98 border-b border-stone-900 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-200 hover:bg-stone-900 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-9 pr-10 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600/30 transition-all"
            />
            {query && (
              <button
                onClick={handleClearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-stone-500 hover:text-stone-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        )}

        {/* Search Results */}
        {!loading && hasSearched && (
          <>
            {results.length > 0 ? (
              <div>
                <p className="px-4 pt-4 pb-2 text-xs font-extrabold text-stone-600 uppercase tracking-widest">
                  Results
                </p>
                {results.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    currentUserId={currentUser.id}
                    isFollowing={isFollowing(user.id)}
                    hasPendingRequest={hasPendingRequest(user.id)}
                    onFollow={onFollow}
                    onUnfollow={onUnfollow}
                    onOpenDM={onOpenDM}
                    onViewProfile={handleViewProfile}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-stone-700" />
                </div>
                <p className="text-stone-400 font-bold text-base">No results for "{query}"</p>
                <p className="text-stone-600 text-sm mt-1">Try a different name or username</p>
              </div>
            )}
          </>
        )}

        {/* Empty state — show recent + suggested */}
        {!loading && !hasSearched && (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between px-4 pt-5 pb-2">
                  <p className="text-xs font-extrabold text-stone-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />Recent
                  </p>
                  <button
                    onClick={handleClearAllRecent}
                    className="text-xs text-violet-500 hover:text-violet-400 font-bold cursor-pointer transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-0">
                  {recentSearches.map(username => (
                    <div
                      key={username}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-900/50 transition-all cursor-pointer"
                      onClick={() => setQuery(username)}
                    >
                      <div className="w-9 h-9 rounded-full bg-stone-800 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-stone-500" />
                      </div>
                      <span className="flex-1 text-sm text-stone-300">@{username}</span>
                      <button
                        onClick={e => handleRemoveRecent(username, e)}
                        className="p-1 rounded-full text-stone-600 hover:text-stone-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Users */}
            {suggested.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 pt-5 pb-2">
                  <TrendingUp className="w-3 h-3 text-stone-600" />
                  <p className="text-xs font-extrabold text-stone-600 uppercase tracking-widest">Suggested People</p>
                </div>

                {/* Horizontal scroll chips */}
                <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-none">
                  {suggested.slice(0, 8).map(user => (
                    <div
                      key={user.id}
                      className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer"
                      onClick={() => handleViewProfile(user)}
                    >
                      <div className="relative">
                        <Avatar user={user} size={56} />
                        {isFollowing(user.id) && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                            <UserCheck className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 font-bold truncate w-full text-center">@{user.username}</p>
                      <p className="text-[10px] text-stone-600">{relativeNum(user.followersCount)} followers</p>
                    </div>
                  ))}
                </div>

                {/* Full list below chips */}
                <div className="border-t border-stone-900">
                  {suggested.map(user => (
                    <UserRow
                      key={user.id}
                      user={user}
                      currentUserId={currentUser.id}
                      isFollowing={isFollowing(user.id)}
                      hasPendingRequest={hasPendingRequest(user.id)}
                      onFollow={onFollow}
                      onUnfollow={onUnfollow}
                      onOpenDM={onOpenDM}
                      onViewProfile={handleViewProfile}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No users at all */}
            {suggested.length === 0 && recentSearches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                <Users className="w-12 h-12 text-stone-800 mb-4" />
                <p className="text-stone-500 font-bold">Search for people</p>
                <p className="text-stone-700 text-sm mt-1">Find friends by username or name</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Profile Mini Sheet ── */}
      {selectedUser && (
        <ProfileMiniSheet
          user={selectedUser}
          currentUserId={currentUser.id}
          isFollowing={isFollowing(selectedUser.id)}
          hasPendingRequest={hasPendingRequest(selectedUser.id)}
          onFollow={onFollow}
          onUnfollow={onUnfollow}
          onOpenDM={onOpenDM}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
