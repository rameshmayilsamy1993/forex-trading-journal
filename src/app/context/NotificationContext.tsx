import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import apiService from '../services/apiService';

export interface ReminderNotification {
  _id?: string;
  id?: string;
  reminderId: string;
  reminderTitle: string;
  reminderPair?: string;
  type: 'before10Min' | 'before5Min' | 'onTime';
  title: string;
  body: string;
  triggeredAt: string;
  isRead: boolean;
  minutesUntil: number;
}

interface NotificationContextType {
  notifications: ReminderNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await apiService.reminders.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!notificationId) return;
    try {
      await apiService.reminders.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(n => (n._id === notificationId || n.id === notificationId) ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.isRead && (n._id || n.id))
        .map(n => n._id || n.id);
      
      const validIds = unreadIds.filter(Boolean);
      await Promise.all(validIds.map(id => apiService.reminders.markNotificationRead(id!)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [notifications]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    await markAsRead(notificationId);
  }, [markAsRead]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}