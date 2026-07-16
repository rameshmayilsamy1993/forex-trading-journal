# Glassmorphism + Dense Redesign

Redesign all pages (app shell + login) with dark navy glassmorphism styling and compact sizing.

## Approach: Hybrid (CSS Variables + Shared Components)

- CSS variable flips in `theme.css` - covers ~80% of UI automatically
- Update shared wrapper components (DesignSystem.tsx, inputs, Login)
- Per-page treatment for Tables, Charts, Popovers, ImageGallery

## 1. CSS Variables (theme.css)

| Variable | Current | New |
|----------|---------|-----|
| `--shell-bg` | `#F7F8FC` | `#0B1620` |
| `--panel-bg` | `#FFFFFF` | `rgba(255,255,255,0.04)` |
| `--panel-border` | `#E5EAF2` | `rgba(255,255,255,0.06)` |
| `--panel-shadow` | light | `0 8px 32px rgba(0,0,0,0.3)` |
| `--foreground` | `#0F172A` | `#F1F5F9` |
| `--muted-foreground` | `#64748B` | `#94A3B8` |
| `--secondary` | `#F1F5F9` | `rgba(255,255,255,0.04)` |
| `--secondary-foreground` | `#0F172A` | `#F1F5F9` |
| `--border` | `#E5EAF2` | `rgba(255,255,255,0.06)` |
| `--input` | `#E5EAF2` | `rgba(255,255,255,0.1)` |
| `--input-background` | `#FFFFFF` | `rgba(255,255,255,0.04)` |
| `--card` | `#FFFFFF` | `rgba(255,255,255,0.04)` |
| `--card-foreground` | `#0F172A` | `#F1F5F9` |
| `--popover` | `#FFFFFF` | `rgba(30,41,59,0.95)` |
| `--popover-foreground` | `#0F172A` | `#F1F5F9` |
| `--muted` | `#F8FAFC` | `rgba(255,255,255,0.02)` |
| `--accent` | `#F5F3FF` | `rgba(124,58,237,0.1)` |
| `--accent-foreground` | `#5B21B6` | `#C4B5FD` |
| `--ring` | `rgba(124,58,237,0.25)` | `rgba(124,58,237,0.4)` |

## 2. Typography - Dense Mode (default)

Activate the existing dense sizing as defaults. All fonts shrink 1-2px:

| Utility | Current | Dense |
|---------|---------|-------|
| `text-display-xl` | 34px | 30px |
| `text-display` | 30px | 26px |
| `text-display-lg` | 26px | 22px |
| `text-page-title` | 24px | 20px |
| `text-section-title` | 18px | 16px |
| `text-metric` | 28px | 24px |
| `text-card-title` | 14px | 13px |
| `text-body` | 13px | 12px |
| `text-body-sm` | 12px | 11px |
| `text-caption` | 11px | 10px |
| `text-table-header` | 11px | 10px |
| `text-table-cell` | 12px | 11px |
| `text-button` | 12px | 11px |
| `text-input` | 13px | 12px |
| `text-sidebar-menu` | 13px | 12px |

Reduce spacing: all `p-5` → `p-3`, `p-6` → `p-4`, `gap-6` → `gap-4`, section padding tighter.

## 3. Shared Components

### DesignSystem.tsx
- `CardContainer`: glass-panel class, smaller padding
- `StatCard`: glass-card class, compact
- `PageHeader`: glass background, compact
- `FilterBar`, `FormSection`: glass surfaces

### Inputs (button.tsx, input.tsx, select.tsx)
- All border colors updated to dark-compatible
- Button gradients remain the same (violet theme)
- Input backgrounds: `rgba(255,255,255,0.04)` with glass blur
- Focus rings: `rgba(124,58,237,0.4)`

### Login Page
- Full-screen `#0B1620` background
- Subtle radial glow gradient behind card
- Centered glass card (backdrop-blur-2xl, white/4 bg, white/8 border)
- Logo/branding inside glass card
- Form fields with dark inputs

## 4. Per-Page Treatment

### Tables
- Header row: `glass-chip` background
- Row hover: `rgba(255,255,255,0.02)` background
- Alternating rows: subtle opacity difference
- Pagination: glass-chip style

### Charts
- Dashboard already done
- MarketStatistics: dark gridlines, light text on axes, glass tooltips

### Popovers / Modals / Dropdowns
- Background: `rgba(30,41,59,0.95)` with backdrop-blur
- Border: `rgba(255,255,255,0.08)`
- Shadow: dark elevation shadow

### ImageViewer / ImageGallery
- Overlay scrim: `rgba(0,0,0,0.7)` with backdrop-blur
- Thumbnails: glass-card

## 5. Glassmorphism Utilities (already defined)

```css
@utility glass-panel {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08);
}

@utility glass-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.06);
}

@utility glass-chip {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.06);
}
```

These exist but are unused. No changes needed.

## 6. Sidebar

Already dark (`#0F172A`), already fits. No changes needed.

## Files to Modify

### High-impact (1 file covers ~80% of UI)
1. `src/styles/theme.css` - flip CSS variables + activate dense sizing

### Medium-impact (shared components)
2. `src/styles/index.css` - ensure glass utilities are imported
3. `src/app/components/ui/DesignSystem.tsx` - update CardContainer/PageHeader/StatCard
4. `src/app/components/ui/button.tsx` - dark bg colors
5. `src/app/components/ui/input.tsx` - dark bg/border
6. `src/app/components/Login.tsx` - full glass treatment

### Low-impact (per-page specifics)
7. Table components - header/hover styling for dark glass
8. Popover component - dark glass background
9. ImageViewer - dark glass overlay
10. ImageGallery - glass thumbnails

## Guiding Principles

- Maximize CSS variable changes (covers most pages with one edit)
- Use existing glass utility classes wherever possible
- Sidebar already fits - don't touch it
- Dense sizing is the default, not an opt-in
