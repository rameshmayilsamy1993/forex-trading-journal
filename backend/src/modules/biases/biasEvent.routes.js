const express = require('express');
const router = express.Router();
const { createEvent, getEvents, getEventsByPair, getLatestEvents, getTimeline, remove } = require('./biasEvent.controller');

router.post('/event', createEvent);
router.get('/events', getEvents);
router.get('/events/:pair', getEventsByPair);
router.get('/latest-events', getLatestEvents);
router.get('/timeline', getTimeline);
router.delete('/:id', remove);

module.exports = router;