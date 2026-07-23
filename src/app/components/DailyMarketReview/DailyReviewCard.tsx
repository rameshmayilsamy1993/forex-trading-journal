import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';

const biasVariant: Record<string, 'success' | 'destructive' | 'secondary'> = {
  Bullish: 'success',
  Bearish: 'destructive',
  Neutral: 'secondary',
};

export default function DailyReviewCard({ review, onView, onEdit, onDelete }: {
  review: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formattedDate = review.date ? format(new Date(review.date), 'MMM d, yyyy') : '';

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-[#0F172A]">{review.pair}</h3>
          <p className="text-sm text-[#64748B]">{formattedDate}</p>
        </div>
        {review.bias && (
          <Badge variant={biasVariant[review.bias] || 'secondary'}>{review.bias}</Badge>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-[#94A3B8] mb-4">
        <span>{review.entryCount || 0} updates</span>
        <span>{review.imageCount || 0} images</span>
        {review.latestEntryAt && (
          <span>Last: {format(new Date(review.latestEntryAt), 'h:mm a')}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onView} className="flex-1 h-9 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors">View</button>
        <button onClick={onEdit} className="h-9 px-4 rounded-xl border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]">Edit</button>
        <button onClick={onDelete} className="h-9 px-4 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  );
}
