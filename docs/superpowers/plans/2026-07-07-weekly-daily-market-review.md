# Weekly & Daily Market Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Weekly and Daily Market Review modules that form a hierarchical Top-Down Analysis system with the existing Monthly Market Review.

**Architecture:** Backend: Mongoose models + Express controllers/routes (per design spec). Frontend: Separate component folders per timeframe, custom event navigation, axios API client. Weekly refs Monthly, Daily refs Weekly (all optional).

**Tech Stack:** Node.js/Express, Mongoose, React 18, Vite, Tailwind CSS, TipTap editor, Framer Motion, Axios, Cloudinary

## Global Constraints

- Every backend query must include `userId: req.session.userId`
- All routes mounted behind `isAuthenticated` middleware
- All IDs validated with `mongoose.Types.ObjectId.isValid()`
- `schemaOptions` applied to all models (timestamps, _id→id transform)
- Cloudinary images cleaned up on delete (review + entry)
- Each review has unique index on `{ userId, pair, timeframeKey }`
- Frontend uses custom event navigation (`navigate-to-tab`), not React Router
- Frontend passes data via `window.__*` globals (existing pattern)
- Follow kebab-case for backend filenames, PascalCase for frontend
- Theme colors: Purple (Monthly), Blue (Weekly), Emerald (Daily)

---

## File Structure

### Backend — New Files

```
backend/src/modules/weeklyReviews/
  weeklyReview.model.js
  weeklyReview.controller.js
  weeklyReview.routes.js
  weeklyReviewEntry.model.js
  weeklyReviewEntry.controller.js

backend/src/modules/dailyReviews/
  dailyReview.model.js
  dailyReview.controller.js
  dailyReview.routes.js
  dailyReviewEntry.model.js
  dailyReviewEntry.controller.js
```

### Backend — Modified Files

```
backend/server.js                          — add 4 requires + 2 route mounts
backend/src/config/cloudinary.js           — no changes needed
```

### Frontend — New Files

```
src/app/components/WeeklyMarketReview/
  WeeklyReviewList.tsx
  WeeklyReviewCard.tsx
  WeeklyReviewDetail.tsx
  WeeklyReviewForm.tsx
  AddEntryDialog.tsx

src/app/components/DailyMarketReview/
  DailyReviewList.tsx
  DailyReviewCard.tsx
  DailyReviewDetail.tsx
  DailyReviewForm.tsx
  AddEntryDialog.tsx
  TradeIdeaCard.tsx
  SessionCard.tsx
  EntryModelCard.tsx
```

### Frontend — Modified Files

```
src/app/services/apiService.ts             — add weeklyReviews + dailyReviews namespaces
src/app/components/Sidebar.tsx             — Tab type + nav items
src/app/App.tsx                            — lazy imports + tab mappings
src/app/types/trading.ts                   — (optional) type definitions
```

---

### Task 1: Backend — WeeklyReview Model + Entry Model

**Files:**
- Create: `backend/src/modules/weeklyReviews/weeklyReview.model.js`
- Create: `backend/src/modules/weeklyReviews/weeklyReviewEntry.model.js`

**Pattern:** Follow `backend/src/modules/monthlyReviews/monthlyReview.model.js` and `monthlyReviewEntry.model.js` exactly.

