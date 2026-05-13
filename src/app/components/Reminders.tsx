import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, Plus, Calendar, Clock, RotateCcw, Trash2, Edit2, ToggleLeft, ToggleRight, Volume2, Volume1, VolumeX } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import apiService from '../services/apiService';
import { useNotifications } from '../context/NotificationContext';
import { cn } from './ui/utils';

interface Reminder {
  _id?: string;
  id?: string;
  title: string;
  pair: string;
  date: string;
  time: string;
  repeatType: 'ONETIME' | 'DAILY';
  reminders: {
    before10Min: boolean;
    before5Min: boolean;
    onTime: boolean;
  };
  sound: string;
  notes: string;
  isActive: boolean;
  lastTriggeredAt?: string;
  triggeredAlerts: {
    before10Min: boolean;
    before5Min: boolean;
    onTime: boolean;
  };
  createdAt: string;
}

interface Notification {
  _id: string;
  reminderId: string;
  title: string;
  body: string;
  sound: string;
  alertType: string;
  triggeredAt: string;
  isRead: boolean;
}

const SOUND_OPTIONS = [
  { value: 'default', label: 'Default', icon: Volume2 },
  { value: 'alert', label: 'Alert', icon: Volume1 },
  { value: 'soft', label: 'Soft', icon: VolumeX },
];

const PAIR_OPTIONS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 
  'EURGBP', 'EURJPY', 'GBPJPY', 'NZDUSD', 'USDCHF',
  'XAUUSD', 'BTCUSD'
];

