# FX Journal UI Redesign - Design Document

**Date:** 2026-06-24
**Scope:** Visual/UI redesign only — no functional changes, no new features
**Areas:** Typography, Spacing, Table Design, Modal Design, Dashboard Cards

---

## 1. Typography

### Current State

- Base font: 15px (non-standard)
- Font scale: 12/14/15/16/18/24/32 — missing tiers, flat hierarchy
- h1=30px (text-3xl), h2=24px (text-2xl), h3=20px (text-xl) — already match proposed
- Heavy use of hardcoded text color values (`text-slate-600`, `text-slate-900`) instead of theme tokens

### Proposed

| Token | Current | Proposed | Rationale |
|-------|---------|----------|-----------|
| Base | 15px | **16px** | Standard, avoids iOS auto-zoom |
| h1 | 30px (text-3xl) | 30px (keep) | Already correct |
| h2 | 24px (text-2xl) | 24px (keep) | Already correct |
| h3 | 20px (text-xl) | 20px (keep) | Already correct |
| h4 | 16px (text-base) | 16px (keep) | Keep |
| Table header | 11px (text-xs) | 11px (text-xs) tracking-[0.08em] | Tighter tracking |
| Table cell | 13-14px | **13px (text-sm)** | Keep |

### Changes Required

- `src/styles/theme.css`: Change `--font-size: 15px` → `16px`

---

## 2. Spacing

### Current State

- Inconsistent padding: some cards `p-5`, others `p-4` or `p-6`
- Table rows: `py-3 px-4` — tight for touch targets
- Filter bar: `p-4` with `gap-3`
- Page sections: `space-y-6` — good, keep

### Proposed Scale (4px/8dp system)

| Token | Value | Usage |
|-------|-------|-------|
| --space-xs | 8px | Icon gaps, chip padding |
| --space-sm | 12px | Label-to-input gaps |
| --space-md | 16px | Card inner padding |
| --space-lg | 20px | Section padding within cards |
| --space-xl | 24px | Card outer padding, section gaps |
| --space-2xl | 32px | Modal padding, page sections |

### Changes Required

- Increase table cell padding: `py-3 px-4` → `py-3.5 px-5`
- Standardize filter bar gap: `gap-3` → `gap-4`
- Standardize modal body padding to `p-6` (already done)

---

## 3. Table Design

### Current State (post-Phase 2 Task 4)

The TradeJournal was split in Phase 2. TradeTable.tsx already uses the reusable `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` component system. However, CRTHistory.tsx, LiquidityHistory.tsx, and BiasHistory.tsx still use raw `<table>` with gradient headers.

### Proposed

| Element | Current | Proposed |
|---------|---------|----------|
| Container | Raw div | `TableCard` wrapper |
| Header | `bg-gradient-to-r from-slate-50 to-white` | Solid `bg-[#F8FAFC]` |
| Row hover | +shadow (jitters) | `hover:bg-[#F1F5F9]/60` only |
| Cells | `py-3 px-4` | `py-3.5 px-5` |
| Action buttons | 5 visible | Keep visible but `p-1.5` with tooltips |
| P/L font | bold | `tabular-nums` for alignment |

### Changes Required

- CRTHistory.tsx: Replace gradient table header with solid `bg-[#F8FAFC]`
- LiquidityHistory.tsx: Replace gradient header with solid `bg-[#F8FAFC]`
- BiasHistory.tsx: Replace gradient header with solid `bg-[#F8FAFC]`
- TradeTable.tsx: Apply `tabular-nums` to P/L cells

---

## 4. Modal Design

### Current State

Modal.tsx already matches the proposed state:
- Header: Already `from-slate-800 to-slate-700` ✓
- Close button: Already `hover:bg-white/25` ✓
- Scrim: Already `bg-slate-950/50 backdrop-blur-sm` ✓
- Footer: `bg-white border-t border-slate-200` ✓

No changes needed.

---

## 5. Dashboard Cards

### Current State

- DesignSystem.tsx: StatCard hover lift already removed, SectionCard already uses solid `bg-white`, trend arrows already use Lucide icons, tabular-nums already used
- Dashboard.tsx: Filter header still uses gradient `from-indigo-50/50 to-purple-50/50`; P/L values missing `tabular-nums`

### Proposed

| Element | Current | Proposed |
|---------|---------|----------|
| Filter header | Gradient | Solid `bg-white` |
| P/L values | font-bold | `tabular-nums` for alignment |

### Changes Required

- Dashboard.tsx: Filter header gradient → solid `bg-white`, add `tabular-nums` to P/L values

---

## 6. Unicode Arrows

### Current State

- H4History.tsx: Uses `↑`/`↓` unicode for direction display
- ChecklistBuilder.tsx: Uses `↑`/`↓` unicode for reorder buttons

### Proposed

Replace unicode directional arrows with Lucide `TrendingUp`/`TrendingDown` icons.

### Changes Required

- H4History.tsx: Replace `↑`/`↓` with Lucide icons
- ChecklistBuilder.tsx: Replace `↑`/`↓` with Lucide icons

---

## Files Touched

| File | Changes |
|------|---------|
| `src/styles/theme.css` | `--font-size: 15px` → `16px` |
| `src/app/components/TradeTable.tsx` | Cell padding `py-3 px-4` → `py-3.5 px-5`, filter gap `gap-3` → `gap-4`, `tabular-nums` on P/L |
| `src/app/components/Dashboard.tsx` | Filter header gradient → solid, `tabular-nums` on P/L |
| `src/app/components/CRTHistory.tsx` | Gradient table header → solid `bg-[#F8FAFC]` |
| `src/app/components/LiquidityHistory.tsx` | Gradient table header → solid `bg-[#F8FAFC]` |
| `src/app/components/BiasHistory.tsx` | Gradient table header → solid `bg-[#F8FAFC]` |
| `src/app/components/H4History.tsx` | Unicode arrows → Lucide icons |
| `src/app/components/ChecklistBuilder.tsx` | Unicode arrows → Lucide icons |
