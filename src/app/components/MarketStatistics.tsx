import { useState, useEffect } from 'react';
import {
  BarChart4, TrendingUp, TrendingDown, Download, Loader2, Activity,
  Info, CheckCircle, Calendar, Clock, BookOpen, FileSpreadsheet,
  FileJson, FileText, AlertTriangle, HelpCircle
} from 'lucide-react';
import apiService from '../services/apiService';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from './ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'];
const LOOKBACK_PRESETS = [100, 500, 1000, 5000];
const EXPORT_FORMATS = [
  { key: 'CSV', icon: FileText },
  { key: 'Excel', icon: FileSpreadsheet },
  { key: 'JSON', icon: FileJson },
];

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
  lastUpdated?: string;
}

interface InfoTipProps {
  content: string;
}

function InfoTip({ content }: InfoTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-help flex-shrink-0"
          aria-label="Learn more"
        >
          <Info className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[260px] bg-slate-800 text-white text-caption p-3 rounded-xl shadow-xl"
      >
        {content}
        <div className="absolute w-2 h-2 bg-slate-800 rotate-45 -bottom-1 left-1/2 -translate-x-1/2 rounded-sm" />
      </TooltipContent>
    </Tooltip>
  );
}

interface MetricCardProps {
  icon: typeof BarChart4;
  label: string;
  value: string;
  explanation: string;
  color: 'purple' | 'green' | 'red' | 'orange' | 'blue';
}

