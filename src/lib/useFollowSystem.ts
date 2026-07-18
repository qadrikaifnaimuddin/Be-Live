/**
 * useFollowSystem — Be-Live Production
 * Central hook that powers all follow/unfollow/follow-request logic.
 * All state is sourced from Supabase with Realtime sync.
 * Zero localStorage for relationship data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface FollowStats {
  followersCount: number;
  followingCount: number;
}

export interface FollowRequest {
  id: number;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  requesterAvatar: string;
  createdAt: string;
}

export interface Notification {
  id: number;
  actorId: string;
  actorName: string;
  actorUsername: string;
  actorAvatar: string;
  type: 'follow' | 'follow_request' | 'follow_accept' | 'like' | 'comment' | 'mention';
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export function useFollowSystem(currentUserId: string | null) {
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [pendingRequestSet, setPendingRequestSet] = useState<Set<string>>(new Set());
  const [incomingRequests, setIncomingRequests] = useState<FollowRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [statsCache, setStatsCache] = useState<Record<string, FollowStats>>({});
  const realtimeRef = useRef<any>(null);

  // ── Load who current user follows ──
  const loadFollowing = useCallback(async () => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('relationships')
      .select('target_id')
      .eq('follower_id', currentUserId);
    if (data) setFollowingSet(new Set(data.map((r: any) => r.target_id)));
  }, [currentUserId]);

  // ── Load pending outgoing requests ──
  const loadPendingRequests = useCallback(async () => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('follow_requests')
      .select('target_id')
      .eq('requester_id', currentUserId)
      .eq('status', 'pending');
    if (data) setPendingRequestSet(new Set(data.map((r: any) => r.target_id)));
  }, [currentUserId]);

  // ── Load incoming follow requests (for private accounts) ──
  const loadIncomingRequests = useCallback(async () => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('follow_requests')
      .select('id, requester_id, created_at, profiles!requester_id(name, username, avatar)')
      .eq('target_id', currentUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) {
      setIncomingRequests(data.map((r: any) => ({
        id: r.id,
        requesterId: r.requester_id,
        requesterName: r.profiles?.name || 'Unknown',
        requesterUsername: r.profiles?.username || '',
        requesterAvatar: r.profiles?.avatar || '',
        createdAt: r.created_at,
      })));
    }
  }, [currentUserId]);

  // ── Load notifications ──
  const loadNotifications = useCallback(async () => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    // Fetch notifications without join first (avoids broken FK issues)
    const { data: notifData } = await supabase
      .from('notifications')
      .select('id, actor_id, type, entity_id, is_read, created_at, recipient_id')
      .eq('recipient_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!notifData?.length) { setNotifications([]); setUnreadCount(0); return; }

    // Batch fetch actor profiles
    const actorIds = [...new Set(notifData.map((n: any) => n.actor_id).filter(Boolean))];
    let profileMap: Record<string, any> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .in('id', actorIds);
      if (profiles) profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
    }

    const notifs = notifData.map((n: any) => {
      const actor = profileMap[n.actor_id] || {};
      return {
        id: n.id,
        actorId: n.actor_id,
        actorName: actor.name || 'Someone',
        actorUsername: actor.username || '',
        actorAvatar: actor.avatar || '',
        type: n.type,
        entityId: n.entity_id,
        isRead: n.is_read,
        createdAt: n.created_at,
      };
    });
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.isRead).length);
  }, [currentUserId]);

  // ── Initial load ──
  useEffect(() => {
    loadFollowing();
    loadPendingRequests();
    loadIncomingRequests();
    loadNotifications();
  }, [loadFollowing, loadPendingRequests, loadIncomingRequests, loadNotifications]);

  // ── Realtime subscriptions ──
  useEffect(() => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);

    const channel = supabase
      .channel(`follow-system-${currentUserId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'relationships',
        filter: `follower_id=eq.${currentUserId}`,
      }, () => loadFollowing())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'follow_requests',
        filter: `target_id=eq.${currentUserId}`,
      }, () => loadIncomingRequests())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'follow_requests',
        filter: `requester_id=eq.${currentUserId}`,
      }, () => loadPendingRequests())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `recipient_id=eq.${currentUserId}`,
      }, () => loadNotifications())
      .subscribe();

    realtimeRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, loadFollowing, loadIncomingRequests, loadPendingRequests, loadNotifications]);

  // ── Get follow stats for any user (cached + lazy) ──
  const getFollowStats = useCallback(async (userId: string): Promise<FollowStats> => {
    if (statsCache[userId]) return statsCache[userId];
    if (!isSupabaseConfigured || !supabase) return { followersCount: 0, followingCount: 0 };
    const { data } = await supabase
      .from('profile_follow_stats')
      .select('followers_count, following_count')
      .eq('id', userId)
      .maybeSingle();
    const stats: FollowStats = {
      followersCount: data?.followers_count ?? 0,
      followingCount: data?.following_count ?? 0,
    };
    setStatsCache(prev => ({ ...prev, [userId]: stats }));
    return stats;
  }, [statsCache]);

  // ── Follow or send request ──
  const follow = useCallback(async (targetId: string, targetIsPrivate: boolean) => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;

    if (targetIsPrivate) {
      // Private account → send follow request
      const { error } = await supabase.from('follow_requests').upsert(
        { requester_id: currentUserId, target_id: targetId, status: 'pending' },
        { onConflict: 'requester_id,target_id' }
      );
      if (!error) {
        setPendingRequestSet(prev => new Set([...prev, targetId]));
        // Notify target
        await supabase.from('notifications').insert({
          recipient_id: targetId, actor_id: currentUserId, type: 'follow_request',
        });
      }
    } else {
      // Public account → follow directly
      const { error } = await supabase.from('relationships').upsert(
        { follower_id: currentUserId, target_id: targetId },
        { onConflict: 'follower_id,target_id' }
      );
      if (!error) {
        setFollowingSet(prev => new Set([...prev, targetId]));
        setStatsCache(prev => ({
          ...prev,
          [targetId]: { followersCount: (prev[targetId]?.followersCount ?? 0) + 1, followingCount: prev[targetId]?.followingCount ?? 0 },
        }));
        // Notify target
        await supabase.from('notifications').insert({
          recipient_id: targetId, actor_id: currentUserId, type: 'follow',
        });
      }
    }
  }, [currentUserId]);

  // ── Unfollow ──
  const unfollow = useCallback(async (targetId: string) => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    // Remove relationship
    await supabase.from('relationships').delete()
      .eq('follower_id', currentUserId).eq('target_id', targetId);
    // Also remove any pending request
    await supabase.from('follow_requests').delete()
      .eq('requester_id', currentUserId).eq('target_id', targetId);
    setFollowingSet(prev => { const next = new Set(prev); next.delete(targetId); return next; });
    setPendingRequestSet(prev => { const next = new Set(prev); next.delete(targetId); return next; });
    setStatsCache(prev => ({
      ...prev,
      [targetId]: { followersCount: Math.max(0, (prev[targetId]?.followersCount ?? 1) - 1), followingCount: prev[targetId]?.followingCount ?? 0 },
    }));
  }, [currentUserId]);

  // ── Accept follow request ──
  const acceptRequest = useCallback(async (request: FollowRequest) => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    // Create relationship
    await supabase.from('relationships').upsert(
      { follower_id: request.requesterId, target_id: currentUserId },
      { onConflict: 'follower_id,target_id' }
    );
    // Mark request accepted
    await supabase.from('follow_requests').update({ status: 'accepted' })
      .eq('requester_id', request.requesterId).eq('target_id', currentUserId);
    // Notify requester
    await supabase.from('notifications').insert({
      recipient_id: request.requesterId, actor_id: currentUserId, type: 'follow_accept',
    });
    setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
  }, [currentUserId]);

  // ── Reject follow request ──
  const rejectRequest = useCallback(async (request: FollowRequest) => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    await supabase.from('follow_requests').update({ status: 'rejected' })
      .eq('requester_id', request.requesterId).eq('target_id', currentUserId);
    setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
  }, [currentUserId]);

  // ── Mark notifications read ──
  const markNotificationsRead = useCallback(async () => {
    if (!currentUserId || !isSupabaseConfigured || !supabase) return;
    await supabase.from('notifications').update({ is_read: true })
      .eq('recipient_id', currentUserId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, [currentUserId]);

  // ── Invalidate + re-fetch stats for a specific user (call after follow/unfollow) ──
  const invalidateStats = useCallback(async (userId: string) => {
    setStatsCache(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('profile_follow_stats')
      .select('followers_count, following_count')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setStatsCache(prev => ({
        ...prev,
        [userId]: {
          followersCount: data.followers_count ?? 0,
          followingCount: data.following_count ?? 0,
        },
      }));
    }
  }, []);

  // ── Derived helpers ──
  const isFollowing = useCallback((targetId: string) => followingSet.has(targetId), [followingSet]);
  const hasPendingRequest = useCallback((targetId: string) => pendingRequestSet.has(targetId), [pendingRequestSet]);

  return {
    followingSet,
    isFollowing,
    hasPendingRequest,
    incomingRequests,
    notifications,
    unreadCount,
    statsCache,
    getFollowStats,
    invalidateStats,
    follow: async (targetId: string, targetIsPrivate: boolean) => {
      await follow(targetId, targetIsPrivate);
      if (!targetIsPrivate) invalidateStats(targetId);
    },
    unfollow: async (targetId: string) => {
      await unfollow(targetId);
      invalidateStats(targetId);
    },
    acceptRequest,
    rejectRequest,
    markNotificationsRead,
    refreshAll: () => { loadFollowing(); loadPendingRequests(); loadIncomingRequests(); loadNotifications(); },
  };
}
