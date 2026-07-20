import api, { apiGet, apiPost, apiPut, apiDelete, apiPostForm } from '../../services/api';
import { uploadImage, uploadMultiple, deleteImage } from '../../services/uploadService';
import type { PropFirm, TradingAccount, Trade, MasterData } from '../types/trading';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

const apiService = {
  auth: {
    login: async (email: string, password: string) => {
      const data = await apiPost<{ user: User }>('/auth/login', { email, password });
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    },

    register: async (name: string, email: string, password: string) => {
      const data = await apiPost('/auth/register', { name, email, password });
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    },

    logout: async () => {
      try {
        await apiPost('/auth/logout');
      } finally {
        localStorage.removeItem('user');
      }
    },

    getCurrentUser: async (): Promise<User | null> => {
      try {
        return await apiGet<User>('/auth/me');
      } catch {
        localStorage.removeItem('user');
        return null;
      }
    },

    getStoredUser: (): User | null => {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      return apiPost('/auth/change-password', { currentPassword, newPassword });
    },
  },

  getPropFirms: async (): Promise<PropFirm[]> => {
    return apiGet('/prop-firms');
  },

  createPropFirm: async (firm: Omit<PropFirm, 'id' | 'createdAt'>): Promise<PropFirm> => {
    return apiPost('/prop-firms', firm);
  },

  updatePropFirm: async (id: string, firm: Partial<PropFirm>): Promise<PropFirm> => {
    return apiPut(`/prop-firms/${id}`, firm);
  },

  deletePropFirm: async (id: string): Promise<void> => {
    return apiDelete(`/prop-firms/${id}`);
  },

  getAccounts: async (status?: string): Promise<TradingAccount[]> => {
    const url = status ? `/accounts?status=${status}` : '/accounts';
    return apiGet(url);
  },

  createAccount: async (account: {
    name: string;
    propFirmId: string;
    initialBalance: number;
    currentBalance: number;
    currency: string;
    status: string;
  }): Promise<TradingAccount> => {
    return apiPost('/accounts', account);
  },

  updateAccount: async (id: string, account: Partial<TradingAccount>): Promise<TradingAccount> => {
    return apiPut(`/accounts/${id}`, account);
  },

  deleteAccount: async (id: string): Promise<void> => {
    return apiDelete(`/accounts/${id}`);
  },

  getTrades: async (filters?: { accountId?: string; firmId?: string; ssmtType?: string; includeBreached?: boolean }): Promise<Trade[]> => {
    const params = new URLSearchParams();
    if (filters?.accountId) params.append('accountId', filters.accountId);
    if (filters?.firmId) params.append('firmId', filters.firmId);
    if (filters?.ssmtType) params.append('ssmtType', filters.ssmtType);
    if (filters?.includeBreached) params.append('includeBreached', 'true');
    const qs = params.toString();
    return apiGet(`/trades${qs ? `?${qs}` : ''}`);
  },

  createTrade: async (trade: Omit<Trade, 'id'>): Promise<Trade> => {
    return apiPost('/trades', trade);
  },

  updateTrade: async (id: string, trade: Partial<Trade>): Promise<Trade> => {
    return apiPut(`/trades/${id}`, trade);
  },

  deleteTrade: async (id: string): Promise<void> => {
    return apiDelete(`/trades/${id}`);
  },

  deleteTrades: async (ids: string[]): Promise<{ deletedCount: number }> => {
    return apiPost('/trades/bulk-delete', { ids });
  },

  getMissedTrades: async (filters?: { pair?: string; reason?: string }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters?.pair) params.append('pair', filters.pair);
    if (filters?.reason) params.append('reason', filters.reason);
    const qs = params.toString();
    return apiGet(`/missed-trades${qs ? `?${qs}` : ''}`);
  },

  createMissedTrade: async (trade: any): Promise<any> => {
    return apiPost('/missed-trades', trade);
  },

  updateMissedTrade: async (id: string, trade: any): Promise<any> => {
    return apiPut(`/missed-trades/${id}`, trade);
  },

  deleteMissedTrade: async (id: string): Promise<void> => {
    return apiDelete(`/missed-trades/${id}`);
  },

  getGeneralMissedTrades: async (filters?: { pair?: string; status?: string }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters?.pair) params.append('pair', filters.pair);
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return apiGet(`/general-missed-trades${qs ? `?${qs}` : ''}`);
  },

  createGeneralMissedTrade: async (trade: any): Promise<any> => {
    return apiPost('/general-missed-trades', trade);
  },

  updateGeneralMissedTrade: async (id: string, trade: any): Promise<any> => {
    return apiPut(`/general-missed-trades/${id}`, trade);
  },

  deleteGeneralMissedTrade: async (id: string): Promise<void> => {
    return apiDelete(`/general-missed-trades/${id}`);
  },

  getMasters: async (type?: string): Promise<MasterData[]> => {
    const url = type ? `/masters?type=${type}` : '/masters';
    return apiGet(url);
  },

  createMaster: async (master: Omit<MasterData, 'id'>): Promise<MasterData> => {
    return apiPost('/masters', master);
  },

  updateMaster: async (id: string, master: Partial<MasterData>): Promise<MasterData> => {
    return apiPut(`/masters/${id}`, master);
  },

  deleteMaster: async (id: string): Promise<void> => {
    return apiDelete(`/masters/${id}`);
  },

  settings: {
    getPairs: async (): Promise<string[]> => {
      const data = await apiGet<{ pairs: string[] }>('/settings/pairs');
      return data.pairs || [];
    },

    updatePairs: async (pairs: string[]): Promise<{ message: string; pairs: string[] }> => {
      return apiPost('/settings/pairs', { pairs });
    },

    getAll: async (): Promise<any[]> => {
      return apiGet('/settings');
    },

    get: async (key: string): Promise<any> => {
      return apiGet(`/settings?key=${key}`);
    },

    save: async (key: string, value: any): Promise<any> => {
      return apiPost('/settings', { key, value });
    },
  },

  importTrades: async (file: File, accountId: string): Promise<{ total: number; inserted: number; skipped: number; errors: any[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);
    return apiPostForm('/trades/import', formData);
  },

  previewTrades: async (file: File, accountId: string): Promise<{ total: number; preview: any[]; stats: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);
    return apiPostForm('/trades/preview', formData);
  },

  importConverted: async (trades: any[], accountId: string): Promise<{ total: number; inserted: number; skipped: number; errors: any[] }> => {
    return apiPost('/trades/import-converted', { trades, accountId });
  },

  convertMT5: async (file: File): Promise<{ total: number; converted: number; errors: any[]; data: any[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiPostForm('/import/convert-mt5', formData);
  },

  upload: {
    single: uploadImage,
    multiple: uploadMultiple,
    delete: deleteImage,
  },

  checklists: {
    getAll: async (options?: { tradeId?: string; page?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (options?.tradeId) params.append('tradeId', options.tradeId);
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      const qs = params.toString();
      return apiGet(`/checklists${qs ? `?${qs}` : ''}`);
    },

    getActiveSessions: async () => {
      return apiGet('/checklists/active');
    },

    getActiveList: async () => {
      return apiGet('/checklists/active-list');
    },

    linkToTrades: async (checklistId: string, tradeIds: string[]) => {
      return apiPost('/checklists/link', { checklistId, tradeIds });
    },

    unlinkFromTrades: async (checklistId: string, tradeIds: string[]) => {
      return apiPost('/checklists/unlink', { checklistId, tradeIds });
    },

    getById: async (id: string) => {
      return apiGet(`/checklists/${id}`);
    },

    create: async (data: {
      strategyId: string;
      items: Array<{ label: string; checked: boolean; required: boolean }>;
      notes?: string;
      pair?: string;
      tradeType?: string;
      entryPrice?: number;
    }) => {
      return apiPost('/checklists', data);
    },

    update: async (id: string, data: {
      items?: Array<{ label: string; checked: boolean; required: boolean }>;
      notes?: string;
      tradeId?: string;
    }) => {
      return apiPut(`/checklists/${id}`, data);
    },

    linkToTrade: async (id: string, tradeId: string) => {
      return apiPost(`/checklists/${id}/link-trade`, { tradeId });
    },

    delete: async (id: string) => {
      return apiDelete(`/checklists/${id}`);
    },
  },

  reports: {
    exportTrades: async (options?: {
      period?: 'daily' | 'weekly' | 'monthly' | 'all';
      date?: string;
      accountId?: string;
      firmId?: string;
    }): Promise<Blob> => {
      const params = new URLSearchParams();
      if (options?.period) params.append('period', options.period);
      if (options?.date) params.append('date', options.date);
      if (options?.accountId) params.append('accountId', options.accountId);
      if (options?.firmId) params.append('firmId', options.firmId);
      const response = await api.get(`/reports/trades?${params}`, { responseType: 'blob' });
      return response.data;
    },

    exportMissedTrades: async (options?: {
      period?: 'daily' | 'weekly' | 'monthly' | 'all';
      date?: string;
    }): Promise<Blob> => {
      const params = new URLSearchParams();
      if (options?.period) params.append('period', options.period);
      if (options?.date) params.append('date', options.date);
      const response = await api.get(`/reports/missed-trades?${params}`, { responseType: 'blob' });
      return response.data;
    },
  },

  lossAnalysis: {
    create: async (data: {
      tradeId: string;
      title?: string;
      reasonType: string;
      description?: string;
      images?: { url: string; timeframe: string; publicId?: string }[];
      tags?: string[];
      checklist?: { rule: string; broken: boolean }[];
      disciplineScore?: number;
    }) => {
      return apiPost('/loss-analysis', data);
    },

    get: async (tradeId: string) => {
      try {
        return await apiGet(`/loss-analysis/${tradeId}`);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },

    update: async (id: string, data: {
      title?: string;
      reasonType?: string;
      description?: string;
      images?: { url: string; timeframe: string; publicId?: string }[];
      tags?: string[];
      checklist?: { rule: string; broken: boolean }[];
      disciplineScore?: number;
    }) => {
      return apiPut(`/loss-analysis/${id}`, data);
    },

    list: async (options?: {
      accountId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (options?.accountId) params.set('accountId', options.accountId);
      if (options?.startDate) params.set('startDate', options.startDate);
      if (options?.endDate) params.set('endDate', options.endDate);
      if (options?.page) params.set('page', options.page.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      return apiGet(`/loss-analysis/list?${params}`);
    },
  },

  biases: {
    getAll: async () => {
      return apiGet('/biases');
    },

    save: async (bias: {
      pair: string;
      monthlyBias: string;
      weeklyBias: string;
      dailyBias: string;
      notes?: string;
    }) => {
      return apiPost('/biases/manual', bias);
    },

    update: async (bias: {
      pair: string;
      monthlyBias: string;
      weeklyBias: string;
      dailyBias: string;
      notes?: string;
    }) => {
      return apiPut('/biases/manual', bias);
    },

    delete: async (id: string) => {
      return apiDelete(`/biases/${id}`);
    },
  },

  biasHistory: {
    save: async (data: {
      pair?: string;
      date?: string;
      h1Cisd: string;
      h4Cisd: string;
      dailyCisd: string;
      notes?: string;
      pairs?: string[];
    }) => {
      return apiPost('/bias/save', data);
    },

    getHistory: async (filters?: {
      pair?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      return apiGet(`/bias/history?${params}`);
    },

    getLatest: async (pair?: string) => {
      const params = pair ? `?pair=${pair}` : '';
      return apiGet(`/bias/latest${params}`);
    },

    getByDate: async (date: string, pair?: string) => {
      const params = new URLSearchParams({ date });
      if (pair) params.set('pair', pair);
      return apiGet(`/bias/by-date?${params}`);
    },

    delete: async (id: string) => {
      return apiDelete(`/bias/${id}`);
    },
  },

  biasEvents: {
    create: async (data: {
      pair?: string;
      h1Cisd: string;
      h4Cisd: string;
      dailyCisd: string;
      notes?: string;
      pairs?: string[];
    }) => {
      return apiPost('/bias/event', data);
    },

    getAll: async (filters?: {
      pair?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      return apiGet(`/bias/events?${params}`);
    },

    getByPair: async (pair: string) => {
      return apiGet(`/bias/events/${pair}`);
    },

    getLatest: async (pair?: string) => {
      const params = pair ? `?pair=${pair}` : '';
      return apiGet(`/bias/latest-events${params}`);
    },

    getTimeline: async (pair?: string, date?: string) => {
      const params = new URLSearchParams();
      if (pair) params.set('pair', pair);
      if (date) params.set('date', date);
      return apiGet(`/bias/timeline?${params}`);
    },

    delete: async (id: string) => {
      return apiDelete(`/bias/${id}`);
    },
  },

  liquidity: {
    save: async (data: {
      pair?: string;
      monthlyLiquidity: string;
      weeklyLiquidity: string;
      dailyLiquidity: string;
      notes?: string;
      pairs?: string[];
    }) => {
      return apiPost('/liquidity/save', data);
    },

    getAll: async (filters?: {
      pair?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      return apiGet(`/liquidity?${params}`);
    },

    getLatest: async (pair?: string) => {
      const params = pair ? `?pair=${pair}` : '';
      return apiGet(`/liquidity/latest${params}`);
    },

    delete: async (id: string) => {
      return apiDelete(`/liquidity/${id}`);
    },
  },

  h4: {
    save: async (data: {
      pair: string;
      date: string;
      candles: Array<{
        time: string;
        direction: string;
        prevHighTaken: boolean;
        prevLowTaken: boolean;
        notes?: string;
      }>;
      notes?: string;
    }) => {
      return apiPost('/h4/save', data);
    },

    getAll: async (filters?: {
      pair?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      return apiGet(`/h4?${params}`);
    },

    getByDate: async (date: string, pair?: string) => {
      const params = new URLSearchParams({ date });
      if (pair) params.set('pair', pair);
      return apiGet(`/h4/by-date?${params}`);
    },

    delete: async (id: string) => {
      return apiDelete(`/h4/${id}`);
    },
  },

  crtEvents: {
    getAll: async (filters?: {
      pair?: string;
      month?: string;
      timeframe?: string;
      direction?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.month) params.set('month', filters.month);
      if (filters?.timeframe) params.set('timeframe', filters.timeframe);
      if (filters?.direction) params.set('direction', filters.direction);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      return apiGet(`/crt-events?${params}`);
    },

    getSummary: async (filters?: { pair?: string }) => {
      const params = filters?.pair ? `?pair=${filters.pair}` : '';
      return apiGet(`/crt-events/summary${params}`);
    },

    create: async (data: {
      pair: string;
      timeframe: string;
      date: string;
      time?: string;
      keyLevelExists?: boolean;
      keyLevelType?: string;
      customKeyLevel?: string;
      crtPlaying?: boolean;
      crtDirection?: string;
      crtStatus?: string;
      crtRangeRespected?: string;
      imagePath?: string;
      isCRT?: boolean;
      image?: string;
      notes?: string;
    }) => {
      return apiPost('/crt-events', data);
    },

    getById: async (id: string) => {
      return apiGet(`/crt-events/${id}`);
    },

    update: async (id: string, data: {
      date?: string;
      time?: string;
      keyLevelExists?: boolean;
      keyLevelType?: string;
      customKeyLevel?: string;
      crtPlaying?: boolean;
      crtDirection?: string;
      crtStatus?: string;
      crtRangeRespected?: string;
      imagePath?: string;
      isCRT?: boolean;
      image?: string;
      notes?: string;
    }) => {
      return apiPut(`/crt-events/${id}`, data);
    },

    delete: async (id: string) => {
      return apiDelete(`/crt-events/${id}`);
    },
  },

  get: async <T = any>(path: string): Promise<T> => {
    return apiGet(path.startsWith('/') ? path : `/${path}`);
  },

  reminders: {
    getAll: async () => {
      return apiGet('/reminders');
    },

    getUpcoming: async () => {
      return apiGet('/reminders/upcoming');
    },

    getById: async (id: string) => {
      return apiGet(`/reminders/${id}`);
    },

    create: async (data: {
      title: string;
      pair?: string;
      date: string;
      time: string;
      repeatType?: 'ONETIME' | 'DAILY';
      reminders?: {
        before10Min: boolean;
        before5Min: boolean;
        onTime: boolean;
      };
      sound?: string;
      notes?: string;
      isActive?: boolean;
    }) => {
      return apiPost('/reminders', data);
    },

    update: async (id: string, data: {
      title?: string;
      pair?: string;
      date?: string;
      time?: string;
      repeatType?: 'ONETIME' | 'DAILY';
      reminders?: {
        before10Min: boolean;
        before5Min: boolean;
        onTime: boolean;
      };
      sound?: string;
      notes?: string;
      isActive?: boolean;
    }) => {
      return apiPut(`/reminders/${id}`, data);
    },

    delete: async (id: string) => {
      return apiDelete(`/reminders/${id}`);
    },

    toggleActive: async (id: string) => {
      return apiPost(`/reminders/${id}/toggle`);
    },

    resetAlerts: async (id: string) => {
      return apiPost(`/reminders/${id}/reset-alerts`);
    },

    getNotifications: async () => {
      return apiGet('/reminders/notifications');
    },

    markNotificationRead: async (notificationId: string) => {
      return apiPost(`/reminders/notifications/${notificationId}/read`);
    },
  },

  marketStats: {
    analyze: async (symbol: string, timeframe: string, lookback: number): Promise<any> => {
      return apiPost('/market-stats/analyze', { symbol, timeframe, lookback });
    },

    exportUrl: (symbol: string, timeframe: string, lookback: number, format: string): string => {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
      return `${base}/market-stats/export?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&lookback=${lookback}&format=${format}`;
    },
  },

  monthlyReviews: {
    getAll: async (filters?: {
      pair?: string; month?: number; year?: number;
      bias?: string; search?: string; page?: number; limit?: number;
    }): Promise<{ reviews: any[]; total: number; page: number; limit: number }> => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.month) params.set('month', filters.month.toString());
      if (filters?.year) params.set('year', filters.year.toString());
      if (filters?.bias) params.set('bias', filters.bias);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      const qs = params.toString();
      return apiGet(`/monthly-reviews${qs ? `?${qs}` : ''}`);
    },

    getById: async (id: string): Promise<any> => {
      return apiGet(`/monthly-reviews/${id}`);
    },

    create: async (data: {
      pair: string; month: number; year: number; title?: string;
      bias?: string; summary?: string; imagePath?: string; imageCaption?: string;
    }): Promise<any> => {
      return apiPost('/monthly-reviews', data);
    },

    update: async (id: string, data: any): Promise<any> => {
      return apiPut(`/monthly-reviews/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
      return apiDelete(`/monthly-reviews/${id}`);
    },

    getEntries: async (reviewId: string): Promise<any[]> => {
      return apiGet(`/monthly-reviews/${reviewId}/entries`);
    },

    createEntry: async (reviewId: string, data: {
      entryTitle?: string; comment?: string; images?: { url: string; publicId: string; caption?: string }[];
    }): Promise<any> => {
      return apiPost(`/monthly-reviews/${reviewId}/entries`, data);
    },

    updateEntry: async (reviewId: string, entryId: string, data: any): Promise<any> => {
      return apiPut(`/monthly-reviews/${reviewId}/entries/${entryId}`, data);
    },

    deleteEntry: async (reviewId: string, entryId: string): Promise<void> => {
      return apiDelete(`/monthly-reviews/${reviewId}/entries/${entryId}`);
    },
  },

  weeklyReviews: {
    getAll: async (filters?: {
      pair?: string; weekNumber?: number; year?: number;
      bias?: string; search?: string; page?: number; limit?: number;
    }): Promise<{ reviews: any[]; total: number; page: number; limit: number }> => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.weekNumber) params.set('weekNumber', filters.weekNumber.toString());
      if (filters?.year) params.set('year', filters.year.toString());
      if (filters?.bias) params.set('bias', filters.bias);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      const qs = params.toString();
      return apiGet(`/weekly-reviews${qs ? `?${qs}` : ''}`);
    },

    getById: async (id: string): Promise<any> => {
      return apiGet(`/weekly-reviews/${id}`);
    },

    create: async (data: any): Promise<any> => {
      return apiPost('/weekly-reviews', data);
    },

    update: async (id: string, data: any): Promise<any> => {
      return apiPut(`/weekly-reviews/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
      return apiDelete(`/weekly-reviews/${id}`);
    },

    getEntries: async (reviewId: string): Promise<any[]> => {
      return apiGet(`/weekly-reviews/${reviewId}/entries`);
    },

    createEntry: async (reviewId: string, data: any): Promise<any> => {
      return apiPost(`/weekly-reviews/${reviewId}/entries`, data);
    },

    updateEntry: async (reviewId: string, entryId: string, data: any): Promise<any> => {
      return apiPut(`/weekly-reviews/${reviewId}/entries/${entryId}`, data);
    },

    deleteEntry: async (reviewId: string, entryId: string): Promise<void> => {
      return apiDelete(`/weekly-reviews/${reviewId}/entries/${entryId}`);
    },
  },

  dailyReviews: {
    getAll: async (filters?: {
      pair?: string; date?: string; bias?: string; search?: string; page?: number; limit?: number;
    }): Promise<{ reviews: any[]; total: number; page: number; limit: number }> => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.date) params.set('date', filters.date);
      if (filters?.bias) params.set('bias', filters.bias);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      const qs = params.toString();
      return apiGet(`/daily-reviews${qs ? `?${qs}` : ''}`);
    },

    getById: async (id: string): Promise<any> => {
      return apiGet(`/daily-reviews/${id}`);
    },

    create: async (data: any): Promise<any> => {
      return apiPost('/daily-reviews', data);
    },

    update: async (id: string, data: any): Promise<any> => {
      return apiPut(`/daily-reviews/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
      return apiDelete(`/daily-reviews/${id}`);
    },

    getEntries: async (reviewId: string): Promise<any[]> => {
      return apiGet(`/daily-reviews/${reviewId}/entries`);
    },

    createEntry: async (reviewId: string, data: any): Promise<any> => {
      return apiPost(`/daily-reviews/${reviewId}/entries`, data);
    },

    updateEntry: async (reviewId: string, entryId: string, data: any): Promise<any> => {
      return apiPut(`/daily-reviews/${reviewId}/entries/${entryId}`, data);
    },

    deleteEntry: async (reviewId: string, entryId: string): Promise<void> => {
      return apiDelete(`/daily-reviews/${reviewId}/entries/${entryId}`);
    },
  },
};

export default apiService;
