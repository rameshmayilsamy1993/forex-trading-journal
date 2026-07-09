import { useState, useEffect, useMemo } from 'react';
import {
  Building2, Wallet, BookOpen, Activity,
  DollarSign, Target, Award, Clock,
  TrendingUp, TrendingDown,
  BarChart3, CheckCircle, AlertTriangle, Zap, Star
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Trade, TradingAccount, PropFirm } from '../types/trading';
import apiService from '../services/apiService';
import { calculateTradeStats, calculateRiskReward } from '../utils/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

const getRealPL = (t: Trade): number =>
  (t as any).realPL ?? ((t.profit || 0) + (t.commission || 0) + ((t as any).swap || 0));

const getTradeAccountId = (trade: Trade): string => {
  if (typeof trade.accountId === 'object' && trade.accountId !== null)
    return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
  return String(trade.accountId || '');
};

const getTradeFirmId = (trade: Trade): string => {
  if (typeof trade.propFirmId === 'object' && trade.propFirmId !== null)
    return (trade.propFirmId as PropFirm).id || '';
  return String(trade.propFirmId || '');
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

function formatMoney(value: number, showPlus = false): string {
  const prefix = showPlus && value > 0 ? '+$' : value < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Challenge',
  PASSED_1: 'Phase 1',
  PASSED_2: 'Phase 2',
  FUNDED: 'Funded',
  BREACHED: 'Breached',
  DISABLED: 'Disabled',
};

function MiniSparkline({ data, color, width = 80, height = 24 }: { data: { balance: number }[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const values = data.map(d => d.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible" aria-label="Equity sparkline">
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M${points} L${width},${height} L0,${height} Z`} fill={`url(#spark-fill-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccountSparkline({ trades, initialBalance, width = 60, height = 24 }: { trades: Trade[]; initialBalance: number; width?: number; height?: number }) {
  const data = useMemo(() => {
    const closed = [...trades].filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    let balance = initialBalance;
    const points = closed.map(t => {
      balance += getRealPL(t);
      return { balance };
    });
    if (points.length < 2) return [{ balance: initialBalance }, { balance: initialBalance + 0.01 }];
    return [{ balance: initialBalance }, ...points];
  }, [trades, initialBalance]);
  return <MiniSparkline data={data} color="#10B981" width={width} height={height} />;
}

function HealthBadge({ status }: { status: 'Healthy' | 'Warning' | 'Risk' }) {
  const config = {
    Healthy: { variant: 'success' as const, icon: CheckCircle },
    Warning: { variant: 'warning' as const, icon: AlertTriangle },
    Risk: { variant: 'destructive' as const, icon: AlertTriangle },
  };
  const { variant, icon: Icon } = config[status];
  return (
    <Badge variant={variant} className="gap-1 px-1.5 py-0.5 dense-text-micro">
      <Icon className="w-2.5 h-2.5" />
      {status}
    </Badge>
  );
}

function TrendBadge({ value, positive }: { value: string; positive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 dense-text-caption font-semibold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {positive ? '+' : ''}{value}
    </span>
  );
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  color: string;
}

function KpiCard({ icon: Icon, label, value, trend, color }: KpiCardProps) {
  return (
    <div className="rounded-[14px] border border-white/70 bg-white/85 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(15,23,42,0.09)]">
      <div className="flex flex-col gap-1.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <div>
          <p className="dense-text-caption text-slate-500">{label}</p>
          <p className="mt-0.5 dense-text-title text-slate-900 tabular-nums">{value}</p>
        </div>
        {trend && <TrendBadge value={trend.value} positive={trend.positive} />}
      </div>
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[14px] border border-white/70 bg-white/88 p-3 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm shadow-violet-500/20">
          <Icon className="h-3 w-3 text-white" />
        </div>
        <div>
          <h3 className="dense-text-heading text-slate-900">{title}</h3>
          <p className="dense-text-caption text-slate-500">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
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
      const filters: { accountId?: string; firmId?: string } = {};
      if (selectedAccount !== 'all') filters.accountId = selectedAccount;
      if (selectedFirm !== 'all') filters.firmId = selectedFirm;
      const tradesData = await apiService.getTrades(Object.keys(filters).length > 0 ? filters : undefined);
      setTrades(tradesData);
    } catch (error) {
      console.error('Failed to load trades:', error);
    }
  };

  useEffect(() => { loadAccountsAndFirms(); }, []);
  useEffect(() => { loadTrades(); }, [selectedAccount, selectedFirm]);

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

  const getAccountHealth = (account: TradingAccount): 'Healthy' | 'Warning' | 'Risk' => {
    const accountTrades = filteredTrades.filter(t => getTradeAccountId(t) === account.id && t.status === 'CLOSED');
    const pl = accountTrades.reduce((sum, t) => sum + getRealPL(t), 0);
    const dd = pl < 0 ? Math.abs(pl) / account.initialBalance * 100 : 0;
    if (dd > 10) return 'Risk';
    if (dd > 5) return 'Warning';
    return 'Healthy';
  };

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

  const equityColor = netPL >= 0 ? '#10B981' : '#EF4444';
  const activeAccountCount = filteredAccounts.length;
  const winRate = stats.totalTrades > 0 ? stats.winRate : 0;
  const winLossLabel = `${stats.winningTrades}W / ${stats.losingTrades}L`;
  const topRightSummary = [
    { label: 'Active Accounts', value: activeAccountCount, tone: 'text-slate-900' },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, tone: 'text-slate-900' },
    { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), tone: 'text-slate-900' },
    { label: 'Total Trades', value: stats.totalTrades, tone: 'text-slate-900' },
  ];

  if (isLoading) {
    return (
      <div className="dense max-w-[1600px] mx-auto space-y-4 p-4">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="relative w-8 h-8 mx-auto mb-3">
              <div className="absolute inset-0 border-3 border-slate-200 rounded-full" />
              <div className="absolute inset-0 border-3 border-transparent border-t-violet-500 rounded-full animate-spin" />
            </div>
            <p className="dense-text-body text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dense mx-auto max-w-[1600px] space-y-2">
      <div className="flex flex-col gap-2 rounded-[16px] border border-slate-200/70 bg-white/75 p-3 shadow-[0_12px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 shadow-md shadow-slate-900/10">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="dense-text-title text-slate-900">Dashboard</h1>
            <p className="dense-text-body text-slate-500">Overview of your trading performance</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {topRightSummary.map((item) => (
            <div key={item.label} className="rounded-[14px] border border-slate-200/70 bg-white px-3 py-2 shadow-sm">
              <p className="dense-text-caption text-slate-500">{item.label}</p>
              <p className={`mt-0.5 dense-text-heading tabular-nums ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
          <Panel className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="dense-text-body text-white/75">Portfolio Value</p>
                  <p className="mt-1 text-[32px] font-bold tabular-nums leading-none">
                    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1.5 dense-text-body text-white/80">Net P/L</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 dense-text-body font-semibold ${netPL >= 0 ? 'bg-emerald-400/20 text-emerald-100' : 'bg-rose-400/20 text-rose-100'}`}>
                      {netPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatMoney(netPL, true)} ({netPct >= 0 ? '+' : ''}{netPct.toFixed(2)}%)
                    </span>
                    <span className="rounded-full bg-white/12 px-2 py-0.5 dense-text-body text-white/80">
                      {stats.totalTrades} trades
                    </span>
                  </div>
                </div>
                <div className="min-w-[120px]">
                  <Select value={selectedAccount || 'all'} onValueChange={(v) => setSelectedAccount(v)}>
                    <SelectTrigger className="h-7 w-full rounded-full border-white/20 bg-white/10 px-3 dense-text-body text-white shadow-none backdrop-blur-md [&>svg]:text-white/80 [&>svg]:h-3 [&>svg]:w-3">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {filteredAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 rounded-xl bg-white/10 p-2 backdrop-blur-sm">
                    {equityCurve.length >= 2 ? (
                      <MiniSparkline data={equityCurve} color="#FFFFFF" width={140} height={36} />
                    ) : (
                      <div className="dense-text-body text-white/70">Not enough data</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

        <div className="grid grid-cols-2 gap-2">
          <KpiCard icon={Wallet} label="Active Accounts" value={activeAccountCount} color="bg-gradient-to-br from-blue-500 to-cyan-500" />
          <KpiCard icon={Activity} label="Win Rate" value={`${winRate.toFixed(1)}%`} color="bg-gradient-to-br from-emerald-500 to-green-600" trend={{ value: winLossLabel, positive: winRate >= 50 }} />
          <KpiCard icon={Target} label="Profit Factor" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} color="bg-gradient-to-br from-violet-500 to-fuchsia-600" trend={{ value: stats.profitFactor >= 1 ? 'Positive' : 'Below 1.0', positive: stats.profitFactor >= 1.5 }} />
          <KpiCard icon={BookOpen} label="Total Trades" value={stats.totalTrades} color="bg-gradient-to-br from-amber-500 to-orange-600" trend={{ value: `${openTrades.length} open`, positive: true }} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Building2} label="Prop Firms" value={selectedFirm === 'all' ? firms.length : 1} color="bg-gradient-to-br from-sky-500 to-blue-600" />
        <KpiCard icon={DollarSign} label="Net Profit" value={formatMoney(stats.netProfit, true)} color={stats.netProfit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-rose-500 to-red-600'} trend={{ value: `${Math.abs(netPct).toFixed(1)}%`, positive: stats.netProfit >= 0 }} />
        <KpiCard icon={TrendingUp} label="Largest Win" value={`$${stats.largestWin.toFixed(2)}`} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <KpiCard icon={TrendingDown} label="Largest Loss" value={`-$${Math.abs(stats.largestLoss).toFixed(2)}`} color="bg-gradient-to-br from-orange-500 to-red-600" />
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.25fr_1fr]">
        <Panel>
          <SectionHeader
            icon={TrendingUp}
            title="Equity Curve"
            subtitle="Portfolio growth over time"
            action={(
              <Select defaultValue="month">
                <SelectTrigger className="h-7 w-[100px] rounded-full border-slate-200 bg-white dense-text-caption">
                  <SelectValue placeholder="This Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <div className="h-[160px]">
            {equityCurve.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurve} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
                  <RechartsTooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(15,23,42,0.08)' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']} />
                  <Area type="monotone" dataKey="balance" stroke="#8B5CF6" strokeWidth={2} fill="url(#equityGradient)" dot={false} activeDot={{ r: 3, fill: '#8B5CF6', stroke: 'white', strokeWidth: 1.5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center dense-text-body text-slate-400">Not enough data for equity curve</div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-slate-50/80 p-2">
            <div>
              <p className="dense-text-caption text-slate-500">Highest</p>
              <p className="mt-0.5 dense-text-body font-semibold text-emerald-600 tabular-nums">${getEquityStats.highest.toFixed(2)}</p>
            </div>
            <div>
              <p className="dense-text-caption text-slate-500">Lowest</p>
              <p className="mt-0.5 dense-text-body font-semibold text-rose-500 tabular-nums">${getEquityStats.lowest.toFixed(2)}</p>
            </div>
            <div>
              <p className="dense-text-caption text-slate-500">Start</p>
              <p className="mt-0.5 dense-text-body font-semibold text-slate-700 tabular-nums">${getEquityStats.start.toFixed(2)}</p>
            </div>
            <div>
              <p className="dense-text-caption text-slate-500">Current</p>
              <p className="mt-0.5 dense-text-body font-semibold text-violet-600 tabular-nums">${getEquityStats.current.toFixed(2)}</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            icon={BarChart3}
            title="Account Performance Comparison"
            subtitle="P/L by account"
            action={(
              <Select value={selectedFirm || 'all'} onValueChange={(v) => { setSelectedFirm(v); setSelectedAccount('all'); }}>
                <SelectTrigger className="h-7 w-[100px] rounded-full border-slate-200 bg-white dense-text-caption">
                  <SelectValue placeholder="All Firms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Firms</SelectItem>
                  {firms.map((firm) => (
                    <SelectItem key={getPropFirmId(firm)} value={getPropFirmId(firm)}>{firm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <div className="h-[160px]">
            {accountPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accountPerformance} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
                  <RechartsTooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(15,23,42,0.08)' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'P/L']} />
                  <Bar dataKey="pl" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {accountPerformance.map((entry, index) => (
                      <Cell key={index} fill={entry.pl >= 0 ? '#16A34A' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center dense-text-body text-slate-400">No account data available</div>
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          icon={Wallet}
          title="Accounts Overview"
          subtitle={`${filteredAccounts.length} accounts`}
          action={(
            <span className="rounded-full bg-violet-50 px-2 py-0.5 dense-text-caption text-violet-700">
              View all accounts
            </span>
          )}
        />

        {filteredAccounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="dense-text-body font-medium text-slate-600">No accounts match the selected filters</p>
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-3">
            {filteredAccounts.map((account) => {
              const accountTrades = filteredTrades.filter(t => getTradeAccountId(t) === account.id && t.status === 'CLOSED');
              const pl = accountTrades.reduce((sum, t) => sum + getRealPL(t), 0);
              const currentBalance = account.initialBalance + pl;
              const plPercent = account.initialBalance > 0 ? (pl / account.initialBalance) * 100 : 0;
              const dd = pl < 0 ? Math.abs(pl) / account.initialBalance * 100 : 0;
              const health = getAccountHealth(account);
              const healthBorder = health === 'Healthy' ? 'border-emerald-100' : health === 'Warning' ? 'border-amber-100' : 'border-red-100';
              const healthBg = health === 'Healthy' ? 'bg-emerald-50/30' : health === 'Warning' ? 'bg-amber-50/30' : 'bg-red-50/30';
              return (
                <div key={account.id} className={`rounded-[14px] border-l-4 p-3 shadow-[0_8px_26px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${healthBorder} ${healthBg} bg-white/90`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-violet-500 to-purple-600" />
                        <h4 className="dense-text-body font-semibold text-[#0F172A]">{account.name}</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={account.status === 'FUNDED' ? 'success' : account.status === 'BREACHED' ? 'destructive' : 'secondary'} className="dense-text-micro px-1.5 py-0.5">
                          {statusLabels[account.status] || account.status}
                        </Badge>
                        <HealthBadge status={health} />
                      </div>
                    </div>
                    <AccountSparkline trades={accountTrades} initialBalance={account.initialBalance} width={60} height={24} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-slate-100">
                    <div>
                      <p className="dense-text-table-header text-slate-500">Balance</p>
                      <p className="dense-text-body font-bold text-slate-800 tabular-nums">${currentBalance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="dense-text-table-header text-slate-500">P/L</p>
                      <p className={`dense-text-body font-bold tabular-nums ${pl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="dense-text-table-header text-slate-500">Profit %</p>
                      <p className={`dense-text-body font-bold tabular-nums ${plPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between dense-text-caption text-slate-400 mb-0.5">
                      <span>Drawdown Usage</span>
                      <span className="text-slate-600">{dd.toFixed(1)}%</span>
                    </div>
                    <Progress value={dd} className="h-1 bg-slate-100 rounded-full [&>div]:rounded-full [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-violet-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <div className="grid gap-2 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionHeader icon={Clock} title="Recent Activity" subtitle="Latest closed trades" />
          {recentTrades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="dense-text-body text-slate-500">No closed trades yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTrades.map((trade) => {
                const realPL = getRealPL(trade);
                const isWin = realPL >= 0;
                const entryTime = trade.entryTime
                  ? new Date(`2000-01-01T${trade.entryTime}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : new Date(trade.entryDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const tradeAccount = accounts.find((a) => a.id === getTradeAccountId(trade));
                const entryDate = new Date(trade.entryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                return (
                  <div key={trade.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${isWin ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-0.5 rounded-full ${isWin ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="dense-text-body font-semibold text-slate-900">{trade.pair}</p>
                          <span className={`rounded-full px-1.5 py-0.5 dense-text-micro ${trade.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{trade.type}</span>
                        </div>
                        <p className="dense-text-caption text-slate-500">{entryDate} · {entryTime} · {tradeAccount?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`dense-text-body font-semibold tabular-nums ${isWin ? 'text-emerald-600' : 'text-rose-600'}`}>{isWin ? '+' : ''}${realPL.toFixed(2)}</p>
                      <p className="dense-text-caption text-slate-500">{trade.lotSize} lot{trade.lotSize !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader icon={Award} title="Trading Insights" subtitle="Key performance highlights" />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-2">
              <p className="dense-text-caption uppercase text-slate-500">Best Pair</p>
              <p className="mt-1 dense-text-section text-slate-900">{bestPair ? bestPair[0] : '—'}</p>
              <p className="dense-text-caption text-slate-500">{bestPair ? `+$${bestPair[1].profit.toFixed(2)} total` : 'No data'}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-2">
              <p className="dense-text-caption uppercase text-slate-500">Average RR</p>
              <p className="mt-1 dense-text-section text-slate-900">{averageRR ? `1:${averageRR.toFixed(2)}` : '—'}</p>
              <p className="dense-text-caption text-slate-500">Risk to reward ratio</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-2">
              <p className="dense-text-caption uppercase text-slate-500">Current Streak</p>
              <p className="mt-1 dense-text-section text-slate-900">{currentStreak.count > 0 ? `${currentStreak.count} ${currentStreak.type === 'win' ? 'Wins' : 'Losses'}` : '—'}</p>
              <p className="dense-text-caption text-slate-500">{currentStreak.count > 0 ? `Current ${currentStreak.type}ning streak` : 'No trades yet'}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-2">
              <p className="dense-text-caption uppercase text-slate-500">Wins / Losses</p>
              <p className="mt-1 dense-text-section text-slate-900">{stats.winningTrades}W / {stats.losingTrades}L</p>
              <p className="dense-text-caption text-slate-500">{stats.totalTrades > 0 ? `${((stats.winningTrades / stats.totalTrades) * 100).toFixed(0)}% win rate` : 'No trades'}</p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionHeader icon={BarChart3} title="How To Read These Statistics" subtitle="Learn key concepts to better understand your performance" action={<span className="dense-text-caption text-violet-600">View Full Guide</span>} />
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-7">
          {[
            ['Smaller Body', 'Market is not very active'],
            ['Larger Body', 'Market is very active'],
            ['Long Upper Wick', 'Price was rejected above'],
            ['Long Lower Wick', 'Price was rejected below'],
            ['High Range', 'More volatility'],
            ['Low Range', 'Less volatility'],
            ['Higher 90% & 95%', 'Price can travel further'],
          ].map(([title, subtitle]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2">
              <p className="dense-text-body font-semibold text-slate-900">{title}</p>
              <p className="mt-0.5 dense-text-caption text-slate-500">{subtitle}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
