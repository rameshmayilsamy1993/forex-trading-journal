const mongoose = require('mongoose');
const { Reminder, PendingNotification } = require('./reminder.model');

const validateObjectId = (id, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid ID format' });
    return false;
  }
  return true;
};

const getAll = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ userId: req.session.userId })
      .sort({ createdAt: -1 });
    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id, res)) return;
    
    const reminder = await Reminder.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { title, pair, date, time, repeatType, reminders, sound, notes, isActive } = req.body;
    
    const reminder = new Reminder({
      userId: req.session.userId,
      title,
      pair: pair || '',
      date,
      time,
      repeatType: repeatType || 'ONETIME',
      reminders: reminders || {
        before10Min: true,
        before5Min: true,
        onTime: true
      },
      sound: sound || 'default',
      notes: notes || '',
      isActive: isActive !== undefined ? isActive : true
    });
    
    const saved = await reminder.save();
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { title, pair, date, time, repeatType, reminders, sound, notes, isActive } = req.body;
    
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      {
        ...(title && { title }),
        ...(pair !== undefined && { pair }),
        ...(date && { date }),
        ...(time && { time }),
        ...(repeatType && { repeatType }),
        ...(reminders && { reminders }),
        ...(sound && { sound }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id, res)) return;
    
    const reminder = await Reminder.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    next(error);
  }
};

const toggleActive = async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id, res)) return;
    
    const reminder = await Reminder.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    reminder.isActive = !reminder.isActive;
    reminder.triggeredAlerts = {
      before10Min: false,
      before5Min: false,
      onTime: false
    };
    reminder.lastResetDate = new Date().toISOString().split('T')[0];
    
    await reminder.save();
    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

const markTriggered = async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id, res)) return;
    
    const { alertType } = req.body;
    
    const reminder = await Reminder.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    if (reminder.triggeredAlerts) {
      reminder.triggeredAlerts[alertType] = true;
    }
    
    await reminder.save();
    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

const resetAlerts = async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id, res)) return;
    
    const reminder = await Reminder.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    reminder.triggeredAlerts = {
      before10Min: false,
      before5Min: false,
      onTime: false
    };
    reminder.lastResetDate = new Date().toISOString().split('T')[0];
    
    await reminder.save();
    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  toggleActive,
  markTriggered,
  resetAlerts,
  getPendingNotifications,
  markNotificationRead,
  getUpcoming
};

async function getPendingNotifications(req, res, next) {
  try {
    const notifications = await PendingNotification.find({ 
      userId: req.session.userId
    }).sort({ triggeredAt: -1 }).limit(50);

    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const reminder = await Reminder.findById(notification.reminderId).lean();
        const now = new Date();
        const triggeredAt = new Date(notification.triggeredAt);
        const minutesUntil = Math.floor((triggeredAt.getTime() - now.getTime()) / 60000);
        
        return {
          ...notification.toObject(),
          reminderTitle: reminder?.title || 'Unknown',
          reminderPair: reminder?.pair || '',
          minutesUntil
        };
      })
    );
    
    res.json(enrichedNotifications);
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    if (!validateObjectId(req.params.notificationId, res)) return;
    
    const notification = await PendingNotification.findOneAndUpdate(
      { _id: req.params.notificationId, userId: req.session.userId },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    next(error);
  }
}

async function getUpcoming(req, res, next) {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const today = now.toISOString().split('T')[0];
    
    const reminders = await Reminder.find({ 
      userId: req.session.userId,
      isActive: true
    });
    
    const upcoming = reminders
      .map(reminder => {
        const [hours, minutes] = reminder.time.split(':');
        const reminderMinutes = parseInt(hours) * 60 + parseInt(minutes);
        
        let checkDate = reminder.date;
        const isRecurring = reminder.repeatType === 'DAILY';
        
        if (isRecurring && today >= reminder.date) {
          checkDate = today;
        }
        
        if (!isRecurring && today > reminder.date) {
          return null;
        }
        
        const diffMinutes = reminderMinutes - currentMinutes;
        
        return {
          ...reminder.toObject(),
          nextTriggerDate: checkDate,
          minutesUntil: diffMinutes
        };
      })
      .filter(r => r && r.minutesUntil >= -60 && r.minutesUntil <= 1440)
      .sort((a, b) => a.minutesUntil - b.minutesUntil);
    
    res.json(upcoming);
  } catch (error) {
    next(error);
  }
}