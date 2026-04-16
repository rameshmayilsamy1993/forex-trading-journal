const { Trade, SSMT_TYPES } = require('./trade.model');
const Account = require('../accounts/account.model');
const Master = require('../masters/master.model');
const { getCachedPairs, calculateRealPL } = require('../../services/tradeService');

function normalizeRow(row) {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = String(key).trim();
    normalized[cleanKey] = value;
  }
  return normalized;
}

function getValue(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function safeString(value, defaultValue = '') {
  if (value === undefined || value === null) return defaultValue;
  return String(value).trim() || defaultValue;
}

function safeNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function parseDateTime(dateTimeValue) {
  const dateStr = String(dateTimeValue || '').trim();
  if (!dateStr) return { date: new Date(), time: null };

  if (dateStr.includes('T') && !dateStr.includes('.')) {
    const [datePart, timePart] = dateStr.split('T');
    const time = timePart ? timePart.slice(0, 5) : null;
    return { date: new Date(dateStr), time };
  }

  const dotFormatMatch = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dotFormatMatch) {
    const [, year, month, day, hour, minute, second] = dotFormatMatch;
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;
    return {
      date: new Date(isoString),
      time: `${hour}:${minute}`
    };
  }

  const dashFormatMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dashFormatMatch) {
    const [, year, month, day, hour, minute, second] = dashFormatMatch;
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;
    return {
      date: new Date(isoString),
      time: `${hour}:${minute}`
    };
  }

  if (typeof dateTimeValue === 'number') {
    const excelDate = new Date(Math.round((dateTimeValue - 25569) * 86400 * 1000));
    const year = excelDate.getFullYear();
    const month = excelDate.getMonth() + 1;
    const day = excelDate.getDate();
    const hours = excelDate.getHours();
    const minutes = excelDate.getMinutes();
    const seconds = excelDate.getSeconds();
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return {
      date: new Date(isoString),
      time: null
    };
  }

  const asDate = new Date(dateStr);
  if (!isNaN(asDate.getTime())) {
    const iso = asDate.toISOString();
    return {
      date: asDate,
      time: iso.split('T')[1]?.slice(0, 5) || null
    };
  }

  return { date: new Date(), time: null };
}

function calculateRR(entry, sl, tp, type) {
  if (!entry || !sl || !tp) return null;

  let risk, reward;

  if (type === 'BUY') {
    risk = entry - sl;
    reward = tp - entry;
  } else {
    risk = sl - entry;
    reward = entry - tp;
  }

  if (risk <= 0) return null;

  return Number((reward / risk).toFixed(2));
}

function parseExcelWithDynamicHeaders(worksheet) {
  const ExcelJS = require('exceljs');
  const rawData = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNum) => {
    rawData.push(row.values);
  });

  const headerKeywords = ['Position', 'Symbol', 'Type'];
  let headerIndex = -1;

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rowStr = row.map(cell => String(cell || '')).join(' ');
    const hasAllKeywords = headerKeywords.every(kw => rowStr.includes(kw));

    if (hasAllKeywords) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return rawData.slice(1).map(row => {
      const obj = {};
      row.forEach((cell, i) => { obj[`col${i}`] = cell; });
      return obj;
    });
  }

  const headers = rawData[headerIndex].map(h => String(h || '').trim());
  const dataRows = rawData.slice(headerIndex + 1);

  const data = dataRows.map(row => {
    if (!Array.isArray(row) || row.length === 0) return null;
    const obj = {};
    headers.forEach((key, i) => {
      if (key) {
        obj[key] = row[i];
      }
    });
    return obj;
  }).filter(row => row && Object.keys(row).length > 0);

  const cleanData = data.filter(row => {
    const hasPosition = row['Position'] || row['Ticket'] || row['Order'];
    return hasPosition !== undefined && hasPosition !== null && hasPosition !== '';
  });

  return cleanData;
}

