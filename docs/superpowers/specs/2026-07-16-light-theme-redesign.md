# FX Journal — Light Theme Redesign

## Overview
Redesign the FX Journal from dark glassmorphism to a professional light theme with black fonts, slightly larger typography, clean white cards with soft shadows, and micro-interactions + page transition animations. Uses `ui-ux-pro-max` rules for all design decisions.

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-shell` | `#F8FAFC` | Page backgrounds |
| `--bg-surface` | `#FFFFFF` | Cards, panels, modals |
| `--bg-subtle` | `#F1F5F9` | Hover states, subdued sections |
| `--text-primary` | `#0F172A` | Headings, body, labels |
| `--text-secondary` | `#475569` | Muted text, descriptions |
| `--text-tertiary` | `#94A3B8` | Placeholders, disabled |
| `--accent` | `#7C3AED` | Buttons, links, highlights |
| `--accent-hover` | `#6D28D9` | Hover state for accent |
| `--accent-subtle` | `#EDE9FE` | Light accent bg (badges, pills) |
| `--success` | `#16A34A` | Profit, positive indicators |
| `--error` | `#DC2626` | Loss, destructive actions |
| `--warning` | `#F59E0B` | Warnings, alerts |
| `--border` | `#E2E8F0` | Card borders, dividers |
| `--border-strong` | `#CBD5E1` | Table headers, focus rings |

## Typography

Slightly larger than current dense sizing:

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| display-lg | 28px | 700 | Dashboard hero numbers |
| display | 24px | 700 | Page titles |
| page-title | 18px | 600 | Section headers |
| body | 15px | 400 | Paragraph text, table cells |
| body-sm | 14px | 400 | Secondary text, descriptions |
| table-header | 13px | 600 | Column headers |
| caption | 12px | 400 | Helper text, timestamps |
| micro | 11px | 500 | Badges, small labels |

Line height: `1.5` body, `1.3` headings. All text colored `#0F172A`.

## Surfaces & Cards

- **Cards:** `bg-white rounded-2xl shadow-sm border border-[#E2E8F0]`
- **Elevated cards** (hover): `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`
- **Modals:** `bg-white rounded-2xl shadow-xl border border-[#E2E8F0]`
- **Dropdowns/popovers:** `bg-white rounded-xl shadow-lg border border-[#E2E8F0]`
- **Sidebar:** `bg-white border-r border-[#E2E8F0]`
- **Inputs:** `bg-white border-[#E2E8F0] rounded-xl` focus: `ring-[#7C3AED]/20 ring-2 border-[#7C3AED]`
- **Buttons:** default gradient `from-[#7C3AED] to-[#4F46E5]`, outline `border-[#E2E8F0] bg-white text-[#0F172A]`

## Animations

### Micro-interactions (150-300ms)
- **Button press:** `scale-[0.97]` + transform 150ms ease-out
- **Card hover:** `hover:-translate-y-0.5 hover:shadow-md` 200ms ease-out
- **Row hover:** `bg-[#F1F5F9]` 150ms
- **Input focus:** border + ring transition 200ms
- **Popover/dropdown appear:** opacity + scaleY from 0.95 200ms
- **Loading skeletons:** shimmer animation 1.5s infinite

### Page transitions (via framer-motion)
- Route change: `fade + translateY(8px)` 250ms ease-out, exit 150ms
- List items stagger: 40ms per item, fade + slide up
- Modals: scale 0.95→1 + fade, spring stiffness 260 damping 24

### Reduced motion
- All animations respect `prefers-reduced-motion`: media query disables transform/opacity transitions, removes stagger delays

## Layout
- `max-w-7xl` container width
- Spacing: 4/8px rhythm (p-3, p-4, p-6, gap-3, gap-4, gap-6)
- No glass effects anywhere — all solid surfaces

## Files to Modify

### Task 1 — CSS Variables (`src/styles/theme.css`)
- Flip all color tokens from dark glass to light palette
- Update typography sizes to new scale
- Remove glass utility backgrounds, replace with solid white
- Keep utility class names but change their values

### Task 2 — Layout Components (DesignSystem.tsx)
- Updates to PageHeader, CardContainer, StatCard, etc.
- White bg with soft shadow instead of glass
- Black text throughout

### Task 3 — UI Inputs (button.tsx, input.tsx)
- Light theme variant colors for buttons
- Light theme input borders, bg, focus rings

### Task 4 — Login Page
- White card on #F8FAFC background
- Shadow, no glass

### Task 5 — Tables
- White table bg, slate borders, hover rows
- Remove any remaining glass from table components

### Task 6 — Popovers, Modals, Dropdowns
- White bg, shadow-lg, slate borders

### Task 7 — Image components
- Update overlays and backgrounds

### Task 8 — Animations
- Add framer-motion page transitions
- Add micro-interaction CSS animations
- Wire up AnimatePresence for route changes

## Anti-Patterns (to avoid, per ui-ux-pro-max)
- No glass effects (`backdrop-filter`, `bg-white/05` patterns)
- No emoji as icons (use Lucide)
- No layout-shifting transforms on press
- No animations over 500ms
- No reduced-motion violations
- No mixing shadow levels on the same surface type
- No hardcoded hex values in components (use CSS variables)
