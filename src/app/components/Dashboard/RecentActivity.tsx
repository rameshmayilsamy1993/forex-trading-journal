import { Clock, BookOpen } from 'lucide-react';
import { Trade, TradingAccount } from '../../types/trading';

const getRealPL = (t: Trade): number =>
  (t as any).realPL ?? ((t.profit || 0) + (t.commission || 0) + ((t as any).swap || 0));

const getTradeAccountId = (trade: Trade): string => {
  if (typeof trade.accountId === 'object' && trade.accountId !== null)
    return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
  return String(trade.accountId || '');
};

interface RecentActivityProps {
  trades: Trade[];
  accounts: TradingAccount[];
}

export default function RecentActivity({ trades, accounts }: RecentActivityProps) {
  if (trades.length === 0) {
    return (
      <div className="glass-panel rounded-[20px] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
            <Clock className="w-3 h-3 text-white" />
          </div>
          <h3 className="text-body font-semibold text-[#0F172A]">Recent Activity</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BookOpen className="w-8 h-8 text-[#CBD5E1] mb-2" />
          <p className="text-body-sm text-[#64748B]">No closed trades yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[20px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
          <Clock className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-body font-semibold text-[#0F172A]">Recent Activity</h3>
        <p className="text-micro text-[#94A3B8] ml-1">Latest closed trades</p>
      </div>

      <div className="space-y-1">
        {trades.map((trade) => {
          const realPL = getRealPL(trade);
          const isWin = realPL >= 0;
          const entryTime = trade.entryTime
            ? new Date(`2000-01-01T${trade.entryTime}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            : new Date(trade.entryDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          const tradeAccount = accounts.find((a) => a.id === getTradeAccountId(trade));
          const entryDate = new Date(trade.entryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

          return (
            <div
              key={trade.id}
              className="flex items-center justify-between rounded-xl bg-white border border-[#E2E8F0] px-3 py-2 hover:bg-[#F1F5F9] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`h-8 w-[3px] rounded-full ${isWin ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-body-sm font-semibold text-[#0F172A]">{trade.pair}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-micro ${trade.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{trade.type}</span>
                    {trade.keyLevel && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-micro font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                        {trade.keyLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-micro text-[#94A3B8]">{entryDate} · {entryTime} · {tradeAccount?.name || 'Unknown'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-body-sm font-semibold tabular-nums ${isWin ? 'text-emerald-600' : 'text-rose-600'}`}>{isWin ? '+' : ''}${realPL.toFixed(2)}</p>
                <p className="text-micro text-[#94A3B8]">{trade.lotSize} lot{trade.lotSize !== 1 ? 's' : ''}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button className="mt-2 w-full text-center text-micro text-[#7C3AED] hover:text-[#6D28D9] transition-colors py-1.5">
        View All Trades →
      </button>
    </div>
  );
}
