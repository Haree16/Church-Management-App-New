import { 
  AppNotification, SaaSUser, Member, ChurchEvent, RosterAssignment, 
  ChurchMinistry 
} from '../types';
import { canAccessAllChurchReports, normalizeRole } from '../utils/rbac';
import { getUserAssignedMinistries } from '../utils/ministryPermissions';
import { findLinkedMemberForUser, findLinkedUserForMember } from '../utils/notificationUtils';
import { sendMobilePanelNotification } from './mobileNotificationService';
import { auditService } from './auditService';
import { getAutomatedFollowUpTasks } from './visitorFollowUpService';
import { getAutomatedAbsenceTasks } from './absenceFollowUpService';

export type SmartNotificationCategory = 
  | 'events' 
  | 'ministry' 
  | 'attendance' 
  | 'sundayschool' 
  | 'prayer' 
  | 'visitor_followup' 
  | 'absence_followup' 
  | 'system';

export type SmartNotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type SmartNotificationChannel = 'in_app' | 'push' | 'email' | 'whatsapp' | 'sms';

export interface SmartNotificationRule {
  id: string;
  category: SmartNotificationCategory;
  eventType: string;
  name: string;
  enabled: boolean;
  targetRoles: string[];
  priority: SmartNotificationPriority;
  defaultChannel: SmartNotificationChannel;
  reminderDelayHours?: number;
  quietHoursBehavior: 'queue' | 'deliver_critical';
}

export interface UserNotificationPreferences {
  userId: string;
  churchId: string;
  enabledCategories: Record<SmartNotificationCategory, boolean>;
  language: 'en' | 'ta' | 'auto';
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string;   // e.g. "07:00"
  preferredChannel: SmartNotificationChannel;
}

export interface AdminNotificationSettings {
  enabled: boolean;
  defaultChannel: SmartNotificationChannel;
  defaultLanguage: 'en' | 'ta' | 'auto';
  quietHoursStart: string;
  quietHoursEnd: string;
  rules: SmartNotificationRule[];
}

const ADMIN_SETTINGS_STORAGE_KEY = 'church_cms_admin_notification_settings';
const USER_PREFS_STORAGE_KEY = 'church_cms_user_notification_prefs';
const DEDUP_KEYS_STORAGE_KEY = 'church_cms_notif_dedup_keys';
const QUEUED_NOTIFS_STORAGE_KEY = 'church_cms_queued_notifications';
const NOTIFS_STORAGE_KEY = 'church_cms_app_notifications';

export const DEFAULT_ADMIN_NOTIFICATION_SETTINGS: AdminNotificationSettings = {
  enabled: true,
  defaultChannel: 'push',
  defaultLanguage: 'auto',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  rules: [
    {
      id: 'rule_event_reminder',
      category: 'events',
      eventType: 'event_reminder_24h',
      name: 'Event Reminder (24 Hours Before)',
      enabled: true,
      targetRoles: ['member', 'ministry_leader', 'pastor', 'church_admin'],
      priority: 'normal',
      defaultChannel: 'push',
      reminderDelayHours: 24,
      quietHoursBehavior: 'queue'
    },
    {
      id: 'rule_event_change',
      category: 'events',
      eventType: 'event_updated',
      name: 'Event Time / Location Changed',
      enabled: true,
      targetRoles: ['member', 'ministry_leader', 'pastor', 'church_admin'],
      priority: 'high',
      defaultChannel: 'push',
      quietHoursBehavior: 'deliver_critical'
    },
    {
      id: 'rule_ministry_assignment',
      category: 'ministry',
      eventType: 'roster_assigned',
      name: 'Ministry Roster Assignment',
      enabled: true,
      targetRoles: ['member', 'ministry_leader', 'volunteer'],
      priority: 'normal',
      defaultChannel: 'push',
      quietHoursBehavior: 'queue'
    },
    {
      id: 'rule_visitor_followup_due',
      category: 'visitor_followup',
      eventType: 'visitor_task_due',
      name: 'Visitor Follow-up Pending Approval',
      enabled: true,
      targetRoles: ['pastor', 'church_admin', 'ministry_leader'],
      priority: 'high',
      defaultChannel: 'push',
      quietHoursBehavior: 'queue'
    },
    {
      id: 'rule_absence_followup_due',
      category: 'absence_followup',
      eventType: 'absence_task_due',
      name: 'Absence Follow-up Task Pending',
      enabled: true,
      targetRoles: ['pastor', 'church_admin', 'ministry_leader'],
      priority: 'high',
      defaultChannel: 'push',
      quietHoursBehavior: 'queue'
    },
    {
      id: 'rule_prayer_assigned',
      category: 'prayer',
      eventType: 'prayer_assigned',
      name: 'Prayer Request Assignment',
      enabled: true,
      targetRoles: ['pastor', 'church_admin', 'ministry_leader', 'member'],
      priority: 'normal',
      defaultChannel: 'push',
      quietHoursBehavior: 'queue'
    },
    {
      id: 'rule_system_security',
      category: 'system',
      eventType: 'security_alert',
      name: 'Critical Security Alert',
      enabled: true,
      targetRoles: ['pastor', 'church_admin', 'super_admin'],
      priority: 'critical',
      defaultChannel: 'push',
      quietHoursBehavior: 'deliver_critical'
    }
  ]
};

