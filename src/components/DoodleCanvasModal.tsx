import React, { useState, useRef } from 'react';
import { Palette, X, Eraser, Undo2 } from 'lucide-react';

interface DoodleCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendDoodle: (blob: Blob) => void;
}

export function DoodleCanvasModal({ isOpen, onClose, onSendDoodle }: DoodleCanvasModalProps) {
  const [doodleColor, setDoodleColor] = useState('#8B5CF6');
  const [isErasing, setIsErasing] = useState(false);
  const [doodleBrushSize] = useState(5);
  const [doodleUndoStack, setDoodleUndoStack] = useState<string[]>([]);
  const [isDoodleDrawing, setIsDoodleDrawing] = useState(false);
  const doodleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const getDoodleCtx = () => {
    const c = doodleCanvasRef.current;
    if (!c) return null;
    return { c, ctx: c.getContext('2d') };
  };

  const startDoodle = (e: React.MouseEvent | React.TouchEvent) => {
    const res = getDoodleCtx();
    if (!res) return;
    const { c, ctx } = res;
    if (!ctx) return;
    setIsDoodleDrawing(true);
    setDoodleUndoStack(prev => [...prev, c.toDataURL()]);
    ctx.beginPath();
    const rect = c.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawDoodle = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDoodleDrawing) return;
    const res = getDoodleCtx();
    if (!res) return;
    const { c, ctx } = res;
    if (!ctx) return;
    const rect = c.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.strokeStyle = isErasing ? '#ffffff' : doodleColor;
    ctx.lineWidth = isErasing ? doodleBrushSize * 3 : doodleBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDoodle = () => setIsDoodleDrawing(false);

  const undoDoodle = () => {
    const res = getDoodleCtx();
    if (!res || doodleUndoStack.length === 0) return;
    const { c, ctx } = res;
    if (!ctx) return;
    const prev = doodleUndoStack[doodleUndoStack.length - 1];
    setDoodleUndoStack(s => s.slice(0, -1));
    const img = new Image();
    img.src = prev;
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleSend = () => {
    const c = doodleCanvasRef.current;
    if (!c) return;
    c.toBlob(blob => {
      if (blob) {
        onSendDoodle(blob);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <h3 className="font-bold text-stone-200 flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-400" />
            Draw Something
          </h3>
          <button onClick={onClose} className="text-stone-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 flex items-center gap-2 border-b border-stone-800 flex-wrap">
          {['#8B5CF6', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#000000', '#ffffff'].map(c => (
            <button
              key={c}
              onClick={() => {
                setDoodleColor(c);
                setIsErasing(false);
              }}
              style={{ background: c }}
              className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                doodleColor === c && !isErasing ? 'border-white scale-110' : 'border-stone-700'
              }`}
            />
          ))}
          <button
            onClick={() => setIsErasing(!isErasing)}
            className={`p-1.5 rounded-lg cursor-pointer ml-2 ${
              isErasing ? 'bg-white text-black' : 'text-stone-400 bg-stone-800'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button onClick={undoDoodle} className="p-1.5 rounded-lg text-stone-400 bg-stone-850 cursor-pointer">
            <Undo2 className="w-4 h-4" />
          </button>
        </div>
        <canvas
          ref={doodleCanvasRef}
          width={360}
          height={280}
          className="block bg-white touch-none w-full"
          onMouseDown={startDoodle}
          onMouseMove={drawDoodle}
          onMouseUp={stopDoodle}
          onMouseLeave={stopDoodle}
          onTouchStart={startDoodle}
          onTouchMove={drawDoodle}
          onTouchEnd={stopDoodle}
        />
        <div className="p-3">
          <button
            onClick={handleSend}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm cursor-pointer"
          >
            Send Doodle
          </button>
        </div>
      </div>
    </div>
  );
}
