const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');
const { SSMT_TYPES } = require('../trades/trade.model');

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

module.exports = mongoose.model('MissedTrade', missedTradeSchema);
