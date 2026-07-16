import { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, AlertTriangle, FileUp, FileText } from 'lucide-react';
import apiService from '../services/apiService';
import { TradingAccount } from '../types/trading';
import { formatPrice } from '../utils/calculations';
import { PageHeader, CardContainer, SectionCard, StatCard } from './ui/DesignSystem';
import AccountSelect from './ui/AccountSelect';

interface PreviewTrade {
  positionId: string;
  pair: string;
  type: string;
  lotSize: number;
  entryPrice: number;
  exitPrice: number;
  profit: number;
  entryDate: string;
  entryTime: string;
  exitDate: string;
  exitTime: string;
  stopLoss: number | null;
  takeProfit: number | null;
  commission: number;
  swap: number;
  isDuplicate: boolean;
}

interface ConvertedTrade {
  entryDate: string;
  entryTime: string;
  positionId: string;
  pair: string;
  type: string;
  lot: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitDate: string;
  exitTime: string;
  exitPrice: number;
  commission: number;
  swap: number;
  profit: number;
}

interface ImportResult {
  total: number;
  inserted: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

export default function TradeImport() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewTrade[]>([]);
  const [convertedData, setConvertedData] = useState<ConvertedTrade[]>([]);
  const [previewStats, setPreviewStats] = useState<{ duplicates: number; potentialDuplicates: number; newTrades: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileFormat, setFileFormat] = useState<'excel' | 'mt5' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAccounts();
    
