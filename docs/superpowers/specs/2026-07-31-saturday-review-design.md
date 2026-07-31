# Saturday Review Module — Design Document

## Overview

Add a **Saturday Review** module to the FX Journal. Every Saturday the user reviews the completed trading week and documents how the market behaved using ICT/SMC concepts (weekly high/low, candle structure, origins, OTE, weekly story, lessons, rating). This is a **weekly market analysis journal** — not a trade journal — structured so it can be referenced months later and so a future Python pipeline can auto-populate the structured fields.

One review = **one pair** + **one trading week** (e.g. `GBPUSD` / `27 Jul 2026 - 31 Jul 2026`). Duplicates for the same pair + week are rejected (409).

## Confirmed Decisions

1. **Pair storage**: plain string (`'GBPUSD'`), matching every existing module. Pairs dropdown comes from `apiService.settings.getPairs()`.
2. **Week selection**: **week-start date picker**. Picking a date snaps to that week's Monday; the form auto-computes and displays the Mon–Fri range (`weekEnd = weekStart + 4 days`). Week End is display-only (auto-derived), not manually edited.
3. **Completion criteria** ("all structured answers"): header + S1 Weekly High/Low + S2 Candle + S3 Origins + S4 OTE + **non-empty Weekly Story**. S6 Lessons and S7 Rating are **optional**. Full list in [Completion Criteria](#completion-criteria).
4. **Duplicate action**: opens a **blank form** pre-filled only with the source review's header metadata (pair, overall bias). Week is left empty (new week to be chosen). No server-side copy endpoint.
5. **Weekly Story editor**: tiptap rich-text editor with **full inline image upload** (Cloudinary, progress, replace, delete).
6. **Image uploads**: compressed client-side before upload (`utils/imageCompression.ts`), lazy-loaded and served via Cloudinary responsive URLs.

## Architecture

Follows the existing Express module pattern and the React component-folder pattern of the market-review modules (`weeklyReviews/` is the closest analog).

### Backend — `backend/src/modules/saturdayReviews/`

```
saturdayReview.model.js
saturdayReviewEvent.model.js
saturdayReviewImage.model.js
saturdayReview.controller.js
saturdayReviewEvent.controller.js
saturdayReview.routes.js
```

Mounted at `/api/saturday-reviews` with `isAuthenticated`. Conventions inherited from existing modules:

- Every query filtered by `req.session.userId`
- `mongoose.Types.ObjectId.isValid()` checked on all ID params
- `schemaOptions` applied for toJSON transform (`_id` → `id`)
- Cloudinary images cleaned up on delete (`deleteImage` from `../../config/cloudinary`)
- Async handlers wrapped in try/catch → `next(error)`
- Duplicate handling: explicit pre-check returns 409; Mongo `11000` mapped to 409 in `update`

### Frontend — `src/app/components/SaturdayReview/`

```
SaturdayReviewList.tsx      — table list with filters/search/sort/actions
SaturdayReviewForm.tsx      — create/edit with 7 collapsible sections + auto-save
SaturdayReviewDetail.tsx    — read-only view page
saturdayReviewConstants.ts  — all dropdown option arrays + lesson checklist + completion config
saturdayReviewUtils.ts      — completion % + validation helpers shared by form/list/detail
```

Reusable sub-components in the same folder:

```
SectionCard.tsx          — collapsible premium card w/ completion check + image-count badge
ImageUploader.tsx        — multi-image: compress → upload w/ progress, caption, delete, reorder
                           (drag + arrows), preview, fullscreen, lazy loading
RichTextEditor.tsx       — tiptap wrapper (StarterKit + Underline + TextAlign + inline Image)
BiasPicker.tsx           — Bullish / Bearish / Neutral segmented control
StarRating.tsx           — 1–5 star market quality picker
DifficultyPicker.tsx     — Easy / Medium / Hard segmented control
ConfidenceSlider.tsx     — 1–10 confidence slider
LessonChecklist.tsx      — lessons checklist + free notes
```

### Utilities

- `src/app/utils/imageCompression.ts` — client-side compression (resize ≤1600px, re-encode to WEBP/JPEG q≈0.8) before Cloudinary upload.
- `src/app/utils/cloudinary.ts` — existing `getThumbnail` / `getResponsiveUrl` reused for galleries.

### Navigation

- 3 new tabs in the `Tab` type: `saturday-review`, `saturday-review-detail`, `saturday-review-form`
- Sidebar: add **Saturday Review** to the existing **Analysis** group (icon `CalendarCheck`)
- `App.tsx`: lazy imports, `TabContent` switch cases, and active-tab localStorage validation list

## Data Model

### `saturday_reviews` (`SaturdayReview`)

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId ref User | required |
| `pair` | String | required |
| `weekStart` | String (ISO date) | required, Monday |
| `weekEnd` | String (ISO date) | required, auto = weekStart + 4 days |
| `reviewDate` | String (ISO date) | defaults to today |
| `overallBias` | String enum | `Bullish` / `Bearish` / `Neutral` |
| `candleType` | String enum | `Bull Full Body`, `Bear Full Body`, `Bull Pin Bar`, `Bear Pin Bar`, `Doji`, `Inside Bar`, `Outside Bar`, `Indecision`, `Custom` |
| `highOrLowFirst` | String enum | `Weekly High First` / `Weekly Low First` / `Both same session` |
| `expansionDirection` | String enum | `Expanded Up` / `Expanded Down` / `Range` / `Balanced` |
| `oteTouched` | String enum | `Yes` / `No` |
| `oteDirection` | String enum | `Bullish` / `Bearish` |
| `oteReaction` | String enum | `Yes` / `No` / `Partial` |
| `marketQuality` | Number 1–5 | star rating |
| `difficulty` | String enum | `Easy` / `Medium` / `Hard` |
| `confidence` | Number 1–10 | |
| `weeklyStory` | String (HTML) | rich text editor output; embedded images are Cloudinary URLs inside the HTML |
| `lessons` | Array `{ label, checked }` | lessons checklist items |
| `lessonsNotes` | String | free notes |
| `status` | String enum | `Draft` / `Completed` |
| `lastAiUpdateAt` | Date | future-AI traceability; nullable |

**Unique index**: `{ userId: 1, pair: 1, weekStart: 1 }` → duplicate create/update returns 409.
Secondary index: `{ userId: 1, weekStart: -1 }`.

### `saturday_review_events` (`SaturdayReviewEvent`)

Each review has exactly **6 fixed event slots** — one row per `eventType` (`weekly_high`, `weekly_low`, `candle`, `weekly_high_origin`, `weekly_low_origin`, `ote`), enforced by a unique index. The `candle` slot (added to hold S2's notes + screenshots) reuses the same fields: `notes` for the S2 notes and `SaturdayReviewImage` rows for its screenshots.

| Field | Type | Notes |
|---|---|---|
| `reviewId` | ObjectId ref SaturdayReview | required |
| `userId` | ObjectId ref User | required |
| `eventType` | String enum | `weekly_high`, `weekly_low`, `candle`, `weekly_high_origin`, `weekly_low_origin`, `ote` |
| `day` | String | Mon–Fri (weekly high/low/ote) |
| `date` | String (ISO date) | |
| `time` | String | e.g. `09:30` |
| `category` | String enum | `Weekly` / `Daily` (origins) |
| `keyLevel` | String | origin key level (see dropdown) |
| `answer` | String | generic answer slot (unused today; reserved for AI pipeline) |
| `notes` | String | large multiline text |

**Unique index**: `{ reviewId: 1, eventType: 1 }`.

### `saturday_review_images` (`SaturdayReviewImage`)

| Field | Type | Notes |
|---|---|---|
| `reviewId` | ObjectId ref SaturdayReview | required |
| `eventId` | ObjectId ref SaturdayReviewEvent | required (story images are embedded in `weeklyStory` HTML, not stored here) |
| `image` | String | Cloudinary URL |
| `publicId` | String | for deletion |
| `caption` | String | |
| `sortOrder` | Number | ordering within the event |

## API Endpoints

```
GET    /api/saturday-reviews                            list + filters + search + sort + pagination
POST   /api/saturday-reviews                            create Draft (409 on pair+week dup)
GET    /api/saturday-reviews/:id                        review + events + images populated
PUT    /api/saturday-reviews/:id                        update
DELETE /api/saturday-reviews/:id                        cascade delete events+images (+ Cloudinary)
PUT    /api/saturday-reviews/:id/events/:eventType      upsert event incl. images array; deletes removed Cloudinary images
DELETE /api/saturday-reviews/:id/events/:eventType      delete event + its images
```

**List query params**: `pair`, `month`, `year` (derived from `weekStart`), `bias`, `candleType`, `status`, `search` (matches pair, event notes, weeklyStory), `sort` (`weekStart:desc` default, `weekStart:asc`, `createdAt:desc`), `page`, `limit`.

Each list row is augmented with `imageCount` (total images across events) and `completionPercent`. `GET /:id` returns the same `completionPercent` on the review payload. Completion is computed server-side by a shared helper (`computeCompletion`).

**Event upsert payload** (`PUT .../events/:eventType`):
```json
{
  "day": "Monday", "date": "2026-07-27", "time": "09:30",
  "category": "Weekly", "keyLevel": "FVG", "answer": "Yes",
  "notes": "...",
  "images": [{ "url": "https://res.cloudinary.com/...", "publicId": "abc", "caption": "H4 chart" }]
}
```
The server replaces the event's images with the supplied array. New `{url, publicId}` records are created; images removed from the previous array have their Cloudinary `publicId` deleted. Frontend already uploaded new images to Cloudinary before calling this endpoint.

**Image upload**: images upload to Cloudinary immediately on selection via the existing `apiService.upload.single` / `uploadService.uploadImage` (progress callback), after client-side compression. The 30s auto-save only persists the resulting references. If a user discards an image before saving, the frontend calls `apiService.upload.delete(publicId)` to clean up.

**Duplicate flow (frontend-only)**: the list "Duplicate" action sets `window.__saturdayReviewDuplicate = { pair, overallBias }` and navigates to the form. The form detects the flag, pre-fills pair + overall bias, and opens with an empty week. No server endpoint needed.

## Frontend Specification

### Saturday Review List

- **Columns**: Pair, Week (start–end), Bias, Candle Type, OTE, Status, Rating (market quality stars), Created Date
- **Actions**: View, Edit, Duplicate, Delete (confirm dialog)
- **Filters**: Pair, Month, Year, Bias, Candle Type, Status
- **Search**: matches Pair, Notes (event notes), Weekly Story
- **Sorting**: Week Descending by default
- Pagination with page size ~12
- "New Review" button → form

### Review Form (Create/Edit)

- **Header fields**: Pair (dropdown from settings), Week Start (date picker → snaps to Monday; Week End auto-derived, shown as "27 Jul 2026 - 31 Jul 2026"), Review Date (defaults today), Overall Bias (BiasPicker), Status (Draft/Completed toggle; Completed blocked until mandatory fields valid).
- **7 collapsible section cards** (`SectionCard`). Each card shows: section title, completed check, image-count badge.
  - **S1 Weekly High & Low**: two sub-blocks (High / Low), each with Day dropdown (Mon–Fri), Date, Time (time input), Notes (multiline), unlimited screenshots via ImageUploader.
  - **S2 Weekly Candle Structure**: Candle Type dropdown (9 options incl. Custom), "Which formed first?" (3 options), "Weekly Expansion Direction" (4 options), Notes, screenshots.
  - **S3 Origin of Weekly High & Origin of Weekly Low**: two sub-blocks, each with Category (Weekly/Daily), Key Level dropdown (12 options), Notes, screenshots.
  - **S4 OTE Analysis**: "Did price touch OTE?" (Yes/No). If Yes → reveal Direction (Bullish/Bearish), Day, Time, "Did market react correctly?" (Yes/No/Partial), Notes, screenshots.
  - **S5 Weekly Story**: RichTextEditor with the spec placeholder (Liquidity, SMT, Displacement, Manipulation, Expansion, Distribution, OTE, CRT, Bias, Entry Models, observations, lessons). Images embeddable inside the editor.
  - **S6 Lessons Learned**: LessonChecklist (Wait for OTE, Respect HTF Bias, Don't trade News, Wait for SMT, Need patience, Avoid revenge trades, Follow CRT, Other) + free notes.
  - **S7 Weekly Rating**: Market Quality (StarRating 1–5), Difficulty (DifficultyPicker), Confidence (ConfidenceSlider 1–10).
- **Auto-save draft every 30 seconds**: the review record is lazily created (Draft) the first time pair + weekStart are valid, then auto-saved on a 30s interval + on blur/unmount (best effort). Debounced edits reset the timer. Only structured fields + changed events are PUT. Never auto-sets `Completed`. Shows a "Saving…" indicator.
- **Completion percentage** bar at top (filled mandatory fields ÷ total mandatory fields), with a "Completed" badge at 100%.
- **Validation on submit**: required header fields (pair, weekStart) always; `Completed` additionally requires all mandatory fields (client + server both enforce).
- **Edit mode**: loads review + events + images into the form. Unchanged images keep their Cloudinary refs (no re-upload).

### View Page (Read-Only)

Premium read-only page, sections rendered as cards:

- Header hero: Pair, week range, review date, status badge, overall bias.
- S1: Weekly High card (Day / Date / Time / Notes / Charts), Weekly Low card (same).
- S2: Weekly Candle card (candle type, high-or-low-first, expansion, charts).
- S3: High Origin + Low Origin cards (category, key level, charts).
- S4: OTE card (touched, direction, reaction, charts).
- S5: Weekly Story — rendered rich HTML (`dangerouslySetInnerHTML`, prose styling).
- S6: Lessons — checklist chips + notes.
- S7: Weekly Rating — stars, difficulty, confidence.
- **Images**: responsive gallery grid per section; clicking opens the shared `ImageViewer` lightbox (zoom, pan, rotate, keyboard nav, thumbnail strip) with images served at 1920px via `getResponsiveUrl`.
- Sidebar: quick stats (completion %, sections complete, total images).
- Actions: Edit, Duplicate, Delete.

### Dropdown option lists

**Key Level (S3)**: `Previous High`, `Previous Low`, `FVG`, `IFVG`, `Order Block`, `Breaker`, `Mitigation Block`, `Balanced Price Range`, `EQH`, `EQL`, `Liquidity Pool`, `Custom`.

**Candle Type (S2)**: `Bull Full Body`, `Bear Full Body`, `Bull Pin Bar`, `Bear Pin Bar`, `Doji`, `Inside Bar`, `Outside Bar`, `Indecision`, `Custom`.

## Completion Criteria

Mandatory fields (status can only become `Completed` when all are filled):

| Section | Required fields |
|---|---|
| Header | pair, weekStart, overallBias, reviewDate |
| S1 Weekly High | event day, date, time |
| S1 Weekly Low | event day, date, time |
| S2 Candle Structure | candleType, highOrLowFirst, expansionDirection |
| S3 High Origin | event category, keyLevel |
| S3 Low Origin | event category, keyLevel |
| S4 OTE | oteTouched; if `Yes` → oteDirection, oteReaction, OTE event day, time |
| S5 Weekly Story | weeklyStory non-empty |

Optional: S6 Lessons, S7 Rating.

**Completion %** = filled mandatory fields ÷ total mandatory fields (denominator is 19 base + 4 conditional when `oteTouched === 'Yes'`). Shared `computeCompletion(review, events)` helper: TS implementation on the frontend, mirrored in the backend controller for the `Completed` gate and list/getById responses.

## Auto-Save

- Timer saves as `Draft` every 30s while the form is open and dirty.
- Review record lazily created once pair + weekStart are valid; no blank rows for untouched forms.
- Also saves on unmount (best effort).
- Never auto-sets to `Completed`; status only changes via explicit user action.
- Network/validation failures are non-fatal (keeps draft state; shows a toast/error).

## Future AI Compatibility

- All structured answers live in normalized columns (`day`, `time`, `category`, `keyLevel`, `candleType`, `highOrLowFirst`, `expansionDirection`, `ote_*`, etc.) — directly queryable/writable by a Python pipeline.
- The Python pipeline populates fields by calling the same `PUT` endpoints (`/api/saturday-reviews/:id` and `/events/:eventType`), setting `lastAiUpdateAt`.
- The manual form always remains editable; AI-populated values are ordinary field values the user can overwrite.
- No AI-specific flags needed beyond `lastAiUpdateAt` — normalized fields + stable API is sufficient.

## Dark / Light Mode

- Use shadcn CSS variables (`bg-card`, `text-foreground`, `border`, `text-muted-foreground`, etc.) as the default.
- Where hard-coded hex colors are required for premium gradients, add `dark:` variants following the `ForexLotCalculator.tsx` pattern.
- `@custom-variant dark (&:is(.dark *))` already exists in `theme.css`; no config changes needed.

## Responsive

- Desktop: multi-column form (2-col field grids), sidebar quick stats.
- Tablet/mobile: single column, full-width sections; horizontally scrollable table on the list page.

## Code Quality Requirements

- Follow existing FX Journal architecture and conventions (AGENTS.md).
- Reuse existing UI primitives from `src/app/components/ui/` (Button, Select, Badge, Card, Input, Label, Dialog, Skeleton, Table, PageLayout, etc.).
- Validate required fields before marking `Completed` (client + server).
- Lazy-load images with Cloudinary responsive URLs (`getResponsiveUrl`, `getThumbnail`) and `loading="lazy"`.
- Client-side image compression before upload; 10MB per-file limit; PNG/JPEG/WEBP only (mirrors `AddEntryDialog`).
- Modular components; clean separation of UI / business logic (`saturdayReviewConstants.ts` / `saturdayReviewUtils.ts`) / persistence (`apiService`).
- No unnecessary comments; small focused functions.
- New types added to `src/app/types/trading.ts` (`SaturdayReview`, `SaturdayReviewEvent`, `SaturdayReviewImage`).
- New `apiService.saturdayReviews` namespace in `src/app/services/apiService.ts` (getAll, getById, create, update, delete, upsertEvent, deleteEvent).
