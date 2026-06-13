import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Trade, TradingAccount, PropFirm } from '../types/trading';
import apiService from '../services/apiService';
import { format } from 'date-fns';
import { PageHeader, CardContainer } from './ui/DesignSystem';

export default function BreachedTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tradesData, accountsData, firmsData] = await Promise.all([
          apiService.getTrades({ accountState: 'BREACHED' }),
          apiService.getAccounts(),
          apiService.getPropFirms(),
        ]);
        setTrades(tradesData);
        setAccounts(accountsData);
        setFirms(firmsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const breachedTrades = useMemo(() =>
    trades.filter(t => t.isBreachedAccountTrade),
    [trades]
  );

  const getAccountName = (trade: Trade) => {
    const account = accounts.find(a => a.id === trade.accountId);
    return account?.name || 'Unknown';
  };

  const getFirmName = (trade: Trade) => {
    const firmId = typeof trade.propFirmId === 'object' ? trade.propFirmId?.id : trade.propFirmId;
    const firm = firms.find(f => f.id === firmId);
    return firm?.name || 'Unknown';
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const totalBreachedPL = useMemo(() =>
    breachedTrades.reduce((sum, t) => sum + (t.profit || 0), 0),
    [breachedTrades]
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-slate-500">Loading breached trades...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Breached Trades"
        subtitle="View all trades from breached accounts"
        icon={AlertTriangle}
        color="red"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-slate-600">Total Breached Trades</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{breachedTrades.length}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            {totalBreachedPL >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm text-slate-600">Total P/L</span>
          </div>
          <p className={`text-2xl font-bold ${totalBreachedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalBreachedPL)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-slate-600">Breached Accounts</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {accounts.filter(a => a.status === 'BREACHED').length}
          </p>
        </div>
      </div>

      <CardContainer className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Account</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Firm</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Pair</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Entry</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Exit</th>
                <th className="text-right p-4 text-sm font-medium text-slate-600">Profit</th>
              </tr>
            </thead>
            <tbody>
              {breachedTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-slate-500">
                    No breached trades found
                  </td>
                </tr>
              ) : (
                breachedTrades.map((trade, i) => (
                  <tr key={trade.id ?? i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 text-sm text-slate-900">
                      {trade.entryDate ? format(new Date(trade.entryDate), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-900">{getAccountName(trade)}</td>
                    <td className="p-4 text-sm text-slate-600">{getFirmName(trade)}</td>
                    <td className="p-4 text-sm font-medium text-slate-900">{trade.pair}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        trade.type === 'BUY'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-900">{trade.entryPrice}</td>
                    <td className="p-4 text-sm text-slate-900">{trade.exitPrice || '-'}</td>
                    <td className={`p-4 text-right text-sm font-bold ${
                      (trade.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(trade.profit || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContainer>
    </div>
  );
}
