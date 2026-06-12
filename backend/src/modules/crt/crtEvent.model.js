const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const TIMEFRAMES = ['3MONTH', 'MONTHLY', 'WEEKLY', 'DAILY', 'H4', 'H1'];
const CRT_OUTCOMES = ['YES', 'NO', 'NA'];
const REACTIONS = ['RESPECT', 'PARTIAL', 'FAILED', 'NA'];
const KEY_LEVEL_TYPES = ['PMH', 'PML', 'PWH', 'PWL', 'PDH', 'PDL', 'EQH', 'EQL', 'FVG', 'IFVG', 'Order Block', 'Breaker', 'Custom'];
const CRT_DIRECTIONS = ['Strong Bull CRT', 'Bull CRT', 'No CRT', 'Bear CRT', 'Strong Bear CRT'];
const CRT_STATUSES = ['Waiting', 'Active', 'Continuing', 'Entry Ready', 'Completed', 'Invalidated'];
const CRT_RANGE_RESPECTED = ['Yes', 'No', 'Not Yet Tested'];

const crtEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  timeframe: { type: String, enum: TIMEFRAMES, required: true },
  date: { type: Date, required: true },
  time: { type: String, default: '' },

  // Legacy fields (kept for backward compatibility)
  isCRT: { type: Boolean, default: false },
  reached50: { type: String, enum: CRT_OUTCOMES, default: 'NA' },
  reaction: { type: String, enum: REACTIONS, default: 'NA' },
  image: { type: String, default: '' },

  // New fields
  keyLevelExists: { type: Boolean, default: false },
  keyLevelType: { type: String, default: '' },
  customKeyLevel: { type: String, default: '' },
  crtPlaying: { type: Boolean, default: false },
  crtDirection: { type: String, default: 'No CRT' },
  crtStatus: { type: String, default: 'Waiting' },
  crtRangeRespected: { type: String, default: 'Not Yet Tested' },
  imagePath: { type: String, default: '' },

  notes: { type: String, default: '' },
  monthKey: { type: String, required: true },
  quarterKey: { type: String, default: '' },
  statusHistory: { type: [{ status: String, date: String }], default: [] }
}, schemaOptions);

crtEventSchema.index({ userId: 1, pair: 1, timeframe: 1, monthKey: 1 });
crtEventSchema.index({ userId: 1, pair: 1, date: -1 });
crtEventSchema.index({ userId: 1, crtStatus: 1 });
crtEventSchema.index({ userId: 1, crtDirection: 1 });

module.exports = mongoose.model('CRTEvent', crtEventSchema);
