import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

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

  const get24HourTime = (): string => {
    let hour = parseInt(selectedHour);
    if (selectedPeriod === 'PM' && hour !== 12) {
      hour += 12;
    } else if (selectedPeriod === 'AM' && hour === 12) {
      hour = 0;
    }
    return `${hour.toString().padStart(2, '0')}:${selectedMinute}`;
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
        className={`
          w-full h-10 px-3 flex items-center gap-2 bg-white border border-gray-200 rounded-lg
          hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200 text-left
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${value ? 'text-gray-900' : 'text-gray-400'}
        `}
      >
        <Clock className="w-4 h-4 text-gray-400" />
        <span className="text-sm">{displayValue}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-2 mb-4 pb-3 border-b border-gray-100">
            {quickSelects.map((qs) => (
              <button
                key={qs.label}
                type="button"
                onClick={() => handleQuickSelect(qs.time)}
                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {qs.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 uppercase mb-1">Hour</span>
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[calc(100%-8px)] h-10 bg-blue-50 rounded-lg pointer-events-none border border-blue-200" />
                <div
                  ref={hourRef}
                  className="w-14 h-40 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative"
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const scrollTop = container.scrollTop;
                    const itemHeight = 40;
                    const index = Math.round(scrollTop / itemHeight);
                    const clampedIndex = Math.max(0, Math.min(11, index));
                    handleHourChange(HOURS_12[clampedIndex]);
                  }}
                >
                  <div className="pt-[72px] pb-[72px]">
                    {HOURS_12.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => handleHourChange(hour)}
                        className={`
                          h-10 flex items-center justify-center text-sm font-medium cursor-pointer
                          transition-all duration-150 rounded-lg mx-1
                          ${selectedHour === hour 
                            ? 'text-blue-600 bg-blue-50' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                        `}
                      >
                        {hour}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <span className="text-2xl font-bold text-gray-400 mt-4">:</span>

            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 uppercase mb-1">Min</span>
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[calc(100%-8px)] h-10 bg-blue-50 rounded-lg pointer-events-none border border-blue-200" />
                <div
                  ref={minuteRef}
                  className="w-14 h-40 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative"
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const scrollTop = container.scrollTop;
                    const itemHeight = 40;
                    const index = Math.round(scrollTop / itemHeight);
                    const clampedIndex = Math.max(0, Math.min(59, index));
                    handleMinuteChange(MINUTES[clampedIndex]);
                  }}
                >
                  <div className="pt-[72px] pb-[72px]">
                    {MINUTES.filter((_, i) => i % 5 === 0).map((minute) => (
                      <div
                        key={minute}
                        onClick={() => handleMinuteChange(minute)}
                        className={`
                          h-10 flex items-center justify-center text-sm font-medium cursor-pointer
                          transition-all duration-150 rounded-lg mx-1
                          ${selectedMinute === minute 
                            ? 'text-blue-600 bg-blue-50' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                        `}
                      >
                        {minute}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center ml-2">
              <span className="text-[10px] text-gray-400 uppercase mb-1">AM/PM</span>
              <div className="flex flex-col gap-1">
                {PERIODS.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => handlePeriodChange(period as 'AM' | 'PM')}
                    className={`
                      px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer
                      ${selectedPeriod === period 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                    `}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(formatTime(selectedHour, selectedMinute, selectedPeriod));
                setIsOpen(false);
              }}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Set Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
