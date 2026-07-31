import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import TimePicker from '../ui/TimePicker';
import { Field, inputClass, selectTriggerClass, textareaClass } from './formPrimitives';
import ImageUploader from './ImageUploader';
import { DAY_OPTIONS } from './saturdayReviewConstants';
import type { EventDraft, EventUpdater } from './saturdayReviewTypes';

interface WeeklyHighLowSectionProps {
  events: Record<string, EventDraft>;
  onEventChange: EventUpdater;
}

interface HighLowBlockProps {
  title: string;
  event: EventDraft;
  onEventChange: (patch: Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>)) => void;
}

function HighLowBlock({ title, event, onEventChange }: HighLowBlockProps) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4">
      <h4 className="text-[15px] font-bold text-[#0F172A]">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Day" required>
          <Select value={event.day} onValueChange={(v) => onEventChange({ day: v })}>
            <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select day" /></SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map(d => (
                <SelectItem key={d} value={d} className="text-[14px] font-medium">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date" required>
          <input type="date" value={event.date} onChange={(e) => onEventChange({ date: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Time" required>
          <TimePicker value={event.time} onChange={(v) => onEventChange({ time: v })} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={event.notes} onChange={(e) => onEventChange({ notes: e.target.value })} rows={3} placeholder="Notes about this extreme..." className={textareaClass} />
      </Field>
      <ImageUploader
        images={event.images}
        onChange={(updater) => onEventChange((prev) => ({ images: typeof updater === 'function' ? updater(prev.images) : updater }))}
      />
    </div>
  );
}

export default function WeeklyHighLowSection({ events, onEventChange }: WeeklyHighLowSectionProps) {
  return (
    <div className="space-y-4">
      <HighLowBlock title="Weekly High" event={events.weekly_high} onEventChange={(patch) => onEventChange('weekly_high', patch)} />
      <HighLowBlock title="Weekly Low" event={events.weekly_low} onEventChange={(patch) => onEventChange('weekly_low', patch)} />
    </div>
  );
}
