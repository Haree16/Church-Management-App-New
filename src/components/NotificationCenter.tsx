import React, { useState, useEffect } from 'react';
import { AppNotification, ChurchTenant, SaaSUser } from '../types';
import { isNotificationReadByUser, isNotificationForUser } from '../utils/notificationUtils';
import { 
  Bell, BellRing, Check, ShieldAlert, Sparkles, Filter, Trash2, Send, 
  ExternalLink, Smartphone, Users, CheckCheck, Eye, Settings 
} from 'lucide-react';
import { 
  requestMobileNotificationPermission, 
  sendMobilePanelNotification 
} from '../services/mobileNotificationService';
import { SmartNotificationPreferencesModal } from './notifications/SmartNotificationPreferencesModal';
import { ChurchCrossIcon } from './common/ChurchCrossIcon';

interface NotificationCenterProps {
  notifications?: AppNotification[];
  currentChurch?: ChurchTenant;
  currentUser?: SaaSUser;
  allUsers?: SaaSUser[];
  onMarkRead: (id: string) => void;
  onMarkAllRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAll: () => void;
  onSendNotification: (notif: AppNotification) => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications = [],
  currentChurch,
  currentUser,
  allUsers = [],
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onClearAll,
  onSendNotification,
  onNavigateTab,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nca_mobile_notifications_enabled') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkPermissionState = async () => {
      try {
        const stored = localStorage.getItem('nca_mobile_notifications_enabled') === 'true';
        if (stored) {
          setPermissionGranted(true);
          return;
        }

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          setPermissionGranted(true);
          localStorage.setItem('nca_mobile_notifications_enabled', 'true');
        }
      } catch (err) {
        console.warn('Error checking notification permission:', err);
      }
    };
    checkPermissionState();
  }, []);

  const safeNotifications = notifications || [];

  const churchUsers = (allUsers || []).filter(
    (u) =>
      u.church_id === currentChurch?.id ||
      u.churchId === currentChurch?.id ||
      (!u.church_id && !u.churchId && (currentChurch?.id || 'church-1') === 'church-1')
  );
  const totalChurchUsers = Math.max(1, churchUsers.length);

  // New Push Form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<AppNotification['category']>('Announcement');
  const [linkTab, setLinkTab] = useState('announcements');

  const requestPushPermission = async () => {
    try {
      await requestMobileNotificationPermission();
    } catch (err) {
      console.warn('Permission request error:', err);
    }

    // Persist and activate enabled state immediately once user confirms
    setPermissionGranted(true);
    try {
      localStorage.setItem('nca_mobile_notifications_enabled', 'true');
    } catch (e) {}

    sendMobilePanelNotification({
      id: `notif-welcome-${Date.now()}`,
      title: '🔔 Notifications Enabled',
      message: 'You will receive real-time pastoral bulletins, urgent prayer requests, and event alerts in your mobile notification panel.',
      category: 'Announcement',
      churchName: currentChurch?.name || 'Church CMS',
      iconUrl: currentChurch?.logoUrl?.trim() || '/church_logo.jpg',
    });
  };

  const canSendBroadcast = currentUser
    ? ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'MinistryLeader'].includes(currentUser.role)
    : false;

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendBroadcast) return;
    if (!title || !message) return;

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      church_id: currentChurch?.id,
      churchId: currentChurch?.id,
      title,
      message,
      category,
      date: new Date().toISOString().split('T')[0],
      read: false,
      readByUserIds: [],
      linkTab,
      createdByUserId: currentUser?.id,
      authorName: currentUser?.name,
    };

    onSendNotification(newNotif);

    sendMobilePanelNotification({
      id: newNotif.id,
      title: newNotif.title,
      message: newNotif.message,
      category: newNotif.category,
      linkTab: newNotif.linkTab,
      churchName: currentChurch?.name || 'Church CMS',
      iconUrl: currentChurch?.logoUrl?.trim() || '/church_logo.jpg',
    });

    setShowSendModal(false);
    setTitle('');
    setMessage('');
  };

  const userVisibleNotifications = safeNotifications.filter((n) =>
    isNotificationForUser(n, currentUser, allUsers as any)
  );

  const filtered = userVisibleNotifications.filter(
    (n) => filterCategory === 'All' || n.category === filterCategory
  );

  const unreadCount = userVisibleNotifications.filter((n) => !isNotificationReadByUser(n, currentUser)).length;

  const getCategoryBadgeStyle = (cat: string) => {
    switch (cat) {
      case 'Ministry':
        return 'bg-purple-950/80 text-purple-300 border border-purple-800 font-bold';
      case 'Roster':
        return 'bg-amber-950/80 text-amber-300 border border-amber-800 font-bold';
      case 'Activity':
        return 'bg-teal-950/80 text-teal-300 border border-teal-800 font-bold';
      case 'Event':
        return 'bg-orange-950/80 text-orange-300 border border-orange-800 font-bold';
      case 'Prayer':
        return 'bg-indigo-950/80 text-indigo-300 border border-indigo-800 font-bold';
      case 'Emergency':
        return 'bg-rose-950/80 text-rose-300 border border-rose-800 font-black animate-pulse';
      case 'Announcement':
        return 'bg-sky-950/80 text-sky-300 border border-sky-800 font-bold';
      case 'Devotional':
        return 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700 font-semibold';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div 
        data-theme-surface="dark"
        data-preserve-dark="true"
        className="dark-hero-panel bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-blue-800/40"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-[#fbbf24] text-xs font-semibold mb-3 border border-blue-500/30"
              style={{ color: '#fbbf24' }}
            >
              <ChurchCrossIcon className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>Church Broadcasts & Push Notifications</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" style={{ color: '#ffffff' }}>
              Member Notification Center
            </h2>
            <div 
              className="text-[#dbeafe] text-sm mt-1 max-w-xl font-normal leading-relaxed"
              style={{ color: '#dbeafe' }}
            >
              Real-time alerts for urgent prayer requests, pastoral bulletins, upcoming service events, and ministry updates. Visible to all congregation members until all have seen them.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {permissionGranted ? (
              <div
                className="px-3.5 py-2.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-2xl border border-emerald-500/40 text-xs flex items-center gap-2 shadow-xs"
                title="Mobile and panel alerts are actively enabled on this device"
              >
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>Panel Alerts Active</span>
              </div>
            ) : (
              <button
                onClick={requestPushPermission}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl shadow-md text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer"
                title="Click to enable mobile notification panel alerts"
              >
                <Smartphone className="w-4 h-4" />
                <span>Enable Mobile & Panel Notifications</span>
              </button>
            )}

            <button
              onClick={() => setShowPrefsModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl shadow-md text-xs flex items-center gap-2 transition cursor-pointer border border-slate-700"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Notification Preferences</span>
            </button>

            {canSendBroadcast && (
              <button
                onClick={() => setShowSendModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Send Church Broadcast
              </button>
            )}
          </div>
        </div>
      </div>

      {showPrefsModal && currentUser && (
        <SmartNotificationPreferencesModal
          churchId={currentChurch?.id || 'church-1'}
          userId={currentUser.id}
          onClose={() => setShowPrefsModal(false)}
        />
      )}



      {/* Filter and Unread Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 max-w-full">
          {['All', 'Ministry', 'Activity', 'Roster', 'Announcement', 'Prayer', 'Event', 'Emergency', 'Devotional'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                filterCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                  : 'bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-750 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-slate-400 mr-1">Unread for you: <strong className="text-amber-400 font-extrabold">{unreadCount}</strong></span>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1.5">
              {onMarkAllRead && unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-sky-300 hover:text-sky-200 px-2.5 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800 transition flex items-center gap-1.5 active:scale-95"
                  title="Mark all unread alerts as seen"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Seen</span>
                </button>
              )}
              {onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-slate-400 hover:text-rose-300 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 transition flex items-center gap-1.5 active:scale-95"
                  title="Clear all alerts for this church"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear All Alerts</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center text-slate-400 text-sm">
            No active notifications in this category. (All notifications have been seen by all users or none exist).
          </div>
        ) : (
          filtered.map((n) => {
            const readUserIds = n.readByUserIds || [];
            const seenUsers = churchUsers.filter((u) => readUserIds.includes(u.id));
            const seenCount = seenUsers.length;
            const hasSeenByMe = isNotificationReadByUser(n, currentUser);

            return (
              <div
                key={n.id}
                className={`p-4 sm:p-5 rounded-2xl border transition space-y-3 ${
                  hasSeenByMe 
                    ? 'bg-slate-900 border-slate-800' 
                    : 'bg-slate-800/90 border-amber-500/50 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getCategoryBadgeStyle(n.category)}`}>
                        {n.category}
                      </span>
                      {n.category === 'Ministry' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-1">
                          🎯 Team Membership Alert
                        </span>
                      )}
                      {n.category === 'Activity' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-950/80 text-teal-300 border border-teal-800 flex items-center gap-1">
                          👥 Scheduled Team Activity
                        </span>
                      )}
                      {n.category === 'Roster' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
                          📋 Volunteer Roster Alert
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-semibold">{n.date}</span>
                      {!hasSeenByMe && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white pt-0.5">{n.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{n.message}</p>

                    {n.linkTab && onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab(n.linkTab!)}
                        className="mt-1 text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                      >
                        View in {n.linkTab.toUpperCase()} module &rarr;
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!hasSeenByMe ? (
                      <button
                        onClick={() => onMarkRead(n.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                        title="Mark as seen by you"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Mark Seen</span>
                      </button>
                    ) : (
                      <div className="p-1.5 text-emerald-400 bg-emerald-950/60 rounded-xl border border-emerald-800 shrink-0" title="Seen by you">
                        <CheckCheck className="w-4 h-4" />
                      </div>
                    )}

                    {onDeleteNotification && (
                      <button
                        type="button"
                        onClick={() => onDeleteNotification(n.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl border border-transparent hover:border-rose-800 transition"
                        title="Delete alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Seen Progress Bar across Church Users */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Seen by <strong className="text-white font-bold">{seenCount}</strong> of <strong className="text-white font-bold">{totalChurchUsers}</strong> members</span>
                  </div>
                  {hasSeenByMe ? (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" /> Seen by you
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800">
                      Unread for you
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Send Broadcast Modal */}
      {showSendModal && canSendBroadcast && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4 text-white">
            <h3 className="text-lg font-bold text-white">Send New Church Broadcast</h3>

            <form onSubmit={handleSendPush} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Broadcast Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Service Time Adjustment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Announcement" className="bg-slate-900 text-white">Announcement</option>
                    <option value="Prayer" className="bg-slate-900 text-white">Prayer</option>
                    <option value="Event" className="bg-slate-900 text-white">Event</option>
                    <option value="Emergency" className="bg-slate-900 text-white">Emergency</option>
                    <option value="Devotional" className="bg-slate-900 text-white">Devotional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Navigate Module</label>
                  <select
                    value={linkTab}
                    onChange={(e) => setLinkTab(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="announcements" className="bg-slate-900 text-white">Announcements</option>
                    <option value="prayers" className="bg-slate-900 text-white">Prayers</option>
                    <option value="calendar" className="bg-slate-900 text-white">Calendar</option>
                    <option value="giving" className="bg-slate-900 text-white">Giving</option>
                    <option value="live" className="bg-slate-900 text-white">Live Stream</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message Content</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter broadcast message details..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  Publish Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
