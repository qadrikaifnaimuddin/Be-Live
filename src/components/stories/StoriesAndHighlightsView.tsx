import React from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Story, Highlight } from '../../types';

interface StoriesAndHighlightsViewProps {
  isOwnProfile: boolean;
  userStories: Story[];
  userHighlights: Highlight[];
  isUploadingStory: boolean;
  storyFileInputRef: React.RefObject<HTMLInputElement | null>;
  onStoryUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCreateHighlight: () => void;
  onSelectHighlight: (hl: Highlight) => void;
}

export const StoriesAndHighlightsView: React.FC<StoriesAndHighlightsViewProps> = ({
  isOwnProfile,
  userStories,
  userHighlights,
  isUploadingStory,
  storyFileInputRef,
  onStoryUpload,
  onOpenCreateHighlight,
  onSelectHighlight,
}) => {
  return (
    <div className="mb-8 px-2">
      <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Highlights</h4>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {/* Add Story Circle (Only on own profile) */}
        {isOwnProfile && (
          <div className="flex flex-col items-center shrink-0">
            <button
              onClick={() => storyFileInputRef.current?.click()}
              className="w-16 h-16 rounded-full border border-dashed border-stone-850 bg-stone-950/80 hover:bg-stone-900 flex items-center justify-center text-stone-300 hover:text-indigo-400 transition-all active:scale-95 cursor-pointer shadow-sm relative overflow-hidden"
              title="Post a Story"
            >
              <Plus className="w-6 h-6 stroke-[2.5px]" />
              {isUploadingStory && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                </div>
              )}
            </button>
            <span className="text-[11px] text-stone-400 font-bold mt-2">Add Story</span>
            <input
              ref={storyFileInputRef as any}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={onStoryUpload}
            />
          </div>
        )}

        {/* Create New Highlight Circle (Only on own profile) */}
        {isOwnProfile && (
          <div className="flex flex-col items-center shrink-0">
            <button
              onClick={() => {
                if (userStories.length === 0) {
                  alert("You don't have any posted stories yet! Please click 'Add Story' to upload one first.");
                } else {
                  onOpenCreateHighlight();
                }
              }}
              className="w-16 h-16 rounded-full border border-slate-300 bg-stone-950/80 hover:bg-stone-950/40 flex items-center justify-center text-stone-300 hover:text-purple-600 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Create New Highlight"
            >
              <Plus className="w-6 h-6 stroke-[2.5px]" />
            </button>
            <span className="text-[11px] text-stone-400 font-bold mt-2">New</span>
          </div>
        )}

        {/* User's compiled Highlights list */}
        {userHighlights.map((hl) => (
          <div
            key={hl.id}
            onClick={() => onSelectHighlight(hl)}
            className="flex flex-col items-center shrink-0 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full p-[2.5px] border border-stone-800 group-hover:scale-105 transition-transform bg-stone-950/60 overflow-hidden shadow-sm">
              <img
                src={hl.coverUrl || 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=150&h=150&q=80'}
                alt={hl.title}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="text-[11px] text-stone-400 font-bold mt-2 max-w-[68px] truncate group-hover:text-stone-100">
              {hl.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
