import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Calendar, Loader2 } from 'lucide-react';
import { cn } from './ui/utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

type ExportPeriod = 'daily' | 'weekly' | 'monthly' | 'all';
type ExportType = 'trades' | 'missed-trades';

interface ExportMenuProps {
  type?: ExportType;
  accountId?: string;
  firmId?: string;
  className?: string;
}

export default function ExportMenu({ type = 'trades', accountId, firmId, className }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingPeriod, setExportingPeriod] = useState<ExportPeriod | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportReport = async (period: ExportPeriod) => {
    setIsExporting(true);
    setExportingPeriod(period);
    
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (accountId) params.append('accountId', accountId);
      if (firmId) params.append('firmId', firmId);

      const endpoint = type === 'missed-trades' ? 'reports/missed-trades' : 'reports/trades';
      const response = await fetch(`${API_BASE_URL}/${endpoint}?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Export failed' }));
        throw new Error(error.message || 'Export failed');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${type === 'missed-trades' ? 'missed' : 'trade'}-journal-${period}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1].replace('.docx', '');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      alert(error instanceof Error ? error.message : 'Failed to export report');
    } finally {
      setIsExporting(false);
      setExportingPeriod(null);
    }
  };

  const periods = [
    { value: 'daily' as ExportPeriod, label: 'Daily', icon: Calendar, description: 'Today\'s trades' },
    { value: 'weekly' as ExportPeriod, label: 'Weekly', icon: FileText, description: 'This week' },
    { value: 'monthly' as ExportPeriod, label: 'Monthly', icon: FileText, description: 'This month' },
    { value: 'all' as ExportPeriod, label: 'All Trades', icon: Download, description: 'Export everything' },
  ];

  const title = type === 'missed-trades' ? 'Export Missed Trades' : 'Export Trade Journal';
  const titleDesc = type === 'missed-trades' ? 'Download as Word document' : 'Download as Word document';

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={cn(
          "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg",
          "hover:bg-blue-700 transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "shadow-md hover:shadow-lg hover:-translate-y-0.5"
        )}
      >
        {isExporting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Download className="w-5 h-5" />
        )}
        <span className="font-medium">{title}</span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{titleDesc}</p>
          </div>
          
          <div className="py-2">
            {periods.map((period) => {
              const Icon = period.icon;
              const isLoading = isExporting && exportingPeriod === period.value;
              
              return (
                <button
                  key={period.value}
                  onClick={() => exportReport(period.value)}
                  disabled={isExporting}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                    "hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed",
                    "border-b border-slate-100 last:border-b-0"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isLoading ? "bg-blue-100" : "bg-slate-100 group-hover:bg-blue-100"
                  )}>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{period.label}</p>
                    <p className="text-xs text-slate-500">{period.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
