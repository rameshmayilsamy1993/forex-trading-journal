import { useState, useRef } from 'react';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { Upload, FileText, AlertCircle, X, Download, Send, FileSpreadsheet, FileOutput } from 'lucide-react';
import { PageHeader, CardContainer } from '../components/ui/DesignSystem';

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

const normalize = (key: string): string => key.trim().toLowerCase();

const getColumn = (row: Record<string, string>, possibleNames: string[]): string | null => {
  for (const key of Object.keys(row)) {
    const normalized = normalize(key);
    if (possibleNames.some(name => normalized.includes(name))) {
      return row[key];
    }
  }
  return null;
};

const parseDateTime = (dateTimeStr: string): { date: string; time: string } => {
  if (!dateTimeStr) return { date: '', time: '' };
  const parts = dateTimeStr.split(' ');
  const date = (parts[0] || '').replace(/\./g, '-');
  const time = parts[1] || '';
  return { date, time };
};

const splitDateTime = (value: string): { date: string; time: string } => {
  if (!value) return { date: '', time: '' };
  const [date, time] = value.split(' ');
  return {
    date: (date || '').replace(/\./g, '-'),
    time: time || ''
  };
};

type FileFormat = 'mt5' | 'cTrader' | 'mt5Simple' | 'fundingPips' | null;

const FUNDING_PIPS_MAP = {
  id: 0,
  symbol: 1,
  openTime: 2,
  volume: 3,
  side: 4,
  closeTime: 5,
  openPrice: 6,
  closePrice: 7,
  stopLoss: 8,
  takeProfit: 9,
  swap: 10,
  commission: 11,
  profit: 12
};

const parseNumber = (value: string | undefined): number => {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, '').trim()) || 0;
};

const formatToMT5DateTime = (value: string): string => {
  if (!value) return '';
  
  if (value.includes('.') && value.includes(':')) return value;
  
  try {
    const [datePart, timePart] = value.split(' ');
    
    const parts = datePart.split('-');
    let dd: string, mm: string, yyyy: string;
    
    if (parts.length === 3) {
      [dd, mm, yyyy] = parts;
    } else {
      const slashParts = value.split('/');
      if (slashParts.length === 3) {
        [dd, mm, yyyy] = slashParts;
      } else {
        return value;
      }
    }
    
    let hh = '00', min = '00', ss = '00';
    
    if (timePart) {
      const timeParts = timePart.split(':');
      hh = timeParts[0] || '00';
      min = timeParts[1] || '00';
      ss = timeParts[2] || '00';
    }
    
    return `${yyyy}.${mm.padStart(2, '0')}.${dd.padStart(2, '0')} ${hh.padStart(2, '0')}:${min.padStart(2, '0')}:${ss.padStart(2, '0')}`;
  } catch (e) {
    console.warn('Date parse failed:', value);
    return value;
  }
};

const detectFormat = (headers: string[]): FileFormat => {
  const normalizedHeaders = headers.map(normalize);
  
  const mt5Indicators = ['time', 'position', 'symbol', 'type', 'volume', 'price', 'commission', 'swap', 'profit'];
  const cTraderIndicators = ['open time', 'close time', 'side', 'open price', 'close price', 'stop loss', 'take profit', 'id'];
  const fundingPipsIndicators = ['id', 'symbol', 'open time', 'volume', 'side', 'close time', 'open price', 'close price', 'stop loss', 'take profit', 'swap', 'commission', 'profit'];
  
  const mt5Score = mt5Indicators.filter(ind => normalizedHeaders.some(h => h.includes(ind))).length;
  const cTraderScore = cTraderIndicators.filter(ind => normalizedHeaders.some(h => h.includes(ind))).length;
  const fundingPipsScore = fundingPipsIndicators.filter(ind => normalizedHeaders.some(h => h.includes(ind))).length;
  
  if (fundingPipsScore >= 10) return 'fundingPips';
  if (mt5Score >= 6) return 'mt5';
  if (cTraderScore >= 5) return 'cTrader';
  return null;
};

