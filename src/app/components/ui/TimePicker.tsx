import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from './utils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

export default function TimePicker({ value, onChange, placeholder = "--:-- --", disabled = false }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (value) {
      parseTime(value);
    }
  }, [value]);

  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2];
      const period = match[3]?.toUpperCase() as 'AM' | 'PM' || 'AM';

      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }

      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      setSelectedHour(hour12.toString());
      setSelectedMinute(minute);
      setSelectedPeriod(period);
    }
  };

  const formatTime = (hour12: string, minute: string, period: 'AM' | 'PM'): string => {
    return `${hour12.padStart(2, '0')}:${minute} ${period}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleHourChange = (hour: string) => {
    setSelectedHour(hour);
    onChange(formatTime(hour, selectedMinute, selectedPeriod));
  };

  const handleMinuteChange = (minute: string) => {
    setSelectedMinute(minute);
    onChange(formatTime(selectedHour, minute, selectedPeriod));
  };

  const handlePeriodChange = (period: 'AM' | 'PM') => {
    setSelectedPeriod(period);
    onChange(formatTime(selectedHour, selectedMinute, period));
  };

  const handleQuickSelect = (time: string) => {
    onChange(time);
    parseTime(time);
    setIsOpen(false);
  };

  const scrollToSelected = (container: HTMLDivElement | null, selected: string, items: string[]) => {
    if (container) {
      const index = items.indexOf(selected);
      const itemHeight = 40;
      container.scrollTop = index * itemHeight - container.clientHeight / 2 + itemHeight / 2;
    }
  };

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollToSelected(hourRef.current, selectedHour, HOURS_12);
      scrollToSelected(minuteRef.current, selectedMinute, MINUTES);
    }
  }, [isOpen]);

  const getCurrentTime12Hour = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const quickSelects = [
    { label: 'Now', time: getCurrentTime12Hour() },
    { label: 'London Open', time: '08:00 AM' },
    { label: 'NY Open', time: '01:30 PM' },
    { label: 'Asia Open', time: '12:00 AM' },
  ];

  const displayValue = value || placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl border px-4 text-left transition-all duration-200 h-12",
          "bg-slate-50 border-slate-200",
          "hover:bg-slate-100 hover:border-slate-300",
          "focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <Clock className="w-4 h-4 shrink-0 text-slate-400" />
        <span className={`text-input flex-1 ${value ? 'text-[#0F172A]' : 'text-slate-400'}`}>{displayValue}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-[#E2E8F0] p-5 animate-in fade-in zoom-in-95 duration-200 min-w-[300px]">
          <div className="flex gap-2 mb-4 pb-4 border-b border-[#E2E8F0]">
            {quickSelects.map((qs) => (
              <button
                key={qs.label}
                type="button"
                onClick={() => handleQuickSelect(qs.time)}
                className="px-2.5 py-1.5 text-caption font-medium text-[#475569] bg-[#F1F5F9] rounded-lg hover:bg-[#EDE9FE] hover:text-[#7C3AED] transition-colors duration-150"
              >
                {qs.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 justify-center">
            <div className="flex flex-col items-center">
              <span className="text-micro text-[#475569] uppercase font-semibold tracking-wider mb-2">Hour</span>
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[calc(100%-6px)] h-10 bg-[#EDE9FE] rounded-lg pointer-events-none border border-[#7C3AED]/20" />
                <div
                  ref={hourRef}
                  className="w-16 h-44 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative scroll-smooth"
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const scrollTop = container.scrollTop;
                    const itemHeight = 40;
                    const index = Math.round(scrollTop / itemHeight);
                    const clampedIndex = Math.max(0, Math.min(11, index));
                    handleHourChange(HOURS_12[clampedIndex]);
                  }}
                >
                  <div className="pt-[82px] pb-[82px]">
                    {HOURS_12.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => handleHourChange(hour)}
                        className={cn(
                          "h-10 flex items-center justify-center text-button cursor-pointer",
                          "transition-all duration-150 rounded-lg mx-1",
                          selectedHour === hour
                            ? 'text-[#7C3AED] font-semibold bg-[#EDE9FE]'
                            : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                        )}
                      >
                        {hour}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <span className="text-section-title text-[#94A3B8] mt-6">:</span>

            <div className="flex flex-col items-center">
              <span className="text-micro text-[#475569] uppercase font-semibold tracking-wider mb-2">Min</span>
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[calc(100%-6px)] h-10 bg-[#EDE9FE] rounded-lg pointer-events-none border border-[#7C3AED]/20" />
                <div
                  ref={minuteRef}
                  className="w-16 h-44 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative scroll-smooth"
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const scrollTop = container.scrollTop;
                    const itemHeight = 40;
                    const index = Math.round(scrollTop / itemHeight);
                    const clampedIndex = Math.max(0, Math.min(59, index));
                    handleMinuteChange(MINUTES[clampedIndex]);
                  }}
                >
                  <div className="pt-[82px] pb-[82px]">
                    {MINUTES.map((minute) => (
                      <div
                        key={minute}
                        onClick={() => handleMinuteChange(minute)}
                        className={cn(
                          "h-10 flex items-center justify-center text-button cursor-pointer",
                          "transition-all duration-150 rounded-lg mx-1",
                          selectedMinute === minute
                            ? 'text-[#7C3AED] font-semibold bg-[#EDE9FE]'
                            : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                        )}
                      >
                        {minute}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-micro text-[#475569] uppercase font-semibold tracking-wider mb-2">AM/PM</span>
              <div className="flex flex-col gap-1.5">
                {PERIODS.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => handlePeriodChange(period as 'AM' | 'PM')}
                    className={cn(
                      "px-4 py-2.5 text-button rounded-lg transition-all duration-150 cursor-pointer min-w-[52px]",
                      selectedPeriod === period
                        ? 'bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/25'
                        : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#EDE9FE] hover:text-[#7C3AED]'
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-button text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(formatTime(selectedHour, selectedMinute, selectedPeriod));
                setIsOpen(false);
              }}
              className="px-5 py-2 text-button text-white bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] rounded-lg shadow-md shadow-[#7C3AED]/25 hover:shadow-lg hover:shadow-[#7C3AED]/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              Set Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
