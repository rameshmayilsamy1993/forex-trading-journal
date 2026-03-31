import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, Building2 } from 'lucide-react';
import { TradingAccount, PropFirm, Trade } from '../types/trading';
import apiService from '../services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

interface FormFieldsProps {
  formData: { name: string; propFirmId: string; initialBalance: string; currency: string };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; propFirmId: string; initialBalance: string; currency: string }>>;
  firms: PropFirm[];
  onSubmit: () => void;
  onCancel: () => void;
}

function FormFields({ formData, setFormData, firms, onSubmit, onCancel }: FormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        type="text"
        placeholder="Account name"
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
        autoFocus
      />
      <Select 
        value={formData.propFirmId} 
        onValueChange={value => setFormData({ ...formData, propFirmId: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select Prop Firm" />
        </SelectTrigger>
        <SelectContent>
          {firms.map((firm, i) => (
            <SelectItem key={firm.id ?? i} value={firm.id}>{firm.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="number"
        placeholder="Initial balance"
        value={formData.initialBalance}
        onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
        step="0.01"
      />

      <Select 
        value={formData.currency} 
        onValueChange={value => setFormData({ ...formData, currency: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="USD">USD</SelectItem>
          <SelectItem value="EUR">EUR</SelectItem>
          <SelectItem value="GBP">GBP</SelectItem>
        </SelectContent>
      </Select>
      <div className="col-span-2 flex gap-2 justify-end">
        <button
          onClick={onSubmit}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    propFirmId: '',
    initialBalance: '',
    currency: 'USD',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accountsData, firmsData, tradesData] = await Promise.all([
          apiService.getAccounts(),
          apiService.getPropFirms(),
          apiService.getTrades()
        ]);
        setAccounts(accountsData);
        setFirms(firmsData);
        setTrades(tradesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.propFirmId || !formData.initialBalance) return;

    const balance = parseFloat(formData.initialBalance);
    const newAccount: Omit<TradingAccount, 'id' | 'createdAt'> = {
      name: formData.name,
      propFirmId: formData.propFirmId,
      initialBalance: balance,
      currentBalance: balance,
      currency: formData.currency,
    };

    try {
      const savedAccount = await apiService.createAccount(newAccount);
      setAccounts([...accounts, savedAccount]);
      setFormData({ name: '', propFirmId: '', initialBalance: '', currency: 'USD' });
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to create account:', error);
    }
  };

  const handleEdit = async (id: string) => {
    if (!formData.name.trim() || !formData.propFirmId || !formData.initialBalance) return;

    const balance = parseFloat(formData.initialBalance);
    const updatedAccount: Partial<TradingAccount> = {
      name: formData.name,
      propFirmId: formData.propFirmId,
      initialBalance: balance,
      currency: formData.currency,
    };

    try {
      const savedAccount = await apiService.updateAccount(id, updatedAccount);
      setAccounts(accounts.map(account => account.id === id ? savedAccount : account));
      setEditingId(null);
      setFormData({ name: '', propFirmId: '', initialBalance: '', currency: 'USD' });
    } catch (error) {
      console.error('Failed to update account:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await apiService.deleteAccount(id);
        setAccounts(accounts.filter(account => account.id !== id));
      } catch (error) {
        console.error('Failed to delete account:', error);
      }
    }
  };

  const startEdit = (account: TradingAccount) => {
    setEditingId(account.id);
    const firmId = typeof account.propFirmId === 'object' ? account.propFirmId.id : account.propFirmId;
    setFormData({
      name: account.name,
      propFirmId: firmId,
      initialBalance: account.initialBalance.toString(),
      currency: account.currency,
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', propFirmId: '', initialBalance: '', currency: 'USD' });
  };

  const getFirmName = (firm: any) => {
    return typeof firm === 'object' ? firm.name : firms.find(f => f.id === firm)?.name || 'Unknown';
  };

  const getFirmColor = (firm: any) => {
    return typeof firm === 'object' ? firm.color : firms.find(f => f.id === firm)?.color || '#gray';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getTradeAccountId = (trade: Trade): string => {
    if (typeof trade.accountId === 'object' && trade.accountId !== null) {
      return String((trade.accountId as any).id || (trade.accountId as any)._id || '');
    }
    return String(trade.accountId || '');
  };


  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Trading Accounts</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your trading accounts</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={firms.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>

        <div className="p-6">
          {firms.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Please add a prop firm first</p>
              <p className="text-sm">Go to "Prop Firms" tab to create one</p>
            </div>
          )}

          {firms.length > 0 && (
            <>
              {/* Add Form */}
              {isAdding && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <FormFields
                    formData={formData}
                    setFormData={setFormData}
                    firms={firms}
                    onSubmit={handleAdd}
                    onCancel={cancelEdit}
                  />
                </div>
              )}

              {/* Accounts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.length === 0 && !isAdding && (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    <p>No accounts added yet</p>
                    <p className="text-sm">Click "Add Account" to get started</p>
                  </div>
                )}

                {accounts.map((account, i) => {
                  const accountTrades = trades.filter(t => getTradeAccountId(t) === account.id && t.status === 'CLOSED');
                  const getRealPL = (t: any) => t.realPL ?? ((t.profit || 0) + (t.commission || 0) + (t.swap || 0));
                  const pl = accountTrades.reduce((sum, t) => sum + getRealPL(t), 0);
                  const currentBalance = account.initialBalance + pl;

                  return (
                    <div
                      key={account.id ?? i}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      {editingId === account.id ? (
                        <FormFields
                          formData={formData}
                          setFormData={setFormData}
                          firms={firms}
                          onSubmit={() => handleEdit(account.id)}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900">{account.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getFirmColor(account.propFirmId) }}
                                />
                                <span className="text-sm text-gray-600">{getFirmName(account.propFirmId)}</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEdit(account)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(account.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Initial Balance:</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(account.initialBalance, account.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Current Balance:</span>
                              <span className={`font-bold ${currentBalance >= account.initialBalance
                                  ? 'text-green-600'
                                  : 'text-red-600'
                                }`}>
                                {formatCurrency(currentBalance, account.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">P/L:</span>
                              <span className={`font-medium ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pl >= 0 ? '+' : ''}
                                {formatCurrency(pl, account.currency)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
