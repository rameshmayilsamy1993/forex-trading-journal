# Simplified Daily Market Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the Daily Market Review feature to a morning bias/CRT/images/notes entry with throughout-day structured updates.

**Architecture:** Keep the DailyReview → DailyReviewEntry backend pattern, but strip both models to essential fields only. Rewrite three frontend components (Form, Detail, new AddUpdateDialog) and simplify list/card views. Old fields are silently ignored by Mongoose — no data migration needed.

**Tech Stack:** Node.js/Express/Mongoose backend, React/Vite/TypeScript + Tailwind frontend.

## Global Constraints

- Backend controllers destructure body fields explicitly — must update both model AND controller field lists
- Existing Mongoose documents will retain old fields silently — no migration script
- No testing framework configured — verify manually via devtools/browser
- Follow existing code style (AGENTS.md): minimal comments, meaningful names, explicit types

---

### Task 1: Simplify DailyReview Backend Model

**Files:**
- Modify: `backend/src/modules/dailyReviews/dailyReview.model.js`
- Modify: `backend/src/modules/dailyReviews/dailyReview.controller.js`

- [ ] **Remove extra fields from dailyReview.model.js**

Remove these fields from the schema:
- `expectedDirection`, `htfBias`, `premium`, `discount`, `liquidityDirection`
- `pdh`, `pdl`, `pdo`, `previousRange`, `previousClose`, `previousHigh`, `previousLow`
- `adr`, `expansion`, `liquidityTarget`, `expectedSweep`, `expectedCrt`, `expectedSmt`, `expectedSession`, `killZone`
- `biasConfidence`, `status`

Keep: `userId`, `weeklyReviewId`, `pair`, `date`, `dayOfWeek`, `bias`, `crtDirection`, `narrative`

- [ ] **Simplify the `create` function destructuring in dailyReview.controller.js**

Replace lines 73-91:
```javascript
const { pair, date, weeklyReviewId, dayOfWeek, bias, crtDirection, narrative } = req.body;

if (!pair || !date) {
  return res.status(400).json({ message: 'Pair and date are required' });
}

const existing = await DailyReview.findOne({
  userId: req.session.userId, pair, date,
});
if (existing) {
  return res.status(409).json({ message: 'A review already exists for this pair and date' });
}

const review = new DailyReview({
  userId: req.session.userId, pair, date, weeklyReviewId, dayOfWeek, bias,
  crtDirection, narrative,
});
```

- [ ] **Verify backend still starts**

Run:
```bash
cd backend && node -e "require('./src/modules/dailyReviews/dailyReview.model'); console.log('model OK')"
```

Expected: `model OK`

- [ ] **Commit**

```bash
git add backend/src/modules/dailyReviews/dailyReview.model.js backend/src/modules/dailyReviews/dailyReview.controller.js
git commit -m "feat: simplify DailyReview model to essential fields"
```

---

### Task 2: Simplify DailyReviewEntry Backend Model

**Files:**
- Modify: `backend/src/modules/dailyReviews/dailyReviewEntry.model.js`
- Modify: `backend/src/modules/dailyReviews/dailyReviewEntry.controller.js`

- [ ] **Remove extra fields from dailyReviewEntry.model.js**

Remove these fields:
- `entryTime`, `tags`, `mood`, `importance`, `session`, `displayOrder`
- `checklistItems`, `tradeIdeas`, `entryModels`, `sessionPlans`, `screenshots`

Keep: `dailyReviewId`, `userId`, `entryTitle`, `comment`, `images[]`, `bias`

- [ ] **Simplify the `create` function in dailyReviewEntry.controller.js**

Replace lines 33-50:
```javascript
const { entryTitle, comment, images, bias } = req.body;

const entry = new DailyReviewEntry({
  dailyReviewId: reviewId,
  userId: req.session.userId,
  entryTitle: entryTitle || '',
  comment: comment || '',
  images: images || [],
  bias: bias || '',
});
```

- [ ] **Verify backend still starts**

Run:
```bash
cd backend && node -e "require('./src/modules/dailyReviews/dailyReviewEntry.model'); console.log('entry model OK')"
```

