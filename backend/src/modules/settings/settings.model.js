const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
}, schemaOptions);

module.exports = mongoose.model('Settings', settingsSchema);
