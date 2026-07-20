import { useState, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, Building2, Wallet, BarChart3,
  EyeOff, Calendar, Settings as SettingsIcon, FileUp,
  Activity, FileSpreadsheet, ClipboardCheck, Settings2,
  ChevronDown, ChevronLeft, ChevronRight, X, TrendingUp,
  TrendingDown, History, Layers, AlertTriangle, Calculator,
  DollarSign, BarChart4, Sparkles, NotebookText, Bell
} from 'lucide-react';
import { cn } from './ui/utils';
import apiService, { User as UserType } from '../services/apiService';

const HIDDEN_TABS_KEY = 'fx-journal-hidden-tabs';

const DEFAULT_HIDDEN: Tab[] = [
  'bias-input', 'bias-history',
  'liquidity-input', 'liquidity-history',
  'crt-input', 'crt-history',
];

function loadHiddenTabs(): Set<Tab> {
  try {
    const stored = localStorage.getItem(HIDDEN_TABS_KEY);
    if (stored) return new Set(JSON.parse(stored) as Tab[]);
  } catch {}
  return new Set(DEFAULT_HIDDEN);
}

function saveHiddenTabs(hidden: Set<Tab>) {
  localStorage.setItem(HIDDEN_TABS_KEY, JSON.stringify([...hidden]));
}

