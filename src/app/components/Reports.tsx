import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Award, AlertCircle, BarChart3 } from 'lucide-react';
import { Trade, TradingAccount, PropFirm, TradeStats } from '../types/trading';
import apiService from '../services/apiService';
import { calculateTradeStats } from '../utils/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PageHeader, StatCard, CardContainer, SectionCard } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';

export default function Reports() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedFirm, setSelectedFirm] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadAccountsAndFirms = async () => {
    setIsLoading(true);
    try {
      const [accountsData, firmsData] = await Promise.all([
        apiService.getAccounts(),
        apiService.getPropFirms()
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
      const filters: { accountId?: string; firmId?: string } = {};
      if (selectedAccount !== 'all') filters.accountId = selectedAccount;
      if (selectedFirm !== 'all') filters.firmId = selectedFirm;
      
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
  }, [selectedAccount, selectedFirm]);

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
    return (trade as any).realPL ?? ((trade.profit || 0) + (trade.commission || 0) + ((trade as any).swap || 0));
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Performance Reports"
        subtitle="Analyze your trading performance"
        icon={BarChart3}
        color="purple"
      />

      {/* Filters */}
      <CardContainer className="!p-0">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
          <div className="flex gap-3">
            <Select 
              value={selectedFirm} 
              onValueChange={(value: string) => setSelectedFirm(value)}
            >
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="All Prop Firms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prop Firms</SelectItem>
                {firms.map(firm => (
                  <SelectItem key={getPropFirmId(firm)} value={getPropFirmId(firm)}>{firm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedAccount || 'all'}
              onValueChange={(value: string) => setSelectedAccount(value)}
            >
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts
                  .filter(acc => selectedFirm === 'all' || getAccountFirmId(acc) === selectedFirm)
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContainer>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Trades"
          value={stats.totalTrades}
          icon={Target}
          color="blue"
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={Award}
          color="purple"
          trend={{ value: `${stats.winningTrades}W / ${stats.losingTrades}L`, positive: stats.winRate >= 50 }}
        />
        <StatCard
          label="Total Win"
          value={`$${stats.totalProfit.toFixed(2)}`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Net P/L"
          value={`$${stats.netProfit.toFixed(2)}`}
          icon={stats.netProfit >= 0 ? TrendingUp : TrendingDown}
          color={stats.netProfit >= 0 ? 'green' : 'red'}
          trend={{ value: `PF: ${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}`, positive: stats.netProfit >= 0 }}
        />
        <StatCard
          label="Avg Win"
          value={`$${stats.averageWin.toFixed(2)}`}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Breakdown */}
        <SectionCard
          title="Net Performance"
          icon={TrendingUp}
          color="purple"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-700">Total Win</span>
              <span className="font-bold text-green-600">${stats.totalProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-gray-700">Total Loss</span>
              <span className="font-bold text-red-600">-${stats.totalLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-gray-700">Net P/L</span>
              <span className={`font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-gray-700">Largest Win</span>
              <span className="font-bold text-purple-600">${stats.largestWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-gray-700">Largest Loss</span>
              <span className="font-bold text-orange-600">${stats.largestLoss.toFixed(2)}</span>
            </div>
          </div>
        </SectionCard>

        {/* Best Performing Pairs */}
        <SectionCard
          title="Top Pairs by Profit"
          icon={Target}
          color="green"
        >
          <div className="space-y-2">
            {pairStats.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No closed trades yet</p>
            )}
            {pairStats.slice(0, 5).map(pair => (
              <div key={pair.pair} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{pair.pair}</p>
                  <p className="text-xs text-gray-500">
                    {pair.trades} trades • {pair.winRate.toFixed(1)}% win rate
                  </p>
                </div>
                <span className={`font-bold ${pair.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {pair.profit >= 0 ? '+' : ''}${pair.profit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Monthly Performance */}
      <SectionCard
        title="Monthly Performance"
        icon={BarChart3}
        color="indigo"
      >
        <div className="overflow-x-auto">
          {monthlyStats.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No closed trades yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Trades</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Wins</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Win Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Profit/Loss</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map(month => {
                  const monthDate = (() => {
                    try {
                      const d = new Date(month.month + '-01T00:00:00');
                      return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                    } catch {
                      return month.month;
                    }
                  })();
                  return (
                  <tr key={month.month} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {monthDate || month.month}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">{month.trades}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">{month.wins}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`font-medium ${
                        month.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {month.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`font-bold ${
                        month.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
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
