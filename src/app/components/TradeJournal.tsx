import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, Check, TrendingUp, TrendingDown, Edit2, Trash2, Image as ImageIcon, Eye, Calendar as CalendarIcon, ZoomIn, Trash, AlertTriangle, FileText, ClipboardCheck, Link2, Unlink } from 'lucide-react';
import { Trade, TradingAccount, PropFirm, TradingSession, MasterData, SMTType, Model1Type } from '../types/trading';
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
import { getDateKey, getLocalDateString, convertTo24Hour } from '../utils/dateUtils';
import LossReasonModal from './LossReasonModal';
import ExportMenu from './ExportMenu';
import StrategyChecklist from './StrategyChecklist';


export default function TradeJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [pairs, setPairs] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
  const [viewingImages, setViewingImages] = useState<{ url: string; label: string }[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Loss Analysis Modal State
  const [lossAnalysisModal, setLossAnalysisModal] = useState<{
    isOpen: boolean;
    tradeId: string | null;
    tradeData: { pair: string; type: string; entryPrice: number; exitPrice: number; profit: number; entryDate: string; exitDate: string } | null;
    existingAnalysis: any | null;
    mode: 'add' | 'view';
  }>({ isOpen: false, tradeId: null, tradeData: null, existingAnalysis: null, mode: 'add' });

  // Checklist Modal State
  const [checklistModal, setChecklistModal] = useState<{
    isOpen: boolean;
    completedChecklistId: string | null;
    completedSessionId: string | null;
  }>({ isOpen: false, completedChecklistId: null, completedSessionId: null });

  // Active Sessions State
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>('');

  // Link Checklist Modal State
  const [linkChecklistModal, setLinkChecklistModal] = useState<{
    isOpen: boolean;
    activeChecklists: any[];
    selectedChecklistId: string;
    isLinking: boolean;
  }>({ isOpen: false, activeChecklists: [], selectedChecklistId: '', isLinking: false });

  // View Checklist Modal State
  const [viewChecklistModal, setViewChecklistModal] = useState<{
    isOpen: boolean;
    checklist: any | null;
    isLoading: boolean;
  }>({ isOpen: false, checklist: null, isLoading: false });

  // Cached checklists for performance
  const [checklistCache, setChecklistCache] = useState<Record<string, any>>({});

  const formRef = useRef<HTMLDivElement>(null);
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
    commission: '',
    swap: '',
    notes: '',
    session: 'LONDON' as TradingSession | '',
    strategy: '',
    keyLevel: 'No Key Level',
    highLowTime: '',
    smt: 'No' as SMTType,
    model1: 'Yes (EUR)' as Model1Type,
    beforeScreenshot: '',
    afterScreenshot: '',
    checklistId: '',
    checklistSession: '',
  });

  useEffect(() => {
    if (formData.status === 'OPEN') {
      setFormData(prev => ({
        ...prev,
        exitDate: '',
        exitTime: '',
        exitPrice: ''
      }));
    }
  }, [formData.status]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tradesData, accountsData, firmsData, mastersData, pairsData, sessionsData] = await Promise.all([
          apiService.getTrades(),
          apiService.getAccounts(),
          apiService.getPropFirms(),
          apiService.getMasters(),
          apiService.settings.getPairs(),
          apiService.checklists.getActiveSessions()
        ]);
        setTrades(tradesData);
        setAccounts(accountsData);
        setFirms(firmsData);
        setMasters(mastersData);
        setPairs(pairsData || []);
        setActiveSessions(sessionsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  const strategies = useMemo(() => masters.filter(m => m.type === 'strategy'), [masters]);
  const keyLevels = useMemo(() => masters.filter(m => m.type === 'keyLevel'), [masters]);
  const sessions = useMemo(() => masters.filter(m => m.type === 'session'), [masters]);
  const strategiesWithChecklist = useMemo(() =>
    strategies.filter(s => s.checklist && s.checklist.length > 0),
    [strategies]
  );

  const selectedStrategyHasChecklist = useMemo(() => {
    if (!formData.strategy) return false;
    return strategiesWithChecklist.some(s => s.name === formData.strategy);
  }, [formData.strategy, strategiesWithChecklist]);

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

  const calculatedRealPL = useMemo(() => {
    const profit = parseFloat(formData.profit) || 0;
    const commission = Math.abs(parseFloat(formData.commission) || calculatedCommission);
    const swap = Math.abs(parseFloat(formData.swap) || 0);
    return Number((profit - commission - swap).toFixed(2));
  }, [formData.profit, formData.commission, formData.swap, calculatedCommission]);

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
    if (!formData.accountId || !formData.pair || !formData.entryPrice || !formData.lotSize) {
      alert('Please fill in all required fields: Account, Pair, Entry Price, and Lot Size');
      return;
    }

    if (formData.status === 'CLOSED' && (!formData.exitDate || !formData.exitPrice)) {
      alert('Exit Date and Exit Price are required for CLOSED trades');
      return;
    }

    // Check if strategy has a checklist
    if (selectedStrategyHasChecklist && !checklistModal.completedChecklistId && !selectedChecklistId) {
      setChecklistModal({ isOpen: true, completedChecklistId: null, completedSessionId: null });
      return;
    }

    const account = accounts.find(a => a.id === formData.accountId);
    if (!account) return;

    // Combine date + time into ISO datetime string
    const entryTime24 = formData.entryTime ? convertTo24Hour(formData.entryTime) : '';
    const exitTime24 = formData.exitTime ? convertTo24Hour(formData.exitTime) : '';

    const entryDateISO = formData.entryDate && entryTime24
      ? new Date(`${formData.entryDate}T${entryTime24}:00`).toISOString()
      : formData.entryDate
        ? new Date(`${formData.entryDate}T00:00:00`).toISOString()
        : new Date().toISOString();

    const exitDateISO = formData.exitDate && exitTime24
      ? new Date(`${formData.exitDate}T${exitTime24}:00`).toISOString()
      : formData.exitDate
        ? new Date(`${formData.exitDate}T00:00:00`).toISOString()
        : undefined;

    console.log('=== FRONTEND DEBUG ===');
    console.log('entryDate:', formData.entryDate, 'entryTime:', formData.entryTime);
    console.log('exitDate:', formData.exitDate, 'exitTime:', formData.exitTime);
    console.log('entryDateISO:', entryDateISO);
    console.log('exitDateISO:', exitDateISO);

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
        entryDate: entryDateISO,
        exitDate: exitDateISO,
      };
      profit = calculateTradeProfit(trade);
    }

    // Get selected checklist info
    const selectedSession = activeSessions.find(s => s.id === selectedChecklistId);
    const checklistIdToUse = checklistModal.completedChecklistId || selectedChecklistId || formData.checklistId;
    const checklistSessionToUse = checklistModal.completedSessionId || selectedSession?.sessionId || formData.checklistSession;

    const newTrade: Omit<Trade, 'id'> = {
      accountId: formData.accountId,
      propFirmId: typeof account.propFirmId === 'object' ? account.propFirmId.id : account.propFirmId,
      pair: formData.pair,
      type: formData.type,
      status: formData.status,
      entryPrice: parseFloat(formData.entryPrice),
      exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
      lotSize: parseFloat(formData.lotSize),
      commission: formData.commission ? parseFloat(formData.commission) : calculatedCommission,
      swap: formData.swap ? parseFloat(formData.swap) : 0,
      entryDate: entryDateISO,
      entryTime: formData.entryTime || undefined,
      exitDate: exitDateISO,
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
      smt: formData.smt,
      model1: formData.model1,
      beforeScreenshot: formData.beforeScreenshot || undefined,
      afterScreenshot: formData.afterScreenshot || undefined,
      realPL: calculatedRealPL,
      checklistId: checklistIdToUse || undefined,
      checklistSession: checklistSessionToUse || undefined,
    };

    try {
      const savedTrade = await apiService.createTrade(newTrade);
      console.log('Trade saved:', savedTrade);

      // Link checklist to trade if exists
      if (checklistIdToUse) {
        try {
          await apiService.checklists.linkToTrade(checklistIdToUse, savedTrade.id);
        } catch (linkError) {
          console.error('Failed to link checklist:', linkError);
        }
      }

      setTrades([...trades, savedTrade]);
      resetForm();
      // Refresh active sessions
      const sessions = await apiService.checklists.getActiveSessions();
      setActiveSessions(sessions || []);
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

    if (formData.status === 'CLOSED' && (!formData.exitDate || !formData.exitPrice)) {
      alert('Exit Date and Exit Price are required for CLOSED trades');
      return;
    }

    const account = accounts.find(a => a.id === formData.accountId);
    if (!account) {
      alert('Account not found');
      return;
    }

    // Combine date + time into ISO datetime string
    const entryDateISO = (() => {
      if (!formData.entryDate) return undefined;
      const dateStr = formData.entryTime
        ? `${formData.entryDate}T${formData.entryTime}:00`
        : `${formData.entryDate}T00:00:00`;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    })();

    const exitTime24 = formData.exitTime ? convertTo24Hour(formData.exitTime) : '';

    const exitDateISO = (() => {
      if (!formData.exitDate) return undefined;
      const dateStr = exitTime24
        ? `${formData.exitDate}T${exitTime24}:00`
        : `${formData.exitDate}T00:00:00`;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    })();

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
        entryDate: entryDateISO,
        exitDate: exitDateISO,
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
        commission: formData.commission ? parseFloat(formData.commission) : calculatedCommission,
        swap: formData.swap ? parseFloat(formData.swap) : 0,
        entryDate: entryDateISO,
        entryTime: formData.entryTime || undefined,
        exitDate: exitDateISO,
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
        smt: formData.smt,
        model1: formData.model1,
        beforeScreenshot: formData.beforeScreenshot || undefined,
        afterScreenshot: formData.afterScreenshot || undefined,
        realPL: calculatedRealPL,
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

  const handleOpenLossAnalysis = async (trade: any, mode?: 'add' | 'view') => {
    try {
      console.log('=== OPEN LOSS ANALYSIS ===');
      console.log('Trade ID:', trade.id);
      console.log('Mode:', mode);

      // Always try to fetch existing analysis
      const existingAnalysis = await apiService.lossAnalysis.get(trade.id);
      console.log('Existing analysis:', existingAnalysis);

      // Auto-determine mode: if analysis exists, use 'view', otherwise 'add'
      const finalMode = mode || (existingAnalysis ? 'view' : 'add');
      console.log('Final mode:', finalMode);

      setLossAnalysisModal({
        isOpen: true,
        tradeId: trade.id,
        tradeData: {
          pair: trade.pair,
          type: trade.type,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice || 0,
          profit: trade.profit || 0,
          entryDate: trade.entryDate,
          exitDate: trade.exitDate || ''
        },
        existingAnalysis,
        mode: finalMode
      });
    } catch (error) {
      console.error('Failed to load loss analysis:', error);
      // If error, open in add mode
      setLossAnalysisModal({
        isOpen: true,
        tradeId: trade.id,
        tradeData: {
          pair: trade.pair,
          type: trade.type,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice || 0,
          profit: trade.profit || 0,
          entryDate: trade.entryDate,
          exitDate: trade.exitDate || ''
        },
        existingAnalysis: null,
        mode: 'add'
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedTrades(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTrades.length === filteredTrades.length) {
      setSelectedTrades([]);
    } else {
      setSelectedTrades(filteredTrades.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await apiService.deleteTrades(selectedTrades);
      setTrades(trades.filter(t => !selectedTrades.includes(t.id)));
      setSelectedTrades([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete trades:', error);
      alert('Failed to delete trades. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openLinkChecklistModal = async () => {
    try {
      const checklists = await apiService.checklists.getActiveList();
      setLinkChecklistModal({
        isOpen: true,
        activeChecklists: checklists || [],
        selectedChecklistId: '',
        isLinking: false
      });
    } catch (error) {
      console.error('Failed to load checklists:', error);
      alert('Failed to load checklists');
    }
  };

  const handleLinkChecklist = async () => {
    if (!linkChecklistModal.selectedChecklistId) {
      alert('Please select a checklist');
      return;
    }

    if (selectedTrades.length === 0) {
      alert('Please select at least one trade');
      return;
    }

    if (!confirm(`Link selected checklist to ${selectedTrades.length} trade(s)? This cannot be undone.`)) {
      return;
    }

    setLinkChecklistModal(prev => ({ ...prev, isLinking: true }));

    try {
      const result = await apiService.checklists.linkToTrades(
        linkChecklistModal.selectedChecklistId,
        selectedTrades
      );

      const linkedChecklist = linkChecklistModal.activeChecklists.find(
        c => c.id === linkChecklistModal.selectedChecklistId
      );

      setTrades(trades.map(trade => {
        if (selectedTrades.includes(trade.id)) {
          return {
            ...trade,
            checklistId: linkedChecklist.id,
            checklistSession: linkedChecklist.sessionId
          };
        }
        return trade;
      }));

      setSelectedTrades([]);
      setLinkChecklistModal({ isOpen: false, activeChecklists: [], selectedChecklistId: '', isLinking: false });

      alert(`Successfully linked checklist ${linkedChecklist.sessionId} to ${selectedTrades.length} trade(s)`);
    } catch (error: any) {
      console.error('Failed to link checklist:', error);
      alert(error.message || 'Failed to link checklist');
      setLinkChecklistModal(prev => ({ ...prev, isLinking: false }));
    }
  };

  const handleViewChecklist = async (checklistId: string) => {
    if (checklistCache[checklistId]) {
      setViewChecklistModal({
        isOpen: true,
        checklist: checklistCache[checklistId],
        isLoading: false
      });
      return;
    }

    setViewChecklistModal({ isOpen: true, checklist: null, isLoading: true });

    try {
      const checklist = await apiService.checklists.getById(checklistId);
      setChecklistCache(prev => ({ ...prev, [checklistId]: checklist }));
      setViewChecklistModal({
        isOpen: true,
        checklist,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load checklist:', error);
      setViewChecklistModal({ isOpen: false, checklist: null, isLoading: false });
      alert('Failed to load checklist details');
    }
  };

  const handleUnlinkChecklist = async (tradeId: string, checklistId: string) => {
    if (!confirm('Are you sure you want to unlink this checklist from the trade?')) {
      return;
    }

    try {
      await apiService.checklists.unlinkFromTrades(checklistId, [tradeId]);

      setTrades(trades.map(trade => {
        if (trade.id === tradeId) {
          return { ...trade, checklistId: undefined, checklistSession: undefined };
        }
        return trade;
      }));

      setChecklistCache(prev => {
        const newCache = { ...prev };
        delete newCache[checklistId];
        return newCache;
      });

      alert('Checklist unlinked successfully');
    } catch (error: any) {
      console.error('Failed to unlink checklist:', error);
      alert(error.message || 'Failed to unlink checklist');
    }
  };

  const handleBulkUnlink = async () => {
    const tradesWithChecklist = selectedTrades.filter(id => {
      const trade = trades.find(t => t.id === id);
      return trade && (trade as any).checklistId;
    });

    if (tradesWithChecklist.length === 0) {
      alert('No selected trades have checklists to unlink');
      return;
    }

    if (!confirm(`Are you sure you want to unlink checklists from ${tradesWithChecklist.length} trade(s)?`)) {
      return;
    }

    const groupByChecklist = tradesWithChecklist.reduce((acc, tradeId) => {
      const trade = trades.find(t => t.id === tradeId);
      const checklistId = (trade as any).checklistId;
      if (!acc[checklistId]) acc[checklistId] = [];
      acc[checklistId].push(tradeId);
      return acc;
    }, {} as Record<string, string[]>);

    try {
      for (const [checklistId, tradeIds] of Object.entries(groupByChecklist)) {
        await apiService.checklists.unlinkFromTrades(checklistId, tradeIds);
      }

      setTrades(trades.map(trade => {
        if (tradesWithChecklist.includes(trade.id)) {
          return { ...trade, checklistId: undefined, checklistSession: undefined };
        }
        return trade;
      }));

      setSelectedTrades([]);
      Object.keys(groupByChecklist).forEach(id => {
        setChecklistCache(prev => {
          const newCache = { ...prev };
          delete newCache[id];
          return newCache;
        });
      });

      alert(`Successfully unlinked checklists from ${tradesWithChecklist.length} trade(s)`);
    } catch (error: any) {
      console.error('Failed to unlink checklists:', error);
      alert(error.message || 'Failed to unlink checklists');
    }
  };

  const startEdit = (trade: Trade) => {
    setEditingId(trade.id);
    const accountId = getTradeAccountId(trade);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      commission: trade.commission?.toString() || '',
      swap: (trade as any).swap?.toString() || '',
      notes: trade.notes || '',
      session: trade.session || '',
      strategy: trade.strategy || '',
      keyLevel: trade.keyLevel || '',
      highLowTime: trade.highLowTime || '',
      smt: trade.smt || 'No',
      model1: trade.model1 || 'Yes (EUR)',
      beforeScreenshot: trade.beforeScreenshot || '',
      afterScreenshot: trade.afterScreenshot || '',
    });
    setIsAdding(false);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setChecklistModal({ isOpen: false, completedChecklistId: null, completedSessionId: null });
    setSelectedChecklistId('');
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
      commission: '',
      swap: '',
      notes: '',
      session: 'LONDON',
      strategy: '',
      keyLevel: 'No Key Level',
      highLowTime: '',
      beforeScreenshot: '',
      afterScreenshot: '',
      checklistId: '',
      checklistSession: '',
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trade Journal</h1>
          <p className="text-sm text-slate-500 mt-1">Record and track your trading activity</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportMenu
            accountId={filterAccount !== 'all' ? filterAccount : undefined}
          />
          <button
            onClick={() => setIsAdding(true)}
            disabled={accounts.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Add Trade
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-200/50">
        <span className="text-sm text-slate-500 font-medium">Filters:</span>
        <div className="flex gap-3">
          <Select
            value={filterAccount || 'all'}
            onValueChange={(value: string) => setFilterAccount(value)}
          >
            <SelectTrigger className="w-[200px] bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
            <SelectTrigger className="w-[150px] bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50">
        <div className="p-6">
          {accounts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600 font-medium">Please add an account first</p>
              <p className="text-sm text-slate-500">Go to "Accounts" tab to create one</p>
            </div>
          )}

          {accounts.length > 0 && (
            <>
              {/* Add/Edit Form */}
              {(isAdding || editingId) && (
                <div ref={formRef} className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200/50">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">
                      {editingId ? 'Edit Trade' : 'New Trade'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Basic Info */}
                    <FormField label="Account" required>
                      <Select value={formData.accountId} onValueChange={value => setFormData({ ...formData, accountId: value })}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
                      <Select value={formData.pair} onValueChange={value => setFormData({ ...formData, pair: value })}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
                          <SelectValue placeholder="Select Pair" />
                        </SelectTrigger>
                        <SelectContent>
                          {pairs.length > 0 ? (
                            pairs.map(p => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="EURUSD">EURUSD</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Type" required>
                      <Select value={formData.type} onValueChange={value => setFormData({ ...formData, type: value as 'BUY' | 'SELL' })}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
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
                              "w-full justify-start text-left font-normal h-10 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors",
                              !formData.entryDate && "text-slate-400"
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
                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        type="number"
                        placeholder="0.10"
                        value={formData.lotSize}
                        onChange={e => setFormData({ ...formData, lotSize: e.target.value })}
                        step="0.01"
                      />
                    </FormField>

                    <FormField label="Commission">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <Input
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-colors pl-7"
                          type="number"
                          placeholder={calculatedCommission.toString()}
                          value={formData.commission}
                          onChange={e => setFormData({ ...formData, commission: e.target.value })}
                          step="0.01"
                          title={`Auto-calculated: $${COMMISSION_PER_LOT} per lot. Edit to override.`}
                        />
                      </div>
                    </FormField>

                    <FormField label="Swap">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <Input
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-colors pl-7"
                          type="number"
                          placeholder="0.00"
                          value={formData.swap}
                          onChange={e => setFormData({ ...formData, swap: e.target.value })}
                          step="0.01"
                        />
                      </div>
                    </FormField>

                    <FormField label="Real Profit/Loss">
                      <div className={`h-10 px-3 flex items-center bg-gray-100 rounded-md border font-semibold ${calculatedRealPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {calculatedRealPL >= 0 ? '+' : ''}${calculatedRealPL.toFixed(2)}
                      </div>
                    </FormField>

                    <FormField label="Stop Loss">
                      <Input
                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        type="number"
                        placeholder="1.0820"
                        value={formData.stopLoss}
                        onChange={e => setFormData({ ...formData, stopLoss: e.target.value })}
                        step="0.00001"
                      />
                    </FormField>

                    <FormField label="Take Profit">
                      <Input
                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
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
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
                          <SelectValue placeholder="Select Key Level" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyLevels.map(level => (
                            <SelectItem key={level.id} value={level.name}>{level.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="SMT">
                      <Select value={formData.smt} onValueChange={value => setFormData({ ...formData, smt: value as SMTType })}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Yes with GBPUSD">Yes with GBPUSD</SelectItem>
                          <SelectItem value="Yes with EURUSD">Yes with EURUSD</SelectItem>
                          <SelectItem value="Yes with DXY">Yes with DXY</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Model #1">
                      <Select value={formData.model1} onValueChange={value => setFormData({ ...formData, model1: value as Model1Type })}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes (Both EUR and GBP)">Yes (Both EUR and GBP)</SelectItem>
                          <SelectItem value="Yes (EUR)">Yes (EUR)</SelectItem>
                          <SelectItem value="Yes (GBP)">Yes (GBP)</SelectItem>
                          <SelectItem value="No">No</SelectItem>
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
                        <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        type="number"
                        placeholder="+100.00"
                        value={formData.profit}
                        onChange={e => setFormData({ ...formData, profit: e.target.value })}
                        step="0.01"
                      />
                    </FormField>

                    {/* Exit Details */}
                    {formData.status === 'CLOSED' ? (
                      <>
                        <FormField label="Exit Price" required>
                          <Input
                            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
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
                                  "w-full justify-start text-left font-normal h-10 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors",
                                  !formData.exitDate && "text-slate-400"
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
                    ) : (
                      <>
                        <FormField label="Exit Price">
                          <Input
                            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            type="number"
                            placeholder="1.0900"
                            value={formData.exitPrice}
                            onChange={e => setFormData({ ...formData, exitPrice: e.target.value })}
                            step="0.00001"
                          />
                        </FormField>

                        <FormField label="Exit Date">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-10 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors",
                                  !formData.exitDate && "text-slate-400"
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
                        <p className="text-sm text-gray-500 col-span-3">
                          Exit details will be filled when trade is closed
                        </p>
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
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </FormField>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end mt-4">
                    {selectedStrategyHasChecklist && !checklistModal.completedChecklistId && (
                      <button
                        onClick={() => setChecklistModal({ isOpen: true, completedChecklistId: null })}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/25"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        Complete Checklist
                      </button>
                    )}
                    {selectedStrategyHasChecklist && checklistModal.completedChecklistId && (
                      <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Checklist Completed
                      </span>
                    )}
                    <button
                      onClick={editingId ? () => handleEdit(editingId) : handleSubmit}
                      disabled={selectedStrategyHasChecklist && !checklistModal.completedChecklistId}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      {editingId ? 'Update' : 'Save'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center gap-2"
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
                  <div className="text-center py-12">
                    <p className="text-slate-600">No trades recorded yet</p>
                    <p className="text-sm text-slate-500">Click "Add Trade" to start logging</p>
                  </div>
                )}

                {filteredTrades.length > 0 && (
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTrades.length === filteredTrades.length && filteredTrades.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="font-medium">Select All</span>
                      </label>
                      <span className="text-sm text-slate-500">
                        {selectedTrades.length > 0 ? `${selectedTrades.length} selected` : `${filteredTrades.length} trades`}
                      </span>
                    </div>
                    {selectedTrades.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openLinkChecklistModal}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                        >
                          <Link2 className="w-4 h-4" />
                          Link Checklist ({selectedTrades.length})
                        </button>
                        <button
                          onClick={handleBulkUnlink}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-500/25"
                        >
                          <Unlink className="w-4 h-4" />
                          Unlink ({selectedTrades.length})
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all duration-200 shadow-lg shadow-rose-500/25"
                        >
                          <Trash className="w-4 h-4" />
                          Delete ({selectedTrades.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {filteredTrades.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1400px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50">
                            <th className="w-12 py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedTrades.length === filteredTrades.length && filteredTrades.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Account</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Pair</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Strategy</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Checklist</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Entry</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Exit</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">RR</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">P/L</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Commission</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Real P/L</th>
                            <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredTrades.map(trade => (
                            <tr key={trade.id} className={`hover:bg-slate-50/50 transition-colors duration-150 ${selectedTrades.includes(trade.id) ? 'bg-blue-50/50' : ''}`}>
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  checked={selectedTrades.includes(trade.id)}
                                  onChange={() => toggleSelect(trade.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-900">
                                <div>
                                  {getLocalDateString(trade.entryDate)}
                                  {trade.entryTime && (
                                    <div className="text-xs text-slate-400">{trade.entryTime}</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getFirmColor(trade.propFirmId) }}
                                  />
                                  <span className="text-slate-700">{getAccountName(trade.accountId)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <div className="font-semibold text-slate-900">{trade.pair}</div>
                                {trade.session && (
                                  <div className="text-xs text-slate-400">{trade.session}</div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                  {trade.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {trade.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-700">
                                {trade.strategy || '-'}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {(trade as any).checklistSession ? (
                                  <button
                                    onClick={() => handleViewChecklist((trade as any).checklistId)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                                  >
                                    <ClipboardCheck className="w-3 h-3" />
                                    {(trade as any).checklistSession}
                                  </button>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-mono text-slate-700">{trade.entryPrice.toFixed(5)}</td>
                              <td className="py-3 px-4 text-sm text-right font-mono text-slate-700">
                                {trade.exitPrice ? trade.exitPrice.toFixed(5) : '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">
                                {trade.riskRewardRatio ? (
                                  <span className="text-blue-600 font-medium">
                                    1:{trade.riskRewardRatio.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">
                                {trade.profit !== undefined ? (
                                  <span className={`font-semibold ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-right text-red-500">
                                {(trade as any).commission ? `-$${Math.abs((trade as any).commission).toFixed(2)}` : '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">
                                {(() => {
                                  const realPL = (trade as any).realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs((trade as any).swap || 0));
                                  return (
                                    <span className={`font-semibold ${realPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {realPL >= 0 ? '+' : ''}${realPL.toFixed(2)}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4 text-sm text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${trade.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                  {trade.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {(trade.beforeScreenshot || trade.afterScreenshot) && (
                                    <button
                                      onClick={() => setViewingTrade(trade)}
                                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all duration-150 hover:scale-105"
                                      title="View"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  {/* Loss Analysis Button - Only for losing trades */}
                                  {(trade.profit || 0) < 0 && (
                                    <button
                                      onClick={() => handleOpenLossAnalysis(trade, 'add')}
                                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-150 hover:scale-105"
                                      title="Add Loss Reason"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                  )}
                                  {/* Link Checklist - Only if no checklist linked */}
                                  {!(trade as any).checklistSession && (
                                    <button
                                      onClick={async () => {
                                        setSelectedTrades([trade.id]);
                                        try {
                                          const checklists = await apiService.checklists.getActiveList();
                                          setLinkChecklistModal({
                                            isOpen: true,
                                            activeChecklists: checklists || [],
                                            selectedChecklistId: '',
                                            isLinking: false
                                          });
                                        } catch (error) {
                                          console.error('Failed to load checklists:', error);
                                          alert('Failed to load checklists');
                                        }
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150 hover:scale-105"
                                      title="Link Checklist"
                                    >
                                      <Link2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  {(trade as any).checklistId && (
                                    <button
                                      onClick={() => handleUnlinkChecklist(trade.id, (trade as any).checklistId)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 hover:scale-105"
                                      title="Unlink Checklist"
                                    >
                                      <Unlink className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => startEdit(trade)}
                                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all duration-150 hover:scale-105"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(trade.id)}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all duration-150 hover:scale-105"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trade Details Modal */}
      {viewingTrade && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setViewingTrade(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">{viewingTrade.pair}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${viewingTrade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {viewingTrade.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {getLocalDateString(viewingTrade.entryDate)} {viewingTrade.entryTime && `at ${viewingTrade.entryTime}`}
                  </p>
                </div>
                <button
                  onClick={() => setViewingTrade(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Entry Price</p>
                  <p className="text-xl font-bold text-gray-900">{viewingTrade.entryPrice.toFixed(5)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4">
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide mb-1">Exit Price</p>
                  <p className="text-xl font-bold text-gray-900">{viewingTrade.exitPrice?.toFixed(5) || '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4">
                  <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${(viewingTrade.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>P/L</p>
                  <p className={`text-xl font-bold ${(viewingTrade.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {viewingTrade.profit !== undefined ? `${viewingTrade.profit >= 0 ? '+' : ''}$${viewingTrade.profit.toFixed(2)}` : '-'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4">
                  <p className="text-xs text-orange-600 font-medium uppercase tracking-wide mb-1">Risk / Reward</p>
                  <p className="text-xl font-bold text-gray-900">{viewingTrade.riskRewardRatio ? `1:${viewingTrade.riskRewardRatio.toFixed(2)}` : '-'}</p>
                </div>
              </div>

              {/* Trade Information */}
              <div className="bg-slate-50/50 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                  Trade Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account</span>
                    <span className="font-medium text-gray-900">{getAccountName(viewingTrade.accountId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lot Size</span>
                    <span className="font-medium text-gray-900">{viewingTrade.lotSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Commission</span>
                    <span className="font-medium text-red-500">-${Math.abs(viewingTrade.commission || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Swap</span>
                    <span className="font-medium text-red-500">-${Math.abs((viewingTrade as any).swap || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${viewingTrade.status === 'OPEN' ? 'text-blue-600' : 'text-gray-700'}`}>{viewingTrade.status}</span>
                  </div>
                </div>
              </div>

              {/* Real P/L Summary */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 mb-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                  Net Performance
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Profit</p>
                    <p className={`text-lg font-bold ${(viewingTrade.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${viewingTrade.profit?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Real P/L</p>
                    <p className={`text-lg font-bold ${(() => {
                      const realPL = (viewingTrade as any).realPL ?? ((viewingTrade.profit || 0) - Math.abs(viewingTrade.commission || 0) - Math.abs((viewingTrade as any).swap || 0));
                      return realPL >= 0 ? 'text-green-600' : 'text-red-600';
                    })()}`}>
                      ${(() => {
                        const realPL = (viewingTrade as any).realPL ?? ((viewingTrade.profit || 0) - Math.abs(viewingTrade.commission || 0) - Math.abs((viewingTrade as any).swap || 0));
                        return realPL >= 0 ? `+${realPL.toFixed(2)}` : realPL.toFixed(2);
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trade Management */}
              <div className="bg-slate-50/50 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                  Risk Management
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stop Loss</span>
                    <span className="font-medium text-red-600">{viewingTrade.stopLoss?.toFixed(5) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Take Profit</span>
                    <span className="font-medium text-green-600">{viewingTrade.takeProfit?.toFixed(5) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Risk (pips)</span>
                    <span className="font-medium text-red-600">
                      {viewingTrade.stopLoss && viewingTrade.entryPrice ? Math.abs((viewingTrade.entryPrice - viewingTrade.stopLoss) * 10000).toFixed(1) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reward (pips)</span>
                    <span className="font-medium text-green-600">
                      {viewingTrade.takeProfit && viewingTrade.entryPrice ? Math.abs((viewingTrade.takeProfit - viewingTrade.entryPrice) * 10000).toFixed(1) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Session & Strategy */}
              <div className="bg-slate-50/50 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                  Session & Strategy
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Session</span>
                    <span className="font-medium text-gray-900">{viewingTrade.session || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Strategy</span>
                    <span className="font-medium text-gray-900">{viewingTrade.strategy || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Key Level</span>
                    <span className="font-medium text-gray-900">{viewingTrade.keyLevel || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">High/Low Time</span>
                    <span className="font-medium text-gray-900">{viewingTrade.highLowTime || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">SMT</span>
                    <span className="font-medium text-gray-900">{viewingTrade.smt || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Model #1</span>
                    <span className="font-medium text-gray-900">{viewingTrade.model1 || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Screenshots */}
              {(viewingTrade.beforeScreenshot || viewingTrade.afterScreenshot) && (
                <div className="bg-slate-50/50 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Screenshots
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingTrade.beforeScreenshot && (
                      <div className="relative group rounded-lg overflow-hidden">
                        <img
                          src={viewingTrade.beforeScreenshot}
                          alt="Before trade"
                          className="w-full h-40 object-cover cursor-pointer"
                          onClick={() => {
                            const images = [];
                            if (viewingTrade.beforeScreenshot) images.push({ url: viewingTrade.beforeScreenshot, label: 'Before Screenshot' });
                            if (viewingTrade.afterScreenshot) images.push({ url: viewingTrade.afterScreenshot, label: 'After Screenshot' });
                            setViewingImages(images);
                            setViewingImageIndex(0);
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-lg flex items-center justify-center">
                          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          Before
                        </span>
                      </div>
                    )}
                    {viewingTrade.afterScreenshot && (
                      <div className="relative group rounded-lg overflow-hidden">
                        <img
                          src={viewingTrade.afterScreenshot}
                          alt="After trade"
                          className="w-full h-40 object-cover cursor-pointer"
                          onClick={() => {
                            const images = [];
                            if (viewingTrade.beforeScreenshot) images.push({ url: viewingTrade.beforeScreenshot, label: 'Before Screenshot' });
                            if (viewingTrade.afterScreenshot) images.push({ url: viewingTrade.afterScreenshot, label: 'After Screenshot' });
                            setViewingImages(images);
                            setViewingImageIndex(viewingTrade.beforeScreenshot ? 1 : 0);
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-lg flex items-center justify-center">
                          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          After
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {viewingTrade.notes && (
                <div className="bg-amber-50/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <span className={`w-1 h-4 rounded-full ${viewingTrade.notes ? 'bg-amber-500' : 'bg-gray-400'}`}></span>
                    Notes
                  </h4>
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

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Trades</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{selectedTrades.length}</span> trade{selectedTrades.length > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 shadow-lg shadow-red-500/25"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loss Analysis Modal */}
      <LossReasonModal
        isOpen={lossAnalysisModal.isOpen}
        onClose={() => setLossAnalysisModal({ isOpen: false, tradeId: null, tradeData: null, existingAnalysis: null, mode: 'add' })}
        tradeId={lossAnalysisModal.tradeId || ''}
        tradeData={lossAnalysisModal.tradeData || undefined}
        existingAnalysis={lossAnalysisModal.existingAnalysis}
        mode={lossAnalysisModal.mode}
      />

      {/* Checklist Modal */}
      {checklistModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <StrategyChecklist
              strategies={strategiesWithChecklist}
              onComplete={(checklistId, isValid, sessionId) => {
                setChecklistModal({
                  isOpen: false,
                  completedChecklistId: isValid ? checklistId : null,
                  completedSessionId: isValid ? sessionId : null
                });
                if (isValid) {
                  setTimeout(() => handleSubmit(), 100);
                }
              }}
              onCancel={() => setChecklistModal({ isOpen: false, completedChecklistId: null, completedSessionId: null })}
            />
          </div>
        </div>
      )}

      {/* Link Checklist Modal */}
      {linkChecklistModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Link2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Link Checklist</h3>
                    <p className="text-sm text-gray-500">Link an active checklist to {selectedTrades.length} trade(s)</p>
                  </div>
                </div>
                <button
                  onClick={() => setLinkChecklistModal({ isOpen: false, activeChecklists: [], selectedChecklistId: '', isLinking: false })}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  disabled={linkChecklistModal.isLinking}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {linkChecklistModal.activeChecklists.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active checklists available</p>
                  <p className="text-sm text-gray-400 mt-1">Complete a checklist first from the Execution page</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 mb-3">Select a checklist:</p>
                  {linkChecklistModal.activeChecklists.map((checklist) => (
                    <label
                      key={checklist.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${linkChecklistModal.selectedChecklistId === checklist.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="checklist"
                        value={checklist.id}
                        checked={linkChecklistModal.selectedChecklistId === checklist.id}
                        onChange={() => setLinkChecklistModal(prev => ({ ...prev, selectedChecklistId: checklist.id }))}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{checklist.sessionId}</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            ACTIVE
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {checklist.strategyName} • {checklist.items?.filter((i: any) => i.checked).length}/{checklist.items?.length} items checked
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setLinkChecklistModal({ isOpen: false, activeChecklists: [], selectedChecklistId: '', isLinking: false })}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
                  disabled={linkChecklistModal.isLinking}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkChecklist}
                  disabled={!linkChecklistModal.selectedChecklistId || linkChecklistModal.isLinking}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {linkChecklistModal.isLinking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Link Checklist
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Checklist Modal */}
      {viewChecklistModal.isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setViewChecklistModal({ isOpen: false, checklist: null, isLoading: false })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {viewChecklistModal.isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="mt-4 text-slate-500">Loading checklist...</p>
              </div>
            ) : viewChecklistModal.checklist ? (
              <>
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${viewChecklistModal.checklist.isValid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                          }`}>
                          {viewChecklistModal.checklist.isValid ? '🟢 VALID' : '🔴 INVALID'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${viewChecklistModal.checklist.status === 'LINKED'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                          }`}>
                          {viewChecklistModal.checklist.status === 'LINKED' ? '🔒 LINKED' : '🟢 ACTIVE'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{viewChecklistModal.checklist.strategyName}</h3>
                      <p className="text-sm font-mono text-slate-600 mt-1">
                        {viewChecklistModal.checklist.sessionId}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(viewChecklistModal.checklist.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setViewChecklistModal({ isOpen: false, checklist: null, isLoading: false })}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[50vh]">
                  <div className="space-y-2">
                    {viewChecklistModal.checklist.items?.map((item: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg ${item.checked
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.checked
                            ? 'bg-green-500 text-white'
                            : 'bg-red-400 text-white'
                          }`}>
                          {item.checked ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </div>
                        <span className={`flex-1 ${item.checked ? 'text-green-800' : 'text-red-800'}`}>
                          {item.label}
                        </span>
                        {item.required && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${item.checked
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                            }`}>
                            REQUIRED
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {viewChecklistModal.checklist.notes && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm font-medium text-amber-800 mb-1">Notes</p>
                      <p className="text-sm text-amber-700">{viewChecklistModal.checklist.notes}</p>
                    </div>
                  )}

                  {viewChecklistModal.checklist.missingRequired?.length > 0 && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-800 mb-1">Missing Required Items</p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {viewChecklistModal.checklist.missingRequired.map((item: string, index: number) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
                  <button
                    onClick={() => setViewChecklistModal({ isOpen: false, checklist: null, isLoading: false })}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center">
                <p className="text-slate-500">Failed to load checklist</p>
                <button
                  onClick={() => setViewChecklistModal({ isOpen: false, checklist: null, isLoading: false })}
                  className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
