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

