# Monthly Market Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a premium "Monthly Market Review" module — a higher timeframe research notebook with timeline entries, images, rich text, and bias tracking.

**Architecture:** Two Mongoose models (MonthlyReview + MonthlyReviewEntry) with REST API, two React tab components (list + detail), reusing existing Cloudinary upload and TipTap rich text.

**Tech Stack:** Node.js/Express/Mongoose backend, React/Vite/Tailwind frontend, shadcn/ui components, TipTap rich text, Cloudinary images.

## Global Constraints

- Do NOT modify any existing modules (Trade Journal, Dashboard, etc.)
- Follow existing code conventions: camelCase functions/vars, PascalCase components, kebab-case files
- Use existing UI components from `src/app/components/ui/` (Card, Button, Badge, Dialog, Select, Input, Skeleton)
- Use existing typography utility classes (`text-page-title`, `text-card-title`, `text-body`, etc.)
- Purple brand color `#7C3AED` for gradients and accents
- Reuse existing `/api/upload` for image uploads (Cloudinary)
- Use TipTap (@tiptap/react + starter-kit) for rich text — already in package.json
- No test framework — manual verification via browser

---
## File Structure

### Backend files to create:
- `backend/src/modules/monthlyReviews/monthlyReview.model.js` — Mongoose schema
- `backend/src/modules/monthlyReviews/monthlyReviewEntry.model.js` — Mongoose schema for entries
- `backend/src/modules/monthlyReviews/monthlyReview.controller.js` — CRUD for reviews
- `backend/src/modules/monthlyReviews/monthlyReviewEntry.controller.js` — CRUD for entries
- `backend/src/modules/monthlyReviews/monthlyReview.routes.js` — Express routes

### Frontend files to create:
- `src/app/components/MonthlyMarketReview/ReviewCard.tsx` — Premium list card
- `src/app/components/MonthlyMarketReview/CreateReviewDialog.tsx` — Create/edit dialog
- `src/app/components/MonthlyMarketReview/AddEntryDialog.tsx` — Add entry dialog
- `src/app/components/MonthlyMarketReview/TimelineEntry.tsx` — Timeline card
- `src/app/components/MonthlyMarketReview/ImageGallery.tsx` — Pinterest-style gallery + lightbox
- `src/app/components/MonthlyMarketReview/MonthlyReviewList.tsx` — List page
- `src/app/components/MonthlyMarketReview/MonthlyReviewDetail.tsx` — Detail page

### Frontend files to modify:
- `src/app/services/apiService.ts` — Add monthlyReviews API methods
- `src/app/components/Sidebar.tsx` — Add tab type + sidebar menu item
- `src/app/App.tsx` — Add lazy import + tab routing

### Backend files to modify:
- `backend/server.js` — Register new routes

---
### Task 1: Backend Models

**Files:**
- Create: `backend/src/modules/monthlyReviews/monthlyReview.model.js`
- Create: `backend/src/modules/monthlyReviews/monthlyReviewEntry.model.js`

**Interfaces:**
- Consumes: `schemaOptions` from `../../config/schemaOptions`
- Produces: `MonthlyReview` model, `MonthlyReviewEntry` model

- [ ] **Create `monthlyReview.model.js`**

```javascript
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const monthlyReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pair: { type: String, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  title: { type: String, default: '' },
  bias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: 'Neutral' },
  summary: { type: String, default: '' },
  imagePath: { type: String, default: '' },
  imageCaption: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
}, schemaOptions);

monthlyReviewSchema.index({ userId: 1, pair: 1, month: 1, year: 1 }, { unique: true });
monthlyReviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MonthlyReview', monthlyReviewSchema);
```

- [ ] **Create `monthlyReviewEntry.model.js`**

```javascript
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const monthlyReviewEntrySchema = new mongoose.Schema({
  monthlyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyReview', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entryTitle: { type: String, default: '' },
  comment: { type: String, default: '' },
  images: [{
    url: { type: String },
    publicId: { type: String },
    caption: { type: String, default: '' },
  }],
  displayOrder: { type: Number, default: 0 },
}, schemaOptions);

monthlyReviewEntrySchema.index({ monthlyReviewId: 1, createdAt: -1 });

module.exports = mongoose.model('MonthlyReviewEntry', monthlyReviewEntrySchema);
```

---
### Task 2: Backend Controllers

**Files:**
- Create: `backend/src/modules/monthlyReviews/monthlyReview.controller.js`
- Create: `backend/src/modules/monthlyReviews/monthlyReviewEntry.controller.js`

**Interfaces:**
- Consumes: `MonthlyReview` model, `MonthlyReviewEntry` model
- Produces: Controller functions (getAll, getById, create, update, remove) for reviews and entries

