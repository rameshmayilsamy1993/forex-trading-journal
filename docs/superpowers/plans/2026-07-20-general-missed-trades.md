# General Missed Trades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "General Missed Trades" system alongside the existing CRT-specific one, with standard Trade Journal fields.

**Architecture:** New `general_missed_trades` MongoDB collection. Express route module at `/api/general-missed-trades`. Two new React components (journal + calendar). New sidebar items with tab persistence.

**Tech Stack:** Express + Mongoose, React + TypeScript, shadcn/ui

## Global Constraints

- All backend code in `backend/src/modules/generalMissedTrades/`
- No CRT-specific fields (turtleSoupTime, dailyQuarter, sixHourQuarter, model1Confirmation, ssmtConfirmation, emotion)
- Follow existing patterns from `missedTrades/` module exactly
- Follow existing patterns from `MissedTradeJournal.tsx` and `MissedTradesCalendar.tsx` exactly
- Tab IDs: `missed-log` (journal), `missed-log-calendar` (calendar)
- Sidebar labels: "Missed Trades", "Missed Trade Calendar"

---

### Task 1: Backend — GeneralMissedTrade model

**Files:**
- Create: `backend/src/modules/generalMissedTrades/generalMissedTrade.model.js`

**Interfaces:**
- Produces: Mongoose model `GeneralMissedTrade` exported as default

- [ ] **Step 1: Create the model file**

```javascript
const mongoose = require('mongoose');
const { schemaOptions } = require('../../config/schemaOptions');
const { SSMT_TYPES } = require('../trades/trade.model');

const generalMissedTradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  propFirmId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropFirm' },
  pair: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  status: { type: String, enum: ['OPEN', 'CLOSED'] },
  entryPrice: Number,
  exitPrice: Number,
  lotSize: Number,
  commission: { type: Number, default: 0 },
  swap: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  realPL: { type: Number, default: 0 },
  stopLoss: Number,
  takeProfit: Number,
  riskRewardRatio: Number,
  notes: String,
  entryDate: Date,
  entryTime: String,
  exitDate: Date,
  exitTime: String,
  session: String,
  strategy: String,
  keyLevel: String,
  highLowTime: String,
  ssmtType: { type: String, enum: SSMT_TYPES, default: 'NO' },
  smt: { type: String, enum: ['No', 'Yes with GBPUSD', 'Yes with EURUSD', 'Yes with DXY'], default: 'No' },
  model1: { type: String, enum: ['Yes (Both EUR and GBP)', 'Yes (EUR)', 'Yes (GBP)', 'No'], default: 'Yes (EUR)' },
  beforeScreenshot: String,
  afterScreenshot: String,
  reason: { type: String, required: true },
  missedStatus: { type: String, enum: ['PLANNED', 'MISSED', 'EXECUTED_LATER'], default: 'MISSED' },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

generalMissedTradeSchema.index({ userId: 1, entryDate: -1 });

module.exports = mongoose.model('GeneralMissedTrade', generalMissedTradeSchema);
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/generalMissedTrades/generalMissedTrade.model.js
git commit -m "feat(backend): add GeneralMissedTrade model"
```

---

### Task 2: Backend — GeneralMissedTrade controller

**Files:**
- Create: `backend/src/modules/generalMissedTrades/generalMissedTrade.controller.js`

**Interfaces:**
- Consumes: `GeneralMissedTrade` model, `getCachedPairs` from `tradeService`, `sanitizeMissedReason` from `sanitizeService`, `deleteImage` from `cloudinary`, `paginate` from `pagination`
- Produces: `{ getAll, getPaginated, create, update, remove }`

- [ ] **Step 1: Create the controller file**

