import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Upload, Image, Save, AlertCircle, ZoomIn, ChevronLeft, ChevronRight, AlertTriangle, ClipboardList, Brain, Target } from 'lucide-react';
import apiService from '../services/apiService';
import DOMPurify from 'dompurify';
import Modal from './ui/Modal';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const MISTAKE_REASONS = [
  'FOMO',
  'Early Entry',
  'Late Entry',
  'No Confirmation',
  'Overtrading',
  'Revenge Trading',
  'Fear of Missing Out',
  'Overconfidence',
  'Lack of Patience',
  'Poor Risk Management',
  'Custom'
];

const VALID_LOSS_REASONS = [
  'Followed Plan',
  'Valid Setup (4HR + 15MIN Confirmed)',
  'SL Hit Before Target',
  'Market Structure Shift',
  'News Spike (Unavoidable)',
  'Liquidity Sweep Loss',
  'Spread/Slippage Issue'
];

const TIMEFRAMES = ['4HR', '15MIN'];

interface ImageData {
  url: string;
  timeframe: string;
  publicId?: string;
}

interface LossReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeId: string;
  tradeData?: {
    pair: string;
    type: string;
    entryPrice: number;
    exitPrice: number;
    profit: number;
    entryDate: string;
    exitDate: string;
  };
  existingAnalysis?: {
    _id: string;
    title?: string;
    reasonType: string;
    isValidTrade?: boolean;
    description: string;
    images: ImageData[];
    tags?: string[];
    disciplineScore?: number;
  } | null;
  mode: 'add' | 'view';
  onSaved?: (analysis: any) => void;
}

