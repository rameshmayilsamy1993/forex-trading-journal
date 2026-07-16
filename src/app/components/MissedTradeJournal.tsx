import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Check, Eye, EyeOff, Image as ImageIcon, ZoomIn, Eye as ViewIcon, Clock, CalendarDays, BarChart3 } from 'lucide-react';
import { MissedTrade, MasterData, SMTType, Model1Type, Model1ConfirmationType, SsmtConfirmationType } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { showSuccess, showError, showConfirm } from '../hooks/useToast';
import { Input } from './ui/input';
import TimePicker from './ui/TimePicker';
import { Button } from './ui/button';
import ImageViewer from './ImageViewer';
import ExportMenu from './ExportMenu';
import { cn } from './ui/utils';
import { truncateText, stripHTML, decodeHtml, hasHTML } from '../utils/htmlUtils';
import { formatPrice } from '../utils/calculations';
import DOMPurify from 'dompurify';

const REASON_OPTIONS = [
  'Late Entry',
  'No Confirmation',
  'Fear',
  'Overthinking',
  'Missed Alert',
  'Risk Too High',
  'News Event',
  'Other'
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

const QUARTER_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  Q1: { bg: 'bg-blue-950/30', text: 'text-[#6D28D9]', ring: 'ring-blue-500/20' },
  Q2: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-500/20' },
  Q3: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500/20' },
  Q4: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-500/20' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  MISSED: { bg: 'bg-slate-100', text: 'text-muted-foreground' },
  REVIEWED: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  PLANNED: { bg: 'bg-blue-950/30', text: 'text-[#6D28D9]' },
  EXECUTED_LATER: { bg: 'bg-violet-50', text: 'text-violet-700' },
};

