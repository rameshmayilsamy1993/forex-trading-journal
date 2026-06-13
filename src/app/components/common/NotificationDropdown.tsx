import { useState, useRef, useEffect } from 'react';
import { Bell, Clock, X, Check, ExternalLink, Trash2 } from 'lucide-react';
import { useNotifications, ReminderNotification } from '../../context/NotificationContext';
import { cn } from '../ui/utils';

function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case 'before10Min': return 'In 10 minutes';
    case 'before5Min': return 'In 5 minutes';
    case 'onTime': return 'Time reached';
    default: return type;
  }
}

function formatTime(minutesUntil: number): string {
  if (minutesUntil > 0) {
    return `In ${minutesUntil} min`;
  } else if (minutesUntil === 0) {
    return 'Now';
  } else {
    const mins = Math.abs(minutesUntil);
    return `${mins} min ago`;
  }
}

interface NotificationItemProps {
  notification: ReminderNotification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onOpenReminder: () => void;
}

function NotificationItem({ notification, onMarkRead, onDismiss, onOpenReminder }: NotificationItemProps) {
  const isUnread = !notification.isRead;
  const notificationId = notification._id || notification.id || '';

  return (
    <div
      className={cn(
        'p-3 border-b border-[#E5EAF2]/60 last:border-0 transition-all',
        isUnread ? 'bg-[#EFF6FF]' : 'bg-white',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center',
            isUnread ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'bg-[#F1F5F9] text-[#94A3B8]',
          )}
        >
          <Bell className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium truncate',
                isUnread ? 'text-[#0F172A]' : 'text-[#64748B]',
              )}
            >
              {notification.reminderTitle}
            </span>
            {notification.reminderPair && (
              <span className="text-xs px-2 py-0.5 bg-[#2563EB]/10 text-[#2563EB] rounded-full font-medium">
                {notification.reminderPair}
              </span>
            )}
          </div>

          <p className="text-xs text-[#64748B] mt-1">
            {getNotificationTypeLabel(notification.type)}
          </p>

          <div className="flex items-center gap-1 mt-1 text-xs text-[#94A3B8]">
            <Clock className="w-3 h-3" />
            <span>{formatTime(notification.minutesUntil)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 ml-11">
        {!notification.isRead && (
          <button
            onClick={() => onMarkRead(notificationId)}
            className="text-xs flex items-center gap-1 px-2 py-1 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-lg transition-colors"
          >
            <Check className="w-3 h-3" />
            Mark read
          </button>
        )}
        <button
          onClick={onOpenReminder}
          className="text-xs flex items-center gap-1 px-2 py-1 text-[#64748B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </button>
        <button
          onClick={() => onDismiss(notificationId)}
          className="text-xs flex items-center gap-1 px-2 py-1 text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface NotificationDropdownProps {
  onNavigateToReminders?: () => void;
}

export default function NotificationDropdown({ onNavigateToReminders }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, dismissNotification, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getNotificationId = (notification: ReminderNotification): string => notification._id || notification.id || '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = (id: string) => {
    markAsRead(id);
  };

  const handleDismiss = (id: string) => {
    dismissNotification(id);
  };

  const handleOpenReminder = () => {
    setIsOpen(false);
    if (onNavigateToReminders) {
      onNavigateToReminders();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-[#F1F5F9] transition-colors"
      >
        <Bell className="w-5 h-5 text-[#64748B]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#DC2626] text-white text-[10px] font-bold rounded-full px-1 shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E5EAF2] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5EAF2] bg-[#F8FAFC]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8]">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem
                  key={notification._id || notification.id || Math.random().toString()}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                  onOpenReminder={handleOpenReminder}
                />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#E5EAF2] bg-[#F8FAFC]">
              <button
                onClick={handleOpenReminder}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium"
              >
                View all reminders →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
