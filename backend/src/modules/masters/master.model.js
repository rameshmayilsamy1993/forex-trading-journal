const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const masterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['strategy', 'keyLevel', 'session'] }
}, schemaOptions);

module.exports = mongoose.model('Master', masterSchema);
