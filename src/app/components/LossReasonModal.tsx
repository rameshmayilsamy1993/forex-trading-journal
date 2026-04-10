import { useState, useEffect, useRef } from 'react';
import { X, Upload, Image, Save, AlertCircle, Check, ZoomIn, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import apiService from '../services/apiService';
import DOMPurify from 'dompurify';

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
}

export default function LossReasonModal({
  isOpen,
  onClose,
  tradeId,
  tradeData,
  existingAnalysis,
  mode
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Keyboard support for lightbox
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
  }, [existingAnalysis, isOpen]);

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
      if (mode === 'add') {
        await apiService.lossAnalysis.create({
          tradeId,
          title,
          reasonType,
          description,
          images,
          tags: tags.filter(t => t.trim()),
          disciplineScore
        });
      } else if (existingAnalysis) {
        await apiService.lossAnalysis.update(existingAnalysis._id, {
          title,
          reasonType,
          description,
          images,
          tags: tags.filter(t => t.trim()),
          disciplineScore
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'view' ? 'View Loss Analysis' : 'Add Loss Reason'}
            </h2>
            {tradeData && (
              <p className="text-sm text-slate-500 mt-1">
                {tradeData.pair} {tradeData.type} | Entry: {tradeData.entryPrice} | Exit: {tradeData.exitPrice} | P/L: 
                <span className={tradeData.profit < 0 ? 'text-red-600' : 'text-emerald-600'}>
                  {' '}{tradeData.profit.toFixed(2)}
                </span>
              </p>
            )}
            {existingAnalysis && (
              <span className={`ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                existingAnalysis.isValidTrade 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {existingAnalysis.isValidTrade ? '✅ Valid Loss' : '❌ Mistake'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Reason Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Reason Type <span className="text-red-500">*</span>
            </label>
            <select
              value={reasonType}
              onChange={(e) => setReasonType(e.target.value)}
              disabled={mode === 'view'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select reason...</option>
              <optgroup label="❌ Mistake (Trading Error)">
                {MISTAKE_REASONS.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </optgroup>
              <optgroup label="✅ Valid Loss (Good Execution)">
                {VALID_LOSS_REASONS.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </optgroup>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Not all losses are mistakes. Select "Valid Loss" if trade followed your plan.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={mode === 'view'}
              placeholder="Brief summary..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description (What went wrong?)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={mode === 'view'}
              rows={4}
              placeholder="Describe what happened and what you would do differently..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Chart Images - Premium Grid */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Chart Images
            </label>
            <div className="grid grid-cols-2 gap-4">
              {TIMEFRAMES.map(tf => {
                const img = images.find(i => i.timeframe === tf);
                const imgIndex = images.findIndex(i => i.timeframe === tf);
                return (
                  <div key={tf} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{tf} Chart</span>
                      {img && (
                        <span className="text-xs text-emerald-600 font-medium">Uploaded</span>
                      )}
                    </div>
                    <div className="relative group">
                      <div className={`
                        relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300
                        ${img 
                          ? 'border-slate-200 shadow-md hover:shadow-lg cursor-pointer' 
                          : 'border-dashed border-slate-300 bg-slate-50'
                        }
                      `}>
                        {img ? (
                          <>
                            <img 
                              src={img.url} 
                              alt={tf} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer pointer-events-auto"
                              onClick={() => {
                                console.log('=== IMAGE CLICK ===');
                                console.log('Image index:', imgIndex);
                                console.log('Image URL:', img.url);
                                setLightboxIndex(imgIndex);
                                setLightboxOpen(true);
                              }}
                            />
                            {/* Hover overlay - with click to open */}
                            <div 
                              className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                              onClick={() => {
                                console.log('=== OVERLAY CLICK ===');
                                console.log('Opening lightbox at index:', imgIndex);
                                setLightboxIndex(imgIndex);
                                setLightboxOpen(true);
                              }}
                            >
                              <div className="bg-white/90 rounded-full p-3 shadow-lg transform group-hover:scale-110 transition-transform">
                                <ZoomIn className="w-6 h-6 text-slate-700" />
                              </div>
                            </div>
                            {/* Timeframe badge */}
                            <span className="absolute top-2 left-2 px-2 py-1 bg-slate-900/70 text-white text-xs font-medium rounded-md backdrop-blur-sm">
                              {tf}
                            </span>
                            {/* Remove button */}
                            {mode !== 'view' && (
                              <button
                                onClick={() => removeImage(images.indexOf(img))}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : mode !== 'view' ? (
                          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-100 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                              <Upload className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-600">Upload {tf}</span>
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
                            <Image className="w-10 h-10 mb-2 opacity-50" />
                            <span className="text-sm">No chart uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discipline Score */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Discipline Score (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  onClick={() => {
                    if (mode !== 'view') setDisciplineScore(score);
                  }}
                  disabled={mode === 'view'}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    disciplineScore >= score
                      ? score <= 2 ? 'bg-red-500 text-white' : score <= 3 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          {/* Render Description (View Mode) */}
          {mode === 'view' && description && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Analysis
              </label>
              <div 
                className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {mode !== 'view' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-700 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || uploading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Analysis
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && images.length > 0 && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation - Previous */}
          {images.length > 1 && lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Main image */}
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
              {/* Timeframe badge */}
              <span className="absolute bottom-4 left-4 px-3 py-1.5 bg-slate-900/80 text-white text-sm font-medium rounded-md backdrop-blur-sm">
                {images[lightboxIndex]?.timeframe} Chart
              </span>
            </div>
            
            {/* Image counter */}
            {images.length > 1 && (
              <div className="mt-4 flex items-center gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === lightboxIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Navigation - Next */}
          {images.length > 1 && lightboxIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Keyboard hints */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            Press ESC to close • ← → to navigate
          </div>
        </div>
      )}
    </div>
  );
}