import type { SaturdayReviewEventType } from '../../types/trading';

export interface ImageItem {
  id: string;
  file?: File;
  preview?: string;
  url?: string;
  publicId?: string;
  caption: string;
  isExisting?: boolean;
  uploadState?: 'pending' | 'uploading' | 'done' | 'error';
  uploadProgress?: number;
}

export interface EventDraft {
  eventType: SaturdayReviewEventType;
  day: string;
  date: string;
  time: string;
  category: string;
  keyLevel: string;
  answer: string;
  notes: string;
  images: ImageItem[];
  dirty: boolean;
}

export interface LessonItem {
  label: string;
  checked: boolean;
}

export interface SaturdayReviewFormState {
  pair: string;
  weekStart: string;
  reviewDate: string;
  overallBias: string;
  candleType: string;
  highOrLowFirst: string;
  expansionDirection: string;
  oteTouched: string;
  oteDirection: string;
  oteReaction: string;
  marketQuality: number;
  difficulty: string;
  confidence: number;
  weeklyStory: string;
  lessons: LessonItem[];
  lessonsNotes: string;
  status: 'Draft' | 'Completed';
  events: Record<string, EventDraft>;
}

export type EventPatch = Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>);
export type EventUpdater = (eventType: string, patch: EventPatch) => void;
