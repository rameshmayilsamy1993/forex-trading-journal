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
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-body-sm text-foreground">Filters:</span>
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
            <span className="text-body-sm text-muted-foreground">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="modern-input px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-body-sm text-muted-foreground">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="modern-input px-3 py-2"
            />
          </div>

          <button
            onClick={loadEvents}
            className="p-2 text-[#7C3AED] hover:bg-violet-50 rounded-xl transition-all duration-200 hover:shadow-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </CardContainer>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-body-sm text-muted-foreground">Total Shifts</span>
            <div className="p-2 bg-orange-50 rounded-xl">
              <Flame className="w-4 h-4 text-orange-600" />
            </div>
          </div>
          <div className="text-page-title text-orange-600">{stats.totalShifts}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-body-sm text-muted-foreground">Bullish Days</span>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-page-title text-emerald-600">{stats.bullishDays}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-body-sm text-muted-foreground">Bearish Days</span>
            <div className="p-2 bg-rose-950/30 rounded-xl">
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="text-page-title text-rose-600">{stats.bearishDays}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-body-sm text-muted-foreground">Neutral Days</span>
            <div className="p-2 bg-slate-50 rounded-xl">
              <Minus className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div className="text-page-title text-slate-600">{stats.neutralDays}</div>
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
            <p className="text-muted-foreground">No bias events found</p>
            <p className="text-body text-muted-foreground">Start by entering bias data in the Bias Input page</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dateEvents]) => (
                  <div key={date} className="border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                {/* Date Header */}
                <div 
                  className="flex items-center justify-between p-4 bg-[#F8FAFC] cursor-pointer hover:bg-[#F1F5F9] transition-all duration-200"
                  onClick={() => toggleDateExpand(date)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-lg bg-white shadow-sm">
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", expandedDates.has(date) && "rotate-90")} />
                    </div>
                    <span className="font-semibold text-foreground">{formatDate(date)}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F8FAFC] text-muted-foreground text-caption">{dateEvents.length} event{dateEvents.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dateEvents.some(hasAnyShift) && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/30 text-orange-400 text-body-sm border border-orange-800/40">
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
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                          <th className="text-left py-3 px-4 text-table-header text-muted-foreground">Time</th>
                          <th className="text-left py-3 px-4 text-table-header text-muted-foreground">Pair</th>
                          <th className="text-center py-3 px-4 text-table-header text-muted-foreground">Monthly</th>
                          <th className="text-center py-3 px-4 text-table-header text-muted-foreground">Weekly</th>
                          <th className="text-center py-3 px-4 text-table-header text-muted-foreground">Daily</th>
                          <th className="text-center py-3 px-4 text-table-header text-muted-foreground">Shift</th>
                          <th className="text-left py-3 px-4 text-table-header text-muted-foreground">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]/60">
                        {dateEvents.map((entry) => (
                          <tr 
                            key={entry.id} 
                            className={cn(
                              "hover:bg-[#F1F5F9]/60 transition-all duration-150 cursor-pointer group",
                              hasAnyShift(entry) && "bg-orange-50/30"
                            )}
                            onClick={() => openModal(entry)}
                          >
                            <td className="py-3 px-4 text-table-cell text-muted-foreground font-mono">
                              {formatTime(entry.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-table-cell font-semibold text-foreground">{entry.pair}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-semibold border shadow-sm transition-all hover:scale-105 group-hover:shadow-md", getBiasStyle(entry.monthlyBias).badge)}>
                                {getBiasIcon(entry.monthlyBias)}
                                {entry.monthlyBias}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-semibold border shadow-sm transition-all hover:scale-105 group-hover:shadow-md", getBiasStyle(entry.weeklyBias).badge)}>
                                {getBiasIcon(entry.weeklyBias)}
                                {entry.weeklyBias}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-semibold border shadow-sm transition-all hover:scale-105 group-hover:shadow-md", getBiasStyle(entry.dailyBias).badge)}>
                                {getBiasIcon(entry.dailyBias)}
                                {entry.dailyBias}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {entry.monthlyShifted && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-950/30 text-orange-400 text-caption"><Flame className="w-3 h-3" /> M</span>}
                                {entry.weeklyShifted && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-950/30 text-orange-400 text-caption"><Flame className="w-3 h-3" /> W</span>}
                                {entry.dailyShifted && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-950/30 text-orange-400 text-caption"><Flame className="w-3 h-3" /> D</span>}
                                {!hasAnyShift(entry) && <span className="text-slate-300 text-caption">None</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-table-cell">
                              <span className="inline-flex items-center gap-1 text-[#7C3AED] opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-caption">
                                View details <ChevronRight className="w-3 h-3" />
                              </span>
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
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E2E8F0]">
            <div className="text-body text-muted-foreground">
              Page {pagination.page} of {pagination.pages} ({pagination.total} events)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white text-foreground rounded-xl border border-[#E2E8F0] hover:bg-[#F1F5F9]/60 disabled:opacity-50 disabled:cursor-not-allowed text-button transition-all duration-200"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-white text-foreground rounded-xl border border-[#E2E8F0] hover:bg-[#F1F5F9]/60 disabled:opacity-50 disabled:cursor-not-allowed text-button transition-all duration-200"
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
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] bg-gradient-to-r from-purple-950/20 to-transparent">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-section-title text-foreground">
                    {selectedEvent.pair}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-caption font-semibold">Bias Details</span>
                </div>
                <p className="text-body text-muted-foreground">
                  {formatDate(selectedEvent.createdAt)} at {formatTime(selectedEvent.createdAt)}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/80 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[70vh]">
              {/* Current Biases */}
              <div className="mb-6">
                <h3 className="text-body-sm font-semibold text-foreground mb-3">Current Biases</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['monthlyBias', 'weeklyBias', 'dailyBias'] as const).map((biasKey) => {
                    const bias = selectedEvent[biasKey];
                    const style = getBiasStyle(bias);
                    return (
                    <div 
                          key={biasKey}
                          className={cn(
                            "p-5 rounded-2xl text-center border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200",
                            style.bg, style.border
                          )}
                        >
                          <div className={cn("text-table-header mb-3", style.text)}>
                            {biasKey === 'monthlyBias' ? 'Monthly' : biasKey === 'weeklyBias' ? 'Weekly' : 'Daily'}
                          </div>
                          <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-sm", style.badge)}>
                            {getBiasIcon(bias)}
                            <span className="text-heading font-bold">{bias}</span>
                          </div>
                        </div>
                    );
                  })}
                </div>
              </div>

              {/* Derivation Explanations */}
              <div className="mb-6">
                <h3 className="text-body-sm font-semibold text-slate-700 mb-3">Bias Derivation</h3>
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
                            "p-4 rounded-2xl border-l-4 transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200",
                            shifted ? "bg-orange-50 border-orange-500" : cn(style.bg, "border-l-4", style.border)
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{label} Bias</span>
                              {shifted && (
                                <span className="flex items-center gap-1.5 px-3 py-0.5 bg-orange-200 text-orange-700 text-caption font-semibold rounded-full">
                                  <Flame className="w-3 h-3" /> SHIFTED
                                </span>
                              )}
                            </div>
                            <span className={cn("px-3 py-1 rounded-full text-body-sm font-bold shadow-sm", style.badge)}>
                              {bias}
                            </span>
                          </div>
                          <p className="text-body text-slate-600">{explanation}</p>
                        </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-body-sm font-semibold text-slate-700 mb-3">Event Timeline</h3>
                {isLoadingTimeline ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-3">
                    {timelineEvents.map((event, idx) => (
                      <div 
                        key={event.id} 
                        className={cn(
                          "flex gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm",
                          event.id === selectedEvent.id ? "border-violet-300 bg-violet-500/10" : "border-[#E2E8F0] bg-white"
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className={cn(
                            "w-3 h-3 rounded-full ring-2 ring-white",
                            event.id === selectedEvent.id ? "bg-[#7C3AED]" : "bg-slate-300"
                          )} />
                          {idx < timelineEvents.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                        </div>
                        <div>
                          <div className="text-body-sm font-mono text-slate-500 mb-2">
                            {formatTime(event.createdAt)}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(['dailyBias', 'weeklyBias', 'monthlyBias'] as const).map((biasKey) => {
                              const bias = event[biasKey];
                              const style = getBiasStyle(bias);
                              const label = biasKey === 'dailyBias' ? 'Daily' : biasKey === 'weeklyBias' ? 'Weekly' : 'Monthly';
                              return (
                                <span 
                                  key={biasKey}
                                  className={cn(
                                    "px-2.5 py-1 rounded-full text-caption font-semibold border shadow-sm transition-all hover:scale-105",
                                    style.badge
                                  )}
                                >
                                  {label}: {bias}
                                </span>
                              );
                            })}
                            {hasAnyShift(event) && (
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-caption font-bold rounded-full border border-orange-200">
                                <Flame className="w-3 h-3" /> SHIFT
                              </span>
                            )}
                          </div>
                          {event.notes && (
                            <p className="text-caption text-slate-500 mt-2">{event.notes}</p>
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
