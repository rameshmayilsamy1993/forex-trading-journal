import { useState, useEffect } from 'react';
import { BarChart4, TrendingUp, TrendingDown, Download, Loader2, Activity, Eye } from 'lucide-react';
import { PageHeader, StatCard, SectionCard } from './ui/DesignSystem';
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Ensure MT5 is running on the server.');
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
        <div className="lg:col-span-3 space-y-6">
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

        <div className="lg:col-span-2 space-y-6">
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
                      {([
                        { dir: 'bullish' as const, metric: 'open_to_low', label: 'Open→Low' },
                        { dir: 'bullish' as const, metric: 'close_to_high', label: 'Close→High' },
                        { dir: 'bearish' as const, metric: 'open_to_high', label: 'Open→High' },
                        { dir: 'bearish' as const, metric: 'close_to_low', label: 'Close→Low' },
                      ] as const).map((row) => {
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
