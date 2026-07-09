import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import apiService from '../../services/apiService';
import DailyReviewCard from './DailyReviewCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { Skeleton } from '../ui/skeleton';

const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];
const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const;
const LIMIT = 12;

function ReviewCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 space-y-4">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function DailyReviewList() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [filters, setFilters] = useState({ pair: '', date: '', bias: '', search: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  useEffect(() => {
    apiService.settings.getPairs()
      .then(setPairs)
      .catch(() => setPairs(DEFAULT_PAIRS));
  }, []);

  useEffect(() => {
    loadReviews();
  }, [filters, page]);

  const loadReviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.dailyReviews.getAll({
        pair: filters.pair || undefined,
        date: filters.date || undefined,
        bias: filters.bias || undefined,
        search: filters.search || undefined,
        page,
        limit: LIMIT,
      });
      setReviews(result.reviews || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
      setError(err.message || 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleOpen = (review: any) => {
    (window as any).__dailyReviewId = review.id || review._id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'daily-review-detail' }));
  };

  const handleEdit = (review: any) => {
    (window as any).__dailyReviewEditId = review.id || review._id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'daily-review-form' }));
  };

  const handleDelete = async (review: any) => {
    if (!confirm(`Delete review for ${review.pair}?`)) return;
    try {
      await apiService.dailyReviews.delete(review._id);
      loadReviews();
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      alert('Failed to delete review. Please try again.');
    }
  };

  const handleCreateNew = () => {
    (window as any).__dailyReviewEditId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'daily-review-form' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[#0F172A] font-semibold">Daily Market Review</h1>
          <p className="text-body text-[#64748B] mt-1">Your daily trading analysis and session planning.</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5">
          <Plus className="size-4" /> New Review
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={filters.pair} onValueChange={(v) => handleFilterChange('pair', v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="All pairs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All pairs" disabled className="hidden">All pairs</SelectItem>
            {pairs.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="text"
          placeholder="Date (YYYY-MM-DD)"
          value={filters.date}
          onChange={(e) => handleFilterChange('date', e.target.value)}
          className="w-full sm:w-40"
        />

        <Select value={filters.bias} onValueChange={(v) => handleFilterChange('bias', v)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Any bias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any bias" disabled className="hidden">Any bias</SelectItem>
            {BIAS_OPTIONS.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
          <Input
            placeholder="Search reviews..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-body-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={loadReviews}>Retry</Button>
        </div>
      )}

      {!error && isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!error && !isLoading && reviews.length === 0 && (
        <div className="text-center py-20">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-card-title text-slate-500 mb-2">No reviews yet</h3>
          <p className="text-body text-slate-400 mb-6">Create your first daily market review to start tracking daily analysis.</p>
          <Button onClick={handleCreateNew}>New Review</Button>
        </div>
      )}

      {!error && !isLoading && reviews.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map(review => (
              <DailyReviewCard
                key={review._id || review.id}
                review={review}
                onOpen={handleOpen}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-body text-slate-500">
                Page {page} of {totalPages} ({total} reviews)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
