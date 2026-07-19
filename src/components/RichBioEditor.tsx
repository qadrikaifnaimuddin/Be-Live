import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Type, 
  Palette, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Sparkles, 
  Code, 
  Eye, 
  Trash2, 
  Check,
  Undo,
  Heading,
  Smile,
  Copy,
  ChevronDown
} from 'lucide-react';

interface RichBioEditorProps {
  value: string;
  onChange: (html: string) => void;
  maxLength?: number;
}

// Elegant font choices mapping
const BIO_FONTS = [
  { name: 'Modern Sans', family: '"Inter", sans-serif' },
  { name: 'Editorial Serif', family: '"Playfair Display", serif, Georgia' },
  { name: 'Tech Mono', family: '"JetBrains Mono", monospace, monospace' },
  { name: 'Elegant Script', family: '"Pacifico", cursive, "Brush Script MT", cursive' },
  { name: 'Futuristic Display', family: '"Space Grotesk", sans-serif' },
];

// Rich, trendy color presets matching luxury, creative, and vibrant vibes
const BIO_COLORS = [
  { name: 'Ink Dark', value: '#1E293B' },
  { name: 'Amethyst', value: '#8B5CF6' },
  { name: 'Rose Gold', value: '#FDA4AF' },
  { name: 'Sunset Crimson', value: '#E11D48' },
  { name: 'Cyber Neon Blue', value: '#3B82F6' },
  { name: 'Emerald Mint', value: '#059669' },
  { name: 'Imperial Gold', value: '#D97706' },
  { name: 'Hot Magenta', value: '#D946EF' },
];

// Fun formatting templates to auto-populate creative bios
const BIO_PRESETS = [
  {
    name: '✨ Aesthetic Creator',
    html: `<div style="text-align: center;"><font face="&quot;Pacifico&quot;, cursive, &quot;Brush Script MT&quot;, cursive" color="#d946ef"><b>Dreamer &amp; Visual Maker</b></font></div><div style="text-align: center;"><font face="&quot;Playfair Display&quot;, serif, Georgia" size="2"><i>Capturing raw moments &amp; digital art</i></font></div><div style="text-align: center;"><font color="#8b5cf6" size="2">📍 Based in Tokyo | 💌 DM for Collabs</font></div>`
  },
  {
    name: '💻 Tech Innovator',
    html: `<div><font face="&quot;Space Grotesk&quot;, sans-serif" color="#3b82f6"><b>🚀 Code. Create. Disrupt.</b></font></div><div><font face="&quot;JetBrains Mono&quot;, monospace, monospace" size="2"><i>Fullstack Architect &amp; AI Evangelist</i></font></div><div><font size="2" color="#1e293b">⚡ Building the decentralized future with coffee ☕</font></div>`
  },
  {
    name: '📸 Travel & Lens',
    html: `<div><font face="&quot;Playfair Display&quot;, serif, Georgia" color="#d97706"><b>🗺️ Wandering the globe with a 35mm lens</b></font></div><div><font size="2">Currently chasing sunsets in <u>Southern Italy</u> 🇮🇹</font></div><div><font size="2" color="#059669"><i>"Not all those who wander are lost."</i></font></div>`
  },
  {
    name: '⚡ Minimal Sparkle',
    html: `<div style="text-align: center;"><font face="&quot;Space Grotesk&quot;, sans-serif" size="4"><b>💫 SIMPLICITY</b></font></div><div style="text-align: center;"><font size="2" color="#e11d48"><i>Less is always more.</i></font></div>`
  }
];

