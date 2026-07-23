import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import { cn } from '../ui/utils';

interface TradeQualityCardProps {
  score: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-[#E5EAF2]'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TradeQualityCard({ score }: TradeQualityCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, score, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [score, count]);

  const starRating = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  const statusText = score >= 90 ? 'Excellent' : score >= 75 ? 'Great' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor';
  const statusColor =
    score >= 75
      ? 'text-emerald-600 bg-emerald-50'
      : score >= 60
        ? 'text-amber-600 bg-amber-50'
        : 'text-red-600 bg-red-50';

  return (
    <div className="bg-white rounded-[16px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E5EAF2]/60">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-[#0F172A] tracking-tight">Trade Quality</h3>
        <Award className="w-4 h-4 text-[#F59E0B]" />
      </div>

      <div className="flex items-end gap-2 mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[36px] font-extrabold leading-none tracking-tight text-[#0F172A] tabular-nums">
            <motion.span>{rounded}</motion.span>
          </span>
          <span className="text-[14px] font-bold text-[#94A3B8]">/100</span>
        </div>
        <div className={`mb-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${statusColor}`}>
          {statusText}
        </div>
      </div>

      <StarRating rating={starRating} />

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-[#64748B]">Strength</span>
          <span className="text-[11px] font-semibold text-[#0F172A] tabular-nums">{score}%</span>
        </div>
        <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#64748B]">
        <TrendingUp className={cn('w-3 h-3', score >= 70 ? 'text-emerald-500' : 'text-[#94A3B8]')} />
        <span className="font-medium">
          {score >= 70 ? 'Setup meets quality threshold' : 'Improve setup quality'}
        </span>
      </div>
    </div>
  );
}