**WeeklyReview schema** — add all fields from the design doc:
```js
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const weeklyReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  monthlyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyReview' },
  pair: { type: String, required: true },
  weekNumber: { type: Number, required: true, min: 1, max: 53 },
  year: { type: Number, required: true },
  weekStart: { type: String, default: '' },
  weekEnd: { type: String, default: '' },
  bias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], default: 'Neutral' },
  theme: { type: String, default: '' },
  expectedDirection: { type: String, default: '' },
  weeklyStory: { type: String, default: '' },
  institutionalNarrative: { type: String, default: '' },
  marketStructure: { type: String, default: '' },
  pwh: { type: Number },
  pwl: { type: Number },
  weeklyOpen: { type: Number },
  weeklyFvg: { type: String, default: '' },
  weeklyIfvg: { type: String, default: '' },
  weeklyOb: { type: String, default: '' },
  weeklyBreaker: { type: String, default: '' },
  eqh: { type: Number },
  eql: { type: Number },
  liquidity: { type: String, default: '' },
  premium: { type: String, default: '' },
  discount: { type: String, default: '' },
  mainTarget: { type: Number },
  mainLiquidity: { type: String, default: '' },
  weeklyCrt: { type: String, default: '' },
  weeklySmt: { type: String, default: '' },
  weeklyCisd: { type: String, default: '' },
  expectedManipulation: { type: String, default: '' },
  expansionDirection: { type: String, default: '' },
  asianSession: { type: String, default: '' },
  londonSession: { type: String, default: '' },
  newYorkSession: { type: String, default: '' },
  economicEvents: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
}, schemaOptions);

weeklyReviewSchema.index({ userId: 1, pair: 1, weekNumber: 1, year: 1 }, { unique: true });
weeklyReviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WeeklyReview', weeklyReviewSchema);
```

**WeeklyReviewEntry schema** — same as `monthlyReviewEntry.model.js` with renamed ref + added `checklistItems`:
```js
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');

const weeklyReviewEntrySchema = new mongoose.Schema({
  weeklyReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyReview', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entryTitle: { type: String, default: '' },
  comment: { type: String, default: '' },
  images: [{
    url: { type: String },
    publicId: { type: String },
    caption: { type: String, default: '' },
  }],
  entryTime: { type: String, default: '' },
  bias: { type: String, default: '' },
  tags: [{ type: String }],
  mood: { type: String, default: '' },
  importance: { type: String, default: '' },
  session: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  checklistItems: [{ label: { type: String }, checked: { type: Boolean, default: false } }],
}, schemaOptions);

weeklyReviewEntrySchema.index({ weeklyReviewId: 1, createdAt: -1 });

module.exports = mongoose.model('WeeklyReviewEntry', weeklyReviewEntrySchema);
```

- [ ] Create `weeklyReview.model.js` with above schema
- [ ] Create `weeklyReviewEntry.model.js` with above schema

---

### Task 2: Backend — WeeklyReview Controller + Routes

**Files:**
- Create: `backend/src/modules/weeklyReviews/weeklyReview.controller.js`
- Create: `backend/src/modules/weeklyReviews/weeklyReview.routes.js`
- Create: `backend/src/modules/weeklyReviews/weeklyReviewEntry.controller.js`

**Pattern:** Copy `monthlyReview.controller.js` and `monthlyReviewEntry.controller.js` and rename:
- `MonthlyReview` → `WeeklyReview`
- `MonthlyReviewEntry` → `WeeklyReviewEntry`
- `monthlyReviewId` → `weeklyReviewId`

Only difference in the parent controller: the `getAll` filter includes optional `weekNumber` instead of `month`. The `create` checks uniqueness on `{ pair, weekNumber, year }` instead of `{ pair, month, year }`. The create validation requires `pair, weekNumber, year`.

Entry controller: replace `reviewId` param validation references. Same CRUD logic.

Routes file: identically structured, just references weekly controllers.

- [ ] Create `weeklyReview.controller.js` (rename monthly pattern, adjust create validation)
- [ ] Create `weeklyReviewEntry.controller.js` (rename monthly pattern)
- [ ] Create `weeklyReview.routes.js` (same structure as monthly)

---

### Task 3: Backend — DailyReview Model + Entry Model

**Files:**
- Create: `backend/src/modules/dailyReviews/dailyReview.model.js`
- Create: `backend/src/modules/dailyReviews/dailyReviewEntry.model.js`

