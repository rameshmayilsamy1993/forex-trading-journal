import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Check, Eye, EyeOff, Image as ImageIcon, ZoomIn, Eye as ViewIcon } from 'lucide-react';
import { MissedTrade, TradingAccount, MasterData, SMTType, Model1Type } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import TimePicker from './ui/TimePicker';
import { Button } from './ui/button';
import ImageViewer from './ImageViewer';
import { cn } from './ui/utils';
import { truncateText, stripHTML, decodeHtml, hasHTML } from '../utils/htmlUtils';
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

const SAMPLE_MISSED_TRADES: MissedTrade[] = [
  {
    id: '1',
    accountId: 'acc1',
    pair: 'EUR/USD',
    type: 'BUY',
    entryPrice: 1.0850,
    stopLoss: 1.0820,
    takeProfit: 1.0950,
    rr: 1.67,
    date: '2024-01-15',
    time: '10:30',
    session: 'LONDON',
    strategy: '4HR FVG + 15MIN',
    keyLevel: '4HR FVG',
    reason: 'Late Entry',
    emotion: 'Hesitant',
    status: 'MISSED',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    accountId: 'acc1',
    pair: 'GBP/JPY',
    type: 'SELL',
    entryPrice: 188.50,
    stopLoss: 189.00,
    takeProfit: 186.50,
    rr: 2.0,
    date: '2024-01-14',
    time: '15:45',
    session: 'NEW YORK',
    strategy: '4HR CRT + 15MIN MODEL #1',
    keyLevel: '4HR OB',
    reason: 'Fear',
    status: 'REVIEWED',
    createdAt: new Date().toISOString()
  }
];

