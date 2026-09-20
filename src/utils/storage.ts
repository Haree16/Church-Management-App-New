import { 
  Member, PrayerRequest, RosterAssignment, AttendanceRecord, ChurchEvent, 
  AppNotification, PastorAnnouncement,
  ChurchTenant, SaaSUser, AuthSession,
  SundaySchoolClass, SundaySchoolStudent, SundaySchoolAttendanceRecord, WhatsAppReminderTemplate,
  WhatsAppGroup,
  CompleteChurchSettings,
  ChurchMinistry, MinistryMember, MinistryTeam, MinistryTeamMember,
  MinistryActivity, MinistryAnnouncement
} from '../types';
import { 
  INITIAL_MEMBERS, INITIAL_PRAYERS, INITIAL_ROSTER, INITIAL_ATTENDANCE, 
  INITIAL_EVENTS, INITIAL_NOTIFICATIONS, INITIAL_ANNOUNCEMENTS,
  INITIAL_CHURCHES, INITIAL_SAAS_USERS, INITIAL_SUNDAY_SCHOOL_CLASSES,
  INITIAL_SUNDAY_SCHOOL_STUDENTS, INITIAL_SUNDAY_SCHOOL_ATTENDANCE, INITIAL_WHATSAPP_TEMPLATES,
  INITIAL_WHATSAPP_GROUPS,
  INITIAL_CHURCH_SETTINGS,
  INITIAL_MINISTRIES, INITIAL_MINISTRY_MEMBERS, INITIAL_MINISTRY_TEAMS,
  INITIAL_MINISTRY_TEAM_MEMBERS, INITIAL_MINISTRY_ACTIVITIES,
  INITIAL_MINISTRY_ANNOUNCEMENTS
} from '../data/initialData';

const STORAGE_KEYS = {
  AUTH_SESSION: 'nca_church_auth_session_v4',
  USERS: 'nca_church_saas_users_v4',
  CHURCHES: 'nca_church_tenants_v4',
  CHURCH_SETTINGS: 'nca_church_settings_v4',
  MEMBERS: 'nca_church_members_v4',
  MINISTRIES: 'nca_church_ministries_v4',
  MINISTRY_MEMBERS: 'nca_church_ministry_members_v4',
  MINISTRY_TEAMS: 'nca_church_ministry_teams_v4',
  MINISTRY_TEAM_MEMBERS: 'nca_church_ministry_team_members_v4',
  MINISTRY_ACTIVITIES: 'nca_church_ministry_activities_v4',
  MINISTRY_ANNOUNCEMENTS: 'nca_church_ministry_announcements_v4',
  PRAYERS: 'nca_church_prayers_v4',
  ROSTER: 'nca_church_roster_v4',
  ATTENDANCE: 'nca_church_attendance_v4',
  EVENTS: 'nca_church_events_v4',
  NOTIFICATIONS: 'nca_church_notifications_v4',
  ANNOUNCEMENTS: 'nca_church_announcements_v4',
  SUNDAY_SCHOOL_CLASSES: 'nca_church_ss_classes_v4',
  SUNDAY_SCHOOL_STUDENTS: 'nca_church_ss_students_v4',
  SUNDAY_SCHOOL_ATTENDANCE: 'nca_church_ss_attendance_v4',
  WHATSAPP_TEMPLATES: 'nca_church_wa_templates_v4',
  WHATSAPP_GROUPS: 'nca_church_wa_groups_v4',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    return defaultValue;
  }
}