**Pattern:** Same as Weekly. DailyReview schema includes all fields from the design doc. Key differences from weekly:
- Uses `date` (String, ISO) and `dayOfWeek` instead of `weekNumber`/`weekStart`/`weekEnd`
- Unique index on `{ userId, pair, date }`
- Fields: bias, expectedDirection, htfBias, crtDirection, premium, discount, liquidityDirection, pdh, pdl, pdo, previousRange, previousClose, previousHigh, previousLow, adr, expansion, narrative, liquidityTarget, expectedSweep, expectedCrt, expectedSmt, expectedSession, killZone, biasConfidence (Number), status

DailyReviewEntry includes all MonthlyReviewEntry fields plus:
- `checklistItems: [{ label: String, checked: Boolean }]`
- `tradeIdeas: [{ direction, entry, sl, tp, rr, reason, screenshot, status }]`
- `entryModels: [{ name, type, status }]`
- `sessionPlans: [{ session, expectedBehavior, expectedLiquidity, expectedEntry }]`
- `screenshots: [{ url, publicId, timeframe, caption }]`

- [ ] Create `dailyReview.model.js` with all DailyReview fields
- [ ] Create `dailyReviewEntry.model.js` with all enhanced entry fields

---

### Task 4: Backend — DailyReview Controller + Routes

**Files:**
- Create: `backend/src/modules/dailyReviews/dailyReview.controller.js`
- Create: `backend/src/modules/dailyReviews/dailyReview.routes.js`
- Create: `backend/src/modules/dailyReviews/dailyReviewEntry.controller.js`

**Pattern:** Same rename approach as weekly. DailyReview controller filters by `date` instead of `month`. Entry controller is same CRUD pattern with the enhanced entry schema fields.

- [ ] Create `dailyReview.controller.js`
- [ ] Create `dailyReviewEntry.controller.js`
- [ ] Create `dailyReview.routes.js`

---

### Task 5: Backend — server.js Route Mounting

**Files:**
- Modify: `backend/server.js`

Add requires after the existing monthly review route:
```js
const weeklyReviewRoutes = require('./src/modules/weeklyReviews/weeklyReview.routes');
const dailyReviewRoutes = require('./src/modules/dailyReviews/dailyReview.routes');
```

Add mounts after the monthly reviews line (line 110):
```js
app.use('/api/weekly-reviews', isAuthenticated, weeklyReviewRoutes);
app.use('/api/daily-reviews', isAuthenticated, dailyReviewRoutes);
```

- [ ] Add requires for weekly/daily routes
- [ ] Add route mounts for both modules

---

### Task 6: Frontend — apiService + Navigation Wiring

**Files:**
- Modify: `src/app/services/apiService.ts`
- Modify: `src/app/components/Sidebar.tsx`
- Modify: `src/app/App.tsx`

**apiService.ts** — add two new namespaces following the existing `monthlyReviews` pattern:

