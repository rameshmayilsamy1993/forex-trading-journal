# Trade Journal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply glassmorphism styling, add stats summary section, and enrich trade table/mobile cards with visual P/L bars and richer badges — without adding new columns.

**Architecture:** All changes are frontend-only. Stats are computed from existing `filteredTrades` using the existing `calculateTradeStats` helper. Three independent tasks modify three components: TradeJournal.tsx, TradeTable.tsx, TradeCard.tsx. No backend, no types, no new dependencies.

**Tech Stack:** React + TypeScript + Tailwind CSS (existing glass-panel/glass-card utilities in `theme.css`)

## Global Constraints

- No new columns added to the trade table
- No backend changes (no schema, no endpoints)
- All existing functionality preserved (select, bulk actions, filters, CRUD)
- Use existing `glass-panel`, `glass-card`, `glass-chip` utilities from `src/styles/theme.css`
- Use existing `calculateTradeStats` from `src/app/utils/calculations.ts` for stats
- No new external dependencies

---

### Task 1: Stats Summary Section (TradeJournal.tsx)

**Files:**
- Modify: `src/app/components/TradeJournal.tsx`

**Interfaces:**
- Consumes: `state.filteredTrades` (already available), `calculateTradeStats` from `../utils/calculations`
- Produces: Stats summary section rendered above `<TradeTable>` with 4 glass cards

This task adds a stats summary between the account balance summary and the trade form/table. It computes stats from `state.filteredTrades` and renders 4 glassmorphism cards: Win Rate, Net P/L, Profit Factor, Total Trades.

- [ ] **Step 1: Add import for calculateTradeStats**

At the top of `TradeJournal.tsx`, add to the existing imports from `../utils/calculations`:

```typescript
import { formatPrice, formatMoney, calculateTradeStats } from '../utils/calculations';
```

- [ ] **Step 2: Add computeStats call before the return**

After the `editingTrade` computation (around line 23), add:

```typescript
const tradeStats = useMemo(() => calculateTradeStats(state.filteredTrades), [state.filteredTrades]);
```

