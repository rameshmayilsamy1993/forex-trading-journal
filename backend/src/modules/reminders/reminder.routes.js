const express = require('express');
const router = express.Router();
const { 
  getAll, getById, create, update, remove, 
  toggleActive, markTriggered, resetAlerts,
  getPendingNotifications, markNotificationRead, getUpcoming
} = require('./reminder.controller');

router.get('/notifications', getPendingNotifications);
router.post('/notifications/:notificationId/read', markNotificationRead);
router.get('/upcoming', getUpcoming);
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/:id/toggle', toggleActive);
router.post('/:id/mark-triggered', markTriggered);
router.post('/:id/reset-alerts', resetAlerts);

module.exports = router;