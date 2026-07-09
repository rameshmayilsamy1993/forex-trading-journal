const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const monthlyReviewEntrySchema = new mongoose.Schema({
  monthlyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyReview', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entryTitle: { type: String, default: '' },
  comment: { type: String, default: '' },
  images: [{
    url: { type: String },
    publicId: { type: String },
    caption: { type: String, default: '' },
  }],
  entryTime: { type: String, default: '' },
  bias: { type: String, default: '' },
  tags: [{ type: String }],
  mood: { type: String, default: '' },
  importance: { type: String, default: '' },
  session: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
}, schemaOptions);

monthlyReviewEntrySchema.index({ monthlyReviewId: 1, createdAt: -1 });

module.exports = mongoose.model('MonthlyReviewEntry', monthlyReviewEntrySchema);
