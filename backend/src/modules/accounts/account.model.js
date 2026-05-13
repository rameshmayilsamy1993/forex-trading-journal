const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const ACCOUNT_STATUS = ['ACTIVE', 'BREACHED', 'PASSED_1', 'PASSED_2', 'FUNDED', 'DISABLED'];

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
  status: { type: String, enum: ACCOUNT_STATUS, default: 'ACTIVE' },
  breachedAt: Date,
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

module.exports = { Account: mongoose.model('Account', accountSchema), ACCOUNT_STATUS };
