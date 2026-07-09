# Weekly & Daily Market Review Modules — Design Document

## Overview

Add two new modules to the existing review system: **Weekly Market Review** and **Daily Market Review**. These form a hierarchical Top-Down Analysis system with the existing Monthly Market Review (Monthly → Weekly → Daily). Each module is a separate set of backend models/controllers/routes and frontend components, sharing UI patterns but customized for its timeframe.

## Architecture

### Hierarchy
- `MonthlyReview` (existing) → optional parent ref added for Weekly
- `WeeklyReview` has `monthlyReviewId` (optional ref)
- `DailyReview` has `weeklyReviewId` (optional ref)

Links are optional — a Weekly can exist without a parent Monthly, and a Daily without a parent Weekly.

### Backend

Each module follows the exact pattern of `monthlyReviews/`:

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

**Common conventions** (inherited from existing modules):
- All routes mounted at `/api/weekly-reviews` and `/api/daily-reviews` with `isAuthenticated` middleware
- Every query filtered by `req.session.userId`
- `mongoose.Types.ObjectId.isValid()` checked on all ID params
- `schemaOptions` applied for toJSON transform (`_id` → `id`)
- Cloudinary images cleaned up on delete

### Frontend

Each module gets its own component folder:

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

Shared components reused across all three modules:
- `ImageGallery.tsx` (from MonthlyMarketReview — already generic)
- `TimelineEntry.tsx` (from MonthlyMarketReview — already generic)

### Navigation

Three sidebar tabs under "Analysis":
```
📊 Monthly Market Review  → monthly-review (existing)
📅 Weekly Market Review   → weekly-review (new)
📈 Daily Market Review    → daily-review (new)
```

6 new tabs added to the `Tab` type and `App.tsx` lazy mappings:
- `weekly-review`, `weekly-review-detail`, `weekly-review-form`
- `daily-review`, `daily-review-detail`, `daily-review-form`

Navigation follows the existing custom event pattern:
```typescript
window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'weekly-review' }));
window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'weekly-review-detail' }));
```

Parent references passed via `window` globals:
- `window.__weeklyReviewParentId` — set before creating a Weekly from a Monthly detail
- `window.__dailyReviewParentId` — set before creating a Daily from a Weekly detail

### API Service

New namespaces added to `apiService.ts`:

```typescript
apiService.weeklyReviews = {
  getAll(filters), getById(id), create(data), update(id, data), delete(id),
  getEntries(reviewId), createEntry(reviewId, data), updateEntry(reviewId, entryId, data), deleteEntry(reviewId, entryId)
}

apiService.dailyReviews = {
  getAll(filters), getById(id), create(data), update(id, data), delete(id),
  getEntries(reviewId), createEntry(reviewId, data), updateEntry(reviewId, entryId, data), deleteEntry(reviewId, entryId)
}
```

Same method signatures as `apiService.monthlyReviews`.

## Data Models

### WeeklyReview

```
userId:           ObjectId (ref: User), required
monthlyReviewId:  ObjectId (ref: MonthlyReview)  [optional, for linking]
pair:             String, required
weekNumber:       Number, required (1-53)
year:             Number, required
weekStart:        String (ISO date)
weekEnd:          String (ISO date)

# Weekly Summary
bias:             String (Bullish | Bearish | Neutral)
theme:            String
expectedDirection: String
weeklyStory:      String
institutionalNarrative: String
marketStructure:  String

# Key Levels
pwh:              Number
pwl:              Number
weeklyOpen:       Number
weeklyFvg:        String
weeklyIfvg:       String
weeklyOb:         String
weeklyBreaker:    String
eqh:              Number
eql:              Number
liquidity:        String
premium:          String
discount:         String

# Objectives
mainTarget:       Number
mainLiquidity:    String
weeklyCrt:        String
weeklySmt:        String
weeklyCisd:       String
expectedManipulation: String
expansionDirection:   String

# Trading Sessions
asianSession:     String
londonSession:    String
newYorkSession:   String

# Economic Events
economicEvents:   String (free text for high-impact events)

# Metadata
status:           String (Draft | Published), default: Draft
```

Unique index: `{ userId, pair, weekNumber, year }`

### WeeklyReviewEntry

Same schema as `MonthlyReviewEntry`:
```
monthlyReviewId → weeklyReviewId
entryTitle, comment, images[], entryTime, bias, tags[], mood, importance, session, displayOrder
```

Plus:
```
checklistItems: [{ label: String, checked: Boolean }]
```

Default 8 checklist items:
- Bias Defined
- Liquidity Marked
- HTF Levels Marked
- CRT Found
- SMT Confirmed
- News Checked
- Entry Models Ready
- Risk Plan Ready

### DailyReview

