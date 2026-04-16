import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, X } from 'lucide-react';
import { MissedTrade } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PageHeader, CardContainer } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { ErrorBoundary } from './ErrorBoundary';
import DOMPurify from 'dompurify';

interface DayData {
  date: Date;
  dateString: string;
  trades: MissedTrade[];
  realPL: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export default function MissedTradesCalendar() {
  const [missedTrades, setMissedTrades] = useState<MissedTrade[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [missedData, pairsData] = await Promise.all([
          apiService.getMissedTrades().catch(() => []),
          apiService.settings.getPairs().catch(() => [])
        ]);
        
        setMissedTrades(Array.isArray(missedData) ? missedData : []);
      } catch (error) {
        console.error('Failed to load data:', error);
        setMissedTrades([]);
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

  const availablePairs = useMemo(() => {
    const pairs = new Set<string>();
    missedTrades.forEach(t => {
      if (t.pair) pairs.add(t.pair);
    });
    return Array.from(pairs).sort();
  }, [missedTrades]);

  const filteredMissedTrades = useMemo(() => {
    return missedTrades.filter(trade => {
      if (selectedPair !== 'all' && trade.pair !== selectedPair) return false;
      return true;
    });
  }, [missedTrades, selectedPair]);

  const getRealPL = (trade: MissedTrade): number => {
    return trade.realPL ?? ((trade.profitLoss || 0) - Math.abs(trade.commission || 0) - Math.abs(trade.swap || 0));
  };

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
        realPL: 0,
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
        realPL: 0,
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
        realPL: 0,
        isCurrentMonth: false,
        isToday: formatDateKey(date) === formatDateKey(today)
      });
    }

    const grouped: Record<string, MissedTrade[]> = {};
    filteredMissedTrades.forEach(trade => {
      if (!trade.date) return;
      const dateKey = formatDateKey(trade.date);
      if (!dateKey) return;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(trade);
    });

    return days.map(day => ({
      ...day,
      trades: grouped[day.dateString] || [],
      realPL: (grouped[day.dateString] || []).reduce((sum, t) => sum + getRealPL(t), 0)
    }));
  }, [currentDate, filteredMissedTrades, today]);

  const monthStats = useMemo(() => {
    const monthTrades = filteredMissedTrades.filter(t => {
      if (!t.date) return false;
      const tradeDate = new Date(t.date);
      if (isNaN(tradeDate.getTime())) return false;
      return tradeDate.getMonth() === currentDate.getMonth() && 
             tradeDate.getFullYear() === currentDate.getFullYear();
    });
    const realPL = monthTrades.reduce((sum, t) => sum + getRealPL(t), 0);
    const daysTraded = new Set(monthTrades.map(t => formatDateKey(t.date))).size;
    
    return {
      totalRealPL: realPL,
      tradingDays: daysTraded,
      totalTrades: monthTrades.length
    };
  }, [filteredMissedTrades, currentDate]);

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weeklyData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const generateWeeks = (): { week: string; start: Date; end: Date; total: number; days: number }[] => {
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

    filteredMissedTrades.forEach((trade) => {
      if (!trade.date) return;
      const tradeDate = new Date(trade.date);

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
  }, [filteredMissedTrades, currentDate]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Missed Trades Calendar"
          subtitle="View your missed trading opportunities"
          icon={CalendarDays}
          color="red"
        />
        <LoadingSpinner message="Loading calendar..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Missed Trades Calendar"
          subtitle="View your missed trading opportunities"
          icon={CalendarDays}
          color="red"
        />

        {/* Month Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-6 rounded-2xl border ${
            monthStats.totalRealPL >= 0 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                monthStats.totalRealPL >= 0 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Real P/L</p>
                <p className={`text-2xl font-bold ${
                  monthStats.totalRealPL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthStats.totalRealPL >= 0 ? '+' : ''}${monthStats.totalRealPL.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl border bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Missed Days</p>
                <p className="text-2xl font-bold text-blue-600">{monthStats.tradingDays}</p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl border bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Missed</p>
                <p className="text-2xl font-bold text-purple-600">{monthStats.totalTrades}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <CardContainer className="!p-0">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50/50 to-pink-50/50">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="w-[140px] bg-white">
                    <SelectValue placeholder="All Pairs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pairs</SelectItem>
                    {availablePairs.map(pair => (
                      <SelectItem key={pair} value={pair}>{pair}</SelectItem>
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
                const isProfitable = day.realPL > 0;
                const isLoss = day.realPL < 0;

                return (
                  <button
                    key={`${day.dateString}-${index}`}
                    onClick={() => hasTrades && setSelectedDay(day)}
                    disabled={!hasTrades}
                    className={`
                      relative p-3 rounded-xl border transition-all duration-200 min-h-[100px] text-left
                      ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                      ${day.isToday ? 'ring-2 ring-red-500' : 'border-gray-100'}
                      ${hasTrades ? 'hover:shadow-md hover:border-red-200 cursor-pointer' : 'cursor-default'}
                      ${hasTrades && isProfitable ? 'border-green-200 bg-green-50/50' : ''}
                      ${hasTrades && isLoss ? 'border-red-200 bg-red-50/50' : ''}
                    `}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    } ${day.isToday ? 'text-red-600 font-bold' : ''}`}>
                      {day.date.getDate()}
                    </div>

                    {hasTrades && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">
                          {day.trades.length} missed
                        </div>
                        <div className={`text-sm font-bold ${
                          isProfitable ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {day.realPL >= 0 ? '+' : ''}${day.realPL.toFixed(0)}
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
                No missed trades this month
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
                    {w.days} missed {w.days === 1 ? 'day' : 'days'}
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
                    {selectedDay.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedDay.trades.length} missed {selectedDay.trades.length === 1 ? 'trade' : 'trades'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${selectedDay.realPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedDay.realPL >= 0 ? '+' : ''}${selectedDay.realPL.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">Net Real P/L</p>
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
                          getRealPL(trade) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getRealPL(trade) >= 0 ? '+' : ''}${getRealPL(trade).toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-2">
                        <div>
                          <span className="text-gray-400">Entry:</span>{' '}
                          {(trade.entryPrice || 0).toFixed(5)}
                        </div>
                        <div>
                          <span className="text-gray-400">RR:</span>{' '}
                          {trade.rr?.toFixed(2) || '-'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="text-orange-500">Reason:</span>{' '}
                        {trade.reason || trade.missedReason ? (
                          <span
                            className="prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(trade.missedReason || trade.reason || '') }}
                          />
                        ) : (
                          <span className="text-gray-400">No reason provided</span>
                        )}
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
