import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Music, 
  Video, 
  Image as ImageIcon, 
  Link2, 
  ChevronLeft, 
  ChevronRight, 
  SkipBack, 
  SkipForward, 
  ListMusic,
  FileText,
  Search,
  Globe,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Shield,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
  BookOpen,
  Type,
  Copy,
  Check,
  Download,
  Terminal,
  Grid,
  Code
} from 'lucide-react';
import { Post } from '../types';

interface MediaRendererProps {
  post: Post;
  className?: string;
}

export default function MediaRenderer({ post, className = "w-full h-full object-cover" }: MediaRendererProps) {
  const mediaType = post.mediaType || 'image';

  // State for index-based selection when lists are present
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);

  // Video States
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Audio States
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // In-App Browser States
  const [showInAppBrowser, setShowInAppBrowser] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [browserHistory, setBrowserHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);
  const [browserTab, setBrowserTab] = useState<'real' | 'simulated'>('simulated');
  const [simulatedSearchQuery, setSimulatedSearchQuery] = useState('');
  const [browserAlert, setBrowserAlert] = useState<string | null>(null);

  // Simulated Web Surf Interactions (Seoul Guide)
  const [seoulSelectedCategory, setSeoulSelectedCategory] = useState<'all' | 'spots' | 'food' | 'neon'>('all');
  
  // Simulated Web Surf Interactions (AI Studio Build)
  const [aiStudioPrompt, setAiStudioPrompt] = useState('Build a neon cyber-cafe billing planner widget with local storage state...');
  const [aiStudioResponse, setAiStudioResponse] = useState('');
  const [aiStudioStatus, setAiStudioStatus] = useState<'idle' | 'generating' | 'done'>('idle');
  
  // Simulated Web Surf Interactions (Unsplash)
  const [unsplashCategory, setUnsplashCategory] = useState<'nature' | 'cyberpunk' | 'minimalist'>('nature');

  // Document States
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docFontSize, setDocFontSize] = useState<number>(12); // in px
  const [docTheme, setDocTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [isDocCopied, setIsDocCopied] = useState(false);

  // Lists definitions
  const imageList = post.images && post.images.length > 0 ? post.images : (post.imageUrl ? [post.imageUrl] : []);
  const videoList = post.videos && post.videos.length > 0 ? post.videos : (post.videoUrl ? [post.videoUrl] : []);
  const audioList = post.audios && post.audios.length > 0 ? post.audios : (post.audioUrl ? [{ url: post.audioUrl, title: post.linkTitle || 'Audio Track' }] : []);
  const linkList = post.links && post.links.length > 0 ? post.links : (post.linkUrl ? [{ url: post.linkUrl, title: post.linkTitle || 'Explore Link' }] : []);
  const documentList = post.documents && post.documents.length > 0 ? post.documents : (post.documentUrl ? [{
    title: post.documentTitle || 'Document',
    url: post.documentUrl || 'document.txt',
    content: post.documentContent || 'Empty Document Content.',
    fileType: post.documentFileType || 'txt'
  }] : []);

  const currentVideoUrl = videoList[currentVideoIndex] || '';
  const currentAudio = audioList[currentAudioIndex] || { url: '', title: '' };
  const currentDoc = documentList[currentDocIndex] || { title: '', url: '', content: '', fileType: 'txt' };

  // Watch for index/source changes to auto-reload video
  useEffect(() => {
    if (videoRef.current && currentVideoUrl) {
      videoRef.current.load();
      if (isVideoPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentVideoIndex, currentVideoUrl]);

  // Watch for index/source changes to auto-reload audio
  useEffect(() => {
    if (audioRef.current && currentAudio.url) {
      audioRef.current.load();
      if (isAudioPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentAudioIndex, currentAudio.url]);

  // Pause media when component unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Sync state for video interactions
  const toggleVideoPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
  };

  const toggleVideoMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isVideoMuted;
    setIsVideoMuted(!isVideoMuted);
  };

  // Sync state for audio interactions
  const toggleAudioPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsAudioPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setAudioCurrentTime(current);
    setAudioProgress(dur > 0 ? (current / dur) * 100 : 0);
  };

  const handleAudioLoadedMetadata = () => {
    if (!audioRef.current) return;
    setAudioDuration(audioRef.current.duration || 0);
  };

  const handleAudioProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newPercentage = parseFloat(e.target.value);
    const dur = audioRef.current.duration || 0;
    const newTime = (newPercentage / 100) * dur;
    audioRef.current.currentTime = newTime;
    setAudioProgress(newPercentage);
    setAudioCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
    setIsAudioMuted(val === 0);
  };

  const toggleAudioMuted = () => {
    if (!audioRef.current) return;
    const nextMuted = !isAudioMuted;
    audioRef.current.muted = nextMuted;
    setIsAudioMuted(nextMuted);
    if (nextMuted) {
      audioRef.current.volume = 0;
    } else {
      audioRef.current.volume = audioVolume || 0.8;
    }
  };

  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return '0:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Carousel controls
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
  };

  // Video Playlist controls
  const handlePrevVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentVideoIndex((prev) => (prev > 0 ? prev - 1 : videoList.length - 1));
  };

  const handleNextVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentVideoIndex((prev) => (prev < videoList.length - 1 ? prev + 1 : 0));
  };

  // Audio Playlist controls
  const handlePrevAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentAudioIndex((prev) => (prev > 0 ? prev - 1 : audioList.length - 1));
  };

  const handleNextAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentAudioIndex((prev) => (prev < audioList.length - 1 ? prev + 1 : 0));
  };

  // Documents Playlist controls
  const handlePrevDoc = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDocIndex((prev) => (prev > 0 ? prev - 1 : documentList.length - 1));
    setDocSearchQuery('');
  };

  const handleNextDoc = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDocIndex((prev) => (prev < documentList.length - 1 ? prev + 1 : 0));
    setDocSearchQuery('');
  };

  // Browser Actions
  const openInAppBrowser = (url: string) => {
    setBrowserUrl(url);
    setBrowserHistory([url]);
    setHistoryIndex(0);
    setShowInAppBrowser(true);
    setIsBrowserLoading(true);
    
    // Choose simulation by default for cleaner experience inside sandbox
    if (url.includes('visitseoul') || url.includes('studio') || url.includes('unsplash')) {
      setBrowserTab('simulated');
    } else {
      setBrowserTab('simulated'); // Force simulated for full surfer compatibility, but allow toggling
    }

    setTimeout(() => {
      setIsBrowserLoading(false);
    }, 1200);
  };

  const handleBrowserNavigate = (newUrl: string) => {
    setIsBrowserLoading(true);
    const updatedHistory = browserHistory.slice(0, historyIndex + 1);
    updatedHistory.push(newUrl);
    setBrowserHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setBrowserUrl(newUrl);
    
    setTimeout(() => {
      setIsBrowserLoading(false);
    }, 1000);
  };

  const handleBrowserBack = () => {
    if (historyIndex > 0) {
      setIsBrowserLoading(true);
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setBrowserUrl(browserHistory[nextIndex]);
      setTimeout(() => {
        setIsBrowserLoading(false);
      }, 700);
    }
  };

  const handleBrowserForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      setIsBrowserLoading(true);
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setBrowserUrl(browserHistory[nextIndex]);
      setTimeout(() => {
        setIsBrowserLoading(false);
      }, 700);
    }
  };

  const handleBrowserRefresh = () => {
    setIsBrowserLoading(true);
    setTimeout(() => {
      setIsBrowserLoading(false);
    }, 1000);
  };

  const copyDocToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsDocCopied(true);
    setTimeout(() => {
      setIsDocCopied(false);
    }, 2000);
  };

  // Helper to highlight searched terms inside document
  const highlightContent = (text: string, query: string) => {
    if (!query || !text) return <pre className="whitespace-pre-wrap leading-relaxed font-mono text-[11px]">{text}</pre>;
    
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    
    return (
      <pre className="whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-300 text-slate-900 font-bold px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </pre>
    );
  };

  // Run AI Studio stream simulation
  const handleTriggerAiStudioBuild = () => {
    if (!aiStudioPrompt.trim()) return;
    setAiStudioStatus('generating');
    setAiStudioResponse('// Synthesizing workspace blueprints...\n');
    
    let steps = [
      '\n[SYSTEM] Initializing React-Vite dynamic sandbox environment...\n',
      '[SYSTEM] Port binds validated at 3000.\n',
      '[SYSTEM] Compiling Tailwind CSS theme rules...\n\n',
      'import React, { useState } from "react";\nimport { Battery, Shield } from "lucide-react";\n\n',
      'export default function CyberPlanner() {\n',
      '  const [hours, setHours] = useState(12);\n',
      '  const ratePerHour = 1.80; // credits\n\n',
      '  return (\n',
      '    <div className="p-5 bg-slate-950 border border-purple-500 rounded-3xl text-left">\n',
      '      <h4 className="text-sm font-black text-purple-400">⚡ NEON BILLING INTERFACE</h4>\n',
      '      <div className="mt-4 flex justify-between">\n',
      '        <span className="text-xs text-slate-400">Usage time: {hours} Hours</span>\n',
      '        <span className="text-xs font-mono font-bold text-emerald-400">Total: ${(hours * ratePerHour).toFixed(2)} USD</span>\n',
      '      </div>\n',
      '      <input \n',
      '        type="range" min="1" max="24" \n',
      '        value={hours} onChange={(e) => setHours(Number(e.target.value))} \n',
      '        className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg mt-3"\n',
      '      />\n',
      '    </div>\n',
      '  );\n',
      '}'
    ];

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        setAiStudioResponse((prev) => prev + steps[currentStepIndex]);
        currentStepIndex++;
      } else {
        clearInterval(interval);
        setAiStudioStatus('done');
      }
    }, 150);
  };

  // ==================== RENDERING LOGIC ====================

  // 1. VIDEO RENDERING
  if (mediaType === 'video' && currentVideoUrl) {
    const isMultiVideo = videoList.length > 1;

    return (
      <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center group/video overflow-hidden">
        {/* Main Video element */}
        <video
          ref={videoRef}
          src={currentVideoUrl}
          loop
          muted={isVideoMuted}
          playsInline
          className="w-full flex-1 object-cover transition-all"
          onPlay={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
        />

        {/* Video Overlays */}
        <div className="absolute inset-0 bg-black/25 opacity-100 sm:opacity-0 group-hover/video:opacity-100 transition-opacity flex flex-col justify-between p-4 z-10 pointer-events-none">
          
          {/* Top Info pill */}
          <div className="w-full flex justify-between items-center pointer-events-auto shrink-0">
            <div className="bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span>{isMultiVideo ? `Video loop ${currentVideoIndex + 1} of ${videoList.length}` : 'Video Loop'}</span>
            </div>

            {isMultiVideo && (
              <span className="bg-purple-600 text-white font-mono font-bold text-[9px] px-2 py-1 rounded-md">
                PLAYLIST
              </span>
            )}
          </div>

          {/* Centered Large Play Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <button
              onClick={toggleVideoPlay}
              className="p-4 bg-white/15 hover:bg-white/25 backdrop-blur-lg border border-white/20 text-white rounded-full transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
            >
              {isVideoPlaying ? (
                <Pause className="w-8 h-8 fill-white text-white stroke-[2.5px]" />
              ) : (
                <Play className="w-8 h-8 fill-white text-white stroke-[2.5px] translate-x-0.5" />
              )}
            </button>
          </div>

          {/* Multi video navigation controllers inside overlay */}
          {isMultiVideo && (
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-auto">
              <button
                onClick={handlePrevVideo}
                className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/15 rounded-full text-white cursor-pointer transition-transform hover:scale-105"
                title="Previous video loop"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextVideo}
                className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/15 rounded-full text-white cursor-pointer transition-transform hover:scale-105"
                title="Next video loop"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Bottom elements (Volume/Controls) */}
          <div className="w-full flex justify-between items-center mt-auto pointer-events-auto shrink-0">
            {/* Playlist Indicator Thumb row */}
            {isMultiVideo ? (
              <div className="flex gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 max-w-[70%] overflow-x-auto">
                {videoList.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentVideoIndex(idx);
                    }}
                    className={`w-5 h-2 rounded-full transition-all cursor-pointer ${
                      currentVideoIndex === idx ? 'bg-purple-500 w-8' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            ) : <div />}

            <button
              onClick={toggleVideoMute}
              className="p-2 bg-black/60 backdrop-blur-md text-white rounded-xl hover:bg-black/80 transition-all border border-white/10 cursor-pointer shadow-lg"
              title={isVideoMuted ? "Unmute video" : "Mute video"}
            >
              {isVideoMuted ? <VolumeX className="w-4 h-4 text-purple-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUDIO RENDERING
  if (mediaType === 'audio' && currentAudio.url) {
    const isMultiAudio = audioList.length > 1;

    return (
      <div className="relative w-full h-full bg-gradient-to-br from-stone-900 via-stone-950 to-[#121212] flex flex-col items-center justify-between p-5 select-none overflow-hidden">
        {/* Hidden Audio Tag */}
        <audio
          ref={audioRef}
          src={currentAudio.url}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onEnded={() => {
            if (isMultiAudio) {
              setCurrentAudioIndex((prev) => (prev < audioList.length - 1 ? prev + 1 : 0));
            } else {
              setIsAudioPlaying(false);
            }
          }}
        />

        {/* Dynamic Glowing Ambient Aura */}
        <div className={`absolute w-44 h-44 rounded-full bg-purple-500/10 blur-[60px] top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 transition-all duration-1000 pointer-events-none ${isAudioPlaying ? 'scale-150 opacity-100' : 'scale-100 opacity-40'}`} />

        {/* Top Tag and Playlist indicators */}
        <div className="w-full flex justify-between items-center z-10 shrink-0">
          <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5" />
            <span>{isMultiAudio ? `Track ${currentAudioIndex + 1} of ${audioList.length}` : 'Audio Track'}</span>
          </div>

          {/* Jumping Equalizer bars */}
          <div className="flex items-end gap-1 h-5 px-1">
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                className={`w-0.75 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full transition-all duration-300 ${
                  isAudioPlaying ? 'animate-pulse' : 'h-1.5'
                }`}
                style={{
                  height: isAudioPlaying ? `${Math.floor(Math.random() * 14) + 4}px` : '4px',
                  animationDuration: isAudioPlaying ? `${300 + i * 150}ms` : '0ms'
                }}
              />
            ))}
          </div>
        </div>

        {/* Disc Rotation Cover Art */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex-1 flex items-center justify-center my-3.5 z-10">
          <div 
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-stone-950 border-4 border-stone-800 shadow-2xl relative flex items-center justify-center overflow-hidden group/vinyl transition-all ${
              isAudioPlaying ? 'animate-[spin_8s_linear_infinite]' : ''
            }`}
          >
            {/* Vinyl grooves */}
            <div className="absolute inset-2 border border-stone-900 rounded-full opacity-60" />
            <div className="absolute inset-5 border border-stone-900 rounded-full opacity-60" />
            <div className="absolute inset-8 border border-stone-900 rounded-full opacity-60" />
            
            {/* Center Album Art */}
            <img 
              src={post.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=150&h=150&q=80'} 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-stone-900"
              alt="Album Artwork"
              referrerPolicy="no-referrer"
            />
            
            {/* Pin Hole */}
            <div className="absolute w-2 h-2 bg-[#121212] rounded-full border border-stone-700" />
          </div>
        </div>

        {/* Sleek Controller & Playlist Block */}
        <div className="w-full bg-stone-900/75 backdrop-blur-md border border-stone-850 rounded-2xl p-4 space-y-3.5 z-10 shrink-0">
          {/* Active Track Title */}
          <div className="text-left flex items-center justify-between">
            <div>
              <span className="text-[9px] text-purple-400 font-extrabold uppercase tracking-widest block">Currently Playing</span>
              <span className="text-xs font-black text-white truncate block max-w-[220px]">
                {currentAudio.title}
              </span>
            </div>
            {isMultiAudio && (
              <span className="bg-purple-950 text-purple-400 text-[9px] px-2 py-0.5 rounded border border-purple-900/40 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                <ListMusic className="w-3 h-3" />
                Playlist
              </span>
            )}
          </div>

          {/* Progress Timeline */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-mono font-bold text-stone-500 w-7">{formatTime(audioCurrentTime)}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={audioProgress}
                onChange={handleAudioProgressChange}
                className="flex-1 h-1 bg-stone-850 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-[9px] font-mono font-bold text-stone-500 w-7 text-right">{formatTime(audioDuration)}</span>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center justify-between">
            <button 
              onClick={toggleAudioMuted}
              className="text-stone-400 hover:text-white transition-colors p-1 cursor-pointer"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-purple-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-3">
              {isMultiAudio && (
                <button
                  onClick={handlePrevAudio}
                  className="text-stone-400 hover:text-white p-1 cursor-pointer"
                  title="Previous Track"
                >
                  <SkipBack className="w-4.5 h-4.5" />
                </button>
              )}

              <button
                onClick={toggleAudioPlay}
                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-md shadow-purple-900/30 cursor-pointer flex items-center justify-center"
              >
                {isAudioPlaying ? (
                  <Pause className="w-4 h-4 fill-white stroke-[2.5px]" />
                ) : (
                  <Play className="w-4 h-4 fill-white stroke-[2.5px] translate-x-0.25" />
                )}
              </button>

              {isMultiAudio && (
                <button
                  onClick={handleNextAudio}
                  className="text-stone-400 hover:text-white p-1 cursor-pointer"
                  title="Next Track"
                >
                  <SkipForward className="w-4.5 h-4.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isAudioMuted ? 0 : audioVolume}
                onChange={handleVolumeChange}
                className="w-10 h-0.75 bg-stone-850 rounded-lg appearance-none cursor-pointer accent-stone-400"
              />
            </div>
          </div>

          {isMultiAudio && (
            <div className="pt-2 border-t border-stone-800/80 max-h-24 overflow-y-auto space-y-1 scrollbar-thin text-left">
              {audioList.map((track, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentAudioIndex(idx);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all text-left cursor-pointer ${
                    currentAudioIndex === idx 
                      ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold' 
                      : 'hover:bg-white/5 text-stone-400 font-medium'
                  }`}
                >
                  <span className="text-[10px] font-mono text-purple-400/80 w-3">{idx + 1}</span>
                  <span className="text-[11px] truncate flex-1">{track.title}</span>
                  {currentAudioIndex === idx && isAudioPlaying && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. LINK RENDERING & IN-APP BROWSER
  if (mediaType === 'link' && linkList.length > 0) {
    const isMultiLink = linkList.length > 1;

    return (
      <div className="relative w-full h-full bg-slate-900 flex flex-col justify-between p-5 select-none overflow-hidden text-left">
        {/* Background Overlay visual */}
        <div className="absolute inset-0 z-0">
          <img 
            src={post.imageUrl || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=400&q=80'} 
            className="w-full h-full object-cover opacity-10 blur-[3px]" 
            alt="Link background preview"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent" />
        </div>

        {/* Top tag header */}
        <div className="w-full flex justify-between items-center z-10 shrink-0">
          <div className="bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            <span>{isMultiLink ? `${linkList.length} Shared Resources` : 'Interactive Link'}</span>
          </div>

          <div className="bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
            In-App Browser Ready
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center my-3 z-10 space-y-3.5 overflow-hidden">
          {isMultiLink ? (
            // Render beautiful list collections for multiple links
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <span className="block text-[9px] text-slate-400 uppercase font-extrabold tracking-widest mb-1.5">Click link to surf website in-app:</span>
              {linkList.map((link, idx) => {
                let linkHost = '';
                try {
                  linkHost = new URL(link.url).hostname.replace('www.', '');
                } catch {
                  linkHost = 'internal link';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => openInAppBrowser(link.url)}
                    className="w-full flex items-center justify-between p-3 bg-slate-950/50 hover:bg-slate-950 border border-white/5 hover:border-indigo-500/30 rounded-xl transition-all group/linkrow cursor-pointer"
                  >
                    <div className="flex-1 truncate pr-3 text-left">
                      <span className="block text-xs font-black text-white group-hover/linkrow:text-indigo-400 transition-colors truncate">
                        {link.title}
                      </span>
                      <span className="block text-[9px] font-mono text-slate-500 truncate">
                        {linkHost}
                      </span>
                    </div>
                    <Globe className="w-3.5 h-3.5 text-slate-500 group-hover/linkrow:text-indigo-400 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : (
            // Render single large card preview (classic link card view)
            <button
              onClick={() => openInAppBrowser(linkList[0].url)}
              className="w-full text-left group/cardlink flex flex-col gap-3.5"
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/5 group-hover/cardlink:border-indigo-500/20 aspect-[16/10] shadow-2xl w-full">
                <img 
                  src={post.imageUrl || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=600&h=300&q=80'} 
                  className="w-full h-full object-cover transition-transform group-hover/cardlink:scale-103 duration-500"
                  alt="Link banner"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover/cardlink:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <span className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-full shadow-lg flex items-center gap-1.5 scale-90 group-hover/cardlink:scale-100 transition-transform">
                    <Globe className="w-4 h-4 animate-spin-slow" />
                    Surf Website In-App
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/10 flex items-end p-2.5">
                  <span className="text-[9px] bg-slate-950/90 backdrop-blur-sm border border-white/10 text-white px-2 py-0.5 rounded font-bold">
                    IN-APP PREVIEW
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <h4 className="text-xs font-black text-white leading-snug tracking-tight truncate group-hover/cardlink:text-indigo-450 transition-colors">
                  {linkList[0].title}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium line-clamp-2">
                  {post.caption.split('#')[0].trim() || 'Tap to enter our sandboxed web voyager and explore.'}
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Action Button for single link */}
        {!isMultiLink && (
          <button
            onClick={() => openInAppBrowser(linkList[0].url)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[10px] transition-all cursor-pointer shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 uppercase tracking-wider z-10 shrink-0"
          >
            <span>Launch In-App Browser</span>
            <Globe className="w-3.5 h-3.5 animate-pulse" />
          </button>
        )}

        {/* ======================================================== */}
        {/* INTERACTIVE FULL-SCREEN IN-APP WEB SURFER BROWSER PORTAL */}
        {/* ======================================================== */}
        {showInAppBrowser && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-3 sm:p-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full h-full max-w-5xl flex flex-col overflow-hidden shadow-2xl relative">
              
              {/* Browser Status Info Bar */}
              <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-[10px] text-slate-400 font-mono select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-bold text-slate-350">Instaframe Sandboxed Web Voyager v1.1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-purple-900/30 text-purple-400 border border-purple-800/30 px-1.5 py-0.25 rounded">SSL Secure</span>
                  <span>LATENCY: 14ms</span>
                </div>
              </div>

              {/* Browser Controls Row */}
              <div className="bg-slate-900 p-3 flex flex-wrap items-center gap-2 border-b border-slate-800 select-none">
                
                {/* Back/Forward/Refresh Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleBrowserBack}
                    disabled={historyIndex <= 0}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
                    title="Back"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleBrowserForward}
                    disabled={historyIndex >= browserHistory.length - 1}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
                    title="Forward"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleBrowserRefresh}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all cursor-pointer"
                    title="Refresh page"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBrowserLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Address Bar */}
                <div className="flex-1 min-w-[200px] relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[9px] font-bold text-emerald-400 font-mono">https://</span>
                  </div>
                  
                  <input
                    type="text"
                    value={browserUrl.replace('https://', '').replace('http://', '')}
                    onChange={(e) => setBrowserUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        let finalUrl = browserUrl.trim();
                        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                          finalUrl = 'https://' + finalUrl;
                        }
                        handleBrowserNavigate(finalUrl);
                      }
                    }}
                    className="w-full bg-slate-950 pl-18 pr-20 py-2 rounded-xl text-xs font-mono text-white border border-slate-850 focus:border-indigo-500 outline-none transition-all"
                  />

                  {/* Secure Lock details & View selector */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <button 
                      onClick={() => setBrowserTab(browserTab === 'simulated' ? 'real' : 'simulated')}
                      className={`text-[9px] font-black uppercase px-2 py-1 rounded transition-colors ${
                        browserTab === 'simulated' 
                          ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                          : 'bg-slate-850 hover:bg-slate-750 text-slate-300'
                      }`}
                      title="Toggle Sandbox vs Iframe"
                    >
                      {browserTab === 'simulated' ? 'Sandbox Mode' : 'Iframe mode'}
                    </button>
                  </div>
                </div>

                {/* Exit Browser Button */}
                <button
                  onClick={() => setShowInAppBrowser(false)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wider"
                >
                  Exit Browser
                </button>
              </div>

              {/* BROWSER VIEWPORT FRAME */}
              <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
                
                {/* 1. Loader overlay */}
                {isBrowserLoading && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[20] flex flex-col items-center justify-center gap-2 select-none">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-300 tracking-widest font-mono">ESTABLISHING CRYPTO-VOYAGE TUNNEL...</span>
                  </div>
                )}

                {/* Browser Alert prompt */}
                {browserAlert && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 border-2 border-yellow-500 px-4 py-2.5 rounded-xl z-[30] text-xs font-black shadow-2xl flex items-center gap-2">
                    <span>{browserAlert}</span>
                    <button 
                      onClick={() => setBrowserAlert(null)}
                      className="bg-slate-950 text-white text-[10px] px-2 py-0.5 rounded uppercase"
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* 2. Content Display tabs */}
                {browserTab === 'real' ? (
                  // REAL WEB COMPONENT (IFRAME)
                  <div className="w-full h-full relative">
                    <iframe
                      src={browserUrl}
                      className="w-full h-full bg-white border-none"
                      title="Web Surfer viewport"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                    {/* Fallback floating note in case of X-Frame blocking */}
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-white/10 p-3 rounded-2xl text-[10px] text-slate-350 select-none flex items-center justify-between gap-3 backdrop-blur-md">
                      <span>⚠️ Note: If the website does not load, it has blocked iframe embedding. Click <strong>Sandbox Mode</strong> at top right for a fully interactive local copy!</span>
                      <button 
                        onClick={() => setBrowserTab('simulated')}
                        className="bg-indigo-600 text-white px-2 py-1 rounded uppercase font-bold shrink-0"
                      >
                        Launch Sandbox
                      </button>
                    </div>
                  </div>
                ) : (
                  // SIMULATED INTERACTIVE SANDBOX
                  <div className="w-full h-full overflow-y-auto bg-slate-900 text-slate-100 flex flex-col">
                    
                    {/* SIMULATION A: SEOUL CITY GUIDE */}
                    {browserUrl.includes('visitseoul') && (
                      <div className="p-4 sm:p-6 space-y-6 text-left max-w-4xl mx-auto w-full">
                        
                        {/* Header Banner */}
                        <div className="relative rounded-2xl overflow-hidden h-36 bg-gradient-to-r from-violet-600 via-indigo-700 to-purple-800 flex flex-col justify-end p-5 shadow-xl">
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/30 via-transparent to-transparent" />
                          <span className="bg-yellow-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded tracking-widest uppercase w-fit mb-1 shadow-md">
                            Official Travel Portal
                          </span>
                          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight uppercase tracking-tight">
                            Midnight Seoul City Guide & Explore Tab
                          </h1>
                          <p className="text-xs text-white/80 font-medium">Discover secret travel spots, historic temples, and neon night markets.</p>
                        </div>

                        {/* Category Selector Tabs */}
                        <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
                          {(['all', 'spots', 'food', 'neon'] as const).map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setSeoulSelectedCategory(cat)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                                seoulSelectedCategory === cat 
                                  ? 'bg-yellow-400 text-slate-950 font-black shadow-md' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {cat === 'all' && '🌍 All Highlights'}
                              {cat === 'spots' && '🏯 Secret Sights'}
                              {cat === 'food' && '🍜 Midnight Bites'}
                              {cat === 'neon' && '🌌 Cyberpunk Vibe'}
                            </button>
                          ))}
                        </div>

                        {/* Interactive Grid Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(seoulSelectedCategory === 'all' || seoulSelectedCategory === 'spots') && (
                            <div 
                              onClick={() => setBrowserAlert('🌟 Added "Bukchon Hanok Village" to your custom Travel Board!')}
                              className="bg-slate-850 rounded-2xl overflow-hidden border border-slate-800 hover:border-yellow-400/50 transition-all cursor-pointer group/spot shadow-lg"
                            >
                              <img src="https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=400&h=200&q=80" className="w-full h-32 object-cover group-hover/spot:scale-102 transition-transform duration-300" alt="Spot" />
                              <div className="p-4 space-y-1">
                                <span className="text-[9px] font-black text-violet-400 uppercase">Historic Heritage</span>
                                <h3 className="text-xs font-black text-white group-hover/spot:text-yellow-400 transition-colors">Bukchon Hanok Village</h3>
                                <p className="text-[10px] text-slate-400">Preserved 600-year-old wooden hanok neighborhood. Exquisite photo angles.</p>
                                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded font-mono font-black text-slate-500 inline-block mt-2">TAP TO SAVE SITE</span>
                              </div>
                            </div>
                          )}

                          {(seoulSelectedCategory === 'all' || seoulSelectedCategory === 'food') && (
                            <div 
                              onClick={() => setBrowserAlert('🍜 Reservation simulation activated for "Gwangjang Market Night Tour"!')}
                              className="bg-slate-850 rounded-2xl overflow-hidden border border-slate-800 hover:border-yellow-400/50 transition-all cursor-pointer group/spot shadow-lg"
                            >
                              <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&h=200&q=80" className="w-full h-32 object-cover group-hover/spot:scale-102 transition-transform duration-300" alt="Spot" />
                              <div className="p-4 space-y-1">
                                <span className="text-[9px] font-black text-amber-400 uppercase">Street Food Haven</span>
                                <h3 className="text-xs font-black text-white group-hover/spot:text-yellow-400 transition-colors">Gwangjang Market Street Eats</h3>
                                <p className="text-[10px] text-slate-400">Famous street food stalls serving fresh mung bean pancakes and hand-pulled noodles.</p>
                                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded font-mono font-black text-slate-500 inline-block mt-2">TAP TO BOOK SLIDE</span>
                              </div>
                            </div>
                          )}

                          {(seoulSelectedCategory === 'all' || seoulSelectedCategory === 'neon') && (
                            <div 
                              onClick={() => setBrowserAlert('🌌 Navigation map downloaded for "Dongdaemun Design Plaza"!')}
                              className="bg-slate-850 rounded-2xl overflow-hidden border border-slate-800 hover:border-yellow-400/50 transition-all cursor-pointer group/spot shadow-lg"
                            >
                              <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&h=200&q=80" className="w-full h-32 object-cover group-hover/spot:scale-102 transition-transform duration-300" alt="Spot" />
                              <div className="p-4 space-y-1">
                                <span className="text-[9px] font-black text-teal-400 uppercase">Architectural Wonder</span>
                                <h3 className="text-xs font-black text-white group-hover/spot:text-yellow-400 transition-colors">Dongdaemun Design Plaza (DDP)</h3>
                                <p className="text-[10px] text-slate-400">Ultra-brutalist neofuturistic curve curves structure, glow night walk guide.</p>
                                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded font-mono font-black text-slate-500 inline-block mt-2">TAP FOR MAP COORDINATES</span>
                              </div>
                            </div>
                          )}

                          {(seoulSelectedCategory === 'all' || seoulSelectedCategory === 'spots') && (
                            <div 
                              onClick={() => setBrowserAlert('🏰 Audio guide added for "Gyeongbokgung Temple At Twilight"!')}
                              className="bg-slate-850 rounded-2xl overflow-hidden border border-slate-800 hover:border-yellow-400/50 transition-all cursor-pointer group/spot shadow-lg"
                            >
                              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&h=200&q=80" className="w-full h-32 object-cover group-hover/spot:scale-102 transition-transform duration-300" alt="Spot" />
                              <div className="p-4 space-y-1">
                                <span className="text-[9px] font-black text-rose-400 uppercase">Dynasty Palace</span>
                                <h3 className="text-xs font-black text-white group-hover/spot:text-yellow-400 transition-colors">Gyeongbokgung Palace twilight</h3>
                                <p className="text-[10px] text-slate-400">Main royal palace from Choseon dynasty. Beautiful pavilion overlooking artificial lakes.</p>
                                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded font-mono font-black text-slate-500 inline-block mt-2">TAP TO DOWNLOAD AUDIO TOUR</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interactive feedback form */}
                        <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 text-left">
                          <h4 className="text-xs font-black text-white uppercase mb-2">📬 Ask our Local Virtual Tour Guide</h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type travel query (e.g. 'vegan restaurant in Mapo' or 'metro card guide')"
                              className="flex-1 bg-slate-950 px-3 py-2 border border-slate-800 focus:border-yellow-400 text-xs rounded-xl outline-none"
                              value={simulatedSearchQuery}
                              onChange={(e) => setSimulatedSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setBrowserAlert(`💡 Guide Recommendation: For "${simulatedSearchQuery}", we highly suggest checking our specialized Hanok district culinary map. We sent detailed locations to your device log!`);
                                  setSimulatedSearchQuery('');
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                setBrowserAlert(`💡 Guide Recommendation: For "${simulatedSearchQuery}", we highly suggest checking our specialized Hanok district culinary map. We sent detailed locations to your device log!`);
                                setSimulatedSearchQuery('');
                              }}
                              className="px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl uppercase shrink-0 cursor-pointer"
                            >
                              Search
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SIMULATION B: GOOGLE AI STUDIO BUILD ENVIRONMENT */}
                    {browserUrl.includes('ai.studio') && (
                      <div className="p-4 sm:p-5 flex flex-col h-full text-left font-sans bg-slate-950">
                        <div className="border border-slate-800 rounded-3xl overflow-hidden flex flex-col flex-1 bg-slate-900 min-h-[450px]">
                          
                          {/* Workspace header */}
                          <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center select-none shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                              <span className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                Google AI Studio Build - Interactive Playground
                              </span>
                            </div>
                            <span className="bg-indigo-900/40 text-indigo-400 border border-indigo-800/40 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                              DEVELOPER SHELL ACTIVE
                            </span>
                          </div>

                          {/* Split screen content */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden h-full">
                            
                            {/* Prompt/Inputs Column */}
                            <div className="p-4 border-r border-slate-800 space-y-4 flex flex-col overflow-y-auto">
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1.5">1. Describe what you want to construct</h4>
                                <p className="text-[10px] text-slate-400 font-medium mb-3">AI Studio Build will generate high-quality React structures with instant layout compile feedback.</p>
                                <textarea
                                  value={aiStudioPrompt}
                                  onChange={(e) => setAiStudioPrompt(e.target.value)}
                                  rows={4}
                                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl p-3.5 text-xs font-semibold focus:border-purple-500 outline-none resize-none"
                                  placeholder="Type coding instructions..."
                                />
                              </div>

                              <div>
                                <span className="block text-[10px] font-black uppercase text-slate-400 mb-2">Quick Prompt suggestions:</span>
                                <div className="space-y-1.5">
                                  {[
                                    'Build an elegant audio track visualizer loop',
                                    'Create a responsive table matrix with CSV search filter',
                                    'Make a retro terminal shell component'
                                  ].map((prompt, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setAiStudioPrompt(prompt)}
                                      className="w-full text-left text-[10px] p-2 bg-slate-950 hover:bg-slate-950/70 border border-slate-850 rounded-xl font-medium truncate block cursor-pointer transition-colors hover:border-purple-500/30"
                                    >
                                      ✨ "{prompt}"
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="pt-2">
                                <button
                                  onClick={handleTriggerAiStudioBuild}
                                  disabled={aiStudioStatus === 'generating'}
                                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer shadow-lg hover:scale-[1.01]"
                                >
                                  {aiStudioStatus === 'generating' ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span>COMPILING Blueprints...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Terminal className="w-4 h-4 text-purple-300" />
                                      <span>RUN BUILD SYSTEM</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Response Code/Terminal Column */}
                            <div className="bg-slate-950 p-4 flex flex-col font-mono overflow-hidden">
                              <div className="flex justify-between items-center mb-2 shrink-0 select-none">
                                <span className="text-[10px] text-slate-500 font-bold tracking-widest flex items-center gap-1 uppercase">
                                  <Code className="w-3.5 h-3.5 text-indigo-400" />
                                  Active File: /src/components/OutputView.tsx
                                </span>
                                {aiStudioStatus === 'done' && (
                                  <button
                                    onClick={() => {
                                      copyDocToClipboard(aiStudioResponse);
                                      setBrowserAlert('📋 Code snippet copied to clipboard! You can paste this code directly into your custom post.');
                                    }}
                                    className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    Copy snippet
                                  </button>
                                )}
                              </div>

                              {/* Code Textbox Area */}
                              <div className="flex-1 overflow-auto bg-slate-900/50 rounded-2xl border border-slate-850 p-3 text-[10px] leading-relaxed text-slate-300 select-text text-left">
                                {aiStudioResponse ? (
                                  <pre className="whitespace-pre-wrap">{aiStudioResponse}</pre>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-sans p-6">
                                    <Terminal className="w-10 h-10 mb-2 text-slate-700 animate-pulse" />
                                    <span className="text-xs font-black uppercase text-slate-400">Terminal Shell Idle</span>
                                    <p className="text-[10px] text-slate-500 max-w-[200px] mt-1">Specify instructions and run the build system on left to stream React structures.</p>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    )}

                    {/* SIMULATION C: UNSPLASH DIRECTORY */}
                    {browserUrl.includes('unsplash') && (
                      <div className="p-4 sm:p-6 space-y-6 text-left max-w-4xl mx-auto w-full font-sans">
                        
                        {/* Search and Tabs */}
                        <div className="space-y-4">
                          <div className="text-center">
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">📷 Unsplash Photography Stock</h2>
                            <p className="text-[10px] text-slate-400 font-medium">Browse and select copyright-free high-fidelity visuals instantly.</p>
                          </div>

                          <div className="flex gap-2 justify-center">
                            {(['nature', 'cyberpunk', 'minimalist'] as const).map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setUnsplashCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  unsplashCategory === cat
                                    ? 'bg-purple-650 text-white shadow-md'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                                }`}
                              >
                                {cat} Collection
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Visual Masonry Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {unsplashCategory === 'nature' && [
                            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1472214222541-d510753a49fa?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80'
                          ].map((src, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                setBrowserAlert(`🎨 Copied image URL! You can paste this photo link in your custom carousel creator.`);
                                navigator.clipboard.writeText(src);
                              }}
                              className="relative rounded-2xl overflow-hidden aspect-square border border-slate-800 hover:border-purple-500 cursor-pointer group/photo shadow-md"
                            >
                              <img src={src} className="w-full h-full object-cover group-hover/photo:scale-102 transition-transform duration-300" alt="Unsplash" />
                              <div className="absolute inset-0 bg-black/40 flex items-end justify-between p-2 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                <span className="text-[9px] font-black text-white uppercase uppercase">Tap to Copy</span>
                                <Download className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          ))}

                          {unsplashCategory === 'cyberpunk' && [
                            'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80'
                          ].map((src, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                setBrowserAlert(`🎨 Copied image URL! You can paste this photo link in your custom carousel creator.`);
                                navigator.clipboard.writeText(src);
                              }}
                              className="relative rounded-2xl overflow-hidden aspect-square border border-slate-800 hover:border-purple-500 cursor-pointer group/photo shadow-md"
                            >
                              <img src={src} className="w-full h-full object-cover group-hover/photo:scale-102 transition-transform duration-300" alt="Unsplash" />
                              <div className="absolute inset-0 bg-black/40 flex items-end justify-between p-2 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                <span className="text-[9px] font-black text-white uppercase uppercase">Tap to Copy</span>
                                <Download className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          ))}

                          {unsplashCategory === 'minimalist' && [
                            'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=400&q=80'
                          ].map((src, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                setBrowserAlert(`🎨 Copied image URL! You can paste this photo link in your custom carousel creator.`);
                                navigator.clipboard.writeText(src);
                              }}
                              className="relative rounded-2xl overflow-hidden aspect-square border border-slate-800 hover:border-purple-500 cursor-pointer group/photo shadow-md"
                            >
                              <img src={src} className="w-full h-full object-cover group-hover/photo:scale-102 transition-transform duration-300" alt="Unsplash" />
                              <div className="absolute inset-0 bg-black/40 flex items-end justify-between p-2 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                <span className="text-[9px] font-black text-white uppercase uppercase">Tap to Copy</span>
                                <Download className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* D: GENERIC CYBER-BROWSER CRAWLER / CRAWLER PORTAL */}
                    {!browserUrl.includes('visitseoul') && !browserUrl.includes('ai.studio') && !browserUrl.includes('unsplash') && (
                      <div className="p-5 space-y-5 text-left max-w-xl mx-auto w-full font-sans select-none">
                        <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 text-center space-y-4 shadow-xl">
                          <Globe className="w-12 h-12 text-indigo-500 mx-auto animate-pulse" />
                          <div className="space-y-1.5">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Browsing: {browserUrl.replace('https://', '')}</h3>
                            <p className="text-[11px] text-slate-400">This address is active within the sandboxed proxy crawler. Below is a secure responsive page digest mapped directly from current DNS metadata records:</p>
                          </div>

                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-left space-y-2.5 font-mono text-[10px]">
                            <div className="flex justify-between border-b border-slate-900 pb-1.5 text-slate-500">
                              <span>HOST DOMAIN REPLICAS</span>
                              <span className="text-indigo-400">DNS SECURE</span>
                            </div>
                            <p className="text-slate-350 leading-relaxed">The requested node is a web directory offering full integration with custom APIs. You can surf, trigger links, search directories, and download documents natively inside this platform shell.</p>
                            <div className="pt-2 flex justify-between items-center text-slate-500">
                              <span>REGISTRY CLASSIFICATION: WEB_RESOURCE</span>
                              <span>TTL: 3600s</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setBrowserAlert(`🚀 Secure Sandbox Triggered! Successfully mapped dynamic pathways for ${browserUrl}.`);
                              }}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-lg cursor-pointer transition-all"
                            >
                              Authorize Root Certificate
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Browser footer navigation metrics */}
              <div className="bg-slate-950 border-t border-slate-850 px-5 py-2.5 flex justify-between items-center text-[9px] font-mono text-slate-500 select-none">
                <span>ACTIVE CONNECTIONS: 3 SECURE TUNNELS</span>
                <span className="flex items-center gap-1.5 uppercase">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  SANDBOX SECURITY LOCK: SHIELD ON
                </span>
              </div>

            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. IN-APP DOCUMENT RENDERING (TXT, CSV, PDF)
  if (mediaType === 'document' && documentList.length > 0) {
    const isMultiDoc = documentList.length > 1;
    const fileType = currentDoc.fileType || 'txt';
    const content = currentDoc.content || '';

    // CSV Parsing Logic
    let csvRows: string[][] = [];
    if (fileType === 'csv') {
      csvRows = content.split('\n').filter(row => row.trim() !== '').map(row => row.split(','));
    }
    const csvHeaders = csvRows[0] || [];
    const csvDataRows = csvRows.slice(1) || [];

    // Filter CSV rows by docSearchQuery if present
    const filteredCsvDataRows = docSearchQuery 
      ? csvDataRows.filter(row => row.some(cell => cell.toLowerCase().includes(docSearchQuery.toLowerCase())))
      : csvDataRows;

    return (
      <div 
        className={`relative w-full h-full flex flex-col justify-between select-none overflow-hidden text-left transition-all duration-300 p-4 ${
          docTheme === 'dark' 
            ? 'bg-zinc-950 text-zinc-100' 
            : docTheme === 'sepia' 
            ? 'bg-[#f4ecd8] text-[#433422] border-[#e4dcb8]' 
            : 'bg-stone-50 text-slate-800'
        }`}
      >
        {/* Top Tag and Multi Document Navigator */}
        <div className="w-full flex justify-between items-center shrink-0 border-b pb-2 border-dashed border-slate-305">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-lg ${docTheme === 'dark' ? 'bg-purple-950/40 border border-purple-900/40 text-purple-400' : 'bg-purple-100 border border-purple-200 text-purple-700'}`}>
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className={`text-[9px] uppercase font-black block tracking-widest ${docTheme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>
                {isMultiDoc ? `Doc ${currentDocIndex + 1} of ${documentList.length}` : `${fileType.toUpperCase()} file`}
              </span>
              <span className="text-[10px] font-bold block max-w-[150px] truncate">{currentDoc.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Font Size controls */}
            <button 
              onClick={() => setDocFontSize(prev => Math.max(8, prev - 1))}
              className={`p-1.5 rounded-lg border text-[10px] font-bold ${
                docTheme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-slate-200 hover:bg-slate-100'
              }`}
              title="Zoom Out font"
            >
              A-
            </button>
            <button 
              onClick={() => setDocFontSize(prev => Math.min(20, prev + 1))}
              className={`p-1.5 rounded-lg border text-[10px] font-bold ${
                docTheme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-slate-200 hover:bg-slate-100'
              }`}
              title="Zoom In font"
            >
              A+
            </button>

            {/* Reading theme togglers */}
            <div className="flex rounded-lg border overflow-hidden">
              {(['light', 'sepia', 'dark'] as const).map(theme => (
                <button
                  key={theme}
                  onClick={() => setDocTheme(theme)}
                  className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider transition-colors ${
                    docTheme === theme 
                      ? 'bg-purple-650 text-white' 
                      : docTheme === 'dark'
                      ? 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400'
                      : 'bg-white hover:bg-stone-100 text-slate-500'
                  }`}
                >
                  {theme[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content body with custom search filtering inside card */}
        <div className="flex-1 my-3 overflow-auto relative rounded-xl border border-white/5 bg-black/5 p-3 font-mono">
          
          {/* CSV File tabular layout */}
          {fileType === 'csv' ? (
            <div className="min-w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] font-mono select-text">
                <thead>
                  <tr className={`border-b ${docTheme === 'dark' ? 'border-zinc-800 text-purple-400' : 'border-slate-200 text-purple-800'}`}>
                    {csvHeaders.map((head, idx) => (
                      <th key={idx} className="p-2 font-black uppercase tracking-wider whitespace-nowrap">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCsvDataRows.map((row, rIdx) => (
                    <tr 
                      key={rIdx} 
                      className={`border-b transition-colors ${
                        docTheme === 'dark' 
                          ? 'border-zinc-900 hover:bg-zinc-900/50 text-zinc-350' 
                          : 'border-slate-100 hover:bg-slate-100/50 text-slate-700'
                      }`}
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 whitespace-nowrap">
                          {docSearchQuery ? (
                            <mark className="bg-yellow-300 text-slate-950 font-bold px-0.5 rounded-sm">
                              {cell}
                            </mark>
                          ) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredCsvDataRows.length === 0 && (
                    <tr>
                      <td colSpan={csvHeaders.length} className="text-center p-6 text-slate-400">
                        No rows matching your search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Plain TXT or PDF simulated markdown layout
            <div 
              style={{ fontSize: `${docFontSize}px` }}
              className="select-text whitespace-pre-wrap leading-relaxed transition-all"
            >
              {highlightContent(content, docSearchQuery)}
            </div>
          )}
        </div>

        {/* Dynamic Micro Search bar inside Card */}
        <div className="mt-auto shrink-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${docTheme === 'dark' ? 'text-zinc-600' : 'text-slate-400'}`}>
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder={`Search inside file...`}
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none border transition-all ${
                  docTheme === 'dark' 
                    ? 'bg-zinc-900 border-zinc-800 text-white focus:border-purple-500' 
                    : 'bg-white border-slate-200 text-slate-800 focus:border-purple-600'
                }`}
              />
            </div>

            {/* Copy file option */}
            <button
              onClick={() => copyDocToClipboard(content)}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-black ${
                docTheme === 'dark'
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-350 hover:bg-zinc-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Copy text content"
            >
              {isDocCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-purple-500" />
              )}
              <span className="hidden sm:inline">{isDocCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Playlist navigation bottom footer bar */}
          {isMultiDoc && (
            <div className="flex items-center justify-between border-t border-dashed pt-2.5 border-slate-350">
              <button
                onClick={handlePrevDoc}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition-all ${
                  docTheme === 'dark' ? 'bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-slate-200/60 text-slate-650 hover:bg-slate-200'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous file
              </button>

              <div className="flex gap-1">
                {documentList.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentDocIndex(idx);
                      setDocSearchQuery('');
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                      currentDocIndex === idx ? 'bg-purple-500 scale-125' : 'bg-slate-400/50 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNextDoc}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition-all ${
                  docTheme === 'dark' ? 'bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-slate-200/60 text-slate-650 hover:bg-slate-200'
                }`}
              >
                Next file
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4.5 TEXT-ONLY POST RENDERING
  if (mediaType === 'text') {
    const gradient = post.textGradient || 'cosmic';
    const font = post.textFont || 'sans';
    const alignment = post.textAlign || 'center';
    const fontSize = post.textFontSize || 'base';

    const getBgClass = () => {
      switch (gradient) {
        case 'sunset': return 'bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 text-white';
        case 'ocean': return 'bg-gradient-to-tr from-blue-600 via-cyan-500 to-sky-400 text-white';
        case 'emerald': return 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white';
        case 'cyberpunk': return 'bg-gradient-to-tr from-fuchsia-600 to-pink-500 text-white';
        case 'neon': return 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white';
        case 'clean': return 'bg-slate-50 border border-slate-200 text-slate-800';
        case 'cosmic':
        default: return 'bg-gradient-to-tr from-purple-950 via-indigo-900 to-slate-950 text-white';
      }
    };

    const getFontClass = () => {
      switch (font) {
        case 'serif': return 'font-serif';
        case 'mono': return 'font-mono';
        case 'sans':
        default: return 'font-sans';
      }
    };

    const getAlignClass = () => {
      switch (alignment) {
        case 'left': return 'text-left';
        case 'right': return 'text-right';
        case 'center':
        default: return 'text-center';
      }
    };

    const getFontSizeClass = () => {
      switch (fontSize) {
        case 'sm': return 'text-sm';
        case 'lg': return 'text-lg md:text-xl';
        case 'xl': return 'text-xl md:text-2xl font-extrabold';
        case 'base':
        default: return 'text-base md:text-lg';
      }
    };

    return (
      <div className={`w-full h-full min-h-[300px] flex flex-col justify-between p-6 md:p-8 relative overflow-hidden ${getBgClass()} ${getFontClass()}`}>
        {/* Decorative corner glow */}
        {gradient !== 'clean' && (
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        )}
        
        {/* Header containing Twitter-like layout */}
        <div className="flex items-center gap-3 relative z-10 border-b border-white/10 pb-3 mb-4">
          <img 
            src={post.userAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.username}`} 
            alt={post.username} 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full border border-white/20 object-cover"
          />
          <div className="text-left">
            <p className={`text-xs font-bold ${gradient === 'clean' ? 'text-slate-800' : 'text-white'}`}>@{post.username}</p>
            <p className={`text-[10px] ${gradient === 'clean' ? 'text-slate-400' : 'text-white/60'}`}>{post.createdAt || 'Just now'}</p>
          </div>
          <span className="ml-auto text-xs opacity-60">✍️ Thought</span>
        </div>

        {/* Content area */}
        <div className={`flex-1 flex items-center justify-center py-4 relative z-10 overflow-y-auto ${getAlignClass()} ${getFontSizeClass()} leading-relaxed break-words max-h-[360px]`}>
          <div 
            dangerouslySetInnerHTML={{ __html: post.caption }} 
            className="w-full"
          />
        </div>

        {/* Footer info/attribution */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] opacity-60 relative z-10">
          <span>Instaframe Tweet</span>
          <span>{post.caption.replace(/<[^>]*>/g, '').length} chars</span>
        </div>
      </div>
    );
  }

  // 5. IMAGE RENDERING
  if (mediaType === 'image') {
    const isCarousel = imageList.length > 1;
    const activeImage = imageList[currentImageIndex] || post.imageUrl || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&h=600&q=80';

    return (
      <div className="relative w-full h-full bg-slate-100 flex items-center justify-center group/carousel overflow-hidden">
        {/* Main Image */}
        <img
          src={activeImage}
          alt={post.caption}
          referrerPolicy="no-referrer"
          className={className}
        />

        {/* Overlay Navigation Arrows */}
        {isCarousel && (
          <>
            {/* Carousel Index Pill Indicator */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white/95 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full z-10 flex items-center gap-1 shadow-md">
              <ImageIcon className="w-3 h-3 text-purple-400" />
              <span>{currentImageIndex + 1} / {imageList.length}</span>
            </div>

            {/* Left Control Arrow */}
            <button
              onClick={handlePrevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all opacity-100 sm:opacity-0 group-hover/carousel:opacity-100 backdrop-blur-sm z-10 cursor-pointer shadow-lg"
              title="Previous Photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Right Control Arrow */}
            <button
              onClick={handleNextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all opacity-100 sm:opacity-0 group-hover/carousel:opacity-100 backdrop-blur-sm z-10 cursor-pointer shadow-lg"
              title="Next Photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Bottom dot indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/5 flex gap-1.5 z-10">
              {imageList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                    currentImageIndex === idx ? 'bg-purple-500 scale-125' : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Pure Fallback
  return (
    <img
      src={post.imageUrl}
      alt={post.caption}
      referrerPolicy="no-referrer"
      className={className}
    />
  );
}
