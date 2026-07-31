import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { cn } from '../ui/utils';
import { Field, inputClass, labelClass, selectTriggerClass } from './formPrimitives';
import BiasPicker from './BiasPicker';
import { snapToMonday, computeWeekEnd, formatWeekRange } from './saturdayReviewUtils';
import type { SaturdayReviewFormState } from './saturdayReviewTypes';

interface ReviewHeaderSectionProps {
  pairs: string[];
  form: SaturdayReviewFormState;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
  canComplete: boolean;
  onToggleStatus: () => void;
}

export default function ReviewHeaderSection({ pairs, form, onFormChange, canComplete, onToggleStatus }: ReviewHeaderSectionProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = form.weekStart ? computeWeekEnd(form.weekStart) : '';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Pair" required>
          <Select value={form.pair} onValueChange={(v) => onFormChange({ pair: v })}>
            <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select pair" /></SelectTrigger>
            <SelectContent>
              {pairs.map(p => (
                <SelectItem key={p} value={p} className="text-[14px] font-medium">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Week Start (snaps to Monday)" required>
          <input
            type="date"
            value={form.weekStart}
            max={today}
            onChange={(e) => {
              if (!e.target.value) {
                onFormChange({ weekStart: '' });
                return;
              }
              onFormChange({ weekStart: snapToMonday(new Date(`${e.target.value}T00:00:00`)) });
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Week Range">
          <div className="h-12 rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 flex items-center text-[15px] font-semibold text-[#2563EB]">
            {form.weekStart ? formatWeekRange(form.weekStart, weekEnd) : 'Select a week'}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Review Date" required>
          <input type="date" value={form.reviewDate} max={today} onChange={(e) => onFormChange({ reviewDate: e.target.value })} className={inputClass} />
        </Field>
        <div className="space-y-1.5 md:col-span-2">
          <Label className={labelClass}>Overall Bias <span className="text-red-500">*</span></Label>
          <BiasPicker value={form.overallBias} onChange={(v) => onFormChange({ overallBias: v })} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <span className="text-[14px] font-semibold text-[#334155]">Status</span>
        <button
          type="button"
          onClick={onToggleStatus}
          disabled={form.status === 'Draft' && !canComplete}
          className={cn(
            'h-10 px-5 rounded-[14px] text-[13px] font-semibold transition-all duration-200',
            form.status === 'Completed'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : canComplete
                ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25 hover:-translate-y-0.5'
                : 'border-2 border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
          )}
        >
          {form.status === 'Completed' ? 'Completed' : canComplete ? 'Mark Complete' : 'Complete all mandatory fields'}
        </button>
      </div>
    </div>
  );
}
