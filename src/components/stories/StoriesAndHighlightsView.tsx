import React from 'react';
import { Plus, Loader2, Play } from 'lucide-react';
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
  onOpenActiveStories?: () => void;
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
  onOpenActiveStories,
}) => {
  return (
    <div className="mb-8 px-2">
      <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
        Stories & Highlights
      </h4>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {/* Active Stories Ring (If active stories exist for this user) */}
        {userStories.length > 0 && (
          <div className="flex flex-col items-center shrink-0">
            <button
              onClick={onOpenActiveStories}
              className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-[#C4B99D] via-pink-500 to-amber-400 hover:scale-105 transition-transform cursor-pointer shadow-md relative"
              title="View Active Stories"
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-stone-950 bg-stone-900 flex items-center justify-center">
                <img
                  src={userStories[userStories.length - 1].mediaUrl}
                  alt="Active Story"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#C4B99D] text-stone-950 flex items-center justify-center border border-stone-950 shadow-sm">
                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
              </div>
            </button>
            <span className="text-[11px] text-[#C4B99D] font-extrabold mt-2">Stories ({userStories.length})</span>
          </div>
        )}

        {/* Add Story Circle (Only on own profile) */}
        {isOwnProfile && (
          <div className="flex flex-col items-center shrink-0">
            <button
              onClick={() => storyFileInputRef.current?.click()}
              className="w-16 h-16 rounded-full border border-dashed border-stone-800 bg-stone-950/80 hover:bg-stone-900 flex items-center justify-center text-stone-300 hover:text-indigo-400 transition-all active:scale-95 cursor-pointer shadow-sm relative overflow-hidden"
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
              className="w-16 h-16 rounded-full border border-stone-800 bg-stone-950/80 hover:bg-stone-900 flex items-center justify-center text-stone-300 hover:text-purple-400 transition-all active:scale-95 cursor-pointer shadow-sm"
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
