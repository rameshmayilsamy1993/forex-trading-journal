import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Target, TrendingUp } from 'lucide-react';
import { cn } from '../ui/utils';

interface SummaryCardData {
  label: string;
  value: number;
  icon: 'completed' | 'remaining' | 'required' | 'readiness';
}

const iconConfig = {
  completed: { Icon: CheckCircle2, gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50' },
  remaining: { Icon: AlertCircle, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
  required: { Icon: Target, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50' },
  readiness: { Icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50' },
};

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, count]);

  return (
    <span className={cn('tabular-nums', className)}>
      <motion.span>{rounded}</motion.span>
    </span>
  );
}

export default function SummaryCards({ items }: { items: SummaryCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const config = iconConfig[item.icon];
        const { Icon } = config;

        return (
          <div
            key={item.label}
            className="bg-white rounded-[16px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E5EAF2]/60"
          >
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.bg)}>
                <Icon className="w-5 h-5 text-[#0F172A]" />
              </div>
              <div>
                <AnimatedNumber
                  value={item.value}
                  className="text-[22px] font-extrabold text-[#0F172A] leading-none"
                />
                <p className="text-[11px] font-medium text-[#64748B] mt-0.5">{item.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