const convertMT5Simple = (data: string[][]): ConvertedTrade[] => {
  const results: ConvertedTrade[] = [];
  
  for (const row of data) {
    if (row[0] === 'Time' || !row[0]) continue;
    if (row.length < 13) continue;
    
    const entry = splitDateTime(row[0]);
    const exit = splitDateTime(row[8]);
    
    results.push({
      entryDate: entry.date,
      entryTime: entry.time,
      positionId: row[1] || '',
      pair: row[2] || '',
      type: (row[3] || '').toUpperCase(),
      lot: parseFloat(row[4]) || 0,
      entryPrice: parseFloat(row[5]) || 0,
      stopLoss: row[6] ? parseFloat(row[6]) || null : null,
      takeProfit: row[7] ? parseFloat(row[7]) || null : null,
      exitDate: exit.date,
      exitTime: exit.time,
      exitPrice: parseFloat(row[9]) || 0,
      commission: Math.abs(parseFloat(row[10])) || 0,
      swap: parseFloat(row[11]) || 0,
      profit: parseFloat(row[12]) || 0,
    });
  }
  
  return results;
};

const convertFundingPipsSimple = (data: string[][]): Record<string, string | number>[] => {
  const results: Record<string, string | number>[] = [];
  const headers = [
    'Entry Date Time',
    'Position',
    'Symbol',
    'Type',
    'Volume',
    'Entry Price',
    'S / L',
    'T / P',
    'Exit Date Time',
    'Exit Price',
    'Commission',
    'Swap',
    'Profit'
  ];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 13) continue;
    
    console.log('ROW:', row);
    console.log('Profit Value:', row[FUNDING_PIPS_MAP.profit]);
    
    if (!row[FUNDING_PIPS_MAP.symbol]) {
      console.warn('Missing Symbol');
      continue;
    }
    
    const convertedRow: Record<string, string | number> = {
      'Entry Date Time': formatToMT5DateTime(row[FUNDING_PIPS_MAP.openTime] || ''),
      'Position': row[FUNDING_PIPS_MAP.id] || '',
      'Symbol': row[FUNDING_PIPS_MAP.symbol] || '',
      'Type': (row[FUNDING_PIPS_MAP.side] || '').toUpperCase(),
      'Volume': parseNumber(row[FUNDING_PIPS_MAP.volume]),
      'Entry Price': parseNumber(row[FUNDING_PIPS_MAP.openPrice]),
      'S / L': parseNumber(row[FUNDING_PIPS_MAP.stopLoss]),
      'T / P': parseNumber(row[FUNDING_PIPS_MAP.takeProfit]),
      'Exit Date Time': formatToMT5DateTime(row[FUNDING_PIPS_MAP.closeTime] || ''),
      'Exit Price': parseNumber(row[FUNDING_PIPS_MAP.closePrice]),
      'Commission': parseNumber(row[FUNDING_PIPS_MAP.commission]),
      'Swap': parseNumber(row[FUNDING_PIPS_MAP.swap]),
      'Profit': parseNumber(row[FUNDING_PIPS_MAP.profit])
    };
    
    results.push(convertedRow);
  }
  
  return results;
};

