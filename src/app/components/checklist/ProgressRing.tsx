import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

interface ProgressRingProps {
  percent: number;
  completed: number;
  total: number;
  estimatedRemaining: number;
}

export default function ProgressRing({ percent, completed, total, estimatedRemaining }: ProgressRingProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, percent, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [percent, count]);

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-[#E5EAF2]/60 flex flex-col items-center">
      <div className="relative w-[180px] h-[180px] flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 180 180">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="8"
          />
          <motion.circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>
        <span className="text-[38px] font-extrabold tracking-tight text-[#0F172A] tabular-nums">
          <motion.span>{rounded}</motion.span>
          <span className="text-[20px] text-[#64748B] font-semibold">%</span>
        </span>
      </div>

      <div className="mt-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-[#16A34A]">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[13px] font-semibold">{completed} / {total} Completed</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[#64748B]">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[12px] font-medium">
            ~{estimatedRemaining} min remaining
          </span>
        </div>
      </div>
    </div>
  );
}
