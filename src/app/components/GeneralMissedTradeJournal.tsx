import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Check, Eye, EyeOff, Image as ImageIcon, Clock, BarChart3, ChevronRight } from 'lucide-react';
import { GeneralMissedTrade, GeneralMissedTradeStatus, MasterData } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { showSuccess, showError, showConfirm } from '../hooks/useToast';
import { Input } from './ui/input';
import TimePicker from './ui/TimePicker';
import { Button } from './ui/button';
import ImageViewer from './ImageViewer';
import AccountSelect from './ui/AccountSelect';
import { cn } from './ui/utils';
import { formatPrice, formatMoney } from '../utils/calculations';

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

const MISSED_STATUS_OPTIONS = [
  { value: 'PLANNED' as GeneralMissedTradeStatus, label: 'Planned' },
  { value: 'MISSED' as GeneralMissedTradeStatus, label: 'Missed' },
  { value: 'EXECUTED_LATER' as GeneralMissedTradeStatus, label: 'Executed Later' },
];

const MISSED_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PLANNED: { bg: 'bg-blue-950/30', text: 'text-[#6D28D9]' },
  MISSED: { bg: 'bg-slate-100', text: 'text-muted-foreground' },
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

function EntryTimeBadge({ time }: { time?: string }) {
  const display = formatTimeDisplay(time);
  if (!display) return <span className="text-caption text-slate-300">-</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption bg-amber-50 text-amber-700 ring-1 ring-amber-200/50">
      <Clock className="w-3 h-3 text-amber-500" />
      {display}
    </span>
  );
}