const metricColorMap = {
  purple: {
    icon: 'from-violet-500 to-purple-600',
    text: 'text-violet-700',
    bg: 'bg-violet-50',
  },
  green: {
    icon: 'from-emerald-500 to-green-600',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  red: {
    icon: 'from-rose-500 to-red-600',
    text: 'text-rose-400',
    bg: 'bg-rose-50',
  },
  orange: {
    icon: 'from-amber-500 to-orange-600',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  blue: {
    icon: 'from-[#7C3AED] to-[#4F46E5]',
    text: 'text-[#6D28D9]',
    bg: 'bg-blue-50',
  },
};

function MetricCard({ icon: Icon, label, value, explanation, color }: MetricCardProps) {
  const theme = metricColorMap[color];
  return (
    <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${theme.icon} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <InfoTip content={explanation} />
      </div>
      <p className="text-table-header text-slate-500 uppercase mb-1.5">{label}</p>
      <p className={`text-page-title font-bold tabular-nums ${theme.text}`}>{value}</p>
      <p className="text-caption text-slate-400 mt-2">{explanation}</p>
    </div>
  );
}

function VolatilityBadge({ level }: { level: 'Low' | 'Medium' | 'High' }) {
  const config = {
    Low: { variant: 'success' as const, label: 'Low' },
    Medium: { variant: 'warning' as const, label: 'Medium' },
    High: { variant: 'destructive' as const, label: 'High' },
  };
  const { variant, label } = config[level];
  return <Badge variant={variant}>{label}</Badge>;
}

function TradingStyleBadge({ style }: { style: string }) {
  const styleConfig: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' | 'purple' | 'teal'> = {
    'Range Trading': 'purple',
    'Scalping': 'teal',
    'Trend Trading': 'success',
    'Breakout': 'warning',
    'Swing Trading': 'default',
  };
  const variant = styleConfig[style] || 'default';
  return <Badge variant={variant}>{style}</Badge>;
}

function getTradingStyle(day: string, avgRange: number): string {
  const styles: Record<string, [number, string][]> = {
    Monday: [[15, 'Range Trading'], [25, 'Breakout'], [Infinity, 'Trend Trading']],
    Tuesday: [[10, 'Scalping'], [20, 'Range Trading'], [Infinity, 'Trend Trading']],
    Wednesday: [[12, 'Scalping'], [22, 'Trend Trading'], [Infinity, 'Breakout']],
    Thursday: [[14, 'Range Trading'], [24, 'Breakout'], [Infinity, 'Trend Trading']],
    Friday: [[10, 'Scalping'], [18, 'Swing Trading'], [Infinity, 'Range Trading']],
  };
  const thresholds = styles[day] || styles.Monday;
  for (const [threshold, style] of thresholds) {
    if (avgRange <= threshold) return style;
  }
  return 'Range Trading';
}

function getVolatilityLevel(avgRange: number, sessions: SessionData[]): 'Low' | 'Medium' | 'High' {
  const ranges = sessions.filter(Boolean).map(s => s.avg_range);
  if (ranges.length === 0) return 'Medium';
  const minRange = Math.min(...ranges);
  const maxRange = Math.max(...ranges);
  const spread = maxRange - minRange || 1;
  const ratio = (avgRange - minRange) / spread;
  if (ratio < 0.33) return 'Low';
  if (ratio < 0.66) return 'Medium';
  return 'High';
}

const sessionDescriptions: Record<string, string> = {
  Asian: 'Low volatility period',
  London: 'High volatility period',
  'New York': 'Highest volatility period',
};

const explanationMap: Record<string, string> = {
  avg_body: 'Average movement between open and close of each candle.',
  avg_upper_wick: 'Average rejection above candle body. Shows selling pressure at highs.',
  avg_lower_wick: 'Average rejection below candle body. Shows buying pressure at lows.',
  avg_range: 'Average distance from high to low. Measures overall volatility.',
  bullish_open_to_low: 'How far price typically moves down before going up in a bullish candle.',
  bullish_close_to_high: 'How far price typically continues higher after closing in a bullish candle.',
  bearish_open_to_high: 'How far price typically moves up before going down in a bearish candle.',
  bearish_close_to_low: 'How far price typically continues lower after closing in a bearish candle.',
};

const probabilityExplanations: Record<string, string> = {
  bullish_open_to_low: 'Chance price stays within this distance before moving higher.',
  bullish_close_to_high: 'Chance price extends at least this far after candle close.',
  bearish_open_to_high: 'Chance price stays within this distance before moving lower.',
  bearish_close_to_low: 'Chance price extends at least this far after candle close.',
};

const probabilityMetrics = [
  {
    dir: 'bullish' as const,
    metric: 'open_to_low',
    label: 'Open → Low',
    explanation: 'Chance price stays within this distance before moving higher.',
  },
  {
    dir: 'bullish' as const,
    metric: 'close_to_high',
    label: 'Close → High',
    explanation: 'Chance price extends at least this far after candle close.',
  },
  {
    dir: 'bearish' as const,
    metric: 'open_to_high',
    label: 'Open → High',
    explanation: 'Chance price stays within this distance before moving lower.',
  },
  {
    dir: 'bearish' as const,
    metric: 'close_to_low',
    label: 'Close → Low',
    explanation: 'Chance price extends at least this far after candle close.',
  },
];

const guideTiles = [
  { title: 'Smaller Body', text: 'Market is not very active' },
  { title: 'Larger Body', text: 'Market is very active' },
  { title: 'Long Upper Wick', text: 'Price was rejected above' },
  { title: 'Long Lower Wick', text: 'Price was rejected below' },
  { title: 'High Range', text: 'High volatility' },
  { title: 'Low Range', text: 'Low volatility' },
  { title: 'Higher 90% & 95%', text: 'Price can travel further' },
];

function formatNumber(n: number | undefined | null, decimals = 2): string {
  if (n === undefined || n === null) return '—';
  return n.toFixed(decimals);
}

export default function MarketStatistics() {
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('H1');
  const [lookback, setLookback] = useState('1000');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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
      setLastUpdated(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Ensure MT5 is running on the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const unit = results?.basic?.unit || 'pips';
  const totalCandles = results?.lookback || 0;
  const bullishCount = results?.basic?.bullish?.count || 0;
  const bearishCount = results?.basic?.bearish?.count || 0;
  const bullishPct = totalCandles > 0 ? ((bullishCount / totalCandles) * 100) : 0;
  const bearishPct = totalCandles > 0 ? ((bearishCount / totalCandles) * 100) : 0;

  const sessionList = ['Asian', 'London', 'New York'];
  const sessionsData = results ? sessionList.map(s => results.sessions[s]).filter(Boolean) as SessionData[] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-purple-500/20">
              <BarChart4 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-page-title font-bold text-slate-900">Market Statistics</h1>
              <p className="text-body text-slate-500 mt-0.5">Understand market behavior using historical candle data analysis</p>
            </div>
          </div>
          {results && lastUpdated && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-caption text-slate-500">Last updated: {lastUpdated}</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1: Analysis Controls + Analysis Complete / States */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analysis Controls - compact */}
        <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-table-header text-slate-500 uppercase mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Analysis Parameters
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="w-full sm:w-40">
              <label className="block text-caption text-slate-600 mb-1.5">Symbol</label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="h-10 text-button rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-caption text-slate-600 mb-1.5">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="h-10 text-button rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-caption text-slate-600 mb-1.5">Lookback</label>
              <Select value={lookback} onValueChange={setLookback}>
                <SelectTrigger className="h-10 text-button rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {LOOKBACK_PRESETS.map((val) => (
                    <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !symbol}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-button transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Activity className="w-4 h-4" /> Analyze Market</>
              )}
            </button>
          </div>
          {lastUpdated && (
            <p className="text-caption text-slate-400 mt-4 text-center sm:text-left">
              Last Updated: {lastUpdated}
            </p>
          )}
        </div>

        {/* Right column - state dependent */}
        {!results && !isLoading && !error && (
          <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <BarChart4 className="w-7 h-7 text-violet-500" />
            </div>
            <p className="text-heading font-semibold text-slate-700">Ready to Analyze</p>
            <p className="text-caption text-slate-400 mt-1 max-w-xs">
              Select a symbol, timeframe, and candle count, then click <strong>Analyze Market</strong>.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 text-center flex flex-col items-center justify-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 rounded-2xl border-2 border-violet-200 animate-ping opacity-30" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
              </div>
            </div>
            <p className="text-slate-700 font-semibold">Running Analysis...</p>
            <p className="text-caption text-slate-400 mt-1">Fetching {lookback} candles from MT5</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 border-l-4 border-l-rose-400">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-body font-semibold text-rose-800">Analysis Failed</p>
                <p className="text-caption text-rose-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {results && (
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6">
            <div className="flex items-start gap-1 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-caption text-white">
                <CheckCircle className="w-3 h-3" />
                Analysis Complete
              </span>
            </div>
            <h2 className="text-section-title font-bold text-white mb-4">{results.symbol}</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-caption text-emerald-100">Analyzed</p>
                <p className="text-body-lg font-bold text-white">{results.lookback} Candles</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-caption text-emerald-100">Timeframe</p>
                <p className="text-body-lg font-bold text-white">{results.timeframe}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-caption text-emerald-100">Data Quality</p>
                <p className="text-body-lg font-bold text-white flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Excellent
                </p>
              </div>
            </div>
            <p className="text-caption text-emerald-100 mb-4">
              We analyzed {results.lookback} candles and generated trading insights.
            </p>
            <button
              onClick={() => {
                const el = document.getElementById('how-to-read-stats');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 text-caption text-white hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View Guide
            </button>
          </div>
        )}
      </div>

      {/* Results sections */}
      {results && (
        <>
          {/* Summary Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              icon={BarChart4}
              label="Average Body Size"
              value={`${formatNumber(results.basic.avg_body)} ${unit}`}
              explanation={explanationMap.avg_body}
              color="purple"
            />
            <MetricCard
              icon={TrendingUp}
              label="Average Upper Wick"
              value={`${formatNumber(results.basic.avg_upper_wick)} ${unit}`}
              explanation={explanationMap.avg_upper_wick}
              color="orange"
            />
            <MetricCard
              icon={TrendingDown}
              label="Average Lower Wick"
              value={`${formatNumber(results.basic.avg_lower_wick)} ${unit}`}
              explanation={explanationMap.avg_lower_wick}
              color="blue"
            />
            <MetricCard
              icon={Activity}
              label="Average Range"
              value={`${formatNumber(results.basic.avg_range)} ${unit}`}
              explanation={explanationMap.avg_range}
              color="purple"
            />
            <MetricCard
              icon={BarChart4}
              label="Total Candles"
              value={`${totalCandles}`}
              explanation="Total number of candles analyzed in this session."
              color="blue"
            />
            <MetricCard
              icon={CheckCircle}
              label="Data Quality"
              value="Excellent"
              explanation="Data integrity check passed. All candles have valid open, high, low, close values."
              color="green"
            />
          </div>

          {/* Row: Candlestick Breakdown + Session Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Candlestick Breakdown */}
            <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                    <BarChart4 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Candlestick Breakdown</h3>
                    <p className="text-caption text-slate-500">Bullish vs bearish candle analysis</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {/* Bullish Side */}
                <div className="flex-1 p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-sm">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-800">Bullish Candles</p>
                      <p className="text-caption text-emerald-600">
                        {bullishCount} candles ({bullishPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-table-header text-slate-500 uppercase">Count</span>
                      <span className="text-card-title font-bold text-emerald-600">{bullishCount}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-table-header text-slate-500 uppercase">Percentage</span>
                        <span className="text-caption text-slate-700">{bullishPct.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={bullishPct}
                        className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-green-500"
                      />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-caption text-slate-700">Avg Open → Low</span>
                        <InfoTip content={explanationMap.bullish_open_to_low} />
                      </div>
                      <span className="text-table-cell font-bold text-emerald-600 tabular-nums">
                        {formatNumber(results.basic.bullish.open_to_low)} {unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-caption text-slate-700">Avg Close → High</span>
                        <InfoTip content={explanationMap.bullish_close_to_high} />
                      </div>
                      <span className="text-table-cell font-bold text-emerald-600 tabular-nums">
                        {formatNumber(results.basic.bullish.close_to_high)} {unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bearish Side */}
                <div className="flex-1 p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 shadow-sm">
                      <TrendingDown className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-rose-800">Bearish Candles</p>
                      <p className="text-caption text-rose-600">
                        {bearishCount} candles ({bearishPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-table-header text-slate-500 uppercase">Count</span>
                      <span className="text-card-title font-bold text-rose-600">{bearishCount}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-table-header text-slate-500 uppercase">Percentage</span>
                        <span className="text-caption text-slate-700">{bearishPct.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={bearishPct}
                        className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-rose-400 [&>div]:to-red-500"
                      />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-caption text-slate-700">Avg Open → High</span>
                        <InfoTip content={explanationMap.bearish_open_to_high} />
                      </div>
                      <span className="text-table-cell font-bold text-rose-600 tabular-nums">
                        {formatNumber(results.basic.bearish.open_to_high)} {unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-caption text-slate-700">Avg Close → Low</span>
                        <InfoTip content={explanationMap.bearish_close_to_low} />
                      </div>
                      <span className="text-table-cell font-bold text-rose-600 tabular-nums">
                        {formatNumber(results.basic.bearish.close_to_low)} {unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Analysis */}
            <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                    <BarChart4 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Session Analysis</h3>
                    <p className="text-caption text-slate-500">Trading session performance breakdown</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-table-cell">
                  <thead>
                    <tr className="bg-[#F8FAFC]">
                      <th className="px-6 py-3 text-left text-table-header text-muted-foreground uppercase">Session</th>
                      <th className="px-6 py-3 text-left text-table-header text-muted-foreground uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-table-header text-muted-foreground uppercase">Avg Body</th>
                      <th className="px-6 py-3 text-right text-table-header text-muted-foreground uppercase">Avg Range</th>
                      <th className="px-6 py-3 text-center text-table-header text-muted-foreground uppercase">Volatility</th>
                      <th className="px-6 py-3 text-right text-table-header text-muted-foreground uppercase">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessionList.map((session) => {
                      const s = results.sessions[session];
                      const maxRange = Math.max(...sessionsData.map(x => x.avg_range), 1);
                      const activityPct = s ? Math.round((s.avg_range / maxRange) * 100) : 0;
                      const volLevel = s ? getVolatilityLevel(s.avg_range, sessionsData) : 'Medium';
                      return (
                        <tr key={session} className="hover:bg-[#F1F5F9]/60 transition-colors">
                          <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">{session}</td>
                          <td className="px-6 py-4 text-caption text-muted-foreground whitespace-nowrap">{sessionDescriptions[session]}</td>
                          <td className="px-6 py-4 text-right text-foreground font-medium tabular-nums whitespace-nowrap">
                            {s ? `${formatNumber(s.avg_body)} ${unit}` : '—'}
                          </td>
                          <td className="px-6 py-4 text-right text-foreground font-medium tabular-nums whitespace-nowrap">
                            {s ? `${formatNumber(s.avg_range)} ${unit}` : '—'}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <VolatilityBadge level={volLevel} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all"
                                  style={{ width: `${activityPct}%` }}
                                />
                              </div>
                              <span className="text-caption text-muted-foreground w-8 text-right">{activityPct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Row: Day Analysis + Probability Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Day of Week Analysis */}
            <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Day of Week Analysis</h3>
                    <p className="text-caption text-slate-500">How market behavior changes throughout the trading week</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-table-cell">
                  <thead>
                    <tr className="bg-[#F8FAFC]">
                      <th className="px-6 py-3 text-left text-table-header text-muted-foreground uppercase">Day</th>
                      <th className="px-6 py-3 text-right text-table-header text-muted-foreground uppercase">Avg Body</th>
                      <th className="px-6 py-3 text-right text-table-header text-muted-foreground uppercase">Avg Range</th>
                      <th className="px-6 py-3 text-center text-table-header text-muted-foreground uppercase">Best For</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                      const d = results.weekdays[day];
                      const style = d ? getTradingStyle(day, d.avg_range) : 'Range Trading';
                      return (
                        <tr key={day} className="hover:bg-[#F1F5F9]/60 transition-colors">
                          <td className="px-6 py-4 font-semibold text-foreground">{day}</td>
                          <td className="px-6 py-4 text-right text-foreground font-medium tabular-nums">
                            {d ? `${formatNumber(d.avg_body)} ${unit}` : '—'}
                          </td>
                          <td className="px-6 py-4 text-right text-foreground font-medium tabular-nums">
                            {d ? `${formatNumber(d.avg_range)} ${unit}` : '—'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <TradingStyleBadge style={style} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Probability Analysis */}
            <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                    <BarChart4 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Probability Analysis</h3>
                    <p className="text-caption text-slate-500">Price movement probabilities at different confidence levels</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-table-cell">
                  <thead>
                    <tr className="bg-[#F8FAFC]">
                      <th className="px-6 py-3 text-left text-table-header text-muted-foreground uppercase">Direction</th>
                      <th className="px-6 py-3 text-left text-table-header text-muted-foreground uppercase">Metric</th>
                      {[50, 60, 70, 80, 90, 95].map((lvl) => (
                        <th key={lvl} className="px-3 py-3 text-right text-table-header text-muted-foreground uppercase">{lvl}%</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {probabilityMetrics.map((row) => {
                      const data = results.probabilities[row.dir]?.[row.metric];
                      const isBullish = row.dir === 'bullish';
                      const dirColor = isBullish ? 'text-emerald-400' : 'text-rose-400';
                      const dirLabel = isBullish ? 'Bullish' : 'Bearish';
                      return (
                        <tr key={`${row.dir}-${row.metric}`} className="hover:bg-[#F1F5F9]/60 transition-colors">
                          <td className={`px-6 py-4 font-semibold ${dirColor} capitalize`}>{dirLabel}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-foreground font-medium">{row.label}</span>
                              <InfoTip content={row.explanation} />
                            </div>
                          </td>
                          {[50, 60, 70, 80, 90, 95].map((lvl) => (
                            <td key={lvl} className="px-3 py-4 text-right text-foreground font-medium tabular-nums whitespace-nowrap">
                              {data ? `${formatNumber(data[lvl])}` : '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Row: Export + Help */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export Results */}
            <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6">
              <h3 className="text-table-header text-slate-500 uppercase mb-4 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Results
              </h3>
              <div className="flex gap-3">
                {EXPORT_FORMATS.map(({ key, icon: Icon }) => (
                  <a
                    key={key}
                    href={apiService.marketStats.exportUrl(results.symbol, results.timeframe, results.lookback, key.toLowerCase())}
                    download
                    className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl text-caption text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 transition-all duration-200 min-w-[72px]"
                  >
                    <Icon className="w-5 h-5" />
                    <span>{key}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm flex-shrink-0">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Need Help Understanding?</h3>
                  <p className="text-caption text-slate-500 mt-1">Simple guide to read these statistics.</p>
                  <button
                    onClick={() => {
                      const el = document.getElementById('how-to-read-stats');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-caption bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500 transition-all duration-200"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    View Explanation Guide
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* How To Read These Statistics */}
          <div id="how-to-read-stats" className="bg-white rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">How To Read These Statistics</h3>
                  <p className="text-caption text-slate-500">A beginner-friendly guide to understanding candle statistics</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                {guideTiles.map((tile) => (
                  <div
                    key={tile.title}
                    className={`bg-slate-50 rounded-xl p-4 border border-slate-100 ${tile.title === 'Higher 90% & 95%' ? 'sm:col-span-2 lg:col-span-3 xl:col-span-1' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-table-header text-slate-500 uppercase">{tile.title}</span>
                    </div>
                    <p className="text-body text-slate-600">{tile.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