```javascript
const GeneralMissedTrade = require('./generalMissedTrade.model');
const { SSMT_TYPES } = require('../trades/trade.model');
const { getCachedPairs } = require('../../services/tradeService');
const { sanitizeMissedReason } = require('../../services/sanitizeService');
const { deleteImage } = require('../../config/cloudinary');
const { paginate } = require('../../services/pagination');

const getAll = async (req, res, next) => {
  try {
    const { ssmtType, status, pair, type } = req.query;
    let filter = { userId: req.session.userId };
    if (ssmtType !== undefined && SSMT_TYPES.includes(ssmtType)) {
      filter.ssmtType = ssmtType;
    }
    if (status) filter.status = status;
    if (pair) filter.pair = pair;
    if (type) filter.type = type;

    const trades = await GeneralMissedTrade.find(filter)
      .sort({ entryDate: -1 });
    res.json(trades);
  } catch (error) {
    next(error);
  }
};

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit, ssmtType, status, pair, type } = req.query;
    let filter = { userId: req.session.userId };
    if (ssmtType && SSMT_TYPES.includes(ssmtType)) filter.ssmtType = ssmtType;
    if (status) filter.status = status;
    if (pair) filter.pair = pair;
    if (type) filter.type = type;

    const result = await paginate(GeneralMissedTrade, filter, cursor || null, parseInt(limit) || 20, { sort: { entryDate: -1, _id: -1 } });
    res.json(result);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { reason, ssmtType, pair, profit, commission, swap, ...rest } = req.body;

    const sanitizedReason = sanitizeMissedReason(reason);
    if (!sanitizedReason) {
      return res.status(400).json({
        message: 'Reason is required and must be between 3-2000 characters'
      });
    }

    const allowedPairs = await getCachedPairs();
    const finalPair = allowedPairs.includes(pair) ? pair : null;
    if (!finalPair) {
      return res.status(400).json({
        message: `Invalid pair. Allowed pairs: ${allowedPairs.join(', ')}`
      });
    }

    const finalSsmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';
    const finalProfit = Number(profit || 0);
    const finalCommission = Number(commission || 0);
    const finalSwap = Number(swap || 0);
    const finalRealPL = finalProfit - finalCommission - finalSwap;

    const missedTrade = new GeneralMissedTrade({
      ...rest,
      pair: finalPair,
      reason: sanitizedReason,
      ssmtType: finalSsmtType,
      profit: finalProfit,
      commission: finalCommission,
      swap: finalSwap,
      realPL: finalRealPL,
      userId: req.session.userId
    });

    const saved = await missedTrade.save();
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { reason, ssmtType, profit, commission, swap, ...rest } = req.body;
    let updateData = { ...rest };

    if (reason !== undefined) {
      const sanitizedReason = sanitizeMissedReason(reason);
      if (!sanitizedReason) {
        return res.status(400).json({
          message: 'Reason must be between 3-2000 characters'
        });
      }
      updateData.reason = sanitizedReason;
    }

    if (ssmtType !== undefined) {
      updateData.ssmtType = SSMT_TYPES.includes(ssmtType) ? ssmtType : 'NO';
    }

    if (profit !== undefined || commission !== undefined || swap !== undefined) {
      const finalProfit = Number(profit ?? updateData.profit ?? 0);
      const finalCommission = Number(commission ?? updateData.commission ?? 0);
      const finalSwap = Number(swap ?? updateData.swap ?? 0);
      updateData.profit = finalProfit;
      updateData.commission = finalCommission;
      updateData.swap = finalSwap;
      updateData.realPL = finalProfit - finalCommission - finalSwap;
    }

    const missedTrade = await GeneralMissedTrade.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }

    res.json(missedTrade);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const missedTrade = await GeneralMissedTrade.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });
    if (!missedTrade) {
      return res.status(404).json({ message: 'Missed trade not found' });
    }

    if (missedTrade.beforeScreenshot || missedTrade.afterScreenshot) {
      const publicIdsToDelete = [];
      if (missedTrade.beforeScreenshot) {
        const urlParts = missedTrade.beforeScreenshot.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
      if (missedTrade.afterScreenshot) {
        const urlParts = missedTrade.afterScreenshot.split('/');
        const filename = urlParts[urlParts.length - 1];
        publicIdsToDelete.push(`fx-journal/${filename.split('.')[0]}`);
      }
      for (const publicId of publicIdsToDelete) {
        try { await deleteImage(publicId); } catch (err) { console.error('Error deleting image from Cloudinary:', err); }
      }
    }

    await GeneralMissedTrade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Missed trade deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getPaginated, create, update, remove };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/generalMissedTrades/generalMissedTrade.controller.js
git commit -m "feat(backend): add GeneralMissedTrade controller"
```

