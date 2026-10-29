import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange?: (newRating: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({
  rating,
  onChange,
  readOnly = false,
  size = 'md',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const labels: Record<number, { text: string; color: string }> = {
    1: { text: 'Damaged / Defect Present (Requires Incident Report)', color: 'text-red-600' },
    2: { text: 'Sub-Optimal / Notable Wear (Notes Mandatory)', color: 'text-orange-600' },
    3: { text: 'Minor Wear / Functional Blemishes', color: 'text-amber-600' },
    4: { text: 'Very Good / Clean Condition', color: 'text-blue-600' },
    5: { text: 'Pristine / Perfect Laboratory Condition', color: 'text-emerald-600' },
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((starVal) => {
          const isFilled = starVal <= activeRating;

          return (
            <button
              key={starVal}
              type="button"
              disabled={readOnly}
              onClick={() => onChange?.(starVal)}
              onMouseEnter={() => !readOnly && setHoverRating(starVal)}
              onMouseLeave={() => !readOnly && setHoverRating(null)}
              className={`transition-transform ${
                !readOnly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
              }`}
            >
              <Star
                className={`${starSizes[size]} transition-colors ${
                  isFilled
                    ? 'fill-amber-400 text-amber-500 drop-shadow-2xs'
                    : 'fill-slate-100 text-slate-300'
                }`}
              />
            </button>
          );
        })}

        <span className="text-xs font-black text-slate-800 ml-2">
          {rating} / 5
        </span>
      </div>

      {labels[activeRating] && (
        <p className={`text-xs font-semibold ${labels[activeRating].color}`}>
          {labels[activeRating].text}
        </p>
      )}
    </div>
  );
}
