# Monthly Market Review Module — Design Doc

## Overview

A premium "Monthly Market Review" module for higher timeframe analysis. Each trading pair gets one review per month. The module is a research notebook with timeline entries, image gallery, rich text notes, and bias tracking.

## Architecture

- **Backend**: Two Mongoose models (`MonthlyReview`, `MonthlyReviewEntry`), controllers, and routes — following existing module patterns
- **Frontend**: Two tab components (`MonthlyReviewList`, `MonthlyReviewDetail`) lazy-loaded in App.tsx — following existing tab-based navigation
- **Image upload**: Reuses existing `/api/upload` (Cloudinary) — no new upload infrastructure
- **Rich text**: Uses TipTap (@tiptap/react + starter-kit) — already in package.json
- **No existing modules modified**

## Data Models

### MonthlyReview

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId (ref: User) | Required, for multi-user |
| pair | String | Required, e.g. "XAUUSD" |
| month | Number | 1-12 |
| year | Number | e.g. 2026 |
| title | String | Monthly theme, e.g. "June Liquidity Expansion" |
| bias | String | "Bullish" \| "Bearish" \| "Neutral" |
| summary | String | Rich text (HTML from TipTap) |
| imagePath | String | Main chart image URL |
| imageCaption | String | Caption for main image |
| status | String | "Draft" \| "Published" |
| schemaOptions | timestamps, toJSON transform | Same as all models |

Unique index on `{ userId, pair, month, year }`.

### MonthlyReviewEntry

| Field | Type | Notes |
|-------|------|-------|
| monthlyReviewId | ObjectId (ref: MonthlyReview) | Required |
| userId | ObjectId (ref: User) | Required |
| entryTitle | String | Title for this timeline entry |
| comment | String | Rich text (HTML from TipTap) |
| images | [{ url, publicId, caption }] | Array of image objects |
| displayOrder | Number | For ordering entries |
| schemaOptions | timestamps, toJSON transform | Same as all models |

## API Endpoints

### Monthly Reviews — `/api/monthly-reviews`

- `GET /` — List with filters (pair, month, year, bias, search, page, limit)
- `GET /:id` — Single review with entry count, image count
- `POST /` — Create review
- `PUT /:id` — Update review
- `DELETE /:id` — Delete review + cascade delete entries + cleanup images

### Review Entries — `/api/monthly-reviews/:reviewId/entries`

- `GET /` — List entries for a review (newest first)
- `POST /` — Create entry
- `PUT /:entryId` — Update entry
- `DELETE /:entryId` — Delete entry + cleanup images

## Frontend — File Structure

```
src/app/components/MonthlyMarketReview/
  MonthlyReviewList.tsx    — List page with filters, search, premium cards
  MonthlyReviewDetail.tsx  — Detail page with header, summary, timeline, gallery, notes
  CreateReviewDialog.tsx   — Dialog for creating/editing a review
  AddEntryDialog.tsx       — Dialog for adding timeline entries
  ReviewCard.tsx           — Premium card component for list view
  TimelineEntry.tsx        — Timeline card component for detail view
  ImageGallery.tsx         — Pinterest-style grid with lightbox
```

## UI Design — Premium Dashboard Style

Following the existing premium design system:
- **Background**: `#F5F7FB` shell
- **Cards**: White `fx-surface` with `rounded-2xl`, soft shadows
- **Purple brand**: `#7C3AED` for accents, gradients, active states
- **Typography**: Using all existing utility classes (`text-page-title`, `text-card-title`, `text-body`, etc.)
- **Buttons**: Existing `Button` component with gradient variants
- **Badges**: Existing `Badge` with `purple`, `success`, `warning` variants for bias display
- **Select/Input/Dialog**: Existing UI components from `src/app/components/ui/`

### List Page Layout
- Header: Page title + subtitle + "New Review" button
- Filter bar: Pair, Month, Year, Bias dropdowns + Search input
- Card grid: 3-column (desktop), 2-column (tablet), 1-column (mobile)
- Each card: Large pair name, month/year, bias badge, chart thumbnail, stats, action buttons
- Empty state for no reviews
- Skeleton loading state

### Detail Page Layout
- **Header**: Large pair + month/year + bias badge + stats row
- **Section 1 — Summary**: Rich text card with Initial Analysis, Market Structure, Liquidity, Targets
- **Section 2 — Timeline**: Newest-first entries with date, title, comment, images, edit/delete
- **Section 3 — Image Gallery**: Pinterest-style grid, click for lightbox with zoom/download
- **Section 4 — Trading Notes**: Cards with title, comment, created/updated dates
- **Floating button**: "Add Update" — opens AddEntryDialog

### Dialog Components
- **CreateReviewDialog**: Pair/Month/Year selects, bias radio, title input, TipTap rich text, image upload with preview, save/cancel
- **AddEntryDialog**: Title input, TipTap rich text, multiple image upload with captions, save

## Color Scheme for Bias

| Bias | Badge Variant | Icon |
|------|--------------|------|
| Bullish | `success` (green) | `TrendingUp` |
| Bearish | `destructive` (red) | `TrendingDown` |
| Neutral | `secondary` (gray) | `Minus` |

## Navigation

### Sidebar — Added to "Analysis" group
```
Analysis
  Monthly Market Review  — icon: Notebook (or Calendar)
```

### Tab registration
```typescript
type Tab = ... | 'monthly-review' | 'monthly-review-detail';
```

### Tab routing
- `monthly-review` → renders `MonthlyReviewList`
- `monthly-review-detail` → renders `MonthlyReviewDetail`, reads review ID from a shared state ref (window.__monthlyReviewId or similar simple mechanism matching existing patterns)

## States

Every component handles:
- **Loading**: Skeleton cards matching card dimensions
- **Empty**: Premium empty state with icon + message + CTA
- **Error**: Error boundary + inline error messages
- **Edge cases**: Missing images, very long text, duplicate pair+month+year, deleted entries

## Responsive Breakpoints

- Desktop (≥1024px): 3-column card grid, full layout
- Tablet (768-1023px): 2-column card grid
- Mobile (<768px): 1-column card grid, stacked layout, bottom sheet dialogs

## Image Handling

- Accepted: PNG, JPEG, WEBP
- Max 10MB per file
- Multiple upload via existing `/api/upload/multiple`
- Lazy loading with `loading="lazy"`
- Lightbox: Full-screen overlay with zoom (CSS transform) and download link
- Skeleton placeholders during load
