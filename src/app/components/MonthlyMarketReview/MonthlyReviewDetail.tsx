import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Image, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import apiService from '../../services/apiService';
import AddEntryDialog from './AddEntryDialog';
import { Badge } from '../ui/badge';
import ImageViewer from '../ImageViewer';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const biasVariant: Record<string, 'success' | 'destructive' | 'secondary'> = {
  Bullish: 'success',
  Bearish: 'destructive',
  Neutral: 'secondary',
};

const BiasIcon = ({ bias }: { bias: string }) => {
  if (bias === 'Bullish') return <TrendingUp className="size-5" />;
  if (bias === 'Bearish') return <TrendingDown className="size-5" />;
  return <Minus className="size-5" />;
};

export default function MonthlyReviewDetail() {
  const [review, setReview] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [viewingImages, setViewingImages] = useState<{ images: { url: string; label: string }[]; index: number } | null>(null);

  const reviewId = (window as any).__monthlyReviewId;

  const loadData = async () => {
    if (!reviewId) return;
    setIsLoading(true);
    try {
      const [reviewData, entriesData] = await Promise.all([
        apiService.monthlyReviews.getById(reviewId),
        apiService.monthlyReviews.getEntries(reviewId),
      ]);
      setReview(reviewData);
      setEntries(entriesData);
    } catch (error) {
      console.error('Failed to load monthly review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [reviewId]);

  const handleBack = () => {
    (window as any).__monthlyReviewId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'monthly-review' }));
  };

  const sortedEntries = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries]
  );

  const allImages = useMemo(() =>
    entries.flatMap(e => e.images || []),
    [entries]
  );

  if (!reviewId) return <div className="flex items-center justify-center h-64 text-[#64748B]">No review selected</div>;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="animate-pulse"><div className="h-8 w-32 bg-slate-200 rounded" /></div>
        <div className="h-48 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const formattedMonth = review.month ? `${MONTH_NAMES[review.month - 1]} ${review.year}` : '';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
      <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0F172A] mb-6">
        <ArrowLeft className="size-4" /> Back to Reviews
      </button>

      <div className="bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4F46E5] rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">{review.pair}</h1>
          <span className="text-sm text-purple-200">{formattedMonth}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {review.bias && <Badge variant={biasVariant[review.bias] || 'secondary'}>{review.bias}</Badge>}
          <span className="text-sm text-purple-200">{entries.length} updates</span>
          <span className="text-sm text-purple-200">{allImages.length} images</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {review.summary && (
            <section className="bg-white rounded-2xl border border-[#E5EAF2] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">Monthly Summary</h2>
              <div className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{review.summary}</div>
            </section>
          )}

          {allImages.length > 0 && (
            <section className="bg-white rounded-2xl border border-[#E5EAF2] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <Image className="size-5 text-[#7C3AED]" /> Screenshots
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allImages.map((img: any, i: number) => (
                  <div
                    key={i}
                    className="group relative aspect-video bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden cursor-pointer"
                    onClick={() => setViewingImages({
                      images: allImages.map((im: any) => ({ url: im.url, label: im.caption || 'Screenshot' })),
                      index: i,
                    })}
                  >
                    <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/20 backdrop-blur-sm rounded-full">
                        <Image className="size-5 text-white" />
                      </div>
                    </div>
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <span className="text-xs text-white">{img.caption}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-4">Updates</h2>
            {sortedEntries.length > 0 ? (
              <div className="space-y-4">
                {sortedEntries.map((entry, idx) => (
                  <div key={entry.id || idx} className="relative bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm">
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-[#7C3AED] to-[#4F46E5]" />
                    <div className="pl-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#0F172A]">{entry.entryTitle}</span>
                          {entry.bias && <Badge variant={biasVariant[entry.bias] || 'secondary'} className="text-xs">{entry.bias}</Badge>}
                        </div>
                        <span className="text-xs text-[#94A3B8]">{format(new Date(entry.createdAt), 'MMM d, h:mm a')}</span>
                      </div>
                      {entry.comment && (
                        <div className="text-sm text-[#475569] whitespace-pre-wrap mb-3">{entry.comment}</div>
                      )}
                      {entry.images?.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {entry.images.map((img: any, j: number) => (
                            <div
                              key={j}
                              className="aspect-video bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] overflow-hidden cursor-pointer group"
                              onClick={() => setViewingImages({
                                images: entry.images.map((im: any) => ({ url: im.url, label: im.caption || 'Screenshot' })),
                                index: j,
                              })}
                            >
                              <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-[#E5EAF2] bg-white/40">
                <p className="text-sm font-medium text-[#64748B]">No updates yet this month</p>
                <p className="text-xs text-[#94A3B8] mt-1">Add your first market update</p>
              </div>
            )}
          </section>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-28 bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Quick Stats</h3>
            <div className="divide-y divide-[#F1F5F9]">
              {[
                { label: 'Pair', value: review.pair },
                { label: 'Month', value: formattedMonth },
                { label: 'Bias', value: review.bias || '—' },
                { label: 'Updates', value: entries.length },
                { label: 'Images', value: allImages.length },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#64748B]">{stat.label}</span>
                  <span className="text-sm font-semibold text-[#0F172A]">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setAddEntryOpen(true)}
        className="fixed bottom-6 right-6 size-14 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-lg shadow-purple-500/30 hover:shadow-xl flex items-center justify-center z-40"
      >
        <Plus className="size-6" />
      </button>

      <AddEntryDialog
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
        onSaved={loadData}
        reviewId={reviewId}
        editEntry={null}
      />

      {viewingImages && (
        <ImageViewer
          images={viewingImages.images}
          initialIndex={viewingImages.index}
          onClose={() => setViewingImages(null)}
        />
      )}
    </div>
  );
}
