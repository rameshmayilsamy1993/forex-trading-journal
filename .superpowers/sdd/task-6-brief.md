### Task 6: Mobile Trade Cards

**Files:**
- Modify: `src/app/components/TradeCard.tsx` (replace stub)
- Modify: `src/app/components/TradeTable.tsx` (add mobile rendering)

- [ ] **Step 1: Implement TradeCard**

Replace `src/app/components/TradeCard.tsx`:

```typescript
import { Edit2, Trash2, Eye, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { Trade, TradingAccount } from '../types/trading';
import { getLocalDateString } from '../utils/dateUtils';
import { formatPrice, formatMoney } from '../utils/calculations';

interface TradeCardProps {
  trade: Trade;
  accounts: TradingAccount[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onView: (trade: Trade) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getAccountName(trade: Trade, accounts: TradingAccount[]): string {
  return accounts.find(a => a.id === trade.accountId)?.name || 'Unknown';
}

export default function TradeCard({ trade, accounts, onEdit, onDelete, onView, isSelected, onSelect }: TradeCardProps) {
  const realPL = trade.realPL ?? trade.profit ?? 0;
  return (
    <div className={`bg-white rounded-xl border p-4 space-y-3 transition-all ${isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(trade.id)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="font-semibold text-slate-900">{trade.pair}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            trade.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {trade.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trade.type}
          </span>
        </div>
        <span className={`font-bold text-sm ${realPL > 0 ? 'text-emerald-600' : realPL < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
          {formatMoney(realPL, true)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div><span className="block text-slate-400">Account</span><span className="font-medium text-slate-700">{getAccountName(trade, accounts)}</span></div>
        <div><span className="block text-slate-400">Lot Size</span><span className="font-medium text-slate-700">{trade.lotSize}</span></div>
        <div><span className="block text-slate-400">Entry</span><span className="font-medium text-slate-700 font-mono">{trade.entryPrice ? formatPrice(trade.entryPrice, trade.pair) : '-'}</span></div>
        <div><span className="block text-slate-400">Exit</span><span className="font-medium text-slate-700 font-mono">{trade.exitPrice ? formatPrice(trade.exitPrice, trade.pair) : '-'}</span></div>
        <div><span className="block text-slate-400">Date</span><span className="font-medium text-slate-700">{getLocalDateString(trade.entryDate)}</span></div>
        <div>
          <span className="block text-slate-400">Checklist</span>
          <span className="font-medium text-slate-700">
            {(trade as any).checklistId ? (
              <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="w-3 h-3" /> Linked</span>
            ) : '—'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button onClick={() => onView(trade)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
        <button onClick={() => onEdit(trade)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => onDelete(trade.id)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add mobile card section to TradeTable**

In `TradeTable.tsx`, add before the desktop table:

```tsx
{/* Mobile Cards */}
<div className="block md:hidden space-y-3">
  {trades.length === 0 ? (
    <div className="text-center py-8 text-slate-400">No trades found</div>
  ) : (
    trades.map(trade => (
      <TradeCard key={trade.id} trade={trade} accounts={accounts}
        onEdit={onEdit} onDelete={onDelete} onView={onView}
        isSelected={selectedTrades.includes(trade.id)} onSelect={onToggleSelect} />
    ))
  )}
</div>

{/* Desktop Table — wrap existing table in hidden md:block */}
<div className="hidden md:block">
  {/* existing table code */}
</div>
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/components/TradeCard.tsx src/app/components/TradeTable.tsx
git commit -m "feat: add mobile-responsive trade cards for <768px viewport"
```
