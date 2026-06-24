import { useState, useEffect } from 'react';
import { Menu, User, LogOut, Clock } from 'lucide-react';
import Sidebar, { Tab } from './components/Sidebar';
import LiveISTClock from './components/common/LiveISTClock';
import Dashboard from './components/Dashboard';
import TradeJournal from './components/TradeJournal';
import PropFirms from './components/PropFirms';
import Accounts from './components/Accounts';
import Reports from './components/Reports';
import Masters from './components/Masters';
import Settings from './components/Settings';
import MissedTradeJournal from './components/MissedTradeJournal';
import MissedTradesCalendar from './components/MissedTradesCalendar';
import TradingCalendar from './components/TradingCalendar';
import TradeImport from './components/TradeImport';
import ConvertCsv from './pages/ConvertCsv';
import ChecklistExecutionPage from './components/ChecklistExecutionPage';
import MasterStrategyPage from './components/MasterStrategyPage';
import BiasMapping from './components/BiasMapping';
import BiasInput from './components/BiasInput';
import BiasHistory from './components/BiasHistory';
import LiquidityInput from './components/LiquidityInput';
import LiquidityHistory from './components/LiquidityHistory';
import CRTInput from './components/CRTInput';
import CRTHistory from './components/CRTHistory';
import BreachedTrades from './components/BreachedTrades';
import XauusdCalculator from './components/XauusdCalculator';
import ForexLotCalculator from './components/ForexLotCalculator';
import apiService, { User as UserType } from './services/apiService';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(apiService.auth.getStoredUser());

    const handleNavigation = (e: CustomEvent) => {
      setActiveTab(e.detail as Tab);
    };
    window.addEventListener('navigate-to-tab', handleNavigation as EventListener);
    return () => window.removeEventListener('navigate-to-tab', handleNavigation as EventListener);
  }, []);

  const handleLogout = async () => {
    await apiService.auth.logout();
    window.location.href = '/login';
  };

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

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 min-h-screen ${
          isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        }`}
      >
        {/* Top Header (Mobile only) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-[#E5EAF2] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-2 -ml-2 hover:bg-[#F1F5F9] rounded-xl transition-colors"
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

        {/* Desktop Header Bar */}
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
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <div className="max-w-[1800px] mx-auto">
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
          </div>
        </main>
      </div>
    </div>
  );
}
