import { useState, useEffect, useMemo } from 'react';
import { Filter, RefreshCw, X, ArrowUp, ArrowDown, ArrowUpDown, Minus, Info, TrendingUp, TrendingDown, Waves } from 'lucide-react';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { cn } from './ui/utils';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

interface LiquidityEntry {
  id: string;
  pair: string;
  createdAt: string;
  monthlyLiquidity: string;
  weeklyLiquidity: string;
  dailyLiquidity: string;
  monthlyInsight: string;
  weeklyInsight: string;
  dailyInsight: string;
  notes?: string;
}

interface LiquidityMeta {
  label: string;
  fullLabel: string;
  badgeColor: string;
  cardColor: string;
  cardText: string;
  icon: React.ReactNode;
  insight: string;
}

const getLiquidityMeta = (liquidity: string): LiquidityMeta => {
  switch (liquidity) {
    case 'HIGH_TAKEN':
      return {
        label: 'Buy-side',
        fullLabel: 'Buy-side Liquidity Taken',
        badgeColor: 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300',
        cardColor: 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700',
        cardText: 'text-blue-800 dark:text-blue-300',
        icon: <TrendingUp className="w-6 h-6" />,
        insight: 'Buy-side liquidity taken → Market likely to reverse or distribute'
      };
    case 'LOW_TAKEN':
      return {
        label: 'Sell-side',
        fullLabel: 'Sell-side Liquidity Taken',
        badgeColor: 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300',
        cardColor: 'bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700',
        cardText: 'text-purple-800 dark:text-purple-300',
        icon: <TrendingDown className="w-6 h-6" />,
        insight: 'Sell-side liquidity taken → Market likely to continue bullish'
      };
    case 'BOTH_TAKEN':
      return {
        label: 'Both',
        fullLabel: 'Both Sides Swept',
        badgeColor: 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-300',
        cardColor: 'bg-orange-50 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700',
        cardText: 'text-orange-800 dark:text-orange-300',
        icon: <Waves className="w-6 h-6" />,
        insight: 'Both sides swept → High manipulation / range environment'
      };
    default:
      return {
        label: 'None',
        fullLabel: 'No Liquidity Taken',
        badgeColor: 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
        cardColor: 'bg-gray-50 border-gray-300 dark:bg-gray-800/30 dark:border-gray-600',
        cardText: 'text-gray-700 dark:text-gray-400',
        icon: <Minus className="w-6 h-6" />,
        insight: 'No significant liquidity taken → Market structure unclear'
      };
  }
};

const getLiquidityBadge = (liquidity: string) => {
  const meta = getLiquidityMeta(liquidity);
  return (
    <span className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold", meta.badgeColor)}>
      {meta.label}
    </span>
  );
};

