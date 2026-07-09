# Market Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Market Statistics tool that uses the Python MT5 project as analysis engine, called via Node subprocess, with results rendered in a premium React UI.

**Architecture:** React sends symbol/timeframe/lookback to Node backend → Node spawns `python run.py` with CLI args → Python outputs JSON to stdout → Node returns JSON to React → React renders in stat cards matching XAUUSD Calculator design.

**Tech Stack:** React + Vite + Tailwind (frontend), Node.js + Express (backend), Python + pandas + MetaTrader5 (analysis engine)

## Global Constraints

- Python project at `C:\Node Js\python\MT5` is source of truth — no statistics computed in React or Node
- Design must match XAUUSD Lot Calculator style (PageHeader, card containers, 2-column grid, gradient result banners)
- All backend routes require `isAuthenticated` middleware
- Use existing `Tab`-based routing (not React Router)
- No new npm/pip dependencies unless necessary

---

### Task 1: Add CLI argument support to Python run.py

**Files:**
- Modify: `C:\Node Js\python\MT5\run.py`

**Interfaces:**
- Consumes: existing `calculate_basic`, `calculate_sessions`, `calculate_weekdays`, `calculate_probabilities`, `get_download_bytes` from Python package
- Produces: CLI with `--symbol`, `--timeframe`, `--lookback`, `--format` args; JSON output on stdout when `--format json`

- [ ] **Step 1: Rewrite run.py with argparse support**

Replace the current `run.py` content:

```python
import sys
import argparse
import json
from mt5_candle_stats.config import get_factor, parse_timeframe
from mt5_candle_stats.mt5_client import connect, disconnect, fetch_rates
from mt5_candle_stats.calculators.basic import calculate_basic
from mt5_candle_stats.calculators.session import calculate_sessions
from mt5_candle_stats.calculators.weekday import calculate_weekdays
from mt5_candle_stats.calculators.probability import calculate_probabilities
from mt5_candle_stats.export import get_download_bytes
from mt5_candle_stats.console_reports import print_report


DEFAULT_SYMBOL = "XAUUSD"
DEFAULT_TIMEFRAME = "H1"
DEFAULT_LOOKBACK = 1000


def parse_args():
    parser = argparse.ArgumentParser(description="MT5 Candle Statistics")
    parser.add_argument("--symbol", default=DEFAULT_SYMBOL, type=str.upper)
    parser.add_argument("--timeframe", default=DEFAULT_TIMEFRAME, type=str.upper)
    parser.add_argument("--lookback", default=DEFAULT_LOOKBACK, type=int)
    parser.add_argument("--format", default="text", choices=["text", "json"])
    return parser.parse_args()


def run_analysis(symbol: str, timeframe: str, lookback: int) -> dict:
    tf = parse_timeframe(timeframe)
    factor, unit = get_factor(symbol)

    if not connect():
        raise RuntimeError("MT5 Connection Failed")

    try:
        df = fetch_rates(symbol, tf, lookback)
    except RuntimeError:
        disconnect()
        raise
    finally:
        disconnect()

    basic = calculate_basic(df, factor)
    basic["unit"] = unit
    sessions = calculate_sessions(df, factor)
    weekdays = calculate_weekdays(df, factor)
    probabilities = calculate_probabilities(df, factor)

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "lookback": lookback,
        "basic": basic,
        "sessions": sessions,
        "weekdays": weekdays,
        "probabilities": probabilities,
    }


def main():
    args = parse_args()

    try:
        results = run_analysis(args.symbol, args.timeframe, args.lookback)
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    if args.format == "json":
        json.dump(results, sys.stdout, indent=2, default=str)
        sys.stdout.flush()
    else:
        print_report(results)


if __name__ == "__main__":
    main()
```

---

### Task 2: Create backend marketStats module

**Files:**
- Create: `backend/src/modules/marketStats/marketStats.controller.js`
- Create: `backend/src/modules/marketStats/marketStats.routes.js`
- Modify: `backend/server.js`

**Interfaces:**
- Consumes: Python script at `C:\Node Js\python\MT5\run.py`
- Produces: `POST /api/market-stats/analyze` returns JSON, `GET /api/market-stats/export` returns file download

- [ ] **Step 1: Create marketStats.controller.js**

