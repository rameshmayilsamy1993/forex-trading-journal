import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Flame, Filter, RefreshCw, Calendar, X, ChevronRight } from 'lucide-react';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { cn } from './ui/utils';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

interface BiasEventEntry {
  id: string;
  pair: string;
  createdAt: string;
  h1Cisd: string;
  h4Cisd: string;
  dailyCisd: string;
  monthlyBias: string;
  weeklyBias: string;
  dailyBias: string;
  dailyShifted: boolean;
  weeklyShifted: boolean;
  monthlyShifted: boolean;
  derivation: {
    monthlyExplanation: string;
    weeklyExplanation: string;
    dailyExplanation: string;
  };
  notes?: string;
}

export default function BiasHistory() {
  const [events, setEvents] = useState<BiasEventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPair, setFilterPair] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, pages: 0 });
  const [selectedEvent, setSelectedEvent] = useState<BiasEventEntry | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<BiasEventEntry[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEvents();
  }, [filterPair, startDate, endDate, pagination.page]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const result = await apiService.biasEvents.getAll({
        pair: filterPair === 'all' ? undefined : filterPair,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setEvents(result.events || []);
      setPagination(prev => ({
        ...prev,
        ...result.pagination
      }));
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeline = async (pair: string, date: string) => {
    try {
      setIsLoadingTimeline(true);
      const result = await apiService.biasEvents.getTimeline(pair, date);
      setTimelineEvents(result.timeline || []);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'BULLISH': return 'text-green-600 bg-green-50';
      case 'BEARISH': return 'text-red-600 bg-red-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getBiasStyle = (bias: string) => {
    switch (bias) {
      case 'BULLISH':
        return {
          bg: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-700 dark:text-green-300',
          border: 'border-green-300 dark:border-green-700',
          badge: 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
        };
      case 'BEARISH':
        return {
          bg: 'bg-red-100 dark:bg-red-900',
          text: 'text-red-700 dark:text-red-300',
          border: 'border-red-300 dark:border-red-700',
          badge: 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-600 dark:text-gray-400',
          border: 'border-gray-300 dark:border-gray-600',
          badge: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        };
    }
  };

  const getShiftStyle = (isShifted: boolean) => {
    if (!isShifted) return {};
    return {
      bg: 'bg-orange-100 dark:bg-orange-900',
      border: 'border-orange-400 dark:border-orange-600',
      text: 'text-orange-700 dark:text-orange-300'
    };
  };

  const getBiasIcon = (bias: string) => {
    switch (bias) {
      case 'BULLISH': return <TrendingUp className="w-3 h-3" />;
      case 'BEARISH': return <TrendingDown className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const hasAnyShift = (entry: BiasEventEntry) => {
    return entry.dailyShifted || entry.weeklyShifted || entry.monthlyShifted;
  };

  const groupedByDate = useMemo(() => {
    const groups: Record<string, BiasEventEntry[]> = {};
    events.forEach(event => {
      if (!event.createdAt) return;
      const dateKey = new Date(event.createdAt).toISOString().split('T')[0];
      if (!dateKey || dateKey === 'Invalid Date') return;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return groups;
  }, [events]);

  const stats = useMemo(() => {
    const totalShifts = events.filter(e => hasAnyShift(e)).length;
    const bullishDays = events.filter(e => e.dailyBias === 'BULLISH').length;
    const bearishDays = events.filter(e => e.dailyBias === 'BEARISH').length;
    const neutralDays = events.filter(e => e.dailyBias === 'NEUTRAL').length;
    
    return { totalShifts, bullishDays, bearishDays, neutralDays };
  }, [events]);

  const toggleDateExpand = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const openModal = async (event: BiasEventEntry) => {
    setSelectedEvent(event);
    const date = new Date(event.createdAt).toISOString().split('T')[0];
    await loadTimeline(event.pair, date);
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setTimelineEvents([]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Bias Events"
        subtitle="Track your bias evolution over time"
        color="purple"
      />

      {/* Filters */}
      <CardContainer>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>
          
          <Select value={filterPair} onValueChange={setFilterPair}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs</SelectItem>
              {PAIRS.map(pair => (
                <SelectItem key={pair} value={pair}>{pair}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <button
            onClick={loadEvents}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </CardContainer>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-sm text-slate-500">Total Shifts</div>
          <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <Flame className="w-5 h-5" />
            {stats.totalShifts}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-sm text-slate-500">Bullish Days</div>
          <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {stats.bullishDays}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-sm text-slate-500">Bearish Days</div>
          <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            {stats.bearishDays}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-sm text-slate-500">Neutral Days</div>
          <div className="text-2xl font-bold text-gray-600 flex items-center gap-2">
            <Minus className="w-5 h-5" />
            {stats.neutralDays}
          </div>
        </div>
      </div>

      {/* Events Table - Grouped by Date */}
      <CardContainer>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">No bias events found</p>
            <p className="text-sm text-slate-500">Start by entering bias data in the Bias Input page</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dateEvents]) => (
              <div key={date} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Date Header */}
                <div 
                  className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleDateExpand(date)}
                >
                  <div className="flex items-center gap-3">
                    <ChevronRight className={cn("w-4 h-4 transition-transform", expandedDates.has(date) && "rotate-90")} />
                    <span className="font-semibold">{formatDate(date)}</span>
                    <span className="text-sm text-slate-500">({dateEvents.length} event{dateEvents.length !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dateEvents.some(hasAnyShift) && (
                      <span className="flex items-center gap-1 text-orange-600 text-sm">
                        <Flame className="w-4 h-4" />
                        {dateEvents.filter(e => hasAnyShift(e)).length} shift(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Events for this date */}
                {expandedDates.has(date) && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="text-left py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Time</th>
                          <th className="text-left py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Pair</th>
                          <th className="text-center py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Monthly</th>
                          <th className="text-center py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Weekly</th>
                          <th className="text-center py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Daily</th>
                          <th className="text-center py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Shift</th>
                          <th className="text-left py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dateEvents.map((entry) => (
                          <tr 
                            key={entry.id} 
                            className={cn(
                              "hover:bg-slate-50 transition-colors cursor-pointer",
                              hasAnyShift(entry) && "bg-orange-50/50"
                            )}
                            onClick={() => openModal(entry)}
                          >
                            <td className="py-3 px-4 text-sm">
                              {formatTime(entry.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium">{entry.pair}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all hover:scale-105", getBiasStyle(entry.monthlyBias).badge)}>
                                {getBiasIcon(entry.monthlyBias)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all hover:scale-105", getBiasStyle(entry.weeklyBias).badge)}>
                                {getBiasIcon(entry.weeklyBias)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all hover:scale-105", getBiasStyle(entry.dailyBias).badge)}>
                                {getBiasIcon(entry.dailyBias)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {entry.monthlyShifted && <Flame className="w-4 h-4 text-orange-500" />}
                                {entry.weeklyShifted && <Flame className="w-4 h-4 text-orange-500" />}
                                {entry.dailyShifted && <Flame className="w-4 h-4 text-orange-500" />}
                                {!hasAnyShift(entry) && <Minus className="w-4 h-4 text-gray-300" />}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-blue-600">
                              Click for details
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} events)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContainer>

      {/* Details Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedEvent.pair} - Bias Details
                </h2>
                <p className="text-sm text-slate-500">
                  {formatDate(selectedEvent.createdAt)} at {formatTime(selectedEvent.createdAt)}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[70vh]">
              {/* Current Biases */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Current Biases</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['monthlyBias', 'weeklyBias', 'dailyBias'] as const).map((biasKey) => {
                    const bias = selectedEvent[biasKey];
                    const style = getBiasStyle(bias);
                    return (
                      <div 
                        key={biasKey}
                        className={cn(
                          "p-4 rounded-lg text-center border-2 transition-all hover:shadow-md",
                          style.bg, style.border
                        )}
                      >
                        <div className={cn("text-xs font-medium mb-2", style.text)}>
                          {biasKey === 'monthlyBias' ? 'Monthly' : biasKey === 'weeklyBias' ? 'Weekly' : 'Daily'}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          {getBiasIcon(bias)}
                          <span className={cn("font-bold text-lg", style.text)}>{bias}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Derivation Explanations */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Bias Derivation</h3>
                <div className="space-y-3">
                  {[
                    { key: 'monthlyBias', shifted: selectedEvent.monthlyShifted, cisd: selectedEvent.dailyCisd, label: 'Monthly', explanation: selectedEvent.derivation?.monthlyExplanation || `Based on Daily CISD: ${selectedEvent.dailyCisd}` },
                    { key: 'weeklyBias', shifted: selectedEvent.weeklyShifted, cisd: selectedEvent.h4Cisd, label: 'Weekly', explanation: selectedEvent.derivation?.weeklyExplanation || `Based on H4 CISD: ${selectedEvent.h4Cisd}` },
                    { key: 'dailyBias', shifted: selectedEvent.dailyShifted, cisd: selectedEvent.h1Cisd, label: 'Daily', explanation: selectedEvent.derivation?.dailyExplanation || `Based on H1 CISD: ${selectedEvent.h1Cisd}` },
                  ].map(({ key, shifted, label, explanation }) => {
                    const bias = selectedEvent[key as keyof typeof selectedEvent] as string;
                    const style = getBiasStyle(bias);
                    const shiftStyle = getShiftStyle(shifted);
                    
                    return (
                      <div 
                        key={key}
                        className={cn(
                          "p-4 rounded-lg border-l-4 transition-all hover:shadow-md",
                          shifted ? "bg-orange-100 dark:bg-orange-900 border-orange-500" : cn(style.bg, "border-l-4", style.border)
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{label} Bias</span>
                            {shifted && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-200 dark:bg-orange-700 text-orange-700 dark:text-orange-200 text-xs font-semibold rounded-full">
                                <Flame className="w-3 h-3" /> SHIFT
                              </span>
                            )}
                          </div>
                          <span className={cn("px-3 py-1 rounded-full text-sm font-bold", style.badge)}>
                            {bias}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Event Timeline</h3>
                {isLoadingTimeline ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-3">
                    {timelineEvents.map((event, idx) => (
                      <div 
                        key={event.id} 
                        className={cn(
                          "flex gap-4 p-3 rounded-lg border",
                          event.id === selectedEvent.id ? "border-blue-300 bg-blue-50" : "border-slate-200"
                        )}
                      >
                        <div className="text-sm text-slate-500 font-mono whitespace-nowrap">
                          {formatTime(event.createdAt)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(['dailyBias', 'weeklyBias', 'monthlyBias'] as const).map((biasKey) => {
                              const bias = event[biasKey];
                              const style = getBiasStyle(bias);
                              const label = biasKey === 'dailyBias' ? 'Daily' : biasKey === 'weeklyBias' ? 'Weekly' : 'Monthly';
                              return (
                                <span 
                                  key={biasKey}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-xs font-semibold transition-all hover:scale-105",
                                    style.badge
                                  )}
                                >
                                  {label}: {bias}
                                </span>
                              );
                            })}
                            {hasAnyShift(event) && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-orange-200 dark:bg-orange-700 text-orange-700 dark:text-orange-200 text-xs font-bold rounded-md">
                                <Flame className="w-3 h-3" /> SHIFT
                              </span>
                            )}
                          </div>
                          {event.notes && (
                            <p className="text-xs text-slate-500">{event.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}