const mongoose = require('mongoose');
const WeeklyReviewEntry = require('./weeklyReviewEntry.model');
const WeeklyReview = require('./weeklyReview.model');
const { deleteImage } = require('../../config/cloudinary');

const getAll = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    const entries = await WeeklyReviewEntry.find({
      weeklyReviewId: reviewId,
      userId: req.session.userId,
    }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    const review = await WeeklyReview.findOne({ _id: reviewId, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const { entryTitle, comment, images, entryTime, bias, tags, mood, importance, session } = req.body;
    const maxOrder = await WeeklyReviewEntry.findOne({ weeklyReviewId: reviewId })
      .sort({ displayOrder: -1 }).select('displayOrder');

    const entry = new WeeklyReviewEntry({
      weeklyReviewId: reviewId,
      userId: req.session.userId,
      entryTitle: entryTitle || '',
      comment: comment || '',
      images: images || [],
      entryTime: entryTime || '',
      bias: bias || '',
      tags: tags || [],
      mood: mood || '',
      importance: importance || '',
      session: session || '',
      displayOrder: (maxOrder?.displayOrder || 0) + 1,
    });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({ message: 'Invalid entry ID' });
    }
    const entry = await WeeklyReviewEntry.findOneAndUpdate(
      { _id: entryId, userId: req.session.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({ message: 'Invalid entry ID' });
    }
    const entry = await WeeklyReviewEntry.findOne({ _id: entryId, userId: req.session.userId });
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    for (const img of (entry.images || [])) {
      if (img.publicId) {
        try { await deleteImage(img.publicId); } catch {}
      }
    }

    await WeeklyReviewEntry.findByIdAndDelete(entryId);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
