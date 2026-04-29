const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const LIQUIDITY_OPTIONS = ['NONE', 'HIGH_TAKEN', 'LOW_TAKEN', 'BOTH_TAKEN'];

const liquiditySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },

  // Liquidity states for each timeframe
  monthlyLiquidity: { 
    type: String, 
    enum: LIQUIDITY_OPTIONS,
    default: 'NONE'
  },
  weeklyLiquidity: { 
    type: String, 
    enum: LIQUIDITY_OPTIONS,
    default: 'NONE'
  },
  dailyLiquidity: { 
    type: String, 
    enum: LIQUIDITY_OPTIONS,
    default: 'NONE'
  },

  // Insights
  monthlyInsight: { type: String, default: '' },
  weeklyInsight: { type: String, default: '' },
  dailyInsight: { type: String, default: '' },

  notes: { type: String, default: '' }
}, schemaOptions);

liquiditySchema.index({ userId: 1, pair: 1, createdAt: -1 });

module.exports = mongoose.model('Liquidity', liquiditySchema);