# Dashboard Redesign — Design Document

**Date:** 2026-07-16
**Scope:** Full visual and structural redesign of the Dashboard page
**Style:** Glassmorphism on dark navy base, dense terminal-inspired layout

---

## 1. Visual Foundation

### Background
- Page shell: `#0B1620` (matching existing sidebar background)
- Cohesive with the app's existing dark sidebar

### Glass Surface System
| Token | Usage | CSS |
|-------|-------|-----|
| `glass-panel` | Major sections (stats bar, hero, charts, etc.) | `bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-[20px]` |
| `glass-card` | Sub-cards inside panels (account cards, insight cards) | `bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-[16px]` |
| `glass-chip` | Compact metric chips | `bg-white/[0.05] backdrop-blur-lg border border-white/[0.06] rounded-[10px]` |
| `glass-divider` | Separators between sections | `border-b border-white/[0.06]` (horizontal) or `w-px h-* bg-white/[0.06]` (vertical) |

### Typography on Dark Glass
- Primary text: `text-white/90` (87% — headings, values)
- Secondary text: `text-white/60` (60% — labels, subtitles)
- Tertiary text: `text-white/38` (38% — captions, hints)
- Keep existing type scale utilities: `text-display-xl`, `text-page-title`, `text-body`, `text-caption`, `text-micro`, `text-table-header`

### Accent Colors (unchanged from existing design system)
| Role | Color |
|------|-------|
| Primary accent | `#7C3AED` (violet) |
| Success | `#16A34A` (emerald) |
| Destructive | `#DC2626` (rose/red) |
| Warning | `#F59E0B` (amber) |

---

## 2. Layout & Sections

### Overall Grid
```
┌─────────────────────────────────────────────────────────────┐
│ Live Stats Bar (full width, single glass panel)              │
├─────────────────────────────────────────────────────────────┤
│ Portfolio Hero (glass panel with purple gradient tint)       │
├─────────────────────────────────────────────────────────────┤
│ Accounts Overview (glass panel, 3-column card grid)          │
├─────────────────────────────────────────────────────────────┤
│ Charts Row (2 glass panels: Equity Curve / Acct Perf)       │
├─────────────────────────────────────────────────────────────┤
│ Bottom Row (2 glass panels: Recent Activity / Insights)      │
└─────────────────────────────────────────────────────────────┘
```

Max content width: `max-w-[1600px] mx-auto`
Gap between sections: `gap-3` (12px)
Loading state: glass skeleton shimmer animation

---

### 2.1 Live Stats Bar

A single continuous glass panel spanning full width. 8 compact metric columns separated by vertical dividers.

```
┌─────────────────────────────────────────────────────────────────────┐
│ NET P/L      WIN RATE    PROFIT FACTOR   MAX DD    ACCOUNTS  TRADES │
│ +$2,341.20   68.5%       2.14             4.2%      3         147   │
│ ▲ +10.5%     ██████░     ██████░          ████░░                     │
│                                                                      │
│ STREAK       AVG RR       FIRMS           TODAY                      │
│ 5W           1:2.5        2 Active        +$124.50                   │
│ 🔥 Winning   ███████░                                                │
└─────────────────────────────────────────────────────────────────────┘
```

- 8 columns: Net P/L, Win Rate, Profit Factor, Max Drawdown, Active Accounts, Total Trades, Current Streak, Avg RR
- Two additional labels: Firms count, Today's P/L (smaller, subtly separated)
- Numeric values: `text-body` semibold, `tabular-nums`
- Labels: `text-micro` uppercase, `text-white/50`
- Trend direction: inline arrow icon (emerald for positive, rose for negative)
- Progress-style bars for Win Rate and PF (thin `h-1` bar under value)
- Vertical dividers: `w-px h-8 bg-white/[0.06]`

---

### 2.2 Portfolio Hero

Main hero glass panel with a subtle purple gradient tint overlay.

