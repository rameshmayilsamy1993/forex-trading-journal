# Saturday Review Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Saturday Review module to FX Journal — one pair + one trading week per review, with 7 structured analysis sections, image galleries, a rich-text weekly story, auto-saving drafts, a completion-gated `Completed` status, and a read-only view page.

**Architecture:** Backend: a new `saturdayReviews` Express module (3 normalized Mongoose models: review, event, image) mounted at `/api/saturday-reviews`, following the `weeklyReviews` pattern. Frontend: new `src/app/components/SaturdayReview/` folder with a list table, an auto-saving create/edit form with collapsible section cards, and a read-only detail page, wired into the existing tab-based navigation.

**Tech Stack:** Node.js + Express + Mongoose (backend); React + TypeScript + Vite + Tailwind + shadcn/ui primitives + tiptap + framer-motion (frontend); Cloudinary for images.

## Global Constraints

- **No test framework exists in this repo.** Verification is manual: `node --check` for backend syntax, a curl smoke test against a running dev server for backend behavior, and `pnpm build` (vite) for frontend build correctness.
- **Follow AGENTS.md conventions**: every backend query filtered by `req.session.userId`; `mongoose.Types.ObjectId.isValid()` checked on all ID params; `schemaOptions` applied for toJSON (`_id` → `id`); async handlers wrapped in try/catch → `next(error)`; Cloudinary `deleteImage` cleanup on delete; Mongo `11000` mapped to 409.
- **Pairs** come from `apiService.settings.getPairs()` (fallback `DEFAULT_PAIRS` = `['XAUUSD','EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','NZDUSD','USDCHF']`).
- **Images**: PNG/JPEG/WEBP only, ≤10MB each, client-side compressed (≤1600px, WEBP q0.8) before Cloudinary upload, lazy-loaded via `getThumbnail`/`getResponsiveUrl`.
- **Dates** are ISO strings (`YYYY-MM-DD`), stored as strings in Mongo.
- **UI**: reuse `src/app/components/ui/*` primitives (Button, Select, Badge, Input, Label, Textarea, TimePicker, Progress, Slider, Table, Skeleton, Dialog). Premium styling consistent with existing pages (rounded-2xl cards, `#0F172A` text, `#2563EB`/`#7C3AED` gradients, violet/blue accent system). No unnecessary comments.
- **New types** go in `src/app/types/trading.ts`; dropdown-option constants and completion config go in `src/app/components/SaturdayReview/saturdayReviewConstants.ts`; pure helpers in `saturdayReviewUtils.ts`.
- **Completion criteria** (mandatory): header (pair, weekStart, overallBias, reviewDate) + Weekly High event (day, date, time) + Weekly Low event (day, date, time) + Candle (candleType, highOrLowFirst, expansionDirection) + High Origin event (category, keyLevel) + Low Origin event (category, keyLevel) + OTE (oteTouched; when `Yes` also oteDirection, oteReaction, OTE event day + time) + non-empty weeklyStory. S6 Lessons and S7 Rating are **optional**. Denominator = 19 base + 4 conditional when `oteTouched === 'Yes'`.
- **Week identity**: `weekStart` must be a Monday (`snapToMonday`); `weekEnd = weekStart + 4 days` (Friday). Duplicate `{userId, pair, weekStart}` → 409.
- **Duplicate action** (frontend-only): list sets `window.__saturdayReviewDuplicate = { pair, overallBias }` and navigates to the form, which pre-fills pair + bias and opens with an empty week. No server endpoint.
- **Auto-save**: lazily create the Draft the first time pair + weekStart are valid; then PUT changed review fields + upsert changed events every 30s and on unmount. Never auto-sets `Completed`.

---

### Task 1: Backend models (review, event, image)

**Files:**
- Create: `backend/src/modules/saturdayReviews/saturdayReview.model.js`
- Create: `backend/src/modules/saturdayReviews/saturdayReviewEvent.model.js`
- Create: `backend/src/modules/saturdayReviews/saturdayReviewImage.model.js`

**Interfaces:**
- Consumes: `schemaOptions` from `../../config/schemaOptions` (exists).
- Produces: Mongoose models `SaturdayReview`, `SaturdayReviewEvent` (with `EVENT_TYPES` export), `SaturdayReviewImage`. Later tasks import these.

- [ ] **Step 1: Create `saturdayReview.model.js`**

```js
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const saturdayReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  weekStart: { type: String, required: true },
  weekEnd: { type: String, required: true },
  reviewDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  overallBias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: '' },
  candleType: { type: String, default: '' },
  highOrLowFirst: { type: String, default: '' },
  expansionDirection: { type: String, default: '' },
  oteTouched: { type: String, enum: ['Yes', 'No'], default: '' },
  oteDirection: { type: String, enum: ['Bullish', 'Bearish'], default: '' },
  oteReaction: { type: String, enum: ['Yes', 'No', 'Partial'], default: '' },
  marketQuality: { type: Number, min: 1, max: 5 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: '' },
  confidence: { type: Number, min: 1, max: 10 },
  weeklyStory: { type: String, default: '' },
  lessons: { type: [{ label: String, checked: Boolean }], default: [] },
  lessonsNotes: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Completed'], default: 'Draft' },
  lastAiUpdateAt: { type: Date },
}, schemaOptions);

saturdayReviewSchema.index({ userId: 1, pair: 1, weekStart: 1 }, { unique: true });
saturdayReviewSchema.index({ userId: 1, weekStart: -1 });

module.exports = mongoose.model('SaturdayReview', saturdayReviewSchema);
```

- [ ] **Step 2: Create `saturdayReviewEvent.model.js`**

```js
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const EVENT_TYPES = ['weekly_high', 'weekly_low', 'candle', 'weekly_high_origin', 'weekly_low_origin', 'ote'];

const saturdayReviewEventSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaturdayReview', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventType: { type: String, enum: EVENT_TYPES, required: true },
  day: { type: String, default: '' },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  category: { type: String, enum: ['Weekly', 'Daily'], default: '' },
  keyLevel: { type: String, default: '' },
  answer: { type: String, default: '' },
  notes: { type: String, default: '' },
}, schemaOptions);

saturdayReviewEventSchema.index({ reviewId: 1, eventType: 1 }, { unique: true });
saturdayReviewEventSchema.index({ userId: 1 });

module.exports = mongoose.model('SaturdayReviewEvent', saturdayReviewEventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
```

- [ ] **Step 3: Create `saturdayReviewImage.model.js`**

```js
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

saturdayReviewImageSchema.index({ reviewId: 1, eventId: 1, sortOrder: 1 });
saturdayReviewImageSchema.index({ eventId: 1 });

module.exports = mongoose.model('SaturdayReviewImage', saturdayReviewImageSchema);
```

- [ ] **Step 4: Syntax-check and commit**

```bash
node --check backend/src/modules/saturdayReviews/saturdayReview.model.js
node --check backend/src/modules/saturdayReviews/saturdayReviewEvent.model.js
node --check backend/src/modules/saturdayReviews/saturdayReviewImage.model.js
```

Expected: no output, exit 0 for all three.

```bash
git add backend/src/modules/saturdayReviews
git commit -m "feat: saturday review models"
```

---

### Task 2: Backend completion helper

**Files:**
- Create: `backend/src/modules/saturdayReviews/saturdayReviewCompletion.js`

**Interfaces:**
- Consumes: nothing (plain functions).
- Produces: `computeCompletion(review, events)` → `{ percent, complete, filled, total }` where `review` is a plain object with `pair`, `weekStart`, `overallBias`, `reviewDate`, `candleType`, `highOrLowFirst`, `expansionDirection`, `oteTouched`, `oteDirection`, `oteReaction`, `weeklyStory`; `events` is an array of event objects (must include `eventType` and event fields). Task 3 and the frontend `saturdayReviewUtils.ts` mirror this logic.

- [ ] **Step 1: Create `saturdayReviewCompletion.js`**

```js
const eventField = (eventType, key, condition) => {
  const field = { source: 'event', eventType, key };
  if (condition) field.condition = condition;
  return field;
};

const COMPLETION_FIELDS = [
  { source: 'review', key: 'pair' },
  { source: 'review', key: 'weekStart' },
  { source: 'review', key: 'overallBias' },
  { source: 'review', key: 'reviewDate' },
  eventField('weekly_high', 'day'),
  eventField('weekly_high', 'date'),
  eventField('weekly_high', 'time'),
  eventField('weekly_low', 'day'),
  eventField('weekly_low', 'date'),
  eventField('weekly_low', 'time'),
  { source: 'review', key: 'candleType' },
  { source: 'review', key: 'highOrLowFirst' },
  { source: 'review', key: 'expansionDirection' },
  eventField('weekly_high_origin', 'category'),
  eventField('weekly_high_origin', 'keyLevel'),
  eventField('weekly_low_origin', 'category'),
  eventField('weekly_low_origin', 'keyLevel'),
  { source: 'review', key: 'oteTouched' },
  { source: 'review', key: 'weeklyStory', nonEmpty: true },
  { source: 'review', key: 'oteDirection', condition: (r) => r.oteTouched === 'Yes' },
  { source: 'review', key: 'oteReaction', condition: (r) => r.oteTouched === 'Yes' },
  eventField('ote', 'day', (r) => r.oteTouched === 'Yes'),
  eventField('ote', 'time', (r) => r.oteTouched === 'Yes'),
];

function isFilled(value, field) {
  if (field.nonEmpty) {
    const text = String(value || '').replace(/<[^>]*>/g, '').trim();
    return text.length > 0;
  }
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function computeCompletion(review, events) {
  const eventsByType = {};
  for (const event of events || []) {
    eventsByType[event.eventType] = event;
  }
  let filled = 0;
  let total = 0;
  for (const field of COMPLETION_FIELDS) {
    if (field.condition && !field.condition(review)) continue;
    total += 1;
    const value = field.source === 'event'
      ? eventsByType[field.eventType]?.[field.key]
      : review[field.key];
    if (isFilled(value, field)) filled += 1;
  }
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { percent, complete: filled === total, filled, total };
}

module.exports = { computeCompletion, COMPLETION_FIELDS };
```

- [ ] **Step 2: Syntax-check and commit**

```bash
node --check backend/src/modules/saturdayReviews/saturdayReviewCompletion.js
git add backend/src/modules/saturdayReviews/saturdayReviewCompletion.js
git commit -m "feat: saturday review completion helper"
```

---

### Task 3: Backend review controller (CRUD + list)

**Files:**
- Create: `backend/src/modules/saturdayReviews/saturdayReview.controller.js`

**Interfaces:**
- Consumes: `SaturdayReview`, `SaturdayReviewEvent`, `SaturdayReviewImage` (Task 1), `computeCompletion` (Task 2), `deleteImage` from `../../config/cloudinary`.
- Produces: controller functions `getAll`, `getById`, `create`, `update`, `remove` used by Task 5. `getById` returns `{ ...review, completionPercent, events: [ { ...event, images: [...] } ] }`. List rows return `{ ...review, completionPercent, imageCount }`.

- [ ] **Step 1: Create `saturdayReview.controller.js`**

```js
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
```

- [ ] **Step 2: Syntax-check and commit**

```bash
node --check backend/src/modules/saturdayReviews/saturdayReview.controller.js
git add backend/src/modules/saturdayReviews/saturdayReview.controller.js
git commit -m "feat: saturday review controller"
```

---

### Task 4: Backend event controller (upsert with image diff, delete)

**Files:**
- Create: `backend/src/modules/saturdayReviews/saturdayReviewEvent.controller.js`

**Interfaces:**
- Consumes: `SaturdayReview`, `SaturdayReviewEvent`, `SaturdayReviewImage` (Task 1), `EVENT_TYPES` from the event model, `deleteImage`.
- Produces: `upsert` and `remove` used by Task 5. `upsert` accepts `{ day, date, time, category, keyLevel, answer, notes, images }` and returns the event with its (sorted) images.

- [ ] **Step 1: Create `saturdayReviewEvent.controller.js`**

```js
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
```

- [ ] **Step 2: Syntax-check and commit**

```bash
node --check backend/src/modules/saturdayReviews/saturdayReviewEvent.controller.js
git add backend/src/modules/saturdayReviews/saturdayReviewEvent.controller.js
git commit -m "feat: saturday review event controller"
```

---

### Task 5: Backend routes + server mount

**Files:**
- Create: `backend/src/modules/saturdayReviews/saturdayReview.routes.js`
- Modify: `backend/server.js` (require + mount)

**Interfaces:**
- Consumes: `saturdayReview.controller.js` and `saturdayReviewEvent.controller.js` (Tasks 3–4).
- Produces: the mounted API at `/api/saturday-reviews`. Task 6 smoke-tests it.

- [ ] **Step 1: Create `saturdayReview.routes.js`**

```js
const express = require('express');
const router = express.Router();
const reviewController = require('./saturdayReview.controller');
const eventController = require('./saturdayReviewEvent.controller');

router.get('/', reviewController.getAll);
router.post('/', reviewController.create);
router.get('/:id', reviewController.getById);
router.put('/:id', reviewController.update);
router.delete('/:id', reviewController.remove);

router.put('/:id/events/:eventType', eventController.upsert);
router.delete('/:id/events/:eventType', eventController.remove);

module.exports = router;
```

- [ ] **Step 2: Mount in `server.js`**

Add after the `dailyReviewRoutes` require (line 53):

```js
const saturdayReviewRoutes = require('./src/modules/saturdayReviews/saturdayReview.routes');
```

Add after `app.use('/api/daily-reviews', ...)` (line 115):

```js
app.use('/api/saturday-reviews', isAuthenticated, saturdayReviewRoutes);
```

- [ ] **Step 3: Syntax-check and commit**

```bash
node --check backend/src/modules/saturdayReviews/saturdayReview.routes.js
node --check backend/server.js
git add backend/src/modules/saturdayReviews/saturdayReview.routes.js backend/server.js
git commit -m "feat: mount saturday review routes"
```

---

