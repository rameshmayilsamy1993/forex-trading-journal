const mongoose = require('mongoose');
const MonthlyReview = require('./monthlyReview.model');
const MonthlyReviewEntry = require('./monthlyReviewEntry.model');
const { deleteImage } = require('../../config/cloudinary');

const getAll = async (req, res, next) => {
  try {
    const { pair, month, year, bias, search, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.session.userId };

    if (pair) filter.pair = pair;
    if (month) filter.month = parseInt(month);
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
      MonthlyReview.find(filter)
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MonthlyReview.countDocuments(filter),
    ]);

    const reviewsWithStats = await Promise.all(reviews.map(async (review) => {
      const entryCount = await MonthlyReviewEntry.countDocuments({ monthlyReviewId: review._id });
      const imageCount = (await MonthlyReviewEntry.find({ monthlyReviewId: review._id })
        .select('images')).reduce((sum, e) => sum + (e.images?.length || 0), 0);
      const latestEntry = await MonthlyReviewEntry.findOne({ monthlyReviewId: review._id })
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
    const review = await MonthlyReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const entryCount = await MonthlyReviewEntry.countDocuments({ monthlyReviewId: id });
    const imageCount = (await MonthlyReviewEntry.find({ monthlyReviewId: id })
      .select('images')).reduce((sum, e) => sum + (e.images?.length || 0), 0);

    res.json({ ...review.toJSON(), entryCount, imageCount });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { pair, month, year, title, bias, summary, imagePath, imageCaption, status } = req.body;

    if (!pair || !month || !year) {
      return res.status(400).json({ message: 'Pair, month, and year are required' });
    }

    const existing = await MonthlyReview.findOne({
      userId: req.session.userId, pair, month, year,
    });
    if (existing) {
      return res.status(409).json({ message: 'A review already exists for this pair and month' });
    }

    const review = new MonthlyReview({
      userId: req.session.userId, pair, month, year, title, bias, summary,
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
    const review = await MonthlyReview.findOneAndUpdate(
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
      return res.status(409).json({ message: 'A review already exists for this pair and month' });
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
    const review = await MonthlyReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const entries = await MonthlyReviewEntry.find({ monthlyReviewId: id });
    const publicIds = entries.flatMap(e => (e.images || []).map(img => img.publicId).filter(Boolean));

    for (const publicId of publicIds) {
      try { await deleteImage(publicId); } catch {}
    }

    await MonthlyReviewEntry.deleteMany({ monthlyReviewId: id });
    await MonthlyReview.findByIdAndDelete(id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
