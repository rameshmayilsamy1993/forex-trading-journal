import { useMemo } from 'react';
import { Plus, X, TrendingUp, TrendingDown, Clock, CalendarDays, Target, BarChart3, FileText, ClipboardCheck, Image as ImageIcon } from 'lucide-react';
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
import Modal from './ui/Modal';
import { useAuthContext } from '../context/AuthContext';
import { formatPrice, formatMoney, calculateTradeStats } from '../utils/calculations';
import { getLocalDateString } from '../utils/dateUtils';

export default function TradeJournal() {
  const state = useTradeState();
  const { user } = useAuthContext();

  const editingTrade = state.editingId
    ? state.trades.find(t => t.id === state.editingId)
    : null;

  const tradeStats = useMemo(() => calculateTradeStats(state.filteredTrades), [state.filteredTrades]);

  return (
    <PageLayout
      title="Trade Journal"
      subtitle={user?.name ? `Welcome back, ${user.name}` : undefined}
      icon={Plus}
      color="purple"
      action={{
        label: state.isAdding || state.editingId ? 'Cancel' : 'Add Trade',
        onClick: state.isAdding || state.editingId ? state.handleCancel : state.handleAdd,
      }}
    >
      {/* Account Balance Summary */}
      {state.accounts.length > 0 && (
        <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-[#E5E7EB] p-4 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)]">
          <div className="flex flex-wrap gap-4 items-center">
            {state.accounts.map(account => {
              const accountTrades = state.trades.filter(
                t => t.accountId === account.id && t.status === 'CLOSED'
              );
              const profit = accountTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
              return (
                <div key={account.id} className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] rounded-xl">
                  <span className="text-body-sm text-[#64748B]">{account.name}</span>
                  <span className={`text-body-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {profit >= 0 ? '+' : ''}{profit?.toFixed(2) ?? '0.00'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {tradeStats && state.filteredTrades.filter(t => t.status === 'CLOSED').length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Win Rate */}
          <div className="glass-panel rounded-[20px] p-4 flex flex-col items-center">
            <div className="relative w-14 h-14 mb-2">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#winRateGrad)" strokeWidth="3"
                  strokeDasharray={`${tradeStats.winRate} ${100 - tradeStats.winRate}`}
                  strokeLinecap="round" />
                <defs>
                  <linearGradient id="winRateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-body-sm font-bold text-[#0F172A]">
                {tradeStats.winRate.toFixed(0)}%
              </span>
            </div>
            <p className="text-micro text-[#64748B] uppercase tracking-wider">Win Rate</p>
            <p className="text-caption text-[#94A3B8] mt-0.5">
              {tradeStats.winningTrades}W / {tradeStats.losingTrades}L
            </p>
          </div>

          {/* Net P/L */}
          <div className="glass-panel rounded-[20px] p-4 flex flex-col items-center justify-center">
            <p className={`text-card-title font-bold tabular-nums ${tradeStats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatMoney(tradeStats.netProfit, true)}
            </p>
            <p className="text-micro text-[#64748B] uppercase tracking-wider mt-1">Net P/L</p>
            <p className="text-caption text-[#94A3B8] mt-0.5">
              Avg W <span className="text-emerald-600 font-medium">{formatMoney(tradeStats.averageWin)}</span>
              {' / '}
              Avg L <span className="text-rose-600 font-medium">{formatMoney(tradeStats.averageLoss)}</span>
            </p>
          </div>

          {/* Profit Factor */}
          <div className="glass-panel rounded-[20px] p-4 flex flex-col items-center justify-center">
            <p className="text-card-title font-bold text-[#0F172A] tabular-nums">
              {tradeStats.profitFactor === Infinity ? '∞' : tradeStats.profitFactor.toFixed(2)}
            </p>
            <p className="text-micro text-[#64748B] uppercase tracking-wider mt-1">Profit Factor</p>
            <div className="flex items-center gap-2 mt-1.5 w-full max-w-[100px]">
              <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(tradeStats.totalProfit / (tradeStats.totalProfit + tradeStats.totalLoss) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Total Trades */}
          <div className="glass-panel rounded-[20px] p-4 flex flex-col items-center justify-center">
            <p className="text-card-title font-bold text-[#0F172A] tabular-nums">
              {tradeStats.totalTrades}
            </p>
            <p className="text-micro text-[#64748B] uppercase tracking-wider mt-1">Total Trades</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="glass-chip text-micro px-2 py-0.5">{tradeStats.totalTrades} Closed</span>
              <span className="text-caption text-[#94A3B8]">
                {state.filteredTrades.filter(t => t.status === 'OPEN').length} Open
              </span>
            </div>
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
      {state.viewingTrade && (
        <Modal
          isOpen={true}
          onClose={() => state.setViewingTrade(null)}
          title={`${state.viewingTrade.pair} - ${state.viewingTrade.type}`}
          subtitle={`${getLocalDateString(state.viewingTrade.entryDate)}${state.viewingTrade.entryTime ? ` at ${state.viewingTrade.entryTime}` : ''}`}
          size="xl"
          icon={<BarChart3 className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="bg-[#F8FAFC] rounded-xl p-4">
              <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></span>
                Trade Information
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Account</p>
                  <p className="text-body-sm text-foreground mt-0.5 font-medium">
                    {(() => {
                      const account = state.accounts.find(a => {
                        const id = typeof state.viewingTrade!.accountId === 'object'
                          ? (state.viewingTrade!.accountId as any)?.id || (state.viewingTrade!.accountId as any)?._id
                          : state.viewingTrade!.accountId;
                        return String(a.id) === String(id);
                      });
                      return account?.name || 'Unknown';
                    })()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Pair</p>
                  <p className="text-body-sm text-foreground mt-0.5 font-bold">{state.viewingTrade.pair}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Type</p>
                  <p className={`text-body-sm mt-0.5 font-medium ${state.viewingTrade.type === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <span className="inline-flex items-center gap-1">
                      {state.viewingTrade.type === 'BUY' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {state.viewingTrade.type}
                    </span>
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Status</p>
                  <p className="text-body-sm mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold ${state.viewingTrade.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {state.viewingTrade.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3">
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Entry Date</p>
                  <p className="text-body-sm text-foreground mt-0.5 font-medium flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    {getLocalDateString(state.viewingTrade.entryDate)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Exit Date</p>
                  <p className="text-body-sm text-foreground mt-0.5 font-medium flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    {state.viewingTrade.exitDate ? getLocalDateString(state.viewingTrade.exitDate) : '-'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Entry Time</p>
                  <p className="text-body-sm text-foreground mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {state.viewingTrade.entryTime || '-'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Exit Time</p>
                  <p className="text-body-sm text-foreground mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {state.viewingTrade.exitTime || '-'}
                  </p>
                </div>
                {(() => {
                  const t = state.viewingTrade!;
                  if (!t.entryDate || !t.exitDate) return null;
                  const parseDT = (date: string, time?: string) => {
                    const d = new Date(date);
                    if (time) {
                      const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
                      if (match) {
                        let h = parseInt(match[1]);
                        const m = parseInt(match[2]);
                        if (match[3]?.toUpperCase() === 'PM' && h !== 12) h += 12;
                        if (match[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
                        d.setHours(h, m, 0, 0);
                      }
                    } else {
                      d.setHours(0, 0, 0, 0);
                    }
                    return d.getTime();
                  };
                  const entry = parseDT(t.entryDate, t.entryTime);
                  const exit = parseDT(t.exitDate, t.exitTime);
                  if (isNaN(entry) || isNaN(exit)) return null;
                  const diffMs = exit - entry;
                  if (diffMs < 0) return null;
                  const totalMinutes = Math.round(diffMs / 60000);
                  const days = Math.floor(totalMinutes / 1440);
                  const hours = Math.floor((totalMinutes % 1440) / 60);
                  const minutes = totalMinutes % 60;
                  const parts: string[] = [];
                  if (days > 0) parts.push(`${days}d`);
                  if (hours > 0) parts.push(`${hours}h`);
                  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
                  return (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Trade Duration</p>
                      <p className="text-body-sm text-violet-600 mt-0.5 font-bold">{parts.join(' ')}</p>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3">
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Entry Price</p>
                  <p className="text-body-sm text-foreground mt-0.5 font-mono font-medium">{formatPrice(state.viewingTrade.entryPrice, state.viewingTrade.pair)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Exit Price</p>
                  <p className="text-body-sm text-foreground mt-0.5 font-mono font-medium">{state.viewingTrade.exitPrice ? formatPrice(state.viewingTrade.exitPrice, state.viewingTrade.pair) : '-'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Lot Size</p>
                  <p className="text-body-sm text-foreground mt-0.5 font-mono font-medium">{state.viewingTrade.lotSize}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Profit</p>
                  <p className={`text-body-sm mt-0.5 font-mono font-bold ${(state.viewingTrade.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(state.viewingTrade.profit || 0) >= 0 ? '+' : ''}${(state.viewingTrade.profit || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3">
                {state.viewingTrade.stopLoss && (
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Stop Loss</p>
                    <p className="text-body-sm text-rose-600 mt-0.5 font-mono font-medium">{formatPrice(state.viewingTrade.stopLoss, state.viewingTrade.pair)}</p>
                  </div>
                )}
                {state.viewingTrade.takeProfit && (
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Take Profit</p>
                    <p className="text-body-sm text-emerald-600 mt-0.5 font-mono font-medium">{formatPrice(state.viewingTrade.takeProfit, state.viewingTrade.pair)}</p>
                  </div>
                )}
                {state.viewingTrade.riskRewardRatio && (
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">R:R Ratio</p>
                    <p className="text-body-sm text-violet-600 mt-0.5 font-bold">1:{state.viewingTrade.riskRewardRatio.toFixed(2)}</p>
                  </div>
                )}
                {(state.viewingTrade as any).highLowTime && (
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">High/Low Time</p>
                    <p className="text-body-sm text-foreground mt-0.5 font-medium">{(state.viewingTrade as any).highLowTime}</p>
                  </div>
                )}
                {state.viewingTrade.commission !== undefined && (
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Commission</p>
                    <p className="text-body-sm text-foreground mt-0.5 font-mono font-medium">${state.viewingTrade.commission.toFixed(2)}</p>
                  </div>
                )}
                {(state.viewingTrade as any).swap !== undefined && (state.viewingTrade as any).swap !== 0 && (
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Swap</p>
                    <p className="text-body-sm text-foreground mt-0.5 font-mono font-medium">${Math.abs((state.viewingTrade as any).swap).toFixed(2)}</p>
                  </div>
                )}
                <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                  <p className="text-caption text-muted-foreground">Real P/L</p>
                  <p className={`text-body-sm mt-0.5 font-mono font-bold ${(() => { const pl = (state.viewingTrade as any).realPL ?? ((state.viewingTrade.profit || 0) - Math.abs(state.viewingTrade.commission || 0) - Math.abs((state.viewingTrade as any).swap || 0)); return pl >= 0 ? 'text-emerald-600' : 'text-rose-600'; })()}`}>
                    {(() => { const pl = (state.viewingTrade as any).realPL ?? ((state.viewingTrade.profit || 0) - Math.abs(state.viewingTrade.commission || 0) - Math.abs((state.viewingTrade as any).swap || 0)); return pl >= 0 ? '+' : ''; })()}${(() => { const pl = (state.viewingTrade as any).realPL ?? ((state.viewingTrade.profit || 0) - Math.abs(state.viewingTrade.commission || 0) - Math.abs((state.viewingTrade as any).swap || 0)); return pl.toFixed(2); })()}
                  </p>
                </div>
              </div>
            </div>

            {(state.viewingTrade.session || state.viewingTrade.strategy || state.viewingTrade.keyLevel) && (
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-blue-600 rounded-full"></span>
                  Setup Details
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {state.viewingTrade.session && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Session</p>
                      <p className="text-body-sm text-foreground mt-0.5 font-medium">{state.viewingTrade.session}</p>
                    </div>
                  )}
                  {state.viewingTrade.strategy && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Strategy</p>
                      <p className="text-body-sm text-foreground mt-0.5 font-medium">{state.viewingTrade.strategy}</p>
                    </div>
                  )}
                  {state.viewingTrade.keyLevel && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Key Level</p>
                      <p className="text-body-sm text-foreground mt-0.5 font-medium">{state.viewingTrade.keyLevel}</p>
                    </div>
                  )}
                  {(state.viewingTrade as any).highLowTime && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">High/Low Time</p>
                      <p className="text-body-sm text-foreground mt-0.5 font-medium">{(state.viewingTrade as any).highLowTime}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(state.viewingTrade.smt || state.viewingTrade.model1 || (state.viewingTrade as any).ssmtType) && (
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></span>
                  Analysis
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {state.viewingTrade.smt && state.viewingTrade.smt !== 'No' && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">SMT</p>
                      <p className="text-body-sm text-violet-600 mt-0.5 font-medium">{state.viewingTrade.smt}</p>
                    </div>
                  )}
                  {state.viewingTrade.model1 && state.viewingTrade.model1 !== 'No' && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Model #1</p>
                      <p className="text-body-sm text-emerald-600 mt-0.5 font-medium">{state.viewingTrade.model1}</p>
                    </div>
                  )}
                  {(state.viewingTrade as any).ssmtType && (state.viewingTrade as any).ssmtType !== 'NO' && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">SSMT</p>
                      <p className="text-body-sm text-sky-600 mt-0.5 font-medium">{(state.viewingTrade as any).ssmtType}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {(() => {
              const notes = state.viewingTrade!.notes || (state.viewingTrade as any).notes;
              return notes ? (
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-rose-500 to-pink-600 rounded-full"></span>
                    Notes
                  </h4>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-body text-foreground whitespace-pre-wrap">{notes}</p>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Checklist */}
            {(() => {
              const checklistId = (state.viewingTrade as any).checklistId;
              const checklistSession = (state.viewingTrade as any).checklistSession;
              return checklistId ? (
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></span>
                    Checklist
                  </h4>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-caption text-muted-foreground">Session</p>
                        <p className="text-body-sm text-foreground mt-0.5 font-medium">
                          {checklistSession || 'Linked'}
                        </p>
                      </div>
                      <button
                        onClick={() => state.handleOpenChecklistDetails(state.viewingTrade!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-button text-white bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] rounded-lg hover:from-[#6D28D9] hover:to-[#4338CA] transition-all duration-200 shadow-md shadow-[#7C3AED]/25"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        View Checklist
                      </button>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {(state.viewingTrade.beforeScreenshot || state.viewingTrade.afterScreenshot) && (
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-sky-500 to-cyan-600 rounded-full"></span>
                  Screenshots
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {state.viewingTrade.beforeScreenshot && (
                    <div className="relative group rounded-lg overflow-hidden cursor-pointer" onClick={() => {
                      const imgs = [{ url: state.viewingTrade!.beforeScreenshot!, label: 'Before' }];
                      if (state.viewingTrade?.afterScreenshot) imgs.push({ url: state.viewingTrade.afterScreenshot, label: 'After' });
                      state.setViewingImages(imgs);
                      state.setViewingImageIndex(0);
                    }}>
                      <img src={state.viewingTrade.beforeScreenshot} alt="Before" className="w-full h-32 object-cover rounded-lg" />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-caption px-2 py-0.5 rounded">Before</span>
                    </div>
                  )}
                  {state.viewingTrade.afterScreenshot && (
                    <div className="relative group rounded-lg overflow-hidden cursor-pointer" onClick={() => {
                      const imgs = [];
                      if (state.viewingTrade?.beforeScreenshot) imgs.push({ url: state.viewingTrade.beforeScreenshot, label: 'Before' });
                      imgs.push({ url: state.viewingTrade!.afterScreenshot!, label: 'After' });
                      state.setViewingImages(imgs);
                      state.setViewingImageIndex(imgs.length - 1);
                    }}>
                      <img src={state.viewingTrade.afterScreenshot} alt="After" className="w-full h-32 object-cover rounded-lg" />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-caption px-2 py-0.5 rounded">After</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

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
