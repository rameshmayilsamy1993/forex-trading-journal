const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
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
  pair: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  status: { type: String, enum: ['OPEN', 'CLOSED'] },
  entryPrice: Number,
  exitPrice: Number,
  lotSize: Number,
  commission: Number,
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
    const trade = new Trade({ ...req.body, userId: req.session.userId });
    const savedTrade = await trade.save();
    res.status(201).json(savedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/trades/:id', isAuthenticated, async (req, res) => {
  try {
    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
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
