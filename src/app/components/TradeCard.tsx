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
  const realPL = (trade as any).realPL ?? trade.profit ?? 0;
  return (
    <div className={`glass-panel rounded-[20px] p-4 space-y-3 transition-all duration-300 hover:glass-panel-hover animate-in fade-in slide-in-from-bottom-2 duration-400 border-l-[3px] ${isSelected ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : realPL > 0 ? 'border-l-emerald-500/50' : realPL < 0 ? 'border-l-rose-500/50' : 'border-l-transparent'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(trade.id)}
            className="w-4 h-4 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED]/30" />
          <span className="font-semibold text-slate-900">{trade.pair}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro ${
            trade.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {trade.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trade.type}
          </span>
        </div>
        <div className="relative">
          {realPL !== 0 && (
            <div
              className={`absolute -inset-x-2 -inset-y-1 rounded-lg transition-all duration-300 ${realPL > 0 ? 'bg-emerald-500/8' : 'bg-rose-500/8'}`}
            />
          )}
          <span className={`relative text-body font-bold ${realPL > 0 ? 'text-emerald-600' : realPL < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {formatMoney(realPL, true)}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-caption">
        <div><span className="block text-[#94A3B8] text-micro">Account</span><span className="font-medium text-[#0F172A] text-body-sm">{getAccountName(trade, accounts)}</span></div>
        <div><span className="block text-[#94A3B8] text-micro">Lot Size</span><span className="font-medium text-[#0F172A] text-body-sm">{trade.lotSize}</span></div>
        <div><span className="block text-[#94A3B8] text-micro">Entry</span><span className="font-medium text-[#0F172A] text-body-sm font-mono">{trade.entryPrice ? formatPrice(trade.entryPrice, trade.pair) : '-'}</span></div>
        <div><span className="block text-[#94A3B8] text-micro">Exit</span><span className="font-medium text-[#0F172A] text-body-sm font-mono">{trade.exitPrice ? formatPrice(trade.exitPrice, trade.pair) : '-'}</span></div>
        <div><span className="block text-[#94A3B8] text-micro">Date</span><span className="font-medium text-[#0F172A] text-body-sm">{getLocalDateString(trade.entryDate)}</span></div>
        <div>
          <span className="block text-[#94A3B8] text-micro">Checklist</span>
          <span className="font-medium text-[#0F172A] text-body-sm">
            {(trade as any).checklistId ? (
              <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="w-3 h-3" /> Linked</span>
            ) : '—'}
          </span>
        </div>
        {trade.riskRewardRatio && (
          <div>
            <span className="block text-[#94A3B8] text-micro">R:R</span>
            <span className="font-medium text-violet-600 text-body-sm">1:{trade.riskRewardRatio.toFixed(1)}</span>
          </div>
        )}
        <div>
          <span className="block text-[#94A3B8] text-micro">Status</span>
          <span className={`inline-flex items-center gap-1 text-micro font-semibold ${trade.status === 'OPEN' ? 'text-amber-600' : 'text-emerald-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${trade.status === 'OPEN' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {trade.status}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
        <button onClick={() => onView(trade)} className="p-1.5 rounded-lg glass-panel text-slate-400 hover:text-slate-700 hover:shadow-sm transition-all" title="View"><Eye className="w-4 h-4" /></button>
        <button onClick={() => onEdit(trade)} className="p-1.5 rounded-lg glass-panel text-slate-400 hover:text-slate-700 hover:shadow-sm transition-all" title="Edit"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => onDelete(trade.id)} className="p-1.5 rounded-lg glass-panel text-rose-400 hover:text-rose-600 hover:shadow-sm transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
