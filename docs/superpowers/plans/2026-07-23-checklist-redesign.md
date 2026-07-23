# Pre-Trade Checklist Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Pre-Trade Checklist page from a tall form-like layout into a compact, premium SaaS dashboard with 70/30 two-column layout, accordion checklist rows, sticky sidebar, and floating action bar.

**Architecture:** In-place rewrite of existing components in `src/app/components/checklist/`. New 70/30 grid layout in `ChecklistExecutionPage.tsx`. `TimelinePanel.tsx` deleted. `CurrentStepPanel.tsx` and `SummaryCards.tsx` merged into sidebar. New `ChecklistFilter.tsx` added.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React icons

## Global Constraints

- Light theme default, dark mode ready via `dark:` prefix
- Primary accent: `#7C3AED`, Secondary: `#6366F1`
- Background: `#F8FAFC`, Cards: `#FFFFFF`, Border: `#E5E7EB`
- Success: `#22C55E`, Warning: `#F59E0B`, Danger: `#EF4444`
- Border radius: 16px (cards), 12px (buttons/inputs)
- No comments in code unless absolutely necessary
- Use existing `cn()` utility from `./ui/utils`
- Use existing `Button` from `./ui/button`
- Framer Motion for all animations (200ms duration)
- Lucide React for all icons

---

## File Structure

```
src/app/components/checklist/
  ChecklistExecutionPage.tsx  — REWRITE: 70/30 layout, filter+accordion state
  StrategyHero.tsx            — REWRITE: 140px height, remove particles
  ChecklistCard.tsx           — REWRITE: 72-80px row, accordion expand
  ChecklistFilter.tsx         — NEW: Filter bar component
  ProgressRing.tsx            — REWRITE: Sidebar integration, step info
  TradeQualityCard.tsx        — REWRITE: Compact sidebar sizing
  BottomActionBar.tsx         — REWRITE: Blur backdrop, glassmorphism
  TimelinePanel.tsx           — DELETE
  CurrentStepPanel.tsx        — DELETE
  SummaryCards.tsx            — DELETE
```

---

### Task 1: Create ChecklistFilter Component

**Files:**
- Create: `src/app/components/checklist/ChecklistFilter.tsx`

**Interfaces:**
- Produces: `ChecklistFilter` component with props `{ total: number; filterMode: 'all' | 'required' | 'pending' | 'completed'; onFilterChange: (mode: 'all' | 'required' | 'pending' | 'completed') => void }`

- [ ] **Step 1: Create the ChecklistFilter component**

```tsx
import { cn } from '../ui/utils';

type FilterMode = 'all' | 'required' | 'pending' | 'completed';

interface ChecklistFilterProps {
  total: number;
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
}

const filters: { label: string; value: FilterMode }[] = [
  { label: 'All', value: 'all' },
  { label: 'Required', value: 'required' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

export default function ChecklistFilter({ total, filterMode, onFilterChange }: ChecklistFilterProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h3 className="text-[17px] font-bold text-[#0F172A] tracking-tight">
          Checklist Items
        </h3>
        <span className="text-[13px] font-medium text-[#64748B]">
          {total} Total
        </span>
      </div>

      <div className="flex gap-1 bg-[#F1F5F9] rounded-xl p-1">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200',
              filterMode === filter.value
                ? 'bg-[#7C3AED] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/50',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm dev` and check no errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/checklist/ChecklistFilter.tsx
git commit -m "feat: add ChecklistFilter component for checklist item filtering"
```

---

### Task 2: Rewrite StrategyHero to 140px Compact Card

**Files:**
- Modify: `src/app/components/checklist/StrategyHero.tsx` (full rewrite)

**Interfaces:**
- Consumes: none (standalone)
- Produces: `StrategyHero` component with same props interface `{ strategyName: string; completionPercent: number; qualityRating: string; onChangeStrategy: () => void; onViewDetails?: () => void }`

- [ ] **Step 1: Rewrite StrategyHero.tsx**

Replace entire file with:

```tsx
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