Expected: `entry model OK`

- [ ] **Commit**

```bash
git add backend/src/modules/dailyReviews/dailyReviewEntry.model.js backend/src/modules/dailyReviews/dailyReviewEntry.controller.js
git commit -m "feat: simplify DailyReviewEntry model to essential fields"
```

---

### Task 3: Create AddUpdateDialog Component

**Files:**
- Create: `src/app/components/DailyMarketReview/AddUpdateDialog.tsx`

- [ ] **Create AddUpdateDialog component**

```tsx
import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../services/apiService';
import { uploadImage } from '../../../services/uploadService';

interface AddUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  reviewId: string;
}

const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const;

export default function AddUpdateDialog({ open, onOpenChange, onSaved, reviewId }: AddUpdateDialogProps) {
  const [bias, setBias] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<{ file?: File; preview?: string; url?: string; publicId?: string; caption: string; }[]>([]);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, { file, preview: reader.result as string, caption: '' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const uploadedImages = [];
      for (const img of images) {
        if (img.file) {
          const result = await uploadImage(img.file);
          uploadedImages.push({ url: result.url, publicId: result.publicId, caption: img.caption });
        } else if (img.url) {
          uploadedImages.push({ url: img.url, publicId: img.publicId, caption: img.caption });
        }
      }

      await apiService.dailyReviews.createEntry(reviewId, {
        entryTitle: `Update ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        comment: notes,
        images: uploadedImages,
        bias: bias || undefined,
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save update:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-[#0F172A]">Add Market Update</h2>
              <button onClick={() => onOpenChange(false)} className="p-1 rounded-lg hover:bg-[#F1F5F9]">
                <X className="size-5 text-[#64748B]" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              <div>
                <label className="text-sm font-semibold text-[#334155]">Current Bias</label>
                <div className="flex gap-2 mt-1.5">
                  {BIAS_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBias(bias === option ? '' : option)}
                      className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        bias === option
                          ? option === 'Bullish'
                            ? 'bg-[#16A34A] text-white'
                            : option === 'Bearish'
                              ? 'bg-[#DC2626] text-white'
                              : 'bg-[#64748B] text-white'
                          : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#334155]">Screenshots</label>
                <div className="mt-1.5">
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {images.map((img, i) => (
                        <div key={i} className="relative aspect-video bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] overflow-hidden">
                          <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 p-0.5 bg-red-500/90 text-white rounded"
                          >
                            <X className="size-3" />
                          </button>
                          <input
                            value={img.caption}
                            onChange={e => setImages(prev => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))}
                            placeholder="Caption"
                            className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 text-xs bg-black/50 text-white placeholder:text-white/50 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center h-24 border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-all">
                    <Upload className="size-5 text-[#94A3B8]" />
                    <span className="text-sm text-[#64748B] ml-2">Upload screenshots</span>
                    <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e => handleImageUpload(e.target.files)} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#334155]">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What's happening in the market?"
                  rows={4}
                  className="w-full mt-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0]">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Update'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Commit**

```bash
git add src/app/components/DailyMarketReview/AddUpdateDialog.tsx
git commit -m "feat: add AddUpdateDialog for throughout-day market updates"
```

---

### Task 4: Rewrite DailyReviewForm

**Files:**
- Modify: `src/app/components/DailyMarketReview/DailyReviewForm.tsx`

- [ ] **Rewrite DailyReviewForm**

Replace the entire file content. The new form is a simple morning entry:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import apiService from '../../services/apiService';
import { uploadImage } from '../../../services/uploadService';

const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];

interface ImageItem {
  id: string;
  file?: File;
  url?: string;
  publicId?: string;
  caption: string;
  preview?: string;
}

const inputClass = "h-12 rounded-[14px] border border-[#E2E8F0] bg-white px-4 text-[15px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full";
const textareaClass = "rounded-[14px] border border-[#E2E8F0] bg-white px-4 py-3 text-[15px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full resize-none";
const selectTriggerClass = "h-12 rounded-[14px] border border-[#E2E8F0] bg-white px-4 text-[15px] font-medium text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full";
const labelClass = "text-[14px] font-semibold text-[#334155]";

export default function DailyReviewForm() {
  const isEditMode = !!(window as any).__dailyReviewEditId;
  const reviewId = (window as any).__dailyReviewEditId || null;

  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [pair, setPair] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bias, setBias] = useState('');
  const [crtDirection, setCrtDirection] = useState('');
  const [narrative, setNarrative] = useState('');
  const [newsScreenshot, setNewsScreenshot] = useState<ImageItem | null>(null);
  const [chartImages, setChartImages] = useState<ImageItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);

  const dayOfWeek = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : '';

  useEffect(() => {
    apiService.settings.getPairs()
      .then(setPairs)
      .catch(() => setPairs(DEFAULT_PAIRS));
  }, []);

  useEffect(() => {
    if (!isEditMode || !reviewId) return;
    apiService.dailyReviews.getById(reviewId)
      .then((review) => {
        setPair(review.pair || '');
        setDate(review.date?.split('T')[0] || '');
        setBias(review.bias || '');
        setCrtDirection(review.crtDirection || '');
        setNarrative(review.narrative || '');
        // Load entries to get images
        apiService.dailyReviews.getEntries(reviewId).then(entries => {
          const morningEntry = entries.find(e => e.entryTitle === 'Morning Setup');
          if (morningEntry) {
            if (morningEntry.images?.length > 0) {
              const news = morningEntry.images[0];
              setNewsScreenshot({ id: 'news', url: news.url, publicId: news.publicId, caption: news.caption || '' });
              if (morningEntry.images.length > 1) {
                setChartImages(morningEntry.images.slice(1).map((img: any, i: number) => ({
                  id: `chart-${i}`, url: img.url, publicId: img.publicId, caption: img.caption || '',
                })));
              }
            }
          }
        });
        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to load review data.');
        setIsLoading(false);
      });
  }, [isEditMode, reviewId]);

  const handleBack = () => {
    (window as any).__dailyReviewEditId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'daily-review' }));
  };

  const handleSubmit = async () => {
    if (!pair || !date) {
      setError('Pair and Date are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      let saved;
      if (isEditMode && reviewId) {
        saved = await apiService.dailyReviews.update(reviewId, { pair, date, dayOfWeek, bias, crtDirection, narrative });
      } else {
        saved = await apiService.dailyReviews.create({ pair, date, dayOfWeek, bias, crtDirection, narrative });
        (window as any).__dailyReviewEditId = saved.id || saved._id;
      }

      const savedId = saved.id || saved._id;
      const allImages = [];
      if (newsScreenshot) {
        if (newsScreenshot.file) {
          const result = await uploadImage(newsScreenshot.file);
          allImages.push({ url: result.url, publicId: result.publicId, caption: newsScreenshot.caption || 'News' });
        } else if (newsScreenshot.url) {
          allImages.push({ url: newsScreenshot.url, publicId: newsScreenshot.publicId, caption: newsScreenshot.caption || 'News' });
        }
      }
      for (const img of chartImages) {
        if (img.file) {
          const result = await uploadImage(img.file);
          allImages.push({ url: result.url, publicId: result.publicId, caption: img.caption });
        } else if (img.url) {
          allImages.push({ url: img.url, publicId: img.publicId, caption: img.caption });
        }
      }

      if (allImages.length > 0) {
        await apiService.dailyReviews.createEntry(savedId, {
          entryTitle: 'Morning Setup',
          comment: narrative,
          images: allImages,
          bias: bias || undefined,
        });
      }

      // Navigate to detail page
      (window as any).__dailyReviewId = savedId;
      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'daily-review-detail' }));
    } catch (err: any) {
      setError(err?.message || 'Failed to save review.');
    } finally {
      setIsSaving(false);
    }
  };

  // Image upload handlers
  const handleNewsScreenshot = (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewsScreenshot({ id: 'news', file, preview: reader.result as string, caption: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleChartImages = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChartImages(prev => [...prev, { id: `chart-${Date.now()}`, file, preview: reader.result as string, caption: '' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-48 bg-slate-200 rounded" />
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-12 bg-slate-200 rounded-2xl" />
          <div className="h-12 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
        <button type="button" onClick={handleBack} className="hover:text-[#2563EB]">Daily Market Review</button>
        <ChevronRight className="size-3.5 text-[#CBD5E1]" />
        <span className="text-[#0F172A]">{isEditMode ? 'Edit' : 'New'} Morning Review</span>
      </nav>

      <div>
        <h1 className="text-[28px] font-bold text-[#0F172A]">{isEditMode ? 'Edit Morning Review' : 'Morning Market Review'}</h1>
        <p className="text-[15px] font-medium text-[#64748B] mt-1">Set your daily bias, CRT, and add screenshots.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[14px] font-medium text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5EAF2] p-8 space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className={labelClass}>Pair *</Label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Select pair" />
              </SelectTrigger>
              <SelectContent>
                {pairs.map(p => (
                  <SelectItem key={p} value={p} className="text-[14px] font-medium">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>Date *</Label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>Daily Bias</Label>
          <div className="flex gap-2">
            {['Bullish', 'Bearish', 'Neutral'].map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setBias(bias === option ? '' : option)}
                className={`flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200 ${
                  bias === option
                    ? option === 'Bullish'
                      ? 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
                      : option === 'Bearish'
                        ? 'bg-[#DC2626] text-white shadow-md shadow-[#DC2626]/25'
                        : 'bg-[#64748B] text-white shadow-md shadow-[#64748B]/25'
                    : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>CRT Direction</Label>
          <input
            type="text"
            value={crtDirection}
            onChange={e => setCrtDirection(e.target.value)}
            placeholder="e.g., Bullish CRT on H1"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>News Screenshot</Label>
          {newsScreenshot ? (
            <div className="relative w-48 aspect-video bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden">
              <img src={newsScreenshot.preview || newsScreenshot.url} alt="" className="w-full h-full object-contain" />
              <button onClick={() => setNewsScreenshot(null)} className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-lg"><X className="size-3" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center h-20 border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB] hover:bg-blue-50">
              <Upload className="size-5 text-[#94A3B8]" />
              <span className="text-sm text-[#64748B] ml-2">Add news screenshot</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => handleNewsScreenshot(e.target.files)} className="hidden" />
            </label>
          )}
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>Chart Screenshots</Label>
          {chartImages.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              {chartImages.map((img, i) => (
                <div key={img.id} className="relative aspect-video bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden group">
                  <img src={img.preview || img.url} alt="" className="w-full h-full object-contain" />
                  <button onClick={() => setChartImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100"><X className="size-3" /></button>
                  <input
                    value={img.caption}
                    onChange={e => setChartImages(prev => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))}
                    placeholder="Caption"
                    className="absolute bottom-0 inset-x-0 px-2 py-1 text-xs bg-black/60 text-white placeholder:text-white/50 outline-none"
                  />
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center justify-center h-20 border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB] hover:bg-blue-50">
            <Upload className="size-5 text-[#94A3B8]" />
            <span className="text-sm text-[#64748B] ml-2">Upload chart screenshots</span>
            <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e => handleChartImages(e.target.files)} className="hidden" />
          </label>
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>Notes</Label>
          <textarea
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            placeholder="Your market observations and key levels for today..."
            rows={5}
            className={textareaClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={handleBack}>Cancel</Button>
        <Button type="button" onClick={handleSubmit} disabled={isSaving}
          className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-lg shadow-[#2563EB]/25 px-8">
          {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Review'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/app/components/DailyMarketReview/DailyReviewForm.tsx
git commit -m "feat: simplify DailyReviewForm to morning bias/CRT/images/notes"
```

---

### Task 5: Rewrite DailyReviewDetail

**Files:**
- Modify: `src/app/components/DailyMarketReview/DailyReviewDetail.tsx`

- [ ] **Rewrite DailyReviewDetail**

Replace the entire file content. Simplified detail showing morning info + timeline of updates + FAB:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Image, TrendingUp, TrendingDown, Minus, Crosshair } from 'lucide-react';
import { format } from 'date-fns';
import apiService from '../../services/apiService';
import AddUpdateDialog from './AddUpdateDialog';
import { Badge } from '../ui/badge';

const biasVariant: Record<string, 'success' | 'destructive' | 'secondary'> = {
  Bullish: 'success',
  Bearish: 'destructive',
  Neutral: 'secondary',
};

const BiasIcon = ({ bias }: { bias: string }) => {
  if (bias === 'Bullish') return <TrendingUp className="size-5" />;
  if (bias === 'Bearish') return <TrendingDown className="size-5" />;
  return <Minus className="size-5" />;
};

export default function DailyReviewDetail() {
  const [review, setReview] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addUpdateOpen, setAddUpdateOpen] = useState(false);

  const reviewId = (window as any).__dailyReviewId;

  const loadData = async () => {
    if (!reviewId) return;
    setIsLoading(true);
    try {
      const [reviewData, entriesData] = await Promise.all([
        apiService.dailyReviews.getById(reviewId),
        apiService.dailyReviews.getEntries(reviewId),
      ]);
      setReview(reviewData);
      setEntries(entriesData);
    } catch (error) {
      console.error('Failed to load daily review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [reviewId]);

  const handleBack = () => {
    (window as any).__dailyReviewId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'daily-review' }));
  };

  const sortedEntries = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries]
  );

  const allImages = useMemo(() =>
    entries.flatMap(e => e.images || []),
    [entries]
  );

  if (!reviewId) return <div className="flex items-center justify-center h-64 text-[#64748B]">No review selected</div>;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="animate-pulse"><div className="h-8 w-32 bg-slate-200 rounded" /></div>
        <div className="h-48 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const formattedDate = review.date ? format(new Date(review.date), 'MMM d, yyyy') : '';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
      {/* Back */}
      <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0F172A] mb-6">
        <ArrowLeft className="size-4" /> Back to Reviews
      </button>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">{review.pair}</h1>
          <span className="text-sm text-blue-200">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {review.bias && <Badge variant={biasVariant[review.bias] || 'secondary'}>{review.bias}</Badge>}
          <span className="text-sm text-blue-200">{entries.length} updates</span>
          <span className="text-sm text-blue-200">{allImages.length} images</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Morning Setup */}
          {review.bias && (
            <section className="bg-white rounded-2xl border border-[#E5EAF2] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">Morning Setup</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className={`size-12 rounded-xl flex items-center justify-center ${
                  review.bias === 'Bullish' ? 'bg-emerald-100 text-emerald-600' :
                  review.bias === 'Bearish' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <BiasIcon bias={review.bias} />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#0F172A]">{review.bias}</p>
                  <p className="text-xs text-[#94A3B8]">Daily Bias</p>
                </div>
              </div>
              {review.crtDirection && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <Crosshair className="size-4 text-[#64748B]" />
                  <span className="text-sm font-medium text-[#0F172A]">CRT: {review.crtDirection}</span>
                </div>
              )}
              {review.narrative && (
                <div className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{review.narrative}</div>
              )}
            </section>
          )}

          {/* Image Gallery */}
          {allImages.length > 0 && (
            <section className="bg-white rounded-2xl border border-[#E5EAF2] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <Image className="size-5 text-[#2563EB]" /> Screenshots
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allImages.map((img: any, i: number) => (
                  <div key={i} className="group relative aspect-video bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden">
                    <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <span className="text-xs text-white">{img.caption}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Timeline */}
          <section>
            <h2 className="text-lg font-bold text-[#0F172A] mb-4">Updates</h2>
            {sortedEntries.length > 0 ? (
              <div className="space-y-4">
                {sortedEntries.map((entry, idx) => (
                  <div key={entry.id || idx} className="relative bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm">
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-[#2563EB] to-[#1D4ED8]" />
                    <div className="pl-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#0F172A]">{entry.entryTitle}</span>
                          {entry.bias && <Badge variant={biasVariant[entry.bias] || 'secondary'} className="text-xs">{entry.bias}</Badge>}
                        </div>
                        <span className="text-xs text-[#94A3B8]">{format(new Date(entry.createdAt), 'h:mm a')}</span>
                      </div>
                      {entry.comment && (
                        <div className="text-sm text-[#475569] whitespace-pre-wrap mb-3">{entry.comment}</div>
                      )}
                      {entry.images?.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {entry.images.map((img: any, j: number) => (
                            <div key={j} className="aspect-video bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] overflow-hidden">
                              <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-[#E5EAF2] bg-white/40">
                <p className="text-sm font-medium text-[#64748B]">No updates yet today</p>
                <p className="text-xs text-[#94A3B8] mt-1">Add your first market update</p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-28 bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Quick Stats</h3>
            <div className="divide-y divide-[#F1F5F9]">
              {[
                { label: 'Pair', value: review.pair },
                { label: 'Date', value: formattedDate },
                { label: 'Bias', value: review.bias || '—' },
                { label: 'CRT', value: review.crtDirection || '—' },
                { label: 'Updates', value: entries.length },
                { label: 'Images', value: allImages.length },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#64748B]">{stat.label}</span>
                  <span className="text-sm font-semibold text-[#0F172A]">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddUpdateOpen(true)}
        className="fixed bottom-6 right-6 size-14 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-lg shadow-blue-500/30 hover:shadow-xl flex items-center justify-center z-40"
      >
        <Plus className="size-6" />
      </button>

      <AddUpdateDialog
        open={addUpdateOpen}
        onOpenChange={setAddUpdateOpen}
        onSaved={loadData}
        reviewId={reviewId}
      />
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/app/components/DailyMarketReview/DailyReviewDetail.tsx
git commit -m "feat: simplify DailyReviewDetail with timeline and FAB"
```

---

### Task 6: Update DailyReviewCard

**Files:**
- Modify: `src/app/components/DailyMarketReview/DailyReviewCard.tsx`

- [ ] **Simplify DailyReviewCard**

Card should show: pair, bias badge, date, entry count, last update time.

```tsx
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';

const biasVariant: Record<string, 'success' | 'destructive' | 'secondary'> = {
  Bullish: 'success',
  Bearish: 'destructive',
  Neutral: 'secondary',
};

export default function DailyReviewCard({ review, onView, onEdit, onDelete }: {
  review: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formattedDate = review.date ? format(new Date(review.date), 'MMM d, yyyy') : '';

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-[#0F172A]">{review.pair}</h3>
          <p className="text-sm text-[#64748B]">{formattedDate}</p>
        </div>
        {review.bias && (
          <Badge variant={biasVariant[review.bias] || 'secondary'}>{review.bias}</Badge>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-[#94A3B8] mb-4">
        <span>{review.entryCount || 0} updates</span>
        <span>{review.imageCount || 0} images</span>
        {review.latestEntryAt && (
          <span>Last: {format(new Date(review.latestEntryAt), 'h:mm a')}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onView} className="flex-1 h-9 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors">View</button>
        <button onClick={onEdit} className="h-9 px-4 rounded-xl border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]">Edit</button>
        <button onClick={onDelete} className="h-9 px-4 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/app/components/DailyMarketReview/DailyReviewCard.tsx
git commit -m "fix: update DailyReviewCard for simplified fields"
```

---

### Task 7: Clean Up Unused Components

**Files:**
- Remove: `src/app/components/DailyMarketReview/SessionCard.tsx`
- Remove: `src/app/components/DailyMarketReview/EntryModelCard.tsx`
- Remove: `src/app/components/DailyMarketReview/TradeIdeaCard.tsx`

- [ ] **Verify these components are not imported elsewhere**

Check if any other file imports from these paths:
```bash
rg "SessionCard|EntryModelCard|TradeIdeaCard" src/ --type ts --type tsx
```

Expected: only DailyReviewDetail.tsx (which we already rewrote and no longer imports them)

- [ ] **Delete unused component files**

```bash
rm src/app/components/DailyMarketReview/SessionCard.tsx
rm src/app/components/DailyMarketReview/EntryModelCard.tsx
rm src/app/components/DailyMarketReview/TradeIdeaCard.tsx
```

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: remove unused DailyMarketReview sub-components"
```
