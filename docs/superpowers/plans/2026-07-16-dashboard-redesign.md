# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full glassmorphism redesign of the Dashboard page — dark navy base, glass panels, terminal-inspired dense layout.

**Architecture:** Decompose the 712-line monolithic `Dashboard.tsx` into 7 focused sub-components under `src/app/components/Dashboard/` plus a data hook. The existing lazy import in `App.tsx` (`import('./components/Dashboard')`) resolves via a barrel `index.ts`. Glass utility classes added to `theme.css`.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Recharts, Lucide React

**Design Spec:** `docs/superpowers/specs/2026-07-16-dashboard-redesign.md`

## Global Constraints

- No new API endpoints or data model changes
- No changes to App.tsx (lazy import path stays `'./components/Dashboard'`)
- Use existing design system colors (`#7C3AED`, `#16A34A`, `#DC2626`, etc.)
- Use existing typography utilities (`text-micro`, `text-body`, `text-display-xl`, etc.)
- All new components use TypeScript with explicit prop interfaces
- Helper functions `formatMoney`, `getRealPL`, `calculateTradeStats` already exist in `src/app/utils/calculations.ts`

---

## File Map

**New files:**
- `src/styles/theme.css` — modify (add glass utility classes)
- `src/app/components/Dashboard/useDashboardData.ts` — data hook
- `src/app/components/Dashboard/LiveStatsBar.tsx`
- `src/app/components/Dashboard/PortfolioHero.tsx`
- `src/app/components/Dashboard/AccountOverviewCards.tsx`
- `src/app/components/Dashboard/EquityCurveChart.tsx`
- `src/app/components/Dashboard/AccountPerformanceChart.tsx`
- `src/app/components/Dashboard/RecentActivity.tsx`
- `src/app/components/Dashboard/TradingInsights.tsx`
- `src/app/components/Dashboard/MiniSparkline.tsx` — extracted from current file
**Modified files:**
- `src/app/components/Dashboard.tsx` — replaced entirely with new orchestrator (imports from `./Dashboard/*`)

---

### Task 1: Add glass utility classes to theme.css

**Files:**
- Modify: `src/styles/theme.css` — add after existing `@layer components` block

- [ ] **Step 1: Add glass utility classes**

Add after line 600 (end of file, before `@keyframes`):

```css
/* ─── Glassmorphism Utilities ─── */
@utility glass-panel {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

@utility glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

@utility glass-chip {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

- [ ] **Step 2: Verify no CSS syntax errors**

Run: `pnpm build` (in project root)
Expected: no errors

---

### Task 2: Create MiniSparkline shared component

**Files:**
- Create: `src/app/components/Dashboard/MiniSparkline.tsx`

Extracted from the current Dashboard.tsx — reusable SVG sparkline used in PortfolioHero and AccountOverviewCards.

- [ ] **Step 1: Create MiniSparkline.tsx**

```typescript
interface MiniSparklineProps {
  data: { balance: number }[];
  color?: string;
  width?: number;
  height?: number;
}

