import { Wallet, Building2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import MiniSparkline from './MiniSparkline';
import { Trade, TradingAccount, PropFirm } from '../../types/trading';

const getRealPL = (t: Trade): number =>
  (t as any).realPL ?? ((t.profit || 0) + (t.commission || 0) + ((t as any).swap || 0));

const getTradeAccountId = (trade: Trade): string => {
  if (typeof trade.accountId === 'object' && trade.accountId !== null)
    return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
  return String(trade.accountId || '');
};

function HealthBadge({ status }: { status: 'Healthy' | 'Warning' | 'Risk' }) {
  const config = {
    Healthy: { variant: 'success' as const, label: 'Healthy' },
    Warning: { variant: 'warning' as const, label: 'Warning' },
    Risk: { variant: 'destructive' as const, label: 'Risk' },
  };
  const { variant, label } = config[status];
  return <Badge variant={variant} className="px-1.5 py-0.5 text-micro">{label}</Badge>;
}

function AccountSparkline({ trades, initialBalance, width = 60, height = 20 }: { trades: Trade[]; initialBalance: number; width?: number; height?: number }) {
  const closed = [...trades].filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
  let balance = initialBalance;
  const points = closed.map(t => {
    balance += getRealPL(t);
    return { balance };
  });
  const data = points.length < 2 ? [{ balance: initialBalance }, { balance: initialBalance + 0.01 }] : [{ balance: initialBalance }, ...points];
  return <MiniSparkline data={data} color="#10B981" width={width} height={height} />;
}

interface AccountOverviewCardsProps {
  accounts: TradingAccount[];
  trades: Trade[];
  firms: PropFirm[];
  selectedFirm: string;
  onFirmChange: (v: string) => void;
  getPropFirmId: (firm: PropFirm | string) => string;
}

export default function AccountOverviewCards({ accounts, trades, firms, selectedFirm, onFirmChange, getPropFirmId }: AccountOverviewCardsProps) {
  if (accounts.length === 0) {
    return (
      <div className="glass-panel rounded-[20px] p-5">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Wallet className="w-8 h-8 text-white/20 mb-2" />
          <p className="text-body text-white/50">No accounts match the selected filters</p>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Challenge', PASSED_1: 'Phase 1', PASSED_2: 'Phase 2',
    FUNDED: 'Funded', BREACHED: 'Breached', DISABLED: 'Disabled',
  };

  return (
    <div className="glass-panel rounded-[20px] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
            <Wallet className="w-3 h-3 text-white" />
          </div>
          <h3 className="text-body font-semibold text-white/90">Accounts</h3>
          <span className="text-micro text-white/40">({accounts.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedFirm}
            onChange={(e) => onFirmChange(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-body-sm text-white/70 outline-none"
          >
            <option value="all">All Firms</option>
            {firms.map((firm) => (
              <option key={getPropFirmId(firm)} value={getPropFirmId(firm)}>{firm.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const accountTrades = trades.filter(t => getTradeAccountId(t) === account.id && t.status === 'CLOSED');
          const pl = accountTrades.reduce((sum, t) => sum + getRealPL(t), 0);
          const currentBalance = account.initialBalance + pl;
          const plPercent = account.initialBalance > 0 ? (pl / account.initialBalance) * 100 : 0;
          const dd = pl < 0 ? Math.abs(pl) / account.initialBalance * 100 : 0;

          const health = dd > 10 ? 'Risk' as const : dd > 5 ? 'Warning' as const : 'Healthy' as const;
          const borderColor = health === 'Healthy' ? 'border-l-emerald-500/50' : health === 'Warning' ? 'border-l-amber-500/50' : 'border-l-rose-500/50';

          return (
            <div key={account.id} className={`glass-card rounded-[16px] p-3 border-l-[3px] ${borderColor}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5]" />
                    <h4 className="text-body-sm font-semibold text-white/90">{account.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={account.status === 'FUNDED' ? 'success' : account.status === 'BREACHED' ? 'destructive' : 'secondary'} className="text-micro px-1.5 py-0.5">
                      {statusLabels[account.status] || account.status}
                    </Badge>
                    <HealthBadge status={health} />
                  </div>
                </div>
                <AccountSparkline trades={accountTrades} initialBalance={account.initialBalance} width={60} height={20} />
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-white/[0.06]">
                <div>
                  <p className="text-micro text-white/40 uppercase tracking-wider">Balance</p>
                  <p className="text-body-sm font-semibold text-white/90 tabular-nums">${currentBalance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-micro text-white/40 uppercase tracking-wider">P/L</p>
                  <p className={`text-body-sm font-semibold tabular-nums ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-micro text-white/40 uppercase tracking-wider">Profit %</p>
                  <p className={`text-body-sm font-semibold tabular-nums ${plPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between text-micro text-white/40 mb-0.5">
                  <span>Drawdown</span>
                  <span className="text-white/60">{dd.toFixed(1)}%</span>
                </div>
                <Progress value={dd} className="h-1 bg-white/[0.06] rounded-full [&>div]:rounded-full [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-[#7C3AED]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