const convertFundingPips = (data: Record<string, string>[]): ConvertedTrade[] => {
  const results: ConvertedTrade[] = [];
  
  for (const row of data) {
    const openTime = getColumn(row, ['open time', 'opentime']);
    const closeTime = getColumn(row, ['close time', 'closetime']);
    
    const entryDateTimeObj = parseDateTime(openTime || '');
    const exitDateTimeObj = parseDateTime(closeTime || '');
    
    const symbol = getColumn(row, ['symbol']);
    if (!symbol) {
      throw new Error('Invalid FundingPips format: Symbol missing');
    }
    
    const side = getColumn(row, ['side', 'type']);
    const type = side ? side.toLowerCase() : '';
    
    const volume = getColumn(row, ['volume', 'lot']);
    const sl = getColumn(row, ['stop loss', 'sl']);
    const tp = getColumn(row, ['take profit', 'tp']);
    
    const commission = getColumn(row, ['commission']);
    const swap = getColumn(row, ['swap']);
    const profit = getColumn(row, ['profit']);
    
    results.push({
      entryDate: entryDateTimeObj.date,
      entryTime: entryDateTimeObj.time,
      positionId: getColumn(row, ['id', 'ticket', 'position']) || '',
      pair: symbol,
      type: type,
      lot: parseFloat(volume) || 0,
      entryPrice: parseFloat(getColumn(row, ['open price', 'entry price']) || '0') || 0,
      stopLoss: sl ? parseFloat(sl) || null : null,
      takeProfit: tp ? parseFloat(tp) || null : null,
      exitDate: exitDateTimeObj.date,
      exitTime: exitDateTimeObj.time,
      exitPrice: parseFloat(getColumn(row, ['close price', 'exit price']) || '0') || 0,
      commission: parseFloat(commission) || 0,
      swap: parseFloat(swap) || 0,
      profit: parseFloat(profit) || 0,
    });
  }
  
  return results;
};

const convertMT5 = (data: Record<string, string>[]): ConvertedTrade[] => {
  const results: ConvertedTrade[] = [];
  
  for (const row of data) {
    console.log('Row keys:', Object.keys(row));
    
    const entryDateTimeRaw = getColumn(row, ['time', 'time_1', 'open']);
    const exitDateTimeRaw = getColumn(row, ['time.1', 'time_2', 'close']);
    const entryDateTimeObj = parseDateTime(entryDateTimeRaw || '');
    const exitDateTimeObj = parseDateTime(exitDateTimeRaw || '');
    
    const symbol = getColumn(row, ['symbol']);
    if (!symbol) {
      throw new Error('Invalid MT5 format: Symbol missing');
    }
    
    const volume = getColumn(row, ['volume', 'lot']);
    const sl = getColumn(row, ['s/l', 's l', 'stop']);
    const tp = getColumn(row, ['t/p', 't p', 'take']);
    
    results.push({
      entryDate: entryDateTimeObj.date,
      entryTime: entryDateTimeObj.time,
      positionId: getColumn(row, ['position', 'ticket']) || '',
      pair: symbol,
      type: (getColumn(row, ['type']) || '').toUpperCase(),
      lot: parseFloat(volume) || 0,
      entryPrice: parseFloat(getColumn(row, ['price']) || '0') || 0,
      stopLoss: sl ? parseFloat(sl) || null : null,
      takeProfit: tp ? parseFloat(tp) || null : null,
      exitDate: exitDateTimeObj.date,
      exitTime: exitDateTimeObj.time,
      exitPrice: parseFloat(getColumn(row, ['price.1', 'price_1', 'close price']) || '0') || 0,
      commission: Math.abs(parseFloat(getColumn(row, ['commission']) || '0')) || 0,
      swap: parseFloat(getColumn(row, ['swap']) || '0') || 0,
      profit: parseFloat(getColumn(row, ['profit']) || '0') || 0,
    });
  }
  
  return results;
};

