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
    hour12: true
  });
  
  const formattedDate = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  return {
    time: formattedTime,
    date: formattedDate
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
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="relative">
        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span 
          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"
          style={{ 
            animation: 'pulse 1s ease-in-out infinite',
            boxShadow: '0 0 4px rgba(34, 197, 94, 0.6)'
          }} 
        />
      </div>
      
      <div className="flex flex-col leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono tracking-wide">
            {istTime.time}
          </span>
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            IST
          </span>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {istTime.date}
        </span>
      </div>
    </div>
  );
}