export default function Reminders() {
  const { notifications: contextNotifications, refreshNotifications } = useNotifications();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'missed'>('upcoming');

  const getReminderId = (reminder: Reminder): string => reminder._id || reminder.id || '';

  const [formData, setFormData] = useState({
    title: '',
    pair: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    repeatType: 'ONETIME' as 'ONETIME' | 'DAILY',
    reminders: {
      before10Min: true,
      before5Min: true,
      onTime: true
    },
    sound: 'default',
    notes: '',
    isActive: true
  });

  const loadReminders = useCallback(async () => {
    try {
      const data = await apiService.reminders.getAll();
      setReminders(data);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadReminders();
      await refreshNotifications();
      setIsLoading(false);
    };
    loadData();

    const interval = setInterval(() => {
      loadReminders();
      refreshNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadReminders, refreshNotifications]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      if (editingId) {
        await apiService.reminders.update(editingId, formData);
      } else {
        await apiService.reminders.create(formData);
      }
      
      setFormData({
        title: '',
        pair: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        repeatType: 'ONETIME',
        reminders: {
          before10Min: true,
          before5Min: true,
          onTime: true
        },
        sound: 'default',
        notes: '',
        isActive: true
      });
      setShowForm(false);
      setEditingId(null);
      loadReminders();
    } catch (error) {
      console.error('Failed to save reminder:', error);
      alert('Failed to save reminder');
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setFormData({
      title: reminder.title,
      pair: reminder.pair,
      date: reminder.date,
      time: reminder.time,
      repeatType: reminder.repeatType,
      reminders: reminder.reminders,
      sound: reminder.sound,
      notes: reminder.notes,
      isActive: reminder.isActive
    });
    setEditingId(getReminderId(reminder));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
      await apiService.reminders.delete(id);
      loadReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await apiService.reminders.toggleActive(id);
      loadReminders();
    } catch (error) {
      console.error('Failed to toggle reminder:', error);
    }
  };

  const handleResetAlerts = async (id: string) => {
    try {
      await apiService.reminders.resetAlerts(id);
      loadReminders();
    } catch (error) {
      console.error('Failed to reset alerts:', error);
    }
  };

  const getUpcomingReminders = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return reminders.filter(r => {
      if (!r.isActive) return false;
      
      const isRecurring = r.repeatType === 'DAILY';
      
      if (isRecurring) {
        return true;
      }
      
      return r.date >= today;
    }).sort((a, b) => {
      const aMinutes = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
      const bMinutes = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]);
      return aMinutes - bMinutes;
    });
  };

  const getCompletedReminders = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return reminders.filter(r => {
      if (r.repeatType === 'DAILY') return false;
      return r.date < today;
    });
  };

  const getMissedReminders = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return reminders.filter(r => {
      if (r.repeatType === 'DAILY') return false;
      
      if (r.date < today && r.isActive) {
        return true;
      }
      
      if (r.date === today) {
        const [hours, minutes] = r.time.split(':');
        const reminderMinutes = parseInt(hours) * 60 + parseInt(minutes);
        if (reminderMinutes < currentMinutes && r.isActive) {
          return true;
        }
      }
      
      return false;
    });
  };

  const getCountdown = (reminder: Reminder) => {
    const now = new Date();
    const [hours, minutes] = reminder.time.split(':');
    const reminderDate = new Date(reminder.date);
    reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (reminder.repeatType === 'DAILY') {
      reminderDate.setDate(now.getDate());
    }
    
    const diffMs = reminderDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 0) {
      if (reminder.repeatType === 'DAILY') {
        return 'Due now';
      }
      return 'Overdue';
    }
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    
    const hoursLeft = Math.floor(diffMinutes / 60);
    return `${hoursLeft}h ${diffMinutes % 60}m`;
  };

  const displayedReminders = activeTab === 'upcoming' 
    ? getUpcomingReminders() 
    : activeTab === 'completed' 
    ? getCompletedReminders() 
    : getMissedReminders();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Reminders
          </h1>
          <p className="text-slate-500 mt-1">Manage your trading reminders and alerts</p>
        </div>
        <Button 
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({
            title: '',
            pair: '',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            repeatType: 'ONETIME',
            reminders: { before10Min: true, before5Min: true, onTime: true },
            sound: 'default',
            notes: '',
            isActive: true
          });}}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Reminder
        </Button>
      </div>

      {contextNotifications.filter(n => !n.isRead).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium">
            You have {contextNotifications.filter(n => !n.isRead).length} unread notification(s)
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Reminder' : 'Create New Reminder'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., London Open"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pair (optional)
                </label>
                <Select
                  value={formData.pair}
                  onValueChange={(value) => setFormData({ ...formData, pair: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIR_OPTIONS.map(pair => (
                      <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time
                </label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Repeat
                </label>
                <Select
                  value={formData.repeatType}
                  onValueChange={(value: 'ONETIME' | 'DAILY') => setFormData({ ...formData, repeatType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONETIME">One-time</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Alarm Sound
                </label>
                <Select
                  value={formData.sound}
                  onValueChange={(value) => setFormData({ ...formData, sound: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reminder Alerts
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.reminders.before10Min}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      reminders: { ...formData.reminders, before10Min: checked as boolean }
                    })}
                  />
                  <span className="text-sm">10 min before</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.reminders.before5Min}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      reminders: { ...formData.reminders, before5Min: checked as boolean }
                    })}
                  />
                  <span className="text-sm">5 min before</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.reminders.onTime}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      reminders: { ...formData.reminders, onTime: checked as boolean }
                    })}
                  />
                  <span className="text-sm">On time</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <span className="text-sm text-slate-700">Active</span>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingId ? 'Update' : 'Create'} Reminder
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => { setShowForm(false); setEditingId(null); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'upcoming' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Upcoming ({getUpcomingReminders().length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'completed' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Completed ({getCompletedReminders().length})
        </button>
        <button
          onClick={() => setActiveTab('missed')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'missed' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Missed ({getMissedReminders().length})
        </button>
      </div>

      <div className="grid gap-4">
        {displayedReminders.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No reminders in this section</p>
          </div>
        ) : (
          displayedReminders.map((reminder) => (
            <div
              key={getReminderId(reminder)}
              className={cn(
                "bg-white rounded-xl border p-4 shadow-sm transition-all",
                reminder.isActive ? "border-slate-200" : "border-slate-200 opacity-60",
                activeTab === 'missed' && "border-red-200 bg-red-50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{reminder.title}</h3>
                    {reminder.pair && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {reminder.pair}
                      </span>
                    )}
                    {reminder.repeatType === 'DAILY' && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Daily
                      </span>
                    )}
                    {activeTab === 'upcoming' && reminder.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        {getCountdown(reminder)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {reminder.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {reminder.time}
                    </span>
                  </div>

                  {reminder.notes && (
                    <p className="text-sm text-slate-500 mt-2">{reminder.notes}</p>
                  )}

                  <div className="flex gap-2 mt-2">
                    {reminder.reminders.before10Min && (
                      <span className="text-xs text-slate-400">10m</span>
                    )}
                    {reminder.reminders.before5Min && (
                      <span className="text-xs text-slate-400">5m</span>
                    )}
                    {reminder.reminders.onTime && (
                      <span className="text-xs text-slate-400">On time</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(getReminderId(reminder))}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      reminder.isActive 
                        ? "text-green-600 hover:bg-green-50" 
                        : "text-slate-400 hover:bg-slate-100"
                    )}
                    title={reminder.isActive ? 'Disable' : 'Enable'}
                  >
                    {reminder.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(reminder)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(getReminderId(reminder))}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}