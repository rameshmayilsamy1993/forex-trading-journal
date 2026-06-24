### Task 5: Pagination — Backend + Frontend

**Files:**
- Create: `backend/src/services/pagination.js`
- Modify: `backend/src/modules/missedTrades/missedTrade.controller.js`
- Modify: `backend/src/modules/missedTrades/missedTrade.routes.js`
- Modify: `backend/src/modules/accounts/account.controller.js`
- Modify: `backend/src/modules/accounts/account.routes.js`
- Modify: `backend/src/modules/propfirms/propfirm.controller.js`
- Modify: `backend/src/modules/propfirms/propfirm.routes.js`
- Create: `src/app/hooks/useCursorPagination.ts`
- Modify: `src/app/components/MissedTradeJournal.tsx`
- Modify: `src/app/components/Accounts.tsx`
- Modify: `src/app/components/PropFirms.tsx`

- [ ] **Step 1: Create pagination helper**

`backend/src/services/pagination.js`:

```javascript
const mongoose = require('mongoose');

async function paginate(model, query, cursor, limit = 20, options = {}) {
  const effectiveLimit = Math.min(limit, 100);
  const sort = options.sort || { _id: 1 };
  const paginatedQuery = cursor
    ? { ...query, _id: { $gt: new mongoose.Types.ObjectId(cursor) } }
    : { ...query };

  let queryBuilder = model.find(paginatedQuery).sort(sort).limit(effectiveLimit + 1);
  if (options.populate) queryBuilder = queryBuilder.populate(options.populate);

  const items = await queryBuilder;
  const hasMore = items.length > effectiveLimit;
  if (hasMore) items.pop();

  const lastItem = items[items.length - 1];
  return {
    data: items,
    nextCursor: hasMore && lastItem ? lastItem._id.toString() : null,
    hasMore,
  };
}

module.exports = { paginate };
```

- [ ] **Step 2: Add getPaginated to missedTrades controller + routes**

```javascript
// In missedTrade.controller.js
const { paginate } = require('../../services/pagination');

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit, ssmtType, dailyQuarter, sixHourQuarter, status, pair, type, model1Confirmation, ssmtConfirmation } = req.query;
    let filter = { userId: req.session.userId };
    if (ssmtType && SSMT_TYPES.includes(ssmtType)) filter.ssmtType = ssmtType;
    if (dailyQuarter) filter.dailyQuarter = dailyQuarter;
    if (sixHourQuarter) filter.sixHourQuarter = sixHourQuarter;
    if (status) filter.status = status;
    if (pair) filter.pair = pair;
    if (type) filter.type = type;
    if (model1Confirmation) filter.model1Confirmation = model1Confirmation;
    if (ssmtConfirmation) filter.ssmtConfirmation = ssmtConfirmation;

    const result = await paginate(MissedTrade, filter, cursor || null, parseInt(limit) || 20, { sort: { date: -1, _id: -1 } });
    res.json(result);
  } catch (error) { next(error); }
};

// In routes — add before the /:id route
router.get('/paginated', getPaginated);
```

- [ ] **Step 3: Add getPaginated to accounts controller + routes**

```javascript
// In account.controller.js
const { paginate } = require('../../services/pagination');

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit, status } = req.query;
    let filter = { userId: req.session.userId };
    if (status) filter.status = status;
    const result = await paginate(Account, filter, cursor || null, parseInt(limit) || 20, { populate: 'propFirmId' });
    const tradableStatuses = ['ACTIVE', 'PASSED_1', 'PASSED_2', 'FUNDED'];
    result.data = result.data.map(account => ({
      ...account.toObject(),
      isActive: tradableStatuses.includes(account.status),
      canTrade: tradableStatuses.includes(account.status)
    }));
    res.json(result);
  } catch (error) { next(error); }
};

// In routes
router.get('/paginated', getPaginated);
```

- [ ] **Step 4: Add getPaginated to propfirms controller + routes**

```javascript
// In propfirm.controller.js
const { paginate } = require('../../services/pagination');

const getPaginated = async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await paginate(PropFirm, { userId: req.session.userId }, cursor || null, parseInt(limit) || 20);
    res.json(result);
  } catch (error) { next(error); }
};

// In routes
router.get('/paginated', getPaginated);
```

- [ ] **Step 5: Create useCursorPagination hook**

`src/app/hooks/useCursorPagination.ts`:

```typescript
import { useState, useCallback } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface PaginationResult<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: (initialItems?: T[]) => void;
}

export function useCursorPagination<T>(
  fetchFn: (cursor: string | null) => Promise<PaginatedResponse<T>>
): PaginationResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const result = await fetchFn(cursor);
      setItems(prev => [...prev, ...result.data]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Pagination load failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading, hasMore, fetchFn]);

  const reset = useCallback((initialItems?: T[]) => {
    setItems(initialItems || []);
    setCursor(null);
    setHasMore(true);
  }, []);

  return { items, isLoading, hasMore, loadMore, reset };
}
```

- [ ] **Step 6-8: Integrate pagination into MissedTradeJournal, Accounts, PropFirms**

In each component:
```typescript
import { useCursorPagination } from '../hooks/useCursorPagination';

// Inside component:
const pagination = useCursorPagination(async (cursor) => {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', '20');
  // Add component-specific filters...
  const res = await apiService.get(`/missed-trades/paginated?${params}`);
  return res;
});

// After table/list:
{pagination.hasMore && (
  <div className="flex justify-center py-4">
    <button onClick={pagination.loadMore} disabled={pagination.isLoading}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
      {pagination.isLoading ? 'Loading...' : 'Load More'}
    </button>
  </div>
)}
```

Note: The `apiService.get()` method may need to be added or use `fetch()` directly depending on what's available. Check apiService.ts for a generic GET method.

- [ ] **Step 9: Verify frontend build**

```bash
pnpm build
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/pagination.js backend/src/modules/missedTrades/missedTrade.controller.js backend/src/modules/missedTrades/missedTrade.routes.js backend/src/modules/accounts/account.controller.js backend/src/modules/accounts/account.routes.js backend/src/modules/propfirms/propfirm.controller.js backend/src/modules/propfirms/propfirm.routes.js src/app/hooks/useCursorPagination.ts src/app/components/MissedTradeJournal.tsx src/app/components/Accounts.tsx src/app/components/PropFirms.tsx
git commit -m "feat: add cursor-based pagination to missed-trades, accounts, propfirms"
```

---

