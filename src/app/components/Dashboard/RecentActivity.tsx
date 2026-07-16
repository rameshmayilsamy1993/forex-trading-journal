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
          <h3 className="text-body font-semibold text-white/90">Recent Activity</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BookOpen className="w-8 h-8 text-white/20 mb-2" />
          <p className="text-body-sm text-white/50">No closed trades yet</p>
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
        <h3 className="text-body font-semibold text-white/90">Recent Activity</h3>
        <p className="text-micro text-white/40 ml-1">Latest closed trades</p>
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
              className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`h-8 w-[3px] rounded-full ${isWin ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-body-sm font-semibold text-white/90">{trade.pair}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-micro ${trade.type === 'BUY' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>{trade.type}</span>
                  </div>
                  <p className="text-micro text-white/40">{entryDate} · {entryTime} · {tradeAccount?.name || 'Unknown'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-body-sm font-semibold tabular-nums ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>{isWin ? '+' : ''}${realPL.toFixed(2)}</p>
                <p className="text-micro text-white/40">{trade.lotSize} lot{trade.lotSize !== 1 ? 's' : ''}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button className="mt-2 w-full text-center text-micro text-[#7C3AED] hover:text-white/70 transition-colors py-1.5">
        View All Trades →
      </button>
    </div>
  );
}
