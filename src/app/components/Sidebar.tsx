import { useState } from 'react';
import {
  LayoutDashboard, BookOpen, Building2, Wallet, BarChart3,
  EyeOff, Calendar, Settings as SettingsIcon, FileUp,
  Activity, FileSpreadsheet, ClipboardCheck, Settings2,
  ChevronLeft, ChevronRight, X, ActivitySquare, TrendingUp,
  TrendingDown, History, Layers, AlertTriangle, Bell, Calculator,
  DollarSign
} from 'lucide-react';
import { cn } from './ui/utils';
import apiService, { User as UserType } from '../services/apiService';

export type Tab = 'dashboard' | 'journal' | 'calendar' | 'missed' | 'missed-calendar' | 'firms' | 'accounts' | 'reports' | 'settings' | 'import' | 'convert' | 'checklist' | 'strategy-master' | 'bias' | 'bias-input' | 'bias-history' | 'liquidity-input' | 'liquidity-history' | 'crt-input' | 'crt-history' | 'breached-trades' | 'reminders' | 'xauusd-calculator' | 'forex-lot-calculator';

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Trading',
    items: [
      { id: 'journal', label: 'Trade Journal', icon: BookOpen },
      { id: 'import', label: 'Import', icon: FileUp },
      { id: 'convert', label: 'Convert CSV', icon: FileSpreadsheet },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
    ],
  },
  {
    title: 'Discipline',
    items: [
      { id: 'checklist', label: 'Pre-Trade Checklist', icon: ClipboardCheck },
      { id: 'bias-input', label: 'Bias Input (CISD)', icon: TrendingDown },
      { id: 'bias-history', label: 'Bias History', icon: History },
      { id: 'liquidity-input', label: 'Liquidity Input', icon: Layers },
      { id: 'liquidity-history', label: 'Liquidity History', icon: History },
      { id: 'crt-input', label: 'CRT Tracker', icon: Activity },
      { id: 'crt-history', label: 'CRT History', icon: History },
      { id: 'reminders', label: 'Reminders', icon: Bell },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { id: 'missed', label: 'Missed Trades', icon: EyeOff },
      { id: 'missed-calendar', label: 'Missed Calendar', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'breached-trades', label: 'Breached Trades', icon: AlertTriangle },
    ],
  },
  {
    title: 'Management',
    items: [
      { id: 'accounts', label: 'Accounts', icon: Wallet },
      { id: 'firms', label: 'Prop Firms', icon: Building2 },
      { id: 'strategy-master', label: 'Strategies', icon: Settings2 },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
  {
    title: 'TOOLS',
    items: [
      { id: 'xauusd-calculator', label: 'XAUUSD Lot Calculator', icon: Calculator },
      { id: 'forex-lot-calculator', label: 'Forex Lot Calculator', icon: DollarSign },
    ],
  },
];

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onCollapsedChange,
  currentUser,
  onLogout,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen z-50 transition-all duration-300 flex flex-col",
          "bg-[#0B1620] border-r border-white/[0.06] shadow-2xl shadow-slate-950/40",
          isCollapsed ? "w-[72px]" : "w-[260px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-white/[0.06] px-4",
            isCollapsed ? "justify-center" : "justify-between",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#2563EB] via-[#4F46E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg shadow-[#2563EB]/30 ring-1 ring-white/[0.1]">
              <Activity className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">FX Journal</h1>
                <p className="text-[10px] text-slate-500">Trading Platform</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={onMobileClose} className="lg:hidden p-2 hover:bg-white/[0.06] rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.title} className={cn(groupIndex > 0 && "mt-5")}>
              {!isCollapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.18em]">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        onMobileClose();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 relative",
                        isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                        isActive
                          ? "bg-gradient-to-r from-[#2563EB]/20 to-transparent text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-[#2563EB] before:rounded-r-full"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]",
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          "w-[18px] h-[18px] flex-shrink-0 transition-all duration-200",
                          isActive ? "text-[#2563EB]" : "text-slate-500 group-hover:text-white",
                        )}
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle (Desktop) */}
        <button
          onClick={() => onCollapsedChange(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#1E293B] border border-white/[0.08] rounded-full items-center justify-center shadow-lg shadow-slate-950/30 hover:bg-[#334155] transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-slate-400" />
          )}
        </button>
      </aside>
    </>
  );
}

export { navigationGroups };
