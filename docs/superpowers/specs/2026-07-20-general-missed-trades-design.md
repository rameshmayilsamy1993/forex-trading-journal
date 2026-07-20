# General Missed Trades Feature Design

**Goal:** Add a new "Missed Trades" system alongside the existing CRT-specific one, using standard Trade Journal fields (no CRT-specific fields like turtleSoupTime, dailyQuarter, etc.).

**Architecture:** New MongoDB collection `general_missed_trades` with a schema mirroring the Trade model, plus `reason` and `status` fields. New Express route module at `/api/general-missed-trades`. Two new frontend components (journal + calendar) plus sidebar items and routes.

**Tech Stack:** Express + Mongoose (backend), React + TypeScript (frontend), shadcn/ui primitives.

---

## Backend

### Model: `backend/src/modules/generalMissedTrades/generalMissedTrade.model.js`

Mirrors `Trade` schema fields exactly, plus:
- `reason`: String (the missed reason — required, min 3 chars)
- `status`: String enum `['PLANNED', 'MISSED', 'EXECUTED_LATER']`, default `'MISSED'`

Fields from Trade model: `userId`, `accountId`, `propFirmId`, `pair`, `type`, `status` (trade status: OPEN/CLOSED), `entryPrice`, `exitPrice`, `lotSize`, `commission`, `swap`, `profit`, `realPL`, `stopLoss`, `takeProfit`, `riskRewardRatio`, `notes`, `entryDate`, `entryTime`, `exitDate`, `exitTime`, `session`, `strategy`, `keyLevel`, `highLowTime`, `ssmtType`, `smt`, `model1`, `beforeScreenshot`, `afterScreenshot`, `createdAt`.

NO CRT-specific fields: `turtleSoupTime`, `dailyQuarter`, `sixHourQuarter`, `model1Confirmation`, `ssmtConfirmation`, `emotion`.

### Controller: `backend/src/modules/generalMissedTrades/generalMissedTrade.controller.js`

Standard CRUD: `getAll`, `getPaginated`, `create`, `update`, `remove`.
- Filtering by: `pair`, `type`, `status`, `ssmtType`
- Validation: `reason` required (3-2000 chars), pair must be in allowed pairs list
- P&L: `realPL = profit - commission - swap`
- Screenshot cleanup on delete via Cloudinary

### Routes: `backend/src/modules/generalMissedTrades/generalMissedTrade.routes.js`

```
GET    /api/general-missed-trades          — getAll
GET    /api/general-missed-trades/paginated — getPaginated
POST   /api/general-missed-trades          — create
PUT    /api/general-missed-trades/:id      — update
DELETE /api/general-missed-trades/:id      — remove
```

### Server mount: `backend/server.js`

```js
app.use('/api/general-missed-trades', isAuthenticated, generalMissedTradeRoutes);
```

---

## Frontend

### New Types: `src/app/types/trading.ts`

```typescript
export type GeneralMissedTradeStatus = 'PLANNED' | 'MISSED' | 'EXECUTED_LATER';

export interface GeneralMissedTrade {
  id: string;
  accountId: string;
  propFirmId: string;
  pair: string;
  type: TradeType;
  status: 'OPEN' | 'CLOSED';
  entryPrice: number;
  exitPrice?: number;
  lotSize: number;
  commission?: number;
  swap?: number;
  profit?: number;
  realPL?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  notes?: string;
  entryDate: string;
  entryTime?: string;
  exitDate?: string;
  exitTime?: string;
  session?: string;
  strategy?: string;
  keyLevel?: string;
  highLowTime?: string;
  ssmtType?: SSMTType;
  smt?: SMTType;
  model1?: Model1Type;
  beforeScreenshot?: string;
  afterScreenshot?: string;
  reason: string;
  missedStatus: GeneralMissedTradeStatus;
  createdAt: string;
}
```

### API Service: `src/app/services/apiService.ts`

Add methods:
- `getGeneralMissedTrades(filters?)`
- `createGeneralMissedTrade(data)`
- `updateGeneralMissedTrade(id, data)`
- `deleteGeneralMissedTrade(id)`

### New Component: `src/app/components/GeneralMissedTradeJournal.tsx`

Based on the pattern in `MissedTradeJournal.tsx` but:
- Uses the Trade Journal form fields directly (reuses `TradeForm` or a close variant)
- No CRT-specific fields (no turtleSoupTime, dailyQuarter, sixHourQuarter, model1Confirmation, ssmtConfirmation)
- `reason` field replaces CRT-specific `missedReason`
- `missedStatus` replaces CRT `status`: `'PLANNED' | 'MISSED' | 'EXECUTED_LATER'`
- Table/card view similar to existing missed trade journal but with standard trade columns
- View modal showing all trade fields + reason

### New Component: `src/app/components/GeneralMissedTradesCalendar.tsx`

Mirrors `MissedTradesCalendar.tsx` but:
- No CRT-specific badges (QuarterBadge, Model1Badge, SsmtBadge)
- Day detail modal shows standard trade fields + reason
- Month stats: count, P&L summary
- Filters: pair, status

### Sidebar: `src/app/components/Sidebar.tsx`

Add to `Tab` type:
```typescript
'missed-log' | 'missed-log-calendar'
```

Add to Analysis section:
```typescript
{ id: 'missed-log', label: 'Missed Trades', icon: EyeOff },
{ id: 'missed-log-calendar', label: 'Missed Trade Calendar', icon: Calendar },
```

### App Routing: `src/app/App.tsx`

Add lazy imports for both new components, add route cases for `'missed-log'` and `'missed-log-calendar'`, and include the new tab IDs in the localStorage validation list.

---

## Data Flow

1. User fills form → `GeneralMissedTradeJournal` calls `apiService.createGeneralMissedTrade()`
2. Backend validates, saves to `general_missed_trades` collection → returns saved doc
3. Frontend updates local state
4. Calendar reads from the same collection via `apiService.getGeneralMissedTrades()`
5. On reload, tab state is persisted via `localStorage` (already implemented)

---

## What NOT to Build (YAGNI)

- No export functionality initially
- No bulk operations (delete, link checklist)
- No loss analysis integration
- No paginated calendar (simple list fetch is sufficient)
