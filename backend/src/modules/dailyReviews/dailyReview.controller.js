const mongoose = require('mongoose');
const DailyReview = require('./dailyReview.model');
const DailyReviewEntry = require('./dailyReviewEntry.model');
const { deleteImage } = require('../../config/cloudinary');

const getAll = async (req, res, next) => {
  try {
    const { pair, date, bias, search, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.session.userId };

    if (pair) filter.pair = pair;
    if (date) filter.date = date;
    if (bias) filter.bias = bias;
    if (search) {
      filter.$or = [
        { pair: { $regex: search, $options: 'i' } },
        { narrative: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      DailyReview.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DailyReview.countDocuments(filter),
    ]);

    const reviewsWithStats = await Promise.all(reviews.map(async (review) => {
      const entryCount = await DailyReviewEntry.countDocuments({ dailyReviewId: review._id });
      const imageCount = (await DailyReviewEntry.find({ dailyReviewId: review._id })
        .select('images')).reduce((sum, e) => sum + (e.images?.length || 0), 0);
      const latestEntry = await DailyReviewEntry.findOne({ dailyReviewId: review._id })
        .sort({ createdAt: -1 }).select('createdAt');
      return {
        ...review.toJSON(),
        entryCount,
        imageCount,
        latestEntryAt: latestEntry?.createdAt || null,
      };
    }));

    res.json({ reviews: reviewsWithStats, total, page: parseInt(page), limit: parseInt(limit) });
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
    const review = await DailyReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const entryCount = await DailyReviewEntry.countDocuments({ dailyReviewId: id });
    const imageCount = (await DailyReviewEntry.find({ dailyReviewId: id })
      .select('images')).reduce((sum, e) => sum + (e.images?.length || 0), 0);

    res.json({ ...review.toJSON(), entryCount, imageCount });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { pair, date, weeklyReviewId, dayOfWeek, bias, expectedDirection, htfBias, crtDirection, premium, discount, liquidityDirection, pdh, pdl, pdo, previousRange, previousClose, previousHigh, previousLow, adr, expansion, narrative, liquidityTarget, expectedSweep, expectedCrt, expectedSmt, expectedSession, killZone, biasConfidence, status } = req.body;

    if (!pair || !date) {
      return res.status(400).json({ message: 'Pair and date are required' });
    }

    const existing = await DailyReview.findOne({
      userId: req.session.userId, pair, date,
    });
    if (existing) {
      return res.status(409).json({ message: 'A review already exists for this pair and date' });
    }

    const review = new DailyReview({
      userId: req.session.userId, pair, date, weeklyReviewId, dayOfWeek, bias, expectedDirection,
      htfBias, crtDirection, premium, discount, liquidityDirection, pdh, pdl, pdo,
      previousRange, previousClose, previousHigh, previousLow, adr, expansion, narrative,
      liquidityTarget, expectedSweep, expectedCrt, expectedSmt, expectedSession, killZone,
      biasConfidence, status,
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
    const review = await DailyReview.findOneAndUpdate(
      { _id: id, userId: req.session.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json(review);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A review already exists for this pair and date' });
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
    const review = await DailyReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const entries = await DailyReviewEntry.find({ dailyReviewId: id });
    const publicIds = entries.flatMap(e => (e.images || []).map(img => img.publicId).filter(Boolean));

    for (const publicId of publicIds) {
      try { await deleteImage(publicId); } catch {}
    }

    await DailyReviewEntry.deleteMany({ dailyReviewId: id });
    await DailyReview.findByIdAndDelete(id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
