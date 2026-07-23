const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const dailyReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weeklyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyReview' },
  pair: { type: String, required: true },
  date: { type: String, required: true },
  dayOfWeek: { type: String },
  bias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: 'Neutral' },
  crtDirection: { type: String, default: '' },
  narrative: { type: String, default: '' },
}, schemaOptions);

dailyReviewSchema.index({ userId: 1, pair: 1, date: 1 }, { unique: true });
dailyReviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DailyReview', dailyReviewSchema);
