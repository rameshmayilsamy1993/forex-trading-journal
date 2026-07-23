# Simplified Daily Market Review

## Overview

Simplify the Daily Market Review feature to match a natural morning-to-evening trading workflow. The current implementation is over-engineered with ~25 fields and a rich text editor. The replacement focuses on what the user actually does each day.

## Design

### User Workflow

**Morning** (once per day per pair):
1. Select pair and date
2. Set Daily Bias (Bullish/Bearish/Neutral)
3. Enter CRT direction
4. Upload news screenshot (single)
5. Upload chart screenshots (multiple)
6. Write plain-text notes
7. Save → navigates to detail page

**Throughout the day** (any number of updates):
1. Open "Add Update" dialog from detail page
2. Set current bias (still Bullish/Bearish/Neutral?)
3. Upload chart screenshots
4. Write notes
5. Save → update appears in timeline

**Detail page** — single view showing:
- Morning setup (pair, date, bias, CRT, narrative)
- Chart images gallery
- Timeline of all updates (reverse chronological)
- FAB button to add new updates

## Backend Changes

### DailyReview Model

Keep only:
- `userId` (ObjectId, ref: User, required)
- `weeklyReviewId` (ObjectId, ref: WeeklyReview, optional)
- `pair` (String, required)
- `date` (String, required)
- `dayOfWeek` (String)
- `bias` (String, enum: Bullish/Bearish/Neutral)
- `crtDirection` (String)
- `narrative` (String — plain text notes)

Remove: expectedDirection, htfBias, premium, discount, liquidityDirection, pdh, pdl, pdo, previousRange, previousClose, previousHigh, previousLow, adr, expansion, narrative (move to plain), liquidityTarget, expectedSweep, expectedCrt, expectedSmt, expectedSession, killZone, biasConfidence, status

### DailyReviewEntry Model

Keep only:
- `dailyReviewId` (ObjectId, ref: DailyReview, required)
- `userId` (ObjectId, ref: User, required)
- `entryTitle` (String — auto-generated "Update 1", "Update 2", etc.)
- `comment` (String — plain text notes)
- `images[]` ({ url, publicId, caption })
- `bias` (String: Bullish/Bearish/Neutral)

Remove: entryTime, tags, mood, importance, session, displayOrder, checklistItems, tradeIdeas, entryModels, sessionPlans, screenshots

## Frontend Changes

### DailyReviewForm (rewrite ~200 lines)

Simple morning form:
- Pair selector (dropdown from settings)
- Date input (default today)
- Day of week (auto-calculated)
- Bias toggle (three buttons: Bullish/Bearish/Neutral)
- CRT direction (text input)
- News screenshot upload (single image, labeled)
- Chart images upload (multiple, with captions)
- Notes (plain textarea, no TipTap)
- Save button (creates review + navigates to detail)

### AddUpdateDialog (new ~200 lines)

Simple dialog for throughout-day updates:
- Bias toggle (Bullish/Bearish/Neutral)
- Chart images upload (multiple, with captions)
- Notes (textarea)
- Save button

### DailyReviewDetail (rewrite ~400 lines)

Simplified detail page:
- Hero header: pair + date + dayOfWeek
- Morning section: bias badge, CRT direction, notes text
- Chart images gallery (from morning + all updates)
- Timeline of updates (reverse chronological)
- Each update: bias badge, images, notes
- FAB "+" button in bottom-right → opens AddUpdateDialog

### DailyReviewList (minor changes)

- Keep existing paginated list with filters
- Update card to show simpler fields
- Card shows: pair, bias badge, date, entry count

## Visual Design

- Maintain existing design system (card-based, rounded corners, same color scheme)
- Bias: green for Bullish, red for Bearish, gray for Neutral
- Images: responsive grid, click to enlarge
- Timeline: vertical list with subtle left border accent
- FAB: floating action button, green gradient, matches existing pattern

## No Data Migration Needed

Old fields in MongoDB will be silently ignored by Mongoose. No migration script required. Existing documents are backward-compatible.

## Files to Modify/Create

### Backend
- `backend/src/modules/dailyReviews/dailyReview.model.js` — remove fields
- `backend/src/modules/dailyReviews/dailyReviewEntry.model.js` — remove fields

### Frontend
- `src/app/components/DailyMarketReview/DailyReviewForm.tsx` — rewrite
- `src/app/components/DailyMarketReview/DailyReviewDetail.tsx` — rewrite
- `src/app/components/DailyMarketReview/DailyReviewCard.tsx` — minor update
- `src/app/services/apiService.ts` — minor update if needed

### New
- `src/app/components/DailyMarketReview/AddUpdateDialog.tsx` — create
