import { useState } from 'react';
import { Calculator, Copy, Check, DollarSign, TrendingUp, ShieldAlert, Target, BarChart4, Table2 } from 'lucide-react';
import { PageHeader } from './ui/DesignSystem';

const RISK_AMOUNTS = [125, 250, 500];

const QUICK_REFERENCE_SL = [50, 75, 100, 125, 150, 200, 250, 300, 400, 500];

const SL_EXAMPLES = [150, 200, 250, 300, 150.5, 175.25];

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

export default function XauusdCalculator() {
  const [riskInput, setRiskInput] = useState<string>('125');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const riskAmount = parseFloat(riskInput) || 0;
  const slPoints = parseFloat(stopLoss) || 0;
  const lotSize = slPoints > 0 ? riskAmount / slPoints : 0;
  const displayLot = lotSize > 0 ? lotSize.toFixed(2) : '—';

  const riskError = riskInput.length > 0 && (riskAmount < 1 || riskAmount > 100000)
    ? 'Risk amount must be between $1 and $100,000'
    : '';

  const handleCopy = async () => {
    const text = `Risk: $${riskAmount}\nSL: ${slPoints}\nLot: ${displayLot}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="XAUUSD Lot Size Calculator"
        subtitle="Calculate lot size instantly based on risk amount and stop loss points."
        icon={Calculator}
        color="blue"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
              Calculator
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Risk Amount ($)
                </label>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {RISK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setRiskInput(String(amount))}
                      className={`flex-1 min-w-[80px] px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 ${
                        riskInput === String(amount)
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
                {riskError && (
                  <p className="text-xs text-red-500 mt-1">{riskError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Stop Loss Points
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={stopLoss}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setStopLoss(val);
                    }
                  }}
                  placeholder="e.g. 150, 200, 250"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {SL_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setStopLoss(String(ex))}
                      className="px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {lotSize > 0 && (
            <>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 p-8 text-center">
                <p className="text-sm font-medium text-blue-100 mb-1">Recommended Lot Size</p>
                <p className="text-5xl font-bold text-white mb-3">{displayLot} <span className="text-2xl font-medium text-blue-200">Lots</span></p>
                <div className="flex items-center justify-center gap-6 text-sm text-blue-100">
                  <span>Risk: ${riskAmount}</span>
                  <span className="w-1 h-1 rounded-full bg-blue-300" />
                  <span>SL: {slPoints} Points</span>
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                {copied ? (
                  <><Check className="w-4 h-4 text-emerald-500" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Result</>
                )}
              </button>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Profit Preview
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {RR_RATIOS.map((rr, i) => {
                    const profit = riskAmount * rr.multiplier;
                    const color = RR_COLORS[i];
                    const Icon = color.icon;
                    return (
                      <div key={rr.label} className={`${color.bg} ${color.border} border rounded-xl p-4 text-center`}>
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6 sticky top-24">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              Quick Reference
            </h3>
            <p className="text-xs text-slate-400 mb-4">When Risk = ${riskAmount}</p>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SL</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Lot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {QUICK_REFERENCE_SL.map((sl) => {
                    const lot = riskAmount / sl;
                    return (
                      <tr
                        key={sl}
                        className={`hover:bg-slate-50 transition-colors ${
                          sl === slPoints ? 'bg-blue-50 font-semibold' : ''
                        }`}
                      >
                        <td className="px-4 py-2 text-slate-700">{sl}</td>
                        <td className="px-4 py-2 text-right text-slate-900 tabular-nums">{lot.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  This calculator is for XAUUSD only. Always verify with your broker's specifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
