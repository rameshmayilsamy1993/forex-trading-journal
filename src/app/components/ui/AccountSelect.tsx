import { useMemo } from 'react';
import { TradingAccount, AccountStatus } from '../../types/trading';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
import { Badge } from './badge';
import { PropFirm } from '../../types/trading';

interface AccountSelectProps {
  accounts: TradingAccount[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showAllAccounts?: boolean;
}

const STATUS_CONFIG: Record<AccountStatus, { color: string; bgColor: string; label: string }> = {
  ACTIVE: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Active' },
  BREACHED: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Breached' },
  PASSED_1: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Passed P1' },
  PASSED_2: { color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Passed P2' },
  FUNDED: { color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Funded' },
  DISABLED: { color: 'text-slate-500', bgColor: 'bg-slate-100', label: 'Disabled' },
};

function getPropFirmName(propFirmId: string | PropFirm | undefined): string {
  if (!propFirmId) return '';
  if (typeof propFirmId === 'object' && propFirmId.name) {
    return propFirmId.name;
  }
  return '';
}

function formatAccountLabel(account: TradingAccount): string {
  const firmName = getPropFirmName(account.propFirmId);
  if (firmName) {
    return `${account.name} — ${firmName}`;
  }
  return account.name;
}

export default function AccountSelect({
  accounts,
  value,
  onValueChange,
  placeholder = 'Select Account',
  disabled = false,
  className = '',
  showAllAccounts = false,
}: AccountSelectProps) {
  const { activeAccounts, nonActiveAccounts } = useMemo(() => {
    const active = accounts.filter(a => a.isActive);
    const nonActive = accounts.filter(a => !a.isActive);
    return { activeAccounts: active, nonActiveAccounts: nonActive };
  }, [accounts]);

  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.id === value);
  }, [accounts, value]);

  const handleValueChange = (newValue: string) => {
    const selected = accounts.find(a => a.id === newValue);
    if (selected && !selected.canTrade) {
      alert('This account is not active for trading.');
      return;
    }
    onValueChange(newValue);
  };

  const renderAccountItem = (account: TradingAccount, isDisabled: boolean = false) => {
    const config = STATUS_CONFIG[account.status];
    const accountLabel = formatAccountLabel(account);

    return (
      <SelectItem
        key={account.id}
        value={account.id}
        disabled={isDisabled}
        className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      >
        <div className="flex items-center gap-2 py-1">
          <span className={`w-2 h-2 rounded-full ${config.bgColor} ${account.status === 'DISABLED' ? 'bg-slate-300' : ''}`} />
          <span className={isDisabled ? 'line-through text-slate-400' : ''}>
            {accountLabel}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${config.bgColor} ${config.color} border-0`}
          >
            {account.status === 'BREACHED' || account.status === 'DISABLED'
              ? `${config.label} - Unavailable`
              : config.label}
          </Badge>
        </div>
      </SelectItem>
    );
  };

  const renderTriggerContent = () => {
    if (!selectedAccount) {
      return placeholder;
    }
    const config = STATUS_CONFIG[selectedAccount.status];
    const accountLabel = formatAccountLabel(selectedAccount);
    
    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.bgColor}`} />
        <span className={selectedAccount.canTrade ? '' : 'line-through text-slate-400'}>
          {accountLabel}
        </span>
        {!selectedAccount.canTrade && (
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${config.bgColor} ${config.color} border-0`}
          >
            Unavailable
          </Badge>
        )}
      </div>
    );
  };

  if (accounts.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No accounts available" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        {renderTriggerContent()}
      </SelectTrigger>
      <SelectContent>
        {showAllAccounts ? (
          <>
            {accounts.map(account => renderAccountItem(account, !account.canTrade))}
          </>
        ) : (
          <>
            {activeAccounts.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs font-semibold text-green-600 px-2">
                  Active Accounts
                </SelectLabel>
                {activeAccounts.map(account => renderAccountItem(account, false))}
              </SelectGroup>
            )}

            {nonActiveAccounts.length > 0 && (
              <SelectGroup>
                {activeAccounts.length > 0 && <SelectSeparator />}
                <SelectLabel className="text-xs font-semibold text-slate-400 px-2">
                  Archived / Non-Active Accounts
                </SelectLabel>
                {nonActiveAccounts.map(account => renderAccountItem(account, true))}
              </SelectGroup>
            )}
          </>
        )}
      </SelectContent>
    </Select>
  );
}