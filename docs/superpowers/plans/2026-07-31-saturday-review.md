# Saturday Review Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium Saturday Review module — a structured weekly ICT/SMC market analysis (one review = one pair + one trading week) with 7 sections, 30s auto-save drafts, completion tracking, list/detail/form pages, and AI-ready normalized storage.

**Architecture:** A new Express module `saturdayReviews/` with three Mongoose collections (`SaturdayReview`, `SaturdayReviewEvent`, `SaturdayReviewImage`) mounted at `/api/saturday-reviews`. Each review has 5 fixed event slots (`weekly_high`, `weekly_low`, `weekly_high_origin`, `weekly_low_origin`, `ote`) upserted via `PUT /:id/events/:eventType`. Frontend: new `src/app/components/SaturdayReview/` folder with list/form/detail pages plus reusable sub-components, wired into the existing tab navigation system.

**Tech Stack:** Node.js + Express + Mongoose (backend), React 18 + Vite + Tailwind v4 + TypeScript, Radix shadcn-style UI primitives, tiptap v3 (rich text), framer-motion, lucide-react, date-fns, Cloudinary uploads.

## Global Constraints

- **No automated test framework** exists in this repo (per AGENTS.md, no lint/typecheck configured). Verification is **manual**: `pnpm build` (frontend — catches syntax/import errors), `node -e "require(...)"` (backend module load), and runtime smoke tests with the dev servers. Do NOT invent a test runner.
- Every backend query must filter by `req.session.userId`.
- Validate MongoDB ObjectIds with `mongoose.Types.ObjectId.isValid()` before querying.
- `schemaOptions` from `../../config/schemaOptions` applied to every schema (transforms `_id` → `id`).
- Cloudinary images must be deleted (`deleteImage` from `../../config/cloudinary`) when their parent is deleted/removed.
- Async handlers wrapped in try/catch → `next(error)`.
- Frontend uses `import { cn } from '../ui/utils'` for class merging; UI primitives from `src/app/components/ui/`.
- New tabs follow the existing navigation contract: `(window as any).__saturdayReviewId` for detail, `(window as any).__saturdayReviewEditId` for the form (edit), and `window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: '<tab>' }))`.
- Pairs come from `apiService.settings.getPairs()` with `DEFAULT_PAIRS` fallback.
- Completion semantics (client + server MUST match): mandatory = S1 Weekly High (day+date+time), S1 Weekly Low (day+date+time), S2 (candleType+highOrLowFirst+expansionDirection), S3 High Origin (category+keyLevel), S3 Low Origin (category+keyLevel), S4 OTE (oteTouched; if `Yes` also oteDirection+oteReaction), S7 Rating (marketQuality>0+difficulty+confidence). S5 Story and S6 Lessons are optional.

---

### Task 1: Backend models (3 Mongoose schemas)

**Files:**
- Create: `backend/src/modules/saturdayReviews/saturdayReview.model.js`
- Create: `backend/src/modules/saturdayReviews/saturdayReviewEvent.model.js`
- Create: `backend/src/modules/saturdayReviews/saturdayReviewImage.model.js`

**Interfaces:**
- Produces: `SaturdayReview`, `SaturdayReviewEvent`, `SaturdayReviewImage` Mongoose models. Later tasks use `require('./saturdayReview.model')` etc. Field names below are the contract for all subsequent tasks.

- [ ] **Step 1: Create the models**

`backend/src/modules/saturdayReviews/saturdayReview.model.js`:
```javascript
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const saturdayReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  weekStart: { type: String, required: true },
  weekEnd: { type: String, required: true },
  reviewDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  overallBias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: '' },
  candleType: { type: String, enum: ['Bull Full Body', 'Bear Full Body', 'Bull Pin Bar', 'Bear Pin Bar', 'Doji', 'Inside Bar', 'Outside Bar', 'Indecision', 'Custom'], default: '' },
  highOrLowFirst: { type: String, enum: ['Weekly High First', 'Weekly Low First', 'Both same session'], default: '' },
  expansionDirection: { type: String, enum: ['Expanded Up', 'Expanded Down', 'Range', 'Balanced'], default: '' },
  oteTouched: { type: String, enum: ['Yes', 'No'], default: '' },
  oteDirection: { type: String, enum: ['Bullish', 'Bearish'], default: '' },
  oteReaction: { type: String, enum: ['Yes', 'No', 'Partial'], default: '' },
  marketQuality: { type: Number, min: 0, max: 5, default: 0 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: '' },
  confidence: { type: Number, min: 0, max: 10, default: 0 },
  weeklyStory: { type: String, default: '' },
  lessons: [{ label: { type: String }, checked: { type: Boolean, default: false } }],
  lessonsNotes: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Completed'], default: 'Draft' },
}, schemaOptions);

saturdayReviewSchema.index({ userId: 1, pair: 1, weekStart: 1 }, { unique: true });
saturdayReviewSchema.index({ userId: 1, weekStart: -1 });

module.exports = mongoose.model('SaturdayReview', saturdayReviewSchema);
```

`backend/src/modules/saturdayReviews/saturdayReviewEvent.model.js`:
```javascript
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const saturdayReviewEventSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaturdayReview', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventType: { type: String, enum: ['weekly_high', 'weekly_low', 'weekly_high_origin', 'weekly_low_origin', 'ote'], required: true },
  day: { type: String, default: '' },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  category: { type: String, enum: ['Weekly', 'Daily'], default: '' },
  keyLevel: { type: String, default: '' },
  answer: { type: String, default: '' },
  notes: { type: String, default: '' },
}, schemaOptions);

saturdayReviewEventSchema.index({ reviewId: 1, eventType: 1 }, { unique: true });

module.exports = mongoose.model('SaturdayReviewEvent', saturdayReviewEventSchema);
```

`backend/src/modules/saturdayReviews/saturdayReviewImage.model.js`:
```javascript
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const saturdayReviewImageSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaturdayReview', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaturdayReviewEvent', required: true },
  image: { type: String, required: true },
  publicId: { type: String, default: '' },
  caption: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
}, schemaOptions);

saturdayReviewImageSchema.index({ eventId: 1, sortOrder: 1 });

module.exports = mongoose.model('SaturdayReviewImage', saturdayReviewImageSchema);
```

- [ ] **Step 2: Verify each model loads**

Run (from `backend/`): `node -e "require('./src/modules/saturdayReviews/saturdayReview.model'); require('./src/modules/saturdayReviews/saturdayReviewEvent.model'); require('./src/modules/saturdayReviews/saturdayReviewImage.model'); console.log('models ok')"`
Expected: prints `models ok` (Mongoose connects lazily; model registration must not throw).

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/saturdayReviews/
git commit -m "feat: add SaturdayReview models (review, event, image)"
```

---

### Task 2: Backend controllers + routes + server.js registration

**Files:**
- Create: `backend/src/modules/saturdayReviews/saturdayReview.controller.js`
- Create: `backend/src/modules/saturdayReviews/saturdayReviewEvent.controller.js`
- Create: `backend/src/modules/saturdayReviews/saturdayReview.routes.js`
- Modify: `backend/server.js` (add require + mount)

**Interfaces:**
- Consumes: models from Task 1; `deleteImage` from `../../config/cloudinary`.
- Produces: REST API at `/api/saturday-reviews`. Response shapes (contract for frontend):
  - `GET /` → `{ reviews: Array<review & { imageCount, completion: { percent, completed } }>, total, page, limit }`
  - `GET /:id` → `{ ...review, events: Array<event & { images: Array<image> }>, imageCount, completion }`
  - `PUT /:id/events/:eventType` → `{ ...event, images: Array<image> }`

- [ ] **Step 1: Create the main controller**

`backend/src/modules/saturdayReviews/saturdayReview.controller.js`:
```javascript
const mongoose = require('mongoose');
const SaturdayReview = require('./saturdayReview.model');
const SaturdayReviewEvent = require('./saturdayReviewEvent.model');
const SaturdayReviewImage = require('./saturdayReviewImage.model');
const { deleteImage } = require('../../config/cloudinary');

const computeCompletion = (review, events) => {
  const byType = {};
  for (const e of events) byType[e.eventType] = e;
  const wh = byType.weekly_high || {};
  const wl = byType.weekly_low || {};
  const ho = byType.weekly_high_origin || {};
  const lo = byType.weekly_low_origin || {};
  const checks = [
    Boolean(wh.day && wh.date && wh.time),
    Boolean(wl.day && wl.date && wl.time),
    Boolean(review.candleType && review.highOrLowFirst && review.expansionDirection),
    Boolean(ho.category && ho.keyLevel),
    Boolean(lo.category && lo.keyLevel),
    Boolean(review.oteTouched),
  ];
  if (review.oteTouched === 'Yes') {
    checks.push(Boolean(review.oteDirection && review.oteReaction));
  }
  checks.push(Boolean(review.marketQuality > 0 && review.difficulty && review.confidence > 0));
  const done = checks.filter(Boolean).length;
  return { percent: Math.round((done / checks.length) * 100), completed: done === checks.length };
};

const validateCompletionFields = (review, events) => {
  const byType = {};
  for (const e of events) byType[e.eventType] = e;
  const wh = byType.weekly_high || {};
  const wl = byType.weekly_low || {};
  const ho = byType.weekly_high_origin || {};
  const lo = byType.weekly_low_origin || {};
  const missing = [];
  if (!wh.day || !wh.date || !wh.time) missing.push('Weekly High (day/date/time)');
  if (!wl.day || !wl.date || !wl.time) missing.push('Weekly Low (day/date/time)');
  if (!review.candleType || !review.highOrLowFirst || !review.expansionDirection) missing.push('Candle Structure');
  if (!ho.category || !ho.keyLevel) missing.push('High Origin');
  if (!lo.category || !lo.keyLevel) missing.push('Low Origin');
  if (!review.oteTouched) missing.push('OTE');
  else if (review.oteTouched === 'Yes' && (!review.oteDirection || !review.oteReaction)) missing.push('OTE details');
  if (!(review.marketQuality > 0) || !review.difficulty || !(review.confidence > 0)) missing.push('Weekly Rating');
  return missing;
};

const loadEvents = async (reviewId) => {
  const events = await SaturdayReviewEvent.find({ reviewId }).sort({ eventType: 1 });
  const images = await SaturdayReviewImage.find({ reviewId }).sort({ sortOrder: 1 });
  const imagesByEvent = {};
  for (const img of images) {
    const key = img.eventId.toString();
    if (!imagesByEvent[key]) imagesByEvent[key] = [];
    imagesByEvent[key].push(img.toJSON());
  }
  return events.map(e => ({ ...e.toJSON(), images: imagesByEvent[e.id] || [] }));
};

