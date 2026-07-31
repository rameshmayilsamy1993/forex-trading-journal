import { cn } from '../ui/utils';
import { BIAS_OPTIONS } from './saturdayReviewConstants';

interface BiasPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BiasPicker({ value, onChange }: BiasPickerProps) {
  return (
    <div className="flex gap-2">
      {BIAS_OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(value === option ? '' : option)}
          className={cn(
            'flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200',
            value === option
              ? option === 'Bullish' ? 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
                : option === 'Bearish' ? 'bg-[#DC2626] text-white shadow-md shadow-[#DC2626]/25'
                  : 'bg-[#64748B] text-white shadow-md shadow-[#64748B]/25'
              : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
