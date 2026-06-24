import { X, Check, Calendar as CalendarIcon, Image as ImageIcon, ClipboardCheck, Link2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import TimePicker from './ui/TimePicker';
import FormField from './ui/FormField';
import AccountSelect from './ui/AccountSelect';
import { format } from 'date-fns';
import { cn } from './ui/utils';
import { TradingAccount, MasterData, TradingSession, SMTType, Model1Type } from '../types/trading';

interface TradeFormProps {
  formData: {
    accountId: string;
    pair: string;
    type: 'BUY' | 'SELL';
    status: 'OPEN' | 'CLOSED';
    entryPrice: string;
    exitPrice: string;
    lotSize: string;
    entryDate: string;
    entryTime: string;
    exitDate: string;
    exitTime: string;
    stopLoss: string;
    takeProfit: string;
    profit: string;
    commission: string;
    swap: string;
    notes: string;
    session: TradingSession | '';
    strategy: string;
    keyLevel: string;
    highLowTime: string;
    smt: SMTType;
    model1: Model1Type;
    beforeScreenshot: string;
    afterScreenshot: string;
    checklistId: string;
    checklistSession: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    accountId: string;
    pair: string;
    type: 'BUY' | 'SELL';
    status: 'OPEN' | 'CLOSED';
    entryPrice: string;
    exitPrice: string;
    lotSize: string;
    entryDate: string;
    entryTime: string;
    exitDate: string;
    exitTime: string;
    stopLoss: string;
    takeProfit: string;
    profit: string;
    commission: string;
    swap: string;
    notes: string;
    session: TradingSession | '';
    strategy: string;
    keyLevel: string;
    highLowTime: string;
    smt: SMTType;
    model1: Model1Type;
    beforeScreenshot: string;
    afterScreenshot: string;
    checklistId: string;
    checklistSession: string;
  }>>;
  accounts: TradingAccount[];
  pairs: string[];
  strategies: MasterData[];
  keyLevels: MasterData[];
  sessions: MasterData[];
  calculatedRR: number | null;
  calculatedCommission: number;
  calculatedRealPL: number;
  uploadingImage: string | null;
  editingId: string | null;
  editingChecklistSession?: string;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'beforeScreenshot' | 'afterScreenshot') => void;
  onEditChecklistClick: () => void;
}