function calculateDuration(entryTime?: string, exitTime?: string): string {
  if (!entryTime || !exitTime) return '-';
  const toMinutes = (t: string): number | null => {
    const cleaned = t.trim().toUpperCase();
    let match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (match[3] === 'PM' && h !== 12) h += 12;
      if (match[3] === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }
    match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      return h * 60 + m;
    }
    return null;
  };
  const entryMin = toMinutes(entryTime);
  const exitMin = toMinutes(exitTime);
  if (entryMin === null || exitMin === null) return '-';
  let diff = exitMin - entryMin;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function GeneralMissedTradeJournal() {
  const [missedTrades, setMissedTrades] = useState<GeneralMissedTrade[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [firms, setFirms] = useState<any[]>([]);
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [pairs, setPairs] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPair, setFilterPair] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMissedStatus, setFilterMissedStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTrade, setViewingTrade] = useState<GeneralMissedTrade | null>(null);
  const [viewingImages, setViewingImages] = useState<{ url: string; label: string }[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [keyLevelExpanded, setKeyLevelExpanded] = useState(false);

  const [formData, setFormData] = useState({
    accountId: '',
    propFirmId: '',
    pair: '',
    type: 'BUY' as 'BUY' | 'SELL',
    status: 'OPEN' as 'OPEN' | 'CLOSED',
    entryPrice: '',
    exitPrice: '',
    lotSize: '',
    commission: '',
    swap: '',
    profit: '',
    entryDate: '',
    entryTime: '',
    exitDate: '',
    exitTime: '',
    stopLoss: '',
    takeProfit: '',
    notes: '',
    session: '',
    strategy: '',
    keyLevel: '',
    beforeScreenshot: '',
    afterScreenshot: '',
    reason: '',
    missedStatus: 'MISSED' as GeneralMissedTradeStatus,
    rrAchievable: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [missedTradesData, accountsData, firmsData, mastersData, pairsData] = await Promise.all([
          apiService.getGeneralMissedTrades(),
          apiService.getAccounts(),
          apiService.getPropFirms(),
          apiService.getMasters(),
          apiService.settings.getPairs()
        ]);
        if (Array.isArray(missedTradesData)) {
          setMissedTrades(missedTradesData);
        }
        setAccounts(accountsData);
        setFirms(firmsData);
        setMasters(mastersData);
        setPairs(pairsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        setMasters([]);
        setPairs([]);
        setAccounts([]);
        setFirms([]);
      }
    };
    loadData();
  }, []);

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
    const profit = parseFloat(formData.profit) || 0;
    const comm = Math.abs(parseFloat(formData.commission) || 0);
    const swp = Math.abs(parseFloat(formData.swap) || 0);
    return profit - comm - swp;
  }, [formData.profit, formData.commission, formData.swap]);

  const availablePairs = useMemo(() => {
    const p = new Set<string>();
    missedTrades.forEach(t => { if (t.pair) p.add(t.pair); });
    return Array.from(p).sort();
  }, [missedTrades]);

  const filteredMissedTrades = useMemo(() => {
    return missedTrades.filter(trade => {
      if (filterPair !== 'all' && trade.pair !== filterPair) return false;
      if (filterType !== 'all' && trade.type !== filterType) return false;
      if (filterMissedStatus !== 'all' && trade.missedStatus !== filterMissedStatus) return false;
      if (filterDateFrom && trade.entryDate && new Date(trade.entryDate) < new Date(filterDateFrom)) return false;
      if (filterDateTo && trade.entryDate) {
        const endDate = new Date(filterDateTo);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(trade.entryDate) > endDate) return false;
      }
      return true;
    });
  }, [missedTrades, filterPair, filterType, filterMissedStatus, filterDateFrom, filterDateTo]);

  const stats = useMemo(() => {
    const total = filteredMissedTrades.length;
    const planned = filteredMissedTrades.filter(t => t.missedStatus === 'PLANNED').length;
    const missed = filteredMissedTrades.filter(t => t.missedStatus === 'MISSED').length;
    const executedLater = filteredMissedTrades.filter(t => t.missedStatus === 'EXECUTED_LATER').length;
    const totalPL = filteredMissedTrades.reduce((sum, t) => sum + (t.realPL ?? 0), 0);
    const pairCounts: Record<string, number> = {};
    filteredMissedTrades.forEach(t => {
      pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1;
    });
    const mostMissedPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return { total, planned, missed, executedLater, totalPL, mostMissedPair };
  }, [filteredMissedTrades]);

  const keyLevelStats = useMemo(() => {
    const grouped = new Map<string, { trades: number; wins: number; losses: number; netPL: number }>();
    for (const trade of filteredMissedTrades) {
      const kl = trade.keyLevel || 'No Key Level';
      const existing = grouped.get(kl) || { trades: 0, wins: 0, losses: 0, netPL: 0 };
      existing.trades += 1;
      const pl = trade.realPL ?? 0;
      existing.netPL += pl;
      if (pl > 0) existing.wins += 1;
      else if (pl < 0) existing.losses += 1;
      grouped.set(kl, existing);
    }
    return Array.from(grouped.entries())
      .map(([keyLevel, data]) => ({
        keyLevel,
        ...data,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      }))
      .sort((a, b) => b.trades - a.trades);
  }, [filteredMissedTrades]);

  const resetForm = () => {
    setFormData({
      accountId: '',
      propFirmId: '',
      pair: '',
      type: 'BUY',
      status: 'OPEN',
      entryPrice: '',
      exitPrice: '',
      lotSize: '',
      commission: '',
      swap: '',
      profit: '',
      entryDate: '',
      entryTime: '',
      exitDate: '',
      exitTime: '',
      stopLoss: '',
      takeProfit: '',
      notes: '',
      session: '',
      strategy: '',
      keyLevel: '',
      beforeScreenshot: '',
      afterScreenshot: '',
      reason: '',
      missedStatus: 'MISSED',
      rrAchievable: '',
    });
  };

  const startEdit = (trade: GeneralMissedTrade) => {
    setEditingId(trade.id);
    setFormData({
      accountId: trade.accountId || '',
      propFirmId: trade.propFirmId || '',
      pair: trade.pair,
      type: trade.type,
      status: trade.status,
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice?.toString() || '',
      lotSize: trade.lotSize.toString(),
      commission: trade.commission?.toString() || '',
      swap: trade.swap?.toString() || '',
      profit: trade.profit?.toString() || '',
      entryDate: extractDateFromISO(trade.entryDate),
      entryTime: formatTimeDisplay(trade.entryTime),
      exitDate: extractDateFromISO(trade.exitDate),
      exitTime: formatTimeDisplay(trade.exitTime),
      stopLoss: trade.stopLoss?.toString() || '',
      takeProfit: trade.takeProfit?.toString() || '',
      notes: trade.notes || '',
      session: trade.session || '',
      strategy: trade.strategy || '',
      keyLevel: trade.keyLevel || '',
      beforeScreenshot: trade.beforeScreenshot || '',
      afterScreenshot: trade.afterScreenshot || '',
      reason: trade.reason,
      missedStatus: trade.missedStatus,
      rrAchievable: (trade as any).rrAchievable || '',
    });
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.pair || !formData.entryPrice || !formData.lotSize || !formData.entryDate || !formData.reason) {
      showError('Please fill in all required fields: Pair, Entry Price, Lot Size, Entry Date, and Reason');
      return;
    }

    const entry = parseFloat(formData.entryPrice);
    const sl = formData.stopLoss ? parseFloat(formData.stopLoss) : undefined;
    const tp = formData.takeProfit ? parseFloat(formData.takeProfit) : undefined;
    let rr: number | undefined;
    if (entry && sl && tp) {
      rr = parseFloat(calculateRR(entry, sl, tp, formData.type).toFixed(2));
    }

    const missedTradeData = {
      accountId: formData.accountId || undefined,
      propFirmId: formData.propFirmId || undefined,
      pair: formData.pair,
      type: formData.type,
      status: formData.status,
      entryPrice: entry,
      exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
      lotSize: parseFloat(formData.lotSize),
      commission: formData.commission ? parseFloat(formData.commission) : undefined,
      swap: formData.swap ? parseFloat(formData.swap) : undefined,
      profit: formData.profit ? parseFloat(formData.profit) : undefined,
      realPL: calculatedRealPL,
      entryDate: formData.entryDate,
      entryTime: formData.entryTime || undefined,
      exitDate: formData.exitDate || undefined,
      exitTime: formData.exitTime || undefined,
      stopLoss: sl,
      takeProfit: tp,
      riskRewardRatio: rr,
      notes: formData.notes || undefined,
      session: formData.session || undefined,
      strategy: formData.strategy || undefined,
      keyLevel: formData.keyLevel || undefined,
      beforeScreenshot: formData.beforeScreenshot || undefined,
      afterScreenshot: formData.afterScreenshot || undefined,
      reason: formData.reason,
      missedStatus: formData.missedStatus,
      rrAchievable: formData.rrAchievable || undefined,
    };

    try {
      if (editingId) {
        const updated = await apiService.updateGeneralMissedTrade(editingId, missedTradeData);
        setMissedTrades(missedTrades.map(t => t.id === editingId ? { ...updated, id: editingId } : t));
        setEditingId(null);
      } else {
        const created = await apiService.createGeneralMissedTrade(missedTradeData);
        setMissedTrades([{ ...created, id: created.id || Date.now().toString() }, ...missedTrades]);
        setIsAdding(false);
      }
      resetForm();
      showSuccess(editingId ? 'Missed trade updated' : 'Missed trade created');
    } catch (error) {
      console.error('Failed to save missed trade:', error);
      showError('Failed to save missed trade');
    }
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm('Are you sure you want to delete this missed trade?')) {
      try {
        await apiService.deleteGeneralMissedTrade(id);
        setMissedTrades(missedTrades.filter(t => t.id !== id));
        showSuccess('Missed trade deleted');
      } catch (error) {
        console.error('Failed to delete missed trade:', error);
        setMissedTrades(missedTrades.filter(t => t.id !== id));
      }
    }
  };

  const handleFileUpload = (field: 'beforeScreenshot' | 'afterScreenshot') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(field);
      try {
        const result = await apiService.upload.single(file);
        setFormData({ ...formData, [field]: result.url });
      } catch (error) {
        console.error('Failed to upload image:', error);
        showError('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-page-title font-bold text-foreground">Missed Trade Journal</h2>
            <p className="text-body text-muted-foreground mt-1">Track general missed trading opportunities</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsAdding(true); resetForm(); setEditingId(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white text-button rounded-xl hover:from-[#6D28D9] hover:to-[#4338CA] shadow-lg shadow-[#7C3AED]/25 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Add Missed Trade
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-orange-600 uppercase">Total Missed</p>
            <p className="text-page-title font-bold text-orange-700 mt-1">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-[#7C3AED] uppercase">Planned</p>
            <p className="text-page-title font-bold text-[#6D28D9] mt-1">{stats.planned}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-muted-foreground uppercase">Missed</p>
            <p className="text-page-title font-bold text-foreground mt-1">{stats.missed}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-violet-600 uppercase">Executed Later</p>
            <p className="text-page-title font-bold text-violet-700 mt-1">{stats.executedLater}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-emerald-600 uppercase">Total P/L</p>
            <p className={`text-page-title font-bold mt-1 ${stats.totalPL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {stats.totalPL >= 0 ? '+' : ''}${stats.totalPL.toFixed(2)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 transition-all duration-200 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
            <p className="text-caption text-muted-foreground uppercase">Most Missed Pair</p>
            <p className="text-page-title font-bold text-foreground mt-1">{stats.mostMissedPair || '-'}</p>
          </div>
        </div>

        {/* Key Level Performance */}
        {keyLevelStats.length > 0 && (
          <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] mt-4">
            <button
              onClick={() => setKeyLevelExpanded(prev => !prev)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors rounded-[20px]"
            >
              <h4 className="text-body-sm text-foreground flex items-center gap-2">
                <span className="w-1 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></span>
                Key Level Performance
              </h4>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${keyLevelExpanded ? 'rotate-90' : 'rotate-0'}`} />
            </button>
            {keyLevelExpanded && (
              <div className="px-4 pb-4 border-t border-[#E5E7EB] pt-3">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-caption text-[#64748B] uppercase tracking-wider border-b border-[#E5E7EB]">
                      <th className="pb-2 pr-4 font-medium">Key Level</th>
                      <th className="pb-2 pr-4 font-medium text-right">Trades</th>
                      <th className="pb-2 pr-4 font-medium text-right">Wins</th>
                      <th className="pb-2 pr-4 font-medium text-right">Losses</th>
                      <th className="pb-2 pr-4 font-medium text-right">Win Rate</th>
                      <th className="pb-2 font-medium text-right">Net P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyLevelStats.map(stat => (
                      <tr key={stat.keyLevel} className="border-b border-[#F1F5F9] text-body-sm">
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-semibold border ${stat.keyLevel === 'No Key Level' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-violet-100 text-violet-700 border-violet-200'}`}>
                            {stat.keyLevel}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-medium">{stat.trades}</td>
                        <td className="py-2.5 pr-4 text-right text-emerald-600 font-medium">{stat.wins}</td>
                        <td className="py-2.5 pr-4 text-right text-rose-600 font-medium">{stat.losses}</td>
                        <td className="py-2.5 pr-4 text-right font-medium">{stat.winRate.toFixed(1)}%</td>
                        <td className={`py-2.5 text-right font-bold tabular-nums ${stat.netPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatMoney(stat.netPL, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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
          <Select value={filterMissedStatus} onValueChange={setFilterMissedStatus}>
            <SelectTrigger className="w-[140px] bg-[#F8FAFC] border-[#E2E8F0]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {MISSED_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
            {editingId ? 'Edit Missed Trade' : 'New Missed Trade'}
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
                  <label className="block text-body-sm text-muted-foreground mb-1">Account</label>
                  <AccountSelect
                    accounts={accounts}
                    value={formData.accountId}
                    onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                    placeholder="Select Account"
                    className="bg-[#F8FAFC] border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Prop Firm</label>
                  <Select value={formData.propFirmId} onValueChange={(value) => setFormData({ ...formData, propFirmId: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select Firm" />
                    </SelectTrigger>
                    <SelectContent>
                      {firms.length > 0 ? (
                        firms.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)
                      ) : (
                        <SelectItem value="_none">No firms available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
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
                  <label className="block text-body-sm text-muted-foreground mb-1">Exit Price</label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="1.0900"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.exitPrice}
                    onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Lot Size *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.10"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.lotSize}
                    onChange={(e) => setFormData({ ...formData, lotSize: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Stop Loss</label>
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
                  <label className="block text-body-sm text-muted-foreground mb-1">Take Profit</label>
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
                  <label className="block text-body-sm text-muted-foreground mb-1">R:R Ratio</label>
                  <div className="h-12 px-3 flex items-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <span className={calculatedRR !== null ? (calculatedRR >= 1 ? 'text-[#10B981] font-medium' : 'text-[#F59E0B] font-medium') : 'text-slate-400'}>
                      {calculatedRR !== null ? `1:${calculatedRR.toFixed(2)}` : 'Auto'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">RR Achievable</label>
                  <Select value={formData.rrAchievable} onValueChange={(value) => setFormData({ ...formData, rrAchievable: value })}>
                    <SelectTrigger className="bg-white border-[#E2E8F0]">
                      <SelectValue placeholder="Select RR" />
                    </SelectTrigger>
                    <SelectContent>
                      {['1:1','1:2','1:3','1:4','1:5','1:6','1:7','1:8','1:9','1:10'].map(rr => (
                        <SelectItem key={rr} value={rr}>{rr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 2: Timing Information */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">2</span>
                Timing Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Entry Date *</label>
                  <Input
                    type="date"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Entry Time</label>
                  <TimePicker
                    value={formData.entryTime}
                    onChange={(val) => setFormData({ ...formData, entryTime: val })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Exit Date</label>
                  <Input
                    type="date"
                    className="bg-white border-[#E2E8F0]"
                    value={formData.exitDate}
                    onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Exit Time</label>
                  <TimePicker
                    value={formData.exitTime}
                    onChange={(val) => setFormData({ ...formData, exitTime: val })}
                  />
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
                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7 bg-white border-[#E2E8F0]" value={formData.profit} onChange={(e) => setFormData({ ...formData, profit: e.target.value })} />
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

            {/* Section 4: Trade Analysis */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">4</span>
                Trade Analysis
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Session</label>
                  <Select value={formData.session} onValueChange={(value) => setFormData({ ...formData, session: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select Session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.length > 0 ? (
                        sessions.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)
                      ) : (
                        <SelectItem value="_none">No sessions</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Strategy</label>
                  <Select value={formData.strategy} onValueChange={(value) => setFormData({ ...formData, strategy: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select Strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.length > 0 ? (
                        strategies.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)
                      ) : (
                        <SelectItem value="_none">No strategies</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Key Level</label>
                  <Select value={formData.keyLevel} onValueChange={(value) => setFormData({ ...formData, keyLevel: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue placeholder="Select Key Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {keyLevels.length > 0 ? (
                        keyLevels.map(k => <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>)
                      ) : (
                        <SelectItem value="_none">No key levels</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-1">Trade Status</label>
                  <Select value={formData.status} onValueChange={(value: 'OPEN' | 'CLOSED') => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">OPEN</SelectItem>
                      <SelectItem value="CLOSED">CLOSED</SelectItem>
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
                  <label className="block text-body-sm text-muted-foreground mb-1">Missed Status</label>
                  <Select value={formData.missedStatus} onValueChange={(value: GeneralMissedTradeStatus) => setFormData({ ...formData, missedStatus: value })}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MISSED_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 6: Notes & Screenshots */}
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-body-sm font-bold shadow-sm">6</span>
                Notes & Screenshots
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-2">Before Screenshot</label>
                  <div className="modern-file-upload group relative border-2 border-dashed border-[#E2E8F0] rounded-lg p-4 hover:border-[#7C3AED] transition-colors">
                    <input type="file" accept="image/*" onChange={handleFileUpload('beforeScreenshot')} disabled={uploadingImage === 'beforeScreenshot'} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {uploadingImage === 'beforeScreenshot' ? (
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
                  {formData.beforeScreenshot && (
                    <div className="relative mt-2 inline-block">
                      <img src={formData.beforeScreenshot} alt="Before" className="h-16 rounded object-cover border border-[#E2E8F0]" />
                      <button onClick={() => setFormData({ ...formData, beforeScreenshot: '' })} className="absolute -top-2 -right-2 p-1 bg-[#EF4444] text-white rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-body-sm text-muted-foreground mb-2">After Screenshot</label>
                  <div className="modern-file-upload group relative border-2 border-dashed border-[#E2E8F0] rounded-lg p-4 hover:border-[#7C3AED] transition-colors">
                    <input type="file" accept="image/*" onChange={handleFileUpload('afterScreenshot')} disabled={uploadingImage === 'afterScreenshot'} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {uploadingImage === 'afterScreenshot' ? (
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
                  {formData.afterScreenshot && (
                    <div className="relative mt-2 inline-block">
                      <img src={formData.afterScreenshot} alt="After" className="h-16 rounded object-cover border border-[#E2E8F0]" />
                      <button onClick={() => setFormData({ ...formData, afterScreenshot: '' })} className="absolute -top-2 -right-2 p-1 bg-[#EF4444] text-white rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button>
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
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white text-button rounded-xl hover:from-[#6D28D9] hover:to-[#4338CA] shadow-lg shadow-[#7C3AED]/25 transition-all duration-200 hover:-translate-y-0.5">
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
          <p className="text-muted-foreground font-medium">No missed trades found</p>
          <p className="text-body text-slate-400 mt-1">Click "Add Missed Trade" to record one</p>
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
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Pair</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Type</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Key Level</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Entry Time</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Exit Time</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Duration</th>
                  <th className="text-right py-3.5 px-4 text-table-header text-muted-foreground">P/L</th>
                  <th className="text-left py-3.5 px-4 text-table-header text-muted-foreground">Reason</th>
                  <th className="text-center py-3.5 px-4 text-table-header text-muted-foreground">Status</th>
                  <th className="text-right py-3.5 px-4 text-table-header text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMissedTrades.map(trade => {
                  const realPL = trade.realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs(trade.swap || 0));
                  const statusStyle = MISSED_STATUS_STYLES[trade.missedStatus] || MISSED_STATUS_STYLES.MISSED;
                  return (
                    <tr key={trade.id} className={`border-b border-[#E2E8F0]/60 hover:bg-[#F1F5F9]/60 transition-colors duration-150${!trade.keyLevel ? ' border-l-[3px] border-l-orange-400 bg-orange-50' : ''}`}>
                      <td className="py-3.5 px-4 text-table-cell text-foreground whitespace-nowrap">
                        {new Date(trade.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {trade.keyLevel ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-caption font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                            {trade.keyLevel}
                          </span>
                        ) : (
                          <span className="text-caption text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <EntryTimeBadge time={trade.entryTime} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption bg-sky-50 text-sky-700 ring-1 ring-sky-200/50">
                          {formatTimeDisplay(trade.exitTime) || <span className="text-slate-300">-</span>}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-mono bg-slate-100 text-slate-700 ring-1 ring-slate-200/50">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {calculateDuration(trade.entryTime, trade.exitTime)}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-table-cell text-right whitespace-nowrap ${realPL >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {realPL >= 0 ? '+' : ''}${realPL.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-caption font-bold bg-[#F8FAFC] text-foreground ring-1 ring-[#E5E7EB]">
                          {trade.reason}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-caption font-bold', statusStyle.bg, statusStyle.text)}>
                          {trade.missedStatus === 'EXECUTED_LATER' ? 'Executed Later' : trade.missedStatus.charAt(0) + trade.missedStatus.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          {(trade.beforeScreenshot || trade.afterScreenshot) && (
                            <button onClick={() => { const imgs = []; if (trade.beforeScreenshot) imgs.push({ url: trade.beforeScreenshot, label: 'Before' }); if (trade.afterScreenshot) imgs.push({ url: trade.afterScreenshot, label: 'After' }); setViewingImages(imgs); setViewingImageIndex(0); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="View screenshots">
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => setViewingTrade(trade)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View details">
                            <BarChart3 className="w-4 h-4" />
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

      {/* Image Viewer */}
      {viewingImages.length > 0 && (
        <ImageViewer images={viewingImages} initialIndex={viewingImageIndex} onClose={() => setViewingImages([])} />
      )}

      {/* Missed Trade Details Modal */}
      {viewingTrade && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setViewingTrade(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[#E2E8F0] bg-gradient-to-r from-violet-50/40 to-white flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-section-title font-bold text-foreground">Missed Trade</h2>
                    <span className={`px-3 py-1 rounded-full text-body-sm ${viewingTrade.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {viewingTrade.type}
                    </span>
                    <span className="text-body-sm text-muted-foreground">{viewingTrade.pair}</span>
                  </div>
                  <p className="text-body text-muted-foreground mt-1">
                    {new Date(viewingTrade.entryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
                    <p className="text-caption text-muted-foreground">Lot Size</p>
                    <p className="text-body-sm text-foreground mt-0.5">{viewingTrade.lotSize}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Entry</p>
                    <p className="text-body-sm text-foreground mt-0.5 font-mono">{formatPrice(viewingTrade.entryPrice, viewingTrade.pair)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Exit</p>
                    <p className="text-body-sm text-foreground mt-0.5 font-mono">{viewingTrade.exitPrice ? formatPrice(viewingTrade.exitPrice, viewingTrade.pair) : '-'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Trade Status</p>
                    <p className={`text-body-sm mt-0.5 ${viewingTrade.status === 'CLOSED' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>{viewingTrade.status}</p>
                  </div>
                  {viewingTrade.stopLoss && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Stop Loss</p>
                      <p className="text-body-sm text-[#EF4444] mt-0.5 font-mono">{formatPrice(viewingTrade.stopLoss, viewingTrade.pair)}</p>
                    </div>
                  )}
                  {viewingTrade.takeProfit && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Take Profit</p>
                      <p className="text-body-sm text-[#10B981] mt-0.5 font-mono">{formatPrice(viewingTrade.takeProfit, viewingTrade.pair)}</p>
                    </div>
                  )}
                  {viewingTrade.riskRewardRatio && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">R:R</p>
                      <p className="text-body-sm text-foreground mt-0.5 font-mono">1:{viewingTrade.riskRewardRatio.toFixed(2)}</p>
                    </div>
                  )}
                  {(viewingTrade as any).rrAchievable && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">RR Achievable</p>
                      <p className="text-body-sm text-emerald-600 mt-0.5 font-bold">{(viewingTrade as any).rrAchievable}</p>
                    </div>
                  )}
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
                    <p className="text-caption text-muted-foreground">Entry Date</p>
                    <p className="text-body-sm text-foreground mt-0.5">
                      {new Date(viewingTrade.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Entry Time</p>
                    <div className="mt-1"><EntryTimeBadge time={viewingTrade.entryTime} /></div>
                  </div>
                  {viewingTrade.exitDate && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Exit Date</p>
                      <p className="text-body-sm text-foreground mt-0.5">
                        {new Date(viewingTrade.exitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {viewingTrade.exitTime && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground">Exit Time</p>
                      <div className="mt-1"><EntryTimeBadge time={viewingTrade.exitTime} /></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Financials */}
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"></span>
                  Financials
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Profit/Loss</p>
                    <p className={`text-body-sm mt-0.5 ${(viewingTrade.profit || 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {(viewingTrade.profit || 0) >= 0 ? '+' : ''}${viewingTrade.profit?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Commission</p>
                    <p className="text-body-sm text-foreground mt-0.5">${viewingTrade.commission?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Swap</p>
                    <p className="text-body-sm text-foreground mt-0.5">${viewingTrade.swap?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground">Real P/L</p>
                    <p className={`text-body-sm mt-0.5 ${(viewingTrade.realPL || 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {(viewingTrade.realPL || 0) >= 0 ? '+' : ''}${viewingTrade.realPL?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Trade Analysis */}
              {(viewingTrade.session || viewingTrade.strategy || viewingTrade.keyLevel) && (
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-blue-600 rounded-full"></span>
                    Trade Analysis
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {viewingTrade.session && (
                      <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                        <p className="text-caption text-muted-foreground">Session</p>
                        <p className="text-body-sm text-foreground mt-0.5">{viewingTrade.session}</p>
                      </div>
                    )}
                    {viewingTrade.strategy && (
                      <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                        <p className="text-caption text-muted-foreground">Strategy</p>
                        <p className="text-body-sm text-foreground mt-0.5">{viewingTrade.strategy}</p>
                      </div>
                    )}
                    {viewingTrade.keyLevel && (
                      <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                        <p className="text-caption text-muted-foreground">Key Level</p>
                        <p className="text-body-sm text-foreground mt-0.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                            {viewingTrade.keyLevel}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 5: Notes & Screenshots */}
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <h4 className="text-body-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-rose-500 to-pink-600 rounded-full"></span>
                  Notes & Screenshots
                </h4>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground mb-1">Reason Missed</p>
                    <p className="text-body text-foreground">{viewingTrade.reason || '-'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                    <p className="text-caption text-muted-foreground mb-1">Missed Status</p>
                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-caption font-bold', MISSED_STATUS_STYLES[viewingTrade.missedStatus]?.bg, MISSED_STATUS_STYLES[viewingTrade.missedStatus]?.text)}>
                      {viewingTrade.missedStatus === 'EXECUTED_LATER' ? 'Executed Later' : viewingTrade.missedStatus.charAt(0) + viewingTrade.missedStatus.slice(1).toLowerCase()}
                    </span>
                  </div>
                  {viewingTrade.notes && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground mb-1">Notes</p>
                      <p className="text-body text-foreground whitespace-pre-wrap">{viewingTrade.notes}</p>
                    </div>
                  )}
                  {(viewingTrade.beforeScreenshot || viewingTrade.afterScreenshot) && (
                    <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-caption text-muted-foreground mb-2">Screenshots</p>
                      <div className="grid grid-cols-2 gap-3">
                        {viewingTrade.beforeScreenshot && (
                          <div className="relative group rounded-lg overflow-hidden cursor-pointer" onClick={() => { const imgs = [{ url: viewingTrade.beforeScreenshot!, label: 'Before' }]; if (viewingTrade.afterScreenshot) imgs.push({ url: viewingTrade.afterScreenshot, label: 'After' }); setViewingImages(imgs); setViewingImageIndex(0); }}>
                            <img src={viewingTrade.beforeScreenshot} alt="Before" className="w-full h-28 object-cover rounded-lg" />
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-caption px-2 py-0.5 rounded">Before</span>
                          </div>
                        )}
                        {viewingTrade.afterScreenshot && (
                          <div className="relative group rounded-lg overflow-hidden cursor-pointer" onClick={() => { const imgs = []; if (viewingTrade.beforeScreenshot) imgs.push({ url: viewingTrade.beforeScreenshot, label: 'Before' }); imgs.push({ url: viewingTrade.afterScreenshot!, label: 'After' }); setViewingImages(imgs); setViewingImageIndex(imgs.length - 1); }}>
                            <img src={viewingTrade.afterScreenshot} alt="After" className="w-full h-28 object-cover rounded-lg" />
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
    </div>
  );
}
