import { cn } from '../ui/utils';

type FilterMode = 'all' | 'required' | 'pending' | 'completed';

interface ChecklistFilterProps {
  total: number;
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
}

const filters: { label: string; value: FilterMode }[] = [
  { label: 'All', value: 'all' },
  { label: 'Required', value: 'required' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

export default function ChecklistFilter({ total, filterMode, onFilterChange }: ChecklistFilterProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h3 className="text-[17px] font-bold text-[#0F172A] tracking-tight">
          Checklist Items
        </h3>
        <span className="text-[13px] font-medium text-[#64748B]">
          {total} Total
        </span>
      </div>

      <div className="flex gap-1 bg-[#F1F5F9] rounded-xl p-1">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200',
              filterMode === filter.value
                ? 'bg-[#7C3AED] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/50',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
