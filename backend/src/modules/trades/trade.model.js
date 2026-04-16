const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

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

module.exports = { Trade: mongoose.model('Trade', tradeSchema), SSMT_TYPES };