const previewImport = async (req, res, next) => {
  try {
    const ExcelJS = require('exceljs');
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }

    const workbook = await new ExcelJS.Workbook().xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    const data = parseExcelWithDynamicHeaders(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or has no valid data' });
    }

    const preview = [];
    const positionIds = [];

    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const rawRow = data[i];
      const row = normalizeRow(rawRow);

      const positionId = safeString(getValue(row, 'Position', 'positionId', 'position_id', 'Ticket'));
      positionIds.push(positionId);

      let isDuplicate = false;
      if (positionId && accountId) {
        const exists = await Trade.findOne({ positionId, accountId });
        isDuplicate = !!exists;
      }

      const typeValue = safeString(getValue(row, 'Type', 'type', 'Direction', 'Action'));
      const entryDateTime = getValue(row, 'Time', 'Entry Time', 'Open Time', 'Entry Date Time', 'Date', 'entryDate', 'date');
      const parsedEntry = parseDateTime(entryDateTime);

      const entryPriceValue = getValue(row, 'Entry Price', 'Price', 'price', 'Open Price', 'Open', 'entryPrice');
      const exitPriceValue = getValue(row, 'Exit Price', 'Close Price', 'Close', 'closePrice', 'Close Price', 'Exit', 'exitPrice');
      const exitDateTime = getValue(row, 'Exit Time', 'Close Time', 'Exit Date Time', 'exitDate');
      const parsedExit = parseDateTime(exitDateTime);

      const ssmtRaw = (getValue(row, 'SSMT', 'SSMT Type', 'ssmtType', 'ssmt') || '').toString().toLowerCase().trim();
      const ssmtTypeMap = {
        'yes with gbpusd': 'GBPUSD',
        'gbpusd': 'GBPUSD',
        'yes with eurusd': 'EURUSD',
        'eurusd': 'EURUSD',
        'yes with dxy': 'DXY',
        'dxy': 'DXY',
        'no': 'NO',
        'false': 'NO',
        'yes': 'NO'
      };
      const ssmtType = ssmtTypeMap[ssmtRaw] || 'NO';

      const commission = Math.abs(safeNumber(getValue(row, 'Commission', 'commission', 'Fee', 'fee')) || 0);
      const swap = Math.abs(safeNumber(getValue(row, 'Swap', 'swap', 'Swaps', 'swaps')) || 0);
      const stopLoss = safeNumber(getValue(row, 'S / L', 'S/L', 'Stop Loss', 'stopLoss', 'sl'));
      const takeProfit = safeNumber(getValue(row, 'T / P', 'T/P', 'Take Profit', 'takeProfit', 'tp'));

      preview.push({
        positionId,
        pair: safeString(getValue(row, 'Symbol', 'pair', 'Pair', 'Currency', 'instrument')),
        type: typeValue.toUpperCase(),
        lotSize: safeNumber(getValue(row, 'Volume', 'volume', 'Lots', 'lots', 'lotSize')),
        entryPrice: safeNumber(entryPriceValue),
        exitPrice: safeNumber(exitPriceValue),
        stopLoss: stopLoss,
        takeProfit: takeProfit,
        commission: commission,
        swap: swap,
        profit: safeNumber(getValue(row, 'Profit', 'profit', 'P/L', 'pl')),
        ssmtType: ssmtType,
        entryDate: parsedEntry.date.toISOString().split('T')[0],
        entryTime: parsedEntry.time,
        exitDate: parsedExit.date ? parsedExit.date.toISOString().split('T')[0] : null,
        exitTime: parsedExit.time,
        isDuplicate
      });
    }

    const duplicateCount = positionIds.length - new Set(positionIds).size;
    const existingDuplicates = preview.filter(p => p.isDuplicate).length;

    res.json({
      total: data.length,
      preview,
      stats: {
        duplicates: existingDuplicates,
        potentialDuplicates: duplicateCount,
        newTrades: data.length - existingDuplicates - duplicateCount
      }
    });
  } catch (error) {
    next(error);
  }
};

