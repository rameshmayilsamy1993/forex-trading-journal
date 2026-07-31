import StarRating from './StarRating';
import DifficultyPicker from './DifficultyPicker';
import ConfidenceSlider from './ConfidenceSlider';
import { Field } from './formPrimitives';
import type { SaturdayReviewFormState } from './saturdayReviewTypes';

interface RatingSectionProps {
  form: SaturdayReviewFormState;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
}

export default function RatingSection({ form, onFormChange }: RatingSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Field label="Market Quality">
        <StarRating value={form.marketQuality} onChange={(v) => onFormChange({ marketQuality: v })} />
      </Field>
      <Field label="Difficulty">
        <DifficultyPicker value={form.difficulty} onChange={(v) => onFormChange({ difficulty: v })} />
      </Field>
      <Field label="Confidence">
        <ConfidenceSlider value={form.confidence} onChange={(v) => onFormChange({ confidence: v })} />
      </Field>
    </div>
  );
}
