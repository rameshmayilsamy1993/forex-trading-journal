import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, X, Filter } from 'lucide-react';
import { Trade, PropFirm, TradingAccount } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getDateKey, getLocalDateString, formatDisplayDate } from '../utils/dateUtils';

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
  { id: '6', accountId: 'acc2', propFirmId: 'firm2', pair: 'USD/CAD', type: 'BUY', status: 'CLOSED', entryPrice: 1.3550, exitPrice: 1.3580, lotSize: 0.1, entryDate: '2026-03-10', profit: 30 },
  { id: '7', accountId: 'acc3', propFirmId: 'firm3', pair: 'NZD/USD', type: 'SELL', status: 'CLOSED', entryPrice: 0.6050, exitPrice: 0.6080, lotSize: 0.1, entryDate: '2026-03-12', profit: -30 },
  { id: '8', accountId: 'acc1', propFirmId: 'firm1', pair: 'EUR/USD', type: 'BUY', status: 'CLOSED', entryPrice: 1.0900, exitPrice: 1.0950, lotSize: 0.1, entryDate: '2026-03-15', profit: 50 },
  { id: '9', accountId: 'acc2', propFirmId: 'firm2', pair: 'GBP/JPY', type: 'SELL', status: 'CLOSED', entryPrice: 188.00, exitPrice: 187.00, lotSize: 0.1, entryDate: '2026-03-18', profit: 100 },
  { id: '10', accountId: 'acc3', propFirmId: 'firm3', pair: 'USD/CHF', type: 'BUY', status: 'CLOSED', entryPrice: 0.8850, exitPrice: 0.8820, lotSize: 0.1, entryDate: '2026-03-20', profit: -30 },
];

const SAMPLE_FIRMS: PropFirm[] = [
  { id: 'firm1', name: 'Funding Pips', color: '#3B82F6', createdAt: '' },
  { id: 'firm2', name: 'FTMO', color: '#10B981', createdAt: '' },
  { id: 'firm3', name: 'The5ers', color: '#F59E0B', createdAt: '' },
];

const SAMPLE_ACCOUNTS: TradingAccount[] = [
  { id: 'acc1', name: '25K Account', propFirmId: 'firm1', initialBalance: 25000, currentBalance: 25230, currency: 'USD', createdAt: '' },
  { id: 'acc2', name: '50K Account', propFirmId: 'firm2', initialBalance: 50000, currentBalance: 50180, currency: 'USD', createdAt: '' },
  { id: 'acc3', name: '100K Account', propFirmId: 'firm3', initialBalance: 100000, currentBalance: 99970, currency: 'USD', createdAt: '' },
];

