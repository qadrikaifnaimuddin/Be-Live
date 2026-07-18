/**
 * FollowButton — Be-Live Production
 * Handles: Follow, Unfollow, Follow Request (private), Pending state
 * All DB operations delegated to useFollowSystem hook via props.
 */

import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Clock, Check, Loader2 } from 'lucide-react';
import { FollowStats } from '../lib/useFollowSystem';

interface FollowButtonProps {
  targetUserId: string;
  targetIsPrivate: boolean;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  onFollow: (targetId: string, isPrivate: boolean) => Promise<void>;
  onUnfollow: (targetId: string) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  stats?: FollowStats;
  showStats?: boolean;
}

export default function FollowButton({
  targetUserId,
  targetIsPrivate,
  isFollowing,
  hasPendingRequest,
  onFollow,
  onUnfollow,
  size = 'md',
  stats,
  showStats = false,
}: FollowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-5 py-2 text-sm rounded-xl',
    lg: 'px-8 py-3 text-base rounded-2xl',
  };

  const handleClick = async () => {
    if (loading) return;

    if (isFollowing) {
      // Show confirm dialog before unfollowing
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      await onFollow(targetUserId, targetIsPrivate);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      await onUnfollow(targetUserId);
    } finally {
      setLoading(false);
    }
  };

  const cancelUnfollow = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      await onUnfollow(targetUserId); // cancel pending request
    } finally {
      setLoading(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2 items-center">
        <button
          onClick={handleUnfollow}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl cursor-pointer transition-all"
        >
          Unfollow
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-bold rounded-xl cursor-pointer transition-all"
        >
          Cancel
        </button>
      </div>
    );
  }

  const buttonContent = () => {
    if (loading) return <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading...</>;
    if (hasPendingRequest) return <><Clock className="w-3.5 h-3.5" />Requested</>;
    if (isFollowing) return <><Check className="w-3.5 h-3.5" />Following</>;
    if (targetIsPrivate) return <><Clock className="w-3.5 h-3.5" />Request Follow</>;
    return <><UserPlus className="w-3.5 h-3.5" />Follow</>;
  };

  const buttonStyle = () => {
    if (hasPendingRequest) return 'bg-stone-700 hover:bg-stone-600 text-stone-200';
    if (isFollowing) return 'bg-stone-800 hover:bg-rose-600 text-stone-200 hover:text-white border border-stone-700 hover:border-rose-600';
    return 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/30';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer disabled:opacity-60 ${sizeClasses[size]} ${buttonStyle()}`}
      >
        {buttonContent()}
      </button>
      {showStats && stats && (
        <div className="flex gap-3 text-xs text-stone-500 mt-1">
          <span><span className="text-stone-200 font-bold">{stats.followersCount.toLocaleString()}</span> followers</span>
          <span><span className="text-stone-200 font-bold">{stats.followingCount.toLocaleString()}</span> following</span>
        </div>
      )}
    </div>
  );
}
