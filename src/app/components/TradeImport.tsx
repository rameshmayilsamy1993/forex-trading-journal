import { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, AlertTriangle, FileUp } from 'lucide-react';
import apiService, { TradingAccount } from '../services/apiService';
import { PageHeader, CardContainer, SectionCard, StatCard } from './ui/DesignSystem';

interface PreviewTrade {
  positionId: string;
  pair: string;
  type: string;
  lotSize: number;
  entryPrice: number;
  profit: number;
  entryDate: string;
  isDuplicate: boolean;
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
  const [previewStats, setPreviewStats] = useState<{ duplicates: number; potentialDuplicates: number; newTrades: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAccounts();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
        setPreview([]);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.match(/\.(xlsx|xls)$/i)) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
        setPreview([]);
        return;
      }
      setFile(droppedFile);
      setError(null);
      setResult(null);
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

    setIsPreviewing(true);
    setError(null);

    try {
      const data = await apiService.previewTrades(file, selectedAccount);
      setPreview(data.preview);
      setPreviewStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to preview file');
      setPreview([]);
      setPreviewStats(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
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
    setPreviewStats(null);
    setResult(null);
    setError(null);
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
                <p className="text-sm text-emerald-700">Your trades have been imported successfully</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-white rounded-xl border border-emerald-200 shadow-sm">
                <p className="text-slate-500 text-xs uppercase tracking-wide font-medium">Total Rows</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{result.total}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-xl border border-emerald-200 shadow-sm">
                <p className="text-emerald-600 text-xs uppercase tracking-wide font-medium">Imported</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{result.inserted}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
                <p className="text-amber-600 text-xs uppercase tracking-wide font-medium">Skipped</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{result.skipped}</p>
              </div>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-amber-200">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  {result.errors.length} row(s) had errors:
                </p>
                <ul className="text-xs text-amber-700 space-y-1 max-h-32 overflow-auto">
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
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Select Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 transition-all hover:bg-slate-100"
            >
              <option value="">-- Select an account --</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} {account.propFirmId && typeof account.propFirmId === 'object' ? `- ${(account.propFirmId as any).name}` : ''}
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                No accounts found. Please create an account first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Upload Excel File
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
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="text-emerald-700 font-semibold">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleReset();
                      }}
                      className="mt-2 text-sm text-rose-500 hover:text-rose-700 font-medium transition-colors"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">
                      Drag and drop your Excel file here, or{' '}
                      <span className="text-blue-600 font-semibold hover:underline">browse</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      Supports .xlsx and .xls files
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
              className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200"
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
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-4 bg-white rounded-xl border border-emerald-200 shadow-sm">
                  <p className="text-emerald-600 text-xs uppercase tracking-wide font-semibold">New Trades</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{previewStats.newTrades}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
                  <p className="text-amber-600 text-xs uppercase tracking-wide font-semibold">Duplicates</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{previewStats.duplicates}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl border border-orange-200 shadow-sm">
                  <p className="text-orange-600 text-xs uppercase tracking-wide font-semibold">In File</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{previewStats.potentialDuplicates}</p>
                </div>
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-slate-900 mb-3">
                Preview (first {preview.length} rows)
              </h3>
              <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200/50">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Position ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Pair
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Lots
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Entry
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Exit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((trade, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/50 transition-colors duration-150 ${trade.isDuplicate ? 'bg-amber-50/50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          {trade.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-lg">
                              Duplicate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-lg">
                              New
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                          {trade.positionId || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">
                          {trade.pair || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${
                              trade.type === 'BUY'
                                ? 'text-emerald-700 bg-emerald-100'
                                : trade.type === 'SELL'
                                ? 'text-rose-700 bg-rose-100'
                                : 'text-slate-700 bg-slate-100'
                            }`}
                          >
                            {trade.type || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {trade.lotSize != null && trade.lotSize !== 0 ? trade.lotSize.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-mono">
                          {trade.entryPrice != null && trade.entryPrice !== 0 ? trade.entryPrice.toFixed(5) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-mono">
                          {trade.exitPrice != null && trade.exitPrice !== 0 ? trade.exitPrice.toFixed(5) : '-'}
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

          <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-200/50">
            <h4 className="font-semibold text-slate-700 mb-3">Expected Excel Columns:</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">Position</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">Symbol</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">Type</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">Volume</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">Entry Price</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">Exit Price</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">S / L</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">T / P</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">Profit</span>
              <span className="font-mono bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 shadow-sm">Time</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Column names are case-insensitive. Position column is used for duplicate detection. Default strategy "LONDON" and key level "No Key Level" will be assigned.
            </p>
          </div>
        </div>
      </CardContainer>
    </div>
  );
}
