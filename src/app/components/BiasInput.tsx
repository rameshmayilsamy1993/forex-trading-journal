import { useState, useEffect } from 'react';
import { Save, TrendingUp, TrendingDown, Minus, Check, Calendar } from 'lucide-react';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { cn } from './ui/utils';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const CISD_OPTIONS = [
  { value: 'BULLISH', label: 'Bullish', icon: TrendingUp },
  { value: 'BEARISH', label: 'Bearish', icon: TrendingDown },
  { value: 'NEUTRAL', label: 'Neutral', icon: Minus },
];

interface BiasFormData {
  dailyCisd: string;
  h4Cisd: string;
  h1Cisd: string;
  notes: string;
}

export default function BiasInput() {
  const [pairs, setPairs] = useState<string[]>(PAIRS);
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['EURUSD']);
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentBias, setCurrentBias] = useState<Record<string, any>>({});
  const [isLoadingBias, setIsLoadingBias] = useState(false);

  const [formData, setFormData] = useState<BiasFormData>({
    dailyCisd: 'NEUTRAL',
    h4Cisd: 'NEUTRAL',
    h1Cisd: 'NEUTRAL',
    notes: '',
  });

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    if (selectedPairs.length > 0) {
      loadLatestBias();
    }
  }, [selectedPairs]);

  const loadPairs = async () => {
    try {
      const pairsData = await apiService.settings.getPairs();
      if (pairsData && pairsData.length > 0) {
        setPairs(pairsData);
      }
    } catch (error) {
      console.error('Failed to load pairs:', error);
    }
  };

  const loadLatestBias = async () => {
    try {
      setIsLoadingBias(true);
      const latest = await apiService.biasEvents.getLatest();
      
      const biasMap: Record<string, any> = {};
      (latest || []).forEach((entry: any) => {
        biasMap[entry.pair] = entry;
      });
      setCurrentBias(biasMap);
    } catch (error) {
      console.error('Failed to load latest bias:', error);
    } finally {
      setIsLoadingBias(false);
    }
  };

  const handlePairToggle = (pair: string) => {
    setSelectedPairs(prev => {
      if (prev.includes(pair)) {
        return prev.filter(p => p !== pair);
      }
      return [...prev, pair];
    });
  };

  const handleSave = async () => {
    if (selectedPairs.length === 0) {
      alert('Please select at least one pair');
      return;
    }

    if (!formData.dailyCisd || !formData.h4Cisd || !formData.h1Cisd) {
      alert('Please select all CISD values: Daily CISD, H4 CISD, and H1 CISD');
      return;
    }

    setIsSaving(true);
    try {
      await apiService.biasEvents.create({
        pairs: selectedPairs,
        dailyCisd: formData.dailyCisd,
        h4Cisd: formData.h4Cisd,
        h1Cisd: formData.h1Cisd,
        notes: formData.notes,
      });

      alert('Bias saved successfully!');
      await loadLatestBias();
    } catch (error) {
      console.error('Failed to save bias:', error);
      alert('Failed to save bias. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (value: string) => {
    const option = CISD_OPTIONS.find(o => o.value === value);
    const Icon = option?.icon || Minus;
    return <Icon className="w-4 h-4" />;
  };

  const getColor = (value: string) => {
    switch (value) {
      case 'BULLISH': return 'text-green-600 bg-green-50 border-green-200';
      case 'BEARISH': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Bias Input"
        subtitle="Enter CISD values for each timeframe"
        color="blue"
      />

      {/* Date Picker */}
      <CardContainer>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Date:</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !date && "text-slate-400"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {date ? format(date, 'MMM dd, yyyy') : 'Select date'}
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
      </CardContainer>

      {/* Pair Selection */}
      <CardContainer>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Pairs</h3>
        <div className="flex flex-wrap gap-2">
          {pairs.map(pair => (
            <button
              key={pair}
              onClick={() => handlePairToggle(pair)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                selectedPairs.includes(pair)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {selectedPairs.includes(pair) && <Check className="w-4 h-4 inline mr-2" />}
              {pair}
            </button>
          ))}
        </div>
      </CardContainer>

      {/* CISD Inputs */}
      <CardContainer>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">CISD Inputs</h3>
        
        <div className="space-y-6">
          {/* Daily CISD */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Daily CISD (Drives Monthly Bias)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CISD_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, dailyCisd: option.value })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      formData.dailyCisd === option.value
                        ? getColor(option.value)
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* H4 CISD */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              H4 CISD (Drives Weekly Bias)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CISD_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, h4Cisd: option.value })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      formData.h4Cisd === option.value
                        ? getColor(option.value)
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* H1 CISD */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              H1 CISD (Drives Daily Bias)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CISD_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, h1Cisd: option.value })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      formData.h1Cisd === option.value
                        ? getColor(option.value)
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <Textarea
            placeholder="Reason / Notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full min-h-[80px]"
          />
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || selectedPairs.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Bias'}
          </button>
        </div>
      </CardContainer>

      {/* Current Biases Display */}
      {selectedPairs.length > 0 && (
        <CardContainer>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Bias (from CISD)</h3>
          {isLoadingBias ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-3">
              {selectedPairs.map(pair => {
                const bias = currentBias[pair];
                return (
                  <div key={pair} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="font-semibold w-20">{pair}</div>
                    <div className="flex gap-4">
                      <div className={`px-3 py-1 rounded ${getColor(bias?.monthlyBias || 'NEUTRAL')}`}>
                        <span className="text-xs text-slate-500 block">Monthly</span>
                        {getIcon(bias?.monthlyBias || 'NEUTRAL')}
                        <span className="ml-1">{bias?.monthlyBias || 'NEUTRAL'}</span>
                      </div>
                      <div className={`px-3 py-1 rounded ${getColor(bias?.weeklyBias || 'NEUTRAL')}`}>
                        <span className="text-xs text-slate-500 block">Weekly</span>
                        {getIcon(bias?.weeklyBias || 'NEUTRAL')}
                        <span className="ml-1">{bias?.weeklyBias || 'NEUTRAL'}</span>
                      </div>
                      <div className={`px-3 py-1 rounded ${getColor(bias?.dailyBias || 'NEUTRAL')}`}>
                        <span className="text-xs text-slate-500 block">Daily</span>
                        {getIcon(bias?.dailyBias || 'NEUTRAL')}
                        <span className="ml-1">{bias?.dailyBias || 'NEUTRAL'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContainer>
      )}
    </div>
  );
}