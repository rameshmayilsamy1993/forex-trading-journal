export function normalizeDate(date: string | Date | undefined): Date {
  if (!date) return new Date();
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getDateKey(date: string | Date | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLocalDateString(date: string | Date | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export function getLocalTimeString(date: string | Date | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  return getDateKey(date1) === getDateKey(date2);
}

export function formatDateForInput(date: string | Date | undefined): string {
  if (!date) return '';
  return getDateKey(date);
}

export function formatDisplayDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function convertTo24Hour(time12Hour: string): string {
  if (!time12Hour) return '';
  const [time, modifier] = time12Hour.split(' ');
  if (!time || !modifier) return time12Hour;
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10);
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}
