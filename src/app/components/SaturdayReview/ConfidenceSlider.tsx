import { Slider } from '../ui/slider';

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function ConfidenceSlider({ value, onChange }: ConfidenceSliderProps) {
  return (
    <div className="pt-1">
      <div className="flex justify-between mb-2">
        <span className="text-[13px] font-medium text-[#64748B]">Confidence</span>
        <span className="text-[13px] font-bold text-[#0F172A]">{value > 0 ? `${value}/10` : '—'}</span>
      </div>
      <Slider
        value={value > 0 ? [value] : [5]}
        min={1}
        max={10}
        step={1}
        onValueChange={(v) => onChange(v[0])}
        className="[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#2563EB] [&_[data-slot=slider-range]]:to-[#7C3AED] [&_[data-slot=slider-track]]:bg-[#E2E8F0] [&_[data-slot=slider-thumb]]:bg-white"
      />
      <div className="flex justify-between mt-1">
        {[1, 5, 10].map(n => (
          <span key={n} className="text-[11px] text-[#94A3B8]">{n}</span>
        ))}
      </div>
    </div>
  );
}
