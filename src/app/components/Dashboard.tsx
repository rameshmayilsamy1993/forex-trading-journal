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
      <div className="min-h-screen">
        <div className="max-w-[1600px] mx-auto p-4 lg:p-6 space-y-3">
          <div className="glass-panel rounded-[20px] p-3 animate-pulse">
            <div className="flex gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-1 space-y-2">
                  <div className="h-3 bg-[#F1F5F9] rounded w-16" />
                  <div className="h-5 bg-[#F1F5F9] rounded w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel rounded-[20px] p-5 animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-[#F1F5F9] rounded w-24" />
              <div className="h-10 bg-[#F1F5F9] rounded w-48" />
              <div className="h-20 bg-[#F1F5F9] rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
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
