# Pre-Trade Checklist Redesign — Design Spec

**Date:** 2026-07-23
**Status:** Approved
**Approach:** In-Place Rewrite (Approach A)

## Objective

Redesign the Pre-Trade Checklist page from a tall, form-like layout into a modern SaaS dashboard inspired by Linear, Vercel, Framer, and TradingView. The result should be compact, premium, and information-dense without looking crowded.

## Current State

The existing `ChecklistExecutionPage.tsx` uses a 4-column layout:
- Column 1: `TimelinePanel` (vertical timeline)
- Column 2: `ProgressRing` + `ChecklistCard` grid
- Column 3: `CurrentStepPanel` + `TradeQualityCard` + `SummaryCards`

Problems: vertical timeline wastes space, cards are 96px tall, no filtering, no accordion expand, layout doesn't match modern SaaS dashboards.

## Design Decisions

### Layout: 70/30 Two-Column

```
┌─────────────────────────────────────────────────────────────┐
│  Pre-Trade Checklist                        [History] [New] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  StrategyHero (140px gradient card)                 │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────┬──────────────────────┐   │
│  │  Filter Bar                   │  Sidebar (sticky)    │   │
│  │  [All] [Required] [Pending]  │  ┌────────────────┐  │   │
│  │  [Completed]                 │  │ Progress Ring   │  │   │
│  │  ─────────────────────────── │  │ Trade Quality   │  │   │
│  │  Checklist Rows (72-80px)    │  │ Quick Actions   │  │   │
│  │  with accordion expand       │  └────────────────┘  │   │
│  └──────────────────────────────┴──────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Floating Bottom Bar (blur backdrop)                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

- **Desktop**: 70% left / 30% right
- **Tablet**: 65% left / 35% right
- **Mobile**: Single column, sidebar collapses below, floating bar stays fixed

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#7C3AED` | Buttons, active states, accents |
| Secondary | `#6366F1` | Gradients, hover states |
| Background | `#F8FAFC` | Page background |
| Cards | `#FFFFFF` | Card backgrounds |
| Border | `#E5E7EB` | Card borders, dividers |
| Success | `#22C55E` | Completed items, valid status |
| Warning | `#F59E0B` | Required badges, pending |
| Danger | `#EF4444` | Failed items, missing required |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Page Title | 36px | extrabold (800) |
| Section Title | 22px | bold (700) |
| Card Title | 18px | bold (700) |
| Item Title | 16px | semibold (600) |
| Description | 13px | medium (500) |
| Badges | 12px | bold (700) |

### Animations

All animations use Framer Motion with 200ms duration:
- **Hover**: scale 1.01, shadow increase, slight lift
- **Cards**: fade up on mount (staggered)
- **Sidebar**: sticky while scrolling
- **Accordion**: height animation on expand/collapse
- **Progress**: animated circular stroke + counter
- **Buttons**: micro-interaction on press

## Component Changes

### Rewrite: `ChecklistExecutionPage.tsx`

**Layout restructure:**
- Remove 4-column grid (`grid-cols-1 lg:grid-cols-4`)
- New 2-column grid: `grid-cols-1 lg:grid-cols-[7fr_3fr]`
- Remove `TimelinePanel` import and usage
- Add `ChecklistFilter` component above checklist rows
- Add `filterMode` state and `expandedItem` state
- Derive `filteredChecklist` via `useMemo`
- Merge `CurrentStepPanel` info into `ProgressRing` area
- Merge `SummaryCards` stats into sidebar

**New state:**
```typescript
const [filterMode, setFilterMode] = useState<'all' | 'required' | 'pending' | 'completed'>('all');
const [expandedItem, setExpandedItem] = useState<string | null>(null);
```

**Filtered checklist derivation:**
```typescript
const filteredChecklist = useMemo(() => {
  if (!selectedStrategy?.checklist) return [];
  return selectedStrategy.checklist.filter(item => {
    const isChecked = checkedItems.get(item.label);
    if (filterMode === 'required') return item.required;
    if (filterMode === 'pending') return !isChecked;
    if (filterMode === 'completed') return isChecked;
    return true;
  });
}, [selectedStrategy, checkedItems, filterMode]);
```

### Rewrite: `StrategyHero.tsx`

**Changes:**
- Height: 220px → 140px
- Remove animated floating particles (6 motion.divs)
- Keep gradient (`from-violet-600 via-purple-600 to-blue-600`)
- Keep glow orbs (2 blurred circles)
- Keep animated radial gradient overlay (subtle)
- Add "View Strategy Details →" link as secondary action
- Tighten padding: `px-7 py-6` → `px-6 py-5`

### Rewrite: `ChecklistCard.tsx`

