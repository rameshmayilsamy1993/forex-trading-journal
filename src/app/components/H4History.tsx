import { useState, useEffect, useMemo } from 'react';
import { Filter, RefreshCw, X, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { cn } from './ui/utils';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const H4_TIMES = ['17:00', '21:00', '01:00', '05:00', '09:00', '13:00'];

interface H4Entry {
  id: string;
  pair: string;
  date: string;
  candles: Array<{
    time: string;
    direction: string;
    prevHighTaken: boolean;
    prevLowTaken: boolean;
    notes?: string;
  }>;
  notes?: string;
}

const getDirectionColor = (direction: string) => {
  return direction === 'BULLISH'
    ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300'
    : 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300';
};

const getLiquidityLabel = (high: boolean, low: boolean) => {
  if (high && low) return { label: 'High & Low', color: 'bg-orange-100 border-orange-300 text-orange-700' };
  if (high) return { label: 'High Taken', color: 'bg-blue-100 border-blue-300 text-blue-700' };
  if (low) return { label: 'Low Taken', color: 'bg-purple-100 border-purple-300 text-purple-700' };
  return { label: 'None', color: 'bg-slate-100 border-gray-300 text-slate-600' };
};

export default function H4History() {
  const [entries, setEntries] = useState<H4Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPair, setFilterPair] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [selectedEntry, setSelectedEntry] = useState<H4Entry | null>(null);

  useEffect(() => {
    loadEntries();
  }, [filterPair, startDate, endDate, pagination.page]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const result = await apiService.h4.getAll({
        pair: filterPair === 'all' ? undefined : filterPair,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setEntries(result.entries || []);
      setPagination(prev => ({ ...prev, ...result.pagination }));
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

  const groupedByDate = useMemo(() => {
    const groups: Record<string, H4Entry[]> = {};
    entries.forEach(entry => {
      const dateKey = entry.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    return groups;
  }, [entries]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="H4 Candle History"
        subtitle="Track 4-hour candle direction and liquidity"
        color="orange"
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

          <button onClick={loadEntries} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </CardContainer>

      {/* History Table */}
      <CardContainer>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">No H4 history found</p>
            <p className="text-sm text-slate-500">Start by entering H4 data in the H4 Input page</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dateEntries]) => (
              <div key={date} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <span className="font-semibold">{formatDate(date)}</span>
                  <span className="text-sm text-slate-500 ml-2">({dateEntries.length} pair{dateEntries.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Pair</th>
                        {H4_TIMES.map(time => (
                          <th key={time} className="text-center py-2 px-2 text-xs font-semibold text-slate-600 uppercase">{time}</th>
                        ))}
                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-600 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dateEntries.map((entry) => (
                        <tr 
                          key={entry.id} 
                          className="hover:bg-slate-50 cursor-pointer"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <td className="py-3 px-4 font-medium">{entry.pair}</td>
                          {H4_TIMES.map(time => {
                            const candle = entry.candles?.find(c => c.time === time);
                            const dir = candle?.direction || '-';
                            const liq = getLiquidityLabel(candle?.prevHighTaken || false, candle?.prevLowTaken || false);
                            return (
                              <td key={time} className="py-3 px-2 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getDirectionColor(dir))}>
                                    {dir === 'BULLISH' ? '↑' : dir === 'BEARISH' ? '↓' : '-'}
                                  </span>
                                  <span className={cn("px-1 py-0.5 rounded text-[10px]", liq.color)}>
                                    {liq.label}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-sm text-slate-500 max-w-[150px] truncate">
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
                  {selectedEntry.pair} - H4 Candles
                </h2>
                <p className="text-sm text-slate-500">{formatDate(selectedEntry.date)}</p>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[70vh]">
              <div className="space-y-3">
                {H4_TIMES.map(time => {
                  const candle = selectedEntry.candles?.find(c => c.time === time);
                  const dir = candle?.direction || '-';
                  const liq = getLiquidityLabel(candle?.prevHighTaken || false, candle?.prevLowTaken || false);
                  
                  return (
                    <div 
                      key={time}
                      className={cn(
                        "p-4 rounded-lg border-l-4",
                        dir === 'BULLISH' ? 'border-green-500 bg-green-50' : dir === 'BEARISH' ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-lg">{time}</span>
                          <span className={cn("px-2 py-1 rounded font-semibold", getDirectionColor(dir))}>
                            {dir}
                          </span>
                        </div>
                        <span className={cn("px-3 py-1 rounded-full text-sm font-semibold", liq.color)}>
                          {liq.label}
                        </span>
                      </div>
                      {candle?.notes && (
                        <p className="text-sm text-slate-600 mt-2">{candle.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedEntry.notes && (
                <div className="mt-6 p-3 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Notes</h4>
                  <p className="text-sm text-slate-600">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
