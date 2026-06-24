# Phase 2: UI/UX Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade FX Journal with toast notifications, skeleton loading, Cloudinary image optimization, TradeJournal component decomposition, cursor-based pagination, and mobile-responsive trade cards.

**Architecture:** Six independent tasks organized by dependency. Tasks 1-3 can run in parallel (no deps). Tasks 4-5 are independent of each other but depend on Task 1 (sonner). Task 6 depends on Task 4 (TradeJournal split).

**Tech Stack:** React 18 + TypeScript + Tailwind CSS 4, Node.js/Express/MongoDB, sonner 2.0.3 (installed), lucide-react, date-fns

## Global Constraints

- Follow existing code style for each file
- No new dependencies beyond what's already in package.json
- Backend changes must preserve existing API response shapes
- All changes must be backward-compatible
- TypeScript strict mode (tsconfig.json already configured)

---

### Task 1: Sonner Toast Hook + Toaster Integration

**Files:**
- Create: `src/app/hooks/useToast.ts`
- Modify: `src/app/App.tsx`
- Modify: All files with alert/confirm calls (18 components)

**Interfaces:**
- Produces: `showSuccess(msg)`, `showError(msg)`, `showConfirm(msg) => Promise<boolean>`
- Consumes: sonner `Toaster` from `ui/sonner.tsx`

- [ ] **Step 1: Create useToast hook**

Write `src/app/hooks/useToast.ts`:

```typescript
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
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-700">{message}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { toast.dismiss(t); resolve(false); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { toast.dismiss(t); resolve(true); }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  });
}
```

- [ ] **Step 2: Add Toaster to App.tsx**

In `src/app/App.tsx`, add import and Toaster component:

```typescript
import { Toaster } from './components/ui/sonner';
```

Inside the outer `<div className="min-h-screen bg-[#F5F7FB]">`, add as the last child:

```tsx
<Toaster position="top-right" richColors />
```

- [ ] **Step 3: Replace alert/confirm in TradeJournal.tsx**

Add import at top:
```typescript
import { showSuccess, showError, showConfirm } from '../hooks/useToast';
```

Replace these patterns (25 occurrences):
- `alert('Failed to upload image...')` → `showError('Failed to upload image...')`
- `alert('Please fill in all required fields...')` → `showError('Please fill in all required fields...')`
- `alert('This account is not active...')` → `showError('This account is not active...')`
- `alert('Exit Date and Exit Price are required...')` → `showError('Exit Date and Exit Price are required...')`
- `alert('Account not found')` → `showError('Account not found')`
- `alert(\`Failed to update trade...\`)` → `showError(\`Failed to update trade...\`)`
- `alert('Failed to link checklist to trade.')` → `showError('Failed to link checklist to trade.')`
- `alert('Failed to delete trades...')` → `showError('Failed to delete trades...')`
- `alert('Failed to load checklists')` → `showError('Failed to load checklists')`
- `alert('Please select a checklist')` → `showError('Please select a checklist')`
- `alert('Please select at least one trade')` → `showError('Please select at least one trade')`
- `if (confirm('...'))` → `if (await showConfirm('...'))` (for 3 confirm calls)
- `alert('Successfully linked...')` → `showSuccess('Successfully linked...')`
- `alert(error.message || 'Failed to link checklist')` → `showError(error.message || 'Failed to link checklist')`
- `alert('Failed to load checklist details')` → `showError('Failed to load checklist details')`
- `alert('Checklist unlinked successfully')` → `showSuccess('Checklist unlinked successfully')`
- `alert(error.message || 'Failed to unlink checklist')` → `showError(error.message || 'Failed to unlink checklist')`
- `alert(\`Successfully unlinked checklists...\`)` → `showSuccess(\`Successfully unlinked checklists...\`)`
- `alert(error.message || 'Failed to unlink checklists')` → `showError(error.message || 'Failed to unlink checklists')`

Wrap handlers that use `await showConfirm` with `async` if not already.

- [ ] **Step 4: Replace alert/confirm in remaining 17 components**

For each component, add the import and do mechanical replacements:

**Accounts.tsx** (line 196):
- `if (confirm('...'))` → `if (await showConfirm('...'))` — make handleDelete async

**PropFirms.tsx** (line 64):
- `if (confirm('...'))` → `if (await showConfirm('...'))` — make handleDelete async

**MissedTradeJournal.tsx**:
- `alert('Please fill in all required fields')` (lines 384, 449) → `showError`
- `if (confirm('...'))` (line 507) → `if (await showConfirm('...'))`
- `alert('Failed to upload image...')` (line 540) → `showError`

**Settings.tsx**:
- `if (confirm('...'))` (lines 87, 120) → `if (await showConfirm('...'))`
- `alert('This pair already exists')` (lines 102, 139) → `showError`