export default function MiniSparkline({ data, color = '#7C3AED', width = 80, height = 24 }: MiniSparklineProps) {
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
  const id = color.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={width} height={height} className="overflow-visible" aria-label="Equity sparkline">
      <defs>
        <linearGradient id={`spark-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M${points} L${width},${height} L0,${height} Z`} fill={`url(#spark-fill-${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

---

### Task 3: Create useDashboardData hook

**Files:**
- Create: `src/app/components/Dashboard/useDashboardData.ts`

- [ ] **Step 1: Create the hook**

This hook encapsulates ALL data fetching, filtering, and memoized computations from the current Dashboard.tsx. It returns everything the sub-components need.

```typescript
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
```

---

### Task 4: Create LiveStatsBar component

**Files:**
- Create: `src/app/components/Dashboard/LiveStatsBar.tsx`

- [ ] **Step 1: Create LiveStatsBar.tsx**

```typescript
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
              <div className="h-3 bg-white/[0.06] rounded w-16" />
              <div className="h-5 bg-white/[0.06] rounded w-20" />
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
                  <div className="mt-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] rounded-full transition-all duration-500" style={{ width: `${m.bar}%` }} />
                  </div>
                )}
              </div>
              {i < metrics.length - 1 && <div className="w-px h-8 bg-white/[0.06] shrink-0" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 5: Create PortfolioHero component

**Files:**
- Create: `src/app/components/Dashboard/PortfolioHero.tsx`

- [ ] **Step 1: Create PortfolioHero.tsx**

```typescript
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
          <div className="h-4 bg-white/[0.06] rounded w-24" />
          <div className="h-10 bg-white/[0.06] rounded w-48" />
          <div className="h-20 bg-white/[0.06] rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[20px] p-5 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#7C3AED]/10 blur-3xl" />
      <div className="absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-[#7C3AED]/10 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-body-sm text-white/60">Portfolio Value</p>
            <p className="mt-1 text-display-xl text-white tabular-nums">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-sm font-semibold ${isPositive ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatMoney(netPL, true)} ({netPct >= 0 ? '+' : ''}{netPct.toFixed(2)}%)
              </span>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-body-sm text-white/60">
                {stats.totalTrades} trades
              </span>
            </div>
          </div>
          <div className="min-w-[140px]">
            <Select value={selectedAccount} onValueChange={onAccountChange}>
              <SelectTrigger className="h-8 w-full rounded-full bg-white/[0.08] border-white/15 px-3 text-body-sm text-white/80 shadow-none">
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
              <div className="mt-2 rounded-xl bg-white/[0.06] p-2">
                <MiniSparkline data={equityCurve} color="#FFFFFF" width={160} height={32} />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {[
            { label: 'Net P/L', value: formatMoney(stats.netProfit, true), color: stats.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300' },
            { label: 'Trades', value: stats.totalTrades },
            { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%` },
            { label: 'Avg RR', value: '—' },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-3">
              <div>
                <p className="text-micro text-white/50">{item.label}</p>
                <p className={`text-body font-semibold text-white/90 tabular-nums ${item.color || ''}`}>{item.value}</p>
              </div>
              {i < 3 && <div className="w-px h-8 bg-white/[0.06]" />}
            </div>
          ))}
        </div>

        {equityCurve.length >= 2 && (
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-white/[0.04] p-3">
            <div>
              <p className="text-micro text-white/50">Highest</p>
              <p className="text-body-sm font-semibold text-emerald-400 tabular-nums">${getEquityStats.highest.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-micro text-white/50">Lowest</p>
              <p className="text-body-sm font-semibold text-rose-400 tabular-nums">${getEquityStats.lowest.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-micro text-white/50">Start</p>
              <p className="text-body-sm font-semibold text-white/70 tabular-nums">${getEquityStats.start.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-micro text-white/50">Current</p>
              <p className="text-body-sm font-semibold text-[#7C3AED] tabular-nums">${getEquityStats.current.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Task 6: Create AccountOverviewCards component

**Files:**
- Create: `src/app/components/Dashboard/AccountOverviewCards.tsx`

- [ ] **Step 1: Create AccountOverviewCards.tsx**

```typescript
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
```

---

### Task 7: Create EquityCurveChart component

**Files:**
- Create: `src/app/components/Dashboard/EquityCurveChart.tsx`

- [ ] **Step 1: Create EquityCurveChart.tsx**

```typescript
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface EquityCurveChartProps {
  equityCurve: { date: string; balance: number }[];
  getEquityStats: { highest: number; lowest: number; start: number; current: number };
}

export default function EquityCurveChart({ equityCurve, getEquityStats }: EquityCurveChartProps) {
  return (
    <div className="glass-panel rounded-[20px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
          <TrendingUp className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-body font-semibold text-white/90">Equity Curve</h3>
        <p className="text-micro text-white/40 ml-1">Portfolio growth over time</p>
      </div>

      <div className="h-[160px]">
        {equityCurve.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurve} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGlassGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <RechartsTooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']}
              />
              <Area type="monotone" dataKey="balance" stroke="#7C3AED" strokeWidth={2} fill="url(#equityGlassGradient)" dot={false} activeDot={{ r: 3, fill: '#7C3AED', stroke: 'rgba(255,255,255,0.8)', strokeWidth: 1.5 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-body-sm text-white/40">Not enough data for equity curve</div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-2">
        {[
          { label: 'Highest', value: getEquityStats.highest, color: 'text-emerald-400' },
          { label: 'Lowest', value: getEquityStats.lowest, color: 'text-rose-400' },
          { label: 'Start', value: getEquityStats.start, color: 'text-white/70' },
          { label: 'Current', value: getEquityStats.current, color: 'text-[#7C3AED]' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-micro text-white/40">{stat.label}</p>
            <p className={`text-body-sm font-semibold tabular-nums ${stat.color}`}>${stat.value.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 8: Create AccountPerformanceChart component

**Files:**
- Create: `src/app/components/Dashboard/AccountPerformanceChart.tsx`

- [ ] **Step 1: Create AccountPerformanceChart.tsx**

```typescript
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface AccountPerformanceChartProps {
  accountPerformance: { name: string; pl: number }[];
}

export default function AccountPerformanceChart({ accountPerformance }: AccountPerformanceChartProps) {
  return (
    <div className="glass-panel rounded-[20px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
          <BarChart3 className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-body font-semibold text-white/90">Account Performance</h3>
        <p className="text-micro text-white/40 ml-1">P/L by account</p>
      </div>

      <div className="h-[160px]">
        {accountPerformance.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accountPerformance} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <RechartsTooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'P/L']}
              />
              <Bar dataKey="pl" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {accountPerformance.map((entry, index) => (
                  <Cell key={index} fill={entry.pl >= 0 ? '#16A34A' : '#DC2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-body-sm text-white/40">No account data available</div>
        )}
      </div>
    </div>
  );
}
```

---

### Task 9: Create RecentActivity component

**Files:**
- Create: `src/app/components/Dashboard/RecentActivity.tsx`

- [ ] **Step 1: Create RecentActivity.tsx**

```typescript
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
```

---

### Task 10: Create TradingInsights component

**Files:**
- Create: `src/app/components/Dashboard/TradingInsights.tsx`

- [ ] **Step 1: Create TradingInsights.tsx**

```typescript
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
        <h3 className="text-body font-semibold text-white/90">Trading Insights</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {insights.map((item) => (
          <div key={item.label} className="glass-chip rounded-[12px] p-2.5">
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-1.5`}>
              <item.icon className="w-3 h-3 text-white" />
            </div>
            <p className="text-micro text-white/40 uppercase tracking-wider">{item.label}</p>
            <p className="text-body font-semibold text-white/90 mt-0.5">{item.value}</p>
            <p className="text-micro text-white/40 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 11: Rewrite Dashboard.tsx orchestrator + create barrel export

**Files:**
- Modify: `src/app/components/Dashboard.tsx` (replace entirely)

- [ ] **Step 1: Replace Dashboard.tsx**

Replace the entire file with the orchestrator:

```typescript
import LiveStatsBar from './Dashboard/LiveStatsBar';
import PortfolioHero from './Dashboard/PortfolioHero';
import AccountOverviewCards from './Dashboard/AccountOverviewCards';
import EquityCurveChart from './Dashboard/EquityCurveChart';
import AccountPerformanceChart from './Dashboard/AccountPerformanceChart';
import RecentActivity from './Dashboard/RecentActivity';
import TradingInsights from './Dashboard/TradingInsights';
import useDashboardData from './Dashboard/useDashboardData';

export default function Dashboard() {
  const data = useDashboardData();
  const {
    isLoading, accounts, trades, firms, selectedFirm, setSelectedFirm,
    selectedAccount, setSelectedAccount, filteredAccounts, filteredTrades,
    stats, equityCurve, accountPerformance, currentStreak, averageRR,
    bestPair, getEquityStats, netPL, netPct, totalBalance, winRate,
    activeAccountCount, recentTrades, getPropFirmId,
  } = data;

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#0B1620' }}>
        <div className="max-w-[1600px] mx-auto p-4 lg:p-6 space-y-3">
          <div className="glass-panel rounded-[20px] p-3 animate-pulse">
            <div className="flex gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-1 space-y-2">
                  <div className="h-3 bg-white/[0.06] rounded w-16" />
                  <div className="h-5 bg-white/[0.06] rounded w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel rounded-[20px] p-5 animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-white/[0.06] rounded w-24" />
              <div className="h-10 bg-white/[0.06] rounded w-48" />
              <div className="h-20 bg-white/[0.06] rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0B1620' }}>
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6 space-y-3">
        <LiveStatsBar
          stats={stats}
          netPL={netPL}
          netPct={netPct}
          winRate={winRate}
          activeAccountCount={activeAccountCount}
          currentStreak={currentStreak}
          averageRR={averageRR}
          totalBalance={totalBalance}
          isLoading={isLoading}
        />

        <PortfolioHero
          totalBalance={totalBalance}
          netPL={netPL}
          netPct={netPct}
          stats={stats}
          equityCurve={equityCurve}
          getEquityStats={getEquityStats}
          selectedAccount={selectedAccount}
          onAccountChange={setSelectedAccount}
          filteredAccounts={filteredAccounts}
          isLoading={isLoading}
        />

        <AccountOverviewCards
          accounts={filteredAccounts}
          trades={filteredTrades}
          firms={firms}
          selectedFirm={selectedFirm}
          onFirmChange={(v) => { setSelectedFirm(v); setSelectedAccount('all'); }}
          getPropFirmId={getPropFirmId}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <EquityCurveChart equityCurve={equityCurve} getEquityStats={getEquityStats} />
          <AccountPerformanceChart accountPerformance={accountPerformance} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <RecentActivity trades={recentTrades} accounts={accounts} />
          <TradingInsights bestPair={bestPair} averageRR={averageRR} currentStreak={currentStreak} stats={stats} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors
