const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const { upload, deleteImage } = require('./config/cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const SESSION_SECRET = process.env.SESSION_SECRET || 'fx-journal-secret-key-change-in-production';
const isProduction = process.env.NODE_ENV === 'production';

const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to MongoDB Atlas... (Attempt ${i + 1}/${retries})`);
      
      await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
      
      console.log('MongoDB Atlas connected successfully');
      
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected. Attempting to reconnect...');
        setTimeout(() => connectWithRetry(1, 3000), 3000);
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return true;
    } catch (err) {
      console.error(`MongoDB connection failed:`, err.message);
      
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Max retry attempts reached. Please check your MongoDB Atlas configuration.');
        process.exit(1);
      }
    }
  }
};

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

const schemaOptions = {
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const propFirmSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  color: String,
  challengeType: String,
  targetProfit: Number,
  maxLoss: Number,
  maxDailyLoss: Number,
  evaluationPeriod: Number,
  profitTarget: Number,
  profitSplit: Number,
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  initialBalance: Number,
  currentBalance: Number,
  currency: String,
  broker: String,
  leverage: String,
  accountType: String,
  propFirmId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropFirm' },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const tradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  propFirmId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropFirm' },
  positionId: String,
  pair: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  status: { type: String, enum: ['OPEN', 'CLOSED'] },
  entryPrice: Number,
  exitPrice: Number,
  lotSize: Number,
  commission: Number,
  swap: { type: Number, default: 0 },
  profit: Number,
  realPL: Number,
  stopLoss: Number,
  takeProfit: Number,
  riskRewardRatio: Number,
  notes: String,
  session: String,
  strategy: String,
  keyLevel: String,
  highLowTime: String,
  beforeScreenshot: String,
  afterScreenshot: String,
  entryDate: Date,
  entryTime: String,
  exitDate: Date,
  exitTime: String,
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const calculateRealPL = (profit, commission, swap) => {
  const p = parseFloat(profit) || 0;
  const c = parseFloat(commission) || 0;
  const s = parseFloat(swap) || 0;
  return Number((p + c + s).toFixed(2));
};

const masterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['strategy', 'keyLevel', 'session'] }
}, schemaOptions);

const missedTradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  pair: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  entryPrice: Number,
  stopLoss: Number,
  takeProfit: Number,
  rr: Number,
  date: Date,
  time: String,
  session: String,
  strategy: String,
  keyLevel: String,
  reason: String,
  emotion: String,
  status: { type: String, enum: ['MISSED', 'REVIEWED'], default: 'MISSED' },
  screenshots: {
    before: String,
    after: String
  },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const User = mongoose.model('User', userSchema);
const PropFirm = mongoose.model('PropFirm', propFirmSchema);
const Account = mongoose.model('Account', accountSchema);
const Trade = mongoose.model('Trade', tradeSchema);
const Master = mongoose.model('Master', masterSchema);
const MissedTrade = mongoose.model('MissedTrade', missedTradeSchema);

const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized - Please login' });
  }
  next();
};

const isAdmin = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized - Please login' });
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const seedMasters = async (userId) => {
  try {
    const count = await Master.countDocuments({ userId });
    if (count === 0) {
      const strategies = ['4HR CRT + 15MIN MODEL #1', '4HR FVG + 15MIN'];
      const keyLevels = ['4HR FVG', '4HR IFVG', '4HR OB', '4HR HIGHLOW'];
      const sessions = ['ASIAN', 'LONDON', 'NEW YORK', 'OVERLAP'];

      const masters = [
        ...strategies.map(name => ({ name, type: 'strategy', userId })),
        ...keyLevels.map(name => ({ name, type: 'keyLevel', userId })),
        ...sessions.map(name => ({ name, type: 'session', userId }))
      ];

      await Master.insertMany(masters);
      console.log('Master data seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding master data:', error);
  }
};

const seedAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@fxjournal.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        name: 'Admin',
        email: 'admin@fxjournal.com',
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user created: admin@fxjournal.com / admin123');
      await seedMasters(admin._id);
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    authenticated: !!req.session?.userId
  });
});

app.post('/api/upload', isAuthenticated, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }
  res.json({
    url: req.file.path,
    publicId: req.file.filename,
    originalName: req.file.originalname
  });
});

app.post('/api/upload/multiple', isAuthenticated, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No image files provided' });
  }
  const files = req.files.map(file => ({
    url: file.path,
    publicId: file.filename,
    originalName: file.originalname
  }));
  res.json(files);
});

app.delete('/api/upload/:publicId', isAuthenticated, async (req, res) => {
  try {
    await deleteImage(req.params.publicId);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete image' });
  }
});

const memoryStorage = multer.memoryStorage();
const uploadExcel = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

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

function safeNumber(value, defaultValue = 0) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

function parseDateTime(dateTimeValue) {
  const result = { date: new Date(), time: null };
  
  if (!dateTimeValue) return result;
  
  if (typeof dateTimeValue === 'number') {
    const date = XLSX.SSF.parse_date_code(dateTimeValue);
    result.date = new Date(date.y, date.m - 1, date.d, date.q || 0, date.q ? date.q % 100 : 0);
    result.time = date.q ? String(date.q).padStart(4, '0') : null;
    if (result.time && result.time.length === 4) {
      result.time = result.time.slice(0, 2) + ':' + result.time.slice(2);
    }
    return result;
  }
  
  const dateStr = String(dateTimeValue).trim();
  if (!dateStr) return result;
  
  // Handle MT4/MT5 format: "2026.03.31 09:41:43" (dots, space, seconds)
  const dotFormatMatch = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dotFormatMatch) {
    const [, year, month, day, hour, minute, second] = dotFormatMatch;
    result.date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second || '0')
    );
    result.time = `${hour}:${minute}`;
    return result;
  }
  
  // Handle combined date-time: "03/31/2026 09:41:43" or "03-31-2026 09:41"
  const combinedDateTimeRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})[\sT]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)/;
  const match = dateStr.match(combinedDateTimeRegex);
  
  if (match) {
    const datePart = new Date(match[1]);
    if (!isNaN(datePart.getTime())) {
      result.date = datePart;
    }
    const timePart = match[2];
    const time24 = convertTo24Hour(timePart);
    if (time24) {
      result.time = time24.slice(0, 5);
    }
  } else {
    const dateOnly = new Date(dateStr);
    if (!isNaN(dateOnly.getTime())) {
      result.date = dateOnly;
      const timeMatch = dateStr.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)/);
      if (timeMatch) {
        result.time = convertTo24Hour(timeMatch[1]);
        if (result.time) {
          result.time = result.time.slice(0, 5);
        }
      }
    }
  }
  
  return result;
}

function convertTo24Hour(timeStr) {
  if (!timeStr) return null;
  const cleanTime = timeStr.trim().toUpperCase();
  const isPM = cleanTime.includes('PM');
  const isAM = cleanTime.includes('AM');
  
  let [hours, minutes, seconds] = cleanTime.replace(/[APM]/gi, '').trim().split(':');
  
  if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) return null;
  
  let h = parseInt(hours);
  const m = minutes || '00';
  const s = seconds || '00';
  
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  
  return `${String(h).padStart(2, '0')}:${m}:${s}`;
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

function parseExcelWithDynamicHeaders(sheet) {
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Total rows found:', rawData.length);
  console.log('First 10 rows (to find headers):', rawData.slice(0, 10).map(r => r.slice(0, 5)));
  
  const headerKeywords = ['Position', 'Symbol', 'Type'];
  let headerIndex = -1;
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    
    const rowStr = row.map(cell => String(cell || '')).join(' ');
    const hasAllKeywords = headerKeywords.every(kw => rowStr.includes(kw));
    
    if (hasAllKeywords) {
      headerIndex = i;
      console.log('Found header row at index:', headerIndex);
      console.log('Header row content:', row);
      break;
    }
  }
  
  if (headerIndex === -1) {
    console.log('No header row found, using default sheet_to_json parsing');
    return XLSX.utils.sheet_to_json(sheet);
  }
  
  const headers = rawData[headerIndex].map(h => String(h || '').trim());
  console.log('Extracted headers:', headers);
  
  const dataRows = rawData.slice(headerIndex + 1);
  console.log('Data rows count:', dataRows.length);
  
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
  
  console.log('Clean data rows (with Position):', cleanData.length);
  console.log('First clean row:', JSON.stringify(cleanData[0], null, 2));
  
  return cleanData;
}

app.post('/api/trades/import', isAuthenticated, uploadExcel.single('file'), async (req, res) => {
  try {
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

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = parseExcelWithDynamicHeaders(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or has no valid data' });
    }

    console.log('Parsed data sample:', JSON.stringify(data[0], null, 2));

    const defaultStrategy = await Master.findOne({ userId: req.session.userId, type: 'strategy' });
    console.log('Default strategy:', defaultStrategy?.name || 'None found');

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
        
        if (i < 3) {
          console.log(`Row ${i + 1} - RR calc:`, { entryPriceNum, stopLossNum, takeProfitNum, typeValue, rr });
        }
        
        const commission = safeNumber(getValue(row, 'Commission', 'commission', 'Fee', 'fee')) || 0;
        const swap = safeNumber(getValue(row, 'Swap', 'swap', 'Swaps', 'swaps')) || 0;
        const profit = safeNumber(getValue(row, 'Profit', 'profit', 'P/L', 'pl')) || 0;
        const realPL = calculateRealPL(profit, commission, swap);

        const newTrade = {
          userId: req.session.userId,
          accountId: accountId,
          propFirmId: account.propFirmId || null,
          positionId: positionId,
          pair: safeString(getValue(row, 'Symbol', 'pair', 'Pair', 'Currency', 'instrument')),
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
          entryDate: parsedEntry.date,
          entryTime: parsedEntry.time,
          exitDate: parsedExit.date.getTime() !== new Date().getTime() || exitDateTime ? parsedExit.date : undefined,
          exitTime: parsedExit.time,
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
    console.error('Import error:', error);
    res.status(500).json({ message: 'Failed to import trades: ' + error.message });
  }
});

app.post('/api/trades/preview', isAuthenticated, uploadExcel.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = parseExcelWithDynamicHeaders(sheet);

    console.log('Preview parsed data:', JSON.stringify(data[0], null, 2));

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

      preview.push({
        positionId,
        pair: safeString(getValue(row, 'Symbol', 'pair', 'Pair', 'Currency', 'instrument')),
        type: typeValue.toUpperCase(),
        lotSize: safeNumber(getValue(row, 'Volume', 'volume', 'Lots', 'lots', 'lotSize')),
        entryPrice: safeNumber(entryPriceValue),
        exitPrice: safeNumber(exitPriceValue),
        profit: safeNumber(getValue(row, 'Profit', 'profit', 'P/L', 'pl')),
        entryDate: parsedEntry.date.toISOString().split('T')[0],
        entryTime: parsedEntry.time,
        exitDate: exitDateTime ? parsedExit.date.toISOString().split('T')[0] : null,
        exitTime: parsedExit.time,
        isDuplicate
      });
    }

    console.log('Mapped Preview Sample:', JSON.stringify(preview[0], null, 2));

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
    console.error('Preview error:', error);
    res.status(500).json({ message: 'Failed to preview trades: ' + error.message });
  }
});

app.get('/api/auth/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user'
    });

    await user.save();
    
    req.session.userId = user._id;
    
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    req.session.userId = user._id;
    
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      message: 'Login successful',
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

app.post('/api/auth/change-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

app.get('/api/prop-firms', isAuthenticated, async (req, res) => {
  try {
    const firms = await PropFirm.find({ userId: req.session.userId });
    res.json(firms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/prop-firms', isAuthenticated, async (req, res) => {
  try {
    const firm = new PropFirm({ ...req.body, userId: req.session.userId });
    const savedFirm = await firm.save();
    res.status(201).json(savedFirm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/prop-firms/:id', isAuthenticated, async (req, res) => {
  try {
    const firm = await PropFirm.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!firm) {
      return res.status(404).json({ message: 'Prop firm not found' });
    }
    res.json(firm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/prop-firms/:id', isAuthenticated, async (req, res) => {
  try {
    const firm = await PropFirm.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    if (!firm) {
      return res.status(404).json({ message: 'Prop firm not found' });
    }
    res.json({ message: 'Prop firm deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/accounts', isAuthenticated, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.session.userId }).populate('propFirmId');
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/accounts', isAuthenticated, async (req, res) => {
  try {
    const account = new Account({ ...req.body, userId: req.session.userId });
    const savedAccount = await account.save();
    res.status(201).json(savedAccount);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/accounts/:id', isAuthenticated, async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json(account);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/accounts/:id', isAuthenticated, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/trades', isAuthenticated, async (req, res) => {
  try {
    const { accountId, firmId } = req.query;
    let filter = { userId: req.session.userId };
    if (accountId) filter.accountId = accountId;
    if (firmId) filter.propFirmId = firmId;
    
    const trades = await Trade.find(filter)
      .populate('accountId')
      .populate('propFirmId')
      .sort({ createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/trades', isAuthenticated, async (req, res) => {
  try {
    const { profit, commission, swap, entryDate, entryTime, exitDate, exitTime, ...rest } = req.body;
    
    console.log('=== BACKEND CREATE DEBUG ===');
    console.log('entryDate:', entryDate);
    console.log('entryTime:', entryTime);
    console.log('exitDate:', exitDate);
    console.log('exitTime:', exitTime);
    
    const realPL = calculateRealPL(profit, commission, swap);
    
    // Accept ISO string or parse string date
    let finalEntryDate = entryDate ? new Date(entryDate) : new Date();
    if (isNaN(finalEntryDate.getTime())) {
      finalEntryDate = new Date();
    }
    
    let finalExitDate = exitDate ? new Date(exitDate) : undefined;
    if (finalExitDate && isNaN(finalExitDate.getTime())) {
      finalExitDate = undefined;
    }
    
    console.log('finalEntryDate:', finalEntryDate);
    console.log('finalExitDate:', finalExitDate);
    
    const trade = new Trade({
      ...rest,
      profit,
      commission,
      swap: swap || 0,
      realPL,
      entryDate: finalEntryDate,
      entryTime: entryTime || undefined,
      exitDate: finalExitDate,
      exitTime: exitTime || undefined,
      userId: req.session.userId
    });
    const savedTrade = await trade.save();
    console.log('Saved trade entryDate:', savedTrade.entryDate);
    res.status(201).json(savedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/trades/:id', isAuthenticated, async (req, res) => {
  try {
    const { profit, commission, swap, entryDate, entryTime, exitDate, exitTime, ...rest } = req.body;
    const realPL = calculateRealPL(profit, commission, swap);
    
    // Accept ISO string or parse string date
    let finalEntryDate = entryDate ? new Date(entryDate) : undefined;
    if (finalEntryDate && isNaN(finalEntryDate.getTime())) {
      finalEntryDate = undefined;
    }
    
    let finalExitDate = exitDate ? new Date(exitDate) : undefined;
    if (finalExitDate && isNaN(finalExitDate.getTime())) {
      finalExitDate = undefined;
    }
    
    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      {
        ...rest,
        profit,
        commission,
        swap: swap || 0,
        realPL,
        entryDate: finalEntryDate,
        entryTime: entryTime || undefined,
        exitDate: finalExitDate,
        exitTime: exitTime || undefined
      },
      { new: true, runValidators: true }
    );
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    res.json(trade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/trades/:id', isAuthenticated, async (req, res) => {
  try {
    const trade = await Trade.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    const publicIdsToDelete = [];
    if (trade.beforeScreenshot) {
      const urlParts = trade.beforeScreenshot.split('/');
      const filename = urlParts[urlParts.length - 1];
      publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
    }
    if (trade.afterScreenshot) {
      const urlParts = trade.afterScreenshot.split('/');
      const filename = urlParts[urlParts.length - 1];
      publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
    }

    for (const publicId of publicIdsToDelete) {
      try {
        await deleteImage(publicId);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    await Trade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Trade deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/trades/bulk-delete', isAuthenticated, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No trade IDs provided' });
    }

    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ message: 'No valid trade IDs provided' });
    }

    const trades = await Trade.find({
      _id: { $in: validIds },
      userId: req.session.userId
    });

    const publicIdsToDelete = [];
    for (const trade of trades) {
      if (trade.beforeScreenshot) {
        const urlParts = trade.beforeScreenshot.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
      if (trade.afterScreenshot) {
        const urlParts = trade.afterScreenshot.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
    }

    for (const publicId of publicIdsToDelete) {
      try {
        await deleteImage(publicId);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    const result = await Trade.deleteMany({
      _id: { $in: validIds },
      userId: req.session.userId
    });

    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/masters', isAuthenticated, async (req, res) => {
  try {
    const { type } = req.query;
    let filter = { userId: req.session.userId };
    if (type) filter.type = type;
    
    let masters = await Master.find(filter);
    
    if (masters.length === 0) {
      await seedMasters(req.session.userId);
      masters = await Master.find(filter);
    }
    
    res.json(masters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/masters', isAuthenticated, async (req, res) => {
  try {
    const master = new Master({ ...req.body, userId: req.session.userId });
    const savedMaster = await master.save();
    res.status(201).json(savedMaster);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/masters/:id', isAuthenticated, async (req, res) => {
  try {
    const master = await Master.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    if (!master) {
      return res.status(404).json({ message: 'Master entry not found' });
    }
    res.json({ message: 'Master entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/missed-trades', isAuthenticated, async (req, res) => {
  try {
    const { accountId } = req.query;
    let filter = { userId: req.session.userId };
    if (accountId) filter.accountId = accountId;
    
    const missedTrades = await MissedTrade.find(filter)
      .populate('accountId')
      .sort({ date: -1 });
    res.json(missedTrades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/missed-trades', isAuthenticated, async (req, res) => {
  try {
    const missedTrade = new MissedTrade({ ...req.body, userId: req.session.userId });
    const savedMissedTrade = await missedTrade.save();
    res.status(201).json(savedMissedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/missed-trades/:id', isAuthenticated, async (req, res) => {
  try {
    const missedTrade = await MissedTrade.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }
    res.json(missedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/missed-trades/:id', isAuthenticated, async (req, res) => {
  try {
    const missedTrade = await MissedTrade.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }

    if (missedTrade.screenshots) {
      const publicIdsToDelete = [];
      if (missedTrade.screenshots.before) {
        const urlParts = missedTrade.screenshots.before.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
      if (missedTrade.screenshots.after) {
        const urlParts = missedTrade.screenshots.after.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }

      for (const publicId of publicIdsToDelete) {
        try {
          await deleteImage(publicId);
        } catch (err) {
          console.error('Error deleting image from Cloudinary:', err);
        }
      }
    }

    await MissedTrade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Missed trade deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const startServer = async () => {
  await connectWithRetry();
  await seedAdminUser();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();
