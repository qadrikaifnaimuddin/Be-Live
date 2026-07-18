import React, { useState, useEffect } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import { Post, User } from '../types';

interface PostAccessManagerProps {
  post: Post;
  onPostUpdate: (updatedPost: Post) => void;
  currentUser: User;
  allUsers: User[];
  onGrantPostAccess?: (postId: string, targetUserId: string, durationMinutes?: number) => void;
  onRevokePostAccess?: (postId: string, targetUserId: string) => void;
  isDarkMode?: boolean;
}

export default function PostAccessManager({
  post,
  onPostUpdate,
  currentUser,
  allUsers,
  onGrantPostAccess,
  onRevokePostAccess,
  isDarkMode = false
}: PostAccessManagerProps) {
  const [selectedUserToShare, setSelectedUserToShare] = useState('');
  const [shareDurationMinutes, setShareDurationMinutes] = useState('0');
  const [customMinutes, setCustomMinutes] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Poll for expired timers every 5 seconds to keep countdowns and visibility active
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const shareableUsers = (allUsers || []).filter(u => {
    if (u.id === currentUser.id) return false;
    
    // If our account is private, restrict sharing
    if (currentUser.isPrivate) {
      if (currentUser.allowNonFollowerAccess) {
        return true;
      }
      return currentUser.followers.includes(u.id);
    }
    return true;
  });

  const handleGrant = () => {
    if (!selectedUserToShare) return;
    
    let duration: number | undefined = undefined;
    if (shareDurationMinutes === 'custom') {
      const mins = parseInt(customMinutes);
      if (!isNaN(mins) && mins > 0) {
        duration = mins;
      }
    } else {
      const mins = parseInt(shareDurationMinutes);
      if (mins > 0) {
        duration = mins;
      }
    }

    if (onGrantPostAccess) {
      onGrantPostAccess(post.id, selectedUserToShare, duration);
      
      const expiresAt = duration 
        ? new Date(Date.now() + duration * 60 * 1000).toISOString() 
        : undefined;
      const currentShared = post.sharedAccess ? [...post.sharedAccess] : [];
      const filtered = currentShared.filter(acc => acc.userId !== selectedUserToShare);
      filtered.push({ userId: selectedUserToShare, expiresAt });
      
      onPostUpdate({
        ...post,
        sharedAccess: filtered
      });
      
      setSelectedUserToShare('');
      setShareDurationMinutes('0');
      setCustomMinutes('');
    }
  };

  const handleRevoke = (userId: string) => {
    if (onRevokePostAccess) {
      onRevokePostAccess(post.id, userId);
      
      const currentShared = post.sharedAccess ? [...post.sharedAccess] : [];
      const filtered = currentShared.filter(acc => acc.userId !== userId);
      
      onPostUpdate({
        ...post,
        sharedAccess: filtered
      });
    }
  };

  const bgClass = isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-rose-50/75 border border-rose-100';
  const textClass = isDarkMode ? 'text-indigo-400 font-extrabold' : 'text-rose-700 font-extrabold';
  const badgeClass = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400' : 'bg-rose-100 hover:bg-rose-200 text-rose-700';
  const panelBg = isDarkMode ? 'bg-slate-950 border border-slate-850' : 'bg-white border border-rose-100/50';

  return (
    <div className={`${bgClass} rounded-2xl p-3.5 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-xs uppercase tracking-wider ${textClass}`}>
          <Shield className="w-4 h-4 shrink-0" />
          <span>Secret Viewer Passes</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${badgeClass}`}
        >
          {isExpanded ? 'Hide Passes' : 'Manage Passes'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3.5 pt-2.5 border-t border-slate-800/60 text-xs">
          {/* Grant Form */}
          <div className={`${panelBg} rounded-xl p-2.5 space-y-2.5`}>
            <h5 className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} font-bold text-[10px] uppercase tracking-wider`}>
              Grant Private Entry
            </h5>
            
            {shareableUsers.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">
                {currentUser.isPrivate && !currentUser.allowNonFollowerAccess 
                  ? "No followers available to share with. (Turn on 'Give access to users who do not follow you' in settings to share with anyone)."
                  : "No other registered users in the platform."}
              </p>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select User</label>
                  <select
                    value={selectedUserToShare}
                    onChange={(e) => setSelectedUserToShare(e.target.value)}
                    className={`w-full px-2 py-1.5 rounded-lg outline-none text-xs ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'}`}
                  >
                    <option value="">-- Choose User --</option>
                    {shareableUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        @{u.username} ({u.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Pass Duration</label>
                    <select
                      value={shareDurationMinutes}
                      onChange={(e) => setShareDurationMinutes(e.target.value)}
                      className={`w-full px-2 py-1.5 rounded-lg outline-none text-xs ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'}`}
                    >
                      <option value="0">Lifetime (No Timer)</option>
                      <option value="1">1 Minute</option>
                      <option value="5">5 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="1440">24 Hours</option>
                      <option value="custom">Custom Minutes...</option>
                    </select>
                  </div>

                  {shareDurationMinutes === 'custom' && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Custom Mins</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        min="1"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className={`w-full px-2 py-1 rounded-lg outline-none text-xs ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'}`}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleGrant}
                  disabled={!selectedUserToShare || (shareDurationMinutes === 'custom' && !customMinutes)}
                  className={`w-full py-1.5 font-bold rounded-lg text-center transition-all cursor-pointer text-xs ${isDarkMode ? 'bg-indigo-650 hover:bg-indigo-700 text-white disabled:bg-slate-800 disabled:text-slate-600' : 'bg-rose-600 hover:bg-rose-700 text-white disabled:bg-slate-100 disabled:text-slate-400'}`}
                >
                  Create Pass
                </button>
              </div>
            )}
          </div>

          {/* Current Viewers List */}
          <div className="space-y-1.5">
            <h5 className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} font-bold text-[10px] uppercase tracking-wider`}>Guests with Passes</h5>
            {!post.sharedAccess || post.sharedAccess.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">This private post hasn't been shared with anyone yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {post.sharedAccess.map(access => {
                  const targetUser = allUsers.find(u => u.id === access.userId);
                  if (!targetUser) return null;
                  
                  let remainingText = "Permanent";
                  let isExpired = false;
                  if (access.expiresAt) {
                    const diffMs = new Date(access.expiresAt).getTime() - Date.now();
                    if (diffMs <= 0) {
                      remainingText = "Expired (Access Revoked)";
                      isExpired = true;
                    } else {
                      const diffMins = Math.ceil(diffMs / 60000);
                      remainingText = diffMins > 60 
                        ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m remaining` 
                        : `${diffMins}m remaining`;
                    }
                  }

                  return (
                    <div key={access.userId} className={`flex items-center justify-between rounded-xl p-2.5 shadow-sm border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-2">
                        <img
                          src={targetUser.avatar}
                          alt={targetUser.username}
                          className="w-5.5 h-5.5 rounded-full object-cover border"
                        />
                        <div className="text-[10px] leading-tight">
                          <p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>@{targetUser.username}</p>
                          <p className={`text-[8px] font-mono mt-0.5 ${isExpired ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                            ⏱ {remainingText}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(access.userId)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Revoke access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
