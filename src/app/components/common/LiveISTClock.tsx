import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ISTTime {
  time: string;
  date: string;
}

function getISTTime(): ISTTime {
  const now = new Date();

  const formattedTime = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    time: formattedTime,
    date: formattedDate,
  };
}

export default function LiveISTClock() {
  const [istTime, setIstTime] = useState<ISTTime>(getISTTime);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIstTime(getISTTime());
      setSeconds(prev => (prev + 1) % 60);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg shadow-sm transition-all duration-200">
      <Clock className="w-3 h-3 text-[#64748B]" />
      <div className="flex items-baseline gap-1">
        <span className="text-micro text-[#64748B] font-mono tabular-nums">
          {istTime.time}
        </span>
        <span className="text-micro text-[#94A3B8] uppercase">IST</span>
      </div>
    </div>
  );
}
