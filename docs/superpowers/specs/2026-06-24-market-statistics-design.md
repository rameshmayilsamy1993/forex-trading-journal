# Market Statistics Tool — Design Spec

## Overview
Add a "Market Statistics" tool to FX Journal that uses the existing Python MT5 project as the analysis engine, called via Node subprocess, with results rendered in a premium React UI matching the XAUUSD Lot Calculator design.

## Architecture

```
React (MarketStatistics.tsx)
  → POST /api/market-stats/analyze { symbol, timeframe, lookback }
    → Node spawns: python run.py --symbol XAUUSD --timeframe H1 --lookback 100 --format json
    → Python outputs JSON to stdout
  → Node captures stdout, returns JSON
  → React renders results in stat cards

Export:
  GET /api/market-stats/export?symbol=X&timeframe=H1&lookback=100&format=csv
  → Backend re-runs Python, generates file via get_download_bytes(), returns file
```

## Menu Integration
- **Tab name:** `market-stats`
- **Location:** TOOLS group, between XAUUSD Lot Calculator and Forex Lot Calculator
- **Icon:** `BarChart4` (lucide-react)
- **Sidebar label:** "Market Statistics"

## Backend (Node.js)

### New module: `backend/src/modules/marketStats/`
- `marketStats.routes.js` — routes
- `marketStats.controller.js` — handlers

### Routes
- `POST /api/market-stats/analyze` — body: `{ symbol, timeframe, lookback }` — runs Python, returns JSON
- `GET /api/market-stats/export` — query: `symbol, timeframe, lookback, format` — returns file download

### Controller logic
```
analyze:
  1. Validate symbol, timeframe, lookback
  2. Resolve python path (config/env default: "python")
  3. Resolve script path to C:\Node Js\python\MT5\run.py
  4. spawn: python run.py --symbol <s> --timeframe <tf> --lookback <n> --format json
  5. Collect stdout, parse JSON
  6. Return res.json(parsedData)
  7. On error, return 500 with stderr message

export:
  1. Same as analyze but pass --format json to get results
  2. Call get_download_bytes(results, format) from Python's export.py
  3. Return file with appropriate Content-Type and Content-Disposition
```

### Route Registration
In `server.js`: `app.use('/api/market-stats', isAuthenticated, marketStatsRoutes);`

## Python Changes (`C:\Node Js\python\MT5\run.py`)

Accept CLI arguments instead of interactive prompts:
- `--symbol` (default: XAUUSD)
- `--timeframe` (default: H1)
- `--lookback` (default: 1000)
- `--format` (default: "text", can be "json")

When `--format json`, skip console report and export prompt, print JSON to stdout only.

Use `argparse` library (stdlib, no extra dependency).

## Frontend (React)

### New component: `src/app/components/MarketStatistics.tsx`

**Pattern:** Self-contained SFC, lazy-loaded, no props, same architecture as `XauusdCalculator.tsx`.

**State:**
- `symbol`, `timeframe`, `lookback` — form inputs
- `isLoading` — during analysis
- `results` — parsed JSON response or null
- `error` — error message string or null

**Form inputs:**
- **Symbol dropdown** — fetches from `apiService.settings.getPairs()`
- **Timeframe dropdown** — static: M1, M5, M15, M30, H1, H4, D1, W1, MN1
- **Lookback input** — number input, with quick-preset buttons: 100, 500, 1000, 5000
- **Analyze button** — purple gradient, disabled during loading

**Results sections (displayed after analysis):**

1. **Basic Statistics** — 4 StatCards in a grid:
   - Avg Body, Avg Upper Wick, Avg Lower Wick, Avg Range (with unit label)

2. **Bullish Statistics** — Card with bullish candle count and:
   - Average Open→Low, Average Close→High

3. **Bearish Statistics** — Card with bearish candle count and:
   - Average Open→High, Average Close→Low

4. **Session Analysis** — Table: Asian, London, New York rows with avg_body, avg_upper_wick, avg_lower_wick, avg_range columns

5. **Day Analysis** — Table: Monday–Friday rows with same metrics + avg_wick

6. **Probability Analysis** — Table with columns: Direction | Metric | 50% | 60% | 70% | 80% | 90% | 95%

7. **Export Buttons** — Three buttons: Excel, CSV, JSON — each triggers download via `GET /api/market-stats/export`

**Layout:** Same 2-column grid as XAUUSD Calculator — controls on left (3/5), summary on right (2/5), then full-width sections below.

**Color theme:** Purple (matches analytical/tools vibe)

**API calls:**
- `apiService.settings.getPairs()` — fetch available symbols on mount
- Custom `apiService.marketStats.analyze(symbol, timeframe, lookback)` — POST
- Custom `apiService.marketStats.exportUrl(symbol, timeframe, lookback, format)` — returns download URL

### apiService additions

```typescript
apiService.marketStats = {
  analyze: async (symbol: string, timeframe: string, lookback: number): Promise<any> => {
    return fetchWithAuth(`${API_BASE_URL}/market-stats/analyze`, {
      method: 'POST',
      body: JSON.stringify({ symbol, timeframe, lookback }),
    });
  },
  exportUrl: (symbol: string, timeframe: string, lookback: number, format: string): string => {
    return `${API_BASE_URL}/market-stats/export?symbol=${symbol}&timeframe=${timeframe}&lookback=${lookback}&format=${format}`;
  },
};
```

### App.tsx changes
- Add lazy import for `MarketStatistics`
- Add `{activeTab === 'market-stats' && <MarketStatistics />}` condition

### Sidebar.tsx changes
- Add `'market-stats'` to `Tab` type union
- Add `BarChart4` import
- Add nav item to TOOLS group

## Data Shape (Python → Backend → React)

The Python JSON output matches the existing calculator return shapes directly. React consumes the raw JSON without transformation.

## Error Handling
- **Python not found / script fails:** Backend returns 500 with stderr message. React shows error banner with the message.
- **MT5 not running:** Python returns non-zero exit. Backend captures stderr, returns error. React shows "MT5 Connection Failed" alert.
- **Invalid symbol:** Python returns error. React displays it.
- **Network/connection errors:** Standard fetch error handling via apiService.

## Files Modified
1. `C:\Node Js\python\MT5\run.py` — add CLI argument support
2. `backend/server.js` — register new route
3. `backend/src/modules/marketStats/marketStats.routes.js` — NEW
4. `backend/src/modules/marketStats/marketStats.controller.js` — NEW
5. `src/app/services/apiService.ts` — add marketStats methods
6. `src/app/components/MarketStatistics.tsx` — NEW
7. `src/app/App.tsx` — add lazy import and conditional render
8. `src/app/components/Sidebar.tsx` — add tab type and nav item