- [ ] **Create `monthlyReview.controller.js`**

```javascript
const mongoose = require('mongoose');
const MonthlyReview = require('./monthlyReview.model');
const MonthlyReviewEntry = require('./monthlyReviewEntry.model');

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

    const { deleteImage } = require('../../config/cloudinary');
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
```

- [ ] **Create `monthlyReviewEntry.controller.js`**

```javascript
const mongoose = require('mongoose');
const MonthlyReviewEntry = require('./monthlyReviewEntry.model');
const MonthlyReview = require('./monthlyReview.model');

const getAll = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }
    const entries = await MonthlyReviewEntry.find({
      monthlyReviewId: reviewId,
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
    const review = await MonthlyReview.findOne({ _id: reviewId, userId: req.session.userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const { entryTitle, comment, images } = req.body;
    const maxOrder = await MonthlyReviewEntry.findOne({ monthlyReviewId: reviewId })
      .sort({ displayOrder: -1 }).select('displayOrder');

    const entry = new MonthlyReviewEntry({
      monthlyReviewId: reviewId,
      userId: req.session.userId,
      entryTitle: entryTitle || '',
      comment: comment || '',
      images: images || [],
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
    const entry = await MonthlyReviewEntry.findOneAndUpdate(
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
    const entry = await MonthlyReviewEntry.findOne({ _id: entryId, userId: req.session.userId });
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    const { deleteImage } = require('../../config/cloudinary');
    for (const img of (entry.images || [])) {
      if (img.publicId) {
        try { await deleteImage(img.publicId); } catch {}
      }
    }

    await MonthlyReviewEntry.findByIdAndDelete(entryId);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
```

---
### Task 3: Register Routes + API Methods

**Files:**
- Create: `backend/src/modules/monthlyReviews/monthlyReview.routes.js`
- Modify: `backend/server.js`
- Modify: `src/app/services/apiService.ts`

- [ ] **Create `monthlyReview.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const reviewController = require('./monthlyReview.controller');
const entryController = require('./monthlyReviewEntry.controller');

router.get('/', reviewController.getAll);
router.get('/:id', reviewController.getById);
router.post('/', reviewController.create);
router.put('/:id', reviewController.update);
router.delete('/:id', reviewController.remove);

router.get('/:reviewId/entries', entryController.getAll);
router.post('/:reviewId/entries', entryController.create);
router.put('/:reviewId/entries/:entryId', entryController.update);
router.delete('/:reviewId/entries/:entryId', entryController.remove);

module.exports = router;
```

- [ ] **Register in `server.js`** — Add after existing routes:

```javascript
const monthlyReviewRoutes = require('./src/modules/monthlyReviews/monthlyReview.routes');
// ... after other route registrations
app.use('/api/monthly-reviews', isAuthenticated, monthlyReviewRoutes);
```

- [ ] **Add to `apiService.ts`** — Add a `monthlyReviews` namespace with methods:

```typescript
monthlyReviews: {
  getAll: async (filters?: {
    pair?: string; month?: number; year?: number;
    bias?: string; search?: string; page?: number; limit?: number;
  }): Promise<{ reviews: any[]; total: number; page: number; limit: number }> => {
    const params = new URLSearchParams();
    if (filters?.pair) params.set('pair', filters.pair);
    if (filters?.month) params.set('month', filters.month.toString());
    if (filters?.year) params.set('year', filters.year.toString());
    if (filters?.bias) params.set('bias', filters.bias);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    const qs = params.toString();
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews${qs ? `?${qs}` : ''}`);
  },

  getById: async (id: string): Promise<any> => {
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews/${id}`);
  },

  create: async (data: {
    pair: string; month: number; year: number; title?: string;
    bias?: string; summary?: string; imagePath?: string; imageCaption?: string;
  }): Promise<any> => {
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any): Promise<any> => {
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews/${id}`, {
      method: 'DELETE',
    });
  },

  getEntries: async (reviewId: string): Promise<any[]> => {
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews/${reviewId}/entries`);
  },

  createEntry: async (reviewId: string, data: {
    entryTitle?: string; comment?: string; images?: { url: string; publicId: string; caption?: string }[];
  }): Promise<any> => {
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews/${reviewId}/entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEntry: async (reviewId: string, entryId: string, data: any): Promise<any> => {
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews/${reviewId}/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteEntry: async (reviewId: string, entryId: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/monthly-reviews/${reviewId}/entries/${entryId}`, {
      method: 'DELETE',
    });
  },
},
```

---
### Task 4: Sidebar + Tab Registration

**Files:**
- Modify: `src/app/components/Sidebar.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Add `Tab` type to Sidebar.tsx** — Add `'monthly-review' | 'monthly-review-detail'` to the type union