```
┌─────────────────────────────────────────────────────────────────┐
│ Portfolio Value                  ┌─────────────────────────┐    │
│ $24,582.40                       │  All Accounts ▼         │    │
│ +$2,341.20 (+10.5%)  ▲          └─────────────────────────┘    │
│                                                                 │
│ Net P/L     Trades     Win Rate     Avg RR     Drawdown         │
│ +$2,341      147        68.5%        1:2.5      4.2%            │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │  Equity Curve (AreaChart inside panel)                   │   │
│ │  ━━━━━━╱╲━━━╱╲━━━╱╲━━━━━━━━━━━━━━━                     │   │
│ │  Highest $25.1K   Lowest $22.0K   Current $24.6K         │   │
│ └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

- Background: `bg-white/[0.06]` with `before:bg-gradient-to-br before:from-[#7C3AED]/10 before:to-transparent`
- Portfolio value: `text-display-xl text-white`
- Account selector: glass select (`bg-white/[0.08]`, matching style)
- Equity curve chart: inline within panel, purple gradient fill
- Stat chips below chart: Highest, Lowest, Start, Current in a 4-col flex row

---

### 2.3 Accounts Overview

Glass panel with section header + 3-column card grid.

```
┌──────────────────────────────────────────────────────────────────┐
│ ● Accounts (3)                         [Firms: All ▼]  [+ Add]  │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│ │ Live Account │ │ Challenge #2 │ │ FTMO Phase 2 │              │
│ │ Funded       │ │ ACTIVE       │ │ PASSED_1     │              │
│ │ ──────────── │ │ ──────────── │ │ ──────────── │              │
│ │ $12,400      │ │ $8,200       │ │ $5,100       │              │
│ │ +$892 +8%    │ │ -$172 -2%    │ │ +$634 +12%   │              │
│ │ Drawdown ██  │ │ Drawdown ███ │ │ Drawdown ░░  │              │
│ │ ~~╱╲╱╲~~     │ │ ╱╲╱╲━━      │ │ ╱╲────╱╲─   │              │
│ │ ● Healthy    │ │ ● Warning    │ │ ● Healthy    │              │
│ └──────────────┘ └──────────────┘ └──────────────┘              │
│                                                  [View All →]  │
└──────────────────────────────────────────────────────────────────┘
```

- Section header: icon + title on left, filters/action on right
- Each card: `glass-card` with left 4px accent bar color-coded by health
- Card content: name, status badge, balance, P/L, profit %, drawdown bar, mini sparkline, health badge
- Drawdown: `<Progress>` component with gradient fill
- "View All Accounts" link if >3 cards

---

### 2.4 Charts Row

Two glass panels in a `grid-cols-2 gap-3` layout.

**Equity Curve (left):**
- AreaChart with purple gradient fill (`#7C3AED` at 20% → transparent)
- Line color: `#7C3AED`, stroke width 2
- Grid lines: `stroke-white/[0.06]`
- Tooltip: glass-styled floating panel
- Mini stat chips below: Highest, Lowest, Start, Current
- Time range selector (30d/90d/All) in header

**Account Performance (right):**
- BarChart with account P/L data
- Green bars: `#16A34A`, red bars: `#DC2626`
- Rounded bar tops: `radius={[4,4,0,0]}`
- Horizontal benchmark line at $0
- Firm filter in header

---

### 2.5 Recent Activity + Insights

**Recent Activity (left):**
- 5-7 most recent closed trades in compact list
- No individual card borders — clean separator lines
- Left accent bar: green/red `w-[3px]` rounded indicator
- Each row: pair, type badge (BUY/SELL), P/L, date, account, lot size
- "View All Trades →" link at bottom

**Trading Insights (right):**
- 2×2 grid of glass-chip highlight cards
- Best Pair: pair name + total profit
- Avg RR: ratio value + description
- Current Streak: count + type (wins/losses)
- W/L Ratio: wins/losses count + percentage
- Each card: icon (gradient purple treatment), value, subtitle

---

## 3. Component Decomposition

The monolithic `Dashboard.tsx` (712 lines) will be decomposed into focused sub-components under a new `Dashboard/` folder:

```
src/app/components/Dashboard/
  Dashboard.tsx              ← Orchestrator: loads data, passes props
  LiveStatsBar.tsx           ← Top stats bar
  PortfolioHero.tsx          ← Portfolio value + equity curve
  AccountOverviewCards.tsx   ← Accounts grid
  EquityCurveChart.tsx       ← Area chart panel
  AccountPerformanceChart.tsx ← Bar chart panel
  RecentActivity.tsx         ← Recent trades list
  TradingInsights.tsx        ← Insights grid
  useDashboardData.ts        ← Data fetching & computation hook
```

### Data Hook (`useDashboardData.ts`)
Encapsulates all data fetching, filtering, and memoized computations currently in the component body:
- `trades`, `accounts`, `firms` state
- `selectedAccount`, `selectedFirm` filter state
- All memoized values (stats, equityCurve, accountPerformance, pairPerformance, currentStreak, etc.)

### Loading State
Each section gets a glass skeleton placeholder:
- Stats bar: 8 shimmering rectangles in a row
- Hero: large shimmer rectangle
- Charts: shorter rectangles
- Using the existing `animate-pulse` with `bg-white/[0.05]` fill

### Empty States
- Stats bar shows `—` for no data
- Sections show empty state messages in `text-white/38` centered inside a dashed-border glass container

---

## 4. Glassmorphism CSS Utilities

Add to `src/styles/theme.css`:

```css
@utility glass-panel {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

@utility glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

@utility glass-chip {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

---

## 5. Files Touched

| File | Change |
|------|--------|
| `src/styles/theme.css` | Add glass-panel, glass-card, glass-chip utilities; add dark base variable |
| `src/app/components/Dashboard.tsx` | Replace with new implementation |
| `src/app/components/Dashboard/` (new) | Create decomposed sub-components |
| `src/app/components/ui/DesignSystem.tsx` | Update PageHeader/StatCard if needed for dark glass context |

---

## 6. Out of Scope

- Filter functionality changes (same account/firm filters, same behavior)
- New API endpoints or data model changes
- Dark mode toggle for the rest of the app (dashboard becomes the first dark view)
- Mobile responsive refinement (keep current responsive behavior)
