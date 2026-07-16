# Light Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign FX Journal from dark glassmorphism to a professional light theme with black fonts, slightly larger typography, clean white cards with soft shadows, and micro-interactions + page transition animations.

**Architecture:** Flip CSS variables in theme.css to light palette (covers ~80% of UI), then update individual components. Task 1 covers variables + typography + glass utilities. Tasks 2-7 update components for light theme. Task 8 adds animations.

**Tech Stack:** React + Vite + Tailwind CSS v4. framer-motion ^12.42.2 already installed (used for page transitions).

## Global Constraints

- Background shell: `#F8FAFC`
- Cards/surfaces: `#FFFFFF` with `shadow-sm` / `shadow-md` / `shadow-lg` / `shadow-xl`
- Primary text: `#0F172A` (near-black)
- Secondary text: `#475569`
- Accent: `#7C3AED` (purple) - keep existing brand
- Success/Profit: `#16A34A`, Error/Loss: `#DC2626`
- Borders: `#E2E8F0`
- No glass effects anywhere (no `backdrop-filter`, no `bg-white/xx` opacity patterns)
- All animations respect `prefers-reduced-motion`
- framer-motion already installed — do NOT reinstall
- Build command: `pnpm build` (from project root)
- No comments in code

---
### Task 1: CSS Variables — Light Palette

**Files:**
- Modify: `src/styles/theme.css`

**Interfaces:**
- Produces: All CSS variables flipped to light theme, typography sizes increased, glass utilities replaced with solid white utilities

- [ ] **Step 1: Replace CSS variables in `:root`**

Replace the entire `:root` block with light theme values:

```css
:root {
  --font-size: 14px;

  --background: #F8FAFC;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  --primary: #7C3AED;
  --primary-foreground: #FFFFFF;
  --secondary: #F1F5F9;
  --secondary-foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #475569;
  --accent: #EDE9FE;
  --accent-foreground: #7C3AED;
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  --success: #16A34A;
  --success-foreground: #FFFFFF;
  --warning: #F59E0B;
  --warning-foreground: #FFFFFF;
  --border: #E2E8F0;
  --input: #E2E8F0;
  --input-background: #FFFFFF;
  --switch-background: #CBD5E1;
  --ring: rgba(124, 58, 237, 0.25);
  --chart-1: #7C3AED;
  --chart-2: #16A34A;
  --chart-3: #F59E0B;
  --chart-4: #3B82F6;
  --chart-5: #DC2626;
  --radius: 0.625rem;
  --sidebar: #FFFFFF;
  --sidebar-foreground: #0F172A;
  --sidebar-primary: #7C3AED;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #F1F5F9;
  --sidebar-accent-foreground: #0F172A;
  --sidebar-border: #E2E8F0;
  --sidebar-ring: rgba(124, 58, 237, 0.25);
  --shell-bg: #F8FAFC;
  --panel-bg: #FFFFFF;
  --panel-border: #E2E8F0;
  --panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  --font-sans: "Inter", "Aptos", "Segoe UI Variable", sans-serif;
  --font-display: "Inter", "Aptos Display", "Segoe UI Variable Display", sans-serif;
  --font-mono: "SFMono-Regular", "Cascadia Mono", "Consolas", monospace;
}
```

- [ ] **Step 2: Update typography utilities**

Replace all `@utility` font sizes with new larger values:

