import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, Building2, Wallet, BarChart3, EyeOff, Calendar, Settings as SettingsIcon, User, FileUp, LogOut, Activity } from 'lucide-react';
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
import apiService, { User as UserType } from './services/apiService';
import { ErrorBoundary } from './components/ErrorBoundary';

type Tab = 'dashboard' | 'journal' | 'calendar' | 'missed' | 'missed-calendar' | 'firms' | 'accounts' | 'reports' | 'settings' | 'import';

const tabs = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'journal' as Tab, label: 'Trade Journal', icon: BookOpen },
  { id: 'import' as Tab, label: 'Import', icon: FileUp },
  { id: 'calendar' as Tab, label: 'Calendar', icon: Calendar },
  { id: 'missed' as Tab, label: 'Missed Trades', icon: EyeOff },
  { id: 'missed-calendar' as Tab, label: 'Missed Calendar', icon: Calendar },
  { id: 'firms' as Tab, label: 'Prop Firms', icon: Building2 },
  { id: 'accounts' as Tab, label: 'Accounts', icon: Wallet },
  { id: 'reports' as Tab, label: 'Reports', icon: BarChart3 },
  { id: 'settings' as Tab, label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setCurrentUser(apiService.auth.getStoredUser());
  }, []);

  const handleLogout = async () => {
    await apiService.auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className="size-full bg-slate-50 flex flex-col min-h-screen">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  FX Journal
                </h1>
                <p className="text-xs text-slate-500">Professional Trading Platform</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
                    {currentUser.role === 'admin' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">Admin</span>
                    )}
                  </div>
                </button>
                
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200/50 py-2 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
                        <p className="text-xs text-slate-500">{currentUser.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modern Navigation */}
      <nav className="bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-6 sticky top-[73px] z-30">
        <div className="flex gap-1 max-w-[1800px] mx-auto overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-4 py-3 border-b-2 transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1800px] mx-auto">
          <ErrorBoundary>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'journal' && <TradeJournal />}
            {activeTab === 'import' && <TradeImport />}
            {activeTab === 'calendar' && <TradingCalendar />}
            {activeTab === 'missed' && <MissedTradeJournal />}
            {activeTab === 'missed-calendar' && <MissedTradesCalendar />}
            {activeTab === 'firms' && <PropFirms />}
            {activeTab === 'accounts' && <Accounts />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'settings' && <Settings />}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
