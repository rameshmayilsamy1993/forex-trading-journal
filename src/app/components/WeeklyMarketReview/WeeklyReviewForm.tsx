import { useState, useEffect } from 'react';
import { ChevronRight, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import apiService from '../../services/apiService';

const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1);
const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];
const CURRENT_YEAR = new Date().getFullYear();

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

export default function WeeklyReviewForm() {
  const isEditMode = !!(window as any).__weeklyReviewEditId;
  const reviewId = (window as any).__weeklyReviewEditId || null;

  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [pair, setPair] = useState('');
  const [week, setWeek] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR.toString());
  const [bias, setBias] = useState('');
  const [crtDirection, setCrtDirection] = useState('');
  const [narrative, setNarrative] = useState('');
  const [newsScreenshot, setNewsScreenshot] = useState<ImageItem | null>(null);
  const [chartImages, setChartImages] = useState<ImageItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);

  useEffect(() => {
    apiService.settings.getPairs()
      .then(setPairs)
      .catch(() => setPairs(DEFAULT_PAIRS));
  }, []);

  useEffect(() => {
    if (!isEditMode || !reviewId) return;
    apiService.weeklyReviews.getById(reviewId)
      .then((review) => {
        setPair(review.pair || '');
        setWeek(review.weekNumber?.toString() || '');
        setYear(review.year?.toString() || '');
        setBias(review.bias || '');
        setCrtDirection(review.weeklyCrt || '');
        setNarrative(review.summary || '');
        return apiService.weeklyReviews.getEntries(reviewId).catch(() => []);
      })
      .then(entries => {
        if (entries.length > 0) {
          const allImgs = entries.flatMap((e: any) => e.images || []);
          if (allImgs.length > 0) {
            setNewsScreenshot({ id: 'news', url: allImgs[0].url, publicId: allImgs[0].publicId, caption: allImgs[0].caption || '' });
            if (allImgs.length > 1) {
              setChartImages(allImgs.slice(1).map((img: any, i: number) => ({
                id: `chart-${i}`, url: img.url, publicId: img.publicId, caption: img.caption || '',
              })));
            }
          }
        }
      })
      .catch(() => setError('Failed to load review data.'))
      .finally(() => setIsLoading(false));
  }, [isEditMode, reviewId]);

  const handleBack = () => {
    (window as any).__weeklyReviewEditId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'weekly-review' }));
  };

  const handleSubmit = async () => {
    if (!pair || !week || !year) {
      setError('Pair, Week, and Year are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      let saved;
      const payload = {
        pair,
        weekNumber: parseInt(week),
        year: parseInt(year),
        bias: bias || undefined,
        weeklyCrt: crtDirection || undefined,
        summary: narrative,
        status: 'Published',
      };

      if (isEditMode && reviewId) {
        saved = await apiService.weeklyReviews.update(reviewId, payload);
      } else {
        saved = await apiService.weeklyReviews.create(payload);
        (window as any).__weeklyReviewEditId = saved.id || saved._id;
      }

      const savedId = saved.id || saved._id;
      const allImages: { url: string; publicId?: string; caption: string }[] = [];
      if (newsScreenshot) {
        if (newsScreenshot.file) {
          const result = await apiService.upload.single(newsScreenshot.file);
          allImages.push({ url: result.url, publicId: result.publicId, caption: newsScreenshot.caption || 'News' });
        } else if (newsScreenshot.url) {
          allImages.push({ url: newsScreenshot.url, publicId: newsScreenshot.publicId, caption: newsScreenshot.caption || 'News' });
        }
      }
      for (const img of chartImages) {
        if (img.file) {
          const result = await apiService.upload.single(img.file);
          allImages.push({ url: result.url, publicId: result.publicId, caption: img.caption });
        } else if (img.url) {
          allImages.push({ url: img.url, publicId: img.publicId, caption: img.caption });
        }
      }

      if (allImages.length > 0) {
        await apiService.weeklyReviews.createEntry(savedId, {
          entryTitle: 'Initial chart images',
          comment: narrative,
          images: allImages,
        });
      }

      (window as any).__weeklyReviewId = savedId;
      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'weekly-review-detail' }));
    } catch (err: any) {
      setError(err?.message || 'Failed to save review.');
    } finally {
      setIsSaving(false);
    }
  };

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
      <nav className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
        <button type="button" onClick={handleBack} className="hover:text-[#2563EB]">Weekly Market Review</button>
        <ChevronRight className="size-3.5 text-[#CBD5E1]" />
        <span className="text-[#0F172A]">{isEditMode ? 'Edit' : 'New'} Weekly Review</span>
      </nav>

      <div>
        <h1 className="text-[28px] font-bold text-[#0F172A]">{isEditMode ? 'Edit Weekly Review' : 'Weekly Market Review'}</h1>
        <p className="text-[15px] font-medium text-[#64748B] mt-1">Set your weekly bias, CRT, and add screenshots.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[14px] font-medium text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5EAF2] p-8 space-y-6">
        <div className="grid grid-cols-3 gap-5">
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
            <Label className={labelClass}>Week *</Label>
            <Select value={week} onValueChange={setWeek}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                {WEEKS.map(w => (
                  <SelectItem key={w} value={w.toString()} className="text-[14px] font-medium">Week {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>Year *</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i).map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-[14px] font-medium">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>Weekly Bias</Label>
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
            placeholder="Your weekly market observations and key levels..."
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

export { WeeklyReviewForm };