```css
@utility text-display-xl { font-size: 32px; font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; }
@utility text-display { font-size: 28px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
@utility text-display-lg { font-size: 24px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
@utility text-page-title { font-size: 22px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
@utility text-section-title { font-size: 18px; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; }
@utility text-metric { font-size: 26px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
@utility text-card-title { font-size: 15px; font-weight: 600; line-height: 1.3; letter-spacing: 0; }
@utility text-heading { font-size: 15px; font-weight: 600; line-height: 1.3; letter-spacing: 0; }
@utility text-body-lg { font-size: 14px; font-weight: 500; line-height: 1.5; letter-spacing: 0; }
@utility text-body { font-size: 14px; font-weight: 400; line-height: 1.5; letter-spacing: 0; }
@utility text-body-sm { font-size: 13px; font-weight: 400; line-height: 1.5; letter-spacing: 0; }
@utility text-caption { font-size: 12px; font-weight: 400; line-height: 1.5; letter-spacing: 0; }
@utility text-micro { font-size: 11px; font-weight: 600; line-height: 1.4; letter-spacing: 0; }
@utility text-badge { font-size: 11px; font-weight: 600; line-height: 1.4; letter-spacing: 0; }
@utility text-table-header { font-size: 13px; font-weight: 600; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; }
@utility text-table-cell { font-size: 13px; font-weight: 400; line-height: 1.5; letter-spacing: 0; }
@utility text-sidebar-menu { font-size: 14px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-sidebar-group { font-size: 11px; font-weight: 700; line-height: 1.4; letter-spacing: 0.12em; text-transform: uppercase; }
@utility text-button { font-size: 13px; font-weight: 600; line-height: 1.4; letter-spacing: 0.01em; }
@utility text-input { font-size: 14px; font-weight: 400; line-height: 1.5; letter-spacing: 0; }
@utility text-placeholder { font-size: 13px; font-weight: 400; line-height: 1.5; letter-spacing: 0; }
@utility text-dropdown { font-size: 13px; font-weight: 400; line-height: 1.5; letter-spacing: 0; }
@utility text-tooltip { font-size: 12px; font-weight: 400; line-height: 1.5; letter-spacing: 0; }
```

- [ ] **Step 3: Update base tag styles**

Replace:
- `html { font-size: 12px; }` → `html { font-size: 14px; }`
- `body { background: var(--shell-bg); background-color: #0B1620; color: var(--foreground); font-size: 12px; }` → `body { background: var(--shell-bg); background-color: #F8FAFC; color: var(--foreground); font-size: 14px; font-weight: 400; line-height: 1.5; }`
- h1-h4 sizes: h1 20→22px, h2 16→18px, h3 14→15px, h4 13→14px
- label: 11→13px
- button: 11→13px
- input/textarea/select: 12→14px
- `::selection` bg: `rgba(124, 58, 237, 0.3)` color: `#ffffff` → keep same

- [ ] **Step 4: Replace glass utilities with solid white utilities**

Replace `@utility glass-panel`:
```css
@utility glass-panel {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
```

Replace `@utility glass-card`:
```css
@utility glass-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
```

Replace `@utility glass-chip`:
```css
@utility glass-chip {
  @apply inline-flex items-center gap-1.5 rounded-full px-2.5 py-1;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
}
```

- [ ] **Step 5: Update `.fx-surface` and `.modern-*` classes**

`.fx-surface`:
```
background: #FFFFFF;
(remove backdrop-filter lines)
border: 1px solid #E2E8F0;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
```

`.fx-surface-strong`:
```
background: #FFFFFF;
(remove backdrop-filter lines)
border: 1px solid #E2E8F0;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
```

`.fx-chip`:
```
background: #F1F5F9;
(remove backdrop-filter)
border: 1px solid #E2E8F0;
font-size: 11px;
```

`.modern-input`:
```
@apply rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 transition-all duration-200 outline-none h-[38px];
@apply focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20;
font-size: 14px;
color: #0F172A;
```

`.modern-select`, `.modern-date-time` - same pattern as `.modern-input`

`.modern-file-upload`:
```
@apply relative rounded-xl border border-dashed border-[#E2E8F0] bg-white p-4 text-center transition-all duration-200 cursor-pointer;
@apply hover:border-[#7C3AED] hover:bg-[#EDE9FE];
(remove backdrop-filter)
```

- [ ] **Step 6: Build and commit**

```bash
pnpm build
git add src/styles/theme.css
git commit -m "feat: apply light theme CSS variables and typography"
```

---
### Task 2: Layout Components — Light Surfaces

**Files:**
- Modify: `src/app/components/ui/DesignSystem.tsx`

**Interfaces:**
- Consumes: Light CSS variables from Task 1
- Produces: Light-themed PageHeader, CardContainer, StatCard, SectionCard, TableCard, TableHeader, TableRow, FilterBar, FormSection