export default function TradingCalendar() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tradesData, firmsData, accountsData] = await Promise.all([
          apiService.getTrades(),
          apiService.getPropFirms(),
          apiService.getAccounts()
        ]);
        
        if (tradesData.length > 0) {
          setTrades(tradesData);
        } else {
          setTrades(SAMPLE_TRADES);
        }
        
        if (firmsData.length > 0) {
          setFirms(firmsData);
        } else {
          setFirms(SAMPLE_FIRMS);
        }
        
        if (accountsData.length > 0) {
          setAccounts(accountsData);
        } else {
          setAccounts(SAMPLE_ACCOUNTS);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setTrades(SAMPLE_TRADES);
        setFirms(SAMPLE_FIRMS);
        setAccounts(SAMPLE_ACCOUNTS);
      }
    };
    loadData();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getAccountFirmId = (account: TradingAccount): string => {
    if (typeof account.propFirmId === 'object' && account.propFirmId !== null) {
      return (account.propFirmId as PropFirm).id;
    }
    return account.propFirmId as string;
  };

  const getTradeAccountId = (trade: Trade): string => {
    if (typeof trade.accountId === 'object' && trade.accountId !== null) {
      return (trade.accountId as any).id || '';
    }
    return String(trade.accountId || '');
  };

  const getTradeFirmId = (trade: Trade): string => {
    if (typeof trade.propFirmId === 'object' && trade.propFirmId !== null) {
      return (trade.propFirmId as PropFirm).id;
    }
    return String(trade.propFirmId || '');
  };

  const filteredAccounts = useMemo(() => {
    if (selectedFirm === 'all') return accounts;
    return accounts.filter(acc => getAccountFirmId(acc) === selectedFirm);
  }, [accounts, selectedFirm]);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const tradeAccountId = getTradeAccountId(trade);
      const tradeFirmId = getTradeFirmId(trade);
      
      if (selectedFirm !== 'all' && tradeFirmId !== selectedFirm) return false;
      if (selectedAccount !== 'all' && tradeAccountId !== selectedAccount) return false;
      return true;
    });
  }, [trades, selectedFirm, selectedAccount]);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Date[] = [];
    
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const getTradePnL = (trade: Trade): number => {
    return (trade as any).realPL ?? ((trade.profit || 0) + (trade.commission || 0) + ((trade as any).swap || 0));
  };

  const formatDateKey = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const groupTradesByDate = useMemo(() => {
    const grouped: Record<string, Trade[]> = {};
    filteredTrades.forEach(trade => {
      if (!trade.entryDate) return;
      const dateKey = formatDateKey(trade.entryDate);
      if (!dateKey) return;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(trade);
    });
    return grouped;
  }, [filteredTrades]);

  const calendarDays = useMemo(() => {
    const days = getDaysInMonth(currentDate);
    return days.map(date => {
      const dateString = formatDateKey(date);
      const dayTrades = groupTradesByDate[dateString] || [];
      const pnl = dayTrades.reduce((sum, t) => sum + getTradePnL(t), 0);
      return {
        date,
        dateString,
        trades: dayTrades,
        pnl,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: formatDateKey(date) === formatDateKey(today)
      };
    });
  }, [currentDate, groupTradesByDate]);

  const weeklyData = useMemo((): WeekData[] => {
    const weeks: WeekData[] = [];
    const monthDays = calendarDays.filter(d => d.isCurrentMonth);
    
    if (monthDays.length === 0) return weeks;
    
    let weekStart = monthDays[0];
    let weekTrades: Trade[] = [];
    let weekDays: Set<string> = new Set();
    
    monthDays.forEach((day, index) => {
      weekTrades = [...weekTrades, ...day.trades];
      weekDays.add(day.dateString);
      
      if (day.date.getDay() === 6 || index === monthDays.length - 1) {
        weeks.push({
          weekNumber: weeks.length + 1,
          startDate: weekStart.date,
          endDate: day.date,
          trades: weekTrades,
          pnl: weekTrades.reduce((sum, t) => sum + getTradePnL(t), 0),
          daysTraded: weekDays.size
        });
        weekStart = monthDays[index + 1] || weekStart;
        weekTrades = [];
        weekDays = new Set();
      }
    });
    
    return weeks;
  }, [calendarDays]);

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Daily Summary</h2>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                
                {/* Prop Firm Filter */}
                <Select value={selectedFirm} onValueChange={handleFirmChange}>
                  <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200 hover:bg-gray-100">
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prop Firms</SelectItem>
                    {firms.map(firm => (
                      <SelectItem key={firm.id} value={firm.id}>{firm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Account Filter */}
                <Select 
                  value={selectedAccount} 
                  onValueChange={setSelectedAccount}
                  disabled={filteredAccounts.length === 0}
                >
                  <SelectTrigger className="w-[180px] bg-gray-50 border-gray-200 hover:bg-gray-100">
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
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-4">
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

            {/* Header Stats */}
            <div className="flex items-center gap-6 pl-6 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total PnL</p>
                <p className={`text-2xl font-bold ${monthStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {monthStats.totalPnl >= 0 ? '+' : ''}${monthStats.totalPnl.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Trading Days</p>
                <p className="text-2xl font-bold text-gray-900">{monthStats.tradingDays}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Trades</p>
                <p className="text-2xl font-bold text-gray-900">{monthStats.totalTrades}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const hasTrades = day.trades.length > 0;
              const isProfitable = day.pnl > 0;
              const isLoss = day.pnl < 0;

              return (
                <button
                  key={index}
                  onClick={() => hasTrades && setSelectedDay(day)}
                  disabled={!hasTrades}
                  className={`
                    relative p-3 rounded-xl border transition-all duration-200 min-h-[100px]
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
                        {day.pnl >= 0 ? '+' : ''}{day.pnl.toFixed(0)}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekly Summary Panel */}
        <div className="w-80 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Summary</h3>
            <div className="space-y-3">
              {weeklyData.map(week => (
                <div
                  key={week.weekNumber}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Week {week.weekNumber}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(week.startDate)} – {formatDate(week.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {week.pnl >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-lg font-bold ${
                        week.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {week.pnl >= 0 ? '+' : ''}${week.pnl.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {week.daysTraded} {week.daysTraded === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {week.trades.slice(0, 5).map((trade, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          getTradePnL(trade) >= 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {trade.pair.split('/')[0]}
                      </span>
                    ))}
                    {week.trades.length > 5 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                        +{week.trades.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Legend</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
                <span className="text-sm text-gray-600">Profitable Day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                <span className="text-sm text-gray-600">Loss Day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white border border-gray-200" />
                <span className="text-sm text-gray-600">No Trades</span>
              </div>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Active Filters</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Prop Firm:</span>
                <span className="font-medium text-gray-900">
                  {selectedFirm === 'all' ? 'All' : firms.find(f => f.id === selectedFirm)?.name || 'All'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Account:</span>
                <span className="font-medium text-gray-900">
                  {selectedAccount === 'all' ? 'All' : accounts.find(a => a.id === selectedAccount)?.name || 'All'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
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
                        {trade.entryPrice.toFixed(5)}
                      </div>
                      <div>
                        <span className="text-gray-400"> Exit:</span>{' '}
                        {trade.exitPrice?.toFixed(5) || '-'}
                      </div>
                      <div>
                        <span className="text-gray-400">Lots:</span>{' '}
                        {trade.lotSize}
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
  );
}
