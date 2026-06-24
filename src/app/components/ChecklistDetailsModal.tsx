import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, ClipboardCheck } from 'lucide-react';
import Modal from './ui/Modal';
import { Button } from './ui/button';
import apiService from '../services/apiService';

interface ChecklistDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeId: string;
  checklistId?: string;
}

export default function ChecklistDetailsModal({
  isOpen,
  onClose,
  tradeId,
  checklistId,
}: ChecklistDetailsModalProps) {
  const [checklist, setChecklist] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && checklistId) {
      loadChecklist();
    } else if (isOpen && !checklistId) {
      setChecklist(null);
      setIsLoading(false);
    }
  }, [isOpen, checklistId]);

  const loadChecklist = async () => {
    if (!checklistId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await apiService.checklists.getById(checklistId);
      setChecklist(data);
    } catch (err) {
      console.error('Failed to load checklist:', err);
      setError('Failed to load checklist details.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAnswerValue = (item: any): string => {
    if (item.answer !== undefined && item.answer !== null) {
      return String(item.answer);
    }
    return item.checked ? 'Yes' : 'No';
  };

  const isImageUrl = (value: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(value) || value.startsWith('http') && /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(value);
  };

  const renderAnswer = (item: any) => {
    const answer = getAnswerValue(item);
    const lower = answer.toLowerCase();

    if (lower === 'yes' || lower === 'bullish') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-3 h-3" />
          {answer}
        </span>
      );
    }

    if (lower === 'no' || lower === 'bearish') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
          <X className="w-3 h-3" />
          {answer}
        </span>
      );
    }

    if (isImageUrl(answer)) {
      return (
        <button
          onClick={() => setPreviewImage(answer)}
          className="group relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors flex-shrink-0"
        >
          <img
            src={answer}
            alt="Checklist image"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">View</span>
          </div>
        </button>
      );
    }

    return (
      <span className="text-sm text-slate-800 font-medium">{answer}</span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={checklist ? 'Pre-Trade Checklist' : undefined}
        subtitle={checklist ? `${checklist.strategyName} - ${checklist.sessionId || ''}` : undefined}
        icon={checklist ? <ClipboardCheck className="w-6 h-6" /> : undefined}
        size="lg"
        footer={
          checklist ? (
            <Button variant="outline" onClick={onClose}>Close</Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="mt-4 text-slate-500 text-sm">Loading checklist...</p>
          </div>
        ) : checklist ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Created</p>
                <p className="text-sm text-slate-800 font-medium">
                  {formatDate(checklist.createdAt)} at {formatTime(checklist.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${checklist.isValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                  {checklist.isValid ? 'Valid' : 'Invalid'}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${checklist.status === 'LINKED' ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {checklist.status === 'LINKED' ? 'Linked' : 'Active'}
                </span>
              </div>
            </div>

            {checklist.items && checklist.items.length > 0 ? (
              <div className="space-y-3">
                {checklist.items.map((item: any, index: number) => (
                  <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {renderAnswer(item)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-sm">No checklist items found</p>
              </div>
            )}

            {checklist.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-amber-800">{checklist.notes}</p>
              </div>
            )}

            {checklist.missingRequired && checklist.missingRequired.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">Missing Required Items</p>
                <ul className="text-sm text-rose-700 space-y-1">
                  {checklist.missingRequired.map((item: string, i: number) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <X className="w-3 h-3 text-rose-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No checklist linked to this trade.</p>
            <button onClick={onClose} className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Close
            </button>
          </div>
        )}
      </Modal>

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
