const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Common schema options for ID transformation
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

// Define schemas and models
const propFirmSchema = new mongoose.Schema({
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
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  propFirmId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropFirm' },
  pair: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  status: { type: String, enum: ['OPEN', 'CLOSED'] },
  entryPrice: Number,
  exitPrice: Number,
  lotSize: Number,
  entryDate: Date,
  entryTime: String,
  exitDate: Date,
  exitTime: String,
  profit: Number,
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
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const masterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['strategy', 'keyLevel', 'session'] }
}, schemaOptions);

const missedTradeSchema = new mongoose.Schema({
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

const PropFirm = mongoose.model('PropFirm', propFirmSchema);
const Account = mongoose.model('Account', accountSchema);
const Trade = mongoose.model('Trade', tradeSchema);
const Master = mongoose.model('Master', masterSchema);
const MissedTrade = mongoose.model('MissedTrade', missedTradeSchema);

// Seed masters if empty
const seedMasters = async () => {
  try {
    const count = await Master.countDocuments();
    if (count === 0) {
      const strategies = ['4HR CRT + 15MIN MODEL #1', '4HR FVG + 15MIN'];
      const keyLevels = ['4HR FVG', '4HR IFVG', '4HR OB', '4HR HIGHLOW'];
      const sessions = ['ASIAN', 'LONDON', 'NEW YORK', 'OVERLAP'];

      const masters = [
        ...strategies.map(name => ({ name, type: 'strategy' })),
        ...keyLevels.map(name => ({ name, type: 'keyLevel' })),
        ...sessions.map(name => ({ name, type: 'session' }))
      ];

      await Master.insertMany(masters);
      console.log('Master data seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding master data:', error);
  }
};
seedMasters();

// API Routes
// Prop Firms
app.get('/api/prop-firms', async (req, res) => {
  try {
    const firms = await PropFirm.find();
    res.json(firms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/prop-firms', async (req, res) => {
  const firm = new PropFirm(req.body);
  try {
    const savedFirm = await firm.save();
    res.status(201).json(savedFirm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/prop-firms/:id', async (req, res) => {
  try {
    const firm = await PropFirm.findByIdAndUpdate(
      req.params.id,
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

app.delete('/api/prop-firms/:id', async (req, res) => {
  try {
    const firm = await PropFirm.findByIdAndDelete(req.params.id);
    if (!firm) {
      return res.status(404).json({ message: 'Prop firm not found' });
    }
    res.json({ message: 'Prop firm deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await Account.find().populate('propFirmId');
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  const account = new Account(req.body);
  try {
    const savedAccount = await account.save();
    res.status(201).json(savedAccount);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
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

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndDelete(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Trades
app.get('/api/trades', async (req, res) => {
  try {
    const { accountId, firmId } = req.query;
    let filter = {};
    if (accountId) filter.accountId = accountId;
    if (firmId) filter.propFirmId = firmId;
    
    const trades = await Trade.find(filter)
      .populate('accountId')
      .populate('propFirmId');
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/trades', async (req, res) => {
  const trade = new Trade(req.body);
  try {
    const savedTrade = await trade.save();
    res.status(201).json(savedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/trades/:id', async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(
      req.params.id,
      req.body,
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

app.delete('/api/trades/:id', async (req, res) => {
  try {
    const trade = await Trade.findByIdAndDelete(req.params.id);
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    res.json({ message: 'Trade deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Masters
app.get('/api/masters', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};
    const masters = await Master.find(filter);
    res.json(masters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/masters', async (req, res) => {
  const master = new Master(req.body);
  try {
    const savedMaster = await master.save();
    res.status(201).json(savedMaster);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/masters/:id', async (req, res) => {
  try {
    const master = await Master.findByIdAndDelete(req.params.id);
    if (!master) {
      return res.status(404).json({ message: 'Master entry not found' });
    }
    res.json({ message: 'Master entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Missed Trades
app.get('/api/missed-trades', async (req, res) => {
  try {
    const { accountId } = req.query;
    let filter = {};
    if (accountId) filter.accountId = accountId;
    
    const missedTrades = await MissedTrade.find(filter)
      .populate('accountId')
      .sort({ date: -1 });
    res.json(missedTrades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/missed-trades', async (req, res) => {
  const missedTrade = new MissedTrade(req.body);
  try {
    const savedMissedTrade = await missedTrade.save();
    res.status(201).json(savedMissedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/missed-trades/:id', async (req, res) => {
  try {
    const missedTrade = await MissedTrade.findByIdAndUpdate(
      req.params.id,
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

app.delete('/api/missed-trades/:id', async (req, res) => {
  try {
    const missedTrade = await MissedTrade.findByIdAndDelete(req.params.id);
    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }
    res.json({ message: 'Missed trade deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});