const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const saturdayReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  weekStart: { type: String, required: true },
  weekEnd: { type: String, required: true },
  reviewDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  overallBias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: '' },
  candleType: { type: String, default: '' },
  highOrLowFirst: { type: String, default: '' },
  expansionDirection: { type: String, default: '' },
  oteTouched: { type: String, enum: ['Yes', 'No'], default: '' },
  oteDirection: { type: String, enum: ['Bullish', 'Bearish'], default: '' },
  oteReaction: { type: String, enum: ['Yes', 'No', 'Partial'], default: '' },
  marketQuality: { type: Number, min: 1, max: 5 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: '' },
  confidence: { type: Number, min: 1, max: 10 },
  weeklyStory: { type: String, default: '' },
  lessons: { type: [{ label: String, checked: Boolean }], default: [] },
  lessonsNotes: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Completed'], default: 'Draft' },
  lastAiUpdateAt: { type: Date },
}, schemaOptions);

saturdayReviewSchema.index({ userId: 1, pair: 1, weekStart: 1 }, { unique: true });
saturdayReviewSchema.index({ userId: 1, weekStart: -1 });

module.exports = mongoose.model('SaturdayReview', saturdayReviewSchema);
