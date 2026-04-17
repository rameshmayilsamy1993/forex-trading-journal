import { useState, useEffect } from 'react';
import { FileText, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import apiService from '../services/apiService';
import { MasterData, ChecklistSession } from '../types/trading';
import StrategyChecklist from './StrategyChecklist';
import { cn } from './ui/utils';
import { format } from 'date-fns';

export default function ChecklistPage() {
  const [strategies, setStrategies] = useState<MasterData[]>([]);
  const [checklists, setChecklists] = useState<ChecklistSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [completedChecklist, setCompletedChecklist] = useState<{ id: string; isValid: boolean } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [strategiesData, checklistsData] = await Promise.all([
        apiService.getMasters('strategy'),
        apiService.checklists.getAll({ limit: 50 })
      ]);
      setStrategies(strategiesData);
      setChecklists(checklistsData.checklists || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChecklistComplete = (checklistId: string, isValid: boolean) => {
    setCompletedChecklist({ id: checklistId, isValid });
    loadData();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Strategy Checklist</h1>
        <p className="text-slate-500 mt-1">Complete pre-trade validation before entering positions</p>
      </div>

      {completedChecklist && completedChecklist.isValid && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <div className="flex-1">
            <p className="font-semibold text-green-800">Checklist Completed Successfully!</p>
            <p className="text-sm text-green-700">You can now proceed to enter your trade.</p>
          </div>
          <button
            onClick={() => setCompletedChecklist(null)}
            className="text-green-600 hover:text-green-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('new')}
          className={cn(
            "px-4 py-2 font-medium border-b-2 transition-colors",
            activeTab === 'new'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <FileText className="w-4 h-4 inline-block mr-2" />
          New Checklist
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-4 py-2 font-medium border-b-2 transition-colors",
            activeTab === 'history'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Clock className="w-4 h-4 inline-block mr-2" />
          History ({checklists.length})
        </button>
      </div>

      {activeTab === 'new' ? (
        <StrategyChecklist
          strategies={strategies}
          onComplete={handleChecklistComplete}
        />
      ) : (
        <div className="space-y-4">
          {checklists.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="mt-4 text-slate-600">No checklists yet</p>
              <p className="text-sm text-slate-500">Complete a new checklist to see it here</p>
            </div>
          ) : (
            checklists.map(checklist => (
              <div
                key={checklist.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-4"
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
                      <p className="text-sm text-slate-500">{formatDate(checklist.createdAt)}</p>
                      {checklist.pair && (
                        <p className="text-sm text-slate-600 mt-1">
                          {checklist.pair} {checklist.tradeType}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    checklist.isValid
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  )}>
                    {checklist.isValid ? 'Valid' : 'Invalid'}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {checklist.items.slice(0, 6).map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2 text-sm p-2 rounded",
                        item.checked ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                      )}
                    >
                      {item.checked ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>

                {checklist.missingRequired.length > 0 && (
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