const getAll = async (req, res, next) => {
  try {
    const {
      pair, month, year, bias, candleType, status, search,
      sort = 'weekStart:desc', page = 1, limit = 12,
    } = req.query;
    const baseFilter = { userId: req.session.userId };
    if (pair) baseFilter.pair = pair;
    if (bias) baseFilter.overallBias = bias;
    if (candleType) baseFilter.candleType = candleType;
    if (status) baseFilter.status = status;

    const dateRegexParts = [];
    if (month) dateRegexParts.push(String(parseInt(month)).padStart(2, '0'));
    if (year) dateRegexParts.unshift(String(parseInt(year)));
    if (dateRegexParts.length > 0) {
      baseFilter.weekStart = { $regex: `^${dateRegexParts.join('-')}` };
    }

    if (search) {
      const noteEvents = await SaturdayReviewEvent.find({
        userId: req.session.userId,
        notes: { $regex: search, $options: 'i' },
      }).select('reviewId');
      const noteReviewIds = [...new Set(noteEvents.map(e => e.reviewId.toString()))];
      const orClauses = [
        { pair: { $regex: search, $options: 'i' } },
        { weeklyStory: { $regex: search, $options: 'i' } },
      ];
      if (noteReviewIds.length > 0) orClauses.push({ _id: { $in: noteReviewIds } });
      baseFilter.$or = orClauses;
    }

    const [sortFieldRaw, sortDir] = String(sort).split(':');
    const sortField = sortFieldRaw === 'createdAt' ? 'createdAt' : 'weekStart';
    const sortOrder = sortDir === 'asc' ? 1 : -1;
    const sortQuery = { [sortField]: sortOrder, createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      SaturdayReview.find(baseFilter).sort(sortQuery).skip(skip).limit(parseInt(limit)),
      SaturdayReview.countDocuments(baseFilter),
    ]);

    const results = await Promise.all(reviews.map(async (review) => {
      const events = await SaturdayReviewEvent.find({ reviewId: review._id });
      const imageCount = await SaturdayReviewImage.countDocuments({ reviewId: review._id });
      return { ...review.toJSON(), imageCount, completion: computeCompletion(review, events) };
    }));

    res.json({ reviews: results, total, page: parseInt(page), limit: parseInt(limit) });
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
    const events = await loadEvents(id);
    const imageCount = events.reduce((sum, e) => sum + e.images.length, 0);
    res.json({ ...review.toJSON(), events, imageCount, completion: computeCompletion(review, events) });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { pair, weekStart, weekEnd, reviewDate, ...rest } = req.body;
    if (!pair || !weekStart || !weekEnd) {
      return res.status(400).json({ message: 'Pair, weekStart, and weekEnd are required' });
    }
    const existing = await SaturdayReview.findOne({ userId: req.session.userId, pair, weekStart });
    if (existing) {
      return res.status(409).json({ message: 'A Saturday review already exists for this pair and week' });
    }
    const review = new SaturdayReview({
      userId: req.session.userId,
      pair,
      weekStart,
      weekEnd,
      reviewDate: reviewDate || new Date().toISOString().slice(0, 10),
      ...rest,
    });
    const saved = await review.save();
    res.status(201).json(saved);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A Saturday review already exists for this pair and week' });
    }
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    const { pair, weekStart, status: requestedStatus } = req.body;
    if (pair && weekStart) {
      const existing = await SaturdayReview.findOne({
        userId: req.session.userId,
        pair,
        weekStart,
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(409).json({ message: 'A Saturday review already exists for this pair and week' });
      }
    }
    if (requestedStatus === 'Completed') {
      const current = await SaturdayReview.findOne({ _id: id, userId: req.session.userId });
      if (current) {
        const merged = { ...current.toJSON(), ...req.body };
        const events = await SaturdayReviewEvent.find({ reviewId: id });
        const missing = validateCompletionFields(merged, events);
        if (missing.length > 0) {
          return res.status(400).json({ message: `Cannot mark as Completed. Missing: ${missing.join(', ')}` });
        }
      }
    }
    const review = await SaturdayReview.findOneAndUpdate(
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
      return res.status(409).json({ message: 'A Saturday review already exists for this pair and week' });
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
    const images = await SaturdayReviewImage.find({ reviewId: id });
    for (const img of images) {
      if (img.publicId) {
        try { await deleteImage(img.publicId); } catch {}
      }
    }
    await SaturdayReviewImage.deleteMany({ reviewId: id });
    await SaturdayReviewEvent.deleteMany({ reviewId: id });
    await SaturdayReview.findByIdAndDelete(id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

const duplicate = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    const { weekStart, weekEnd } = req.body;
    if (!weekStart || !weekEnd) {
      return res.status(400).json({ message: 'weekStart and weekEnd are required for duplication' });
    }
    const source = await SaturdayReview.findOne({ _id: id, userId: req.session.userId });
    if (!source) {
      return res.status(404).json({ message: 'Review not found' });
    }
    const existing = await SaturdayReview.findOne({ userId: req.session.userId, pair: source.pair, weekStart });
    if (existing) {
      return res.status(409).json({ message: 'A Saturday review already exists for this pair and week' });
    }

    const copy = new SaturdayReview({
      userId: req.session.userId,
      pair: source.pair,
      weekStart,
      weekEnd,
      reviewDate: new Date().toISOString().slice(0, 10),
      overallBias: source.overallBias,
      candleType: source.candleType,
      highOrLowFirst: source.highOrLowFirst,
      expansionDirection: source.expansionDirection,
      oteTouched: source.oteTouched,
      oteDirection: source.oteDirection,
      oteReaction: source.oteReaction,
      marketQuality: source.marketQuality,
      difficulty: source.difficulty,
      confidence: source.confidence,
      weeklyStory: source.weeklyStory,
      lessons: source.lessons,
      lessonsNotes: source.lessonsNotes,
      status: 'Draft',
    });
    const saved = await copy.save();

    const sourceEvents = await SaturdayReviewEvent.find({ reviewId: id });
    const sourceImages = await SaturdayReviewImage.find({ reviewId: id });
    const imagesByEvent = {};
    for (const img of sourceImages) {
      const key = img.eventId.toString();
      if (!imagesByEvent[key]) imagesByEvent[key] = [];
      imagesByEvent[key].push(img);
    }
    for (const ev of sourceEvents) {
      const newEvent = await SaturdayReviewEvent.create({
        reviewId: saved.id,
        userId: req.session.userId,
        eventType: ev.eventType,
        day: ev.day, date: ev.date, time: ev.time,
        category: ev.category, keyLevel: ev.keyLevel, answer: ev.answer, notes: ev.notes,
      });
      const srcImgs = imagesByEvent[ev.id] || [];
      for (const img of srcImgs) {
        await SaturdayReviewImage.create({
          reviewId: saved.id,
          eventId: newEvent.id,
          image: img.image,
          publicId: img.publicId,
          caption: img.caption,
          sortOrder: img.sortOrder,
        });
      }
    }

    res.status(201).json({ ...saved.toJSON(), events: await loadEvents(saved.id) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A Saturday review already exists for this pair and week' });
    }
    next(error);
  }
};

const getCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    const review = await SaturdayReview.findOne({ _id: id, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    const events = await SaturdayReviewEvent.find({ reviewId: id });
    res.json(computeCompletion(review, events));
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove, duplicate, getCompletion };
```

- [ ] **Step 2: Create the event controller**

`backend/src/modules/saturdayReviews/saturdayReviewEvent.controller.js`:
```javascript
const mongoose = require('mongoose');
const SaturdayReview = require('./saturdayReview.model');
const SaturdayReviewEvent = require('./saturdayReviewEvent.model');
const SaturdayReviewImage = require('./saturdayReviewImage.model');
const { deleteImage } = require('../../config/cloudinary');

const VALID_EVENT_TYPES = ['weekly_high', 'weekly_low', 'weekly_high_origin', 'weekly_low_origin', 'ote'];

const upsert = async (req, res, next) => {
  try {
    const { reviewId, eventType } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ message: 'Invalid event type' });
    }
    const review = await SaturdayReview.findOne({ _id: reviewId, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const { day, date, time, category, keyLevel, answer, notes, images } = req.body;

    let event = await SaturdayReviewEvent.findOne({ reviewId, eventType, userId: req.session.userId });
    if (!event) {
      event = new SaturdayReviewEvent({ reviewId, eventType, userId: req.session.userId });
    }
    event.day = day || '';
    event.date = date || '';
    event.time = time || '';
    event.category = category || '';
    event.keyLevel = keyLevel || '';
    event.answer = answer || '';
    event.notes = notes || '';
    await event.save();

    const prevImages = await SaturdayReviewImage.find({ eventId: event._id });
    const prevPublicIds = new Set(prevImages.map(i => i.publicId).filter(Boolean));
    const nextPublicIds = new Set((images || []).map(i => i.publicId).filter(Boolean));
    const removedPublicIds = [...prevPublicIds].filter(id => !nextPublicIds.has(id));
    for (const publicId of removedPublicIds) {
      try { await deleteImage(publicId); } catch {}
    }

    await SaturdayReviewImage.deleteMany({ eventId: event._id });
    const newImages = (images || []).map((img, i) => ({
      reviewId,
      eventId: event._id,
      image: img.url,
      publicId: img.publicId || '',
      caption: img.caption || '',
      sortOrder: i,
    }));
    if (newImages.length > 0) {
      await SaturdayReviewImage.insertMany(newImages);
    }

    const savedImages = await SaturdayReviewImage.find({ eventId: event._id }).sort({ sortOrder: 1 });
    res.json({ ...event.toJSON(), images: savedImages.map(i => i.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { reviewId, eventType } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ message: 'Invalid event type' });
    }
    const event = await SaturdayReviewEvent.findOne({ reviewId, eventType, userId: req.session.userId });
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
```

- [ ] **Step 3: Create the routes**

`backend/src/modules/saturdayReviews/saturdayReview.routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const reviewController = require('./saturdayReview.controller');
const eventController = require('./saturdayReviewEvent.controller');

router.get('/', reviewController.getAll);
router.get('/:id/completion', reviewController.getCompletion);
router.post('/:id/duplicate', reviewController.duplicate);
router.get('/:id', reviewController.getById);
router.post('/', reviewController.create);
router.put('/:id', reviewController.update);
router.delete('/:id', reviewController.remove);

router.put('/:id/events/:eventType', eventController.upsert);
router.delete('/:id/events/:eventType', eventController.remove);

module.exports = router;
```

- [ ] **Step 4: Register in server.js**

In `backend/server.js`:
1. After line 53 (`const dailyReviewRoutes = require(...)`), add:
```javascript
const saturdayReviewRoutes = require('./src/modules/saturdayReviews/saturdayReview.routes');
```
2. After line 115 (`app.use('/api/daily-reviews', isAuthenticated, dailyReviewRoutes);`), add:
```javascript
app.use('/api/saturday-reviews', isAuthenticated, saturdayReviewRoutes);
```

- [ ] **Step 5: Verify modules load + smoke test**

Run: `node -e "const r = require('./src/modules/saturdayReviews/saturdayReview.routes'); console.log(typeof r === 'function' ? 'routes ok' : 'unexpected')"` (from `backend/`).
Expected: prints `routes ok`.

Start the backend dev server (`pnpm dev` in `backend/`), then from a separate terminal run a smoke test creating/deleting a review (MongoDB must be running; the app seeds an admin user automatically — check `backend/.env` for `SESSION_SECRET`, use the seeded admin credentials from `backend/src/modules/users/user.controller.js` if needed). The smoke test requires an authenticated session:
```bash
curl -c cookies.txt -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@fxjournal.com","password":"Admin@123"}'
curl -b cookies.txt -s -X POST http://localhost:5000/api/saturday-reviews -H "Content-Type: application/json" -d '{"pair":"GBPUSD","weekStart":"2026-07-27","weekEnd":"2026-07-31"}'
```
Expected: second command returns a review object with an `id`. Then delete it (`DELETE /api/saturday-reviews/:id`). If credentials differ, locate the seeded admin in `backend/src/modules/users/user.controller.js` and use those. Clean up: remove `cookies.txt`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/saturdayReviews/ backend/server.js
git commit -m "feat: add SaturdayReview API (CRUD, duplicate, completion, event upsert)"
```

---

### Task 3: Frontend types, constants, utils, apiService

**Files:**
- Modify: `src/app/types/trading.ts` (append types)
- Create: `src/app/components/SaturdayReview/saturdayReviewConstants.ts`
- Create: `src/app/components/SaturdayReview/saturdayReviewUtils.ts`
- Modify: `src/app/services/apiService.ts` (append `saturdayReviews` namespace)

**Interfaces:**
- Consumes: `apiGet/apiPost/apiPut/apiDelete` already imported in apiService.
- Produces (contract for later tasks):
  - `apiService.saturdayReviews.getAll/getById/create/update/delete/duplicate/getCompletion/upsertEvent/deleteEvent`
  - `EventFormValue`, `EMPTY_EVENT`, `eventFromApi`, `eventPayload`, `hasEventContent`, `addDays`, `computeCompletion`, `CompletionInput`, `CompletionResult` from `saturdayReviewUtils.ts`
  - All option arrays from `saturdayReviewConstants.ts`
  - `ImageItem` type exported from `./ImageUploader` (Task 4)

- [ ] **Step 1: Append types to `src/app/types/trading.ts`**

Append at end of file:
```typescript
export type SaturdayReviewStatus = 'Draft' | 'Completed';

export type SaturdayReviewEventType = 'weekly_high' | 'weekly_low' | 'weekly_high_origin' | 'weekly_low_origin' | 'ote';

export interface SaturdayReviewImage {
  id: string;
  reviewId: string;
  eventId: string;
  image: string;
  publicId?: string;
  caption: string;
  sortOrder: number;
}

export interface SaturdayReviewEvent {
  id: string;
  reviewId: string;
  eventType: SaturdayReviewEventType;
  day?: string;
  date?: string;
  time?: string;
  category?: string;
  keyLevel?: string;
  answer?: string;
  notes?: string;
  images: SaturdayReviewImage[];
}

export interface SaturdayReview {
  id: string;
  pair: string;
  weekStart: string;
  weekEnd: string;
  reviewDate: string;
  overallBias: 'Bullish' | 'Bearish' | 'Neutral';
  candleType?: string;
  highOrLowFirst?: string;
  expansionDirection?: string;
  oteTouched?: 'Yes' | 'No';
  oteDirection?: 'Bullish' | 'Bearish';
  oteReaction?: 'Yes' | 'No' | 'Partial';
  marketQuality?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  confidence?: number;
  weeklyStory?: string;
  lessons?: { label: string; checked: boolean }[];
  lessonsNotes?: string;
  status: SaturdayReviewStatus;
  createdAt: string;
  updatedAt: string;
  events?: SaturdayReviewEvent[];
  imageCount?: number;
  completion?: { percent: number; completed: boolean };
}
```

- [ ] **Step 2: Create `saturdayReviewConstants.ts`**

`src/app/components/SaturdayReview/saturdayReviewConstants.ts`:
```typescript
export const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const OVERALL_BIASES = ['Bullish', 'Bearish', 'Neutral'] as const;
export const CANDLE_TYPES = ['Bull Full Body', 'Bear Full Body', 'Bull Pin Bar', 'Bear Pin Bar', 'Doji', 'Inside Bar', 'Outside Bar', 'Indecision', 'Custom'] as const;
export const HIGH_OR_LOW_FIRST = ['Weekly High First', 'Weekly Low First', 'Both same session'] as const;
export const EXPANSION_DIRECTIONS = ['Expanded Up', 'Expanded Down', 'Range', 'Balanced'] as const;
export const ORIGIN_CATEGORIES = ['Weekly', 'Daily'] as const;
export const KEY_LEVELS = ['Previous High', 'Previous Low', 'FVG', 'IFVG', 'Order Block', 'Breaker', 'Mitigation Block', 'Balanced Price Range', 'EQH', 'EQL', 'Liquidity Pool', 'Custom'] as const;
export const OTE_REACTIONS = ['Yes', 'No', 'Partial'] as const;
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export const STATUSES = ['Draft', 'Completed'] as const;
export const LESSON_ITEMS = ['Wait for OTE', 'Respect HTF Bias', "Don't trade News", 'Wait for SMT', 'Need patience', 'Avoid revenge trades', 'Follow CRT', 'Other'] as const;
export const EVENT_TYPES = ['weekly_high', 'weekly_low', 'weekly_high_origin', 'weekly_low_origin', 'ote'] as const;

export const WEEKLY_STORY_PLACEHOLDER = `Describe the complete story of the week.

Include:

Liquidity
SMT
Displacement
Manipulation
Expansion
Distribution
OTE
CRT
Bias
Entry Models
Important observations
Lessons`;
```

- [ ] **Step 3: Create `saturdayReviewUtils.ts`**

`src/app/components/SaturdayReview/saturdayReviewUtils.ts`:
```typescript
import type { ImageItem } from './ImageUploader';

export interface EventFormValue {
  day: string;
  date: string;
  time: string;
  category: string;
  keyLevel: string;
  answer: string;
  notes: string;
  images: ImageItem[];
}

export const EMPTY_EVENT: EventFormValue = { day: '', date: '', time: '', category: '', keyLevel: '', answer: '', notes: '', images: [] };

export function eventFromApi(ev: any): EventFormValue {
  return {
    day: ev?.day || '',
    date: ev?.date || '',
    time: ev?.time || '',
    category: ev?.category || '',
    keyLevel: ev?.keyLevel || '',
    answer: ev?.answer || '',
    notes: ev?.notes || '',
    images: (ev?.images || []).map((img: any) => ({
      id: `saved-${img.id}`,
      url: img.image || img.url,
      publicId: img.publicId,
      caption: img.caption || '',
      isExisting: true,
      uploadState: 'done' as const,
    })),
  };
}

export function eventPayload(value: EventFormValue) {
  return {
    day: value.day,
    date: value.date,
    time: value.time,
    category: value.category,
    keyLevel: value.keyLevel,
    answer: value.answer,
    notes: value.notes,
    images: value.images.filter(img => img.url).map(img => ({
      url: img.url!,
      publicId: img.publicId,
      caption: img.caption,
    })),
  };
}

export function hasEventContent(value: EventFormValue): boolean {
  return Boolean(value.day || value.date || value.time || value.category || value.keyLevel || value.answer || value.notes || value.images.length > 0);
}

export function addDays(isoDate: string, days: number): string {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface CompletionInput {
  weeklyHigh: EventFormValue;
  weeklyLow: EventFormValue;
  highOrigin: EventFormValue;
  lowOrigin: EventFormValue;
  candleType: string;
  highOrLowFirst: string;
  expansionDirection: string;
  oteTouched: string;
  oteDirection: string;
  oteReaction: string;
  marketQuality: number;
  difficulty: string;
  confidence: number;
}

export interface CompletionResult {
  percent: number;
  completed: boolean;
  missing: string[];
}

export function computeCompletion(input: CompletionInput): CompletionResult {
  const checks: [boolean, string][] = [
    [Boolean(input.weeklyHigh.day && input.weeklyHigh.date && input.weeklyHigh.time), 'Weekly High'],
    [Boolean(input.weeklyLow.day && input.weeklyLow.date && input.weeklyLow.time), 'Weekly Low'],
    [Boolean(input.candleType && input.highOrLowFirst && input.expansionDirection), 'Candle Structure'],
    [Boolean(input.highOrigin.category && input.highOrigin.keyLevel), 'High Origin'],
    [Boolean(input.lowOrigin.category && input.lowOrigin.keyLevel), 'Low Origin'],
    [Boolean(input.oteTouched), 'OTE'],
  ];
  if (input.oteTouched === 'Yes') {
    checks.push([Boolean(input.oteDirection && input.oteReaction), 'OTE details']);
  }
  checks.push([Boolean(input.marketQuality > 0 && input.difficulty && input.confidence > 0), 'Weekly Rating']);
  const done = checks.filter(([ok]) => ok).length;
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { percent: Math.round((done / checks.length) * 100), completed: done === checks.length, missing };
}
```

- [ ] **Step 4: Add `saturdayReviews` namespace to `src/app/services/apiService.ts`**

After the closing of the `dailyReviews` namespace (find the last `},` before the final `};`), add:
```typescript
  saturdayReviews: {
    getAll: async (filters?: {
      pair?: string; month?: number; year?: number; bias?: string; candleType?: string;
      status?: string; search?: string; sort?: string; page?: number; limit?: number;
    }): Promise<{ reviews: any[]; total: number; page: number; limit: number }> => {
      const params = new URLSearchParams();
      if (filters?.pair) params.set('pair', filters.pair);
      if (filters?.month) params.set('month', filters.month.toString());
      if (filters?.year) params.set('year', filters.year.toString());
      if (filters?.bias) params.set('bias', filters.bias);
      if (filters?.candleType) params.set('candleType', filters.candleType);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.sort) params.set('sort', filters.sort);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());
      const qs = params.toString();
      return apiGet(`/saturday-reviews${qs ? `?${qs}` : ''}`);
    },

    getById: async (id: string): Promise<any> => {
      return apiGet(`/saturday-reviews/${id}`);
    },

    create: async (data: any): Promise<any> => {
      return apiPost('/saturday-reviews', data);
    },

    update: async (id: string, data: any): Promise<any> => {
      return apiPut(`/saturday-reviews/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
      return apiDelete(`/saturday-reviews/${id}`);
    },

    duplicate: async (id: string, data: { weekStart: string; weekEnd: string }): Promise<any> => {
      return apiPost(`/saturday-reviews/${id}/duplicate`, data);
    },

    getCompletion: async (id: string): Promise<any> => {
      return apiGet(`/saturday-reviews/${id}/completion`);
    },

    upsertEvent: async (reviewId: string, eventType: string, data: any): Promise<any> => {
      return apiPut(`/saturday-reviews/${reviewId}/events/${eventType}`, data);
    },

    deleteEvent: async (reviewId: string, eventType: string): Promise<void> => {
      return apiDelete(`/saturday-reviews/${reviewId}/events/${eventType}`);
    },
  },
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Vite build completes without errors (this catches syntax/import mistakes; the app has no typecheck script).

- [ ] **Step 6: Commit**

```bash
git add src/app/types/trading.ts src/app/services/apiService.ts src/app/components/SaturdayReview/saturdayReviewConstants.ts src/app/components/SaturdayReview/saturdayReviewUtils.ts
git commit -m "feat: add SaturdayReview types, constants, utils, apiService"
```

---

### Task 4: ImageUploader component

**Files:**
- Create: `src/app/components/SaturdayReview/ImageUploader.tsx`

**Interfaces:**
- Consumes: `apiService.upload.single` (File, onProgress?) → `{ url, publicId, originalName }`; `apiService.upload.delete(publicId)`; `cn` from `../ui/utils`.
- Produces: `export interface ImageItem` + `export default ImageUploader`. Props: `{ images: ImageItem[]; onChange: React.Dispatch<React.SetStateAction<ImageItem[]>>; maxFiles?: number }`. Images upload to Cloudinary immediately on selection.

- [ ] **Step 1: Create the component**

`src/app/components/SaturdayReview/ImageUploader.tsx`:
```tsx
import { useState, useRef, useCallback } from 'react';
import { Upload, X, Maximize2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../ui/utils';
import apiService from '../../services/apiService';

export interface ImageItem {
  id: string;
  file?: File;
  preview?: string;
  url?: string;
  publicId?: string;
  caption: string;
  isExisting?: boolean;
  uploadState?: 'pending' | 'uploading' | 'done' | 'error';
  uploadProgress?: number;
}

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  maxFiles?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

let idCounter = 0;
const genId = () => `sr-img-${Date.now()}-${++idCounter}`;

export default function ImageUploader({ images, onChange, maxFiles = 20 }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const uploadSingle = useCallback(async (item: ImageItem) => {
    if (!item.file) return;
    onChange(prev => prev.map(img => img.id === item.id ? { ...img, uploadState: 'uploading' as const, uploadProgress: 0 } : img));
    try {
      const result = await apiService.upload.single(item.file, (pct) => {
        onChange(prev => prev.map(img => img.id === item.id ? { ...img, uploadProgress: pct } : img));
      });
      onChange(prev => prev.map(img => img.id === item.id
        ? { ...img, url: result.url, publicId: result.publicId, caption: img.caption, uploadState: 'done' as const, uploadProgress: 100 }
        : img));
    } catch {
      onChange(prev => prev.map(img => img.id === item.id ? { ...img, uploadState: 'error' as const } : img));
    }
  }, [onChange]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxFiles - images.length;
    if (remaining <= 0) {
      alert(`You can only upload ${maxFiles} images per section`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    for (const file of list) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert(`${file.name}: Only PNG, JPEG, WEBP files are accepted`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}: File size must be less than 10MB`);
        continue;
      }
      const item: ImageItem = { id: genId(), file, preview: URL.createObjectURL(file), caption: '', uploadState: 'pending', uploadProgress: 0 };
      onChange(prev => [...prev, item]);
      uploadSingle(item);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateCaption = (index: number, caption: string) =>
    onChange(prev => prev.map((img, i) => i === index ? { ...img, caption } : img));

  const removeImage = (index: number) => {
    const target = images[index];
    onChange(prev => prev.filter((_, i) => i !== index));
    if (target?.url && !target.isExisting && target.publicId) {
      apiService.upload.delete(target.publicId).catch(() => {});
    }
  };

  const moveImage = (from: number, to: number) =>
    onChange(prev => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveImage(dragIndex, index);
    setDragIndex(index);
  };

  return (
    <div>
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                'group relative rounded-2xl border border-[#E2E8F0] overflow-hidden bg-muted transition-all duration-200',
                dragIndex === index && 'opacity-50 scale-95 ring-2 ring-[#7C3AED]',
              )}
            >
              <div className="aspect-[4/3] relative">
                <img src={img.preview || img.url} alt={img.caption || `Image ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => setFullscreen(img.preview || img.url!)} className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-foreground shadow-sm">
                    <Maximize2 className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => removeImage(index)} className="p-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white shadow-sm">
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 text-[10px] font-medium text-foreground shadow-sm cursor-grab">
                    <GripVertical className="size-3" /> Drag
                  </span>
                </div>
                {img.uploadState === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span className="text-[11px] font-medium text-white">{img.uploadProgress}%</span>
                    </div>
                  </div>
                )}
                {img.uploadState === 'error' && (
                  <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                    <button type="button" onClick={() => uploadSingle(img)} className="px-3 py-1.5 rounded-lg bg-white text-[11px] font-semibold text-red-600">Retry</button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 px-2.5 py-2">
                <input
                  value={img.caption || ''}
                  onChange={e => updateCaption(index, e.target.value)}
                  placeholder="Caption..."
                  className="flex-1 text-[12px] text-foreground bg-transparent border-0 outline-none placeholder:text-muted-foreground"
                />
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => moveImage(index, index - 1)} disabled={index === 0} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                    <ArrowUp className="size-3" />
                  </button>
                  <button type="button" onClick={() => moveImage(index, index + 1)} disabled={index === images.length - 1} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < maxFiles && (
        <label className="flex flex-col items-center justify-center h-[120px] border-2 border-dashed border-[#E2E8F0] rounded-2xl cursor-pointer hover:border-[#7C3AED] hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group">
          <div className="flex flex-col items-center gap-2">
            <Upload className="size-5 text-muted-foreground group-hover:text-[#7C3AED]" />
            <span className="text-[13px] font-medium text-muted-foreground group-hover:text-[#7C3AED]">Upload chart screenshots</span>
            <span className="text-[11px] text-muted-foreground">PNG, JPEG, WEBP · Max 10MB · {maxFiles - images.length} slots left</span>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={e => handleFiles(e.target.files)} />
        </label>
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8" onClick={() => setFullscreen(null)}>
          <button onClick={() => setFullscreen(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white">
            <X className="size-6" />
          </button>
          <img src={fullscreen} alt="Fullscreen preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SaturdayReview/ImageUploader.tsx
git commit -m "feat: add ImageUploader component for SaturdayReview"
```

---

### Task 5: RichTextEditor component (tiptap with image embed)

**Files:**
- Modify: `package.json` (add `@tiptap/extension-image` and `@tiptap/extension-placeholder`)
- Create: `src/app/components/SaturdayReview/RichTextEditor.tsx`

**Interfaces:**
- Consumes: tiptap v3 packages already present (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`), `apiService.upload.single`, `cn`.
- Produces: `export default RichTextEditor`. Props: `{ value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number }`. Editor content is HTML; images inserted are Cloudinary URLs.

- [ ] **Step 1: Install tiptap image + placeholder extensions**

Run (from repo root): `pnpm add @tiptap/extension-image @tiptap/extension-placeholder`
Expected: both packages added to `package.json` dependencies.

- [ ] **Step 2: Create the component**

`src/app/components/SaturdayReview/RichTextEditor.tsx`:
```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Code,
  Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Undo, Redo,
} from 'lucide-react';
import { cn } from '../ui/utils';
import apiService from '../../services/apiService';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 320 }: RichTextEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, underline: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageExt.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder || 'Write...' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-5 py-4 text-[15px]',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const insertImages = async (files: FileList | null) => {
    if (!files || !editor) return;
    for (const file of Array.from(files)) {
      try {
        const result = await apiService.upload.single(file);
        editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
      } catch {
        alert(`Failed to upload ${file.name}`);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!editor) return null;

  const tools: any[] = [
    { icon: Bold, active: editor.isActive('bold'), action: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, active: editor.isActive('italic'), action: () => editor.chain().focus().toggleItalic().run() },
    { icon: UnderlineIcon, active: editor.isActive('underline'), action: () => editor.chain().focus().toggleUnderline().run() },
    { divider: true },
    { icon: Heading1, active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading2, active: editor.isActive('heading', { level: 3 }), action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { divider: true },
    { icon: List, active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Quote, active: editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run() },
    { icon: Code, active: editor.isActive('codeBlock'), action: () => editor.chain().focus().toggleCodeBlock().run() },
    { divider: true },
    { icon: AlignLeft, active: editor.isActive({ textAlign: 'left' }), action: () => editor.chain().focus().setTextAlign('left').run() },
    { icon: AlignCenter, active: editor.isActive({ textAlign: 'center' }), action: () => editor.chain().focus().setTextAlign('center').run() },
    { icon: AlignRight, active: editor.isActive({ textAlign: 'right' }), action: () => editor.chain().focus().setTextAlign('right').run() },
  ];

  return (
    <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden bg-card">
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border">
        {tools.map((tool, i) => {
          if ('divider' in tool && tool.divider) {
            return <div key={i} className="w-px h-5 bg-border mx-1" />;
          }
          return (
            <button key={i} type="button" onClick={tool.action}
              className={cn('p-2 rounded-lg transition-all duration-150', tool.active ? 'bg-[#7C3AED] text-white shadow-sm shadow-purple-500/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <tool.icon className="size-4" />
            </button>
          );
        })}
        <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all" title="Insert image">
          <ImageIcon className="size-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" title="Undo">
          <Undo className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" title="Redo">
          <Redo className="size-4" />
        </button>
        <input ref={fileRef} type="file" multiple accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={e => insertImages(e.target.files)} />
      </div>
      <div style={{ minHeight }} className="max-h-[600px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before { color: #94A3B8; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .ProseMirror img { max-width: 100%; border-radius: 12px; margin: 8px 0; }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: builds without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/app/components/SaturdayReview/RichTextEditor.tsx
git commit -m "feat: add RichTextEditor with image embed for SaturdayReview"
```

---

### Task 6: SectionCard + small picker controls

**Files:**
- Create: `src/app/components/SaturdayReview/SectionCard.tsx`
- Create: `src/app/components/SaturdayReview/BiasPicker.tsx`
- Create: `src/app/components/SaturdayReview/StarRating.tsx`
- Create: `src/app/components/SaturdayReview/DifficultyPicker.tsx`
- Create: `src/app/components/SaturdayReview/ConfidenceSlider.tsx`
- Create: `src/app/components/SaturdayReview/LessonChecklist.tsx`

**Interfaces:**
- Consumes: `cn` from `../ui/utils`, `Slider` from `../ui/slider`, `Textarea`/`Label` from ui, `LESSON_ITEMS` from `./saturdayReviewConstants`.
- Produces: the components the form (Task 7) imports.

- [ ] **Step 1: Create `SectionCard.tsx`**

```tsx
import { useState } from 'react';
import { ChevronDown, CheckCircle2, Circle, Image as ImageIcon } from 'lucide-react';
import { cn } from '../ui/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  number: number;
  isComplete: boolean;
  imageCount: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function SectionCard({ title, subtitle, number, isComplete, imageCount, children, defaultOpen }: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className={cn(
      'rounded-2xl border bg-card shadow-sm overflow-hidden transition-colors',
      isComplete ? 'border-emerald-200 dark:border-emerald-800' : 'border-[#E5EAF2] dark:border-slate-700',
    )}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/50 transition-colors">
        <div className={cn(
          'flex items-center justify-center rounded-xl size-9 flex-shrink-0',
          isComplete ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-muted text-muted-foreground',
        )}>
          {isComplete ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Section {number}</p>
          <h3 className="text-[15px] font-bold text-foreground truncate">{title}</h3>
          {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {imageCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
            <ImageIcon className="size-3" /> {imageCount}
          </span>
        )}
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 border-t border-border">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Create `BiasPicker.tsx`**

```tsx
import { cn } from '../ui/utils';

interface BiasPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS = ['Bullish', 'Bearish', 'Neutral'];

const COLORS: Record<string, string> = {
  Bullish: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25',
  Bearish: 'bg-red-500 text-white shadow-md shadow-red-500/25',
  Neutral: 'bg-slate-500 text-white shadow-md shadow-slate-500/25',
};

export default function BiasPicker({ value, onChange }: BiasPickerProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? '' : o)}
          className={cn(
            'flex-1 h-11 rounded-xl text-[13px] font-semibold transition-all duration-200',
            value === o ? COLORS[o] : 'border-2 border-[#E2E8F0] bg-card text-muted-foreground hover:border-[#CBD5E1]',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `StarRating.tsx`**

```tsx
import { Star } from 'lucide-react';
import { cn } from '../ui/utils';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}

export default function StarRating({ value, onChange, readOnly }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(value === n ? 0 : n)}
          className={cn('transition-transform', !readOnly && 'hover:scale-110 cursor-pointer')}
        >
          <Star className={cn('size-7', n <= value ? 'fill-amber-400 text-amber-400' : 'text-[#CBD5E1]')} />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `DifficultyPicker.tsx`**

```tsx
import { cn } from '../ui/utils';

interface DifficultyPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS = ['Easy', 'Medium', 'Hard'];

export default function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? '' : o)}
          className={cn(
            'flex-1 h-11 rounded-xl text-[13px] font-semibold transition-all duration-200',
            value === o ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25' : 'border-2 border-[#E2E8F0] bg-card text-muted-foreground hover:border-[#CBD5E1]',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `ConfidenceSlider.tsx`**

```tsx
import { Slider } from '../ui/slider';

interface ConfidenceSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export default function ConfidenceSlider({ value, onChange }: ConfidenceSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-foreground">Confidence</span>
        <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-lg bg-[#7C3AED] text-white text-[13px] font-bold">
          {value > 0 ? value : '–'}
        </span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={0} max={10} step={1} />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `LessonChecklist.tsx`**

```tsx
import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../ui/utils';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { LESSON_ITEMS } from './saturdayReviewConstants';

interface LessonChecklistProps {
  lessons: { label: string; checked: boolean }[];
  onChange: (lessons: { label: string; checked: boolean }[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export default function LessonChecklist({ lessons, onChange, notes, onNotesChange }: LessonChecklistProps) {
  const [custom, setCustom] = useState('');
  const selected = new Set(lessons.map(l => l.label));

  const toggle = (label: string) => {
    if (selected.has(label)) onChange(lessons.filter(l => l.label !== label));
    else onChange([...lessons, { label, checked: true }]);
  };

  const addCustom = () => {
    const label = custom.trim();
    if (!label || selected.has(label)) {
      setCustom('');
      return;
    }
    onChange([...lessons, { label, checked: true }]);
    setCustom('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {LESSON_ITEMS.map(item => {
          const active = selected.has(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200',
                active ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-500/25' : 'bg-muted text-muted-foreground hover:bg-purple-50 hover:text-[#7C3AED] dark:hover:bg-purple-900/30',
              )}
            >
              {active && <Check className="size-3.5" />}
              {item}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Add custom lesson and press Enter..."
          className="flex-1 h-11 px-4 rounded-xl border border-[#E2E8F0] bg-card text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-500/20"
        />
        <button type="button" onClick={addCustom} className="px-4 rounded-xl bg-muted text-muted-foreground hover:bg-purple-50 hover:text-[#7C3AED] dark:hover:bg-purple-900/30 text-[13px] font-semibold transition-colors">
          Add
        </button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] font-semibold text-foreground">Notes</Label>
        <Textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4} placeholder="Free-form notes on lessons..." className="rounded-xl" />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify build**

Run: `pnpm build`
Expected: builds without errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/SaturdayReview/SectionCard.tsx src/app/components/SaturdayReview/BiasPicker.tsx src/app/components/SaturdayReview/StarRating.tsx src/app/components/SaturdayReview/DifficultyPicker.tsx src/app/components/SaturdayReview/ConfidenceSlider.tsx src/app/components/SaturdayReview/LessonChecklist.tsx
git commit -m "feat: add SectionCard and picker controls for SaturdayReview"
```

---

### Task 7: SaturdayReviewForm (create/edit with 7 sections + auto-save)

**Files:**
- Create: `src/app/components/SaturdayReview/SaturdayReviewForm.tsx`

**Interfaces:**
- Consumes: all components from Tasks 4–6, constants/utils from Task 3, `apiService.saturdayReviews` from Task 3, `apiService.settings.getPairs`, `Button`/`Input`/`Label`/`Textarea`/`Select`/`Progress` from `../ui/`, date-fns `format`.
- Produces: the create/edit page. Reads `(window as any).__saturdayReviewEditId`; on save dispatches `navigate-to-tab` → `'saturday-review-detail'` and sets `(window as any).__saturdayReviewId`.

- [ ] **Step 1: Create the form component**

`src/app/components/SaturdayReview/SaturdayReviewForm.tsx`:
```tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronRight, Calendar, Clock, Save, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import apiService from '../../services/apiService';
import SectionCard from './SectionCard';
import ImageUploader from './ImageUploader';
import RichTextEditor from './RichTextEditor';
import BiasPicker from './BiasPicker';
import StarRating from './StarRating';
import DifficultyPicker from './DifficultyPicker';
import ConfidenceSlider from './ConfidenceSlider';
import LessonChecklist from './LessonChecklist';
import { DEFAULT_PAIRS, WEEK_DAYS, CANDLE_TYPES, HIGH_OR_LOW_FIRST, EXPANSION_DIRECTIONS, KEY_LEVELS, ORIGIN_CATEGORIES, OTE_REACTIONS, WEEKLY_STORY_PLACEHOLDER } from './saturdayReviewConstants';
import { EventFormValue, EMPTY_EVENT, eventFromApi, eventPayload, hasEventContent, computeCompletion, addDays } from './saturdayReviewUtils';

const inputClass = "h-11 rounded-xl border border-[#E2E8F0] bg-card px-3.5 text-[14px] font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-500/20 w-full";
const selectTriggerClass = "h-11 rounded-xl border border-[#E2E8F0] bg-card px-3.5 text-[14px] font-medium text-foreground outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-500/20 w-full";
const labelClass = "text-[13px] font-semibold text-foreground";

interface EventBlockProps {
  title: string;
  value: EventFormValue;
  onChange: (v: EventFormValue) => void;
  showDay?: boolean;
  showDate?: boolean;
  showTime?: boolean;
  showCategory?: boolean;
  showKeyLevel?: boolean;
}

function EventBlock({ title, value, onChange, showDay, showDate, showTime, showCategory, showKeyLevel }: EventBlockProps) {
  const set = (patch: Partial<EventFormValue>) => onChange({ ...value, ...patch });
  return (
    <div className="rounded-2xl border border-[#E5EAF2] dark:border-slate-700 bg-muted/30 p-4 space-y-4">
      <p className="text-[13px] font-bold text-foreground uppercase tracking-wide">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {showDay && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Day</Label>
            <Select value={value.day} onValueChange={(v) => set({ day: v })}>
              <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select day" /></SelectTrigger>
              <SelectContent>
                {WEEK_DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {showDate && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Date</Label>
            <Input type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} className={inputClass} />
          </div>
        )}
        {showTime && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Time</Label>
            <Input type="time" value={value.time} onChange={(e) => set({ time: e.target.value })} className={inputClass} />
          </div>
        )}
        {showCategory && (
          <div className="space-y-1.5">
            <Label className={labelClass}>Category</Label>
            <Select value={value.category} onValueChange={(v) => set({ category: v })}>
              <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Weekly / Daily" /></SelectTrigger>
              <SelectContent>
                {ORIGIN_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {showKeyLevel && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={labelClass}>Key Level</Label>
            <Select value={value.keyLevel} onValueChange={(v) => set({ keyLevel: v })}>
              <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select key level" /></SelectTrigger>
              <SelectContent>
                {KEY_LEVELS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className={labelClass}>Notes</Label>
        <Textarea value={value.notes} onChange={(e) => set({ notes: e.target.value })} rows={4} placeholder="Add observations..." className="rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label className={labelClass}>Charts</Label>
        <ImageUploader
          images={value.images}
          onChange={(updater) => set({ images: typeof updater === 'function' ? updater(value.images) : updater })}
        />
      </div>
    </div>
  );
}

export default function SaturdayReviewForm() {
  const [reviewId, setReviewId] = useState<string | null>((window as any).__saturdayReviewEditId || null);
  const isEditMode = !!reviewId;
  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);

  const [pair, setPair] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [overallBias, setOverallBias] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Completed'>('Draft');

  const [candleType, setCandleType] = useState('');
  const [highOrLowFirst, setHighOrLowFirst] = useState('');
  const [expansionDirection, setExpansionDirection] = useState('');
  const [oteTouched, setOteTouched] = useState('');
  const [oteDirection, setOteDirection] = useState('');
  const [oteReaction, setOteReaction] = useState('');
  const [marketQuality, setMarketQuality] = useState(0);
  const [difficulty, setDifficulty] = useState('');
  const [confidence, setConfidence] = useState(0);

  const [weeklyHigh, setWeeklyHigh] = useState<EventFormValue>(EMPTY_EVENT);
  const [weeklyLow, setWeeklyLow] = useState<EventFormValue>(EMPTY_EVENT);
  const [highOrigin, setHighOrigin] = useState<EventFormValue>(EMPTY_EVENT);
  const [lowOrigin, setLowOrigin] = useState<EventFormValue>(EMPTY_EVENT);
  const [ote, setOte] = useState<EventFormValue>(EMPTY_EVENT);

  const [story, setStory] = useState('');
  const [lessons, setLessons] = useState<{ label: string; checked: boolean }[]>([]);
  const [lessonsNotes, setLessonsNotes] = useState('');

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const reviewIdRef = useRef(reviewId);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const unmountedRef = useRef(false);
  const formDataJsonRef = useRef('');

  useEffect(() => { unmountedRef.current = false; return () => { unmountedRef.current = true; }; }, []);

  useEffect(() => {
    apiService.settings.getPairs().then(setPairs).catch(() => setPairs(DEFAULT_PAIRS));
  }, []);

  const formDataJson = useMemo(() => JSON.stringify({
    pair, weekStart, weekEnd, reviewDate, overallBias, status,
    candleType, highOrLowFirst, expansionDirection, oteTouched, oteDirection, oteReaction,
    marketQuality, difficulty, confidence,
    weeklyHigh, weeklyLow, highOrigin, lowOrigin, ote,
    story, lessons, lessonsNotes,
  }), [pair, weekStart, weekEnd, reviewDate, overallBias, status, candleType, highOrLowFirst, expansionDirection, oteTouched, oteDirection, oteReaction, marketQuality, difficulty, confidence, weeklyHigh, weeklyLow, highOrigin, lowOrigin, ote, story, lessons, lessonsNotes]);

  useEffect(() => { formDataJsonRef.current = formDataJson; }, [formDataJson]);

  const isDirty = () => {
    const last = reviewIdRef.current ? localStorage.getItem(`sr-snapshot-${reviewIdRef.current}`) : localStorage.getItem('sr-snapshot-new');
    return last !== formDataJsonRef.current;
  };

  useEffect(() => { dirtyRef.current = isDirty(); });

  useEffect(() => {
    if (!isEditMode || !reviewId) return;
    apiService.saturdayReviews.getById(reviewId)
      .then((r) => {
        setPair(r.pair || '');
        setWeekStart(r.weekStart || '');
        setWeekEnd(r.weekEnd || '');
        setReviewDate(r.reviewDate || new Date().toISOString().slice(0, 10));
        setOverallBias(r.overallBias || '');
        setStatus(r.status || 'Draft');
        setCandleType(r.candleType || '');
        setHighOrLowFirst(r.highOrLowFirst || '');
        setExpansionDirection(r.expansionDirection || '');
        setOteTouched(r.oteTouched || '');
        setOteDirection(r.oteDirection || '');
        setOteReaction(r.oteReaction || '');
        setMarketQuality(r.marketQuality || 0);
        setDifficulty(r.difficulty || '');
        setConfidence(r.confidence || 0);
        setStory(r.weeklyStory || '');
        setLessons(r.lessons || []);
        setLessonsNotes(r.lessonsNotes || '');
        const byType: Record<string, any> = {};
        for (const ev of r.events || []) byType[ev.eventType] = ev;
        setWeeklyHigh(eventFromApi(byType.weekly_high));
        setWeeklyLow(eventFromApi(byType.weekly_low));
        setHighOrigin(eventFromApi(byType.weekly_high_origin));
        setLowOrigin(eventFromApi(byType.weekly_low_origin));
        setOte(eventFromApi(byType.ote));
        localStorage.setItem(`sr-snapshot-${reviewId}`, '');
      })
      .catch(() => setError('Failed to load review data.'))
      .finally(() => setIsLoading(false));
  }, [isEditMode, reviewId]);

  useEffect(() => {
    if (!isEditMode) {
      const key = 'sr-snapshot-new';
      localStorage.setItem(key, '');
      return () => localStorage.removeItem(key);
    }
  }, [isEditMode]);

  const save = async (opts?: { statusOverride?: string }) => {
    if (savingRef.current) return;
    if (!pair || !weekStart || !weekEnd) {
      setError('Pair, week start, and week end are required before saving.');
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    const snapshot = formDataJsonRef.current;
    try {
      const payload: any = {
        pair, weekStart, weekEnd, reviewDate, overallBias,
        candleType, highOrLowFirst, expansionDirection,
        oteTouched, oteDirection, oteReaction,
        marketQuality, difficulty, confidence,
        weeklyStory: story,
        lessons, lessonsNotes,
        status: opts?.statusOverride || status,
      };
      const events: [string, EventFormValue][] = [
        ['weekly_high', weeklyHigh],
        ['weekly_low', weeklyLow],
        ['weekly_high_origin', highOrigin],
        ['weekly_low_origin', lowOrigin],
        ['ote', ote],
      ];
      let id = reviewId;
      if (!id) {
        const created = await apiService.saturdayReviews.create({ ...payload, status: 'Draft' });
        id = created.id || created._id;
        setReviewId(id);
        reviewIdRef.current = id;
        (window as any).__saturdayReviewEditId = id;
        for (const [type, value] of events) {
          if (hasEventContent(value)) {
            await apiService.saturdayReviews.upsertEvent(id, type, eventPayload(value));
          }
        }
        if (payload.status === 'Completed') {
          await apiService.saturdayReviews.update(id, { status: 'Completed' });
        }
      } else {
        for (const [type, value] of events) {
          if (hasEventContent(value)) {
            await apiService.saturdayReviews.upsertEvent(id, type, eventPayload(value));
          }
        }
        await apiService.saturdayReviews.update(id, payload);
      }

      localStorage.setItem(`sr-snapshot-${id}`, snapshot);
      if (!isEditMode) localStorage.removeItem('sr-snapshot-new');
      setStatus(opts?.statusOverride || status);
      setLastSaved(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to save review.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };
  saveRef.current = save;

  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && !savingRef.current && (reviewIdRef.current || (pair && weekStart && weekEnd))) {
        saveRef.current().catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => {
      if (dirtyRef.current && !savingRef.current && (reviewIdRef.current || (pair && weekStart && weekEnd))) {
        saveRef.current().catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      handler();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review' }));
  };

  const handleSaveDraft = async () => {
    await save();
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review' }));
  };

  const handleComplete = async () => {
    const completion = computeCompletion({
      weeklyHigh, weeklyLow, highOrigin, lowOrigin,
      candleType, highOrLowFirst, expansionDirection,
      oteTouched, oteDirection, oteReaction,
      marketQuality, difficulty, confidence,
    });
    if (!completion.completed) {
      setError(`Cannot mark as Completed. Missing: ${completion.missing.join(', ')}`);
      return;
    }
    await save({ statusOverride: 'Completed' });
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review' }));
  };

  const completion = computeCompletion({
    weeklyHigh, weeklyLow, highOrigin, lowOrigin,
    candleType, highOrLowFirst, expansionDirection,
    oteTouched, oteDirection, oteReaction,
    marketQuality, difficulty, confidence,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-48 bg-slate-200 rounded" />
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-40 bg-slate-200 rounded-3xl" />
          <div className="h-48 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 pb-32">
      <nav className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
        <button type="button" onClick={handleBack} className="hover:text-[#7C3AED]">Saturday Review</button>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{isEditMode ? 'Edit' : 'New'} Review</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">{isEditMode ? 'Edit Saturday Review' : 'Saturday Market Review'}</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Document how the market behaved this week using ICT/SMC concepts.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {lastSaved && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-500" /> Saved {format(lastSaved, 'h:mm a')}
            </span>
          )}
          {isSaving && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
              <Save className="size-3.5 animate-pulse" /> Saving…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl text-[14px] font-medium text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="bg-card rounded-2xl border border-[#E5EAF2] dark:border-slate-700 p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-foreground">Review Header</h2>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
              {status}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-[#7C3AED] dark:bg-purple-900/40 text-[11px] font-semibold">
              <Calendar className="size-3" /> {completion.percent}% complete
            </span>
          </div>
        </div>
        <Progress value={completion.percent} className="h-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className={labelClass}>Pair *</Label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select pair" /></SelectTrigger>
              <SelectContent>
                {pairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Week Start *</Label>
            <Input type="date" value={weekStart} onChange={(e) => {
              setWeekStart(e.target.value);
              if (e.target.value) setWeekEnd(addDays(e.target.value, 4));
            }} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Week End *</Label>
            <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Review Date</Label>
            <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={labelClass}>Overall Weekly Bias</Label>
            <BiasPicker value={overallBias} onChange={setOverallBias} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <SectionCard number={1} title="Weekly High & Low" subtitle="When did price make the weekly high and low?"
          isComplete={completion.completed && false}
          imageCount={weeklyHigh.images.length + weeklyLow.images.length}>
          <div className="space-y-4">
            <EventBlock title="Weekly High" value={weeklyHigh} onChange={setWeeklyHigh} showDay showDate showTime />
            <EventBlock title="Weekly Low" value={weeklyLow} onChange={setWeeklyLow} showDay showDate showTime />
          </div>
        </SectionCard>

        <SectionCard number={2} title="Weekly Candle Structure" subtitle="Candle type, order of formation, and expansion"
          isComplete={Boolean(candleType && highOrLowFirst && expansionDirection)}
          imageCount={0}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Candle Type</Label>
              <Select value={candleType} onValueChange={setCandleType}>
                <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select candle type" /></SelectTrigger>
                <SelectContent>
                  {CANDLE_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Which formed first?</Label>
              <Select value={highOrLowFirst} onValueChange={setHighOrLowFirst}>
                <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Weekly High / Low order" /></SelectTrigger>
                <SelectContent>
                  {HIGH_OR_LOW_FIRST.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Weekly Expansion Direction</Label>
              <Select value={expansionDirection} onValueChange={setExpansionDirection}>
                <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select direction" /></SelectTrigger>
                <SelectContent>
                  {EXPANSION_DIRECTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        <SectionCard number={3} title="Origin of Weekly High & Low" subtitle="Which key levels produced the extremes?"
          isComplete={Boolean((highOrigin.category && highOrigin.keyLevel) && (lowOrigin.category && lowOrigin.keyLevel))}
          imageCount={highOrigin.images.length + lowOrigin.images.length}>
          <div className="space-y-4">
            <EventBlock title="Origin of Weekly High" value={highOrigin} onChange={setHighOrigin} showCategory showKeyLevel />
            <EventBlock title="Origin of Weekly Low" value={lowOrigin} onChange={setLowOrigin} showCategory showKeyLevel />
          </div>
        </SectionCard>

        <SectionCard number={4} title="OTE Analysis" subtitle="Did price trade into the optimal trade entry zone?"
          isComplete={Boolean(oteTouched && (oteTouched === 'No' || (oteDirection && oteReaction)))}
          imageCount={ote.images.length}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Did price touch OTE?</Label>
              <div className="flex gap-2">
                {['Yes', 'No'].map(o => (
                  <button key={o} type="button" onClick={() => setOteTouched(oteTouched === o ? '' : o)}
                    className={`flex-1 h-11 rounded-xl text-[13px] font-semibold transition-all duration-200 ${oteTouched === o ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-500/25' : 'border-2 border-[#E2E8F0] bg-card text-muted-foreground hover:border-[#CBD5E1]'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            {oteTouched === 'Yes' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Direction</Label>
                    <Select value={oteDirection} onValueChange={setOteDirection}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Bullish / Bearish" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bullish">Bullish</SelectItem>
                        <SelectItem value="Bearish">Bearish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Did market react correctly?</Label>
                    <Select value={oteReaction} onValueChange={setOteReaction}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select reaction" /></SelectTrigger>
                      <SelectContent>
                        {OTE_REACTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <EventBlock title="OTE Details" value={ote} onChange={setOte} showDay showTime />
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard number={5} title="Weekly Story" subtitle="Optional — the complete narrative of the week" isComplete={story.trim().length > 0} imageCount={0}>
          <RichTextEditor value={story} onChange={setStory} placeholder={WEEKLY_STORY_PLACEHOLDER} />
        </SectionCard>

        <SectionCard number={6} title="Lessons Learned" subtitle="Optional — what to carry forward" isComplete={lessons.length > 0 || lessonsNotes.trim().length > 0} imageCount={0}>
          <LessonChecklist lessons={lessons} onChange={setLessons} notes={lessonsNotes} onNotesChange={setLessonsNotes} />
        </SectionCard>

        <SectionCard number={7} title="Weekly Rating" subtitle="Market quality, difficulty, and confidence"
          isComplete={Boolean(marketQuality > 0 && difficulty && confidence > 0)}
          imageCount={0}>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className={labelClass}>Market Quality</Label>
              <StarRating value={marketQuality} onChange={setMarketQuality} />
            </div>
            <div className="space-y-2">
              <Label className={labelClass}>Difficulty</Label>
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </div>
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
          </div>
        </SectionCard>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-[260px] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-[#E5EAF2] dark:border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={handleBack}>Cancel</Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button onClick={handleComplete} disabled={isSaving}
              className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-lg shadow-purple-500/25 px-8">
              Mark as Completed
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { SaturdayReviewForm };
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SaturdayReview/SaturdayReviewForm.tsx
git commit -m "feat: add SaturdayReview form with 7 sections and auto-save"
```

---

### Task 8: SaturdayReviewList (table, filters, search, sort, duplicate dialog)

**Files:**
- Create: `src/app/components/SaturdayReview/SaturdayReviewList.tsx`

**Interfaces:**
- Consumes: `apiService.saturdayReviews` + `apiService.settings.getPairs`, constants from Task 3, `Button`/`Input`/`Select`/`Skeleton`/`Badge`/`Table` from ui, `Modal` from `../ui/Modal`, date-fns `format`, lucide icons, `addDays` from utils.
- Produces: the list page with `View`/`Edit`/`Duplicate`/`Delete` actions. Navigation: sets `__saturdayReviewId`/`__saturdayReviewEditId` and dispatches `navigate-to-tab`.

- [ ] **Step 1: Create the list component**

`src/app/components/SaturdayReview/SaturdayReviewList.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Pencil, Copy, Trash2, ChevronLeft, ChevronRight, Star, StarHalf } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import Modal from '../ui/Modal';
import apiService from '../../services/apiService';
import { DEFAULT_PAIRS, CANDLE_TYPES, OVERALL_BIASES, STATUSES } from './saturdayReviewConstants';
import { addDays } from './saturdayReviewUtils';

const LIMIT = 12;
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }) }));
const YEARS = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableCell key={i}><Skeleton className="h-5 w-full" /></TableCell>
      ))}
    </TableRow>
  );
}

export default function SaturdayReviewList() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [filters, setFilters] = useState({ pair: '', month: '', year: '', bias: '', candleType: '', status: '', search: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [duplicateTarget, setDuplicateTarget] = useState<any>(null);
  const [dupWeekStart, setDupWeekStart] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  useEffect(() => {
    apiService.settings.getPairs().then(setPairs).catch(() => setPairs(DEFAULT_PAIRS));
  }, []);

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const loadReviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.saturdayReviews.getAll({
        pair: filters.pair || undefined,
        month: filters.month ? parseInt(filters.month) : undefined,
        year: filters.year ? parseInt(filters.year) : undefined,
        bias: filters.bias || undefined,
        candleType: filters.candleType || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        sort: 'weekStart:desc',
        page,
        limit: LIMIT,
      });
      setReviews(result.reviews || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleOpen = (review: any) => {
    (window as any).__saturdayReviewId = review.id || review._id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-detail' }));
  };

  const handleEdit = (review: any) => {
    (window as any).__saturdayReviewEditId = review.id || review._id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDelete = async (review: any) => {
    if (!confirm(`Delete Saturday review for ${review.pair}?`)) return;
    try {
      await apiService.saturdayReviews.delete(review.id || review._id);
      loadReviews();
    } catch (err: any) {
      alert('Failed to delete review. Please try again.');
    }
  };

  const handleCreateNew = () => {
    (window as any).__saturdayReviewEditId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const openDuplicate = (review: any) => {
    setDuplicateTarget(review);
    setDupWeekStart(addDays(review.weekEnd, 4));
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget || !dupWeekStart) return;
    setIsDuplicating(true);
    try {
      const created = await apiService.saturdayReviews.duplicate(duplicateTarget.id || duplicateTarget._id, {
        weekStart: dupWeekStart,
        weekEnd: addDays(dupWeekStart, 4),
      });
      setDuplicateTarget(null);
      (window as any).__saturdayReviewId = created.id || created._id;
      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-detail' }));
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate review.');
    } finally {
      setIsDuplicating(false);
    }
  };

  const RatingStars = ({ value }: { value: number }) => {
    if (!value) return <span className="text-muted-foreground">–</span>;
    return (
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} className={`size-3.5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-[#CBD5E1]'}`} />
        ))}
      </span>
    );
  };

  const BiasBadge = ({ bias }: { bias: string }) => {
    if (!bias) return <span className="text-muted-foreground">–</span>;
    return (
      <Badge variant="outline" className={
        bias === 'Bullish' ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-700' :
        bias === 'Bearish' ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-700' :
        'text-slate-600 border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-600'
      }>{bias}</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-foreground font-semibold">Saturday Review</h1>
          <p className="text-body text-muted-foreground mt-1">Weekly ICT/SMC market analysis — one review per pair per trading week.</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 transition-transform">
          <Plus className="size-4" /> New Review
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <Select value={filters.pair} onValueChange={(v) => handleFilterChange('pair', v)}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All pairs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="hidden">All pairs</SelectItem>
            {pairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.month} onValueChange={(v) => handleFilterChange('month', v)}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Any month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="hidden">Any month</SelectItem>
            {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.year} onValueChange={(v) => handleFilterChange('year', v)}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Any year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="hidden">Any year</SelectItem>
            {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.bias} onValueChange={(v) => handleFilterChange('bias', v)}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Any bias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="hidden">Any bias</SelectItem>
            {OVERALL_BIASES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.candleType} onValueChange={(v) => handleFilterChange('candleType', v)}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Any candle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="hidden">Any candle</SelectItem>
            {CANDLE_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Any status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="hidden">Any status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search pair, notes, story..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadReviews}>Retry</Button>
        </div>
      )}

      {!error && isLoading && (
        <div className="border border-[#E5EAF2] dark:border-slate-700 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {['Pair', 'Week', 'Bias', 'Candle', 'OTE', 'Status', 'Rating', 'Created', 'Actions'].map(h => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
            </TableBody>
          </Table>
        </div>
      )}

      {!error && !isLoading && reviews.length === 0 && (
        <div className="text-center py-20">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center mx-auto mb-4">
            <StarHalf className="size-8 text-[#7C3AED]/40" />
          </div>
          <h3 className="text-card-title text-foreground mb-2">No Saturday reviews yet</h3>
          <p className="text-body text-muted-foreground mb-6">Create your first weekly market analysis to start building your ICT reference library.</p>
          <Button onClick={handleCreateNew}>New Review</Button>
        </div>
      )}

      {!error && !isLoading && reviews.length > 0 && (
        <>
          <div className="border border-[#E5EAF2] dark:border-slate-700 rounded-2xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Bias</TableHead>
                    <TableHead>Candle Type</TableHead>
                    <TableHead>OTE</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id || review._id} className="hover:bg-muted/50">
                      <TableCell className="font-semibold text-foreground">{review.pair}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {review.weekStart && review.weekEnd
                          ? `${format(new Date(review.weekStart + 'T00:00:00'), 'MMM d')} – ${format(new Date(review.weekEnd + 'T00:00:00'), 'MMM d, yyyy')}`
                          : '–'}
                      </TableCell>
                      <TableCell><BiasBadge bias={review.overallBias} /></TableCell>
                      <TableCell className="text-muted-foreground">{review.candleType || '–'}</TableCell>
                      <TableCell className="text-muted-foreground">{review.oteTouched || '–'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={review.status === 'Completed' ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-700' : 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'}>
                          {review.status}
                        </Badge>
                      </TableCell>
                      <TableCell><RatingStars value={review.marketQuality} /></TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(review.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpen(review)} title="View" className="p-2 rounded-lg text-muted-foreground hover:text-[#7C3AED] hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"><Eye className="size-4" /></button>
                          <button onClick={() => handleEdit(review)} title="Edit" className="p-2 rounded-lg text-muted-foreground hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"><Pencil className="size-4" /></button>
                          <button onClick={() => openDuplicate(review)} title="Duplicate" className="p-2 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"><Copy className="size-4" /></button>
                          <button onClick={() => handleDelete(review)} title="Delete" className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><Trash2 className="size-4" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-body text-muted-foreground">Page {page} of {totalPages} ({total} reviews)</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={!!duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
        title="Duplicate Saturday Review"
        subtitle={duplicateTarget ? `${duplicateTarget.pair} — choose the new trading week` : ''}
        size="md"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setDuplicateTarget(null)} disabled={isDuplicating}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={!dupWeekStart || isDuplicating}
              className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white">
              {isDuplicating ? 'Duplicating…' : 'Duplicate Review'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-muted-foreground">New Week Start (Monday)</label>
            <Input type="date" value={dupWeekStart} onChange={(e) => setDupWeekStart(e.target.value)} />
            {dupWeekStart && (
              <p className="text-[12px] text-muted-foreground">
                Week: {format(new Date(dupWeekStart + 'T00:00:00'), 'MMM d')} – {format(new Date(addDays(dupWeekStart, 4) + 'T00:00:00'), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export { SaturdayReviewList };
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SaturdayReview/SaturdayReviewList.tsx
git commit -m "feat: add SaturdayReview list with filters, search, and duplicate"
```

---

### Task 9: SaturdayReviewDetail (read-only view page)

**Files:**
- Create: `src/app/components/SaturdayReview/SaturdayReviewDetail.tsx`

**Interfaces:**
- Consumes: `apiService.saturdayReviews.getById`, `ImageViewer` from `../ImageViewer`, `getResponsiveUrl`/`getThumbnail` from `../../utils/cloudinary`, date-fns `format`, lucide icons, framer-motion, `DOMPurify` from `dompurify`, Badge/Skeleton/Button from ui.
- Produces: the read-only detail page. Reads `(window as any).__saturdayReviewId`.

- [ ] **Step 1: Create the detail component**

`src/app/components/SaturdayReview/SaturdayReviewDetail.tsx`:
```tsx
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, Pencil, Copy, Trash2, Star, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { Skeleton } from '../ui/skeleton';
import apiService from '../../services/apiService';
import ImageViewer from '../ImageViewer';
import { getResponsiveUrl, getThumbnail } from '../../utils/cloudinary';
import { addDays, computeCompletion } from './saturdayReviewUtils';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="bg-card rounded-2xl border border-[#E5EAF2] dark:border-slate-700 p-5 shadow-sm"
    >
      <h3 className="text-[15px] font-bold text-foreground mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

function ValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold text-foreground">{value || '–'}</span>
    </div>
  );
}

function ImageGallery({ images, onView }: { images: any[]; onView: (images: { url: string; label: string }[], index: number) => void }) {
  if (images.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No charts added.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {images.map((img, i) => (
        <div
          key={img.id || i}
          className="group relative aspect-video bg-muted rounded-xl border border-border overflow-hidden cursor-pointer"
          onClick={() => onView(images.map((im, idx) => ({ url: im.image || im.url, label: im.caption || `Chart ${idx + 1}` })), i)}
        >
          <img src={getThumbnail(img.image || img.url)} alt={img.caption || ''} loading="lazy"
            className="w-full h-full object-cover hover:scale-105 transition-transform" />
          {img.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <span className="text-xs text-white truncate block">{img.caption}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`size-4 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-[#CBD5E1]'}`} />
      ))}
    </span>
  );
}

export default function SaturdayReviewDetail() {
  const [review, setReview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingImages, setViewingImages] = useState<{ images: { url: string; label: string }[]; index: number } | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<any>(null);
  const [dupWeekStart, setDupWeekStart] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  const reviewId = (window as any).__saturdayReviewId;

  useEffect(() => {
    if (!reviewId) {
      setIsLoading(false);
      return;
    }
    apiService.saturdayReviews.getById(reviewId)
      .then(setReview)
      .catch((err: any) => setError(err.message || 'Failed to load review'))
      .finally(() => setIsLoading(false));
  }, [reviewId]);

  const eventsByType = useMemo(() => {
    const map: Record<string, any> = {};
    for (const ev of review?.events || []) map[ev.eventType] = ev;
    return map;
  }, [review]);

  const handleBack = () => {
    (window as any).__saturdayReviewId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review' }));
  };

  const handleEdit = () => {
    (window as any).__saturdayReviewEditId = review.id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const openDuplicate = () => {
    setDuplicateTarget(review);
    setDupWeekStart(addDays(review.weekEnd, 4));
  };

  const handleDuplicate = async () => {
    if (!dupWeekStart) return;
    setIsDuplicating(true);
    try {
      const created = await apiService.saturdayReviews.duplicate(review.id, {
        weekStart: dupWeekStart,
        weekEnd: addDays(dupWeekStart, 4),
      });
      setDuplicateTarget(null);
      (window as any).__saturdayReviewId = created.id || created._id;
      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-detail' }));
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate review.');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete Saturday review for ${review.pair}?`)) return;
    try {
      await apiService.saturdayReviews.delete(review.id);
      handleBack();
    } catch {
      alert('Failed to delete review.');
    }
  };

  if (!reviewId) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">No review selected</div>;
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[200px] w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Button variant="outline" onClick={handleBack}><ArrowLeft className="size-4" /> Back to Reviews</Button>
        <p className="mt-6 text-red-600">{error || 'Review not found'}</p>
      </div>
    );
  }

  const wh = eventsByType.weekly_high || {};
  const wl = eventsByType.weekly_low || {};
  const ho = eventsByType.weekly_high_origin || {};
  const lo = eventsByType.weekly_low_origin || {};
  const ote = eventsByType.ote || {};

  const allEvents = [wh, wl, ho, lo, ote];
  const totalImages = allEvents.reduce((sum, ev) => sum + (ev.images?.length || 0), 0);
  const keyLevels = [ho.keyLevel, lo.keyLevel].filter(Boolean);
  const filledEvents = allEvents.filter(ev => ev.day || ev.date || ev.time || ev.category || ev.keyLevel || ev.answer || (ev.images?.length || 0) > 0).length;
  const completionPercent = computeCompletion({
    weeklyHigh: wh,
    weeklyLow: wl,
    highOrigin: ho,
    lowOrigin: lo,
    candleType: review.candleType,
    highOrLowFirst: review.highOrLowFirst,
    expansionDirection: review.expansionDirection,
    oteTouched: review.oteTouched,
    oteDirection: review.oteDirection,
    oteReaction: review.oteReaction,
    marketQuality: review.marketQuality,
    difficulty: review.difficulty,
    confidence: review.confidence,
  }).percent;

  const BiasIcon = ({ bias }: { bias: string }) => {
    if (bias === 'Bullish') return <TrendingUp className="size-4" />;
    if (bias === 'Bearish') return <TrendingDown className="size-4" />;
    return <Minus className="size-4" />;
  };

  return (
    <div className="relative min-h-screen pb-32">
      <div className="px-6 pt-6 pb-4 max-w-6xl mx-auto">
        <button onClick={handleBack} className="inline-flex items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground transition-colors group">
          <div className="size-7 rounded-lg bg-card border border-border flex items-center justify-center group-hover:border-[#7C3AED] group-hover:bg-purple-50 dark:group-hover:bg-purple-900/30 transition-all duration-200">
            <ArrowLeft className="size-3.5" />
          </div>
          Back to Saturday Reviews
        </button>
      </div>

      <div className="px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="relative h-[200px] rounded-3xl bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4F46E5] overflow-hidden mb-8"
        >
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 size-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/4 size-48 bg-white/5 rounded-full translate-y-1/3" />
          </div>
          <div className="relative h-full flex flex-col justify-center px-8 md:px-12">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <h1 className="text-[2rem] md:text-[2.5rem] font-bold text-white tracking-tight">{review.pair}</h1>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                <Calendar className="size-3.5 text-purple-200" />
                <span className="text-sm font-medium text-white/90">
                  {format(new Date(review.weekStart + 'T00:00:00'), 'MMM d')} — {format(new Date(review.weekEnd + 'T00:00:00'), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {review.overallBias && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium">
                  <BiasIcon bias={review.overallBias} /> {review.overallBias}
                </span>
              )}
              <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium ${review.status === 'Completed' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>
                {review.status}
              </span>
              <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/10 text-white/80 text-sm">
                <Star className="size-3.5" /> {review.marketQuality ? `${review.marketQuality}/5` : 'Not rated'}
              </span>
            </div>
            <div className="sm:hidden flex items-center gap-2 mt-4">
              <span className="text-xs font-medium text-white/90">
                {format(new Date(review.weekStart + 'T00:00:00'), 'MMM d')} — {format(new Date(review.weekEnd + 'T00:00:00'), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Section title="Weekly High">
                <ValueRow label="Day" value={wh.day} />
                <ValueRow label="Date" value={wh.date ? format(new Date(wh.date + 'T00:00:00'), 'MMM d, yyyy') : ''} />
                <ValueRow label="Time" value={wh.time} />
                {wh.notes && <p className="mt-3 text-[14px] text-foreground leading-relaxed">{wh.notes}</p>}
                <div className="mt-4"><ImageGallery images={wh.images || []} onView={setViewingImages} /></div>
              </Section>
              <Section title="Weekly Low">
                <ValueRow label="Day" value={wl.day} />
                <ValueRow label="Date" value={wl.date ? format(new Date(wl.date + 'T00:00:00'), 'MMM d, yyyy') : ''} />
                <ValueRow label="Time" value={wl.time} />
                {wl.notes && <p className="mt-3 text-[14px] text-foreground leading-relaxed">{wl.notes}</p>}
                <div className="mt-4"><ImageGallery images={wl.images || []} onView={setViewingImages} /></div>
              </Section>
            </div>

            <Section title="Weekly Candle Structure">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ValueRow label="Candle Type" value={review.candleType} />
                <ValueRow label="Formed First" value={review.highOrLowFirst} />
                <ValueRow label="Expansion" value={review.expansionDirection} />
              </div>
            </Section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Section title="Origin of Weekly High">
                <ValueRow label="Category" value={ho.category} />
                <ValueRow label="Key Level" value={ho.keyLevel} />
                {ho.notes && <p className="mt-3 text-[14px] text-foreground leading-relaxed">{ho.notes}</p>}
                <div className="mt-4"><ImageGallery images={ho.images || []} onView={setViewingImages} /></div>
              </Section>
              <Section title="Origin of Weekly Low">
                <ValueRow label="Category" value={lo.category} />
                <ValueRow label="Key Level" value={lo.keyLevel} />
                {lo.notes && <p className="mt-3 text-[14px] text-foreground leading-relaxed">{lo.notes}</p>}
                <div className="mt-4"><ImageGallery images={lo.images || []} onView={setViewingImages} /></div>
              </Section>
            </div>

            <Section title="OTE Analysis">
              <ValueRow label="OTE Touched" value={review.oteTouched} />
              {review.oteTouched === 'Yes' && (
                <>
                  <ValueRow label="Direction" value={review.oteDirection} />
                  <ValueRow label="Reaction" value={review.oteReaction} />
                  <ValueRow label="Day" value={ote.day} />
                  <ValueRow label="Time" value={ote.time} />
                </>
              )}
              {ote.notes && <p className="mt-3 text-[14px] text-foreground leading-relaxed">{ote.notes}</p>}
              <div className="mt-4"><ImageGallery images={ote.images || []} onView={setViewingImages} /></div>
            </Section>

            {review.weeklyStory && (
              <Section title="Weekly Story">
                <div
                  className="prose prose-sm max-w-none text-[14px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(review.weeklyStory) }}
                />
              </Section>
            )}

            {(review.lessons?.length > 0 || review.lessonsNotes) && (
              <Section title="Lessons Learned">
                {review.lessons?.filter((l: any) => l.checked).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.lessons.filter((l: any) => l.checked).map((l: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-[13px] font-medium text-purple-700 dark:text-purple-300">
                        <CheckCircle2 className="size-3.5" /> {l.label}
                      </span>
                    ))}
                  </div>
                )}
                {review.lessonsNotes && <p className="mt-3 text-[14px] text-foreground leading-relaxed">{review.lessonsNotes}</p>}
              </Section>
            )}

            <Section title="Weekly Rating">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ValueRow label="Market Quality" value={<Stars value={review.marketQuality} />} />
                <ValueRow label="Difficulty" value={review.difficulty} />
                <ValueRow label="Confidence" value={review.confidence ? `${review.confidence}/10` : ''} />
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="bg-card rounded-2xl border border-[#E5EAF2] dark:border-slate-700 p-5 shadow-sm"
            >
              <h3 className="text-[15px] font-bold text-foreground mb-4">Quick Stats</h3>
              <ValueRow label="Completion" value={<span className="text-purple-600">{review.completion?.percent ?? completionPercent}%</span>} />
              <ValueRow label="Total Charts" value={totalImages} />
              <ValueRow label="Key Levels" value={keyLevels.length} />
              <ValueRow label="Events Filled" value={filledEvents} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="bg-card rounded-2xl border border-[#E5EAF2] dark:border-slate-700 p-5 shadow-sm"
            >
              <h3 className="text-[15px] font-bold text-foreground mb-4">Actions</h3>
              <div className="flex flex-col gap-3">
                <Button onClick={handleEdit} className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white">
                  <Pencil className="size-4" /> Edit Review
                </Button>
                <Button variant="outline" onClick={openDuplicate}>
                  <Copy className="size-4" /> Duplicate
                </Button>
                <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-600 hover:border-red-300 dark:hover:border-red-700">
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {viewingImages && (
        <ImageViewer
          images={viewingImages.images}
          initialIndex={viewingImages.index}
          onClose={() => setViewingImages(null)}
        />
      )}

      <Modal
        isOpen={!!duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
        title="Duplicate Saturday Review"
        subtitle={duplicateTarget ? `${duplicateTarget.pair} — choose the new trading week` : ''}
        size="md"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setDuplicateTarget(null)} disabled={isDuplicating}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={!dupWeekStart || isDuplicating}
              className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white">
              {isDuplicating ? 'Duplicating…' : 'Duplicate Review'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-muted-foreground">New Week Start (Monday)</label>
            <Input type="date" value={dupWeekStart} onChange={(e) => setDupWeekStart(e.target.value)} />
            {dupWeekStart && (
              <p className="text-[12px] text-muted-foreground">
                Week: {format(new Date(dupWeekStart + 'T00:00:00'), 'MMM d')} – {format(new Date(addDays(dupWeekStart, 4) + 'T00:00:00'), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export { SaturdayReviewDetail };
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: builds without errors. (The detail page imports `Modal`, `Input`, `ImageViewer`, `addDays`, `computeCompletion` — verify the `Modal`/`Input` ui exports and `ImageViewer` default export paths are correct.)

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SaturdayReview/SaturdayReviewDetail.tsx
git commit -m "feat: add SaturdayReview read-only detail page"
```

---

### Task 10: Wire tabs in Sidebar + App.tsx

**Files:**
- Modify: `src/app/components/Sidebar.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Adds `saturday-review`, `saturday-review-detail`, `saturday-review-form` to the `Tab` union, adds the nav item under the **Analysis** group, adds lazy imports + `TabContent` cases, and registers the 3 new tabs in the active-tab localStorage validation list.

- [ ] **Step 1: Sidebar.tsx — extend `Tab` type and add nav item**

1. In `src/app/components/Sidebar.tsx`, append to the `Tab` union (line ~33):
```typescript
| 'saturday-review' | 'saturday-review-detail' | 'saturday-review-form'
```
2. Add the nav item inside the **Analysis** group (after `breached-trades`, line ~99). Import `Newspaper` from `lucide-react` (add to the icon import at line 2–9):
```typescript
      { id: 'saturday-review', label: 'Saturday Review', icon: Newspaper },
```

- [ ] **Step 2: App.tsx — lazy imports + tab cases + localStorage validation**

1. Add lazy imports after the `Reminders` lazy import (line ~48):
```typescript
const SaturdayReviewList = lazy(() => import('./components/SaturdayReview/SaturdayReviewList'));
const SaturdayReviewDetail = lazy(() => import('./components/SaturdayReview/SaturdayReviewDetail'));
const SaturdayReviewForm = lazy(() => import('./components/SaturdayReview/SaturdayReviewForm'));
```
2. Add `TabContent` cases after the `reminders` case (line ~93):
```typescript
            {activeTab === 'saturday-review' && <SaturdayReviewList />}
            {activeTab === 'saturday-review-detail' && <SaturdayReviewDetail />}
            {activeTab === 'saturday-review-form' && <SaturdayReviewForm />}
```
3. Add the three new tab ids to the localStorage validation array in `App()` (line ~106, the `['dashboard', ..., 'reminders']` list) — append `'saturday-review', 'saturday-review-detail', 'saturday-review-form'` before the closing `]`.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: builds without errors. Manually test in the running dev server:
- The **Saturday Review** item appears in the **Analysis** sidebar group.
- Clicking it opens the list page.
- Clicking "New Review" opens the form; saving navigates to the detail page.
- The active tab survives a page reload.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/Sidebar.tsx src/app/App.tsx
git commit -m "feat: wire SaturdayReview tabs into navigation"
```