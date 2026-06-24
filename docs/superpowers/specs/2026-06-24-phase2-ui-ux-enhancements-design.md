# Phase 2: UI/UX Enhancements Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use writing-plans to create implementation plan from this spec, then subagent-driven-development or executing-plans to implement.

**Goal:** Upgrade FX Journal from functional to polished — toast notifications, skeleton loading, image optimization, component decomposition, pagination, and mobile responsiveness.

**Architecture:** Six independent enhancements grouped by dependency. Sonner toasts and skeleton enhancements are foundational (used by other changes). TradeJournal split improves maintainability. Pagination and mobile cards are user-facing features layered on top.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS 4, Node.js/Express/MongoDB, sonner 2.0.3 (already installed), Cloudinary URL API

---

## 1. Sonner Toast Notifications

### Summary
Replace all 67 `alert()`/`confirm()` calls across 18+ components with sonner toasts and a promise-based confirm dialog.

### Implementation

#### New file: `src/app/hooks/useToast.ts`

```typescript
// Wraps sonner's toast with app-specific styling and a confirm dialog.
// 
// showSuccess(msg)    → toast.success with app styling
// showError(msg)      → toast.error with app styling  
// showConfirm(msg)    → returns Promise<boolean>, renders a custom confirm toast with
//                       "Cancel" and "Confirm" actions. Resolves true/false on click.

import { toast } from 'sonner';

export function showSuccess(message: string) {
  toast.success(message, { duration: 3000 });
}

export function showError(message: string) {
  toast.error(message, { duration: 5000 });
}

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => {
        // Renders a confirm/cancel UI inside the toast
      },
      { duration: Infinity, onDismiss: () => resolve(false) }
    );
  });
}
```

#### Modified: `src/app/App.tsx`
- Import `<Toaster>` from `ui/sonner.tsx` and add it once in the root layout

#### Modified: All files with alert/confirm calls
- `import { showSuccess, showError, showConfirm } from '../hooks/useToast'`
- `alert(msg)` → `showError(msg)`
- `alert(successMsg)` → `showSuccess(successMsg)`  
- `if (confirm(msg))` → `if (await showConfirm(msg))`

### Files affected (18+ components, 67 replacements)
- `TradeJournal.tsx` (25 replacements)
- `Accounts.tsx` (1)
- `PropFirms.tsx` (1)
- `MissedTradeJournal.tsx` (4)
- `Settings.tsx` (4)
- `StrategyChecklist.tsx` (1)
- `ExportMenu.tsx` (1)
- `LiquidityInput.tsx` (3)
- `BiasMapping.tsx` (1)
- `BiasInput.tsx` (4)
- `ui/AccountSelect.tsx` (1)
- `Masters.tsx` (1)
- `CRTHistory.tsx` (4)
- `CRTInput.tsx` (4)
- `Reminders.tsx` (3)
- `H4Input.tsx` (2)
- `ChecklistExecutionPage.tsx` (2)
- `ChecklistPage.tsx` (1)
- `MasterStrategyPage.tsx` (1)

---

## 2. PageLayout Skeleton Enhancement

### Summary
Centralize skeleton loading in the existing `PageLayout` component so all tab pages get consistent loading states without per-component boilerplate.

### Implementation

#### Modified: `src/app/components/ui/PageLayout.tsx`

Current interface:
```typescript
interface PageLayoutProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  isLoading?: boolean;
}
```

Add:
```typescript
interface SkeletonConfig {
  type: 'table' | 'cards' | 'form' | 'stats' | 'text';
  rows?: number;    // default 5 for table, 3 for cards
  columns?: number; // default 1
}

interface PageLayoutProps {
  // ... existing
  skeleton?: SkeletonConfig;
}
```

When `isLoading && skeleton` is true, render pre-built skeleton layouts:
- `table`: header row + N data rows of shimmer
- `cards`: N card-shaped skeletons in a grid
- `form`: label + input pairs stacked
- `stats`: stat card row (3-4 cards)
- `text`: 4-5 lines of text-shaped shimmer

Uses the existing `<div data-slot="skeleton">` component from `ui/skeleton.tsx`.

