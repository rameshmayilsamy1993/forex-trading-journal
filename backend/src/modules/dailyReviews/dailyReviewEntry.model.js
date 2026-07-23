const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const dailyReviewEntrySchema = new mongoose.Schema({
  dailyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyReview', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entryTitle: { type: String, default: '' },
  comment: { type: String, default: '' },
  images: [{
    url: { type: String },
    publicId: { type: String },
    caption: { type: String, default: '' },
  }],
  bias: { type: String, default: '' },
}, schemaOptions);

dailyReviewEntrySchema.index({ dailyReviewId: 1, createdAt: -1 });

module.exports = mongoose.model('DailyReviewEntry', dailyReviewEntrySchema);