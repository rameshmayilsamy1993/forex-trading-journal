import { TrendingUp, TrendingDown } from 'lucide-react';
import { TradeStats } from '../../types/trading';

interface LiveStatsBarProps {
  stats: TradeStats;
  netPL: number;
  netPct: number;
  winRate: number;
  activeAccountCount: number;
  currentStreak: { count: number; type: 'win' | 'loss' | 'none' };
  averageRR: number;
  totalBalance: number;
  isLoading: boolean;
}

function formatMoney(value: number, showPlus = false): string {
  const prefix = showPlus && value > 0 ? '+$' : value < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

export default function LiveStatsBar({ stats, netPL, netPct, winRate, activeAccountCount, currentStreak, averageRR, isLoading }: LiveStatsBarProps) {
  const metrics = [
    { label: 'NET P/L', value: formatMoney(netPL, true), trend: `${netPct >= 0 ? '+' : ''}${netPct.toFixed(1)}%`, positive: netPL >= 0 },
    { label: 'WIN RATE', value: `${winRate.toFixed(1)}%`, bar: winRate },
    { label: 'PROFIT FACTOR', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), bar: Math.min(stats.profitFactor / 3, 1) * 100 },
    { label: 'MAX DD', value: '—', bar: 0 },
    { label: 'ACCOUNTS', value: activeAccountCount },
    { label: 'TRADES', value: stats.totalTrades },
    { label: 'STREAK', value: currentStreak.count > 0 ? `${currentStreak.count}${currentStreak.type === 'win' ? 'W' : 'L'}` : '—' },
    { label: 'AVG RR', value: averageRR ? `1:${averageRR.toFixed(2)}` : '—' },
  ];

  if (isLoading) {
    return (
      <div className="glass-panel rounded-[20px] p-3">
        <div className="flex gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-1 animate-pulse space-y-2">
              <div className="h-3 bg-[#F8FAFC] rounded w-16" />
              <div className="h-5 bg-[#F8FAFC] rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[20px] p-3">
      <div className="flex gap-4">
        {metrics.map((m, i) => (
          <div key={m.label} className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-micro text-white/50 uppercase tracking-wider">{m.label}</p>
                <p className="text-body font-semibold text-white/90 tabular-nums mt-0.5">{m.value}</p>
                {'trend' in m && m.trend && (
                  <p className={`text-micro mt-0.5 inline-flex items-center gap-0.5 ${m.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {m.trend}
                  </p>
                )}
                {'bar' in m && m.bar !== undefined && m.bar > 0 && (
                  <div className="mt-1 h-1 bg-[#F8FAFC] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] rounded-full transition-all duration-500" style={{ width: `${m.bar}%` }} />
                  </div>
                )}
              </div>
              {i < metrics.length - 1 && <div className="w-px h-8 bg-[#F8FAFC] shrink-0" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
