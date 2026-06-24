import { X, Link2, ClipboardCheck } from 'lucide-react';

interface LinkChecklistModalProps {
  isOpen: boolean;
  activeChecklists: any[];
  selectedChecklistId: string;
  isLinking: boolean;
  selectedTradesCount: number;
  onSelectChecklist: (id: string) => void;
  onLink: () => void;
  onClose: () => void;
}

export default function LinkChecklistModal({ isOpen, activeChecklists, selectedChecklistId, isLinking, selectedTradesCount, onSelectChecklist, onLink, onClose }: LinkChecklistModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 sm:p-6">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_#22c55e,_transparent_32%),radial-gradient(circle_at_top_right,_#38bdf8,_transparent_30%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-white/10 rounded-xl flex-shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold">Link Checklist</h3>
                <p className="text-sm text-blue-100">Link an active checklist to {selectedTradesCount} trade(s)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-red-500 hover:text-white rounded-full transition-colors flex-shrink-0"
              disabled={isLinking}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeChecklists.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-gray-500">No active checklists available</p>
              <p className="text-sm text-gray-400 mt-1">Complete a checklist first from the Execution page</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-3">Select a checklist:</p>
              {activeChecklists.map((checklist) => (
                <label
                  key={checklist.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedChecklistId === checklist.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  <input
                    type="radio"
                    name="checklist"
                    value={checklist.id}
                    checked={selectedChecklistId === checklist.id}
                    onChange={() => onSelectChecklist(checklist.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{checklist.sessionId}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {checklist.strategyName} &bull; {checklist.items?.filter((i: any) => i.checked).length}/{checklist.items?.length} items checked
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
              disabled={isLinking}
            >
              Cancel
            </button>
            <button
              onClick={onLink}
              disabled={!selectedChecklistId || isLinking}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLinking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Link Checklist
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