interface StrategyHeroProps {
  strategyName: string;
  completionPercent: number;
  qualityRating: string;
  onChangeStrategy: () => void;
  onViewDetails?: () => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? 'text-yellow-300' : 'text-white/20'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function StrategyHero({
  strategyName,
  completionPercent,
  qualityRating,
  onChangeStrategy,
  onViewDetails,
}: StrategyHeroProps) {
  const readinessColor =
    completionPercent >= 80
      ? 'text-emerald-300'
      : completionPercent >= 50
        ? 'text-amber-300'
        : 'text-red-300';

  return (
    <div className="relative overflow-hidden rounded-[18px] h-[140px] bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600">
      <div className="absolute inset-0">
        <div className="absolute top-[-60px] right-[-30px] w-[220px] h-[220px] rounded-full bg-violet-400/20 blur-[60px]" />
        <div className="absolute bottom-[-40px] left-[-20px] w-[180px] h-[180px] rounded-full bg-blue-400/20 blur-[60px]" />
      </div>

      <div className="relative h-full px-6 py-5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-white/60 text-[11px] font-semibold tracking-wider uppercase">
              Selected Strategy
            </p>
            <h2 className="text-white text-[22px] font-extrabold leading-tight tracking-tight">
              {strategyName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                View Details
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onChangeStrategy}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 shadow-none h-8"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Change
            </Button>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-white/60 text-[11px] font-semibold">Trade Readiness</p>
            <div className="flex items-center gap-3">
              <span className={`text-[28px] font-bold leading-none tracking-tight ${readinessColor}`}>
                {completionPercent}%
              </span>
              <div className="flex flex-col gap-0.5">
                <StarRating rating={completionPercent >= 80 ? 4 : completionPercent >= 50 ? 3 : 2} />
                <p className="text-white/60 text-[11px] font-medium">Estimated Quality</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <span className="text-[12px] font-medium">{qualityRating}</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm dev` and check no errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/checklist/StrategyHero.tsx
git commit -m "feat: compact StrategyHero card — 140px height, remove particles, add view details link"
```

---

### Task 3: Rewrite ChecklistCard as Compact Accordion Row

**Files:**
- Modify: `src/app/components/checklist/ChecklistCard.tsx` (full rewrite)

**Interfaces:**
- Consumes: none (standalone)
- Produces: `ChecklistCard` component with props `{ label: string; isChecked: boolean; required: boolean; index: number; onToggle: () => void; isExpanded: boolean; onExpandToggle: () => void }`

- [ ] **Step 1: Rewrite ChecklistCard.tsx**

Replace entire file with:

```tsx
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
  XCircle,
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
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm dev` and check no errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/checklist/ChecklistCard.tsx
git commit -m "feat: rewrite ChecklistCard as compact 72-80px accordion row with expand animation"
```

---

### Task 4: Rewrite ProgressRing for Sidebar

**Files:**
- Modify: `src/app/components/checklist/ProgressRing.tsx` (full rewrite)

**Interfaces:**
- Produces: `ProgressRing` component with props `{ percent: number; completed: number; total: number; currentStep: number; estimatedMinutes: number }`

- [ ] **Step 1: Rewrite ProgressRing.tsx**

Replace entire file with:

```tsx
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

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
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm dev` and check no errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/checklist/ProgressRing.tsx
git commit -m "feat: rewrite ProgressRing for sidebar — compact size, step info, stats"
```

---

### Task 5: Rewrite TradeQualityCard for Sidebar

**Files:**
- Modify: `src/app/components/checklist/TradeQualityCard.tsx` (full rewrite)

**Interfaces:**
- Produces: `TradeQualityCard` component with props `{ score: number }`

- [ ] **Step 1: Rewrite TradeQualityCard.tsx**

Replace entire file with:

```tsx
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import { cn } from '../ui/utils';

interface TradeQualityCardProps {
  score: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-[#E5EAF2]'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TradeQualityCard({ score }: TradeQualityCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, score, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [score, count]);

  const starRating = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  const statusText = score >= 90 ? 'Excellent' : score >= 75 ? 'Great' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor';
  const statusColor =
    score >= 75
      ? 'text-emerald-600 bg-emerald-50'
      : score >= 60
        ? 'text-amber-600 bg-amber-50'
        : 'text-red-600 bg-red-50';

  return (
    <div className="bg-white rounded-[16px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E5EAF2]/60">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-[#0F172A] tracking-tight">Trade Quality</h3>
        <Award className="w-4 h-4 text-[#F59E0B]" />
      </div>

      <div className="flex items-end gap-2 mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[36px] font-extrabold leading-none tracking-tight text-[#0F172A] tabular-nums">
            <motion.span>{rounded}</motion.span>
          </span>
          <span className="text-[14px] font-bold text-[#94A3B8]">/100</span>
        </div>
        <div className={`mb-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${statusColor}`}>
          {statusText}
        </div>
      </div>

      <StarRating rating={starRating} />

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-[#64748B]">Strength</span>
          <span className="text-[11px] font-semibold text-[#0F172A] tabular-nums">{score}%</span>
        </div>
        <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#64748B]">
        <TrendingUp className={cn('w-3 h-3', score >= 70 ? 'text-emerald-500' : 'text-[#94A3B8]')} />
        <span className="font-medium">
          {score >= 70 ? 'Setup meets quality threshold' : 'Improve setup quality'}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm dev` and check no errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/checklist/TradeQualityCard.tsx
git commit -m "feat: compact TradeQualityCard for sidebar — tighter sizing"
```

---

### Task 6: Rewrite BottomActionBar with Blur Backdrop

**Files:**
- Modify: `src/app/components/checklist/BottomActionBar.tsx` (full rewrite)

**Interfaces:**
- Produces: `BottomActionBar` component with props `{ isReady: boolean; isSubmitting: boolean; onReset: () => void; onSubmit: () => void }`

- [ ] **Step 1: Rewrite BottomActionBar.tsx**

Replace entire file with:

```tsx
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
    <div className="sticky bottom-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[#E5EAF2]/60 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all duration-200">
            <Save className="w-3.5 h-3.5" />
            Save Progress
          </button>
        </div>

        <motion.button
          whileHover={isReady ? { scale: 1.02 } : {}}
          whileTap={isReady ? { scale: 0.98 } : {}}
          onClick={onSubmit}
          disabled={!isReady || isSubmitting}
          className={cn(
            'relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300',
            isReady && !isSubmitting
              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5'
              : 'bg-[#E5EAF2] text-[#94A3B8] cursor-not-allowed',
          )}
        >
          {isReady && !isSubmitting && (
            <motion.div
              className="absolute inset-0 rounded-xl opacity-0"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }}
            />
          )}
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Mark Trade Ready
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm dev` and check no errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/checklist/BottomActionBar.tsx
git commit -m "feat: BottomActionBar with glassmorphism backdrop blur"
```

---

### Task 7: Delete Removed Components

**Files:**
- Delete: `src/app/components/checklist/TimelinePanel.tsx`
- Delete: `src/app/components/checklist/CurrentStepPanel.tsx`
- Delete: `src/app/components/checklist/SummaryCards.tsx`

- [ ] **Step 1: Delete TimelinePanel.tsx**

```bash
rm src/app/components/checklist/TimelinePanel.tsx
```

- [ ] **Step 2: Delete CurrentStepPanel.tsx**

```bash
rm src/app/components/checklist/CurrentStepPanel.tsx
```

- [ ] **Step 3: Delete SummaryCards.tsx**

```bash
rm src/app/components/checklist/SummaryCards.tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A src/app/components/checklist/
git commit -m "feat: remove TimelinePanel, CurrentStepPanel, SummaryCards — merged into sidebar"
```

---

### Task 8: Rewrite ChecklistExecutionPage with 70/30 Layout

**Files:**
- Modify: `src/app/components/ChecklistExecutionPage.tsx` (full rewrite)

**Interfaces:**
- Consumes: `StrategyHero`, `ChecklistFilter`, `ChecklistCard`, `ProgressRing`, `TradeQualityCard`, `BottomActionBar` from `./checklist/`
- Produces: Full page component

- [ ] **Step 1: Rewrite ChecklistExecutionPage.tsx**

Replace entire file with:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import apiService from '../services/apiService';
import { MasterData, ChecklistItemResult } from '../types/trading';
import { cn } from './ui/utils';
import StrategyHero from './checklist/StrategyHero';
import ChecklistFilter from './checklist/ChecklistFilter';
import ChecklistCard from './checklist/ChecklistCard';
import ProgressRing from './checklist/ProgressRing';
import TradeQualityCard from './checklist/TradeQualityCard';
import BottomActionBar from './checklist/BottomActionBar';

type FilterMode = 'all' | 'required' | 'pending' | 'completed';

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[16px] bg-gradient-to-r from-[#F1F5F9] via-[#E5EAF2] to-[#F1F5F9] bg-[length:200%_100%]',
        className,
      )}
      style={{ animation: 'shimmer 1.5s infinite' }}
    />
  );
}