const convertCTrader = (data: Record<string, string>[]): ConvertedTrade[] => {
  const results: ConvertedTrade[] = [];
  
  for (const row of data) {
    const entryDateTimeRaw = getColumn(row, ['open time', 'opentime']);
    const exitDateTimeRaw = getColumn(row, ['close time', 'closetime']);
    const entryDateTimeObj = parseDateTime(entryDateTimeRaw || '');
    const exitDateTimeObj = parseDateTime(exitDateTimeRaw || '');
    
    const symbol = getColumn(row, ['symbol']);
    if (!symbol) {
      throw new Error('Invalid cTrader format: Symbol missing');
    }
    
    results.push({
      entryDate: entryDateTimeObj.date,
      entryTime: entryDateTimeObj.time,
      positionId: getColumn(row, ['id', 'ticket', 'position']) || '',
      pair: symbol,
      type: (getColumn(row, ['side', 'type']) || '').toUpperCase(),
      lot: parseFloat(getColumn(row, ['volume', 'lot']) || '0') || 0,
      entryPrice: parseFloat(getColumn(row, ['open price', 'entry price']) || '0') || 0,
      stopLoss: getColumn(row, ['stop loss', 'sl']) ? parseFloat(getColumn(row, ['stop loss', 'sl']) || '') || null : null,
      takeProfit: getColumn(row, ['take profit', 'tp']) ? parseFloat(getColumn(row, ['take profit', 'tp']) || '') || null : null,
      exitDate: exitDateTimeObj.date,
      exitTime: exitDateTimeObj.time,
      exitPrice: parseFloat(getColumn(row, ['close price', 'exit price']) || '0') || 0,
      commission: Math.abs(parseFloat(getColumn(row, ['commission']) || '0')) || 0,
      swap: parseFloat(getColumn(row, ['swap']) || '0') || 0,
      profit: parseFloat(getColumn(row, ['profit']) || '0') || 0,
    });
  }
  
  return results;
};

const validateColumns = (headers: string[]): boolean => {
  const format = detectFormat(headers);
  return format !== null;
};

