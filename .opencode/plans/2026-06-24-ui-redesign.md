# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish FX Journal's UI with consistent typography, spacing, table styling, and icon parity.

**Architecture:** Eight files with independent, non-overlapping visual changes. No dependencies between tasks.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS 4, Lucide React

## Global Constraints

- Visual/UI redesign only — no functional changes, no new features
- Follow existing code style per file
- No new dependencies
- Build must pass after all changes

---

### Task 1: Typography + Spacing + Table/Dashboard Polish

**Files:**
- Modify: `src/styles/theme.css`
- Modify: `src/app/components/TradeTable.tsx`
- Modify: `src/app/components/Dashboard.tsx`

- [ ] **Step 1: Update base font size in theme.css**

In `src/styles/theme.css`, change:
```
--font-size: 15px;
```
to:
```
--font-size: 16px;
```

- [ ] **Step 2: Update TradeTable.tsx spacing and tabular-nums**

In `src/app/components/TradeTable.tsx`:

a. Find the filter bar container and change `gap-3` to `gap-4`:
```
<div className="flex gap-3 items-center">
```
→
```
<div className="flex gap-4 items-center">
```

b. Find the P/L cell in each table row (the cell with `realPL > 0 ... text-emerald-700` etc.) and add `tabular-nums` class to the `<span>` that renders the P/L value.

Specifically, around line 305-310, change:
```
<span className={`inline-flex items-center gap-1 font-bold ${realPL > 0 ? 'text-emerald-700' : realPL < 0 ? 'text-rose-700' : 'text-slate-400'}`}>
```
to:
```
<span className={`inline-flex items-center gap-1 font-bold tabular-nums ${realPL > 0 ? 'text-emerald-700' : realPL < 0 ? 'text-rose-700' : 'text-slate-400'}`}>
```

- [ ] **Step 3: Update Dashboard.tsx filter header and tabular-nums**

In `src/app/components/Dashboard.tsx`:

a. Line 141: Change:
```
<div className="px-5 py-4 border-b border-[#E5EAF2] bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
```
to:
```
<div className="px-5 py-4 border-b border-[#E5EAF2] bg-white">
```

b. Add `tabular-nums` to P/L values. Find the total P/L at line 233-238 and add `tabular-nums`:
```
className={`font-bold text-lg tabular-nums ${totalBalance - totalInitialBalance >= 0 ? ...}`}
```

- [ ] **Step 4: Verify frontend build**

```bash
node --max-old-space-size=8192 node_modules/vite/bin/vite.js build
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/theme.css src/app/components/TradeTable.tsx src/app/components/Dashboard.tsx
git commit -m "fix: update base font to 16px, standardize spacing, add tabular-nums"
```

---

### Task 2: Gradient Table Headers + Unicode Arrows

**Files:**
- Modify: `src/app/components/CRTHistory.tsx`
- Modify: `src/app/components/LiquidityHistory.tsx`
- Modify: `src/app/components/BiasHistory.tsx`
- Modify: `src/app/components/H4History.tsx`
- Modify: `src/app/components/ChecklistBuilder.tsx`

- [ ] **Step 1: Fix CRTHistory.tsx gradient header**

In `src/app/components/CRTHistory.tsx`, find:
```
<tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
```
Replace with:
```
<tr className="bg-[#F8FAFC] border-b border-slate-200">
```

- [ ] **Step 2: Fix LiquidityHistory.tsx gradient headers**

In `src/app/components/LiquidityHistory.tsx`:

a. Find the panel header:
```
<div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
```
Replace with:
```
<div className="p-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
```

b. Find the table header row:
```
<tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
```
Replace with:
```
<tr className="border-b border-slate-200 bg-[#F8FAFC]">
```

- [ ] **Step 3: Fix BiasHistory.tsx gradient header**

In `src/app/components/BiasHistory.tsx`:

a. Find the collapsible header:
```
className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white cursor-pointer hover:from-slate-100 hover:to-slate-50 transition-all duration-200"
```
Replace with:
```
className="flex items-center justify-between p-4 bg-[#F8FAFC] cursor-pointer hover:bg-slate-100 transition-all duration-200"
```

b. Find the table header row:
```
<tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
```
Replace with:
```
<tr className="border-b border-slate-200 bg-[#F8FAFC]">
```

- [ ] **Step 4: Fix H4History.tsx unicode arrows**

In `src/app/components/H4History.tsx`, find:
```
{dir === 'BULLISH' ? '↑' : dir === 'BEARISH' ? '↓' : '-'}
```
Replace with Lucide icons. First add imports for `TrendingUp` and `TrendingDown` at the top of the file (check if they're already imported). Then replace the unicode with JSX:

Before the replacement (add `TrendingUp, TrendingDown` to the existing Lucide imports if not present):
```typescript
import { ..., TrendingUp, TrendingDown } from 'lucide-react';
```

Replace:
```
{dir === 'BULLISH' ? '↑' : dir === 'BEARISH' ? '↓' : '-'}
```
with:
```
{dir === 'BULLISH' ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : dir === 'BEARISH' ? <TrendingDown className="w-4 h-4 text-rose-600" /> : <span className="text-slate-300">-</span>}
```

- [ ] **Step 5: Fix ChecklistBuilder.tsx unicode arrows**

In `src/app/components/ChecklistBuilder.tsx`, find the reorder buttons (around lines 107 and 115):

Replace:
```
↑
```
with:
```
<ChevronUp className="w-4 h-4" />
```

Replace:
```
↓
```
with:
```
<ChevronDown className="w-4 h-4" />
```

Check if `ChevronUp` and `ChevronDown` are already imported from `lucide-react`; if not, add them to the import.

- [ ] **Step 6: Verify frontend build**

```bash
node --max-old-space-size=8192 node_modules/vite/bin/vite.js build
```

- [ ] **Step 7: Commit**

```bash
git add src/app/components/CRTHistory.tsx src/app/components/LiquidityHistory.tsx src/app/components/BiasHistory.tsx src/app/components/H4History.tsx src/app/components/ChecklistBuilder.tsx
git commit -m "fix: replace gradient table headers with solid bg, unicode arrows with Lucide icons"
```
