import { cn } from '../ui/utils';
import { LESSON_OPTIONS } from './saturdayReviewConstants';
import type { LessonItem } from './saturdayReviewTypes';

interface LessonChecklistProps {
  items: LessonItem[];
  onChange: (items: LessonItem[]) => void;
}

export default function LessonChecklist({ items, onChange }: LessonChecklistProps) {
  const toggle = (label: string) => {
    onChange(items.map(item => (item.label === label ? { ...item, checked: !item.checked } : item)));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {LESSON_OPTIONS.map(option => {
        const item = items.find(i => i.label === option);
        const checked = item?.checked || false;
        return (
          <label key={option} className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={checked} onChange={() => toggle(option)} className="size-4 accent-[#2563EB]" />
            <span className={cn('text-[14px] font-medium', checked ? 'text-[#2563EB]' : 'text-[#334155] group-hover:text-[#2563EB]')}>
              {option}
            </span>
          </label>
        );
      })}
    </div>
  );
}
