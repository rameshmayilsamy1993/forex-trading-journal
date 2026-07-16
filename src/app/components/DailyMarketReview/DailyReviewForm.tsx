import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Code, Quote,
  Upload, X, ChevronRight, ChevronLeft,
  Save, Clock, BookOpen, AlertTriangle,
  Target, Layers,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import apiService from '../../services/apiService';
import { cn } from '../ui/utils';

const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];
const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const;
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const AUTOSAVE_INTERVAL = 30000;

const inputClass = "h-12 rounded-[14px] border border-[#E2E8F0] bg-white px-4 text-[15px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] transition-all duration-200 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full";
const textareaClass = "rounded-[14px] border border-[#E2E8F0] bg-white px-4 py-3 text-[15px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] transition-all duration-200 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full resize-none";
const selectTriggerClass = "h-12 rounded-[14px] border border-[#E2E8F0] bg-white px-4 text-[15px] font-medium text-[#0F172A] transition-all duration-200 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full";
const labelClass = "text-[14px] font-semibold text-[#334155]";
const cardClass = "bg-white rounded-2xl border border-[#E5EAF2] shadow-[0_8px_24px_rgba(15,23,42,0.08)]";

interface ImageItem {
  id: string;
  file?: File;
  url?: string;
  publicId?: string;
  caption: string;
  preview?: string;
}

function ToolbarButton({
  onClick, isActive, children, title,
}: {
  onClick: () => void; isActive?: boolean; children: React.ReactNode; title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/30'
          : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
      )}
    >
      {children}
    </button>
  );
}

