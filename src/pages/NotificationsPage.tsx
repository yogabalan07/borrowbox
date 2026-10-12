import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  ArrowUpRight, 
  Layers,
  Inbox
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsService } from '../services/api';
import { NotificationItem } from '../types';
import { EmptyState } from '../components/EmptyState';

export const NotificationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifs = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsService.getNotifications(currentUser.id);
      setNotifications(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <Bell className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Sign in to view notifications</h2>
        <p className="text-xs text-stone-500">
          Sign in with your student account to see requests and return alerts.
        </p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await notificationsService.markAllAsRead(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      setError(err?.message || 'Failed to mark notifications as read.');
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Notifications
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Stay updated on borrow requests, lender responses, and return reminders.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors self-start"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-stone-900 text-white font-semibold'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-stone-900 text-white font-semibold'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900'
          }`}
        >
          Unread only ({unreadCount})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>{error}</span>
          </div>
          <button
            onClick={fetchNotifs}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-semibold text-xs shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="p-8 bg-white rounded-2xl border border-stone-200 animate-pulse text-xs text-stone-400">
          Loading notifications...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'unread' ? 'All notifications read' : 'No notifications yet'}
          description="You'll be alerted when classmates request your gear or approve your borrowing dates."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-xs">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                item.isRead ? 'bg-white hover:bg-stone-50/50' : 'bg-emerald-50/30 hover:bg-emerald-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    item.isRead ? 'bg-stone-200' : 'bg-emerald-600'
                  }`}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${item.isRead ? 'font-medium text-stone-800' : 'font-bold text-stone-900'}`}>
                      {item.title}
                    </p>
                    <span className="text-[11px] text-stone-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{item.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={item.link}
                  onClick={() => handleMarkAsRead(item.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <span>View</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>

                {!item.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    className="p-1 text-stone-400 hover:text-stone-700 rounded"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