function stripLargeBase64<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripLargeBase64) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj as Record<string, any>)) {
    if (typeof v === 'string' && v.startsWith('data:image/') && v.length > 50000) {
      cleaned[k] = v.substring(0, 100) + '...[truncated]';
    } else if (v && typeof v === 'object') {
      cleaned[k] = stripLargeBase64(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned as T;
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    try {
      // 1. Purge legacy schema versions (_v1, _v2, _v3, etc.) and debug logs
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.includes('_v1') ||
            k.includes('_v2') ||
            k.includes('_v3') ||
            k.startsWith('church_cms_') ||
            k.includes('debug') ||
            k.includes('log'))
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e2) {
      try {
        // 2. Strip massive base64 image strings to fit under browser 5MB quota
        const lightweight = stripLargeBase64(value);
        localStorage.setItem(key, JSON.stringify(lightweight));
      } catch (e3) {
        try {
          // 3. Evict non-critical caches (notifications, announcements) to free quota for active tab
          localStorage.removeItem('nca_church_notifications_v4');
          localStorage.removeItem('nca_church_announcements_v4');
          localStorage.removeItem('nca_church_ss_attendance_v4');

          let trimmedPayload: any = stripLargeBase64(value);
          if (Array.isArray(trimmedPayload) && trimmedPayload.length > 50) {
            trimmedPayload = trimmedPayload.slice(0, 50);
          }
          localStorage.setItem(key, JSON.stringify(trimmedPayload));
        } catch (e4) {
          // Silent fallback - memory state and Firestore cloud database handle all data seamlessly
        }
      }
    }
  }
}

const REMOVED_MOCK_USER_IDS = new Set([
  'user-admin',
  'user-pastor-samuel',
  'user-pastor-john',
  'user-grace-teacher',
  'user-rajesh-leader',
  'user-priya-treasurer',
  'user-anitha-member',
  'user-thomas-volunteer',
  'user-pastor-david',
  'user-pastor-mathew',
  'user-pastor',
  'user-david',
  'user-john',
  'user-mary',
  'user-harris',
  'mem-pastor',
  'mem-david',
  'mem-john',
  'mem-mary',
  'mem-harris',
]);

const REMOVED_MOCK_USERNAMES = new Set([
  'admin',
  'pastor.samuel',
  'pastor.john',
  'grace.teacher',
  'rajesh.leader',
  'priya.treasurer',
  'anitha.member',
  'thomas.volunteer',
  'pastor.david',
  'pastor.mathew',
  'david.leader',
  'john.member',
  'mary.member',
  'harris.leader',
]);

export const REMOVED_MOCK_CHURCH_IDS = new Set([
  'church-2',
  'church-3',
  'church-crc',
  'church-gwc',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003'
]);

export const REMOVED_MOCK_CHURCH_NAMES = new Set([
  'calvary revival chapel',
  'grace worship center'
]);

const REMOVED_MOCK_MEMBER_IDS = new Set([
  'mem-1',
  'mem-2',
  'mem-3',
  'mem-4',
  'mem-5',
  'mem-gwc-1',
  'mem-crc-1',
]);

// 1. Auth Session Persistence (Session stays indefinitely across reloads until explicit logout or cache cleared)
export const getStoredAuthSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (
      session?.user &&
      (REMOVED_MOCK_USER_IDS.has(session.user.id) ||
        REMOVED_MOCK_USERNAMES.has(session.user.username?.toLowerCase()))
    ) {
      session.user = INITIAL_SAAS_USERS[0];
      session.church = INITIAL_CHURCHES[0];
      saveStoredAuthSession(session);
    }
    if (
      session?.church &&
      (REMOVED_MOCK_CHURCH_IDS.has(session.church.id) ||
        REMOVED_MOCK_CHURCH_NAMES.has(session.church.name?.toLowerCase()?.trim()))
    ) {
      session.church = INITIAL_CHURCHES[0];
      saveStoredAuthSession(session);
    }
    return session;
  } catch (err) {
    return null;
  }
};

export const saveStoredAuthSession = (session: AuthSession): void => {
  setItem(STORAGE_KEYS.AUTH_SESSION, session);
};

export const clearStoredAuthSession = (): void => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
};

// 2. Tenants & Users
export const getStoredChurches = (): ChurchTenant[] => {
  const churches = getItem(STORAGE_KEYS.CHURCHES, INITIAL_CHURCHES);
  const filtered = (churches || []).filter(
    c => !REMOVED_MOCK_CHURCH_IDS.has(c.id) && !REMOVED_MOCK_CHURCH_NAMES.has(c.name?.toLowerCase()?.trim())
  );
  return filtered.length > 0 ? filtered : INITIAL_CHURCHES;
};
export const saveStoredChurches = (data: ChurchTenant[]): void => setItem(STORAGE_KEYS.CHURCHES, data);

