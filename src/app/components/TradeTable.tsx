import { TrendingUp, TrendingDown, Edit2, Trash2, Eye, FileText, ClipboardCheck, Link2, Unlink, Trash, AlertTriangle, Check } from 'lucide-react';
import { Trade, TradingAccount, PropFirm } from '../types/trading';
import { formatPrice, formatMoney } from '../utils/calculations';
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
        <p className="text-sm text-slate-500">Go to "Accounts" tab to create one</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-200/50">
        <span className="text-sm text-slate-500 font-medium">Filters:</span>
        <div className="flex gap-4 items-center">
          <Select
            value={filterAccount || 'all'}
            onValueChange={(value: string) => onFilterAccountChange(value)}
          >
            <SelectTrigger className="w-[200px] bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
            <SelectTrigger className="w-[150px] bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
            <SelectTrigger className={`w-[180px] bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors ${accountState === 'BREACHED' ? 'border-red-300 bg-red-50' : ''}`}>
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
            <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue placeholder="All Analysis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              <SelectItem value="pending">Pending Analysis</SelectItem>
              <SelectItem value="completed">Completed Analysis</SelectItem>
              <SelectItem value="profit">Profit Trades</SelectItem>
              <SelectItem value="loss">Loss Trades</SelectItem>
            </SelectContent>
          </Select>

          {accountState === 'BREACHED' && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Showing breached accounts only
            </span>
          )}
        </div>
      </div>

      {/* Mobile Trade Cards */}
      <div className="lg:hidden space-y-3">
        {trades.map(trade => (
          <TradeCard
            key={trade.id}
            trade={trade}
            accounts={accounts}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            isSelected={selectedTrades.includes(trade.id)}
            onSelect={onToggleSelect}
          />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50">
        <div className="p-6">
          {trades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No trades recorded yet</p>
              <p className="text-sm text-slate-500">Click "Add Trade" to start logging</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTrades.length === trades.length && trades.length > 0}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-medium">Select All</span>
                  </label>
                  <span className="text-sm text-slate-500">
                    {selectedTrades.length > 0 ? `${selectedTrades.length} selected` : `${trades.length} trades`}
                  </span>
                </div>
                {selectedTrades.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onBulkLink}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                    >
                      <Link2 className="w-4 h-4" />
                      Link Checklist ({selectedTrades.length})
                    </button>
                    <button
                      onClick={onBulkUnlink}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-500/25"
                    >
                      <Unlink className="w-4 h-4" />
                      Unlink ({selectedTrades.length})
                    </button>
                    <button
                      onClick={onBulkDeleteClick}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all duration-200 shadow-lg shadow-rose-500/25"
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
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="w-[140px]">Date</TableHead>
                      <TableHead className="w-[300px]">Account</TableHead>
                      <TableHead className="w-[120px]">Pair</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead className="text-right hidden sm:table-cell w-[120px]">Entry</TableHead>
                      <TableHead className="text-right hidden sm:table-cell w-[120px]">Exit</TableHead>
                      <TableHead className="text-right w-[120px]">Real P/L</TableHead>
                      <TableHead className="text-center w-[120px]">Checklist</TableHead>
                      <TableHead className="text-right w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map(trade => (
                      <TableRow key={trade.id} className={`group ${selectedTrades.includes(trade.id) ? 'bg-blue-50/50' : ''}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTrades.includes(trade.id)}
                            onChange={() => onToggleSelect(trade.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            {getLocalDateString(trade.entryDate)}
                            {trade.entryTime && (
                              <div className="text-xs text-slate-400">{trade.entryTime}</div>
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
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800">
                            {trade.pair}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${trade.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                            {trade.type === 'BUY' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {trade.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono hidden sm:table-cell">{formatPrice(trade.entryPrice, trade.pair)}</TableCell>
                        <TableCell className="text-right font-mono hidden sm:table-cell">
                          {trade.exitPrice ? formatPrice(trade.exitPrice, trade.pair) : '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(() => {
                            const realPL = getTradeRealPL(trade);
                            return (
                              <span className={`inline-flex items-center gap-1 font-bold ${realPL > 0 ? 'text-emerald-700' : realPL < 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                                {formatMoney(realPL, true)}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {(trade as any).checklistId ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit mx-auto">
                              <Check className="w-3 h-3" />
                              Linked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 w-fit mx-auto">
                              &mdash; Not Linked
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onChecklistDetails(trade)}
                              className={`p-1.5 rounded-lg transition-all duration-150 ${(trade as any).checklistId ? 'text-violet-500 hover:text-violet-700 hover:bg-violet-50' : 'text-slate-400 hover:text-violet-700 hover:bg-violet-50'}`}
                              title="Checklist"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                            </button>
                            {getTradeRealPL(trade) < 0 && (
                              <button
                                onClick={() => onLossAnalysis(trade)}
                                className={`p-1.5 rounded-lg transition-all duration-150 ${analysesMap[trade.id] ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' : 'text-rose-400 hover:text-rose-700 hover:bg-rose-50'}`}
                                title={analysesMap[trade.id] ? 'View Loss Analysis' : 'Create Loss Analysis'}
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => onView(trade)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
                              title="View trade"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onEdit(trade)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(trade.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-all duration-150"
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