### Task 6: Backend smoke test

**Files:**
- None (verification only).

**Interfaces:**
- Verifies Tasks 1–5 end-to-end: create (incl. 409 dup), list, event upsert, Completed gate, delete.

- [ ] **Step 1: Start the backend**

```bash
cd backend
node server.js
```

Expected: "Server running on port 5000" (requires MongoDB running locally on the URI from `backend/.env`).

- [ ] **Step 2: Register a test user and save the session cookie**

```bash
curl -s -c /tmp/sat-cookies.txt -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sat Tester","email":"sattester@test.com","password":"password123"}'
```

Expected: JSON with `user` object. If the user already exists, call `/api/auth/login` with the same body instead.

- [ ] **Step 3: Create a review (expect 201)**

```bash
curl -s -b /tmp/sat-cookies.txt -X POST http://localhost:5000/api/saturday-reviews \
  -H 'Content-Type: application/json' \
  -d '{"pair":"GBPUSD","weekStart":"2026-07-27","weekEnd":"2026-07-31"}'
```

Expected: 201 with `id`, `status: "Draft"`. Save the returned `id` (used as `<ID>` below).

- [ ] **Step 4: Duplicate week+pair (expect 409)**

```bash
curl -s -b /tmp/sat-cookies.txt -X POST http://localhost:5000/api/saturday-reviews \
  -H 'Content-Type: application/json' \
  -d '{"pair":"GBPUSD","weekStart":"2026-07-27","weekEnd":"2026-07-31"}'
```

Expected: 409 `A review already exists for this pair and week`.

- [ ] **Step 5: Upsert the weekly_high event (expect 200)**

```bash
curl -s -b /tmp/sat-cookies.txt -X PUT \
  http://localhost:5000/api/saturday-reviews/<ID>/events/weekly_high \
  -H 'Content-Type: application/json' \
  -d '{"day":"Monday","date":"2026-07-27","time":"09:30 AM","notes":"made high early"}'
```

Expected: 200 with `eventType: "weekly_high"`, `images: []`.

- [ ] **Step 6: Try to mark Completed before mandatory fields (expect 400)**

```bash
curl -s -b /tmp/sat-cookies.txt -X PUT http://localhost:5000/api/saturday-reviews/<ID> \
  -H 'Content-Type: application/json' \
  -d '{"status":"Completed"}'
```

Expected: 400 with a completion-count message.

- [ ] **Step 7: Get the review (expect review + events + completionPercent)**

```bash
curl -s -b /tmp/sat-cookies.txt http://localhost:5000/api/saturday-reviews/<ID>
```

Expected: `completionPercent` present and `events` array containing the `weekly_high` event.

- [ ] **Step 8: List with filters**

```bash
curl -s -b /tmp/sat-cookies.txt "http://localhost:5000/api/saturday-reviews?pair=GBPUSD&month=7&year=2026&status=Draft"
```

Expected: `reviews` array with 1 row including `completionPercent` and `imageCount`.

- [ ] **Step 9: Delete the review (expect 200) and verify empty list**

```bash
curl -s -b /tmp/sat-cookies.txt -X DELETE http://localhost:5000/api/saturday-reviews/<ID>
curl -s -b /tmp/sat-cookies.txt "http://localhost:5000/api/saturday-reviews?pair=GBPUSD"
```

Expected: delete returns `{ message: "Review deleted" }`; list returns 0 reviews.

- [ ] **Step 10: Commit any leftover changes**

```bash
git add -A
git commit -m "test: saturday review backend smoke test" || echo "no changes"
```

### Task 7: Frontend types, constants, and utils

**Files:**
- Modify: `src/app/types/trading.ts` (append types)
- Create: `src/app/components/SaturdayReview/saturdayReviewTypes.ts`
- Create: `src/app/components/SaturdayReview/saturdayReviewConstants.ts`
- Create: `src/app/components/SaturdayReview/saturdayReviewUtils.ts`

**Interfaces:**
- Consumes: `date-fns` (already installed, v3.6.0). Nothing from backend tasks — this task is self-contained.
- Produces: API types `SaturdayReviewEventType`, `SaturdayReviewImage`, `SaturdayReviewEvent`, `SaturdayReviewLesson`, `SaturdayReview` in `trading.ts`; form-draft types `ImageItem`, `EventDraft`, `LessonItem`, `SaturdayReviewFormState`, `EventPatch`, `EventUpdater` in `saturdayReviewTypes.ts`; option arrays + `COMPLETION_FIELDS` in `saturdayReviewConstants.ts`; helpers `snapToMonday`, `computeWeekEnd`, `formatWeekRange`, `stripHtml`, `isEventEmpty`, `computeCompletion` in `saturdayReviewUtils.ts`. Tasks 9–17 consume these exact names.

- [ ] **Step 1: Append API types to `src/app/types/trading.ts`**

Add at the end of the file (after the `GeneralMissedTrade` interface):

```ts
export type SaturdayReviewEventType = 'weekly_high' | 'weekly_low' | 'candle' | 'weekly_high_origin' | 'weekly_low_origin' | 'ote';

export interface SaturdayReviewImage {
  id: string;
  image: string;
  publicId?: string;
  caption?: string;
  sortOrder?: number;
}

export interface SaturdayReviewEvent {
  id: string;
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

export interface SaturdayReviewLesson {
  label: string;
  checked: boolean;
}

export interface SaturdayReview {
  id: string;
  pair: string;
  weekStart: string;
  weekEnd: string;
  reviewDate: string;
  overallBias: string;
  candleType: string;
  highOrLowFirst: string;
  expansionDirection: string;
  oteTouched: string;
  oteDirection: string;
  oteReaction: string;
  marketQuality?: number;
  difficulty: string;
  confidence?: number;
  weeklyStory: string;
  lessons: SaturdayReviewLesson[];
  lessonsNotes?: string;
  status: 'Draft' | 'Completed';
  lastAiUpdateAt?: string;
  createdAt: string;
  updatedAt: string;
  completionPercent?: number;
  imageCount?: number;
  events?: SaturdayReviewEvent[];
}
```

- [ ] **Step 2: Create `src/app/components/SaturdayReview/saturdayReviewTypes.ts`**

```ts
import type { SaturdayReviewEventType } from '../../types/trading';

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

export interface EventDraft {
  eventType: SaturdayReviewEventType;
  day: string;
  date: string;
  time: string;
  category: string;
  keyLevel: string;
  answer: string;
  notes: string;
  images: ImageItem[];
  dirty: boolean;
}

export interface LessonItem {
  label: string;
  checked: boolean;
}

export interface SaturdayReviewFormState {
  pair: string;
  weekStart: string;
  reviewDate: string;
  overallBias: string;
  candleType: string;
  highOrLowFirst: string;
  expansionDirection: string;
  oteTouched: string;
  oteDirection: string;
  oteReaction: string;
  marketQuality: number;
  difficulty: string;
  confidence: number;
  weeklyStory: string;
  lessons: LessonItem[];
  lessonsNotes: string;
  status: 'Draft' | 'Completed';
  events: Record<string, EventDraft>;
}

export type EventPatch = Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>);
export type EventUpdater = (eventType: string, patch: EventPatch) => void;
```

- [ ] **Step 3: Create `src/app/components/SaturdayReview/saturdayReviewConstants.ts`**

```ts
import type { LessonItem } from './saturdayReviewTypes';

export const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];
export const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const;
export const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const CANDLE_TYPES = ['Bull Full Body', 'Bear Full Body', 'Bull Pin Bar', 'Bear Pin Bar', 'Doji', 'Inside Bar', 'Outside Bar', 'Indecision', 'Custom'] as const;
export const HIGH_LOW_FIRST_OPTIONS = ['Weekly High First', 'Weekly Low First', 'Both same session'] as const;
export const EXPANSION_DIRECTIONS = ['Expanded Up', 'Expanded Down', 'Range', 'Balanced'] as const;
export const CATEGORY_OPTIONS = ['Weekly', 'Daily'] as const;
export const OTE_DIRECTION_OPTIONS = ['Bullish', 'Bearish'] as const;
export const OTE_REACTION_OPTIONS = ['Yes', 'No', 'Partial'] as const;
export const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'] as const;
export const KEY_LEVEL_OPTIONS = ['Previous High', 'Previous Low', 'FVG', 'IFVG', 'Order Block', 'Breaker', 'Mitigation Block', 'Balanced Price Range', 'EQH', 'EQL', 'Liquidity Pool', 'Custom'] as const;
export const LESSON_OPTIONS = ['Wait for OTE', 'Respect HTF Bias', "Don't trade News", 'Wait for SMT', 'Need patience', 'Avoid revenge trades', 'Follow CRT', 'Other'] as const;
export const EVENT_TYPES = ['weekly_high', 'weekly_low', 'candle', 'weekly_high_origin', 'weekly_low_origin', 'ote'] as const;
export const MAX_IMAGES_PER_EVENT = 10;
export const STORY_PLACEHOLDER = 'Liquidity, SMT, Displacement, Manipulation, Expansion, Distribution, OTE, CRT, Bias, Entry Models, observations, lessons';

export function initialLessons(): LessonItem[] {
  return LESSON_OPTIONS.map(label => ({ label, checked: false }));
}

export interface CompletionField {
  source: 'review' | 'event';
  key: string;
  eventType?: string;
  nonEmpty?: boolean;
  condition?: (review: Record<string, unknown>) => boolean;
}

export const COMPLETION_FIELDS: CompletionField[] = [
  { source: 'review', key: 'pair' },
  { source: 'review', key: 'weekStart' },
  { source: 'review', key: 'overallBias' },
  { source: 'review', key: 'reviewDate' },
  { source: 'event', eventType: 'weekly_high', key: 'day' },
  { source: 'event', eventType: 'weekly_high', key: 'date' },
  { source: 'event', eventType: 'weekly_high', key: 'time' },
  { source: 'event', eventType: 'weekly_low', key: 'day' },
  { source: 'event', eventType: 'weekly_low', key: 'date' },
  { source: 'event', eventType: 'weekly_low', key: 'time' },
  { source: 'review', key: 'candleType' },
  { source: 'review', key: 'highOrLowFirst' },
  { source: 'review', key: 'expansionDirection' },
  { source: 'event', eventType: 'weekly_high_origin', key: 'category' },
  { source: 'event', eventType: 'weekly_high_origin', key: 'keyLevel' },
  { source: 'event', eventType: 'weekly_low_origin', key: 'category' },
  { source: 'event', eventType: 'weekly_low_origin', key: 'keyLevel' },
  { source: 'review', key: 'oteTouched' },
  { source: 'review', key: 'weeklyStory', nonEmpty: true },
  { source: 'review', key: 'oteDirection', condition: (r) => r.oteTouched === 'Yes' },
  { source: 'review', key: 'oteReaction', condition: (r) => r.oteTouched === 'Yes' },
  { source: 'event', eventType: 'ote', key: 'day', condition: (r) => r.oteTouched === 'Yes' },
  { source: 'event', eventType: 'ote', key: 'time', condition: (r) => r.oteTouched === 'Yes' },
];
```

- [ ] **Step 4: Create `src/app/components/SaturdayReview/saturdayReviewUtils.ts`**

```ts
import { format, addDays, parseISO, startOfWeek } from 'date-fns';
import { COMPLETION_FIELDS } from './saturdayReviewConstants';
import type { SaturdayReview, SaturdayReviewEvent } from '../../types/trading';
import type { EventDraft } from './saturdayReviewTypes';

export function snapToMonday(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function computeWeekEnd(weekStart: string): string {
  return format(addDays(parseISO(weekStart), 4), 'yyyy-MM-dd');
}

export function formatWeekRange(weekStart: string, weekEnd?: string): string {
  if (!weekStart) return 'Select a week';
  const end = weekEnd || computeWeekEnd(weekStart);
  return `${format(parseISO(weekStart), 'MMM d')} – ${format(parseISO(end), 'MMM d, yyyy')}`;
}

export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || '';
}

export function isEventEmpty(event: EventDraft): boolean {
  return ['day', 'date', 'time', 'category', 'keyLevel', 'answer', 'notes'].every(
    (key) => !String(event[key as keyof EventDraft] || '').trim()
  );
}

export function computeCompletion(
  review: Partial<SaturdayReview>,
  events: SaturdayReviewEvent[]
): { percent: number; complete: boolean; filled: number; total: number } {
  const eventsByType: Record<string, SaturdayReviewEvent> = {};
  for (const event of events || []) {
    eventsByType[event.eventType] = event;
  }
  let filled = 0;
  let total = 0;
  for (const field of COMPLETION_FIELDS) {
    if (field.condition && !field.condition(review as Record<string, unknown>)) continue;
    total += 1;
    const value = field.source === 'event'
      ? eventsByType[field.eventType!]?.[field.key as keyof SaturdayReviewEvent]
      : review[field.key as keyof SaturdayReview];
    const isFilled = field.nonEmpty
      ? stripHtml(String(value || '')).trim().length > 0
      : value !== undefined && value !== null && String(value).trim().length > 0;
    if (isFilled) filled += 1;
  }
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { percent, complete: filled === total, filled, total };
}
```

Note: the order of `COMPLETION_FIELDS` and the semantics (`nonEmpty` for `weeklyStory`, `condition` for the four `oteTouched === 'Yes'` fields, 19 base + 4 conditional) must stay byte-identical to `backend/src/modules/saturdayReviews/saturdayReviewCompletion.js` from Task 2 so the client and server always agree on the `Completed` gate.

- [ ] **Step 5: Build to verify**

```bash
pnpm build
```

Expected: build completes (vite does not typecheck; this catches import/syntax errors only). If a type-only error is suspected, review manually per AGENTS.md.

- [ ] **Step 6: Commit**

```bash
git add src/app/types/trading.ts src/app/components/SaturdayReview
git commit -m "feat: saturday review frontend types, constants, and utils"
```

---

### Task 8: Client-side image compression utility

**Files:**
- Create: `src/app/utils/imageCompression.ts`

