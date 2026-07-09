import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '../ui/badge';

interface TradeIdeaCardProps {
  direction: string;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  reason: string;
  screenshot?: string;
  status: string;
}

const rrBadgeColor = (rr: number) => {
  if (rr >= 3) return 'success';
  if (rr >= 2) return 'default';
  if (rr >= 1) return 'warning';
  return 'secondary';
};

export default function TradeIdeaCard({ direction, entry, sl, tp, rr, reason, screenshot, status }: TradeIdeaCardProps) {
  const isLong = direction === 'Long';

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`size-9 rounded-xl flex items-center justify-center ${
            isLong ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}>
            {isLong ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          </div>
          <div>
            <span className={`text-body font-semibold ${
              isLong ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {direction}
            </span>
            {status && (
              <p className="text-caption text-[#94A3B8]">{status}</p>
            )}
          </div>
        </div>
        <Badge variant={rrBadgeColor(rr)} className="text-xs font-bold">
          R:{rr.toFixed(2)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E5EAF2]">
          <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">Entry</span>
          <p className="text-body font-bold text-[#0F172A] mt-0.5">{entry.toFixed(5)}</p>
        </div>
        <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E5EAF2]">
          <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">SL</span>
          <p className="text-body font-bold text-red-600 mt-0.5">{sl.toFixed(5)}</p>
        </div>
        <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E5EAF2]">
          <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">TP</span>
          <p className="text-body font-bold text-emerald-600 mt-0.5">{tp.toFixed(5)}</p>
        </div>
      </div>

      {reason && (
        <p className="text-body-sm text-[#64748B] leading-relaxed mb-4">{reason}</p>
      )}

      {screenshot && (
        <div className="rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E5EAF2]">
          <img
            src={screenshot}
            alt="Trade idea chart"
            className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
    </div>
  );
}
