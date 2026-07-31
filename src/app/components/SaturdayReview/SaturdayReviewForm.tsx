import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import apiService from '../../services/apiService';
import ReviewHeaderSection from './ReviewHeaderSection';
import WeeklyHighLowSection from './WeeklyHighLowSection';
import CandleStructureSection from './CandleStructureSection';
import OriginSection from './OriginSection';
import OteSection from './OteSection';
import WeeklyStorySection from './WeeklyStorySection';
import LessonsSection from './LessonsSection';
import RatingSection from './RatingSection';
import SectionCard from './SectionCard';
import { DEFAULT_PAIRS, EVENT_TYPES, initialLessons } from './saturdayReviewConstants';
import { computeCompletion, computeWeekEnd, isEventEmpty } from './saturdayReviewUtils';
import { cn } from '../ui/utils';
import type { SaturdayReview, SaturdayReviewEvent } from '../../types/trading';
import type { EventDraft, EventUpdater, SaturdayReviewFormState } from './saturdayReviewTypes';

const today = () => format(new Date(), 'yyyy-MM-dd');

const emptyEventDraft = (eventType: (typeof EVENT_TYPES)[number]): EventDraft => ({
  eventType,
  day: '',
  date: '',
  time: '',
  category: '',
  keyLevel: '',
  answer: '',
  notes: '',
  images: [],
  dirty: false,
});

const buildEventsDraft = (): Record<string, EventDraft> => {
  const result: Record<string, EventDraft> = {};
  for (const type of EVENT_TYPES) result[type] = emptyEventDraft(type);
  return result;
};

const eventFromApi = (event: SaturdayReviewEvent | undefined): EventDraft => {
  const base = emptyEventDraft((event?.eventType as (typeof EVENT_TYPES)[number]) || 'weekly_high');
  return {
    ...base,
    day: event?.day || '',
    date: event?.date || '',
    time: event?.time || '',
    category: event?.category || '',
    keyLevel: event?.keyLevel || '',
    answer: event?.answer || '',
    notes: event?.notes || '',
    images: (event?.images || []).map(img => ({
      id: `existing-${img.id || img.image}`,
      url: img.image,
      publicId: img.publicId,
      caption: img.caption || '',
      isExisting: true,
      uploadState: 'done' as const,
    })),
  };
};

const buildEventsDraftWith = (events?: SaturdayReviewEvent[]): Record<string, EventDraft> => {
  const result = buildEventsDraft();
  for (const type of EVENT_TYPES) {
    const found = (events || []).find(e => e.eventType === type);
    if (found) result[type] = eventFromApi(found);
  }
  return result;
};