export type Tab = 'dashboard' | 'journal' | 'calendar' | 'missed' | 'missed-calendar' | 'missed-log' | 'missed-log-calendar' | 'firms' | 'accounts' | 'reports' | 'settings' | 'import' | 'convert' | 'checklist' | 'strategy-master' | 'bias' | 'bias-input' | 'bias-history' | 'liquidity-input' | 'liquidity-history' | 'crt-input' | 'crt-history' | 'breached-trades' | 'xauusd-calculator' | 'forex-lot-calculator' | 'market-stats' | 'monthly-review' | 'monthly-review-detail' | 'monthly-review-form' | 'weekly-review' | 'weekly-review-detail' | 'weekly-review-form' | 'daily-review' | 'daily-review-detail' | 'daily-review-form' | 'reminders';

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ElementType;
  children?: NavItem[];
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
    title: 'TOOLS',
    items: [
      { id: 'xauusd-calculator', label: 'XAUUSD Lot Calculator', icon: Calculator },
      { id: 'market-stats', label: 'Market Statistics', icon: BarChart4 },
      { id: 'forex-lot-calculator', label: 'Forex Lot Calculator', icon: DollarSign },
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
    ],
  },
  {
    title: 'Analysis',
    items: [
      { id: 'missed', label: 'CRT Missed Trades', icon: EyeOff },
      { id: 'missed-calendar', label: 'CRT Missed Trade Calendar', icon: Calendar },
      { id: 'missed-log', label: 'Missed Trades', icon: EyeOff },
      { id: 'missed-log-calendar', label: 'Missed Trade Calendar', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'breached-trades', label: 'Breached Trades', icon: AlertTriangle },
      { id: 'monthly-review', label: 'Monthly Market Review', icon: NotebookText },
      { id: 'weekly-review', label: 'Weekly Market Review', icon: Calendar },
      { id: 'daily-review', label: 'Daily Market Review', icon: TrendingUp },
    ],
  },
  {
    title: 'Management',
    items: [
      { id: 'accounts', label: 'Accounts', icon: Wallet },
      { id: 'firms', label: 'Prop Firms', icon: Building2 },
      { id: 'strategy-master', label: 'Strategies', icon: Settings2 },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
      { id: 'reminders', label: 'Reminders', icon: Bell },
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

// Shared sidebar nav item classes for consistent spacing
const NAV_BASE = "w-full flex items-center gap-2.5 rounded-xl text-sidebar-menu transition-all duration-200 relative group";
const NAV_ACTIVE = "bg-gradient-to-r from-[#7C3AED]/10 to-transparent text-[#0F172A] font-medium";
const NAV_INACTIVE = "text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]";
const NAV_ICON = "w-[18px] h-[18px] flex-shrink-0 transition-all duration-200";
const NAV_ICON_ACTIVE = "text-[#7C3AED]";
const NAV_ICON_INACTIVE = "text-[#94A3B8] group-hover:text-[#475569]";
const ACTIVE_INDICATOR = "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#7C3AED] rounded-r-full shadow-[0_0_8px_rgba(124,58,237,0.5)]";

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
  const [hiddenTabs, setHiddenTabs] = useState<Set<Tab>>(loadHiddenTabs);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    saveHiddenTabs(hiddenTabs);
  }, [hiddenTabs]);

  // Auto-expand parent when a child is active
  useEffect(() => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      for (const group of navigationGroups) {
        for (const item of group.items) {
          if (item.children?.some(c => c.id === activeTab)) {
            next.add(item.id);
          }
        }
      }
      return next;
    });
  }, [activeTab]);

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterHidden = (groups: NavGroup[]): NavGroup[] =>
    groups.map(g => ({
      ...g,
      items: g.items
        .map(i => ({
          ...i,
          children: i.children?.filter(c => !hiddenTabs.has(c.id)),
        }))
        .filter(i => !hiddenTabs.has(i.id) && (!i.children || i.children.length > 0)),
    })).filter(g => g.items.length > 0);

  const visibleGroups = filterHidden(navigationGroups);

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.has(item.id);
    const paddingLeft = depth === 0 ? "pl-5" : "pl-9";

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            onTabChange(item.id);
            onMobileClose();
            if (hasChildren) toggleMenu(item.id);
          }}
          className={cn(
            NAV_BASE,
            isCollapsed ? "justify-center px-2 py-2.5" : `${paddingLeft} pr-3 py-2.5`,
            isActive ? NAV_ACTIVE : NAV_INACTIVE,
          )}
          title={isCollapsed ? item.label : undefined}
        >
          {!isCollapsed && isActive && <span className={ACTIVE_INDICATOR} />}
          <Icon className={cn(NAV_ICON, isActive ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE)} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {hasChildren && (
                <ChevronDown className={cn(
                  "w-4 h-4 text-[#94A3B8] transition-transform duration-200",
                  isExpanded && "rotate-180",
                )} />
              )}
            </>
          )}
        </button>
        {hasChildren && !isCollapsed && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map(child => renderNavItem(child, 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen z-50 transition-all duration-300 flex flex-col",
          "bg-white border-r border-[#E2E8F0] shadow-lg",
          isCollapsed ? "w-[72px]" : "w-[260px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-[#E2E8F0] px-4",
            isCollapsed ? "justify-center" : "justify-between",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4F46E5] rounded-xl flex items-center justify-center shadow-lg shadow-[#7C3AED]/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-section-title text-[#0F172A]">FX Journal</h1>
                <p className="text-caption text-[#475569]">Trading Platform</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={onMobileClose} className="lg:hidden p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors" aria-label="Close navigation menu">
              <X className="w-4 h-4 text-[#94A3B8]" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 scrollbar-thin scrollbar-thumb-[#E2E8F0] scrollbar-track-transparent">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.title} className={cn(groupIndex > 0 && "mt-5")}>
              {!isCollapsed && (
                <p className="px-3 mb-1.5 text-sidebar-group text-[#94A3B8]">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => renderNavItem(item, 0))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle (Desktop) */}
        <button
          onClick={() => onCollapsedChange(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-[#E2E8F0] rounded-full items-center justify-center shadow-lg hover:bg-[#F1F5F9] transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-[#94A3B8]" />
          )}
        </button>
      </aside>
    </>
  );
}

export { navigationGroups, HIDDEN_TABS_KEY, DEFAULT_HIDDEN, loadHiddenTabs, saveHiddenTabs };
