import { useState, useEffect, useRef } from 'react';
import { Save, Plus, X, Upload, Zap, ZapOff, CheckSquare, XSquare } from 'lucide-react';
import apiService from '../services/apiService';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { cn } from './ui/utils';
import { ImageIcon } from 'lucide-react';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const TIMEFRAME_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
  DAILY: 'Daily',
  H4: 'H4'
};

const TIMEFRAME_COLORS: Record<string, string> = {
  MONTHLY: 'border-amber-400 bg-amber-50',
  WEEKLY: 'border-blue-400 bg-blue-50',
  DAILY: 'border-green-400 bg-green-50',
  H4: 'border-purple-400 bg-purple-50'
};

const REACTION_COLORS: Record<string, string> = {
  RESPECT: 'bg-green-100 text-green-700 border-green-200',
  PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200'
};

interface DynamicEntry {
  id?: string;
  isCRT: boolean;
  reached50: string;
  reaction: string;
  date: string;
  time: string;
  image: string;
  notes: string;
}

interface MonthlyEntry {
  pair: string;
  timeframe: string;
  date: string;
  time: string;
  isCRT: boolean;
  reached50: string;
  reaction: string;
  image: string;
  notes: string;
}

export default function CRTInput() {
  const [pairs, setPairs] = useState<string[]>(PAIRS);
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [monthlyEntry, setMonthlyEntry] = useState<MonthlyEntry>({
    pair: 'EURUSD',
    timeframe: 'MONTHLY',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    isCRT: false,
    reached50: 'NA',
    reaction: 'NA',
    image: '',
    notes: ''
  });

  const [weeklyEntries, setWeeklyEntries] = useState<DynamicEntry[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DynamicEntry[]>([]);
  const [h4Entries, setH4Entries] = useState<DynamicEntry[]>([]);

  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    loadExisting();
  }, [selectedPair, currentMonth]);

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
      const events = await apiService.crtEvents.getAll({ pair: selectedPair, month: monthKey });

      const monthly = events.filter((e: any) => e.timeframe === 'MONTHLY');
      const weekly = events.filter((e: any) => e.timeframe === 'WEEKLY');
      const daily = events.filter((e: any) => e.timeframe === 'DAILY');
      const h4 = events.filter((e: any) => e.timeframe === 'H4');

      if (monthly.length > 0) {
        setMonthlyEntry({
          pair: selectedPair,
          timeframe: 'MONTHLY',
          date: monthly[0].date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
          time: monthly[0].time || '',
          isCRT: monthly[0].isCRT || false,
          reached50: monthly[0].reached50 || 'NA',
          reaction: monthly[0].reaction || 'NA',
          image: monthly[0].image || '',
          notes: monthly[0].notes || ''
        });
      } else {
        setMonthlyEntry(prev => ({
          ...prev,
          pair: selectedPair,
          date: format(new Date(), 'yyyy-MM-dd'),
          isCRT: false,
          reached50: 'NA',
          reaction: 'NA',
          image: '',
          notes: ''
        }));
      }

      setWeeklyEntries(weekly.map((e: any) => ({
        id: e._id,
        isCRT: e.isCRT || false,
        reached50: e.reached50 || 'NA',
        reaction: e.reaction || 'NA',
        date: e.date?.split('T')[0] || '',
        time: e.time || '',
        image: e.image || '',
        notes: e.notes || ''
      })));

      setDailyEntries(daily.map((e: any) => ({
        id: e._id,
        isCRT: e.isCRT || false,
        reached50: e.reached50 || 'NA',
        reaction: e.reaction || 'NA',
        date: e.date?.split('T')[0] || '',
        time: e.time || '',
        image: e.image || '',
        notes: e.notes || ''
      })));

      setH4Entries(h4.map((e: any) => ({
        id: e._id,
        isCRT: e.isCRT || false,
        reached50: e.reached50 || 'NA',
        reaction: e.reaction || 'NA',
        date: e.date?.split('T')[0] || '',
        time: e.time || '',
        image: e.image || '',
        notes: e.notes || ''
      })));
    } catch (error) {
      console.error('Failed to load CRT events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, target: string) => {
    try {
      setUploadingImage(target);
      const result: any = await apiService.upload.single(file);
      const imageUrl = result.url || result.secure_url;

      if (target === 'monthly') {
        setMonthlyEntry(prev => ({ ...prev, image: imageUrl }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleCRTToggle = (entry: DynamicEntry, setEntries: React.Dispatch<React.SetStateAction<DynamicEntry[]>>, index: number, isCRT: boolean) => {
    const updated = [...entry];
    updated[index] = {
      ...updated[index],
      isCRT,
      reached50: isCRT ? 'YES' : 'NA',
      reaction: isCRT ? 'RESPECT' : 'NA'
    };
    setEntries(updated);
  };

  const handleSaveMonthly = async () => {
    if (!selectedPair) {
      alert('Please select a pair');
      return;
    }

    if (monthlyEntry.isCRT && (!monthlyEntry.reached50 || !monthlyEntry.reaction)) {
      alert('When CRT is active, please select both 50% reached and Reaction');
      return;
    }

    setIsSaving(true);
    try {
      await apiService.crtEvents.create({
        pair: selectedPair,
        timeframe: 'MONTHLY',
        date: monthlyEntry.date,
        time: monthlyEntry.time,
        isCRT: monthlyEntry.isCRT,
        reached50: monthlyEntry.isCRT ? monthlyEntry.reached50 : 'NA',
        reaction: monthlyEntry.isCRT ? monthlyEntry.reaction : 'NA',
        image: monthlyEntry.image,
        notes: monthlyEntry.notes
      });
      alert('Monthly CRT saved!');
    } catch (error: any) {
      console.error('Failed to save:', error);
      alert(error.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEntry = (timeframe: string) => {
    const newEntry: DynamicEntry = {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '',
      isCRT: false,
      reached50: 'NA',
      reaction: 'NA',
      image: '',
      notes: ''
    };

    if (timeframe === 'WEEKLY') {
      setWeeklyEntries(prev => [...prev, newEntry]);
    } else if (timeframe === 'DAILY') {
      setDailyEntries(prev => [...prev, newEntry]);
    } else if (timeframe === 'H4') {
      setH4Entries(prev => [...prev, newEntry]);
    }
  };

  const handleRemoveEntry = async (timeframe: string, index: number, id?: string) => {
    if (id) {
      try {
        await apiService.crtEvents.delete(id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }

    if (timeframe === 'WEEKLY') {
      setWeeklyEntries(prev => prev.filter((_, i) => i !== index));
    } else if (timeframe === 'DAILY') {
      setDailyEntries(prev => prev.filter((_, i) => i !== index));
    } else if (timeframe === 'H4') {
      setH4Entries(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSaveEntry = async (timeframe: string, index: number, entry: DynamicEntry) => {
    if (!selectedPair) return;

    if (entry.isCRT && (!entry.reached50 || !entry.reaction)) {
      alert('When CRT is active, please select both 50% reached and Reaction');
      return;
    }

    setIsSaving(true);
    try {
      if (entry.id) {
        await apiService.crtEvents.update(entry.id, {
          date: entry.date,
          time: entry.time,
          isCRT: entry.isCRT,
          reached50: entry.isCRT ? entry.reached50 : 'NA',
          reaction: entry.isCRT ? entry.reaction : 'NA',
          image: entry.image,
          notes: entry.notes
        });
      } else {
        const result: any = await apiService.crtEvents.create({
          pair: selectedPair,
          timeframe,
          date: entry.date,
          time: entry.time,
          isCRT: entry.isCRT,
          reached50: entry.isCRT ? entry.reached50 : 'NA',
          reaction: entry.isCRT ? entry.reaction : 'NA',
          image: entry.image,
          notes: entry.notes
        });

        const newId = result._id || result.id;
        if (timeframe === 'WEEKLY') {
          const updated = [...weeklyEntries];
          updated[index] = { ...entry, id: newId };
          setWeeklyEntries(updated);
        } else if (timeframe === 'DAILY') {
          const updated = [...dailyEntries];
          updated[index] = { ...entry, id: newId };
          setDailyEntries(updated);
        } else if (timeframe === 'H4') {
          const updated = [...h4Entries];
          updated[index] = { ...entry, id: newId };
          setH4Entries(updated);
        }
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEntryImageUpload = async (file: File, timeframe: string, index: number) => {
    try {
      setUploadingImage(`${timeframe}-${index}`);
      const result: any = await apiService.upload.single(file);
      const imageUrl = result.url || result.secure_url;

      if (timeframe === 'WEEKLY') {
        const updated = [...weeklyEntries];
        if (updated[index]) updated[index].image = imageUrl;
        setWeeklyEntries(updated);
      } else if (timeframe === 'DAILY') {
        const updated = [...dailyEntries];
        if (updated[index]) updated[index].image = imageUrl;
        setDailyEntries(updated);
      } else if (timeframe === 'H4') {
        const updated = [...h4Entries];
        if (updated[index]) updated[index].image = imageUrl;
        setH4Entries(updated);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const updateEntry = (timeframe: string, index: number, updates: Partial<DynamicEntry>, setEntries: React.Dispatch<React.SetStateAction<DynamicEntry[]>>) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="CRT Tracker"
        subtitle="Track CRT (Candle Range Theory) opportunities"
      />

      <CardContainer>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mr-2">Pair:</label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            >
              {pairs.map(pair => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mr-2">Month:</label>
            <input
              type="month"
              value={format(currentMonth, 'yyyy-MM')}
              onChange={(e) => setCurrentMonth(new Date(e.target.value + '-01'))}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </CardContainer>

      {isLoading ? <LoadingSpinner /> : (
        <div className="space-y-6">
          {/* MONTHLY SECTION */}
          <MonthlySection
            entry={monthlyEntry}
            onChange={setMonthlyEntry}
            onSave={handleSaveMonthly}
            onUpload={handleImageUpload}
            uploading={uploadingImage === 'monthly'}
            isSaving={isSaving}
          />

          {/* WEEKLY SECTION */}
          <TimeframeSection
            title="Weekly"
            timeframe="WEEKLY"
            entries={weeklyEntries}
            onAdd={() => handleAddEntry('WEEKLY')}
            onRemove={handleRemoveEntry}
            onSave={handleSaveEntry}
            onUpdate={updateEntry}
            onImageUpload={handleEntryImageUpload}
            uploading={uploadingImage}
            isSaving={isSaving}
          />

          {/* DAILY SECTION */}
          <TimeframeSection
            title="Daily"
            timeframe="DAILY"
            entries={dailyEntries}
            onAdd={() => handleAddEntry('DAILY')}
            onRemove={handleRemoveEntry}
            onSave={handleSaveEntry}
            onUpdate={updateEntry}
            onImageUpload={handleEntryImageUpload}
            uploading={uploadingImage}
            isSaving={isSaving}
          />

          {/* H4 SECTION */}
          <TimeframeSection
            title="H4"
            timeframe="H4"
            entries={h4Entries}
            onAdd={() => handleAddEntry('H4')}
            onRemove={handleRemoveEntry}
            onSave={handleSaveEntry}
            onUpdate={updateEntry}
            onImageUpload={handleEntryImageUpload}
            uploading={uploadingImage}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
}

interface MonthlySectionProps {
  entry: MonthlyEntry;
  onChange: React.Dispatch<React.SetStateAction<MonthlyEntry>>;
  onSave: () => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  isSaving: boolean;
}

function MonthlySection({ entry, onChange, onSave, onUpload, uploading, isSaving }: MonthlySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <CardContainer>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-sm font-medium', TIMEFRAME_COLORS.MONTHLY)}>
            {TIMEFRAME_LABELS.MONTHLY}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Is CRT Playing? */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Is CRT Playing?</label>
          <div className="flex gap-2">
            <button
              onClick={() => onChange(prev => ({ ...prev, isCRT: true, reached50: 'YES', reaction: 'RESPECT' }))}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                entry.isCRT 
                  ? 'bg-green-100 border-green-300 text-green-700' 
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <Zap className="w-4 h-4" />
              Yes, CRT Active
            </button>
            <button
              onClick={() => onChange(prev => ({ ...prev, isCRT: false, reached50: 'NA', reaction: 'NA' }))}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                !entry.isCRT 
                  ? 'bg-slate-100 border-slate-300 text-slate-700' 
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <ZapOff className="w-4 h-4" />
              No CRT
            </button>
          </div>
        </div>

        {entry.isCRT && (
          <>
            {/* 50% Reached */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">50% Reached?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onChange(prev => ({ ...prev, reached50: 'YES' }))}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                    entry.reached50 === 'YES'
                      ? 'bg-blue-100 border-blue-300 text-blue-700' 
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <CheckSquare className="w-4 h-4" />
                  Yes
                </button>
                <button
                  onClick={() => onChange(prev => ({ ...prev, reached50: 'NO' }))}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                    entry.reached50 === 'NO'
                      ? 'bg-red-100 border-red-300 text-red-700' 
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <XSquare className="w-4 h-4" />
                  No
                </button>
              </div>
            </div>

            {/* Reaction */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reaction</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => onChange(prev => ({ ...prev, reaction: 'RESPECT' }))}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                    entry.reaction === 'RESPECT'
                      ? REACTION_COLORS.RESPECT
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  Respect
                </button>
                <button
                  onClick={() => onChange(prev => ({ ...prev, reaction: 'PARTIAL' }))}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                    entry.reaction === 'PARTIAL'
                      ? REACTION_COLORS.PARTIAL
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  Partial
                </button>
                <button
                  onClick={() => onChange(prev => ({ ...prev, reaction: 'FAILED' }))}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                    entry.reaction === 'FAILED'
                      ? REACTION_COLORS.FAILED
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  Failed
                </button>
              </div>
            </div>
          </>
        )}

        {/* Date & Image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
            <input
              type="date"
              value={entry.date}
              onChange={(e) => onChange(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              {entry.image && (
                <img src={entry.image} alt="CRT" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={entry.notes}
            onChange={(e) => onChange(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes about this CRT setup..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg min-h-[80px]"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Monthly CRT'}
        </button>
      </div>
    </CardContainer>
  );
}

interface TimeframeSectionProps {
  title: string;
  timeframe: string;
  entries: DynamicEntry[];
  onAdd: () => void;
  onRemove: (index: number, id?: string) => void;
  onSave: (timeframe: string, index: number, entry: DynamicEntry) => void;
  onUpdate: (timeframe: string, index: number, updates: Partial<DynamicEntry>, setEntries: React.Dispatch<React.SetStateAction<DynamicEntry[]>>) => void;
  onImageUpload: (file: File, timeframe: string, index: number) => void;
  uploading: string | null;
  isSaving: boolean;
}

function TimeframeSection({ title, timeframe, entries, onAdd, onRemove, onSave, onUpdate, onImageUpload, uploading, isSaving }: TimeframeSectionProps) {
  const colorClass = TIMEFRAME_COLORS[timeframe];
  const label = TIMEFRAME_LABELS[timeframe];

  return (
    <CardContainer>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-sm font-medium', colorClass)}>
            {label}
          </span>
          <span className="text-sm text-slate-500">({entries.length})</span>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <CRTEntryRow
            key={index}
            entry={entry}
            index={index}
            timeframe={timeframe}
            onRemove={(id) => onRemove(index, id)}
            onSave={() => onSave(timeframe, index, entry)}
            onUpdate={(updates, setEntries) => onUpdate(timeframe, index, updates, setEntries)}
            onImageUpload={(file) => onImageUpload(file, timeframe, index)}
            uploading={uploading === `${timeframe}-${index}`}
            isSaving={isSaving}
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

interface CRTEntryRowProps {
  entry: DynamicEntry;
  index: number;
  timeframe: string;
  onRemove: (id?: string) => void;
  onSave: () => void;
  onUpdate: (updates: Partial<DynamicEntry>, setEntries: React.Dispatch<React.SetStateAction<DynamicEntry[]>>) => void;
  onImageUpload: (file: File) => void;
  uploading: boolean;
  isSaving: boolean;
  colorClass: string;
}

function CRTEntryRow({ entry, index, timeframe, onRemove, onSave, onUpdate, onImageUpload, uploading, isSaving, colorClass }: CRTEntryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCRTChange = (isCRT: boolean) => {
    if (isCRT) {
      onUpdate({ isCRT: true, reached50: 'YES', reaction: 'RESPECT' }, () => {});
    } else {
      onUpdate({ isCRT: false, reached50: 'NA', reaction: 'NA' }, () => {});
    }
  };

  return (
    <div className={cn('p-4 border border-slate-200 rounded-lg', entry.isCRT && 'bg-green-50 border-green-200')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={entry.date}
            onChange={(e) => onUpdate({ date: e.target.value }, () => {})}
            className="px-2 py-1 border border-slate-200 rounded text-sm"
          />
          <input
            type="time"
            value={entry.time}
            onChange={(e) => onUpdate({ time: e.target.value }, () => {})}
            className="px-2 py-1 border border-slate-200 rounded text-sm"
          />
          
          <button
            onClick={() => handleCRTChange(!entry.isCRT)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-sm border',
              entry.isCRT 
                ? 'bg-green-100 text-green-700 border-green-200' 
                : 'bg-slate-100 text-slate-500 border-slate-200'
            )}
          >
            {entry.isCRT ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
            {entry.isCRT ? 'CRT' : 'No CRT'}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => onRemove(entry.id)}
            className="p-1 text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CRT Fields - Only show when CRT is active */}
      {entry.isCRT && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => onUpdate({ reached50: entry.reached50 === 'YES' ? 'NO' : 'YES' }, () => {})}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-sm border',
              entry.reached50 === 'YES'
                ? 'bg-blue-100 text-blue-700 border-blue-200' 
                : 'bg-slate-100 text-slate-500 border-slate-200'
            )}
          >
            {entry.reached50 === 'YES' ? '✓' : '✗'} 50%
          </button>
          
          <button
            onClick={() => {
              const reactions = ['RESPECT', 'PARTIAL', 'FAILED'];
              const currentIdx = reactions.indexOf(entry.reaction);
              const nextReaction = reactions[(currentIdx + 1) % reactions.length];
              onUpdate({ reaction: nextReaction }, () => {});
            }}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-sm border font-medium',
              REACTION_COLORS[entry.reaction] || 'bg-slate-100 text-slate-500 border-slate-200'
            )}
          >
            {entry.reaction}
          </button>
        </div>
      )}

      {/* Image & Notes Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageUpload(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 py-1 border border-slate-200 rounded text-sm hover:bg-slate-50"
        >
          <Upload className="w-3 h-3" />
          {uploading ? '...' : 'Image'}
        </button>
        
        {entry.image && (
          <img src={entry.image} alt="CRT" className="w-10 h-10 object-cover rounded border border-slate-200" />
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          {isExpanded ? 'Hide notes' : 'Show notes'}
        </button>
      </div>

      {isExpanded && (
        <textarea
          value={entry.notes}
          onChange={(e) => onUpdate({ notes: e.target.value }, () => {})}
          placeholder="Notes..."
          className="w-full mt-2 px-2 py-1 border border-slate-200 rounded text-sm min-h-[60px]"
        />
      )}
    </div>
  );
}