export default function RichBioEditor({ value, onChange, maxLength = 300 }: RichBioEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isCodeView, setIsCodeView] = useState(false);
  const [editorHtml, setEditorHtml] = useState(value || '');
  const [activeFont, setActiveFont] = useState(BIO_FONTS[0].name);
  const [activeColor, setActiveColor] = useState(BIO_COLORS[0].value);
  const [charCount, setCharCount] = useState(0);
  const [showPresets, setShowPresets] = useState(false);

  // Synchronize initial value from parent on mount
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
      updateStats();
    }
  }, []);

  const updateStats = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    setCharCount(text.length);
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setEditorHtml(html);
    onChange(html);
    updateStats();
  };

  // Run rich text editing command using standard Range/Selection APIs
  const executeCommand = (command: string, arg: string = '') => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      // Fallback for compatibility/collapsed cursor
      try {
        document.execCommand(command, false, arg);
      } catch (err) {
        console.warn('[RichBioEditor] execCommand failed:', err);
      }
      handleEditorInput();
      if (editorRef.current) {
        editorRef.current.focus();
      }
      return;
    }

    const range = selection.getRangeAt(0);

    const toggleStyleNode = (tagName: string) => {
      let parent: HTMLElement | null = range.commonAncestorContainer as HTMLElement;
      if (parent.nodeType === Node.TEXT_NODE) {
        parent = parent.parentElement;
      }
      
      const isStyled = parent && (parent.tagName.toLowerCase() === tagName || parent.closest(tagName));
      
      if (isStyled) {
        const styledNode = (parent.tagName.toLowerCase() === tagName ? parent : parent.closest(tagName)) as HTMLElement;
        if (styledNode && styledNode.parentNode) {
          const fragment = document.createDocumentFragment();
          while (styledNode.firstChild) {
            fragment.appendChild(styledNode.firstChild);
          }
          styledNode.parentNode.replaceChild(fragment, styledNode);
        }
      } else {
        const wrapper = document.createElement(tagName);
        try {
          range.surroundContents(wrapper);
        } catch {
          const content = range.extractContents();
          wrapper.appendChild(content);
          range.insertNode(wrapper);
        }
      }
    };

    const applySpanStyle = (styles: Record<string, string>) => {
      const span = document.createElement('span');
      Object.assign(span.style, styles);
      try {
        range.surroundContents(span);
      } catch {
        const content = range.extractContents();
        span.appendChild(content);
        range.insertNode(span);
      }
    };

    try {
      if (command === 'bold') {
        toggleStyleNode('strong');
      } else if (command === 'italic') {
        toggleStyleNode('em');
      } else if (command === 'underline') {
        toggleStyleNode('u');
      } else if (command === 'strikeThrough') {
        toggleStyleNode('s');
      } else if (command === 'fontName') {
        applySpanStyle({ fontFamily: arg });
      } else if (command === 'foreColor') {
        applySpanStyle({ color: arg });
      } else if (command === 'fontSize') {
        const sizeMap: Record<string, string> = {
          '1': '0.75rem',
          '2': '0.875rem',
          '3': '1rem',
          '4': '1.125rem',
          '5': '1.25rem',
          '6': '1.5rem',
          '7': '1.875rem',
        };
        applySpanStyle({ fontSize: sizeMap[arg] || '1rem' });
      } else {
        document.execCommand(command, false, arg);
      }
    } catch (e) {
      console.warn('[RichBioEditor] execCommand fallback due to error:', e);
      try {
        document.execCommand(command, false, arg);
      } catch (err) {
        console.warn('[RichBioEditor] execCommand fallback failed:', err);
      }
    }

    handleEditorInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const applyFont = (fontFamily: string, fontName: string) => {
    executeCommand('fontName', fontFamily);
    setActiveFont(fontName);
  };

  const applyColor = (colorHex: string) => {
    executeCommand('foreColor', colorHex);
    setActiveColor(colorHex);
  };

  const applyFontSize = (sizeVal: string) => {
    executeCommand('fontSize', sizeVal); // Native size scale 1-7
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(text));
    selection.collapseToEnd();
    handleEditorInput();
  };

  const loadPreset = (presetHtml: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = presetHtml;
      setEditorHtml(presetHtml);
      onChange(presetHtml);
      updateStats();
      setShowPresets(false);
    }
  };

  const clearEditor = () => {
    if (window.confirm("Clear all text formatting and start fresh?")) {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        setEditorHtml('');
        onChange('');
        updateStats();
      }
    }
  };

  return (
    <div className="border border-stone-850 rounded-xl overflow-hidden bg-stone-950/40 flex flex-col focus-within:border-[#C4B99D] focus-within:shadow-[0_0_15px_rgba(196,185,157,0.15)] transition-all text-left">
      {/* ====== EDITOR ACTIONS BAR ====== */}
      <div className="bg-stone-900/80 border-b border-stone-850 px-2 py-1.5 flex flex-wrap items-center justify-between gap-1 z-10">
        
        {/* Style Buttons group */}
        <div className="flex items-center gap-0.5 bg-stone-950/50 p-0.5 rounded-lg border border-stone-850/60">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1 hover:bg-stone-850 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
            title="Bold"
          >
            <Bold className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1 hover:bg-stone-850 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
            title="Italic"
          >
            <Italic className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1 hover:bg-stone-850 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
            title="Underline"
          >
            <Underline className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            className="p-1 hover:bg-stone-850 text-stone-400 hover:text-white rounded transition-colors cursor-pointer flex items-center justify-center font-bold text-[10px]"
            title="Strikethrough"
          >
            <span className="line-through">S</span>
          </button>
        </div>

        {/* Alignment Buttons */}
        <div className="flex items-center gap-0.5 bg-stone-950/50 p-0.5 rounded-lg border border-stone-850/60">
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1 hover:bg-stone-850 text-stone-400 rounded transition-colors cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1 hover:bg-stone-850 text-stone-400 rounded transition-colors cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1 hover:bg-stone-850 text-stone-400 rounded transition-colors cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="w-3 h-3" />
          </button>
        </div>

        {/* Font Size Button scale dropdown */}
        <div className="flex items-center gap-0.5 bg-stone-950/50 px-1 py-0.5 rounded-lg border border-stone-850/60">
          <button
            type="button"
            onClick={() => applyFontSize('2')}
            className="px-1 py-0.5 hover:bg-stone-850 text-[9px] font-bold text-stone-400 rounded cursor-pointer"
            title="Small font size"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => applyFontSize('3')}
            className="px-1 py-0.5 hover:bg-stone-850 text-[10px] font-bold text-stone-400 rounded cursor-pointer"
            title="Normal font size"
          >
            M
          </button>
          <button
            type="button"
            onClick={() => applyFontSize('4')}
            className="px-1 py-0.5 hover:bg-stone-850 text-[11px] font-bold text-stone-400 rounded cursor-pointer"
            title="Large font size"
          >
            L
          </button>
        </div>

        {/* Clear & Preview Toggles */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="px-1.5 py-0.5 bg-gradient-to-tr from-amber-400 to-[#C4B99D] text-stone-950 font-extrabold text-[8px] rounded tracking-wider uppercase transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer"
          >
            <Sparkles className="w-2.5 h-2.5 text-stone-950 fill-stone-950" />
            <span>Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCodeView(!isCodeView)}
            className={`p-1 border rounded transition-all cursor-pointer ${
              isCodeView 
                ? 'bg-stone-900 border-stone-800 text-[#C4B99D] shadow-inner' 
                : 'bg-stone-950 border-stone-850 text-stone-400 hover:text-white'
            }`}
            title={isCodeView ? "Switch to Visual Editor" : "Switch to Raw HTML Mode"}
          >
            {isCodeView ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={clearEditor}
            className="p-1 bg-stone-950 hover:bg-rose-950/20 border border-stone-850 hover:border-rose-900/30 text-stone-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
            title="Clear formatting & text"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* ====== STYLE TOOLS PANEL ====== */}
      <div className="bg-stone-900/60 px-2 py-1.5 border-b border-stone-850 flex flex-wrap gap-3 items-center justify-start text-[10px] text-stone-400">
        {/* Font Family selector list */}
        <div className="flex items-center gap-1">
          <span className="font-bold uppercase tracking-wider text-[8px] text-stone-500">Font:</span>
          <div className="flex gap-0.5">
            {BIO_FONTS.slice(0, 4).map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => applyFont(f.family, f.name)}
                style={{ fontFamily: f.family }}
                className={`px-1.5 py-0.5 border rounded text-[9px] cursor-pointer transition-all ${
                  activeFont === f.name 
                    ? 'border-[#C4B99D] bg-stone-850 text-white shadow-2xs font-bold' 
                    : 'border-stone-850 bg-stone-950/40 text-stone-400 hover:text-white'
                }`}
              >
                {f.name.replace('Editorial ', '').replace('Modern ', '').replace('Elegant ', '').replace('Tech ', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Color presets list */}
        <div className="flex items-center gap-1">
          <span className="font-bold uppercase tracking-wider text-[8px] text-stone-500">Color:</span>
          <div className="flex gap-0.5 items-center">
            {BIO_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => applyColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-3 h-3 rounded-full cursor-pointer transition-transform relative hover:scale-115 ${
                  activeColor === c.value ? 'ring-1 ring-[#C4B99D] scale-110' : 'ring-1 ring-black/30'
                }`}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Presets dropdown overlay panel */}
      {showPresets && (
        <div className="bg-stone-900 border-b border-stone-850 p-2 text-left grid grid-cols-2 gap-1.5 animate-fade-in z-20">
          <div className="col-span-2 flex justify-between items-center mb-0.5 border-b border-stone-850 pb-1">
            <span className="text-[9px] font-bold text-[#C4B99D] uppercase tracking-widest flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 fill-[#C4B99D] text-[#C4B99D]" /> Choose a bio template
            </span>
            <button 
              type="button" 
              onClick={() => setShowPresets(false)}
              className="text-[9px] text-stone-500 hover:text-[#C4B99D] font-extrabold uppercase"
            >
              Close
            </button>
          </div>
          {BIO_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => loadPreset(p.html)}
              className="p-1.5 bg-stone-950 hover:bg-stone-850 border border-stone-850/60 hover:border-[#C4B99D]/60 rounded-lg transition-all text-left shadow-2xs cursor-pointer group"
            >
              <h5 className="font-extrabold text-[10px] text-stone-300 group-hover:text-[#C4B99D] mb-0.5">{p.name}</h5>
              <p className="text-[8px] text-stone-500 truncate">Quick install layout</p>
            </button>
          ))}
        </div>
      )}

      {/* ====== TEXTAREA/EDITOR BODY ====== */}
      <div className="relative bg-stone-950/80">
        {isCodeView ? (
          <textarea
            value={editorHtml}
            onChange={(e) => {
              setEditorHtml(e.target.value);
              onChange(e.target.value);
              const tempText = e.target.value.replace(/<[^>]*>/g, '');
              setCharCount(tempText.length);
            }}
            className="w-full h-20 p-3 font-mono text-[11px] bg-stone-950 text-emerald-400 outline-none resize-none border-none leading-relaxed"
            placeholder="Edit Raw HTML bio code here..."
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            onPaste={handlePaste}
            className="w-full min-h-[64px] h-20 max-h-24 overflow-y-auto p-3 text-stone-350 text-xs outline-none leading-normal placeholder-stone-500 transition-all text-left"
            style={{ minHeight: '64px' }}
          />
        )}

        {/* Inline editor placeholder text when empty */}
        {!isCodeView && !editorHtml.trim() && (
          <div className="absolute inset-y-0 inset-x-0 p-3 pointer-events-none text-stone-600 text-xs italic text-left">
            Write your luxury bio... Use the visual styling bar above to design!
          </div>
        )}
      </div>

      {/* ====== FOOTER METRICS BAR ====== */}
      <div className="bg-stone-900 border-t border-stone-850 px-3 py-1 flex justify-between items-center text-[9px] text-stone-500">
        <div className="flex items-center gap-0.5 text-stone-605">
          <Smile className="w-2.5 h-2.5 text-stone-600" />
          <span>Supports HTML formatting</span>
        </div>
        <div className="font-bold">
          <span className={charCount > maxLength ? 'text-rose-500' : 'text-stone-400'}>
            {charCount}
          </span>
          <span className="text-stone-600"> / {maxLength}</span>
        </div>
      </div>
    </div>
  );
}
