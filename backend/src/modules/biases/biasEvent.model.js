const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const CISD_VALUES = ['BULLISH', 'BEARISH', 'NEUTRAL'];

const biasEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  
  // CISD Input that triggered this event
  h1Cisd: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },
  h4Cisd: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },
  dailyCisd: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },

  // Derived HTF Biases (3-layer: Monthly, Weekly, Daily)
  monthlyBias: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },
  weeklyBias: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },
  dailyBias: { type: String, enum: CISD_VALUES, default: 'NEUTRAL' },

  // Shift tracking (only Monthly, Weekly, Daily)
  monthlyShifted: { type: Boolean, default: false },
  weeklyShifted: { type: Boolean, default: false },
  dailyShifted: { type: Boolean, default: false },

  // Previous values (for display and comparison)
  previousMonthlyBias: { type: String, enum: CISD_VALUES },
  previousWeeklyBias: { type: String, enum: CISD_VALUES },
  previousDailyBias: { type: String, enum: CISD_VALUES },

  // Derivation explanation
  derivation: {
    monthlyExplanation: { type: String, default: '' },
    weeklyExplanation: { type: String, default: '' },
    dailyExplanation: { type: String, default: '' },
  },

  notes: { type: String, default: '' }
}, schemaOptions);

biasEventSchema.index({ userId: 1, pair: 1, createdAt: -1 });

module.exports = mongoose.model('BiasEvent', biasEventSchema);