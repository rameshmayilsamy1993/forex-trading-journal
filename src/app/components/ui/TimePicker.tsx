import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export default function TimePicker({ value, onChange, placeholder = "--:--", disabled = false }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, minutes] = value ? value.split(':') : ['', ''];
  const [selectedHour, setSelectedHour] = useState(hours || '00');
  const [selectedMinute, setSelectedMinute] = useState(minutes || '00');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setSelectedHour(h || '00');
      setSelectedMinute(m || '00');
    }
  }, [value]);

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

  const handleSelect = (type: 'hour' | 'minute', val: string) => {
    if (type === 'hour') {
      setSelectedHour(val);
    } else {
      setSelectedMinute(val);
    }
  };

  const handleConfirm = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    setIsOpen(false);
  };

  const handleQuickSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
  };

  const scrollToSelected = (container: HTMLDivElement | null, selected: string) => {
    if (container) {
      const index = selected === '' ? 0 : parseInt(selected);
      const itemHeight = 40;
      container.scrollTop = index * itemHeight - container.clientHeight / 2 + itemHeight / 2;
    }
  };

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollToSelected(hourRef.current, selectedHour);
      scrollToSelected(minuteRef.current, selectedMinute);
    }
  }, [isOpen]);

  const quickSelects = [
    { label: 'Now', time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) },
    { label: 'London Open', time: '08:00' },
    { label: 'NY Open', time: '13:30' },
    { label: 'Asia Open', time: '00:00' },
  ];

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
        <span className="text-sm">{value || placeholder}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Quick Select */}
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

          {/* Time Selector */}
          <div className="flex items-center gap-4">
            {/* Hours */}
            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[calc(100%-8px)] h-10 bg-blue-50 rounded-lg pointer-events-none border border-blue-200" />
              <div
                ref={hourRef}
                className="w-16 h-40 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative"
                onScroll={(e) => {
                  const container = e.currentTarget;
                  const scrollTop = container.scrollTop;
                  const itemHeight = 40;
                  const index = Math.round(scrollTop / itemHeight);
                  setSelectedHour(HOURS[Math.max(0, Math.min(23, index))]);
                }}
              >
                <div className="pt-[72px] pb-[72px]">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      onClick={() => handleSelect('hour', hour)}
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
              <button
                type="button"
                onClick={() => {
                  const newHour = Math.max(0, parseInt(selectedHour) - 1).toString().padStart(2, '0');
                  setSelectedHour(newHour);
                  onChange(`${newHour}:${selectedMinute}`);
                }}
                className="absolute top-1 left-1/2 -translate-x-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronUp className="w-4 h-4 text-gray-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const newHour = Math.min(23, parseInt(selectedHour) + 1).toString().padStart(2, '0');
                  setSelectedHour(newHour);
                  onChange(`${newHour}:${selectedMinute}`);
                }}
                className="absolute bottom-1 left-1/2 -translate-x-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <span className="text-2xl font-bold text-gray-400">:</span>

            {/* Minutes */}
            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[calc(100%-8px)] h-10 bg-blue-50 rounded-lg pointer-events-none border border-blue-200" />
              <div
                ref={minuteRef}
                className="w-16 h-40 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative"
                onScroll={(e) => {
                  const container = e.currentTarget;
                  const scrollTop = container.scrollTop;
                  const itemHeight = 40;
                  const index = Math.round(scrollTop / itemHeight);
                  setSelectedMinute(MINUTES[Math.max(0, Math.min(59, index))]);
                }}
              >
                <div className="pt-[72px] pb-[72px]">
                  {MINUTES.map((minute) => (
                    <div
                      key={minute}
                      onClick={() => handleSelect('minute', minute)}
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
              <button
                type="button"
                onClick={() => {
                  const newMinute = Math.max(0, parseInt(selectedMinute) - 5).toString().padStart(2, '0');
                  setSelectedMinute(newMinute);
                  onChange(`${selectedHour}:${newMinute}`);
                }}
                className="absolute top-1 left-1/2 -translate-x-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronUp className="w-4 h-4 text-gray-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const newMinute = Math.min(55, parseInt(selectedMinute) + 5).toString().padStart(2, '0');
                  setSelectedMinute(newMinute);
                  onChange(`${selectedHour}:${newMinute}`);
                }}
                className="absolute bottom-1 left-1/2 -translate-x-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Footer */}
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
              onClick={handleConfirm}
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