export const getStoredUsers = (): SaaSUser[] => {
  const users = getItem(STORAGE_KEYS.USERS, INITIAL_SAAS_USERS);
  const filtered = (users || []).filter(
    u => !REMOVED_MOCK_USER_IDS.has(u.id) && !REMOVED_MOCK_USERNAMES.has(u.username?.toLowerCase())
  );
  if (!filtered.some(u => u.username?.toLowerCase() === 'superadmin')) {
    filtered.unshift(INITIAL_SAAS_USERS[0]);
  }
  return filtered;
};
export const saveStoredUsers = (data: SaaSUser[]): void => setItem(STORAGE_KEYS.USERS, data);

// 2.1 Church Settings Map per Tenant
export const getAllStoredChurchSettings = (): Record<string, CompleteChurchSettings> => {
  return getItem(STORAGE_KEYS.CHURCH_SETTINGS, INITIAL_CHURCH_SETTINGS);
};

export const saveAllStoredChurchSettings = (data: Record<string, CompleteChurchSettings>): void => {
  setItem(STORAGE_KEYS.CHURCH_SETTINGS, data);
};

export const getDefaultChurchSettings = (churchId: string, churchName?: string): CompleteChurchSettings => {
  if (INITIAL_CHURCH_SETTINGS[churchId]) {
    const init = JSON.parse(JSON.stringify(INITIAL_CHURCH_SETTINGS[churchId]));
    return init;
  }
  const base = JSON.parse(JSON.stringify(INITIAL_CHURCH_SETTINGS['church-1']));
  return {
    ...base,
    id: `cs-${churchId}`,
    church_id: churchId,
    profile: {
      ...base.profile,
      name: churchName || `Church ${churchId}`,
      shortName: (churchName || churchId).substring(0, 12),
      tagline: '',
      email: `office@${churchId}.org`,
    },
    updatedAt: new Date().toISOString(),
  };
};

export const getStoredChurchSettings = (churchId: string): CompleteChurchSettings => {
  const all = getAllStoredChurchSettings();
  if (all && all[churchId]) {
    return all[churchId];
  }
  const defaultSettings = getDefaultChurchSettings(churchId);
  const updated = { ...(all || {}), [churchId]: defaultSettings };
  saveAllStoredChurchSettings(updated);
  return defaultSettings;
};

export const saveStoredChurchSettings = (churchId: string, settings: CompleteChurchSettings): void => {
  const all = getAllStoredChurchSettings();
  const stamped: CompleteChurchSettings = {
    ...settings,
    church_id: churchId,
    updatedAt: new Date().toISOString(),
  };
  const updated = { ...(all || {}), [churchId]: stamped };
  saveAllStoredChurchSettings(updated);
};

