import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import apiService from '../services/apiService';
import { MasterData, ChecklistItemResult } from '../types/trading';
import { cn } from './ui/utils';
import StrategyHero from './checklist/StrategyHero';
import ChecklistFilter from './checklist/ChecklistFilter';
import ChecklistCard from './checklist/ChecklistCard';
import ProgressRing from './checklist/ProgressRing';
import TradeQualityCard from './checklist/TradeQualityCard';
import BottomActionBar from './checklist/BottomActionBar';

type FilterMode = 'all' | 'required' | 'pending' | 'completed';

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[16px] bg-gradient-to-r from-[#F1F5F9] via-[#E5EAF2] to-[#F1F5F9] bg-[length:200%_100%]',
        className,
      )}
      style={{ animation: 'shimmer 1.5s infinite' }}
    />
  );
}

function StrategySelector({
  strategies,
  onSelect,
}: {
  strategies: MasterData[];
  onSelect: (s: MasterData) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[18px] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-[#E5EAF2]/60"
    >
      <h3 className="text-[20px] font-bold text-[#0F172A] mb-2 tracking-tight">
        Select a Strategy
      </h3>
      <p className="text-[14px] text-[#64748B] mb-6">
        Choose a trading strategy to run its pre-trade checklist
      </p>

      {strategies.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <p className="mt-4 text-[15px] font-semibold text-[#0F172A]">
            No strategies with checklists available
          </p>
          <p className="text-[13px] text-[#64748B] mt-1">
            Create strategies with checklists first
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strategy, i) => (
            <motion.button
              key={strategy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(strategy)}
              className="p-5 bg-[#F8FAFC] rounded-[16px] border-2 border-[#E5EAF2] hover:border-violet-300 hover:bg-violet-50/30 transition-all duration-200 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-[15px] font-bold text-[#0F172A] group-hover:text-violet-700 transition-colors">
                {strategy.name}
              </p>
              <p className="text-[12px] text-[#64748B] mt-1.5">
                {strategy.checklist?.length} items &middot;{' '}
                {strategy.checklist?.filter((i) => i.required).length} required
              </p>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function HistoryChecklist({
  checklist,
  onDelete,
}: {
  checklist: any;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[16px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E5EAF2]/60"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
              checklist.isValid ? 'bg-emerald-50' : 'bg-red-50',
            )}
          >
            {checklist.isValid ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            ) : (
              <XCircle className="w-4.5 h-4.5 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#0F172A]">{checklist.strategyName}</p>
            <p className="text-[11px] font-mono font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded mt-1 inline-block">
              {checklist.sessionId}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase',
                  checklist.status === 'LINKED'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-emerald-100 text-emerald-700',
                )}
              >
                {checklist.status === 'LINKED' ? 'Linked' : 'Active'}
              </span>
              {checklist.status === 'LINKED' && checklist.linkedTrades?.length > 0 && (
                <span className="text-[11px] text-[#64748B]">
                  ({checklist.linkedTrades.length} trade{checklist.linkedTrades.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">
              {new Date(checklist.createdAt).toLocaleString()}
            </p>
            {checklist.pair && (
              <p className="text-[12px] font-semibold text-[#0F172A] mt-1">
                {checklist.pair} {checklist.tradeType}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-bold',
              checklist.isValid
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700',
            )}
          >
            {checklist.isValid ? 'Valid' : 'Invalid'}
          </div>
          <button
            onClick={() => onDelete(checklist.id)}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {checklist.items.slice(0, 6).map((item: ChecklistItemResult, index: number) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium',
              item.checked ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800',
            )}
          >
            {item.checked ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600 shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>

      {checklist.missingRequired?.length > 0 && (
        <div className="mt-2.5 p-2.5 bg-red-50 rounded-lg">
          <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
            Missing Required
          </p>
          <p className="text-[11px] text-red-700 mt-0.5">
            {checklist.missingRequired.join(', ')}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function ChecklistExecutionPage() {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<MasterData[]>([]);
  const [checklistHistory, setChecklistHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'execute' | 'history'>('execute');
  const [selectedStrategy, setSelectedStrategy] = useState<MasterData | null>(null);
  const [checkedItems, setCheckedItems] = useState<Map<string, boolean>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedChecklistId, setCompletedChecklistId] = useState<string | null>(null);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [strategiesData, historyData] = await Promise.all([
        apiService.getMasters('strategy'),
        apiService.checklists.getAll({ limit: 20 }),
      ]);
      setStrategies(strategiesData);
      setChecklistHistory(historyData.checklists || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChecklist = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this checklist?')) return;
    try {
      await apiService.checklists.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete checklist:', error);
    }
  };

  const strategiesWithChecklist = useMemo(
    () => strategies.filter((s) => s.checklist && s.checklist.length > 0),
    [strategies],
  );

  const progress = useMemo(() => {
    if (!selectedStrategy?.checklist) return { total: 0, completed: 0, required: [], requiredCompleted: 0 };
    const total = selectedStrategy.checklist.length;
    const completed = selectedStrategy.checklist.filter((item) => checkedItems.get(item.label)).length;
    const required = selectedStrategy.checklist.filter((item) => item.required);
    const requiredCompleted = required.filter((item) => checkedItems.get(item.label)).length;
    return { total, completed, required, requiredCompleted };
  }, [selectedStrategy, checkedItems]);

  const isValid = useMemo(
    () => progress.required.every((item) => checkedItems.get(item.label)),
    [progress, checkedItems],
  );

  const completionPercent = useMemo(
    () => (progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0),
    [progress],
  );

  const tradeScore = useMemo(
    () => (isValid ? Math.min(60 + completionPercent * 0.4, 100) : Math.min(completionPercent * 0.6, 60)),
    [isValid, completionPercent],
  );

  const currentStepIndex = useMemo(() => {
    if (!selectedStrategy?.checklist) return 0;
    const idx = selectedStrategy.checklist.findIndex((item) => !checkedItems.get(item.label));
    return idx === -1 ? selectedStrategy.checklist.length : idx + 1;
  }, [selectedStrategy, checkedItems]);

  const estimatedRemaining = useMemo(
    () => Math.max(1, progress.total - progress.completed),
    [progress],
  );

  const filteredChecklist = useMemo(() => {
    if (!selectedStrategy?.checklist) return [];
    return selectedStrategy.checklist.filter((item) => {
      const isChecked = checkedItems.get(item.label);
      if (filterMode === 'required') return item.required;
      if (filterMode === 'pending') return !isChecked;
      if (filterMode === 'completed') return isChecked;
      return true;
    });
  }, [selectedStrategy, checkedItems, filterMode]);

  const toggleItem = (label: string) => {
    setCheckedItems((prev) => {
      const newMap = new Map(prev);
      newMap.set(label, !prev.get(label));
      return newMap;
    });
  };

  const handleExpandToggle = (label: string) => {
    setExpandedItem((prev) => (prev === label ? null : label));
  };

  const handleStrategySelect = (strategy: MasterData) => {
    setSelectedStrategy(strategy);
    setCheckedItems(new Map());
    setCompletedChecklistId(null);
    setFilterMode('all');
    setExpandedItem(null);
  };

  const handleSubmit = async () => {
    if (!selectedStrategy || !isValid) return;

    setIsSubmitting(true);
    try {
      const items: ChecklistItemResult[] = selectedStrategy.checklist!.map((item) => ({
        label: item.label,
        checked: checkedItems.get(item.label) || false,
        required: item.required,
      }));

      const result = await apiService.checklists.create({
        strategyId: selectedStrategy.id,
        items,
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

  const handleReset = () => {
    setSelectedStrategy(null);
    setCheckedItems(new Map());
    setCompletedChecklistId(null);
    setFilterMode('all');
    setExpandedItem(null);
  };

  const handleProceedToTrade = () => {
    navigate('/trade/add', {
      state: {
        completedChecklistId,
        strategyName: selectedStrategy?.name,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">
        <Skeleton className="h-[50px] w-[280px]" />
        <Skeleton className="h-[140px] w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5">
          <div className="space-y-3">
            <Skeleton className="h-[44px]" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[260px]" />
            <Skeleton className="h-[180px]" />
            <Skeleton className="h-[80px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-none">
            Pre-Trade Checklist
          </h1>
          <p className="text-[13px] text-[#64748B] mt-1.5 font-medium">
            Complete checklist validation before entering trades
          </p>
        </div>

        <div className="flex gap-1 bg-[#F1F5F9] rounded-xl p-1">
          <button
            onClick={() => setActiveTab('execute')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 flex items-center gap-1.5',
              activeTab === 'execute'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]',
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            New Checklist
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 flex items-center gap-1.5',
              activeTab === 'history'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]',
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            History ({checklistHistory.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'execute' ? (
          <motion.div
            key="execute"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {!selectedStrategy ? (
              <StrategySelector
                strategies={strategiesWithChecklist}
                onSelect={handleStrategySelect}
              />
            ) : (
              <>
                <StrategyHero
                  strategyName={selectedStrategy.name}
                  completionPercent={completionPercent}
                  qualityRating={
                    tradeScore >= 80
                      ? 'Excellent Setup'
                      : tradeScore >= 60
                        ? 'Good Setup'
                        : 'Partial Setup'
                  }
                  onChangeStrategy={handleReset}
                />

                {completedChecklistId && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-emerald-50 to-white rounded-[16px] border-2 border-emerald-200 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold text-emerald-900">
                        Checklist Completed Successfully!
                      </p>
                      <p className="text-[12px] text-emerald-700 flex items-center gap-1.5 mt-0.5">
                        Session:{' '}
                        <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-semibold">
                          {completedSessionId}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={handleProceedToTrade}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-[12px] font-bold shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                      Proceed to Trade
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5">
                  <div className="space-y-0">
                    <ChecklistFilter
                      total={selectedStrategy.checklist?.length || 0}
                      filterMode={filterMode}
                      onFilterChange={setFilterMode}
                    />

                    <div className="space-y-2">
                      {filteredChecklist.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-[16px] border border-[#E5EAF2]/60">
                          <AlertCircle className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                          <p className="mt-3 text-[14px] font-semibold text-[#0F172A]">
                            No items match this filter
                          </p>
                          <p className="text-[12px] text-[#64748B] mt-1">
                            Try a different filter or complete all items
                          </p>
                        </div>
                      ) : (
                        filteredChecklist.map((item, index) => (
                          <ChecklistCard
                            key={`${item.label}-${index}`}
                            label={item.label}
                            isChecked={checkedItems.get(item.label) || false}
                            required={item.required}
                            index={index}
                            onToggle={() => toggleItem(item.label)}
                            isExpanded={expandedItem === item.label}
                            onExpandToggle={() => handleExpandToggle(item.label)}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                    <ProgressRing
                      percent={completionPercent}
                      completed={progress.completed}
                      total={progress.total}
                      currentStep={currentStepIndex}
                      estimatedMinutes={estimatedRemaining}
                    />
                    <TradeQualityCard score={Math.round(tradeScore)} />

                    <div className="bg-white rounded-[16px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E5EAF2]/60">
                      <h3 className="text-[13px] font-bold text-[#0F172A] mb-3 tracking-tight">
                        Quick Actions
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReset}
                          className="flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E5EAF2] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all"
                        >
                          Reset
                        </button>
                        <button className="flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E5EAF2] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all">
                          Save Progress
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <BottomActionBar
                  isReady={isValid}
                  isSubmitting={isSubmitting}
                  onReset={handleReset}
                  onSubmit={handleSubmit}
                />
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {checklistHistory.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 bg-white rounded-[18px] border-2 border-dashed border-[#E5EAF2]"
              >
                <Clock className="w-14 h-14 text-[#CBD5E1] mx-auto" />
                <h3 className="mt-4 text-[17px] font-bold text-[#0F172A]">No Checklists Yet</h3>
                <p className="mt-1.5 text-[13px] text-[#64748B]">
                  Complete a new checklist to see it here
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {checklistHistory.map((checklist) => (
                  <HistoryChecklist
                    key={checklist.id}
                    checklist={checklist}
                    onDelete={handleDeleteChecklist}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
