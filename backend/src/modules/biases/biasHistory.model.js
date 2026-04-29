const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const CISD_VALUES = ['BULLISH', 'BEARISH', 'NEUTRAL'];

const biasHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  date: { type: Date, required: true },

  // CISD Inputs (the raw inputs)
  h1Cisd: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },
  h4Cisd: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },
  dailyCisd: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },

  // Derived HTF Biases
  dailyBias: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },
  weeklyBias: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },
  monthlyBias: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },

  // Shift tracking
  dailyShifted: { type: Boolean, default: false },
  weeklyShifted: { type: Boolean, default: false },
  monthlyShifted: { type: Boolean, default: false },

  // Previous biases (for shift detection)
  previousDailyBias: { type: String, enum: CISD_VALUES },
  previousWeeklyBias: { type: String, enum: CISD_VALUES },
  previousMonthlyBias: { type: String, enum: CISD_VALUES },

  notes: { type: String, default: '' }
}, schemaOptions);

biasHistorySchema.index({ userId: 1, pair: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('BiasHistory', biasHistorySchema);