import { cn } from '../ui/utils';
import { DIFFICULTY_OPTIONS } from './saturdayReviewConstants';

interface DifficultyPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  return (
    <div className="flex gap-2">
      {DIFFICULTY_OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(value === option ? '' : option)}
          className={cn(
            'flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200',
            value === option
              ? option === 'Hard' ? 'bg-[#DC2626] text-white shadow-md shadow-[#DC2626]/25'
                : option === 'Medium' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                  : 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
              : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
