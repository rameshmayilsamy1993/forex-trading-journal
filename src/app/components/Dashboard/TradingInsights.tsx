import { Award, TrendingUp, Zap, Star, Activity } from 'lucide-react';
import { TradeStats } from '../../types/trading';

interface TradingInsightsProps {
  bestPair: [string, { profit: number; wins: number; losses: number }] | null;
  averageRR: number;
  currentStreak: { count: number; type: 'win' | 'loss' | 'none' };
  stats: TradeStats;
}

export default function TradingInsights({ bestPair, averageRR, currentStreak, stats }: TradingInsightsProps) {
  const insights = [
    {
      icon: Star,
      label: 'Best Pair',
      value: bestPair ? bestPair[0] : '—',
      sub: bestPair ? `+$${bestPair[1].profit.toFixed(2)} total` : 'No data',
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: TrendingUp,
      label: 'Average RR',
      value: averageRR ? `1:${averageRR.toFixed(2)}` : '—',
      sub: 'Risk to reward ratio',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Zap,
      label: 'Current Streak',
      value: currentStreak.count > 0 ? `${currentStreak.count} ${currentStreak.type === 'win' ? 'Wins' : 'Losses'}` : '—',
      sub: currentStreak.count > 0 ? `Current ${currentStreak.type}ning streak` : 'No trades yet',
      color: 'from-emerald-500 to-green-600',
    },
    {
      icon: Activity,
      label: 'Wins / Losses',
      value: `${stats.winningTrades}W / ${stats.losingTrades}L`,
      sub: stats.totalTrades > 0 ? `${((stats.winningTrades / stats.totalTrades) * 100).toFixed(0)}% win rate` : 'No trades',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="glass-panel rounded-[20px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
          <Award className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-body font-semibold text-[#0F172A]">Trading Insights</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {insights.map((item) => (
          <div key={item.label} className="glass-chip rounded-[12px] p-2.5">
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-1.5`}>
              <item.icon className="w-3 h-3 text-white" />
            </div>
            <p className="text-micro text-[#64748B] uppercase tracking-wider">{item.label}</p>
            <p className="text-body font-semibold text-[#0F172A] mt-0.5">{item.value}</p>
            <p className="text-micro text-[#64748B] mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
