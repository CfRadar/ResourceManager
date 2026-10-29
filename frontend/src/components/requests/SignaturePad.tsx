import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  onSignatureComplete: (signatureDataUrl: string | null) => void;
  documentTitle?: string;
  hasSigned?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureComplete,
  documentTitle = 'Laboratory Safety Waiver & Equipment Liability Accord',
  hasSigned = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!hasSigned);
  const [isConfirmed, setIsConfirmed] = useState(hasSigned);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e293b'; // slate-800
  }, []);

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
    if (isConfirmed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || isConfirmed) return;
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

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setIsConfirmed(false);
    onSignatureComplete(null);
  };

  const confirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL('image/png');
    setIsConfirmed(true);
    onSignatureComplete(dataUrl);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">{documentTitle}</span>
        </div>
        {isConfirmed ? (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Legally Signed
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Sign with finger or stylus</span>
        )}
      </div>

      {/* Signature Canvas Box */}
      <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 overflow-hidden touch-none h-36">
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

        {isEmpty && !isConfirmed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
            Draw your signature here
          </div>
        )}

        <div className="absolute bottom-2 left-4 text-[10px] text-slate-400 pointer-events-none select-none">
          ✕ Digital Attestation Line
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={clearCanvas}
          disabled={isEmpty && !isConfirmed}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear
        </button>

        {!isConfirmed ? (
          <button
            type="button"
            onClick={confirmSignature}
            disabled={isEmpty}
            className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accept & Sign Document
          </button>
        ) : (
          <button
            type="button"
            onClick={clearCanvas}
            className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:underline"
          >
            Re-sign Document
          </button>
        )}
      </div>
    </div>
  );
};

