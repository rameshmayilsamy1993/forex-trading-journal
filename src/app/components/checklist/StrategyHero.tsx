import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface StrategyHeroProps {
  strategyName: string;
  completionPercent: number;
  qualityRating: string;
  onChangeStrategy: () => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-white/20'}`}
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
}: StrategyHeroProps) {
  const readinessColor =
    completionPercent >= 80
      ? 'text-emerald-300'
      : completionPercent >= 50
        ? 'text-amber-300'
        : 'text-red-300';

  return (
    <div className="relative overflow-hidden rounded-[22px] h-[220px] bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600">
      <div className="absolute inset-0">
        <div className="absolute top-[-80px] right-[-40px] w-[300px] h-[300px] rounded-full bg-violet-400/20 blur-[80px]" />
        <div className="absolute bottom-[-60px] left-[-30px] w-[250px] h-[250px] rounded-full bg-blue-400/20 blur-[80px]" />
        <div className="absolute top-[20px] left-[40%] w-[120px] h-[120px] rounded-full bg-fuchsia-300/15 blur-[60px]" />
      </div>

      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        }}
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)',
          backgroundSize: '200% 200%',
        }}
      />

      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/30"
          style={{
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.4,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}

      <div className="relative h-full px-7 py-6 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-white/60 text-[13px] font-semibold tracking-wider uppercase">
              Selected Strategy
            </p>
            <h2 className="text-white text-[28px] font-extrabold leading-tight tracking-tight">
              {strategyName}
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onChangeStrategy}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 shadow-none"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Change
          </Button>
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <p className="text-white/60 text-[13px] font-semibold">Trade Readiness</p>
            <div className="flex items-center gap-3">
              <span className={`text-[34px] font-bold leading-none tracking-tight ${readinessColor}`}>
                {completionPercent}%
              </span>
              <div className="flex flex-col gap-0.5">
                <StarRating rating={completionPercent >= 80 ? 4 : completionPercent >= 50 ? 3 : 2} />
                <p className="text-white/70 text-[12px] font-medium">Estimated Quality</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-[13px] font-medium">{qualityRating}</span>
            <ArrowRight className="w-4 h-4 text-white/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
