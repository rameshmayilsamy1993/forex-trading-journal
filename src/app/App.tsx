import { useState, useEffect } from 'react';
import { Menu, User, LogOut } from 'lucide-react';
import Sidebar, { Tab } from './components/Sidebar';
import LiveISTClock from './components/common/LiveISTClock';
import NotificationDropdown from './components/common/NotificationDropdown';
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
import Reminders from './components/Reminders';
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
    <div className="min-h-screen bg-slate-50">
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
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <h1 className="text-lg font-bold text-slate-900">FX Journal</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationDropdown onNavigateToReminders={() => setActiveTab('reminders')} />
              <LiveISTClock />
            </div>
          </div>
        </header>

        {/* Desktop Header Bar */}
        <header className="hidden lg:flex sticky top-0 z-20 h-14 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/60 items-center justify-end px-6 gap-4">
          <NotificationDropdown onNavigateToReminders={() => setActiveTab('reminders')} />
          <LiveISTClock />
          {currentUser && (
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200/60">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{currentUser.name}</span>
                {currentUser.role === 'admin' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium w-fit">Admin</span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
              {activeTab === 'reminders' && <Reminders />}
              {activeTab === 'settings' && <Settings />}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