**StrategyChecklist.tsx**:
- `alert('Failed to save checklist...')` (line 102) → `showError`

**ExportMenu.tsx**:
- `alert(error.message || '...')` (line 78) → `showError`

**LiquidityInput.tsx**:
- `alert('Please select at least one pair')` (line 106) → `showError`
- `alert('Liquidity saved successfully!')` (line 120) → `showSuccess`
- `alert('Failed to save liquidity...')` (line 124) → `showError`

**BiasMapping.tsx**:
- `alert('Failed to save bias...')` (line 159) → `showError`

**BiasInput.tsx**:
- `alert('Please select at least one pair')` (line 96) → `showError`
- `alert('Please select all CISD values...')` (line 101) → `showError`
- `alert('Bias saved successfully!')` (line 115) → `showSuccess`
- `alert('Failed to save bias...')` (line 119) → `showError`

**ui/AccountSelect.tsx**:
- `alert('This account is not active...')` (line 73) → `showError`

**Masters.tsx**:
- `if (confirm('...'))` (line 49) → `if (await showConfirm('...'))`

**CRTHistory.tsx**:
- `alert('No CRT record selected...')` (line 157) → `showError`
- `alert('CRT Direction and Status are required')` (line 158) → `showError`
- `alert(error.message || 'Failed to update')` (line 165) → `showError`
- `alert('Upload failed')` (line 465) → `showError`
- `alert('CRT Direction is required')` (line 470) → `showError`
- `alert('CRT Status is required')` (line 471) → `showError`

**CRTInput.tsx**:
- `alert('Failed to upload image')` (line 206) → `showError`
- `alert('Please select a pair')` (line 213) → `showError`
- `alert('\${TIMEFRAME_LABELS[...]} CRT saved!')` (line 233) → `showSuccess`
- `alert(error.message || 'Failed to save...')` (line 236) → `showError`
- `alert('Failed to save...')` (line 291) → `showError`

**Reminders.tsx**:
- `alert('Please enter a title')` (line 123) → `showError`
- `alert('Failed to save reminder')` (line 154) → `showError`
- `if (confirm('...'))` (line 175) → `if (await showConfirm('...'))`

**H4Input.tsx**:
- `alert('H4 data saved successfully!')` (line 120) → `showSuccess`
- `alert('Failed to save...')` (line 124) → `showError`

**ChecklistExecutionPage.tsx**:
- `if (confirm('...'))` (line 28) → `if (await showConfirm('...'))`
- `alert('Failed to save checklist...')` (line 118) → `showError`

**ChecklistPage.tsx**:
- `if (confirm('...'))` (line 46) → `if (await showConfirm('...'))`

**MasterStrategyPage.tsx**:
- `if (confirm('...'))` (line 111) → `if (await showConfirm('...'))`

- [ ] **Step 5: Verify build succeeds**

```bash
pnpm build
```
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/hooks/useToast.ts src/app/App.tsx $(rg -l "useToast" src/app/components/ --type tsx | tr '\n' ' ')
git commit -m "feat: add sonner toast notifications, replace alert/confirm across all components"
```

---

### Task 2: Cloudinary Image Transformations

**Files:**
- Create: `src/app/utils/cloudinary.ts`
- Modify: `src/app/components/ImageViewer.tsx`

**Interfaces:**
- Produces: `getCloudinaryUrl(url, options)`, `getThumbnail(url)`, `getResponsiveUrl(url, width)`
- Consumes: Cloudinary URL format (already in use)

- [ ] **Step 1: Create cloudinary utility**

Write `src/app/utils/cloudinary.ts`:

```typescript
interface CloudinaryOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'pad';
  quality?: 'auto' | 'auto:good' | 'auto:best';
  format?: 'auto' | 'webp' | 'jpg';
}

const CLOUDINARY_REGEX = /\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

function isCloudinaryUrl(url: string): boolean {
  return CLOUDINARY_REGEX.test(url);
}

