const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const weeklyReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  monthlyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyReview' },
  pair: { type: String, required: true },
  weekNumber: { type: Number, required: true, min: 1, max: 53 },
  year: { type: Number, required: true },
  weekStart: { type: String, default: '' },
  weekEnd: { type: String, default: '' },
  bias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: 'Neutral' },
  theme: { type: String, default: '' },
  expectedDirection: { type: String, default: '' },
  weeklyStory: { type: String, default: '' },
  institutionalNarrative: { type: String, default: '' },
  marketStructure: { type: String, default: '' },
  pwh: { type: Number },
  pwl: { type: Number },
  weeklyOpen: { type: Number },
  weeklyFvg: { type: String, default: '' },
  weeklyIfvg: { type: String, default: '' },
  weeklyOb: { type: String, default: '' },
  weeklyBreaker: { type: String, default: '' },
  eqh: { type: Number },
  eql: { type: Number },
  liquidity: { type: String, default: '' },
  premium: { type: String, default: '' },
  discount: { type: String, default: '' },
  mainTarget: { type: Number },
  mainLiquidity: { type: String, default: '' },
  weeklyCrt: { type: String, default: '' },
  weeklySmt: { type: String, default: '' },
  weeklyCisd: { type: String, default: '' },
  expectedManipulation: { type: String, default: '' },
  expansionDirection: { type: String, default: '' },
  asianSession: { type: String, default: '' },
  londonSession: { type: String, default: '' },
  newYorkSession: { type: String, default: '' },
  economicEvents: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
}, schemaOptions);

weeklyReviewSchema.index({ userId: 1, pair: 1, weekNumber: 1, year: 1 }, { unique: true });
weeklyReviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WeeklyReview', weeklyReviewSchema);
