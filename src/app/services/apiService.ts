import { PropFirm, TradingAccount, Trade, MasterData } from '../types/trading';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface ApiError extends Error {
  status?: number;
}

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired - Please login again');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const err: ApiError = new Error(error.message || 'Request failed');
    err.status = response.status;
    throw err;
  }
  
  return response.json();
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return handleResponse(response);
};

const apiService = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await handleResponse(response);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    },

    register: async (name: string, email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await handleResponse(response);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    },

    logout: async () => {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      } finally {
        localStorage.removeItem('user');
      }
    },

    getCurrentUser: async (): Promise<User | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
        });
        if (response.status === 401) {
          localStorage.removeItem('user');
          return null;
        }
        return handleResponse(response);
      } catch {
        return null;
      }
    },

    getStoredUser: (): User | null => {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      return fetchWithAuth(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },
  },

  getPropFirms: async (): Promise<PropFirm[]> => {
    return fetchWithAuth(`${API_BASE_URL}/prop-firms`);
  },
  
  createPropFirm: async (firm: Omit<PropFirm, 'id' | 'createdAt'>): Promise<PropFirm> => {
    return fetchWithAuth(`${API_BASE_URL}/prop-firms`, {
      method: 'POST',
      body: JSON.stringify(firm),
    });
  },
  
  updatePropFirm: async (id: string, firm: Partial<PropFirm>): Promise<PropFirm> => {
    return fetchWithAuth(`${API_BASE_URL}/prop-firms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(firm),
    });
  },
  
  deletePropFirm: async (id: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/prop-firms/${id}`, {
      method: 'DELETE',
    });
  },
  
  getAccounts: async (): Promise<TradingAccount[]> => {
    return fetchWithAuth(`${API_BASE_URL}/accounts`);
  },
  
  createAccount: async (account: Omit<TradingAccount, 'id' | 'createdAt'>): Promise<TradingAccount> => {
    return fetchWithAuth(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      body: JSON.stringify(account),
    });
  },
  
  updateAccount: async (id: string, account: Partial<TradingAccount>): Promise<TradingAccount> => {
    return fetchWithAuth(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(account),
    });
  },
  
  deleteAccount: async (id: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/accounts/${id}`, {
      method: 'DELETE',
    });
  },
  
  getTrades: async (filters?: { accountId?: string; firmId?: string; ssmtType?: string }): Promise<Trade[]> => {
    let url = `${API_BASE_URL}/trades`;
    const params = new URLSearchParams();
    if (filters?.accountId) params.append('accountId', filters.accountId);
    if (filters?.firmId) params.append('firmId', filters.firmId);
    if (filters?.ssmtType) params.append('ssmtType', filters.ssmtType);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    return fetchWithAuth(url);
  },
  
  createTrade: async (trade: Omit<Trade, 'id'>): Promise<Trade> => {
    return fetchWithAuth(`${API_BASE_URL}/trades`, {
      method: 'POST',
      body: JSON.stringify(trade),
    });
  },
  
  updateTrade: async (id: string, trade: Partial<Trade>): Promise<Trade> => {
    return fetchWithAuth(`${API_BASE_URL}/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trade),
    });
  },
  
  deleteTrade: async (id: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/trades/${id}`, {
      method: 'DELETE',
    });
  },

  deleteTrades: async (ids: string[]): Promise<{ deletedCount: number }> => {
    return fetchWithAuth(`${API_BASE_URL}/trades/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  getMissedTrades: async (filters?: { pair?: string; reason?: string }): Promise<any[]> => {
    let url = `${API_BASE_URL}/missed-trades`;
    if (filters?.pair || filters?.reason) {
      const params = new URLSearchParams();
      if (filters.pair) params.append('pair', filters.pair);
      if (filters.reason) params.append('reason', filters.reason);
      url += `?${params.toString()}`;
    }
    return fetchWithAuth(url);
  },

  createMissedTrade: async (trade: any): Promise<any> => {
    return fetchWithAuth(`${API_BASE_URL}/missed-trades`, {
      method: 'POST',
      body: JSON.stringify(trade),
    });
  },

  updateMissedTrade: async (id: string, trade: any): Promise<any> => {
    return fetchWithAuth(`${API_BASE_URL}/missed-trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trade),
    });
  },

  deleteMissedTrade: async (id: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/missed-trades/${id}`, {
      method: 'DELETE',
    });
  },

  getMasters: async (type?: string): Promise<MasterData[]> => {
    const url = type ? `${API_BASE_URL}/masters?type=${type}` : `${API_BASE_URL}/masters`;
    return fetchWithAuth(url);
  },

  createMaster: async (master: Omit<MasterData, 'id'>): Promise<MasterData> => {
    return fetchWithAuth(`${API_BASE_URL}/masters`, {
      method: 'POST',
      body: JSON.stringify(master),
    });
  },

  updateMaster: async (id: string, master: Partial<MasterData>): Promise<MasterData> => {
    return fetchWithAuth(`${API_BASE_URL}/masters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(master),
    });
  },

  deleteMaster: async (id: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/masters/${id}`, {
      method: 'DELETE',
    });
  },

  settings: {
    getPairs: async (): Promise<string[]> => {
      const data = await fetchWithAuth(`${API_BASE_URL}/settings/pairs`);
      return data.pairs || [];
    },
    
    updatePairs: async (pairs: string[]): Promise<{ message: string; pairs: string[] }> => {
      return fetchWithAuth(`${API_BASE_URL}/settings/pairs`, {
        method: 'POST',
        body: JSON.stringify({ pairs }),
      });
    },
    
    getAll: async (): Promise<any[]> => {
      return fetchWithAuth(`${API_BASE_URL}/settings`);
    },
    
    get: async (key: string): Promise<any> => {
      return fetchWithAuth(`${API_BASE_URL}/settings?key=${key}`);
    },
    
    save: async (key: string, value: any): Promise<any> => {
      return fetchWithAuth(`${API_BASE_URL}/settings`, {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      });
    },
  },

  importTrades: async (file: File, accountId: string): Promise<{ total: number; inserted: number; skipped: number; errors: any[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);

    const response = await fetch(`${API_BASE_URL}/trades/import`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },

  previewTrades: async (file: File, accountId: string): Promise<{ total: number; preview: any[]; stats: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);

    const response = await fetch(`${API_BASE_URL}/trades/preview`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },

  convertMT5: async (file: File): Promise<{ total: number; converted: number; errors: any[]; data: any[] }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/import/convert-mt5`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },

  upload: {
    single: async (file: File): Promise<{ url: string; publicId: string; originalName: string }> => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      return handleResponse(response);
    },

    multiple: async (files: File[]): Promise<{ url: string; publicId: string; originalName: string }[]> => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      return handleResponse(response);
    },

    delete: async (publicId: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/upload/${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return handleResponse(response);
    },
  },

  checklists: {
    getAll: async (options?: { tradeId?: string; page?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (options?.tradeId) params.append('tradeId', options.tradeId);
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/checklists${queryString ? `?${queryString}` : ''}`;
      return fetchWithAuth(url);
    },

    getActiveSessions: async () => {
      return fetchWithAuth(`${API_BASE_URL}/checklists/active`);
    },

    getActiveList: async () => {
      return fetchWithAuth(`${API_BASE_URL}/checklists/active-list`);
    },

    linkToTrades: async (checklistId: string, tradeIds: string[]) => {
      return fetchWithAuth(`${API_BASE_URL}/checklists/link`, {
        method: 'POST',
        body: JSON.stringify({ checklistId, tradeIds }),
      });
    },

    unlinkFromTrades: async (checklistId: string, tradeIds: string[]) => {
      return fetchWithAuth(`${API_BASE_URL}/checklists/unlink`, {
        method: 'POST',
        body: JSON.stringify({ checklistId, tradeIds }),
      });
    },

    getById: async (id: string) => {
      return fetchWithAuth(`${API_BASE_URL}/checklists/${id}`);
    },

    create: async (data: {
      strategyId: string;
      items: Array<{ label: string; checked: boolean; required: boolean }>;
      notes?: string;
      pair?: string;
      tradeType?: string;
      entryPrice?: number;
    }) => {
      return fetchWithAuth(`${API_BASE_URL}/checklists`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: string, data: {
      items?: Array<{ label: string; checked: boolean; required: boolean }>;
      notes?: string;
      tradeId?: string;
    }) => {
      return fetchWithAuth(`${API_BASE_URL}/checklists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    linkToTrade: async (id: string, tradeId: string) => {
      return fetchWithAuth(`${API_BASE_URL}/checklists/${id}/link-trade`, {
        method: 'POST',
        body: JSON.stringify({ tradeId }),
      });
    },

    delete: async (id: string) => {
      return fetchWithAuth(`${API_BASE_URL}/checklists/${id}`, {
        method: 'DELETE',
      });
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

      const response = await fetch(`${API_BASE_URL}/reports/trades?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Export failed' }));
        throw new Error(error.message || 'Export failed');
      }

      return response.blob();
    },

    exportMissedTrades: async (options?: {
      period?: 'daily' | 'weekly' | 'monthly' | 'all';
      date?: string;
    }): Promise<Blob> => {
      const params = new URLSearchParams();
      if (options?.period) params.append('period', options.period);
      if (options?.date) params.append('date', options.date);

      const response = await fetch(`${API_BASE_URL}/reports/missed-trades?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Export failed' }));
        throw new Error(error.message || 'Export failed');
      }

      return response.blob();
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
      const response = await fetch(`${API_BASE_URL}/loss-analysis`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    get: async (tradeId: string) => {
      const response = await fetch(`${API_BASE_URL}/loss-analysis/${tradeId}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
      }
      return response.json();
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
      const response = await fetch(`${API_BASE_URL}/loss-analysis/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
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

      const response = await fetch(`${API_BASE_URL}/loss-analysis-list?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
  },

  biases: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/biases`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    save: async (bias: {
      pair: string;
      monthlyBias: string;
      weeklyBias: string;
      dailyBias: string;
      notes?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/biases/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bias),
      });
      return handleResponse(response);
    },
    update: async (bias: {
      pair: string;
      monthlyBias: string;
      weeklyBias: string;
      dailyBias: string;
      notes?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/biases/manual`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bias),
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/biases/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return handleResponse(response);
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
      const response = await fetch(`${API_BASE_URL}/bias/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
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

      const response = await fetch(`${API_BASE_URL}/bias/history?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    getLatest: async (pair?: string) => {
      const params = pair ? new URLSearchParams({ pair }) : '';
      const response = await fetch(`${API_BASE_URL}/bias/latest${params ? '?' + params : ''}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    getByDate: async (date: string, pair?: string) => {
      const params = new URLSearchParams({ date });
      if (pair) params.set('pair', pair);

      const response = await fetch(`${API_BASE_URL}/bias/by-date?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/bias/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return handleResponse(response);
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
      const response = await fetch(`${API_BASE_URL}/bias/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
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

      const response = await fetch(`${API_BASE_URL}/bias/events?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    getByPair: async (pair: string) => {
      const response = await fetch(`${API_BASE_URL}/bias/events/${pair}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    getLatest: async (pair?: string) => {
      const params = pair ? new URLSearchParams({ pair }) : '';
      const response = await fetch(`${API_BASE_URL}/bias/latest-events${params ? '?' + params : ''}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    getTimeline: async (pair?: string, date?: string) => {
      const params = new URLSearchParams();
      if (pair) params.set('pair', pair);
      if (date) params.set('date', date);

      const response = await fetch(`${API_BASE_URL}/bias/timeline?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/bias/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return handleResponse(response);
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
      const response = await fetch(`${API_BASE_URL}/liquidity/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
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

      const response = await fetch(`${API_BASE_URL}/liquidity?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    getLatest: async (pair?: string) => {
      const params = pair ? new URLSearchParams({ pair }) : '';
      const response = await fetch(`${API_BASE_URL}/liquidity/latest${params ? '?' + params : ''}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/liquidity/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return handleResponse(response);
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
      const response = await fetch(`${API_BASE_URL}/h4/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
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

      const response = await fetch(`${API_BASE_URL}/h4?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    getByDate: async (date: string, pair?: string) => {
      const params = new URLSearchParams({ date });
      if (pair) params.set('pair', pair);

      const response = await fetch(`${API_BASE_URL}/h4/by-date?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/h4/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return handleResponse(response);
    },
  },

  crtEvents: {
    getAll: async (filters?: {
      pair?: string;
      month?: string;
      timeframe?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.month) params.set('month', filters.month);
      if (filters?.timeframe) params.set('timeframe', filters.timeframe);

      const response = await fetch(`${API_BASE_URL}/crt-events?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return handleResponse(response);
    },
    create: async (data: {
      pair: string;
      timeframe: string;
      date: string;
      time?: string;
      isCRT?: boolean;
      image?: string;
      notes?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/crt-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    update: async (id: string, data: {
      date?: string;
      time?: string;
      isCRT?: boolean;
      image?: string;
      notes?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/crt-events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/crt-events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return handleResponse(response);
    },
  }
};

export default apiService;