function injectTransform(url: string, transform: string): string {
  return url.replace(/\/image\/upload\//, `/image/upload/${transform}/`);
}

export function getCloudinaryUrl(url: string, options: CloudinaryOptions = {}): string {
  if (!isCloudinaryUrl(url)) return url;
  const parts: string[] = [];
  if (options.width) parts.push(`w_${options.width}`);
  if (options.height) parts.push(`h_${options.height}`);
  if (options.crop) parts.push(`c_${options.crop}`);
  parts.push(options.quality ? `q_${options.quality}` : 'q_auto:good');
  parts.push(options.format ? `f_${options.format}` : 'f_auto');
  return injectTransform(url, parts.join(','));
}

export function getThumbnail(url: string): string {
  return getCloudinaryUrl(url, { width: 150, height: 150, crop: 'fill' });
}

export function getResponsiveUrl(url: string, width: number): string {
  return getCloudinaryUrl(url, { width, crop: 'limit' });
}
```

- [ ] **Step 2: Update ImageViewer to use thumbnails and responsive images**

Read current `src/app/components/ImageViewer.tsx`, then:
- Import `{ getThumbnail, getResponsiveUrl }`
- Use `getThumbnail(url)` for thumbnail strip src
- Use `getResponsiveUrl(url, 800)` for main display src
- Add `loading="lazy"` to all `<img>` tags

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/utils/cloudinary.ts src/app/components/ImageViewer.tsx
git commit -m "feat: add Cloudinary thumbnail and responsive image transformations"
```

---

### Task 3: PageLayout Skeleton Enhancement

**Files:**
- Modify: `src/app/components/ui/PageLayout.tsx`

**Interfaces:**
- Modifies: `PageLayoutProps` — adds optional `skeleton: { type, rows }`
- Consumes: `Skeleton` from `ui/skeleton.tsx`

- [ ] **Step 1: Add skeleton prop and renderers to PageLayout**

Update `src/app/components/ui/PageLayout.tsx`:

```typescript
import { Skeleton } from './skeleton';

interface SkeletonConfig {
  type: 'table' | 'cards' | 'form' | 'stats' | 'text';
  rows?: number;
}

// Add to PageLayoutProps
interface PageLayoutProps {
  // ... existing props
  skeleton?: SkeletonConfig;
}

// In component destructure skeleton
export function PageLayout({
  // ... existing destructuring
  skeleton,
}: PageLayoutProps) {
  if (isLoading) {
    return (
      <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6 ${className}`}>
        <PageHeader title={title} subtitle={subtitle} icon={icon} color={color} action={action} />
        <SkeletonRenderer type={skeleton?.type ?? 'text'} rows={skeleton?.rows} />
      </div>
    );
  }
  // ... rest unchanged
}

