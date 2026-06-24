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