export default function LossReasonModal({
  isOpen,
  onClose,
  tradeId,
  tradeData,
  existingAnalysis,
  mode,
  onSaved
}: LossReasonModalProps) {
  const [title, setTitle] = useState('');
  const [reasonType, setReasonType] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<ImageData[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [disciplineScore, setDisciplineScore] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowRight' && lightboxIndex < images.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      } else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxIndex, images.length]);

  useEffect(() => {
    if (existingAnalysis) {
      setTitle(existingAnalysis.title || '');
      setReasonType(existingAnalysis.reasonType || '');
      setDescription(existingAnalysis.description || '');
      setImages(existingAnalysis.images || []);
      setTags(existingAnalysis.tags || []);
      setDisciplineScore(existingAnalysis.disciplineScore || 3);
    } else {
      setTitle('');
      setReasonType('');
      setDescription('');
      setImages([]);
      setTags([]);
      setDisciplineScore(3);
    }
    setError(null);
    setShowUnsavedConfirm(false);
  }, [existingAnalysis, isOpen]);

  const hasUnsavedChanges = useMemo(() => {
    if (mode === 'view') return false;
    if (existingAnalysis) {
      return (
        title !== (existingAnalysis.title || '') ||
        reasonType !== (existingAnalysis.reasonType || '') ||
        description !== (existingAnalysis.description || '') ||
        disciplineScore !== (existingAnalysis.disciplineScore || 3) ||
        JSON.stringify(images) !== JSON.stringify(existingAnalysis.images || [])
      );
    }
    return title !== '' || reasonType !== '' || description !== '' || images.length > 0 || disciplineScore !== 3;
  }, [mode, existingAnalysis, title, reasonType, description, disciplineScore, images]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowUnsavedConfirm(false);
    onClose();
  }, [onClose]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, timeframe: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await apiService.upload.single(file);
      const newImage: ImageData = {
        url: result.url,
        timeframe,
        publicId: result.publicId
      };
      setImages(prev => [...prev.filter(img => img.timeframe !== timeframe), newImage]);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!reasonType) {
      setError('Please select a reason type');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let saved;
      if (mode === 'add') {
        saved = await apiService.lossAnalysis.create({
          tradeId,
          title,
          reasonType,
          description,
          images,
          tags: tags.filter(t => t.trim()),
          disciplineScore
        });
      } else if (existingAnalysis) {
        saved = await apiService.lossAnalysis.update(existingAnalysis._id, {
          title,
          reasonType,
          description,
          images,
          tags: tags.filter(t => t.trim()),
          disciplineScore
        });
      }
      if (onSaved && saved) onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidTrade = existingAnalysis?.isValidTrade ?? (
    reasonType ? VALID_LOSS_REASONS.includes(reasonType) : false
  );
  const displayIsValid = mode === 'view' ? existingAnalysis?.isValidTrade : (reasonType ? VALID_LOSS_REASONS.includes(reasonType) : undefined);

  if (!isOpen) return null;

  const profitColor = tradeData && tradeData.profit < 0 ? 'text-red-600' : 'text-emerald-600';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={mode === 'view' ? 'Loss Analysis' : 'Add Loss Reason'}
        subtitle={mode === 'view' && existingAnalysis?.reasonType ? existingAnalysis.reasonType : 'Document your trade analysis'}
        size="lg"
        icon={<Target className="w-5 h-5" />}
        footer={mode !== 'view' ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading || uploading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : undefined}
      >
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Trade Summary Bar */}
        {tradeData && (
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-900">{tradeData.pair}</span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                  tradeData.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {tradeData.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-600">
                  Entry: <span className="font-semibold text-slate-900">{tradeData.entryPrice}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  Exit: <span className="font-semibold text-slate-900">{tradeData.exitPrice}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  P/L: <span className={`font-bold ${profitColor}`}>{tradeData.profit.toFixed(2)}</span>
                </span>
              </div>
              {displayIsValid !== undefined && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  displayIsValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {displayIsValid ? 'Valid Loss' : 'Mistake'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error display for missing tradeData in view mode */}
        {!tradeData && mode === 'view' && existingAnalysis && (
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Target className="w-4 h-4 text-blue-500" />
              <span>Loss Analysis for this trade</span>
              <span className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                existingAnalysis.isValidTrade ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {existingAnalysis.isValidTrade ? 'Valid Loss' : 'Mistake'}
              </span>
            </div>
          </div>
        )}

        {/* Loss Classification Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              Loss Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason Type <span className="text-red-500">*</span>
              </label>
              <select
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value)}
                disabled={mode === 'view'}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Select reason...</option>
                <optgroup label="Mistake (Trading Error)">
                  {MISTAKE_REASONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </optgroup>
                <optgroup label="Valid Loss (Good Execution)">
                  {VALID_LOSS_REASONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Not all losses are mistakes. Select "Valid Loss" if trade followed your plan.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Title <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={mode === 'view'}
                placeholder="Brief summary of what happened..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Psychology & Discipline Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              Psychology & Discipline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Discipline Score (1-5)
            </label>
            <div className="flex gap-2">
              {[
                { value: 1, label: 'Poor', color: 'red' },
                { value: 2, label: 'Fair', color: 'red' },
                { value: 3, label: 'Average', color: 'amber' },
                { value: 4, label: 'Good', color: 'emerald' },
                { value: 5, label: 'Excellent', color: 'emerald' },
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => {
                    if (mode !== 'view') setDisciplineScore(value);
                  }}
                  disabled={mode === 'view'}
                  className="flex-1 py-3 rounded-xl font-semibold text-center transition-all disabled:cursor-not-allowed"
                  style={disciplineScore >= value ? undefined : undefined}
                >
                  <div className={`rounded-xl py-3 transition-all ${
                    disciplineScore >= value
                      ? color === 'red'
                        ? 'bg-red-500 text-white shadow-md'
                        : color === 'amber'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}>
                    <div className="text-lg font-bold">{value}</div>
                    <div className="text-xs font-medium opacity-80">{label}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Rate how well you followed your trading plan and maintained discipline during this trade.
            </p>
          </CardContent>
        </Card>

        {/* Execution Review Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" />
              Execution Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === 'view' && description ? (
              <div
                className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
              />
            ) : (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={mode === 'view'}
                rows={4}
                placeholder="Describe what happened, what went wrong, and what you would do differently next time..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            )}
          </CardContent>
        </Card>

        {/* Chart Images */}
        <Card className="mb-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-4 h-4 text-sky-600" />
              Chart Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TIMEFRAMES.map(tf => {
                const img = images.find(i => i.timeframe === tf);
                const imgIndex = images.findIndex(i => i.timeframe === tf);
                return (
                  <div key={tf}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{tf} Chart</span>
                      {img && (
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Uploaded</span>
                      )}
                    </div>
                    <div className="relative group">
                      <div className={`
                        relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300
                        ${img
                          ? 'border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300'
                          : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-300'
                        }
                      `}>
                        {img ? (
                          <>
                            <img
                              src={img.url}
                              alt={tf}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                              onClick={() => {
                                setLightboxIndex(imgIndex);
                                setLightboxOpen(true);
                              }}
                            />
                            <div
                              className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                              onClick={() => {
                                setLightboxIndex(imgIndex);
                                setLightboxOpen(true);
                              }}
                            >
                              <div className="bg-white/90 rounded-full p-3 shadow-lg transform group-hover:scale-110 transition-transform">
                                <ZoomIn className="w-6 h-6 text-slate-700" />
                              </div>
                            </div>
                            <span className="absolute top-2 left-2 px-2 py-1 bg-slate-900/70 text-white text-xs font-bold rounded-md backdrop-blur-sm tracking-wider">
                              {tf}
                            </span>
                            {mode !== 'view' && (
                              <button
                                onClick={() => removeImage(images.indexOf(img))}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg backdrop-blur-sm"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : mode !== 'view' ? (
                          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-2 shadow-inner">
                              <Upload className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Upload {tf} Chart</span>
                            <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, tf)}
                            />
                          </label>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                            <Image className="w-10 h-10 mb-2 opacity-40" />
                            <span className="text-sm font-medium">No chart uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {uploading && (
              <div className="flex items-center justify-center gap-2 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading image...
              </div>
            )}
          </CardContent>
        </Card>

        {/* View mode tags */}
        {mode === 'view' && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag, i) => (
              <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </Modal>

      {/* Unsaved Changes Confirmation */}
      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowUnsavedConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Unsaved Changes</h3>
                <p className="text-sm text-slate-500">You have unsaved changes that will be lost.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUnsavedConfirm(false)}>
                Continue Editing
              </Button>
              <Button variant="destructive" onClick={handleConfirmClose}>
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Image Viewer */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 hover:bg-red-500/30 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {images.length > 1 && lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          <div
            className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={images[lightboxIndex]?.url}
                alt={images[lightboxIndex]?.timeframe}
                className="max-w-[85vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              <span className="absolute bottom-4 left-4 px-3 py-1.5 bg-slate-900/80 text-white text-sm font-bold rounded-md backdrop-blur-sm tracking-wider">
                {images[lightboxIndex]?.timeframe} Chart
              </span>
            </div>

            {images.length > 1 && (
              <div className="mt-4 flex items-center gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`rounded-full transition-all ${
                      idx === lightboxIndex ? 'bg-white w-8 h-2' : 'bg-white/40 hover:bg-white/60 w-2 h-2'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && lightboxIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
            Press ESC to close &bull; Arrow keys to navigate
          </div>
        </div>
      )}
    </>
  );
}