```typescript
// After monthlyReviews block, add:
weeklyReviews: {
  getAll: async (filters?: {
    pair?: string; weekNumber?: number; year?: number;
    bias?: string; search?: string; page?: number; limit?: number;
  }): Promise<{ reviews: any[]; total: number; page: number; limit: number }> => {
    const params = new URLSearchParams();
    if (filters?.pair) params.set('pair', filters.pair);
    if (filters?.weekNumber) params.set('weekNumber', filters.weekNumber.toString());
    if (filters?.year) params.set('year', filters.year.toString());
    if (filters?.bias) params.set('bias', filters.bias);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    const qs = params.toString();
    return apiGet(`/weekly-reviews${qs ? `?${qs}` : ''}`);
  },

  getById: async (id: string): Promise<any> => {
    return apiGet(`/weekly-reviews/${id}`);
  },

  create: async (data: any): Promise<any> => {
    return apiPost('/weekly-reviews', data);
  },

  update: async (id: string, data: any): Promise<any> => {
    return apiPut(`/weekly-reviews/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiDelete(`/weekly-reviews/${id}`);
  },

  getEntries: async (reviewId: string): Promise<any[]> => {
    return apiGet(`/weekly-reviews/${reviewId}/entries`);
  },

  createEntry: async (reviewId: string, data: any): Promise<any> => {
    return apiPost(`/weekly-reviews/${reviewId}/entries`, data);
  },

  updateEntry: async (reviewId: string, entryId: string, data: any): Promise<any> => {
    return apiPut(`/weekly-reviews/${reviewId}/entries/${entryId}`, data);
  },

  deleteEntry: async (reviewId: string, entryId: string): Promise<void> => {
    return apiDelete(`/weekly-reviews/${reviewId}/entries/${entryId}`);
  },
},
```

Add the identical pattern for `dailyReviews` with `/daily-reviews` paths.

**Sidebar.tsx** — add to `Tab` type:
```typescript
| 'weekly-review' | 'weekly-review-detail' | 'weekly-review-form'
| 'daily-review' | 'daily-review-detail' | 'daily-review-form'
```

Add nav items in the "Analysis" group after `monthly-review`:
```typescript
{ id: 'weekly-review', label: 'Weekly Market Review', icon: Calendar },
{ id: 'daily-review', label: 'Daily Market Review', icon: TrendingUp },
```

**App.tsx** — add lazy imports:
```typescript
const WeeklyReviewList = lazy(() => import('./components/WeeklyMarketReview/WeeklyReviewList'));
const WeeklyReviewDetail = lazy(() => import('./components/WeeklyMarketReview/WeeklyReviewDetail'));
const WeeklyReviewForm = lazy(() => import('./components/WeeklyMarketReview/WeeklyReviewForm'));
const DailyReviewList = lazy(() => import('./components/DailyMarketReview/DailyReviewList'));
const DailyReviewDetail = lazy(() => import('./components/DailyMarketReview/DailyReviewDetail'));
const DailyReviewForm = lazy(() => import('./components/DailyMarketReview/DailyReviewForm'));
```

Add tab render cases:
```typescript
{activeTab === 'weekly-review' && <WeeklyReviewList />}
{activeTab === 'weekly-review-detail' && <WeeklyReviewDetail />}
{activeTab === 'weekly-review-form' && <WeeklyReviewForm />}
{activeTab === 'daily-review' && <DailyReviewList />}
{activeTab === 'daily-review-detail' && <DailyReviewDetail />}
{activeTab === 'daily-review-form' && <DailyReviewForm />}
```

- [ ] Add `weeklyReviews` and `dailyReviews` namespaces to apiService.ts
- [ ] Update Tab type and nav items in Sidebar.tsx
- [ ] Add lazy imports and tab cases in App.tsx

---

### Task 7: Frontend — WeeklyReviewList + WeeklyReviewCard

**Files:**
- Create: `src/app/components/WeeklyMarketReview/WeeklyReviewList.tsx`
- Create: `src/app/components/WeeklyMarketReview/WeeklyReviewCard.tsx`

Follow the exact structure of `MonthlyReviewList.tsx`:
- Same filter/search pattern (pair, year, bias, search, pagination)
- Week selector dropdown (1-53) instead of month selector
- Framer Motion animations
- Skeleton loading state
- Empty state with icon

**WeeklyReviewCard** follows `ReviewCard.tsx`:
- Shows: week number + date range, pair, bias badge, entry/image counts, last edited
- Color theme: blue accent instead of purple
- Action buttons: View → `weekly-review-detail`, Edit → `weekly-review-form`, Delete with confirm

- [ ] Create `WeeklyReviewCard.tsx` (blue theme, week info)
- [ ] Create `WeeklyReviewList.tsx` (filters for week/year/pair/bias/search)

---

### Task 8: Frontend — WeeklyReviewDetail

**Files:**
- Create: `src/app/components/WeeklyMarketReview/WeeklyReviewDetail.tsx`

Follow `MonthlyReviewDetail.tsx` structure with these sections:
1. **Hero** — blue gradient (`from-blue-600 to-blue-800`) with pair, week number, date range, bias badge
2. **Stats row** — Week, Entries, Images, Notes, Checklist %
3. **Weekly Summary** — HTML from TipTap editor (bias, theme, expectedDirection, weeklyStory, institutionalNarrative, marketStructure)
4. **Key Levels Table** — 2-column grid of level names + values (PWH, PWL, Weekly Open, FVG, IFVG, OB, Breaker, EQH, EQL, Liquidity, Premium, Discount)
5. **Objectives Cards** — 4 stat cards for Main Target, CRT, SMT, CISD
6. **Session Cards** — 3 cards (Asian/London/NY) with expected behavior
7. **Economic Events** — text section
8. **Timeline** — entries with Add Entry button (reuse TimelineEntry from Monthly)
9. **Image Gallery** — reuse ImageGallery from Monthly

Reuse `TimelineEntry.tsx` and `ImageGallery.tsx` from `../MonthlyMarketReview/` via import:
```typescript
import TimelineEntry from '../MonthlyMarketReview/TimelineEntry';
import ImageGallery from '../MonthlyMarketReview/ImageGallery';
```

- [ ] Create `WeeklyReviewDetail.tsx` with hero, stats, summary, key levels, objectives, sessions, timeline, gallery

---

### Task 9: Frontend — WeeklyReviewForm + AddEntryDialog

**Files:**
- Create: `src/app/components/WeeklyMarketReview/WeeklyReviewForm.tsx`
- Create: `src/app/components/WeeklyMarketReview/AddEntryDialog.tsx`

**WeeklyReviewForm** follows `MonthlyReviewForm.tsx`:
- Same TipTap editor for summary
- All weekly-specific fields (Key Levels section, Objectives, Sessions, Economic Events)
- Image upload for cover image
- Auto-save, dirty detection, keyboard shortcuts
- Navigation: `navigate-to-tab('weekly-review')` on save/cancel

**Key Levels section** — form fields for: PWH, PWL, Weekly Open (number inputs), FVG, IFVG, OB, Breaker (text inputs), EQH, EQL (number inputs), Liquidity, Premium, Discount (text/select)
**Objectives section** — fields for Main Target (number), Liquidity, CRT, SMT, CISD, Expected Manipulation, Expansion Direction
**Sessions section** — 3 textareas for Asian/London/NY expected behavior
**Economic Events** — textarea

**AddEntryDialog** follows `AddEntryDialog.tsx` from Monthly:
- Same TipTap editor for entry comments
- Same image upload with progress
- Added: checklist section with 8 pre-defined items (checkboxes)
- Added: entry metadata (bias, tags, mood, importance, session)

- [ ] Create `WeeklyReviewForm.tsx` with all weekly-specific field sections
- [ ] Create `AddEntryDialog.tsx` with checklist support

---

### Task 10: Frontend — DailyReviewList + DailyReviewCard

**Files:**
- Create: `src/app/components/DailyMarketReview/DailyReviewList.tsx`
- Create: `src/app/components/DailyMarketReview/DailyReviewCard.tsx`

Same pattern as Weekly. Filters: date, pair, bias, search, pagination. Emerald theme.

**DailyReviewCard** shows: date, day of week, pair, bias badge, entry count, trade idea count.

- [ ] Create `DailyReviewCard.tsx` (emerald theme, date info)
- [ ] Create `DailyReviewList.tsx` (filters for date/pair/bias/search)

---

### Task 11: Frontend — DailyReviewDetail

**Files:**
- Create: `src/app/components/DailyMarketReview/DailyReviewDetail.tsx`

Follow `WeeklyReviewDetail.tsx` but with daily-specific sections:
1. **Hero** — emerald gradient (`from-emerald-600 to-emerald-800`) with date, day, pair, bias badge
2. **Stats row** — Date, Sessions, Entries, Images, Trade Ideas
3. **Daily Bias** — bias, expectedDirection, htfBias, crtDirection, premium, discount, liquidityDirection
4. **Previous Day Analysis** — PDH/PDL/PDO/Range/Close/High/Low/ADR/Expansion in a 3-column grid
5. **Current Day Plan** — narrative (HTML), liquidityTarget, expectedSweep, expectedCrt, expectedSmt, expectedSession, killZone, biasConfidence (progress bar)
6. **Session Planning** — 3 custom `SessionCard` components
7. **Entry Models** — custom `EntryModelCard` components
8. **Trade Ideas** — list of `TradeIdeaCard` components
9. **Market Screenshots** — grouped by timeframe with lightbox
10. **Timeline + Gallery** — reuse TimelineEntry and ImageGallery

**SessionCard.tsx:**
```typescript
interface SessionCardProps {
  session: string;
  expectedBehavior: string;
  expectedLiquidity: string;
  expectedEntry: string;
}
// Renders: expandable card with session name header, behavior/liquidity/entry content
```

**EntryModelCard.tsx:**
```typescript
interface EntryModelCardProps {
  name: string;
  type: string;
  status: 'Active' | 'Inactive' | 'Completed';
}
// Renders: card with status badge (green/yellow/gray), model type, name
```

**TradeIdeaCard.tsx:**
```typescript
interface TradeIdeaCardProps {
  direction: string;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  reason: string;
  screenshot?: string;
  status: string;
}
// Renders: direction badge (Long=green/Short=red), entry/SL/TP values, RR badge, reason, screenshot thumbnail
```

- [ ] Create `SessionCard.tsx` sub-component
- [ ] Create `EntryModelCard.tsx` sub-component
- [ ] Create `TradeIdeaCard.tsx` sub-component
- [ ] Create `DailyReviewDetail.tsx` with all daily-specific sections

---

### Task 12: Frontend — DailyReviewForm + AddEntryDialog

**Files:**
- Create: `src/app/components/DailyMarketReview/DailyReviewForm.tsx`
- Create: `src/app/components/DailyMarketReview/AddEntryDialog.tsx`

**DailyReviewForm** follows WeeklyReviewForm pattern with daily fields:
- Basic info: pair, date, dayOfWeek, status
- Daily Bias section (all 7 bias fields)
- Previous Day Analysis section (all 9 numerical fields)
- Current Day Plan section (narrative editor + text inputs + biasConfidence slider)
- Image upload for screenshots

**Daily AddEntryDialog** extends the weekly dialog pattern:
- Same TipTap editor + image upload
- Added: Entry Models section (add/remove models with type selector + status)
- Added: Trade Ideas section (add/remove trade idea cards with direction/entry/SL/TP/RR/reason/screenshot)
- Added: Session Plans section (3 session cards with expandable fields)
- Added: Screenshots section (image upload with timeframe selector D1/H4/H1/M15/M5/M1)
- Added: Checklist section (9 items: No News, Bias Confirmed, Liquidity Taken, SMT Confirmed, CRT Active, Session Started, Entry Found, Risk Calculated, Journal Ready)

- [ ] Create `DailyReviewForm.tsx` with all daily-specific field sections
- [ ] Create `AddEntryDialog.tsx` with trade ideas, entry models, session plans, screenshots

---

### Task 13: Build Verification

- [ ] Run `pnpm build` from project root — must succeed with zero errors
- [ ] Verify `node backend/server.js` starts without import errors

---

## Self-Review

1. **Spec coverage:** Every section from the design doc is addressed: backend models/controllers/routes for both modules, frontend components (list, detail, form, entry dialog), sub-components (session, entry model, trade idea cards), navigation wiring, apiService, theming.
2. **Placeholder scan:** No TBD/TODO. Every task has explicit file paths and code samples.
3. **Type consistency:** All method signatures match between apiService namespaces. Backend field names match frontend expectations.
4. **Scope check:** Focused on the 2 modules. Export feature explicitly deferred.
