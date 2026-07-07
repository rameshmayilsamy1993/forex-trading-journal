const mongoose = require('mongoose');
const WeeklyReview = require('./weeklyReview.model');
const WeeklyReviewEntry = require('./weeklyReviewEntry.model');
const { deleteImage } = require('../../config/cloudinary');

const getAll = async (req, res, next) => {
  try {
    const { pair, weekNumber, year, bias, search, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.session.userId };

    if (pair) filter.pair = pair;
    if (weekNumber) filter.weekNumber = parseInt(weekNumber);
    if (year) filter.year = parseInt(year);
    if (bias) filter.bias = bias;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { pair: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      WeeklyReview.find(filter)
        .sort({ year: -1, weekNumber: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WeeklyReview.countDocuments(filter),
    ]);

    const reviewsWithStats = await Promise.all(reviews.map(async (review) => {
      const entryCount = await WeeklyReviewEntry.countDocuments({ weeklyReviewId: review._id });
      const imageCount = (await WeeklyReviewEntry.find({ weeklyReviewId: review._id })
        .select('images')).reduce((sum, e) => sum + (e.images?.length || 0), 0);
      const latestEntry = await WeeklyReviewEntry.findOne({ weeklyReviewId: review._id })
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
    const review = await WeeklyReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const entryCount = await WeeklyReviewEntry.countDocuments({ weeklyReviewId: id });
    const imageCount = (await WeeklyReviewEntry.find({ weeklyReviewId: id })
      .select('images')).reduce((sum, e) => sum + (e.images?.length || 0), 0);

    res.json({ ...review.toJSON(), entryCount, imageCount });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { pair, weekNumber, year, title, bias, summary, imagePath, imageCaption, status } = req.body;

    if (!pair || !weekNumber || !year) {
      return res.status(400).json({ message: 'Pair, weekNumber, and year are required' });
    }

    const existing = await WeeklyReview.findOne({
      userId: req.session.userId, pair, weekNumber, year,
    });
    if (existing) {
      return res.status(409).json({ message: 'A review already exists for this pair and week' });
    }

    const review = new WeeklyReview({
      userId: req.session.userId, pair, weekNumber, year, title, bias, summary,
      imagePath, imageCaption, status,
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
    const review = await WeeklyReview.findOneAndUpdate(
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
    const review = await WeeklyReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const entries = await WeeklyReviewEntry.find({ weeklyReviewId: id });
    const publicIds = entries.flatMap(e => (e.images || []).map(img => img.publicId).filter(Boolean));

    for (const publicId of publicIds) {
      try { await deleteImage(publicId); } catch {}
    }

    await WeeklyReviewEntry.deleteMany({ weeklyReviewId: id });
    await WeeklyReview.findByIdAndDelete(id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
