import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface AccountPerformanceChartProps {
  accountPerformance: { name: string; pl: number }[];
}

export default function AccountPerformanceChart({ accountPerformance }: AccountPerformanceChartProps) {
  return (
    <div className="glass-panel rounded-[20px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
          <BarChart3 className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-body font-semibold text-white/90">Account Performance</h3>
        <p className="text-micro text-white/40 ml-1">P/L by account</p>
      </div>

      <div className="h-[160px]">
        {accountPerformance.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accountPerformance} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <RechartsTooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'P/L']}
              />
              <Bar dataKey="pl" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {accountPerformance.map((entry, index) => (
                  <Cell key={index} fill={entry.pl >= 0 ? '#16A34A' : '#DC2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-body-sm text-white/40">No account data available</div>
        )}
      </div>
    </div>
  );
}
