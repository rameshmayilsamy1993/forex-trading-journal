const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const dailyReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weeklyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyReview' },
  pair: { type: String, required: true },
  date: { type: String, required: true },
  dayOfWeek: { type: String },
  bias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: 'Neutral' },
  expectedDirection: { type: String, default: '' },
  htfBias: { type: String, default: '' },
  crtDirection: { type: String, default: '' },
  premium: { type: String, default: '' },
  discount: { type: String, default: '' },
  liquidityDirection: { type: String, default: '' },
  pdh: { type: Number },
  pdl: { type: Number },
  pdo: { type: Number },
  previousRange: { type: Number },
  previousClose: { type: Number },
  previousHigh: { type: Number },
  previousLow: { type: Number },
  adr: { type: Number },
  expansion: { type: String, default: '' },
  narrative: { type: String, default: '' },
  liquidityTarget: { type: String, default: '' },
  expectedSweep: { type: String, default: '' },
  expectedCrt: { type: String, default: '' },
  expectedSmt: { type: String, default: '' },
  expectedSession: { type: String, default: '' },
  killZone: { type: String, default: '' },
  biasConfidence: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
}, schemaOptions);

dailyReviewSchema.index({ userId: 1, pair: 1, date: 1 }, { unique: true });
dailyReviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DailyReview', dailyReviewSchema);
