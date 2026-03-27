import { useState, useEffect, useMemo } from 'react';
import { Building2, Wallet, BookOpen, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Trade, TradingAccount, PropFirm } from '../types/trading';
import apiService from '../services/apiService';
import { calculateTradeStats } from '../utils/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedFirm, setSelectedFirm] = useState<string>('all');

  const loadAccountsAndFirms = async () => {
    try {
      const [accountsData, firmsData] = await Promise.all([
        apiService.getAccounts(),
        apiService.getPropFirms()
      ]);
      setAccounts(accountsData);
      setFirms(firmsData);
    } catch (error) {
      console.error('Failed to load accounts and firms:', error);
    }
  };

  const loadTrades = async () => {
    try {
      const filters: { accountId?: string; firmId?: string } = {};
      if (selectedAccount !== 'all') filters.accountId = selectedAccount;
      if (selectedFirm !== 'all') filters.firmId = selectedFirm;
      
      const tradesData = await apiService.getTrades(Object.keys(filters).length > 0 ? filters : undefined);
      setTrades(tradesData);
    } catch (error) {
      console.error('Failed to load trades:', error);
    }
  };

  useEffect(() => {
    loadAccountsAndFirms();
  }, []);

  useEffect(() => {
    loadTrades();
  }, [selectedAccount, selectedFirm]);

  const getAccountFirmId = (account: TradingAccount): string => {
    if (typeof account.propFirmId === 'object' && account.propFirmId !== null) {
      return (account.propFirmId as PropFirm).id || '';
    }
    return String(account.propFirmId || '');
  };

  const getTradeFirmId = (trade: Trade): string => {
    if (typeof trade.propFirmId === 'object' && trade.propFirmId !== null) {
      return (trade.propFirmId as PropFirm).id || '';
    }
    return String(trade.propFirmId || '');
  };

  const getTradeAccountId = (trade: Trade): string => {
    if (typeof trade.accountId === 'object' && trade.accountId !== null) {
      return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
    }
    return String(trade.accountId || '');
  };

  const getPropFirmId = (firm: PropFirm | string): string => {
    if (typeof firm === 'object' && firm !== null) {
      return firm.id || '';
    }
    return String(firm || '');
  };

  const getAccountName = (accountId: string): string => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const getFirmColor = (firmId: string): string => {
    const firm = firms.find(f => f.id === firmId);
    return firm?.color || '#6B7280';
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      if (selectedFirm !== 'all' && getAccountFirmId(account) !== selectedFirm) return false;
      if (selectedAccount !== 'all' && account.id !== selectedAccount) return false;
      return true;
    });
  }, [accounts, selectedAccount, selectedFirm]);

  const stats = useMemo(() => calculateTradeStats(trades), [trades]);

  const openTrades = useMemo(() => trades.filter(t => t.status === 'OPEN'), [trades]);

  const recentTrades = useMemo(
    () => trades
      .filter(t => t.status === 'CLOSED')
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, 5),
    [trades]
  );

  const totalInitialBalance = useMemo(
    () => filteredAccounts.reduce((sum, acc) => sum + acc.initialBalance, 0),
    [filteredAccounts]
  );

  const totalBalance = useMemo(
    () => totalInitialBalance + stats.netProfit,
    [totalInitialBalance, stats.netProfit]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
        <div className="flex gap-3">
          <Select 
            value={selectedFirm || 'all'}
            onValueChange={(value: string) => {
              setSelectedFirm(value);
              setSelectedAccount('all');
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Prop Firms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prop Firms</SelectItem>
              {firms.map(firm => (
                <SelectItem key={getPropFirmId(firm)} value={getPropFirmId(firm)}>{firm.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={selectedAccount || 'all'}
            onValueChange={(value: string) => setSelectedAccount(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts
                .filter(acc => selectedFirm === 'all' || getAccountFirmId(acc) === selectedFirm)
                .map(account => (
                  <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Prop Firms</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {selectedFirm === 'all' ? firms.length : 1}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accounts</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{filteredAccounts.length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Trades</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{trades.length}</p>
              <p className="text-xs text-gray-500 mt-1">{openTrades.length} open</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Win Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.winRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.winningTrades}W / {stats.losingTrades}L
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Balance & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Balance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-gray-900 mb-4">Total Balance</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-3xl font-bold text-gray-900">${totalBalance.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Initial Investment</p>
                <p className="font-medium text-gray-900">${totalInitialBalance.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total P/L</p>
                <p className={`font-bold ${
                  totalBalance - totalInitialBalance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {totalBalance - totalInitialBalance >= 0 ? '+' : ''}$
                  {(totalBalance - totalInitialBalance).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-gray-900 mb-4">Performance Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Total Profit</span>
              </div>
              <span className="font-bold text-green-600">${stats.totalProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-700">Total Loss</span>
              </div>
              <span className="font-bold text-red-600">-${stats.totalLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-700">Profit Factor</span>
              <span className="font-bold text-blue-600">
                {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-gray-700">Average Win</span>
              <span className="font-bold text-purple-600">${stats.averageWin.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold text-gray-900 mb-4">Accounts Overview</h3>
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No accounts match the selected filters</p>
            <p className="text-sm">Try adjusting your filters or add a new account</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map(account => {
              const accountTrades = trades.filter(t => getTradeAccountId(t) === account.id && t.status === 'CLOSED');
              const pl = accountTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
              const currentBalance = account.initialBalance + pl;
              const plPercent = (pl / account.initialBalance) * 100;
              return (
                <div
                  key={account.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getFirmColor(getAccountFirmId(account)) }}
                    />
                    <h4 className="font-medium text-gray-900">{account.name}</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Balance:</span>
                      <span className="font-medium text-gray-900">
                        ${currentBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">P/L:</span>
                      <span className={`font-bold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pl >= 0 ? '+' : ''}${pl.toFixed(2)} ({plPercent >= 0 ? '+' : ''}
                        {plPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold text-gray-900 mb-4">Recent Closed Trades</h3>
        {recentTrades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No closed trades yet</p>
            <p className="text-sm">Go to the Trade Journal tab to record your trades</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTrades.map(trade => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="w-2 h-12 rounded-full"
                    style={{ backgroundColor: getFirmColor(getTradeFirmId(trade)) }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{trade.pair}</p>
                    <p className="text-sm text-gray-500">
                      {getAccountName(getTradeAccountId(trade))} • {new Date(trade.entryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {trade.type}
                  </span>
                  <span className={`font-bold min-w-[100px] text-right ${
                    (trade.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
