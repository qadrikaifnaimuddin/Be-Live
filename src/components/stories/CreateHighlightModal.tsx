import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderHeart, X, Check } from 'lucide-react';
import { Story } from '../../types';

interface CreateHighlightModalProps {
  isOpen: boolean;
  userStories: Story[];
  newHighlightTitle: string;
  selectedStoryIds: string[];
  onTitleChange: (title: string) => void;
  onToggleStorySelection: (storyId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CreateHighlightModal: React.FC<CreateHighlightModalProps> = ({
  isOpen,
  userStories,
  newHighlightTitle,
  selectedStoryIds,
  onTitleChange,
  onToggleStorySelection,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-stone-950 border border-stone-850 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5"
        >
          <div className="flex items-center justify-between border-b border-stone-900 pb-4">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <FolderHeart className="w-5 h-5 text-purple-400" /> Create New Highlight
            </h3>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wider">
                Highlight Title
              </label>
              <input
                type="text"
                placeholder="e.g. Summer Vibe, Memories"
                value={newHighlightTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                maxLength={15}
                required
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Checklist of stories */}
            <div>
              <label className="block text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider">
                Select Stories to Include
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-none">
                {userStories.map((story) => {
                  const isSelected = selectedStoryIds.includes(story.id);
                  return (
                    <div
                      key={story.id}
                      onClick={() => onToggleStorySelection(story.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500/50 text-white'
                          : 'bg-stone-900/60 border-stone-800/80 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {story.mediaType === 'video' ? (
                          <video
                            src={story.mediaUrl}
                            className="w-10 h-10 rounded-lg object-cover bg-stone-800"
                          />
                        ) : (
                          <img
                            src={story.mediaUrl}
                            alt="Story thumbnail"
                            className="w-10 h-10 rounded-lg object-cover bg-stone-800"
                          />
                        )}
                        <div>
                          <p className="text-xs font-bold text-stone-200">
                            Story from {new Date(story.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'border-stone-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
              >
                Create Highlight
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
