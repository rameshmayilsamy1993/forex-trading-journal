import { format } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Image,
  FileText,
  Edit,
  Trash2,
  Eye,
  Calendar,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';

interface DailyReviewCardProps {
  review: any;
  onOpen: (review: any) => void;
  onEdit: (review: any) => void;
  onDelete: (review: any) => void;
}

const biasConfig = {
  Bullish: { variant: 'success' as const, icon: TrendingUp },
  Bearish: { variant: 'destructive' as const, icon: TrendingDown },
  Neutral: { variant: 'secondary' as const, icon: Minus },
} as const;

export default function DailyReviewCard({ review, onOpen, onEdit, onDelete }: DailyReviewCardProps) {
  const formattedDate = format(new Date(review.date), 'MMM d, yyyy');
  const lastEdited = format(new Date(review.updatedAt), 'MMM d, yyyy');
  const bias = biasConfig[review.bias as keyof typeof biasConfig] ?? biasConfig.Neutral;
  const BiasIcon = bias.icon;

  return (
    <Card
      className={cn(
        'group hover:shadow-xl hover:-translate-y-0.5',
        'transition-all duration-200',
      )}
    >
      <div className="flex gap-5 p-5">
        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-[#F8FAFC] border border-[#E5EAF2] flex items-center justify-center">
          {review.imagePath ? (
            <img
              src={review.imagePath}
              alt={`${review.pair} chart`}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image className="size-8 text-[#CBD5E1]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-section-title text-[#0F172A] truncate">
              {review.pair}
            </span>
            <Badge variant={bias.variant} className="shrink-0 gap-1">
              <BiasIcon className="size-3" />
              {review.bias}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-caption text-[#64748B] mb-3">
            <Calendar className="size-3.5" />
            {formattedDate} — {review.dayOfWeek}
          </div>

          <div className="flex items-center gap-4 text-caption text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              {review.entryCount} entries
            </span>
            <span className="flex items-center gap-1.5">
              <Image className="size-3.5" />
              {review.tradeIdeaCount ?? 0} trade ideas
            </span>
          </div>

          <div className="text-micro text-[#94A3B8] mt-2">
            Last edited {lastEdited}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0 justify-start">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpen(review)}
            aria-label={`Open ${review.pair} review`}
          >
            <Eye className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(review)}
            aria-label={`Edit ${review.pair} review`}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(review)}
            aria-label={`Delete ${review.pair} review`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
