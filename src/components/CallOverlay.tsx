/**
 * CallOverlay — Be-Live
 * Full-screen overlay for incoming, active audio, and active video calls.
 * Rendered at the App level so it shows over any screen.
 */

import React, { useEffect, useRef } from 'react';
import {
  Phone, Video, Mic, MicOff, VideoOff, PhoneOff,
  PhoneIncoming, Lock, Signal, WifiOff
} from 'lucide-react';
import { WebRTCState, CallStatus } from '../lib/useWebRTC';

interface CallOverlayProps {
  state: WebRTCState;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const formatDur = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const statusLabel: Record<CallStatus, string> = {
  idle: '',
  calling: 'Calling...',
  incoming: 'Incoming Call',
  connecting: 'Connecting...',
  connected: '',
  ended: 'Call Ended',
};

export default function CallOverlay({
  state,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
}: CallOverlayProps) {
  if (state.status === 'idle') return null;

  const isVideo = state.callType === 'video';
  const isIncoming = state.status === 'incoming';
  const isActive = state.status === 'connected' || state.status === 'connecting';
  const isEnded = state.status === 'ended';
  const isCalling = state.status === 'calling';
  const remote = state.remoteUser;

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col"
      style={{
        background: isVideo && isActive
          ? 'transparent'
          : 'linear-gradient(135deg, #0d0d0f 0%, #1a0a2e 50%, #0d0d0f 100%)',
      }}
    >
      {/* ── Remote video (background) ── */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Top section — caller info */}
        <div className="flex flex-col items-center pt-20 pb-6 px-6 flex-1">

          {/* Status badge */}
          <div className="mb-6 flex items-center gap-2">
            {isActive ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Lock className="w-3 h-3" />
                End-to-End Encrypted
              </div>
            ) : (
              <div className="flex items-center gap-2 text-stone-400 text-sm font-medium">
                {isIncoming && <PhoneIncoming className="w-4 h-4 text-violet-400" />}
                <span className="text-stone-300">{statusLabel[state.status]}</span>
              </div>
            )}
          </div>

          {/* Avatar with pulse ring on incoming */}
          <div className="relative mb-4">
            {isIncoming && (
              <>
                <div className="absolute inset-[-12px] rounded-full border-2 border-violet-500/30 animate-ping" />
                <div className="absolute inset-[-6px] rounded-full border-2 border-violet-500/20 animate-ping animation-delay-150" />
              </>
            )}
            {isCalling && (
              <div className="absolute inset-[-8px] rounded-full border-2 border-emerald-500/30 animate-ping" />
            )}
            <img
              src={
                remote?.avatar ||
                `https://api.dicebear.com/7.x/adventurer/svg?seed=${remote?.username}`
              }
              alt={remote?.name}
              className="w-28 h-28 rounded-full object-cover border-2 border-white/20 shadow-2xl"
              onError={e => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${remote?.username}`;
              }}
            />
          </div>

          {/* Name */}
          <h2 className="text-2xl font-black text-white mb-1 text-center">
            {remote?.name || remote?.username || 'Unknown'}
          </h2>
          <p className="text-stone-400 text-sm mb-2">@{remote?.username}</p>

          {/* Call type indicator */}
          <div className="flex items-center gap-1.5 text-stone-500 text-xs">
            {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span>{isVideo ? 'Video' : 'Voice'} Call</span>
          </div>

          {/* Duration (connected) */}
          {isActive && (
            <div className="mt-4 text-stone-300 font-mono text-lg font-bold">
              {formatDur(state.callDuration)}
            </div>
          )}

          {/* Ended flash */}
          {isEnded && (
            <div className="mt-6 text-stone-400 text-sm">Call ended</div>
          )}

          {/* Pulse animation for ringing/calling states */}
          {(isCalling || isIncoming) && (
            <div className="mt-8 flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Local video pip (video calls) */}
        {isVideo && isActive && (
          <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${state.isVideoOff ? 'hidden' : ''}`}
            />
            {state.isVideoOff && (
              <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-stone-600" />
              </div>
            )}
          </div>
        )}

        {/* ── Controls ── */}
        <div className="relative z-10 pb-16 px-8">

          {/* Incoming call — Accept / Reject */}
          {isIncoming && (
            <div className="flex items-center justify-center gap-16">
              {/* Reject */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onReject}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center cursor-pointer shadow-2xl transition-all active:scale-95"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
                <span className="text-xs text-stone-400 font-medium">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onAccept}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center cursor-pointer shadow-2xl transition-all active:scale-95"
                  style={{ animation: 'gentlePulse 1.5s ease-in-out infinite' }}
                >
                  {isVideo ? (
                    <Video className="w-7 h-7 text-white" />
                  ) : (
                    <Phone className="w-7 h-7 text-white" />
                  )}
                </button>
                <span className="text-xs text-stone-300 font-medium">Accept</span>
              </div>
            </div>
          )}

          {/* Active / Connecting / Calling — controls */}
          {(isActive || isCalling || state.status === 'connecting') && (
            <div className="flex items-center justify-center gap-6">
              {/* Mute */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onToggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                    state.isMuted
                      ? 'bg-white text-stone-900'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {state.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <span className="text-xs text-stone-400">{state.isMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {/* Hang up */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onEnd}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center cursor-pointer shadow-2xl transition-all active:scale-95"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
                <span className="text-xs text-stone-400">End</span>
              </div>

              {/* Video toggle (video calls only) */}
              {isVideo && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={onToggleVideo}
                    className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                      state.isVideoOff
                        ? 'bg-white text-stone-900'
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {state.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                  <span className="text-xs text-stone-400">
                    {state.isVideoOff ? 'Show video' : 'Hide video'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {state.error && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-rose-950/90 border border-rose-800 rounded-2xl px-4 py-3 text-rose-300 text-sm text-center backdrop-blur-sm">
          {state.error}
        </div>
      )}

      <style>{`
        @keyframes gentlePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  );
}
