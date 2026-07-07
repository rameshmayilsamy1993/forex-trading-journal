const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const monthlyReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  title: { type: String, default: '' },
  bias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: 'Neutral' },
  summary: { type: String, default: '' },
  imagePath: { type: String, default: '' },
  imageCaption: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
}, schemaOptions);

monthlyReviewSchema.index({ userId: 1, pair: 1, month: 1, year: 1 }, { unique: true });
monthlyReviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MonthlyReview', monthlyReviewSchema);
