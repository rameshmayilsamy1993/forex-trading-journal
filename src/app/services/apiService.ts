import { PropFirm, TradingAccount, Trade, MasterData } from '../types/trading';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiService = {
  // Prop Firms
  getPropFirms: async (): Promise<PropFirm[]> => {
    const response = await fetch(`${API_BASE_URL}/prop-firms`);
    if (!response.ok) {
      throw new Error('Failed to fetch prop firms');
    }
    return response.json();
  },
  
  createPropFirm: async (firm: Omit<PropFirm, 'id' | 'createdAt'>): Promise<PropFirm> => {
    const response = await fetch(`${API_BASE_URL}/prop-firms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firm),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create prop firm');
    }
    return response.json();
  },
  
  updatePropFirm: async (id: string, firm: Partial<PropFirm>): Promise<PropFirm> => {
    const response = await fetch(`${API_BASE_URL}/prop-firms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firm),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update prop firm');
    }
    return response.json();
  },
  
  deletePropFirm: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/prop-firms/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete prop firm');
    }
  },
  
  // Accounts
  getAccounts: async (): Promise<TradingAccount[]> => {
    const response = await fetch(`${API_BASE_URL}/accounts`);
    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }
    return response.json();
  },
  
  createAccount: async (account: Omit<TradingAccount, 'id' | 'createdAt'>): Promise<TradingAccount> => {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create account');
    }
    return response.json();
  },
  
  updateAccount: async (id: string, account: Partial<TradingAccount>): Promise<TradingAccount> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update account');
    }
    return response.json();
  },
  
  deleteAccount: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete account');
    }
  },
  
  // Trades
  getTrades: async (filters?: { accountId?: string; firmId?: string }): Promise<Trade[]> => {
    let url = `${API_BASE_URL}/trades`;
    if (filters?.accountId || filters?.firmId) {
      const params = new URLSearchParams();
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.firmId) params.append('firmId', filters.firmId);
      url += `?${params.toString()}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch trades');
    }
    return response.json();
  },
  
  createTrade: async (trade: Omit<Trade, 'id'>): Promise<Trade> => {
    const response = await fetch(`${API_BASE_URL}/trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trade),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create trade');
    }
    return response.json();
  },
  
  updateTrade: async (id: string, trade: Partial<Trade>): Promise<Trade> => {
    const response = await fetch(`${API_BASE_URL}/trades/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trade),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update trade');
    }
    return response.json();
  },
  
  deleteTrade: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/trades/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete trade');
    }
  },
  
  // Masters
  getMasters: async (type?: string): Promise<MasterData[]> => {
    const url = type ? `${API_BASE_URL}/masters?type=${type}` : `${API_BASE_URL}/masters`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch masters');
    }
    return response.json();
  },
  
  createMaster: async (master: Omit<MasterData, 'id'>): Promise<MasterData> => {
    const response = await fetch(`${API_BASE_URL}/masters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(master),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create master entry');
    }
    return response.json();
  },
  
  deleteMaster: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/masters/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete master entry');
    }
  },

  // Missed Trades
  getMissedTrades: async (filters?: { accountId?: string }): Promise<any[]> => {
    let url = `${API_BASE_URL}/missed-trades`;
    if (filters?.accountId) {
      url += `?accountId=${filters.accountId}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch missed trades');
    }
    return response.json();
  },
  
  createMissedTrade: async (missedTrade: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/missed-trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(missedTrade),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create missed trade');
    }
    return response.json();
  },
  
  updateMissedTrade: async (id: string, missedTrade: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/missed-trades/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(missedTrade),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update missed trade');
    }
    return response.json();
  },
  
  deleteMissedTrade: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/missed-trades/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete missed trade');
    }
  }
};

export default apiService;