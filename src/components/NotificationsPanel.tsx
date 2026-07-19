/**
 * NotificationsPanel — Be-Live Production
 * Shows follow notifications, follow requests, likes, comments.
 * All data from Supabase. Realtime via useFollowSystem hook.
 */

import React, { useEffect } from 'react';
import {
  Bell, UserPlus, Heart, MessageCircle, AtSign,
  Check, X, Users, UserCheck, ChevronRight
} from 'lucide-react';
import { FollowRequest, Notification } from '../lib/useFollowSystem';

interface NotificationsPanelProps {
  notifications: Notification[];
  incomingRequests: FollowRequest[];
  unreadCount: number;
  onAcceptRequest: (req: FollowRequest) => Promise<void>;
  onRejectRequest: (req: FollowRequest) => Promise<void>;
  onMarkRead: () => Promise<void>;
  onViewProfile: (userId: string) => void;
}

const notifIcon = (type: Notification['type']) => {
  const baseClass = "w-[22px] h-[22px] rounded-full border-2 border-stone-950 flex items-center justify-center shadow-md";
  switch (type) {
    case 'follow': return <div className={`${baseClass} bg-violet-600`}><UserPlus className="w-2.5 h-2.5 text-white" /></div>;
    case 'follow_request': return <div className={`${baseClass} bg-amber-600`}><Users className="w-2.5 h-2.5 text-white" /></div>;
    case 'follow_accept': return <div className={`${baseClass} bg-emerald-600`}><UserCheck className="w-2.5 h-2.5 text-white" /></div>;
    case 'like': return <div className={`${baseClass} bg-rose-600`}><Heart className="w-2.5 h-2.5 text-white fill-current" /></div>;
    case 'comment': return <div className={`${baseClass} bg-blue-600`}><MessageCircle className="w-2.5 h-2.5 text-white fill-current" /></div>;
    case 'mention': return <div className={`${baseClass} bg-sky-600`}><AtSign className="w-2.5 h-2.5 text-white" /></div>;
    default: return <div className={`${baseClass} bg-stone-700`}><Bell className="w-2.5 h-2.5 text-white" /></div>;
  }
};

const notifText = (n: Notification) => {
  switch (n.type) {
    case 'follow': return 'started following you';
    case 'follow_request': return 'requested to follow you';
    case 'follow_accept': return 'accepted your follow request';
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'mention': return 'mentioned you in a comment';
    default: return 'sent you a notification';
  }
};

const relativeTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

export default function NotificationsPanel({
  notifications,
  incomingRequests,
  unreadCount,
  onAcceptRequest,
  onRejectRequest,
  onMarkRead,
  onViewProfile,
}: NotificationsPanelProps) {

  // Mark as read when panel opens
  useEffect(() => {
    if (unreadCount > 0) {
      const t = setTimeout(onMarkRead, 1000);
      return () => clearTimeout(t);
    }
  }, [unreadCount, onMarkRead]);

  const hasContent = notifications.length > 0 || incomingRequests.length > 0;

  return (
    <div className="flex flex-col h-full bg-stone-950">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-900">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-stone-400" />
          <h2 className="text-base font-black text-stone-100">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-violet-600 text-white text-xs font-black rounded-full">{unreadCount}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Follow Requests Section */}
        {incomingRequests.length > 0 && (
          <div className="border-b border-stone-900">
            <div className="px-5 py-3">
              <p className="text-xs font-extrabold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" />Follow Requests ({incomingRequests.length})
              </p>
              <div className="space-y-2">
                {incomingRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-3 py-2 px-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                    <img
                      src={req.requesterAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${req.requesterUsername}`}
                      alt={req.requesterName}
                      className="w-10 h-10 rounded-full object-cover border border-stone-700 cursor-pointer shrink-0"
                      onClick={() => onViewProfile(req.requesterId)}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold text-stone-100 truncate cursor-pointer hover:text-violet-400 transition-colors"
                        onClick={() => onViewProfile(req.requesterId)}
                      >
                        {req.requesterName}
                      </p>
                      <p className="text-xs text-stone-500">@{req.requesterUsername} · {relativeTime(req.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => onAcceptRequest(req)}
                        className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl cursor-pointer transition-all"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRejectRequest(req)}
                        className="p-2 bg-stone-800 hover:bg-rose-600 text-stone-400 hover:text-white rounded-xl cursor-pointer transition-all"
                        title="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Notifications */}
        {notifications.length > 0 && (
          <div className="px-5 py-3">
            <p className="text-xs font-extrabold text-stone-500 uppercase tracking-wider mb-2">Recent</p>
            <div className="space-y-1">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-center gap-3 py-3 px-3 rounded-2xl transition-all ${!n.isRead ? 'bg-violet-500/5 border border-violet-500/10' : 'hover:bg-stone-900/40'}`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={n.actorAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${n.actorUsername}`}
                      alt={n.actorName}
                      className="w-10 h-10 rounded-full object-cover border border-stone-700 cursor-pointer"
                      onClick={() => onViewProfile(n.actorId)}
                    />
                    <div className="absolute -bottom-1 -right-1">{notifIcon(n.type)}</div>
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewProfile(n.actorId)}>
                    <p className="text-sm text-stone-200 leading-snug">
                      <span className="font-bold text-stone-100 hover:text-violet-400 transition-colors">{n.actorName}</span>
                      {' '}{notifText(n)}
                    </p>
                    <p className="text-xs text-stone-600 mt-0.5">{relativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasContent && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-8">
            <Bell className="w-12 h-12 text-stone-800 mb-4" />
            <p className="text-stone-500 font-bold">No notifications yet</p>
            <p className="text-stone-700 text-sm mt-1">When people follow you or interact with your content, you'll see it here</p>
          </div>
        )}
      </div>
    </div>
  );
}
