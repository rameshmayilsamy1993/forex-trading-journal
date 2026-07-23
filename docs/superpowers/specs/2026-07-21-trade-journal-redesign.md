# Trade Journal Redesign — Glassmorphism Upgrade

## Overview

Redesign the Trade Journal list page with a split-view layout: a stats summary section at the top and the existing trade list (table + mobile cards) enhanced with glassmorphism styling, richer visual hierarchy, and mini data bars — without adding new columns.

## Scope

**Files modified:**
- `src/app/components/TradeJournal.tsx` — add stats summary section above TradeTable
- `src/app/components/TradeTable.tsx` — apply glassmorphism styling, P/L bars, richer badges
- `src/app/components/TradeCard.tsx` — apply glassmorphism styling, P/L bars, richer badges
- `src/app/utils/calculations.ts` — if needed (stats computation)

**No changes to:**
- Backend (no schema/endpoint changes)
- Types (no new fields)
- useTradeState hook (just consuming existing data)

## Section 1: Stats Summary (Top)

Four glassmorphism stat cards in a responsive row, computed from filtered trades:

| Card | Data | Visual Treatment |
|------|------|------------------|
| **Win Rate** | `wins / total * 100` | Circular SVG progress ring in gradient (green→purple), percentage center, win/loss count below |
| **Net P/L** | `totalProfit - totalLoss` | Large bold number with `+`/`-` prefix, green or red, with small `Avg Win / Avg Loss` text below |
| **Profit Factor** | `totalProfit / totalLoss` | Numeric value with mini horizontal comparison bar (green wins vs red losses) |
| **Total Trades** | `closed / open` | Large count, `X Closed / Y Open` pill breakdown below |

**Glassmorphism card style (shared token):**
```css
bg-white/70 backdrop-blur-xl rounded-[20px] border border-white/40 
shadow-[0_8px_32px_rgba(0,0,0,0.06)] 
```

## Section 2: Enhanced Table (Desktop)

Same columns — enriched presentation:

### Column Enhancements

| Column | Current | Enhanced |
|--------|---------|----------|
| Date | Plain text | `Mar 15, 2026` bold, time in muted secondary |
| Account | Firm dot + name | Firm dot + name + status badge (Active/Breached) inline |
| Pair | Gray badge | Gradient background badge (emerald-50→emerald-100 or rose-50→rose-100 based on type) |
| Type | Badge with icon | Same badge style, slightly larger icons |
| Entry / Exit | Mono numbers | Same but add tiny `SL: x.xxxx` / `TP: x.xxxx` as secondary text below |
| Real P/L | Colored text | Colored text + **mini horizontal bar** behind showing magnitude vs other trades in visible set |
| Checklist | "Linked" / "—" | Same but with icon animation on hover |
| Actions | Icon buttons | Glass-style icon buttons (`bg-white/50 backdrop-blur-sm`) with hover elevation |

### Row Styling
- **Selected row**: `bg-violet-50/70` with left accent border
- **Winning row**: subtle green left border accent
- **Losing row**: subtle red left border accent
- **Hover**: gentle elevation increase, background becomes `bg-white/80`

## Section 3: Enhanced Mobile Cards

TradeCard gets:
- Same glassmorphism background (`bg-white/70 backdrop-blur-xl`)
- P/L mini bar (horizontal gradient bar behind profit number)
- Entry/Exit prices shown with SL/TP as secondary text
- R:R ratio shown when available
- Trading session badge when present
- Same color-coded left border accent (green win / red loss)

## Section 4: Visual Tokens

```css
/* Glassmorphism base */
glass-bg:       bg-white/70 backdrop-blur-xl
glass-border:   border border-white/40  
glass-shadow:   shadow-[0_8px_32px_rgba(0,0,0,0.06)]
glass-hover:    hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]

/* Stats card gradient accent */
stat-accent:    bg-gradient-to-br from-violet-500 to-purple-600

/* P/L bar gradient */
pl-bar-win:     bg-gradient-to-r from-emerald-400 to-emerald-500
pl-bar-loss:    bg-gradient-to-r from-rose-400 to-rose-500
```

## Acceptance Criteria

1. Stats summary renders correctly when trades exist, shows `—` or zero states when empty
2. Table rows have glassmorphism styling with left-border win/loss accent
3. P/L bars appear behind profit values showing relative magnitude
4. Mobile cards upgraded with same glass styling and P/L bars
5. No new columns added to the table
6. All existing functionality (select, bulk actions, filters, CRUD) preserved
7. Responsive: stats cards wrap on small screens, table remains horizontally scrollable
