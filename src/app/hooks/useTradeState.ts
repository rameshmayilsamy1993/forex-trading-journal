import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trade, TradingAccount, PropFirm, TradingSession, MasterData, SMTType, Model1Type } from '../types/trading';
import apiService from '../services/apiService';
import { calculateTradeProfit, calculateRiskReward, formatPrice, formatMoney } from '../utils/calculations';
import { getDateKey, getLocalDateString, convertTo24Hour } from '../utils/dateUtils';
import { showSuccess, showError, showConfirm } from './useToast';

export function useTradeState() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [pairs, setPairs] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAnalysis, setFilterAnalysis] = useState<string>('all');
  const [accountState, setAccountState] = useState<string>('ACTIVE');
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
  const [viewingImages, setViewingImages] = useState<{ url: string; label: string }[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [lossAnalysisModal, setLossAnalysisModal] = useState<{
    isOpen: boolean;
    tradeId: string | null;
    tradeData: { pair: string; type: string; entryPrice: number; exitPrice: number; profit: number; entryDate: string; exitDate: string } | null;
    existingAnalysis: any | null;
    mode: 'add' | 'view';
  }>({ isOpen: false, tradeId: null, tradeData: null, existingAnalysis: null, mode: 'add' });

  const [analysesMap, setAnalysesMap] = useState<Record<string, any>>({});

  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  const [linkChecklistModal, setLinkChecklistModal] = useState<{
    isOpen: boolean;
    activeChecklists: any[];
    selectedChecklistId: string;
    isLinking: boolean;
  }>({ isOpen: false, activeChecklists: [], selectedChecklistId: '', isLinking: false });

  const [viewChecklistModal, setViewChecklistModal] = useState<{
    isOpen: boolean;
    checklist: any | null;
    isLoading: boolean;
  }>({ isOpen: false, checklist: null, isLoading: false });

  const [checklistDetailsModal, setChecklistDetailsModal] = useState<{
    isOpen: boolean;
    tradeId: string | null;
    checklistId: string | undefined;
  }>({ isOpen: false, tradeId: null, checklistId: undefined });

  const [editChecklistModal, setEditChecklistModal] = useState<{
    isOpen: boolean;
  }>({ isOpen: false });

  const [checklistCache, setChecklistCache] = useState<Record<string, any>>({});

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

  const loadTrades = useCallback(async () => {
    try {
      const filters: any = {};
      if (filterAccount !== 'all') filters.accountId = filterAccount;
      if (accountState !== 'all') filters.accountState = accountState;

      const [tradesData, accountsData, firmsData, mastersData, pairsData, sessionsData, analysesData] = await Promise.all([
        apiService.getTrades(Object.keys(filters).length > 0 ? filters : undefined),
        apiService.getAccounts(),
        apiService.getPropFirms(),
        apiService.getMasters(),
        apiService.settings.getPairs(),
        apiService.checklists.getActiveSessions(),
        apiService.lossAnalysis.list({ limit: 1000 }).catch(() => null)
      ]);
      setTrades(tradesData);
      setAccounts(accountsData);
      setFirms(firmsData);
      setMasters(mastersData);
      setPairs(pairsData || []);
      setActiveSessions(sessionsData || []);

      if (analysesData?.analyses) {
        const map: Record<string, any> = {};
        analysesData.analyses.forEach((a: any) => {
          const tid = typeof a.tradeId === 'object' ? String(a.tradeId.id || a.tradeId._id || a.tradeId) : a.tradeId;
          if (tid) map[tid] = a;
        });
        setAnalysesMap(map);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [filterAccount, accountState]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const strategies = useMemo(() => masters.filter(m => m.type === 'strategy'), [masters]);
  const keyLevels = useMemo(() => masters.filter(m => m.type === 'keyLevel'), [masters]);
  const sessionsList = useMemo(() => masters.filter(m => m.type === 'session'), [masters]);
  const strategiesWithChecklist = useMemo(() =>
    strategies.filter(s => s.checklist && s.checklist.length > 0),
    [strategies]
  );

  const activeAccounts = useMemo(() =>
    accounts.filter(a => a.status !== 'BREACHED'),
    [accounts]
  );

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
    return calculateRiskReward(tempTrade) ?? null;
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

  const getTradeAccountId = (trade: Trade): string => {
    if (typeof trade.accountId === 'object' && trade.accountId !== null) {
      return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
    }
    return String(trade.accountId || '');
  };

  const getTradeRealPL = (trade: Trade): number => {
    return (trade as any).realPL ?? ((trade.profit || 0) - Math.abs(trade.commission || 0) - Math.abs((trade as any).swap || 0));
  };

  const getAnalysisStatus = (trade: Trade): 'Not Required' | 'Pending' | 'Completed' => {
    const realPL = getTradeRealPL(trade);
    if (realPL >= 0) return 'Not Required';
    if (analysesMap[trade.id]) return 'Completed';
    return 'Pending';
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

  const saveTrades = async (newTrades: Trade[]) => {
    setTrades(newTrades);
    updateAccountBalances(newTrades);
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
        showError('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(null);
      }
    }
  };

  const isEditMode = !!editingId;

  const handleSubmit = async (overrideChecklistId?: string, overrideChecklistSession?: string) => {
    if (!formData.accountId || !formData.pair || !formData.entryPrice || !formData.lotSize) {
      showError('Please fill in all required fields: Account, Pair, Entry Price, and Lot Size');
      return;
    }

    const selectedAccount = accounts.find(a => a.id === formData.accountId);
    if (selectedAccount && !selectedAccount.canTrade) {
      showError('This account is not active for trading.');
      return;
    }

    if (formData.status === 'CLOSED' && (!formData.exitDate || !formData.exitPrice)) {
      showError('Exit Date and Exit Price are required for CLOSED trades');
      return;
    }

    const account = accounts.find(a => a.id === formData.accountId);
    if (!account) return;

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

    const checklistIdToUse = overrideChecklistId || formData.checklistId;
    const checklistSessionToUse = overrideChecklistSession || formData.checklistSession;

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

      if (checklistIdToUse) {
        try {
          await apiService.checklists.linkToTrade(checklistIdToUse, savedTrade.id);
        } catch (linkError) {
          console.error('Failed to link checklist:', linkError);
        }
      }

      setTrades([...trades, savedTrade]);
      resetForm();
      const sessions = await apiService.checklists.getActiveSessions();
      setActiveSessions(sessions || []);
    } catch (error) {
      console.error('Failed to create trade:', error);
    }
  };

  const handleEdit = async (id: string) => {
    if (!formData.accountId || !formData.pair || !formData.entryPrice || !formData.lotSize) {
      showError('Please fill in all required fields: Account, Pair, Entry Price, and Lot Size');
      return;
    }

    if (formData.status === 'CLOSED' && (!formData.exitDate || !formData.exitPrice)) {
      showError('Exit Date and Exit Price are required for CLOSED trades');
      return;
    }

    const account = accounts.find(a => a.id === formData.accountId);
    if (!account) {
      showError('Account not found');
      return;
    }

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

      const savedTrade = await apiService.updateTrade(id, updatedTrade);
      setTrades(trades.map(trade => trade.id === id ? savedTrade : trade));
      resetForm();
    } catch (error: any) {
      console.error('Failed to update trade:', error);
      showError(`Failed to update trade: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this trade?');
    if (!confirmed) return;
    try {
      await apiService.deleteTrade(id);
      setTrades(trades.filter(trade => trade.id !== id));
    } catch (error) {
      console.error('Failed to delete trade:', error);
    }
  };

  const handleOpenLossAnalysis = async (trade: any, mode?: 'add' | 'view') => {
    try {
      const existingAnalysis = await apiService.lossAnalysis.get(trade.id);

      const finalMode = mode || (existingAnalysis ? 'view' : 'add');

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

  const handleOpenChecklistDetails = (trade: Trade) => {
    const checklistId = (trade as any).checklistId;
    if (checklistId) {
      setChecklistDetailsModal({
        isOpen: true,
        tradeId: trade.id,
        checklistId
      });
    } else {
      setSelectedTrades([trade.id]);
      setTimeout(() => openLinkChecklistModal(), 0);
    }
  };

  const handleEditChecklistComplete = async (checklistId: string, isValid: boolean, sessionId: string | undefined) => {
    if (!editingId || !isValid || !checklistId) {
      setEditChecklistModal({ isOpen: false });
      return;
    }
    try {
      await apiService.checklists.linkToTrade(checklistId, editingId);
      setTrades(prev => prev.map(t =>
        t.id === editingId ? { ...t, checklistId, checklistSession: sessionId } : t
      ));
      setFormData(prev => ({ ...prev, checklistId, checklistSession: sessionId || '' }));
    } catch (err) {
      console.error('Failed to link checklist:', err);
      showError('Failed to link checklist to trade.');
    }
    setEditChecklistModal({ isOpen: false });
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
      showError('Failed to delete trades. Please try again.');
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
      showError('Failed to load checklists');
    }
  };

  const handleLinkChecklist = async () => {
    if (!linkChecklistModal.selectedChecklistId) {
      showError('Please select a checklist');
      return;
    }

    if (selectedTrades.length === 0) {
      showError('Please select at least one trade');
      return;
    }

    const confirmed = await showConfirm(`Link selected checklist to ${selectedTrades.length} trade(s)? This cannot be undone.`);
    if (!confirmed) return;

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

      showSuccess(`Successfully linked checklist ${linkedChecklist.sessionId} to ${selectedTrades.length} trade(s)`);
    } catch (error: any) {
      console.error('Failed to link checklist:', error);
      showError(error.message || 'Failed to link checklist');
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
      showError('Failed to load checklist details');
    }
  };

  const handleUnlinkChecklist = async (tradeId: string, checklistId: string) => {
    const confirmed = await showConfirm('Are you sure you want to unlink this checklist from the trade?');
    if (!confirmed) return;

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

      showSuccess('Checklist unlinked successfully');
    } catch (error: any) {
      console.error('Failed to unlink checklist:', error);
      showError(error.message || 'Failed to unlink checklist');
    }
  };

  const unlinkSelectedChecklists = async () => {
    const tradesWithChecklist = selectedTrades.filter(id => {
      const trade = trades.find(t => t.id === id);
      return trade && (trade as any).checklistId;
    });

    if (tradesWithChecklist.length === 0) {
      showError('No selected trades have checklists to unlink');
      return;
    }

    const confirmed = await showConfirm(`Are you sure you want to unlink checklists from ${tradesWithChecklist.length} trade(s)?`);
    if (!confirmed) return;

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

      showSuccess(`Successfully unlinked checklists from ${tradesWithChecklist.length} trade(s)`);
    } catch (error: any) {
      console.error('Failed to unlink checklists:', error);
      showError(error.message || 'Failed to unlink checklists');
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
      checklistId: (trade as any).checklistId || '',
      checklistSession: (trade as any).checklistSession || '',
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

  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleSave = () => handleSubmit();
  const handleCancel = () => resetForm();

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      if (filterAccount !== 'all' && getTradeAccountId(trade) !== filterAccount) return false;
      if (filterStatus !== 'all' && trade.status !== filterStatus) return false;
      if (filterAnalysis !== 'all') {
        const status = getAnalysisStatus(trade);
        if (filterAnalysis === 'pending' && status !== 'Pending') return false;
        if (filterAnalysis === 'completed' && status !== 'Completed') return false;
        if (filterAnalysis === 'profit' && status !== 'Not Required') return false;
        if (filterAnalysis === 'loss' && status === 'Not Required') return false;
      }
      return true;
    });
  }, [trades, filterAccount, filterStatus, filterAnalysis, analysesMap]);

  return {
    trades, accounts, firms, masters, pairs,
    isAdding, editingId,
    filterAccount, filterStatus, filterAnalysis, accountState,
    viewingTrade, viewingImages, viewingImageIndex,
    selectedTrades, showDeleteConfirm, isDeleting,
    lossAnalysisModal, analysesMap, activeSessions,
    linkChecklistModal, viewChecklistModal, checklistDetailsModal,
    editChecklistModal, checklistCache,
    formData, uploadingImage, strategies, keyLevels, sessionsList,
    strategiesWithChecklist, activeAccounts,
    calculatedRR, calculatedCommission, calculatedRealPL,
    filteredTrades, isEditMode,
    loadTrades, handleAdd, startEdit, handleSave, handleEdit,
    handleDelete, handleCancel, handleFileUpload,
    handleOpenLossAnalysis, handleOpenChecklistDetails,
    handleEditChecklistComplete, toggleSelect, toggleSelectAll,
    handleBulkDelete, handleBulkUnlink: unlinkSelectedChecklists, openLinkChecklistModal,
    handleLinkChecklist, handleUnlinkChecklist, unlinkSelectedChecklists,
    setFilterAccount, setFilterStatus, setFilterAnalysis, setAccountState,
    setViewingTrade, setViewingImages, setViewingImageIndex,
    setShowDeleteConfirm, setSelectedTrades,
    setLossAnalysisModal, setLinkChecklistModal, setViewChecklistModal,
    setChecklistDetailsModal, setEditChecklistModal, setFormData,
  };
}