const importTrades = async (req, res, next) => {
  try {
    const ExcelJS = require('exceljs');
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }

    const account = await Account.findOne({ _id: accountId, userId: req.session.userId });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const workbook = await new ExcelJS.Workbook().xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    const data = parseExcelWithDynamicHeaders(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or has no valid data' });
    }

    const defaultStrategy = await Master.findOne({ userId: req.session.userId, type: 'strategy' });

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const rawRow = data[i];
      const row = normalizeRow(rawRow);

      try {
        const positionId = safeString(getValue(row, 'Position', 'positionId', 'position_id', 'Ticket'));

        if (!positionId) {
          errors.push({ row: i + 2, error: 'Missing Position ID' });
          continue;
        }

        const exists = await Trade.findOne({
          positionId: positionId,
          accountId: accountId
        });

        if (exists) {
          skipped++;
          continue;
        }

        const entryDateTime = getValue(row, 'Time', 'Entry Time', 'Open Time', 'Entry Date Time', 'Date', 'entryDate', 'date');
        const exitDateTime = getValue(row, 'Exit Time', 'Close Time', 'Exit Date Time', 'exitDate');

        const parsedEntry = parseDateTime(entryDateTime);
        const parsedExit = parseDateTime(exitDateTime);

        const typeValue = safeString(getValue(row, 'Type', 'type', 'Direction', 'Action'));

        const entryPriceValue = getValue(row, 'Entry Price', 'Price', 'price', 'Open Price', 'Open', 'entryPrice');
        const exitPriceValue = getValue(row, 'Exit Price', 'Close Price', 'Close', 'closePrice', 'Close Price', 'Exit', 'exitPrice');
        const stopLossValue = getValue(row, 'S / L', 'S/L', 'Stop Loss', 'stopLoss', 'sl');
        const takeProfitValue = getValue(row, 'T / P', 'T/P', 'Take Profit', 'takeProfit', 'tp');

        const entryPriceNum = safeNumber(entryPriceValue);
        const stopLossNum = safeNumber(stopLossValue);
        const takeProfitNum = safeNumber(takeProfitValue);

        const rr = calculateRR(entryPriceNum, stopLossNum, takeProfitNum, typeValue.toUpperCase());

        const commission = Math.abs(safeNumber(getValue(row, 'Commission', 'commission', 'Fee', 'fee')) || 0);
        const swap = Math.abs(safeNumber(getValue(row, 'Swap', 'swap', 'Swaps', 'swaps')) || 0);
        const profit = safeNumber(getValue(row, 'Profit', 'profit', 'P/L', 'pl')) || 0;
        const realPL = calculateRealPL(profit, commission, swap);

        const ssmtRaw = (getValue(row, 'SSMT', 'SSMT Type', 'ssmtType', 'ssmt') || '').toString().toLowerCase().trim();
        const ssmtTypeMap = {
          'yes with gbpusd': 'GBPUSD',
          'gbpusd': 'GBPUSD',
          'yes with eurusd': 'EURUSD',
          'eurusd': 'EURUSD',
          'yes with dxy': 'DXY',
          'dxy': 'DXY',
          'no': 'NO',
          'false': 'NO',
          'yes': 'NO'
        };
        const ssmtType = ssmtTypeMap[ssmtRaw] || 'NO';

        const allowedPairs = await getCachedPairs();
        const rawPair = safeString(getValue(row, 'Symbol', 'pair', 'Pair', 'Currency', 'instrument')).toUpperCase();
        const validatedPair = allowedPairs.includes(rawPair) ? rawPair : null;

        if (!validatedPair) {
          errors.push({ row: i + 2, error: `Invalid pair: ${rawPair}. Allowed: ${allowedPairs.join(', ')}` });
          continue;
        }

        const newTrade = {
          userId: req.session.userId,
          accountId: accountId,
          propFirmId: account.propFirmId || null,
          positionId: positionId,
          pair: validatedPair,
          type: typeValue.toUpperCase(),
          status: 'CLOSED',
          entryPrice: entryPriceNum,
          exitPrice: safeNumber(exitPriceValue) || undefined,
          lotSize: safeNumber(getValue(row, 'Volume', 'volume', 'Lots', 'lots', 'lotSize')),
          commission: commission,
          swap: swap,
          profit: profit,
          realPL: realPL,
          stopLoss: stopLossNum || undefined,
          takeProfit: takeProfitNum || undefined,
          riskRewardRatio: rr,
          strategy: defaultStrategy?.name || undefined,
          session: safeString(getValue(row, 'Session', 'session')) || 'LONDON',
          keyLevel: safeString(getValue(row, 'Key Level', 'KeyLevel', 'keyLevel')) || 'No Key Level',
          ssmtType: ssmtType,
          entryDate: entryDateTime ? parsedEntry.date : new Date(),
          entryTime: entryDateTime ? parsedEntry.time : undefined,
          exitDate: exitDateTime ? parsedExit.date : undefined,
          exitTime: exitDateTime ? parsedExit.time : undefined,
          notes: safeString(getValue(row, 'Comment', 'comment', 'Notes', 'notes', 'Description')),
        };

        if (newTrade.type !== 'BUY' && newTrade.type !== 'SELL') {
          errors.push({ row: i + 2, error: `Invalid trade type: ${typeValue}` });
          continue;
        }

        await Trade.create(newTrade);
        inserted++;
      } catch (rowError) {
        errors.push({ row: i + 2, error: rowError.message });
      }
    }

    res.json({
      total: data.length,
      inserted,
      skipped,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    next(error);
  }
};

