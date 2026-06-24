import { Plus } from 'lucide-react';
import { useTradeState } from '../hooks/useTradeState';
import { PageLayout } from './ui/PageLayout';
import TradeForm from './TradeForm';
import TradeTable from './TradeTable';
import LossAnalysisModal from './modals/LossAnalysisModal';
import LinkChecklistModal from './modals/LinkChecklistModal';
import ViewChecklistModal from './modals/ViewChecklistModal';
import ChecklistDetailsModal from './ChecklistDetailsModal';
import ConfirmDeleteModal from './modals/ConfirmDeleteModal';
import StrategyChecklist from './StrategyChecklist';
import ImageViewer from './ImageViewer';
import { useAuthContext } from '../context/AuthContext';

export default function TradeJournal() {
  const state = useTradeState();
  const { user } = useAuthContext();

  const editingTrade = state.editingId
    ? state.trades.find(t => t.id === state.editingId)
    : null;

  return (
    <PageLayout
      title="Trade Journal"
      subtitle={user?.name ? `Welcome back, ${user.name}` : undefined}
      icon={Plus}
      color="blue"
      action={{
        label: state.isAdding || state.editingId ? 'Cancel' : 'Add Trade',
        onClick: state.isAdding || state.editingId ? state.handleCancel : state.handleAdd,
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
      {(state.isAdding || state.editingId) && (
        <TradeForm
          formData={state.formData}
          setFormData={state.setFormData}
          accounts={state.accounts}
          pairs={state.pairs}
          strategies={state.strategies}
          keyLevels={state.keyLevels}
          sessions={state.sessionsList}
          calculatedRR={state.calculatedRR}
          calculatedCommission={state.calculatedCommission}
          calculatedRealPL={state.calculatedRealPL}
          uploadingImage={state.uploadingImage}
          editingId={state.editingId}
          editingChecklistSession={(editingTrade as any)?.checklistSession || ''}
          onSave={state.editingId ? () => state.handleEdit(state.editingId as string) : state.handleSave}
          onCancel={state.handleCancel}
          onFileUpload={state.handleFileUpload}
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
      {state.viewingImages.length > 0 && (
        <ImageViewer
          images={state.viewingImages}
          initialIndex={state.viewingImageIndex}
          onClose={() => state.setViewingImages([])}
        />
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
