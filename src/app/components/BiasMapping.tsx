import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Save, RefreshCw, Edit2, X, Check } from 'lucide-react';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';

interface BiasEntry {
  id: string;
  pair: string;
  monthlyBias: string;
  weeklyBias: string;
  dailyBias: string;
  notes?: string;
}

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const BIAS_OPTIONS = [
  { value: 'ABOVE', label: 'Above previous close', bias: 'BULLISH' },
  { value: 'BELOW', label: 'Below previous close', bias: 'BEARISH' },
  { value: 'INSIDE', label: 'Inside range', bias: 'NEUTRAL' },
];

const DEFAULT_BIASES = ['BULLISH', 'BEARISH', 'NEUTRAL'];

export default function BiasMapping() {
  const [biases, setBiases] = useState<BiasEntry[]>([]);
  const [pairs, setPairs] = useState<string[]>(PAIRS);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    monthly: 'INSIDE',
    weekly: 'INSIDE',
    daily: 'INSIDE',
    notes: '',
  });

  useEffect(() => {
    loadBiases();
    loadPairs();
  }, []);

  const loadBiases = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.biases.getAll();
      setBiases(data || []);
    } catch (error) {
      console.error('Failed to load biases:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'BULLISH': return 'text-green-600 bg-green-50';
      case 'BEARISH': return 'text-red-600 bg-red-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const getBiasIcon = (bias: string) => {
    switch (bias) {
      case 'BULLISH': return <TrendingUp className="w-4 h-4" />;
      case 'BEARISH': return <TrendingDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  const getOptionsForTimeframe = (timeframe: 'monthly' | 'weekly' | 'daily') => {
    return BIAS_OPTIONS;
  };

  const deriveBias = (option: string) => {
    const found = BIAS_OPTIONS.find(o => o.value === option);
    return found?.bias || 'NEUTRAL';
  };

  const startEdit = (pair: string) => {
    const existing = biases.find(b => b.pair === pair);
    setEditingPair(pair);
    
    if (existing) {
      const monthlyOption = BIAS_OPTIONS.find(o => o.bias === existing.monthlyBias)?.value || 'INSIDE';
      const weeklyOption = BIAS_OPTIONS.find(o => o.bias === existing.weeklyBias)?.value || 'INSIDE';
      const dailyOption = BIAS_OPTIONS.find(o => o.bias === existing.dailyBias)?.value || 'INSIDE';
      
      setFormData({
        monthly: monthlyOption,
        weekly: weeklyOption,
        daily: dailyOption,
        notes: existing.notes || '',
      });
    } else {
      setFormData({
        monthly: 'INSIDE',
        weekly: 'INSIDE',
        daily: 'INSIDE',
        notes: '',
      });
    }
  };

  const cancelEdit = () => {
    setEditingPair(null);
    setFormData({
      monthly: 'INSIDE',
      weekly: 'INSIDE',
      daily: 'INSIDE',
      notes: '',
    });
  };

  const handleSave = async () => {
    if (!editingPair) return;

    setIsSaving(true);
    try {
      const biasData = {
        pair: editingPair,
        monthlyBias: deriveBias(formData.monthly),
        weeklyBias: deriveBias(formData.weekly),
        dailyBias: deriveBias(formData.daily),
        notes: formData.notes,
      };

      const existing = biases.find(b => b.pair === editingPair);
      
      if (existing) {
        await apiService.biases.save(biasData);
      } else {
        await apiService.biases.save(biasData);
      }

      await loadBiases();
      setEditingPair(null);
    } catch (error) {
      console.error('Failed to save bias:', error);
      alert('Failed to save bias. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentBias = useMemo(() => {
    if (!editingPair) return null;
    return biases.find(b => b.pair === editingPair);
  }, [editingPair, biases]);

  const isEditing = editingPair !== null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Bias Mapping"
        subtitle="Manually define your market bias per timeframe"
        color="blue"
      />

      <CardContainer>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-t-xl border-b border-slate-200">
              <div className="font-semibold text-slate-700">Pair</div>
              <div className="font-semibold text-slate-700 text-center">Monthly</div>
              <div className="font-semibold text-slate-700 text-center">Weekly</div>
              <div className="font-semibold text-slate-700 text-center">Daily</div>
              <div className="font-semibold text-slate-700 text-right">Actions</div>
            </div>

            {/* Pairs List */}
            <div className="divide-y divide-slate-100">
              {pairs.map(pair => {
                const bias = biases.find(b => b.pair === pair);
                const isCurrentPair = editingPair === pair;

                return (
                  <div key={pair} className="p-4">
                    {isCurrentPair ? (
                      /* Edit Mode */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-900">{pair}</h3>
                          <button
                            onClick={cancelEdit}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                          >
                            <X className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Monthly */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              Monthly Bias
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                              Where did the current month close?
                            </p>
                            <div className="space-y-2">
                              {BIAS_OPTIONS.map(option => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    formData.monthly === option.value
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="monthly"
                                    value={option.value}
                                    checked={formData.monthly === option.value}
                                    onChange={(e) => setFormData({ ...formData, monthly: e.target.value })}
                                    className="sr-only"
                                  />
                                  {formData.monthly === option.value ? (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                  )}
                                  <span className="text-sm text-slate-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Weekly */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              Weekly Bias
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                              Where did the current week close?
                            </p>
                            <div className="space-y-2">
                              {BIAS_OPTIONS.map(option => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    formData.weekly === option.value
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="weekly"
                                    value={option.value}
                                    checked={formData.weekly === option.value}
                                    onChange={(e) => setFormData({ ...formData, weekly: e.target.value })}
                                    className="sr-only"
                                  />
                                  {formData.weekly === option.value ? (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                  )}
                                  <span className="text-sm text-slate-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Daily */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              Daily Bias
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                              Where did today close?
                            </p>
                            <div className="space-y-2">
                              {BIAS_OPTIONS.map(option => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    formData.daily === option.value
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="daily"
                                    value={option.value}
                                    checked={formData.daily === option.value}
                                    onChange={(e) => setFormData({ ...formData, daily: e.target.value })}
                                    className="sr-only"
                                  />
                                  {formData.daily === option.value ? (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                  )}
                                  <span className="text-sm text-slate-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
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
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div className="font-semibold text-slate-900">{pair}</div>
                        
                        <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${getBiasColor(bias?.monthlyBias || 'NEUTRAL')}`}>
                          {getBiasIcon(bias?.monthlyBias || 'NEUTRAL')}
                          <span className="text-sm font-medium">{bias?.monthlyBias || 'NEUTRAL'}</span>
                        </div>
                        
                        <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${getBiasColor(bias?.weeklyBias || 'NEUTRAL')}`}>
                          {getBiasIcon(bias?.weeklyBias || 'NEUTRAL')}
                          <span className="text-sm font-medium">{bias?.weeklyBias || 'NEUTRAL'}</span>
                        </div>
                        
                        <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${getBiasColor(bias?.dailyBias || 'NEUTRAL')}`}>
                          {getBiasIcon(bias?.dailyBias || 'NEUTRAL')}
                          <span className="text-sm font-medium">{bias?.dailyBias || 'NEUTRAL'}</span>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            onClick={() => startEdit(pair)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="text-sm">Edit</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContainer>
    </div>
  );
}