### Components to update (pass skeleton prop instead of inline loading)
- `Accounts.tsx`
- `Masters.tsx`
- `PropFirms.tsx`
- `Reports.tsx`
- `Dashboard.tsx`
- `BiasHistory.tsx`
- `BiasMapping.tsx`
- `CRTHistory.tsx`
- `LiquidityHistory.tsx`
- `H4History.tsx`
- `Reminders.tsx`
- `ChecklistExecutionPage.tsx`
- `ChecklistPage.tsx`
- `MasterStrategyPage.tsx`
- `MissedTradesCalendar.tsx`
- `TradingCalendar.tsx`
- `BreachedTrades.tsx`

Replace pattern:
```tsx
// Before
if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

// After
<PageLayout skeleton={{ type: 'table' }} isLoading={isLoading}>
  ...
</PageLayout>
```

---

## 3. Cloudinary Image Transformations

### Summary
Auto-generate optimized thumbnail and responsive image URLs using Cloudinary's URL-based transformation API. No backend changes needed.

### Implementation

#### New file: `src/app/utils/cloudinary.ts`

```typescript
// Extract Cloudinary public ID from a full Cloudinary URL
// Build transformed URLs with width, height, crop, format params

interface CloudinaryOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'pad';
  quality?: 'auto' | 'auto:good' | 'auto:best';
  format?: 'auto' | 'webp' | 'jpg';
}

function isCloudinaryUrl(url: string): boolean;
function getCloudinaryUrl(url: string, options: CloudinaryOptions): string;
function getThumbnail(url: string): string;  // w_150,h_150,c_fill
function getResponsiveUrl(url: string, width: number): string;
```

#### Modified: `src/app/components/ImageViewer.tsx`
- Use `getThumbnail()` for gallery strip thumbnails
- Use `getResponsiveUrl(url, 800)` for main display image
- Add `loading="lazy"` to all `<img>` tags

#### Modified: Other image display components
- Scan for `<img>` tags displaying Cloudinary URLs
- Add `loading="lazy"` and responsive width transforms

---

## 4. TradeJournal Split (Form + Modals)

### Summary
Decompose the 2542-line TradeJournal.tsx into focused files: a state hook, form component, table component, and individual modal components.

### Implementation

#### New file: `src/app/hooks/useTradeState.ts`
Extract all state declarations and handler functions:

```typescript
interface TradeState {
  // All state
  trades: Trade[];
  accounts: TradingAccount[];
  firms: PropFirm[];
  masters: MasterData[];
  pairs: string[];
  isAdding: boolean;
  editingId: string | null;
  // ... all other state
  
  // All handlers
  loadTrades: () => Promise<void>;
  handleAdd: () => void;
  handleEdit: (trade: Trade) => void;
  handleSave: (data: TradeFormData) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  // ... all other handlers
}

export function useTradeState(): TradeState;
```

#### New file: `src/app/components/TradeForm.tsx`
```typescript
interface TradeFormProps {
  formData: TradeFormData;
  setFormData: (data: TradeFormData) => void;
  accounts: TradingAccount[];
  pairs: string[];
  masters: MasterData[];
  editingId: string | null;
  isAdding: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
}
```

#### New file: `src/app/components/TradeTable.tsx`
```typescript
interface TradeTableProps {
  trades: Trade[];
  accounts: TradingAccount[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onView: (trade: Trade) => void;
  // Bulk operations
  selectedTrades: string[];
  onSelectionChange: (ids: string[]) => void;
  onBulkLink: () => void;
  onBulkUnlink: () => void;
}
```

#### New directory: `src/app/components/modals/`
Each file extracts one modal from TradeJournal:

- `LossAnalysisModal.tsx` — loss analysis add/view modal
- `LinkChecklistModal.tsx` — link checklist to trades modal
- `ViewChecklistModal.tsx` — view linked checklist modal
- `ChecklistDetailsModal.tsx` — checklist details from calendar
- `ConfirmDeleteModal.tsx` — delete confirmation modal

Each modal receives its specific props and the necessary handlers/callbacks from the parent.

