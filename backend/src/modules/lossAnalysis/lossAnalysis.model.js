const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const LOSS_REASON_TYPES = [
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

module.exports = { LossAnalysis, ALL_LOSS_REASONS, VALID_LOSS_REASONS };