---

### Task 3: Backend — GeneralMissedTrade routes + server mount

**Files:**
- Create: `backend/src/modules/generalMissedTrades/generalMissedTrade.routes.js`
- Modify: `backend/server.js` (add import and mount)

- [ ] **Step 1: Create routes file**

```javascript
const express = require('express');
const router = express.Router();
const { getAll, getPaginated, create, update, remove } = require('./generalMissedTrade.controller');

router.get('/', getAll);
router.get('/paginated', getPaginated);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
```

- [ ] **Step 2: Add import and mount in server.js**

Find `const missedTradeRoutes = require('./src/modules/missedTrades/missedTrade.routes');` and add after it:
```javascript
const generalMissedTradeRoutes = require('./src/modules/generalMissedTrades/generalMissedTrade.routes');
```

Find `app.use('/api/missed-trades', isAuthenticated, missedTradeRoutes);` and add after it:
```javascript
app.use('/api/general-missed-trades', isAuthenticated, generalMissedTradeRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/generalMissedTrades/generalMissedTrade.routes.js backend/server.js
git commit -m "feat(backend): add GeneralMissedTrade routes and mount"
```

---

### Task 4: Frontend — Types and API service

**Files:**
- Modify: `src/app/types/trading.ts` (add `GeneralMissedTrade` interface and `GeneralMissedTradeStatus` type)
- Modify: `src/app/services/apiService.ts` (add CRUD methods)

- [ ] **Step 1: Add types to `src/app/types/trading.ts`**

Add after the `MissedTrade` interface block:
```typescript
export type GeneralMissedTradeStatus = 'PLANNED' | 'MISSED' | 'EXECUTED_LATER';

export interface GeneralMissedTrade {
  id: string;
  accountId: string;
  propFirmId: string;
  pair: string;
  type: TradeType;
  status: TradeStatus;
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

- [ ] **Step 2: Add API methods to `src/app/services/apiService.ts`**

After the `deleteMissedTrade` method, add:
```typescript
getGeneralMissedTrades: async (filters?: { pair?: string; status?: string }): Promise<any[]> => {
  const params = new URLSearchParams();
  if (filters?.pair) params.append('pair', filters.pair);
  if (filters?.status) params.append('status', filters.status);
  const qs = params.toString();
  return apiGet(`/general-missed-trades${qs ? `?${qs}` : ''}`);
},

createGeneralMissedTrade: async (trade: any): Promise<any> => {
  return apiPost('/general-missed-trades', trade);
},

updateGeneralMissedTrade: async (id: string, trade: any): Promise<any> => {
  return apiPut(`/general-missed-trades/${id}`, trade);
},

