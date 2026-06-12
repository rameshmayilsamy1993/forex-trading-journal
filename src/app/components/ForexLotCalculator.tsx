import { useState, useMemo } from 'react';
import { Calculator, Copy, Check, DollarSign, TrendingUp, Target, BarChart4, ShieldAlert, Table2 } from 'lucide-react';
import { PageHeader } from './ui/DesignSystem';

interface PairConfig {
  label: string;
  dollarPerPip: number;
}

const PAIRS: PairConfig[] = [
  { label: 'EURUSD', dollarPerPip: 10 },
  { label: 'GBPUSD', dollarPerPip: 10 },
  { label: 'AUDUSD', dollarPerPip: 10 },
  { label: 'USDJPY', dollarPerPip: 10 },
  { label: 'USDCHF', dollarPerPip: 10 },
  { label: 'USDCAD', dollarPerPip: 10 },
];

const RISK_AMOUNTS = [50, 100, 125, 200, 250, 500, 1000];

const QUICK_REFERENCE_SL = [2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30];

const RR_RATIOS = [
  { label: '1:1', multiplier: 1 },
  { label: '1:2', multiplier: 2 },
  { label: '1:3', multiplier: 3 },
  { label: '1:5', multiplier: 5 },
];

const RR_COLORS = [
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: Target },
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: TrendingUp },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: BarChart4 },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: TrendingUp },
];

export default function ForexLotCalculator() {
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [riskInput, setRiskInput] = useState<string>('125');
  const [stopLoss, setStopLoss] = useState('');
  const [copied, setCopied] = useState(false);

  const pairConfig = useMemo(() => PAIRS.find(p => p.label === selectedPair)!, [selectedPair]);

  const riskAmount = parseFloat(riskInput) || 0;
  const slPips = parseFloat(stopLoss) || 0;
  const dollarPerPip = pairConfig.dollarPerPip;
  const lotSize = slPips > 0 ? riskAmount / (slPips * dollarPerPip) : 0;
  const displayLot = lotSize > 0 ? lotSize.toFixed(2) : '—';

  const riskError = riskInput.length > 0 && (riskAmount < 1 || riskAmount > 100000)
    ? 'Risk amount must be between $1 and $100,000'
    : '';

  const handleCopy = async () => {
    const text = `Pair: ${selectedPair}\nRisk: $${riskAmount}\nSL: ${slPips} Pips\nLot Size: ${displayLot}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStopLossChange = (value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setStopLoss(value);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Forex Lot Size Calculator"
        subtitle="Calculate the correct lot size based on risk and stop loss."
        icon={Calculator}
        color="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/60 p-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5">
              Calculator
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Currency Pair
                </label>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                >
                  {PAIRS.map((pair) => (
                    <option key={pair.label} value={pair.label}>{pair.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Risk Amount ($)
                </label>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {RISK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setRiskInput(String(amount))}
                      className={`flex-1 min-w-[80px] px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 ${
                        riskInput === String(amount)
                          ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={riskInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setRiskInput(val);
                    }
                  }}
                  placeholder="Enter any risk amount"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
                {riskError && (
                  <p className="text-xs text-red-500 mt-1">{riskError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Stop Loss (Pips)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={stopLoss}
                  onChange={(e) => handleStopLossChange(e.target.value)}
                  placeholder="e.g. 10, 12.5, 7.5"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  required
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[5, 10, 15, 20, 30].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setStopLoss(String(ex))}
                      className="px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                {slPips <= 0 && stopLoss !== '' && (
                  <p className="text-xs text-red-500 mt-1.5">Stop loss must be greater than 0</p>
                )}
              </div>
            </div>
          </div>

          {lotSize > 0 && (
            <>
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/25 p-8 text-center">
                <p className="text-sm font-medium text-indigo-100 mb-1">Recommended Lot Size</p>
                <p className="text-5xl font-bold text-white mb-3">
                  {displayLot} <span className="text-2xl font-medium text-indigo-200">Lots</span>
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-indigo-100 flex-wrap">
                  <span>Pair: {selectedPair}</span>
                  <span className="w-1 h-1 rounded-full bg-indigo-300" />
                  <span>Risk: ${riskAmount}</span>
                  <span className="w-1 h-1 rounded-full bg-indigo-300" />
                  <span>SL: {slPips} Pips</span>
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                {copied ? (
                  <><Check className="w-4 h-4 text-emerald-500" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Result</>
                )}
              </button>

              <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/60 p-6">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Profit Preview
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {RR_RATIOS.map((rr, i) => {
                    const profit = riskAmount * rr.multiplier;
                    const color = RR_COLORS[i];
                    const Icon = color.icon;
                    return (
                      <div key={rr.label} className={`${color.bg} ${color.border} border rounded-xl p-4 text-center dark:opacity-90`}>
                        <Icon className={`w-5 h-5 ${color.text} mx-auto mb-2`} />
                        <p className={`text-lg font-bold ${color.text}`}>${profit.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{rr.label} R:R</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/60 p-6 sticky top-24">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              Quick Reference
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              When Risk = ${riskAmount} &amp; Pair = {selectedPair}
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SL Pips</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lot Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {QUICK_REFERENCE_SL.map((sl) => {
                    const lot = riskAmount / (sl * dollarPerPip);
                    return (
                      <tr
                        key={sl}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                          Math.abs(sl - slPips) < 0.01 ? 'bg-indigo-50 dark:bg-indigo-900/20 font-semibold' : ''
                        }`}
                      >
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{sl.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right text-slate-900 dark:text-slate-100 tabular-nums">
                          {lot > 0 ? lot.toFixed(2) : '0.00'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Pip values vary by currency pair and broker. Always verify with your broker's specifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
