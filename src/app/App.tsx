import { useState, useEffect, lazy, Suspense } from 'react';
import { Menu, User, LogOut } from 'lucide-react';
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
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-[#E5EAF2] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-2 -ml-2 hover:bg-[#F1F5F9] rounded-xl transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5 text-[#64748B]" />
              </button>
              <h1 className="text-lg font-semibold tracking-tight text-[#0F172A]">FX Journal</h1>
            </div>
            <div className="flex items-center gap-2">
              <LiveISTClock />
            </div>
          </div>
        </header>

        <header className="hidden lg:flex sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-xl border-b border-[#E5EAF2] items-center justify-end px-6 gap-3">
          <LiveISTClock />
          <div className="w-px h-8 bg-[#E5EAF2]" />
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-[#2563EB] to-[#4F46E5] rounded-lg flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#0F172A]">{currentUser.name}</span>
                  {currentUser.role === 'admin' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#2563EB]/10 text-[#2563EB] rounded font-medium w-fit">Admin</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded-xl transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
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
