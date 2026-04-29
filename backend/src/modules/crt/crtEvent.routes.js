const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isAuthenticated } = require('../../middleware/authMiddleware');
const CRTEvent = require('./crtEvent.model');

const getAll = async (req, res, next) => {
  try {
    const { pair, month, timeframe } = req.query;
    
    const filter = { userId: req.session.userId };
    if (pair) filter.pair = pair;
    if (month) filter.monthKey = month;
    if (timeframe) filter.timeframe = timeframe;

    const events = await CRTEvent.find(filter)
      .sort({ date: -1, time: -1 })
      .select('_id pair timeframe date time isCRT reached50 reaction image notes monthKey createdAt');

    res.json(events);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { pair, timeframe, date, time, isCRT, reached50, reaction, image, notes } = req.body;

    if (!pair || !timeframe || !date) {
      return res.status(400).json({ message: 'Pair, timeframe, and date are required' });
    }

    if (isCRT === true) {
      if (!reached50) {
        return res.status(400).json({ message: 'reached50 is required when isCRT is true' });
      }
      if (!reaction) {
        return res.status(400).json({ message: 'reaction is required when isCRT is true' });
      }
    }

    const eventDate = new Date(date);
    const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;

    const existingCRT = await CRTEvent.findOne({
      userId: req.session.userId,
      pair,
      timeframe: 'MONTHLY',
      monthKey
    });

    if (timeframe === 'MONTHLY' && existingCRT) {
      return res.status(400).json({ 
        message: 'MONTHLY CRT already exists for this month. Please edit the existing entry.' 
      });
    }

    const crtEvent = new CRTEvent({
      userId: req.session.userId,
      pair,
      timeframe,
      date: eventDate,
      time: time || '',
      isCRT: isCRT || false,
      reached50: isCRT ? reached50 : 'NA',
      reaction: isCRT ? reaction : 'NA',
      image: image || '',
      notes: notes || '',
      monthKey
    });

    const saved = await crtEvent.save();
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const { date, time, isCRT, reached50, reaction, image, notes } = req.body;

    const event = await CRTEvent.findOne({ _id: id, userId: req.session.userId });
    if (!event) {
      return res.status(404).json({ message: 'CRT event not found' });
    }

    if (isCRT === true) {
      if (!reached50 && event.reached50 === 'NA') {
        return res.status(400).json({ message: 'reached50 is required when isCRT is true' });
      }
      if (!reaction && event.reaction === 'NA') {
        return res.status(400).json({ message: 'reaction is required when isCRT is true' });
      }
    }

    if (date) {
      const eventDate = new Date(date);
      event.date = eventDate;
      event.monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
    }
    if (time !== undefined) event.time = time;
    if (isCRT !== undefined) {
      event.isCRT = isCRT;
      if (!isCRT) {
        event.reached50 = 'NA';
        event.reaction = 'NA';
      }
    }
    if (reached50 !== undefined) event.reached50 = reached50;
    if (reaction !== undefined) event.reaction = reaction;
    if (image !== undefined) event.image = image;
    if (notes !== undefined) event.notes = notes;

    const saved = await event.save();
    res.json(saved);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const event = await CRTEvent.findOneAndDelete({ _id: id, userId: req.session.userId });
    if (!event) {
      return res.status(404).json({ message: 'CRT event not found' });
    }

    res.json({ message: 'CRT event deleted' });
  } catch (error) {
    next(error);
  }
};

router.get('/', isAuthenticated, getAll);
router.post('/', isAuthenticated, create);
router.put('/:id', isAuthenticated, update);
router.delete('/:id', isAuthenticated, remove);

module.exports = router;