function formatTimeDisplay(time?: string): string {
  if (!time) return '';
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(time.trim())) return time.trim();
  const d = new Date(time);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const timePart = time.split('T').pop() || time;
  const [h, m] = timePart.split(':');
  if (h && m) {
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${String(hour12).padStart(2, '0')}:${m.replace(/[^0-9]/g, '').substring(0, 2)} ${ampm}`;
  }
  return time;
}

function extractTimeFromISO(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function extractDateFromISO(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function QuarterBadge({ quarter }: { quarter?: string }) {
  if (!quarter) return null;
  const style = QUARTER_STYLES[quarter] || QUARTER_STYLES.Q1;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold ring-1', style.bg, style.text, style.ring)}>
      {quarter}
    </span>
  );
}

function TurtleSoupBadge({ time }: { time?: string }) {
  const display = extractTimeFromISO(time) || formatTimeDisplay(time);
  if (!display) return <span className="text-caption text-slate-300">-</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-bold bg-gradient-to-r from-sky-100 to-blue-100 text-blue-800 ring-1 ring-blue-300/50 shadow-sm"
      title="T.S.Time"
    >
      <Clock className="w-3 h-3 text-blue-500" />
      {display}
    </span>
  );
}

function EntryTimeBadge({ time }: { time?: string }) {
  const display = formatTimeDisplay(time);
  if (!display) return <span className="text-caption text-slate-300">-</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption bg-amber-50 text-amber-700 ring-1 ring-amber-200/50">
      ⚡ {display}
    </span>
  );
}

const MODEL1_CONFIRMATION_OPTIONS = ['Yes (EURUSD, GBPUSD, DXY)', 'Yes (EURUSD, GBPUSD)', 'Yes (EURUSD)', 'No'] as const;
const SSMT_CONFIRMATION_OPTIONS = ['Yes (GBPUSD, DXY)', 'Yes (GBPUSD)', 'Yes (DXY)', 'Yes (EURUSD, DXY)', 'Yes (EURUSD)', 'No'] as const;

function Model1Badge({ value }: { value?: string }) {
  if (!value || value === 'No') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-red-100 text-red-700 ring-1 ring-red-300/50">No</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/50">{value}</span>;
}

function SsmtBadge({ value }: { value?: string }) {
  if (!value || value === 'No') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-red-100 text-red-700 ring-1 ring-red-300/50">No</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-blue-950/30 text-[#6D28D9] ring-1 ring-blue-300/50">{value}</span>;
}

export default function MissedTradeJournal() {
  const [missedTrades, setMissedTrades] = useState<MissedTrade[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [pairs, setPairs] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPair, setFilterPair] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDailyQuarter, setFilterDailyQuarter] = useState<string>('all');
  const [filterSixHourQuarter, setFilterSixHourQuarter] = useState<string>('all');
  const [filterModel1Confirmation, setFilterModel1Confirmation] = useState<string>('all');
  const [filterSsmtConfirmation, setFilterSsmtConfirmation] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTrade, setViewingTrade] = useState<MissedTrade | null>(null);
  const [viewingImages, setViewingImages] = useState<{ url: string; label: string }[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [viewingReason, setViewingReason] = useState<{ title: string; content: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    pair: '',
    type: 'BUY' as 'BUY' | 'SELL',
    date: '',
    time: '',
    turtleSoupDate: '',
    turtleSoupTime: '',
    dailyQuarter: '' as '' | 'Q1' | 'Q2' | 'Q3' | 'Q4',
    sixHourQuarter: '' as '' | 'Q1' | 'Q2' | 'Q3' | 'Q4',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    session: '',
    strategy: '',
    keyLevel: '',
    reason: '',
    emotion: '',
    smt: 'No' as SMTType,
    model1: 'Yes (EUR)' as Model1Type,
    model1Confirmation: 'No' as Model1ConfirmationType,
    ssmtConfirmation: 'No' as SsmtConfirmationType,
    profitLoss: '',
    commission: '',
    swap: '',
    realPL: 0,
    status: 'MISSED' as 'MISSED' | 'REVIEWED' | 'PLANNED' | 'EXECUTED_LATER',
    screenshots: { before: '', after: '' } as { before?: string; after?: string },
    notes: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [paginatedResult, mastersData, pairsData] = await Promise.all([
          apiService.get<{ data: MissedTrade[]; nextCursor: string | null; hasMore: boolean }>('/missed-trades/paginated?limit=20'),
          apiService.getMasters(),
          apiService.settings.getPairs()
        ]);
        if (paginatedResult.data && paginatedResult.data.length > 0) {
          setMissedTrades(paginatedResult.data);
          setCursor(paginatedResult.nextCursor);
          setHasMore(paginatedResult.hasMore);
        }
        setMasters(mastersData);
        setPairs(pairsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        setMasters([]);
        setPairs([]);
      }
    };
    loadData();
  }, []);

  const loadMoreMissedTrades = async () => {
    if (isLoadingMore || !hasMore || !cursor) return;
    setIsLoadingMore(true);
    try {
      const result = await apiService.get<{ data: MissedTrade[]; nextCursor: string | null; hasMore: boolean }>(`/missed-trades/paginated?cursor=${cursor}&limit=20`);
      if (result.data && result.data.length > 0) {
        setMissedTrades(prev => [...prev, ...result.data]);
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const sessions = useMemo(() => masters.filter(m => m.type === 'session'), [masters]);
  const strategies = useMemo(() => masters.filter(m => m.type === 'strategy'), [masters]);
  const keyLevels = useMemo(() => masters.filter(m => m.type === 'keyLevel'), [masters]);

  const calculateRR = (entry: number, sl: number, tp: number, type: 'BUY' | 'SELL'): number => {
    if (!entry || !sl || !tp || entry === sl) return 0;
    if (type === 'BUY') {
      return (tp - entry) / (entry - sl);
    } else {
      return (entry - tp) / (sl - entry);
    }
  };

  const calculatedRR = useMemo(() => {
    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.stopLoss);
    const tp = parseFloat(formData.takeProfit);
    if (entry && sl && tp) {
      return calculateRR(entry, sl, tp, formData.type);
    }
    return null;
  }, [formData.entryPrice, formData.stopLoss, formData.takeProfit, formData.type]);

  const calculatedRealPL = useMemo(() => {
    const profit = parseFloat(formData.profitLoss) || 0;
    const comm = Math.abs(parseFloat(formData.commission) || 0);
    const swp = Math.abs(parseFloat(formData.swap) || 0);
    return profit - comm - swp;
  }, [formData.profitLoss, formData.commission, formData.swap]);

  const availablePairs = useMemo(() => {
    const p = new Set<string>();
    missedTrades.forEach(t => { if (t.pair) p.add(t.pair); });
    return Array.from(p).sort();
  }, [missedTrades]);

  const filteredMissedTrades = useMemo(() => {
    return missedTrades.filter(trade => {
      if (filterStatus !== 'all' && trade.status !== filterStatus) return false;
      if (filterPair !== 'all' && trade.pair !== filterPair) return false;
      if (filterType !== 'all' && trade.type !== filterType) return false;
      if (filterDailyQuarter !== 'all' && trade.dailyQuarter !== filterDailyQuarter) return false;
      if (filterSixHourQuarter !== 'all' && trade.sixHourQuarter !== filterSixHourQuarter) return false;
      if (filterModel1Confirmation === 'Yes' && (!trade.model1Confirmation || trade.model1Confirmation === 'No')) return false;
      if (filterModel1Confirmation === 'No' && trade.model1Confirmation && trade.model1Confirmation !== 'No') return false;
      if (filterSsmtConfirmation === 'Yes' && (!trade.ssmtConfirmation || trade.ssmtConfirmation === 'No')) return false;
      if (filterSsmtConfirmation === 'No' && trade.ssmtConfirmation && trade.ssmtConfirmation !== 'No') return false;
      if (filterDateFrom && trade.date && new Date(trade.date) < new Date(filterDateFrom)) return false;
      if (filterDateTo && trade.date) {
        const endDate = new Date(filterDateTo);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(trade.date) > endDate) return false;
      }
      return true;
    });
  }, [missedTrades, filterStatus, filterPair, filterType, filterDailyQuarter, filterSixHourQuarter, filterModel1Confirmation, filterSsmtConfirmation, filterDateFrom, filterDateTo]);

  const stats = useMemo(() => {
    const total = filteredMissedTrades.length;
    const q1 = filteredMissedTrades.filter(t => t.dailyQuarter === 'Q1').length;
    const q2 = filteredMissedTrades.filter(t => t.dailyQuarter === 'Q2').length;
    const q3 = filteredMissedTrades.filter(t => t.dailyQuarter === 'Q3').length;
    const q4 = filteredMissedTrades.filter(t => t.dailyQuarter === 'Q4').length;
    const pairCounts: Record<string, number> = {};
    filteredMissedTrades.forEach(t => {
      pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1;
    });
    const mostMissedPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return { total, q1, q2, q3, q4, mostMissedPair };
  }, [filteredMissedTrades]);

  const resetForm = () => {
    setFormData({
      pair: '',
      type: 'BUY',
      date: '',
      time: '',
      turtleSoupDate: '',
      turtleSoupTime: '',
      dailyQuarter: '',
      sixHourQuarter: '',
      entryPrice: '',
      stopLoss: '',
      takeProfit: '',
      session: '',
      strategy: '',
      keyLevel: '',
      reason: '',
      emotion: '',
      smt: 'No',
      model1: 'Yes (EUR)',
      model1Confirmation: 'No',
      ssmtConfirmation: 'No',
      profitLoss: '',
      commission: '',
      swap: '',
      realPL: 0,
      status: 'MISSED',
      screenshots: { before: '', after: '' },
      notes: ''
    });
  };

  const startEdit = (trade: MissedTrade) => {
    setEditingId(trade.id);
    setFormData({
      pair: trade.pair,
      type: trade.type,
      date: trade.date.split('T')[0],
      time: trade.time || '',
      turtleSoupDate: extractDateFromISO(trade.turtleSoupTime),
      turtleSoupTime: trade.turtleSoupTime ? extractTimeFromISO(trade.turtleSoupTime) : '',
      dailyQuarter: (trade.dailyQuarter || '') as '' | 'Q1' | 'Q2' | 'Q3' | 'Q4',
      sixHourQuarter: (trade.sixHourQuarter || '') as '' | 'Q1' | 'Q2' | 'Q3' | 'Q4',
      entryPrice: trade.entryPrice.toString(),
      stopLoss: trade.stopLoss.toString(),
      takeProfit: trade.takeProfit.toString(),
      session: trade.session || '',
      strategy: trade.strategy || '',
      keyLevel: trade.keyLevel || '',
      reason: trade.reason,
      emotion: trade.emotion || '',
      smt: trade.smt || 'No',
      model1: trade.model1 || 'Yes (EUR)',
      model1Confirmation: trade.model1Confirmation || 'No',
      ssmtConfirmation: trade.ssmtConfirmation || 'No',
      profitLoss: trade.profitLoss?.toString() || '',
      commission: trade.commission?.toString() || '',
      swap: trade.swap?.toString() || '',
      realPL: trade.realPL || 0,
      status: trade.status,
      screenshots: trade.screenshots || { before: '', after: '' },
      notes: (trade as any).notes || ''
    });
    setIsAdding(false);
  };

  const handleSubmit = async () => {
    if (!formData.pair || !formData.entryPrice || !formData.stopLoss || !formData.takeProfit || !formData.date || !formData.reason) {
      showError('Please fill in all required fields');
      return;
    }

    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.stopLoss);
    const tp = parseFloat(formData.takeProfit);
    const rr = calculateRR(entry, sl, tp, formData.type);

    let turtleSoupTime = '';
    if (formData.turtleSoupDate && formData.turtleSoupTime) {
      turtleSoupTime = `${formData.turtleSoupDate}T${formData.turtleSoupTime}`;
    } else if (formData.turtleSoupDate) {
      turtleSoupTime = formData.turtleSoupDate;
    }

    const missedTradeData = {
      pair: formData.pair,
      type: formData.type,
      date: formData.date,
      time: formData.time,
      turtleSoupTime: turtleSoupTime || undefined,
      dailyQuarter: formData.dailyQuarter || undefined,
      sixHourQuarter: formData.sixHourQuarter || undefined,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      rr: parseFloat(rr.toFixed(2)),
      session: formData.session,
      strategy: formData.strategy,
      keyLevel: formData.keyLevel,
      missedReason: formData.reason,
      reason: formData.reason,
      emotion: formData.emotion,
      smt: formData.smt,
      model1: formData.model1,
      model1Confirmation: formData.model1Confirmation,
      ssmtConfirmation: formData.ssmtConfirmation,
      profitLoss: parseFloat(formData.profitLoss) || 0,
      commission: parseFloat(formData.commission) || 0,
      swap: parseFloat(formData.swap) || 0,
      realPL: calculatedRealPL,
      status: formData.status,
      screenshots: formData.screenshots,
      notes: formData.notes
    };

    try {
      if (editingId) {
        const updated = await apiService.updateMissedTrade(editingId, missedTradeData);
        setMissedTrades(missedTrades.map(t => t.id === editingId ? { ...updated, id: editingId } : t));
        setEditingId(null);
      } else {
        const created = await apiService.createMissedTrade(missedTradeData);
        setMissedTrades([{ ...created, id: created.id || Date.now().toString() }, ...missedTrades]);
        setIsAdding(false);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save missed trade:', error);
    }
  };

  const handleEdit = async (id: string) => {
    if (!formData.pair || !formData.entryPrice || !formData.stopLoss || !formData.takeProfit || !formData.date || !formData.reason) {
      showError('Please fill in all required fields');
      return;
    }

    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.stopLoss);
    const tp = parseFloat(formData.takeProfit);
    const rr = calculateRR(entry, sl, tp, formData.type);

    let turtleSoupTime = '';
    if (formData.turtleSoupDate && formData.turtleSoupTime) {
      turtleSoupTime = `${formData.turtleSoupDate}T${formData.turtleSoupTime}`;
    } else if (formData.turtleSoupDate) {
      turtleSoupTime = formData.turtleSoupDate;
    }

    const missedTradeData = {
      pair: formData.pair,
      type: formData.type,
      date: formData.date,
      time: formData.time,
      turtleSoupTime: turtleSoupTime || undefined,
      dailyQuarter: formData.dailyQuarter || undefined,
      sixHourQuarter: formData.sixHourQuarter || undefined,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      rr: parseFloat(rr.toFixed(2)),
      session: formData.session,
      strategy: formData.strategy,
      keyLevel: formData.keyLevel,
      missedReason: formData.reason,
      reason: formData.reason,
      emotion: formData.emotion,
      smt: formData.smt,
      model1: formData.model1,
      model1Confirmation: formData.model1Confirmation,
      ssmtConfirmation: formData.ssmtConfirmation,
      profitLoss: parseFloat(formData.profitLoss) || 0,
      commission: parseFloat(formData.commission) || 0,
      swap: parseFloat(formData.swap) || 0,
      realPL: calculatedRealPL,
      status: formData.status,
      screenshots: formData.screenshots,
      notes: formData.notes
    };

    try {
      const updated = await apiService.updateMissedTrade(id, missedTradeData);
      setMissedTrades(missedTrades.map(t => t.id === id ? { ...updated, id } : t));
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update missed trade:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm('Are you sure you want to delete this missed trade?')) {
      try {
        await apiService.deleteMissedTrade(id);
        setMissedTrades(missedTrades.filter(t => t.id !== id));
      } catch (error) {
        console.error('Failed to delete missed trade:', error);
        setMissedTrades(missedTrades.filter(t => t.id !== id));
      }
    }
  };

  const toggleReviewStatus = async (trade: MissedTrade) => {
    const newStatus = trade.status === 'MISSED' ? 'REVIEWED' : 'MISSED';
    try {
      await apiService.updateMissedTrade(trade.id, { ...trade, status: newStatus });
      setMissedTrades(missedTrades.map(t => t.id === trade.id ? { ...t, status: newStatus } : t));
    } catch (error) {
      setMissedTrades(missedTrades.map(t => t.id === trade.id ? { ...t, status: newStatus } : t));
    }
  };

  const handleFileUpload = (field: 'before' | 'after') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(field);
      try {
        const result = await apiService.upload.single(file);
        setFormData({
          ...formData,
          screenshots: { ...formData.screenshots, [field]: result.url }
        });
      } catch (error) {
        console.error('Failed to upload image:', error);
        showError('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(null);
      }
    }
  };

  const statusOptions = [
    { value: 'MISSED', label: 'Missed' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'PLANNED', label: 'Planned' },
    { value: 'EXECUTED_LATER', label: 'Executed Later' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-page-title font-bold text-foreground">CRT Missed Trade Journal</h2>
            <p className="text-body text-muted-foreground mt-1">Track ICT/CRT missed trading opportunities with Turtle Soup timing</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportMenu type="missed-trades" />
            <button
              onClick={() => { setIsAdding(true); resetForm(); setEditingId(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white text-button rounded-xl hover:from-[#6D28D9] hover:to-[#4338CA] shadow-lg shadow-[#7C3AED]/25 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Add CRT Missed Trade
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-orange-600 uppercase">Total CRT Missed</p>
            <p className="text-page-title font-bold text-orange-700 mt-1">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-[#7C3AED] uppercase">Q1 Trades</p>
            <p className="text-page-title font-bold text-[#6D28D9] mt-1">{stats.q1}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-emerald-600 uppercase">Q2 Trades</p>
            <p className="text-page-title font-bold text-emerald-700 mt-1">{stats.q2}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-orange-600 uppercase">Q3 Trades</p>
            <p className="text-page-title font-bold text-orange-700 mt-1">{stats.q3}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-purple-600 uppercase">Q4 Trades</p>
            <p className="text-page-title font-bold text-purple-700 mt-1">{stats.q4}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-muted-foreground uppercase">Most Missed Pair</p>
            <p className="text-page-title font-bold text-foreground mt-1">{stats.mostMissedPair || '-'}</p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] p-5">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterPair} onValueChange={setFilterPair}>
            <SelectTrigger className="w-[130px] bg-[#F8FAFC] border-[#E2E8F0]">
              <SelectValue placeholder="All Pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs</SelectItem>
              {availablePairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[110px] bg-[#F8FAFC] border-[#E2E8F0]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="BUY">BUY</SelectItem>
              <SelectItem value="SELL">SELL</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] bg-[#F8FAFC] border-[#E2E8F0]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDailyQuarter} onValueChange={setFilterDailyQuarter}>
            <SelectTrigger className="w-[130px] bg-[#F8FAFC] border-[#E2E8F0]">
              <SelectValue placeholder="Daily Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSixHourQuarter} onValueChange={setFilterSixHourQuarter}>
            <SelectTrigger className="w-[130px] bg-[#F8FAFC] border-[#E2E8F0]">
              <SelectValue placeholder="6HR Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterModel1Confirmation} onValueChange={setFilterModel1Confirmation}>
            <SelectTrigger className="w-[130px] bg-[#F8FAFC] border-[#E2E8F0]">
              <SelectValue placeholder="Model #1" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSsmtConfirmation} onValueChange={setFilterSsmtConfirmation}>
            <SelectTrigger className="w-[130px] bg-[#F8FAFC] border-[#E2E8F0]">
              <SelectValue placeholder="SSMT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-[140px]" placeholder="From" />
          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-[140px]" placeholder="To" />
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] p-6">
          <h3 className="font-bold text-card-title text-foreground mb-6 flex items-center gap-2">
            {editingId ? 'Edit CRT Missed Trade' : 'New CRT Missed Trade'}
          </h3>

          <div className="space-y-6">
            {/* Section 1: Trade Basics */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">1</span>
                Trade Basics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Pair *</label>
                  <Select value={formData.pair} onValueChange={(value) => setFormData({ ...formData, pair: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select Pair" />
                    </SelectTrigger>
                    <SelectContent>
                      {pairs.length > 0 ? (
                        pairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)
                      ) : (
                        <SelectItem value="EURUSD">EURUSD</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Type *</label>
                  <Select value={formData.type} onValueChange={(value: 'BUY' | 'SELL') => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Entry Price *</label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="1.0850"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.entryPrice}
                    onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Stop Loss *</label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="1.0820"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.stopLoss}
                    onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Take Profit *</label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="1.0950"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.takeProfit}
                    onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">RR Ratio</label>
                  <div className="h-12 px-3 flex items-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <span className={calculatedRR !== null ? (calculatedRR >= 1 ? 'text-[#10B981] font-medium' : 'text-[#F59E0B] font-medium') : 'text-slate-400'}>
                      {calculatedRR !== null ? `1:${calculatedRR.toFixed(2)}` : 'Auto'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Timing Information */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">2</span>
                Timing Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Date *</label>
                  <Input
                    type="date"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Entry Time</label>
                  <TimePicker
                    value={formData.time}
                    onChange={(val) => setFormData({ ...formData, time: val })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Turtle Soup Date</label>
                  <Input
                    type="date"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.turtleSoupDate}
                    onChange={(e) => setFormData({ ...formData, turtleSoupDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Turtle Soup Time</label>
                  <TimePicker
                    value={formData.turtleSoupTime}
                    onChange={(val) => setFormData({ ...formData, turtleSoupTime: val })}
                  />
                </div>
                <div className="flex items-end pb-3">
                  {(formData.turtleSoupDate || formData.turtleSoupTime) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-bold bg-gradient-to-r from-sky-100 to-blue-100 text-blue-800 ring-1 ring-blue-300/50">
                      <Clock className="w-3 h-3 text-blue-500" />
                      {formData.turtleSoupTime || '--:-- --'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Daily Quarter</label>
                  <Select value={formData.dailyQuarter} onValueChange={(value) => setFormData({ ...formData, dailyQuarter: value as any })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select Q" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">6HR Quarter</label>
                  <Select value={formData.sixHourQuarter} onValueChange={(value) => setFormData({ ...formData, sixHourQuarter: value as any })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select Q" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-3">
                  {formData.dailyQuarter && <QuarterBadge quarter={formData.dailyQuarter} />}
                  {formData.sixHourQuarter && <QuarterBadge quarter={formData.sixHourQuarter} />}
                </div>
              </div>
            </div>

            {/* Section 3: Financials */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">3</span>
                Financials
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Profit/Loss</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7 bg-white border-[#E2E8F0]" value={formData.profitLoss} onChange={(e) => setFormData({ ...formData, profitLoss: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Commission</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7 bg-white border-[#E2E8F0]" value={formData.commission} onChange={(e) => setFormData({ ...formData, commission: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Swap</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7 bg-white border-[#E2E8F0]" value={formData.swap} onChange={(e) => setFormData({ ...formData, swap: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Real P/L</label>
                  <div className={`h-12 px-3 flex items-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] font-semibold ${calculatedRealPL >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {calculatedRealPL >= 0 ? '+' : ''}${calculatedRealPL.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: CRT Confirmations */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">4</span>
                CRT Confirmations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Model #1 Confirmation</label>
                  <Select value={formData.model1Confirmation} onValueChange={(value: Model1ConfirmationType) => setFormData({ ...formData, model1Confirmation: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL1_CONFIRMATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">SSMT Confirmation</label>
                  <Select value={formData.ssmtConfirmation} onValueChange={(value: SsmtConfirmationType) => setFormData({ ...formData, ssmtConfirmation: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {SSMT_CONFIRMATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 5: Missed Trade Info */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">5</span>
                Missed Trade Info
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Reason Missed *</label>
                  <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASON_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Status</label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Emotion</label>
                  <Input placeholder="Optional" className="bg-white border-[#E2E8F0]" value={formData.emotion} onChange={(e) => setFormData({ ...formData, emotion: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Section 6: Analysis Notes */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">6</span>
                Analysis Notes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-2">Before Screenshot</label>
                  <div className="modern-file-upload group relative border-2 border-dashed border-[#E2E8F0] rounded-lg p-4 hover:border-[#7C3AED] transition-colors">
                    <input type="file" accept="image/*" onChange={handleFileUpload('before')} disabled={uploadingImage === 'before'} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {uploadingImage === 'before' ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7C3AED]"></div>
                      ) : (
                        <>
                          <div className="p-2 bg-violet-50 rounded-full group-hover:bg-violet-100 transition-colors">
                            <ImageIcon className="w-5 h-5 text-[#7C3AED]" />
                          </div>
                          <span className="text-caption text-muted-foreground">Click to upload</span>
                        </>
                      )}
                    </div>
                  </div>
                  {formData.screenshots.before && (
                    <div className="relative mt-2 inline-block">
                      <img src={formData.screenshots.before} alt="Before" className="h-16 rounded object-cover border border-[#E2E8F0]" />
                      <button onClick={() => setFormData({ ...formData, screenshots: { ...formData.screenshots, before: '' } })} className="absolute -top-2 -right-2 p-1 bg-[#EF4444] text-white rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-2">After Screenshot</label>
                  <div className="modern-file-upload group relative border-2 border-dashed border-[#E2E8F0] rounded-lg p-4 hover:border-[#7C3AED] transition-colors">
                    <input type="file" accept="image/*" onChange={handleFileUpload('after')} disabled={uploadingImage === 'after'} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {uploadingImage === 'after' ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7C3AED]"></div>
                      ) : (
                        <>
                          <div className="p-2 bg-violet-50 rounded-full group-hover:bg-violet-100 transition-colors">
                            <ImageIcon className="w-5 h-5 text-[#7C3AED]" />
                          </div>
                          <span className="text-caption text-muted-foreground">Click to upload</span>
                        </>
                      )}
                    </div>
                  </div>
                  {formData.screenshots.after && (
                    <div className="relative mt-2 inline-block">
                      <img src={formData.screenshots.after} alt="After" className="h-16 rounded object-cover border border-[#E2E8F0]" />
                      <button onClick={() => setFormData({ ...formData, screenshots: { ...formData.screenshots, after: '' } })} className="absolute -top-2 -right-2 p-1 bg-[#EF4444] text-white rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-2">Notes</label>
                  <textarea
                    placeholder="Add notes about why this trade was missed..."
                    className="w-full h-28 p-3 bg-white border border-[#E2E8F0] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 text-body"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#E2E8F0]">
            <button onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-200 text-foreground text-button rounded-xl hover:bg-slate-300 transition-all duration-200">
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button onClick={editingId ? () => handleEdit(editingId) : handleSubmit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white text-button rounded-xl hover:from-[#6D28D9] hover:to-[#4338CA] shadow-lg shadow-[#7C3AED]/25 transition-all duration-200 hover:-translate-y-0.5">
              <Check className="w-4 h-4" />
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredMissedTrades.length === 0 && !isAdding && (
        <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] p-12 text-center">
          <EyeOff className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No CRT missed trades found</p>
          <p className="text-body text-slate-400 mt-1">Click "Add CRT Missed Trade" to record one</p>
        </div>
      )}

      {/* Table */}
      {filteredMissedTrades.length > 0 && (
        <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] overflow-hidden transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Date</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Entry Time</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">T.S.Time</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Pair</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Type</th>
                  <th className="text-right py-3.5 px-4 text-table-header text-muted-foreground">Entry</th>
                  <th className="text-right py-3.5 px-4 text-table-header text-muted-foreground">SL</th>
                  <th className="text-right py-3.5 px-4 text-table-header text-muted-foreground">TP</th>
                  <th className="text-right py-3.5 px-4 text-table-header text-muted-foreground">Real P/L</th>
                  <th className="text-center py-3.5 px-4 text-table-header text-muted-foreground">Daily Q</th>
                  <th className="text-center py-3.5 px-4 text-table-header text-muted-foreground">6HR Q</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Status</th>
                  <th className="text-right py-3.5 px-4 text-table-header text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMissedTrades.map(trade => {
                  const realPL = trade.realPL ?? ((trade.profitLoss || 0) - Math.abs(trade.commission || 0) - Math.abs(trade.swap || 0));
                  const statusStyle = STATUS_STYLES[trade.status] || STATUS_STYLES.MISSED;
                  return (
                    <tr key={trade.id} className="border-b border-[#E2E8F0]/60 hover:bg-[#F1F5F9]/60 transition-colors duration-150">
                      <td className="py-3.5 px-4 text-table-cell text-foreground whitespace-nowrap">
                        {new Date(trade.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <EntryTimeBadge time={trade.time} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <TurtleSoupBadge time={trade.turtleSoupTime} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-caption font-bold bg-[#F8FAFC] text-foreground ring-1 ring-[#E5E7EB]">
                          {trade.pair}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-caption font-bold ${trade.type === 'BUY' ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/50' : 'bg-red-100 text-red-700 ring-1 ring-red-300/50'
                          }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-table-cell text-right font-mono text-foreground whitespace-nowrap">{formatPrice(trade.entryPrice, trade.pair)}</td>
                      <td className="py-3.5 px-4 text-table-cell text-right font-mono text-[#EF4444] whitespace-nowrap">{formatPrice(trade.stopLoss, trade.pair)}</td>
                      <td className="py-3.5 px-4 text-table-cell text-right font-mono text-[#10B981] whitespace-nowrap">{formatPrice(trade.takeProfit, trade.pair)}</td>
                      <td className={`py-3.5 px-4 text-table-cell text-right whitespace-nowrap ${realPL >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {realPL >= 0 ? '+' : ''}${realPL.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <QuarterBadge quarter={trade.dailyQuarter} />
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <QuarterBadge quarter={trade.sixHourQuarter} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-caption font-bold ring-1 ring-[#E5E7EB]', statusStyle.bg, statusStyle.text)}>
                          {trade.status === 'EXECUTED_LATER' ? 'Executed Later' : trade.status.charAt(0) + trade.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          {(trade.screenshots?.before || trade.screenshots?.after) && (
                            <button onClick={() => { const imgs = []; if (trade.screenshots?.before) imgs.push({ url: trade.screenshots.before, label: 'Before' }); if (trade.screenshots?.after) imgs.push({ url: trade.screenshots.after, label: 'After' }); setViewingImages(imgs); setViewingImageIndex(0); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="View screenshots">
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => setViewingTrade(trade)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View details">
                            <ViewIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => startEdit(trade)} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(trade.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Load More */}
      {filteredMissedTrades.length > 0 && hasMore && (
        <div className="flex justify-center py-4">
          <button onClick={loadMoreMissedTrades} disabled={isLoadingMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white text-button rounded-xl hover:from-[#6D28D9] hover:to-[#4338CA] shadow-lg shadow-[#7C3AED]/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Image Viewer */}
      {viewingImages.length > 0 && (
        <ImageViewer images={viewingImages} initialIndex={viewingImageIndex} onClose={() => setViewingImages([])} />
      )}

      {/* CRT Missed Trade Details Modal */}
      {viewingTrade && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setViewingTrade(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[#E2E8F0] bg-gradient-to-r from-violet-50/40 to-white flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-section-title font-bold text-foreground">CRT Missed Trade</h2>
                    <span className={`px-3 py-1 rounded-full text-body-sm ${viewingTrade.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {viewingTrade.type}
                    </span>
                    <span className="text-body-sm text-muted-foreground">{viewingTrade.pair}</span>
                  </div>
                  <p className="text-body text-muted-foreground mt-1">
                    {new Date(viewingTrade.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setViewingTrade(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Section 1: Trade Information */}
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></span>
                  Trade Information
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Pair</p>
                    <p className="text-body-sm text-foreground mt-0.5">{viewingTrade.pair}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Type</p>
                    <p className={`text-body-sm mt-0.5 ${viewingTrade.type === 'BUY' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{viewingTrade.type}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Entry</p>
                    <p className="text-body-sm text-foreground mt-0.5 font-mono">{formatPrice(viewingTrade.entryPrice, viewingTrade.pair)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Stop Loss</p>
                    <p className="text-body-sm text-[#EF4444] mt-0.5 font-mono">{formatPrice(viewingTrade.stopLoss, viewingTrade.pair)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Take Profit</p>
                    <p className="text-body-sm text-[#10B981] mt-0.5 font-mono">{formatPrice(viewingTrade.takeProfit, viewingTrade.pair)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Real P/L</p>
                    <p className={`text-body-sm mt-0.5 ${(viewingTrade.realPL || 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {(viewingTrade.realPL || 0) >= 0 ? '+' : ''}${viewingTrade.realPL?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Timing Information */}
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></span>
                  Timing Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Entry Time</p>
                    <div className="mt-1"><EntryTimeBadge time={viewingTrade.time} /></div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Turtle Soup High Time</p>
                    <div className="mt-1"><TurtleSoupBadge time={viewingTrade.turtleSoupTime} /></div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Daily Quarter</p>
                    <div className="mt-1"><QuarterBadge quarter={viewingTrade.dailyQuarter} /></div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">6HR Quarter</p>
                    <div className="mt-1"><QuarterBadge quarter={viewingTrade.sixHourQuarter} /></div>
                  </div>
                </div>
              </div>

              {/* Section 3: CRT Confirmations */}
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-blue-600 rounded-full"></span>
                  CRT Confirmations
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground mb-1">Model #1</p>
                    <p className="text-body-sm mt-1">
                      {viewingTrade.model1Confirmation && viewingTrade.model1Confirmation !== 'No' ? (
                        <span className="text-emerald-600">✔ {viewingTrade.model1Confirmation}</span>
                      ) : (
                        <span className="text-red-500">❌ No</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground mb-1">SSMT</p>
                    <p className="text-body-sm mt-1">
                      {viewingTrade.ssmtConfirmation && viewingTrade.ssmtConfirmation !== 'No' ? (
                        <span className="text-[#7C3AED]">✔ {viewingTrade.ssmtConfirmation}</span>
                      ) : (
                        <span className="text-red-500">❌ No</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Analysis Notes */}
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-rose-500 to-pink-600 rounded-full"></span>
                  Analysis Notes
                </h4>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground mb-1">Reason Missed</p>
                    <p className="text-body text-foreground">{viewingTrade.reason || viewingTrade.missedReason || '-'}</p>
                  </div>
                  {(viewingTrade as any).notes && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground mb-1">Notes</p>
                      <p className="text-body text-foreground">{(viewingTrade as any).notes}</p>
                    </div>
                  )}
                  {(viewingTrade.screenshots?.before || viewingTrade.screenshots?.after) && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground mb-2">Screenshots</p>
                      <div className="grid grid-cols-2 gap-3">
                        {viewingTrade.screenshots?.before && (
                          <div className="relative group rounded-lg overflow-hidden cursor-pointer" onClick={() => { const imgs = [{ url: viewingTrade.screenshots!.before!, label: 'Before' }]; if (viewingTrade.screenshots?.after) imgs.push({ url: viewingTrade.screenshots.after, label: 'After' }); setViewingImages(imgs); setViewingImageIndex(0); }}>
                            <img src={viewingTrade.screenshots.before} alt="Before" className="w-full h-28 object-cover rounded-lg" />
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-caption px-2 py-0.5 rounded">Before</span>
                          </div>
                        )}
                        {viewingTrade.screenshots?.after && (
                          <div className="relative group rounded-lg overflow-hidden cursor-pointer" onClick={() => { const imgs = []; if (viewingTrade.screenshots?.before) imgs.push({ url: viewingTrade.screenshots.before, label: 'Before' }); imgs.push({ url: viewingTrade.screenshots!.after!, label: 'After' }); setViewingImages(imgs); setViewingImageIndex(imgs.length - 1); }}>
                            <img src={viewingTrade.screenshots.after} alt="After" className="w-full h-28 object-cover rounded-lg" />
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-caption px-2 py-0.5 rounded">After</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missed Reason Viewer Modal */}
      {viewingReason && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setViewingReason(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[#E2E8F0] bg-gradient-to-r from-violet-50 to-indigo-50/50">
              <div className="flex items-center justify-between">
                <h3 className="text-card-title font-bold text-foreground">{viewingReason.title}</h3>
                <button onClick={() => setViewingReason(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: viewingReason.content }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
