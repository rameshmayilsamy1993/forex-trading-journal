const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const DIRECTION_OPTIONS = ['BULLISH', 'BEARISH'];
const H4_CANDLE_TIMES = ['17:00', '21:00', '01:00', '05:00', '09:00', '13:00'];

const candleSchema = new mongoose.Schema({
  time: { type: String, required: true },
  direction: { type: String, enum: DIRECTION_OPTIONS, default: 'BULLISH' },
  prevHighTaken: { type: Boolean, default: false },
  prevLowTaken: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, { _id: false });

const h4Schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  date: { type: Date, required: true },
  candles: [candleSchema],
  notes: { type: String, default: '' }
}, schemaOptions);

h4Schema.index({ userId: 1, pair: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('H4', h4Schema);