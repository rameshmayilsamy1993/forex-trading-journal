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
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5EAF2] rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      <div className="relative">
        <Clock className="w-4 h-4 text-[#2563EB]" />
        <span
          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#16A34A] rounded-full"
          style={{
            animation: 'pulse 1s ease-in-out infinite',
            boxShadow: '0 0 4px rgba(22, 163, 74, 0.6)',
          }}
        />
      </div>

      <div className="flex flex-col leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-[#0F172A] font-mono tracking-wide">
            {istTime.time}
          </span>
          <span className="text-[10px] font-medium text-[#2563EB] uppercase tracking-wider">
            IST
          </span>
        </div>
        <span className="text-[10px] text-[#64748B]">{istTime.date}</span>
      </div>
    </div>
  );
}
