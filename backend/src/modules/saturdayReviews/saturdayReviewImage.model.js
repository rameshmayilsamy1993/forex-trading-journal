const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const saturdayReviewImageSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaturdayReview', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaturdayReviewEvent', required: true },
  image: { type: String, required: true },
  publicId: { type: String, default: '' },
  caption: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
}, schemaOptions);

saturdayReviewImageSchema.index({ reviewId: 1, eventId: 1, sortOrder: 1 });
saturdayReviewImageSchema.index({ eventId: 1 });

module.exports = mongoose.model('SaturdayReviewImage', saturdayReviewImageSchema);
