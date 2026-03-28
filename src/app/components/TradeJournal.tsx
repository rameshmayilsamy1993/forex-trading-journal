import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Check, TrendingUp, TrendingDown, Edit2, Trash2, Image as ImageIcon, Eye, Calendar as CalendarIcon, ZoomIn } from 'lucide-react';
import { Trade, TradingAccount, PropFirm, TradingSession, MasterData } from '../types/trading';
import apiService from '../services/apiService';
import { calculateTradeProfit, calculateRiskReward } from '../utils/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import TimePicker from './ui/TimePicker';
import FormField from './ui/FormField';
import ImageViewer from './ImageViewer';
import { format } from 'date-fns';
import { cn } from './ui/utils';
import { getDateKey, getLocalDateString } from '../utils/dateUtils';



export default function TradeJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
  const [viewingImages, setViewingImages] = useState<{ url: string; label: string }[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [formData, setFormData] = useState({
    accountId: '',
    pair: '',
    type: 'BUY' as 'BUY' | 'SELL',
    status: 'OPEN' as 'OPEN' | 'CLOSED',
    entryPrice: '',
    exitPrice: '',
    lotSize: '',
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: '',
    exitDate: '',
    exitTime: '',
    stopLoss: '',
    takeProfit: '',
    profit: '',
    notes: '',
    session: '' as TradingSession | '',
    strategy: '',
    keyLevel: '',
    highLowTime: '',
    beforeScreenshot: '',
    afterScreenshot: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tradesData, accountsData, firmsData, mastersData] = await Promise.all([
          apiService.getTrades(),
          apiService.getAccounts(),
          apiService.getPropFirms(),
          apiService.getMasters()
        ]);
        setTrades(tradesData);
        setAccounts(accountsData);
        setFirms(firmsData);
        setMasters(mastersData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  const strategies = useMemo(() => masters.filter(m => m.type === 'strategy'), [masters]);
  const keyLevels = useMemo(() => masters.filter(m => m.type === 'keyLevel'), [masters]);
  const sessions = useMemo(() => masters.filter(m => m.type === 'session'), [masters]);

  const COMMISSION_PER_LOT = 5;

  const calculatedRR = useMemo(() => {
    if (!formData.entryPrice || !formData.stopLoss || !formData.takeProfit) return null;
    const tempTrade: Trade = {
      id: 'temp',
      accountId: '',
      propFirmId: '',
      pair: '',
      type: formData.type,
      status: 'OPEN',
      entryPrice: parseFloat(formData.entryPrice),
      lotSize: 0,
      entryDate: '',
      stopLoss: parseFloat(formData.stopLoss),
      takeProfit: parseFloat(formData.takeProfit),
    };
    return calculateRiskReward(tempTrade);
  }, [formData.entryPrice, formData.stopLoss, formData.takeProfit, formData.type]);

  const calculatedCommission = useMemo(() => {
    const lots = parseFloat(formData.lotSize) || 0;
    return Number((lots * COMMISSION_PER_LOT).toFixed(2));
  }, [formData.lotSize]);

  const saveTrades = async (newTrades: Trade[]) => {
    setTrades(newTrades);
    // Note: We don't save each trade individually here as that would be inefficient
    // The trades are saved when they are created/updated via API
    updateAccountBalances(newTrades);
  };

  const updateAccountBalances = async (allTrades: Trade[]) => {
    const updatedAccounts = accounts.map(account => {
      const accountTrades = allTrades.filter(t => getTradeAccountId(t) === account.id && t.status === 'CLOSED');
      const totalProfit = accountTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
      return {
        ...account,
        currentBalance: account.initialBalance + totalProfit,
      };
    });
    setAccounts(updatedAccounts);
  };

  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'beforeScreenshot' | 'afterScreenshot') => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(field);
      try {
        const result = await apiService.upload.single(file);
        setFormData({ ...formData, [field]: result.url });
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.accountId || !formData.pair || !formData.entryPrice || !formData.lotSize) return;

    const account = accounts.find(a => a.id === formData.accountId);
    if (!account) return;

    let profit = formData.profit ? parseFloat(formData.profit) : 0;
    if (!formData.profit && formData.status === 'CLOSED' && formData.exitPrice) {
      const trade: Trade = {
        id: 'temp',
        accountId: formData.accountId,
        propFirmId: typeof account.propFirmId === 'object' ? account.propFirmId.id : account.propFirmId,
        pair: formData.pair,
        type: formData.type,
        status: formData.status,
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: parseFloat(formData.exitPrice),
        lotSize: parseFloat(formData.lotSize),
        entryDate: formData.entryDate,
        exitDate: formData.exitDate || formData.entryDate,
      };
      profit = calculateTradeProfit(trade);
    }

    const newTrade: Omit<Trade, 'id'> = {
      accountId: formData.accountId,
      propFirmId: typeof account.propFirmId === 'object' ? account.propFirmId.id : account.propFirmId,
      pair: formData.pair,
      type: formData.type,
      status: formData.status,
      entryPrice: parseFloat(formData.entryPrice),
      exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
      lotSize: parseFloat(formData.lotSize),
      commission: calculatedCommission,
      entryDate: formData.entryDate,
      entryTime: formData.entryTime || undefined,
      exitDate: formData.exitDate || undefined,
      exitTime: formData.exitTime || undefined,
      profit: formData.status === 'CLOSED' ? profit : undefined,
      stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
      takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : undefined,
      riskRewardRatio: calculatedRR || undefined,
      notes: formData.notes || undefined,
      session: formData.session || undefined,
      strategy: formData.strategy || undefined,
      keyLevel: formData.keyLevel || undefined,
      highLowTime: formData.highLowTime || undefined,
      beforeScreenshot: formData.beforeScreenshot || undefined,
      afterScreenshot: formData.afterScreenshot || undefined,
    };

    try {
      const savedTrade = await apiService.createTrade(newTrade);
      setTrades([...trades, savedTrade]);
      resetForm();
    } catch (error) {
      console.error('Failed to create trade:', error);
    }
  };

  const handleEdit = async (id: string) => {
    console.log('handleEdit called with id:', id);
    console.log('formData:', formData);
    
    if (!formData.accountId || !formData.pair || !formData.entryPrice || !formData.lotSize) {
      alert('Please fill in all required fields: Account, Pair, Entry Price, and Lot Size');
      return;
    }

    const account = accounts.find(a => a.id === formData.accountId);
    if (!account) {
      alert('Account not found');
      return;
    }

    let profit = formData.profit ? parseFloat(formData.profit) : 0;
    if (!formData.profit && formData.status === 'CLOSED' && formData.exitPrice) {
      const trade: Trade = {
        id: 'temp',
        accountId: formData.accountId,
        propFirmId: typeof account.propFirmId === 'object' ? account.propFirmId.id : account.propFirmId,
        pair: formData.pair,
        type: formData.type,
        status: formData.status,
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: parseFloat(formData.exitPrice),
        lotSize: parseFloat(formData.lotSize),
        entryDate: formData.entryDate,
        exitDate: formData.exitDate || formData.entryDate,
      };
      profit = calculateTradeProfit(trade);
    }

    try {
      const updatedTrade: Partial<Trade> = {
        accountId: formData.accountId,
        propFirmId: typeof account.propFirmId === 'object' ? account.propFirmId.id : account.propFirmId,
        pair: formData.pair,
        type: formData.type,
        status: formData.status,
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
        lotSize: parseFloat(formData.lotSize),
        commission: calculatedCommission,
        entryDate: formData.entryDate,
        entryTime: formData.entryTime || undefined,
        exitDate: formData.exitDate || undefined,
        exitTime: formData.exitTime || undefined,
        profit: formData.status === 'CLOSED' ? profit : undefined,
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
        takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : undefined,
        riskRewardRatio: calculatedRR || undefined,
        notes: formData.notes || undefined,
        session: formData.session || undefined,
        strategy: formData.strategy || undefined,
        keyLevel: formData.keyLevel || undefined,
        highLowTime: formData.highLowTime || undefined,
        beforeScreenshot: formData.beforeScreenshot || undefined,
        afterScreenshot: formData.afterScreenshot || undefined,
      };

      console.log('Updating trade with:', updatedTrade);
      const savedTrade = await apiService.updateTrade(id, updatedTrade);
      console.log('Updated trade:', savedTrade);
      setTrades(trades.map(trade => trade.id === id ? savedTrade : trade));
      resetForm();
    } catch (error: any) {
      console.error('Failed to update trade:', error);
      alert(`Failed to update trade: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      try {
        await apiService.deleteTrade(id);
        setTrades(trades.filter(trade => trade.id !== id));
      } catch (error) {
        console.error('Failed to delete trade:', error);
      }
    }
  };

  const startEdit = (trade: Trade) => {
    setEditingId(trade.id);
    const accountId = getTradeAccountId(trade);
    setFormData({
      accountId: accountId,
      pair: trade.pair,
      type: trade.type,
      status: trade.status,
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice?.toString() || '',
      lotSize: trade.lotSize.toString(),
      entryDate: getDateKey(trade.entryDate),
      entryTime: trade.entryTime || '',
      exitDate: trade.exitDate ? getDateKey(trade.exitDate) : '',
      exitTime: trade.exitTime || '',
      stopLoss: trade.stopLoss?.toString() || '',
      takeProfit: trade.takeProfit?.toString() || '',
      profit: trade.profit?.toString() || '',
      notes: trade.notes || '',
      session: trade.session || '',
      strategy: trade.strategy || '',
      keyLevel: trade.keyLevel || '',
      highLowTime: trade.highLowTime || '',
      beforeScreenshot: trade.beforeScreenshot || '',
      afterScreenshot: trade.afterScreenshot || '',
    });
    setIsAdding(false);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      accountId: '',
      pair: '',
      type: 'BUY',
      status: 'OPEN',
      entryPrice: '',
      exitPrice: '',
      lotSize: '',
      entryDate: getDateKey(new Date()),
      entryTime: '',
      exitDate: '',
      exitTime: '',
      stopLoss: '',
      takeProfit: '',
      profit: '',
      notes: '',
      session: '',
      strategy: '',
      keyLevel: '',
      highLowTime: '',
      beforeScreenshot: '',
      afterScreenshot: '',
    });
  };

  const getAccountName = (accountId: any): string => {
    const id = typeof accountId === 'object'
      ? accountId?.id || accountId?._id
      : accountId;

    if (!id) return 'Unknown';

    const account = accounts.find((a) => String(a.id) === String(id));
    return account?.name || 'Unknown';
  };

  const getFirmColor = (firmId: string): string => {
    const firm = firms.find(f => f.id === firmId);
    return firm?.color || '#6B7280';
  };

  const getTradeAccountId = (trade: Trade): string => {
    if (typeof trade.accountId === 'object' && trade.accountId !== null) {
      return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
    }
    return String(trade.accountId || '');
  };

  const getTradeFirmId = (trade: Trade): string => {
    if (typeof trade.propFirmId === 'object' && trade.propFirmId !== null) {
      return (trade.propFirmId as PropFirm).id || '';
    }
    return String(trade.propFirmId || '');
  };

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      if (filterAccount !== 'all' && getTradeAccountId(trade) !== filterAccount) return false;
      if (filterStatus !== 'all' && trade.status !== filterStatus) return false;
      return true;
    });
  }, [trades, filterAccount, filterStatus]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Trade Journal</h2>
              <p className="text-sm text-gray-500 mt-1">Record and track your trades</p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              disabled={accounts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Trade
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select
              value={filterAccount || 'all'}
              onValueChange={(value: string) => setFilterAccount(value)}
            >
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

            <Select
              value={filterStatus || 'all'}
              onValueChange={(value: string) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
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
                <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-6">
                    {editingId ? 'Edit Trade' : 'New Trade'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Basic Info */}
                    <FormField label="Account" required>
                      <Select value={formData.accountId} onValueChange={value => setFormData({ ...formData, accountId: value })}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Pair" required>
                      <Input
                        className="bg-white"
                        placeholder="EUR/USD"
                        value={formData.pair}
                        onChange={e => setFormData({ ...formData, pair: e.target.value.toUpperCase() })}
                      />
                    </FormField>

                    <FormField label="Type" required>
                      <Select value={formData.type} onValueChange={value => setFormData({ ...formData, type: value as 'BUY' | 'SELL' })}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">BUY</SelectItem>
                          <SelectItem value="SELL">SELL</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    {/* Entry Details */}
                    <FormField label="Entry Price" required>
                      <Input
                        className="bg-white"
                        type="number"
                        placeholder="1.0850"
                        value={formData.entryPrice}
                        onChange={e => setFormData({ ...formData, entryPrice: e.target.value })}
                        step="0.00001"
                      />
                    </FormField>

                    <FormField label="Entry Date" required>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 bg-white border-gray-200 hover:bg-gray-50",
                              !formData.entryDate && "text-gray-400"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.entryDate ? (
                              <span>{format(new Date(formData.entryDate + 'T00:00:00'), "MMM dd, yyyy")}</span>
                            ) : (
                              <span>Select date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.entryDate ? new Date(formData.entryDate + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                setFormData({ ...formData, entryDate: `${year}-${month}-${day}` });
                              } else {
                                setFormData({ ...formData, entryDate: '' });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormField>

                    <FormField label="Entry Time">
                      <TimePicker
                        value={formData.entryTime || ''}
                        onChange={(val) => setFormData({ ...formData, entryTime: val })}
                      />
                    </FormField>

                    {/* Lot Size & Commission */}
                    <FormField label="Lot Size" required>
                      <Input
                        className="bg-white"
                        type="number"
                        placeholder="0.10"
                        value={formData.lotSize}
                        onChange={e => setFormData({ ...formData, lotSize: e.target.value })}
                        step="0.01"
                      />
                    </FormField>

                    <FormField label="Commission">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <Input
                          className="bg-gray-50 cursor-not-allowed pl-7"
                          type="number"
                          value={calculatedCommission}
                          readOnly
                          title={`Commission: $${COMMISSION_PER_LOT} per lot`}
                        />
                      </div>
                    </FormField>

                    <FormField label="Stop Loss">
                      <Input
                        className="bg-white"
                        type="number"
                        placeholder="1.0820"
                        value={formData.stopLoss}
                        onChange={e => setFormData({ ...formData, stopLoss: e.target.value })}
                        step="0.00001"
                      />
                    </FormField>

                    <FormField label="Take Profit">
                      <Input
                        className="bg-white"
                        type="number"
                        placeholder="1.0950"
                        value={formData.takeProfit}
                        onChange={e => setFormData({ ...formData, takeProfit: e.target.value })}
                        step="0.00001"
                      />
                    </FormField>

                    {/* RR Display */}
                    {calculatedRR && (
                      <div className="col-span-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                        <span className="text-sm text-blue-900">
                          Risk/Reward Ratio: <span className="font-bold text-blue-600">1:{calculatedRR.toFixed(2)}</span>
                        </span>
                      </div>
                    )}

                    {/* Session & Strategy */}
                    <FormField label="Session">
                      <Select value={formData.session} onValueChange={value => setFormData({ ...formData, session: value as TradingSession })}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select Session" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map(session => (
                            <SelectItem key={session.id} value={session.name}>{session.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Strategy">
                      <Select value={formData.strategy} onValueChange={value => setFormData({ ...formData, strategy: value })}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select Strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategies.map(strategy => (
                            <SelectItem key={strategy.id} value={strategy.name}>{strategy.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Key Level">
                      <Select value={formData.keyLevel} onValueChange={value => setFormData({ ...formData, keyLevel: value })}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select Key Level" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyLevels.map(level => (
                            <SelectItem key={level.id} value={level.name}>{level.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    {/* High/Low Time */}
                    <FormField label="High/Low Time">
                      <TimePicker
                        value={formData.highLowTime || ''}
                        onChange={(val) => setFormData({ ...formData, highLowTime: val })}
                      />
                    </FormField>

                    {/* Status */}
                    <FormField label="Status" required>
                      <Select value={formData.status} onValueChange={value => setFormData({ ...formData, status: value as 'OPEN' | 'CLOSED' })}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">OPEN</SelectItem>
                          <SelectItem value="CLOSED">CLOSED</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Profit/Loss">
                      <Input
                        className="bg-white"
                        type="number"
                        placeholder="+100.00"
                        value={formData.profit}
                        onChange={e => setFormData({ ...formData, profit: e.target.value })}
                        step="0.01"
                      />
                    </FormField>

                    {/* Exit Details */}
                    {formData.status === 'CLOSED' && (
                      <>
                        <FormField label="Exit Price" required>
                          <Input
                            className="bg-white"
                            type="number"
                            placeholder="1.0900"
                            value={formData.exitPrice}
                            onChange={e => setFormData({ ...formData, exitPrice: e.target.value })}
                            step="0.00001"
                          />
                        </FormField>

                        <FormField label="Exit Date" required>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-10 bg-white border-gray-200 hover:bg-gray-50",
                                  !formData.exitDate && "text-gray-400"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.exitDate ? (
                                  <span>{format(new Date(formData.exitDate + 'T00:00:00'), "MMM dd, yyyy")}</span>
                                ) : (
                                  <span>Select date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.exitDate ? new Date(formData.exitDate + 'T00:00:00') : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    setFormData({ ...formData, exitDate: `${year}-${month}-${day}` });
                                  } else {
                                    setFormData({ ...formData, exitDate: '' });
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormField>

                        <FormField label="Exit Time">
                          <TimePicker
                            value={formData.exitTime || ''}
                            onChange={(val) => setFormData({ ...formData, exitTime: val })}
                          />
                        </FormField>
                      </>
                    )}

                    {/* Screenshots */}
                    <div className="col-span-3 grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Before Screenshot
                        </label>
                        <div className="modern-file-upload group relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleFileUpload(e, 'beforeScreenshot')}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={uploadingImage === 'beforeScreenshot'}
                          />
                          <div className="flex flex-col items-center justify-center space-y-2">
                            {uploadingImage === 'beforeScreenshot' ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            ) : (
                              <>
                                <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                                  <ImageIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="text-sm text-gray-600">
                                  <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                </div>
                                <p className="text-xs text-gray-400">PNG, JPG or WEBP</p>
                              </>
                            )}
                          </div>
                        </div>
                        {formData.beforeScreenshot && (
                          <div className="relative mt-2 inline-block">
                            <img src={formData.beforeScreenshot} alt="Before" className="h-24 rounded-lg border-2 border-blue-100 object-cover" />
                            <button
                              onClick={() => setFormData({ ...formData, beforeScreenshot: '' })}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          After Screenshot
                        </label>
                        <div className="modern-file-upload group relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleFileUpload(e, 'afterScreenshot')}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={uploadingImage === 'afterScreenshot'}
                          />
                          <div className="flex flex-col items-center justify-center space-y-2">
                            {uploadingImage === 'afterScreenshot' ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            ) : (
                              <>
                                <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                                  <ImageIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="text-sm text-gray-600">
                                  <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                </div>
                                <p className="text-xs text-gray-400">PNG, JPG or WEBP</p>
                              </>
                            )}
                          </div>
                        </div>
                        {formData.afterScreenshot && (
                          <div className="relative mt-2 inline-block">
                            <img src={formData.afterScreenshot} alt="After" className="h-24 rounded-lg border-2 border-blue-100 object-cover" />
                            <button
                              onClick={() => setFormData({ ...formData, afterScreenshot: '' })}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="col-span-3">
                      <FormField label="Notes">
                        <textarea
                          placeholder="Add trade notes..."
                          value={formData.notes}
                          onChange={e => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </FormField>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end mt-4">
                    <button
                      onClick={editingId ? () => handleEdit(editingId) : handleSubmit}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {editingId ? 'Update' : 'Save'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Trades Table */}
              <div className="overflow-x-auto">
                {filteredTrades.length === 0 && !isAdding && !editingId && (
                  <div className="text-center py-12 text-gray-500">
                    <p>No trades recorded yet</p>
                    <p className="text-sm">Click "Add Trade" to start logging</p>
                  </div>
                )}

                {filteredTrades.length > 0 && (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date/Time</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Account</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Pair</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Strategy</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Entry</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Exit</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Exit Date</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">RR</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">P/L</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.map(trade => (
                        <tr key={trade.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">
                            <div>
                              {getLocalDateString(trade.entryDate)}
                              {trade.entryTime && (
                                <div className="text-xs text-gray-500">{trade.entryTime}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getFirmColor(trade.propFirmId) }}
                              />
                              <span className="text-gray-900">{getAccountName(trade.accountId)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="font-medium text-gray-900">{trade.pair}</div>
                            {trade.session && (
                              <div className="text-xs text-gray-500">{trade.session}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                              {trade.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {trade.strategy || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900">{trade.entryPrice.toFixed(5)}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900">
                            {trade.exitPrice ? trade.exitPrice.toFixed(5) : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900">
                            <div>
                              {trade.exitDate ? new Date(trade.exitDate).toLocaleDateString() : '-'}
                              {trade.exitTime && (
                                <div className="text-xs text-gray-500">{trade.exitTime}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            {trade.riskRewardRatio ? (
                              <span className="text-blue-600 font-medium">
                                1:{trade.riskRewardRatio.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            {trade.profit !== undefined ? (
                              <span className={`font-medium ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${trade.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                              {trade.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            <div className="flex gap-1 justify-end">
                              {(trade.beforeScreenshot || trade.afterScreenshot) && (
                                <button
                                  onClick={() => setViewingTrade(trade)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View screenshots"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => startEdit(trade)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
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
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trade Details Modal */}
      {viewingTrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {viewingTrade.pair}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    viewingTrade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {viewingTrade.type}
                  </span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {getLocalDateString(viewingTrade.entryDate)} {viewingTrade.entryTime && `• ${viewingTrade.entryTime}`}
                </p>
              </div>
              <button
                onClick={() => setViewingTrade(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Trade Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Entry</p>
                  <p className="text-lg font-bold text-gray-900">{viewingTrade.entryPrice.toFixed(5)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4">
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Exit</p>
                  <p className="text-lg font-bold text-gray-900">{viewingTrade.exitPrice?.toFixed(5) || '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wide">P/L</p>
                  <p className={`text-lg font-bold ${viewingTrade.profit && viewingTrade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {viewingTrade.profit !== undefined ? `${viewingTrade.profit >= 0 ? '+' : ''}$${viewingTrade.profit.toFixed(2)}` : '-'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4">
                  <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Risk/Reward</p>
                  <p className="text-lg font-bold text-gray-900">{viewingTrade.riskRewardRatio ? `1:${viewingTrade.riskRewardRatio.toFixed(2)}` : '-'}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account</span>
                    <span className="font-medium text-gray-900">{getAccountName(viewingTrade.accountId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lot Size</span>
                    <span className="font-medium text-gray-900">{viewingTrade.lotSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${viewingTrade.status === 'OPEN' ? 'text-blue-600' : 'text-gray-700'}`}>{viewingTrade.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Strategy</span>
                    <span className="font-medium text-gray-900">{viewingTrade.strategy || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Session</span>
                    <span className="font-medium text-gray-900">{viewingTrade.session || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Key Level</span>
                    <span className="font-medium text-gray-900">{viewingTrade.keyLevel || '-'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stop Loss</span>
                    <span className="font-medium text-red-600">{viewingTrade.stopLoss?.toFixed(5) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Take Profit</span>
                    <span className="font-medium text-green-600">{viewingTrade.takeProfit?.toFixed(5) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Commission</span>
                    <span className="font-medium text-gray-900">${viewingTrade.commission?.toFixed(2) || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Screenshots */}
              {(viewingTrade.beforeScreenshot || viewingTrade.afterScreenshot) && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Screenshots
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingTrade.beforeScreenshot && (
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                        <img
                          src={viewingTrade.beforeScreenshot}
                          alt="Before trade"
                          className="w-full h-48 object-cover rounded-xl cursor-pointer"
                          onClick={() => {
                            const images = [];
                            if (viewingTrade.beforeScreenshot) images.push({ url: viewingTrade.beforeScreenshot, label: 'Before Screenshot' });
                            if (viewingTrade.afterScreenshot) images.push({ url: viewingTrade.afterScreenshot, label: 'After Screenshot' });
                            setViewingImages(images);
                            setViewingImageIndex(0);
                          }}
                        />
                        <div className="absolute bottom-3 left-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-sm font-medium">Before</span>
                            <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {viewingTrade.afterScreenshot && (
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                        <img
                          src={viewingTrade.afterScreenshot}
                          alt="After trade"
                          className="w-full h-48 object-cover rounded-xl cursor-pointer"
                          onClick={() => {
                            const images = [];
                            if (viewingTrade.beforeScreenshot) images.push({ url: viewingTrade.beforeScreenshot, label: 'Before Screenshot' });
                            if (viewingTrade.afterScreenshot) images.push({ url: viewingTrade.afterScreenshot, label: 'After Screenshot' });
                            setViewingImages(images);
                            setViewingImageIndex(viewingTrade.beforeScreenshot ? 1 : 0);
                          }}
                        />
                        <div className="absolute bottom-3 left-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-sm font-medium">After</span>
                            <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingTrade.notes && (
                <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2">Notes</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{viewingTrade.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Premium Image Viewer */}
      {viewingImages.length > 0 && (
        <ImageViewer
          images={viewingImages}
          initialIndex={viewingImageIndex}
          onClose={() => setViewingImages([])}
        />
      )}
    </div>
  );
}
