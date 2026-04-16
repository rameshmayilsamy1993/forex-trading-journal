const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { upload, deleteImage } = require('./config/cloudinary');
require('dotenv').config();

const sanitizeHtml = require('sanitize-html');

const sanitizeOptions = {
  allowedTags: ['p', 'ul', 'li', 'ol', 'strong', 'em', 'b', 'i', 'u', 'a', 'h2', 'h3', 'br', 'span'],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    'span': ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  encodeEntities: false,
  transformTags: {
    'a': (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    })
  }
};

const sanitizeMissedReason = (html) => {
  if (!html || typeof html !== 'string') return '';
  const stripped = html.replace(/<[^>]*>/g, '');
  if (stripped.trim().length < 3) {
    return null;
  }
  if (stripped.length > 2000) {
    return null;
  }
  return sanitizeHtml(html, sanitizeOptions);
};

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

const SSMT_TYPES = ['NO', 'GBPUSD', 'EURUSD', 'DXY'];

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
  ssmtType: { type: String, enum: SSMT_TYPES, default: 'NO' },
  beforeScreenshot: String,
  afterScreenshot: String,
  entryDate: Date,
  entryTime: String,
  exitDate: Date,
  exitTime: String,
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const LOSS_REASON_TYPES = [
  // Mistake Reasons
  'FOMO',
  'Early Entry',
  'Late Entry',
  'No Confirmation',
  'Overtrading',
  'Revenge Trading',
  'Fear of Missing Out',
  'Overconfidence',
  'Lack of Patience',
  'Poor Risk Management',
  'Custom'
];

const VALID_LOSS_REASONS = [
  'Followed Plan',
  'Valid Setup (4HR + 15MIN Confirmed)',
  'SL Hit Before Target',
  'Market Structure Shift',
  'News Spike (Unavoidable)',
  'Liquidity Sweep Loss',
  'Spread/Slippage Issue'
];

const ALL_LOSS_REASONS = [...LOSS_REASON_TYPES, ...VALID_LOSS_REASONS];

const lossAnalysisSchema = new mongoose.Schema({
  tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  reasonType: { type: String, enum: ALL_LOSS_REASONS, required: true },
  isValidTrade: { type: Boolean, default: false },
  description: { type: String, default: '' },
  images: [{
    url: String,
    timeframe: { type: String, enum: ['4HR', '15MIN'], default: '4HR' },
    publicId: String
  }],
  tags: [String],
  checklist: [{
    rule: String,
    broken: { type: Boolean, default: false }
  }],
  disciplineScore: { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, schemaOptions);

lossAnalysisSchema.index({ tradeId: 1 }, { unique: true });
lossAnalysisSchema.index({ userId: 1 });

const LossAnalysis = mongoose.model('LossAnalysis', lossAnalysisSchema);

const calculateRealPL = (profit, commission, swap) => {
  const p = parseFloat(profit) || 0;
  const c = Math.abs(parseFloat(commission) || 0);
  const s = Math.abs(parseFloat(swap) || 0);
  return Number((p - c - s).toFixed(2));
};

const masterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['strategy', 'keyLevel', 'session'] }
}, schemaOptions);

const missedTradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  missedReason: String,
  notes: String,
  ssmtType: { type: String, enum: SSMT_TYPES, default: 'NO' },
  smt: { type: String, enum: ['No', 'Yes with GBPUSD', 'Yes with EURUSD', 'Yes with DXY'], default: 'No' },
  model1: { type: String, enum: ['Yes (Both EUR and GBP)', 'Yes (EUR)', 'Yes (GBP)', 'No'], default: 'Yes (EUR)' },
  emotion: String,
  commission: { type: Number, default: 0 },
  swap: { type: Number, default: 0 },
  profitLoss: { type: Number, default: 0 },
  realPL: { type: Number, default: 0 },
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

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
}, schemaOptions);

const Settings = mongoose.model('Settings', settingsSchema);

const pairCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000
};

