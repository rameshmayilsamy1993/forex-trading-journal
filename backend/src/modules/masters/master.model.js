const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const checklistItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, { _id: false });

const strategyChecklistSchema = new mongoose.Schema({
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, { _id: false });

const masterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['strategy', 'keyLevel', 'session'] },
  checklist: [checklistItemSchema],
  isActive: { type: Boolean, default: true }
}, schemaOptions);

module.exports = mongoose.model('Master', masterSchema);