You'll need to add `useMemo` to the React import at the top if it's not already there (it's already imported in TradeJournal.tsx — check line 1).

- [ ] **Step 3: Add the stats summary section**

After the account balance summary block (after line 57's closing `</div>`), before the TradeForm comment (line 59), insert:

```tsx
{/* Stats Summary */}
{tradeStats && state.filteredTrades.filter(t => t.status === 'CLOSED').length > 0 && (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {/* Win Rate */}
    <div className="glass-panel rounded-[20px] p-4 flex flex-col items-center">
      <div className="relative w-14 h-14 mb-2">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#winRateGrad)" strokeWidth="3"
            strokeDasharray={`${tradeStats.winRate} ${100 - tradeStats.winRate}`}
            strokeLinecap="round" />
          <defs>
            <linearGradient id="winRateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-body-sm font-bold text-[#0F172A]">
          {tradeStats.winRate.toFixed(0)}%
        </span>
      </div>
      <p className="text-micro text-[#64748B] uppercase tracking-wider">Win Rate</p>
      <p className="text-caption text-[#94A3B8] mt-0.5">
        {tradeStats.winningTrades}W / {tradeStats.losingTrades}L
      </p>
    </div>

    {/* Net P/L */}
    <div className="glass-panel rounded-[20px] p-4 flex flex-col items-center justify-center">
      <p className={`text-card-title font-bold tabular-nums ${tradeStats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {formatMoney(tradeStats.netProfit, true)}
      </p>
      <p className="text-micro text-[#64748B] uppercase tracking-wider mt-1">Net P/L</p>
      <p className="text-caption text-[#94A3B8] mt-0.5">
        Avg W <span className="text-emerald-600 font-medium">{formatMoney(tradeStats.averageWin)}</span>
        {' / '}
        Avg L <span className="text-rose-600 font-medium">{formatMoney(tradeStats.averageLoss)}</span>
      </p>
    </div>

    {/* Profit Factor */}
    <div className="glass-panel rounded-[20px] p-4 flex flex-col items-center justify-center">
      <p className="text-card-title font-bold text-[#0F172A] tabular-nums">
        {tradeStats.profitFactor === Infinity ? '∞' : tradeStats.profitFactor.toFixed(2)}
      </p>
      <p className="text-micro text-[#64748B] uppercase tracking-wider mt-1">Profit Factor</p>
      <div className="flex items-center gap-2 mt-1.5 w-full max-w-[100px]">
        <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(tradeStats.totalProfit / (tradeStats.totalProfit + tradeStats.totalLoss) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>

    {/* Total Trades */}
    <div className="glass-panel rounded-[20px] p-4 flex flex-col items-center justify-center">
      <p className="text-card-title font-bold text-[#0F172A] tabular-nums">
        {tradeStats.totalTrades}
      </p>
      <p className="text-micro text-[#64748B] uppercase tracking-wider mt-1">Total Trades</p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="glass-chip text-micro px-2 py-0.5">{tradeStats.totalTrades} Closed</span>
        <span className="text-caption text-[#94A3B8]">
          {state.filteredTrades.filter(t => t.status === 'OPEN').length} Open
        </span>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify the build**

Run the dev server and confirm the stats cards render correctly above the table:

```bash
pnpm dev
```

Check that:
- Stats cards appear only when closed trades exist (otherwise hidden)
- Win Rate shows correct percentage with circular progress
- Net P/L is green for profit, red for loss
- Profit Factor shows bar with correct proportions
- Total Trades shows closed/open breakdown

---

### Task 2: Enhanced Desktop Table (TradeTable.tsx)

**Files:**
- Modify: `src/app/components/TradeTable.tsx`

**Interfaces:**
- Consumes: Same props as current (unchanged)
- Produces: Table with glassmorphism styling, P/L mini bars, row win/loss accents, glass-style action buttons

This task upgrades the desktop table (and filter bar) with:
- `glass-panel` class on container and filter bar
- Left-border accent per row (green for profit, red for loss, gray for open/breakeven)
- P/L mini horizontal bar behind the Real P/L value showing relative magnitude
- Glass-style icon buttons for actions
- Richer checklist badge with icon animation

- [ ] **Step 1: Update the filter bar container**

Replace the filter bar div's className at line 89:

**Old:**
```tsx
<div className="flex items-center gap-4 p-5 bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-[#E5E7EB] border-l-4 border-l-[#7C3AED]">
```

**New:**
```tsx
<div className="flex items-center gap-4 p-5 glass-panel rounded-[20px] border-l-4 border-l-[#7C3AED]">
```

- [ ] **Step 2: Update the table container**

Replace the table wrapper div at line 187:

**Old:**
```tsx
<div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-[#E5E7EB] transition-all duration-300 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)]">
```

**New:**
```tsx
<div className="glass-panel rounded-[20px] hover:glass-panel-hover">
```

- [ ] **Step 3: Add getTradeRealPL as a helper at top level**

The `getTradeRealPL` function already exists at line 49-51. Keep it.

- [ ] **Step 4: Add win/loss left-border accent to table rows**

Replace the `<TableRow>` at line 266 with:

**Old:**
```tsx
<TableRow key={trade.id} className={`group animate-in fade-in slide-in-from-bottom-1 duration-300 ${selectedTrades.includes(trade.id) ? 'bg-violet-50/50' : ''}`} style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
```

**New:**
```tsx
<TableRow key={trade.id} className={`group animate-in fade-in slide-in-from-bottom-1 duration-300 border-l-[3px] transition-all ${selectedTrades.includes(trade.id) ? 'bg-violet-50/50 border-l-violet-500' : getTradeRealPL(trade) > 0 ? 'border-l-emerald-500/30 hover:border-l-emerald-500' : getTradeRealPL(trade) < 0 ? 'border-l-rose-500/30 hover:border-l-rose-500' : 'border-l-transparent hover:border-l-slate-300'}`} style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
```

- [ ] **Step 5: Add P/L mini bar to Real P/L column**

Replace the Real P/L cell at lines 308-317:

**Old:**
```tsx
<TableCell className="text-right tabular-nums">
  {(() => {
    const realPL = getTradeRealPL(trade);
    return (
      <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${realPL > 0 ? 'text-emerald-700' : realPL < 0 ? 'text-rose-700' : 'text-slate-400'}`}>
        {formatMoney(realPL, true)}
      </span>
    );
  })()}
