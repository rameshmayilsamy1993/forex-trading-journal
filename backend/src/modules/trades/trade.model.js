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
  rrAchievable: { type: String, enum: ['1:1','1:2','1:3','1:4','1:5','1:6','1:7','1:8','1:9','1:10', null], default: null },
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
  checklistId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChecklistSession' },
  checklistSession: String,
  isBreachedAccountTrade: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, accountId: 1 });

module.exports = { Trade: mongoose.model('Trade', tradeSchema), SSMT_TYPES };
