const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const weeklyReviewEntrySchema = new mongoose.Schema({
  weeklyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyReview', required: true },
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
  checklistItems: [{ label: { type: String }, checked: { type: Boolean, default: false } }],
}, schemaOptions);

weeklyReviewEntrySchema.index({ weeklyReviewId: 1, createdAt: -1 });

module.exports = mongoose.model('WeeklyReviewEntry', weeklyReviewEntrySchema);
