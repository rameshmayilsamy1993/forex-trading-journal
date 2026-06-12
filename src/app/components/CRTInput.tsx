import { useState, useEffect, useRef } from 'react';
import { Save, Plus, X, Upload, ImageIcon, ZoomIn } from 'lucide-react';
import apiService from '../services/apiService';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { cn } from './ui/utils';
import ImageViewer from './ImageViewer';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const KEY_LEVEL_TYPES = ['PMH', 'PML', 'PWH', 'PWL', 'PDH', 'PDL', 'EQH', 'EQL', 'FVG', 'IFVG', 'Order Block', 'Breaker', 'Custom'];
const CRT_DIRECTIONS = ['Strong Bull CRT', 'Bull CRT', 'No CRT', 'Bear CRT', 'Strong Bear CRT'];
const CRT_STATUSES = ['Waiting', 'Active', 'Continuing', 'Entry Ready', 'Completed', 'Invalidated'];
const CRT_RANGE_RESPECTED = ['Yes', 'No', 'Not Yet Tested'];

const TIMEFRAME_LABELS: Record<string, string> = {
  '3MONTH': '3 Month', MONTHLY: 'Monthly', WEEKLY: 'Weekly', DAILY: 'Daily', H4: '4 Hour', H1: '1 Hour'
};

const TIMEFRAME_COLORS: Record<string, string> = {
  '3MONTH': 'border-rose-400 bg-rose-50',
  MONTHLY: 'border-amber-400 bg-amber-50',
  WEEKLY: 'border-blue-400 bg-blue-50',
  DAILY: 'border-green-400 bg-green-50',
  H4: 'border-purple-400 bg-purple-50',
  H1: 'border-cyan-400 bg-cyan-50'
};

const DIRECTION_COLORS: Record<string, string> = {
  'Strong Bull CRT': 'bg-emerald-900 text-white',
  'Bull CRT': 'bg-green-600 text-white',
  'No CRT': 'bg-slate-400 text-white',
  'Bear CRT': 'bg-red-600 text-white',
  'Strong Bear CRT': 'bg-red-900 text-white'
};

const STATUS_COLORS: Record<string, string> = {
  'Waiting': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Active': 'bg-blue-100 text-blue-700 border-blue-200',
  'Continuing': 'bg-teal-100 text-teal-700 border-teal-200',
  'Entry Ready': 'bg-purple-100 text-purple-700 border-purple-200',
  'Completed': 'bg-green-100 text-green-700 border-green-200',
  'Invalidated': 'bg-red-100 text-red-700 border-red-200'
};

interface CRTFormData {
  id?: string;
  pair: string;
  timeframe: string;
  date: string;
  time: string;
  keyLevelExists: boolean;
  keyLevelType: string;
  customKeyLevel: string;
  crtPlaying: boolean;
  crtDirection: string;
  crtStatus: string;
  crtRangeRespected: string;
  imagePath: string;
  notes: string;
}

function defaultFormData(pair: string, timeframe: string): CRTFormData {
  return {
    pair,
    timeframe,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    keyLevelExists: false,
    keyLevelType: '',
    customKeyLevel: '',
    crtPlaying: false,
    crtDirection: 'No CRT',
    crtStatus: 'Waiting',
    crtRangeRespected: 'Not Yet Tested',
    imagePath: '',
    notes: ''
  };
}

