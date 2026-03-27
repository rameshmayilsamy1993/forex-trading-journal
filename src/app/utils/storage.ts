import { PropFirm, TradingAccount, Trade } from '../types/trading';

const STORAGE_KEYS = {
  PROP_FIRMS: 'forex_journal_prop_firms',
  ACCOUNTS: 'forex_journal_accounts',
  TRADES: 'forex_journal_trades',
};

export const storage = {
  // Prop Firms
  getPropFirms: (): PropFirm[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROP_FIRMS);
    return data ? JSON.parse(data) : [];
  },
  savePropFirms: (firms: PropFirm[]) => {
    localStorage.setItem(STORAGE_KEYS.PROP_FIRMS, JSON.stringify(firms));
  },

  // Accounts
  getAccounts: (): TradingAccount[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    return data ? JSON.parse(data) : [];
  },
  saveAccounts: (accounts: TradingAccount[]) => {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  // Trades
  getTrades: (): Trade[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRADES);
    return data ? JSON.parse(data) : [];
  },
  saveTrades: (trades: Trade[]) => {
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
  },
};
