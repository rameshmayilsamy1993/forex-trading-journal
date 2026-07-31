const mongoose = require('mongoose');
const SaturdayReview = require('./saturdayReview.model');
const SaturdayReviewEvent = require('./saturdayReviewEvent.model');
const SaturdayReviewImage = require('./saturdayReviewImage.model');
const { computeCompletion } = require('./saturdayReviewCompletion');
const { deleteImage } = require('../../config/cloudinary');

const buildPayload = async (review) => {
  const events = await SaturdayReviewEvent.find({
    reviewId: review._id,
    userId: review.userId,
  }).sort({ eventType: 1 });
  const eventsWithImages = await Promise.all(events.map(async (event) => {
    const images = await SaturdayReviewImage.find({ eventId: event._id }).sort({ sortOrder: 1 });
    return { ...event.toJSON(), images };
  }));
  const completion = computeCompletion(review, events);
  return { ...review.toJSON(), completionPercent: completion.percent, events: eventsWithImages };
};

const getAll = async (req, res, next) => {
  try {
    const { pair, month, year, bias, candleType, status, search, sort, page = 1, limit = 12 } = req.query;
    const filter = { userId: req.session.userId };

    if (pair) filter.pair = pair;
    if (bias) filter.overallBias = bias;
    if (candleType) filter.candleType = candleType;
    if (status) filter.status = status;
    if (month) {
      filter.weekStart = { $regex: `^\\d{4}-${String(month).padStart(2, '0')}` };
    }
    if (year) {
      filter.weekStart = { $regex: `^${year}-` };
    }

    if (search) {
      const matchingReviewIds = await SaturdayReviewEvent.distinct('reviewId', {
        userId: req.session.userId,
        notes: { $regex: search, $options: 'i' },
      });
      filter.$or = [
        { pair: { $regex: search, $options: 'i' } },
        { weeklyStory: { $regex: search, $options: 'i' } },
        { _id: { $in: matchingReviewIds } },
      ];
    }

    const sortMap = {
      'weekStart:asc': { weekStart: 1, createdAt: 1 },
      'createdAt:desc': { createdAt: -1 },
      default: { weekStart: -1, createdAt: -1 },
    };
    const sortOrder = sortMap[sort] || sortMap.default;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      SaturdayReview.find(filter).sort(sortOrder).skip(skip).limit(parseInt(limit)),
      SaturdayReview.countDocuments(filter),
    ]);

    const rows = await Promise.all(reviews.map(async (review) => {
      const events = await SaturdayReviewEvent.find({ reviewId: review._id, userId: review.userId });
      const completion = computeCompletion(review, events);
      const imageCount = await SaturdayReviewImage.countDocuments({ reviewId: review._id });
      return { ...review.toJSON(), completionPercent: completion.percent, imageCount };
    }));

    res.json({ reviews: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    const review = await SaturdayReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json(await buildPayload(review));
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { pair, weekStart, weekEnd, reviewDate, status } = req.body;
    if (!pair || !weekStart || !weekEnd) {
      return res.status(400).json({ message: 'Pair, weekStart, and weekEnd are required' });
    }

    const existing = await SaturdayReview.findOne({ userId: req.session.userId, pair, weekStart });
    if (existing) {
      return res.status(409).json({ message: 'A review already exists for this pair and week' });
    }

    const review = new SaturdayReview({
      userId: req.session.userId,
      pair,
      weekStart,
      weekEnd,
      reviewDate: reviewDate || new Date().toISOString().slice(0, 10),
      status: status === 'Completed' ? 'Completed' : 'Draft',
    });
    const saved = await review.save();
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await SaturdayReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const allowed = [
      'pair', 'weekStart', 'weekEnd', 'reviewDate', 'overallBias', 'candleType',
      'highOrLowFirst', 'expansionDirection', 'oteTouched', 'oteDirection', 'oteReaction',
      'marketQuality', 'difficulty', 'confidence', 'weeklyStory', 'lessons', 'lessonsNotes',
      'status', 'lastAiUpdateAt',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) review[key] = req.body[key];
    }

    if (review.status === 'Completed') {
      const events = await SaturdayReviewEvent.find({ reviewId: review._id, userId: review.userId });
      const completion = computeCompletion(review, events);
      if (!completion.complete) {
        return res.status(400).json({
          message: `Cannot mark as Completed — ${completion.filled}/${completion.total} mandatory fields are filled`,
        });
      }
    }

    const saved = await review.save();
    res.json(saved);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A review already exists for this pair and week' });
    }
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    const review = await SaturdayReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const events = await SaturdayReviewEvent.find({ reviewId: id, userId: req.session.userId });
    const eventIds = events.map((e) => e._id);
    const images = await SaturdayReviewImage.find({ reviewId: id });

    for (const img of images) {
      if (img.publicId) {
        try { await deleteImage(img.publicId); } catch {}
      }
    }

    if (eventIds.length > 0) {
      await SaturdayReviewImage.deleteMany({ eventId: { $in: eventIds } });
    }
    await SaturdayReviewImage.deleteMany({ reviewId: id });
    await SaturdayReviewEvent.deleteMany({ reviewId: id, userId: req.session.userId });
    await SaturdayReview.findByIdAndDelete(id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
