import { TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import MiniSparkline from './MiniSparkline';
import { TradingAccount, TradeStats } from '../../types/trading';

interface PortfolioHeroProps {
  totalBalance: number;
  netPL: number;
  netPct: number;
  stats: TradeStats;
  equityCurve: { date: string; balance: number }[];
  getEquityStats: { highest: number; lowest: number; start: number; current: number };
  selectedAccount: string;
  onAccountChange: (v: string) => void;
  filteredAccounts: TradingAccount[];
  isLoading: boolean;
}

function formatMoney(value: number, showPlus = false): string {
  const prefix = showPlus && value > 0 ? '+$' : value < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

export default function PortfolioHero({
  totalBalance, netPL, netPct, stats, equityCurve,
  getEquityStats, selectedAccount, onAccountChange, filteredAccounts, isLoading,
}: PortfolioHeroProps) {
  const isPositive = netPL >= 0;

  if (isLoading) {
    return (
      <div className="glass-panel rounded-[20px] p-5 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 bg-[#F1F5F9] rounded w-24" />
          <div className="h-10 bg-[#F1F5F9] rounded w-48" />
          <div className="h-20 bg-[#F1F5F9] rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[20px] p-5 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#7C3AED]/[0.07] blur-3xl" />
      <div className="absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-[#7C3AED]/[0.07] blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-body-sm text-[#64748B]">Portfolio Value</p>
            <p className="mt-1 text-display-xl text-[#0F172A] tabular-nums">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-sm font-semibold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatMoney(netPL, true)} ({netPct >= 0 ? '+' : ''}{netPct.toFixed(2)}%)
              </span>
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-body-sm text-[#64748B]">
                {stats.totalTrades} trades
              </span>
            </div>
          </div>
          <div className="min-w-[140px]">
            <Select value={selectedAccount} onValueChange={onAccountChange}>
              <SelectTrigger className="h-8 w-full rounded-full bg-[#F1F5F9] border-[#E2E8F0] px-3 text-body-sm text-[#475569] shadow-none">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {filteredAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {equityCurve.length >= 2 && (
              <div className="mt-2 rounded-xl bg-[#F1F5F9] p-2">
                <MiniSparkline data={equityCurve} color="#7C3AED" width={160} height={32} />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {[
            { label: 'Net P/L', value: formatMoney(stats.netProfit, true), color: stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
            { label: 'Trades', value: stats.totalTrades },
            { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%` },
            { label: 'Avg RR', value: '—' },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-3">
              <div>
                <p className="text-micro text-[#64748B]">{item.label}</p>
                <p className={`text-body font-semibold text-[#0F172A] tabular-nums ${item.color || ''}`}>{item.value}</p>
              </div>
              {i < 3 && <div className="w-px h-8 bg-[#E2E8F0]" />}
            </div>
          ))}
        </div>

        {equityCurve.length >= 2 && (
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-[#F1F5F9] p-3">
            <div>
              <p className="text-micro text-[#64748B]">Highest</p>
              <p className="text-body-sm font-semibold text-emerald-600 tabular-nums">${getEquityStats.highest.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-micro text-[#64748B]">Lowest</p>
              <p className="text-body-sm font-semibold text-rose-600 tabular-nums">${getEquityStats.lowest.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-micro text-[#64748B]">Start</p>
              <p className="text-body-sm font-semibold text-[#334155] tabular-nums">${getEquityStats.start.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-micro text-[#64748B]">Current</p>
              <p className="text-body-sm font-semibold text-[#7C3AED] tabular-nums">${getEquityStats.current.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
