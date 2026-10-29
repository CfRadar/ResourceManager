import { useRef, useState, useEffect } from 'react';
import { PenTool, Type, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { SignatureData } from '../../api/checkin.api';

interface DualSignaturePadProps {
  onSave: (sig: SignatureData | null) => void;
  documentTitle?: string;
  hasSaved?: boolean;
}

export function SignaturePad({
  onSave,
  documentTitle = 'Electronic Equipment Condition Verification',
  hasSaved = false,
}: DualSignaturePadProps) {
  const [tab, setTab] = useState<'DRAW' | 'TYPE'>('DRAW');
  const [typedName, setTypedName] = useState('');
  const [isDrawn, setIsDrawn] = useState(false);
  const [isSaved, setIsSaved] = useState(hasSaved);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // slate-900
  }, [tab]);

  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (isSaved) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsDrawn(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || isSaved) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setTypedName('');
    setIsDrawn(false);
    setIsSaved(false);
    onSave(null);
  };

  const handleConfirm = () => {
    if (tab === 'DRAW') {
      const canvas = canvasRef.current;
      if (!canvas || !isDrawn) return;
      const dataUrl = canvas.toDataURL('image/png');
      setIsSaved(true);
      onSave({
        type: 'DRAWN',
        pngDataUrl: dataUrl,
      });
    } else {
      if (!typedName.trim()) return;
      setIsSaved(true);
      onSave({
        type: 'TYPED',
        text: typedName.trim(),
      });
    }
  };

  return (
    <div className="border border-slate-300 rounded-2xl p-5 bg-white space-y-4 shadow-2xs">
      {/* Header with Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <span className="text-xs font-bold text-slate-800 block">{documentTitle}</span>
          <span className="text-[11px] text-slate-400">
            Sign with finger, stylus, or typed legal name
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab('DRAW');
              setIsSaved(false);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              tab === 'DRAW'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw Signature</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('TYPE');
              setIsSaved(false);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              tab === 'TYPE'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Name</span>
          </button>
        </div>
      </div>

      {/* Input Area */}
      {tab === 'DRAW' ? (
        <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/60 overflow-hidden touch-none h-36">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair"
          />

          {!isDrawn && !isSaved && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
              Draw your signature here
            </div>
          )}

          <div className="absolute bottom-2 left-4 text-[10px] text-slate-400 pointer-events-none select-none">
            ✕ Legal Digital Attestation Line
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={typedName}
            onChange={(e) => {
              setTypedName(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Type your full legal name (e.g. Dr. Jane Doe)..."
            className="w-full text-xl font-serif italic border border-slate-300 rounded-xl p-4 bg-slate-50/40 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          <div className="flex justify-between text-[11px] text-slate-400 px-1">
            <span>Rendered in legal cursive font for electronic record</span>
            <span>Typing records user affiliation & IP timestamp</span>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        {!isSaved ? (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={tab === 'DRAW' ? !isDrawn : !typedName.trim()}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm & Record Signature</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Signature Recorded
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Change
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 italic text-center">
        Acknowledged electronically (demo record). This records your verification of initial equipment condition.
      </p>
    </div>
  );
}
