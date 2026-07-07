import { useState, useEffect, lazy, Suspense } from 'react';
import { Menu, User, LogOut, Bell, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import Sidebar, { Tab } from './components/Sidebar';
import LiveISTClock from './components/common/LiveISTClock';
import { useAuthContext } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/ui/Loading';
import { Toaster } from './components/ui/sonner';

const Dashboard = lazy(() => import('./components/Dashboard'));
const TradeJournal = lazy(() => import('./components/TradeJournal'));
const PropFirms = lazy(() => import('./components/PropFirms'));
const Accounts = lazy(() => import('./components/Accounts'));
const Reports = lazy(() => import('./components/Reports'));
const Masters = lazy(() => import('./components/Masters'));
const Settings = lazy(() => import('./components/Settings'));
const MissedTradeJournal = lazy(() => import('./components/MissedTradeJournal'));
const MissedTradesCalendar = lazy(() => import('./components/MissedTradesCalendar'));
const TradingCalendar = lazy(() => import('./components/TradingCalendar'));
const TradeImport = lazy(() => import('./components/TradeImport'));
const ConvertCsv = lazy(() => import('./pages/ConvertCsv'));
const ChecklistExecutionPage = lazy(() => import('./components/ChecklistExecutionPage'));
const MasterStrategyPage = lazy(() => import('./components/MasterStrategyPage'));
const BiasMapping = lazy(() => import('./components/BiasMapping'));
const BiasInput = lazy(() => import('./components/BiasInput'));
const BiasHistory = lazy(() => import('./components/BiasHistory'));
const LiquidityInput = lazy(() => import('./components/LiquidityInput'));
const LiquidityHistory = lazy(() => import('./components/LiquidityHistory'));
const CRTInput = lazy(() => import('./components/CRTInput'));
const CRTHistory = lazy(() => import('./components/CRTHistory'));
const BreachedTrades = lazy(() => import('./components/BreachedTrades'));
const XauusdCalculator = lazy(() => import('./components/XauusdCalculator'));
const ForexLotCalculator = lazy(() => import('./components/ForexLotCalculator'));
const MarketStatistics = lazy(() => import('./components/MarketStatistics'));
const MonthlyReviewList = lazy(() => import('./components/MonthlyMarketReview/MonthlyReviewList'));
const MonthlyReviewDetail = lazy(() => import('./components/MonthlyMarketReview/MonthlyReviewDetail'));
const MonthlyReviewForm = lazy(() => import('./components/MonthlyMarketReview/MonthlyReviewForm'));
const WeeklyReviewList = lazy(() => import('./components/WeeklyMarketReview/WeeklyReviewList'));
const WeeklyReviewDetail = lazy(() => import('./components/WeeklyMarketReview/WeeklyReviewDetail'));
const WeeklyReviewForm = lazy(() => import('./components/WeeklyMarketReview/WeeklyReviewForm'));
const DailyReviewList = lazy(() => import('./components/DailyMarketReview/DailyReviewList'));
const DailyReviewDetail = lazy(() => import('./components/DailyMarketReview/DailyReviewDetail'));
const DailyReviewForm = lazy(() => import('./components/DailyMarketReview/DailyReviewForm'));

function TabContent({ activeTab }: { activeTab: Tab }) {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <ErrorBoundary>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'journal' && <TradeJournal />}
        {activeTab === 'import' && <TradeImport />}
        {activeTab === 'convert' && <ConvertCsv />}
        {activeTab === 'checklist' && <ChecklistExecutionPage />}
        {activeTab === 'calendar' && <TradingCalendar />}
        {activeTab === 'missed' && <MissedTradeJournal />}
        {activeTab === 'missed-calendar' && <MissedTradesCalendar />}
        {activeTab === 'firms' && <PropFirms />}
        {activeTab === 'accounts' && <Accounts />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'strategy-master' && <MasterStrategyPage />}
        {activeTab === 'bias' && <BiasMapping />}
        {activeTab === 'bias-input' && <BiasInput />}
        {activeTab === 'bias-history' && <BiasHistory />}
        {activeTab === 'liquidity-input' && <LiquidityInput />}
        {activeTab === 'liquidity-history' && <LiquidityHistory />}
        {activeTab === 'crt-input' && <CRTInput />}
        {activeTab === 'crt-history' && <CRTHistory />}
        {activeTab === 'breached-trades' && <BreachedTrades />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'xauusd-calculator' && <XauusdCalculator />}
        {activeTab === 'forex-lot-calculator' && <ForexLotCalculator />}
        {activeTab === 'market-stats' && <MarketStatistics />}
        {activeTab === 'monthly-review' && <MonthlyReviewList />}
        {activeTab === 'monthly-review-detail' && <MonthlyReviewDetail />}
        {activeTab === 'monthly-review-form' && <MonthlyReviewForm />}
        {activeTab === 'weekly-review' && <WeeklyReviewList />}
        {activeTab === 'weekly-review-detail' && <WeeklyReviewDetail />}
        {activeTab === 'weekly-review-form' && <WeeklyReviewForm />}
        {activeTab === 'daily-review' && <DailyReviewList />}
        {activeTab === 'daily-review-detail' && <DailyReviewDetail />}
        {activeTab === 'daily-review-form' && <DailyReviewForm />}
      </ErrorBoundary>
    </Suspense>
  );
}

export default function App() {
  const { user: currentUser, logout: handleLogout } = useAuthContext();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleNavigation = (e: CustomEvent) => {
      setActiveTab(e.detail as Tab);
    };
    window.addEventListener('navigate-to-tab', handleNavigation as EventListener);
    return () => window.removeEventListener('navigate-to-tab', handleNavigation as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={isCollapsed}
        onCollapsedChange={setIsCollapsed}
        currentUser={currentUser}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      <div
        className={`transition-all duration-300 min-h-screen ${
          isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        }`}
      >
        <header className="lg:hidden sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-[#E5E7EB]/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-2 -ml-2 hover:bg-violet-50 rounded-xl transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <h1 className="text-card-title text-[#0F172A]">FX Journal</h1>
            </div>
            <div className="flex items-center gap-2">
              <LiveISTClock />
            </div>
          </div>
        </header>

        <header className="hidden lg:flex sticky top-0 z-20 h-16 bg-white/70 backdrop-blur-xl border-b border-[#E5E7EB]/60 items-center justify-end px-6 gap-3">
          <LiveISTClock />
          <div className="w-px h-6 bg-slate-200/60" />
          <button className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all duration-200 relative" title="Notifications">
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
          </button>
          <button className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all duration-200" title="Settings">
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-6 bg-slate-200/60" />
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] rounded-lg flex items-center justify-center shadow-sm shadow-violet-500/20 ring-2 ring-white/60">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-body font-semibold text-[#0F172A]">{currentUser.name}</span>
                  {currentUser.role === 'admin' && (
                    <span className="text-micro px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded w-fit mt-0.5">Admin</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-[#64748B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </header>

        <main className="p-4 lg:p-6">
          <div className="max-w-[1800px] mx-auto">
            <TabContent activeTab={activeTab} />
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
