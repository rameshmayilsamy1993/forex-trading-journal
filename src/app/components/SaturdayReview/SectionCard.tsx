import { useState } from 'react';
import { ChevronDown, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { cn } from '../ui/utils';

interface SectionCardProps {
  step: number;
  title: string;
  subtitle?: string;
  isComplete?: boolean;
  imageCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function SectionCard({ step, title, subtitle, isComplete = false, imageCount = 0, defaultOpen = false, children }: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF2] shadow-sm">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div className={cn('size-9 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0', isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-[#2563EB]')}>
          {step}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#0F172A]">{title}</h3>
          {subtitle && <p className="text-[12px] text-[#64748B] mt-0.5 truncate">{subtitle}</p>}
        </div>
        {imageCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[11px] font-medium text-[#64748B] shrink-0">
            <ImageIcon className="size-3" /> {imageCount}
          </span>
        )}
        {isComplete && <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />}
        <ChevronDown className={cn('size-4 text-[#94A3B8] shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="px-5 pb-6 pt-4 border-t border-[#F1F5F9]">{children}</div>}
    </div>
  );
}