**Interfaces:**
- Consumes: nothing (browser APIs only).
- Produces: `compressImage(file: File, options?: { maxWidth?: number; maxHeight?: number; quality?: number })` → `Promise<File>` (WEBP re-encode). Consumed by `ImageUploader` (Task 10) and `RichTextEditor` (Task 11).

- [ ] **Step 1: Create `src/app/utils/imageCompression.ts`**

```ts
interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.8 } = options;
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image compression failed'))), 'image/webp', quality);
  });
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
```

- [ ] **Step 2: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/app/utils/imageCompression.ts
git commit -m "feat: client-side image compression utility"
```

---

### Task 9: `apiService.saturdayReviews` namespace

**Files:**
- Modify: `src/app/services/apiService.ts` (add namespace before the final closing `};`)

**Interfaces:**
- Consumes: existing `apiGet`, `apiPost`, `apiPut`, `apiDelete` from `../../services/api`.
- Produces: `apiService.saturdayReviews.{getAll, getById, create, update, delete, upsertEvent, deleteEvent}` matching the Task 5 routes exactly. Consumed by the form/list/detail (Tasks 14–16).

- [ ] **Step 1: Add the namespace to `src/app/services/apiService.ts`**

Insert immediately before the final `};` that closes the `apiService` object (after the `dailyReviews` block, line 890):

```ts
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

    create: async (data: {
      pair: string; weekStart: string; weekEnd: string; reviewDate?: string; status?: string;
    }): Promise<any> => {
      return apiPost('/saturday-reviews', data);
    },

    update: async (id: string, data: any): Promise<any> => {
      return apiPut(`/saturday-reviews/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
      return apiDelete(`/saturday-reviews/${id}`);
    },

    upsertEvent: async (id: string, eventType: string, data: {
      day?: string; date?: string; time?: string; category?: string; keyLevel?: string;
      answer?: string; notes?: string; images?: { url: string; publicId?: string; caption?: string }[];
    }): Promise<any> => {
      return apiPut(`/saturday-reviews/${id}/events/${eventType}`, data);
    },

    deleteEvent: async (id: string, eventType: string): Promise<void> => {
      return apiDelete(`/saturday-reviews/${id}/events/${eventType}`);
    },
  },
```

- [ ] **Step 2: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/app/services/apiService.ts
git commit -m "feat: saturday reviews api service namespace"
```

---

### Task 10: ImageUploader component

**Files:**
- Create: `src/app/components/SaturdayReview/ImageUploader.tsx`

**Interfaces:**
- Consumes: `uploadImage`, `deleteImage` from `../../../services/uploadService`; `compressImage` from `../../utils/imageCompression` (Task 8); `ImageViewer` from `../ImageViewer`; `MAX_IMAGES_PER_EVENT` from `./saturdayReviewConstants`; `ImageItem` from `./saturdayReviewTypes` (Task 7).
- Produces: `ImageUploader` with props `{ images: ImageItem[]; onChange: React.Dispatch<React.SetStateAction<ImageItem[]>> }`. Uploads each new file immediately (compressed → Cloudinary), tracks progress per item, and reports the latest `ImageItem[]` via `onChange` using functional updates. Consumed by every section component (Task 13) and by the form's edit mode loader (Task 14).

- [ ] **Step 1: Create `src/app/components/SaturdayReview/ImageUploader.tsx`**

```tsx
import { useRef, useState } from 'react';
import { Upload, X, Replace, Maximize2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { uploadImage, deleteImage } from '../../../services/uploadService';
import { compressImage } from '../../utils/imageCompression';
import ImageViewer from '../ImageViewer';
import { MAX_IMAGES_PER_EVENT } from './saturdayReviewConstants';
import type { ImageItem } from './saturdayReviewTypes';
import { cn } from '../ui/utils';

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: React.Dispatch<React.SetStateAction<ImageItem[]>>;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

let idCounter = 0;
const genId = () => `sat-img-${++idCounter}`;

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState<number | null>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name}: Only PNG, JPEG, or WEBP`;
    if (file.size > MAX_FILE_SIZE) return `${file.name}: Max 10MB`;
    return null;
  };

  const uploadAndTrack = async (item: ImageItem) => {
    try {
      const compressed = await compressImage(item.file!);
      const result = await uploadImage(compressed, (pct) => {
        onChange(prev => prev.map(i => i.id === item.id ? { ...i, uploadState: 'uploading' as const, uploadProgress: pct } : i));
      });
      onChange(prev => prev.map(i => i.id === item.id ? {
        ...i, url: result.url, publicId: result.publicId, file: undefined, preview: undefined,
        isExisting: true, uploadState: 'done' as const, uploadProgress: 100,
      } : i));
    } catch (err) {
      console.error('Image upload failed:', err);
      onChange(prev => prev.map(i => i.id === item.id ? { ...i, uploadState: 'error' as const } : i));
      alert('Failed to upload an image. Please try again.');
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES_PER_EVENT - images.length;
    if (remaining <= 0) {
      alert(`Maximum ${MAX_IMAGES_PER_EVENT} images per section`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    const errors: string[] = [];
    selected.forEach(f => {
      const e = validate(f);
      if (e) errors.push(e);
    });
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    selected.forEach(file => {
      const item: ImageItem = {
        id: genId(), file, preview: URL.createObjectURL(file), caption: '',
        uploadState: 'pending', uploadProgress: 0,
      };
      onChange(prev => [...prev, item]);
      uploadAndTrack(item);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReplace = (files: FileList | null) => {
    const file = files?.[0];
    const idx = replaceIndexRef.current;
    if (!file || idx === null) return;
    const error = validate(file);
    if (error) {
      alert(error);
      return;
    }
    const target = images[idx];
    const item: ImageItem = {
      ...target,
      file,
      preview: URL.createObjectURL(file),
      url: undefined,
      publicId: undefined,
      isExisting: false,
      uploadState: 'pending' as const,
      uploadProgress: 0,
    };
    onChange(prev => prev.map((i, index) => (index === idx ? item : i)));
    if (target?.publicId) {
      deleteImage(target.publicId).catch(() => {});
    }
    uploadAndTrack(item);
    replaceIndexRef.current = null;
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const target = images[index];
    onChange(prev => prev.filter((_, i) => i !== index));
    if (target?.publicId) {
      deleteImage(target.publicId).catch(() => {});
    }
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    onChange(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    onChange(prev => prev.map((img, i) => (i === index ? { ...img, caption } : img)));
  };

  const remainingSlots = MAX_IMAGES_PER_EVENT - images.length;
  const uploaded = images.filter(i => i.url);

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  moveImage(dragIndex, index);
                  setDragIndex(index);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                'group relative rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC]',
                dragIndex === index && 'opacity-50 ring-2 ring-[#2563EB]',
              )}
            >
              <div className="aspect-[4/3] relative bg-[#F8FAFC]">
                <img
                  src={img.preview || img.url}
                  alt={img.caption || `Image ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setFullscreen(index)}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#475569] shadow-sm"
                    title="Preview"
                  >
                    <Maximize2 className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { replaceIndexRef.current = index; replaceInputRef.current?.click(); }}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#475569] shadow-sm"
                    title="Replace"
                  >
                    <Replace className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white shadow-sm"
                    title="Delete"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/80 text-[10px] font-medium text-[#64748B] shadow-sm cursor-grab">
                    <GripVertical className="size-3" /> Drag
                  </span>
                </div>
                {img.uploadState === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="size-7 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span className="text-[11px] font-medium text-white">{img.uploadProgress}%</span>
                    </div>
                  </div>
                )}
                {img.uploadState === 'error' && (
                  <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-white">Upload failed</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 px-2.5 py-2">
                <input
                  value={img.caption || ''}
                  onChange={e => updateCaption(index, e.target.value)}
                  placeholder="Caption..."
                  className="flex-1 text-[12px] text-[#64748B] bg-transparent border-0 outline-none placeholder:text-[#94A3B8]"
                />
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => moveImage(index, index - 1)} disabled={index === 0} className="p-1 rounded-md text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-30">
                    <ArrowUp className="size-3" />
                  </button>
                  <button type="button" onClick={() => moveImage(index, index + 1)} disabled={index === images.length - 1} className="p-1 rounded-md text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-30">
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {remainingSlots > 0 && (
        <label className="flex flex-col items-center justify-center h-[110px] border-2 border-dashed border-[#E2E8F0] rounded-xl cursor-pointer hover:border-[#2563EB] hover:bg-blue-50 transition-all group">
          <div className="flex flex-col items-center gap-1.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="size-4 text-[#2563EB]" />
            </div>
            <span className="text-[13px] font-medium text-[#64748B] group-hover:text-[#2563EB]">Upload images</span>
            <span className="text-[11px] text-[#94A3B8]">PNG, JPEG, WEBP · Max 10MB · {remainingSlots} left</span>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={e => addFiles(e.target.files)} />
        </label>
      )}

      <input ref={replaceInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={e => handleReplace(e.target.files)} />

      {fullscreen !== null && images[fullscreen]?.url && (
        <ImageViewer
          images={uploaded.map(i => ({ url: i.url!, label: i.caption || 'Screenshot' }))}
          initialIndex={Math.max(0, uploaded.findIndex(i => i.id === images[fullscreen].id))}
          onClose={() => setFullscreen(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SaturdayReview/ImageUploader.tsx
git commit -m "feat: saturday review image uploader"
```

### Task 11: RichTextEditor (Weekly Story, inline image upload)

**Files:**
- Create: `src/app/components/SaturdayReview/RichTextEditor.tsx`
- Modify: `package.json` (add `@tiptap/extension-image`, `@tiptap/extension-placeholder`)

**Interfaces:**
- Consumes: `compressImage` (Task 8), `uploadImage` from `../../../services/uploadService`, `STORY_PLACEHOLDER` (Task 7).
- Produces: `RichTextEditor` with props `{ value: string; onChange: (html: string) => void; minHeight?: number }`. The image toolbar button inserts an inline image (or replaces the currently-selected one) by compressing + uploading to Cloudinary first. Consumed by `WeeklyStorySection` (Task 13).

- [ ] **Step 1: Install the tiptap extensions**

```bash
pnpm add @tiptap/extension-image @tiptap/extension-placeholder
```

Expected: resolves to `^3.x` matching the existing `@tiptap/react` / `@tiptap/starter-kit` versions.

- [ ] **Step 2: Create `src/app/components/SaturdayReview/RichTextEditor.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon,
} from 'lucide-react';
import { uploadImage } from '../../../services/uploadService';
import { compressImage } from '../../utils/imageCompression';
import { cn } from '../ui/utils';
import { STORY_PLACEHOLDER } from './saturdayReviewConstants';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

function EditorToolbar({
  editor,
  uploadingImage,
  onImageClick,
}: {
  editor: any;
  uploadingImage: boolean;
  onImageClick: () => void;
}) {
  if (!editor) return null;

  const tools: any[] = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: 'Italic' },
    { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), label: 'Underline' },
    { type: 'divider' },
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: 'Heading' },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), label: 'Subheading' },
    { type: 'divider' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: 'Bullet List' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: 'Ordered List' },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), label: 'Quote' },
    { type: 'divider' },
    { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }), label: 'Align Left' },
    { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }), label: 'Align Center' },
    { icon: AlignRight, action: () => editor.chain().focus().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }), label: 'Align Right' },
    { type: 'divider' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#E2E8F0] bg-white">
      {tools.map((tool, i) => {
        if (tool.type === 'divider') {
          return <div key={`div-${i}`} className="w-px h-5 bg-[#E2E8F0] mx-1" />;
        }
        return (
          <button
            key={i}
            type="button"
            onClick={tool.action}
            title={tool.label}
            className={cn(
              'p-2 rounded-lg transition-all duration-150',
              tool.active ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20' : 'text-muted-foreground hover:bg-[#F1F5F9] hover:text-foreground',
            )}
          >
            <tool.icon className="size-4" />
          </button>
        );
      })}
      <button
        type="button"
        onClick={onImageClick}
        disabled={uploadingImage}
        title={editor.isActive('image') ? 'Replace selected image' : 'Insert image'}
        className={cn(
          'p-2 rounded-lg transition-all duration-150 disabled:opacity-50',
          editor.isActive('image') ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20' : 'text-muted-foreground hover:bg-[#F1F5F9] hover:text-foreground',
        )}
      >
        {uploadingImage ? (
          <span className="size-4 rounded-full border-2 border-[#2563EB]/30 border-t-[#2563EB] animate-spin block" />
        ) : (
          <ImageIcon className="size-4" />
        )}
      </button>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, minHeight = 260 }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, underline: false }),
      UnderlineExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: STORY_PLACEHOLDER }),
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
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const handleImageFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !editor) return;
    try {
      setUploadingImage(true);
      const compressed = await compressImage(file);
      const result = await uploadImage(compressed);
      if (editor.isActive('image')) {
        editor.chain().focus().updateAttributes('image', { src: result.url }).run();
      } else {
        editor.chain().focus().setImage({ src: result.url }).run();
      }
    } catch (err) {
      console.error('Story image upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border border-[#E2E8F0] rounded-[18px] overflow-hidden bg-white">
      <div className="sticky top-0 z-10">
        <EditorToolbar editor={editor} uploadingImage={uploadingImage} onImageClick={() => fileInputRef.current?.click()} />
      </div>
      <div className="overflow-y-auto" style={{ minHeight, maxHeight: 520 }}>
        <EditorContent editor={editor} />
      </div>
      <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={e => handleImageFile(e.target.files)} />
    </div>
  );
}
```

Note: an embedded image can be deleted with the Delete/Backspace key while selected (native tiptap behavior); replacing is done by selecting the image then clicking the toolbar image button.

- [ ] **Step 3: Build to verify**

```bash
pnpm build
```

Expected: build completes (this also confirms the new packages resolve).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/app/components/SaturdayReview/RichTextEditor.tsx
git commit -m "feat: saturday review rich text editor with inline images"
```

