import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertCircle,
  BarChart3,
  DollarSign,
  Activity,
  Zap,
  Flame,
} from 'lucide-react';
import { Trade, TradingAccount, PropFirm } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PageHeader, StatCard, CardContainer, SectionCard } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { Badge } from './ui/badge';

export default function Reports() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedFirm, setSelectedFirm] = useState<string>('all');
  const [includeBreached, setIncludeBreached] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccountsAndFirms = async () => {
    setIsLoading(true);
    try {
      const [accountsData, firmsData] = await Promise.all([
        apiService.getAccounts(),
        apiService.getPropFirms(),
      ]);
      setAccounts(accountsData || []);
      setFirms(firmsData || []);
    } catch (error) {
      console.error('Failed to load accounts and firms:', error);
      setAccounts([]);
      setFirms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrades = async () => {
    try {
      const filters: { accountId?: string; firmId?: string; accountState?: string; includeBreached?: boolean } = {};
      if (selectedAccount !== 'all') filters.accountId = selectedAccount;
      if (selectedFirm !== 'all') filters.firmId = selectedFirm;
      if (includeBreached) filters.includeBreached = true;

      const tradesData = await apiService.getTrades(Object.keys(filters).length > 0 ? filters : undefined);
      setTrades(tradesData);
    } catch (error) {
      console.error('Failed to load trades:', error);
    }
  };

  useEffect(() => {
    loadAccountsAndFirms();
  }, []);

  useEffect(() => {
    loadTrades();
  }, [selectedAccount, selectedFirm, includeBreached]);

  const getAccountFirmId = (account: TradingAccount): string => {
    if (typeof account.propFirmId === 'object' && account.propFirmId !== null) {
      return (account.propFirmId as PropFirm).id || '';
    }
    return String(account.propFirmId || '');
  };

  const getTradeFirmId = (trade: Trade): string => {
    if (typeof trade.propFirmId === 'object' && trade.propFirmId !== null) {
      return (trade.propFirmId as PropFirm).id || '';
    }
    return String(trade.propFirmId || '');
  };

  const getTradeAccountId = (trade: Trade): string => {
    if (typeof trade.accountId === 'object' && trade.accountId !== null) {
      return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
    }
    return String(trade.accountId || '');
  };

  const getPropFirmId = (firm: PropFirm | string): string => {
    if (typeof firm === 'object' && firm !== null) {
      return firm.id || '';
    }
    return String(firm || '');
  };

  const getRealPL = (trade: Trade): number => {
    return (trade as any).realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs((trade as any).swap || 0));
  };

  const stats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const wins = closedTrades.filter(t => getRealPL(t) > 0);
    const losses = closedTrades.filter(t => getRealPL(t) < 0);

    const totalWin = wins.reduce((sum, t) => sum + getRealPL(t), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + getRealPL(t), 0));
    const netPL = totalWin - totalLoss;
    const profitFactor = totalLoss !== 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;
    const avgWin = wins.length ? totalWin / wins.length : 0;

    return {
      totalTrades: closedTrades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
      totalProfit: totalWin,
      totalLoss: totalLoss,
      netProfit: netPL,
      averageWin: avgWin,
      averageLoss: losses.length ? totalLoss / losses.length : 0,
      profitFactor,
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => getRealPL(t))) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => getRealPL(t))) : 0,
    };
  }, [trades]);

  const pairStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const pairs = new Map<string, { trades: number; profit: number; wins: number }>();

    closedTrades.forEach(trade => {
      const existing = pairs.get(trade.pair) || { trades: 0, profit: 0, wins: 0 };
      const realPL = getRealPL(trade);
      pairs.set(trade.pair, {
        trades: existing.trades + 1,
        profit: existing.profit + realPL,
        wins: existing.wins + (realPL > 0 ? 1 : 0),
      });
    });

    return Array.from(pairs.entries())
      .map(([pair, data]) => ({
        pair,
        ...data,
        winRate: (data.wins / data.trades) * 100,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [trades]);

  const monthlyStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.entryDate);
    const months = new Map<string, { profit: number; trades: number; wins: number }>();

    closedTrades.forEach(trade => {
      try {
        const date = new Date(trade.entryDate);
        if (isNaN(date.getTime())) return;
        const month = date.toISOString().slice(0, 7);
        const existing = months.get(month) || { profit: 0, trades: 0, wins: 0 };
        const realPL = getRealPL(trade);
        months.set(month, {
          profit: existing.profit + realPL,
          trades: existing.trades + 1,
          wins: existing.wins + (realPL > 0 ? 1 : 0),
        });
      } catch (e) {
        return;
      }
    });

    return Array.from(months.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        winRate: (data.wins / data.trades) * 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [trades]);

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return 'text-[#16A34A]';
    if (rate >= 40) return 'text-[#EA580C]';
    return 'text-[#DC2626]';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Performance Reports" subtitle="Analyze your trading performance" icon={BarChart3} color="purple" />

      {/* Filters */}
      <CardContainer className="!p-0">
        <div className="px-5 py-4 border-b border-[#E5EAF2] bg-gradient-to-r from-purple-50/50 to-pink-50/50">
          <div className="flex gap-3">
            <Select value={selectedFirm} onValueChange={(value: string) => setSelectedFirm(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Prop Firms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prop Firms</SelectItem>
                {firms.map(firm => (
                  <SelectItem key={getPropFirmId(firm)} value={getPropFirmId(firm)}>
                    {firm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAccount || 'all'} onValueChange={(value: string) => setSelectedAccount(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts
                  .filter(acc => selectedFirm === 'all' || getAccountFirmId(acc) === selectedFirm)
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[#64748B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBreached}
                  onChange={e => setIncludeBreached(e.target.checked)}
                  className="rounded border-[#E5EAF2] text-[#2563EB] focus:ring-[#2563EB]/30"
                />
                Include Breached Accounts
              </label>
              <Badge variant={includeBreached ? 'warning' : 'success'}>
                {includeBreached ? 'Including Breached' : 'Active Only'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContainer>

      {/* Executive Summary - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Trades" value={stats.totalTrades} icon={Target} color="blue" />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={Award}
          color="purple"
          trend={{ value: `${stats.winningTrades}W / ${stats.losingTrades}L`, positive: stats.winRate >= 50 }}
        />
        <StatCard label="Total Profit" value={`$${stats.totalProfit.toFixed(2)}`} icon={TrendingUp} color="green" />
        <StatCard
          label="Net P/L"
          value={`$${stats.netProfit.toFixed(2)}`}
          icon={stats.netProfit >= 0 ? TrendingUp : TrendingDown}
          color={stats.netProfit >= 0 ? 'green' : 'red'}
          trend={{
            value: `PF: ${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}`,
            positive: stats.netProfit >= 0,
          }}
        />
        <StatCard label="Avg Win" value={`$${stats.averageWin.toFixed(2)}`} icon={AlertCircle} color="orange" />
      </div>

      {/* Detailed Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Breakdown */}
        <SectionCard title="Net Performance" icon={TrendingUp} color="purple">
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-[#16A34A]/5 rounded-xl border border-[#16A34A]/10">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#16A34A]" />
                <span className="text-sm text-[#0F172A]">Total Win</span>
              </div>
              <span className="font-bold text-[#16A34A]">${stats.totalProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#DC2626]/5 rounded-xl border border-[#DC2626]/10">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#DC2626]" />
                <span className="text-sm text-[#0F172A]">Total Loss</span>
              </div>
              <span className="font-bold text-[#DC2626]">-${stats.totalLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#2563EB]/5 rounded-xl border-2 border-[#2563EB]/20">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#2563EB]" />
                <span className="text-sm font-semibold text-[#0F172A]">Net P/L</span>
              </div>
              <span className={`font-bold text-lg ${stats.netProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#7C3AED]/5 rounded-xl border border-[#7C3AED]/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-sm text-[#0F172A]">Largest Win</span>
              </div>
              <span className="font-bold text-[#7C3AED]">${stats.largestWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#EA580C]/5 rounded-xl border border-[#EA580C]/10">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#EA580C]" />
                <span className="text-sm text-[#0F172A]">Largest Loss</span>
              </div>
              <span className="font-bold text-[#EA580C]">${Math.abs(stats.largestLoss).toFixed(2)}</span>
            </div>
          </div>
        </SectionCard>

        {/* Best Performing Pairs */}
        <SectionCard title="Top Pairs by Profit" icon={Target} color="green">
          <div className="space-y-2">
            {pairStats.length === 0 && (
              <p className="text-sm text-[#64748B] text-center py-8">No closed trades yet</p>
            )}
            {pairStats.slice(0, 6).map(pair => (
              <div
                key={pair.pair}
                className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl hover:bg-[#F1F5F9] transition-colors border border-[#E5EAF2]/50"
              >
                <div className="flex-1">
                  <p className="font-semibold text-[#0F172A]">{pair.pair}</p>
                  <p className="text-xs text-[#64748B]">
                    {pair.trades} trades • {pair.winRate.toFixed(1)}% win rate
                  </p>
                </div>
                <span className={`font-bold ${pair.profit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {pair.profit >= 0 ? '+' : ''}${pair.profit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Monthly Performance */}
      <SectionCard title="Monthly Performance" icon={BarChart3} color="indigo">
        <div className="overflow-x-auto">
          {monthlyStats.length === 0 ? (
            <p className="text-sm text-[#64748B] text-center py-8">No closed trades yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5EAF2] bg-[#F8FAFC]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    Month
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    Wins
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    Profit/Loss
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map(month => {
                  const monthDate = (() => {
                    try {
                      const d = new Date(month.month + '-01T00:00:00');
                      return isNaN(d.getTime())
                        ? null
                        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                    } catch {
                      return month.month;
                    }
                  })();
                  return (
                    <tr key={month.month} className="border-b border-[#E5EAF2]/60 hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 text-sm text-[#0F172A] font-medium">
                        {monthDate || month.month}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-[#0F172A]">{month.trades}</td>
                      <td className="py-3 px-4 text-sm text-right text-[#0F172A]">{month.wins}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className={`font-semibold ${getWinRateColor(month.winRate)}`}>
                          {month.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className={`font-bold ${month.profit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          {month.profit >= 0 ? '+' : ''}${month.profit.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
