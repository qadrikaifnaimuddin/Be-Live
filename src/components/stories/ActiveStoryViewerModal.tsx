import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Trash2, Eye, Clock, BarChart2, User as UserIcon } from 'lucide-react';
import { Story, User } from '../../types';

interface StoryViewDetail {
  userId: string;
  username: string;
  name: string;
  avatar: string;
  viewCount: number;
  timeSpentSeconds: number;
  lastViewedAt: string;
}

interface ActiveStoryViewerModalProps {
  isOpen: boolean;
  stories: Story[];
  initialIndex?: number;
  currentUser: User;
  onClose: () => void;
  onDeleteStory?: (storyId: string) => void;
  onRecordStoryView?: (storyId: string, watchTimeSeconds: number) => void;
}

export const ActiveStoryViewerModal: React.FC<ActiveStoryViewerModalProps> = ({
  isOpen,
  stories,
  initialIndex = 0,
  currentUser,
  onClose,
  onDeleteStory,
  onRecordStoryView
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const watchStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentStory = stories[currentIndex];
  const isOwner = currentStory && currentStory.userId === currentUser.id;

  // Track watch time when story changes or modal closes
  const recordCurrentWatchTime = () => {
    if (!currentStory) return;
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - watchStartTimeRef.current) / 1000));
    onRecordStoryView?.(currentStory.id, elapsedSeconds);
    watchStartTimeRef.current = Date.now();
  };

  // Reset progress and watch timer on index change
  useEffect(() => {
    if (!isOpen || !currentStory) return;
    setProgress(0);
    watchStartTimeRef.current = Date.now();

    // Record initial view event
    onRecordStoryView?.(currentStory.id, 1);
  }, [currentIndex, isOpen]);

  // Auto-advance progress timer
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused || showAnalytics) return;

    const intervalTime = 40;
    const duration = 5000; // 5 seconds per story
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, currentIndex, isPaused, showAnalytics, currentStory]);

  if (!isOpen || !currentStory) return null;

  const handleNext = () => {
    recordCurrentWatchTime();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    recordCurrentWatchTime();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setProgress(0);
    }
  };

  const handleCloseModal = () => {
    recordCurrentWatchTime();
    onClose();
  };

  // Format watch time into human readable string (e.g. 0h 2m 15s or 45s)
  const formatSeconds = (totalSec: number) => {
    if (!totalSec || totalSec <= 0) return '0s';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Format relative timestamp
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Viewer details analytics
  const viewerMap: Record<string, StoryViewDetail> = (currentStory as any).viewerDetails || {};
  const viewerList: StoryViewDetail[] = Object.values(viewerMap);
  const totalViewsCount = viewerList.reduce((acc, v) => acc + (v.viewCount || 1), 0) || (currentStory.viewers?.length || 0);
  const totalTimeSpentSeconds = viewerList.reduce((acc, v) => acc + (v.timeSpentSeconds || 0), 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-xl z-50 flex items-center justify-center select-none p-0 sm:p-4">
        {/* Backdrop click to close */}
        <div className="absolute inset-0 cursor-default" onClick={handleCloseModal} />

        {/* Desktop Previous Button */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden md:block">
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="p-3 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full transition-all backdrop-blur-md cursor-pointer border border-stone-800"
          >
            <ChevronLeft className="w-6 h-6 stroke-[3px]" />
          </button>
        </div>

        {/* Desktop Next Button */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden md:block">
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="p-3 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full transition-all backdrop-blur-md cursor-pointer border border-stone-800"
          >
            <ChevronRight className="w-6 h-6 stroke-[3px]" />
          </button>
        </div>

        {/* Story Screen Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-[430px] h-full sm:h-[92vh] sm:rounded-[36px] bg-black shadow-2xl overflow-hidden flex flex-col z-10 border border-stone-800/60"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Media Player */}
          <div className="absolute inset-0 z-0 bg-stone-950">
            {currentStory.mediaType === 'video' ? (
              <video
                src={currentStory.mediaUrl}
                autoPlay
                playsInline
                loop={false}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt="Story Content"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            )}

            {/* Optional Story Caption */}
            {currentStory.caption && (
              <div className="absolute bottom-20 left-4 right-4 text-center z-10">
                <span className="inline-block px-4 py-2.5 bg-black/75 border border-white/20 backdrop-blur-md text-white rounded-2xl text-xs font-semibold leading-relaxed shadow-lg max-w-[90%] mx-auto">
                  {currentStory.caption}
                </span>
              </div>
            )}
          </div>

          {/* Top Segmented Bars & Header */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-20 space-y-3">
            {/* Segment Progress Bars */}
            <div className="flex gap-1.5">
              {stories.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-[40ms] ease-linear"
                    style={{
                      width:
                        idx < currentIndex
                          ? '100%'
                          : idx === currentIndex
                          ? `${progress}%`
                          : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* User Header Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={currentStory.userAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentStory.username}`}
                  alt={currentStory.username}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border-2 border-white/50 shadow-sm"
                />
                <div>
                  <p className="text-xs font-extrabold text-white leading-tight drop-shadow-sm">
                    {currentStory.username}
                  </p>
                  <span className="text-[10px] text-white/70 font-medium">
                    {formatTimeAgo(currentStory.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Delete Story Option for Owner */}
                {isOwner && onDeleteStory && (
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this story?")) {
                        onDeleteStory(currentStory.id);
                        handleCloseModal();
                      }
                    }}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-full transition-all cursor-pointer"
                    title="Delete Story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleCloseModal}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Left / Right Screen Tap Zones */}
          <div className="absolute inset-y-16 left-0 w-1/3 z-10" onClick={handlePrev} />
          <div className="absolute inset-y-16 right-0 w-1/3 z-10" onClick={handleNext} />

          {/* OWNER ANALYTICS FOOTER BAR (Only visible if owner) */}
          {isOwner && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-20 flex justify-center">
              <button
                onClick={() => setShowAnalytics(true)}
                className="flex items-center gap-2.5 px-5 py-2.5 bg-stone-900/90 hover:bg-stone-850 border border-stone-700/80 text-stone-100 rounded-full text-xs font-bold transition-all shadow-xl backdrop-blur-md cursor-pointer active:scale-95"
              >
                <Eye className="w-4 h-4 text-purple-400" />
                <span>{totalViewsCount} {totalViewsCount === 1 ? 'View' : 'Views'}</span>
                <span className="text-stone-500">•</span>
                <Clock className="w-3.5 h-3.5 text-[#C4B99D]" />
                <span className="text-[#C4B99D] font-mono">{formatSeconds(totalTimeSpentSeconds)} watched</span>
              </button>
            </div>
          )}
        </motion.div>

        {/* OWNER STORY ANALYTICS DRAWER / MODAL */}
        {showAnalytics && (
          <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="w-full max-w-[440px] bg-stone-950 border border-stone-800 rounded-t-[32px] sm:rounded-[32px] p-6 text-stone-100 max-h-[80vh] flex flex-col shadow-2xl relative"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-850 pb-4 mb-4">
                  <div className="flex items-center gap-2 text-[#C4B99D]">
                    <BarChart2 className="w-5 h-5" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">
                      Story Analytics & Viewers
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="p-1 text-stone-400 hover:text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-stone-900/60 border border-stone-850 p-3.5 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Views</p>
                    <p className="text-xl font-extrabold text-white mt-1">{totalViewsCount}</p>
                  </div>
                  <div className="bg-stone-900/60 border border-stone-850 p-3.5 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Time Spent</p>
                    <p className="text-xl font-extrabold text-[#C4B99D] font-mono mt-1">
                      {formatSeconds(totalTimeSpentSeconds)}
                    </p>
                  </div>
                </div>

                {/* Viewer Details List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                    Viewer Details ({viewerList.length})
                  </h4>

                  {viewerList.length === 0 ? (
                    <div className="p-8 text-center bg-stone-900/30 rounded-2xl border border-stone-850">
                      <UserIcon className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                      <p className="text-xs text-stone-400 font-medium">No detailed viewer stats recorded yet.</p>
                    </div>
                  ) : (
                    viewerList.map((viewer) => (
                      <div
                        key={viewer.userId}
                        className="flex items-center justify-between p-3 bg-stone-900/50 hover:bg-stone-900 border border-stone-850 rounded-2xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={viewer.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${viewer.username}`}
                            alt={viewer.username}
                            className="w-9 h-9 rounded-full object-cover border border-stone-700"
                          />
                          <div>
                            <p className="text-xs font-bold text-stone-100">{viewer.name || viewer.username}</p>
                            <p className="text-[10px] text-stone-500">@{viewer.username}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-block px-2.5 py-1 bg-[#C4B99D]/10 text-[#C4B99D] font-mono text-[10px] font-bold rounded-lg border border-[#C4B99D]/20">
                            {formatSeconds(viewer.timeSpentSeconds || 0)} spent
                          </span>
                          <p className="text-[9px] text-stone-500 mt-1">
                            {viewer.viewCount || 1} {viewer.viewCount === 1 ? 'view' : 'views'} • {formatTimeAgo(viewer.lastViewedAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </AnimatePresence>
        )}
      </div>
    </AnimatePresence>
  );
};