- [ ] **Add sidebar menu item** — Add to the "Analysis" group:
```typescript
{
  title: 'Analysis',
  items: [
    { id: 'monthly-review', label: 'Monthly Market Review', icon: Notebook },
    // ... existing items
  ],
},
```
Import `Notebook` from `lucide-react` (or use `FileText` if `Notebook` is not available — use `Notebook` icon).

- [ ] **Update App.tsx** — Add lazy import and tab render:
```typescript
const MonthlyMarketReview = lazy(() => import('./components/MonthlyMarketReview/MonthlyReviewList'));
const MonthlyReviewDetail = lazy(() => import('./components/MonthlyMarketReview/MonthlyReviewDetail'));

// In TabContent:
{activeTab === 'monthly-review' && <MonthlyMarketReview />}
{activeTab === 'monthly-review-detail' && <MonthlyReviewDetail />}
```

---
### Task 5: ReviewCard Component

**Files:**
- Create: `src/app/components/MonthlyMarketReview/ReviewCard.tsx`

**Interfaces:**
- Consumes: review data shape from api response
- Produces: `<ReviewCard review={...} onOpen onEdit onDelete />`

The card shows:
- Large pair name (e.g. "XAUUSD") in `text-section-title`
- Month and year (e.g. "June 2026")
- Bias badge (green for Bullish, red for Bearish, gray for Neutral)
- Small chart thumbnail (imagePath, fallback to chart placeholder icon)
- Stats row: entry count, image count, comment count
- "Last edited" timestamp
- Three dot-action buttons: Open, Edit, Delete

Style: White card with `rounded-2xl`, border `#E5EAF2`, shadow. Hover lift effect. Flex layout with good spacing.

```tsx
// Key structure
export default function ReviewCard({ review, onOpen, onEdit, onDelete }) {
  const monthName = format(new Date(review.year, review.month - 1), 'MMMM yyyy');
  // ... premium card with all the spec'd elements
}
```

---
### Task 6: CreateReviewDialog Component

**Files:**
- Create: `src/app/components/MonthlyMarketReview/CreateReviewDialog.tsx`

**Interfaces:**
- Props: `{ open, onOpenChange, onSaved, editReview?: any }`
- Produces: Dialog with form to create/edit a review

Form fields:
- **Pair** — Select (fetch from `apiService.settings.getPairs()` or use a static list)
- **Month** — Select (January-December)
- **Year** — Select (2020-2030, default current year)
- **Initial Bias** — Radio/Button group: Bullish | Bearish | Neutral
- **Monthly Theme** — Input (short title)
- **Notes** — TipTap rich text editor
- **Monthly Chart Image** — File upload with drag-and-drop, preview, caption input

Use existing ui components: `Dialog`, `Button`, `Select`, `Input`, `Label`, `Badge`

For TipTap setup:
```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

const editor = useEditor({
  extensions: [StarterKit, Underline],
  content: editReview?.summary || '',
  editorProps: {
    attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-4 py-3' },
  },
});
```

Styling: Use the same `.missed-reason-editor` CSS classes from theme.css for the editor toolbar.

---
### Task 7: AddEntryDialog Component

**Files:**
- Create: `src/app/components/MonthlyMarketReview/AddEntryDialog.tsx`

**Interfaces:**
- Props: `{ open, onOpenChange, onSaved, reviewId, editEntry?: any }`
- Produces: Dialog to add/edit a timeline entry

Form fields:
- **Entry Title** — Input
- **Comment** — TipTap rich text editor
- **Images** — Multiple image upload with preview grid, each image has a caption input, remove button

Upload flow:
1. User selects files (accept: PNG, JPEG, WEBP, max 10MB each, max 5 files)
2. Files are uploaded to `/api/upload/multiple` on submit
3. Returned URLs + publicIds are stored in entry's images array
4. Show upload progress/loading state

---
### Task 8: TimelineEntry Component

**Files:**
- Create: `src/app/components/MonthlyMarketReview/TimelineEntry.tsx`

**Interfaces:**
- Props: `{ entry, onEdit, onDelete }`
- Produces: Timeline card showing one entry in the timeline

Card layout:
- **Left**: Date badge (e.g., "25 Jun") with time below, vertical timeline line
- **Right**: Entry title, rich text comment (rendered as HTML), image thumbnails
- **Actions**: Edit and Delete buttons (top-right corner)
- **Animation**: Fade-in on mount, subtle hover effect

```tsx
// Date badge
<div className="flex flex-col items-center w-20 flex-shrink-0">
  <span className="text-card-title font-bold">{day}</span>
  <span className="text-caption text-muted-foreground">{monthAbbr}</span>
  <span className="text-micro text-muted-foreground">{time}</span>
</div>
```