#### Modified: `src/app/components/TradeJournal.tsx`
Becomes orchestration layer only (~600 lines):
```typescript
export default function TradeJournal() {
  const state = useTradeState();
  
  return (
    <PageLayout title="Trade Journal" ...>
      {/* Add Button */}
      {/* TradeForm (conditional) */}
      {/* TradeTable */}
      {/* Modals (conditional on state) */}
    </PageLayout>
  );
}
```

---

## 5. Pagination (Cursor/Load-More)

### Summary
Add cursor-based pagination to the three list-heavy pages: MissedTrades, Accounts, PropFirms. Backend gets paginated endpoints; frontend gets a reusable pagination hook.

### Backend Changes

#### New pagination helper: `backend/src/services/pagination.js`
```javascript
/**
 * @param {Model} model - Mongoose model
 * @param {object} query - Filter query (already includes userId)
 * @param {string|null} cursor - ObjectId cursor from client
 * @param {number} limit - Page size (default 20, max 100)
 * @returns {{ data: Array, nextCursor: string|null, hasMore: boolean }}
 */
async function paginate(model, query, cursor, limit = 20) {
  const effectiveLimit = Math.min(limit, 100);
  const paginatedQuery = cursor
    ? { ...query, _id: { $gt: cursor } }
    : query;
  
  const items = await model.find(paginatedQuery)
    .sort({ _id: 1 })
    .limit(effectiveLimit + 1);
  
  const hasMore = items.length > effectiveLimit;
  if (hasMore) items.pop();
  
  return {
    data: items,
    nextCursor: hasMore ? items[items.length - 1]._id.toString() : null,
    hasMore,
  };
}
```

#### Modified controllers — add paginated endpoint per module:

- `GET /api/missed-trades/paginated?cursor=xxx&limit=20`
- `GET /api/accounts/paginated?cursor=xxx&limit=20`
- `GET /api/propfirms/paginated?cursor=xxx&limit=20`

Each returns `{ data: [...], nextCursor: string|null, hasMore: boolean }`

### Frontend Changes

#### New file: `src/app/hooks/useCursorPagination.ts`
```typescript
interface PaginationResult<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: () => void;
}

function useCursorPagination<T>(
  fetchFn: (cursor: string | null) => Promise<{
    data: T[];
    nextCursor: string | null;
    hasMore: boolean;
  }>
): PaginationResult<T>;
```

#### Modified components:
- `MissedTradeJournal.tsx` — add "Load More" button after the table
- `Accounts.tsx` — add "Load More" after account cards/table
- `PropFirms.tsx` — add "Load More" after firm cards/table

---

## 6. Mobile Trade Cards

### Summary
Add responsive card layout for mobile view in the trade journal. Desktop keeps the table; mobile (<768px) shows cards.

### Implementation

#### New file: `src/app/components/TradeCard.tsx`
```typescript
interface TradeCardProps {
  trade: Trade;
  accounts: TradingAccount[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onView: (trade: Trade) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}
```

Card layout:
```
┌──────────────────────────┐
│ EUR/USD  BUY    +$124.50│
│ Entry: 1.08750          │
│ Exit:  1.08920          │
│ Lot: 0.10  Risk: 1:2.5  │
│ 2024-01-15              │
│ [Edit] [Delete] [View]   │
└──────────────────────────┘
```

#### Modified: `TradeTable.tsx`
```tsx
<div className="block md:hidden space-y-3">
  {filteredTrades.map(trade => (
    <TradeCard key={trade._id} trade={trade} ... />
  ))}
</div>

<div className="hidden md:block">
  <Table>...</Table>
</div>
```

---

## Ordering & Dependencies

```
Task 1: Sonner Toasts        → no deps, can go first
Task 2: Skeleton Enhancement → no deps, can go in parallel with Task 1
Task 3: Cloudinary           → no deps, can go in parallel
Task 4: TradeJournal Split   → uses sonner after Task 1
Task 5: Pagination           → no deps, backend + frontend
Task 6: Mobile Trade Cards   → depends on TradeJournal split (Task 4)
```

Actual execution order: 1 + 2 + 3 in parallel, then 4 + 5 in parallel (they're independent), then 6.
