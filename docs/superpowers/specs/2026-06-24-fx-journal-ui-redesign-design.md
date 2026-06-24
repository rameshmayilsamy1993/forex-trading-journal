# FX Journal UI Redesign - Design Document

**Date:** 2026-06-24
**Scope:** Visual/UI redesign only — no functional changes, no new features
**Areas:** Typography, Spacing, Table Design, Modal Design, Dashboard Cards

---

## 1. Typography

### Current State

- Base font: 15px (non-standard)
- Font scale: 12/14/15/16/18/24/32 — missing tiers, flat hierarchy
- h1=24px, h2=20px, h3=18px — insufficient differentiation
- Heavy use of hardcoded text color values (`text-slate-600`, `text-slate-900`) instead of theme tokens

### Proposed

| Token | Current | Proposed | Rationale |
|-------|---------|----------|-----------|
| Base | 15px | **16px** | Standard, avoids iOS auto-zoom |
| h1 | 24px (text-2xl) | **30px (text-3xl)** font-display | Stronger hierarchy |
| h2 | 20px (text-xl) | **24px (text-2xl)** | Clear step down |
| h3 | 18px (text-lg) | **20px (text-xl)** | Better differentiation |
| h4 | 16px (text-base) | **16px (text-base)** | Keep |
| Table header | 11px (text-xs) | 11px (text-xs) tracking-[0.08em] | Tighter tracking |
| Table cell | 13-14px | **13px (text-sm)** | Keep |

### Changes Required

- `src/styles/theme.css`: Update `@layer base` font sizes for h1-h3, change `--font-size` to 16px
- Replace hardcoded `text-slate-*` colors with theme token equivalents where possible

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
- Standardize modal body padding to `p-6`

---

## 3. Table Design

### Current State (TradeJournal.tsx ~lines 1636-1771)

- Uses raw `<table>` with inline Tailwind — **not** using reusable `table.tsx`
- Header: `bg-gradient-to-r from-slate-50 to-white` — unnecessary visual noise
- Row hover: `hover:bg-slate-50 hover:shadow-sm` — shadow causes layout jitter
- Action buttons: 5 inline `p-2 rounded-xl` buttons — overcrowded
- Fixed column widths: `w-[140px]`, `w-[300px]`, etc.
- Pair badge: `bg-slate-100 text-slate-800 border`

### Proposed

| Element | Current | Proposed |
|---------|---------|----------|
| Container | Raw div | Migrate to reusable `TableCard` |
| Header | Gradient | Solid `bg-[#F8FAFC]` (from `table.tsx`) |
| Row hover | +shadow (jitters) | `hover:bg-[#F1F5F9]/60` only |
| Cells | `py-3 px-4` | `py-3.5 px-5` |
| Action buttons | 5 visible | Keep visible but `p-1.5` with tooltips |
| P/L font | bold | `tabular-nums` for alignment |
| Pair badge | bordered | Subtle `bg-[#F1F5F9]` |

### Migration Path

Replace inline `<table>/<thead>/<tbody>/<tr>/<th>/<td>` with `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` from `./ui/table`.

---

## 4. Modal Design

### Current State

- `Modal.tsx` has gradient blue/purple header
- Trade detail modal (inline in TradeJournal) uses `bg-slate-950` header
- Two different header patterns = **inconsistent**
- Close button: `bg-white/10 hover:bg-red-500` — jarring color switch
- Scrim: `bg-slate-950/75 backdrop-blur-md` — heavy

### Proposed

| Element | Current | Proposed |
|---------|---------|----------|
| Header | Blue/purple gradient OR slate-950 | **Unified**: subtle dark gradient `from-slate-800 to-slate-700` for all modals |
| Close button | `hover:bg-red-500` | `hover:bg-white/25` — neutral |
| Scrim | `bg-slate-950/75 backdrop-blur-md` | `bg-slate-950/50 backdrop-blur-sm` — lighter |
| Footer | `bg-slate-50/50` | `bg-white border-t border-[#E5EAF2]` |
| Animation | `animate-in zoom-in-95` | Keep, add scrim `fade-in` |

### Changes Required

- Update `Modal.tsx` header to use `from-slate-800 to-slate-700`
- Update trade detail modal in TradeJournal.tsx to use same pattern (or reuse Modal component)
- Fix close button hover behavior

---

## 5. Dashboard Cards

### Current State

- `StatCard` has hover lift (`-translate-y-0.5`) — unnecessary motion for metrics
- `SectionCard` header: `from-white to-[#F8FAFC]` gradient
- Trend badges use arrow unicode (`↑` `↓`)
- PL numbers not using tabular-nums
- Performance rows have colored backgrounds with `/5` opacity

### Proposed

| Element | Current | Proposed |
|---------|---------|----------|
| StatCard hover | `-translate-y-0.5` | Remove; subtle shadow increase only |
| SectionCard header | Gradient | Solid `bg-white` — cleaner |
| Trend arrows | Unicode | Use Lucide `TrendUp`/`TrendDown` icons |
| Numbers | font-bold | `tabular-nums` for alignment |
| Hover lift | On StatCard + CardContainer | Only on CardContainer |

---

## Files Touched

| File | Changes |
|------|---------|
| `src/styles/theme.css` | Font scale, base size 16px, typography tokens |
| `src/app/components/ui/Modal.tsx` | Unified header, lighter scrim, close button |
| `src/app/components/ui/DesignSystem.tsx` | StatCard hover removal, tabular-nums |
| `src/app/components/TradeJournal.tsx` | Table migration to reusable components, spacing, table cells |
| `src/app/components/Dashboard.tsx` | StatCard hover removal, SectionCard headers, tabular-nums |
| `src/app/components/LossReasonModal.tsx` | Minor: padding consistency |
| `src/app/components/ChecklistDetailsModal.tsx` | Minor: padding consistency |
