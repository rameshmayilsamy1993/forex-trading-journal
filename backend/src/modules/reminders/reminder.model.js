const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  pair: { type: String, default: '' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  repeatType: { 
    type: String, 
    enum: ['ONETIME', 'DAILY'], 
    default: 'ONETIME' 
  },
  reminders: {
    before10Min: { type: Boolean, default: true },
    before5Min: { type: Boolean, default: true },
    onTime: { type: Boolean, default: true }
  },
  sound: { type: String, default: 'default' },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastTriggeredAt: { type: Date },
  triggeredAlerts: {
    before10Min: { type: Boolean, default: false },
    before5Min: { type: Boolean, default: false },
    onTime: { type: Boolean, default: false }
  },
  lastResetDate: { type: String }
}, {
  ...schemaOptions,
  timestamps: true
});

const Reminder = mongoose.models.Reminder 
  ? mongoose.models.Reminder 
  : mongoose.model('Reminder', reminderSchema);

const pendingNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reminderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reminder', required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  sound: { type: String, default: 'default' },
  alertType: { type: String, enum: ['before10Min', 'before5Min', 'onTime'], required: true },
  triggeredAt: { type: Date, required: true },
  isRead: { type: Boolean, default: false }
}, {
  ...schemaOptions,
  timestamps: true
});

const PendingNotification = mongoose.models.PendingNotification 
  ? mongoose.models.PendingNotification 
  : mongoose.model('PendingNotification', pendingNotificationSchema);

module.exports = { Reminder, PendingNotification };