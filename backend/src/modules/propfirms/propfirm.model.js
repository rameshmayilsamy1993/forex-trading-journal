const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const propFirmSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  color: String,
  challengeType: String,
  targetProfit: Number,
  maxLoss: Number,
  maxDailyLoss: Number,
  evaluationPeriod: Number,
  profitTarget: Number,
  profitSplit: Number,
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

module.exports = mongoose.model('PropFirm', propFirmSchema);
