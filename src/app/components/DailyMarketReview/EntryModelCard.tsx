import { Layers } from 'lucide-react';
import { Badge } from '../ui/badge';

interface EntryModelCardProps {
  name: string;
  type: string;
  status: 'Active' | 'Inactive' | 'Completed';
}

const statusConfig: Record<string, { variant: 'success' | 'secondary' | 'default'; label: string }> = {
  Active: { variant: 'success', label: 'Active' },
  Inactive: { variant: 'secondary', label: 'Inactive' },
  Completed: { variant: 'default', label: 'Completed' },
};

const typeColors: Record<string, string> = {
  'FVG': 'from-blue-500 to-blue-600',
  'OB': 'from-orange-500 to-orange-600',
  'Breaker': 'from-purple-500 to-purple-600',
  'MSS': 'from-emerald-500 to-emerald-600',
  'CHoCH': 'from-rose-500 to-rose-600',
  'Liquidity': 'from-cyan-500 to-cyan-600',
  'Order Block': 'from-amber-500 to-amber-600',
  'Mitigation': 'from-indigo-500 to-indigo-600',
};

export default function EntryModelCard({ name, type, status }: EntryModelCardProps) {
  const statusInfo = statusConfig[status] || statusConfig.Inactive;
  const typeGradient = typeColors[type] || 'from-slate-500 to-slate-600';

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`size-10 rounded-xl bg-gradient-to-br ${typeGradient} flex items-center justify-center shadow-lg`}>
          <Layers className="size-4 text-white" />
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>
      <h3 className="text-body font-semibold text-[#0F172A] mb-1">{name}</h3>
      <p className="text-caption text-[#64748B]">{type}</p>
    </div>
  );
}
