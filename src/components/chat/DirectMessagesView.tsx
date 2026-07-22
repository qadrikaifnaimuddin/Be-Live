/**
 * DirectMessagesView — Be-Live Production
 * Dedicated View Component for 1-to-1 Direct Messages (type === 'direct').
 * Features: Online/offline indicator, Streaks Flame 🔥, Typing status, Disappearing messages, Direct Call actions.
 */

import React from 'react';
import { Flame } from 'lucide-react';
import { ChatRoom, User, Streak } from '../../types';

interface DirectMessagesViewProps {
  rooms: ChatRoom[];
  selectedChat: ChatRoom | User | null;
  currentUserId: string;
  sidebarTypingUsers: Record<string, boolean>;
  isOnlinePlatformWide: (lastSeenIso?: string) => boolean;
  getStreak?: (partnerId: string) => Streak | undefined;
  onSelectRoom: (room: ChatRoom) => void;
  startChatDeleteHold: (roomId: string) => void;
  cancelChatDeleteHold: () => void;
  chatDeleteHoldTimerRef: React.MutableRefObject<any>;
  formatTime: (iso: string) => string;
}

export const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({
  rooms,
  selectedChat,
  currentUserId,
  sidebarTypingUsers,
  isOnlinePlatformWide,
  getStreak,
  onSelectRoom,
  startChatDeleteHold,
  cancelChatDeleteHold,
  chatDeleteHoldTimerRef,
  formatTime
}) => {
  const directRooms = rooms.filter(r => r.type === 'direct');

  if (directRooms.length === 0) {
    return (
      <div className="p-8 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-stone-500">
          💬
        </div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">No Direct Messages Yet</p>
        <p className="text-[11px] text-stone-600">Search for a user above or start a conversation from their profile!</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {directRooms.map(room => {
        const isSelected = selectedChat && 'type' in selectedChat && (selectedChat as ChatRoom).id === room.id;
        const otherMemberId = room.members.find(m => m !== currentUserId);
        const isOnline = otherMemberId ? isOnlinePlatformWide(room.lastSeen) : false;
        const streak = otherMemberId && getStreak ? getStreak(otherMemberId) : undefined;
        const isTyping = otherMemberId ? sidebarTypingUsers[otherMemberId] : false;

        return (
          <button
            key={room.id}
            onClick={() => {
              if (!chatDeleteHoldTimerRef.current) {
                onSelectRoom(room);
              }
            }}
            onMouseDown={() => startChatDeleteHold(room.id)}
            onMouseUp={cancelChatDeleteHold}
            onMouseLeave={cancelChatDeleteHold}
            onTouchStart={() => startChatDeleteHold(room.id)}
            onTouchEnd={cancelChatDeleteHold}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-900/60 transition-all text-left cursor-pointer border-b border-stone-900/40 ${
              isSelected ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : ''
            }`}
          >
            {/* Avatar & Online Dot */}
            <div className="relative shrink-0">
              <img
                src={room.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${room.name}`}
                alt={room.name}
                className="w-11 h-11 rounded-full object-cover border border-stone-800"
              />
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-stone-950 shadow-sm" />
              )}
            </div>

            {/* Room Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-bold text-stone-100 truncate">{room.name}</p>
                  {streak && streak.count > 0 && (
                    <span className="text-[10px] font-black text-orange-400 flex items-center gap-0.5 shrink-0">
                      <Flame className="w-3 h-3 fill-orange-400/20" />
                      {streak.count}
                    </span>
                  )}
                </div>
                {room.lastMessageTime && (
                  <span className="text-[10px] text-stone-600 shrink-0">{formatTime(room.lastMessageTime)}</span>
                )}
              </div>

              {isTyping ? (
                <p className="text-xs text-violet-400 font-medium animate-pulse">typing...</p>
              ) : (
                <p className="text-xs text-stone-500 truncate">{room.lastMessage || 'No messages yet'}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
