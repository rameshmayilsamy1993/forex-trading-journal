const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  initialBalance: Number,
  currentBalance: Number,
  currency: String,
  broker: String,
  leverage: String,
  accountType: String,
  propFirmId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropFirm' },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

module.exports = mongoose.model('Account', accountSchema);
