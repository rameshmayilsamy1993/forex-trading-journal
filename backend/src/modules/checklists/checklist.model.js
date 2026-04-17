const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const checklistItemResultSchema = new mongoose.Schema({
  label: { type: String, required: true },
  checked: { type: Boolean, default: false },
  required: { type: Boolean, default: false }
}, { _id: false });

const checklistSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String },
  strategyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Master' },
  strategyName: { type: String, required: true },
  items: [checklistItemResultSchema],
  isValid: { type: Boolean, required: true },
  missingRequired: [String],
  notes: String,
  linkedTrades: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trade' }],
  status: { type: String, enum: ['ACTIVE', 'LINKED'], default: 'ACTIVE' },
  pair: String,
  tradeType: String,
  entryPrice: Number
}, {
  ...schemaOptions,
  timestamps: true
});

checklistSessionSchema.pre('save', async function(next) {
  if (!this.sessionId) {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    
    const timeStr =
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
    
    const random = Math.floor(100 + Math.random() * 900);
    this.sessionId = `CHK-${dateStr}-${timeStr}-${random}`;
  }
  next();
});

const ChecklistSession = mongoose.models.ChecklistSession 
  ? mongoose.models.ChecklistSession 
  : mongoose.model('ChecklistSession', checklistSessionSchema);

module.exports = ChecklistSession;