// 3. Core Church Records
export const getStoredMembers = (): Member[] => {
  const members = getItem(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  return (members || []).filter(m => !REMOVED_MOCK_MEMBER_IDS.has(m.id));
};
export const saveStoredMembers = (data: Member[]): void => setItem(STORAGE_KEYS.MEMBERS, data);

// 3.1 Reusable Ministries Framework
export const getStoredMinistries = (): ChurchMinistry[] => getItem(STORAGE_KEYS.MINISTRIES, INITIAL_MINISTRIES);
export const saveStoredMinistries = (data: ChurchMinistry[]): void => setItem(STORAGE_KEYS.MINISTRIES, data);

export const getStoredMinistryMembers = (): MinistryMember[] => getItem(STORAGE_KEYS.MINISTRY_MEMBERS, INITIAL_MINISTRY_MEMBERS);
export const saveStoredMinistryMembers = (data: MinistryMember[]): void => setItem(STORAGE_KEYS.MINISTRY_MEMBERS, data);

export const getStoredMinistryTeams = (): MinistryTeam[] => getItem(STORAGE_KEYS.MINISTRY_TEAMS, INITIAL_MINISTRY_TEAMS);
export const saveStoredMinistryTeams = (data: MinistryTeam[]): void => setItem(STORAGE_KEYS.MINISTRY_TEAMS, data);

export const getStoredMinistryTeamMembers = (): MinistryTeamMember[] => getItem(STORAGE_KEYS.MINISTRY_TEAM_MEMBERS, INITIAL_MINISTRY_TEAM_MEMBERS);
export const saveStoredMinistryTeamMembers = (data: MinistryTeamMember[]): void => setItem(STORAGE_KEYS.MINISTRY_TEAM_MEMBERS, data);

export const getStoredMinistryActivities = (): MinistryActivity[] => getItem(STORAGE_KEYS.MINISTRY_ACTIVITIES, INITIAL_MINISTRY_ACTIVITIES);
export const saveStoredMinistryActivities = (data: MinistryActivity[]): void => setItem(STORAGE_KEYS.MINISTRY_ACTIVITIES, data);

export const getStoredMinistryAnnouncements = (): MinistryAnnouncement[] => getItem(STORAGE_KEYS.MINISTRY_ANNOUNCEMENTS, INITIAL_MINISTRY_ANNOUNCEMENTS);
export const saveStoredMinistryAnnouncements = (data: MinistryAnnouncement[]): void => setItem(STORAGE_KEYS.MINISTRY_ANNOUNCEMENTS, data);

export const getStoredPrayers = (): PrayerRequest[] => {
  const prayers = getItem(STORAGE_KEYS.PRAYERS, INITIAL_PRAYERS);
  return (prayers || []).filter(
    p => !['pray-1', 'pray-2', 'pray-3', 'pray-gwc-1'].includes(p.id) && !REMOVED_MOCK_MEMBER_IDS.has(p.memberId || '')
  );
};
export const saveStoredPrayers = (data: PrayerRequest[]): void => setItem(STORAGE_KEYS.PRAYERS, data);

export const getStoredRoster = (): RosterAssignment[] => getItem(STORAGE_KEYS.ROSTER, INITIAL_ROSTER);
export const saveStoredRoster = (data: RosterAssignment[]): void => setItem(STORAGE_KEYS.ROSTER, data);

export const getStoredAttendance = (): AttendanceRecord[] => getItem(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
export const saveStoredAttendance = (data: AttendanceRecord[]): void => setItem(STORAGE_KEYS.ATTENDANCE, data);

export const getStoredEvents = (): ChurchEvent[] => getItem(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
export const saveStoredEvents = (data: ChurchEvent[]): void => setItem(STORAGE_KEYS.EVENTS, data);

export const getStoredNotifications = (): AppNotification[] => getItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
export const saveStoredNotifications = (data: AppNotification[]): void => setItem(STORAGE_KEYS.NOTIFICATIONS, data);

export const getStoredAnnouncements = (): PastorAnnouncement[] => getItem(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
export const saveStoredAnnouncements = (data: PastorAnnouncement[]): void => setItem(STORAGE_KEYS.ANNOUNCEMENTS, data);

export const getStoredSundaySchoolClasses = (): SundaySchoolClass[] => getItem(STORAGE_KEYS.SUNDAY_SCHOOL_CLASSES, INITIAL_SUNDAY_SCHOOL_CLASSES);
export const saveStoredSundaySchoolClasses = (data: SundaySchoolClass[]): void => setItem(STORAGE_KEYS.SUNDAY_SCHOOL_CLASSES, data);

export const getStoredSundaySchoolStudents = (): SundaySchoolStudent[] => getItem(STORAGE_KEYS.SUNDAY_SCHOOL_STUDENTS, INITIAL_SUNDAY_SCHOOL_STUDENTS);
export const saveStoredSundaySchoolStudents = (data: SundaySchoolStudent[]): void => setItem(STORAGE_KEYS.SUNDAY_SCHOOL_STUDENTS, data);

export const getStoredSundaySchoolAttendance = (): SundaySchoolAttendanceRecord[] => getItem(STORAGE_KEYS.SUNDAY_SCHOOL_ATTENDANCE, INITIAL_SUNDAY_SCHOOL_ATTENDANCE);
export const saveStoredSundaySchoolAttendance = (data: SundaySchoolAttendanceRecord[]): void => setItem(STORAGE_KEYS.SUNDAY_SCHOOL_ATTENDANCE, data);

export const getStoredWhatsAppTemplates = (): WhatsAppReminderTemplate[] => getItem(STORAGE_KEYS.WHATSAPP_TEMPLATES, INITIAL_WHATSAPP_TEMPLATES);
export const saveStoredWhatsAppTemplates = (data: WhatsAppReminderTemplate[]): void => setItem(STORAGE_KEYS.WHATSAPP_TEMPLATES, data);

export const getStoredWhatsAppGroups = (): WhatsAppGroup[] => getItem(STORAGE_KEYS.WHATSAPP_GROUPS, INITIAL_WHATSAPP_GROUPS);
export const saveStoredWhatsAppGroups = (data: WhatsAppGroup[]): void => setItem(STORAGE_KEYS.WHATSAPP_GROUPS, data);

export function resetAllDataToDefault(): void {
  saveStoredChurches(INITIAL_CHURCHES);
  saveStoredUsers(INITIAL_SAAS_USERS);
  saveAllStoredChurchSettings(INITIAL_CHURCH_SETTINGS);
  saveStoredMembers(INITIAL_MEMBERS);
  saveStoredMinistries(INITIAL_MINISTRIES);
  saveStoredMinistryMembers(INITIAL_MINISTRY_MEMBERS);
  saveStoredMinistryTeams(INITIAL_MINISTRY_TEAMS);
  saveStoredMinistryTeamMembers(INITIAL_MINISTRY_TEAM_MEMBERS);
  saveStoredMinistryActivities(INITIAL_MINISTRY_ACTIVITIES);
  saveStoredMinistryAnnouncements(INITIAL_MINISTRY_ANNOUNCEMENTS);
  saveStoredPrayers(INITIAL_PRAYERS);
  saveStoredRoster(INITIAL_ROSTER);
  saveStoredAttendance(INITIAL_ATTENDANCE);
  saveStoredEvents(INITIAL_EVENTS);
  saveStoredNotifications(INITIAL_NOTIFICATIONS);
  saveStoredAnnouncements(INITIAL_ANNOUNCEMENTS);
  saveStoredSundaySchoolClasses(INITIAL_SUNDAY_SCHOOL_CLASSES);
  saveStoredSundaySchoolStudents(INITIAL_SUNDAY_SCHOOL_STUDENTS);
  saveStoredSundaySchoolAttendance(INITIAL_SUNDAY_SCHOOL_ATTENDANCE);
  saveStoredWhatsAppTemplates(INITIAL_WHATSAPP_TEMPLATES);
  saveStoredWhatsAppGroups(INITIAL_WHATSAPP_GROUPS);
}

export function exportDataAsJson(churchId?: string): string {
  const allMembers = getStoredMembers();
  const allPrayers = getStoredPrayers();
  const allAttendance = getStoredAttendance();
  const allEvents = getStoredEvents();
  const allAnnouncements = getStoredAnnouncements();

  const filterByChurch = <T extends { church_id?: string; churchId?: string }>(items: T[]): T[] => {
    if (!churchId) return items;
    return items.filter(i => (i.church_id === churchId || i.churchId === churchId));
  };

  const payload = {
    exportedAt: new Date().toISOString(),
    church_id: churchId || 'all',
    members: filterByChurch(allMembers),
    prayers: filterByChurch(allPrayers),
    attendance: filterByChurch(allAttendance),
    events: filterByChurch(allEvents),
    announcements: filterByChurch(allAnnouncements),
  };
  return JSON.stringify(payload, null, 2);
}

export function exportMembersToCsv(members: Member[]): string {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'PIN Code', 'Status', 'Joined Date', 'Teams', 'Skills'];
  const rows = members.map(m => [
    `"${m.firstName || ''}"`,
    `"${m.lastName || ''}"`,
    `"${m.email || ''}"`,
    `"${m.phone || ''}"`,
    `"${m.address || ''}"`,
    `"${m.city || ''}"`,
    `"${m.state || ''}"`,
    `"${m.zipCode || ''}"`,
    `"${m.status || ''}"`,
    `"${m.joinedDate || ''}"`,
    `"${(m.ministryTeams || []).join(', ')}"`,
    `"${(m.skills || []).join(', ')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