const convertMT5 = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV file is empty or has no data' });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const hasPosition = headers.some(h => h.toLowerCase().includes('position'));
    if (!hasPosition) {
      return res.status(400).json({ message: 'Invalid MT5 format: Position column not found' });
    }

    function normalizeKey(key) {
      if (!key) return '';
      return String(key)
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
    }

    function extractValue(row, aliases) {
      for (const key of Object.keys(row)) {
        const normalized = normalizeKey(key);
        if (aliases.includes(normalized)) {
          const val = row[key];
          if (val !== undefined && val !== null && val !== '') {
            return val;
          }
        }
      }
      return null;
    }

    function parseBrokerDate(value) {
      if (!value) return null;
      const str = String(value).trim();
      if (!str) return null;

      const dotMatch = str.match(/^(\d{4})\.(\d{2})\.(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
      if (dotMatch) {
        const [, year, month, day, hour, minute, second] = dotMatch;
        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;
        return {
          date: `${year}-${month}-${day}`,
          time: `${hour}:${minute}`,
          iso: isoString,
          raw: isoString
        };
      }

      const dashMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
      if (dashMatch) {
        const [, year, month, day, hour, minute, second] = dashMatch;
        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;
        return {
          date: `${year}-${month}-${day}`,
          time: `${hour}:${minute}`,
          iso: isoString,
          raw: isoString
        };
      }

      return null;
    }

    function convertTrade(row) {
      const entryTime = extractValue(row, ['entrydatetime', 'entry_time', 'time', 'opentime', 'opentime']);
      const exitTime = extractValue(row, ['exitdatetime', 'exit_time', 'timeexit', 'closetime', 'extime']);

      const symbol = extractValue(row, ['symbol', 'pair', 'currency']);
      const type = extractValue(row, ['type', 'direction', 'action']);
      const position = extractValue(row, ['position', 'ticket', 'order', 'positionid']);
      const volume = extractValue(row, ['volume', 'lots', 'lot', 'volume']);
      const entryPrice = extractValue(row, ['entryprice', 'price', 'openprice', 'open', 'entry_price']);
      const exitPrice = extractValue(row, ['exitprice', 'closeprice', 'close', 'exit_price']);
      const commission = extractValue(row, ['commission', 'fee', 'comm']);
      const swap = extractValue(row, ['swap', 'swaps', 'rollover']);
      const profit = extractValue(row, ['profit', 'pl', 'profit']);

      const stopLoss = extractValue(row, ['sl', 'stop', 'stoploss', 'stop_loss', 's/l', 's l']);
      const takeProfit = extractValue(row, ['tp', 'take', 'takeprofit', 'take_profit', 't/p', 't p']);

      return {
        positionId: position || '',
        entryDate: entryTime ? parseBrokerDate(entryTime)?.date : null,
        entryTime: entryTime ? parseBrokerDate(entryTime)?.time : null,
        exitDate: exitTime ? parseBrokerDate(exitTime)?.date : null,
        exitTime: exitTime ? parseBrokerDate(exitTime)?.time : null,
        pair: symbol ? String(symbol).trim() : '',
        type: type ? String(type).toUpperCase() : '',
        lot: parseFloat(volume) || 0,
        entryPrice: parseFloat(entryPrice) || 0,
        exitPrice: parseFloat(exitPrice) || 0,
        stopLoss: stopLoss != null ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit != null ? parseFloat(takeProfit) : null,
        commission: parseFloat(commission) || 0,
        swap: parseFloat(swap) || 0,
        profit: parseFloat(profit) || 0
      };
    }

    function validateMT5Row(row) {
      const errors = [];
      const hasSymbol = (row.pair && row.pair.trim() !== '') || (row.symbol && row.symbol.trim() !== '');
      const hasVolume = row.lot != null || row.volume != null;
      const hasEntryPrice = row.entryPrice != null;

      if (!hasSymbol) errors.push('Symbol is required');
      if (!row.type) errors.push('Type is required');
      if (!hasVolume) errors.push('Volume is required');
      if (!hasEntryPrice) errors.push('Entry price is required');

      return errors;
    }

    const convertedRows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim());
      if (row.length < 13 || !row[0]) continue;

      try {
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h.trim()] = row[idx];
        });

        const converted = convertTrade(rowObj);
        const rowErrors = validateMT5Row(converted);

        if (rowErrors.length > 0) {
          errors.push({ row: i + 1, errors: rowErrors });
          continue;
        }

        convertedRows.push(converted);
      } catch (err) {
        errors.push({ row: i + 1, errors: [err.message] });
      }
    }

    res.json({
      total: lines.length - 1,
      converted: convertedRows.length,
      errors: errors.slice(0, 20),
      data: convertedRows
    });
  } catch (error) {
    next(error);
  }
};

