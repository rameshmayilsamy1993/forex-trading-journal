import { motion } from 'framer-motion';
import {
  Target,
  Calendar,
  Droplets,
  Layers,
  Boxes,
  Shield,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '../ui/utils';

interface ChecklistCardProps {
  label: string;
  isChecked: boolean;
  required: boolean;
  index: number;
  onToggle: () => void;
}

const iconMap: Record<string, typeof Target> = {
  CRT: Target,
  QUARTER: Calendar,
  SWEEP: Droplets,
  IFVG: Layers,
  FVG: Boxes,
  RISK: Shield,
};

function getIconForLabel(label: string) {
  const upper = label.toUpperCase();
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (upper.includes(key)) return Icon;
  }
  return Target;
}

function getDescription(label: string): string {
  const upper = label.toUpperCase();
  if (upper.includes('CRT')) return 'Higher timeframe CRT candle identified';
  if (upper.includes('QUARTER') || upper.includes('Q1') || upper.includes('Q2')) return 'Quarterly bias established';
  if (upper.includes('SWEEP')) return 'Liquidity sweep detected on HTF';
  if (upper.includes('IFVG')) return 'Imbalance fair value gap formation';
  if (upper.includes('FVG')) return 'Fair value gap identified';
  if (upper.includes('RISK')) return 'Risk parameters validated';
  if (upper.includes('CONFIRM')) return 'Confirmation signal received';
  if (upper.includes('ENTRY')) return 'Entry criteria satisfied';
  return 'Checklist item pending review';
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function ChecklistCard({
  label,
  isChecked,
  required,
  index,
  onToggle,
}: ChecklistCardProps) {
  const Icon = getIconForLabel(label);

  return (
    <motion.button
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={cn(
        'w-full rounded-[18px] p-5 text-left transition-all duration-300 border-2',
        isChecked
          ? 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-400 shadow-[0_0_24px_rgba(34,197,94,0.15)]'
          : required
            ? 'bg-white border-amber-200/80 hover:border-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.04)]'
            : 'bg-white border-[#E5EAF2] hover:border-[#CBD5E1] shadow-[0_8px_24px_rgba(0,0,0,0.04)]',
      )}
      style={{ height: '96px' }}
    >
      <div className="flex items-center gap-4 h-full">
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
            isChecked
              ? 'bg-emerald-100 text-emerald-600'
              : required
                ? 'bg-amber-50 text-amber-600'
                : 'bg-[#F1F5F9] text-[#64748B]',
          )}
        >
          {isChecked ? (
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle2 className="w-6 h-6" />
            </motion.div>
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[16px] font-semibold leading-tight',
                isChecked ? 'text-emerald-900' : 'text-[#0F172A]',
              )}
            >
              {label}
            </span>
            {required && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase',
                  isChecked
                    ? 'bg-emerald-200 text-emerald-800'
                    : 'bg-amber-100 text-amber-700',
                )}
              >
                Required
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#64748B] mt-0.5 truncate">
            {getDescription(label)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isChecked ? (
            <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              +10 Score
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[12px] text-[#94A3B8]">
              <Clock className="w-3.5 h-3.5" />
              Pending
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
