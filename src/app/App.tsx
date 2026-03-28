import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, Building2, Wallet, BarChart3, EyeOff, Calendar, Settings as SettingsIcon, User } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TradeJournal from './components/TradeJournal';
import PropFirms from './components/PropFirms';
import Accounts from './components/Accounts';
import Reports from './components/Reports';
import Masters from './components/Masters';
import MissedTradeJournal from './components/MissedTradeJournal';
import TradingCalendar from './components/TradingCalendar';
import apiService, { User as UserType } from './services/apiService';

type Tab = 'dashboard' | 'journal' | 'calendar' | 'missed' | 'firms' | 'accounts' | 'reports' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  useEffect(() => {
    setCurrentUser(apiService.auth.getStoredUser());
  }, []);

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal' as Tab, label: 'Trade Journal', icon: BookOpen },
    { id: 'calendar' as Tab, label: 'Calendar', icon: Calendar },
    { id: 'missed' as Tab, label: 'Missed Trades', icon: EyeOff },
    { id: 'firms' as Tab, label: 'Prop Firms', icon: Building2 },
    { id: 'accounts' as Tab, label: 'Accounts', icon: Wallet },
    { id: 'reports' as Tab, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as Tab, label: 'Settings', icon: SettingsIcon },
  ];

  const handleLogout = async () => {
    await apiService.auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className="size-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forex Trading Journal</h1>
            <p className="text-sm text-gray-500">Track your trades, analyze performance</p>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{currentUser.name}</span>
                {currentUser.role === 'admin' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Admin
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'journal' && <TradeJournal />}
        {activeTab === 'calendar' && <TradingCalendar />}
        {activeTab === 'missed' && <MissedTradeJournal />}
        {activeTab === 'firms' && <PropFirms />}
        {activeTab === 'accounts' && <Accounts />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'settings' && <Masters />}
      </main>
    </div>
  );
}