export default function SaturdayReviewForm() {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [form, setForm] = useState<SaturdayReviewFormState>({
    pair: '',
    weekStart: '',
    reviewDate: today(),
    overallBias: '',
    candleType: '',
    highOrLowFirst: '',
    expansionDirection: '',
    oteTouched: '',
    oteDirection: '',
    oteReaction: '',
    marketQuality: 0,
    difficulty: '',
    confidence: 0,
    weeklyStory: '',
    lessons: initialLessons(),
    lessonsNotes: '',
    status: 'Draft',
    events: buildEventsDraft(),
  });

  const formRef = useRef(form);
  const reviewIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => {
    const editId = (window as any).__saturdayReviewEditId || null;
    const duplicate = (window as any).__saturdayReviewDuplicate || null;
    (window as any).__saturdayReviewEditId = null;
    (window as any).__saturdayReviewDuplicate = null;

    apiService.settings.getPairs()
      .then(setPairs)
      .catch(() => setPairs(DEFAULT_PAIRS));

    if (editId) {
      setLoading(true);
      apiService.saturdayReviews.getById(editId)
        .then((review: any) => {
          const id = review.id || review._id;
          reviewIdRef.current = id;
          setReviewId(id);
          setForm(prev => ({
            ...prev,
            pair: review.pair || '',
            weekStart: review.weekStart || '',
            reviewDate: review.reviewDate || today(),
            overallBias: review.overallBias || '',
            candleType: review.candleType || '',
            highOrLowFirst: review.highOrLowFirst || '',
            expansionDirection: review.expansionDirection || '',
            oteTouched: review.oteTouched || '',
            oteDirection: review.oteDirection || '',
            oteReaction: review.oteReaction || '',
            marketQuality: review.marketQuality || 0,
            difficulty: review.difficulty || '',
            confidence: review.confidence || 0,
            weeklyStory: review.weeklyStory || '',
            lessons: (review.lessons && review.lessons.length > 0
              ? review.lessons
              : initialLessons()
            ).map((l: { label: string; checked: boolean }) => ({ label: l.label, checked: l.checked })),
            lessonsNotes: review.lessonsNotes || '',
            status: review.status || 'Draft',
            events: buildEventsDraftWith(review.events),
          }));
        })
        .catch(() => setError('Failed to load review'))
        .finally(() => setLoading(false));
    } else if (duplicate) {
      setForm(prev => ({ ...prev, pair: duplicate.pair || '', overallBias: duplicate.overallBias || '' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (formRef.current.status === 'Draft' && reviewIdRef.current) {
        persist(reviewIdRef.current, formRef.current).catch(() => {});
      }
    };
  }, []);

  const reviewPayloadFrom = (state: SaturdayReviewFormState): Partial<SaturdayReview> => ({
    pair: state.pair,
    weekStart: state.weekStart,
    weekEnd: state.weekStart ? computeWeekEnd(state.weekStart) : '',
    reviewDate: state.reviewDate,
    overallBias: state.overallBias,
    candleType: state.candleType,
    highOrLowFirst: state.highOrLowFirst,
    expansionDirection: state.expansionDirection,
    oteTouched: state.oteTouched,
    oteDirection: state.oteDirection,
    oteReaction: state.oteReaction,
    marketQuality: state.marketQuality > 0 ? state.marketQuality : undefined,
    difficulty: state.difficulty,
    confidence: state.confidence > 0 ? state.confidence : undefined,
    weeklyStory: state.weeklyStory,
    lessons: state.lessons,
    lessonsNotes: state.lessonsNotes,
    status: state.status,
  });

  const persist = async (id: string, state: SaturdayReviewFormState): Promise<void> => {
    await apiService.saturdayReviews.update(id, reviewPayloadFrom(state));
    for (const eventType of EVENT_TYPES) {
      const event = state.events[eventType];
      if (!event || !event.dirty) continue;
      if (isEventEmpty(event) && event.images.length === 0) continue;
      await apiService.saturdayReviews.upsertEvent(id, eventType, {
        day: event.day,
        date: event.date,
        time: event.time,
        category: event.category,
        keyLevel: event.keyLevel,
        answer: event.answer,
        notes: event.notes,
        images: event.images.filter(i => i.url).map(i => ({ url: i.url!, publicId: i.publicId, caption: i.caption })),
      });
    }
  };

  const scheduleSave = () => {
    setDirty(true);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveDraft();
    }, 30000);
  };

  const saveDraft = async () => {
    const state = formRef.current;
    const currentId = reviewIdRef.current;
    if (!currentId && !(state.pair && state.weekStart)) return;
    if (saving) return;

    setSaving(true);
    try {
      let id = currentId;
      if (!id) {
        const created = await apiService.saturdayReviews.create({
          pair: state.pair,
          weekStart: state.weekStart,
          weekEnd: computeWeekEnd(state.weekStart),
          reviewDate: state.reviewDate,
          status: 'Draft',
        });
        id = created.id || created._id;
        reviewIdRef.current = id;
        setReviewId(id);
      }
      await persist(id, state);
      setForm(prev => {
        const events: Record<string, EventDraft> = {};
        for (const type of EVENT_TYPES) {
          events[type] = { ...(prev.events[type] || emptyEventDraft(type)), dirty: false };
        }
        return { ...prev, events };
      });
      setLastSavedAt(new Date());
      setDirty(false);
      setError(null);
    } catch (err: any) {
      console.error('Auto-save failed:', err);
      if (err?.response?.status === 409) {
        setError('A review already exists for this pair and week');
      } else if (err?.response?.status === 400) {
        setError(err?.response?.data?.message || 'Cannot save draft');
      } else {
        setError('Failed to save draft. Your changes are kept locally.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (patch: Partial<SaturdayReviewFormState>) => {
    setForm(prev => ({ ...prev, ...patch }));
    scheduleSave();
  };

  const handleEventChange: EventUpdater = (eventType, patch) => {
    setForm(prev => {
      const event = prev.events[eventType];
      if (!event) return prev;
      const applied = typeof patch === 'function' ? patch(event) : patch;
      return {
        ...prev,
        events: {
          ...prev.events,
          [eventType]: { ...event, ...applied, dirty: true },
        },
      };
    });
    scheduleSave();
  };

  const handleToggleStatus = async () => {
    const target = form.status === 'Completed' ? 'Draft' : 'Completed';
    if (target === 'Completed' && !completion.complete) {
      alert('Complete all mandatory fields first');
      return;
    }
    const next = { ...form, status: target };
    setForm(next);
    formRef.current = next;
    if (!reviewId) {
      await saveDraft();
      return;
    }
    setSaving(true);
    try {
      await apiService.saturdayReviews.update(reviewId, { ...reviewPayloadFrom(next), status: target });
      setLastSavedAt(new Date());
      setDirty(false);
      setError(null);
    } catch (err: any) {
      console.error('Status update failed:', err);
      if (err?.response?.status === 400) {
        setError(err?.response?.data?.message || 'Cannot mark as Completed');
        setForm(prev => ({ ...prev, status: 'Draft' }));
        formRef.current = { ...formRef.current, status: 'Draft' };
      } else {
        setError('Failed to update status');
      }
    } finally {
      setSaving(false);
    }
  };

  const completion = useMemo(() => {
    const reviewLike: Partial<SaturdayReview> = {
      pair: form.pair,
      weekStart: form.weekStart,
      reviewDate: form.reviewDate,
      overallBias: form.overallBias,
      candleType: form.candleType,
      highOrLowFirst: form.highOrLowFirst,
      expansionDirection: form.expansionDirection,
      oteTouched: form.oteTouched,
      oteDirection: form.oteDirection,
      oteReaction: form.oteReaction,
      weeklyStory: form.weeklyStory,
    };
    const events: SaturdayReviewEvent[] = EVENT_TYPES.map(type => {
      const e = form.events[type];
      return {
        id: '',
        eventType: type,
        day: e?.day,
        date: e?.date,
        time: e?.time,
        category: e?.category,
        keyLevel: e?.keyLevel,
        answer: e?.answer,
        notes: e?.notes,
        images: [],
      };
    });
    return computeCompletion(reviewLike, events);
  }, [form]);

  const requiredFilled = (type: string, keys: string[]) => {
    const e = form.events[type];
    return e ? keys.every(k => String((e as any)[k] || '').trim().length > 0) : false;
  };

  const s1Complete = requiredFilled('weekly_high', ['day', 'date', 'time']) && requiredFilled('weekly_low', ['day', 'date', 'time']);
  const s2Complete = Boolean(form.candleType && form.highOrLowFirst && form.expansionDirection);
  const s3Complete = requiredFilled('weekly_high_origin', ['category', 'keyLevel']) && requiredFilled('weekly_low_origin', ['category', 'keyLevel']);
  const s4Complete = form.oteTouched === 'No'
    || (form.oteTouched === 'Yes' && Boolean(form.oteDirection && form.oteReaction) && requiredFilled('ote', ['day', 'time']));

  const sectionImageCount = (type: string) => form.events[type]?.images.filter(i => i.url).length || 0;
  const totalImages = EVENT_TYPES.reduce((sum, t) => sum + sectionImageCount(t), 0);

  const handleBack = () => {
    (window as any).__saturdayReviewId = null;
    (window as any).__saturdayReviewEditId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review' }));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-48 bg-slate-200 rounded" />
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <nav className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
        <button type="button" onClick={handleBack} className="hover:text-[#2563EB]">Saturday Review</button>
        <ChevronRight className="size-3.5 text-[#CBD5E1]" />
        <span className="text-[#0F172A]">{reviewId ? 'Edit' : 'New'} Saturday Review</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0F172A]">{reviewId ? 'Edit Saturday Review' : 'New Saturday Review'}</h1>
          <p className="text-[15px] font-medium text-[#64748B] mt-1">Document the week's ICT structure before the next one begins.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[14px] font-medium text-red-700 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-semibold">Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5EAF2] shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-[#0F172A]">Review Completion</h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">{completion.filled} of {completion.total} mandatory fields filled</p>
          </div>
          {form.status === 'Completed' && (
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[12px] font-semibold">Completed</span>
          )}
        </div>
        <div className="h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              completion.complete ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED]',
            )}
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] font-semibold text-[#0F172A]">{completion.percent}%</span>
          <span className={cn('text-[12px] font-medium', saving ? 'text-[#2563EB]' : dirty ? 'text-amber-600' : lastSavedAt ? 'text-emerald-600' : 'text-[#94A3B8]')}>
            {saving ? 'Saving...' : dirty ? 'Unsaved changes' : lastSavedAt ? `Saved ${format(lastSavedAt, 'hh:mm a')}` : 'No changes yet'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5EAF2] shadow-sm p-6">
        <ReviewHeaderSection
          pairs={pairs}
          form={form}
          onFormChange={handleFormChange}
          canComplete={completion.complete}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      <SectionCard step={1} title="Weekly High & Low" subtitle="When and where the week's extremes formed" isComplete={s1Complete} imageCount={sectionImageCount('weekly_high') + sectionImageCount('weekly_low')} defaultOpen>
        <WeeklyHighLowSection events={form.events} onEventChange={handleEventChange} />
      </SectionCard>

      <SectionCard step={2} title="Weekly Candle Structure" subtitle="Candle type, order of formation, and expansion" isComplete={s2Complete} imageCount={sectionImageCount('candle')}>
        <CandleStructureSection form={form} onFormChange={handleFormChange} event={form.events.candle} onEventChange={(patch) => handleEventChange('candle', patch)} />
      </SectionCard>

      <SectionCard step={3} title="Origin of Weekly High & Low" subtitle="Which key levels produced the extremes?" isComplete={s3Complete} imageCount={sectionImageCount('weekly_high_origin') + sectionImageCount('weekly_low_origin')}>
        <OriginSection events={form.events} onEventChange={handleEventChange} />
      </SectionCard>

      <SectionCard step={4} title="OTE Analysis" subtitle="Did price trade into the optimal trade entry zone?" isComplete={s4Complete} imageCount={sectionImageCount('ote')}>
        <OteSection form={form} onFormChange={handleFormChange} event={form.events.ote} onEventChange={(patch) => handleEventChange('ote', patch)} />
      </SectionCard>

      <SectionCard step={5} title="Weekly Story" subtitle="Liquidity, SMT, displacement, manipulation, expansion, distribution, OTE, CRT, bias, entry models" isComplete={completion.percent === 100 && Boolean(form.weeklyStory)} imageCount={0}>
        <WeeklyStorySection value={form.weeklyStory} onChange={(html) => handleFormChange({ weeklyStory: html })} />
      </SectionCard>

      <SectionCard step={6} title="Lessons Learned" subtitle="Optional — what to remember next week" imageCount={0}>
        <LessonsSection lessons={form.lessons} lessonsNotes={form.lessonsNotes} onFormChange={handleFormChange} />
      </SectionCard>

      <SectionCard step={7} title="Weekly Rating" subtitle="Optional — market quality, difficulty, confidence" imageCount={0}>
        <RatingSection form={form} onFormChange={handleFormChange} />
      </SectionCard>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-[#E2E8F0] text-[14px] font-medium text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all"
        >
          <ChevronLeft className="size-4" /> Back
        </button>
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          className="h-12 px-8 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-[14px] font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
      </div>
    </div>
  );
}