deleteGeneralMissedTrade: async (id: string): Promise<void> => {
  return apiDelete(`/general-missed-trades/${id}`);
},
```

- [ ] **Step 3: Commit**

```bash
git add src/app/types/trading.ts src/app/services/apiService.ts
git commit -m "feat(frontend): add GeneralMissedTrade types and API service methods"
```

---

### Task 5: Frontend — GeneralMissedTradeJournal component

**Files:**
- Create: `src/app/components/GeneralMissedTradeJournal.tsx`
- Dependencies: `TradeForm.tsx`, `TimePicker`, `ImageViewer`, `ExportMenu`

This is the largest task. The component follows the pattern of `MissedTradeJournal.tsx` but:
- Uses standard Trade Journal form fields (reuses `TradeForm`-like layout)
- Form data includes: accountId, pair, type, status (OPEN/CLOSED), entryPrice, exitPrice, lotSize, entryDate, entryTime, exitDate, exitTime, stopLoss, takeProfit, profit, commission, swap, notes, session, strategy, keyLevel, highLowTime, smt, model1, beforeScreenshot, afterScreenshot, reason, missedStatus
- No CRT-specific fields
- Includes a `reason` textarea and `missedStatus` dropdown
- Inline add/edit form (like MissedTradeJournal's pattern)
- Table display with key columns
- View modal showing all fields
- Delete confirmation

Due to the size of this component, please reference the structure of `MissedTradeJournal.tsx` and `TradeForm.tsx` when building it. The form fields should be identical to TradeForm's fields plus `reason` and `missedStatus`.

- [ ] **Step 1: Create the component. Reference MissedTradeJournal.tsx for the overall structure, TradeForm.tsx for the form field layout.**

Key structure:
```tsx
import { useState, useEffect, useMemo } from 'react';
import { Plus, ... } from 'lucide-react';
import { GeneralMissedTrade, MasterData, SMTType, Model1Type } from '../types/trading';
import apiService from '../services/apiService';
// ... other imports

const MISSED_REASON_OPTIONS = ['Late Entry', 'No Confirmation', 'Fear', 'Overthinking', 'Missed Alert', 'Risk Too High', 'News Event', 'Other'];
const MISSED_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'MISSED', label: 'Missed' },
  { value: 'EXECUTED_LATER', label: 'Executed Later' },
];

// ... component code following MissedTradeJournal pattern but with Trade Journal fields
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/GeneralMissedTradeJournal.tsx
git commit -m "feat(frontend): add GeneralMissedTradeJournal component"
```

---

### Task 6: Frontend — GeneralMissedTradesCalendar component

**Files:**
- Create: `src/app/components/GeneralMissedTradesCalendar.tsx`

Mirrors `MissedTradesCalendar.tsx` but:
- No CRT-specific badges (QuarterBadge, Model1Badge, SsmtBadge)
- Day detail modal shows standard trade fields + reason + missedStatus
- Filters: pair, missedStatus

- [ ] **Step 1: Create the component. Reference MissedTradesCalendar.tsx for the calendar structure.**

```tsx
import { useState, useEffect, useMemo } from 'react';
// ... imports

interface DayData {
  date: number;
  trades: GeneralMissedTrade[];
  totalPL: number;
  count: number;
}

// Calendar grid, month navigation, day cells with P&L indicators
// Day detail modal with trade fields (no CRT badges)
// Weekly summary cards
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/GeneralMissedTradesCalendar.tsx
git commit -m "feat(frontend): add GeneralMissedTradesCalendar component"
```

---

### Task 7: Frontend — Sidebar, routing, tab persistence

**Files:**
- Modify: `src/app/components/Sidebar.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Update Sidebar.tsx Tab type and nav items**

Add to Tab type:
```typescript
'missed-log' | 'missed-log-calendar'
```

Add nav items after the CRT missed entries (or in the same Analysis group):
```typescript
{ id: 'missed-log', label: 'Missed Trades', icon: EyeOff },
{ id: 'missed-log-calendar', label: 'Missed Trade Calendar', icon: Calendar },
```

- [ ] **Step 2: Update App.tsx**

Add lazy imports:
```typescript
const GeneralMissedTradeJournal = lazy(() => import('./components/GeneralMissedTradeJournal'));
const GeneralMissedTradesCalendar = lazy(() => import('./components/GeneralMissedTradesCalendar'));
```

Add route cases:
```typescript
{activeTab === 'missed-log' && <GeneralMissedTradeJournal />}
{activeTab === 'missed-log-calendar' && <GeneralMissedTradesCalendar />}
```

Add tab IDs to localStorage validation list in the `useState` initializer:
```typescript
'missed-log', 'missed-log-calendar'
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/Sidebar.tsx src/app/App.tsx
git commit -m "feat(frontend): add Missed Trades sidebar items and routes"
```
