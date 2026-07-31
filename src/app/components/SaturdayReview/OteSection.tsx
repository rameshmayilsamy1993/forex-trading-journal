import TimePicker from '../ui/TimePicker';
import { Field, SelectField, textareaClass } from './formPrimitives';
import ImageUploader from './ImageUploader';
import { DAY_OPTIONS, OTE_DIRECTION_OPTIONS, OTE_REACTION_OPTIONS } from './saturdayReviewConstants';
import type { EventDraft, SaturdayReviewFormState } from './saturdayReviewTypes';

interface OteSectionProps {
  form: SaturdayReviewFormState;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
  event: EventDraft;
  onEventChange: (patch: Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>)) => void;
}

export default function OteSection({ form, onFormChange, event, onEventChange }: OteSectionProps) {
  return (
    <div className="space-y-4">
      <Field label="Did price touch OTE?" required>
        <div className="flex gap-2">
          {(['Yes', 'No'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onFormChange({ oteTouched: form.oteTouched === opt ? '' : opt })}
              className={`flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200 ${
                form.oteTouched === opt
                  ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25'
                  : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </Field>

      {form.oteTouched === 'Yes' && (
        <div className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField label="OTE Direction" value={form.oteDirection} onChange={(v) => onFormChange({ oteDirection: v })} options={OTE_DIRECTION_OPTIONS} placeholder="Bullish / Bearish" required />
            <SelectField label="Did market react correctly?" value={form.oteReaction} onChange={(v) => onFormChange({ oteReaction: v })} options={OTE_REACTION_OPTIONS} placeholder="Yes / No / Partial" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField label="OTE Day" value={event.day} onChange={(v) => onEventChange({ day: v })} options={DAY_OPTIONS} placeholder="Select day" required />
            <Field label="OTE Time" required>
              <TimePicker value={event.time} onChange={(v) => onEventChange({ time: v })} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={event.notes} onChange={(e) => onEventChange({ notes: e.target.value })} rows={3} placeholder="OTE notes..." className={textareaClass} />
          </Field>
          <ImageUploader
            images={event.images}
            onChange={(updater) => onEventChange((prev) => ({ images: typeof updater === 'function' ? updater(prev.images) : updater }))}
          />
        </div>
      )}
    </div>
  );
}