export default function MissedTradeJournal() {
  const [missedTrades, setMissedTrades] = useState<MissedTrade[]>(SAMPLE_MISSED_TRADES);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [pairs, setPairs] = useState<string[]>([]);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewingImages, setViewingImages] = useState<{ url: string; label: string }[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [viewingReason, setViewingReason] = useState<{ title: string; content: string } | null>(null);

  const [formData, setFormData] = useState({
    accountId: '',
    pair: '',
    type: 'BUY' as 'BUY' | 'SELL',
    date: '',
    time: '',
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
    profitLoss: '',
    commission: '',
    swap: '',
    realPL: 0,
    status: 'MISSED' as 'MISSED' | 'REVIEWED',
    screenshots: { before: '', after: '' }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [missedTradesData, accountsData, mastersData, pairsData] = await Promise.all([
          apiService.getMissedTrades(),
          apiService.getAccounts(),
          apiService.getMasters(),
          apiService.settings.getPairs()
        ]);
        if (missedTradesData.length > 0) {
          setMissedTrades(missedTradesData);
        }
        setAccounts(accountsData);
        setMasters(mastersData);
        setPairs(pairsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        setAccounts([]);
        setMasters([]);
        setPairs([]);
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
    const profit = parseFloat(formData.profitLoss) || 0;
    const comm = Math.abs(parseFloat(formData.commission) || 0);
    const swp = Math.abs(parseFloat(formData.swap) || 0);
    return profit - comm - swp;
  }, [formData.profitLoss, formData.commission, formData.swap]);

  const getTradeAccountId = (trade: MissedTrade): string => {
    if (typeof trade.accountId === 'object' && trade.accountId !== null) {
      return String((trade.accountId as any).id || '');
    }
    return String(trade.accountId || '');
  };

  const getAccountName = (accountId: string): string => {
    const id = typeof accountId === 'object' ? (accountId as any).id : accountId;
    const account = accounts.find(a => a.id === id);
    return account?.name || 'Unknown';
  };

  const filteredMissedTrades = useMemo(() => {
    return missedTrades.filter(trade => {
      if (filterAccount !== 'all' && getTradeAccountId(trade) !== filterAccount) return false;
      if (filterStatus !== 'all' && trade.status !== filterStatus) return false;
      return true;
    });
  }, [missedTrades, filterAccount, filterStatus]);

  const stats = useMemo(() => {
    const total = filteredMissedTrades.length;
    const reviewed = filteredMissedTrades.filter(t => t.status === 'REVIEWED').length;
    const reasonCounts: Record<string, number> = {};
    filteredMissedTrades.forEach(t => {
      const reasonKey = stripHTML(t.reason || t.missedReason || '');
      reasonCounts[reasonKey] = (reasonCounts[reasonKey] || 0) + 1;
    });
    const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
    const mostCommonRaw = sortedReasons[0]?.[0] || '';
    const mostCommonReason = DOMPurify.sanitize(mostCommonRaw);
    return { total, reviewed, mostCommonReason };
  }, [filteredMissedTrades]);

  const resetForm = () => {
    setFormData({
      accountId: '',
      pair: '',
      type: 'BUY',
      date: '',
      time: '',
      entryPrice: '',
      stopLoss: '',
      takeProfit: '',
      session: '',
      strategy: '',
      keyLevel: '',
      reason: '',
      emotion: '',
      status: 'MISSED',
      screenshots: { before: '', after: '' }
    });
  };

  const startEdit = (trade: MissedTrade) => {
    setEditingId(trade.id);
    const accountId = getTradeAccountId(trade);
    setFormData({
      accountId,
      pair: trade.pair,
      type: trade.type,
      date: trade.date.split('T')[0],
      time: trade.time || '',
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
      profitLoss: trade.profitLoss?.toString() || '',
      commission: trade.commission?.toString() || '',
      swap: trade.swap?.toString() || '',
      realPL: trade.realPL || 0,
      status: trade.status,
      screenshots: trade.screenshots || { before: '', after: '' }
    });
    setIsAdding(false);
  };

  const handleSubmit = async () => {
    if (!formData.accountId || !formData.pair || !formData.entryPrice || !formData.stopLoss || !formData.takeProfit || !formData.date || !formData.reason) {
      alert('Please fill in all required fields');
      return;
    }

    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.stopLoss);
    const tp = parseFloat(formData.takeProfit);
    const rr = calculateRR(entry, sl, tp, formData.type);

    const missedTradeData = {
      accountId: formData.accountId,
      pair: formData.pair,
      type: formData.type,
      date: formData.date,
      time: formData.time,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      rr: parseFloat(rr.toFixed(2)),
      session: formData.session,
      strategy: formData.strategy,
      keyLevel: formData.keyLevel,
      reason: formData.reason,
      emotion: formData.emotion,
      smt: formData.smt,
      model1: formData.model1,
      profitLoss: parseFloat(formData.profitLoss) || 0,
      commission: parseFloat(formData.commission) || 0,
      swap: parseFloat(formData.swap) || 0,
      realPL: calculatedRealPL,
      status: formData.status,
      screenshots: formData.screenshots
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this missed trade?')) {
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
      const updated = await apiService.updateMissedTrade(trade.id, { ...trade, status: newStatus });
      setMissedTrades(missedTrades.map(t => t.id === trade.id ? { ...t, status: newStatus } : t));
    } catch (error) {
      setMissedTrades(missedTrades.map(t => t.id === trade.id ? { ...t, status: newStatus } : t));
    }
  };

  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

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
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Missed Trade Journal</h2>
              <p className="text-sm text-gray-500 mt-1">Track missed trading opportunities</p>
            </div>
            <button
              onClick={() => { setIsAdding(true); resetForm(); setEditingId(null); }}
              disabled={accounts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Missed Trade
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Total Missed</p>
              <p className="text-2xl font-bold text-orange-600">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Reviewed</p>
              <p className="text-2xl font-bold text-green-600">{stats.reviewed}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Most Common Reason</p>
              {stats.mostCommonReason ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: stats.mostCommonReason }}
                />
              ) : (
                <p className="text-lg font-bold text-purple-600">No reason provided</p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={filterAccount || 'all'} onValueChange={(value) => setFilterAccount(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus || 'all'} onValueChange={(value) => setFilterStatus(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="MISSED">Missed</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6">
          {accounts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Please add an account first</p>
              <p className="text-sm">Go to "Accounts" tab to create one</p>
            </div>
          )}

          {accounts.length > 0 && (
            <>
              {/* Add/Edit Form */}
              {(isAdding || editingId) && (
                <div className="mb-6 p-6 bg-white rounded-xl border border-slate-200">
                  <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
                    {editingId ? 'Edit Missed Trade' : 'New Missed Trade'}
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Section 1: Trade Basics */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">1</span>
                        Trade Basics
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Account *</label>
                          <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue placeholder="Select Account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Pair *</label>
                          <Select value={formData.pair} onValueChange={(value) => setFormData({ ...formData, pair: value })}>
                            <SelectTrigger className="bg-white border-slate-200">
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                          <Select value={formData.type} onValueChange={(value: 'BUY' | 'SELL') => setFormData({ ...formData, type: value })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BUY">BUY</SelectItem>
                              <SelectItem value="SELL">SELL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Entry Details */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">2</span>
                        Entry Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Entry Price *</label>
                          <Input
                            type="number"
                            step="0.00001"
                            placeholder="1.0850"
                            className="bg-white border-slate-200"
                            value={formData.entryPrice}
                            onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                          <Input
                            type="date"
                            className="bg-white border-slate-200"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                          <TimePicker
                            value={formData.time}
                            onChange={(val) => setFormData({ ...formData, time: val })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Trade Setup */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">3</span>
                        Trade Setup
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Stop Loss *</label>
                          <Input
                            type="number"
                            step="0.00001"
                            placeholder="1.0820"
                            className="bg-white border-slate-200"
                            value={formData.stopLoss}
                            onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Take Profit *</label>
                          <Input
                            type="number"
                            step="0.00001"
                            placeholder="1.0950"
                            className="bg-white border-slate-200"
                            value={formData.takeProfit}
                            onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">RR Ratio</label>
                          <div className="h-10 px-3 flex items-center bg-slate-100 rounded-md border">
                            <span className={calculatedRR !== null ? (calculatedRR >= 1 ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium') : 'text-slate-400'}>
                              {calculatedRR !== null ? `1:${calculatedRR.toFixed(2)}` : 'Auto'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Strategy</label>
                          <Select value={formData.strategy} onValueChange={(value) => setFormData({ ...formData, strategy: value })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue placeholder="Select Strategy" />
                            </SelectTrigger>
                            <SelectContent>
                              {strategies.map(s => (
                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Model #1</label>
                          <Select value={formData.model1} onValueChange={(value) => setFormData({ ...formData, model1: value as Model1Type })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Yes (Both EUR and GBP)">Yes (Both EUR and GBP)</SelectItem>
                              <SelectItem value="Yes (EUR)">Yes (EUR)</SelectItem>
                              <SelectItem value="Yes (GBP)">Yes (GBP)</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">SMT</label>
                          <Select value={formData.smt} onValueChange={(value) => setFormData({ ...formData, smt: value as SMTType })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="Yes with GBPUSD">Yes with GBPUSD</SelectItem>
                              <SelectItem value="Yes with EURUSD">Yes with EURUSD</SelectItem>
                              <SelectItem value="Yes with DXY">Yes with DXY</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Trade Context */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">4</span>
                        Trade Context
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Session</label>
                          <Select value={formData.session} onValueChange={(value) => setFormData({ ...formData, session: value })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue placeholder="Select Session" />
                            </SelectTrigger>
                            <SelectContent>
                              {sessions.map(s => (
                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Key Level</label>
                          <Select value={formData.keyLevel} onValueChange={(value) => setFormData({ ...formData, keyLevel: value })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue placeholder="Select Key Level" />
                            </SelectTrigger>
                            <SelectContent>
                              {keyLevels.map(k => (
                                <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Emotion</label>
                          <Input
                            placeholder="Optional"
                            className="bg-white border-slate-200"
                            value={formData.emotion}
                            onChange={(e) => setFormData({ ...formData, emotion: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Financials */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">5</span>
                        Financials
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Profit/Loss</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7 bg-white border-slate-200"
                              value={formData.profitLoss}
                              onChange={(e) => setFormData({ ...formData, profitLoss: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Commission</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7 bg-white border-slate-200"
                              value={formData.commission}
                              onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Swap</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7 bg-white border-slate-200"
                              value={formData.swap}
                              onChange={(e) => setFormData({ ...formData, swap: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Real P/L</label>
                          <div className={`h-10 px-3 flex items-center bg-slate-100 rounded-md border font-semibold ${calculatedRealPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {calculatedRealPL >= 0 ? '+' : ''}${calculatedRealPL.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 6: Missed Trade Info */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">6</span>
                        Missed Trade Info
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Reason Missed *</label>
                          <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue placeholder="Select Reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {REASON_OPTIONS.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                          <Select value={formData.status} onValueChange={(value: 'MISSED' | 'REVIEWED') => setFormData({ ...formData, status: value })}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MISSED">Missed</SelectItem>
                              <SelectItem value="REVIEWED">Reviewed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Section 7: Notes & Screenshots */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">7</span>
                        Notes & Screenshots
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Before Screenshot</label>
                          <div className="modern-file-upload group relative border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload('before')}
                              disabled={uploadingImage === 'before'}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center justify-center space-y-2">
                              {uploadingImage === 'before' ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              ) : (
                                <>
                                  <div className="p-2 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <span className="text-xs text-slate-500">Click to upload</span>
                                </>
                              )}
                            </div>
                          </div>
                          {formData.screenshots.before && (
                            <div className="relative mt-2 inline-block">
                              <img src={formData.screenshots.before} alt="Before" className="h-16 rounded object-cover border border-slate-200" />
                              <button
                                onClick={() => setFormData({ ...formData, screenshots: { ...formData.screenshots, before: '' } })}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">After Screenshot</label>
                          <div className="modern-file-upload group relative border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload('after')}
                              disabled={uploadingImage === 'after'}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center justify-center space-y-2">
                              {uploadingImage === 'after' ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              ) : (
                                <>
                                  <div className="p-2 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <span className="text-xs text-slate-500">Click to upload</span>
                                </>
                              )}
                            </div>
                          </div>
                          {formData.screenshots.after && (
                            <div className="relative mt-2 inline-block">
                              <img src={formData.screenshots.after} alt="After" className="h-16 rounded object-cover border border-slate-200" />
                              <button
                                onClick={() => setFormData({ ...formData, screenshots: { ...formData.screenshots, after: '' } })}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                          <textarea
                            placeholder="Add notes about why this trade was missed..."
                            className="w-full h-24 p-3 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={editingId ? () => handleEdit(editingId) : handleSubmit}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-500/25"
                    >
                      <Check className="w-4 h-4" />
                      {editingId ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              {filteredMissedTrades.length === 0 && !isAdding && (
                <div className="text-center py-12 text-gray-500">
                  <p>No missed trades found</p>
                  <p className="text-sm">Click "Add Missed Trade" to record one</p>
                </div>
              )}

              {filteredMissedTrades.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Account</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Pair</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Entry</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">SL</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">TP</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">RR</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">P/L</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Comm</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Swap</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Real P/L</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMissedTrades.map(trade => {
                        const realPL = trade.realPL ?? ((trade.profitLoss || 0) - Math.abs(trade.commission || 0) - Math.abs(trade.swap || 0));
                        return (
                          <tr key={trade.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">{new Date(trade.date).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-sm">{getAccountName(trade.accountId)}</td>
                            <td className="py-3 px-4 text-sm font-medium">{trade.pair}</td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-right">{trade.entryPrice.toFixed(5)}</td>
                            <td className="py-3 px-4 text-sm text-right text-red-600">{trade.stopLoss.toFixed(5)}</td>
                            <td className="py-3 px-4 text-sm text-right text-green-600">{trade.takeProfit.toFixed(5)}</td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span className={trade.rr >= 1 ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                                {trade.rr.toFixed(2)}
                              </span>
                            </td>
                            <td className={`py-3 px-4 text-sm text-right font-medium ${(trade.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(trade.profitLoss || 0) >= 0 ? '+' : ''}${(trade.profitLoss || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right text-red-500">
                              -${Math.abs(trade.commission || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right text-red-500">
                              -${Math.abs(trade.swap || 0).toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 text-sm text-right font-semibold ${realPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {realPL >= 0 ? '+' : ''}${realPL.toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-sm">
                              <button
                                onClick={() => toggleReviewStatus(trade)}
                                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${trade.status === 'REVIEWED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                  }`}
                              >
                                {trade.status === 'REVIEWED' ? 'Reviewed' : 'Missed'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex gap-1 justify-end">
                                {(trade.screenshots?.before || trade.screenshots?.after) && (
                                  <button
                                    onClick={() => {
                                      const images = [];
                                      if (trade.screenshots?.before) images.push({ url: trade.screenshots.before, label: 'Before Screenshot' });
                                      if (trade.screenshots?.after) images.push({ url: trade.screenshots.after, label: 'After Screenshot' });
                                      setViewingImages(images);
                                      setViewingImageIndex(0);
                                    }}
                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="View screenshots"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => startEdit(trade)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(trade.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
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
              )}
            </>
          )}
        </div>
      </div>

      {/* Premium Image Viewer */}
      {viewingImages.length > 0 && (
        <ImageViewer
          images={viewingImages}
          initialIndex={viewingImageIndex}
          onClose={() => setViewingImages([])}
        />
      )}

      {/* Missed Reason Viewer Modal */}
      {viewingReason && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setViewingReason(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{viewingReason.title}</h3>
                <button
                  onClick={() => setViewingReason(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: viewingReason.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
