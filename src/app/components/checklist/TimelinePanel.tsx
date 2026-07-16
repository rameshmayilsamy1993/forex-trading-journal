import { motion } from 'framer-motion';
import {
  Target,
  Calendar,
  Droplets,
  Layers,
  Boxes,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../ui/utils';

interface TimelineStep {
  label: string;
  abbreviation: string;
  status: 'completed' | 'current' | 'pending';
}

interface TimelinePanelProps {
  steps: TimelineStep[];
}

const abbrIconMap: Record<string, typeof Target> = {
  CRT: Target,
  QUARTER: Calendar,
  SWEEP: Droplets,
  IFVG: Layers,
  FVG: Boxes,
  RISK: Shield,
};

function getIconForAbbr(abbr: string) {
  const key = abbr.toUpperCase();
  return abbrIconMap[key] || Target;
}

export default function TimelinePanel({ steps }: TimelinePanelProps) {
  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-[#E5EAF2]/60">
      <h3 className="text-[15px] font-bold text-[#0F172A] mb-5 tracking-tight">
        Strategy Timeline
      </h3>

      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-[#E5EAF2]" />

        <div className="space-y-0">
          {steps.map((step, i) => {
            const Icon = getIconForAbbr(step.abbreviation);
            return (
              <div key={step.label} className="relative flex items-start gap-4 pb-6 last:pb-0">
                <div className="relative z-10">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                      step.status === 'completed' && 'bg-emerald-100 text-emerald-600',
                      step.status === 'current' &&
                        'bg-violet-100 text-violet-600 ring-4 ring-violet-200/50',
                      step.status === 'pending' && 'bg-[#F1F5F9] text-[#94A3B8]',
                    )}
                  >
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-4.5 h-4.5" />
                    )}
                  </div>
                </div>

                <div className="flex-1 pt-1.5">
                  <span
                    className={cn(
                      'text-[13px] font-semibold',
                      step.status === 'completed' && 'text-emerald-700',
                      step.status === 'current' && 'text-violet-700',
                      step.status === 'pending' && 'text-[#94A3B8]',
                    )}
                  >
                    {step.label}
                  </span>
                  <p
                    className={cn(
                      'text-[11px] font-medium mt-0.5',
                      step.status === 'pending' ? 'text-[#CBD5E1]' : 'text-[#64748B]',
                    )}
                  >
                    {step.abbreviation}
                  </p>
                </div>

                {step.status === 'current' && (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-violet-500 mt-3 mr-1 shrink-0"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