---
### Task 9: ImageGallery Component

**Files:**
- Create: `src/app/components/MonthlyMarketReview/ImageGallery.tsx`

**Interfaces:**
- Props: `{ images: Array<{ url: string; caption?: string; createdAt?: string }> }`
- Produces: Pinterest-style masonry/grid gallery + lightbox overlay

Pinterest-style grid:
- CSS columns or grid with varying heights (use `columns-2 md:columns-3 lg:columns-4` with `break-inside-avoid`)
- Each image in a card with rounded corners, caption below
- Lazy loading (`loading="lazy"`)
- Hover: slight scale + overlay with view icon

Lightbox:
- Full-screen overlay with dark backdrop (`bg-black/80`)
- Large image centered
- Left/right navigation arrows
- Close button (X), download link
- Zoom on click (toggle `scale-150` with smooth transition)
- Keyboard support (Escape to close, arrow keys for navigation)

---
### Task 10: MonthlyReviewList Component

**Files:**
- Create: `src/app/components/MonthlyMarketReview/MonthlyReviewList.tsx`

**Interfaces:**
- Props: none (standalone page component)
- Produces: Full list page with filters, cards, and CRUD orchestration

Page layout:
1. **Header**: Title "Monthly Market Review" + subtitle "Your higher timeframe trading research." + "New Review" button
2. **Filters bar**: Pair select, Month select, Year select, Bias select, Search input — all inline
3. **Card grid**: 3-col desktop, 2-col tablet, 1-col mobile using CSS grid
4. **Pagination**: Page controls at bottom
5. **States**: Loading (skeleton grid), Empty (illustration + message + CTA), Error (alert)

State management:
```tsx
const [reviews, setReviews] = useState<any[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [filters, setFilters] = useState({ pair: '', month: '', year: '', bias: '', search: '' });
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [createOpen, setCreateOpen] = useState(false);

useEffect(() => { loadReviews(); }, [filters, page]);
```

Navigation to detail:
- Collect all images across entries to pass
- Set active tab to `monthly-review-detail` and store review ID

```typescript
const handleOpen = (review: any) => {
  (window as any).__monthlyReviewId = review.id;
  window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'monthly-review-detail' }));
};
```

---
### Task 11: MonthlyReviewDetail Component

**Files:**
- Create: `src/app/components/MonthlyMarketReview/MonthlyReviewDetail.tsx`

**Interfaces:**
- Props: none (reads review ID from `window.__monthlyReviewId`)
- Produces: Full detail page with all 4 sections

Page sections:

**Header:**
- Back button (← Back to Reviews)
- Pair + Month/Year + Bias badge
- Stats row: Created date, Updated date, Entry count, Image count

**Section 1 — Monthly Summary:**
- Large card with rich text (rendered HTML from TipTap)
- Falls back to empty state if no summary

**Section 2 — Timeline:**
- List of TimelineEntry components, newest first
- Empty state: "No entries yet. Add your first update."
- Floating "Add Update" button (bottom-right, circular, purple gradient)

**Section 3 — Image Gallery:**
- Collect all images from all entries
- Pass to ImageGallery component
- Empty state if no images

**Section 4 — Trading Notes:**
- Each entry shown as a note card (simpler than timeline, no timeline line)
- Can reuse entry data or have separate notes section

State management:
```tsx
const [review, setReview] = useState<any>(null);
const [entries, setEntries] = useState<any[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [addEntryOpen, setAddEntryOpen] = useState(false);
const [editEntry, setEditEntry] = useState<any>(null);

const reviewId = (window as any).__monthlyReviewId;

useEffect(() => {
  if (reviewId) {
    loadReview();
    loadEntries();
  }
}, [reviewId]);
```

---
### Task 12: Verification + Polish

- [ ] **Stop backend** (if running), **restart it** to pick up new routes
- [ ] **Stop frontend dev server** (if running), **restart it**
- [ ] **Open browser** and test the full flow:
  1. Navigate to Monthly Market Review in sidebar
  2. Verify empty state displays
  3. Click "New Review" — verify dialog opens
  4. Create a review with all fields (pair, month, year, bias, title, summary, image)
  5. Verify review card appears on the list
  6. Click Open on the card — verify detail page loads
  7. Verify summary renders, stats are correct
  8. Click "Add Update" — create a timeline entry with title, comment, and image
  9. Verify entry appears in timeline
  10. Upload another image — verify it appears in gallery
  11. Test edit and delete on entries
  12. Test filters on list page (pair, month, year, bias, search)
  13. Test responsive layout at various widths
- [ ] **Check browser console** for any errors
