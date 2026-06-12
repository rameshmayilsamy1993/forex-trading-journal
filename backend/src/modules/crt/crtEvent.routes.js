const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isAuthenticated } = require('../../middleware/authMiddleware');
const CRTEvent = require('./crtEvent.model');

const getAll = async (req, res, next) => {
  try {
    const {
      pair, month, timeframe,
      direction, status, crtPlaying,
      keyLevelExists, keyLevelType,
      dateFrom, dateTo,
      search
    } = req.query;

    const filter = { userId: req.session.userId };
    if (pair) filter.pair = pair;
    if (month) filter.monthKey = month;
    if (timeframe) {
      const tfs = timeframe.split(',');
      filter.timeframe = tfs.length > 1 ? { $in: tfs } : tfs[0];
    }
    if (direction) {
      const dirs = direction.split(',');
      filter.crtDirection = dirs.length > 1 ? { $in: dirs } : dirs[0];
    }
    if (status) {
      const sts = status.split(',');
      filter.crtStatus = sts.length > 1 ? { $in: sts } : sts[0];
    }
    if (crtPlaying !== undefined) filter.crtPlaying = crtPlaying === 'true';
    if (keyLevelExists !== undefined) filter.keyLevelExists = keyLevelExists === 'true';
    if (keyLevelType) filter.keyLevelType = keyLevelType;

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: 'i' } },
        { keyLevelType: { $regex: search, $options: 'i' } },
        { customKeyLevel: { $regex: search, $options: 'i' } },
        { timeframe: { $regex: search, $options: 'i' } }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      CRTEvent.find(filter)
        .sort({ date: -1, time: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      CRTEvent.countDocuments(filter)
    ]);

    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      pair, timeframe, date, time,
      keyLevelExists, keyLevelType, customKeyLevel,
      crtPlaying, crtDirection, crtStatus, crtRangeRespected,
      imagePath, notes,
      // Legacy fields
      isCRT, reached50, reaction, image
    } = req.body;

    if (!pair || !timeframe || !date) {
      return res.status(400).json({ message: 'Pair, timeframe, and date are required' });
    }

    const eventDate = new Date(date);
    const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;

    // Monthly duplicate check (existing behavior)
    const existingMonthly = await CRTEvent.findOne({
      userId: req.session.userId, pair, timeframe: 'MONTHLY', monthKey
    });
    if (timeframe === 'MONTHLY' && existingMonthly) {
      return res.status(400).json({
        message: 'MONTHLY CRT already exists for this month. Please edit the existing entry.'
      });
    }

    // 3MONTH duplicate check (existing behavior)
    let quarterKey = '';
    if (timeframe === '3MONTH') {
      const quarter = Math.ceil((eventDate.getMonth() + 1) / 3);
      quarterKey = `${eventDate.getFullYear()}-Q${quarter}`;
      const existing3Month = await CRTEvent.findOne({
        userId: req.session.userId, pair, timeframe: '3MONTH', quarterKey
      });
      if (existing3Month) {
        return res.status(400).json({
          message: '3MONTH CRT already exists for this quarter. Please edit the existing entry.'
        });
      }
    }

    const crtEvent = new CRTEvent({
      userId: req.session.userId,
      pair,
      timeframe,
      date: eventDate,
      time: time || '',
      // New fields
      keyLevelExists: keyLevelExists !== undefined ? keyLevelExists : false,
      keyLevelType: keyLevelType || '',
      customKeyLevel: customKeyLevel || '',
      crtPlaying: crtPlaying !== undefined ? crtPlaying : (isCRT || false),
      crtDirection: crtDirection || 'No CRT',
      crtStatus: crtStatus || 'Waiting',
      crtRangeRespected: crtRangeRespected || 'Not Yet Tested',
      imagePath: imagePath || '',
      // Legacy fields
      isCRT: isCRT || false,
      reached50: isCRT ? (reached50 || 'NA') : 'NA',
      reaction: isCRT ? (reaction || 'NA') : 'NA',
      image: image || '',
      notes: notes || '',
      monthKey,
      quarterKey
    });

    const saved = await crtEvent.save();
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    const event = await CRTEvent.findOne({ _id: id, userId: req.session.userId }).select('-__v');
    if (!event) {
      return res.status(404).json({ message: 'CRT event not found' });
    }
    res.json(event);
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

    const event = await CRTEvent.findOne({ _id: id, userId: req.session.userId });
    if (!event) {
      return res.status(404).json({ message: 'CRT event not found' });
    }

    const {
      date, time,
      keyLevelExists, keyLevelType, customKeyLevel,
      crtPlaying, crtDirection, crtStatus, crtRangeRespected,
      imagePath, notes,
      isCRT, reached50, reaction, image
    } = req.body;

    // Validation
    if (crtDirection !== undefined && !crtDirection) {
      return res.status(400).json({ message: 'CRT direction cannot be empty' });
    }
    if (crtStatus !== undefined && !crtStatus) {
      return res.status(400).json({ message: 'CRT status cannot be empty' });
    }

    if (date) {
      const eventDate = new Date(date);
      event.date = eventDate;
      event.monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      const quarter = Math.ceil((eventDate.getMonth() + 1) / 3);
      event.quarterKey = `${eventDate.getFullYear()}-Q${quarter}`;
    }
    if (time !== undefined) event.time = time;

    if (keyLevelExists !== undefined) event.keyLevelExists = keyLevelExists;
    if (keyLevelType !== undefined) event.keyLevelType = keyLevelType;
    if (customKeyLevel !== undefined) event.customKeyLevel = customKeyLevel;
    if (crtPlaying !== undefined) event.crtPlaying = crtPlaying;
    if (crtDirection !== undefined) event.crtDirection = crtDirection;
    if (crtStatus !== undefined) {
      // Track status change in history
      if (crtStatus !== event.crtStatus) {
        const historyEntry = { status: event.crtStatus, date: new Date().toISOString() };
        if (!event.statusHistory) event.statusHistory = [];
        event.statusHistory.push(historyEntry);
      }
      event.crtStatus = crtStatus;
    }
    if (crtRangeRespected !== undefined) event.crtRangeRespected = crtRangeRespected;

    // Handle imagePath: allow clearing by sending empty string
    if (imagePath !== undefined) event.imagePath = imagePath;

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

const getSummary = async (req, res, next) => {
  try {
    const { pair } = req.query;
    const filter = { userId: req.session.userId };
    if (pair) filter.pair = pair;

    const [activeCount, entryReadyCount, completedCount, invalidatedCount, recentCRT] = await Promise.all([
      CRTEvent.countDocuments({ ...filter, crtStatus: 'Active' }),
      CRTEvent.countDocuments({ ...filter, crtStatus: 'Entry Ready' }),
      CRTEvent.countDocuments({ ...filter, crtStatus: 'Completed' }),
      CRTEvent.countDocuments({ ...filter, crtStatus: 'Invalidated' }),
      CRTEvent.findOne(filter).sort({ updatedAt: -1 }).select('pair timeframe crtDirection crtStatus updatedAt').lean()
    ]);

    res.json({
      activeCount,
      entryReadyCount,
      completedCount,
      invalidatedCount,
      mostRecentCRT: recentCRT
    });
  } catch (error) {
    next(error);
  }
};

router.get('/', isAuthenticated, getAll);
router.get('/summary', isAuthenticated, getSummary);
router.get('/:id', isAuthenticated, getOne);
router.post('/', isAuthenticated, create);
router.put('/:id', isAuthenticated, update);
router.delete('/:id', isAuthenticated, remove);

module.exports = router;
