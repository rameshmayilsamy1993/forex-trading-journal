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
        <h3 className="text-body font-semibold text-[#0F172A]">Equity Curve</h3>
        <p className="text-micro text-[#94A3B8] ml-1">Portfolio growth over time</p>
      </div>

      <div className="h-[160px]">
        {equityCurve.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurve} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGlassGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15,23,42,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(15,23,42,0.4)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(15,23,42,0.4)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <RechartsTooltip
                contentStyle={{
                  background: '#FFFFFF',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  color: '#0F172A',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']}
              />
              <Area type="monotone" dataKey="balance" stroke="#7C3AED" strokeWidth={2} fill="url(#equityGlassGradient)" dot={false} activeDot={{ r: 3, fill: '#7C3AED', stroke: '#FFFFFF', strokeWidth: 1.5 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-body-sm text-[#94A3B8]">Not enough data for equity curve</div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-[#F1F5F9] p-2">
        {[
          { label: 'Highest', value: getEquityStats.highest, color: 'text-emerald-600' },
          { label: 'Lowest', value: getEquityStats.lowest, color: 'text-rose-600' },
          { label: 'Start', value: getEquityStats.start, color: 'text-[#334155]' },
          { label: 'Current', value: getEquityStats.current, color: 'text-[#7C3AED]' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-micro text-[#64748B]">{stat.label}</p>
            <p className={`text-body-sm font-semibold tabular-nums ${stat.color}`}>${stat.value.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