function ImagePreviewCard({
  image, index, total, onDelete, onMoveUp, onMoveDown, onCaptionChange,
}: {
  image: ImageItem; index: number; total: number;
  onDelete: () => void; onMoveUp?: () => void; onMoveDown?: () => void;
  onCaptionChange: (caption: string) => void;
}) {
  return (
    <div className="group relative bg-white rounded-xl border border-[#E2E8F0] overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#2563EB]/30">
      <div className="relative aspect-video bg-[#F8FAFC] overflow-hidden">
        <img
          src={image.preview || image.url}
          alt={image.caption || 'Review image'}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
        >
          <X className="size-3.5" />
        </button>
        {total > 1 && (
          <div className="absolute left-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {index > 0 && (
              <button type="button" onClick={onMoveUp} className="p-1.5 bg-white/90 text-[#64748B] rounded-lg hover:bg-white hover:text-[#0F172A] shadow-sm">
                <ChevronLeft className="size-3.5" />
              </button>
            )}
            {index < total - 1 && (
              <button type="button" onClick={onMoveDown} className="p-1.5 bg-white/90 text-[#64748B] rounded-lg hover:bg-white hover:text-[#0F172A] shadow-sm">
                <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="p-2">
        <input
          type="text"
          value={image.caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Add caption..."
          className="w-full text-[13px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] bg-transparent border-none outline-none focus:outline-none"
        />
      </div>
    </div>
  );
}

export default function DailyReviewForm() {
  const isEditMode = !!(window as any).__dailyReviewEditId;
  const reviewId = (window as any).__dailyReviewEditId || null;
  const formRef = useRef<HTMLDivElement>(null);

  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [pair, setPair] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [bias, setBias] = useState('');
  const [expectedDirection, setExpectedDirection] = useState('');
  const [htfBias, setHtfBias] = useState('');
  const [crtDirection, setCrtDirection] = useState('');
  const [premium, setPremium] = useState('');
  const [discount, setDiscount] = useState('');
  const [liquidityDirection, setLiquidityDirection] = useState('');
  const [liquidityTarget, setLiquidityTarget] = useState('');
  const [expectedSweep, setExpectedSweep] = useState('');
  const [expectedCrt, setExpectedCrt] = useState('');
  const [expectedSmt, setExpectedSmt] = useState('');
  const [expectedSession, setExpectedSession] = useState('');
  const [killZone, setKillZone] = useState('');
  const [expansion, setExpansion] = useState('');
  const [narrative, setNarrative] = useState('');
  const [pdh, setPdh] = useState('');
  const [pdl, setPdl] = useState('');
  const [pdo, setPdo] = useState('');
  const [previousRange, setPreviousRange] = useState('');
  const [previousClose, setPreviousClose] = useState('');
  const [previousHigh, setPreviousHigh] = useState('');
  const [previousLow, setPreviousLow] = useState('');
  const [adr, setAdr] = useState('');
  const [biasConfidence, setBiasConfidence] = useState(50);
  const [status, setStatus] = useState('Draft');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4 text-[15px] text-[#0F172A]',
      },
    },
    onUpdate: () => { setIsDirty(true); },
  });

  const totalWords = editor?.storage?.characterCount?.words?.() || 0;
  const readingTime = Math.max(1, Math.ceil(totalWords / 200));

  useEffect(() => {
    apiService.settings.getPairs()
      .then(setPairs)
      .catch(() => setPairs(DEFAULT_PAIRS));
  }, []);

  useEffect(() => {
    if (!isEditMode || !reviewId) return;
    setIsLoading(true);
    apiService.dailyReviews.getById(reviewId)
      .then((review) => {
        setPair(review.pair || '');
        setDate(review.date?.split('T')[0] || '');
        setDayOfWeek(review.dayOfWeek || '');
        setBias(review.bias || '');
        setExpectedDirection(review.expectedDirection || '');
        setHtfBias(review.htfBias || '');
        setCrtDirection(review.crtDirection || '');
        setPremium(review.premium || '');
        setDiscount(review.discount || '');
        setLiquidityDirection(review.liquidityDirection || '');
        setLiquidityTarget(review.liquidityTarget || '');
        setExpectedSweep(review.expectedSweep || '');
        setExpectedCrt(review.expectedCrt || '');
        setExpectedSmt(review.expectedSmt || '');
        setExpectedSession(review.expectedSession || '');
        setKillZone(review.killZone || '');
        setExpansion(review.expansion || '');
        setNarrative(review.narrative || '');
        setPdh(review.pdh?.toString() || '');
        setPdl(review.pdl?.toString() || '');
        setPdo(review.pdo?.toString() || '');
        setPreviousRange(review.previousRange?.toString() || '');
        setPreviousClose(review.previousClose?.toString() || '');
        setPreviousHigh(review.previousHigh?.toString() || '');
        setPreviousLow(review.previousLow?.toString() || '');
        setAdr(review.adr?.toString() || '');
        setBiasConfidence(review.biasConfidence ?? 50);
        setStatus(review.status || 'Draft');
        setLastSaved(new Date(review.updatedAt));
        if (review.images?.length) {
          setImages(review.images.map((img: any, i: number) => ({
            id: `img-${i}-${Date.now()}`,
            url: img.url,
            publicId: img.publicId,
            caption: img.caption || '',
          })));
        }
        if (editor && review.summary) {
          editor.commands.setContent(review.summary);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load review:', err);
        setError('Failed to load review data.');
        setIsLoading(false);
      });
  }, [isEditMode, reviewId, editor]);

  const getFormData = useCallback(() => ({
    pair,
    date,
    dayOfWeek: dayOfWeek || undefined,
    bias: bias || undefined,
    expectedDirection,
    htfBias,
    crtDirection,
    premium,
    discount,
    liquidityDirection,
    liquidityTarget,
    expectedSweep,
    expectedCrt,
    expectedSmt,
    expectedSession,
    killZone,
    expansion,
    narrative,
    pdh: pdh ? parseFloat(pdh) : undefined,
    pdl: pdl ? parseFloat(pdl) : undefined,
    pdo: pdo ? parseFloat(pdo) : undefined,
    previousRange: previousRange ? parseFloat(previousRange) : undefined,
    previousClose: previousClose ? parseFloat(previousClose) : undefined,
    previousHigh: previousHigh ? parseFloat(previousHigh) : undefined,
    previousLow: previousLow ? parseFloat(previousLow) : undefined,
    adr: adr ? parseFloat(adr) : undefined,
    biasConfidence,
    summary: editor?.getHTML() || '',
    status,
  }), [pair, date, dayOfWeek, bias, expectedDirection, htfBias, crtDirection,
    premium, discount, liquidityDirection, liquidityTarget, expectedSweep,
    expectedCrt, expectedSmt, expectedSession, killZone, expansion, narrative,
    pdh, pdl, pdo, previousRange, previousClose, previousHigh, previousLow, adr,
    biasConfidence, editor, status]);

  const handleSave = useCallback(async (publishStatus?: string) => {
    if (!pair || !date) {
      setError('Pair and Date are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = getFormData();
      if (publishStatus) payload.status = publishStatus;

      let saved;
      if (isEditMode && reviewId) {
        saved = await apiService.dailyReviews.update(reviewId, payload);
      } else {
        saved = await apiService.dailyReviews.create(payload);
        (window as any).__dailyReviewEditId = saved.id || saved._id;
      }

      if (images.length > 0) {
        for (const img of images) {
          if (img.file && !img.url) {
            const uploadResult = await apiService.upload.single(img.file);
            img.url = uploadResult.url;
            img.publicId = uploadResult.publicId;
            delete img.file;
            delete img.preview;
          }
        }
        const entryPayload = {
          entryTitle: 'Initial chart images',
          comment: '',
          images: images.map(img => ({
            url: img.url,
            publicId: img.publicId,
            caption: img.caption,
          })),
        };
        const savedId = saved.id || saved._id;
        await apiService.dailyReviews.createEntry(savedId, entryPayload);
      }

      setIsDirty(false);
      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Failed to save:', err);
      setError(err?.message || 'Failed to save review.');
    } finally {
      setIsSaving(false);
    }
  }, [pair, date, getFormData, isEditMode, reviewId, images]);

  useEffect(() => {
    if (!isDirty) return;
    const timer = setInterval(() => { handleSave(); }, AUTOSAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [isDirty, handleSave]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleBack = () => {
    (window as any).__dailyReviewEditId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'daily-review' }));
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;
    const newImages: ImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type)) continue;
      if (file.size > maxSize) continue;
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push({
          id: `img-${Date.now()}-${i}`,
          file,
          caption: '',
          preview: reader.result as string,
        });
        if (newImages.length === files.length || i === files.length - 1) {
          setImages(prev => [...prev, ...newImages]);
          setIsDirty(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleImageUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setIsDirty(true);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    setImages(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
    setIsDirty(true);
  };

  const updateImageCaption = (id: string, caption: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, caption } : img));
    setIsDirty(true);
  };

  const biasVariant = (b: string): 'success' | 'destructive' | 'secondary' => {
    if (b === 'Bullish') return 'success';
    if (b === 'Bearish') return 'destructive';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-64 bg-slate-200 rounded" />
          <div className="h-10 w-96 bg-slate-200 rounded" />
          <div className="h-6 w-72 bg-slate-200 rounded" />
          <div className="grid grid-cols-[1.4fr_1fr] gap-8">
            <div className="space-y-4">
              <div className="h-48 bg-slate-200 rounded-2xl" />
              <div className="h-64 bg-slate-200 rounded-2xl" />
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={formRef} className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
        <span>Analysis</span>
        <ChevronRight className="size-3.5 text-[#CBD5E1]" />
        <button type="button" onClick={handleBack} className="hover:text-[#2563EB] transition-colors">Daily Market Review</button>
        <ChevronRight className="size-3.5 text-[#CBD5E1]" />
        <span className="text-[#0F172A]">{isEditMode ? 'Edit Review' : 'Create Review'}</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#0F172A] tracking-[-0.02em]">
            {isEditMode ? 'Edit Daily Review' : 'Create Daily Review'}
          </h1>
          <p className="text-[15px] font-medium text-[#64748B] mt-1.5">
            {isEditMode
              ? 'Update your daily market analysis.'
              : 'Document your daily market analysis and key levels.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#EA580C] bg-[#EA580C]/10 px-3 py-1.5 rounded-full">
              <AlertTriangle className="size-3.5" /> Unsaved changes
            </span>
          )}
          {lastSaved && !isDirty && (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#16A34A] bg-[#16A34A]/10 px-3 py-1.5 rounded-full">
              <Save className="size-3.5" /> Saved
            </span>
          )}
          {isSaving && (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#2563EB] bg-[#2563EB]/10 px-3 py-1.5 rounded-full">
              <Clock className="size-3.5 animate-spin" /> Saving...
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-[14px] font-medium text-red-700">
          <AlertTriangle className="size-4 shrink-0" /> {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main Content - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        {/* LEFT PANEL - Form Fields */}
        <div className="space-y-8">
          {/* Basic Info */}
          <div className={cn(cardClass, "p-8")}>
            <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] mb-6">Review Information</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className={labelClass}>Pair *</Label>
                <Select value={pair} onValueChange={(v) => { setPair(v); setIsDirty(true); }}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select trading pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {pairs.map((p) => (
                      <SelectItem key={p} value={p} className="text-[14px] font-medium">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className={labelClass}>Date *</Label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setIsDirty(true); }}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={(v) => { setDayOfWeek(v); setIsDirty(true); }}>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d} className="text-[14px] font-medium">{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className={labelClass}>Bias</Label>
                <div className="flex gap-2">
                  {BIAS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { setBias(bias === option ? '' : option); setIsDirty(true); }}
                      className={cn(
                        'flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200',
                        bias === option
                          ? option === 'Bullish'
                            ? 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
                            : option === 'Bearish'
                              ? 'bg-[#DC2626] text-white shadow-md shadow-[#DC2626]/25'
                              : 'bg-[#64748B] text-white shadow-md shadow-[#64748B]/25'
                          : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F172A] bg-white'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className={labelClass}>Bias Confidence</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={biasConfidence}
                    onChange={(e) => { setBiasConfidence(Number(e.target.value)); setIsDirty(true); }}
                    className="w-full h-2 bg-[#E2E8F0] rounded-full appearance-none cursor-pointer accent-[#2563EB]"
                  />
                  <span className="text-[15px] font-bold text-[#0F172A] w-12 text-right">{biasConfidence}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className={labelClass}>Status</Label>
                <Select value={status} onValueChange={(v) => { setStatus(v); setIsDirty(true); }}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft" className="text-[14px] font-medium">Draft</SelectItem>
                    <SelectItem value="Published" className="text-[14px] font-medium">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Daily Analysis */}
          <div className={cn(cardClass, "p-8")}>
            <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] mb-1 flex items-center gap-2">
              <Target className="size-5 text-[#2563EB]" />
              Daily Analysis
            </h2>
            <p className="text-[14px] font-medium text-[#64748B] mb-6">Document your daily market outlook.</p>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className={labelClass}>Expected Direction</Label>
                <input
                  type="text"
                  value={expectedDirection}
                  onChange={(e) => { setExpectedDirection(e.target.value); setIsDirty(true); }}
                  placeholder="e.g., Bullish continuation toward PDH"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>HTF Bias</Label>
                <input
                  type="text"
                  value={htfBias}
                  onChange={(e) => { setHtfBias(e.target.value); setIsDirty(true); }}
                  placeholder="Higher timeframe bias context"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>CRT Direction</Label>
                <input
                  type="text"
                  value={crtDirection}
                  onChange={(e) => { setCrtDirection(e.target.value); setIsDirty(true); }}
                  placeholder="Change in Role of Trade direction"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Narrative</Label>
                <textarea
                  value={narrative}
                  onChange={(e) => { setNarrative(e.target.value); setIsDirty(true); }}
                  placeholder="Describe the daily narrative..."
                  rows={4}
                  className={textareaClass}
                />
              </div>
            </div>
          </div>

          {/* Key Levels */}
          <div className={cn(cardClass, "p-8")}>
            <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] mb-1 flex items-center gap-2">
              <Layers className="size-5 text-[#2563EB]" />
              Key Levels
            </h2>
            <p className="text-[14px] font-medium text-[#64748B] mb-6">Set your daily key price levels.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelClass}>PDH</Label>
                <input type="number" step="any" value={pdh} onChange={(e) => { setPdh(e.target.value); setIsDirty(true); }} placeholder="0.00000" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>PDL</Label>
                <input type="number" step="any" value={pdl} onChange={(e) => { setPdl(e.target.value); setIsDirty(true); }} placeholder="0.00000" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>PDO</Label>
                <input type="number" step="any" value={pdo} onChange={(e) => { setPdo(e.target.value); setIsDirty(true); }} placeholder="0.00000" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>ADR</Label>
                <input type="number" step="any" value={adr} onChange={(e) => { setAdr(e.target.value); setIsDirty(true); }} placeholder="0.00000" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Previous High</Label>
                <input type="number" step="any" value={previousHigh} onChange={(e) => { setPreviousHigh(e.target.value); setIsDirty(true); }} placeholder="0.00000" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Previous Low</Label>
                <input type="number" step="any" value={previousLow} onChange={(e) => { setPreviousLow(e.target.value); setIsDirty(true); }} placeholder="0.00000" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Previous Close</Label>
                <input type="number" step="any" value={previousClose} onChange={(e) => { setPreviousClose(e.target.value); setIsDirty(true); }} placeholder="0.00000" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Previous Range</Label>
                <input type="number" step="any" value={previousRange} onChange={(e) => { setPreviousRange(e.target.value); setIsDirty(true); }} placeholder="0.00000" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Liquidity & Zones */}
          <div className={cn(cardClass, "p-8")}>
            <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] mb-1">Liquidity & Zones</h2>
            <p className="text-[14px] font-medium text-[#64748B] mb-6">Define liquidity and key zones.</p>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className={labelClass}>Premium Zone</Label>
                <input type="text" value={premium} onChange={(e) => { setPremium(e.target.value); setIsDirty(true); }} placeholder="Premium zone" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Discount Zone</Label>
                <input type="text" value={discount} onChange={(e) => { setDiscount(e.target.value); setIsDirty(true); }} placeholder="Discount zone" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Liquidity Direction</Label>
                <input type="text" value={liquidityDirection} onChange={(e) => { setLiquidityDirection(e.target.value); setIsDirty(true); }} placeholder="Liquidity direction" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Liquidity Target</Label>
                <input type="text" value={liquidityTarget} onChange={(e) => { setLiquidityTarget(e.target.value); setIsDirty(true); }} placeholder="Primary liquidity target" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Expected Sweep</Label>
                <input type="text" value={expectedSweep} onChange={(e) => { setExpectedSweep(e.target.value); setIsDirty(true); }} placeholder="Expected liquidity sweep" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Expansion</Label>
                <input type="text" value={expansion} onChange={(e) => { setExpansion(e.target.value); setIsDirty(true); }} placeholder="Expected expansion" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Expected CRT</Label>
                <input type="text" value={expectedCrt} onChange={(e) => { setExpectedCrt(e.target.value); setIsDirty(true); }} placeholder="Change in Role of State" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Expected SMT</Label>
                <input type="text" value={expectedSmt} onChange={(e) => { setExpectedSmt(e.target.value); setIsDirty(true); }} placeholder="Smart Money Technique" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className={cn(cardClass, "p-8")}>
            <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] mb-1">Sessions</h2>
            <p className="text-[14px] font-medium text-[#64748B] mb-6">Configure session expectations.</p>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className={labelClass}>Expected Session</Label>
                <input type="text" value={expectedSession} onChange={(e) => { setExpectedSession(e.target.value); setIsDirty(true); }} placeholder="e.g., London/NY" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Kill Zone</Label>
                <input type="text" value={killZone} onChange={(e) => { setKillZone(e.target.value); setIsDirty(true); }} placeholder="e.g., 2-4 AM EST" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Live Summary Card */}
        <div className="sticky top-24 space-y-5">
          <div className={`${cardClass} overflow-hidden`}>
            <div className="h-2 bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#1E40AF]" />
            <div className="p-6 space-y-5">
              <h3 className="text-[16px] font-bold text-[#0F172A]">Live Summary</h3>

              <div className="min-h-[200px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-center">
                {pair ? (
                  <div className="text-center p-6">
                    <p className="text-[32px] font-bold text-[#0F172A] tracking-[-0.02em]">{pair}</p>
                    {date && (
                      <p className="text-[15px] font-medium text-[#64748B] mt-1">{date}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <BarChart3 className="size-10 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-[13px] font-medium text-[#94A3B8]">Select a pair to preview</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {pair && (
                  <div className="flex items-center gap-2">
                    {bias ? (
                      <Badge variant={biasVariant(bias)} className="text-[12px] px-3 py-1">
                        {bias}
                      </Badge>
                    ) : (
                      <span className="text-[12px] font-medium text-[#94A3B8]">No bias set</span>
                    )}
                    <Badge variant="outline" className="text-[12px]">{status}</Badge>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#64748B]">Confidence</span>
                    <span className="font-semibold text-[#0F172A]">{biasConfidence}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#64748B]">Images</span>
                    <span className="font-semibold text-[#0F172A]">{images.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#64748B]">Reading time</span>
                    <span className="font-semibold text-[#0F172A]">{readingTime} min</span>
                  </div>
                  {lastSaved && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-[#64748B]">Last saved</span>
                      <span className="font-semibold text-[#0F172A]">
                        {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NOTES EDITOR */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="p-8 pb-0">
          <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em]">Notes</h2>
          <p className="text-[14px] font-medium text-[#64748B] mt-1 mb-5">
            Document your detailed market observations and analysis.
          </p>
        </div>
        <div className="border-t border-[#E2E8F0]">
          <div className="sticky top-0 z-10 flex flex-wrap gap-1 p-2 bg-white border-b border-[#E2E8F0]">
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive('bold')} title="Bold (Ctrl+B)">
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive('italic')} title="Italic">
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} isActive={editor?.isActive('underline')} title="Underline">
              <UnderlineIcon className="size-4" />
            </ToolbarButton>
            <div className="w-px bg-[#E2E8F0] mx-1" />
            <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor?.isActive('heading', { level: 2 })} title="Heading">
              <Heading2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor?.isActive('heading', { level: 3 })} title="Subheading">
              <Heading1 className="size-4" />
            </ToolbarButton>
            <div className="w-px bg-[#E2E8F0] mx-1" />
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} isActive={editor?.isActive('bulletList')} title="Bullet List">
              <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} isActive={editor?.isActive('orderedList')} title="Ordered List">
              <ListOrdered className="size-4" />
            </ToolbarButton>
            <div className="w-px bg-[#E2E8F0] mx-1" />
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} isActive={editor?.isActive('blockquote')} title="Quote">
              <Quote className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleCode().run()} isActive={editor?.isActive('code')} title="Code">
              <Code className="size-4" />
            </ToolbarButton>
            <div className="w-px bg-[#E2E8F0] mx-1" />
            <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('left').run()} isActive={editor?.isActive({ textAlign: 'left' })} title="Align Left">
              <AlignLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('center').run()} isActive={editor?.isActive({ textAlign: 'center' })} title="Center">
              <AlignCenter className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('right').run()} isActive={editor?.isActive({ textAlign: 'right' })} title="Align Right">
              <AlignRight className="size-4" />
            </ToolbarButton>
          </div>
          <div className="min-h-[400px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* IMAGE UPLOAD SECTION */}
      <div className={cn(cardClass, "p-8")}>
        <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] mb-1">Images</h2>
        <p className="text-[14px] font-medium text-[#64748B] mb-6">
          Upload charts, screenshots, and visual notes. PNG, JPEG, or WEBP (max 10MB each).
        </p>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="relative rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-10 text-center transition-all duration-200 hover:border-[#2563EB]/40 hover:bg-[#2563EB]/5 cursor-pointer group"
          onClick={() => document.getElementById('daily-review-image-upload')?.click()}
        >
          <Upload className="size-10 text-[#94A3B8] mx-auto mb-3 group-hover:text-[#2563EB] transition-colors" />
          <p className="text-[15px] font-medium text-[#64748B]">Drop images here or click to browse</p>
          <p className="text-[13px] font-medium text-[#94A3B8] mt-1">PNG, JPEG, WEBP — up to 10MB each</p>
          <input
            id="daily-review-image-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) => handleImageUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
            {images.map((img, index) => (
              <ImagePreviewCard
                key={img.id}
                image={img}
                index={index}
                total={images.length}
                onDelete={() => removeImage(img.id)}
                onMoveUp={index > 0 ? () => moveImage(index, -1) : undefined}
                onMoveDown={index < images.length - 1 ? () => moveImage(index, 1) : undefined}
                onCaptionChange={(caption) => updateImageCaption(img.id, caption)}
              />
            ))}
          </div>
        )}
      </div>

      {/* STICKY BOTTOM FOOTER */}
      <div className="sticky bottom-0 z-20 -mx-6 px-6 py-4 bg-white border-t border-[#E2E8F0] shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={handleBack} className="text-[14px]">
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave('Draft')}
              disabled={isSaving}
              className="text-[14px] font-semibold px-6"
            >
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => handleSave('Published')}
              disabled={isSaving}
              className="text-[14px] font-semibold px-6 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-lg shadow-[#2563EB]/25 hover:shadow-xl hover:shadow-[#2563EB]/30"
            >
              {isSaving ? 'Publishing...' : 'Publish Review'}
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer for sticky footer */}
      <div className="h-16" />
    </div>
  );
}

function BarChart3(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

export { DailyReviewForm };
