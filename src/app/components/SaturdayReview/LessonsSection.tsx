import LessonChecklist from './LessonChecklist';
import { Field, textareaClass } from './formPrimitives';
import type { LessonItem, SaturdayReviewFormState } from './saturdayReviewTypes';

interface LessonsSectionProps {
  lessons: LessonItem[];
  lessonsNotes: string;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
}

export default function LessonsSection({ lessons, lessonsNotes, onFormChange }: LessonsSectionProps) {
  return (
    <div className="space-y-4">
      <LessonChecklist items={lessons} onChange={(items) => onFormChange({ lessons: items })} />
      <Field label="Notes">
        <textarea value={lessonsNotes} onChange={(e) => onFormChange({ lessonsNotes: e.target.value })} rows={4} placeholder="Additional lessons and reflections..." className={textareaClass} />
      </Field>
    </div>
  );
}
