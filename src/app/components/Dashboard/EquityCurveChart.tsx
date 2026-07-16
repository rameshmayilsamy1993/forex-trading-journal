import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface EquityCurveChartProps {
  equityCurve: { date: string; balance: number }[];
  getEquityStats: { highest: number; lowest: number; start: number; current: number };
}

export default function EquityCurveChart({ equityCurve, getEquityStats }: EquityCurveChartProps) {
  return (
    <div className="glass-panel rounded-[20px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
          <TrendingUp className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-body font-semibold text-white/90">Equity Curve</h3>
        <p className="text-micro text-white/40 ml-1">Portfolio growth over time</p>
      </div>

      <div className="h-[160px]">
        {equityCurve.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurve} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGlassGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <RechartsTooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']}
              />
              <Area type="monotone" dataKey="balance" stroke="#7C3AED" strokeWidth={2} fill="url(#equityGlassGradient)" dot={false} activeDot={{ r: 3, fill: '#7C3AED', stroke: 'rgba(255,255,255,0.8)', strokeWidth: 1.5 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-body-sm text-white/40">Not enough data for equity curve</div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-2">
        {[
          { label: 'Highest', value: getEquityStats.highest, color: 'text-emerald-400' },
          { label: 'Lowest', value: getEquityStats.lowest, color: 'text-rose-400' },
          { label: 'Start', value: getEquityStats.start, color: 'text-white/70' },
          { label: 'Current', value: getEquityStats.current, color: 'text-[#7C3AED]' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-micro text-white/40">{stat.label}</p>
            <p className={`text-body-sm font-semibold tabular-nums ${stat.color}`}>${stat.value.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