function StrategySelector({
  strategies,
  onSelect,
}: {
  strategies: MasterData[];
  onSelect: (s: MasterData) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[18px] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-[#E5EAF2]/60"
    >
      <h3 className="text-[20px] font-bold text-[#0F172A] mb-2 tracking-tight">
        Select a Strategy
      </h3>
      <p className="text-[14px] text-[#64748B] mb-6">
        Choose a trading strategy to run its pre-trade checklist
      </p>

      {strategies.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <p className="mt-4 text-[15px] font-semibold text-[#0F172A]">
            No strategies with checklists available
          </p>
          <p className="text-[13px] text-[#64748B] mt-1">
            Create strategies with checklists first
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strategy, i) => (
            <motion.button
              key={strategy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(strategy)}
              className="p-5 bg-[#F8FAFC] rounded-[16px] border-2 border-[#E5EAF2] hover:border-violet-300 hover:bg-violet-50/30 transition-all duration-200 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-[15px] font-bold text-[#0F172A] group-hover:text-violet-700 transition-colors">
                {strategy.name}
              </p>
              <p className="text-[12px] text-[#64748B] mt-1.5">
                {strategy.checklist?.length} items &middot;{' '}
                {strategy.checklist?.filter((i) => i.required).length} required
              </p>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function HistoryChecklist({
  checklist,
  onDelete,
}: {
  checklist: any;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[16px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E5EAF2]/60"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
              checklist.isValid ? 'bg-emerald-50' : 'bg-red-50',
            )}
          >
            {checklist.isValid ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            ) : (
              <XCircle className="w-4.5 h-4.5 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#0F172A]">{checklist.strategyName}</p>
            <p className="text-[11px] font-mono font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded mt-1 inline-block">
              {checklist.sessionId}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase',
                  checklist.status === 'LINKED'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-emerald-100 text-emerald-700',
                )}
              >
                {checklist.status === 'LINKED' ? 'Linked' : 'Active'}
              </span>
              {checklist.status === 'LINKED' && checklist.linkedTrades?.length > 0 && (
                <span className="text-[11px] text-[#64748B]">
                  ({checklist.linkedTrades.length} trade{checklist.linkedTrades.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">
              {new Date(checklist.createdAt).toLocaleString()}
            </p>
            {checklist.pair && (
              <p className="text-[12px] font-semibold text-[#0F172A] mt-1">
                {checklist.pair} {checklist.tradeType}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-bold',
              checklist.isValid
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700',
            )}
          >
            {checklist.isValid ? 'Valid' : 'Invalid'}
          </div>
          <button
            onClick={() => onDelete(checklist.id)}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {checklist.items.slice(0, 6).map((item: ChecklistItemResult, index: number) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium',
              item.checked ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800',
            )}
          >
            {item.checked ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600 shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>

      {checklist.missingRequired?.length > 0 && (
        <div className="mt-2.5 p-2.5 bg-red-50 rounded-lg">
          <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
            Missing Required
          </p>
          <p className="text-[11px] text-red-700 mt-0.5">
            {checklist.missingRequired.join(', ')}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function ChecklistExecutionPage() {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<MasterData[]>([]);
  const [checklistHistory, setChecklistHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'execute' | 'history'>('execute');
  const [selectedStrategy, setSelectedStrategy] = useState<MasterData | null>(null);
  const [checkedItems, setCheckedItems] = useState<Map<string, boolean>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedChecklistId, setCompletedChecklistId] = useState<string | null>(null);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [strategiesData, historyData] = await Promise.all([
        apiService.getMasters('strategy'),
        apiService.checklists.getAll({ limit: 20 }),
      ]);
      setStrategies(strategiesData);
      setChecklistHistory(historyData.checklists || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChecklist = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this checklist?')) return;
    try {
      await apiService.checklists.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete checklist:', error);
    }
  };

  const strategiesWithChecklist = useMemo(
    () => strategies.filter((s) => s.checklist && s.checklist.length > 0),
    [strategies],
  );

  const progress = useMemo(() => {
    if (!selectedStrategy?.checklist) return { total: 0, completed: 0, required: [], requiredCompleted: 0 };
    const total = selectedStrategy.checklist.length;
    const completed = selectedStrategy.checklist.filter((item) => checkedItems.get(item.label)).length;
    const required = selectedStrategy.checklist.filter((item) => item.required);
    const requiredCompleted = required.filter((item) => checkedItems.get(item.label)).length;
    return { total, completed, required, requiredCompleted };
  }, [selectedStrategy, checkedItems]);

  const isValid = useMemo(
    () => progress.required.every((item) => checkedItems.get(item.label)),
    [progress, checkedItems],
  );

  const completionPercent = useMemo(
    () => (progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0),
    [progress],
  );

  const tradeScore = useMemo(
    () => (isValid ? Math.min(60 + completionPercent * 0.4, 100) : Math.min(completionPercent * 0.6, 60)),
    [isValid, completionPercent],
  );

  const currentStepIndex = useMemo(() => {
    if (!selectedStrategy?.checklist) return 0;
    const idx = selectedStrategy.checklist.findIndex((item) => !checkedItems.get(item.label));
    return idx === -1 ? selectedStrategy.checklist.length : idx + 1;
  }, [selectedStrategy, checkedItems]);

  const estimatedRemaining = useMemo(
    () => Math.max(1, progress.total - progress.completed),
    [progress],
  );

  const filteredChecklist = useMemo(() => {
    if (!selectedStrategy?.checklist) return [];
    return selectedStrategy.checklist.filter((item) => {
      const isChecked = checkedItems.get(item.label);
      if (filterMode === 'required') return item.required;
      if (filterMode === 'pending') return !isChecked;
      if (filterMode === 'completed') return isChecked;
      return true;
    });
  }, [selectedStrategy, checkedItems, filterMode]);

  const toggleItem = (label: string) => {
    setCheckedItems((prev) => {
      const newMap = new Map(prev);
      newMap.set(label, !prev.get(label));
      return newMap;
    });
  };

  const handleExpandToggle = (label: string) => {
    setExpandedItem((prev) => (prev === label ? null : label));
  };

  const handleStrategySelect = (strategy: MasterData) => {
    setSelectedStrategy(strategy);
    setCheckedItems(new Map());
    setCompletedChecklistId(null);
    setFilterMode('all');
    setExpandedItem(null);
  };

  const handleSubmit = async () => {
    if (!selectedStrategy || !isValid) return;

    setIsSubmitting(true);
    try {
      const items: ChecklistItemResult[] = selectedStrategy.checklist!.map((item) => ({
        label: item.label,
        checked: checkedItems.get(item.label) || false,
        required: item.required,
      }));

      const result = await apiService.checklists.create({
        strategyId: selectedStrategy.id,
        items,
      });

      setCompletedChecklistId(result.id);
      setCompletedSessionId(result.sessionId);

      await loadData();
    } catch (error) {
      console.error('Failed to save checklist:', error);
      alert('Failed to save checklist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedStrategy(null);
    setCheckedItems(new Map());
    setCompletedChecklistId(null);
    setFilterMode('all');
    setExpandedItem(null);
  };

  const handleProceedToTrade = () => {
    navigate('/trade/add', {
      state: {
        completedChecklistId,
        strategyName: selectedStrategy?.name,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">
        <Skeleton className="h-[50px] w-[280px]" />
        <Skeleton className="h-[140px] w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5">
          <div className="space-y-3">
            <Skeleton className="h-[44px]" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[260px]" />
            <Skeleton className="h-[180px]" />
            <Skeleton className="h-[80px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-none">
            Pre-Trade Checklist
          </h1>
          <p className="text-[13px] text-[#64748B] mt-1.5 font-medium">
            Complete checklist validation before entering trades
          </p>
        </div>

        <div className="flex gap-1 bg-[#F1F5F9] rounded-xl p-1">
          <button
            onClick={() => setActiveTab('execute')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 flex items-center gap-1.5',
              activeTab === 'execute'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]',
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            New Checklist
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 flex items-center gap-1.5',
              activeTab === 'history'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]',
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            History ({checklistHistory.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'execute' ? (
          <motion.div
            key="execute"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {!selectedStrategy ? (
              <StrategySelector
                strategies={strategiesWithChecklist}
                onSelect={handleStrategySelect}
              />
            ) : (
              <>
                <StrategyHero
                  strategyName={selectedStrategy.name}
                  completionPercent={completionPercent}
                  qualityRating={
                    tradeScore >= 80
                      ? 'Excellent Setup'
                      : tradeScore >= 60
                        ? 'Good Setup'
                        : 'Partial Setup'
                  }
                  onChangeStrategy={handleReset}
                />

                {completedChecklistId && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-emerald-50 to-white rounded-[16px] border-2 border-emerald-200 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold text-emerald-900">
                        Checklist Completed Successfully!
                      </p>
                      <p className="text-[12px] text-emerald-700 flex items-center gap-1.5 mt-0.5">
                        Session:{' '}
                        <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-semibold">
                          {completedSessionId}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={handleProceedToTrade}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-[12px] font-bold shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                      Proceed to Trade
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5">
                  <div className="space-y-0">
                    <ChecklistFilter
                      total={selectedStrategy.checklist?.length || 0}
                      filterMode={filterMode}
                      onFilterChange={setFilterMode}
                    />

                    <div className="space-y-2">
                      {filteredChecklist.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-[16px] border border-[#E5EAF2]/60">
                          <AlertCircle className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                          <p className="mt-3 text-[14px] font-semibold text-[#0F172A]">
                            No items match this filter
                          </p>
                          <p className="text-[12px] text-[#64748B] mt-1">
                            Try a different filter or complete all items
                          </p>
                        </div>
                      ) : (
                        filteredChecklist.map((item, index) => (
                          <ChecklistCard
                            key={`${item.label}-${index}`}
                            label={item.label}
                            isChecked={checkedItems.get(item.label) || false}
                            required={item.required}
                            index={index}
                            onToggle={() => toggleItem(item.label)}
                            isExpanded={expandedItem === item.label}
                            onExpandToggle={() => handleExpandToggle(item.label)}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                    <ProgressRing
                      percent={completionPercent}
                      completed={progress.completed}
                      total={progress.total}
                      currentStep={currentStepIndex}
                      estimatedMinutes={estimatedRemaining}
                    />
                    <TradeQualityCard score={Math.round(tradeScore)} />

                    <div className="bg-white rounded-[16px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E5EAF2]/60">
                      <h3 className="text-[13px] font-bold text-[#0F172A] mb-3 tracking-tight">
                        Quick Actions
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReset}
                          className="flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E5EAF2] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all"
                        >
                          Reset
                        </button>
                        <button className="flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E5EAF2] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all">
                          Save Progress
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <BottomActionBar
                  isReady={isValid}
                  isSubmitting={isSubmitting}
                  onReset={handleReset}
                  onSubmit={handleSubmit}
                />
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {checklistHistory.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 bg-white rounded-[18px] border-2 border-dashed border-[#E5EAF2]"
              >
                <Clock className="w-14 h-14 text-[#CBD5E1] mx-auto" />
                <h3 className="mt-4 text-[17px] font-bold text-[#0F172A]">No Checklists Yet</h3>
                <p className="mt-1.5 text-[13px] text-[#64748B]">
                  Complete a new checklist to see it here
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {checklistHistory.map((checklist) => (
                  <HistoryChecklist
                    key={checklist.id}
                    checklist={checklist}
                    onDelete={handleDeleteChecklist}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm dev` and check no errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ChecklistExecutionPage.tsx
git commit -m "feat: rewrite ChecklistExecutionPage — 70/30 layout, filter, accordion, sticky sidebar"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run dev server and verify no errors**

Run: `pnpm dev`
Expected: Server starts, no compilation errors

- [ ] **Step 2: Visual verification**

Check in browser:
- StrategyHero is 140px with gradient, no particles
- Checklist rows are 72-80px compact with accordion expand
- Filter bar works (All/Required/Pending/Completed)
- Sidebar is sticky while scrolling checklist
- ProgressRing shows animated circular progress
- TradeQualityCard shows score with stars
- Floating bottom bar has blur backdrop
- "Mark Trade Ready" button is disabled until all required items checked
- Mobile responsive: single column layout

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete checklist redesign — premium SaaS dashboard layout"
```