</TableCell>
```

**New:**
```tsx
<TableCell className="text-right tabular-nums">
  {(() => {
    const realPL = getTradeRealPL(trade);
    const absPL = Math.abs(realPL);
    return (
      <div className="relative flex items-center justify-end">
        {realPL !== 0 && (
          <div
            className={`absolute right-0 h-5 rounded-sm transition-all duration-300 ${realPL > 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}
            style={{ width: `${Math.min(absPL / 10, 100)}%`, maxWidth: '100%' }}
          />
        )}
        <span className={`relative z-10 inline-flex items-center gap-1 font-bold tabular-nums ${realPL > 0 ? 'text-emerald-700' : realPL < 0 ? 'text-rose-700' : 'text-slate-400'}`}>
          {formatMoney(realPL, true)}
        </span>
      </div>
    );
  })()}
</TableCell>
```

- [ ] **Step 6: Update action buttons to glass style**

Replace the action buttons div at lines 331-369:

**Old:**
```tsx
<div className="flex items-center justify-end gap-1">
  <button
    onClick={() => onChecklistDetails(trade)}
    className={`p-1.5 rounded-lg transition-all duration-150 ${(trade as any).checklistId ? 'text-violet-500 hover:text-violet-700 hover:bg-violet-50' : 'text-slate-400 hover:text-violet-700 hover:bg-violet-50'}`}
    title="Checklist"
  >
    <ClipboardCheck className="w-4 h-4" />
  </button>
  {getTradeRealPL(trade) < 0 && (
    <button
      onClick={() => onLossAnalysis(trade)}
      className={`p-1.5 rounded-lg transition-all duration-150 ${analysesMap[trade.id] ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' : 'text-rose-400 hover:text-rose-700 hover:bg-rose-50'}`}
      title={analysesMap[trade.id] ? 'View Loss Analysis' : 'Create Loss Analysis'}
    >
      <FileText className="w-4 h-4" />
    </button>
  )}
  <button
    onClick={() => onView(trade)}
    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
    title="View trade"
  >
    <Eye className="w-4 h-4" />
  </button>
  <button
    onClick={() => onEdit(trade)}
    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
    title="Edit"
  >
    <Edit2 className="w-4 h-4" />
  </button>
  <button
    onClick={() => onDelete(trade.id)}
    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-all duration-150"
    title="Delete"
  >
    <Trash2 className="w-4 h-4" />
  </button>
</div>
```

**New:**
```tsx
<div className="flex items-center justify-end gap-1">
  <button
    onClick={() => onChecklistDetails(trade)}
    className={`p-1.5 rounded-lg transition-all duration-150 glass-panel ${(trade as any).checklistId ? 'text-violet-500 hover:shadow-sm' : 'text-slate-400 hover:text-violet-600 hover:shadow-sm'}`}
    title="Checklist"
  >
    <ClipboardCheck className="w-4 h-4" />
  </button>
  {getTradeRealPL(trade) < 0 && (
    <button
      onClick={() => onLossAnalysis(trade)}
      className={`p-1.5 rounded-lg transition-all duration-150 glass-panel ${analysesMap[trade.id] ? 'text-orange-500 hover:shadow-sm' : 'text-rose-400 hover:text-rose-600 hover:shadow-sm'}`}
      title={analysesMap[trade.id] ? 'View Loss Analysis' : 'Create Loss Analysis'}
    >
      <FileText className="w-4 h-4" />
    </button>
  )}
  <button
    onClick={() => onView(trade)}
    className="p-1.5 rounded-lg transition-all duration-150 glass-panel text-slate-400 hover:text-slate-700 hover:shadow-sm"
    title="View trade"
  >
    <Eye className="w-4 h-4" />
  </button>
  <button
    onClick={() => onEdit(trade)}
    className="p-1.5 rounded-lg transition-all duration-150 glass-panel text-slate-400 hover:text-slate-700 hover:shadow-sm"
    title="Edit"
  >
    <Edit2 className="w-4 h-4" />
  </button>
  <button
    onClick={() => onDelete(trade.id)}
    className="p-1.5 rounded-lg transition-all duration-150 glass-panel text-rose-400 hover:text-rose-600 hover:shadow-sm"
    title="Delete"
  >
    <Trash2 className="w-4 h-4" />
  </button>
</div>
```

- [ ] **Step 7: Update the bulk actions buttons**

Replace the bulk buttons at lines 214-238. Keep the same structure but add `glass-panel-hover` interaction to the action buttons:

**Replace from `<div className="flex items-center gap-2">` at line 215:**

```tsx
<div className="flex items-center gap-2">
  <button
    onClick={onBulkLink}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white rounded-xl hover:from-[#6D28D9] hover:to-[#4338CA] transition-all duration-200 shadow-lg shadow-[#7C3AED]/25"
  >
    <Link2 className="w-4 h-4" />
    Link Checklist ({selectedTrades.length})
  </button>
  <button
    onClick={onBulkUnlink}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg shadow-amber-500/25"
  >
    <Unlink className="w-4 h-4" />
    Unlink ({selectedTrades.length})
  </button>
  <button
    onClick={onBulkDeleteClick}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl hover:from-rose-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-rose-500/25"
  >
    <Trash className="w-4 h-4" />
    Delete ({selectedTrades.length})
  </button>
</div>
```

- [ ] **Step 8: Verify the build**

```bash
pnpm dev
```

Check that:
- Filter bar and table have glass-panel styling
- Each row has left-border win/loss color accent
- P/L mini bars render behind profit values
- Action buttons have glass-style backgrounds
- All existing functionality works (select, filters, view, edit, delete)

---

### Task 3: Enhanced Mobile Cards (TradeCard.tsx)

**Files:**
- Modify: `src/app/components/TradeCard.tsx`

**Interfaces:**
- Consumes: Same props as current (unchanged)
- Produces: Card with glassmorphism styling, P/L bar, left-border win/loss accent, richer info display

- [ ] **Step 1: Apply glass-panel styling and win/loss accent to card**

Replace the outer div className at lines 23:

**Old:**
```tsx
<div className={`bg-white rounded-[20px] border-[#E5E7EB] p-4 space-y-3 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-400 ${isSelected ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : 'border'}`}>
```

**New:**
```tsx
<div className={`glass-panel rounded-[20px] p-4 space-y-3 transition-all duration-300 hover:glass-panel-hover animate-in fade-in slide-in-from-bottom-2 duration-400 border-l-[3px] ${isSelected ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : realPL > 0 ? 'border-l-emerald-500/50' : realPL < 0 ? 'border-l-rose-500/50' : 'border-l-transparent'}`}>
```

- [ ] **Step 2: Add P/L mini bar to profit display**

Replace the top section profit span (around line 36-38):

**Old:**
```tsx
<span className={`text-body font-bold ${realPL > 0 ? 'text-emerald-600' : realPL < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
  {formatMoney(realPL, true)}
</span>
```

**New:**
```tsx
<div className="relative">
  {realPL !== 0 && (
    <div
      className={`absolute -inset-x-2 -inset-y-1 rounded-lg transition-all duration-300 ${realPL > 0 ? 'bg-emerald-500/8' : 'bg-rose-500/8'}`}
    />
  )}
  <span className={`relative text-body font-bold ${realPL > 0 ? 'text-emerald-600' : realPL < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
    {formatMoney(realPL, true)}
  </span>
</div>
```

- [ ] **Step 3: Add R:R and Session badges to info grid**

After the "Checklist" row in the grid (around line 53), add two more rows with additional info:

Replace the grid at lines 40-54:

**Old:**
```tsx
<div className="grid grid-cols-2 gap-2 text-caption text-slate-500">
  <div><span className="block text-slate-400">Account</span><span className="font-medium text-slate-700">{getAccountName(trade, accounts)}</span></div>
  <div><span className="block text-slate-400">Lot Size</span><span className="font-medium text-slate-700">{trade.lotSize}</span></div>
  <div><span className="block text-slate-400">Entry</span><span className="font-medium text-slate-700 font-mono">{trade.entryPrice ? formatPrice(trade.entryPrice, trade.pair) : '-'}</span></div>
  <div><span className="block text-slate-400">Exit</span><span className="font-medium text-slate-700 font-mono">{trade.exitPrice ? formatPrice(trade.exitPrice, trade.pair) : '-'}</span></div>
  <div><span className="block text-slate-400">Date</span><span className="font-medium text-slate-700">{getLocalDateString(trade.entryDate)}</span></div>
  <div>
    <span className="block text-slate-400">Checklist</span>
    <span className="font-medium text-slate-700">
      {(trade as any).checklistId ? (
        <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="w-3 h-3" /> Linked</span>
      ) : '—'}
    </span>
  </div>
</div>
```

**New:**
```tsx
<div className="grid grid-cols-2 gap-y-2 gap-x-3 text-caption">
  <div><span className="block text-[#94A3B8] text-micro">Account</span><span className="font-medium text-[#0F172A] text-body-sm">{getAccountName(trade, accounts)}</span></div>
  <div><span className="block text-[#94A3B8] text-micro">Lot Size</span><span className="font-medium text-[#0F172A] text-body-sm">{trade.lotSize}</span></div>
  <div><span className="block text-[#94A3B8] text-micro">Entry</span><span className="font-medium text-[#0F172A] text-body-sm font-mono">{trade.entryPrice ? formatPrice(trade.entryPrice, trade.pair) : '-'}</span></div>
  <div><span className="block text-[#94A3B8] text-micro">Exit</span><span className="font-medium text-[#0F172A] text-body-sm font-mono">{trade.exitPrice ? formatPrice(trade.exitPrice, trade.pair) : '-'}</span></div>
  <div><span className="block text-[#94A3B8] text-micro">Date</span><span className="font-medium text-[#0F172A] text-body-sm">{getLocalDateString(trade.entryDate)}</span></div>
  <div>
    <span className="block text-[#94A3B8] text-micro">Checklist</span>
    <span className="font-medium text-[#0F172A] text-body-sm">
      {(trade as any).checklistId ? (
        <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="w-3 h-3" /> Linked</span>
      ) : '—'}
    </span>
  </div>
  {trade.riskRewardRatio && (
    <div>
      <span className="block text-[#94A3B8] text-micro">R:R</span>
      <span className="font-medium text-violet-600 text-body-sm">1:{trade.riskRewardRatio.toFixed(1)}</span>
    </div>
  )}
  <div>
    <span className="block text-[#94A3B8] text-micro">Status</span>
    <span className={`inline-flex items-center gap-1 text-micro font-semibold ${trade.status === 'OPEN' ? 'text-amber-600' : 'text-emerald-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${trade.status === 'OPEN' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      {trade.status}
    </span>
  </div>
</div>
```

- [ ] **Step 4: Update action buttons to glass style**

Replace the action buttons div at lines 55-59:

**Old:**
```tsx
<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
  <button onClick={() => onView(trade)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
  <button onClick={() => onEdit(trade)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
  <button onClick={() => onDelete(trade.id)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
</div>
```

**New:**
```tsx
<div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
  <button onClick={() => onView(trade)} className="p-1.5 rounded-lg glass-panel text-slate-400 hover:text-slate-700 hover:shadow-sm transition-all" title="View"><Eye className="w-4 h-4" /></button>
  <button onClick={() => onEdit(trade)} className="p-1.5 rounded-lg glass-panel text-slate-400 hover:text-slate-700 hover:shadow-sm transition-all" title="Edit"><Edit2 className="w-4 h-4" /></button>
  <button onClick={() => onDelete(trade.id)} className="p-1.5 rounded-lg glass-panel text-rose-400 hover:text-rose-600 hover:shadow-sm transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
</div>
```

- [ ] **Step 5: Verify the build**

```bash
pnpm dev
```

Check that:
- Cards have glass-panel styling with win/loss border accents
- P/L mini bars appear behind profit values
- Additional info (R:R, Status) renders when available
- Glass-style action buttons
- Cards work correctly at mobile viewport sizes
