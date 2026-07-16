import { useState, useEffect, useMemo } from 'react';
import { Trade, TradingAccount, PropFirm, TradeStats } from '../../types/trading';
import apiService from '../../services/apiService';
import { calculateTradeStats, calculateRiskReward } from '../../utils/calculations';

const getRealPL = (t: Trade): number =>
  (t as any).realPL ?? ((t.profit || 0) + (t.commission || 0) + ((t as any).swap || 0));

const statusLabels: Record<string, string> = {
  ACTIVE: 'Challenge',
  PASSED_1: 'Phase 1',
  PASSED_2: 'Phase 2',
  FUNDED: 'Funded',
  BREACHED: 'Breached',
  DISABLED: 'Disabled',
};

const getTradeAccountId = (trade: Trade): string => {
  if (typeof trade.accountId === 'object' && trade.accountId !== null)
    return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
  return String(trade.accountId || '');
};

const getAccountFirmId = (account: TradingAccount): string => {
  if (typeof account.propFirmId === 'object' && account.propFirmId !== null)
    return (account.propFirmId as PropFirm).id || '';
  return String(account.propFirmId || '');
};

const getPropFirmId = (firm: PropFirm | string): string => {
  if (typeof firm === 'object' && firm !== null) return firm.id || '';
  return String(firm || '');
};

export interface DashboardData {
  trades: Trade[];
  accounts: TradingAccount[];
  firms: PropFirm[];
  selectedAccount: string;
  selectedFirm: string;
  setSelectedAccount: (v: string) => void;
  setSelectedFirm: (v: string) => void;
  isLoading: boolean;
  filteredAccounts: TradingAccount[];
  filteredTrades: Trade[];
  stats: TradeStats;
  averageRR: number;
  openTrades: Trade[];
  recentTrades: Trade[];
  totalInitialBalance: number;
  totalBalance: number;
  equityCurve: { date: string; balance: number }[];
  accountPerformance: { name: string; pl: number }[];
  pairPerformance: Record<string, { profit: number; wins: number; losses: number }>;
  bestPair: [string, { profit: number; wins: number; losses: number }] | null;
  mostActivePair: [string, { profit: number; wins: number; losses: number }] | null;
  currentStreak: { count: number; type: 'win' | 'loss' | 'none' };
  getEquityStats: { highest: number; lowest: number; start: number; current: number };
  netPL: number;
  netPct: number;
  activeAccountCount: number;
  winRate: number;
  winLossLabel: string;
  statusLabels: Record<string, string>;
  getPropFirmId: (firm: PropFirm | string) => string;
}