```javascript
const { spawn } = require('child_process');
const path = require('path');

const PYTHON_SCRIPT = path.resolve(__dirname, '../../../../python/MT5/run.py');
const PYTHON_CMD = process.env.PYTHON_PATH || 'python';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'];

function validateParams(symbol, timeframe, lookback) {
  const errors = [];
  if (!symbol || typeof symbol !== 'string') errors.push('symbol is required');
  if (!timeframe || !TIMEFRAMES.includes(timeframe.toUpperCase())) errors.push(`timeframe must be one of: ${TIMEFRAMES.join(', ')}`);
  if (!lookback || !Number.isInteger(Number(lookback)) || Number(lookback) < 2 || Number(lookback) > 50000) errors.push('lookback must be an integer between 2 and 50000');
  return errors;
}

function runPython(symbol, timeframe, lookback) {
  return new Promise((resolve, reject) => {
    const args = [
      PYTHON_SCRIPT,
      '--symbol', symbol.toUpperCase(),
      '--timeframe', timeframe.toUpperCase(),
      '--lookback', String(lookback),
      '--format', 'json',
    ];

    const proc = spawn(PYTHON_CMD, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python process exited with code ${code}`));
      } else {
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Failed to parse Python output: ${err.message}`));
        }
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

const analyze = async (req, res, next) => {
  try {
    const { symbol, timeframe, lookback } = req.body;
    const errors = validateParams(symbol, timeframe, lookback);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('; ') });
    }

    const results = await runPython(symbol, timeframe, Number(lookback));
    res.json(results);
  } catch (error) {
    next(error);
  }
};

const exportResults = async (req, res, next) => {
  try {
    const { symbol, timeframe, lookback, format } = req.query;
    const errors = validateParams(symbol, timeframe, lookback);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('; ') });
    }
    if (!['csv', 'xlsx', 'json'].includes(format)) {
      return res.status(400).json({ message: 'format must be csv, xlsx, or json' });
    }

    const results = await runPython(symbol, timeframe, Number(lookback));

    const { get_download_bytes } = require(path.resolve(__dirname, '../../../../python/MT5/mt5_candle_stats/export'));
    const fileBytes = get_download_bytes(results, format);

    const mimeTypes = { csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json' };
    const filename = `${symbol}_${timeframe}_${lookback}.${format}`;

    res.setHeader('Content-Type', mimeTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(fileBytes));
  } catch (error) {
    next(error);
  }
};

module.exports = { analyze, exportResults };
```

- [ ] **Step 2: Create marketStats.routes.js**

```javascript
const express = require('express');
const router = express.Router();
const { analyze, exportResults } = require('./marketStats.controller');

router.post('/analyze', analyze);
router.get('/export', exportResults);

module.exports = router;
```

- [ ] **Step 3: Register route in server.js**

Add after the crt route import block (around line 48):

```javascript
const marketStatsRoutes = require('./src/modules/marketStats/marketStats.routes');
```

Add after `app.use('/api/crt-events', isAuthenticated, crtRoutes);` (around line 106):

```javascript
app.use('/api/market-stats', isAuthenticated, marketStatsRoutes);
```

---

### Task 3: Add marketStats methods to apiService.ts

**Files:**
- Modify: `src/app/services/apiService.ts`

**Interfaces:**
- Consumes: backend routes from Task 2
- Produces: `apiService.marketStats.analyze()` and `apiService.marketStats.exportUrl()`

- [ ] **Step 1: Add marketStats section to apiService**

Find the end of the apiService object (around line 1056, before the `export default apiService;` line) and add:

```typescript
marketStats: {
    analyze: async (symbol: string, timeframe: string, lookback: number): Promise<any> => {
      return fetchWithAuth(`${API_BASE_URL}/market-stats/analyze`, {
        method: 'POST',
        body: JSON.stringify({ symbol, timeframe, lookback }),
      });
    },
    exportUrl: (symbol: string, timeframe: string, lookback: number, format: string): string => {
      return `${API_BASE_URL}/market-stats/export?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&lookback=${lookback}&format=${format}`;
    },
  },
```

---

### Task 4: Register Market Statistics in sidebar and app routing

**Files:**
- Modify: `src/app/components/Sidebar.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Add tab type and nav item in Sidebar.tsx**

Add `BarChart4` to the lucide-react import (line 8):
```
DollarSign, BarChart4
```

Add `'market-stats'` to the Tab type union (line 33):
```
| 'market-stats'
```

Add nav item to TOOLS group (after the forex-lot-calculator item, around line 58):
```typescript
{ id: 'market-stats', label: 'Market Statistics', icon: BarChart4 },
```

- [ ] **Step 2: Add lazy import and conditional render in App.tsx**

Add import (after the ForexLotCalculator import on line 33):
```typescript
const MarketStatistics = lazy(() => import('./components/MarketStatistics'));
```

Add conditional render (after the forex-lot-calculator condition on line 61):
```typescript
{activeTab === 'market-stats' && <MarketStatistics />}
```

---

### Task 5: Create MarketStatistics.tsx component

**Files:**
- Create: `src/app/components/MarketStatistics.tsx`

**Interfaces:**
- Consumes: `apiService.marketStats.analyze()`, `apiService.marketStats.exportUrl()`, `apiService.settings.getPairs()`
- Produces: Full UI with form inputs, results display, and export buttons

- [ ] **Step 1: Create the MarketStatistics component**

```tsx
import { useState, useEffect } from 'react';
import { BarChart4, TrendingUp, TrendingDown, Download, Loader2, Activity, Eye } from 'lucide-react';
import { PageHeader, StatCard, SectionCard, CardContainer } from './ui/DesignSystem';
import apiService from '../services/apiService';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'];
const LOOKBACK_PRESETS = [100, 500, 1000, 5000];
const EXPORT_FORMATS = ['CSV', 'XLSX', 'JSON'];

interface BasicStats {
  avg_body: number;
  avg_upper_wick: number;
  avg_lower_wick: number;
  avg_range: number;
  unit: string;
  bullish: { count: number; open_to_low: number; close_to_high: number };
  bearish: { count: number; open_to_high: number; close_to_low: number };
}

interface SessionData {
  avg_body: number;
  avg_upper_wick: number;
  avg_lower_wick: number;
  avg_range: number;
}

interface WeekdayData {
  avg_body: number;
  avg_wick: number;
  avg_range: number;
  avg_upper_wick: number;
  avg_lower_wick: number;
  bullish: { open_to_low: number; close_to_high: number };
  bearish: { open_to_high: number; close_to_low: number };
}

interface ProbabilityData {
  [key: string]: { [percentile: string]: number };
}

interface AnalysisResults {
  symbol: string;
  timeframe: string;
  lookback: number;
  basic: BasicStats;
  sessions: { [key: string]: SessionData | null };
  weekdays: { [key: string]: WeekdayData | null };
  probabilities: { bullish: ProbabilityData; bearish: ProbabilityData };
}

export default function MarketStatistics() {
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('H1');
  const [lookback, setLookback] = useState('1000');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    apiService.settings.getPairs().then(setSymbols).catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!symbol || !timeframe || !lookback) {
      alert('Please select a symbol, timeframe, and lookback value');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await apiService.marketStats.analyze(symbol, timeframe, Number(lookback));
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Ensure MT5 is running on the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const unit = results?.basic?.unit || 'pips';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Market Statistics"
        subtitle="Analyze candle statistics across symbols, timeframes, and sessions using MT5 data."
        icon={BarChart4}
        color="purple"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
              Analysis Parameters
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                >
                  <option value="">Select symbol...</option>
                  {symbols.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timeframe</label>
                <div className="flex gap-1.5 flex-wrap">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border-2 ${
                        timeframe === tf
                          ? 'bg-purple-50 border-purple-500 text-purple-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lookback (candles)</label>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {LOOKBACK_PRESETS.map((val) => (
                    <button
                      key={val}
                      onClick={() => setLookback(String(val))}
                      className={`flex-1 min-w-[60px] px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border-2 ${
                        lookback === String(val)
                          ? 'bg-purple-50 border-purple-500 text-purple-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={lookback}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) setLookback(val);
                  }}
                  placeholder="Custom lookback"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isLoading || !symbol}
                className="w-full px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Activity className="w-4 h-4" /> Analyze</>
                )}
              </button>
            </div>
          </div>

          {results && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Export Results
              </h3>
              <div className="flex gap-2">
                {EXPORT_FORMATS.map((fmt) => (
                  <a
                    key={fmt}
                    href={apiService.marketStats.exportUrl(results.symbol, results.timeframe, results.lookback, fmt.toLowerCase())}
                    download
                    className="flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> {fmt}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-6">
          {!results && !isLoading && !error && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center">
              <BarChart4 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Select a symbol and click Analyze to view statistics</p>
              <p className="text-xs text-slate-400 mt-1">Data is fetched live from MetaTrader 5</p>
            </div>
          )}

          {isLoading && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center">
              <Loader2 className="w-10 h-10 text-purple-500 mx-auto mb-4 animate-spin" />
              <p className="text-slate-600 font-medium">Running analysis...</p>
              <p className="text-xs text-slate-400 mt-1">Fetching {lookback} candles from MT5</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-700 font-medium">Analysis Failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          {results && (
            <>
              <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/25 p-6 text-center">
                <p className="text-sm font-medium text-purple-100 mb-1">Analysis Complete</p>
                <p className="text-2xl font-bold text-white">{results.symbol}</p>
                <div className="flex items-center justify-center gap-4 text-sm text-purple-100 mt-1">
                  <span>{results.timeframe}</span>
                  <span className="w-1 h-1 rounded-full bg-purple-300" />
                  <span>{results.lookback} candles</span>
                </div>
              </div>

              <SectionCard title="Average Candle Metrics" icon={Eye} color="purple">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Avg Body" value={`${results.basic.avg_body.toFixed(2)} ${unit}`} color="purple" />
                  <StatCard label="Avg Upper Wick" value={`${results.basic.avg_upper_wick.toFixed(2)} ${unit}`} color="purple" />
                  <StatCard label="Avg Lower Wick" value={`${results.basic.avg_lower_wick.toFixed(2)} ${unit}`} color="purple" />
                  <StatCard label="Avg Range" value={`${results.basic.avg_range.toFixed(2)} ${unit}`} color="purple" />
                </div>
              </SectionCard>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <SectionCard title={`Bullish Candles (${results.basic.bullish.count})`} icon={TrendingUp} color="green">
                  <div className="space-y-3">
                    <StatCard label="Avg Open → Low" value={`${results.basic.bullish.open_to_low.toFixed(2)} ${unit}`} color="green" />
                    <StatCard label="Avg Close → High" value={`${results.basic.bullish.close_to_high.toFixed(2)} ${unit}`} color="green" />
                  </div>
                </SectionCard>

                <SectionCard title={`Bearish Candles (${results.basic.bearish.count})`} icon={TrendingDown} color="red">
                  <div className="space-y-3">
                    <StatCard label="Avg Open → High" value={`${results.basic.bearish.open_to_high.toFixed(2)} ${unit}`} color="red" />
                    <StatCard label="Avg Close → Low" value={`${results.basic.bearish.close_to_low.toFixed(2)} ${unit}`} color="red" />
                  </div>
                </SectionCard>
              </div>

              <SectionCard title="Session Analysis" icon={BarChart4} color="purple">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Session</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Body</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">U.Wick</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">L.Wick</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {['Asian', 'London', 'New York'].map((session) => {
                        const s = results.sessions[session];
                        return (
                          <tr key={session} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-slate-700">{session}</td>
                            {s ? (
                              <>
                                <td className="px-4 py-2.5 text-right text-slate-900 tabular-nums">{s.avg_body.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-900 tabular-nums">{s.avg_upper_wick.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-900 tabular-nums">{s.avg_lower_wick.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-900 tabular-nums">{s.avg_range.toFixed(2)}</td>
                              </>
                            ) : (
                              <td colSpan={4} className="px-4 py-2.5 text-center text-slate-400">No data</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title="Day of Week Analysis" icon={BarChart4} color="purple">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Day</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Body</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Wick</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Range</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Bull O→L</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Bull C→H</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Bear O→H</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Bear C→L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                        const d = results.weekdays[day];
                        return (
                          <tr key={day} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-slate-700">{day}</td>
                            {d ? (
                              <>
                                <td className="px-3 py-2.5 text-right text-slate-900 tabular-nums">{d.avg_body.toFixed(2)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-900 tabular-nums">{d.avg_wick.toFixed(2)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-900 tabular-nums">{d.avg_range.toFixed(2)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-900 tabular-nums">{d.bullish.open_to_low.toFixed(2)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-900 tabular-nums">{d.bullish.close_to_high.toFixed(2)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-900 tabular-nums">{d.bearish.open_to_high.toFixed(2)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-900 tabular-nums">{d.bearish.close_to_low.toFixed(2)}</td>
                              </>
                            ) : (
                              <td colSpan={7} className="px-3 py-2.5 text-center text-slate-400">No data</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title="Probability Analysis" icon={BarChart4} color="purple">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Direction</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Metric</th>
                        {[50, 60, 70, 80, 90, 95].map((lvl) => (
                          <th key={lvl} className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{lvl}%</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { dir: 'bullish', metric: 'open_to_low', label: 'Open→Low' },
                        { dir: 'bullish', metric: 'close_to_high', label: 'Close→High' },
                        { dir: 'bearish', metric: 'open_to_high', label: 'Open→High' },
                        { dir: 'bearish', metric: 'close_to_low', label: 'Close→Low' },
                      ].map((row) => {
                        const data = results.probabilities[row.dir]?.[row.metric];
                        return (
                          <tr key={`${row.dir}-${row.metric}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-slate-700 capitalize">{row.dir}</td>
                            <td className="px-3 py-2.5 text-slate-600">{row.label}</td>
                            {[50, 60, 70, 80, 90, 95].map((lvl) => (
                              <td key={lvl} className="px-3 py-2.5 text-right text-slate-900 tabular-nums">
                                {data ? `${data[lvl]?.toFixed(2) ?? '—'}` : '—'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Self-Review

1. **Spec coverage:** Every requirement from the spec is covered — Python CLI args (Task 1), Node backend execute Python (Task 2), all UI sections (Task 5), export buttons (Task 5), sidebar routing (Task 4), apiService additions (Task 3).
2. **Placeholder scan:** No TBD, TODO, or incomplete sections. All code is complete.
3. **Type consistency:** Type names used in Task 5 (`BasicStats`, `SessionData`, `WeekdayData`, `AnalysisResults`) match the Python JSON output structure from Task 1. `apiService.marketStats.analyze()` return type in Task 3 matches `AnalysisResults` in Task 5.