    const storedData = localStorage.getItem('convertedTrades');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setConvertedData(data);
        localStorage.removeItem('convertedTrades');
      } catch (err) {
        console.error('Failed to parse converted trades:', err);
      }
    }
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await apiService.getAccounts();
      setAccounts(data);
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isExcel = selectedFile.name.match(/\.(xlsx|xls)$/i);
      const isCSV = selectedFile.name.toLowerCase().endsWith('.csv');
      
      if (!isExcel && !isCSV) {
        setError('Please select an Excel file (.xlsx, .xls) or CSV file (.csv)');
        setFile(null);
        setPreview([]);
        setConvertedData([]);
        setFileFormat(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResult(null);
      setFileFormat(null);
      setPreview([]);
      setConvertedData([]);

      if (isCSV) {
        try {
          const text = await selectedFile.text();
          const firstLine = text.split('\n')[0].toLowerCase();
          if (firstLine.includes('position')) {
            setFileFormat('mt5');
          }
        } catch (err) {
          console.error('Error reading CSV:', err);
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const isExcel = droppedFile.name.match(/\.(xlsx|xls)$/i);
      const isCSV = droppedFile.name.toLowerCase().endsWith('.csv');
      
      if (!isExcel && !isCSV) {
        setError('Please select an Excel file (.xlsx, .xls) or CSV file (.csv)');
        setFile(null);
        setPreview([]);
        setConvertedData([]);
        setFileFormat(null);
        return;
      }

      setFile(droppedFile);
      setError(null);
      setResult(null);
      setFileFormat(null);
      setPreview([]);
      setConvertedData([]);

      if (isCSV) {
        try {
          const text = await droppedFile.text();
          const firstLine = text.split('\n')[0].toLowerCase();
          if (firstLine.includes('position')) {
            setFileFormat('mt5');
          }
        } catch (err) {
          console.error('Error reading CSV:', err);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePreview = async () => {
    if (!file || !selectedAccount) {
      setError('Please select a file and account');
      return;
    }

    const selectedAccountData = accounts.find(a => a.id === selectedAccount);
    if (selectedAccountData && !selectedAccountData.canTrade) {
      setError('This account is not active for trading.');
      return;
    }

    setIsPreviewing(true);
    setError(null);

    try {
      if (fileFormat === 'mt5') {
        const data = await apiService.convertMT5(file);
        setConvertedData(data.data);
      } else {
        const data = await apiService.previewTrades(file, selectedAccount);
        setPreview(data.preview);
        setPreviewStats(data.stats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to preview file');
      setPreview([]);
      setConvertedData([]);
      setPreviewStats(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    const selectedAccountData = accounts.find(a => a.id === selectedAccount);
    if (selectedAccountData && !selectedAccountData.canTrade) {
      setError('This account is not active for trading.');
      return;
    }

    if (convertedData.length > 0) {
      setIsLoading(true);
      setError(null);
      try {
        
        const data = await apiService.importConverted(convertedData, selectedAccount);
        setResult(data);
        if (data.inserted > 0) {
          setConvertedData([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to import trades');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!file || !selectedAccount) {
      setError('Please select a file and account');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiService.importTrades(file, selectedAccount);
      setResult(data);
      if (data.inserted > 0) {
        setPreview([]);
        setPreviewStats(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import trades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview([]);
    setConvertedData([]);
    setPreviewStats(null);
    setResult(null);
    setError(null);
    setFileFormat(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Import Trades"
        subtitle="Upload your MT4/MT5 export file to bulk import trades"
        icon={FileUp}
        color="indigo"
      />

      {/* Main Card */}
      <CardContainer className="!p-0">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            <button onClick={clearError} className="text-red-400 hover:text-red-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {result && (
          <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900">Import Complete!</h3>
                <p className="text-body text-emerald-700">Your trades have been imported successfully</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-body">
              <div className="text-center p-4 bg-white/[0.04] rounded-xl border border-emerald-200 shadow-sm">
                <p className="text-table-header text-muted-foreground">Total Rows</p>
                <p className="text-display font-bold text-foreground mt-1">{result.total}</p>
              </div>
              <div className="text-center p-4 bg-white/[0.04] rounded-xl border border-emerald-200 shadow-sm">
                <p className="text-table-header text-emerald-600">Imported</p>
                <p className="text-display font-bold text-emerald-600 mt-1">{result.inserted}
</p>
              </div>
              <div className="text-center p-4 bg-white/[0.04] rounded-xl border border-amber-200 shadow-sm">
                <p className="text-table-header text-amber-600">Skipped</p>
                <p className="text-display font-bold text-amber-600 mt-1">{result.skipped}</p>
              </div>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 p-4 bg-white/[0.04] rounded-xl border border-amber-200">
                <p className="text-body-sm font-semibold text-amber-800 mb-2">
                  {result.errors.length} row(s) had errors:
                </p>
                <ul className="text-caption text-amber-700 space-y-1 max-h-32 overflow-auto">
                  {result.errors.map((err, idx) => (
                    <li key={idx} className="p-1.5 bg-amber-50 rounded">Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-body-sm font-semibold text-foreground mb-3">
              Select Account
            </label>
            {accounts.length > 0 ? (
              <AccountSelect
                accounts={accounts}
                value={selectedAccount}
                onValueChange={setSelectedAccount}
                placeholder="Select an account"
                className="w-full px-4 py-3 bg-slate-50 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground transition-all hover:bg-slate-100"
              />
            ) : (
              <p className="mt-2 text-body text-muted-foreground">
                No accounts found. Please create an account first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-body-sm font-semibold text-foreground mb-3">
              Upload File
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                file
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      {fileFormat === 'mt5' ? (
                        <FileText className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-emerald-700 font-semibold">{file.name}</p>
                    {fileFormat === 'mt5' && (
                      <span className="px-3 py-1 text-caption font-medium bg-indigo-100 text-indigo-700 rounded-full">
                        MT5 Format Detected
                      </span>
                    )}
                    <p className="text-body text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleReset();
                      }}
                      className="mt-2 text-body text-rose-500 hover:text-rose-400 transition-colors"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      Drag and drop your file here, or{' '}
                      <span className="text-[#7C3AED] font-semibold hover:underline">browse</span>
                    </p>
                    <p className="text-body text-slate-400">
                      Supports .xlsx, .xls (Excel) and .csv (MT5) files
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePreview}
              disabled={!file || !selectedAccount || isPreviewing || isLoading}
              className="flex-1 px-4 py-2.5 bg-slate-100 text-foreground rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200"
            >
              {isPreviewing ? 'Previewing...' : 'Preview Import'}
            </button>
            <button
              onClick={handleImport}
              disabled={!file || !selectedAccount || isLoading || isPreviewing}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              {isLoading ? 'Importing...' : 'Import Trades'}
            </button>
          </div>

          {previewStats && (
            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
              <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Import Preview Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 text-body">
                <div className="text-center p-4 bg-white/[0.04] rounded-xl border border-emerald-200 shadow-sm">
                  <p className="text-table-header text-emerald-600 uppercase">New Trades</p>
                  <p className="text-display font-bold text-emerald-600 mt-1">{previewStats.newTrades}</p>
                </div>
                <div className="text-center p-4 bg-white/[0.04] rounded-xl border border-amber-200 shadow-sm">
                  <p className="text-table-header text-amber-600 uppercase">Duplicates</p>
                  <p className="text-display font-bold text-amber-600 mt-1">{previewStats.duplicates}</p>
                </div>
                <div className="text-center p-4 bg-white/[0.04] rounded-xl border border-orange-200 shadow-sm">
                  <p className="text-table-header text-orange-600 uppercase">In File</p>
                  <p className="text-display font-bold text-orange-600 mt-1">{previewStats.potentialDuplicates}</p>
                </div>
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-foreground mb-3">
                Preview (first {preview.length} rows)
              </h3>
              <div className="overflow-x-auto bg-white/[0.04] rounded-2xl shadow-sm border border-white/10">
                <table className="min-w-full divide-y divide-white/10 text-table-cell">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-3 text-left text-table-header text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-table-header text-muted-foreground uppercase">
                        Position ID
                      </th>
                      <th className="px-3 py-3 text-left text-table-header text-muted-foreground uppercase">
                        Pair
                      </th>
                      <th className="px-3 py-3 text-left text-table-header text-muted-foreground uppercase">
                        Type
                      </th>
                      <th className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">
                        Lots
                      </th>
                      <th className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">
                        Entry
                      </th>
                      <th className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">
                        S/L
                      </th>
                      <th className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">
                        T/P
                      </th>
                      <th className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">
                        Exit
                      </th>
                      <th className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">
                        Comm
                      </th>
                      <th className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">
                        Swap
                      </th>
                      <th className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {preview.map((trade, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-white/[0.02] transition-colors duration-150 ${trade.isDuplicate ? 'bg-amber-950/20' : ''}`}
                      >
                        <td className="px-3 py-3">
                          {trade.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-caption text-amber-700 bg-amber-100 rounded-lg">
                              Duplicate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-caption text-emerald-700 bg-emerald-100 rounded-lg">
                              New
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-caption text-foreground font-mono">
                          {trade.positionId || '-'}
                        </td>
                        <td className="px-3 py-3 text-foreground font-semibold">
                          {trade.pair || '-'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 text-caption rounded-lg ${
                              trade.type === 'BUY'
? 'text-emerald-400 bg-emerald-950/30'
                              : trade.type === 'SELL'
                              ? 'text-rose-400 bg-rose-950/30'
                              : 'text-foreground bg-white/5'
                          }`}>
                            {trade.type || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {trade.lot != null ? trade.lot.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {trade.entryDate ? `${trade.entryDate} ${trade.entryTime}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-mono">
                          {trade.entryPrice != null ? formatPrice(trade.entryPrice, trade.pair) : '-'}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {trade.exitDate ? `${trade.exitDate} ${trade.exitTime}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-mono">
                          {trade.exitPrice != null ? formatPrice(trade.exitPrice, trade.pair) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-mono">
                          {trade.stopLoss != null ? formatPrice(trade.stopLoss, trade.pair) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-mono">
                          {trade.takeProfit != null ? formatPrice(trade.takeProfit, trade.pair) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {trade.commission != null ? trade.commission.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {trade.swap != null ? trade.swap.toFixed(2) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${
                          (trade.profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {trade.profit != null ? trade.profit.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-white/10/50">
            {fileFormat === 'mt5' ? (
              <>
                <h4 className="font-semibold text-foreground mb-3">Expected MT5 CSV Columns:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-body mb-4">
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Time (Entry)</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Position</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Symbol</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Type</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Volume</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Price</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">S/L</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">T/P</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Time (Exit)</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Price (Exit)</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Commission</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Swap</span>
                </div>
                <p className="text-caption text-muted-foreground">
                  Commission is automatically converted to positive values. Empty S/L and T/P are set to null.
                </p>
              </>
            ) : (
              <>
                <h4 className="font-semibold text-foreground mb-3">Expected Excel Columns:</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-body">
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Position</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Symbol</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Type</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Volume</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Entry Price</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Exit Price</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">S / L</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">T / P</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Profit</span>
                  <span className="font-mono bg-white/[0.04] px-3 py-2 rounded-lg border border-white/10 text-muted-foreground shadow-sm">Time</span>
                </div>
                <p className="mt-4 text-caption text-muted-foreground">
                  Column names are case-insensitive. Position column is used for duplicate detection. Default strategy "LONDON" and key level "No Key Level" will be assigned.
                </p>
              </>
            )}
          </div>
        </div>
      </CardContainer>
    </div>
  );
}
