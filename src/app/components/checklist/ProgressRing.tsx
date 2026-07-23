import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ProgressRingProps {
  percent: number;
  completed: number;
  total: number;
  currentStep: number;
  estimatedMinutes: number;
}

export default function ProgressRing({ percent, completed, total, currentStep, estimatedMinutes }: ProgressRingProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, percent, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [percent, count]);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="bg-white rounded-[16px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E5EAF2]/60">
      <h3 className="text-[14px] font-bold text-[#0F172A] mb-4 tracking-tight">Progress</h3>

      <div className="flex flex-col items-center">
        <div className="relative w-[140px] h-[140px] flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="7"
            />
            <motion.circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="7"
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
          <span className="text-[32px] font-extrabold tracking-tight text-[#0F172A] tabular-nums">
            <motion.span>{rounded}</motion.span>
            <span className="text-[16px] text-[#64748B] font-semibold">%</span>
          </span>
        </div>

        <div className="mt-4 w-full space-y-2.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#64748B] font-medium">Completed</span>
            <span className="font-bold text-[#0F172A] tabular-nums">{completed} / {total}</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#64748B] font-medium">Pending</span>
            <span className="font-bold text-[#0F172A] tabular-nums">{total - completed}</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#64748B] font-medium">Remaining</span>
            <span className="font-bold text-[#0F172A] tabular-nums">{total - completed}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E5EAF2]/60 w-full">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#64748B] font-medium">Step</span>
            <span className="font-bold text-[#7C3AED] tabular-nums">
              {currentStep} of {total}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[#64748B]">
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-medium">
              ~{estimatedMinutes} min remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