function SkeletonRenderer({ type, rows = 5 }: { type: SkeletonConfig['type']; rows?: number }) {
  switch (type) {
    case 'table':
      return (
        <div className="space-y-3">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-6 flex-1" />
              ))}
            </div>
          ))}
        </div>
      );
    case 'cards':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 border rounded-xl space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      );
    case 'form':
      return (
        <div className="space-y-4 max-w-lg">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      );
    case 'stats':
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-xl space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      );
    case 'text':
    default:
      return (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${i === rows - 1 ? 'w-3/4' : 'w-full'}`} />
          ))}
        </div>
      );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ui/PageLayout.tsx
git commit -m "feat: add skeleton loading types to PageLayout"
```

---

### Task 4: TradeJournal Split (Form + Modals + State Hook)

**Files:**
- Create: `src/app/hooks/useTradeState.ts`
- Create: `src/app/components/TradeForm.tsx`
- Create: `src/app/components/TradeTable.tsx`
- Create: `src/app/components/modals/LossAnalysisModal.tsx`
- Create: `src/app/components/modals/LinkChecklistModal.tsx`
- Create: `src/app/components/modals/ViewChecklistModal.tsx`
- Create: `src/app/components/modals/ChecklistDetailsModal.tsx`
- Create: `src/app/components/modals/ConfirmDeleteModal.tsx`
- Create: `src/app/components/TradeCard.tsx` (stub for Task 6)
- Modify: `src/app/components/TradeJournal.tsx` (orchestration only)

**Important:** Implement file-by-file, starting from leaves (modals, form, table) up to root.

- [ ] **Step 1: Create the modal directory**

```bash
mkdir -p src/app/components/modals
```

- [ ] **Step 2: Extract LossAnalysisModal**

Create `src/app/components/modals/LossAnalysisModal.tsx` wrapping the existing `LossReasonModal`:

```typescript
import LossReasonModal from '../LossReasonModal';

interface LossAnalysisModalProps {
  isOpen: boolean;
  tradeId: string | null;
  tradeData: {
    pair: string; type: string; entryPrice: number; exitPrice: number;
    profit: number; entryDate: string; exitDate: string;
  } | null;
  existingAnalysis: any | null;
  mode: 'add' | 'view';
  onClose: () => void;
  onSaved?: () => void;
}

export default function LossAnalysisModal({ isOpen, tradeId, tradeData, existingAnalysis, mode, onClose, onSaved }: LossAnalysisModalProps) {
  if (!isOpen || !tradeId) return null;
  return (
    <LossReasonModal
      tradeId={tradeId}
      tradeData={tradeData}
      existingAnalysis={existingAnalysis}
      mode={mode}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
```

- [ ] **Step 3: Extract LinkChecklistModal**

Move the Link Checklist modal JSX from TradeJournal.tsx (lines 2307-2406) into `src/app/components/modals/LinkChecklistModal.tsx`:

```typescript
import { X, Link2, ClipboardCheck } from 'lucide-react';

interface LinkChecklistModalProps {
  isOpen: boolean;
  activeChecklists: any[];
  selectedChecklistId: string;
  isLinking: boolean;
  selectedTradesCount: number;
  onSelectChecklist: (id: string) => void;
  onLink: () => void;
  onClose: () => void;
}

export default function LinkChecklistModal({ isOpen, activeChecklists, selectedChecklistId, isLinking, selectedTradesCount, onSelectChecklist, onLink, onClose }: LinkChecklistModalProps) {
  if (!isOpen) return null;
  // Paste JSX from TradeJournal.tsx lines 2308-2405, replace state refs with props
  return ( /* modal JSX */ );
}
```

Replace:
- `setLinkChecklistModal({ isOpen: false, ... })` → `onClose()`
- `setLinkChecklistModal(prev => ({ ...prev, selectedChecklistId: id }))` → `onSelectChecklist(id)`
- `handleLinkChecklist` → `onLink`
- `linkChecklistModal.isLinking` → `isLinking`
- `linkChecklistModal.selectedChecklistId` → `selectedChecklistId`
- `linkChecklistModal.activeChecklists` → `activeChecklists`
- `selectedTrades.length` → `selectedTradesCount`

- [ ] **Step 4: Extract ViewChecklistModal**

Move the View Checklist modal JSX (TradeJournal.tsx lines 2416-2537) into `src/app/components/modals/ViewChecklistModal.tsx`:

```typescript
import { X, Check } from 'lucide-react';

interface ViewChecklistModalProps {
  isOpen: boolean;
  checklist: any | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function ViewChecklistModal({ isOpen, checklist, isLoading, onClose }: ViewChecklistModalProps) {
  if (!isOpen) return null;
  // Paste JSX from lines 2417-2537, replace state refs with props
  return ( /* modal JSX */ );
}
```

Replace:
- `viewChecklistModal.isLoading` → `isLoading`
- `viewChecklistModal.checklist` → `checklist`
- `setViewChecklistModal({ isOpen: false, checklist: null, isLoading: false })` → `onClose()`

- [ ] **Step 5: Extract ConfirmDeleteModal**

Create `src/app/components/modals/ConfirmDeleteModal.tsx`:

```typescript
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  count: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({ isOpen, count, isDeleting, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        <div className="relative overflow-hidden bg-gradient-to-r from-rose-600 to-red-600 text-white p-5 sm:p-6">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_#f43f5e,_transparent_32%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete Trades</h3>
                <p className="text-sm text-rose-100">This action cannot be undone</p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 bg-white/10 hover:bg-white/25 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700">Are you sure you want to delete <strong>{count}</strong> trade(s)?</p>
        </div>
        <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" disabled={isDeleting}>Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-500/25 disabled:opacity-50 transition-colors" disabled={isDeleting}>
              {isDeleting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4" /> Delete {count} Trade(s)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: ChecklistDetailsModal already exists as separate component — no change needed**

- [ ] **Step 7: Extract TradeForm**

Create `src/app/components/TradeForm.tsx` with the add/edit form JSX from TradeJournal.tsx:

```typescript
interface TradeFormProps {
  formData: { /* all formData fields */ };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  accounts: TradingAccount[];
  pairs: string[];
  masters: MasterData[];
  strategies: MasterData[];
  keyLevels: MasterData[];
  sessions: MasterData[];
  activeAccounts: TradingAccount[];
  strategiesWithChecklist: MasterData[];
  calculatedRR: number | null;
  calculatedCommission: number;
  calculatedRealPL: number;
  uploadingImage: string | null;
  editingId: string | null;
  isAdding: boolean;
  activeSessions: any[];
  onSave: () => Promise<void>;
  onCancel: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'beforeScreenshot' | 'afterScreenshot') => void;
  onChecklistComplete: (id: string, isValid: boolean, sessionId: string | undefined) => void;
  onEditChecklistClick: () => void;
}
```

Extract the form JSX block — conditionally rendered when `isAdding` is true, includes all form fields, image upload, checklist selector, and strategy checklist. Keep all imports the form needs (Select, Input, Button, TimePicker, FormField, etc.).

- [ ] **Step 8: Extract TradeTable**

Create `src/app/components/TradeTable.tsx`:

```typescript
interface TradeTableProps {
  trades: Trade[];
  accounts: TradingAccount[];
  firms: PropFirm[];
  analysesMap: Record<string, any>;
  selectedTrades: string[];
  filterAccount: string;
  filterStatus: string;
  filterAnalysis: string;
  accountState: string;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onFilterAccountChange: (val: string) => void;
  onFilterStatusChange: (val: string) => void;
  onFilterAnalysisChange: (val: string) => void;
  onAccountStateChange: (val: string) => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onView: (trade: Trade) => void;
  onLossAnalysis: (trade: any, mode?: 'add' | 'view') => void;
  onChecklistDetails: (trade: Trade) => void;
  onBulkLink: () => void;
  onBulkUnlink: () => void;
  onBulkDeleteClick: () => void;
}
```

Include helper functions used only in rendering:
- `getFirmColor(firmId)`, `getAccountName(accountId)`, `getFirmName(firmId)`, `getTradeFirmId(trade)`, `getTradeRealPL(trade)`

Include the filter bar, bulk actions bar, and the entire table JSX. Add `import TradeCard from './TradeCard'` for mobile view.

- [ ] **Step 9: Extract useTradeState hook**

Create `src/app/hooks/useTradeState.ts`. Move all state declarations, effects, useMemo computations, and handler functions verbatim from TradeJournal.tsx. Return all state values and handlers as a single object.

The function signature must match what the orchestration layer expects:
```typescript
export function useTradeState() {
  // All state, effects, handlers from TradeJournal.tsx
  return {
    trades, accounts, firms, masters, pairs,
    isAdding, editingId,
    filterAccount, filterStatus, filterAnalysis, accountState,
    viewingTrade, viewingImages, viewingImageIndex,
    selectedTrades, showDeleteConfirm, isDeleting,
    lossAnalysisModal, analysesMap, activeSessions,
    linkChecklistModal, viewChecklistModal, checklistDetailsModal,
    editChecklistModal, checklistCache,
    formData, uploadingImage, strategies, keyLevels, sessionsList,
    strategiesWithChecklist, activeAccounts,
    calculatedRR, calculatedCommission, calculatedRealPL,
    filteredTrades, isEditMode,
    // Handlers
    loadTrades, handleAdd, startEdit, handleSave, handleEdit,
    handleDelete, handleCancel, handleFileUpload,
    handleOpenLossAnalysis, handleOpenChecklistDetails,
    handleEditChecklistComplete, toggleSelect, toggleSelectAll,
    handleBulkDelete, handleBulkUnlink, openLinkChecklistModal,
    handleLinkChecklist, handleUnlinkChecklist, unlinkSelectedChecklists,
    setFilterAccount, setFilterStatus, setFilterAnalysis, setAccountState,
    setViewingTrade, setViewingImages, setViewingImageIndex,
    setShowDeleteConfirm, setSelectedTrades,
    setLossAnalysisModal, setLinkChecklistModal, setViewChecklistModal,
    setChecklistDetailsModal, setEditChecklistModal, setFormData,
  };
}
```

Import all necessary API service methods and types that the handlers use. Replace `alert()`/`confirm()` calls with the sonner functions imported from `../hooks/useToast`.

- [ ] **Step 10: Rewrite TradeJournal.tsx as orchestration layer**

Replace with simplified version that wires state hook to sub-components:

```typescript
import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTradeState } from '../hooks/useTradeState';
import { PageLayout } from './ui/PageLayout';
import TradeForm from './TradeForm';
import TradeTable from './TradeTable';
import LossAnalysisModal from './modals/LossAnalysisModal';
import LinkChecklistModal from './modals/LinkChecklistModal';
import ViewChecklistModal from './modals/ViewChecklistModal';
import ChecklistDetailsModal from './modals/ChecklistDetailsModal';
import ConfirmDeleteModal from './modals/ConfirmDeleteModal';
import StrategyChecklist from './StrategyChecklist';
import ImageViewer from './ImageViewer';
import { useAuthContext } from '../context/AuthContext';

