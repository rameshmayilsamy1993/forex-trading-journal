import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Calendar, Image, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';
import apiService from '../../services/apiService';
import TimelineEntry from './TimelineEntry';
import ImageGallery from './ImageGallery';
import AddEntryDialog from './AddEntryDialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const biasVariant: Record<string, 'success' | 'destructive' | 'secondary' | 'default'> = {
  Bullish: 'success',
  Bearish: 'destructive',
  Neutral: 'secondary',
};

export default function MonthlyReviewDetail() {
  const [review, setReview] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);

  const reviewId = (window as any).__monthlyReviewId;

  const loadReview = async () => {
    const data = await apiService.monthlyReviews.getById(reviewId);
    setReview(data);
  };

  const loadEntries = async () => {
    const data = await apiService.monthlyReviews.getEntries(reviewId);
    setEntries(data);
  };

  const loadData = async () => {
    if (!reviewId) return;
    setIsLoading(true);
    try {
      await Promise.all([loadReview(), loadEntries()]);
    } catch (error) {
      console.error('Failed to load review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reviewId]);

  const handleBack = () => {
    (window as any).__monthlyReviewId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'monthly-review' }));
  };

  const handleDeleteEntry = async (entry: any) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await apiService.monthlyReviews.deleteEntry(reviewId, entry._id);
      await loadEntries();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const handleEditEntry = (entry: any) => {
    setEditEntry(entry);
    setAddEntryOpen(true);
  };

  const handleAddEntry = () => {
    setEditEntry(null);
    setAddEntryOpen(true);
  };

  const allImages = useMemo(() => {
    return entries.flatMap(entry => entry.images || []);
  }, [entries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries]);

  const imageCount = review?.imageCount ?? allImages.length;

  if (!reviewId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No review selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-16 w-96" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-24">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-body-sm text-[#64748B] hover:text-[#0F172A] transition-colors mb-2"
      >
        <ArrowLeft className="size-4" />
        Back to Reviews
      </button>

      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-display font-bold text-[#0F172A]">
              {review.pair}
            </h1>
            <span className="text-heading text-[#64748B]">
              {MONTH_NAMES[review.month - 1]} {review.year}
            </span>
            {review.bias && (
              <Badge variant={biasVariant[review.bias] || 'secondary'}>
                {review.bias}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E5EAF2] p-4">
          <div className="flex items-center gap-2 text-caption text-slate-500 mb-1">
            <Calendar className="w-3.5 h-3.5" /> Created
          </div>
          <p className="text-body font-semibold">{format(new Date(review.createdAt), 'MMM dd, yyyy')}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5EAF2] p-4">
          <div className="flex items-center gap-2 text-caption text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5" /> Updated
          </div>
          <p className="text-body font-semibold">{format(new Date(review.updatedAt), 'MMM dd, yyyy')}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5EAF2] p-4">
          <div className="flex items-center gap-2 text-caption text-slate-500 mb-1">
            <FileText className="w-3.5 h-3.5" /> Entries
          </div>
          <p className="text-body font-semibold">{entries.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5EAF2] p-4">
          <div className="flex items-center gap-2 text-caption text-slate-500 mb-1">
            <Image className="w-3.5 h-3.5" /> Images
          </div>
          <p className="text-body font-semibold">{imageCount}</p>
        </div>
      </div>

      <section>
        <h2 className="text-heading font-semibold text-[#0F172A] mb-4">Monthly Summary</h2>
        {review.summary ? (
          <div className="bg-white rounded-xl border border-[#E5EAF2] p-6">
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: review.summary }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white rounded-xl border border-[#E5EAF2]">
            <FileText className="size-12 mb-3 opacity-40" />
            <p className="text-body font-medium">No summary yet</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-heading font-semibold text-[#0F172A] mb-4">Timeline</h2>
        {sortedEntries.length > 0 ? (
          <div>
            {sortedEntries.map(entry => (
              <TimelineEntry
                key={entry._id}
                entry={entry}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white rounded-xl border border-[#E5EAF2]">
            <Clock className="size-12 mb-3 opacity-40" />
            <p className="text-body font-medium">No entries yet. Add your first update.</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-heading font-semibold text-[#0F172A] mb-4">Image Gallery</h2>
        <ImageGallery images={allImages} />
      </section>

      <section>
        <h2 className="text-heading font-semibold text-[#0F172A] mb-4">Trading Notes</h2>
        {sortedEntries.length > 0 ? (
          <div className="space-y-4">
            {sortedEntries.map(entry => (
              <div
                key={entry._id}
                className="bg-white rounded-xl border border-[#E5EAF2] p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-body font-semibold text-gray-900">{entry.entryTitle}</h3>
                  <span className="text-caption text-muted-foreground shrink-0 ml-4">
                    {format(new Date(entry.createdAt), 'MMM dd, yyyy')}
                  </span>
                </div>
                {entry.comment && (
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: entry.comment }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white rounded-xl border border-[#E5EAF2]">
            <FileText className="size-12 mb-3 opacity-40" />
            <p className="text-body font-medium">No notes yet</p>
          </div>
        )}
      </section>

      <button
        onClick={handleAddEntry}
        className="fixed bottom-6 right-6 size-14 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center z-40"
      >
        <Plus className="size-6" />
      </button>

      <AddEntryDialog
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
        onSaved={loadData}
        reviewId={reviewId}
        editEntry={editEntry}
      />
    </div>
  );
}
