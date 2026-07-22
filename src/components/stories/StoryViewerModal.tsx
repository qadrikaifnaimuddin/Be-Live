import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { Story, Highlight, User } from '../../types';

interface StoryViewerModalProps {
  activeHighlight: Highlight | null;
  activeStoryIndex: number;
  storyProgress: number;
  stories: Story[];
  user: User;
  onClose: () => void;
  onPrevStory: () => void;
  onNextStory: () => void;
  onDeleteStory?: (storyId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  activeHighlight,
  activeStoryIndex,
  storyProgress,
  stories,
  user,
  onClose,
  onPrevStory,
  onNextStory,
}) => {
  if (!activeHighlight) return null;

  const currentStory = stories.find((s) => s.id === activeHighlight.storyIds[activeStoryIndex]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center select-none">
        <div className="absolute inset-0 cursor-default" onClick={onClose} />

        {/* Left/Right manual controls */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 hidden md:block">
          <button
            onClick={(e) => { e.stopPropagation(); onPrevStory(); }}
            className="p-3 bg-stone-950/60 hover:bg-stone-900 text-white rounded-full transition-all backdrop-blur-sm cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 stroke-[3px]" />
          </button>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 hidden md:block">
          <button
            onClick={(e) => { e.stopPropagation(); onNextStory(); }}
            className="p-3 bg-stone-950/60 hover:bg-stone-900 text-white rounded-full transition-all backdrop-blur-sm cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 stroke-[3px]" />
          </button>
        </div>

        {/* Playback Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-[430px] aspect-[9/16] md:rounded-[40px] bg-black shadow-2xl overflow-hidden flex flex-col z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Media Element */}
          <div className="absolute inset-0 z-0 bg-slate-900">
            {currentStory ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {currentStory.mediaType === 'video' ? (
                  <video
                    src={currentStory.mediaUrl}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={currentStory.mediaUrl}
                    alt="Highlight story content"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Highlight Cover Caption */}
                <div className="absolute bottom-12 left-4 right-4 text-center z-10">
                  <span className="inline-block px-4 py-2 bg-purple-900/80 border border-purple-500/20 backdrop-blur-sm text-white rounded-2xl text-xs font-bold leading-relaxed shadow-lg max-w-[90%] mx-auto">
                    Featured in &ldquo;{activeHighlight.title}&rdquo; 💖
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 italic text-xs">
                This story could not be loaded.
              </div>
            )}
          </div>

          {/* Segmented Progress bar & user header */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 via-black/45 to-transparent z-10 space-y-3.5">
            {/* Segmented indicator bars */}
            <div className="flex gap-1">
              {activeHighlight.storyIds.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-[40ms] ease-linear"
                    style={{
                      width:
                        idx < activeStoryIndex
                          ? '100%'
                          : idx === activeStoryIndex
                          ? `${storyProgress}%`
                          : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* User Snapshot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-white/40"
                />
                <span className="text-xs font-bold text-white drop-shadow-sm">{user.username}</span>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
