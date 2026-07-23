import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Image as ImageIcon, Video, Type } from 'lucide-react';

interface StoryUploadModalProps {
  isOpen: boolean;
  file: File | null;
  previewUrl: string | null;
  mediaType: 'image' | 'video';
  isUploading: boolean;
  onClose: () => void;
  onSubmitStory: (caption: string) => Promise<void> | void;
}

export const StoryUploadModal: React.FC<StoryUploadModalProps> = ({
  isOpen,
  file,
  previewUrl,
  mediaType,
  isUploading,
  onClose,
  onSubmitStory
}) => {
  const [caption, setCaption] = useState('');

  if (!isOpen || !previewUrl) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitStory(caption.trim());
    setCaption('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-[420px] aspect-[9/16] max-h-[85vh] rounded-[36px] bg-black border border-stone-800 shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#C4B99D]">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-wider">New Story</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Media Preview */}
          <div className="relative flex-1 bg-stone-950 flex items-center justify-center overflow-hidden">
            {mediaType === 'video' ? (
              <video
                src={previewUrl}
                autoPlay
                playsInline
                loop
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Story Preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Bottom Form with Caption & Submit */}
          <form onSubmit={handleSubmit} className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-20 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={120}
                className="w-full bg-stone-900/90 border border-stone-700/80 rounded-2xl pl-4 pr-12 py-3 text-xs font-medium text-stone-100 placeholder-stone-400 outline-none focus:border-[#C4B99D] backdrop-blur-md shadow-lg"
              />
              <button
                type="submit"
                disabled={isUploading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#C4B99D] hover:bg-amber-300 text-stone-950 rounded-xl transition-all font-bold cursor-pointer disabled:opacity-50 shadow-md active:scale-95 flex items-center justify-center"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