const getCachedPairs = async () => {
  const now = Date.now();
  if (pairCache.data && pairCache.timestamp && (now - pairCache.timestamp < pairCache.ttl)) {
    return pairCache.data;
  }

  const settings = await Settings.findOne({ key: 'pairs' });
  const pairs = settings ? settings.value : ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];

  pairCache.data = pairs;
  pairCache.timestamp = now;

  return pairs;
};

const invalidatePairCache = () => {
  pairCache.data = null;
  pairCache.timestamp = null;
};

const isAuthenticated = (req, res, next) => {
  console.log('=== AUTH DEBUG ===');
  console.log('Session:', req.session?.userId ? 'exists' : 'missing');
  console.log('Cookies:', req.headers.cookie);
  console.log('Path:', req.path);

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

app.get('/api/settings/pairs', isAuthenticated, async (req, res) => {
  try {
    const pairs = await getCachedPairs();
    res.json({ pairs });
  } catch (error) {
    console.error('Error fetching pairs:', error);
    res.status(500).json({ message: 'Failed to fetch pairs' });
  }
});

app.post('/api/settings/pairs', isAuthenticated, async (req, res) => {
  try {
    const { pairs } = req.body;

    if (!Array.isArray(pairs)) {
      return res.status(400).json({ message: 'Pairs must be an array' });
    }

    const cleanedPairs = pairs
      .map(p => String(p).trim().toUpperCase())
      .filter(p => p.length > 0)
      .filter((p, index, arr) => arr.indexOf(p) === index);

    if (cleanedPairs.length === 0) {
      return res.status(400).json({ message: 'At least one pair is required' });
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'pairs' },
      {
        key: 'pairs',
        value: cleanedPairs,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    invalidatePairCache();

    res.json({
      message: 'Pairs updated successfully',
      pairs: settings.value
    });
  } catch (error) {
    console.error('Error updating pairs:', error);
    res.status(500).json({ message: 'Failed to update pairs' });
  }
});

app.get('/api/settings', isAuthenticated, async (req, res) => {
  try {
    const { key } = req.query;
    let settings;

    if (key) {
      settings = await Settings.findOne({ key });
    } else {
      settings = await Settings.find({});
    }

    res.json(settings || []);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', isAuthenticated, async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ message: 'Key is required' });
    }

    const settings = await Settings.findOneAndUpdate(
      { key },
      { key, value, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    if (key === 'pairs') {
      invalidatePairCache();
    }

    res.json(settings);
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

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
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
      'text/csv',
      'text/plain',
      'application/csv'
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) or CSV files (.csv) are allowed'));
    }
  }
});

const uploadCSV = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['text/csv', 'text/plain', 'application/csv', 'application/octet-stream'];
    const allowedExtensions = ['.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files (.csv) are allowed'));
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

function safeNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function parseDDMMYYYYDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  }
  return null;
}

function parseDateTime(dateTimeValue) {
  const dateStr = String(dateTimeValue || '').trim();
  if (!dateStr) return { date: new Date(), time: null };

  console.log('=== PARSE DATETIME ===');
  console.log('INPUT:', dateStr);

  // Handle ISO format already (2026-04-09T14:03:00) - DO NOT manipulate
  if (dateStr.includes('T') && !dateStr.includes('.')) {
    console.log('ISO format detected');
    const [datePart, timePart] = dateStr.split('T');
    const time = timePart ? timePart.slice(0, 5) : null;
    return { date: new Date(dateStr), time };
  }

  // Handle MT4/MT5 format: "2026.03.31 09:41:43" (dots, space, seconds)
  const dotFormatMatch = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dotFormatMatch) {
    const [, year, month, day, hour, minute, second] = dotFormatMatch;
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;
    console.log('DOT FORMAT:', isoString);
    return {
      date: new Date(isoString),
      time: `${hour}:${minute}`
    };
  }

  // Handle dash format
  const dashFormatMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dashFormatMatch) {
    const [, year, month, day, hour, minute, second] = dashFormatMatch;
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;
    return {
      date: new Date(isoString),
      time: `${hour}:${minute}`
    };
  }

  // Handle number (Excel serial date)
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
      time: `${String(date.H || 0).padStart(2, '0')}:${String(date.M || 0).padStart(2, '0')}`
    };
  }

  // Try as ISO string directly
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

