import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, Check, CheckCheck, Clock, ShieldAlert, Car, UserCheck } from 'lucide-react';
import { NotificationType } from '@rideshare/shared';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.RIDE_REQUEST:
        return <UserCheck className="h-5 w-5 text-indigo-600" />;
      case NotificationType.REQUEST_APPROVED:
        return <Check className="h-5 w-5 text-emerald-600" />;
      case NotificationType.REQUEST_DECLINED:
      case NotificationType.RIDE_CANCELLED:
        return <ShieldAlert className="h-5 w-5 text-rose-600" />;
      default:
        return <Bell className="h-5 w-5 text-indigo-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Stay updated with ride requests, driver approvals, and schedule adjustments.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'all' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'unread' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Bell className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No notifications to display</h3>
          <p className="text-xs text-slate-400">You're completely caught up!</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-5 flex items-start gap-4 cursor-pointer transition ${
                n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
              }`}
            >
              <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex-shrink-0">
                {getIcon(n.type as NotificationType)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(n.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>

              {!n.isRead && (
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 flex-shrink-0 mt-2"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
