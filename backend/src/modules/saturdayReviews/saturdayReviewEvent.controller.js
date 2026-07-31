const mongoose = require('mongoose');
const SaturdayReview = require('./saturdayReview.model');
const SaturdayReviewEvent = require('./saturdayReviewEvent.model');
const SaturdayReviewImage = require('./saturdayReviewImage.model');
const { EVENT_TYPES } = SaturdayReviewEvent;
const { deleteImage } = require('../../config/cloudinary');

const upsert = async (req, res, next) => {
  try {
    const { id, eventType } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    if (!EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ message: 'Invalid event type' });
    }
    const review = await SaturdayReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const { day, date, time, category, keyLevel, answer, notes, images = [] } = req.body;
    const existing = await SaturdayReviewEvent.findOne({ reviewId: id, eventType, userId: req.session.userId });
    const event = existing || new SaturdayReviewEvent({ reviewId: id, eventType, userId: req.session.userId });
    event.day = day || '';
    event.date = date || '';
    event.time = time || '';
    event.category = category || '';
    event.keyLevel = keyLevel || '';
    event.answer = answer || '';
    event.notes = notes || '';
    await event.save();

    const oldImages = await SaturdayReviewImage.find({ eventId: event._id });
    const oldByUrl = new Map(oldImages.map((img) => [img.image, img]));
    const incoming = images.map((img, i) => ({
      url: String(img.url || ''),
      publicId: img.publicId || '',
      caption: img.caption || '',
      sortOrder: i,
    }));
    const incomingUrls = new Set(incoming.map((img) => img.url));

    for (const img of oldImages) {
      if (!incomingUrls.has(img.image)) {
        if (img.publicId) {
          try { await deleteImage(img.publicId); } catch {}
        }
        await SaturdayReviewImage.findByIdAndDelete(img._id);
      }
    }

    for (const inc of incoming) {
      if (!inc.url) continue;
      const existingImg = oldByUrl.get(inc.url);
      if (existingImg) {
        await SaturdayReviewImage.findByIdAndUpdate(existingImg._id, {
          caption: inc.caption,
          sortOrder: inc.sortOrder,
        });
      } else {
        await SaturdayReviewImage.create({
          reviewId: id,
          eventId: event._id,
          image: inc.url,
          publicId: inc.publicId,
          caption: inc.caption,
          sortOrder: inc.sortOrder,
        });
      }
    }

    const imagesResult = await SaturdayReviewImage.find({ eventId: event._id }).sort({ sortOrder: 1 });
    res.json({ ...event.toJSON(), images: imagesResult });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id, eventType } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    if (!EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ message: 'Invalid event type' });
    }
    const event = await SaturdayReviewEvent.findOne({ reviewId: id, eventType, userId: req.session.userId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const images = await SaturdayReviewImage.find({ eventId: event._id });
    for (const img of images) {
      if (img.publicId) {
        try { await deleteImage(img.publicId); } catch {}
      }
    }
    await SaturdayReviewImage.deleteMany({ eventId: event._id });
    await SaturdayReviewEvent.findByIdAndDelete(event._id);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { upsert, remove };
