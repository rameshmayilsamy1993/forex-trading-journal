import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, X, TrendingUp } from 'lucide-react';
import { GeneralMissedTrade } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PageHeader, CardContainer } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { ErrorBoundary } from './ErrorBoundary';
import { formatPrice } from '../utils/calculations';
import { cn } from './ui/utils';
import DOMPurify from 'dompurify';

interface DayData {
  date: Date;
  dateString: string;
  trades: GeneralMissedTrade[];
  totalPL: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const MISSED_STATUS_OPTIONS = ['all', 'PLANNED', 'MISSED', 'EXECUTED_LATER'] as const;

const MISSED_STATUS_STYLES: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  PLANNED: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-500/20', label: 'Planned' },
  MISSED: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500/20', label: 'Missed' },
  EXECUTED_LATER: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-500/20', label: 'Executed Later' },
};

function MissedStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const style = MISSED_STATUS_STYLES[status];
  if (!style) return null;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-caption font-bold ring-1', style.bg, style.text, style.ring)}>
      {style.label}
    </span>
  );
}

const getTradePL = (trade: GeneralMissedTrade): number => {
  return trade.realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs(trade.swap || 0));
};

const formatDateKey = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function GeneralMissedTradesCalendar() {
  const [missedTrades, setMissedTrades] = useState<GeneralMissedTrade[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [selectedMissedStatus, setSelectedMissedStatus] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const filters: { pair?: string; status?: string } = {};
        if (selectedPair !== 'all') filters.pair = selectedPair;
        if (selectedMissedStatus !== 'all') filters.status = selectedMissedStatus;
        const data = await apiService.getGeneralMissedTrades(filters);
        setMissedTrades(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load general missed trades:', error);
        setMissedTrades([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedPair, selectedMissedStatus]);

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
        totalPL: 0,
        isCurrentMonth: false,
        isToday: formatDateKey(date) === formatDateKey(today),
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        dateString: formatDateKey(date),
        trades: [],
        totalPL: 0,
        isCurrentMonth: true,
        isToday: formatDateKey(date) === formatDateKey(today),
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        dateString: formatDateKey(date),
        trades: [],
        totalPL: 0,
        isCurrentMonth: false,
        isToday: formatDateKey(date) === formatDateKey(today),
      });
    }

    const grouped: Record<string, GeneralMissedTrade[]> = {};
    missedTrades.forEach(trade => {
      if (!trade.entryDate) return;
      const dateKey = formatDateKey(trade.entryDate);
      if (!dateKey) return;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(trade);
    });

    return days.map(day => ({
      ...day,
      trades: grouped[day.dateString] || [],
      totalPL: (grouped[day.dateString] || []).reduce((sum, t) => sum + getTradePL(t), 0),
    }));
  }, [currentDate, missedTrades, today]);

  const monthStats = useMemo(() => {
    const monthTrades = missedTrades.filter(t => {
      if (!t.entryDate) return false;
      const tradeDate = new Date(t.entryDate);
      if (isNaN(tradeDate.getTime())) return false;
      return tradeDate.getMonth() === currentDate.getMonth() &&
             tradeDate.getFullYear() === currentDate.getFullYear();
    });
    const totalPL = monthTrades.reduce((sum, t) => sum + getTradePL(t), 0);
    const daysTraded = new Set(monthTrades.map(t => formatDateKey(t.entryDate))).size;
    const winning = monthTrades.filter(t => getTradePL(t) > 0).length;
    const losing = monthTrades.filter(t => getTradePL(t) < 0).length;

    return {
      totalPL,
      tradingDays: daysTraded,
      totalTrades: monthTrades.length,
      winning,
      losing,
    };
  }, [missedTrades, currentDate]);

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
          days: 0,
        });

        current.setDate(current.getDate() + 7);
        weekIndex++;
      }
      return weeks;
    };

    const weeks = generateWeeks();

    missedTrades.forEach((trade) => {
      if (!trade.entryDate) return;
      const tradeDate = new Date(trade.entryDate);

      weeks.forEach((week) => {
        if (tradeDate >= week.start && tradeDate <= week.end) {
          week.total += getTradePL(trade);
          week.days += 1;
        }
      });
    });

    return weeks.filter(w => {
      return w.start.getMonth() === month || w.end.getMonth() === month;
    });
  }, [missedTrades, currentDate]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="General Missed Trades"
          subtitle="Calendar view of all missed trading opportunities"
          icon={CalendarDays}
          color="amber"
        />
        <LoadingSpinner message="Loading calendar..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="General Missed Trades"
          subtitle="Calendar view of all missed trading opportunities"
          icon={CalendarDays}
          color="amber"
        />

        {/* Month Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-6 rounded-[20px] border shadow-[0_10px_30px_rgba(0,0,0,0.06)] ${
            monthStats.totalPL >= 0
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-sm text-white ${
                monthStats.totalPL >= 0
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                  : 'bg-gradient-to-br from-red-500 to-rose-600'
              }`}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-body text-slate-600">Net P&L</p>
                <p className={`text-page-title font-bold ${
                  monthStats.totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {monthStats.totalPL >= 0 ? '+' : ''}${monthStats.totalPL.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-[20px] border shadow-[0_10px_30px_rgba(0,0,0,0.06)] bg-gradient-to-br from-violet-50 to-purple-50 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-body text-slate-600">Days</p>
                <p className="text-page-title font-bold text-[#7C3AED]">{monthStats.tradingDays}</p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-[20px] border shadow-[0_10px_30px_rgba(0,0,0,0.06)] bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-body text-slate-600">Wins / Losses</p>
                <p className="text-page-title font-bold text-[#7C3AED]">
                  <span className="text-emerald-600">{monthStats.winning}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="text-red-600">{monthStats.losing}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-[20px] border shadow-[0_10px_30px_rgba(0,0,0,0.06)] bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-body text-slate-600">Total Trades</p>
                <p className="text-page-title font-bold text-[#D97706]">{monthStats.totalTrades}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <CardContainer className="!p-0">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
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
                <Select value={selectedMissedStatus} onValueChange={setSelectedMissedStatus}>
                  <SelectTrigger className="w-[160px] bg-white">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {MISSED_STATUS_OPTIONS.filter(s => s !== 'all').map(status => (
                      <SelectItem key={status} value={status}>
                        {MISSED_STATUS_STYLES[status]?.label || status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <span className="text-card-title text-slate-900 min-w-[140px] text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={goToToday}
                  className="ml-2 px-3 py-1.5 text-button text-white bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] rounded-xl hover:from-[#6D28D9] hover:to-[#4338CA] shadow-md shadow-[#7C3AED]/20 transition-all duration-200"
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
                  <div key={day} className="text-center text-body-sm text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const hasTrades = day.trades.length > 0;
                const isProfitable = day.totalPL > 0;
                const isLoss = day.totalPL < 0;

                return (
                  <button
                    key={`${day.dateString}-${index}`}
                    onClick={() => hasTrades && setSelectedDay(day)}
                    disabled={!hasTrades}
                    className={`
                      relative p-3 rounded-xl border transition-all duration-200 min-h-[100px] text-left shadow-sm
                      ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50'}
                      ${day.isToday ? 'ring-2 ring-[#7C3AED]' : 'border-[#E5E7EB]'}
                      ${hasTrades ? 'hover:shadow-md hover:border-amber-200 cursor-pointer' : 'cursor-default'}
                      ${hasTrades && isProfitable ? 'border-green-200 bg-green-50/50' : ''}
                      ${hasTrades && isLoss ? 'border-red-200 bg-red-50/50' : ''}
                    `}
                  >
                    <div className={`text-body-sm mb-2 ${
                      day.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                    } ${day.isToday ? 'text-[#7C3AED] font-bold' : ''}`}>
                      {day.date.getDate()}
                    </div>

                    {hasTrades && (
                      <div className="space-y-1">
                        <div className="text-caption text-slate-500">
                          {day.trades.length} missed
                        </div>
                        <div className={`text-body font-bold ${
                          isProfitable ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {day.totalPL >= 0 ? '+' : ''}${day.totalPL.toFixed(0)}
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
              <h3 className="font-semibold text-slate-900">Weekly Summary</h3>
              <span className="text-caption text-slate-400">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
            {weeklyData.length === 0 ? (
              <div className="p-4 text-center text-body text-slate-500 bg-slate-50/50 rounded-[20px] border border-[#E5E7EB]">
                No general missed trades this month
              </div>
            ) : (
              weeklyData.map((w, i) => (
                <div key={i} className="p-4 rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium">{w.week}</p>
                    <p className="text-caption text-slate-400">
                      {w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {w.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className={`text-card-title ${w.total >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {w.total >= 0 ? '+' : ''}${w.total.toFixed(2)}
                  </div>
                  <div className="text-caption text-slate-400">
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
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-section-title font-bold text-slate-900">
                    {selectedDay.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p className="text-body text-slate-500 mt-1">
                    {selectedDay.trades.length} missed {selectedDay.trades.length === 1 ? 'trade' : 'trades'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-page-title font-bold ${selectedDay.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedDay.totalPL >= 0 ? '+' : ''}${selectedDay.totalPL.toFixed(2)}
                  </p>
                  <p className="text-body text-slate-500">Net P&L</p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-4"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                <div className="space-y-3">
                  {selectedDay.trades.map(trade => {
                    const pl = getTradePL(trade);
                    return (
                      <div
                        key={trade.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-caption rounded ${
                              trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {trade.type}
                            </span>
                            <span className="font-medium text-slate-900">{trade.pair}</span>
                            <MissedStatusBadge status={trade.missedStatus} />
                          </div>
                          <span className={`font-bold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-body text-slate-500 mb-2">
                          <div>
                            <span className="text-slate-400">Entry:</span>{' '}
                            {formatPrice(trade.entryPrice, trade.pair)}
                          </div>
                          {trade.exitPrice !== undefined && (
                            <div>
                              <span className="text-slate-400">Exit:</span>{' '}
                              {formatPrice(trade.exitPrice, trade.pair)}
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400">Lot:</span>{' '}
                            {trade.lotSize}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-body text-slate-500 mb-2">
                          {trade.stopLoss && (
                            <div>
                              <span className="text-slate-400">SL:</span>{' '}
                              {formatPrice(trade.stopLoss, trade.pair)}
                            </div>
                          )}
                          {trade.takeProfit && (
                            <div>
                              <span className="text-slate-400">TP:</span>{' '}
                              {formatPrice(trade.takeProfit, trade.pair)}
                            </div>
                          )}
                          {trade.riskRewardRatio && (
                            <div>
                              <span className="text-slate-400">R:R:</span>{' '}
                              {trade.riskRewardRatio.toFixed(2)}
                            </div>
                          )}
                          {(trade as any).rrAchievable && (
                            <div>
                              <span className="text-slate-400">RR Ach.:</span>{' '}
                              <span className="text-emerald-600 font-medium">{(trade as any).rrAchievable}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-body text-slate-500 mb-2">
                          {trade.session && (
                            <div>
                              <span className="text-slate-400">Session:</span> {trade.session}
                            </div>
                          )}
                          {trade.strategy && (
                            <div>
                              <span className="text-slate-400">Strategy:</span> {trade.strategy}
                            </div>
                          )}
                          {trade.keyLevel && (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-micro font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                                {trade.keyLevel}
                              </span>
                            </div>
                          )}
                        </div>

                        {trade.notes && (
                          <div className="text-body text-slate-500 mb-2">
                            <span className="text-slate-400">Notes:</span>{' '}
                            <span
                              className="prose prose-sm max-w-none text-gray-700"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(trade.notes) }}
                            />
                          </div>
                        )}

                        <div className="text-body text-slate-500">
                          <span className="text-orange-500">Reason:</span>{' '}
                          {trade.reason ? (
                            <span
                              className="prose prose-sm max-w-none text-gray-700"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(trade.reason) }}
                            />
                          ) : (
                            <span className="text-slate-400">No reason provided</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