```
userId:           ObjectId (ref: User), required
weeklyReviewId:   ObjectId (ref: WeeklyReview)  [optional]
pair:             String, required
date:             String (ISO date), required
dayOfWeek:        String

# Daily Bias
bias:             String (Bullish | Bearish | Neutral)
expectedDirection: String
htfBias:          String
crtDirection:     String
premium:          String
discount:         String
liquidityDirection: String

# Previous Day Analysis
pdh:              Number
pdl:              Number
pdo:              Number
previousRange:    Number
previousClose:    Number
previousHigh:     Number
previousLow:      Number
adr:              Number
expansion:        String

# Current Day Plan
narrative:        String
liquidityTarget:  String
expectedSweep:    String
expectedCrt:      String
expectedSmt:      String
expectedSession:  String
killZone:         String
biasConfidence:   Number (0-100)

# Status
status:           String (Draft | Published), default: Draft
```

Unique index: `{ userId, pair, date }`

### DailyReviewEntry

Same base as MonthlyReviewEntry:
```
dailyReviewId, entryTitle, comment, images[], entryTime, bias, tags[], mood, importance, session, displayOrder
```

Plus:
```
checklistItems: [{ label: String, checked: Boolean }]
tradeIdeas: [{
  direction: String,
  entry: Number,
  sl: Number,
  tp: Number,
  rr: Number,
  reason: String,
  screenshot: String,
  status: String (Active | Inactive | Completed)
}]
entryModels: [{
  name: String,
  type: String (CRT | SMT | OTE | Breaker | FVG | IFVG | OrderBlock),
  status: String (Active | Inactive | Completed)
}]
sessionPlans: [{
  session: String (Asian | London | New York),
  expectedBehavior: String,
  expectedLiquidity: String,
  expectedEntry: String
}]
screenshots: [{
  url: String,
  publicId: String,
  timeframe: String (D1 | H4 | H1 | M15 | M5 | M1),
  caption: String
}]
```

## Unique Features Per Module

### Weekly-Specific

1. **Key Levels Table** — rendered in WeeklyDetail as a visual grid showing PWH, PWL, Weekly Open, FVG, IFVG, Order Block, Breaker, EQH, EQL, Liquidity, Premium, Discount
2. **Objectives Cards** — Main Target, Main Liquidity, CRT, SMT, CISD as individual stat cards with visual indicators
3. **Session Cards** — Asian/London/NY with expected behavior, liquidity target, entry model
4. **Economic Events Section** — list of high-impact events (news, rates, CPI, NFP, FOMC)
5. **Weekly Checklist** — 8 items in the entry dialog

### Daily-Specific

1. **Previous Day Analysis** — PDH/PDL/PDO/range with visual comparison cards
2. **Current Day Plan** — narrative, liquidity target, expected sweep/CRT/SMT, kill zone, bias confidence slider
3. **Session Planning Cards** — Asian/London/NY with expandable behavior descriptions (custom `SessionCard.tsx`)
4. **Entry Models** — per-entry model cards with Active/Inactive/Completed states (custom `EntryModelCard.tsx`)
5. **Trade Ideas** — unlimited cards per entry with direction, entry, SL, TP, RR, screenshot (custom `TradeIdeaCard.tsx`)
6. **Market Screenshots** — organized by timeframe (Daily, 4H, 1H, 15M, 5M, 1M)

## Theming

| Module   | Theme   | Gradient Hero          |
|----------|---------|------------------------|
| Monthly  | Purple  | `from-purple-600 to-purple-800` |
| Weekly   | Blue    | `from-blue-600 to-blue-800`     |
| Daily    | Emerald | `from-emerald-600 to-emerald-800` |

Each detail page uses its theme color for:
- Hero banner gradient
- Stats card accent borders
- Bias badge colors
- FAB button color
- Timeline accent dots
- Active tab indicator

## Implementation Order

1. Backend: WeeklyReview model + controller + routes
2. Backend: WeeklyReviewEntry model + controller + routes
3. Frontend: WeeklyReviewList + WeeklyReviewCard
4. Frontend: WeeklyReviewDetail + TimelineEntry/ImageGallery reuse
5. Frontend: WeeklyReviewForm + AddEntryDialog
6. Backend: DailyReview model + controller + routes
7. Backend: DailyReviewEntry model + controller + routes
8. Frontend: DailyReviewList + DailyReviewCard
9. Frontend: DailyReviewDetail (with session cards, entry models, trade ideas)
10. Frontend: DailyReviewForm + AddEntryDialog
11. Sidebar + App.tsx tab registrations
12. apiService updates for both modules
13. Navigation wiring (parent ref passing)
14. Build verification

## Exports (Future Enhancement)

Export to PDF, DOCX, JSON, Markdown, and Image Archive is a desired feature for all review modules. Implementation depends on a new backend export service (puppeteer/pdfkit) and is deferred to a follow-up. The initial implementation focuses on core CRUD, UI, and navigation.
