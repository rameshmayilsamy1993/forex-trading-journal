import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Pencil, Copy, Trash2, ChevronLeft, ChevronRight, Calendar, AlertCircle, Star } from 'lucide-react';
import { format } from 'date-fns';
import apiService from '../../services/apiService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import { DEFAULT_PAIRS, BIAS_OPTIONS, CANDLE_TYPES } from './saturdayReviewConstants';
import { formatWeekRange } from './saturdayReviewUtils';
import { cn } from '../ui/utils';

const STATUS_OPTIONS = ['Draft', 'Completed'] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LIMIT = 12;
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i).reverse();

const biasClass: Record<string, string> = {
  Bullish: 'bg-emerald-100 text-emerald-700',
  Bearish: 'bg-red-100 text-red-700',
  Neutral: 'bg-slate-100 text-slate-600',
};

function StatusBadge({ status }: { status: string }) {
  return status === 'Completed' ? (
    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[12px] font-semibold">Completed</span>
  ) : (
    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[12px] font-semibold">Draft</span>
  );
}

function ListSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
      <div className="h-12 bg-[#F8FAFC] border-b border-[#E2E8F0]" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-6 px-4 py-4 border-b border-[#E2E8F0]/60">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
      ))}
    </div>
  );
}

export default function SaturdayReviewList() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [filters, setFilters] = useState({
    pair: '', month: '', year: '', bias: '', candleType: '', status: '', search: '',
  });
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
      const result = await apiService.saturdayReviews.getAll({
        pair: filters.pair || undefined,
        month: filters.month ? parseInt(filters.month) : undefined,
        year: filters.year ? parseInt(filters.year) : undefined,
        bias: filters.bias || undefined,
        candleType: filters.candleType || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        sort: 'weekStart:desc',
        page,
        limit: LIMIT,
      });
      setReviews(result.reviews || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to load Saturday reviews:', err);
      setError(err.message || 'Failed to load Saturday reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleView = (review: any) => {
    (window as any).__saturdayReviewId = review.id || review._id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-detail' }));
  };

  const handleEdit = (review: any) => {
    (window as any).__saturdayReviewEditId = review.id || review._id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDuplicate = (review: any) => {
    (window as any).__saturdayReviewDuplicate = { pair: review.pair, overallBias: review.overallBias };
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDelete = async (review: any) => {
    if (!confirm(`Delete Saturday review for ${review.pair}?`)) return;
    try {
      await apiService.saturdayReviews.delete(review._id || review.id);
      loadReviews();
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      alert('Failed to delete review. Please try again.');
    }
  };

  const handleCreateNew = () => {
    (window as any).__saturdayReviewEditId = null;
    (window as any).__saturdayReviewDuplicate = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[#0F172A] font-semibold">Saturday Review</h1>
          <p className="text-body text-[#64748B] mt-1">Weekly ICT/SMC structure analysis — one pair per trading week.</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-blue-600/25 hover:-translate-y-0.5">
          <Plus className="size-4" /> New Review
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <Select value={filters.pair} onValueChange={(v) => handleFilterChange('pair', v)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="All pairs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All pairs" disabled className="hidden">All pairs</SelectItem>
            {pairs.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.month} onValueChange={(v) => handleFilterChange('month', v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Any month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any month" disabled className="hidden">Any month</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.year} onValueChange={(v) => handleFilterChange('year', v)}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue placeholder="Any year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any year" disabled className="hidden">Any year</SelectItem>
            {YEARS.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Select value={filters.candleType} onValueChange={(v) => handleFilterChange('candleType', v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Any candle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any candle" disabled className="hidden">Any candle</SelectItem>
            {CANDLE_TYPES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any status" disabled className="hidden">Any status</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
          <Input
            placeholder="Search pair, notes, story..."
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

      {!error && isLoading && <ListSkeleton />}

      {!error && !isLoading && reviews.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E2E8F0]">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-card-title text-slate-500 mb-2">No Saturday reviews yet</h3>
          <p className="text-body text-slate-400 mb-6">Create your first Saturday review to start tracking weekly structure.</p>
          <Button onClick={handleCreateNew} className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white">New Review</Button>
        </div>
      )}

      {!error && !isLoading && reviews.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Bias</TableHead>
                <TableHead>Candle Type</TableHead>
                <TableHead>OTE</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map(review => (
                <TableRow key={review._id || review.id}>
                  <TableCell>
                    <button
                      onClick={() => handleView(review)}
                      className="text-[15px] font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                    >
                      {review.pair}
                    </button>
                  </TableCell>
                  <TableCell className="text-[14px] text-[#334155]">{formatWeekRange(review.weekStart, review.weekEnd)}</TableCell>
                  <TableCell>
                    {review.overallBias ? (
                      <span className={cn('px-2.5 py-1 rounded-full text-[12px] font-semibold', biasClass[review.overallBias])}>
                        {review.overallBias}
                      </span>
                    ) : <span className="text-[#94A3B8]">—</span>}
                  </TableCell>
                  <TableCell className="text-[14px] text-[#334155]">{review.candleType || '—'}</TableCell>
                  <TableCell className="text-[14px] text-[#334155]">{review.oteTouched || '—'}</TableCell>
                  <TableCell><StatusBadge status={review.status} /></TableCell>
                  <TableCell>
                    {review.marketQuality ? (
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: review.marketQuality }).map((_, i) => (
                          <Star key={i} className="size-3.5 text-amber-400 fill-amber-400" />
                        ))}
                      </span>
                    ) : <span className="text-[#94A3B8]">—</span>}
                  </TableCell>
                  <TableCell className="text-[14px] text-[#334155]">{format(new Date(review.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(review)} title="View" className="p-2 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition-colors">
                        <Eye className="size-4" />
                      </button>
                      <button onClick={() => handleEdit(review)} title="Edit" className="p-2 rounded-lg text-[#64748B] hover:text-[#7C3AED] hover:bg-violet-50 transition-colors">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => handleDuplicate(review)} title="Duplicate" className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors">
                        <Copy className="size-4" />
                      </button>
                      <button onClick={() => handleDelete(review)} title="Delete" className="p-2 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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
