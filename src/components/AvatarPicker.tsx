import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  Check, 
  Trash2, 
  Layers, 
  User as UserIcon,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { compressImage } from '../lib/imageCompression';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AvatarPickerProps {
  currentAvatar: string;
  onAvatarSelect: (avatarUrlOrBase64: string) => void;
  onLaunchAvatarStudio?: () => void;
}

// 12 Elite Curated Profile Presets with various stylistic aesthetics
const PRESET_AVATARS = [
  {
    category: 'Vibrant & Modern',
    items: [
      { name: 'Warm Muse', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Tech Pioneer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Sunset Spark', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Editorial Edge', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&h=250&q=80' },
    ]
  },
  {
    category: 'Artistic & Minimalist',
    items: [
      { name: 'Golden hour', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Cool Steel', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Classic Pose', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Warm Sepia', url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=250&h=250&q=80' },
    ]
  },
  {
    category: 'Nature & Abstract',
    items: [
      { name: 'Aurora Sky', url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Ocean Mist', url: 'https://images.unsplash.com/photo-1471922639536-e6c1e13aa4f8?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Cyber Neon', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=250&h=250&q=80' },
      { name: 'Desert Dune', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=250&h=250&q=80' },
    ]
  }
];

export default function AvatarPicker({ currentAvatar, onAvatarSelect, onLaunchAvatarStudio }: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeCategory, setActiveCategory] = useState(PRESET_AVATARS[0].category);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Read upload file, compress client-side, and upload or use base64 fallback
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files (JPG, PNG, WEBP) are supported!');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Compress image client-side to maximum of 300x300 JPEG
      const { blob, base64 } = await compressImage(file, 300, 300, 0.8);

      // 2. If Supabase is configured, upload the compressed JPEG Blob
      if (isSupabaseConfigured && supabase) {
        const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.warn('Supabase storage upload failed, falling back to base64:', error.message);
          onAvatarSelect(base64);
        } else if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          if (publicUrlData?.publicUrl) {
            onAvatarSelect(publicUrlData.publicUrl);
          } else {
            onAvatarSelect(base64);
          }
        }
      } else {
        onAvatarSelect(base64);
      }
    } catch (err: any) {
      console.error('Image compression or upload failed:', err);
      setUploadError(err.message || 'Failed to compress or upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-5 text-left">
      {/* ====== ACTIVE AVATAR PREVIEW & MASTER BUTTONS ====== */}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="p-1 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shadow-sm">
            <img
              src={currentAvatar}
              alt="Active profile pic"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover border-2 border-white bg-slate-100"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1 rounded-full border border-white flex items-center justify-center text-[8px] font-extrabold shadow-md uppercase tracking-wider scale-90">
            Live
          </span>
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <h4 className="font-bold text-xs text-slate-800">Customize Your Face</h4>
          <p className="text-[10px] text-slate-500 leading-tight">
            Select a custom high-fidelity photo, upload any device snapshot, or create an avatar.
          </p>
          
          <div className="flex gap-2">
            {onLaunchAvatarStudio && (
              <button
                type="button"
                onClick={onLaunchAvatarStudio}
                className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Avatar Studio</span>
              </button>
            )}
            <button
              type="button"
              onClick={triggerFileInput}
              className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <FolderOpen className="w-3 h-3 text-purple-500" />
              <span>Browse Device</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====== DEVICE DRAG & DROP FILE UPLOAD AREA ====== */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          dragActive 
            ? 'border-purple-500 bg-purple-50/50 scale-[0.99] shadow-inner' 
            : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-1.5 py-4">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-500">Compressing &amp; Uploading...</span>
          </div>
        ) : (
          <>
            <div className={`p-2.5 rounded-full ${dragActive ? 'bg-purple-100 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
              <Upload className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-700 block">Drag &amp; Drop Photo Here</span>
              <span className="text-[10px] text-slate-400 block">or click to choose any image from your device</span>
            </div>
          </>
        )}

        {uploadError && (
          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full mt-1">
            ⚠️ {uploadError}
          </span>
        )}
      </div>

      {/* ====== CHOOSE FROM PRESET PICTURE GALLERY ====== */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Or Select a Premium Portrait</span>
          
          {/* Category Tabs */}
          <div className="flex gap-1.5">
            {PRESET_AVATARS.map((cat) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => setActiveCategory(cat.category)}
                className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md transition-all cursor-pointer ${
                  activeCategory === cat.category 
                    ? 'bg-purple-100 text-purple-700 font-bold' 
                    : 'text-slate-400 hover:text-slate-600 bg-slate-50'
                }`}
              >
                {cat.category.split(' & ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Portait selection Grid */}
        <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-3 grid grid-cols-4 gap-2.5">
          {PRESET_AVATARS.find(cat => cat.category === activeCategory)?.items.map((preset) => {
            const isSelected = currentAvatar === preset.url;
            return (
              <button
                key={preset.url}
                type="button"
                onClick={() => onAvatarSelect(preset.url)}
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group border-2 transition-all ${
                  isSelected ? 'border-purple-600 scale-[0.98] shadow-sm' : 'border-transparent hover:scale-103'
                }`}
                title={preset.name}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                
                {/* Checkmark overlay */}
                {isSelected ? (
                  <div className="absolute inset-0 bg-purple-900/10 flex items-center justify-center text-white">
                    <div className="bg-purple-600 p-1 rounded-full shadow border border-white">
                      <Check className="w-2.5 h-2.5 stroke-[3.5px]" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