export default function TradeJournal() {
  const state = useTradeState();
  const { user } = useAuthContext();

  return (
    <PageLayout
      title="Trade Journal"
      subtitle={user?.name ? `Welcome back, ${user.name}` : undefined}
      icon={Plus}
      color="blue"
      action={{
        label: state.isAdding ? 'Cancel' : 'Add Trade',
        onClick: state.isAdding ? state.handleCancel : state.handleAdd,
      }}
    >
      {/* Account Balance Summary */}
      {state.accounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            {state.accounts.map(account => {
              const accountTrades = state.trades.filter(
                t => t.accountId === account.id && t.status === 'CLOSED'
              );
              const profit = accountTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
              return (
                <div key={account.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">{account.name}</span>
                  <span className={`text-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}{profit?.toFixed(2) ?? '0.00'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trade Form */}
      {state.isAdding && (
        <TradeForm
          formData={state.formData}
          setFormData={state.setFormData}
          accounts={state.accounts}
          pairs={state.pairs}
          masters={state.masters}
          strategies={state.strategies}
          keyLevels={state.keyLevels}
          sessions={state.sessionsList}
          activeAccounts={state.activeAccounts}
          strategiesWithChecklist={state.strategiesWithChecklist}
          calculatedRR={state.calculatedRR}
          calculatedCommission={state.calculatedCommission}
          calculatedRealPL={state.calculatedRealPL}
          uploadingImage={state.uploadingImage}
          editingId={state.editingId}
          isAdding={state.isAdding}
          activeSessions={state.activeSessions}
          onSave={state.editingId ? () => state.handleEdit(state.editingId) : state.handleSave}
          onCancel={state.handleCancel}
          onFileUpload={state.handleFileUpload}
          onChecklistComplete={state.handleEditChecklistComplete}
          onEditChecklistClick={() => state.setEditChecklistModal({ isOpen: true })}
        />
      )}

      {/* Trade Table + Mobile Cards */}
      <TradeTable
        trades={state.filteredTrades}
        accounts={state.accounts}
        firms={state.firms}
        analysesMap={state.analysesMap}
        selectedTrades={state.selectedTrades}
        filterAccount={state.filterAccount}
        filterStatus={state.filterStatus}
        filterAnalysis={state.filterAnalysis}
        accountState={state.accountState}
        onToggleSelect={state.toggleSelect}
        onToggleSelectAll={state.toggleSelectAll}
        onFilterAccountChange={state.setFilterAccount}
        onFilterStatusChange={state.setFilterStatus}
        onFilterAnalysisChange={state.setFilterAnalysis}
        onAccountStateChange={state.setAccountState}
        onEdit={(trade) => state.startEdit(trade)}
        onDelete={state.handleDelete}
        onView={state.setViewingTrade}
        onLossAnalysis={state.handleOpenLossAnalysis}
        onChecklistDetails={state.handleOpenChecklistDetails}
        onBulkLink={state.openLinkChecklistModal}
        onBulkUnlink={state.unlinkSelectedChecklists}
        onBulkDeleteClick={() => state.setShowDeleteConfirm(true)}
      />

      {/* Trade Detail Modal */}
      {state.viewingTrade && (
        <ImageViewer trade={state.viewingTrade} onClose={() => state.setViewingTrade(null)} />
      )}

      {/* Modals */}
      <LossAnalysisModal
        isOpen={state.lossAnalysisModal.isOpen}
        tradeId={state.lossAnalysisModal.tradeId}
        tradeData={state.lossAnalysisModal.tradeData}
        existingAnalysis={state.lossAnalysisModal.existingAnalysis}
        mode={state.lossAnalysisModal.mode}
        onClose={() => state.setLossAnalysisModal({ isOpen: false, tradeId: null, tradeData: null, existingAnalysis: null, mode: 'add' })}
        onSaved={() => state.loadTrades()}
      />
      <LinkChecklistModal
        isOpen={state.linkChecklistModal.isOpen}
        activeChecklists={state.linkChecklistModal.activeChecklists}
        selectedChecklistId={state.linkChecklistModal.selectedChecklistId}
        isLinking={state.linkChecklistModal.isLinking}
        selectedTradesCount={state.selectedTrades.length}
        onSelectChecklist={(id) => state.setLinkChecklistModal(prev => ({ ...prev, selectedChecklistId: id }))}
        onLink={state.handleLinkChecklist}
        onClose={() => state.setLinkChecklistModal({ isOpen: false, activeChecklists: [], selectedChecklistId: '', isLinking: false })}
      />
      <ViewChecklistModal
        isOpen={state.viewChecklistModal.isOpen}
        checklist={state.viewChecklistModal.checklist}
        isLoading={state.viewChecklistModal.isLoading}
        onClose={() => state.setViewChecklistModal({ isOpen: false, checklist: null, isLoading: false })}
      />
      <ChecklistDetailsModal
        isOpen={state.checklistDetailsModal.isOpen}
        onClose={() => state.setChecklistDetailsModal({ isOpen: false, tradeId: null, checklistId: undefined })}
        tradeId={state.checklistDetailsModal.tradeId || ''}
        checklistId={state.checklistDetailsModal.checklistId}
      />
      {state.editChecklistModal.isOpen && (
        <StrategyChecklist
          strategies={state.strategiesWithChecklist}
          onComplete={state.handleEditChecklistComplete}
          onCancel={() => state.setEditChecklistModal({ isOpen: false })}
        />
      )}
      <ConfirmDeleteModal
        isOpen={state.showDeleteConfirm}
        count={state.selectedTrades.length}
        isDeleting={state.isDeleting}
        onConfirm={state.handleBulkDelete}
        onCancel={() => state.setShowDeleteConfirm(false)}
      />
    </PageLayout>
  );
}
```

- [ ] **Step 11: Create TradeCard stub for Task 6**

Create `src/app/components/TradeCard.tsx`:

```typescript
import { Trade } from '../types/trading';

interface TradeCardProps {
  trade: Trade;
  accounts: any[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onView: (trade: Trade) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function TradeCard(_props: TradeCardProps) {
  return null;
}
```

- [ ] **Step 12: Verify build**

```bash
pnpm build
```

- [ ] **Step 13: Commit**

```bash
git add src/app/hooks/useTradeState.ts src/app/components/TradeForm.tsx src/app/components/TradeTable.tsx src/app/components/TradeCard.tsx src/app/components/modals/ src/app/components/TradeJournal.tsx
git commit -m "refactor: split TradeJournal into useTradeState hook, TradeForm, TradeTable, and modal components"
```

---

### Task 5: Pagination — Backend + Frontend

**Files:**
- Create: `backend/src/services/pagination.js`
- Modify: `backend/src/modules/missedTrades/missedTrade.controller.js`
- Modify: `backend/src/modules/missedTrades/missedTrade.routes.js`
- Modify: `backend/src/modules/accounts/account.controller.js`
- Modify: `backend/src/modules/accounts/account.routes.js`
- Modify: `backend/src/modules/propfirms/propfirm.controller.js`
- Modify: `backend/src/modules/propfirms/propfirm.routes.js`
- Create: `src/app/hooks/useCursorPagination.ts`
- Modify: `src/app/components/MissedTradeJournal.tsx`
- Modify: `src/app/components/Accounts.tsx`
- Modify: `src/app/components/PropFirms.tsx`

- [ ] **Step 1: Create pagination helper**

`backend/src/services/pagination.js`:

```javascript
const mongoose = require('mongoose');

async function paginate(model, query, cursor, limit = 20, options = {}) {
  const effectiveLimit = Math.min(limit, 100);
  const sort = options.sort || { _id: 1 };
  const paginatedQuery = cursor
    ? { ...query, _id: { $gt: new mongoose.Types.ObjectId(cursor) } }
    : { ...query };

  let queryBuilder = model.find(paginatedQuery).sort(sort).limit(effectiveLimit + 1);
  if (options.populate) queryBuilder = queryBuilder.populate(options.populate);

  const items = await queryBuilder;
  const hasMore = items.length > effectiveLimit;
  if (hasMore) items.pop();

  const lastItem = items[items.length - 1];
  return {
    data: items,
    nextCursor: hasMore && lastItem ? lastItem._id.toString() : null,
    hasMore,
  };
}

module.exports = { paginate };
```

- [ ] **Step 2: Add getPaginated to missedTrades controller + routes**

```javascript
// In missedTrade.controller.js
const { paginate } = require('../../services/pagination');

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit, ssmtType, dailyQuarter, sixHourQuarter, status, pair, type, model1Confirmation, ssmtConfirmation } = req.query;
    let filter = { userId: req.session.userId };
    if (ssmtType && SSMT_TYPES.includes(ssmtType)) filter.ssmtType = ssmtType;
    if (dailyQuarter) filter.dailyQuarter = dailyQuarter;
    if (sixHourQuarter) filter.sixHourQuarter = sixHourQuarter;
    if (status) filter.status = status;
    if (pair) filter.pair = pair;
    if (type) filter.type = type;
    if (model1Confirmation) filter.model1Confirmation = model1Confirmation;
    if (ssmtConfirmation) filter.ssmtConfirmation = ssmtConfirmation;

    const result = await paginate(MissedTrade, filter, cursor || null, parseInt(limit) || 20, { sort: { date: -1, _id: -1 } });
    res.json(result);
  } catch (error) { next(error); }
};

// In routes — add before the /:id route
router.get('/paginated', getPaginated);
```

- [ ] **Step 3: Add getPaginated to accounts controller + routes**

```javascript
// In account.controller.js
const { paginate } = require('../../services/pagination');

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit, status } = req.query;
    let filter = { userId: req.session.userId };
    if (status) filter.status = status;
    const result = await paginate(Account, filter, cursor || null, parseInt(limit) || 20, { populate: 'propFirmId' });
    const tradableStatuses = ['ACTIVE', 'PASSED_1', 'PASSED_2', 'FUNDED'];
    result.data = result.data.map(account => ({
      ...account.toObject(),
      isActive: tradableStatuses.includes(account.status),
      canTrade: tradableStatuses.includes(account.status)
    }));
    res.json(result);
  } catch (error) { next(error); }
};

// In routes
router.get('/paginated', getPaginated);
```

- [ ] **Step 4: Add getPaginated to propfirms controller + routes**

```javascript
// In propfirm.controller.js
const { paginate } = require('../../services/pagination');

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await paginate(PropFirm, { userId: req.session.userId }, cursor || null, parseInt(limit) || 20);
    res.json(result);
  } catch (error) { next(error); }
};

// In routes
router.get('/paginated', getPaginated);
```

- [ ] **Step 5: Create useCursorPagination hook**

`src/app/hooks/useCursorPagination.ts`:

```typescript
import { useState, useCallback } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface PaginationResult<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: (initialItems?: T[]) => void;
}

export function useCursorPagination<T>(
  fetchFn: (cursor: string | null) => Promise<PaginatedResponse<T>>
): PaginationResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const result = await fetchFn(cursor);
      setItems(prev => [...prev, ...result.data]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Pagination load failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading, hasMore, fetchFn]);

  const reset = useCallback((initialItems?: T[]) => {
    setItems(initialItems || []);
    setCursor(null);
    setHasMore(true);
  }, []);

  return { items, isLoading, hasMore, loadMore, reset };
}
```

- [ ] **Step 6-8: Integrate pagination into MissedTradeJournal, Accounts, PropFirms**

In each component:
```typescript
import { useCursorPagination } from '../hooks/useCursorPagination';

// Inside component:
const pagination = useCursorPagination(async (cursor) => {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', '20');
  // Add component-specific filters...
  const res = await apiService.get(`/missed-trades/paginated?${params}`);
  return res;
});

// After table/list:
{pagination.hasMore && (
  <div className="flex justify-center py-4">
    <button onClick={pagination.loadMore} disabled={pagination.isLoading}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
      {pagination.isLoading ? 'Loading...' : 'Load More'}
    </button>
  </div>
)}
```

Note: The `apiService.get()` method may need to be added or use `fetch()` directly depending on what's available. Check apiService.ts for a generic GET method.

- [ ] **Step 9: Verify frontend build**

```bash
pnpm build
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/pagination.js backend/src/modules/missedTrades/missedTrade.controller.js backend/src/modules/missedTrades/missedTrade.routes.js backend/src/modules/accounts/account.controller.js backend/src/modules/accounts/account.routes.js backend/src/modules/propfirms/propfirm.controller.js backend/src/modules/propfirms/propfirm.routes.js src/app/hooks/useCursorPagination.ts src/app/components/MissedTradeJournal.tsx src/app/components/Accounts.tsx src/app/components/PropFirms.tsx
git commit -m "feat: add cursor-based pagination to missed-trades, accounts, propfirms"
```

---

### Task 6: Mobile Trade Cards

**Files:**
- Modify: `src/app/components/TradeCard.tsx` (replace stub)
- Modify: `src/app/components/TradeTable.tsx` (add mobile rendering)

- [ ] **Step 1: Implement TradeCard**

Replace `src/app/components/TradeCard.tsx`:

```typescript
import { Edit2, Trash2, Eye, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { Trade, TradingAccount } from '../types/trading';
import { getLocalDateString } from '../utils/dateUtils';
import { formatPrice, formatMoney } from '../utils/calculations';

interface TradeCardProps {
  trade: Trade;
  accounts: TradingAccount[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onView: (trade: Trade) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getAccountName(trade: Trade, accounts: TradingAccount[]): string {
  return accounts.find(a => a.id === trade.accountId)?.name || 'Unknown';
}

export default function TradeCard({ trade, accounts, onEdit, onDelete, onView, isSelected, onSelect }: TradeCardProps) {
  const realPL = trade.realPL ?? trade.profit ?? 0;
  return (
    <div className={`bg-white rounded-xl border p-4 space-y-3 transition-all ${isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(trade.id)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="font-semibold text-slate-900">{trade.pair}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            trade.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {trade.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trade.type}
          </span>
        </div>
        <span className={`font-bold text-sm ${realPL > 0 ? 'text-emerald-600' : realPL < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
          {formatMoney(realPL, true)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
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
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button onClick={() => onView(trade)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
        <button onClick={() => onEdit(trade)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => onDelete(trade.id)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add mobile card section to TradeTable**

In `TradeTable.tsx`, add before the desktop table:

```tsx
{/* Mobile Cards */}
<div className="block md:hidden space-y-3">
  {trades.length === 0 ? (
    <div className="text-center py-8 text-slate-400">No trades found</div>
  ) : (
    trades.map(trade => (
      <TradeCard key={trade.id} trade={trade} accounts={accounts}
        onEdit={onEdit} onDelete={onDelete} onView={onView}
        isSelected={selectedTrades.includes(trade.id)} onSelect={onToggleSelect} />
    ))
  )}
</div>

{/* Desktop Table — wrap existing table in hidden md:block */}
<div className="hidden md:block">
  {/* existing table code */}
</div>
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/components/TradeCard.tsx src/app/components/TradeTable.tsx
git commit -m "feat: add mobile-responsive trade cards for <768px viewport"
```