function mapTrade(row) {
  const positionId = safeString(getValue(row, 'Position', 'positionId', 'position_id', 'Ticket'));
  const type = safeString(getValue(row, 'Type', 'type', 'Direction', 'Action')).toUpperCase();
  const pair = safeString(getValue(row, 'Symbol', 'pair', 'Pair', 'Currency', 'instrument'));
  const volume = safeNumber(getValue(row, 'Volume', 'volume', 'Lots', 'lots', 'lotSize'));
  const entryPrice = safeNumber(getValue(row, 'Entry Price', 'Price', 'price', 'Open Price', 'Open', 'entryPrice'));
  const exitPrice = safeNumber(getValue(row, 'Exit Price', 'Close Price', 'Close', 'closePrice', 'Close Price', 'Exit', 'exitPrice'));
  const stopLoss = safeNumber(getValue(row, 'S / L', 'S/L', 'Stop Loss', 'stopLoss', 'sl'));
  const takeProfit = safeNumber(getValue(row, 'T / P', 'T/P', 'Take Profit', 'takeProfit', 'tp'));
  const commission = Math.abs(safeNumber(getValue(row, 'Commission', 'commission', 'Fee', 'fee')) || 0);
  const swap = Math.abs(safeNumber(getValue(row, 'Swap', 'swap', 'Swaps', 'swaps')) || 0);
  const profit = safeNumber(getValue(row, 'Profit', 'profit', 'P/L', 'pl')) || 0;

  const entryDateTime = getValue(row, 'Time', 'Entry Time', 'Open Time', 'Entry Date Time', 'Date', 'entryDate', 'date');
  const exitDateTime = getValue(row, 'Exit Time', 'Close Time', 'Exit Date Time', 'exitDate');
  const parsedEntry = parseDateTime(entryDateTime);
  const parsedExit = parseDateTime(exitDateTime);

  const entryDate = parsedEntry.date ? parsedEntry.date.toISOString().split('T')[0] : null;
  const entryTime = parsedEntry.time;
  const exitDate = parsedExit.date ? parsedExit.date.toISOString().split('T')[0] : null;
  const exitTime = parsedExit.time;

  return {
    positionId,
    type,
    pair,
    lotSize: volume,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    commission,
    swap,
    profit,
    entryDate,
    entryTime,
    exitDate,
    exitTime
  };
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

  console.log('=== PARSE BROKER DATE ===');
  console.log('INPUT:', str);

  // Extract date and time parts
  const dotMatch = str.match(/^(\d{4})\.(\d{2})\.(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dotMatch) {
    const [, year, month, day, hour, minute, second] = dotMatch;
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;

    console.log('ISO STRING:', isoString);

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
      iso: isoString,
      raw: isoString
    };
  }

  // Handle dash format 2026-04-09 14:03:00
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

  // Handle slash format 2026/04/09 14:03:00
  const slashMatch = str.match(/^(\d{4})\/(\d{2})\/(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (slashMatch) {
    const [, year, month, day, hour, minute, second] = slashMatch;
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`;

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
      iso: isoString,
      raw: isoString
    };
  }

  console.log('NO MATCH, returning null');
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

function convertMT5Row(row) {
  return convertTrade(row);
}

function validateMT5Row(row) {
  const errors = [];
  console.log('=== VALIDATE ROW ===');
  console.log('VALIDATE INPUT:', JSON.stringify(row));

  const hasSymbol = (row.pair && row.pair.trim() !== '') || (row.symbol && row.symbol.trim() !== '');
  const hasVolume = row.lot != null || row.volume != null;
  const hasEntryPrice = row.entryPrice != null;

  if (!hasSymbol) errors.push('Symbol is required');
  if (!row.type) errors.push('Type is required');
  if (!hasVolume) errors.push('Volume is required');
  if (!hasEntryPrice) errors.push('Entry price is required');

  if (errors.length > 0) {
    console.log('VALIDATION ERRORS:', errors);
  }

  return errors;
}

function parseExcelWithDynamicHeaders(worksheet) {
  const rawData = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNum) => {
    rawData.push(row.values);
  });

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
    console.log('No header row found, using default row parsing');
    return rawData.slice(1).map(row => {
      const obj = {};
      row.forEach((cell, i) => { obj[`col${i}`] = cell; });
      return obj;
    });
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

    const workbook = await new ExcelJS.Workbook().xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    const data = parseExcelWithDynamicHeaders(worksheet);

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
          console.log(`=== DEBUG IMPORT ROW ${i + 1} ===`);
          console.log('RAW ROW:', JSON.stringify(row));
          console.log('Positions:', { positionId, typeValue, entryPriceNum, stopLossNum, takeProfitNum, rr });
        }

        const commission = Math.abs(safeNumber(getValue(row, 'Commission', 'commission', 'Fee', 'fee')) || 0);
        const swap = Math.abs(safeNumber(getValue(row, 'Swap', 'swap', 'Swaps', 'swaps')) || 0);
        const profit = safeNumber(getValue(row, 'Profit', 'profit', 'P/L', 'pl')) || 0;
        const realPL = calculateRealPL(profit, commission, swap);

        // Handle SSMT Type - map from various formats to enum
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
          'yes': 'NO' // Default to NO for generic yes
        };
        const ssmtType = ssmtTypeMap[ssmtRaw] || 'NO';

        // Handle SMT - default "No"
        const smtRaw = (getValue(row, 'SMT', 'smt', 'SMT Type') || 'No').toString();
        const smtMap = {
          'yes with gbpusd': 'Yes with GBPUSD',
          'yes with eurusd': 'Yes with EURUSD',
          'yes with dxy': 'Yes with DXY',
          'no': 'No',
          '': 'No'
        };
        const smt = smtMap[smtRaw.toLowerCase()] || 'No';

        // Handle Model #1 - default "Yes (EUR)"
        const model1Raw = (getValue(row, 'Model #1', 'Model #1 Occurred', 'Model1', 'model1') || 'Yes (EUR)').toString();
        const model1Map = {
          'yes (both eur and gbp)': 'Yes (Both EUR and GBP)',
          'yes (eur)': 'Yes (EUR)',
          'yes (gbp)': 'Yes (GBP)',
          'no': 'No',
          '': 'Yes (EUR)'
        };
        const model1 = model1Map[model1Raw] || 'Yes (EUR)';

        // Validate pair against settings
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
          smt: smt,
          model1: model1,
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

    const workbook = await new ExcelJS.Workbook().xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    const data = parseExcelWithDynamicHeaders(worksheet);

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

      // Handle SSMT Type - map from various formats to enum
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

      // Debug first row
      if (i === 0) {
        console.log('=== DEBUG PREVIEW ROW ===');
        console.log('RAW ROW:', JSON.stringify(row));
        console.log('Commission:', commission, 'Swap:', swap, 'StopLoss:', stopLoss, 'TakeProfit:', takeProfit);
      }

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

app.post('/api/import/convert-mt5', isAuthenticated, uploadCSV.single('file'), async (req, res) => {
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
    console.log('=== MT5 CONVERSION DEBUG ===');
    console.log('RAW HEADERS:', headers);
    console.log('NORMALIZED HEADERS:', headers.map(normalizeKey));

    const hasPosition = headers.some(h => h.toLowerCase().includes('position'));
    if (!hasPosition) {
      return res.status(400).json({ message: 'Invalid MT5 format: Position column not found' });
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

        console.log(`=== STEP ${i}: PROCESSING ===`);
        console.log(`STEP ${i} RAW HEADERS:`, headers.map(normalizeKey));
        console.log(`STEP ${i} RAW:`, JSON.stringify(rowObj));

        const converted = convertMT5Row(rowObj);

        console.log(`STEP ${i} CONVERTED:`, JSON.stringify(converted));

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

    console.log('CONVERSION RESULT:', {
      total: lines.length - 1,
      converted: convertedRows.length,
      errors: errors.length
    });

    res.json({
      total: lines.length - 1,
      converted: convertedRows.length,
      errors: errors.slice(0, 20),
      data: convertedRows
    });
  } catch (error) {
    console.error('MT5 Convert error:', error);
    res.status(500).json({ message: 'Failed to convert MT5 CSV: ' + error.message });
  }
});

app.post('/api/trades/import-converted', isAuthenticated, async (req, res) => {
  console.log('=== IMPORT-CONVERTED HIT ===');
  console.log('Session:', req.session?.userId || 'NONE');
  console.log('Body keys:', Object.keys(req.body || {}));

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
        const realPL = parseFloat(trade.profit) || 0;//calculateRealPL(profit, commission, swap);

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
          smt: 'No',
          model1: 'Yes (EUR)',
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
    console.error('Import converted error:', error);
    res.status(500).json({ message: 'Failed to import converted trades: ' + error.message });
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
    const { accountId, firmId, ssmtType } = req.query;
    let filter = { userId: req.session.userId };
    if (accountId) filter.accountId = accountId;
    if (firmId) filter.propFirmId = firmId;

    if (ssmtType !== undefined && SSMT_TYPES.includes(ssmtType)) {
      filter.ssmtType = ssmtType;
    }

    const trades = await Trade.find(filter)
      .populate('accountId')
      .populate('propFirmId')
      .sort({ entryDate: -1, createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/trades', isAuthenticated, async (req, res) => {
  try {
    const { profit, commission, swap, entryDate, entryTime, exitDate, exitTime, ssmtType, pair, ...rest } = req.body;

    console.log('=== BACKEND CREATE DEBUG ===');
    console.log('entryDate:', entryDate);
    console.log('entryTime:', entryTime);
    console.log('exitDate:', exitDate);
    console.log('exitTime:', exitTime);
    console.log('ssmtType:', ssmtType);
    console.log('pair:', pair);

    const allowedPairs = await getCachedPairs();
    const finalPair = allowedPairs.includes(pair) ? pair : null;

    if (!finalPair) {
      return res.status(400).json({
        message: `Invalid pair. Allowed pairs: ${allowedPairs.join(', ')}`
      });
    }

    const realPL = calculateRealPL(profit, commission, swap);

    let finalEntryDate = entryDate ? new Date(entryDate) : new Date();
    if (isNaN(finalEntryDate.getTime())) {
      finalEntryDate = new Date();
    }

    let finalExitDate = exitDate ? new Date(exitDate) : undefined;
    if (finalExitDate && isNaN(finalExitDate.getTime())) {
      finalExitDate = undefined;
    }

    const finalSsmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';

    console.log('finalEntryDate:', finalEntryDate);
    console.log('finalExitDate:', finalExitDate);
    console.log('finalSsmtType:', finalSsmtType);
    console.log('finalPair:', finalPair);

    const trade = new Trade({
      ...rest,
      pair: finalPair,
      profit,
      commission,
      swap: swap || 0,
      realPL,
      ssmtType: finalSsmtType,
      entryDate: finalEntryDate,
      entryTime: entryTime || undefined,
      exitDate: finalExitDate,
      exitTime: exitTime || undefined,
      userId: req.session.userId
    });
    const savedTrade = await trade.save();
    console.log('Saved trade entryDate:', savedTrade.entryDate);
    console.log('Saved trade ssmtType:', savedTrade.ssmtType);
    console.log('Saved trade pair:', savedTrade.pair);
    res.status(201).json(savedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/trades/:id', isAuthenticated, async (req, res) => {
  try {
    const { profit, commission, swap, entryDate, entryTime, exitDate, exitTime, ssmtType, pair, highLowTime, ...rest } = req.body;

    console.log('=== BACKEND PUT DEBUG ===');
    console.log('entryDate:', entryDate, 'entryTime:', entryTime);
    console.log('exitDate:', exitDate, 'exitTime:', exitTime);
    console.log('highLowTime:', highLowTime);

    const allowedPairs = await getCachedPairs();
    let finalPair = undefined;

    if (pair !== undefined) {
      finalPair = allowedPairs.includes(pair) ? pair : null;
      if (!finalPair) {
        return res.status(400).json({
          message: `Invalid pair. Allowed pairs: ${allowedPairs.join(', ')}`
        });
      }
    }

    const realPL = calculateRealPL(profit, commission, swap);

    let finalEntryDate = entryDate ? new Date(entryDate) : undefined;
    if (finalEntryDate && isNaN(finalEntryDate.getTime())) {
      finalEntryDate = undefined;
    }

    let finalExitDate = exitDate ? new Date(exitDate) : undefined;
    if (finalExitDate && isNaN(finalExitDate.getTime())) {
      finalExitDate = undefined;
    }

    const finalSsmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';

    const updateData = {
      ...rest,
      profit,
      commission,
      swap: swap || 0,
      realPL,
      ssmtType: finalSsmtType,
      entryDate: finalEntryDate,
      entryTime: entryTime || undefined,
      exitDate: finalExitDate,
      exitTime: exitTime || undefined,
      highLowTime: highLowTime || undefined,
    };

    if (finalPair) {
      updateData.pair = finalPair;
    }

    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      updateData,
      { new: true, runValidators: true }
    );
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    console.log('Updated trade returned:', {
      entryDate: trade.entryDate,
      entryTime: trade.entryTime,
      exitDate: trade.exitDate,
      exitTime: trade.exitTime,
      highLowTime: trade.highLowTime
    });
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
    const { ssmtType } = req.query;
    let filter = { userId: req.session.userId };
    if (ssmtType !== undefined && SSMT_TYPES.includes(ssmtType)) {
      filter.ssmtType = ssmtType;
    }

    const missedTrades = await MissedTrade.find(filter)
      .sort({ date: -1 });
    res.json(missedTrades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/missed-trades', isAuthenticated, async (req, res) => {
  try {
    console.log('=== CREATE MISSED TRADE DEBUG ===');
    console.log('Incoming payload:', JSON.stringify(req.body, null, 2));

    const { missedReason, reason, ssmtType, pair, profitLoss, commission, swap, ...rest } = req.body;

    const sanitizedReason = sanitizeMissedReason(missedReason || reason);

    if (!sanitizedReason) {
      return res.status(400).json({
        message: 'Missed reason is required and must be between 3-2000 characters'
      });
    }

    const allowedPairs = await getCachedPairs();
    const finalPair = allowedPairs.includes(pair) ? pair : null;

    if (!finalPair) {
      return res.status(400).json({
        message: `Invalid pair. Allowed pairs: ${allowedPairs.join(', ')}`
      });
    }

    const finalSsmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';
    const finalProfitLoss = Number(profitLoss || 0);
    const finalCommission = Number(commission || 0);
    const finalSwap = Number(swap || 0);
    const finalRealPL = finalProfitLoss - finalCommission - finalSwap;

    const missedTrade = new MissedTrade({
      ...rest,
      pair: finalPair,
      reason: sanitizedReason,
      missedReason: sanitizedReason,
      ssmtType: finalSsmtType,
      profitLoss: finalProfitLoss,
      commission: finalCommission,
      swap: finalSwap,
      realPL: finalRealPL,
      userId: req.session.userId
    });

    console.log('Sanitized missed reason:', sanitizedReason);
    console.log('SsmtType:', finalSsmtType);
    console.log('Pair:', finalPair);
    console.log('Real PL:', finalRealPL);
    console.log('Saving missed trade...');

    const savedMissedTrade = await missedTrade.save();
    console.log('Saved missed trade:', savedMissedTrade);

    res.status(201).json(savedMissedTrade);
  } catch (error) {
    console.error('Create missed trade error:', error);
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/missed-trades/:id', isAuthenticated, async (req, res) => {
  try {
    console.log('=== UPDATE MISSED TRADE DEBUG ===');
    console.log('Incoming payload:', JSON.stringify(req.body, null, 2));

    const { missedReason, reason, ssmtType, profitLoss, commission, swap, ...rest } = req.body;

    let updateData = { ...rest };

    if (missedReason !== undefined) {
      const sanitizedReason = sanitizeMissedReason(missedReason);

      if (!sanitizedReason) {
        return res.status(400).json({
          message: 'Missed reason must be between 10-2000 characters'
        });
      }

      updateData.reason = sanitizedReason;
      updateData.missedReason = sanitizedReason;
      console.log('Sanitized missed reason:', sanitizedReason);
    }

    if (ssmtType !== undefined) {
      updateData.ssmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';
      console.log('SsmtType:', updateData.ssmtType);
    }

    if (profitLoss !== undefined || commission !== undefined || swap !== undefined) {
      const finalProfitLoss = Number(profitLoss ?? updateData.profitLoss ?? 0);
      const finalCommission = Number(commission ?? updateData.commission ?? 0);
      const finalSwap = Number(swap ?? updateData.swap ?? 0);
      updateData.profitLoss = finalProfitLoss;
      updateData.commission = finalCommission;
      updateData.swap = finalSwap;
      updateData.realPL = finalProfitLoss - finalCommission - finalSwap;
      console.log('Real PL recalculated:', updateData.realPL);
    }

    const missedTrade = await MissedTrade.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }

    console.log('Updated missed trade:', missedTrade);
    res.json(missedTrade);
  } catch (error) {
    console.error('Update missed trade error:', error);
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

// Loss Analysis Endpoints
app.post('/api/loss-analysis', isAuthenticated, async (req, res) => {
  try {
    const { tradeId, title, reasonType, description, images, tags, checklist, disciplineScore } = req.body;
    
    if (!tradeId) {
      return res.status(400).json({ message: 'Trade ID is required' });
    }
    
    if (!reasonType) {
      return res.status(400).json({ message: 'Reason type is required' });
    }
    
    const trade = await Trade.findOne({ _id: tradeId, userId: req.session.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    const existing = await LossAnalysis.findOne({ tradeId, userId: req.session.userId });
    if (existing) {
      return res.status(400).json({ message: 'Analysis already exists for this trade' });
    }
    
    const isValidTrade = VALID_LOSS_REASONS.includes(reasonType);
    
    const analysis = await LossAnalysis.create({
      tradeId,
      userId: req.session.userId,
      title,
      reasonType,
      isValidTrade,
      description: description || '',
      images: images || [],
      tags: tags || [],
      checklist: checklist || [],
      disciplineScore
    });
    
    res.status(201).json(analysis);
  } catch (error) {
    console.error('Loss analysis create error:', error);
    res.status(500).json({ message: 'Failed to create loss analysis' });
  }
});

app.get('/api/loss-analysis/:tradeId', isAuthenticated, async (req, res) => {
  try {
    const { tradeId } = req.params;
    
    const trade = await Trade.findOne({ _id: tradeId, userId: req.session.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    const analysis = await LossAnalysis.findOne({ tradeId, userId: req.session.userId });
    
    if (!analysis) {
      return res.json(null);
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('Loss analysis get error:', error);
    res.status(500).json({ message: 'Failed to get loss analysis' });
  }
});

app.put('/api/loss-analysis/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, reasonType, description, images, tags, checklist, disciplineScore } = req.body;
    
    const analysis = await LossAnalysis.findOne({
      _id: id,
      userId: req.session.userId
    });
    
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }
    
    if (title !== undefined) analysis.title = title;
    if (reasonType) analysis.reasonType = reasonType;
    if (description !== undefined) analysis.description = description;
    if (images) analysis.images = images;
    if (tags) analysis.tags = tags;
    if (checklist) analysis.checklist = checklist;
    if (disciplineScore !== undefined) analysis.disciplineScore = disciplineScore;
    analysis.updatedAt = new Date();
    
    await analysis.save();
    
    res.json(analysis);
  } catch (error) {
    console.error('Loss analysis update error:', error);
    res.status(500).json({ message: 'Failed to update loss analysis' });
  }
});

app.get('/api/loss-analysis-list', isAuthenticated, async (req, res) => {
  try {
    const { accountId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const filter = { userId: req.session.userId };
    
    if (accountId) {
      const tradeIds = await Trade.find({
        userId: req.session.userId,
        accountId,
        profit: { $lt: 0 }
      }).select('_id');
      filter.tradeId = { $in: tradeIds.map(t => t._id) };
    }
    
    const analyses = await LossAnalysis.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('tradeId');
    
    const total = await LossAnalysis.countDocuments(filter);
    
    res.json({
      analyses,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Loss analysis list error:', error);
    res.status(500).json({ message: 'Failed to get loss analyses' });
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
