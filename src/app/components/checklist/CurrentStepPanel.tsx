import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Layers, Boxes } from 'lucide-react';
import { cn } from '../ui/utils';

interface CurrentStepPanelProps {
  currentStep: number;
  totalSteps: number;
  currentRequirement: string;
  nextRequirement: string | null;
  estimatedMinutes: number;
}

export default function CurrentStepPanel({
  currentStep,
  totalSteps,
  currentRequirement,
  nextRequirement,
  estimatedMinutes,
}: CurrentStepPanelProps) {
  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-[#E5EAF2]/60">
      <h3 className="text-[15px] font-bold text-[#0F172A] mb-5 tracking-tight">Current Step</h3>

      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium text-[#64748B]">Progress</span>
        <span className="text-[13px] font-bold text-[#7C3AED] tabular-nums">
          Step {currentStep} of {totalSteps}
        </span>
      </div>

      <div className="h-1.5 bg-[#F1F5F9] rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
            Current Requirement
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRequirement}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-[14px] font-semibold text-violet-900">{currentRequirement}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {nextRequirement && (
          <>
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex justify-center"
            >
              <ArrowDown className="w-4 h-4 text-[#64748B]" />
            </motion.div>

            <div>
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                Next Requirement
              </p>
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF2]">
                <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center">
                  <Boxes className="w-4 h-4 text-[#64748B]" />
                </div>
                <span className="text-[14px] font-semibold text-[#64748B]">{nextRequirement}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-[#E5EAF2]">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#64748B]">Est. Completion</span>
          <span className="text-[14px] font-bold text-[#0F172A] tabular-nums">
            ~{estimatedMinutes} min
          </span>
        </div>
      </div>
    </div>
  );
}
