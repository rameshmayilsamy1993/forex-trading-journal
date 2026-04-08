import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, X, Filter, CalendarDays } from 'lucide-react';
import { Trade, PropFirm, TradingAccount } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getDateKey, getLocalDateString, formatDisplayDate } from '../utils/dateUtils';
import { PageHeader, CardContainer, StatCard } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { ErrorBoundary } from './ErrorBoundary';

interface DayData {
  date: Date;
  dateString: string;
  trades: Trade[];
  pnl: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface WeekData {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  trades: Trade[];
  pnl: number;
  daysTraded: number;
}

const SAMPLE_TRADES: Trade[] = [
  { id: '1', accountId: 'acc1', propFirmId: 'firm1', pair: 'EUR/USD', type: 'BUY', status: 'CLOSED', entryPrice: 1.0850, exitPrice: 1.0880, lotSize: 0.1, entryDate: '2026-03-02', profit: 30 },
  { id: '2', accountId: 'acc1', propFirmId: 'firm1', pair: 'GBP/USD', type: 'SELL', status: 'CLOSED', entryPrice: 1.2650, exitPrice: 1.2620, lotSize: 0.1, entryDate: '2026-03-02', profit: 30 },
  { id: '3', accountId: 'acc2', propFirmId: 'firm2', pair: 'USD/JPY', type: 'BUY', status: 'CLOSED', entryPrice: 149.50, exitPrice: 150.00, lotSize: 0.1, entryDate: '2026-03-03', profit: 50 },
  { id: '4', accountId: 'acc1', propFirmId: 'firm1', pair: 'EUR/GBP', type: 'SELL', status: 'CLOSED', entryPrice: 0.8550, exitPrice: 0.8580, lotSize: 0.1, entryDate: '2026-03-05', profit: -30 },
  { id: '5', accountId: 'acc1', propFirmId: 'firm1', pair: 'AUD/USD', type: 'BUY', status: 'CLOSED', entryPrice: 0.6550, exitPrice: 0.6600, lotSize: 0.1, entryDate: '2026-03-05', profit: 50 },
];

const SAMPLE_FIRMS: PropFirm[] = [
  { id: 'firm1', name: 'Funding Pips', color: '#3B82F6', createdAt: '' },
  { id: 'firm2', name: 'FTMO', color: '#10B981', createdAt: '' },
];

const SAMPLE_ACCOUNTS: TradingAccount[] = [
  { id: 'acc1', name: '25K Account', propFirmId: 'firm1', initialBalance: 25000, currentBalance: 25230, currency: 'USD', createdAt: '' },
  { id: 'acc2', name: '50K Account', propFirmId: 'firm2', initialBalance: 50000, currentBalance: 50180, currency: 'USD', createdAt: '' },
];

export default function TradingCalendar() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [tradesData, firmsData, accountsData] = await Promise.all([
          apiService.getTrades().catch(() => []),
          apiService.getPropFirms().catch(() => []),
          apiService.getAccounts().catch(() => [])
        ]);
        
