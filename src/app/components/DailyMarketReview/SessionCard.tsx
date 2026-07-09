import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionCardProps {
  session: string;
  expectedBehavior: string;
  expectedLiquidity: string;
  expectedEntry: string;
}

const sessionColors: Record<string, string> = {
  Asian: 'from-amber-500 to-amber-600',
  London: 'from-blue-500 to-blue-600',
  'New York': 'from-emerald-500 to-emerald-600',
  'London/New York': 'from-purple-500 to-purple-600',
  Sydney: 'from-rose-500 to-rose-600',
  Frankfurt: 'from-cyan-500 to-cyan-600',
};

export default function SessionCard({ session, expectedBehavior, expectedLiquidity, expectedEntry }: SessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const gradient = sessionColors[session] || 'from-slate-500 to-slate-600';

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF2] shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#F8FAFC] transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Clock className="size-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-body font-semibold text-[#0F172A]">{session}</h3>
            <p className="text-caption text-[#94A3B8]">Session Plan</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="size-5 text-[#64748B]" />
        ) : (
          <ChevronDown className="size-5 text-[#64748B]" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="border-t border-[#E5EAF2]"
          >
            <div className="p-5 space-y-4">
              {expectedBehavior && (
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Expected Behavior</span>
                  <p className="text-body-sm text-[#0F172A] mt-1 leading-relaxed">{expectedBehavior}</p>
                </div>
              )}
              {expectedLiquidity && (
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Expected Liquidity</span>
                  <p className="text-body-sm text-[#0F172A] mt-1 leading-relaxed">{expectedLiquidity}</p>
                </div>
              )}
              {expectedEntry && (
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Expected Entry</span>
                  <p className="text-body-sm text-[#0F172A] mt-1 leading-relaxed">{expectedEntry}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
