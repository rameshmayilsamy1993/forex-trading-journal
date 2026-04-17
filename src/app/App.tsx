import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar, { Tab } from './components/Sidebar';
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
          </div>
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
              {activeTab === 'settings' && <Settings />}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
