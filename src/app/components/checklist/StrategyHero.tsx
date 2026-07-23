import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

interface StrategyHeroProps {
  strategyName: string;
  completionPercent: number;
  qualityRating: string;
  onChangeStrategy: () => void;
  onViewDetails?: () => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? 'text-yellow-300' : 'text-white/20'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function StrategyHero({
  strategyName,
  completionPercent,
  qualityRating,
  onChangeStrategy,
  onViewDetails,
}: StrategyHeroProps) {
  const readinessColor =
    completionPercent >= 80
      ? 'text-emerald-300'
      : completionPercent >= 50
        ? 'text-amber-300'
        : 'text-red-300';

  return (
    <div className="relative overflow-hidden rounded-[18px] h-[140px] bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600">
      <div className="absolute inset-0">
        <div className="absolute top-[-60px] right-[-30px] w-[220px] h-[220px] rounded-full bg-violet-400/20 blur-[60px]" />
        <div className="absolute bottom-[-40px] left-[-20px] w-[180px] h-[180px] rounded-full bg-blue-400/20 blur-[60px]" />
      </div>

      <div className="relative h-full px-6 py-5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-white/60 text-[11px] font-semibold tracking-wider uppercase">
              Selected Strategy
            </p>
            <h2 className="text-white text-[22px] font-extrabold leading-tight tracking-tight">
              {strategyName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                View Details
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onChangeStrategy}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 shadow-none h-8"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Change
            </Button>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-white/60 text-[11px] font-semibold">Trade Readiness</p>
            <div className="flex items-center gap-3">
              <span className={`text-[28px] font-bold leading-none tracking-tight ${readinessColor}`}>
                {completionPercent}%
              </span>
              <div className="flex flex-col gap-0.5">
                <StarRating rating={completionPercent >= 80 ? 4 : completionPercent >= 50 ? 3 : 2} />
                <p className="text-white/60 text-[11px] font-medium">Estimated Quality</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <span className="text-[12px] font-medium">{qualityRating}</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
