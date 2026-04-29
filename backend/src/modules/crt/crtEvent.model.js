const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const TIMEFRAMES = ['MONTHLY', 'WEEKLY', 'DAILY', 'H4'];
const CRT_OUTCOMES = ['YES', 'NO', 'NA'];
const REACTIONS = ['RESPECT', 'PARTIAL', 'FAILED', 'NA'];

const crtEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  timeframe: { type: String, enum: TIMEFRAMES, required: true },
  date: { type: Date, required: true },
  time: { type: String, default: '' },
  isCRT: { type: Boolean, default: false },
  reached50: { type: String, enum: CRT_OUTCOMES, default: 'NA' },
  reaction: { type: String, enum: REACTIONS, default: 'NA' },
  image: { type: String, default: '' },
  notes: { type: String, default: '' },
  monthKey: { type: String, required: true }
}, schemaOptions);

crtEventSchema.index({ userId: 1, pair: 1, timeframe: 1, monthKey: 1 });
crtEventSchema.index({ userId: 1, pair: 1, date: -1 });

module.exports = mongoose.model('CRTEvent', crtEventSchema);