export default function LiquidityHistory() {
  const [entries, setEntries] = useState<LiquidityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPair, setFilterPair] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, pages: 0 });
  const [selectedEntry, setSelectedEntry] = useState<LiquidityEntry | null>(null);

  useEffect(() => {
    loadEntries();
  }, [filterPair, startDate, endDate, pagination.page]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const result = await apiService.liquidity.getAll({
        pair: filterPair === 'all' ? undefined : filterPair,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setEntries(result.entries || []);
      setPagination(prev => ({
        ...prev,
        ...result.pagination
      }));
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setIsLoading(false);
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

  const groupedByDate = useMemo(() => {
    const groups: Record<string, LiquidityEntry[]> = {};
    entries.forEach(entry => {
      if (!entry.createdAt) return;
      const dateKey = new Date(entry.createdAt).toISOString().split('T')[0];
      if (!dateKey || dateKey === 'Invalid Date') return;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    return groups;
  }, [entries]);

  const stats = useMemo(() => {
    const highTaken = entries.filter(e => e.monthlyLiquidity === 'HIGH_TAKEN' || e.weeklyLiquidity === 'HIGH_TAKEN' || e.dailyLiquidity === 'HIGH_TAKEN').length;
    const lowTaken = entries.filter(e => e.monthlyLiquidity === 'LOW_TAKEN' || e.weeklyLiquidity === 'LOW_TAKEN' || e.dailyLiquidity === 'LOW_TAKEN').length;
    const bothTaken = entries.filter(e => e.monthlyLiquidity === 'BOTH_TAKEN' || e.weeklyLiquidity === 'BOTH_TAKEN' || e.dailyLiquidity === 'BOTH_TAKEN').length;
    return { highTaken, lowTaken, bothTaken };
  }, [entries]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Liquidity History"
        subtitle="Track liquidity taken across timeframes"
        color="indigo"
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
            onClick={loadEntries}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </CardContainer>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-sm text-slate-500">High Taken</div>
          <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <ArrowUp className="w-5 h-5" />
            {stats.highTaken}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-sm text-slate-500">Low Taken</div>
          <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
            <ArrowDown className="w-5 h-5" />
            {stats.lowTaken}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-sm text-slate-500">Both Taken</div>
          <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            {stats.bothTaken}
          </div>
        </div>
      </div>

      {/* History Table */}
      <CardContainer>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">No liquidity history found</p>
            <p className="text-sm text-slate-500">Start by entering liquidity data in the Liquidity Input page</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dateEntries]) => (
              <div key={date} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <span className="font-semibold">{formatDate(date)}</span>
                  <span className="text-sm text-slate-500 ml-2">({dateEntries.length} entry{dateEntries.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Time</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Pair</th>
                        <th className="text-center py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Monthly</th>
                        <th className="text-center py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Weekly</th>
                        <th className="text-center py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Daily</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dateEntries.map((entry) => (
                        <tr 
                          key={entry.id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <td className="py-3 px-4 text-sm">{formatTime(entry.createdAt)}</td>
                          <td className="py-3 px-4 text-sm font-medium">{entry.pair}</td>
                          <td className="py-3 px-4 text-center">
                            {getLiquidityBadge(entry.monthlyLiquidity)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getLiquidityBadge(entry.weeklyLiquidity)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getLiquidityBadge(entry.dailyLiquidity)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500 max-w-[200px] truncate">
                            {entry.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} entries)
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
      {selectedEntry && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEntry(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedEntry.pair} - Liquidity Details
                </h2>
                <p className="text-sm text-slate-500">
                  {formatDate(selectedEntry.createdAt)} at {formatTime(selectedEntry.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

<div className="p-5 overflow-y-auto max-h-[70vh]">
              {/* Liquidity States */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3"> Liquidity States</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'monthlyLiquidity', label: 'Monthly' },
                    { key: 'weeklyLiquidity', label: 'Weekly' },
                    { key: 'dailyLiquidity', label: 'Daily' },
                  ].map(({ key, label }) => {
                    const value = selectedEntry[key as keyof LiquidityEntry] as string;
                    const meta = getLiquidityMeta(value);
                    return (
                      <div 
                        key={key}
                        className={cn(
                          "p-5 rounded-lg border-l-4 shadow-sm transition-all hover:shadow-md",
                          meta.cardColor
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{label}</span>
                          {meta.icon}
                        </div>
                        <div className={cn("text-xl font-bold mb-1", meta.cardText)}>
                          {meta.fullLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Insights */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Trading Insights
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'monthlyLiquidity', label: 'Monthly' },
                    { key: 'weeklyLiquidity', label: 'Weekly' },
                    { key: 'dailyLiquidity', label: 'Daily' },
                  ].map(({ key, label }) => {
                    const value = selectedEntry[key as keyof LiquidityEntry] as string;
                    const meta = getLiquidityMeta(value);
                    return (
                      <div 
                        key={key} 
                        className={cn(
                          "p-4 rounded-lg border-l-4 shadow-sm",
                          meta.cardColor
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                          {meta.icon}
                        </div>
                        <p className={cn("text-sm font-medium", meta.cardText)}>
                          {meta.insight}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedEntry.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes</h3>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">{selectedEntry.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}