        setTrades(Array.isArray(tradesData) ? tradesData : []);
        setFirms(Array.isArray(firmsData) ? firmsData : []);
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
      } catch (error) {
        console.error('Failed to load data:', error);
        setTrades([]);
        setFirms([]);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getAccountFirmId = (account: TradingAccount): string => {
    if (typeof account.propFirmId === 'object' && account.propFirmId !== null) {
      return (account.propFirmId as PropFirm).id || '';
    }
    return String(account.propFirmId || '');
  };

  const getTradeAccountId = (trade: Trade): string => {
    if (typeof trade.accountId === 'object' && trade.accountId !== null) {
      return String((trade.accountId as any).id || '');
    }
    return String(trade.accountId || '');
  };

  const getTradeFirmId = (trade: Trade): string => {
    if (typeof trade.propFirmId === 'object' && trade.propFirmId !== null) {
      return (trade.propFirmId as PropFirm).id || '';
    }
    return String(trade.propFirmId || '');
  };

  const filteredAccounts = useMemo(() => {
    if (!Array.isArray(accounts)) return [];
    if (selectedFirm === 'all') return accounts;
    return accounts.filter(acc => getAccountFirmId(acc) === selectedFirm);
  }, [accounts, selectedFirm]);

  const filteredTrades = useMemo(() => {
    if (!Array.isArray(trades)) return [];
    return trades.filter(trade => {
      const tradeAccountId = getTradeAccountId(trade);
      const tradeFirmId = getTradeFirmId(trade);
      
      if (selectedFirm !== 'all' && tradeFirmId !== selectedFirm) return false;
      if (selectedAccount !== 'all' && tradeAccountId !== selectedAccount) return false;
      return true;
    });
  }, [trades, selectedFirm, selectedAccount]);

  const getTradePnL = (trade: Trade): number => {
    return (trade as any).realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs((trade as any).swap || 0));
  };

  const getRealPL = (t: Trade): number =>
    (t as any).realPL ?? ((t.profit || 0) - Math.abs(t.commission || 0) - Math.abs((t as any).swap || 0));

  const weeklyData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const generateWeeks = (): typeof weeks => {
      const weeks: { week: string; start: Date; end: Date; total: number; days: number }[] = [];
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      let current = new Date(firstDay);
      current.setDate(current.getDate() - current.getDay());

      let weekIndex = 1;
      while (current <= lastDay) {
        const start = new Date(current);
        const end = new Date(current);
        end.setDate(start.getDate() + 6);

        weeks.push({
          week: `Week ${weekIndex}`,
          start,
          end,
          total: 0,
          days: 0
        });

        current.setDate(current.getDate() + 7);
        weekIndex++;
      }
      return weeks;
    };

    const weeks = generateWeeks();

    filteredTrades.forEach((trade) => {
      if (!trade.entryDate) return;
      const tradeDate = new Date(trade.entryDate);

      weeks.forEach((week) => {
        if (tradeDate >= week.start && tradeDate <= week.end) {
          week.total += getRealPL(trade);
          week.days += 1;
        }
      });
    });

    return weeks.filter(w => {
      return w.start.getMonth() === month || w.end.getMonth() === month;
    });
  }, [filteredTrades, currentDate]);

  const formatDateKey = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: DayData[] = [];
    const startDayOfWeek = firstDay.getDay();
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        dateString: formatDateKey(date),
        trades: [],
        pnl: 0,
        isCurrentMonth: false,
        isToday: formatDateKey(date) === formatDateKey(today)
      });
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        dateString: formatDateKey(date),
        trades: [],
        pnl: 0,
        isCurrentMonth: true,
        isToday: formatDateKey(date) === formatDateKey(today)
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        dateString: formatDateKey(date),
        trades: [],
        pnl: 0,
        isCurrentMonth: false,
        isToday: formatDateKey(date) === formatDateKey(today)
      });
    }

    const grouped: Record<string, Trade[]> = {};
    filteredTrades.forEach(trade => {
      if (!trade.entryDate) return;
      const dateKey = formatDateKey(trade.entryDate);
      if (!dateKey) return;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(trade);
    });

    return days.map(day => ({
      ...day,
      trades: grouped[day.dateString] || [],
      pnl: (grouped[day.dateString] || []).reduce((sum, t) => sum + getTradePnL(t), 0)
    }));
  }, [currentDate, filteredTrades, today]);

  const monthStats = useMemo(() => {
    const monthTrades = filteredTrades.filter(t => {
      if (!t.entryDate) return false;
      const tradeDate = new Date(t.entryDate);
      if (isNaN(tradeDate.getTime())) return false;
      return tradeDate.getMonth() === currentDate.getMonth() && 
             tradeDate.getFullYear() === currentDate.getFullYear();
    });
    const pnl = monthTrades.reduce((sum, t) => sum + getTradePnL(t), 0);
    const daysTraded = new Set(monthTrades.map(t => formatDateKey(t.entryDate))).size;
    
    return {
      totalPnl: pnl,
      tradingDays: daysTraded,
      totalTrades: monthTrades.length
    };
  }, [filteredTrades, currentDate]);

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleFirmChange = (value: string) => {
    setSelectedFirm(value);
    setSelectedAccount('all');
  };

  const formatDate = (date: Date): string => {
    return getLocalDateString(date).split(',')[0];
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Trading Calendar"
          subtitle="View your daily trading summary"
          icon={CalendarDays}
          color="yellow"
        />
        <LoadingSpinner message="Loading calendar..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Trading Calendar"
          subtitle="View your daily trading summary"
          icon={CalendarDays}
          color="yellow"
        />

        {/* Month Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total P&L"
            value={`$${monthStats.totalPnl.toFixed(2)}`}
            icon={monthStats.totalPnl >= 0 ? TrendingUp : TrendingDown}
            color={monthStats.totalPnl >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label="Trading Days"
            value={monthStats.tradingDays}
            icon={Calendar}
            color="blue"
          />
          <StatCard
            label="Total Trades"
            value={monthStats.totalTrades}
            icon={Calendar}
            color="purple"
          />
        </div>

        {/* Filters */}
        <CardContainer className="!p-0">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50/50 to-amber-50/50">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Select value={selectedFirm} onValueChange={handleFirmChange}>
                  <SelectTrigger className="w-[160px] bg-white">
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prop Firms</SelectItem>
                    {(firms || []).map(firm => (
                      <SelectItem key={firm.id} value={firm.id}>{firm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={selectedAccount} 
                  onValueChange={setSelectedAccount}
                  disabled={filteredAccounts.length === 0}
                >
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {filteredAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-lg font-semibold text-gray-900 min-w-[140px] text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={goToToday}
                  className="ml-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </CardContainer>

        {/* Calendar + Weekly Summary */}
        <div className="flex gap-6">
          {/* Calendar Grid */}
          <CardContainer className="flex-1">
          <div className="mb-4">
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const hasTrades = day.trades.length > 0;
              const isProfitable = day.pnl > 0;
              const isLoss = day.pnl < 0;

              return (
                <button
                  key={`${day.dateString}-${index}`}
                  onClick={() => hasTrades && setSelectedDay(day)}
                  disabled={!hasTrades}
                  className={`
                    relative p-3 rounded-xl border transition-all duration-200 min-h-[100px] text-left
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${day.isToday ? 'ring-2 ring-blue-500' : 'border-gray-100'}
                    ${hasTrades ? 'hover:shadow-md hover:border-blue-200 cursor-pointer' : 'cursor-default'}
                    ${hasTrades && isProfitable ? 'border-green-200 bg-green-50/50' : ''}
                    ${hasTrades && isLoss ? 'border-red-200 bg-red-50/50' : ''}
                  `}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  } ${day.isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {day.date.getDate()}
                  </div>

                  {hasTrades && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        {day.trades.length} {day.trades.length === 1 ? 'trade' : 'trades'}
                      </div>
                      <div className={`text-sm font-bold ${
                        isProfitable ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(0)}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContainer>

          {/* Weekly Summary Panel */}
          <div className="w-80 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Weekly Summary</h3>
              <span className="text-xs text-gray-400">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
            {weeklyData.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                No trades this month
              </div>
            ) : (
              weeklyData.map((w, i) => (
                <div key={i} className="p-4 rounded-xl border bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium">{w.week}</p>
                    <p className="text-xs text-gray-400">
                      {w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {w.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className={`text-lg font-semibold ${w.total >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {w.total >= 0 ? '+' : ''}${w.total.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {w.days} trading {w.days === 1 ? 'day' : 'days'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trade Detail Modal */}
        {selectedDay && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDay(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {formatDisplayDate(selectedDay.date)}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedDay.trades.length} {selectedDay.trades.length === 1 ? 'trade' : 'trades'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${selectedDay.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedDay.pnl >= 0 ? '+' : ''}${selectedDay.pnl.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">Net P/L</p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                <div className="space-y-3">
                  {selectedDay.trades.map(trade => (
                    <div
                      key={trade.id}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {trade.type}
                          </span>
                          <span className="font-medium text-gray-900">{trade.pair}</span>
                        </div>
                        <span className={`font-bold ${
                          getTradePnL(trade) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getTradePnL(trade) >= 0 ? '+' : ''}${getTradePnL(trade).toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm text-gray-500">
                        <div>
                          <span className="text-gray-400">Entry:</span>{' '}
                          {(trade.entryPrice || 0).toFixed(5)}
                        </div>
                        <div>
                          <span className="text-gray-400">Exit:</span>{' '}
                          {(trade.exitPrice || 0).toFixed(5) || '-'}
                        </div>
                        <div>
                          <span className="text-gray-400">Lots:</span>{' '}
                          {trade.lotSize || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
