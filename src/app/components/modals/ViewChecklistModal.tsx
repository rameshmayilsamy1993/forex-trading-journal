import { X, Check } from 'lucide-react';

interface ViewChecklistModalProps {
  isOpen: boolean;
  checklist: any | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function ViewChecklistModal({ isOpen, checklist, isLoading, onClose }: ViewChecklistModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="mt-4 text-slate-500">Loading checklist...</p>
          </div>
        ) : checklist ? (
          <>
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${checklist.isValid
                        ? 'bg-emerald-400/20 text-emerald-200'
                        : 'bg-red-400/20 text-red-200'
                      }`}>
                      {checklist.isValid ? 'VALID' : 'INVALID'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${checklist.status === 'LINKED'
                        ? 'bg-violet-400/20 text-violet-200'
                        : 'bg-blue-400/20 text-blue-200'
                      }`}>
                      {checklist.status === 'LINKED' ? 'LINKED' : 'ACTIVE'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{checklist.strategyName}</h3>
                  <p className="text-sm font-mono text-blue-100 mt-1">
                    {checklist.sessionId}
                  </p>
                  <p className="text-xs text-blue-200 mt-1">
                    {new Date(checklist.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/10 hover:bg-red-500 hover:text-white rounded-full transition-colors flex-shrink-0"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="space-y-2">
                {checklist.items?.map((item: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${item.checked
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.checked
                        ? 'bg-green-500 text-white'
                        : 'bg-red-400 text-white'
                      }`}>
                      {item.checked ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </div>
                    <span className={`flex-1 ${item.checked ? 'text-green-800' : 'text-red-800'}`}>
                      {item.label}
                    </span>
                    {item.required && (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${item.checked
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                        }`}>
                        REQUIRED
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {checklist.notes && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-1">Notes</p>
                  <p className="text-sm text-amber-700">{checklist.notes}</p>
                </div>
              )}

              {checklist.missingRequired?.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800 mb-1">Missing Required Items</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {checklist.missingRequired.map((item: string, index: number) => (
                      <li key={index}>&bull; {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center">
            <p className="text-slate-500">Failed to load checklist</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
