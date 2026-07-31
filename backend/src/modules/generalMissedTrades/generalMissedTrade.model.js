const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');
const { SSMT_TYPES } = require('../trades/trade.model');

const generalMissedTradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  propFirmId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropFirm' },
  pair: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  status: { type: String, enum: ['OPEN', 'CLOSED'] },
  entryPrice: Number,
  exitPrice: Number,
  lotSize: Number,
  commission: { type: Number, default: 0 },
  swap: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  realPL: { type: Number, default: 0 },
  stopLoss: Number,
  takeProfit: Number,
  riskRewardRatio: Number,
  rrAchievable: { type: String, enum: ['1:1','1:2','1:3','1:4','1:5','1:6','1:7','1:8','1:9','1:10', null], default: null },
  notes: String,
  entryDate: Date,
  entryTime: String,
  exitDate: Date,
  exitTime: String,
  session: String,
  strategy: String,
  keyLevel: String,
  highLowTime: String,
  ssmtType: { type: String, enum: SSMT_TYPES, default: 'NO' },
  smt: { type: String, enum: ['No', 'Yes with GBPUSD', 'Yes with EURUSD', 'Yes with DXY'], default: 'No' },
  model1: { type: String, enum: ['Yes (Both EUR and GBP)', 'Yes (EUR)', 'Yes (GBP)', 'No'], default: 'Yes (EUR)' },
  beforeScreenshot: String,
  afterScreenshot: String,
  reason: { type: String, required: true },
  missedStatus: { type: String, enum: ['PLANNED', 'MISSED', 'EXECUTED_LATER'], default: 'MISSED' },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

generalMissedTradeSchema.index({ userId: 1, entryDate: -1 });

module.exports = mongoose.model('GeneralMissedTrade', generalMissedTradeSchema);
