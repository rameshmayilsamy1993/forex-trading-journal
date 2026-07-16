import { motion } from 'framer-motion';
import { RotateCcw, Save, Zap, Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';

interface BottomActionBarProps {
  isReady: boolean;
  isSubmitting: boolean;
  onReset: () => void;
  onSubmit: () => void;
}

export default function BottomActionBar({
  isReady,
  isSubmitting,
  onReset,
  onSubmit,
}: BottomActionBarProps) {
  return (
    <div className="sticky bottom-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[#E5EAF2] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all duration-200">
            <Save className="w-4 h-4" />
            Save Progress
          </button>
        </div>

        <motion.button
          whileHover={isReady ? { scale: 1.02 } : {}}
          whileTap={isReady ? { scale: 0.98 } : {}}
          onClick={onSubmit}
          disabled={!isReady || isSubmitting}
          className={cn(
            'relative flex items-center gap-2.5 px-8 py-3 rounded-xl text-[14px] font-bold transition-all duration-300',
            isReady && !isSubmitting
              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5'
              : 'bg-[#E5EAF2] text-[#94A3B8] cursor-not-allowed',
          )}
        >
          {isReady && !isSubmitting && (
            <motion.div
              className="absolute inset-0 rounded-xl opacity-0"
              animate={{
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }}
            />
          )}
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Mark Trade Ready
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