export default function TradeForm({
  formData,
  setFormData,
  accounts,
  pairs,
  strategies,
  keyLevels,
  sessions,
  calculatedRR,
  calculatedCommission,
  calculatedRealPL,
  uploadingImage,
  editingId,
  editingChecklistSession,
  onSave,
  onCancel,
  onFileUpload,
  onEditChecklistClick,
}: TradeFormProps) {
  const isEditMode = !!editingId;
  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">
          {editingId ? 'Edit Trade' : 'New Trade'}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <FormField label="Account" required>
          <AccountSelect
            accounts={accounts}
            value={formData.accountId}
            onValueChange={value => setFormData({ ...formData, accountId: value })}
            placeholder="Select Account"
            className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors"
          />
        </FormField>

        <FormField label="Pair" required>
          <Select value={formData.pair} onValueChange={value => setFormData({ ...formData, pair: value })}>
            <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue placeholder="Select Pair" />
            </SelectTrigger>
            <SelectContent>
              {pairs.length > 0 ? (
                pairs.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))
              ) : (
                <SelectItem value="EURUSD">EURUSD</SelectItem>
              )}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Type" required>
          <Select value={formData.type} onValueChange={value => setFormData({ ...formData, type: value as 'BUY' | 'SELL' })}>
            <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY">BUY</SelectItem>
              <SelectItem value="SELL">SELL</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Entry Price" required>
          <Input
            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            type="number"
            placeholder="1.0850"
            value={formData.entryPrice}
            onChange={e => setFormData({ ...formData, entryPrice: e.target.value })}
            step="0.00001"
          />
        </FormField>

        <FormField label="Entry Date" required>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-10 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors",
                  !formData.entryDate && "text-slate-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.entryDate ? (
                  <span>{format(new Date(formData.entryDate + 'T00:00:00'), "MMM dd, yyyy")}</span>
                ) : (
                  <span>Select date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.entryDate ? new Date(formData.entryDate + 'T00:00:00') : undefined}
                onSelect={(date) => {
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setFormData({ ...formData, entryDate: `${year}-${month}-${day}` });
                  } else {
                    setFormData({ ...formData, entryDate: '' });
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </FormField>

        <FormField label="Entry Time">
          <TimePicker
            value={formData.entryTime || ''}
            onChange={(val) => setFormData({ ...formData, entryTime: val })}
          />
        </FormField>

        <FormField label="Lot Size" required>
          <Input
            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            type="number"
            placeholder="0.10"
            value={formData.lotSize}
            onChange={e => setFormData({ ...formData, lotSize: e.target.value })}
            step="0.01"
          />
        </FormField>

        <FormField label="Commission">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <Input
              className="bg-slate-50 border-slate-200 focus:bg-white transition-colors pl-7"
              type="number"
              placeholder={calculatedCommission.toString()}
              value={formData.commission}
              onChange={e => setFormData({ ...formData, commission: e.target.value })}
              step="0.01"
              title="Auto-calculated: $5 per lot. Edit to override."
            />
          </div>
        </FormField>

        <FormField label="Swap">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <Input
              className="bg-slate-50 border-slate-200 focus:bg-white transition-colors pl-7"
              type="number"
              placeholder="0.00"
              value={formData.swap}
              onChange={e => setFormData({ ...formData, swap: e.target.value })}
              step="0.01"
            />
          </div>
        </FormField>

        <FormField label="Real Profit/Loss">
          <div className={`h-10 px-3 flex items-center bg-gray-100 rounded-md border font-semibold ${calculatedRealPL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
            {calculatedRealPL >= 0 ? '+' : ''}${calculatedRealPL.toFixed(2)}
          </div>
        </FormField>

        <FormField label="Stop Loss">
          <Input
            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            type="number"
            placeholder="1.0820"
            value={formData.stopLoss}
            onChange={e => setFormData({ ...formData, stopLoss: e.target.value })}
            step="0.00001"
          />
        </FormField>

        <FormField label="Take Profit">
          <Input
            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            type="number"
            placeholder="1.0950"
            value={formData.takeProfit}
            onChange={e => setFormData({ ...formData, takeProfit: e.target.value })}
            step="0.00001"
          />
        </FormField>

        {calculatedRR && (
          <div className="col-span-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <span className="text-sm text-blue-900">
              Risk/Reward Ratio: <span className="font-bold text-blue-600">1:{calculatedRR.toFixed(2)}</span>
            </span>
          </div>
        )}

        <FormField label="Session">
          <Select value={formData.session} onValueChange={value => setFormData({ ...formData, session: value as TradingSession })}>
            <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue placeholder="Select Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(session => (
                <SelectItem key={session.id} value={session.name}>{session.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Strategy">
          <Select value={formData.strategy} onValueChange={value => setFormData({ ...formData, strategy: value })}>
            <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue placeholder="Select Strategy" />
            </SelectTrigger>
            <SelectContent>
              {strategies.map(strategy => (
                <SelectItem key={strategy.id} value={strategy.name}>{strategy.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Key Level">
          <Select value={formData.keyLevel} onValueChange={value => setFormData({ ...formData, keyLevel: value })}>
            <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue placeholder="Select Key Level" />
            </SelectTrigger>
            <SelectContent>
              {keyLevels.map(level => (
                <SelectItem key={level.id} value={level.name}>{level.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="SMT">
          <Select value={formData.smt} onValueChange={value => setFormData({ ...formData, smt: value as SMTType })}>
            <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="No">No</SelectItem>
              <SelectItem value="Yes with GBPUSD">Yes with GBPUSD</SelectItem>
              <SelectItem value="Yes with EURUSD">Yes with EURUSD</SelectItem>
              <SelectItem value="Yes with DXY">Yes with DXY</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Model #1">
          <Select value={formData.model1} onValueChange={value => setFormData({ ...formData, model1: value as Model1Type })}>
            <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes (Both EUR and GBP)">Yes (Both EUR and GBP)</SelectItem>
              <SelectItem value="Yes (EUR)">Yes (EUR)</SelectItem>
              <SelectItem value="Yes (GBP)">Yes (GBP)</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="High/Low Time">
          <TimePicker
            value={formData.highLowTime || ''}
            onChange={(val) => setFormData({ ...formData, highLowTime: val })}
          />
        </FormField>

        <FormField label="Status" required>
          <Select value={formData.status} onValueChange={value => setFormData({ ...formData, status: value as 'OPEN' | 'CLOSED' })}>
            <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">OPEN</SelectItem>
              <SelectItem value="CLOSED">CLOSED</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Profit/Loss">
          <Input
            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            type="number"
            placeholder="+100.00"
            value={formData.profit}
            onChange={e => setFormData({ ...formData, profit: e.target.value })}
            step="0.01"
          />
        </FormField>

        {formData.status === 'CLOSED' ? (
          <>
            <FormField label="Exit Price" required>
              <Input
                className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                type="number"
                placeholder="1.0900"
                value={formData.exitPrice}
                onChange={e => setFormData({ ...formData, exitPrice: e.target.value })}
                step="0.00001"
              />
            </FormField>

            <FormField label="Exit Date" required>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors",
                      !formData.exitDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.exitDate ? (
                      <span>{format(new Date(formData.exitDate + 'T00:00:00'), "MMM dd, yyyy")}</span>
                    ) : (
                      <span>Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.exitDate ? new Date(formData.exitDate + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setFormData({ ...formData, exitDate: `${year}-${month}-${day}` });
                      } else {
                        setFormData({ ...formData, exitDate: '' });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </FormField>

            <FormField label="Exit Time">
              <TimePicker
                value={formData.exitTime || ''}
                onChange={(val) => setFormData({ ...formData, exitTime: val })}
              />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Exit Price">
              <Input
                className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                type="number"
                placeholder="1.0900"
                value={formData.exitPrice}
                onChange={e => setFormData({ ...formData, exitPrice: e.target.value })}
                step="0.00001"
              />
            </FormField>

            <FormField label="Exit Date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors",
                      !formData.exitDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.exitDate ? (
                      <span>{format(new Date(formData.exitDate + 'T00:00:00'), "MMM dd, yyyy")}</span>
                    ) : (
                      <span>Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.exitDate ? new Date(formData.exitDate + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setFormData({ ...formData, exitDate: `${year}-${month}-${day}` });
                      } else {
                        setFormData({ ...formData, exitDate: '' });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </FormField>

            <FormField label="Exit Time">
              <TimePicker
                value={formData.exitTime || ''}
                onChange={(val) => setFormData({ ...formData, exitTime: val })}
              />
            </FormField>
            <p className="text-sm text-gray-500 col-span-3">
              Exit details will be filled when trade is closed
            </p>
          </>
        )}

        <div className="col-span-3 grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Before Screenshot
            </label>
            <div className="modern-file-upload group relative">
              <input
                type="file"
                accept="image/*"
                onChange={e => onFileUpload(e, 'beforeScreenshot')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={uploadingImage === 'beforeScreenshot'}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                {uploadingImage === 'beforeScreenshot' ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                ) : (
                  <>
                    <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                      <ImageIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                    </div>
                    <p className="text-xs text-gray-400">PNG, JPG or WEBP</p>
                  </>
                )}
              </div>
            </div>
            {formData.beforeScreenshot && (
              <div className="relative mt-2 inline-block">
                <img src={formData.beforeScreenshot} alt="Before" className="h-24 rounded-lg border-2 border-blue-100 object-cover" />
                <button
                  onClick={() => setFormData({ ...formData, beforeScreenshot: '' })}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              After Screenshot
            </label>
            <div className="modern-file-upload group relative">
              <input
                type="file"
                accept="image/*"
                onChange={e => onFileUpload(e, 'afterScreenshot')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={uploadingImage === 'afterScreenshot'}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                {uploadingImage === 'afterScreenshot' ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                ) : (
                  <>
                    <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                      <ImageIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                    </div>
                    <p className="text-xs text-gray-400">PNG, JPG or WEBP</p>
                  </>
                )}
              </div>
            </div>
            {formData.afterScreenshot && (
              <div className="relative mt-2 inline-block">
                <img src={formData.afterScreenshot} alt="After" className="h-24 rounded-lg border-2 border-blue-100 object-cover" />
                <button
                  onClick={() => setFormData({ ...formData, afterScreenshot: '' })}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-3">
          <FormField label="Notes">
            <textarea
              placeholder="Add trade notes..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </FormField>
        </div>
      </div>
      <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
        {isEditMode && editingChecklistSession && (
          <span className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl flex items-center gap-2 text-sm font-medium border border-blue-200">
            <ClipboardCheck className="w-4 h-4" />
            Linked: {editingChecklistSession}
          </span>
        )}
        {isEditMode && (
          <button
            onClick={onEditChecklistClick}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 flex items-center gap-2 text-sm font-medium transition-all duration-200"
          >
            <Link2 className="w-4 h-4" />
            Change Checklist
          </button>
        )}

        <button
          onClick={onSave}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 flex items-center gap-2 text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5"
        >
          <Check className="w-4 h-4" />
          {editingId ? 'Update Trade' : 'Save Trade'}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 flex items-center gap-2 text-sm font-medium transition-all duration-200"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}
