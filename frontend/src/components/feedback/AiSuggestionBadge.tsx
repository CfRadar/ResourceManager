import { useState } from 'react';
import { Sparkles, Search, HelpCircle } from 'lucide-react';

interface AiSuggestionBadgeProps {
  source: 'AI_EMBEDDING' | 'KEYWORD_FALLBACK' | string;
  reasons?: string[];
  matchedFields?: string[];
  score?: number;
}

export function AiSuggestionBadge({
  source,
  reasons = [],
  matchedFields = [],
  score,
}: AiSuggestionBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isNeural = source === 'AI_EMBEDDING';

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
          isNeural
            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
        }`}
      >
        {isNeural ? (
          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
        ) : (
          <Search className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        )}
        <span>{isNeural ? 'AI Match' : 'Keyword Fallback'}</span>
        {score !== undefined && (
          <span className="opacity-75 font-normal">({Math.round(score * 100)}%)</span>
        )}
        <HelpCircle className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-50 border border-slate-700">
          <p className="font-semibold text-slate-200 mb-1">
            {isNeural ? 'Neural Embedding Match' : 'Lexical BM25 Keyword Search'}
          </p>
          {matchedFields.length > 0 && (
            <p className="text-slate-400 mb-1">
              Matched: <span className="text-white font-medium">{matchedFields.join(', ')}</span>
            </p>
          )}
          {reasons.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
              {reasons.slice(0, 3).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
            {isNeural
              ? 'Computed via sentence-transformers (all-MiniLM-L6-v2)'
              : 'Deterministic fallback mode active'}
          </div>
        </div>
      )}
    </div>
  );
}
