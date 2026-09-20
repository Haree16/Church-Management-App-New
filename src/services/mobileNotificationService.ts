import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface MobileNotificationPayload {
  id?: string;
  title: string;
  message: string;
  category?: 'Announcement' | 'Prayer' | 'Event' | 'Emergency' | 'Devotional' | string;
  linkTab?: string;
  churchName?: string;
  iconUrl?: string;
}

let isInitialized = false;
let notificationTapHandler: ((linkTab: string) => void) | null = null;

/**
 * Converts a string ID (e.g., "notif-ann-172483...") to a 32-bit positive integer required by Capacitor
 */
function hashStringToInteger(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2147483647 || 1;
}

/**
 * Initialize Mobile Notification Channels & Tap Listeners
 */
export async function initMobileNotifications(onTap?: (linkTab: string) => void) {
  if (onTap) {
    notificationTapHandler = onTap;
  }

  if (isInitialized) return;
  isInitialized = true;

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Create Android Notification Channels
      await LocalNotifications.createChannel({
        id: 'church_alerts',
        name: 'Church Announcements & Urgent Alerts',
        description: 'Pastoral words, bulletins, emergencies, and general alerts',
        importance: 5, // High
        visibility: 1, // Public
        sound: 'beep.wav',
        vibration: true,
        lights: true,
        lightColor: '#D97706',
      }).catch(console.warn);

      await LocalNotifications.createChannel({
        id: 'urgent_prayers',
        name: 'Prayer Wall & Requests',
        description: 'Urgent prayer needs, updates, and answered testimonies',
        importance: 5, // High
        visibility: 1,
        vibration: true,
      }).catch(console.warn);

      await LocalNotifications.createChannel({
        id: 'church_events',
        name: 'Worship & Calendar Events',
        description: 'Upcoming service reminders and fellowship event updates',
        importance: 4, // Default
        visibility: 1,
        vibration: true,
      }).catch(console.warn);

      // 2. Listen for notification tap / action performed on mobile panel
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action.notification.extra;
        if (extra && extra.linkTab && notificationTapHandler) {
          notificationTapHandler(extra.linkTab);
        }
      });
    } catch (err) {
      console.warn('Capacitor LocalNotifications init error:', err);
    }
  }
}

/**
 * Request notification permissions across native mobile and web
 */
export async function requestMobileNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const check = await LocalNotifications.checkPermissions();
      if (check.display === 'granted') return true;

      const req = await LocalNotifications.requestPermissions();
      return req.display === 'granted';
    } catch (err) {
      console.warn('Error requesting native mobile notification permission:', err);
      return false;
    }
  }

  // Web Browser / PWA
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') return true;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch (err) {
      console.warn('Error requesting web notification permission:', err);
      return false;
    }
  }

  return false;
}

/**
 * Dispatches notification to the device's native mobile notification panel or web notification
 */
export async function sendMobilePanelNotification(payload: MobileNotificationPayload) {
  const { id = `notif-${Date.now()}`, title, message, category = 'Announcement', linkTab, churchName = 'Church CMS' } = payload;

  const intId = hashStringToInteger(id);
  const fullTitle = `${churchName}: ${title}`;

  // 1. Native Mobile Device (Android / iOS) via Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      // Auto-check permission
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('Mobile notification permission not granted by user.');
        }
      }

      let channelId = 'church_alerts';
      if (category === 'Prayer' || category === 'Emergency') {
        channelId = 'urgent_prayers';
      } else if (category === 'Event') {
        channelId = 'church_events';
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: intId,
            title: fullTitle,
            body: message,
            channelId,
            extra: {
              linkTab: linkTab || 'notifications',
              originalId: id,
              category,
            },
            schedule: { at: new Date(Date.now() + 100) }, // Trigger immediately
            smallIcon: 'ic_stat_cross',
            iconColor: '#D97706',
            actionTypeId: 'OPEN_MODULE',
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('Failed to schedule native mobile notification, falling back to Web Notification:', err);
    }
  }

  // 2. Web Browser / Desktop / Mobile Browser Fallback
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(fullTitle, {
          body: message,
          icon: payload.iconUrl || '/church_logo.jpg',
          badge: '/church_logo.jpg',
          tag: id,
        });

        if (linkTab && notificationTapHandler) {
          notif.onclick = () => {
            window.focus();
            notificationTapHandler?.(linkTab);
          };
        }
      } catch (err) {
        console.warn('Native web notification dispatch error:', err);
      }
    }
  }
}
