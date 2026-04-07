import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronUp, ChevronDown, X } from 'lucide-react';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showTimeOnly?: boolean;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['AM', 'PM'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DateTimePicker({ 
  value, 
  onChange, 
  placeholder = "Select date & time",
  disabled = false,
  showTimeOnly = false 
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'date' | 'time'>('date');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [viewMonth, setViewMonth] = useState(new Date());

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        setSelectedHour((date.getHours() === 0 ? 12 : date.getHours() > 12 ? date.getHours() - 12 : date.getHours()).toString());
        setSelectedMinute(date.getMinutes().toString().padStart(2, '0'));
        setSelectedPeriod(date.getHours() >= 12 ? 'PM' : 'AM');
      }
    }
  }, [value]);

  const formatDisplayValue = (): string => {
    if (!value) return placeholder;
    const date = new Date(value);
    if (isNaN(date.getTime())) return placeholder;
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateTime = (date: Date, hour12: string, minute: string, period: 'AM' | 'PM'): Date => {
    const newDate = new Date(date);
    let hour = parseInt(hour12);
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    newDate.setHours(hour);
    newDate.setMinutes(parseInt(minute));
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const newDateTime = formatDateTime(date, selectedHour, selectedMinute, selectedPeriod);
    onChange(newDateTime.toISOString());
  };

  const handleTimeChange = (hour12: string, minute: string, period: 'AM' | 'PM') => {
    setSelectedHour(hour12);
    setSelectedMinute(minute);
    setSelectedPeriod(period);
    const newDateTime = formatDateTime(selectedDate, hour12, minute, period);
    onChange(newDateTime.toISOString());
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

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push(d);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date): boolean => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === viewMonth.getMonth();
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(viewMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setViewMonth(newMonth);
  };

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const scrollToSelected = (container: HTMLDivElement | null, selected: string, items: string[]) => {
    if (container) {
      const index = items.indexOf(selected);
      const itemHeight = 40;
      container.scrollTop = index * itemHeight - container.clientHeight / 2 + itemHeight / 2;
    }
  };

  const days = getDaysInMonth(viewMonth);

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
        {showTimeOnly ? <Clock className="w-4 h-4 text-gray-400" /> : <Calendar className="w-4 h-4 text-gray-400" />}
        <span className="text-sm flex-1">{formatDisplayValue()}</span>
        {value && (
          <X 
            className="w-4 h-4 text-gray-400 hover:text-gray-600" 
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 bg-white rounded-xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          {!showTimeOnly && (
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveSection('date')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeSection === 'date' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </button>
              <button
                onClick={() => setActiveSection('time')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeSection === 'time' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-1" />
                Time
              </button>
            </div>
          )}

          <div className="p-4">
            {(!showTimeOnly && activeSection === 'date') && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronUp className="w-5 h-5 text-gray-600 rotate-90" />
                  </button>
                  <span className="text-sm font-semibold text-gray-900">
                    {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-gray-600 rotate-90" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((date, index) => (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(date)}
                      className={`
                        w-8 h-8 text-xs rounded-lg transition-all duration-150
                        ${!isCurrentMonth(date) ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}
                        ${isToday(date) ? 'font-bold text-blue-600' : ''}
                        ${isSelected(date) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(showTimeOnly || activeSection === 'time') && (
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
                        handleTimeChange(HOURS_12[clampedIndex], selectedMinute, selectedPeriod);
                      }}
                    >
                      <div className="pt-[72px] pb-[72px]">
                        {HOURS_12.map((hour) => (
                          <div
                            key={hour}
                            onClick={() => handleTimeChange(hour, selectedMinute, selectedPeriod)}
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
                        const clampedIndex = Math.max(0, Math.min(11, index));
                        handleTimeChange(selectedHour, MINUTES[clampedIndex * 5], selectedPeriod);
                      }}
                    >
                      <div className="pt-[72px] pb-[72px]">
                        {MINUTES.filter((_, i) => i % 5 === 0).map((minute) => (
                          <div
                            key={minute}
                            onClick={() => handleTimeChange(selectedHour, minute, selectedPeriod)}
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
                        onClick={() => handleTimeChange(selectedHour, selectedMinute, period as 'AM' | 'PM')}
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
            )}
          </div>

          <div className="flex justify-end gap-2 px-4 pb-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
