import { useState, useMemo } from 'react';
import { CheckCircle2, Circle, AlertCircle, ChevronDown, Loader2, ClipboardCheck } from 'lucide-react';
import { MasterData, ChecklistItemResult } from '../types/trading';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import Modal from './ui/Modal';
import apiService from '../services/apiService';

interface StrategyChecklistProps {
  strategies: MasterData[];
  onComplete: (checklistId: string, isValid: boolean, sessionId?: string) => void;
  onCancel?: () => void;
  className?: string;
}

export default function StrategyChecklist({
  strategies,
  onComplete,
  onCancel,
  className
}: StrategyChecklistProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<MasterData | null>(null);
  const [checkedItems, setCheckedItems] = useState<Map<string, boolean>>(new Map());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const strategiesWithChecklist = useMemo(() => 
    strategies.filter(s => s.checklist && s.checklist.length > 0),
    [strategies]
  );

  const currentChecklist = selectedStrategy?.checklist || [];

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedStrategy) return false;
    return Array.from(checkedItems.values()).some(v => v === true) || notes.length > 0;
  }, [selectedStrategy, checkedItems, notes]);

  const progress = useMemo(() => {
    const total = currentChecklist.length;
    const completed = currentChecklist.filter(item => checkedItems.get(item.label)).length;
    const required = currentChecklist.filter(item => item.required);
    const requiredCompleted = required.filter(item => checkedItems.get(item.label)).length;
    return { total, completed, required, requiredCompleted };
  }, [currentChecklist, checkedItems]);

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
    setShowStrategyDropdown(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = async () => {
    if (!selectedStrategy || !isValid) return;

    setIsSubmitting(true);
    try {
      const items: ChecklistItemResult[] = currentChecklist.map(item => ({
        label: item.label,
        checked: checkedItems.get(item.label) || false,
        required: item.required
      }));

      const result = await apiService.checklists.create({
        strategyId: selectedStrategy.id,
        items,
        notes: notes || undefined
      });

      onComplete(result.id, result.isValid, result.sessionId);
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
    setNotes('');
  };

  if (strategiesWithChecklist.length === 0) {
    return (
      <Modal
        isOpen={true}
        onClose={onCancel}
        title="Pre-Trade Checklist"
        subtitle="Complete before entering a trade"
        icon={<ClipboardCheck className="w-6 h-6" />}
        size="lg"
        footer={
          <>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </>
        }
      >
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">No Checklists Available</p>
              <p className="text-sm">Add checklist items to your strategies in settings to enable pre-trade validation.</p>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={true}
        onClose={handleClose}
        title="Pre-Trade Checklist"
        subtitle="Complete before entering a trade"
        icon={<ClipboardCheck className="w-6 h-6" />}
        size="lg"
        footer={
          <>
            {onCancel && (
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            )}
            {selectedStrategy && (
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className={cn(
                  !isValid && 'opacity-50 cursor-not-allowed'
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
                    Proceed to Trade
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Complete Required Items
                  </>
                )}
              </Button>
            )}
          </>
        }
      >
        {!selectedStrategy ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Select Strategy <span className="text-red-500">*</span>
            </label>
            
            <div className="relative">
              <button
                onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
                className="w-full px-4 py-3 text-left bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between"
              >
                <span className="text-slate-500">Choose a strategy...</span>
                <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", showStrategyDropdown && "rotate-180")} />
              </button>

              {showStrategyDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                  {strategiesWithChecklist.map(strategy => (
                    <button
                      key={strategy.id}
                      onClick={() => handleStrategySelect(strategy)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <p className="font-medium text-slate-900">{strategy.name}</p>
                      <p className="text-sm text-slate-500">{strategy.checklist?.length} checklist items</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm text-slate-500">Selected Strategy</p>
                <p className="font-bold text-slate-900">{selectedStrategy.name}</p>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Change
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Checklist Items
                </label>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isValid ? "text-green-600" : "text-amber-600"
                  )}>
                    {progress.completed}/{progress.requiredCompleted} required
                  </span>
                  {isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {currentChecklist.map((item, index) => {
                  const isChecked = checkedItems.get(item.label);
                  return (
                    <button
                      key={`${item.label}-${index}`}
                      onClick={() => toggleItem(item.label)}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-xl border transition-all",
                        isChecked
                          ? "bg-green-50 border-green-200"
                          : item.required && !isChecked
                            ? "bg-red-50 border-red-200"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className={cn(
                          "w-5 h-5 flex-shrink-0",
                          item.required ? "text-red-400" : "text-slate-400"
                        )} />
                      )}
                      <span className={cn(
                        "flex-1 text-left",
                        isChecked ? "text-green-800 font-medium" : "text-slate-700"
                      )}>
                        {item.label}
                      </span>
                      {item.required && (
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded",
                          isChecked ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          REQUIRED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {missingRequired.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Missing Required Items</p>
                    <ul className="mt-1 text-sm text-red-700 space-y-1">
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
                placeholder="Add any additional notes about this trade..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                rows={3}
              />
            </div>
          </div>
        )}
      </Modal>

      {showUnsavedConfirm && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Unsaved Changes</h3>
            <p className="text-sm text-slate-600 mb-6">
              You have unsaved changes. Are you sure you want to close?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnsavedConfirm(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={() => { setShowUnsavedConfirm(false); onCancel?.(); }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
