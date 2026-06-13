import { useState, useEffect } from 'react';
import { Save, Check, Layers, ArrowUp, ArrowDown, ArrowUpDown, Minus } from 'lucide-react';
import apiService from '../services/apiService';
import { Textarea } from './ui/textarea';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { cn } from './ui/utils';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const LIQUIDITY_OPTIONS = [
  { value: 'NONE', label: 'No Liquidity Taken', description: 'No significant liquidity taken', icon: Minus },
  { value: 'HIGH_TAKEN', label: 'Buy-side Taken', description: 'Previous high liquidity grabbed (above price)', icon: ArrowUp },
  { value: 'LOW_TAKEN', label: 'Sell-side Taken', description: 'Previous low liquidity grabbed (below price)', icon: ArrowDown },
  { value: 'BOTH_TAKEN', label: 'Both Sides Swept', description: 'High & low liquidity both grabbed', icon: ArrowUpDown },
];

const getLiquidityColor = (liquidity: string) => {
  switch (liquidity) {
    case 'HIGH_TAKEN': return 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300';
    case 'LOW_TAKEN': return 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300';
    case 'BOTH_TAKEN': return 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-300';
    default: return 'bg-slate-100 border-gray-300 text-slate-600 dark:bg-gray-800 dark:border-gray-600 dark:text-slate-400';
  }
};

const getLiquidityInsight = (timeframe: string, liquidity: string) => {
  switch (liquidity) {
    case 'HIGH_TAKEN':
      return `Buy-side liquidity taken → Market likely to reverse or distribute`;
    case 'LOW_TAKEN':
      return `Sell-side liquidity taken → Market likely to continue bullish`;
    case 'BOTH_TAKEN':
      return `Both sides swept → High manipulation / range environment`;
    default:
      return `No significant liquidity taken → Market structure unclear`;
  }
};

export default function LiquidityInput() {
  const [pairs, setPairs] = useState<string[]>(PAIRS);
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['EURUSD']);
  const [isSaving, setIsSaving] = useState(false);
  const [currentLiquidity, setCurrentLiquidity] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    monthlyLiquidity: 'NONE',
    weeklyLiquidity: 'NONE',
    dailyLiquidity: 'NONE',
    notes: '',
  });

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    if (selectedPairs.length > 0) {
      loadLatestLiquidity();
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

  const loadLatestLiquidity = async () => {
    try {
      setIsLoading(true);
      const latest = await apiService.liquidity.getLatest();
      
      const liquidityMap: Record<string, any> = {};
      (latest || []).forEach((entry: any) => {
        liquidityMap[entry.pair] = entry;
      });
      setCurrentLiquidity(liquidityMap);
    } catch (error) {
      console.error('Failed to load liquidity:', error);
    } finally {
      setIsLoading(false);
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

    setIsSaving(true);
    try {
      await apiService.liquidity.save({
        pairs: selectedPairs,
        monthlyLiquidity: formData.monthlyLiquidity,
        weeklyLiquidity: formData.weeklyLiquidity,
        dailyLiquidity: formData.dailyLiquidity,
        notes: formData.notes,
      });

      alert('Liquidity saved successfully!');
      await loadLatestLiquidity();
    } catch (error) {
      console.error('Failed to save liquidity:', error);
      alert('Failed to save liquidity. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Liquidity Input"
        subtitle="Track liquidity taken at key timeframe levels"
        color="indigo"
      />

      {/* Pair Selection */}
      <CardContainer>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Pairs</h3>
        <div className="flex flex-wrap gap-2">
          {pairs.map(pair => (
            <button
              key={pair}
              onClick={() => handlePairToggle(pair)}
              className={`px-4 py-2 rounded-lg border-2 transition-all hover:shadow-md ${
                selectedPairs.includes(pair)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {selectedPairs.includes(pair) && <Check className="w-4 h-4 inline mr-2" />}
              {pair}
            </button>
          ))}
        </div>
      </CardContainer>

      {/* Liquidity Inputs */}
      <CardContainer>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Liquidity Taken</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Monthly */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Monthly Liquidity
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Previous Month High/Low taken?
            </p>
            <div className="space-y-2">
              {LIQUIDITY_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, monthlyLiquidity: option.value })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                      formData.monthlyLiquidity === option.value
                        ? getLiquidityColor(option.value)
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {formData.monthlyLiquidity === option.value ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    )}
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{option.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekly */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Weekly Liquidity
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Previous Week High/Low taken?
            </p>
            <div className="space-y-2">
              {LIQUIDITY_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, weeklyLiquidity: option.value })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                      formData.weeklyLiquidity === option.value
                        ? getLiquidityColor(option.value)
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {formData.weeklyLiquidity === option.value ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    )}
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{option.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Daily Liquidity
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Previous Day High/Low taken?
            </p>
            <div className="space-y-2">
              {LIQUIDITY_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, dailyLiquidity: option.value })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                      formData.dailyLiquidity === option.value
                        ? getLiquidityColor(option.value)
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {formData.dailyLiquidity === option.value ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    )}
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{option.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

{/* Insights Preview */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-semibold text-slate-700 mb-3"> Trading Insights</h4>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Monthly', value: formData.monthlyLiquidity },
              { label: 'Weekly', value: formData.weeklyLiquidity },
              { label: 'Daily', value: formData.dailyLiquidity },
            ].map(({ label, value }) => (
              <div key={label} className={cn("p-3 rounded-lg border-l-4", getLiquidityColor(value))}>
                <span className="font-semibold">{label}: </span>
                <span>{getLiquidityInsight(label, value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <Textarea
            placeholder="Additional notes..."
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
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Liquidity'}
          </button>
        </div>
      </CardContainer>

      {/* Current Liquidity Display */}
      {selectedPairs.length > 0 && (
        <CardContainer>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Liquidity</h3>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-3">
              {selectedPairs.map(pair => {
                const liquidity = currentLiquidity[pair];
                return (
                  <div key={pair} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className="font-semibold w-20">{pair}</div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", getLiquidityColor(liquidity?.monthlyLiquidity || 'NONE'))}>
                        M: {liquidity?.monthlyLiquidity || 'NONE'}
                      </span>
                      <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", getLiquidityColor(liquidity?.weeklyLiquidity || 'NONE'))}>
                        W: {liquidity?.weeklyLiquidity || 'NONE'}
                      </span>
                      <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", getLiquidityColor(liquidity?.dailyLiquidity || 'NONE'))}>
                        D: {liquidity?.dailyLiquidity || 'NONE'}
                      </span>
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