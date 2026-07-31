import { Field, SelectField, textareaClass } from './formPrimitives';
import ImageUploader from './ImageUploader';
import { CANDLE_TYPES, HIGH_LOW_FIRST_OPTIONS, EXPANSION_DIRECTIONS } from './saturdayReviewConstants';
import type { EventDraft, SaturdayReviewFormState } from './saturdayReviewTypes';

interface CandleStructureSectionProps {
  form: SaturdayReviewFormState;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
  event: EventDraft;
  onEventChange: (patch: Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>)) => void;
}

export default function CandleStructureSection({ form, onFormChange, event, onEventChange }: CandleStructureSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectField label="Candle Type" value={form.candleType} onChange={(v) => onFormChange({ candleType: v })} options={CANDLE_TYPES} placeholder="Select candle type" required />
        <SelectField label="Which formed first?" value={form.highOrLowFirst} onChange={(v) => onFormChange({ highOrLowFirst: v })} options={HIGH_LOW_FIRST_OPTIONS} placeholder="High / Low order" required />
        <SelectField label="Weekly Expansion Direction" value={form.expansionDirection} onChange={(v) => onFormChange({ expansionDirection: v })} options={EXPANSION_DIRECTIONS} placeholder="Select direction" required />
      </div>
      <Field label="Notes">
        <textarea value={event.notes} onChange={(e) => onEventChange({ notes: e.target.value })} rows={3} placeholder="Candle structure notes..." className={textareaClass} />
      </Field>
      <ImageUploader
        images={event.images}
        onChange={(updater) => onEventChange((prev) => ({ images: typeof updater === 'function' ? updater(prev.images) : updater }))}
      />
    </div>
  );
}
