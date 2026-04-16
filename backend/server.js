const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const { connectWithRetry } = require('./src/config/db');
const { errorMiddleware, notFoundMiddleware } = require('./src/middleware/errorMiddleware');
const { isAuthenticated } = require('./src/middleware/authMiddleware');

const { seedAdminUser } = require('./src/modules/users/user.controller');
const { convertMT5 } = require('./src/modules/trades/tradeImport.controller');
const multer = require('multer');

const memoryStorage = multer.memoryStorage();
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

const userRoutes = require('./src/modules/users/user.routes');
const propFirmRoutes = require('./src/modules/propfirms/propfirm.routes');
const accountRoutes = require('./src/modules/accounts/account.routes');
const tradeRoutes = require('./src/modules/trades/trade.routes');
const masterRoutes = require('./src/modules/masters/master.routes');
const missedTradeRoutes = require('./src/modules/missedTrades/missedTrade.routes');
const lossAnalysisRoutes = require('./src/modules/lossAnalysis/lossAnalysis.routes');
const settingsRoutes = require('./src/modules/settings/settings.routes');
const uploadRoutes = require('./src/modules/upload/upload.routes');

const app = express();
const PORT = process.env.PORT || 5000;

const SESSION_SECRET = process.env.SESSION_SECRET || 'fx-journal-secret-key-change-in-production';
const isProduction = process.env.NODE_ENV === 'production';

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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    authenticated: !!req.session?.userId
  });
});

app.use('/api/auth', userRoutes);
app.use('/api/prop-firms', isAuthenticated, propFirmRoutes);
app.use('/api/accounts', isAuthenticated, accountRoutes);
app.use('/api/trades', isAuthenticated, tradeRoutes);
app.use('/api/masters', isAuthenticated, masterRoutes);
app.use('/api/missed-trades', isAuthenticated, missedTradeRoutes);
app.use('/api/loss-analysis', isAuthenticated, lossAnalysisRoutes);
app.use('/api/settings', isAuthenticated, settingsRoutes);
app.use('/api/upload', isAuthenticated, uploadRoutes);
app.post('/api/import/convert-mt5', isAuthenticated, uploadCSV.single('file'), convertMT5);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const startServer = async () => {
  await connectWithRetry();
  await seedAdminUser();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();
