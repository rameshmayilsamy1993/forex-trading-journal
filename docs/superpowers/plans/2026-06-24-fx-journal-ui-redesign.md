# FX Journal UI Redesign — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish UI across 5 areas — typography, spacing, table, modals, dashboard cards — without changing any functionality.

**Architecture:** Pure CSS and Tailwind class changes in existing files. No new components, no logic changes, no API changes. Each task is independently verifiable by visual inspection.

**Tech Stack:** React + TypeScript + Tailwind CSS v4 + Radix UI primitives

---

### Task 1: Typography — Font Scale & Base Size

**Files:**
- Modify: `src/styles/theme.css`

**Verification:** Check that h1 → h4 render at correct sizes. Confirm body text at 16px base.

- [ ] **Step 1: Update base font size and heading sizes**

In `src/styles/theme.css`, change:
- `--font-size: 15px` → `--font-size: 16px`
- h1: `font-size: var(--text-2xl)` → `font-size: var(--text-3xl)` (30px)
- h2: `font-size: var(--text-xl)` → `font-size: var(--text-2xl)` (24px)
- h3: `font-size: var(--text-lg)` → `font-size: var(--text-xl)` (20px)

- [ ] **Step 2: Visually verify** — open browser, inspect heading elements

---

### Task 2: Modal Header Unification

**Files:**
- Modify: `src/app/components/ui/Modal.tsx`

**Verification:** All modals (trade form, loss analysis, checklist details) show unified header with dark gradient, neutral close button, lighter scrim.

- [ ] **Step 1: Update Modal.tsx** — Change gradient header, fix close button, soften scrim

Changes in `Modal.tsx`:
- Scrim: `bg-slate-950/75 backdrop-blur-md` → `bg-slate-950/50 backdrop-blur-sm`
- Header gradient: `from-blue-600 to-indigo-600` → `from-slate-800 to-slate-700`
- Close button: `bg-white/10 hover:bg-red-500 hover:text-white rounded-full` → `bg-white/10 hover:bg-white/25 text-white/80 hover:text-white rounded-full`
- Footer: `bg-slate-50/50` → `bg-white`

- [ ] **Step 2: Update trade detail modal header** in TradeJournal.tsx to match unified pattern

In `TradeJournal.tsx`, find the trade detail modal header (around line 1784):
- `bg-slate-950` → `bg-gradient-to-r from-slate-800 to-slate-700`
- Close button: match the new pattern

- [ ] **Step 3: Visually verify** — open trade detail, loss analysis, checklist modals

---

### Task 3: Table Component Migration

**Files:**
- Modify: `src/app/components/TradeJournal.tsx`
- Reference: `src/app/components/ui/table.tsx`

**Verification:** Table renders identically (visually), no regressions in sorting, selection, or action buttons.

- [ ] **Step 1: Add imports** for table components in TradeJournal.tsx

Add to imports (around line 22):
```typescript
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
```

- [ ] **Step 2: Replace the inline table (~lines 1635-1771)**

Replace the wrapping div, `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements with reusable table components. Specifically:

- Container: `bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden` → `<Table>`
- Header row: `<tr>` inside `<TableHeader>` → `<TableRow>` inside `<TableHeader>`
- Header cells: `<th>` → `<TableHead>`
- Data rows: `<tr>` → `<TableRow>`
- Data cells: `<td>` → `<TableCell>`

Preserve all content, classes for badges/types/buttons, and event handlers.

- [ ] **Step 3: Fix row hover** — remove shadow from row hover

Remove `hover:shadow-sm` from row class, keep only `hover:bg-slate-50` (now handled by the Table component's `hover:bg-[#F1F5F9]/60`).

- [ ] **Step 4: Increase cell padding** — `py-3 px-4` → `py-3.5 px-5`

Apply via TableCell's className or override.

- [ ] **Step 5: Add tabular-nums to P/L cell**

Add `tabular-nums` to the P/L `<TableCell>`.

- [ ] **Step 6: Visually verify** — table renders with all rows, columns, actions intact

---

### Task 4: Dashboard Card Polish

**Files:**
- Modify: `src/app/components/Dashboard.tsx`
- Modify: `src/app/components/ui/DesignSystem.tsx`

**Verification:** StatCards don't lift on hover, SectionCard headers are flat white, numbers align consistently.

- [ ] **Step 1: Remove hover lift from StatCard**

In `DesignSystem.tsx` StatCard component (around line 114):
- Remove `hover:-translate-y-0.5`
- Keep `hover:shadow-[0_12px_32px_rgba(15,23,42,0.1)]` as subtle shadow increase on hover

- [ ] **Step 2: Flatten SectionCard header**

In `DesignSystem.tsx` SectionCard component (around line 187):
- `bg-gradient-to-r from-white to-[#F8FAFC]` → `bg-white`

- [ ] **Step 3: Add tabular-nums to stat values**

In `DesignSystem.tsx` StatCard value (around line 122):
- Add `tabular-nums` to the value `<p>` className

- [ ] **Step 4: Replace unicode arrows with Lucide icons** in StatCard trend

In `DesignSystem.tsx` StatCard trend section (around line 132):
- Replace `↑` and `↓` with `<TrendUp className="w-3 h-3" />` and `<TrendDown className="w-3 h-3" />`
- Import `TrendUp, TrendDown` from `lucide-react`

- [ ] **Step 5: Visually verify**

---

### Task 5: Spacing Standardization

**Files:**
- Modify: `src/app/components/TradeJournal.tsx`
- Modify: `src/app/components/LossReasonModal.tsx`
- Modify: `src/app/components/ChecklistDetailsModal.tsx`

**Verification:** Consistent padding across all components.

- [ ] **Step 1: Increase filter bar gap**

In TradeJournal.tsx filter bar section (around line 946):
- `gap-3` → `gap-4` between filter items

- [ ] **Step 2: Standardize modal body padding**

In `LossReasonModal.tsx` and `ChecklistDetailsModal.tsx`:
- Change modal body padding from `p-5 sm:p-6` to consistent `p-6` (since Modal content area already has this, just verify)

- [ ] **Step 3: Visually verify** — filter bar spacing, modal content spacing

---

### Task 6: Final Review

- [ ] **Step 1: Build project** — `pnpm build` (check for build errors)
- [ ] **Step 2: Visual review** — check each page in browser for regressions