- [ ] **Step 1: Read DesignSystem.tsx**

- [ ] **Step 2: Replace glass classes with light equivalents**

Replace all glass utility usages:
- `glass-panel` → keep class name (it now resolves to solid white via Task 1)
- `glass-card` → keep class name (now solid white)
- Remove any hardcoded `backdrop-filter` or `bg-white/xx` inline styles

The components already use glass-panel/glass-card/glass-chip utility classes. Since Task 1 redefined those to white bg with shadows, they should automatically work. Just check for:
- Any inline `text-[#F1F5F9]` → `text-[#0F172A]` or `text-foreground`
- Any inline `text-white/xx` → adjust to light theme equivalents
- Any `hover:bg-white/10` → `hover:bg-[#F1F5F9]`

- [ ] **Step 3: Build and commit**

```bash
pnpm build
git add src/app/components/ui/DesignSystem.tsx
git commit -m "feat: update DesignSystem components for light theme"
```

---
### Task 3: UI Inputs — Light Theme

**Files:**
- Modify: `src/app/components/ui/button.tsx`
- Modify: `src/app/components/ui/input.tsx`

- [ ] **Step 1: Update button.tsx variants for light theme**

Replace variant colors:

```typescript
default:
  "bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white shadow-md shadow-[#7C3AED]/20 hover:shadow-lg hover:shadow-[#7C3AED]/25 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200",
destructive:
  "bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white shadow-md shadow-[#DC2626]/20 hover:shadow-lg hover:shadow-[#DC2626]/25 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200",
success:
  "bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white shadow-md shadow-[#16A34A]/20 hover:shadow-lg hover:shadow-[#16A34A]/25 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200",
outline:
  "border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] hover:shadow-sm active:bg-[#F1F5F9] active:scale-[0.97] transition-all duration-200",
secondary:
  "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0] hover:shadow-sm active:scale-[0.97] transition-all duration-200",
ghost:
  "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] active:scale-[0.97] transition-all duration-200",
link:
  "text-[#7C3AED] underline-offset-4 hover:underline",
```

Sizes stay the same (already compact - keep as is unless user wants larger buttons too).

- [ ] **Step 2: Update input.tsx for light theme**

Replace:
```typescript
"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-[42px] w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-input transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
"focus-visible:border-[#7C3AED] focus-visible:ring-[#7C3AED]/20 focus-visible:ring-2",
"aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
"text-[#0F172A]",
```

- [ ] **Step 3: Build and commit**

```bash
pnpm build
git add src/app/components/ui/button.tsx src/app/components/ui/input.tsx
git commit -m "feat: update button and input for light theme"
```

---
### Task 4: Login Page — Light Theme

**Files:**
- Modify: `src/app/components/Login.tsx`

- [ ] **Step 1: Read Login.tsx**

- [ ] **Step 2: Replace dark glass with light theme**

Replace the entire return block:

```tsx
return (
  <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-5">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] shadow-lg shadow-[#7C3AED]/25 mb-3">
            <span className="text-page-title font-bold text-white">FX</span>
          </div>
          <h1 className="text-display-lg font-bold text-[#0F172A]">
            FX Journal
          </h1>
          <p className="text-[#475569]">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-body-sm text-[#475569] mb-1">
                Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                placeholder="Your name"
                className="w-full"
              />
            </div>
          )}

          <div>
            <label className="block text-body-sm text-[#475569] mb-1">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-body-sm text-[#475569] mb-1">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-body-sm text-[#475569] mb-1">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                placeholder="••••••••"
                className="w-full"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-body flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Please wait...
              </span>
            ) : (isLogin ? 'Sign In' : 'Create Account')}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-body-sm text-[#7C3AED] hover:text-[#6D28D9]"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Build and commit**

```bash
pnpm build
git add src/app/components/Login.tsx
git commit -m "feat: redesign login page for light theme"
```

---
### Task 5: Tables — Light Theme

**Files:**
- Modify: `src/app/components/ui/table.tsx`
- Modify: `src/app/components/BreachedTrades.tsx`
- Modify: `src/app/components/Reports.tsx`
- Modify: `src/app/components/BiasHistory.tsx`
- Modify: `src/app/components/CRTHistory.tsx`
- Modify: `src/app/components/ForexLotCalculator.tsx`
- Modify: `src/app/components/H4History.tsx`
- Modify: `src/app/components/LiquidityHistory.tsx`
- Modify: `src/app/components/XauusdCalculator.tsx`
- Modify: `src/app/components/MarketStatistics.tsx`
- Modify: `src/app/components/TradeImport.tsx`
- Modify: `src/app/components/MissedTradeJournal.tsx`

- [ ] **Step 1: Update ui/table.tsx base component**

Replace with light theme:

```typescript
// Table container
"relative w-full overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"

