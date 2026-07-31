import { Field, SelectField, textareaClass } from './formPrimitives';
import ImageUploader from './ImageUploader';
import { CATEGORY_OPTIONS, KEY_LEVEL_OPTIONS } from './saturdayReviewConstants';
import type { EventDraft, EventUpdater } from './saturdayReviewTypes';

interface OriginSectionProps {
  events: Record<string, EventDraft>;
  onEventChange: EventUpdater;
}

interface OriginBlockProps {
  title: string;
  event: EventDraft;
  onEventChange: (patch: Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>)) => void;
}

function OriginBlock({ title, event, onEventChange }: OriginBlockProps) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4">
      <h4 className="text-[15px] font-bold text-[#0F172A]">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SelectField label="Category" value={event.category} onChange={(v) => onEventChange({ category: v })} options={CATEGORY_OPTIONS} placeholder="Weekly / Daily" required />
        <SelectField label="Key Level" value={event.keyLevel} onChange={(v) => onEventChange({ keyLevel: v })} options={KEY_LEVEL_OPTIONS} placeholder="Select key level" required />
      </div>
      <Field label="Notes">
        <textarea value={event.notes} onChange={(e) => onEventChange({ notes: e.target.value })} rows={3} placeholder="Notes about this origin..." className={textareaClass} />
      </Field>
      <ImageUploader
        images={event.images}
        onChange={(updater) => onEventChange((prev) => ({ images: typeof updater === 'function' ? updater(prev.images) : updater }))}
      />
    </div>
  );
}

export default function OriginSection({ events, onEventChange }: OriginSectionProps) {
  return (
    <div className="space-y-4">
      <OriginBlock title="Origin of Weekly High" event={events.weekly_high_origin} onEventChange={(patch) => onEventChange('weekly_high_origin', patch)} />
      <OriginBlock title="Origin of Weekly Low" event={events.weekly_low_origin} onEventChange={(patch) => onEventChange('weekly_low_origin', patch)} />
    </div>
  );
}
