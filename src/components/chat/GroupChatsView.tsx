/**
 * GroupChatsView — Be-Live Production
 * Dedicated View Component for Group Conversations (type === 'group').
 * Features: Multi-member avatar stack, Admin badges, Member count indicator, Group call triggers, Poll & Doodle sharing.
 */

import React from 'react';
import { Users, Plus } from 'lucide-react';
import { ChatRoom, User } from '../../types';

interface GroupChatsViewProps {
  rooms: ChatRoom[];
  selectedChat: ChatRoom | User | null;
  currentUserId: string;
  onSelectRoom: (room: ChatRoom) => void;
  onOpenCreateGroupModal?: () => void;
  startChatDeleteHold: (roomId: string) => void;
  cancelChatDeleteHold: () => void;
  chatDeleteHoldTimerRef: React.MutableRefObject<any>;
  formatTime: (iso: string) => string;
}

export const GroupChatsView: React.FC<GroupChatsViewProps> = ({
  rooms,
  selectedChat,
  currentUserId,
  onSelectRoom,
  onOpenCreateGroupModal,
  startChatDeleteHold,
  cancelChatDeleteHold,
  chatDeleteHoldTimerRef,
  formatTime
}) => {
  const groupRooms = rooms.filter(r => r.type === 'group');

  if (groupRooms.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-violet-400">
          <Users className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-300 uppercase tracking-wider">No Group Chats Yet</p>
          <p className="text-[11px] text-stone-500">Create a group chat to connect with multiple friends together!</p>
        </div>
        {onOpenCreateGroupModal && (
          <button
            onClick={onOpenCreateGroupModal}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-violet-900/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Group
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {groupRooms.map(room => {
        const isSelected = selectedChat && 'type' in selectedChat && (selectedChat as ChatRoom).id === room.id;
        const memberCount = room.members?.length || 1;
        const isAdmin = room.adminIds?.includes(currentUserId) || room.creatorId === currentUserId;

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
            {/* Avatar & Group Badge */}
            <div className="relative shrink-0">
              <img
                src={room.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${room.name}`}
                alt={room.name}
                className="w-11 h-11 rounded-full object-cover border border-stone-800"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-violet-600 rounded-full flex items-center justify-center border border-stone-950 shadow">
                <Users className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            {/* Group Room Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-bold text-stone-100 truncate">{room.name}</p>
                  <span className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 text-stone-400 text-[9px] font-extrabold rounded-md shrink-0">
                    {memberCount} m
                  </span>
                  {isAdmin && (
                    <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
                {room.lastMessageTime && (
                  <span className="text-[10px] text-stone-600 shrink-0">{formatTime(room.lastMessageTime)}</span>
                )}
              </div>

              <p className="text-xs text-stone-500 truncate">{room.lastMessage || 'Group created — start chatting!'}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