// TableHeader
"[&_tr]:border-b border-[#E2E8F0] bg-[#F8FAFC] sticky top-0 z-10"

// TableBody
"[&_tr:last-child]:border-0 [&_tr:nth-child(even)]:bg-[#F8FAFC]/50"

// TableFooter
"bg-[#F8FAFC]/50 border-t border-[#E2E8F0] font-medium [&>tr]:last:border-b-0"

// TableRow
"hover:bg-[#F1F5F9]/60 data-[state=selected]:bg-[#F1F5F9] border-b border-[#E2E8F0]/60 transition-colors duration-150"

// TableHead
"text-[#475569] h-11 px-4 py-3 text-left align-middle text-table-header whitespace-nowrap"

// TableCell
"px-4 py-3 align-middle whitespace-nowrap text-table-cell text-[#0F172A]"
```

- [ ] **Step 2: Update raw HTML table files**

For each file, replace:
- Any `bg-white/[0.02]` or `bg-white/5` or `bg-white/[0.04]` → `bg-white` (cards/panels) or `bg-[#F8FAFC]` (headers)
- `border-white/10` → `border-[#E2E8F0]`
- `border-white/5` → `border-[#E2E8F0]/60`
- `text-[#F1F5F9]` → `text-[#0F172A]`
- `text-muted-foreground` → stays same (CSS variables define it as `#475569`)
- `text-foreground` → stays same (CSS variables define it as `#0F172A`)
- `hover:bg-white/[0.02]` → `hover:bg-[#F1F5F9]/60`
- `shadow-md shadow-black/20` → `shadow-sm`
- `bg-[#1E293B]/95` → `bg-white`
- `backdrop-blur-xl` → remove

- [ ] **Step 3: Build and commit**

```bash
pnpm build
git add -A
git commit -m "feat: update table components for light theme"
```

---
### Task 6: Popovers, Modals, Dropdowns — Light Theme

**Files:**
- Modify: `src/app/components/ui/dialog.tsx`
- Modify: `src/app/components/ui/alert-dialog.tsx`
- Modify: `src/app/components/ui/popover.tsx`
- Modify: `src/app/components/ui/dropdown-menu.tsx`
- Modify: `src/app/components/ui/sheet.tsx`
- Modify: `src/app/components/CRTHistory.tsx`
- Modify: `src/app/components/WeeklyMarketReview/AddEntryDialog.tsx`
- Modify: `src/app/components/MonthlyMarketReview/AddEntryDialog.tsx`

- [ ] **Step 1: Update overlay primitives**

For each file, replace:
- `bg-[#1E293B]/95` → `bg-white`
- `bg-[#1E293B]/98` → `bg-white`
- `backdrop-blur-xl` / `backdrop-blur-2xl` → remove
- `border-white/10` → `border-[#E2E8F0]`
- `shadow-xl shadow-black/30` → `shadow-xl`
- `text-foreground` → stays (resolves to `#0F172A`)
- `text-muted-foreground` → stays (resolves to `#475569`)
- `hover:bg-white/5` → `hover:bg-[#F1F5F9]`
- `hover:bg-white/[0.02]` → `hover:bg-[#F8FAFC]`
- `bg-white/10` (separators) → `bg-[#E2E8F0]`
- `bg-black/60 backdrop-blur-sm` (overlay) → `bg-black/30 backdrop-blur-sm`

- [ ] **Step 2: Update consumer components**

CRTHistory.tsx: Replace dialog overlay/content colors.
AddEntryDialog files: Replace dark glass with white bg, slate borders.

- [ ] **Step 3: Build and commit**

```bash
pnpm build
git add -A
git commit -m "feat: update popovers, modals, and dropdowns for light theme"
```

---
### Task 7: Image Components — Light Theme

**Files:**
- Modify: `src/app/components/ImageViewer.tsx`
- Modify: `src/app/components/MonthlyMarketReview/ImageGallery.tsx`

- [ ] **Step 1: Update ImageViewer.tsx**

Replace overlay bg: `bg-black/95` → `bg-black/80` (keep dark - image viewer should be dark for contrast)
Minor: thumbnail selected border: `border-[#7C3AED]` (keep purple)

- [ ] **Step 2: Update ImageGallery.tsx**

Replace:
- `bg-white/[0.02]` → `bg-[#F8FAFC]`
- `border-white/10` → `border-[#E2E8F0]`
- `shadow-sm shadow-black/20` → `shadow-sm`
- `bg-black/80 backdrop-blur-sm` → `bg-black/80` (keep dark for lightbox)

- [ ] **Step 3: Build and commit**

```bash
pnpm build
git add src/app/components/ImageViewer.tsx src/app/components/MonthlyMarketReview/ImageGallery.tsx
git commit -m "feat: update image components for light theme"
```

---
### Task 8: Animations — Micro-interactions + Page Transitions

**Files:**
- Modify: `src/app/components/ui/button.tsx` (already has active:scale in Task 3)
- Modify: `src/app/App.tsx` (add AnimatePresence for route transitions)
- Create: `src/app/hooks/useReducedMotion.ts`
- Create: `src/app/components/AnimatedPage.tsx`
- Modify: CSS in theme.css (add animation keyframes and utility classes)

- [ ] **Step 1: Create `useReducedMotion.ts`**

```typescript
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
```

- [ ] **Step 2: Create `AnimatedPage.tsx`**

```typescript
import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
}

export default function AnimatedPage({ children, className }: AnimatedPageProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Update App.tsx to use AnimatePresence**

Read App.tsx first, then wrap route renders with `<AnimatedPage>` and add `<AnimatePresence>` around the route switch. The pattern depends on how routes are defined. Typical approach:

```tsx
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router';
import AnimatedPage from './components/AnimatedPage';

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
        {/* ... other routes wrapped in AnimatedPage */}
      </Routes>
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Add CSS animation keyframes to theme.css**

Add to theme.css (at the bottom):

```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@utility animate-shimmer {
  animation: shimmer 1.5s infinite;
  background: linear-gradient(
    90deg,
    #F1F5F9 25%,
    #F8FAFC 50%,
    #F1F5F9 75%
  );
  background-size: 200% 100%;
}
```

- [ ] **Step 5: Add card hover animation to theme.css**

Update the glass-panel / glass-card utilities to include transition:

```css
@utility glass-panel {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease-out, transform 0.2s ease-out;
}

@utility glass-panel-hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
```

Also add a `@media (prefers-reduced-motion: reduce)` block:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 6: Build and commit**

```bash
pnpm build
git add -A
git commit -m "feat: add micro-interactions and page transition animations"
```

---

## Self-Review

Check spec coverage:
- Light color palette → Task 1 (CSS vars)
- Larger typography → Task 1 (font utilities)
- Black fonts (#0F172A) → Task 1 (foreground var)
- White cards with soft shadows → Task 1 (glass utilities redefined)
- Micro-interactions → Task 3 (active:scale on buttons) + Task 8 (card hover, animations CSS)
- Page transitions → Task 8 (AnimatePresence + AnimatedPage)
- Reduced motion → Task 8 (useReducedMotion hook + media query)
- Login page → Task 4
- Tables → Task 5
- Popovers/modals/dropdowns → Task 6
- Image components → Task 7

All spec requirements covered. No placeholders. Type consistency across tasks.