export default function useDashboardData(): DashboardData {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedFirm, setSelectedFirm] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const filters: { accountId?: string; firmId?: string } = {};
        if (selectedAccount !== 'all') filters.accountId = selectedAccount;
        if (selectedFirm !== 'all') filters.firmId = selectedFirm;
        const tradesData = await apiService.getTrades(Object.keys(filters).length > 0 ? filters : undefined);
        setTrades(tradesData);
      } catch (error) {
        console.error('Failed to load trades:', error);
      }
    })();
  }, [selectedAccount, selectedFirm]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      if (selectedFirm !== 'all' && getAccountFirmId(account) !== selectedFirm) return false;
      if (selectedAccount !== 'all' && account.id !== selectedAccount) return false;
      if (account.status === 'BREACHED') return false;
      return true;
    });
  }, [accounts, selectedAccount, selectedFirm]);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const account = accounts.find(a => a.id === getTradeAccountId(trade));
      if (account?.status === 'BREACHED') return false;
      return true;
    });
  }, [trades, accounts]);

  const stats = useMemo(() => calculateTradeStats(filteredTrades), [filteredTrades]);

  const averageRR = useMemo(() => {
    const closed = filteredTrades.filter(t => t.status === 'CLOSED');
    const rrs = closed.map(t => calculateRiskReward(t)).filter((r): r is number => r !== undefined);
    return rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
  }, [filteredTrades]);

  const openTrades = useMemo(() => filteredTrades.filter(t => t.status === 'OPEN'), [filteredTrades]);

  const recentTrades = useMemo(
    () => filteredTrades.filter(t => t.status === 'CLOSED').sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).slice(0, 5),
    [filteredTrades],
  );

  const totalInitialBalance = useMemo(
    () => filteredAccounts.reduce((sum, acc) => sum + acc.initialBalance, 0),
    [filteredAccounts],
  );

  const totalBalance = useMemo(() => totalInitialBalance + stats.netProfit, [totalInitialBalance, stats.netProfit]);

  const equityCurve = useMemo(() => {
    const closed = [...filteredTrades].filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    let balance = totalInitialBalance;
    const points = closed.map(t => {
      balance += getRealPL(t);
      return { date: new Date(t.entryDate).toLocaleDateString('en-IN'), balance: Math.round(balance * 100) / 100 };
    });
    return [{ date: 'Start', balance: Math.round(totalInitialBalance * 100) / 100 }, ...points];
  }, [filteredTrades, totalInitialBalance]);

  const accountPerformance = useMemo(() => {
    return filteredAccounts.map(account => {
      const accountTrades = filteredTrades.filter(t => getTradeAccountId(t) === account.id && t.status === 'CLOSED');
      const pl = accountTrades.reduce((sum, t) => sum + getRealPL(t), 0);
      return { name: account.name, pl: Math.round(pl * 100) / 100 };
    });
  }, [filteredAccounts, filteredTrades]);

  const pairPerformance = useMemo(() => {
    const closed = filteredTrades.filter(t => t.status === 'CLOSED');
    const byPair: Record<string, { profit: number; wins: number; losses: number }> = {};
    closed.forEach(t => {
      const pl = getRealPL(t);
      if (!byPair[t.pair]) byPair[t.pair] = { profit: 0, wins: 0, losses: 0 };
      byPair[t.pair].profit += pl;
      if (pl > 0) byPair[t.pair].wins++;
      else if (pl < 0) byPair[t.pair].losses++;
    });
    return byPair;
  }, [filteredTrades]);

  const bestPair = useMemo(() => {
    const entries = Object.entries(pairPerformance).filter(([, v]) => v.wins > 0);
    if (entries.length === 0) return null;
    return entries.sort(([, a], [, b]) => b.profit - a.profit)[0];
  }, [pairPerformance]);

  const mostActivePair = useMemo(() => {
    const entries = Object.entries(pairPerformance);
    if (entries.length === 0) return null;
    return entries.sort(([, a], [, b]) => (a.wins + a.losses) - (b.wins + b.losses)).reverse()[0];
  }, [pairPerformance]);

  const currentStreak = useMemo(() => {
    const closed = [...filteredTrades].filter(t => t.status === 'CLOSED').sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    if (closed.length === 0) return { count: 0, type: 'none' as const };
    const firstPL = getRealPL(closed[0]);
    let count = 1;
    for (let i = 1; i < closed.length; i++) {
      const pl = getRealPL(closed[i]);
      if ((firstPL > 0 && pl > 0) || (firstPL < 0 && pl < 0)) count++;
      else break;
    }
    return { count, type: firstPL > 0 ? 'win' as const : 'loss' as const };
  }, [filteredTrades]);

  const getEquityStats = useMemo(() => {
    if (equityCurve.length < 2) return { highest: totalInitialBalance, lowest: totalInitialBalance, start: totalInitialBalance, current: totalInitialBalance };
    const balances = equityCurve.map(d => d.balance);
    return {
      highest: Math.max(...balances),
      lowest: Math.min(...balances),
      start: balances[0],
      current: balances[balances.length - 1],
    };
  }, [equityCurve, totalInitialBalance]);

  const netPL = totalBalance - totalInitialBalance;
  const netPct = totalInitialBalance > 0 ? (netPL / totalInitialBalance) * 100 : 0;
  const activeAccountCount = filteredAccounts.length;
  const winRate = stats.totalTrades > 0 ? stats.winRate : 0;
  const winLossLabel = `${stats.winningTrades}W / ${stats.losingTrades}L`;

  return {
    trades, accounts, firms,
    selectedAccount, selectedFirm,
    setSelectedAccount, setSelectedFirm,
    isLoading,
    filteredAccounts, filteredTrades,
    stats, averageRR, openTrades, recentTrades,
    totalInitialBalance, totalBalance,
    equityCurve, accountPerformance, pairPerformance,
    bestPair, mostActivePair, currentStreak,
    getEquityStats, netPL, netPct, activeAccountCount, winRate, winLossLabel,
    statusLabels,
    getPropFirmId,
  };
}
