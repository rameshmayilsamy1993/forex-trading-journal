import type { LessonItem } from './saturdayReviewTypes';

export const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];
export const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const;
export const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const CANDLE_TYPES = ['Bull Full Body', 'Bear Full Body', 'Bull Pin Bar', 'Bear Pin Bar', 'Doji', 'Inside Bar', 'Outside Bar', 'Indecision', 'Custom'] as const;
export const HIGH_LOW_FIRST_OPTIONS = ['Weekly High First', 'Weekly Low First', 'Both same session'] as const;
export const EXPANSION_DIRECTIONS = ['Expanded Up', 'Expanded Down', 'Range', 'Balanced'] as const;
export const CATEGORY_OPTIONS = ['Weekly', 'Daily'] as const;
export const OTE_DIRECTION_OPTIONS = ['Bullish', 'Bearish'] as const;
export const OTE_REACTION_OPTIONS = ['Yes', 'No', 'Partial'] as const;
export const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'] as const;
export const KEY_LEVEL_OPTIONS = ['Previous High', 'Previous Low', 'FVG', 'IFVG', 'Order Block', 'Breaker', 'Mitigation Block', 'Balanced Price Range', 'EQH', 'EQL', 'Liquidity Pool', 'Custom'] as const;
export const LESSON_OPTIONS = ['Wait for OTE', 'Respect HTF Bias', "Don't trade News", 'Wait for SMT', 'Need patience', 'Avoid revenge trades', 'Follow CRT', 'Other'] as const;
export const EVENT_TYPES = ['weekly_high', 'weekly_low', 'candle', 'weekly_high_origin', 'weekly_low_origin', 'ote'] as const;
export const MAX_IMAGES_PER_EVENT = 10;
export const STORY_PLACEHOLDER = 'Liquidity, SMT, Displacement, Manipulation, Expansion, Distribution, OTE, CRT, Bias, Entry Models, observations, lessons';

export function initialLessons(): LessonItem[] {
  return LESSON_OPTIONS.map(label => ({ label, checked: false }));
}

export interface CompletionField {
  source: 'review' | 'event';
  key: string;
  eventType?: string;
  nonEmpty?: boolean;
  condition?: (review: Record<string, unknown>) => boolean;
}

export const COMPLETION_FIELDS: CompletionField[] = [
  { source: 'review', key: 'pair' },
  { source: 'review', key: 'weekStart' },
  { source: 'review', key: 'overallBias' },
  { source: 'review', key: 'reviewDate' },
  { source: 'event', eventType: 'weekly_high', key: 'day' },
  { source: 'event', eventType: 'weekly_high', key: 'date' },
  { source: 'event', eventType: 'weekly_high', key: 'time' },
  { source: 'event', eventType: 'weekly_low', key: 'day' },
  { source: 'event', eventType: 'weekly_low', key: 'date' },
  { source: 'event', eventType: 'weekly_low', key: 'time' },
  { source: 'review', key: 'candleType' },
  { source: 'review', key: 'highOrLowFirst' },
  { source: 'review', key: 'expansionDirection' },
  { source: 'event', eventType: 'weekly_high_origin', key: 'category' },
  { source: 'event', eventType: 'weekly_high_origin', key: 'keyLevel' },
  { source: 'event', eventType: 'weekly_low_origin', key: 'category' },
  { source: 'event', eventType: 'weekly_low_origin', key: 'keyLevel' },
  { source: 'review', key: 'oteTouched' },
  { source: 'review', key: 'weeklyStory', nonEmpty: true },
  { source: 'review', key: 'oteDirection', condition: (r) => r.oteTouched === 'Yes' },
  { source: 'review', key: 'oteReaction', condition: (r) => r.oteTouched === 'Yes' },
  { source: 'event', eventType: 'ote', key: 'day', condition: (r) => r.oteTouched === 'Yes' },
  { source: 'event', eventType: 'ote', key: 'time', condition: (r) => r.oteTouched === 'Yes' },
];
