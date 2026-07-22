/**
 * FollowersListModal — Be-Live Production
 * Instagram-style bottom sheet showing followers or following list.
 * Queries `relationships` table directly for real data.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, UserCheck, Loader2, Users } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface ListUser {
  id: string;
  username: string;
  name: string;
  avatar: string;
  isPrivate?: boolean;
}

interface FollowersListModalProps {
  userId: string;           // whose followers/following to show
  mode: 'followers' | 'following';
  currentUserId: string;
  isFollowing: (id: string) => boolean;
  onFollow: (id: string, isPrivate: boolean) => Promise<void>;
  onUnfollow: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function FollowersListModal({
  userId, mode, currentUserId, isFollowing, onFollow, onUnfollow, onClose
}: FollowersListModalProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ListUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }
      setLoading(true);
      try {
        if (mode === 'followers') {
          // People who follow `userId`
          const { data } = await supabase
            .from('relationships')
            .select('follower_id')
            .eq('target_id', userId)
            .limit(500);
          if (!data?.length) { setUsers([]); return; }
          const ids = data.map((r: any) => r.follower_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, name, avatar, is_private')
            .in('id', ids)
            .limit(500);
          if (profiles) {
            setUsers(profiles.map((p: any) => ({
              id: p.id,
              username: p.username,
              name: p.name,
              avatar: p.avatar,
              isPrivate: p.is_private,
            })));
          } else {
            setUsers([]);
          }
        } else {
          // People that `userId` follows
          const { data } = await supabase
            .from('relationships')
            .select('target_id')
            .eq('follower_id', userId)
            .limit(500);
          if (!data?.length) { setUsers([]); return; }
          const ids = data.map((r: any) => r.target_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, name, avatar, is_private')
            .in('id', ids)
            .limit(500);
          if (profiles) {
            setUsers(profiles.map((p: any) => ({
              id: p.id,
              username: p.username,
              name: p.name,
              avatar: p.avatar,
              isPrivate: p.is_private,
            })));
          } else {
            setUsers([]);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, mode]);

  const handleToggleFollow = async (user: ListUser) => {
    setLoadingIds(prev => new Set([...prev, user.id]));
    try {
      if (isFollowing(user.id)) await onUnfollow(user.id);
      else await onFollow(user.id, user.isPrivate || false);
    } finally {
      setLoadingIds(prev => { const n = new Set(prev); n.delete(user.id); return n; });
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-stone-950 border border-stone-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        style={{ maxHeight: '80vh', animation: 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <h3 className="text-base font-black text-stone-100 uppercase tracking-wider flex items-center gap-2">
            <span>{mode === 'followers' ? 'B-Liever' : 'B-Lieving'}</span>
            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black rounded-full">
              {users.length}
            </span>
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-stone-500 hover:text-stone-200 hover:bg-stone-900 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-stone-900 shrink-0">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-stone-800 mb-3" />
              <p className="text-stone-500 font-bold text-sm">
                {search ? 'No results' : mode === 'followers' ? 'No B-Lievers yet' : 'Not believing anyone'}
              </p>
            </div>
          )}

          {!loading && filtered.map(user => {
            const isSelf = user.id === currentUserId;
            const following = isFollowing(user.id);
            const isLoading = loadingIds.has(user.id);
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-stone-900/40 transition-all cursor-pointer"
                onClick={() => {
                  onClose();
                  navigate('/' + user.username);
                }}
              >
                {/* Avatar */}
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
                  alt={user.username}
                  className="w-11 h-11 rounded-full object-cover border border-stone-800 shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`; }}
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-100 text-sm truncate">{user.name || user.username}</p>
                  <p className="text-xs text-stone-500 truncate">@{user.username}</p>
                </div>
                {/* Follow button */}
                {!isSelf && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleFollow(user); }}
                    disabled={isLoading}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shrink-0 ${
                      following
                        ? 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-rose-900/30 hover:text-rose-400 hover:border-rose-800'
                        : 'bg-violet-600 hover:bg-violet-700 text-white'
                    }`}
                  >
                    {isLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : following
                        ? <><UserCheck className="w-3 h-3" />B-Lieving</>
                        : <><UserPlus className="w-3 h-3" />B-Lieve</>
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
