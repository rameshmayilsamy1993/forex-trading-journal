# Glassmorphism Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all pages with dark navy glassmorphism styling and compact sizing.

**Architecture:** CSS variable flips in theme.css cover ~80% of UI. Update shared DesignSystem components for glass look. Per-page treatment for exceptions (tables, modals, login).

**Tech Stack:** Tailwind CSS v4, CSS custom properties, backdrop-filter glass utilities

## Global Constraints

- Maximize CSS variable changes (one edit covers most pages)
- Use existing glass utility classes (`glass-panel`, `glass-card`, `glass-chip`) already defined in theme.css
- Sidebar already fits dark aesthetic — do not touch
- Dense sizing is the default, not an opt-in
- Build must pass after each task
- All pages including Login must use dark glass

---

### Task 1: CSS Variables + Dense Typography

**Files:**
- Modify: `src/styles/theme.css`

**Interfaces:**
- Consumes: nothing
- Produces: Updated CSS variables consumed by all components

- [ ] **Step 1: Update CSS variables for dark shell**

Replace the root variables with dark glass values:

```css
:root {
  --font-size: 12px;

  --background: #0B1620;
  --foreground: #F1F5F9;
  --card: rgba(255, 255, 255, 0.04);
  --card-foreground: #F1F5F9;
  --popover: rgba(30, 41, 59, 0.95);
  --popover-foreground: #F1F5F9;
  --primary: #7C3AED;
  --primary-foreground: #FFFFFF;
  --secondary: rgba(255, 255, 255, 0.04);
  --secondary-foreground: #F1F5F9;
  --muted: rgba(255, 255, 255, 0.02);
  --muted-foreground: #94A3B8;
  --accent: rgba(124, 58, 237, 0.1);
  --accent-foreground: #C4B5FD;
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  --success: #16A34A;
  --success-foreground: #FFFFFF;
  --warning: #F59E0B;
  --warning-foreground: #FFFFFF;
  --border: rgba(255, 255, 255, 0.06);
  --input: rgba(255, 255, 255, 0.1);
  --input-background: rgba(255, 255, 255, 0.04);
  --switch-background: rgba(255, 255, 255, 0.15);
  --ring: rgba(124, 58, 237, 0.4);
  --chart-1: #7C3AED;
  --chart-2: #16A34A;
  --chart-3: #F59E0B;
  --chart-4: #3B82F6;
  --chart-5: #DC2626;
  --radius: 0.625rem;
  --sidebar: #0B1620;
  --sidebar-foreground: #E2E8F0;
  --sidebar-primary: #7C3AED;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: rgba(255, 255, 255, 0.06);
  --sidebar-accent-foreground: #F8FAFC;
  --sidebar-border: rgba(148, 163, 184, 0.14);
  --sidebar-ring: rgba(124, 58, 237, 0.35);
  --shell-bg: #0B1620;
  --panel-bg: rgba(255, 255, 255, 0.04);
  --panel-border: rgba(255, 255, 255, 0.06);
  --panel-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 2: Update typography utilities for dense sizing**

Replace all `@utility text-*` definitions with reduced sizes:

```css
@utility text-display-xl { font-size: 30px; font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; }
@utility text-display { font-size: 26px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
@utility text-display-lg { font-size: 22px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
@utility text-page-title { font-size: 20px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
@utility text-section-title { font-size: 16px; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; }
@utility text-metric { font-size: 24px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
@utility text-card-title { font-size: 13px; font-weight: 600; line-height: 1.3; letter-spacing: 0; }
@utility text-heading { font-size: 13px; font-weight: 600; line-height: 1.3; letter-spacing: 0; }
@utility text-body-lg { font-size: 12px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-body { font-size: 12px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-body-sm { font-size: 11px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-caption { font-size: 10px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-micro { font-size: 9px; font-weight: 600; line-height: 1.4; letter-spacing: 0; }
@utility text-badge { font-size: 9px; font-weight: 600; line-height: 1.4; letter-spacing: 0; }
@utility text-table-header { font-size: 10px; font-weight: 600; line-height: 1.4; letter-spacing: 0.06em; text-transform: uppercase; }
@utility text-table-cell { font-size: 11px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-sidebar-menu { font-size: 12px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-sidebar-group { font-size: 9px; font-weight: 700; line-height: 1.4; letter-spacing: 0.12em; text-transform: uppercase; }
@utility text-button { font-size: 11px; font-weight: 600; line-height: 1.4; letter-spacing: 0.01em; }
@utility text-input { font-size: 12px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-placeholder { font-size: 11px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-dropdown { font-size: 11px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
@utility text-tooltip { font-size: 10px; font-weight: 500; line-height: 1.4; letter-spacing: 0; }
```

- [ ] **Step 3: Update base tag styles for dark background and dense sizing**

Replace all `@layer base` styles:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  html {
    font-size: 12px;
  }

  body {
    background: var(--shell-bg);
    background-color: #0B1620;
    color: var(--foreground);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    @apply antialiased;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  h3 {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0;
  }

  h4 {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: 0;
  }

  label {
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
  }

  button {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: 0;
  }

  input, textarea, select {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
  }
}
```

- [ ] **Step 4: Update `.fx-surface`, `.fx-chip`, `.modern-input`, `.modern-select` for dark glass**

```css
  .fx-surface {
    background: var(--panel-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--panel-border);
    box-shadow: var(--panel-shadow);
    border-radius: 16px;
  }

  .fx-surface-strong {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border-radius: 16px;
  }

  .fx-chip {
    @apply inline-flex items-center gap-1.5 rounded-full px-2 py-0.5;
    font-size: 9px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .modern-input {
    @apply rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-all duration-200 outline-none h-[38px];
    @apply focus:border-[#7C3AED] focus:bg-white/10 focus:ring-4 focus:ring-[#7C3AED]/25;
    font-size: 12px;
    color: #F1F5F9;
  }

  .modern-select {
    @apply rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-all duration-200 outline-none appearance-none h-[38px];
    @apply focus:border-[#7C3AED] focus:bg-white/10 focus:ring-4 focus:ring-[#7C3AED]/25;
    font-size: 12px;
    color: #F1F5F9;
  }

  .modern-date-time {
    @apply rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-all duration-200 outline-none h-[38px];
    @apply focus:border-[#7C3AED] focus:bg-white/10 focus:ring-4 focus:ring-[#7C3AED]/25;
    font-size: 12px;
    color: #F1F5F9;
  }

  .modern-file-upload {
    @apply relative rounded-xl border border-dashed border-white/10 bg-white/3 p-3 text-center transition-all duration-200 cursor-pointer;
    @apply hover:border-[#7C3AED] hover:bg-[#7C3AED]/10;
    backdrop-filter: blur(12px);
  }
```

- [ ] **Step 5: Remove the `.dense` block** (no longer needed since dense is now default)

Delete lines 266-374 (everything from `/* Dense scope */` through the last `.dense` rule).

- [ ] **Step 6: Update `::selection` color for dark background**

```css
  ::selection {
    background: rgba(124, 58, 237, 0.3);
    color: #ffffff;
  }
```

- [ ] **Step 7: Build and verify**

```bash
pnpm build 2>&1
```

Expected: Build succeeds, shell-bg changes to dark.

- [ ] **Step 8: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: apply dark glass CSS variables and dense typography across all pages"
```

---

### Task 2: Shared DesignSystem Components

**Files:**
- Modify: `src/app/components/ui/DesignSystem.tsx`

**Interfaces:**
- Consumes: CSS variables + glass utilities from Task 1
- Produces: Glass-styled shared layout components used by all pages

- [ ] **Step 1: Update PageHeader for dark glass + compact**

Replace the `PageHeader` component. Key changes: glass background backdrop-blur, smaller padding:

```tsx
export function PageHeader({ title, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl glass-panel mb-3',
      className
    )}>
      <h1 className="text-page-title text-foreground">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Update CardContainer for dark glass + compact**

```tsx
export function CardContainer({ title, action, children, className, ...props }: CardContainerProps) {
  return (
    <div className={cn('glass-card rounded-2xl p-3', className)} {...props}>
      {title && (
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-card-title text-foreground">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Update StatCard for dark glass + compact**

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('glass-panel rounded-2xl p-3 flex items-center gap-3', className)}>
      {icon && (
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-caption text-muted-foreground truncate">{label}</p>
        <p className="text-metric text-foreground tabular-nums">{value}</p>
      </div>
      {trend && trend !== 'neutral' && (
        <div className={cn(
          'ml-auto self-start mt-1',
          trend === 'up' ? 'text-emerald-400' : 'text-red-400'
        )}>
          {trend === 'up' ? '↑' : '↓'}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add FilterBar and FormSection glass variants**

```tsx
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass-chip rounded-2xl p-2.5 flex items-center gap-2 flex-wrap', className)}>
      {children}
    </div>
  );
}

export function FormSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass-card rounded-2xl p-3', className)}>
      {title && <h3 className="text-card-title text-foreground mb-2.5">{title}</h3>}
      {children}
    </div>
  );
}
```

Check if `FormSection` already exists and update it instead of adding a duplicate.

- [ ] **Step 5: Build and verify**

```bash
pnpm build 2>&1
```

- [ ] **Step 6: Commit**

```bash
git add src/app/components/ui/DesignSystem.tsx
git commit -m "feat: update DesignSystem components for dark glass and compact sizing"
```

---

### Task 3: UI Inputs for Dark Glass

**Files:**
- Modify: `src/app/components/ui/button.tsx`
- Modify: `src/app/components/ui/input.tsx`

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Dark-glass compatible interactive elements

- [ ] **Step 1: Update button.tsx for dark backgrounds**

Replace the button variants to use dark-compatible colors:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-button font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white shadow-md shadow-[#7C3AED]/20 hover:shadow-lg hover:shadow-[#7C3AED]/25 hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white shadow-md shadow-[#DC2626]/20 hover:shadow-lg hover:shadow-[#DC2626]/25 hover:-translate-y-0.5",
        success:
          "bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white shadow-md shadow-[#16A34A]/20 hover:shadow-lg hover:shadow-[#16A34A]/25 hover:-translate-y-0.5",
        outline:
          "border border-white/10 bg-white/5 text-[#F1F5F9] hover:bg-white/10 hover:border-white/20 hover:shadow-sm active:bg-white/[0.08]",
        secondary:
          "bg-white/5 text-[#F1F5F9] hover:bg-white/10 hover:shadow-sm",
        ghost:
          "text-[#94A3B8] hover:bg-white/5 hover:text-[#F1F5F9]",
        link: "text-[#7C3AED] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[34px] px-3.5 py-2 has-[>svg]:px-3",
        sm: "h-[28px] rounded-md gap-1.5 px-2.5 has-[>svg]:px-2 text-micro",
        lg: "h-[38px] rounded-lg px-4 has-[>svg]:px-3.5",
        icon: "size-[34px] rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

- [ ] **Step 2: Update input.tsx for dark glass**

```tsx
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-[38px] w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-input transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#7C3AED] focus-visible:ring-[#7C3AED]/25 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "text-[#F1F5F9]",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add src/app/components/ui/button.tsx src/app/components/ui/input.tsx
git commit -m "feat: update button and input for dark glass theme"
```

---

### Task 4: Login Page Glass Treatment

**Files:**
- Modify: `src/app/components/Login.tsx`

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Dark glass login page

- [ ] **Step 1: Read current Login.tsx**

```bash
cat src/app/components/Login.tsx
```

- [ ] **Step 2: Update Login page to dark glass**

Key changes:
- Full-screen `#0B1620` background with subtle radial glow gradient
- Centered glass card (`backdrop-blur-2xl`, `bg-white/[0.04]`, `border-white/[0.08]`)
- Logo/branding inside the glass card
- Inputs, button, error states all dark-adapted

Replace the outer container background and the form card:

```tsx
// Background: full-screen dark with radial glow
<div className="min-h-screen bg-[#0B1620] flex items-center justify-center p-4 relative overflow-hidden">
  {/* Radial glow */}
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.08)_0%,_transparent_70%)] pointer-events-none" />
  
  {/* Glass card */}
  <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 shadow-2xl">
    {/* Logo + title */}
    ...
  </div>
</div>
```

For the form card use: `glass-panel rounded-3xl p-6 shadow-2xl`

- [ ] **Step 3: Build and verify**

```bash
pnpm build 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add src/app/components/Login.tsx
git commit -m "feat: redesign login page with dark glass aesthetic"
```

---

### Task 5: Tables - Dark Glass Styling

**Files:**
- Modify: `src/app/components/TradeJournal.tsx`
- Modify: `src/app/components/BreachedTrades.tsx`
- Modify: (any other table components found with table headers/rows)

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Glass-styled data tables

- [ ] **Step 1: Find all table components**

Search for table patterns across the codebase.

- [ ] **Step 2: Update table header styling to use glass-chip**

In each table component, replace table header background with `bg-white/5` and border with `border-white/10`.

For thead:
```tsx
<thead className="bg-white/5">
  <tr>
    {headers.map(h => (
      <th className="px-2.5 py-2 text-left text-table-header text-muted-foreground border-b border-white/10">
```

For tbody rows, use hover state:
```tsx
<tr className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add [all-table-files]
git commit -m "feat: update data tables for dark glass theme"
```

---

### Task 6: Popovers, Modals, Dropdowns

**Files:**
- Modify: `src/app/components/ui/popover.tsx` (check if exists)
- Modify: `src/app/components/ui/dropdown-menu.tsx` (check if exists)

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Glass-styled overlay components

- [ ] **Step 1: Find overlay component files**

Search for files with popover, dropdown, modal, dialog patterns.

- [ ] **Step 2: Update overlay backgrounds to dark glass**

For each overlay component, replace background and border with:
- Background: `rgba(30, 41, 59, 0.95)` with `backdrop-filter: blur(16px)`
- Border: `rgba(255, 255, 255, 0.08)`
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.4)`

- [ ] **Step 3: Build and verify**

```bash
pnpm build 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add [overlay-files]
git commit -m "feat: update popovers and dropdowns for dark glass theme"
```

---

### Task 7: ImageViewer + ImageGallery Overlay

**Files:**
- Modify: `src/app/components/ImageViewer.tsx` (check path)
- Modify: `src/app/components/ImageGallery.tsx` (check path)

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Glass-styled image viewing

- [ ] **Step 1: Find image component files**

- [ ] **Step 2: Update overlay scrim**

Replace the light overlay scrim with dark glass:
```css
/* Previously: bg-black/50 or bg-white/90 */
/* Now: */
background: rgba(0, 0, 0, 0.7);
backdrop-filter: blur(8px);
```

Update thumbnail containers to use `glass-card`.

- [ ] **Step 3: Build and verify**

```bash
pnpm build 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add [image-files]
git commit -m "feat: update image viewer and gallery for dark glass theme"
```

---

### Task 8: Final Build Verification + Polish

**Files:**
- Check: any remaining light-background components that need dark mode fixes

- [ ] **Step 1: Build**

```bash
pnpm build 2>&1
```

- [ ] **Step 2: Fix any remaining white-background issues**

Search for hardcoded white backgrounds (`bg-white`, `#FFFFFF`, `#F7F8FC`, `#F8FAFC`, `#F1F5F9`) that should use CSS variables or glass utilities.

```bash
rg "bg-white|#F7F8FC|#F8FAFC|#F1F5F9" src/app/components --include="*.tsx" --include="*.tsx" -l
```

Review each found file and replace hardcoded light backgrounds with CSS variable references or glass utilities.

- [ ] **Step 3: Build and verify**

```bash
pnpm build 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: polish remaining light backgrounds for dark glass consistency"
```
