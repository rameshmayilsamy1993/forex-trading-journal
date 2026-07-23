import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Calendar,
  Droplets,
  Layers,
  Boxes,
  Shield,
  CheckCircle2,
  Clock,
  ChevronDown,
  Paperclip,
} from 'lucide-react';
import { cn } from '../ui/utils';

interface ChecklistCardProps {
  label: string;
  isChecked: boolean;
  required: boolean;
  index: number;
  onToggle: () => void;
  isExpanded: boolean;
  onExpandToggle: () => void;
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

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function ChecklistCard({
  label,
  isChecked,
  required,
  index,
  onToggle,
  isExpanded,
  onExpandToggle,
}: ChecklistCardProps) {
  const Icon = getIconForLabel(label);

  return (
    <motion.div
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        isChecked
          ? 'bg-emerald-50/60 border-emerald-200/80'
          : required
            ? 'bg-white border-[#E5EAF2] hover:border-amber-300/60'
            : 'bg-white border-[#E5EAF2] hover:border-[#CBD5E1]',
      )}
    >
      <button
        onClick={onExpandToggle}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200',
          'hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]',
          !isExpanded && 'hover:-translate-y-[1px]',
        )}
      >
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200',
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
              <CheckCircle2 className="w-5 h-5" />
            </motion.div>
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[14px] font-semibold leading-tight truncate',
                isChecked ? 'text-emerald-800' : 'text-[#0F172A]',
              )}
            >
              {label}
            </span>
            {required && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0',
                  isChecked
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700',
                )}
              >
                Required
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#64748B] mt-0.5 truncate">
            {getDescription(label)}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isChecked ? (
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Done
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
              <Clock className="w-3 h-3" />
              Pending
            </span>
          )}

          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200',
              isChecked
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-[#CBD5E1] hover:border-[#94A3B8]',
            )}
          >
            {isChecked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-4 pb-4 pt-1 border-t border-[#E5EAF2]/60">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                    Question
                  </label>
                  <select className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E5EAF2] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30">
                    <option>Select answer...</option>
                    <option>Yes</option>
                    <option>No</option>
                    <option>N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Add notes..."
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E5EAF2] rounded-lg text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                      Attachment
                    </label>
                    <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F8FAFC] border border-[#E5EAF2] border-dashed rounded-lg text-[12px] font-medium text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors">
                      <Paperclip className="w-3.5 h-3.5" />
                      Upload
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle();
                    }}
                    className={cn(
                      'px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200',
                      isChecked
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
                    )}
                  >
                    {isChecked ? 'Completed ✓' : 'Mark Complete'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
