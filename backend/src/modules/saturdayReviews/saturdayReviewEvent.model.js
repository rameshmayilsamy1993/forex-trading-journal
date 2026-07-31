const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const EVENT_TYPES = ['weekly_high', 'weekly_low', 'candle', 'weekly_high_origin', 'weekly_low_origin', 'ote'];

const saturdayReviewEventSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaturdayReview', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventType: { type: String, enum: EVENT_TYPES, required: true },
  day: { type: String, default: '' },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  category: { type: String, enum: ['Weekly', 'Daily'], default: '' },
  keyLevel: { type: String, default: '' },
  answer: { type: String, default: '' },
  notes: { type: String, default: '' },
}, schemaOptions);

saturdayReviewEventSchema.index({ reviewId: 1, eventType: 1 }, { unique: true });
saturdayReviewEventSchema.index({ userId: 1 });

module.exports = mongoose.model('SaturdayReviewEvent', saturdayReviewEventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
