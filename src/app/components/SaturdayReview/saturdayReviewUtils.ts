import { format, addDays, parseISO, startOfWeek } from 'date-fns';
import { COMPLETION_FIELDS } from './saturdayReviewConstants';
import type { SaturdayReview, SaturdayReviewEvent } from '../../types/trading';
import type { EventDraft } from './saturdayReviewTypes';

export function snapToMonday(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function computeWeekEnd(weekStart: string): string {
  return format(addDays(parseISO(weekStart), 4), 'yyyy-MM-dd');
}

export function formatWeekRange(weekStart: string, weekEnd?: string): string {
  if (!weekStart) return 'Select a week';
  const end = weekEnd || computeWeekEnd(weekStart);
  return `${format(parseISO(weekStart), 'MMM d')} – ${format(parseISO(end), 'MMM d, yyyy')}`;
}

export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || '';
}

export function isEventEmpty(event: EventDraft): boolean {
  return ['day', 'date', 'time', 'category', 'keyLevel', 'answer', 'notes'].every(
    (key) => !String(event[key as keyof EventDraft] || '').trim()
  );
}

export function computeCompletion(
  review: Partial<SaturdayReview>,
  events: SaturdayReviewEvent[]
): { percent: number; complete: boolean; filled: number; total: number } {
  const eventsByType: Record<string, SaturdayReviewEvent> = {};
  for (const event of events || []) {
    eventsByType[event.eventType] = event;
  }
  let filled = 0;
  let total = 0;
  for (const field of COMPLETION_FIELDS) {
    if (field.condition && !field.condition(review as Record<string, unknown>)) continue;
    total += 1;
    const value = field.source === 'event'
      ? eventsByType[field.eventType!]?.[field.key as keyof SaturdayReviewEvent]
      : review[field.key as keyof SaturdayReview];
    const isFilled = field.nonEmpty
      ? stripHtml(String(value || '')).trim().length > 0
      : value !== undefined && value !== null && String(value).trim().length > 0;
    if (isFilled) filled += 1;
  }
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { percent, complete: filled === total, filled, total };
}