export default function CRTInput() {
  const [pairs, setPairs] = useState<string[]>(PAIRS);
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [threeMonthEntry, setThreeMonthEntry] = useState<CRTFormData>(defaultFormData('EURUSD', '3MONTH'));
  const [monthlyEntry, setMonthlyEntry] = useState<CRTFormData>(defaultFormData('EURUSD', 'MONTHLY'));
  const [weeklyEntries, setWeeklyEntries] = useState<CRTFormData[]>([]);
  const [dailyEntries, setDailyEntries] = useState<CRTFormData[]>([]);
  const [h4Entries, setH4Entries] = useState<CRTFormData[]>([]);
  const [h1Entries, setH1Entries] = useState<CRTFormData[]>([]);

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; label: string }[]>([]);

  useEffect(() => { loadPairs(); }, []);
  useEffect(() => { loadExisting(); }, [selectedPair, currentMonth]);

  const loadPairs = async () => {
    try {
      const pairsData = await apiService.settings.getPairs();
      if (pairsData && pairsData.length > 0) {
        setPairs(pairsData);
        setSelectedPair(pairsData[0]);
      }
    } catch (error) {
      console.error('Failed to load pairs:', error);
    }
  };

  const loadExisting = async () => {
    try {
      setIsLoading(true);
      const monthKey = format(currentMonth, 'yyyy-MM');
      const res = await apiService.crtEvents.getAll({ pair: selectedPair, month: monthKey });
      const events = Array.isArray(res) ? res : res.events || [];

      // Load 3MONTH separately without month filter (quarter-based, not month-based)
      const res3M = await apiService.crtEvents.getAll({ pair: selectedPair, timeframe: '3MONTH' });
      const all3MonthEvents: any[] = Array.isArray(res3M) ? res3M : res3M.events || [];

      // Find 3MONTH entry for the current quarter
      const quarter = Math.ceil((currentMonth.getMonth() + 1) / 3);
      const quarterKey = `${currentMonth.getFullYear()}-Q${quarter}`;
      const threeMonth = all3MonthEvents.filter((e: any) => {
        const d = new Date(e.date);
        const q = Math.ceil((d.getMonth() + 1) / 3);
        return `${d.getFullYear()}-Q${q}` === quarterKey;
      });

      const monthly = events.filter((e: any) => e.timeframe === 'MONTHLY');
      const weekly = events.filter((e: any) => e.timeframe === 'WEEKLY');
      const daily = events.filter((e: any) => e.timeframe === 'DAILY');
      const h4 = events.filter((e: any) => e.timeframe === 'H4');
      const h1 = events.filter((e: any) => e.timeframe === 'H1');

      const mapEvent = (e: any): CRTFormData => ({
        id: e.id,
        pair: selectedPair,
        timeframe: e.timeframe,
        date: e.date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
        time: e.time || '',
        keyLevelExists: e.keyLevelExists || false,
        keyLevelType: e.keyLevelType || '',
        customKeyLevel: e.customKeyLevel || '',
        crtPlaying: e.crtPlaying || e.isCRT || false,
        crtDirection: e.crtDirection || 'No CRT',
        crtStatus: e.crtStatus || 'Waiting',
        crtRangeRespected: e.crtRangeRespected || 'Not Yet Tested',
        imagePath: e.imagePath || e.image || '',
        notes: e.notes || ''
      });

      if (threeMonth.length > 0) {
        setThreeMonthEntry(mapEvent(threeMonth[0]));
      } else {
        setThreeMonthEntry(defaultFormData(selectedPair, '3MONTH'));
      }

      if (monthly.length > 0) {
        setMonthlyEntry(mapEvent(monthly[0]));
      } else {
        setMonthlyEntry(defaultFormData(selectedPair, 'MONTHLY'));
      }

      setWeeklyEntries(weekly.map(mapEvent));
      setDailyEntries(daily.map(mapEvent));
      setH4Entries(h4.map(mapEvent));
      setH1Entries(h1.map(mapEvent));
    } catch (error) {
      console.error('Failed to load CRT events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, target: string, index?: number) => {
    try {
      const key = index !== undefined ? `${target}-${index}` : target;
      setUploadingFor(key);
      const result: any = await apiService.upload.single(file);
      const url = result.url || result.secure_url;

      const setImage = (prev: CRTFormData): CRTFormData => ({ ...prev, imagePath: url });
      const setImageArr = (prev: CRTFormData[]): CRTFormData[] => {
        const arr = [...prev];
        if (index !== undefined && arr[index]) arr[index] = { ...arr[index], imagePath: url };
        return arr;
      };

      if (target === '3MONTH') setThreeMonthEntry(setImage);
      else if (target === 'MONTHLY') setMonthlyEntry(setImage);
      else if (target === 'WEEKLY' && index !== undefined) setWeeklyEntries(setImageArr);
      else if (target === 'DAILY' && index !== undefined) setDailyEntries(setImageArr);
      else if (target === 'H4' && index !== undefined) setH4Entries(setImageArr);
      else if (target === 'H1' && index !== undefined) setH1Entries(setImageArr);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingFor(null);
    }
  };

  const handleSaveSingle = async (entry: CRTFormData, setEntry: React.Dispatch<React.SetStateAction<CRTFormData>>) => {
    if (!selectedPair) { alert('Please select a pair'); return; }
    setIsSaving(true);
    try {
      if (entry.id) {
        await apiService.crtEvents.update(entry.id, {
          date: entry.date, time: entry.time,
          keyLevelExists: entry.keyLevelExists, keyLevelType: entry.keyLevelType, customKeyLevel: entry.customKeyLevel,
          crtPlaying: entry.crtPlaying, crtDirection: entry.crtDirection, crtStatus: entry.crtStatus, crtRangeRespected: entry.crtRangeRespected,
          imagePath: entry.imagePath, notes: entry.notes
        });
      } else {
        const result: any = await apiService.crtEvents.create({
          pair: selectedPair, timeframe: entry.timeframe,
          date: entry.date, time: entry.time,
          keyLevelExists: entry.keyLevelExists, keyLevelType: entry.keyLevelType, customKeyLevel: entry.customKeyLevel,
          crtPlaying: entry.crtPlaying, crtDirection: entry.crtDirection, crtStatus: entry.crtStatus, crtRangeRespected: entry.crtRangeRespected,
          imagePath: entry.imagePath, notes: entry.notes
        });
        setEntry(prev => ({ ...prev, id: result.id }));
      }
      alert(`${TIMEFRAME_LABELS[entry.timeframe]} CRT saved!`);
    } catch (error: any) {
      console.error('Failed to save:', error);
      alert(error.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEntry = (timeframe: string) => {
    const entry = defaultFormData(selectedPair, timeframe);
    if (timeframe === 'WEEKLY') setWeeklyEntries(prev => [...prev, entry]);
    else if (timeframe === 'DAILY') setDailyEntries(prev => [...prev, entry]);
    else if (timeframe === 'H4') setH4Entries(prev => [...prev, entry]);
    else if (timeframe === 'H1') setH1Entries(prev => [...prev, entry]);
  };

  const handleRemoveEntry = async (timeframe: string, index: number, id?: string) => {
    if (id) { try { await apiService.crtEvents.delete(id); } catch { /* ignore */ } }
    const remove = (prev: CRTFormData[]) => prev.filter((_, i) => i !== index);
    if (timeframe === 'WEEKLY') setWeeklyEntries(remove);
    else if (timeframe === 'DAILY') setDailyEntries(remove);
    else if (timeframe === 'H4') setH4Entries(remove);
    else if (timeframe === 'H1') setH1Entries(remove);
  };

  const handleSaveEntry = async (timeframe: string, index: number, entry: CRTFormData) => {
    if (!selectedPair) return;
    setIsSaving(true);
    try {
      if (entry.id) {
        await apiService.crtEvents.update(entry.id, {
          date: entry.date, time: entry.time,
          keyLevelExists: entry.keyLevelExists, keyLevelType: entry.keyLevelType, customKeyLevel: entry.customKeyLevel,
          crtPlaying: entry.crtPlaying, crtDirection: entry.crtDirection, crtStatus: entry.crtStatus, crtRangeRespected: entry.crtRangeRespected,
          imagePath: entry.imagePath, notes: entry.notes
        });
      } else {
        const result: any = await apiService.crtEvents.create({
          pair: selectedPair, timeframe: entry.timeframe,
          date: entry.date, time: entry.time,
          keyLevelExists: entry.keyLevelExists, keyLevelType: entry.keyLevelType, customKeyLevel: entry.customKeyLevel,
          crtPlaying: entry.crtPlaying, crtDirection: entry.crtDirection, crtStatus: entry.crtStatus, crtRangeRespected: entry.crtRangeRespected,
          imagePath: entry.imagePath, notes: entry.notes
        });
        const newId = result.id;
        const updateArr = (prev: CRTFormData[]) => {
          const arr = [...prev];
          if (arr[index]) arr[index] = { ...arr[index], id: newId };
          return arr;
        };
        if (timeframe === 'WEEKLY') setWeeklyEntries(updateArr);
        else if (timeframe === 'DAILY') setDailyEntries(updateArr);
        else if (timeframe === 'H4') setH4Entries(updateArr);
        else if (timeframe === 'H1') setH1Entries(updateArr);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateArrEntry = (timeframe: string, index: number, updates: Partial<CRTFormData>) => {
    const updater = (prev: CRTFormData[]) => {
      const arr = [...prev];
      if (arr[index]) arr[index] = { ...arr[index], ...updates };
      return arr;
    };
    if (timeframe === 'WEEKLY') setWeeklyEntries(updater);
    else if (timeframe === 'DAILY') setDailyEntries(updater);
    else if (timeframe === 'H4') setH4Entries(updater);
    else if (timeframe === 'H1') setH1Entries(updater);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="CRT Tracker" subtitle="Track CRT (Candle Range Theory) opportunities across all timeframes" />

      <CardContainer>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mr-2">Pair:</label>
            <select value={selectedPair} onChange={e => setSelectedPair(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg">
              {pairs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mr-2">Month:</label>
            <input type="month" value={format(currentMonth, 'yyyy-MM')}
              onChange={e => setCurrentMonth(new Date(e.target.value + '-01'))}
              className="px-3 py-2 border border-slate-200 rounded-lg" />
          </div>
        </div>
      </CardContainer>

      {isLoading ? <LoadingSpinner /> : (
        <div className="space-y-6">
          <SingleTimeframeSection
            entry={threeMonthEntry} onChange={setThreeMonthEntry}
            onSave={() => handleSaveSingle(threeMonthEntry, setThreeMonthEntry)}
            onUpload={handleImageUpload} uploading={uploadingFor === '3MONTH'}
            isSaving={isSaving} onViewImage={setViewingImage}
          />
          <SingleTimeframeSection
            entry={monthlyEntry} onChange={setMonthlyEntry}
            onSave={() => handleSaveSingle(monthlyEntry, setMonthlyEntry)}
            onUpload={handleImageUpload} uploading={uploadingFor === 'MONTHLY'}
            isSaving={isSaving} onViewImage={setViewingImage}
          />
          <DynamicTimeframeSection title="Weekly" timeframe="WEEKLY" entries={weeklyEntries}
            onAdd={() => handleAddEntry('WEEKLY')} onRemove={handleRemoveEntry}
            onSave={handleSaveEntry} onUpdate={updateArrEntry}
            onUpload={handleImageUpload} uploading={uploadingFor} isSaving={isSaving}
            onViewImage={setViewingImage} />
          <DynamicTimeframeSection title="Daily" timeframe="DAILY" entries={dailyEntries}
            onAdd={() => handleAddEntry('DAILY')} onRemove={handleRemoveEntry}
            onSave={handleSaveEntry} onUpdate={updateArrEntry}
            onUpload={handleImageUpload} uploading={uploadingFor} isSaving={isSaving}
            onViewImage={setViewingImage} />
          <DynamicTimeframeSection title="4 Hour" timeframe="H4" entries={h4Entries}
            onAdd={() => handleAddEntry('H4')} onRemove={handleRemoveEntry}
            onSave={handleSaveEntry} onUpdate={updateArrEntry}
            onUpload={handleImageUpload} uploading={uploadingFor} isSaving={isSaving}
            onViewImage={setViewingImage} />
          <DynamicTimeframeSection title="1 Hour" timeframe="H1" entries={h1Entries}
            onAdd={() => handleAddEntry('H1')} onRemove={handleRemoveEntry}
            onSave={handleSaveEntry} onUpdate={updateArrEntry}
            onUpload={handleImageUpload} uploading={uploadingFor} isSaving={isSaving}
            onViewImage={setViewingImage} />
        </div>
      )}

      {viewingImage.length > 0 && (
        <ImageViewer images={viewingImage} initialIndex={0} onClose={() => setViewingImage([])} />
      )}
    </div>
  );
}

// ---- Single-entry timeframe section (3MONTH, MONTHLY) ----
interface SingleProps {
  entry: CRTFormData;
  onChange: React.Dispatch<React.SetStateAction<CRTFormData>>;
  onSave: () => void;
  onUpload: (file: File, target: string) => void;
  uploading: boolean;
  isSaving: boolean;
  onViewImage: (images: { url: string; label: string }[]) => void;
}

function SingleTimeframeSection({ entry, onChange, onSave, onUpload, uploading, isSaving, onViewImage }: SingleProps) {
  const tf = entry.timeframe;
  const fileRef = useRef<HTMLInputElement>(null);
  const colorClass = TIMEFRAME_COLORS[tf] || TIMEFRAME_COLORS.MONTHLY;

  return (
    <CardContainer>
      <div className="flex items-center justify-between mb-4">
        <span className={cn('px-3 py-1 rounded-full text-sm font-medium', colorClass)}>
          {TIMEFRAME_LABELS[tf] || tf}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input type="date" value={entry.date}
            onChange={e => onChange(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Time (optional)</label>
          <input type="time" value={entry.time}
            onChange={e => onChange(prev => ({ ...prev, time: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {/* 1. Key Level Exists */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Does Key Level Exist?</label>
          <div className="flex gap-2">
            <button onClick={() => onChange(prev => ({ ...prev, keyLevelExists: true }))}
              className={cn('px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                entry.keyLevelExists ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-slate-200 hover:border-slate-300')}>
              Yes
            </button>
            <button onClick={() => onChange(prev => ({ ...prev, keyLevelExists: false, keyLevelType: '', customKeyLevel: '' }))}
              className={cn('px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                !entry.keyLevelExists ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 hover:border-slate-300')}>
              No
            </button>
          </div>
        </div>

        {/* Key Level Type */}
        {entry.keyLevelExists && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Key Level Type</label>
            <select value={entry.keyLevelType} onChange={e => onChange(prev => ({ ...prev, keyLevelType: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg">
              <option value="">Select type...</option>
              {KEY_LEVEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {entry.keyLevelType === 'Custom' && (
              <input type="text" value={entry.customKeyLevel} placeholder="Enter custom key level..."
                onChange={e => onChange(prev => ({ ...prev, customKeyLevel: e.target.value }))}
                className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg" />
            )}
          </div>
        )}

        {/* 2. Is CRT Playing? */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Is CRT Playing?</label>
          <div className="flex gap-2">
            <button onClick={() => onChange(prev => ({ ...prev, crtPlaying: true }))}
              className={cn('px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                entry.crtPlaying ? 'bg-green-100 border-green-300 text-green-700' : 'border-slate-200 hover:border-slate-300')}>
              Yes
            </button>
            <button onClick={() => onChange(prev => ({ ...prev, crtPlaying: false }))}
              className={cn('px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                !entry.crtPlaying ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 hover:border-slate-300')}>
              No
            </button>
          </div>
        </div>

        {/* 3. CRT Direction */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">CRT Direction</label>
          <div className="flex flex-wrap gap-2">
            {CRT_DIRECTIONS.map(dir => (
              <button key={dir} onClick={() => onChange(prev => ({ ...prev, crtDirection: dir }))}
                className={cn('px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                  entry.crtDirection === dir
                    ? (DIRECTION_COLORS[dir] || 'bg-slate-800 text-white')
                    : 'border-slate-200 hover:border-slate-300'
                )}>
                {dir}
              </button>
            ))}
          </div>
        </div>

        {/* 4. CRT Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">CRT Status</label>
          <div className="flex flex-wrap gap-2">
            {CRT_STATUSES.map(st => (
              <button key={st} onClick={() => onChange(prev => ({ ...prev, crtStatus: st }))}
                className={cn('px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                  entry.crtStatus === st
                    ? (STATUS_COLORS[st] || 'bg-blue-100 text-blue-700 border-blue-200')
                    : 'border-slate-200 hover:border-slate-300'
                )}>
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* 5. CRT Range Respected */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">CRT Range Respected</label>
          <div className="flex gap-2">
            {CRT_RANGE_RESPECTED.map(r => (
              <button key={r} onClick={() => onChange(prev => ({ ...prev, crtRangeRespected: r }))}
                className={cn('px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                  entry.crtRangeRespected === r
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'border-slate-200 hover:border-slate-300'
                )}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Screenshot Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Screenshot</label>
          <div className="flex items-start gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors text-center',
                'hover:border-blue-400 hover:bg-blue-50/50',
                entry.imagePath ? 'border-green-300 bg-green-50/30' : 'border-slate-300'
              )}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) onUpload(f, tf);
              }}
            >
              <input type="file" accept="image/*" ref={fileRef} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f, tf); }} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <span className="text-sm text-slate-500">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-blue-50 rounded-full">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">Click to upload or drag & drop</span>
                  <span className="text-xs text-slate-400">PNG, JPG or WEBP</span>
                </div>
              )}
            </div>
            {entry.imagePath && (
              <div className="relative group shrink-0">
                <img src={entry.imagePath} alt="CRT screenshot"
                  className="w-28 h-28 object-cover rounded-lg border border-slate-200 cursor-pointer"
                  onClick={() => onViewImage([{ url: entry.imagePath, label: `${TIMEFRAME_LABELS[tf]} CRT` }])} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-lg flex items-center justify-center"
                  onClick={() => onViewImage([{ url: entry.imagePath, label: `${TIMEFRAME_LABELS[tf]} CRT` }])}>
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <button onClick={() => onChange(prev => ({ ...prev, imagePath: '' }))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 7. Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea value={entry.notes} placeholder="Strategy comments, observations..."
            onChange={e => onChange(prev => ({ ...prev, notes: e.target.value }))}
            rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg min-h-[72px]" />
        </div>

        <button onClick={onSave} disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : `Save ${TIMEFRAME_LABELS[tf] || tf} CRT`}
        </button>
      </div>
    </CardContainer>
  );
}

// ---- Dynamic multi-entry timeframe section (Weekly, Daily, H4, H1) ----
interface DynamicProps {
  title: string;
  timeframe: string;
  entries: CRTFormData[];
  onAdd: () => void;
  onRemove: (timeframe: string, index: number, id?: string) => void;
  onSave: (timeframe: string, index: number, entry: CRTFormData) => void;
  onUpdate: (timeframe: string, index: number, updates: Partial<CRTFormData>) => void;
  onUpload: (file: File, target: string, index: number) => void;
  uploading: string | null;
  isSaving: boolean;
  onViewImage: (images: { url: string; label: string }[]) => void;
}

function DynamicTimeframeSection({ title, timeframe, entries, onAdd, onRemove, onSave, onUpdate, onUpload, uploading, isSaving, onViewImage }: DynamicProps) {
  const colorClass = TIMEFRAME_COLORS[timeframe];

  return (
    <CardContainer>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-sm font-medium', colorClass)}>{title}</span>
          <span className="text-sm text-slate-500">({entries.length})</span>
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <CRTEntryCard
            key={idx} entry={entry} index={idx} timeframe={timeframe}
            onRemove={(id) => onRemove(timeframe, idx, id)}
            onSave={() => onSave(timeframe, idx, entry)}
            onUpdate={(updates) => onUpdate(timeframe, idx, updates)}
            onUpload={(file) => onUpload(file, timeframe, idx)}
            uploading={uploading === `${timeframe}-${idx}`}
            isSaving={isSaving} onViewImage={onViewImage}
            colorClass={colorClass}
          />
        ))}
        {entries.length === 0 && (
          <p className="text-slate-400 text-sm">No entries yet. Click "Add Entry" to create one.</p>
        )}
      </div>
    </CardContainer>
  );
}

// ---- Single entry card for dynamic sections ----
interface EntryCardProps {
  entry: CRTFormData;
  index: number;
  timeframe: string;
  onRemove: (id?: string) => void;
  onSave: () => void;
  onUpdate: (updates: Partial<CRTFormData>) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  isSaving: boolean;
  onViewImage: (images: { url: string; label: string }[]) => void;
  colorClass: string;
}

function CRTEntryCard({ entry, index, timeframe, onRemove, onSave, onUpdate, onUpload, uploading, isSaving, onViewImage, colorClass }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tf = timeframe;

  return (
    <div className={cn('border border-slate-200 rounded-lg overflow-hidden', entry.crtPlaying && 'border-green-200 bg-green-50/30')}>
      {/* Summary bar */}
      <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={entry.date}
            onChange={e => onUpdate({ date: e.target.value })}
            className="px-2 py-1 border border-slate-200 rounded text-sm w-36" />
          <input type="time" value={entry.time}
            onChange={e => onUpdate({ time: e.target.value })}
            className="px-2 py-1 border border-slate-200 rounded text-sm w-28" />
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
            entry.crtPlaying ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
            CRT {entry.crtPlaying ? 'ON' : 'OFF'}
          </span>
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
            DIRECTION_COLORS[entry.crtDirection] || 'bg-slate-100 text-slate-500')}>
            {entry.crtDirection}
          </span>
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
            STATUS_COLORS[entry.crtStatus] || 'bg-slate-100 text-slate-500')}>
            {entry.crtStatus}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {expanded ? 'Less' : 'More'}
          </button>
          <button onClick={onSave} disabled={isSaving}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50">
            Save
          </button>
          <button onClick={() => onRemove(entry.id)} className="p-1 text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* 1. Key Level Exists */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Does Key Level Exist?</label>
            <div className="flex gap-2">
              <button onClick={() => onUpdate({ keyLevelExists: true })}
                className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                  entry.keyLevelExists ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-slate-200 hover:border-slate-300')}>
                Yes
              </button>
              <button onClick={() => onUpdate({ keyLevelExists: false, keyLevelType: '', customKeyLevel: '' })}
                className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                  !entry.keyLevelExists ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 hover:border-slate-300')}>
                No
              </button>
            </div>
          </div>

          {entry.keyLevelExists && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Key Level Type</label>
              <select value={entry.keyLevelType} onChange={e => onUpdate({ keyLevelType: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select type...</option>
                {KEY_LEVEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {entry.keyLevelType === 'Custom' && (
                <input type="text" value={entry.customKeyLevel} placeholder="Enter custom key level..."
                  onChange={e => onUpdate({ customKeyLevel: e.target.value })}
                  className="w-full mt-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
              )}
            </div>
          )}

          {/* 2. Is CRT Playing? */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Is CRT Playing?</label>
            <div className="flex gap-2">
              <button onClick={() => onUpdate({ crtPlaying: true })}
                className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                  entry.crtPlaying ? 'bg-green-100 border-green-300 text-green-700' : 'border-slate-200 hover:border-slate-300')}>
                Yes
              </button>
              <button onClick={() => onUpdate({ crtPlaying: false })}
                className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                  !entry.crtPlaying ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 hover:border-slate-300')}>
                No
              </button>
            </div>
          </div>

          {/* 3. CRT Direction */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CRT Direction</label>
            <div className="flex flex-wrap gap-1.5">
              {CRT_DIRECTIONS.map(dir => (
                <button key={dir} onClick={() => onUpdate({ crtDirection: dir })}
                  className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                    entry.crtDirection === dir
                      ? (DIRECTION_COLORS[dir] || 'bg-slate-800 text-white')
                      : 'border-slate-200 hover:border-slate-300'
                  )}>
                  {dir}
                </button>
              ))}
            </div>
          </div>

          {/* 4. CRT Status */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CRT Status</label>
            <div className="flex flex-wrap gap-1.5">
              {CRT_STATUSES.map(st => (
                <button key={st} onClick={() => onUpdate({ crtStatus: st })}
                  className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                    entry.crtStatus === st
                      ? (STATUS_COLORS[st] || 'bg-blue-100 text-blue-700 border-blue-200')
                      : 'border-slate-200 hover:border-slate-300'
                  )}>
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* 5. CRT Range Respected */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CRT Range Respected</label>
            <div className="flex gap-2">
              {CRT_RANGE_RESPECTED.map(r => (
                <button key={r} onClick={() => onUpdate({ crtRangeRespected: r })}
                  className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                    entry.crtRangeRespected === r
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300'
                  )}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Screenshot */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Screenshot</label>
            <div className="flex items-start gap-3">
              <div onClick={() => fileRef.current?.click()}
                className={cn('border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center',
                  'hover:border-blue-400 hover:bg-blue-50/50',
                  entry.imagePath ? 'border-green-300 bg-green-50/30' : 'border-slate-300'
                )}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}
              >
                <input type="file" accept="image/*" ref={fileRef} className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                    <span className="text-xs text-slate-500">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-slate-600">Upload</span>
                  </div>
                )}
              </div>
              {entry.imagePath && (
                <div className="relative group shrink-0">
                  <img src={entry.imagePath} alt="CRT"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-pointer"
                    onClick={() => onViewImage([{ url: entry.imagePath, label: `${TIMEFRAME_LABELS[tf]} CRT` }])} />
                  <button onClick={() => onUpdate({ imagePath: '' })}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 7. Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea value={entry.notes} placeholder="Strategy comments, observations..."
              onChange={e => onUpdate({ notes: e.target.value })}
              rows={2} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm min-h-[56px]" />
          </div>
        </div>
      )}
    </div>
  );
}
