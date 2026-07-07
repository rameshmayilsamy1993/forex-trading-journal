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
  entryTime: { type: String, default: '' },
  bias: { type: String, default: '' },
  tags: [{ type: String }],
  mood: { type: String, default: '' },
  importance: { type: String, default: '' },
  session: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  checklistItems: [{ label: { type: String }, checked: { type: Boolean, default: false } }],
  tradeIdeas: [{
    direction: { type: String },
    entry: { type: Number },
    sl: { type: Number },
    tp: { type: Number },
    rr: { type: Number },
    reason: { type: String },
    screenshot: { type: String },
    status: { type: String },
  }],
  entryModels: [{
    name: { type: String },
    type: { type: String },
    status: { type: String },
  }],
  sessionPlans: [{
    session: { type: String },
    expectedBehavior: { type: String },
    expectedLiquidity: { type: String },
    expectedEntry: { type: String },
  }],
  screenshots: [{
    url: { type: String },
    publicId: { type: String },
    timeframe: { type: String },
    caption: { type: String },
  }],
}, schemaOptions);

dailyReviewEntrySchema.index({ dailyReviewId: 1, createdAt: -1 });

module.exports = mongoose.model('DailyReviewEntry', dailyReviewEntrySchema);
