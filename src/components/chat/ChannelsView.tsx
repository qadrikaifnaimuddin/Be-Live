/**
 * ChannelsView — Be-Live Production
 * Dedicated View Component for Broadcast Channels (type === 'channel').
 * Features: # Hashtag iconography, Read-only announcement mode for creators, Live Stream alert banners, Subscriber reaction feeds.
 */

import React from 'react';
import { Radio, Hash, Megaphone, Plus } from 'lucide-react';
import { ChatRoom, User } from '../../types';

interface ChannelsViewProps {
  rooms: ChatRoom[];
  selectedChat: ChatRoom | User | null;
  currentUserId: string;
  onSelectRoom: (room: ChatRoom) => void;
  onOpenCreateChannelModal?: () => void;
  startChatDeleteHold: (roomId: string) => void;
  cancelChatDeleteHold: () => void;
  chatDeleteHoldTimerRef: React.MutableRefObject<any>;
  formatTime: (iso: string) => string;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({
  rooms,
  selectedChat,
  currentUserId,
  onSelectRoom,
  onOpenCreateChannelModal,
  startChatDeleteHold,
  cancelChatDeleteHold,
  chatDeleteHoldTimerRef,
  formatTime
}) => {
  const channelRooms = rooms.filter(r => r.type === 'channel');

  if (channelRooms.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-amber-400">
          <Megaphone className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-300 uppercase tracking-wider">No Broadcast Channels Yet</p>
          <p className="text-[11px] text-stone-500">Create a broadcast channel to post updates to your B-Lievers and fans!</p>
        </div>
        {onOpenCreateChannelModal && (
          <button
            onClick={onOpenCreateChannelModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-900/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Channel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {channelRooms.map(room => {
        const isSelected = selectedChat && 'type' in selectedChat && (selectedChat as ChatRoom).id === room.id;
        const isOwner = room.creatorId === currentUserId;

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
              isSelected ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
            }`}
          >
            {/* Channel Icon & # Badge */}
            <div className="relative shrink-0">
              <img
                src={room.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${room.name}`}
                alt={room.name}
                className="w-11 h-11 rounded-full object-cover border border-stone-800"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-amber-500 rounded-full flex items-center justify-center border border-stone-950 shadow">
                <Hash className="w-2.5 h-2.5 text-stone-950 stroke-[3]" />
              </div>
            </div>

            {/* Channel Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-bold text-stone-100 truncate">#{room.name}</p>
                  {isOwner && (
                    <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-md shrink-0">
                      HOST
                    </span>
                  )}
                </div>
                {room.lastMessageTime && (
                  <span className="text-[10px] text-stone-600 shrink-0">{formatTime(room.lastMessageTime)}</span>
                )}
              </div>

              <p className="text-xs text-stone-500 truncate">{room.lastMessage || 'Broadcast channel ready for updates'}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
