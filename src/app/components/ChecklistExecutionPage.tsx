import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle2, XCircle, Clock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import apiService from '../services/apiService';
import { MasterData, ChecklistItemResult } from '../types/trading';
import { cn } from './ui/utils';
import { Button } from './ui/button';

export default function ChecklistExecutionPage() {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<MasterData[]>([]);
  const [checklistHistory, setChecklistHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'execute' | 'history'>('execute');
  const [selectedStrategy, setSelectedStrategy] = useState<MasterData | null>(null);
  const [checkedItems, setCheckedItems] = useState<Map<string, boolean>>(new Map());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedChecklistId, setCompletedChecklistId] = useState<string | null>(null);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteChecklist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this checklist?')) return;
    try {
      await apiService.checklists.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete checklist:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [strategiesData, historyData] = await Promise.all([
        apiService.getMasters('strategy'),
        apiService.checklists.getAll({ limit: 20 })
      ]);
      setStrategies(strategiesData);
      setChecklistHistory(historyData.checklists || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const strategiesWithChecklist = useMemo(() => 
    strategies.filter(s => s.checklist && s.checklist.length > 0),
    [strategies]
  );

  const progress = useMemo(() => {
    if (!selectedStrategy?.checklist) return { total: 0, completed: 0, required: [], requiredCompleted: 0 };
    
    const total = selectedStrategy.checklist.length;
    const completed = selectedStrategy.checklist.filter(item => checkedItems.get(item.label)).length;
    const required = selectedStrategy.checklist.filter(item => item.required);
    const requiredCompleted = required.filter(item => checkedItems.get(item.label)).length;
    
    return { total, completed, required, requiredCompleted };
  }, [selectedStrategy, checkedItems]);

  const isValid = useMemo(() => {
    return progress.required.every(item => checkedItems.get(item.label));
  }, [progress, checkedItems]);

  const missingRequired = useMemo(() => {
    return progress.required
      .filter(item => !checkedItems.get(item.label))
      .map(item => item.label);
  }, [progress, checkedItems]);

  const toggleItem = (label: string) => {
    setCheckedItems(prev => {
      const newMap = new Map(prev);
      newMap.set(label, !prev.get(label));
      return newMap;
    });
  };

  const handleStrategySelect = (strategy: MasterData) => {
    setSelectedStrategy(strategy);
    setCheckedItems(new Map());
    setNotes('');
    setCompletedChecklistId(null);
    setShowStrategyDropdown(false);
  };

  const handleSubmit = async () => {
    if (!selectedStrategy || !isValid) return;

    setIsSubmitting(true);
    try {
      const items: ChecklistItemResult[] = selectedStrategy.checklist!.map(item => ({
        label: item.label,
        checked: checkedItems.get(item.label) || false,
        required: item.required
      }));

      const result = await apiService.checklists.create({
        strategyId: selectedStrategy.id,
        items,
        notes: notes || undefined
      });

      setCompletedChecklistId(result.id);
      setCompletedSessionId(result.sessionId);
      
      await loadData();
    } catch (error) {
      console.error('Failed to save checklist:', error);
      alert('Failed to save checklist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToTrade = () => {
    navigate('/trade/add', { 
      state: { 
        completedChecklistId,
        strategyName: selectedStrategy?.name 
      } 
    });
  };

  const handleReset = () => {
    setSelectedStrategy(null);
    setCheckedItems(new Map());
    setNotes('');
    setCompletedChecklistId(null);
    setCompletedSessionId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pre-Trade Checklist</h1>
        <p className="text-slate-500 mt-1">Complete checklist validation before entering trades</p>
      </div>

      {completedChecklistId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <div className="flex-1">
            <p className="font-semibold text-green-800">Checklist Completed Successfully!</p>
            <p className="text-sm text-green-700 flex items-center gap-2">
              Session: <span className="font-mono bg-green-100 px-2 py-0.5 rounded text-green-800">{completedSessionId}</span>
            </p>
          </div>
          <Button onClick={handleProceedToTrade} className="flex items-center gap-2">
            Proceed to Trade
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('execute')}
          className={cn(
            "px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'execute'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <FileText className="w-4 h-4" />
          New Checklist
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'history'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Clock className="w-4 h-4" />
          History ({checklistHistory.length})
        </button>
      </div>

      {activeTab === 'execute' ? (
        !selectedStrategy ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Strategy</h3>
            
            {strategiesWithChecklist.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                <p className="mt-4 text-slate-600">No strategies with checklists available</p>
                <p className="text-sm text-slate-500">Create strategies with checklists first</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategiesWithChecklist.map(strategy => (
                  <button
                    key={strategy.id}
                    onClick={() => handleStrategySelect(strategy)}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all text-left group"
                  >
                    <p className="font-semibold text-slate-900 group-hover:text-blue-700">
                      {strategy.name}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {strategy.checklist?.length} items • {strategy.checklist?.filter(i => i.required).length} required
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/50 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Selected Strategy</p>
                  <h2 className="text-xl font-bold">{selectedStrategy.name}</h2>
                </div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                >
                  Change Strategy
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">Progress</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {progress.completed}/{progress.total}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Required</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    isValid ? "text-green-600" : "text-amber-600"
                  )}>
                    {progress.requiredCompleted}/{progress.required.length}
                  </p>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-lg flex items-center gap-2",
                  isValid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                )}>
                  {isValid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">Ready</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-semibold">Incomplete</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {selectedStrategy.checklist?.map((item, index) => {
                  const isChecked = checkedItems.get(item.label);
                  return (
                    <button
                      key={`${item.label}-${index}`}
                      onClick={() => toggleItem(item.label)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                        isChecked
                          ? "bg-green-50 border-green-300"
                          : item.required
                            ? "bg-red-50 border-red-200"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isChecked
                          ? "bg-green-600 border-green-600"
                          : item.required
                            ? "border-red-400"
                            : "border-slate-300"
                      )}>
                        {isChecked && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={cn(
                        "flex-1 text-left font-medium",
                        isChecked ? "text-green-800" : "text-slate-700"
                      )}>
                        {item.label}
                      </span>
                      {item.required && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold",
                          isChecked ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                        )}>
                          REQUIRED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {missingRequired.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Missing Required Items</p>
                      <ul className="mt-2 text-sm text-red-700 space-y-1">
                        {missingRequired.map(item => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this trade setup..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || isSubmitting}
                  className={cn(
                    "flex-1",
                    isValid ? "bg-green-600 hover:bg-green-700" : "bg-slate-300"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete Checklist
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Complete Required Items
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {checklistHistory.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <Clock className="w-16 h-16 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-700">No Checklists Yet</h3>
              <p className="mt-2 text-slate-500">Complete a new checklist to see it here</p>
            </div>
          ) : (
            checklistHistory.map(checklist => (
              <div
                key={checklist.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {checklist.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-1" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-1" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{checklist.strategyName}</p>
                      <p className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                        {checklist.sessionId}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          checklist.status === 'LINKED'
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                        )}>
                          {checklist.status === 'LINKED' ? '🔒 LINKED' : '🟢 ACTIVE'}
                        </span>
                        {checklist.status === 'LINKED' && checklist.linkedTrades?.length > 0 && (
                          <span className="text-xs text-slate-500">
                            ({checklist.linkedTrades.length} trade(s))
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {new Date(checklist.createdAt).toLocaleString()}
                      </p>
                      {checklist.pair && (
                        <p className="text-sm text-slate-600 mt-1">
                          {checklist.pair} {checklist.tradeType}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      checklist.isValid
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}>
                      {checklist.isValid ? 'Valid' : 'Invalid'}
                    </span>
                    <button
                      onClick={() => {
                        console.log('Delete clicked:', checklist.id);
                        handleDeleteChecklist(checklist.id);
                      }}
                      className="px-3 py-1 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {checklist.items.slice(0, 6).map((item: ChecklistItemResult, index: number) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2 text-sm p-2 rounded-lg",
                        item.checked ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                      )}
                    >
                      {item.checked ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>

                {checklist.missingRequired?.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Missing Required:</p>
                    <p className="text-sm text-red-600">
                      {checklist.missingRequired.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
