import { useState, useEffect } from 'react';
import { Save, Check, TrendingUp, TrendingDown, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import apiService from '../services/apiService';
import { Textarea } from './ui/textarea';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { cn } from './ui/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { format } from 'date-fns';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const H4_TIMES = ['17:00', '21:00', '01:00', '05:00', '09:00', '13:00'];

const DIRECTION_OPTIONS = [
  { value: 'BULLISH', label: 'Bullish', icon: TrendingUp, color: 'green' },
  { value: 'BEARISH', label: 'Bearish', icon: TrendingDown, color: 'red' },
];

interface CandleData {
  time: string;
  direction: string;
  prevHighTaken: boolean;
  prevLowTaken: boolean;
  notes: string;
}

const DEFAULT_CANDLE: CandleData = {
  time: '',
  direction: 'BULLISH',
  prevHighTaken: false,
  prevLowTaken: false,
  notes: ''
};

export default function H4Input() {
  const [pairs, setPairs] = useState<string[]>(PAIRS);
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [date, setDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [currentData, setCurrentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [candles, setCandles] = useState<CandleData[]>(DEFAULT_CANDLES());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    loadCurrentData();
  }, [selectedPair, date]);

  function DEFAULT_CANDLES() {
    return H4_TIMES.map(time => ({ ...DEFAULT_CANDLE, time }));
  }

  const loadPairs = async () => {
    try {
      const pairsData = await apiService.settings.getPairs();
      if (pairsData && pairsData.length > 0) {
        setPairs(pairsData);
        setSelectedPair(pairsData[0]);
      }
    } catch (error) {
      console.error('Failed to load pairs:', error);
    }
  };

  const loadCurrentData = async () => {
    try {
      setIsLoading(true);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entries = await apiService.h4.getByDate(dateStr, selectedPair);
      
      const existing = entries.find((e: any) => e.pair === selectedPair);
      if (existing) {
        setCurrentData(existing);
        const candleMap: Record<string, any> = {};
        (existing.candles || []).forEach((c: any) => {
          candleMap[c.time] = c;
        });
        setCandles(H4_TIMES.map(time => ({
          time,
          direction: candleMap[time]?.direction || 'BULLISH',
          prevHighTaken: candleMap[time]?.prevHighTaken || false,
          prevLowTaken: candleMap[time]?.prevLowTaken || false,
          notes: candleMap[time]?.notes || ''
        })));
        setNotes(existing.notes || '');
      } else {
        setCurrentData(null);
        setCandles(DEFAULT_CANDLES());
        setNotes('');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setCandles(DEFAULT_CANDLES());
      setNotes('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiService.h4.save({
        pair: selectedPair,
        date: format(date, 'yyyy-MM-dd'),
        candles,
        notes
      });

      alert('H4 data saved successfully!');
      await loadCurrentData();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'BULLISH' 
      ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300'
      : 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="H4 Candle Input"
        subtitle="Track 4-hour candle direction and liquidity"
        color="orange"
      />

      {/* Date & Pair Selection */}
      <CardContainer>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Date:</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <Clock className="mr-2 h-4 w-4" />
                  {format(date, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b border-slate-100">
                  <input
                    type="date"
                    value={format(date, 'yyyy-MM-dd')}
                    onChange={(e) => setDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Pair:</label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            >
              {pairs.map(pair => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadCurrentData}
            className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Load
          </button>
        </div>
      </CardContainer>

      {/* Candle Inputs */}
      <CardContainer>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          4-Hour Candles - {selectedPair}
        </h3>
        
        <div className="space-y-3">
          {candles.map((candle, idx) => (
            <div 
              key={candle.time}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                candle.direction === 'BULLISH' 
                  ? 'border-green-200 bg-green-50/50 dark:bg-green-900/20' 
                  : 'border-red-200 bg-red-50/50 dark:bg-red-900/20'
              )}
            >
              <div className="flex items-center gap-4">
                {/* Time */}
                <div className="w-20 font-mono font-semibold text-slate-700">
                  {candle.time}
                </div>

                {/* Direction */}
                <div className="flex gap-2">
                  {DIRECTION_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const newCandles = [...candles];
                          newCandles[idx].direction = opt.value as 'BULLISH' | 'BEARISH';
                          setCandles(newCandles);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                          candle.direction === opt.value
                            ? getDirectionColor(opt.value)
                            : 'border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Liquidity Checkboxes */}
                <div className="flex items-center gap-4 ml-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candle.prevHighTaken}
                      onChange={(e) => {
                        const newCandles = [...candles];
                        newCandles[idx].prevHighTaken = e.target.checked;
                        setCandles(newCandles);
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <span className="flex items-center gap-1 text-sm text-blue-700">
                      <ArrowUp className="w-3 h-3" /> High Taken
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candle.prevLowTaken}
                      onChange={(e) => {
                        const newCandles = [...candles];
                        newCandles[idx].prevLowTaken = e.target.checked;
                        setCandles(newCandles);
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-purple-600"
                    />
                    <span className="flex items-center gap-1 text-sm text-purple-700">
                      <ArrowDown className="w-3 h-3" /> Low Taken
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <Textarea
            placeholder="Additional notes for this day..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[80px]"
          />
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all hover:shadow-lg"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save H4 Data'}
          </button>
        </div>
      </CardContainer>
    </div>
  );
}