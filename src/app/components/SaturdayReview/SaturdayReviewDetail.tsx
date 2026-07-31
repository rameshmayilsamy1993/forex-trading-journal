import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus, Pencil, Copy, Trash2, Star, BarChart3 } from 'lucide-react';
import apiService from '../../services/apiService';
import ImageViewer from '../ImageViewer';
import SectionCard from './SectionCard';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { getResponsiveUrl } from '../../utils/cloudinary';
import { computeCompletion, formatWeekRange, stripHtml } from './saturdayReviewUtils';
import { cn } from '../ui/utils';
import type { SaturdayReview, SaturdayReviewEvent, SaturdayReviewImage } from '../../types/trading';

const BiasIcon = ({ bias }: { bias: string }) => {
  if (bias === 'Bullish') return <TrendingUp className="size-4" />;
  if (bias === 'Bearish') return <TrendingDown className="size-4" />;
  return <Minus className="size-4" />;
};

const biasClass: Record<string, string> = {
  Bullish: 'bg-emerald-100 text-emerald-700',
  Bearish: 'bg-red-100 text-red-700',
  Neutral: 'bg-slate-100 text-slate-600',
};

const hasValue = (v: string | undefined | null) => Boolean(v && String(v).trim());

function StatusBadge({ status }: { status: string }) {
  return status === 'Completed' ? (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-100 text-sm font-semibold">
      <BarChart3 className="size-3.5" /> Completed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 text-white/90 text-sm font-medium">
      Draft
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-[13px] font-medium text-[#64748B]">{label}</span>
      <span className="text-[14px] font-semibold text-[#0F172A] text-right">{value}</span>
    </div>
  );
}

function EventImages({ images, onView }: { images: SaturdayReviewImage[]; onView: (index: number) => void }) {
  if (!images.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
      {images.map((img, i) => (
        <div
          key={img.id || `img-${i}`}
          className="group relative aspect-video bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden cursor-pointer"
          onClick={() => onView(i)}
        >
          <img
            src={getResponsiveUrl(img.image, 480)}
            alt={img.caption || ''}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {img.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <span className="text-xs text-white">{img.caption}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailBlock({ title, event, onView }: { title: string; event?: SaturdayReviewEvent; onView: (index: number) => void }) {
  const images = event?.images || [];
  return (
    <div className="rounded-xl border border-[#E5EAF2] bg-[#F8FAFC]/60 p-4 space-y-1">
      <h4 className="text-[14px] font-bold text-[#0F172A] mb-2">{title}</h4>
      <InfoRow label="Day" value={event?.day} />
      <InfoRow label="Date" value={event?.date} />
      <InfoRow label="Time" value={event?.time} />
      <InfoRow label="Category" value={event?.category} />
      <InfoRow label="Key Level" value={event?.keyLevel} />
      {event?.notes && (
        <p className="text-[14px] leading-relaxed text-[#334155] pt-3 whitespace-pre-wrap">{event.notes}</p>
      )}
      <EventImages images={images} onView={onView} />
    </div>
  );
}

export default function SaturdayReviewDetail() {
  const [review, setReview] = useState<SaturdayReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewing, setViewing] = useState<{ images: { url: string; label: string }[]; index: number } | null>(null);

  const reviewId = (window as any).__saturdayReviewId;

  useEffect(() => {
    if (!reviewId) {
      setIsLoading(false);
      return;
    }
    apiService.saturdayReviews.getById(reviewId)
      .then((data: any) => setReview(data))
      .catch(() => setReview(null))
      .finally(() => setIsLoading(false));
  }, [reviewId]);

  const eventsByType = useMemo(() => {
    const map: Record<string, SaturdayReviewEvent> = {};
    for (const e of review?.events || []) map[e.eventType] = e;
    return map;
  }, [review]);

  const completion = useMemo(() => {
    if (!review) return { percent: 0, complete: false, filled: 0, total: 0 };
    return computeCompletion(review, review.events || []);
  }, [review]);

  const totalImages = useMemo(() => (review?.events || []).reduce((sum, e) => sum + (e.images?.length || 0), 0), [review]);

  const s1Complete = hasValue(eventsByType.weekly_high?.day) && hasValue(eventsByType.weekly_high?.date) && hasValue(eventsByType.weekly_high?.time) && hasValue(eventsByType.weekly_low?.day) && hasValue(eventsByType.weekly_low?.date) && hasValue(eventsByType.weekly_low?.time);
  const s2Complete = hasValue(review?.candleType) && hasValue(review?.highOrLowFirst) && hasValue(review?.expansionDirection);
  const s3Complete = hasValue(eventsByType.weekly_high_origin?.category) && hasValue(eventsByType.weekly_high_origin?.keyLevel) && hasValue(eventsByType.weekly_low_origin?.category) && hasValue(eventsByType.weekly_low_origin?.keyLevel);
  const s4Complete = review?.oteTouched === 'No' || (review?.oteTouched === 'Yes' && hasValue(review?.oteDirection) && hasValue(review?.oteReaction) && hasValue(eventsByType.ote?.day) && hasValue(eventsByType.ote?.time));
  const s5Complete = stripHtml(review?.weeklyStory || '').trim().length > 0;
  const sectionsComplete = [s1Complete, s2Complete, s3Complete, s4Complete, s5Complete].filter(Boolean).length;

  const checkedLessons = (review?.lessons || []).filter(l => l.checked);

  const openImages = (images: SaturdayReviewImage[], index = 0) => {
    setViewing({
      images: images.map(img => ({ url: img.image, label: img.caption || 'Screenshot' })),
      index,
    });
  };

  const handleBack = () => {
    (window as any).__saturdayReviewId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review' }));
  };

  const handleEdit = () => {
    if (!review) return;
    (window as any).__saturdayReviewId = null;
    (window as any).__saturdayReviewEditId = review.id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDuplicate = () => {
    if (!review) return;
    (window as any).__saturdayReviewId = null;
    (window as any).__saturdayReviewDuplicate = { pair: review.pair, overallBias: review.overallBias };
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDelete = async () => {
    if (!review) return;
    if (!confirm(`Delete Saturday review for ${review.pair}?`)) return;
    try {
      await apiService.saturdayReviews.delete(review.id);
      handleBack();
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      alert('Failed to delete review. Please try again.');
    }
  };

  if (!reviewId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No review selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[200px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
          <div className="space-y-5">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Review not found
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 size-[500px] bg-gradient-to-br from-blue-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 size-[400px] bg-gradient-to-br from-violet-200/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-[350px] bg-gradient-to-br from-sky-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="px-6 pt-6 pb-4 max-w-6xl mx-auto">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors group"
        >
          <div className="size-7 rounded-lg bg-white border border-[#E5EAF2] flex items-center justify-center group-hover:border-[#2563EB] group-hover:bg-blue-50 transition-all duration-200">
            <ArrowLeft className="size-3.5" />
          </div>
          Back to Saturday Reviews
        </button>
      </div>

      <div className="px-6 max-w-6xl mx-auto">
        <div className="relative h-[220px] rounded-3xl bg-gradient-to-br from-[#2563EB] via-[#4F46E5] to-[#7C3AED] overflow-hidden mb-8">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 size-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/4 size-48 bg-white/5 rounded-full translate-y-1/3" />
            <div className="absolute top-1/2 right-1/3 size-32 bg-white/5 rounded-full" />
          </div>
          <div className="relative h-full flex flex-col justify-center px-8 md:px-12">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <h1 className="text-[2rem] md:text-[2.5rem] font-bold text-white tracking-tight">{review.pair}</h1>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                <Calendar className="size-3.5 text-blue-100" />
                <span className="text-sm font-medium text-white/90">{formatWeekRange(review.weekStart, review.weekEnd)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {review.overallBias && (
                <span className={cn('inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold', biasClass[review.overallBias])}>
                  <BiasIcon bias={review.overallBias} /> {review.overallBias}
                </span>
              )}
              <StatusBadge status={review.status} />
              {review.reviewDate && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-white/90 text-sm">
                  <Calendar className="size-3.5" /> Reviewed {review.reviewDate}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard step={1} title="Weekly High & Low" subtitle="When and where the week's extremes formed" isComplete={s1Complete} imageCount={(eventsByType.weekly_high?.images?.length || 0) + (eventsByType.weekly_low?.images?.length || 0)} defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailBlock title="Weekly High" event={eventsByType.weekly_high} onView={(i) => openImages(eventsByType.weekly_high?.images || [], i)} />
              <DetailBlock title="Weekly Low" event={eventsByType.weekly_low} onView={(i) => openImages(eventsByType.weekly_low?.images || [], i)} />
            </div>
          </SectionCard>

          <SectionCard step={2} title="Weekly Candle Structure" subtitle="Candle type, order of formation, and expansion" isComplete={s2Complete} imageCount={eventsByType.candle?.images?.length || 0}>
            <div className="rounded-xl border border-[#E5EAF2] bg-[#F8FAFC]/60 p-4 space-y-1">
              <InfoRow label="Candle Type" value={review.candleType} />
              <InfoRow label="Formed First" value={review.highOrLowFirst} />
              <InfoRow label="Expansion Direction" value={review.expansionDirection} />
              {eventsByType.candle?.notes && (
                <p className="text-[14px] leading-relaxed text-[#334155] pt-3 whitespace-pre-wrap">{eventsByType.candle.notes}</p>
              )}
              <EventImages images={eventsByType.candle?.images || []} onView={(i) => openImages(eventsByType.candle?.images || [], i)} />
            </div>
          </SectionCard>

          <SectionCard step={3} title="Origin of Weekly High & Low" subtitle="Which key levels produced the extremes?" isComplete={s3Complete} imageCount={(eventsByType.weekly_high_origin?.images?.length || 0) + (eventsByType.weekly_low_origin?.images?.length || 0)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailBlock title="Origin of Weekly High" event={eventsByType.weekly_high_origin} onView={(i) => openImages(eventsByType.weekly_high_origin?.images || [], i)} />
              <DetailBlock title="Origin of Weekly Low" event={eventsByType.weekly_low_origin} onView={(i) => openImages(eventsByType.weekly_low_origin?.images || [], i)} />
            </div>
          </SectionCard>

          <SectionCard step={4} title="OTE Analysis" subtitle="Did price trade into the optimal trade entry zone?" isComplete={s4Complete} imageCount={eventsByType.ote?.images?.length || 0}>
            <div className="rounded-xl border border-[#E5EAF2] bg-[#F8FAFC]/60 p-4 space-y-1">
              <InfoRow label="OTE Touched" value={review.oteTouched} />
              {review.oteTouched === 'Yes' && (
                <>
                  <InfoRow label="Direction" value={review.oteDirection} />
                  <InfoRow label="Day" value={eventsByType.ote?.day} />
                  <InfoRow label="Time" value={eventsByType.ote?.time} />
                  <InfoRow label="Reacted Correctly" value={review.oteReaction} />
                  {eventsByType.ote?.notes && (
                    <p className="text-[14px] leading-relaxed text-[#334155] pt-3 whitespace-pre-wrap">{eventsByType.ote.notes}</p>
                  )}
                  <EventImages images={eventsByType.ote?.images || []} onView={(i) => openImages(eventsByType.ote?.images || [], i)} />
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard step={5} title="Weekly Story" subtitle="The full narrative of the week" isComplete={s5Complete}>
            {stripHtml(review.weeklyStory).trim() ? (
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: review.weeklyStory }}
              />
            ) : (
              <p className="text-[14px] text-[#94A3B8]">No weekly story written.</p>
            )}
          </SectionCard>

          <SectionCard step={6} title="Lessons Learned" subtitle="Optional — what to remember next week">
            {checkedLessons.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {checkedLessons.map(lesson => (
                  <span key={lesson.label} className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-[13px] font-medium">
                    {lesson.label}
                  </span>
                ))}
              </div>
            )}
            {review.lessonsNotes && (
              <p className="text-[14px] leading-relaxed text-[#334155] whitespace-pre-wrap">{review.lessonsNotes}</p>
            )}
            {checkedLessons.length === 0 && !review.lessonsNotes && (
              <p className="text-[14px] text-[#94A3B8]">No lessons recorded.</p>
            )}
          </SectionCard>

          <SectionCard step={7} title="Weekly Rating" subtitle="Optional — market quality, difficulty, confidence">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] font-medium text-[#64748B]">Market Quality</span>
                {review.marketQuality ? (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: review.marketQuality }).map((_, i) => (
                      <Star key={i} className="size-4 text-amber-400 fill-amber-400" />
                    ))}
                  </span>
                ) : <span className="text-[14px] text-[#94A3B8]">—</span>}
              </div>
              <InfoRow label="Difficulty" value={review.difficulty || undefined} />
              <InfoRow label="Confidence" value={review.confidence ? `${review.confidence}/10` : undefined} />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm">
            <h3 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">Completion</h3>
            <div className="h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden mb-2">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  completion.complete ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED]',
                )}
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#0F172A]">{completion.percent}%</span>
              <span className="text-[12px] text-[#94A3B8]">{completion.filled} / {completion.total} fields</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm">
            <h3 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[13px] text-[#64748B]">Week</span>
                <span className="text-[13px] font-bold text-[#0F172A] text-right">{formatWeekRange(review.weekStart, review.weekEnd)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[13px] text-[#64748B]">Sections Complete</span>
                <span className="text-[14px] font-bold text-[#0F172A]">{sectionsComplete} / 5</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[13px] text-[#64748B]">Total Images</span>
                <span className="text-[14px] font-bold text-[#0F172A]">{totalImages}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[13px] text-[#64748B]">Status</span>
                <span className={cn('px-2.5 py-0.5 rounded-full text-[12px] font-semibold', review.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                  {review.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm space-y-2">
            <Button onClick={handleEdit} className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/20 rounded-xl h-10 gap-2">
              <Pencil className="size-4" /> Edit Review
            </Button>
            <Button variant="outline" onClick={handleDuplicate} className="w-full rounded-xl h-10 gap-2">
              <Copy className="size-4" /> Duplicate
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="w-full rounded-xl h-10 gap-2">
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {viewing && (
        <ImageViewer
          images={viewing.images}
          initialIndex={viewing.index}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
