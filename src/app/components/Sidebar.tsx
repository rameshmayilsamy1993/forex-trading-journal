import { useState } from 'react';
import { 
  LayoutDashboard, BookOpen, Building2, Wallet, BarChart3, 
  EyeOff, Calendar, Settings as SettingsIcon, User, FileUp, 
  LogOut, Activity, FileSpreadsheet, ClipboardCheck, Settings2,
  ChevronLeft, ChevronRight, X, ActivitySquare
} from 'lucide-react';
import { cn } from './ui/utils';
import apiService, { User as UserType } from '../services/apiService';

export type Tab = 'dashboard' | 'journal' | 'calendar' | 'missed' | 'missed-calendar' | 'firms' | 'accounts' | 'reports' | 'settings' | 'import' | 'convert' | 'checklist' | 'strategy-master';

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
    ],
  },
  {
    title: 'Analysis',
    items: [
      { id: 'missed', label: 'Missed Trades', icon: EyeOff },
      { id: 'missed-calendar', label: 'Missed Calendar', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-slate-200/60 z-50 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-[72px]" : "w-[260px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "h-16 flex items-center border-b border-slate-100 px-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-slate-900">FX Journal</h1>
                <p className="text-xs text-slate-500">Trading Platform</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={onMobileClose}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.title} className={cn(groupIndex > 0 && "mt-6")}>
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
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
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        isCollapsed && "justify-center px-2",
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive ? "text-blue-600" : "text-slate-500"
                      )} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-100 p-3">
          {currentUser ? (
            <div className={cn(
              "flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors",
              isCollapsed && "justify-center"
            )}>
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{currentUser.name}</p>
                  {currentUser.role === 'admin' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">Admin</span>
                  )}
                </div>
              )}
              {!isCollapsed && (
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="h-12" />
          )}
        </div>

        {/* Collapse Toggle (Desktop) */}
        <button
          onClick={() => onCollapsedChange(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-slate-500" />
          )}
        </button>
      </aside>
    </>
  );
}

export { navigationGroups };
