import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Code, Quote,
  Upload, X, GripVertical, Image, ChevronRight, ChevronLeft,
  Save, Eye, Clock, BookOpen, AlertTriangle, Edit3
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import apiService from '../../services/apiService';
import { cn } from '../ui/utils';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];
const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const;
const CURRENT_YEAR = new Date().getFullYear();
const AUTOSAVE_INTERVAL = 30000;

const inputClass = "h-12 rounded-[14px] border border-[#E2E8F0] bg-white px-4 text-[15px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] transition-all duration-200 outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 w-full";
const selectTriggerClass = "h-12 rounded-[14px] border border-[#E2E8F0] bg-white px-4 text-[15px] font-medium text-[#0F172A] transition-all duration-200 outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 w-full";
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
  onClick, isActive, children, title
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
          ? 'bg-[#7C3AED] text-white shadow-sm shadow-[#7C3AED]/30'
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
    <div className="group relative bg-white rounded-xl border border-[#E2E8F0] overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#7C3AED]/30">
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

export default function MonthlyReviewForm() {
  const isEditMode = !!(window as any).__monthlyReviewEditId;
  const reviewId = (window as any).__monthlyReviewEditId || null;
  const formRef = useRef<HTMLDivElement>(null);

  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [pair, setPair] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR.toString());
  const [bias, setBias] = useState('');
  const [theme, setTheme] = useState('');
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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[600px] px-6 py-4 text-[15px] text-[#0F172A]',
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
    Promise.all([
      apiService.monthlyReviews.getById(reviewId),
    ]).then(([review]) => {
      setPair(review.pair || '');
      setMonth(review.month?.toString() || '');
      setYear(review.year?.toString() || '');
      setBias(review.bias || '');
      setTheme(review.title || '');
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
    }).catch((err) => {
      console.error('Failed to load review:', err);
      setError('Failed to load review data.');
      setIsLoading(false);
    });
  }, [isEditMode, reviewId, editor]);

  const getFormData = useCallback(() => ({
    pair,
    month: parseInt(month),
    year: parseInt(year),
    bias: bias || undefined,
    title: theme || undefined,
    summary: editor?.getHTML() || '',
    status,
  }), [pair, month, year, bias, theme, editor, status]);

  const handleSave = useCallback(async (publishStatus?: string) => {
    if (!pair || !month || !year) {
      setError('Pair, Month, and Year are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = getFormData();
      if (publishStatus) payload.status = publishStatus;

      let saved;
      if (isEditMode && reviewId) {
        saved = await apiService.monthlyReviews.update(reviewId, payload);
      } else {
        saved = await apiService.monthlyReviews.create(payload);
        (window as any).__monthlyReviewEditId = saved.id || saved._id;
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
        await apiService.monthlyReviews.createEntry(savedId, entryPayload);
      }

      setIsDirty(false);
      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Failed to save:', err);
      setError(err?.message || 'Failed to save review.');
    } finally {
      setIsSaving(false);
    }
  }, [pair, month, year, getFormData, isEditMode, reviewId, images]);

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
    (window as any).__monthlyReviewEditId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'monthly-review' }));
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

  const monthLabel = month ? MONTHS.find(m => m.value === parseInt(month))?.label : '';

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-64 bg-slate-200 rounded" />
          <div className="h-10 w-96 bg-slate-200 rounded" />
          <div className="h-6 w-72 bg-slate-200 rounded" />
          <div className="grid grid-cols-[1.4fr_1fr] gap-8">
            <div className="space-y-4">
              <div className="h-64 bg-slate-200 rounded-2xl" />
              <div className="h-[600px] bg-slate-200 rounded-2xl" />
            </div>
            <div className="h-96 bg-slate-200 rounded-2xl" />
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
        <button type="button" onClick={handleBack} className="hover:text-[#7C3AED] transition-colors">Monthly Market Review</button>
        <ChevronRight className="size-3.5 text-[#CBD5E1]" />
        <span className="text-[#0F172A]">{isEditMode ? 'Edit Review' : 'Create Review'}</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#0F172A] tracking-[-0.02em]">
            {isEditMode ? 'Edit Review' : 'Create Monthly Review'}
          </h1>
          <p className="text-[15px] font-medium text-[#64748B] mt-1.5">
            {isEditMode
              ? 'Update your higher timeframe analysis.'
              : 'Document your higher timeframe analysis for the entire month.'}
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
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED] bg-[#7C3AED]/10 px-3 py-1.5 rounded-full">
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
        <div className={cn(cardClass, "p-8")}>
          <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] mb-6">Review Information</h2>
          <div className="space-y-6">
            {/* Pair */}
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

            {/* Month + Year */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className={labelClass}>Month *</Label>
                <Select value={month} onValueChange={(v) => { setMonth(v); setIsDirty(true); }}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()} className="text-[14px] font-medium">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Year *</Label>
                <Select value={year} onValueChange={(v) => { setYear(v); setIsDirty(true); }}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i).map((y) => (
                      <SelectItem key={y} value={y.toString()} className="text-[14px] font-medium">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bias */}
            <div className="space-y-2">
              <Label className={labelClass}>Initial Bias</Label>
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

            {/* Theme */}
            <div className="space-y-2">
              <Label className={labelClass}>Monthly Theme</Label>
              <input
                type="text"
                value={theme}
                onChange={(e) => { setTheme(e.target.value); setIsDirty(true); }}
                placeholder="e.g., Breakout month after consolidation"
                className={inputClass}
              />
            </div>

            {/* Status */}
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

        {/* RIGHT PANEL - Live Summary Card */}
        <div className="sticky top-24 space-y-5">
          <div className={`${cardClass} overflow-hidden`}>
            <div className="h-2 bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#4F46E5]" />
            <div className="p-6 space-y-5">
              <h3 className="text-[16px] font-bold text-[#0F172A]">Live Summary</h3>

              <div className="min-h-[200px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-center">
                {pair ? (
                  <div className="text-center p-6">
                    <p className="text-[32px] font-bold text-[#0F172A] tracking-[-0.02em]">{pair}</p>
                    {monthLabel && year && (
                      <p className="text-[15px] font-medium text-[#64748B] mt-1">{monthLabel} {year}</p>
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

      {/* NOTES EDITOR - Full Width */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="p-8 pb-0">
          <h2 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.02em]">Notes</h2>
          <p className="text-[14px] font-medium text-[#64748B] mt-1 mb-5">
            Document your market analysis, observations, and expectations.
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
          <div className="min-h-[600px]">
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

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="relative rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-10 text-center transition-all duration-200 hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/5 cursor-pointer group"
          onClick={() => document.getElementById('review-image-upload')?.click()}
        >
          <Upload className="size-10 text-[#94A3B8] mx-auto mb-3 group-hover:text-[#7C3AED] transition-colors" />
          <p className="text-[15px] font-medium text-[#64748B]">Drop images here or click to browse</p>
          <p className="text-[13px] font-medium text-[#94A3B8] mt-1">PNG, JPEG, WEBP — up to 10MB each</p>
          <input
            id="review-image-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) => handleImageUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Preview Grid */}
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
              className="text-[14px] font-semibold px-6 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] shadow-lg shadow-[#7C3AED]/25 hover:shadow-xl hover:shadow-[#7C3AED]/30"
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

export { MonthlyReviewForm };
