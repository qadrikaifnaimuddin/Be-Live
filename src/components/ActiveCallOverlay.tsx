import React from 'react';
import { Lock, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import { User, ChatRoom, CallSession } from '../types';

interface ActiveCallOverlayProps {
  activeCall: CallSession;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  selectedChat: User | ChatRoom | null;
  isDirect: boolean;
  isRoom: boolean;
  callDuration: number;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isVideoOff: boolean;
  setIsVideoOff: (videoOff: boolean) => void;
  onEndCall: () => void;
}

export function ActiveCallOverlay({
  activeCall,
  localVideoRef,
  selectedChat,
  isDirect,
  isRoom,
  callDuration,
  isMuted,
  setIsMuted,
  isVideoOff,
  setIsVideoOff,
  onEndCall,
}: ActiveCallOverlayProps) {
  const formatDur = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const getChatName = () => {
    if (!selectedChat) return '';
    return isRoom ? (selectedChat as ChatRoom).name : (selectedChat as User).name;
  };

  const getChatAvatar = () => {
    if (!selectedChat) return '';
    return isRoom ? (selectedChat as ChatRoom).avatar : (selectedChat as User).avatar;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between p-8">
      {activeCall.type === 'video' && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
      )}
      <div className="relative z-10 flex flex-col items-center gap-3 pt-16">
        {selectedChat && isDirect && (
          <img
            src={getChatAvatar() || ''}
            alt=""
            className="w-24 h-24 rounded-full border-4 border-white/20 object-cover"
          />
        )}
        <p className="text-white text-xl font-bold">{selectedChat && isDirect ? getChatName() : ''}</p>
        <p className="text-white/60 text-sm">
          {activeCall.status === 'ringing' ? 'Ringing...' : formatDur(callDuration)}
        </p>
        <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
          <Lock className="w-3 h-3" />
          End-to-End Encrypted
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-6 pb-12">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer ${
            isMuted ? 'bg-white text-black' : 'bg-white/10 text-white'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        {activeCall.type === 'video' && (
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer ${
              isVideoOff ? 'bg-white text-black' : 'bg-white/10 text-white'
            }`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}
        <button
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center cursor-pointer"
        >
          <Phone className="w-7 h-7 text-white rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}