export const DEFAULT_USER_PREFERENCES: Omit<UserNotificationPreferences, 'userId' | 'churchId'> = {
  enabledCategories: {
    events: true,
    ministry: true,
    attendance: true,
    sundayschool: true,
    prayer: true,
    visitor_followup: true,
    absence_followup: true,
    system: true // Mandatory
  },
  language: 'auto',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  preferredChannel: 'push'
};

/**
 * 1. Admin Settings Accessors
 */
export function getAdminNotificationSettings(churchId: string): AdminNotificationSettings {
  try {
    const raw = localStorage.getItem(`${ADMIN_SETTINGS_STORAGE_KEY}_${churchId}`);
    if (raw) return { ...DEFAULT_ADMIN_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {}
  return DEFAULT_ADMIN_NOTIFICATION_SETTINGS;
}

export function saveAdminNotificationSettings(churchId: string, settings: AdminNotificationSettings, actorId?: string) {
  try {
    localStorage.setItem(`${ADMIN_SETTINGS_STORAGE_KEY}_${churchId}`, JSON.stringify(settings));
    auditService.logAction(churchId, {
      action: 'smart_notification_settings.updated',
      resource_type: 'notification_settings',
      details: settings,
      actor_id: actorId
    });
  } catch (e) {
    console.error('Failed to save admin notification settings:', e);
  }
}

/**
 * 2. User Preferences Accessors
 */
export function getUserNotificationPreferences(churchId: string, userId: string): UserNotificationPreferences {
  try {
    const raw = localStorage.getItem(`${USER_PREFS_STORAGE_KEY}_${churchId}_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        userId,
        churchId,
        enabledCategories: { ...DEFAULT_USER_PREFERENCES.enabledCategories, ...parsed.enabledCategories },
        language: parsed.language || DEFAULT_USER_PREFERENCES.language,
        quietHoursStart: parsed.quietHoursStart || DEFAULT_USER_PREFERENCES.quietHoursStart,
        quietHoursEnd: parsed.quietHoursEnd || DEFAULT_USER_PREFERENCES.quietHoursEnd,
        preferredChannel: parsed.preferredChannel || DEFAULT_USER_PREFERENCES.preferredChannel
      };
    }
  } catch (e) {}
  return {
    userId,
    churchId,
    ...DEFAULT_USER_PREFERENCES
  };
}

export function saveUserNotificationPreferences(churchId: string, userId: string, prefs: Partial<UserNotificationPreferences>) {
  try {
    const existing = getUserNotificationPreferences(churchId, userId);
    const updated: UserNotificationPreferences = { ...existing, ...prefs, userId, churchId };
    localStorage.setItem(`${USER_PREFS_STORAGE_KEY}_${churchId}_${userId}`, JSON.stringify(updated));

    auditService.logAction(churchId, {
      action: 'user_notification_preferences.updated',
      resource_type: 'user_preferences',
      resource_id: userId,
      details: updated,
      actor_id: userId
    });
  } catch (e) {
    console.error('Failed to save user notification preferences:', e);
  }
}

/**
 * 3. Deduplication Mechanism
 */
export function generateNotificationDedupKey(params: {
  recipientUserId: string;
  category: SmartNotificationCategory;
  sourceEntityId?: string;
  eventAction: string;
  timeWindowStr?: string;
}): string {
  const { recipientUserId, category, sourceEntityId = 'global', eventAction, timeWindowStr = 'today' } = params;
  return `sndk_${recipientUserId}_${category}_${sourceEntityId}_${eventAction}_${timeWindowStr}`;
}

export function isDuplicateNotification(churchId: string, dedupKey: string): boolean {
  try {
    const raw = localStorage.getItem(`${DEDUP_KEYS_STORAGE_KEY}_${churchId}`);
    if (raw) {
      const list: Record<string, string> = JSON.parse(raw);
      if (list[dedupKey]) {
        const timestamp = new Date(list[dedupKey]).getTime();
        const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
        // Suppress duplicates within 12 hours window
        if (ageHours < 12) return true;
      }
    }
  } catch (e) {}
  return false;
}

export function recordNotificationDedupKey(churchId: string, dedupKey: string) {
  try {
    const raw = localStorage.getItem(`${DEDUP_KEYS_STORAGE_KEY}_${churchId}`);
    const list: Record<string, string> = raw ? JSON.parse(raw) : {};
    list[dedupKey] = new Date().toISOString();
    
    // Prune entries older than 48 hours to avoid memory leak
    const cutoff = Date.now() - (48 * 60 * 60 * 1000);
    Object.keys(list).forEach((key) => {
      if (new Date(list[key]).getTime() < cutoff) {
        delete list[key];
      }
    });

    localStorage.setItem(`${DEDUP_KEYS_STORAGE_KEY}_${churchId}`, JSON.stringify(list));
  } catch (e) {}
}

/**
 * 4. Quiet Hours Evaluator
 */
export function isWithinQuietHours(startTimeStr = '22:00', endTimeStr = '07:00', nowDate = new Date()): boolean {
  try {
    const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight quiet hours (e.g. 22:00 to 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch (e) {
    return false;
  }
}

/**
 * 5. Role & Ministry Authorization Scoping Check
 */
export function verifyNotificationTargetAuthorization(params: {
  recipientUser: SaaSUser;
  category: SmartNotificationCategory;
  ministryId?: string;
  userRole?: string;
  ministryMemberships?: ChurchMinistry[];
}): boolean {
  const { recipientUser, category, ministryId, userRole, ministryMemberships = [] } = params;
  const normRole = normalizeRole(userRole || recipientUser.role);

  // Church-wide Pastors / Admins receive all church notifications
  if (canAccessAllChurchReports(normRole)) return true;

  // Visitor & Absence Follow-up Admin notifications restricted to authorized staff & Ministry Leaders
  if (category === 'visitor_followup' || category === 'absence_followup') {
    return normRole === 'MinistryLeader';
  }

  // Ministry-scoped notifications
  if (ministryId) {
    const userAssignedMinistries = getUserAssignedMinistries(recipientUser, [], ministryMemberships);
    const belongsToMinistry = userAssignedMinistries.some(m => m.ministry && m.ministry.id === ministryId);
    return belongsToMinistry;
  }

  return true;
}

/**
 * 6. Central Smart Notification Dispatcher
 */
export async function dispatchSmartNotification(params: {
  churchId: string;
  recipientUser: SaaSUser;
  category: SmartNotificationCategory;
  title: string;
  message: string;
  priority?: SmartNotificationPriority;
  channel?: SmartNotificationChannel;
  linkTab?: string;
  sourceEntityId?: string;
  eventAction: string;
  isSensitive?: boolean;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; deduplicated: boolean; queuedForQuietHours: boolean; notificationId?: string }> {
  const {
    churchId,
    recipientUser,
    category,
    title,
    message,
    priority = 'normal',
    channel,
    linkTab = 'notifications',
    sourceEntityId,
    eventAction,
    isSensitive = false,
    metadata
  } = params;

  const adminSettings = getAdminNotificationSettings(churchId);
  if (!adminSettings.enabled) {
    return { success: false, deduplicated: false, queuedForQuietHours: false };
  }

  // Check user preferences
  const userPrefs = getUserNotificationPreferences(churchId, recipientUser.id);
  if (category !== 'system' && userPrefs.enabledCategories[category] === false) {
    return { success: false, deduplicated: false, queuedForQuietHours: false };
  }

  // Check Deduplication Key
  const dedupKey = generateNotificationDedupKey({
    recipientUserId: recipientUser.id,
    category,
    sourceEntityId,
    eventAction,
    timeWindowStr: new Date().toISOString().split('T')[0]
  });

  if (isDuplicateNotification(churchId, dedupKey)) {
    return { success: true, deduplicated: true, queuedForQuietHours: false };
  }

  // Check Quiet Hours
  const inQuietHours = isWithinQuietHours(userPrefs.quietHoursStart, userPrefs.quietHoursEnd);
  if (inQuietHours && priority !== 'critical') {
    // Queue notification for post-quiet hours dispatch
    queueNotificationForQuietHours(churchId, { ...params, dedupKey });
    recordNotificationDedupKey(churchId, dedupKey);
    return { success: true, deduplicated: false, queuedForQuietHours: true };
  }

  // Prepare safe push preview title & message (protect sensitive privacy)
  const pushTitle = isSensitive ? '🔒 Private Church Update' : title;
  const pushMessage = isSensitive ? 'You have a private update. Tap to view securely in the app.' : message;

  const notificationId = `notif_smart_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const finalChannel = channel || userPrefs.preferredChannel || adminSettings.defaultChannel;

  // 1. Dispatch Mobile/Web Push Notification
  try {
    sendMobilePanelNotification({
      id: notificationId,
      title: pushTitle,
      message: pushMessage,
      category,
      linkTab
    });
  } catch (err) {
    console.warn('Push delivery failed, falling back to in-app:', err);
  }

  // 2. Persist In-App AppNotification
  const appNotif: AppNotification = {
    id: notificationId,
    churchId,
    title,
    message,
    category: category === 'events' ? 'Event' : category === 'ministry' ? 'Ministry' : category === 'prayer' ? 'Prayer' : 'Announcement',
    date: new Date().toISOString(),
    read: false,
    readByUserIds: [],
    targetUserIds: [recipientUser.id],
    linkTab,
    metadata: {
      ...metadata,
      smartCategory: category,
      priority,
      channel: finalChannel,
      isSensitive
    }
  };

  saveInAppNotification(churchId, appNotif);
  recordNotificationDedupKey(churchId, dedupKey);

  auditService.logAction(churchId, {
    action: 'smart_notification.dispatched',
    resource_type: 'notification',
    resource_id: notificationId,
    details: { recipientUserId: recipientUser.id, category, priority, channel: finalChannel },
    actor_id: recipientUser.id
  });

  return { success: true, deduplicated: false, queuedForQuietHours: false, notificationId };
}

/**
 * 7. In-App Notification Storage Helper
 */
export function getInAppNotifications(churchId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(`${NOTIFS_STORAGE_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveInAppNotification(churchId: string, notif: AppNotification) {
  try {
    const list = getInAppNotifications(churchId);
    list.unshift(notif);
    // Keep last 100 notifications
    const trimmed = list.slice(0, 100);
    localStorage.setItem(`${NOTIFS_STORAGE_KEY}_${churchId}`, JSON.stringify(trimmed));
  } catch (e) {}
}

/**
 * 8. Quiet Hours Queue Helper
 */
function queueNotificationForQuietHours(churchId: string, payload: any) {
  try {
    const raw = localStorage.getItem(`${QUEUED_NOTIFS_STORAGE_KEY}_${churchId}`);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ ...payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(`${QUEUED_NOTIFS_STORAGE_KEY}_${churchId}`, JSON.stringify(list));
  } catch (e) {}
}

export function processQueuedQuietHoursNotifications(churchId: string, allUsers: SaaSUser[]) {
  try {
    const raw = localStorage.getItem(`${QUEUED_NOTIFS_STORAGE_KEY}_${churchId}`);
    if (!raw) return;
    const queuedList: any[] = JSON.parse(raw);
    if (queuedList.length === 0) return;

    const remaining: any[] = [];
    queuedList.forEach((item) => {
      const user = allUsers.find(u => u.id === item.recipientUser?.id);
      if (!user) return;
      const userPrefs = getUserNotificationPreferences(churchId, user.id);
      const inQuiet = isWithinQuietHours(userPrefs.quietHoursStart, userPrefs.quietHoursEnd);
      
      if (!inQuiet) {
        dispatchSmartNotification(item);
      } else {
        remaining.push(item);
      }
    });

    localStorage.setItem(`${QUEUED_NOTIFS_STORAGE_KEY}_${churchId}`, JSON.stringify(remaining));
  } catch (e) {}
}

/**
 * 9. Central Automated Scheduler Engine
 * Runs background evaluations for upcoming event reminders, roster assignments, and follow-ups.
 */
export async function runSmartNotificationScheduler(params: {
  churchId: string;
  allUsers: SaaSUser[];
  members: Member[];
  events: ChurchEvent[];
  roster: RosterAssignment[];
  ministries: ChurchMinistry[];
}): Promise<{ remindersSent: number; quietHoursFlushed: number }> {
  const { churchId, allUsers = [], members = [], events = [], roster = [], ministries = [] } = params;

  let remindersSent = 0;

  // Flush Quiet Hours Queue if quiet hours ended
  processQueuedQuietHoursNotifications(churchId, allUsers);

  const now = new Date();
  const nowDateStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // 1. Evaluate Event Reminders (24h before)
  events.forEach((evt) => {
    if (evt.date === tomorrowStr) {
      allUsers.forEach((usr) => {
        dispatchSmartNotification({
          churchId,
          recipientUser: usr,
          category: 'events',
          title: `Upcoming Event Tomorrow: ${evt.title}`,
          message: `${evt.title} is scheduled for tomorrow at ${evt.time || '10:00 AM'} in ${evt.location || 'Sanctuary'}.`,
          priority: 'normal',
          linkTab: 'events',
          sourceEntityId: evt.id,
          eventAction: 'reminder_24h'
        }).then(res => {
          if (res.success && !res.deduplicated) remindersSent++;
        });
      });
    }
  });

  // 2. Evaluate Ministry Roster Assignments (24h before)
  roster.forEach((r) => {
    if (r.serviceDate === tomorrowStr && r.memberId) {
      const assignedUser = findLinkedUserForMember(r.memberId, allUsers, members);
      if (assignedUser) {
        dispatchSmartNotification({
          churchId,
          recipientUser: assignedUser,
          category: 'ministry',
          title: `Ministry Assignment Tomorrow`,
          message: `Reminder: You are scheduled for "${r.roleName}" in ${r.serviceName} tomorrow (${r.serviceDate}).`,
          priority: 'high',
          linkTab: 'roster',
          sourceEntityId: r.id,
          eventAction: 'assignment_reminder_24h'
        }).then(res => {
          if (res.success && !res.deduplicated) remindersSent++;
        });
      }
    }
  });

  // 3. Evaluate Visitor & Absence Follow-Up Pending Alerts for Authorized Staff
  const visitorTasks = getAutomatedFollowUpTasks(churchId);
  const pendingVisitorCount = visitorTasks.filter(t => t.status === 'awaiting_approval').length;

  const absenceTasks = getAutomatedAbsenceTasks(churchId);
  const pendingAbsenceCount = absenceTasks.filter(t => t.status === 'awaiting_approval').length;

  if (pendingVisitorCount > 0 || pendingAbsenceCount > 0) {
    const authorizedStaff = allUsers.filter(u => canAccessAllChurchReports(u.role) || normalizeRole(u.role) === 'MinistryLeader');
    authorizedStaff.forEach((staff) => {
      dispatchSmartNotification({
        churchId,
        recipientUser: staff,
        category: 'visitor_followup',
        title: `Follow-Up Approval Pending`,
        message: `You have ${pendingVisitorCount} visitor tasks and ${pendingAbsenceCount} absence tasks awaiting staff review.`,
        priority: 'high',
        linkTab: 'absence-followup',
        sourceEntityId: `followup_summary_${nowDateStr}`,
        eventAction: 'pending_approval_alert'
      }).then(res => {
        if (res.success && !res.deduplicated) remindersSent++;
      });
    });
  }

  return { remindersSent, quietHoursFlushed: 0 };
}