const importConverted = async (req, res, next) => {
  try {
    const { trades, accountId } = req.body;

    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({ message: 'No trades provided' });
    }

    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }

    const account = await Account.findOne({ _id: accountId, userId: req.session.userId });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const defaultStrategy = await Master.findOne({ userId: req.session.userId, type: 'strategy' });

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];

      try {
        const positionId = trade.positionId;

        if (!positionId) {
          errors.push({ row: i + 1, error: 'Missing Position ID' });
          continue;
        }

        const exists = await Trade.findOne({ positionId, accountId });
        if (exists) {
          skipped++;
          continue;
        }

        const entryDateTime = trade.entryDate ? `${trade.entryDate} ${trade.entryTime || ''}`.trim() : null;
        const exitDateTime = trade.exitDate ? `${trade.exitDate} ${trade.exitTime || ''}`.trim() : null;

        const parsedEntry = parseDateTime(entryDateTime);
        const parsedExit = parseDateTime(exitDateTime);

        const typeValue = (trade.type || '').toUpperCase();
        const entryPriceNum = parseFloat(trade.entryPrice) || 0;
        const stopLossNum = trade.stopLoss ? parseFloat(trade.stopLoss) : null;
        const takeProfitNum = trade.takeProfit ? parseFloat(trade.takeProfit) : null;

        const rr = calculateRR(entryPriceNum, stopLossNum, takeProfitNum, typeValue);

        const commission = Math.abs(parseFloat(trade.commission) || 0);
        const swap = Math.abs(parseFloat(trade.swap) || 0);
        const profit = parseFloat(trade.profit) || 0;
        const realPL = parseFloat(trade.profit) || 0;

        const allowedPairs = await getCachedPairs();
        const validatedPair = allowedPairs.includes(trade.pair?.toUpperCase()) ? trade.pair.toUpperCase() : null;

        if (!validatedPair) {
          errors.push({ row: i + 1, error: `Invalid pair: ${trade.pair}` });
          continue;
        }

        const newTrade = {
          userId: req.session.userId,
          accountId: accountId,
          propFirmId: account.propFirmId || null,
          positionId,
          pair: validatedPair,
          type: typeValue,
          status: 'CLOSED',
          entryPrice: entryPriceNum,
          exitPrice: parseFloat(trade.exitPrice) || undefined,
          lotSize: parseFloat(trade.lot) || 0,
          commission,
          swap,
          profit,
          realPL,
          stopLoss: stopLossNum || undefined,
          takeProfit: takeProfitNum || undefined,
          riskRewardRatio: rr,
          strategy: defaultStrategy?.name || undefined,
          session: trade.session || 'LONDON',
          keyLevel: trade.keyLevel || 'No Key Level',
          ssmtType: 'NO',
          entryDate: entryDateTime ? parsedEntry.date : new Date(),
          entryTime: entryDateTime ? parsedEntry.time : undefined,
          exitDate: exitDateTime ? parsedExit.date : undefined,
          exitTime: exitDateTime ? parsedExit.time : undefined,
          notes: trade.notes || '',
        };

        if (newTrade.type !== 'BUY' && newTrade.type !== 'SELL') {
          errors.push({ row: i + 1, error: `Invalid trade type: ${typeValue}` });
          continue;
        }

        await Trade.create(newTrade);
        inserted++;
      } catch (rowError) {
        errors.push({ row: i + 1, error: rowError.message });
      }
    }

    res.json({
      total: trades.length,
      inserted,
      skipped,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { previewImport, importTrades, convertMT5, importConverted };
