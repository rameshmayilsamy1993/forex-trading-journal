const cron = require('node-cron');
const { Reminder, PendingNotification } = require('../modules/reminders/reminder.model');

let activeReminders = [];

const loadActiveReminders = async () => {
  try {
    const reminders = await Reminder.find({ isActive: true });
    activeReminders = reminders;
    console.log(`[ReminderScheduler] Loaded ${activeReminders.length} active reminders`);
  } catch (error) {
    console.error('[ReminderScheduler] Error loading reminders:', error);
  }
};

const getReminderTime = (date, time) => {
  const [hours, minutes] = time.split(':');
  const reminderDate = new Date(date);
  reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return reminderDate;
};

const shouldTrigger = (reminder, alertType) => {
  const reminderTime = getReminderTime(reminder.date, reminder.time);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  let checkDate = reminder.date;
  let isRecurring = reminder.repeatType === 'DAILY';
  
  if (isRecurring) {
    if (today >= reminder.date) {
      const reminderDateTime = getReminderTime(today, reminder.time);
      
      if (reminder.lastResetDate !== today) {
        return { shouldTrigger: true, date: today };
      }
    }
  }
  
  if (today > reminder.date && !isRecurring) {
    return { shouldTrigger: false, date: null };
  }
  
  if (isRecurring) {
    checkDate = today;
  }
  
  const checkTime = getReminderTime(checkDate, reminder.time);
  const diffMs = checkTime.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (reminder.triggeredAlerts && reminder.triggeredAlerts[alertType]) {
    return { shouldTrigger: false, date: checkDate };
  }
  
  switch (alertType) {
    case 'before10Min':
      return { shouldTrigger: diffMinutes === 10, date: checkDate };
    case 'before5Min':
      return { shouldTrigger: diffMinutes === 5, date: checkDate };
    case 'onTime':
      return { shouldTrigger: diffMinutes <= 0 && diffMinutes > -1, date: checkDate };
    default:
      return { shouldTrigger: false, date: checkDate };
  }
};

const checkReminders = async () => {
  try {
    const reminders = await Reminder.find({ isActive: true });
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (const reminder of reminders) {
      const [hours, minutes] = reminder.time.split(':');
      const reminderMinutes = parseInt(hours) * 60 + parseInt(minutes);
      
      const today = now.toISOString().split('T')[0];
      let checkDate = reminder.date;
      let isRecurring = reminder.repeatType === 'DAILY';
      
      if (isRecurring) {
        if (today >= reminder.date) {
          checkDate = today;
        } else {
          continue;
        }
      }
      
      if (!isRecurring && today > reminder.date) {
        continue;
      }
      
      const diffMinutes = reminderMinutes - currentMinutes;
      
      if (reminder.reminders && reminder.reminders.before10Min && !reminder.triggeredAlerts?.before10Min) {
        if (diffMinutes === 10) {
          await sendNotification(reminder, 'before10Min', 10);
        }
      }
      
      if (reminder.reminders && reminder.reminders.before5Min && !reminder.triggeredAlerts?.before5Min) {
        if (diffMinutes === 5) {
          await sendNotification(reminder, 'before5Min', 5);
        }
      }
      
      if (reminder.reminders && reminder.reminders.onTime && !reminder.triggeredAlerts?.onTime) {
        if (diffMinutes === 0 || (diffMinutes < 0 && diffMinutes > -2)) {
          await sendNotification(reminder, 'onTime', 0);
        }
      }
      
      if (isRecurring && currentMinutes > reminderMinutes + 1) {
        if (reminder.lastResetDate !== today) {
          await Reminder.findByIdAndUpdate(reminder._id, {
            lastResetDate: today,
            triggeredAlerts: {
              before10Min: false,
              before5Min: false,
              onTime: false
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('[ReminderScheduler] Error checking reminders:', error);
  }
};

const sendNotification = async (reminder, alertType, minutesBefore) => {
  try {
    const title = minutesBefore === 0 
      ? `FX Journal Reminder: ${reminder.title}`
      : `${reminder.title} in ${minutesBefore} minutes`;
    
    const body = reminder.pair 
      ? `${reminder.pair} - ${reminder.notes || 'Time for your trading reminder!'}`
      : reminder.notes || 'Time for your trading reminder!';
    
    const notification = new PendingNotification({
      userId: reminder.userId,
      reminderId: reminder._id,
      title,
      body,
      sound: reminder.sound,
      alertType,
      triggeredAt: new Date()
    });
    await notification.save();
    
    const updateField = `triggeredAlerts.${alertType}`;
    await Reminder.findByIdAndUpdate(reminder._id, {
      [updateField]: true,
      lastTriggeredAt: new Date()
    });
    
    console.log(`[ReminderScheduler] Created ${alertType} notification for: ${reminder.title}`);
  } catch (error) {
    console.error('[ReminderScheduler] Error sending notification:', error);
  }
};

let schedulerTask = null;

const startScheduler = () => {
  loadActiveReminders();
  
  schedulerTask = cron.schedule('* * * * *', async () => {
    await checkReminders();
  });
  
  console.log('[ReminderScheduler] Scheduler started - checking every minute');
};

const stopScheduler = () => {
  if (schedulerTask) {
    schedulerTask.stop();
    console.log('[ReminderScheduler] Scheduler stopped');
  }
};

const refreshReminders = () => {
  loadActiveReminders();
};

module.exports = {
  startScheduler,
  stopScheduler,
  refreshReminders
};