**Convert from card to compact row:**
- Height: 96px → 72-80px
- Remove `rounded-[18px]` card styling
- New layout: single horizontal row with border-bottom
- Add accordion expand on click (Framer Motion height animation)
- Expanded state shows: Question dropdown, Notes input, Attachment button, Mark Complete button
- Hover: shadow increase + scale 1.01 + slight y-lift
- Keep icon mapping (getIconForLabel)
- Keep required badge styling
- Add status indicator (Pending/Completed/Failed) on right

**Expanded content (accordion):**
```
┌──────────────────────────────────────────────────────┐
│  🎯  Bias 1H and 4H     REQUIRED           Pending  ○│
├──────────────────────────────────────────────────────┤
│  Question  [Dropdown selector________________]       │
│  Notes     [Text input________________________]      │
│  Attach    [📎 Upload]              [Mark Complete ✓]│
└──────────────────────────────────────────────────────┘
```

### New: `ChecklistFilter.tsx`

**Filter bar above checklist rows:**
```
Checklist Items    9 Total    [All] [Required] [Pending] [Completed]
```

- Horizontal flex row
- "Checklist Items" label on left
- "9 Total" count in center
- Filter pills on right: `All`, `Required`, `Pending`, `Completed`
- Active pill: purple background, white text
- Inactive pill: light gray background, gray text
- Instant filter (no API call, client-side only)

### Rewrite: `ProgressRing.tsx`

**Minor changes:**
- Wrap in sidebar-compatible container
- Add "Step X of Y" info below the ring
- Add "Estimated completion: ~X min" text
- Keep SVG circular progress with animated stroke
- Keep animated counter

### Rewrite: `TradeQualityCard.tsx`

**Minor changes:**
- Compact sizing for sidebar (reduce padding)
- Keep score display, star rating, strength bar
- Keep animated counter

### Rewrite: `BottomActionBar.tsx`

**Changes:**
- Add `backdrop-filter: blur(16px)` to container
- Background: `rgba(255,255,255,0.8)` (glassmorphism)
- Keep Reset, Save Progress, Mark Trade Ready buttons
- "Mark Trade Ready" disabled until 100% required items completed
- When enabled: purple gradient with pulse glow animation

### Delete: `TimelinePanel.tsx`

Brief explicitly states: "Delete entire vertical timeline." This component is removed entirely.

### Merge into sidebar: `CurrentStepPanel.tsx`

The current/next step info merges into the ProgressRing area of the sidebar. The standalone `CurrentStepPanel.tsx` file is removed.

### Merge into sidebar: `SummaryCards.tsx`

The 2x2 summary grid merges into the sidebar as compact stat rows below the progress ring. The standalone `SummaryCards.tsx` file is removed.

## Responsive Behavior

| Breakpoint | Layout | Sidebar |
|------------|--------|---------|
| Desktop (>1024px) | 70/30 grid | Sticky, visible |
| Tablet (768-1024px) | 65/35 grid | Sticky, visible |
| Mobile (<768px) | Single column | Collapsed below checklist, toggleable |

Floating bottom bar remains fixed at all breakpoints.

## Accessibility

- All interactive elements have `aria-label` attributes
- Accordion uses `aria-expanded` and `aria-controls`
- Filter pills use `role="tablist"` and `role="tab"`
- Color contrast meets WCAG AA (4.5:1 for text)
- Keyboard navigation: Tab through rows, Enter/Space to toggle
- Focus visible states on all interactive elements

## Dark Mode Ready

Architecture supports dark mode via Tailwind's `dark:` prefix:
- All colors use semantic tokens (not hardcoded hex in components)
- Cards: `dark:bg-gray-900`
- Text: `dark:text-gray-100`
- Borders: `dark:border-gray-700`
- Default theme: light

## File Changes Summary

| Action | File | Reason |
|--------|------|--------|
| Rewrite | `ChecklistExecutionPage.tsx` | New 70/30 layout, filter state, accordion state |
| Rewrite | `StrategyHero.tsx` | 140px height, remove particles, add details link |
| Rewrite | `ChecklistCard.tsx` | 72-80px row, accordion expand, compact layout |
| Rewrite | `ProgressRing.tsx` | Sidebar integration, step info |
| Rewrite | `TradeQualityCard.tsx` | Compact sidebar sizing |
| Rewrite | `BottomActionBar.tsx` | Blur backdrop, glassmorphism |
| Add | `ChecklistFilter.tsx` | Filter bar component |
| Delete | `TimelinePanel.tsx` | Removed per brief |
| Delete | `CurrentStepPanel.tsx` | Merged into sidebar |
| Delete | `SummaryCards.tsx` | Merged into sidebar |
