const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const BIAS_OPTIONS = ['BULLISH', 'BEARISH', 'NEUTRAL'];

const biasSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  monthlyBias: { 
    type: String, 
    enum: BIAS_OPTIONS,
    default: 'NEUTRAL'
  },
  weeklyBias: { 
    type: String, 
    enum: BIAS_OPTIONS,
    default: 'NEUTRAL'
  },
  dailyBias: { 
    type: String, 
    enum: BIAS_OPTIONS,
    default: 'NEUTRAL'
  },
  notes: { type: String, default: '' }
}, schemaOptions);

biasSchema.index({ userId: 1, pair: 1 }, { unique: true });

module.exports = mongoose.model('Bias', biasSchema);