---

### Task 12: SectionCard + small pickers

**Files:**
- Create: `src/app/components/SaturdayReview/SectionCard.tsx`
- Create: `src/app/components/SaturdayReview/BiasPicker.tsx`
- Create: `src/app/components/SaturdayReview/StarRating.tsx`
- Create: `src/app/components/SaturdayReview/DifficultyPicker.tsx`
- Create: `src/app/components/SaturdayReview/ConfidenceSlider.tsx`
- Create: `src/app/components/SaturdayReview/LessonChecklist.tsx`

**Interfaces:**
- Consumes: `Slider` from `../ui/slider`; option constants from `./saturdayReviewConstants`; `LessonItem` from `./saturdayReviewTypes` (Task 7).
- Produces: `SectionCard` (collapsible premium card w/ step badge, completion check, image-count badge) and the five pickers. All consumed by the section components (Task 13) and the form (Task 14).

- [ ] **Step 1: Create `SectionCard.tsx`**

```tsx
import { useState } from 'react';
import { ChevronDown, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { cn } from '../ui/utils';

interface SectionCardProps {
  step: number;
  title: string;
  subtitle?: string;
  isComplete?: boolean;
  imageCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function SectionCard({ step, title, subtitle, isComplete = false, imageCount = 0, defaultOpen = false, children }: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF2] shadow-sm">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div className={cn('size-9 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0', isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-[#2563EB]')}>
          {step}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#0F172A]">{title}</h3>
          {subtitle && <p className="text-[12px] text-[#64748B] mt-0.5 truncate">{subtitle}</p>}
        </div>
        {imageCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[11px] font-medium text-[#64748B] shrink-0">
            <ImageIcon className="size-3" /> {imageCount}
          </span>
        )}
        {isComplete && <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />}
        <ChevronDown className={cn('size-4 text-[#94A3B8] shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="px-5 pb-6 pt-4 border-t border-[#F1F5F9]">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create `BiasPicker.tsx`**

```tsx
import { cn } from '../ui/utils';
import { BIAS_OPTIONS } from './saturdayReviewConstants';

interface BiasPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BiasPicker({ value, onChange }: BiasPickerProps) {
  return (
    <div className="flex gap-2">
      {BIAS_OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(value === option ? '' : option)}
          className={cn(
            'flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200',
            value === option
              ? option === 'Bullish' ? 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
                : option === 'Bearish' ? 'bg-[#DC2626] text-white shadow-md shadow-[#DC2626]/25'
                  : 'bg-[#64748B] text-white shadow-md shadow-[#64748B]/25'
              : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
          )}
        >
          {option}
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
  onChange: (value: number) => void;
}

export default function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)} className="group p-1">
          <Star className={cn('size-7 transition-all duration-150', star <= value ? 'fill-amber-400 text-amber-400' : 'text-[#CBD5E1] group-hover:text-amber-300')} />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `DifficultyPicker.tsx`**

```tsx
import { cn } from '../ui/utils';
import { DIFFICULTY_OPTIONS } from './saturdayReviewConstants';

interface DifficultyPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  return (
    <div className="flex gap-2">
      {DIFFICULTY_OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(value === option ? '' : option)}
          className={cn(
            'flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200',
            value === option
              ? option === 'Hard' ? 'bg-[#DC2626] text-white shadow-md shadow-[#DC2626]/25'
                : option === 'Medium' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                  : 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
              : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
          )}
        >
          {option}
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
  onChange: (value: number) => void;
}

export default function ConfidenceSlider({ value, onChange }: ConfidenceSliderProps) {
  return (
    <div className="pt-1">
      <div className="flex justify-between mb-2">
        <span className="text-[13px] font-medium text-[#64748B]">Confidence</span>
        <span className="text-[13px] font-bold text-[#0F172A]">{value > 0 ? `${value}/10` : '—'}</span>
      </div>
      <Slider
        value={value > 0 ? [value] : [5]}
        min={1}
        max={10}
        step={1}
        onValueChange={(v) => onChange(v[0])}
        className="[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-[#2563EB] [&_[data-slot=slider-range]]:to-[#7C3AED] [&_[data-slot=slider-track]]:bg-[#E2E8F0] [&_[data-slot=slider-thumb]]:bg-white"
      />
      <div className="flex justify-between mt-1">
        {[1, 5, 10].map(n => (
          <span key={n} className="text-[11px] text-[#94A3B8]">{n}</span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `LessonChecklist.tsx`**

```tsx
import { cn } from '../ui/utils';
import { LESSON_OPTIONS } from './saturdayReviewConstants';
import type { LessonItem } from './saturdayReviewTypes';

interface LessonChecklistProps {
  items: LessonItem[];
  onChange: (items: LessonItem[]) => void;
}

