import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  count: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({ isOpen, count, isDeleting, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        <div className="relative overflow-hidden bg-gradient-to-r from-rose-600 to-red-600 text-white p-5 sm:p-6">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_#f43f5e,_transparent_32%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-card-title font-bold">Delete Trades</h3>
                <p className="text-body text-rose-100">This action cannot be undone</p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 bg-white/10 hover:bg-white/25 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700">Are you sure you want to delete <strong>{count}</strong> trade(s)?</p>
        </div>
        <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" disabled={isDeleting}>Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-500/25 disabled:opacity-50 transition-colors" disabled={isDeleting}>
              {isDeleting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4" /> Delete {count} Trade(s)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