export default function ConvertCsv() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [rawSimpleData, setRawSimpleData] = useState<string[][]>([]);
  const [fundingPipsData, setFundingPipsData] = useState<Record<string, string | number>[]>([]);
  const [convertedData, setConvertedData] = useState<ConvertedTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<FileFormat>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setRawData([]);
    setRawSimpleData([]);
    setFundingPipsData([]);
    setConvertedData([]);

    const text = await selectedFile.text();
    const firstLine = text.split('\n')[0].trim();
    const headerLine = firstLine.toLowerCase();
    
    const isFundingPips = headerLine.includes('id') && headerLine.includes('symbol') && 
                          headerLine.includes('open time') && headerLine.includes('volume') &&
                          headerLine.includes('side') && headerLine.includes('close time');
    
    if (isFundingPips) {
      Papa.parse(selectedFile, {
        skipEmptyLines: true,
        complete: (results) => {
          setRawSimpleData(results.data as string[][]);
          setDetectedFormat('fundingPips');
        },
        error: (err) => {
          setError('Failed to parse CSV: ' + err.message);
        }
      });
    } else if (firstLine.startsWith('2026.') || firstLine.startsWith('2025.') || /^\d{4}\.\d{2}\.\d{2}/.test(firstLine)) {
      Papa.parse(selectedFile, {
        skipEmptyLines: true,
        complete: (results) => {
          setRawSimpleData(results.data as string[][]);
          setDetectedFormat('mt5Simple');
        },
        error: (err) => {
          setError('Failed to parse CSV: ' + err.message);
        }
      });
    } else {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const format = detectFormat(headers);
          if (!format) {
            setError('Invalid file format. Missing required columns for MT5 or cTrader format.');
            setRawData([]);
            return;
          }
          setDetectedFormat(format);
          setRawData(results.data as Record<string, string>[]);
        },
        error: (err) => {
          setError('Failed to parse CSV: ' + err.message);
        }
      });
    }
  };

  const handleConvert = () => {
    if (rawData.length === 0 && rawSimpleData.length === 0) return;
    setIsConverting(true);
    setError(null);

    try {
      let converted: ConvertedTrade[] = [];
      let fpData: Record<string, string | number>[] = [];
      
      if (detectedFormat === 'mt5Simple') {
        converted = convertMT5Simple(rawSimpleData);
      } else if (detectedFormat === 'fundingPips') {
        fpData = convertFundingPipsSimple(rawSimpleData);
        setFundingPipsData(fpData);
      } else if (detectedFormat === 'cTrader') {
        converted = convertCTrader(rawData);
      } else {
        converted = convertMT5(rawData);
      }
      
      if (detectedFormat !== 'fundingPips' && converted.length === 0) {
        setError('No valid trades found in the file');
        return;
      }
      
      if (detectedFormat === 'fundingPips' && fpData.length === 0) {
        setError('No valid trades found in the file');
        return;
      }
      
      setConvertedData(converted);
    } catch (err: any) {
      setError('Conversion failed: ' + err.message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (detectedFormat === 'fundingPips' && fundingPipsData.length > 0) {
      const headers = [
        'Entry Date Time',
        'Position',
        'Symbol',
        'Type',
        'Volume',
        'Entry Price',
        'S / L',
        'T / P',
        'Exit Date Time',
        'Exit Price',
        'Commission',
        'Swap',
        'Profit'
      ];
      
      const csv = [
        headers.join(','),
        ...fundingPipsData.map(row =>
          headers.map(h => row[h]).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted_trades.csv';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const csv = Papa.unparse(convertedData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted_trades.csv';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportMT5Excel = async () => {
    const worksheetData = convertedData.map(row => [
      row.entryDate ? formatToMT5DateTime(`${row.entryDate} ${row.entryTime}`) : '',
      row.positionId,
      row.pair,
      row.type?.toLowerCase(),
      row.lot,
      row.entryPrice,
      row.stopLoss || '',
      row.takeProfit || '',
      row.exitDate ? formatToMT5DateTime(`${row.exitDate} ${row.exitTime}`) : '',
      row.exitPrice,
      row.commission,
      row.swap,
      row.profit
    ]);

    const headers = [
      'Time',
      'Position',
      'Symbol',
      'Type',
      'Volume',
      'Entry Price',
      'S / L',
      'T / P',
      'Exit Time',
      'Exit Price',
      'Commission',
      'Swap',
      'Profit'
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('MT5');
    worksheet.addRow(headers);
    worksheetData.forEach(row => worksheet.addRow(row));
    await workbook.xlsx.writeFile('MT5_Converted.xlsx');
  };

  const handleSendToImport = () => {
    if (fundingPipsData.length > 0) {
      const importData = fundingPipsData.map(row => ({
        entryDate: String(row['Entry Date Time'] || '').split(' ')[0] || '',
        entryTime: String(row['Entry Date Time'] || '').split(' ')[1] || '',
        positionId: String(row['Position'] || ''),
        pair: String(row['Symbol'] || ''),
        type: String(row['Type'] || '').toUpperCase(),
        lot: Number(row['Volume'] || 0),
        entryPrice: Number(row['Entry Price'] || 0),
        stopLoss: Number(row['S / L'] || 0) || null,
        takeProfit: Number(row['T / P'] || 0) || null,
        exitDate: String(row['Exit Date Time'] || '').split(' ')[0] || '',
        exitTime: String(row['Exit Date Time'] || '').split(' ')[1] || '',
        exitPrice: Number(row['Exit Price'] || 0),
        commission: Number(row['Commission'] || 0),
        swap: Number(row['Swap'] || 0),
        profit: Number(row['Profit'] || 0)
      }));
      localStorage.setItem('convertedTrades', JSON.stringify(importData));
    } else {
      localStorage.setItem('convertedTrades', JSON.stringify(convertedData));
    }
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'import' }));
  };

  const handleReset = () => {
    setFile(null);
    setRawData([]);
    setRawSimpleData([]);
    setFundingPipsData([]);
    setConvertedData([]);
    setError(null);
    setDetectedFormat(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearError = () => setError(null);

  const previewData = convertedData.length > 0 
    ? convertedData.slice(0, 50).map(t => ({
        'Entry Date Time': t.entryDate ? formatToMT5DateTime(`${t.entryDate} ${t.entryTime}`) : '',
        'Symbol': t.pair,
        'Type': t.type,
        'Volume': t.lot,
        'Profit': t.profit
      }))
    : fundingPipsData.slice(0, 50).map(t => ({
        'Entry Date Time': String(t['Entry Date Time'] || ''),
        'Symbol': String(t['Symbol'] || ''),
        'Type': String(t['Type'] || ''),
        'Volume': Number(t['Volume'] || 0),
        'Profit': Number(t['Profit'] || 0)
      }));

  const isFundingPipsReady = detectedFormat === 'fundingPips' && fundingPipsData.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Convert CSV"
        subtitle="Convert MT5 or cTrader export files before import"
        icon={FileSpreadsheet}
        color="indigo"
      />

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

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Upload MT5 CSV File
            </label>
            <div className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
              file
                ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
            }`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <FileText className="w-8 h-8 text-emerald-600" />
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
                      Drag and drop your file here, or{' '}
                      <span className="text-blue-600 font-semibold hover:underline">browse</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      Supports .csv (MT5 format)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {rawData.length > 0 && convertedData.length === 0 && !isFundingPipsReady && (
            <button
              onClick={handleConvert}
              disabled={isConverting}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              {isConverting ? 'Converting...' : `Convert ${detectedFormat === 'mt5Simple' ? 'MT5 (Simple)' : detectedFormat === 'cTrader' ? 'cTrader' : detectedFormat === 'fundingPips' ? 'FundingPips' : 'MT5'} Data`}
            </button>
          )}

          {detectedFormat === 'fundingPips' && rawSimpleData.length > 0 && !isFundingPipsReady && (
            <button
              onClick={handleConvert}
              disabled={isConverting}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              {isConverting ? 'Converting...' : 'Convert FundingPips Data'}
            </button>
          )}

          {isFundingPipsReady && (
            <>
              <div className="flex gap-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
                <button
                  onClick={handleExportMT5Excel}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  <FileOutput className="w-4 h-4" />
                  Export MT5 Excel
                </button>
                <button
                  onClick={handleSendToImport}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send to Import
                </button>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <p className="text-sm text-indigo-700">
                  <strong>{fundingPipsData.length}</strong> trades converted successfully.
                  Showing first 50 rows in preview.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Preview (first {previewData.length} rows)
                </h3>
                <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200/50">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Entry Date Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Symbol
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Volume
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-150">
                          <td className="px-4 py-3 text-slate-700">
                            {String(row['Entry Date Time'] || '-')}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-semibold">
                            {String(row['Symbol'] || '-')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${
                              String(row['Type'] || '').toUpperCase() === 'BUY'
                                ? 'text-emerald-700 bg-emerald-100'
                                : String(row['Type'] || '').toUpperCase() === 'SELL'
                                ? 'text-rose-700 bg-rose-100'
                                : 'text-slate-700 bg-slate-100'
                            }`}>
                              {String(row['Type'] || '-')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {row['Volume'] != null ? Number(row['Volume']).toFixed(2) : '-'}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${
                            (Number(row['Profit']) || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {row['Profit'] != null ? Number(row['Profit']).toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {convertedData.length > 0 && !isFundingPipsReady && (
            <>
              <div className="flex gap-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
                <button
                  onClick={handleSendToImport}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send to Import
                </button>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <p className="text-sm text-indigo-700">
                  <strong>{convertedData.length}</strong> trades converted successfully.
                  Showing first 50 rows in preview.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Preview (first {previewData.length} rows)
                </h3>
                <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200/50">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Entry Date Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Pair
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Lot
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-150">
                          <td className="px-4 py-3 text-slate-700">
                            {String(row['Entry Date Time'] || '-')}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-semibold">
                            {String(row['Symbol'] || '-')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${
                              String(row['Type'] || '').toUpperCase() === 'BUY'
                                ? 'text-emerald-700 bg-emerald-100'
                                : String(row['Type'] || '').toUpperCase() === 'SELL'
                                ? 'text-rose-700 bg-rose-100'
                                : 'text-slate-700 bg-slate-100'
                            }`}>
                              {String(row['Type'] || '-')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {row['Volume'] != null ? Number(row['Volume']).toFixed(2) : '-'}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${
                            (Number(row['Profit']) || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {row['Profit'] != null ? Number(row['Profit']).toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContainer>
    </div>
  );
}
