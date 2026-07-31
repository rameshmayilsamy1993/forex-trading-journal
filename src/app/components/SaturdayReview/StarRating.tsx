import { Star } from 'lucide-react';
import { cn } from '../ui/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

export default function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)} className="group p-1">
          <Star className={cn('size-7 transition-all duration-150', star <= value ? 'fill-amber-400 text-amber-400' : 'text-[#CBD5E1] group-hover:text-amber-300')} />
        </button>
      ))}
    </div>
  );
}
