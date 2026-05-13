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
        "p-3 border-b border-slate-100 last:border-0 transition-all",
        isUnread ? "bg-blue-50/50" : "bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUnread ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
        )}>
          <Bell className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium truncate",
              isUnread ? "text-slate-900" : "text-slate-600"
            )}>
              {notification.reminderTitle}
            </span>
            {notification.reminderPair && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                {notification.reminderPair}
              </span>
            )}
          </div>
          
          <p className="text-xs text-slate-500 mt-1">
            {getNotificationTypeLabel(notification.type)}
          </p>
          
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{formatTime(notification.minutesUntil)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 mt-2 ml-11">
        {!notification.isRead && (
          <button
            onClick={() => onMarkRead(notificationId)}
            className="text-xs flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
          >
            <Check className="w-3 h-3" />
            Mark read
          </button>
        )}
        <button
          onClick={onOpenReminder}
          className="text-xs flex items-center gap-1 px-2 py-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </button>
        <button
          onClick={() => onDismiss(notificationId)}
          className="text-xs flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
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
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleOpenReminder}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
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