export default function LessonChecklist({ items, onChange }: LessonChecklistProps) {
  const toggle = (label: string) => {
    onChange(items.map(item => (item.label === label ? { ...item, checked: !item.checked } : item)));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {LESSON_OPTIONS.map(option => {
        const item = items.find(i => i.label === option);
        const checked = item?.checked || false;
        return (
          <label key={option} className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={checked} onChange={() => toggle(option)} className="size-4 accent-[#2563EB]" />
            <span className={cn('text-[14px] font-medium', checked ? 'text-[#2563EB]' : 'text-[#334155] group-hover:text-[#2563EB]')}>
              {option}
            </span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/SaturdayReview
git commit -m "feat: saturday review section card and pickers"
```

---

### Task 13: form primitives + section components

**Files:**
- Create: `src/app/components/SaturdayReview/formPrimitives.tsx`
- Create: `src/app/components/SaturdayReview/ReviewHeaderSection.tsx`
- Create: `src/app/components/SaturdayReview/WeeklyHighLowSection.tsx`
- Create: `src/app/components/SaturdayReview/CandleStructureSection.tsx`
- Create: `src/app/components/SaturdayReview/OriginSection.tsx`
- Create: `src/app/components/SaturdayReview/OteSection.tsx`
- Create: `src/app/components/SaturdayReview/WeeklyStorySection.tsx`
- Create: `src/app/components/SaturdayReview/LessonsSection.tsx`
- Create: `src/app/components/SaturdayReview/RatingSection.tsx`

**Interfaces:**
- Consumes: `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` and `Label` from `../ui/`; `TimePicker` from `../ui/TimePicker`; `ImageUploader` (Task 10); `RichTextEditor` (Task 11); pickers + `SectionCard` (Task 12); constants (Task 7); types + `EventUpdater` (Task 7).
- Produces: shared form classes (`inputClass`, `textareaClass`, `selectTriggerClass`, `labelClass`) and components (`Field`, `SelectField`, `RadioGroup`) plus the 8 section components, each taking the form state + `EventUpdater` and emitting patches. Consumed by `SaturdayReviewForm` (Task 14).

- [ ] **Step 1: Create `formPrimitives.tsx`**

```tsx
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../ui/utils';

export const inputClass = 'h-12 rounded-[14px] border border-[#E2E8F0] bg-white px-4 text-[15px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full';
export const textareaClass = 'rounded-[14px] border border-[#E2E8F0] bg-white px-4 py-3 text-[15px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full resize-none';
export const selectTriggerClass = 'h-12 rounded-[14px] border border-[#E2E8F0] bg-white px-4 text-[15px] font-medium text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 w-full';
export const labelClass = 'text-[14px] font-semibold text-[#334155]';

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className={labelClass}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function SelectField({ label, value, onChange, options, placeholder = 'Select...', required, className }: SelectFieldProps) {
  return (
    <Field label={label} required={required} className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt} className="text-[14px] font-medium">{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

interface RadioGroupProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RadioGroup({ options, value, onChange, className }: RadioGroupProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? '' : opt)}
          className={cn(
            'flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200',
            value === opt
              ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25'
              : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `ReviewHeaderSection.tsx`**

```tsx
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { cn } from '../ui/utils';
import { Field, inputClass, labelClass, selectTriggerClass } from './formPrimitives';
import BiasPicker from './BiasPicker';
import { snapToMonday, computeWeekEnd, formatWeekRange } from './saturdayReviewUtils';
import type { SaturdayReviewFormState } from './saturdayReviewTypes';

interface ReviewHeaderSectionProps {
  pairs: string[];
  form: SaturdayReviewFormState;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
  canComplete: boolean;
  onToggleStatus: () => void;
}

export default function ReviewHeaderSection({ pairs, form, onFormChange, canComplete, onToggleStatus }: ReviewHeaderSectionProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = form.weekStart ? computeWeekEnd(form.weekStart) : '';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Pair" required>
          <Select value={form.pair} onValueChange={(v) => onFormChange({ pair: v })}>
            <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select pair" /></SelectTrigger>
            <SelectContent>
              {pairs.map(p => (
                <SelectItem key={p} value={p} className="text-[14px] font-medium">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Week Start (snaps to Monday)" required>
          <input
            type="date"
            value={form.weekStart}
            max={today}
            onChange={(e) => {
              if (!e.target.value) {
                onFormChange({ weekStart: '' });
                return;
              }
              onFormChange({ weekStart: snapToMonday(new Date(`${e.target.value}T00:00:00`)) });
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Week Range">
          <div className="h-12 rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 flex items-center text-[15px] font-semibold text-[#2563EB]">
            {form.weekStart ? formatWeekRange(form.weekStart, weekEnd) : 'Select a week'}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Review Date" required>
          <input type="date" value={form.reviewDate} max={today} onChange={(e) => onFormChange({ reviewDate: e.target.value })} className={inputClass} />
        </Field>
        <div className="space-y-1.5 md:col-span-2">
          <Label className={labelClass}>Overall Bias <span className="text-red-500">*</span></Label>
          <BiasPicker value={form.overallBias} onChange={(v) => onFormChange({ overallBias: v })} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <span className="text-[14px] font-semibold text-[#334155]">Status</span>
        <button
          type="button"
          onClick={onToggleStatus}
          disabled={form.status === 'Draft' && !canComplete}
          className={cn(
            'h-10 px-5 rounded-[14px] text-[13px] font-semibold transition-all duration-200',
            form.status === 'Completed'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : canComplete
                ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25 hover:-translate-y-0.5'
                : 'border-2 border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
          )}
        >
          {form.status === 'Completed' ? 'Completed' : canComplete ? 'Mark Complete' : 'Complete all mandatory fields'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `WeeklyHighLowSection.tsx`**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import TimePicker from '../ui/TimePicker';
import { Field, inputClass, selectTriggerClass, textareaClass } from './formPrimitives';
import ImageUploader from './ImageUploader';
import { DAY_OPTIONS } from './saturdayReviewConstants';
import type { EventDraft, EventUpdater } from './saturdayReviewTypes';

interface WeeklyHighLowSectionProps {
  events: Record<string, EventDraft>;
  onEventChange: EventUpdater;
}

interface HighLowBlockProps {
  title: string;
  event: EventDraft;
  onEventChange: (patch: Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>)) => void;
}

function HighLowBlock({ title, event, onEventChange }: HighLowBlockProps) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4">
      <h4 className="text-[15px] font-bold text-[#0F172A]">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Day" required>
          <Select value={event.day} onValueChange={(v) => onEventChange({ day: v })}>
            <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Select day" /></SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map(d => (
                <SelectItem key={d} value={d} className="text-[14px] font-medium">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date" required>
          <input type="date" value={event.date} onChange={(e) => onEventChange({ date: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Time" required>
          <TimePicker value={event.time} onChange={(v) => onEventChange({ time: v })} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={event.notes} onChange={(e) => onEventChange({ notes: e.target.value })} rows={3} placeholder="Notes about this extreme..." className={textareaClass} />
      </Field>
      <ImageUploader
        images={event.images}
        onChange={(updater) => onEventChange((prev) => ({ images: typeof updater === 'function' ? updater(prev.images) : updater }))}
      />
    </div>
  );
}

export default function WeeklyHighLowSection({ events, onEventChange }: WeeklyHighLowSectionProps) {
  return (
    <div className="space-y-4">
      <HighLowBlock title="Weekly High" event={events.weekly_high} onEventChange={(patch) => onEventChange('weekly_high', patch)} />
      <HighLowBlock title="Weekly Low" event={events.weekly_low} onEventChange={(patch) => onEventChange('weekly_low', patch)} />
    </div>
  );
}
```

- [ ] **Step 4: Create `CandleStructureSection.tsx`**

```tsx
import { Field, SelectField, textareaClass } from './formPrimitives';
import ImageUploader from './ImageUploader';
import { CANDLE_TYPES, HIGH_LOW_FIRST_OPTIONS, EXPANSION_DIRECTIONS } from './saturdayReviewConstants';
import type { EventDraft, SaturdayReviewFormState } from './saturdayReviewTypes';

interface CandleStructureSectionProps {
  form: SaturdayReviewFormState;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
  event: EventDraft;
  onEventChange: (patch: Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>)) => void;
}

export default function CandleStructureSection({ form, onFormChange, event, onEventChange }: CandleStructureSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectField label="Candle Type" value={form.candleType} onChange={(v) => onFormChange({ candleType: v })} options={CANDLE_TYPES} placeholder="Select candle type" required />
        <SelectField label="Which formed first?" value={form.highOrLowFirst} onChange={(v) => onFormChange({ highOrLowFirst: v })} options={HIGH_LOW_FIRST_OPTIONS} placeholder="High / Low order" required />
        <SelectField label="Weekly Expansion Direction" value={form.expansionDirection} onChange={(v) => onFormChange({ expansionDirection: v })} options={EXPANSION_DIRECTIONS} placeholder="Select direction" required />
      </div>
      <Field label="Notes">
        <textarea value={event.notes} onChange={(e) => onEventChange({ notes: e.target.value })} rows={3} placeholder="Candle structure notes..." className={textareaClass} />
      </Field>
      <ImageUploader
        images={event.images}
        onChange={(updater) => onEventChange((prev) => ({ images: typeof updater === 'function' ? updater(prev.images) : updater }))}
      />
    </div>
  );
}
```

- [ ] **Step 5: Create `OriginSection.tsx`**

```tsx
import { Field, SelectField, textareaClass } from './formPrimitives';
import ImageUploader from './ImageUploader';
import { CATEGORY_OPTIONS, KEY_LEVEL_OPTIONS } from './saturdayReviewConstants';
import type { EventDraft, EventUpdater } from './saturdayReviewTypes';

interface OriginSectionProps {
  events: Record<string, EventDraft>;
  onEventChange: EventUpdater;
}

interface OriginBlockProps {
  title: string;
  event: EventDraft;
  onEventChange: (patch: Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>)) => void;
}

function OriginBlock({ title, event, onEventChange }: OriginBlockProps) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4">
      <h4 className="text-[15px] font-bold text-[#0F172A]">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SelectField label="Category" value={event.category} onChange={(v) => onEventChange({ category: v })} options={CATEGORY_OPTIONS} placeholder="Weekly / Daily" required />
        <SelectField label="Key Level" value={event.keyLevel} onChange={(v) => onEventChange({ keyLevel: v })} options={KEY_LEVEL_OPTIONS} placeholder="Select key level" required />
      </div>
      <Field label="Notes">
        <textarea value={event.notes} onChange={(e) => onEventChange({ notes: e.target.value })} rows={3} placeholder="Notes about this origin..." className={textareaClass} />
      </Field>
      <ImageUploader
        images={event.images}
        onChange={(updater) => onEventChange((prev) => ({ images: typeof updater === 'function' ? updater(prev.images) : updater }))}
      />
    </div>
  );
}

export default function OriginSection({ events, onEventChange }: OriginSectionProps) {
  return (
    <div className="space-y-4">
      <OriginBlock title="Origin of Weekly High" event={events.weekly_high_origin} onEventChange={(patch) => onEventChange('weekly_high_origin', patch)} />
      <OriginBlock title="Origin of Weekly Low" event={events.weekly_low_origin} onEventChange={(patch) => onEventChange('weekly_low_origin', patch)} />
    </div>
  );
}
```

- [ ] **Step 6: Create `OteSection.tsx`**

```tsx
import TimePicker from '../ui/TimePicker';
import { Field, SelectField, textareaClass } from './formPrimitives';
import ImageUploader from './ImageUploader';
import { DAY_OPTIONS, OTE_DIRECTION_OPTIONS, OTE_REACTION_OPTIONS } from './saturdayReviewConstants';
import type { EventDraft, SaturdayReviewFormState } from './saturdayReviewTypes';

interface OteSectionProps {
  form: SaturdayReviewFormState;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
  event: EventDraft;
  onEventChange: (patch: Partial<EventDraft> | ((prev: EventDraft) => Partial<EventDraft>)) => void;
}

export default function OteSection({ form, onFormChange, event, onEventChange }: OteSectionProps) {
  return (
    <div className="space-y-4">
      <Field label="Did price touch OTE?" required>
        <div className="flex gap-2">
          {(['Yes', 'No'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onFormChange({ oteTouched: form.oteTouched === opt ? '' : opt })}
              className={`flex-1 h-12 rounded-[14px] text-[14px] font-semibold transition-all duration-200 ${
                form.oteTouched === opt
                  ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25'
                  : 'border-2 border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </Field>

      {form.oteTouched === 'Yes' && (
        <div className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField label="OTE Direction" value={form.oteDirection} onChange={(v) => onFormChange({ oteDirection: v })} options={OTE_DIRECTION_OPTIONS} placeholder="Bullish / Bearish" required />
            <SelectField label="Did market react correctly?" value={form.oteReaction} onChange={(v) => onFormChange({ oteReaction: v })} options={OTE_REACTION_OPTIONS} placeholder="Yes / No / Partial" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField label="OTE Day" value={event.day} onChange={(v) => onEventChange({ day: v })} options={DAY_OPTIONS} placeholder="Select day" required />
            <Field label="OTE Time" required>
              <TimePicker value={event.time} onChange={(v) => onEventChange({ time: v })} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={event.notes} onChange={(e) => onEventChange({ notes: e.target.value })} rows={3} placeholder="OTE notes..." className={textareaClass} />
          </Field>
          <ImageUploader
            images={event.images}
            onChange={(updater) => onEventChange((prev) => ({ images: typeof updater === 'function' ? updater(prev.images) : updater }))}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create `WeeklyStorySection.tsx`**

```tsx
import RichTextEditor from './RichTextEditor';

interface WeeklyStorySectionProps {
  value: string;
  onChange: (html: string) => void;
}

export default function WeeklyStorySection({ value, onChange }: WeeklyStorySectionProps) {
  return <RichTextEditor value={value} onChange={onChange} minHeight={320} />;
}
```

- [ ] **Step 8: Create `LessonsSection.tsx`**

```tsx
import LessonChecklist from './LessonChecklist';
import { Field, textareaClass } from './formPrimitives';
import type { LessonItem, SaturdayReviewFormState } from './saturdayReviewTypes';

interface LessonsSectionProps {
  lessons: LessonItem[];
  lessonsNotes: string;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
}

export default function LessonsSection({ lessons, lessonsNotes, onFormChange }: LessonsSectionProps) {
  return (
    <div className="space-y-4">
      <LessonChecklist items={lessons} onChange={(items) => onFormChange({ lessons: items })} />
      <Field label="Notes">
        <textarea value={lessonsNotes} onChange={(e) => onFormChange({ lessonsNotes: e.target.value })} rows={4} placeholder="Additional lessons and reflections..." className={textareaClass} />
      </Field>
    </div>
  );
}
```

- [ ] **Step 9: Create `RatingSection.tsx`**

```tsx
import StarRating from './StarRating';
import DifficultyPicker from './DifficultyPicker';
import ConfidenceSlider from './ConfidenceSlider';
import { Field } from './formPrimitives';
import type { SaturdayReviewFormState } from './saturdayReviewTypes';

interface RatingSectionProps {
  form: SaturdayReviewFormState;
  onFormChange: (patch: Partial<SaturdayReviewFormState>) => void;
}

export default function RatingSection({ form, onFormChange }: RatingSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Field label="Market Quality">
        <StarRating value={form.marketQuality} onChange={(v) => onFormChange({ marketQuality: v })} />
      </Field>
      <Field label="Difficulty">
        <DifficultyPicker value={form.difficulty} onChange={(v) => onFormChange({ difficulty: v })} />
      </Field>
      <Field label="Confidence">
        <ConfidenceSlider value={form.confidence} onChange={(v) => onFormChange({ confidence: v })} />
      </Field>
    </div>
  );
}
```

- [ ] **Step 10: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 11: Commit**

```bash
git add src/app/components/SaturdayReview
git commit -m "feat: saturday review form sections"
```

### Task 14: SaturdayReviewForm (create/edit + auto-save)

**Files:**
- Create: `src/app/components/SaturdayReview/SaturdayReviewForm.tsx`

**Interfaces:**
- Consumes: all section components (Task 13), `SectionCard` (Task 12), `apiService.saturdayReviews` (Task 9), constants/utils/types (Task 7).
- Produces: `SaturdayReviewForm` — the tab view. Reads `window.__saturdayReviewEditId` (edit mode) and `window.__saturdayReviewDuplicate` (blank pre-filled copy) on mount and clears them. Lazy-creates a Draft once pair + weekStart are valid, auto-saves every 30s and on unmount, shows a completion bar, and toggles `Completed` (server-validated). Consumed by `App.tsx` (Task 17).

- [ ] **Step 1: Create `src/app/components/SaturdayReview/SaturdayReviewForm.tsx`**

```tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import apiService from '../../services/apiService';
import ReviewHeaderSection from './ReviewHeaderSection';
import WeeklyHighLowSection from './WeeklyHighLowSection';
import CandleStructureSection from './CandleStructureSection';
import OriginSection from './OriginSection';
import OteSection from './OteSection';
import WeeklyStorySection from './WeeklyStorySection';
import LessonsSection from './LessonsSection';
import RatingSection from './RatingSection';
import SectionCard from './SectionCard';
import { DEFAULT_PAIRS, EVENT_TYPES, initialLessons } from './saturdayReviewConstants';
import { computeCompletion, computeWeekEnd, isEventEmpty } from './saturdayReviewUtils';
import { cn } from '../ui/utils';
import type { SaturdayReview, SaturdayReviewEvent } from '../../types/trading';
import type { EventDraft, EventUpdater, SaturdayReviewFormState } from './saturdayReviewTypes';

const today = () => format(new Date(), 'yyyy-MM-dd');

const emptyEventDraft = (eventType: (typeof EVENT_TYPES)[number]): EventDraft => ({
  eventType,
  day: '',
  date: '',
  time: '',
  category: '',
  keyLevel: '',
  answer: '',
  notes: '',
  images: [],
  dirty: false,
});

const buildEventsDraft = (): Record<string, EventDraft> => {
  const result: Record<string, EventDraft> = {};
  for (const type of EVENT_TYPES) result[type] = emptyEventDraft(type);
  return result;
};

const eventFromApi = (event: SaturdayReviewEvent | undefined): EventDraft => {
  const base = emptyEventDraft((event?.eventType as (typeof EVENT_TYPES)[number]) || 'weekly_high');
  return {
    ...base,
    day: event?.day || '',
    date: event?.date || '',
    time: event?.time || '',
    category: event?.category || '',
    keyLevel: event?.keyLevel || '',
    answer: event?.answer || '',
    notes: event?.notes || '',
    images: (event?.images || []).map(img => ({
      id: `existing-${img.id || img.image}`,
      url: img.image,
      publicId: img.publicId,
      caption: img.caption || '',
      isExisting: true,
      uploadState: 'done' as const,
    })),
  };
};

const buildEventsDraftWith = (events?: SaturdayReviewEvent[]): Record<string, EventDraft> => {
  const result = buildEventsDraft();
  for (const type of EVENT_TYPES) {
    const found = (events || []).find(e => e.eventType === type);
    if (found) result[type] = eventFromApi(found);
  }
  return result;
};

export default function SaturdayReviewForm() {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [form, setForm] = useState<SaturdayReviewFormState>({
    pair: '',
    weekStart: '',
    reviewDate: today(),
    overallBias: '',
    candleType: '',
    highOrLowFirst: '',
    expansionDirection: '',
    oteTouched: '',
    oteDirection: '',
    oteReaction: '',
    marketQuality: 0,
    difficulty: '',
    confidence: 0,
    weeklyStory: '',
    lessons: initialLessons(),
    lessonsNotes: '',
    status: 'Draft',
    events: buildEventsDraft(),
  });

  const formRef = useRef(form);
  const reviewIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => {
    const editId = (window as any).__saturdayReviewEditId || null;
    const duplicate = (window as any).__saturdayReviewDuplicate || null;
    (window as any).__saturdayReviewEditId = null;
    (window as any).__saturdayReviewDuplicate = null;

    apiService.settings.getPairs()
      .then(setPairs)
      .catch(() => setPairs(DEFAULT_PAIRS));

    if (editId) {
      setLoading(true);
      apiService.saturdayReviews.getById(editId)
        .then((review: any) => {
          const id = review.id || review._id;
          reviewIdRef.current = id;
          setReviewId(id);
          setForm(prev => ({
            ...prev,
            pair: review.pair || '',
            weekStart: review.weekStart || '',
            reviewDate: review.reviewDate || today(),
            overallBias: review.overallBias || '',
            candleType: review.candleType || '',
            highOrLowFirst: review.highOrLowFirst || '',
            expansionDirection: review.expansionDirection || '',
            oteTouched: review.oteTouched || '',
            oteDirection: review.oteDirection || '',
            oteReaction: review.oteReaction || '',
            marketQuality: review.marketQuality || 0,
            difficulty: review.difficulty || '',
            confidence: review.confidence || 0,
            weeklyStory: review.weeklyStory || '',
            lessons: (review.lessons && review.lessons.length > 0
              ? review.lessons
              : initialLessons()
            ).map((l: { label: string; checked: boolean }) => ({ label: l.label, checked: l.checked })),
            lessonsNotes: review.lessonsNotes || '',
            status: review.status || 'Draft',
            events: buildEventsDraftWith(review.events),
          }));
        })
        .catch(() => setError('Failed to load review'))
        .finally(() => setLoading(false));
    } else if (duplicate) {
      setForm(prev => ({ ...prev, pair: duplicate.pair || '', overallBias: duplicate.overallBias || '' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (formRef.current.status === 'Draft' && reviewIdRef.current) {
        persist(reviewIdRef.current, formRef.current).catch(() => {});
      }
    };
  }, []);

  const reviewPayloadFrom = (state: SaturdayReviewFormState): Partial<SaturdayReview> => ({
    pair: state.pair,
    weekStart: state.weekStart,
    weekEnd: state.weekStart ? computeWeekEnd(state.weekStart) : '',
    reviewDate: state.reviewDate,
    overallBias: state.overallBias,
    candleType: state.candleType,
    highOrLowFirst: state.highOrLowFirst,
    expansionDirection: state.expansionDirection,
    oteTouched: state.oteTouched,
    oteDirection: state.oteDirection,
    oteReaction: state.oteReaction,
    marketQuality: state.marketQuality > 0 ? state.marketQuality : undefined,
    difficulty: state.difficulty,
    confidence: state.confidence > 0 ? state.confidence : undefined,
    weeklyStory: state.weeklyStory,
    lessons: state.lessons,
    lessonsNotes: state.lessonsNotes,
    status: state.status,
  });

  const persist = async (id: string, state: SaturdayReviewFormState): Promise<void> => {
    await apiService.saturdayReviews.update(id, reviewPayloadFrom(state));
    for (const eventType of EVENT_TYPES) {
      const event = state.events[eventType];
      if (!event || !event.dirty) continue;
      if (isEventEmpty(event) && event.images.length === 0) continue;
      await apiService.saturdayReviews.upsertEvent(id, eventType, {
        day: event.day,
        date: event.date,
        time: event.time,
        category: event.category,
        keyLevel: event.keyLevel,
        answer: event.answer,
        notes: event.notes,
        images: event.images.filter(i => i.url).map(i => ({ url: i.url!, publicId: i.publicId, caption: i.caption })),
      });
    }
  };

  const scheduleSave = () => {
    setDirty(true);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveDraft();
    }, 30000);
  };

  const saveDraft = async () => {
    const state = formRef.current;
    const currentId = reviewIdRef.current;
    if (!currentId && !(state.pair && state.weekStart)) return;
    if (saving) return;

    setSaving(true);
    try {
      let id = currentId;
      if (!id) {
        const created = await apiService.saturdayReviews.create({
          pair: state.pair,
          weekStart: state.weekStart,
          weekEnd: computeWeekEnd(state.weekStart),
          reviewDate: state.reviewDate,
          status: 'Draft',
        });
        id = created.id || created._id;
        reviewIdRef.current = id;
        setReviewId(id);
      }
      await persist(id, state);
      setForm(prev => {
        const events: Record<string, EventDraft> = {};
        for (const type of EVENT_TYPES) {
          events[type] = { ...(prev.events[type] || emptyEventDraft(type)), dirty: false };
        }
        return { ...prev, events };
      });
      setLastSavedAt(new Date());
      setDirty(false);
      setError(null);
    } catch (err: any) {
      console.error('Auto-save failed:', err);
      if (err?.response?.status === 409) {
        setError('A review already exists for this pair and week');
      } else if (err?.response?.status === 400) {
        setError(err?.response?.data?.message || 'Cannot save draft');
      } else {
        setError('Failed to save draft. Your changes are kept locally.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (patch: Partial<SaturdayReviewFormState>) => {
    setForm(prev => ({ ...prev, ...patch }));
    scheduleSave();
  };

  const handleEventChange: EventUpdater = (eventType, patch) => {
    setForm(prev => {
      const event = prev.events[eventType];
      if (!event) return prev;
      const applied = typeof patch === 'function' ? patch(event) : patch;
      return {
        ...prev,
        events: {
          ...prev.events,
          [eventType]: { ...event, ...applied, dirty: true },
        },
      };
    });
    scheduleSave();
  };

  const handleToggleStatus = async () => {
    const target = form.status === 'Completed' ? 'Draft' : 'Completed';
    if (target === 'Completed' && !completion.complete) {
      alert('Complete all mandatory fields first');
      return;
    }
    const next = { ...form, status: target };
    setForm(next);
    formRef.current = next;
    if (!reviewId) {
      await saveDraft();
      return;
    }
    setSaving(true);
    try {
      await apiService.saturdayReviews.update(reviewId, { ...reviewPayloadFrom(next), status: target });
      setLastSavedAt(new Date());
      setDirty(false);
      setError(null);
    } catch (err: any) {
      console.error('Status update failed:', err);
      if (err?.response?.status === 400) {
        setError(err?.response?.data?.message || 'Cannot mark as Completed');
        setForm(prev => ({ ...prev, status: 'Draft' }));
        formRef.current = { ...formRef.current, status: 'Draft' };
      } else {
        setError('Failed to update status');
      }
    } finally {
      setSaving(false);
    }
  };

  const completion = useMemo(() => {
    const reviewLike: Partial<SaturdayReview> = {
      pair: form.pair,
      weekStart: form.weekStart,
      reviewDate: form.reviewDate,
      overallBias: form.overallBias,
      candleType: form.candleType,
      highOrLowFirst: form.highOrLowFirst,
      expansionDirection: form.expansionDirection,
      oteTouched: form.oteTouched,
      oteDirection: form.oteDirection,
      oteReaction: form.oteReaction,
      weeklyStory: form.weeklyStory,
    };
    const events: SaturdayReviewEvent[] = EVENT_TYPES.map(type => {
      const e = form.events[type];
      return {
        id: '',
        eventType: type,
        day: e?.day,
        date: e?.date,
        time: e?.time,
        category: e?.category,
        keyLevel: e?.keyLevel,
        answer: e?.answer,
        notes: e?.notes,
        images: [],
      };
    });
    return computeCompletion(reviewLike, events);
  }, [form]);

  const requiredFilled = (type: string, keys: string[]) => {
    const e = form.events[type];
    return e ? keys.every(k => String((e as any)[k] || '').trim().length > 0) : false;
  };

  const s1Complete = requiredFilled('weekly_high', ['day', 'date', 'time']) && requiredFilled('weekly_low', ['day', 'date', 'time']);
  const s2Complete = Boolean(form.candleType && form.highOrLowFirst && form.expansionDirection);
  const s3Complete = requiredFilled('weekly_high_origin', ['category', 'keyLevel']) && requiredFilled('weekly_low_origin', ['category', 'keyLevel']);
  const s4Complete = form.oteTouched === 'No'
    || (form.oteTouched === 'Yes' && Boolean(form.oteDirection && form.oteReaction) && requiredFilled('ote', ['day', 'time']));

  const sectionImageCount = (type: string) => form.events[type]?.images.filter(i => i.url).length || 0;
  const totalImages = EVENT_TYPES.reduce((sum, t) => sum + sectionImageCount(t), 0);

  const handleBack = () => {
    (window as any).__saturdayReviewId = null;
    (window as any).__saturdayReviewEditId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review' }));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-48 bg-slate-200 rounded" />
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <nav className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
        <button type="button" onClick={handleBack} className="hover:text-[#2563EB]">Saturday Review</button>
        <ChevronRight className="size-3.5 text-[#CBD5E1]" />
        <span className="text-[#0F172A]">{reviewId ? 'Edit' : 'New'} Saturday Review</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0F172A]">{reviewId ? 'Edit Saturday Review' : 'New Saturday Review'}</h1>
          <p className="text-[15px] font-medium text-[#64748B] mt-1">Document the week's ICT structure before the next one begins.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[14px] font-medium text-red-700 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-semibold">Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5EAF2] shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-[#0F172A]">Review Completion</h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">{completion.filled} of {completion.total} mandatory fields filled</p>
          </div>
          {form.status === 'Completed' && (
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[12px] font-semibold">Completed</span>
          )}
        </div>
        <div className="h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              completion.complete ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED]',
            )}
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] font-semibold text-[#0F172A]">{completion.percent}%</span>
          <span className={cn('text-[12px] font-medium', saving ? 'text-[#2563EB]' : dirty ? 'text-amber-600' : lastSavedAt ? 'text-emerald-600' : 'text-[#94A3B8]')}>
            {saving ? 'Saving...' : dirty ? 'Unsaved changes' : lastSavedAt ? `Saved ${format(lastSavedAt, 'hh:mm a')}` : 'No changes yet'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5EAF2] shadow-sm p-6">
        <ReviewHeaderSection
          pairs={pairs}
          form={form}
          onFormChange={handleFormChange}
          canComplete={completion.complete}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      <SectionCard step={1} title="Weekly High & Low" subtitle="When and where the week's extremes formed" isComplete={s1Complete} imageCount={sectionImageCount('weekly_high') + sectionImageCount('weekly_low')} defaultOpen>
        <WeeklyHighLowSection events={form.events} onEventChange={handleEventChange} />
      </SectionCard>

      <SectionCard step={2} title="Weekly Candle Structure" subtitle="Candle type, order of formation, and expansion" isComplete={s2Complete} imageCount={sectionImageCount('candle')}>
        <CandleStructureSection form={form} onFormChange={handleFormChange} event={form.events.candle} onEventChange={(patch) => handleEventChange('candle', patch)} />
      </SectionCard>

      <SectionCard step={3} title="Origin of Weekly High & Low" subtitle="Which key levels produced the extremes?" isComplete={s3Complete} imageCount={sectionImageCount('weekly_high_origin') + sectionImageCount('weekly_low_origin')}>
        <OriginSection events={form.events} onEventChange={handleEventChange} />
      </SectionCard>

      <SectionCard step={4} title="OTE Analysis" subtitle="Did price trade into the optimal trade entry zone?" isComplete={s4Complete} imageCount={sectionImageCount('ote')}>
        <OteSection form={form} onFormChange={handleFormChange} event={form.events.ote} onEventChange={(patch) => handleEventChange('ote', patch)} />
      </SectionCard>

      <SectionCard step={5} title="Weekly Story" subtitle="Liquidity, SMT, displacement, manipulation, expansion, distribution, OTE, CRT, bias, entry models" isComplete={completion.percent === 100 && Boolean(form.weeklyStory)} imageCount={0}>
        <WeeklyStorySection value={form.weeklyStory} onChange={(html) => handleFormChange({ weeklyStory: html })} />
      </SectionCard>

      <SectionCard step={6} title="Lessons Learned" subtitle="Optional — what to remember next week" imageCount={0}>
        <LessonsSection lessons={form.lessons} lessonsNotes={form.lessonsNotes} onFormChange={handleFormChange} />
      </SectionCard>

      <SectionCard step={7} title="Weekly Rating" subtitle="Optional — market quality, difficulty, confidence" imageCount={0}>
        <RatingSection form={form} onFormChange={handleFormChange} />
      </SectionCard>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-[#E2E8F0] text-[14px] font-medium text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all"
        >
          <ChevronLeft className="size-4" /> Back
        </button>
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          className="h-12 px-8 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-[14px] font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
      </div>
    </div>
  );
}
```

Behavior notes for the executor:
- Lazy create: the review row is created only when both `pair` and `weekStart` are set (first auto-save that has them).
- The 30s auto-save resets on every edit (`scheduleSave`); unmount flushes a final best-effort save.
- `Completed` is only set by the explicit header toggle; the server rejects it (400) if the completion check fails, and the form falls back to `Draft`.

- [ ] **Step 2: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SaturdayReview/SaturdayReviewForm.tsx
git commit -m "feat: saturday review form with autosave"
```

### Task 15: SaturdayReviewDetail (read-only view)

**Files:**
- Create: `src/app/components/SaturdayReview/SaturdayReviewDetail.tsx`

**Interfaces:**
- Consumes: `apiService.saturdayReviews.getById` (Task 9); `SectionCard` (Task 12); `formatWeekRange`, `computeCompletion`, `stripHtml` (Task 7); types `SaturdayReview`, `SaturdayReviewEvent`, `SaturdayReviewImage` (Task 7); `getResponsiveUrl` from `../../utils/cloudinary`; `ImageViewer`; ui primitives (`Button`, `Skeleton`).
- Produces: `SaturdayReviewDetail` — the read-only tab view. Reads `window.__saturdayReviewId` (set by the list, Task 16) on render, renders the hero header + S1–S7 section cards + sidebar quick stats + Edit/Duplicate/Delete actions. Consumed by `App.tsx` (Task 17).

- [ ] **Step 1: Create `src/app/components/SaturdayReview/SaturdayReviewDetail.tsx`**

```tsx
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus, Pencil, Copy, Trash2, Star, BarChart3 } from 'lucide-react';
import apiService from '../../services/apiService';
import ImageViewer from '../ImageViewer';
import SectionCard from './SectionCard';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { getResponsiveUrl } from '../../utils/cloudinary';
import { computeCompletion, formatWeekRange, stripHtml } from './saturdayReviewUtils';
import { cn } from '../ui/utils';
import type { SaturdayReview, SaturdayReviewEvent, SaturdayReviewImage } from '../../types/trading';

const BiasIcon = ({ bias }: { bias: string }) => {
  if (bias === 'Bullish') return <TrendingUp className="size-4" />;
  if (bias === 'Bearish') return <TrendingDown className="size-4" />;
  return <Minus className="size-4" />;
};

const biasClass: Record<string, string> = {
  Bullish: 'bg-emerald-100 text-emerald-700',
  Bearish: 'bg-red-100 text-red-700',
  Neutral: 'bg-slate-100 text-slate-600',
};

const hasValue = (v: string | undefined | null) => Boolean(v && String(v).trim());

function StatusBadge({ status }: { status: string }) {
  return status === 'Completed' ? (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-100 text-sm font-semibold">
      <BarChart3 className="size-3.5" /> Completed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 text-white/90 text-sm font-medium">
      Draft
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-[13px] font-medium text-[#64748B]">{label}</span>
      <span className="text-[14px] font-semibold text-[#0F172A] text-right">{value}</span>
    </div>
  );
}

function EventImages({ images, onView }: { images: SaturdayReviewImage[]; onView: (index: number) => void }) {
  if (!images.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
      {images.map((img, i) => (
        <div
          key={img.id || `img-${i}`}
          className="group relative aspect-video bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden cursor-pointer"
          onClick={() => onView(i)}
        >
          <img
            src={getResponsiveUrl(img.image, 480)}
            alt={img.caption || ''}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {img.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <span className="text-xs text-white">{img.caption}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailBlock({ title, event, onView }: { title: string; event?: SaturdayReviewEvent; onView: (index: number) => void }) {
  const images = event?.images || [];
  return (
    <div className="rounded-xl border border-[#E5EAF2] bg-[#F8FAFC]/60 p-4 space-y-1">
      <h4 className="text-[14px] font-bold text-[#0F172A] mb-2">{title}</h4>
      <InfoRow label="Day" value={event?.day} />
      <InfoRow label="Date" value={event?.date} />
      <InfoRow label="Time" value={event?.time} />
      <InfoRow label="Category" value={event?.category} />
      <InfoRow label="Key Level" value={event?.keyLevel} />
      {event?.notes && (
        <p className="text-[14px] leading-relaxed text-[#334155] pt-3 whitespace-pre-wrap">{event.notes}</p>
      )}
      <EventImages images={images} onView={onView} />
    </div>
  );
}

export default function SaturdayReviewDetail() {
  const [review, setReview] = useState<SaturdayReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewing, setViewing] = useState<{ images: { url: string; label: string }[]; index: number } | null>(null);

  const reviewId = (window as any).__saturdayReviewId;

  useEffect(() => {
    if (!reviewId) {
      setIsLoading(false);
      return;
    }
    apiService.saturdayReviews.getById(reviewId)
      .then((data: any) => setReview(data))
      .catch(() => setReview(null))
      .finally(() => setIsLoading(false));
  }, [reviewId]);

  const eventsByType = useMemo(() => {
    const map: Record<string, SaturdayReviewEvent> = {};
    for (const e of review?.events || []) map[e.eventType] = e;
    return map;
  }, [review]);

  const completion = useMemo(() => {
    if (!review) return { percent: 0, complete: false, filled: 0, total: 0 };
    return computeCompletion(review, review.events || []);
  }, [review]);

  const totalImages = useMemo(() => (review?.events || []).reduce((sum, e) => sum + (e.images?.length || 0), 0), [review]);

  const s1Complete = hasValue(eventsByType.weekly_high?.day) && hasValue(eventsByType.weekly_high?.date) && hasValue(eventsByType.weekly_high?.time) && hasValue(eventsByType.weekly_low?.day) && hasValue(eventsByType.weekly_low?.date) && hasValue(eventsByType.weekly_low?.time);
  const s2Complete = hasValue(review?.candleType) && hasValue(review?.highOrLowFirst) && hasValue(review?.expansionDirection);
  const s3Complete = hasValue(eventsByType.weekly_high_origin?.category) && hasValue(eventsByType.weekly_high_origin?.keyLevel) && hasValue(eventsByType.weekly_low_origin?.category) && hasValue(eventsByType.weekly_low_origin?.keyLevel);
  const s4Complete = review?.oteTouched === 'No' || (review?.oteTouched === 'Yes' && hasValue(review?.oteDirection) && hasValue(review?.oteReaction) && hasValue(eventsByType.ote?.day) && hasValue(eventsByType.ote?.time));
  const s5Complete = stripHtml(review?.weeklyStory || '').trim().length > 0;
  const sectionsComplete = [s1Complete, s2Complete, s3Complete, s4Complete, s5Complete].filter(Boolean).length;

  const checkedLessons = (review?.lessons || []).filter(l => l.checked);

  const openImages = (images: SaturdayReviewImage[], index = 0) => {
    setViewing({
      images: images.map(img => ({ url: img.image, label: img.caption || 'Screenshot' })),
      index,
    });
  };

  const handleBack = () => {
    (window as any).__saturdayReviewId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review' }));
  };

  const handleEdit = () => {
    if (!review) return;
    (window as any).__saturdayReviewId = null;
    (window as any).__saturdayReviewEditId = review.id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDuplicate = () => {
    if (!review) return;
    (window as any).__saturdayReviewId = null;
    (window as any).__saturdayReviewDuplicate = { pair: review.pair, overallBias: review.overallBias };
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDelete = async () => {
    if (!review) return;
    if (!confirm(`Delete Saturday review for ${review.pair}?`)) return;
    try {
      await apiService.saturdayReviews.delete(review.id);
      handleBack();
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      alert('Failed to delete review. Please try again.');
    }
  };

  if (!reviewId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No review selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[200px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
          <div className="space-y-5">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Review not found
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 size-[500px] bg-gradient-to-br from-blue-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 size-[400px] bg-gradient-to-br from-violet-200/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-[350px] bg-gradient-to-br from-sky-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="px-6 pt-6 pb-4 max-w-6xl mx-auto">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors group"
        >
          <div className="size-7 rounded-lg bg-white border border-[#E5EAF2] flex items-center justify-center group-hover:border-[#2563EB] group-hover:bg-blue-50 transition-all duration-200">
            <ArrowLeft className="size-3.5" />
          </div>
          Back to Saturday Reviews
        </button>
      </div>

      <div className="px-6 max-w-6xl mx-auto">
        <div className="relative h-[220px] rounded-3xl bg-gradient-to-br from-[#2563EB] via-[#4F46E5] to-[#7C3AED] overflow-hidden mb-8">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 size-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/4 size-48 bg-white/5 rounded-full translate-y-1/3" />
            <div className="absolute top-1/2 right-1/3 size-32 bg-white/5 rounded-full" />
          </div>
          <div className="relative h-full flex flex-col justify-center px-8 md:px-12">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <h1 className="text-[2rem] md:text-[2.5rem] font-bold text-white tracking-tight">{review.pair}</h1>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                <Calendar className="size-3.5 text-blue-100" />
                <span className="text-sm font-medium text-white/90">{formatWeekRange(review.weekStart, review.weekEnd)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {review.overallBias && (
                <span className={cn('inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold', biasClass[review.overallBias])}>
                  <BiasIcon bias={review.overallBias} /> {review.overallBias}
                </span>
              )}
              <StatusBadge status={review.status} />
              {review.reviewDate && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-white/90 text-sm">
                  <Calendar className="size-3.5" /> Reviewed {review.reviewDate}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard step={1} title="Weekly High & Low" subtitle="When and where the week's extremes formed" isComplete={s1Complete} imageCount={(eventsByType.weekly_high?.images?.length || 0) + (eventsByType.weekly_low?.images?.length || 0)} defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailBlock title="Weekly High" event={eventsByType.weekly_high} onView={(i) => openImages(eventsByType.weekly_high?.images || [], i)} />
              <DetailBlock title="Weekly Low" event={eventsByType.weekly_low} onView={(i) => openImages(eventsByType.weekly_low?.images || [], i)} />
            </div>
          </SectionCard>

          <SectionCard step={2} title="Weekly Candle Structure" subtitle="Candle type, order of formation, and expansion" isComplete={s2Complete} imageCount={eventsByType.candle?.images?.length || 0}>
            <div className="rounded-xl border border-[#E5EAF2] bg-[#F8FAFC]/60 p-4 space-y-1">
              <InfoRow label="Candle Type" value={review.candleType} />
              <InfoRow label="Formed First" value={review.highOrLowFirst} />
              <InfoRow label="Expansion Direction" value={review.expansionDirection} />
              {eventsByType.candle?.notes && (
                <p className="text-[14px] leading-relaxed text-[#334155] pt-3 whitespace-pre-wrap">{eventsByType.candle.notes}</p>
              )}
              <EventImages images={eventsByType.candle?.images || []} onView={(i) => openImages(eventsByType.candle?.images || [], i)} />
            </div>
          </SectionCard>

          <SectionCard step={3} title="Origin of Weekly High & Low" subtitle="Which key levels produced the extremes?" isComplete={s3Complete} imageCount={(eventsByType.weekly_high_origin?.images?.length || 0) + (eventsByType.weekly_low_origin?.images?.length || 0)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailBlock title="Origin of Weekly High" event={eventsByType.weekly_high_origin} onView={(i) => openImages(eventsByType.weekly_high_origin?.images || [], i)} />
              <DetailBlock title="Origin of Weekly Low" event={eventsByType.weekly_low_origin} onView={(i) => openImages(eventsByType.weekly_low_origin?.images || [], i)} />
            </div>
          </SectionCard>

          <SectionCard step={4} title="OTE Analysis" subtitle="Did price trade into the optimal trade entry zone?" isComplete={s4Complete} imageCount={eventsByType.ote?.images?.length || 0}>
            <div className="rounded-xl border border-[#E5EAF2] bg-[#F8FAFC]/60 p-4 space-y-1">
              <InfoRow label="OTE Touched" value={review.oteTouched} />
              {review.oteTouched === 'Yes' && (
                <>
                  <InfoRow label="Direction" value={review.oteDirection} />
                  <InfoRow label="Day" value={eventsByType.ote?.day} />
                  <InfoRow label="Time" value={eventsByType.ote?.time} />
                  <InfoRow label="Reacted Correctly" value={review.oteReaction} />
                  {eventsByType.ote?.notes && (
                    <p className="text-[14px] leading-relaxed text-[#334155] pt-3 whitespace-pre-wrap">{eventsByType.ote.notes}</p>
                  )}
                  <EventImages images={eventsByType.ote?.images || []} onView={(i) => openImages(eventsByType.ote?.images || [], i)} />
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard step={5} title="Weekly Story" subtitle="The full narrative of the week" isComplete={s5Complete}>
            {stripHtml(review.weeklyStory).trim() ? (
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: review.weeklyStory }}
              />
            ) : (
              <p className="text-[14px] text-[#94A3B8]">No weekly story written.</p>
            )}
          </SectionCard>

          <SectionCard step={6} title="Lessons Learned" subtitle="Optional — what to remember next week">
            {checkedLessons.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {checkedLessons.map(lesson => (
                  <span key={lesson.label} className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-[13px] font-medium">
                    {lesson.label}
                  </span>
                ))}
              </div>
            )}
            {review.lessonsNotes && (
              <p className="text-[14px] leading-relaxed text-[#334155] whitespace-pre-wrap">{review.lessonsNotes}</p>
            )}
            {checkedLessons.length === 0 && !review.lessonsNotes && (
              <p className="text-[14px] text-[#94A3B8]">No lessons recorded.</p>
            )}
          </SectionCard>

          <SectionCard step={7} title="Weekly Rating" subtitle="Optional — market quality, difficulty, confidence">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] font-medium text-[#64748B]">Market Quality</span>
                {review.marketQuality ? (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: review.marketQuality }).map((_, i) => (
                      <Star key={i} className="size-4 text-amber-400 fill-amber-400" />
                    ))}
                  </span>
                ) : <span className="text-[14px] text-[#94A3B8]">—</span>}
              </div>
              <InfoRow label="Difficulty" value={review.difficulty || undefined} />
              <InfoRow label="Confidence" value={review.confidence ? `${review.confidence}/10` : undefined} />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm">
            <h3 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">Completion</h3>
            <div className="h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden mb-2">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  completion.complete ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED]',
                )}
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#0F172A]">{completion.percent}%</span>
              <span className="text-[12px] text-[#94A3B8]">{completion.filled} / {completion.total} fields</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm">
            <h3 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[13px] text-[#64748B]">Week</span>
                <span className="text-[13px] font-bold text-[#0F172A] text-right">{formatWeekRange(review.weekStart, review.weekEnd)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[13px] text-[#64748B]">Sections Complete</span>
                <span className="text-[14px] font-bold text-[#0F172A]">{sectionsComplete} / 5</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[13px] text-[#64748B]">Total Images</span>
                <span className="text-[14px] font-bold text-[#0F172A]">{totalImages}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[13px] text-[#64748B]">Status</span>
                <span className={cn('px-2.5 py-0.5 rounded-full text-[12px] font-semibold', review.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                  {review.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm space-y-2">
            <Button onClick={handleEdit} className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/20 rounded-xl h-10 gap-2">
              <Pencil className="size-4" /> Edit Review
            </Button>
            <Button variant="outline" onClick={handleDuplicate} className="w-full rounded-xl h-10 gap-2">
              <Copy className="size-4" /> Duplicate
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="w-full rounded-xl h-10 gap-2">
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {viewing && (
        <ImageViewer
          images={viewing.images}
          initialIndex={viewing.index}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
```

Behavior notes for the executor:
- The server's `GET /:id` returns `{ ...review, completionPercent, events: [{ ...event, images: [...] }] }`, so `review.events` is always an array when present; `eventsByType` maps `eventType` → event.
- `review.weeklyStory` is the raw rich-text HTML from tiptap; the detail page renders it with `dangerouslySetInnerHTML` inside a `prose` wrapper (the `@tailwindcss/typography` plugin is already used elsewhere, e.g. `WeeklyReviewDetail`).
- Images pass the raw Cloudinary URL to `ImageViewer` (which internally applies `getResponsiveUrl(url, 1920)`); grid thumbnails use `getResponsiveUrl(img.image, 480)` directly.
- The `candle` event holds S2's notes + screenshots (6-event model from Task 1/7). S6 and S7 are optional and do not affect the completion gate.

- [ ] **Step 2: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SaturdayReview/SaturdayReviewDetail.tsx
git commit -m "feat: saturday review read-only detail page"
```

---

### Task 16: SaturdayReviewList (table with filters/actions)

**Files:**
- Create: `src/app/components/SaturdayReview/SaturdayReviewList.tsx`

**Interfaces:**
- Consumes: `apiService.saturdayReviews.getAll` (Task 9); `apiService.settings.getPairs` (existing); `formatWeekRange` (Task 7); constants `DEFAULT_PAIRS`, `BIAS_OPTIONS`, `CANDLE_TYPES` (Task 7); ui primitives `Table`/`TableHeader`/`TableBody`/`TableHead`/`TableRow`/`TableCell` from `../ui/table`, `Select` family, `Input`, `Button`, `Skeleton`.
- Produces: `SaturdayReviewList` — the tab view. Navigates to detail via `window.__saturdayReviewId`, to form (edit) via `window.__saturdayReviewEditId`, to form (duplicate) via `window.__saturdayReviewDuplicate`, and to form (new) after clearing both window flags. Consumed by `App.tsx` (Task 17) and `Sidebar.tsx` (Task 17).

- [ ] **Step 1: Create `src/app/components/SaturdayReview/SaturdayReviewList.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Pencil, Copy, Trash2, ChevronLeft, ChevronRight, Calendar, AlertCircle, Star } from 'lucide-react';
import { format } from 'date-fns';
import apiService from '../../services/apiService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import { DEFAULT_PAIRS, BIAS_OPTIONS, CANDLE_TYPES } from './saturdayReviewConstants';
import { formatWeekRange } from './saturdayReviewUtils';
import { cn } from '../ui/utils';

const STATUS_OPTIONS = ['Draft', 'Completed'] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LIMIT = 12;
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i).reverse();

const biasClass: Record<string, string> = {
  Bullish: 'bg-emerald-100 text-emerald-700',
  Bearish: 'bg-red-100 text-red-700',
  Neutral: 'bg-slate-100 text-slate-600',
};

function StatusBadge({ status }: { status: string }) {
  return status === 'Completed' ? (
    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[12px] font-semibold">Completed</span>
  ) : (
    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[12px] font-semibold">Draft</span>
  );
}

function ListSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
      <div className="h-12 bg-[#F8FAFC] border-b border-[#E2E8F0]" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-6 px-4 py-4 border-b border-[#E2E8F0]/60">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
      ))}
    </div>
  );
}

export default function SaturdayReviewList() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<string[]>(DEFAULT_PAIRS);
  const [filters, setFilters] = useState({
    pair: '', month: '', year: '', bias: '', candleType: '', status: '', search: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  useEffect(() => {
    apiService.settings.getPairs()
      .then(setPairs)
      .catch(() => setPairs(DEFAULT_PAIRS));
  }, []);

  useEffect(() => {
    loadReviews();
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
      console.error('Failed to load Saturday reviews:', err);
      setError(err.message || 'Failed to load Saturday reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleView = (review: any) => {
    (window as any).__saturdayReviewId = review.id || review._id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-detail' }));
  };

  const handleEdit = (review: any) => {
    (window as any).__saturdayReviewEditId = review.id || review._id;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDuplicate = (review: any) => {
    (window as any).__saturdayReviewDuplicate = { pair: review.pair, overallBias: review.overallBias };
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  const handleDelete = async (review: any) => {
    if (!confirm(`Delete Saturday review for ${review.pair}?`)) return;
    try {
      await apiService.saturdayReviews.delete(review._id || review.id);
      loadReviews();
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      alert('Failed to delete review. Please try again.');
    }
  };

  const handleCreateNew = () => {
    (window as any).__saturdayReviewEditId = null;
    (window as any).__saturdayReviewDuplicate = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'saturday-review-form' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[#0F172A] font-semibold">Saturday Review</h1>
          <p className="text-body text-[#64748B] mt-1">Weekly ICT/SMC structure analysis — one pair per trading week.</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-blue-600/25 hover:-translate-y-0.5">
          <Plus className="size-4" /> New Review
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <Select value={filters.pair} onValueChange={(v) => handleFilterChange('pair', v)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="All pairs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All pairs" disabled className="hidden">All pairs</SelectItem>
            {pairs.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.month} onValueChange={(v) => handleFilterChange('month', v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Any month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any month" disabled className="hidden">Any month</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.year} onValueChange={(v) => handleFilterChange('year', v)}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue placeholder="Any year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any year" disabled className="hidden">Any year</SelectItem>
            {YEARS.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.bias} onValueChange={(v) => handleFilterChange('bias', v)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Any bias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any bias" disabled className="hidden">Any bias</SelectItem>
            {BIAS_OPTIONS.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.candleType} onValueChange={(v) => handleFilterChange('candleType', v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Any candle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any candle" disabled className="hidden">Any candle</SelectItem>
            {CANDLE_TYPES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any status" disabled className="hidden">Any status</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
          <Input
            placeholder="Search pair, notes, story..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-body-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={loadReviews}>Retry</Button>
        </div>
      )}

      {!error && isLoading && <ListSkeleton />}

      {!error && !isLoading && reviews.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E2E8F0]">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-card-title text-slate-500 mb-2">No Saturday reviews yet</h3>
          <p className="text-body text-slate-400 mb-6">Create your first Saturday review to start tracking weekly structure.</p>
          <Button onClick={handleCreateNew} className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white">New Review</Button>
        </div>
      )}

      {!error && !isLoading && reviews.length > 0 && (
        <>
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
              {reviews.map(review => (
                <TableRow key={review._id || review.id}>
                  <TableCell>
                    <button
                      onClick={() => handleView(review)}
                      className="text-[15px] font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                    >
                      {review.pair}
                    </button>
                  </TableCell>
                  <TableCell className="text-[14px] text-[#334155]">{formatWeekRange(review.weekStart, review.weekEnd)}</TableCell>
                  <TableCell>
                    {review.overallBias ? (
                      <span className={cn('px-2.5 py-1 rounded-full text-[12px] font-semibold', biasClass[review.overallBias])}>
                        {review.overallBias}
                      </span>
                    ) : <span className="text-[#94A3B8]">—</span>}
                  </TableCell>
                  <TableCell className="text-[14px] text-[#334155]">{review.candleType || '—'}</TableCell>
                  <TableCell className="text-[14px] text-[#334155]">{review.oteTouched || '—'}</TableCell>
                  <TableCell><StatusBadge status={review.status} /></TableCell>
                  <TableCell>
                    {review.marketQuality ? (
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: review.marketQuality }).map((_, i) => (
                          <Star key={i} className="size-3.5 text-amber-400 fill-amber-400" />
                        ))}
                      </span>
                    ) : <span className="text-[#94A3B8]">—</span>}
                  </TableCell>
                  <TableCell className="text-[14px] text-[#334155]">{format(new Date(review.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(review)} title="View" className="p-2 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition-colors">
                        <Eye className="size-4" />
                      </button>
                      <button onClick={() => handleEdit(review)} title="Edit" className="p-2 rounded-lg text-[#64748B] hover:text-[#7C3AED] hover:bg-violet-50 transition-colors">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => handleDuplicate(review)} title="Duplicate" className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors">
                        <Copy className="size-4" />
                      </button>
                      <button onClick={() => handleDelete(review)} title="Delete" className="p-2 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-body text-slate-500">
                Page {page} of {totalPages} ({total} reviews)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

Behavior notes for the executor:
- The backend list endpoint (`GET /api/saturday-reviews`) already defaults to `sort=weekStart:desc`, so the explicit `sort: 'weekStart:desc'` is optional but harmless.
- Row `id`/`_id`: list rows come back with `id` (via `schemaOptions` toJSON), but the `id || review._id` fallback matches the existing review-list convention (`WeeklyReviewList`).
- The Duplicate action sets `window.__saturdayReviewDuplicate` and navigates to the form; the form (Task 14) consumes and clears it.

- [ ] **Step 2: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SaturdayReview/SaturdayReviewList.tsx
git commit -m "feat: saturday review list with filters and actions"
```

---

### Task 17: Navigation wiring (Tab type, sidebar, App.tsx)

**Files:**
- Modify: `src/app/components/Sidebar.tsx` (Tab type line 33, lucide imports, Analysis group)
- Modify: `src/app/App.tsx` (lazy imports, `TabContent` cases, active-tab whitelist)

**Interfaces:**
- Consumes: `SaturdayReviewList` (Task 16), `SaturdayReviewDetail` (Task 15), `SaturdayReviewForm` (Task 14).
- Produces: the three new tabs `saturday-review`, `saturday-review-detail`, `saturday-review-form` reachable from the sidebar Analysis group and via the `navigate-to-tab` custom event used by the list/detail/form.

- [ ] **Step 1: Modify `src/app/components/Sidebar.tsx`**

(a) Add `CalendarCheck` to the lucide-react import (lines 2–9). Replace:

```tsx
import {
  LayoutDashboard, BookOpen, Building2, Wallet, BarChart3,
  EyeOff, Calendar, Settings as SettingsIcon, FileUp,
  Activity, FileSpreadsheet, ClipboardCheck, Settings2,
  ChevronDown, ChevronLeft, ChevronRight, X, TrendingUp,
  TrendingDown, History, Layers, AlertTriangle, Calculator,
  DollarSign, BarChart4, Sparkles, NotebookText, Bell
} from 'lucide-react';
```

with:

```tsx
import {
  LayoutDashboard, BookOpen, Building2, Wallet, BarChart3,
  EyeOff, Calendar, Settings as SettingsIcon, FileUp,
  Activity, FileSpreadsheet, ClipboardCheck, Settings2,
  ChevronDown, ChevronLeft, ChevronRight, X, TrendingUp,
  TrendingDown, History, Layers, AlertTriangle, Calculator,
  DollarSign, BarChart4, Sparkles, NotebookText, Bell, CalendarCheck
} from 'lucide-react';
```

(b) Extend the `Tab` type (line 33). Replace:

```tsx
export type Tab = 'dashboard' | 'journal' | 'calendar' | 'missed' | 'missed-calendar' | 'missed-log' | 'missed-log-calendar' | 'firms' | 'accounts' | 'reports' | 'settings' | 'import' | 'convert' | 'checklist' | 'strategy-master' | 'bias' | 'bias-input' | 'bias-history' | 'liquidity-input' | 'liquidity-history' | 'crt-input' | 'crt-history' | 'breached-trades' | 'xauusd-calculator' | 'forex-lot-calculator' | 'market-stats' | 'monthly-review' | 'monthly-review-detail' | 'monthly-review-form' | 'weekly-review' | 'weekly-review-detail' | 'weekly-review-form' | 'daily-review' | 'daily-review-detail' | 'daily-review-form' | 'reminders';
```

with:

```tsx
export type Tab = 'dashboard' | 'journal' | 'calendar' | 'missed' | 'missed-calendar' | 'missed-log' | 'missed-log-calendar' | 'firms' | 'accounts' | 'reports' | 'settings' | 'import' | 'convert' | 'checklist' | 'strategy-master' | 'bias' | 'bias-input' | 'bias-history' | 'liquidity-input' | 'liquidity-history' | 'crt-input' | 'crt-history' | 'breached-trades' | 'xauusd-calculator' | 'forex-lot-calculator' | 'market-stats' | 'monthly-review' | 'monthly-review-detail' | 'monthly-review-form' | 'weekly-review' | 'weekly-review-detail' | 'weekly-review-form' | 'daily-review' | 'daily-review-detail' | 'daily-review-form' | 'saturday-review' | 'saturday-review-detail' | 'saturday-review-form' | 'reminders';
```

(c) Add **Saturday Review** to the Analysis group (icon `CalendarCheck`). Replace:

```tsx
  {
    title: 'Analysis',
    items: [
      { id: 'missed', label: 'CRT Missed Trades', icon: EyeOff },
      { id: 'missed-calendar', label: 'CRT Missed Trade Calendar', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'breached-trades', label: 'Breached Trades', icon: AlertTriangle },
    ],
  },
```

with:

```tsx
  {
    title: 'Analysis',
    items: [
      { id: 'missed', label: 'CRT Missed Trades', icon: EyeOff },
      { id: 'missed-calendar', label: 'CRT Missed Trade Calendar', icon: Calendar },
      { id: 'saturday-review', label: 'Saturday Review', icon: CalendarCheck },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'breached-trades', label: 'Breached Trades', icon: AlertTriangle },
    ],
  },
```

- [ ] **Step 2: Modify `src/app/App.tsx`**

(a) Add lazy imports after line 50 (`const GeneralMissedTradesCalendar = lazy(...)`). Replace:

```tsx
const GeneralMissedTradesCalendar = lazy(() => import('./components/GeneralMissedTradesCalendar'));
```

with:

```tsx
const GeneralMissedTradesCalendar = lazy(() => import('./components/GeneralMissedTradesCalendar'));
const SaturdayReviewList = lazy(() => import('./components/SaturdayReview/SaturdayReviewList'));
const SaturdayReviewDetail = lazy(() => import('./components/SaturdayReview/SaturdayReviewDetail'));
const SaturdayReviewForm = lazy(() => import('./components/SaturdayReview/SaturdayReviewForm'));
```

(b) Add `TabContent` cases after `{activeTab === 'reminders' && <Reminders />}` (line 93). Replace:

```tsx
            {activeTab === 'reminders' && <Reminders />}
```

with:

```tsx
            {activeTab === 'reminders' && <Reminders />}
            {activeTab === 'saturday-review' && <SaturdayReviewList />}
            {activeTab === 'saturday-review-detail' && <SaturdayReviewDetail />}
            {activeTab === 'saturday-review-form' && <SaturdayReviewForm />}
```

(c) Add the three tabs to the active-tab localStorage whitelist (line 106). Replace:

```tsx
return (saved && ['dashboard', 'journal', 'import', 'convert', 'checklist', 'calendar', 'missed', 'missed-calendar', 'missed-log', 'missed-log-calendar', 'firms', 'accounts', 'reports', 'strategy-master', 'bias', 'bias-input', 'bias-history', 'liquidity-input', 'liquidity-history', 'crt-input', 'crt-history', 'breached-trades', 'settings', 'xauusd-calculator', 'forex-lot-calculator', 'market-stats', 'monthly-review', 'monthly-review-detail', 'monthly-review-form', 'weekly-review', 'weekly-review-detail', 'weekly-review-form', 'daily-review', 'daily-review-detail', 'daily-review-form', 'reminders'].includes(saved)) ? saved as Tab : 'dashboard';
```

with:

```tsx
return (saved && ['dashboard', 'journal', 'import', 'convert', 'checklist', 'calendar', 'missed', 'missed-calendar', 'missed-log', 'missed-log-calendar', 'firms', 'accounts', 'reports', 'strategy-master', 'bias', 'bias-input', 'bias-history', 'liquidity-input', 'liquidity-history', 'crt-input', 'crt-history', 'breached-trades', 'settings', 'xauusd-calculator', 'forex-lot-calculator', 'market-stats', 'monthly-review', 'monthly-review-detail', 'monthly-review-form', 'weekly-review', 'weekly-review-detail', 'weekly-review-form', 'daily-review', 'daily-review-detail', 'daily-review-form', 'saturday-review', 'saturday-review-detail', 'saturday-review-form', 'reminders'].includes(saved)) ? saved as Tab : 'dashboard';
```

- [ ] **Step 3: Build to verify**

```bash
pnpm build
```

Expected: build completes.

- [ ] **Step 4: Manual smoke test**

With the dev servers running (see Task 6 for backend; `pnpm dev` for frontend), in the browser:
1. Log in, open **Analysis → Saturday Review**.
2. Click **New Review**, verify the form opens blank.
3. On the list page, confirm the table renders with the 8 columns and the filter dropdowns.
4. Create a review, then from the list use **View** → detail page hero + sections render; **Edit** loads the form; **Duplicate** opens a blank form pre-filled with pair + bias.
5. Refresh the page while on the Saturday Review tab — the active tab persists (whitelist works).

- [ ] **Step 5: Commit**

```bash
git add src/app/components/Sidebar.tsx src/app/App.tsx
git commit -m "feat: wire saturday review module into navigation"
```
