import { TrendingUp, TrendingDown, Edit2, Trash2, Eye, FileText, ClipboardCheck, Link2, Unlink, Trash, AlertTriangle, Check, Clock } from 'lucide-react';
import { Trade, TradingAccount, PropFirm } from '../types/trading';
import { formatPrice, formatMoney, getTradeCategory } from '../utils/calculations';
import { getLocalDateString } from '../utils/dateUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import TradeCard from './TradeCard';

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

function getFirmColor(firmId: string, firms: PropFirm[]): string {
  const firm = firms.find(f => f.id === firmId);
  return firm?.color || '#6B7280';
}

function getAccountName(accountId: any, accounts: TradingAccount[]): string {
  const id = typeof accountId === 'object'
    ? accountId?.id || accountId?._id
    : accountId;
  if (!id) return 'Unknown';
  const account = accounts.find((a) => String(a.id) === String(id));
  return account?.name || 'Unknown';
}

function getTradeRealPL(trade: Trade): number {
  return (trade as any).realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs((trade as any).swap || 0));
}

function formatTimeDisplay(time?: string): string {
  if (!time) return '';
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(time.trim())) return time.trim();
  const d = new Date(time);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const timePart = time.split('T').pop() || time;
  const [h, m] = timePart.split(':');
  if (h && m) {
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${String(hour12).padStart(2, '0')}:${m.replace(/[^0-9]/g, '').substring(0, 2)} ${ampm}`;
  }
  return time;
}

function EntryTimeBadge({ time }: { time?: string }) {
  const display = formatTimeDisplay(time);
  if (!display) return <span className="text-caption text-slate-300">-</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption bg-amber-50 text-amber-700 ring-1 ring-amber-200/50">
      <Clock className="w-3 h-3 text-amber-500" />
      {display}
    </span>
  );
}

function calculateDuration(entryTime?: string, exitTime?: string): string {
  if (!entryTime || !exitTime) return '-';
  const toMinutes = (t: string): number | null => {
    const cleaned = t.trim().toUpperCase();
    let match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (match[3] === 'PM' && h !== 12) h += 12;
      if (match[3] === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }
    match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      return h * 60 + m;
    }
    return null;
  };
  const entryMin = toMinutes(entryTime);
  const exitMin = toMinutes(exitTime);
  if (entryMin === null || exitMin === null) return '-';
  let diff = exitMin - entryMin;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function TradeTable({
  trades,
  accounts,
  firms,
  analysesMap,
  selectedTrades,
  filterAccount,
  filterStatus,
  filterAnalysis,
  accountState,
  onToggleSelect,
  onToggleSelectAll,
  onFilterAccountChange,
  onFilterStatusChange,
  onFilterAnalysisChange,
  onAccountStateChange,
  onEdit,
  onDelete,
  onView,
  onLossAnalysis,
  onChecklistDetails,
  onBulkLink,
  onBulkUnlink,
  onBulkDeleteClick,
}: TradeTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 font-medium">Please add an account first</p>
        <p className="text-body text-slate-500">Go to "Accounts" tab to create one</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 p-5 glass-panel rounded-[20px] border-l-4 border-l-[#7C3AED]">
        <span className="text-body-sm font-semibold text-[#7C3AED]">Filters</span>
        <div className="flex gap-4 items-center">
          <Select
            value={filterAccount || 'all'}
            onValueChange={(value: string) => onFilterAccountChange(value)}
          >
            <SelectTrigger className="w-[200px] bg-white border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors rounded-xl">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus || 'all'}
            onValueChange={(value: string) => onFilterStatusChange(value)}
          >
            <SelectTrigger className="w-[150px] bg-white border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={accountState || 'ACTIVE'}
            onValueChange={(value: string) => onAccountStateChange(value)}
          >
            <SelectTrigger className={`w-[180px] bg-white border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors rounded-xl ${accountState === 'BREACHED' ? 'border-red-300 bg-red-50' : ''}`}>
              <SelectValue placeholder="Account State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active Accounts
                </span>
              </SelectItem>
              <SelectItem value="BREACHED">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Breached Accounts
                </span>
              </SelectItem>
              <SelectItem value="all">All Accounts</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterAnalysis}
            onValueChange={(value: string) => onFilterAnalysisChange(value)}
          >
            <SelectTrigger className="w-[160px] bg-white border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors rounded-xl">
              <SelectValue placeholder="All Analysis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              <SelectItem value="profit">Profit Trades</SelectItem>
              <SelectItem value="be">Break Even</SelectItem>
              <SelectItem value="loss">Loss Trades</SelectItem>
              <SelectItem value="pending">Pending Analysis</SelectItem>
              <SelectItem value="completed">Completed Analysis</SelectItem>
            </SelectContent>
          </Select>

          {accountState === 'BREACHED' && (
            <span className="text-caption text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Showing breached accounts only
            </span>
          )}
        </div>
      </div>

      {/* Mobile Trade Cards */}
      <div className="lg:hidden space-y-3">
        {trades.map((trade, i) => (
          <div key={trade.id} style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }} className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <TradeCard
              trade={trade}
              accounts={accounts}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              isSelected={selectedTrades.includes(trade.id)}
              onSelect={onToggleSelect}
            />
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-[20px] hover:glass-panel-hover">
        <div className="p-6">
          {trades.length === 0 ? (
            <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#EDE9FE] mb-4">
                <TrendingUp className="w-8 h-8 text-[#7C3AED]" />
              </div>
              <p className="text-slate-800 font-semibold text-card-title">No trades recorded yet</p>
              <p className="text-body text-slate-500 mt-1">Click "Add Trade" to start logging</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-body text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTrades.length === trades.length && trades.length > 0}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED]/30 cursor-pointer"
                    />
                    <span className="font-medium">Select All</span>
                  </label>
                  <span className="text-body text-slate-500">
                    {selectedTrades.length > 0 ? `${selectedTrades.length} selected` : `${trades.length} trades`}
                  </span>
                </div>
                {selectedTrades.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onBulkLink}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white rounded-xl hover:from-[#6D28D9] hover:to-[#4338CA] transition-all duration-200 shadow-lg shadow-[#7C3AED]/25"
                    >
                      <Link2 className="w-4 h-4" />
                      Link Checklist ({selectedTrades.length})
                    </button>
                    <button
                      onClick={onBulkUnlink}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-lg shadow-red-500/25"
                    >
                      <Unlink className="w-4 h-4" />
                      Unlink ({selectedTrades.length})
                    </button>
                    <button
                      onClick={onBulkDeleteClick}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl hover:from-rose-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-rose-500/25"
                    >
                      <Trash className="w-4 h-4" />
                      Delete ({selectedTrades.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto hidden lg:block">
                <Table className="rounded-2xl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedTrades.length === trades.length && trades.length > 0}
                          onChange={onToggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED]/30 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="w-[140px]">Date</TableHead>
                      <TableHead className="w-[300px]">Account</TableHead>
                      <TableHead className="w-[120px]">Pair</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead className="w-[130px]">Key Level</TableHead>
                      <TableHead className="text-center w-[120px]">Entry Time</TableHead>
                      <TableHead className="text-center w-[120px]">Exit Time</TableHead>
                      <TableHead className="text-center w-[100px]">Duration</TableHead>
                      <TableHead className="text-right w-[120px]">Real P/L</TableHead>
                      <TableHead className="text-center w-[120px]">Checklist</TableHead>
                      <TableHead className="text-right w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade, i) => (
                      <TableRow key={trade.id} className={`group animate-in fade-in slide-in-from-bottom-1 duration-300 border-l-[3px] transition-all ${selectedTrades.includes(trade.id) ? 'bg-violet-50/50 border-l-violet-500' : !trade.keyLevel ? 'border-l-orange-400 hover:border-l-orange-500 bg-orange-50' : (() => { const c = getTradeCategory(trade); return c === 'win' ? 'border-l-emerald-500/30 hover:border-l-emerald-500' : c === 'loss' ? 'border-l-rose-500/30 hover:border-l-rose-500' : 'border-l-amber-400/30 hover:border-l-amber-500'; })()}`} style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTrades.includes(trade.id)}
                            onChange={() => onToggleSelect(trade.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED]/30 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            {getLocalDateString(trade.entryDate)}
                            {trade.entryTime && (
                              <div className="text-caption text-slate-700">{trade.entryTime}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm"
                              style={{ backgroundColor: getFirmColor(trade.propFirmId, firms) }}
                            />
                            <span className="font-medium text-slate-800">{getAccountName(trade.accountId, accounts)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-caption font-semibold bg-slate-100 text-slate-800">
                            {trade.pair}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-semibold shadow-sm ${trade.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                            {trade.type === 'BUY' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {trade.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          {trade.keyLevel ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-caption font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                              {trade.keyLevel}
                            </span>
                          ) : (
                            <span className="text-caption text-slate-400">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{<EntryTimeBadge time={trade.entryTime} />}</TableCell>
                        <TableCell className="text-center">
                          {trade.exitTime ? <EntryTimeBadge time={trade.exitTime} /> : <span className="text-caption text-slate-300">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-caption font-semibold tabular-nums text-violet-600">{calculateDuration(trade.entryTime, trade.exitTime)}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(() => {
                            const realPL = getTradeRealPL(trade);
                            const absPL = Math.abs(realPL);
                            const category = getTradeCategory(trade);
                            const barColor = category === 'win' ? 'bg-emerald-500/10' : category === 'loss' ? 'bg-rose-500/10' : 'bg-amber-400/10';
                            const textColor = category === 'win' ? 'text-emerald-700' : category === 'loss' ? 'text-rose-700' : 'text-amber-600';
                            return (
                              <div className="relative flex items-center justify-end">
                                {realPL !== 0 && (
                                  <div
                                    className={`absolute right-0 h-5 rounded-sm transition-all duration-300 ${barColor}`}
                                    style={{ width: `${Math.min(absPL / 10, 100)}%`, maxWidth: '100%' }}
                                  />
                                )}
                                <span className={`relative z-10 inline-flex items-center gap-1 font-bold tabular-nums ${textColor}`}>
                                  {formatMoney(realPL, true)}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {(trade as any).checklistId ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit mx-auto">
                              <Check className="w-3 h-3" />
                              Linked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro bg-slate-100 text-slate-500 border border-slate-200 w-fit mx-auto">
                              &mdash; Not Linked
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onChecklistDetails(trade)}
                              className={`p-1.5 rounded-lg transition-all duration-150 glass-panel ${(trade as any).checklistId ? 'text-violet-500 hover:shadow-sm' : 'text-slate-400 hover:text-violet-600 hover:shadow-sm'}`}
                              title="Checklist"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                            </button>
                            {getTradeRealPL(trade) < 0 && (
                              <button
                                onClick={() => onLossAnalysis(trade)}
                                className={`p-1.5 rounded-lg transition-all duration-150 glass-panel ${analysesMap[trade.id] ? 'text-orange-500 hover:shadow-sm' : 'text-rose-400 hover:text-rose-600 hover:shadow-sm'}`}
                                title={analysesMap[trade.id] ? 'View Loss Analysis' : 'Create Loss Analysis'}
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => onView(trade)}
                              className="p-1.5 rounded-lg transition-all duration-150 glass-panel text-slate-400 hover:text-slate-700 hover:shadow-sm"
                              title="View trade"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onEdit(trade)}
                              className="p-1.5 rounded-lg transition-all duration-150 glass-panel text-slate-400 hover:text-slate-700 hover:shadow-sm"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(trade.id)}
                              className="p-1.5 rounded-lg transition-all duration-150 glass-panel text-rose-400 hover:text-rose-600 hover:shadow-sm"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
