import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Member, PrayerRequest, RosterAssignment, AttendanceRecord, ChurchEvent, 
  AppNotification, PastorAnnouncement,
  ChurchTenant, SaaSUser, SundaySchoolClass, SundaySchoolStudent, SundaySchoolAttendanceRecord, WhatsAppReminderTemplate,
  WhatsAppGroup,
  CompleteChurchSettings,
  ChurchMinistry, MinistryMember, MinistryTeam, MinistryTeamMember,
  MinistryActivity, MinistryAnnouncement
} from '../types';
import { Visitor, VisitorVisit } from '../types/database';
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
import { 
  getStoredChurches, getStoredUsers, getStoredMembers, getStoredPrayers,
  getStoredRoster, getStoredAttendance, getStoredEvents, getStoredNotifications,
  getStoredAnnouncements, getStoredSundaySchoolClasses, getStoredSundaySchoolStudents,
  getStoredSundaySchoolAttendance,
  getStoredWhatsAppTemplates, getStoredWhatsAppGroups, getAllStoredChurchSettings,
  getStoredMinistries, getStoredMinistryMembers, getStoredMinistryTeams,
  getStoredMinistryTeamMembers, getStoredMinistryActivities, getStoredMinistryAnnouncements,
  saveStoredMembers, saveStoredPrayers, saveStoredRoster, saveStoredAttendance,
  saveStoredEvents, saveStoredNotifications, saveStoredAnnouncements,
  saveStoredChurches, saveStoredUsers, saveStoredSundaySchoolClasses,
  saveStoredSundaySchoolStudents, saveStoredSundaySchoolAttendance, saveStoredWhatsAppTemplates,
  saveStoredWhatsAppGroups,
  saveAllStoredChurchSettings, saveStoredChurchSettings, getDefaultChurchSettings,
  saveStoredMinistries, saveStoredMinistryMembers, saveStoredMinistryTeams,
  saveStoredMinistryTeamMembers, saveStoredMinistryActivities, saveStoredMinistryAnnouncements
} from '../utils/storage';

const CHURCHES_COL = 'churches';
const USERS_COL = 'users';
const CHURCH_SETTINGS_COL = 'church_settings';
const MEMBERS_COL = 'members';
const MINISTRIES_COL = 'ministries';
const MINISTRY_MEMBERS_COL = 'ministry_members';
const MINISTRY_TEAMS_COL = 'ministry_teams';
const MINISTRY_TEAM_MEMBERS_COL = 'ministry_team_members';
const MINISTRY_ACTIVITIES_COL = 'ministry_activities';
const MINISTRY_ANNOUNCEMENTS_COL = 'ministry_announcements';
const PRAYERS_COL = 'prayers';
const ROSTER_COL = 'roster';
const ATTENDANCE_COL = 'attendance';
const EVENTS_COL = 'events';
const NOTIFICATIONS_COL = 'notifications';
const ANNOUNCEMENTS_COL = 'announcements';
const SUNDAY_SCHOOL_CLASSES_COL = 'sundayschool_classes';
const SUNDAY_SCHOOL_STUDENTS_COL = 'sundayschool_students';
const SUNDAY_SCHOOL_ATTENDANCE_COL = 'sundayschool_attendance';
const WHATSAPP_TEMPLATES_COL = 'whatsapp_templates';
const WHATSAPP_GROUPS_COL = 'whatsapp_groups';

function cleanForFirestore<T>(obj: T): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanForFirestore(item) : item));
  }
  const cleaned: Record<string, any> = {};
  Object.keys(obj as object).forEach((key) => {
    const val = (obj as any)[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        cleaned[key] = cleanForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    }
  });
  return cleaned;
}

const SYSTEM_META_COL = 'system_meta';
const SEED_DOC_ID = 'seed_v1';
const LOCAL_SEEDED_KEY = 'cms_firestore_seeded_v1';

function safeSetLocalStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // Ignore quota errors when setting flags
  }
}

/**
 * Robustly seeds initial data into Firestore only once on very first launch.
 * Uses local storage flag and checks core tenant collections so user deletions are never overwritten or revived.
 */
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    // 1. Check local storage flag
    if (localStorage.getItem(LOCAL_SEEDED_KEY) === 'true') {
      return;
    }

    // 2. Check system meta document
    const seedDocRef = doc(db, SYSTEM_META_COL, SEED_DOC_ID);
    const seedSnap = await getDoc(seedDocRef).catch(() => null);
    if (seedSnap && seedSnap.exists()) {
      safeSetLocalStorageItem(LOCAL_SEEDED_KEY, 'true');
      return;
    }

    // 3. Check if churches or users already exist in Firestore
    const churchSnap = await getDocs(collection(db, CHURCHES_COL)).catch(() => null);
    const userSnap = await getDocs(collection(db, USERS_COL)).catch(() => null);

    if ((churchSnap && !churchSnap.empty) || (userSnap && !userSnap.empty)) {
      safeSetLocalStorageItem(LOCAL_SEEDED_KEY, 'true');
      await setDoc(seedDocRef, { seeded: true, initializedAt: new Date().toISOString() }).catch(console.warn);
      return;
    }

    // 4. Fresh database - perform one-time initial seed
    const batch = writeBatch(db);
    INITIAL_CHURCHES.forEach((c) => batch.set(doc(db, CHURCHES_COL, c.id), cleanForFirestore(c)));
    INITIAL_SAAS_USERS.forEach((u) => batch.set(doc(db, USERS_COL, u.id), cleanForFirestore(u)));
    Object.entries(INITIAL_CHURCH_SETTINGS).forEach(([churchId, settings]) => {
      batch.set(doc(db, CHURCH_SETTINGS_COL, churchId), cleanForFirestore(settings));
    });
    INITIAL_MEMBERS.forEach((m) => batch.set(doc(db, MEMBERS_COL, m.id), cleanForFirestore(m)));
    INITIAL_MINISTRIES.forEach((min) => batch.set(doc(db, MINISTRIES_COL, min.id), cleanForFirestore(min)));
    INITIAL_MINISTRY_MEMBERS.forEach((mm) => batch.set(doc(db, MINISTRY_MEMBERS_COL, mm.id), cleanForFirestore(mm)));
    INITIAL_MINISTRY_TEAMS.forEach((mt) => batch.set(doc(db, MINISTRY_TEAMS_COL, mt.id), cleanForFirestore(mt)));
    INITIAL_MINISTRY_TEAM_MEMBERS.forEach((mtm) => batch.set(doc(db, MINISTRY_TEAM_MEMBERS_COL, mtm.id), cleanForFirestore(mtm)));
    INITIAL_MINISTRY_ACTIVITIES.forEach((act) => batch.set(doc(db, MINISTRY_ACTIVITIES_COL, act.id), cleanForFirestore(act)));
    INITIAL_MINISTRY_ANNOUNCEMENTS.forEach((ann) => batch.set(doc(db, MINISTRY_ANNOUNCEMENTS_COL, ann.id), cleanForFirestore(ann)));
    INITIAL_PRAYERS.forEach((p) => batch.set(doc(db, PRAYERS_COL, p.id), cleanForFirestore(p)));
    INITIAL_EVENTS.forEach((e) => batch.set(doc(db, EVENTS_COL, e.id), cleanForFirestore(e)));
    INITIAL_SUNDAY_SCHOOL_CLASSES.forEach((sc) => batch.set(doc(db, SUNDAY_SCHOOL_CLASSES_COL, sc.id), cleanForFirestore(sc)));
    INITIAL_SUNDAY_SCHOOL_STUDENTS.forEach((ss) => batch.set(doc(db, SUNDAY_SCHOOL_STUDENTS_COL, ss.id), cleanForFirestore(ss)));
    INITIAL_SUNDAY_SCHOOL_ATTENDANCE.forEach((ssa) => batch.set(doc(db, SUNDAY_SCHOOL_ATTENDANCE_COL, ssa.id), cleanForFirestore(ssa)));
    INITIAL_NOTIFICATIONS.forEach((n) => batch.set(doc(db, NOTIFICATIONS_COL, n.id), cleanForFirestore(n)));
    INITIAL_ANNOUNCEMENTS.forEach((an) => batch.set(doc(db, ANNOUNCEMENTS_COL, an.id), cleanForFirestore(an)));
    INITIAL_ROSTER.forEach((r) => batch.set(doc(db, ROSTER_COL, r.id), cleanForFirestore(r)));
    INITIAL_ATTENDANCE.forEach((a) => batch.set(doc(db, ATTENDANCE_COL, a.id), cleanForFirestore(a)));
    INITIAL_WHATSAPP_TEMPLATES.forEach((wt) => batch.set(doc(db, WHATSAPP_TEMPLATES_COL, wt.id), cleanForFirestore(wt)));
    batch.set(seedDocRef, { seeded: true, initializedAt: new Date().toISOString() });

    await batch.commit().catch(console.warn);
    safeSetLocalStorageItem(LOCAL_SEEDED_KEY, 'true');
  } catch (err) {
    // Silent catch for quota exceptions
  }
}

// CHURCHES
const REMOVED_MOCK_CHURCH_IDS = new Set([
  'church-2',
  'church-3',
  'church-crc',
  'church-gwc',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003'
]);

const REMOVED_MOCK_CHURCH_NAMES = new Set([
  'calvary revival chapel',
  'grace worship center'
]);

export function subscribeChurches(onUpdate: (data: ChurchTenant[]) => void): () => void {
  return onSnapshot(collection(db, CHURCHES_COL), (snapshot) => {
    let list: ChurchTenant[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as ChurchTenant;
      if (
        REMOVED_MOCK_CHURCH_IDS.has(d.id) ||
        REMOVED_MOCK_CHURCH_IDS.has(data.id) ||
        REMOVED_MOCK_CHURCH_NAMES.has(data.name?.toLowerCase()?.trim())
      ) {
        deleteDoc(doc(db, CHURCHES_COL, d.id)).catch(console.warn);
        return;
      }
      list.push(data);
    });

    const localChurches = getStoredChurches() || [];
    localChurches.forEach((localC) => {
      if (
        !REMOVED_MOCK_CHURCH_IDS.has(localC.id) &&
        !REMOVED_MOCK_CHURCH_NAMES.has(localC.name?.toLowerCase()?.trim()) &&
        !list.some((c) => c.id === localC.id)
      ) {
        list.push(localC);
      }
    });

    INITIAL_CHURCHES.forEach((initChurch) => {
      if (!list.some((c) => c.id === initChurch.id)) {
        list.push(initChurch);
      }
    });

    list = list.filter(
      (c) =>
        !REMOVED_MOCK_CHURCH_IDS.has(c.id) &&
        !REMOVED_MOCK_CHURCH_NAMES.has(c.name?.toLowerCase()?.trim())
    );

    saveStoredChurches(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeChurches error:', err);
    onUpdate(getStoredChurches());
  });
}

export async function saveChurchToFirestore(church: ChurchTenant): Promise<void> {
  await setDoc(doc(db, CHURCHES_COL, church.id), cleanForFirestore(church), { merge: true });
}

// CHURCH SETTINGS
export function subscribeChurchSettings(onUpdate: (data: Record<string, CompleteChurchSettings>) => void): () => void {
  return onSnapshot(collection(db, CHURCH_SETTINGS_COL), (snapshot) => {
    const settingsMap: Record<string, CompleteChurchSettings> = {};
    snapshot.forEach((d) => {
      const data = d.data() as CompleteChurchSettings;
      settingsMap[d.id] = {
        ...data,
        id: data?.id || d.id,
        church_id: data?.church_id || d.id,
        profile: { ...(data?.profile || {}) },
        services: data?.services || [],
        ministries: data?.ministries || [],
        memberSettings: data?.memberSettings || {},
        attendanceSettings: data?.attendanceSettings || {},
        notificationSettings: data?.notificationSettings || {},
        localization: data?.localization || {},
        appearance: data?.appearance || {},
        security: data?.security || {},
        preferences: data?.preferences || { moduleToggles: {} },
      };
    });

    // Ensure all churches have settings preserved from local storage or defaults without overwriting local custom data
    const localMap = getAllStoredChurchSettings() || {};
    const allKnownChurchIds = new Set([
      ...Object.keys(settingsMap),
      ...Object.keys(localMap),
      ...Object.keys(INITIAL_CHURCH_SETTINGS)
    ]);

    allKnownChurchIds.forEach((churchId) => {
      if (!settingsMap[churchId]) {
        settingsMap[churchId] = localMap[churchId] || INITIAL_CHURCH_SETTINGS[churchId] || getDefaultChurchSettings(churchId);
      } else if (localMap[churchId]) {
        const cloudTime = settingsMap[churchId].updatedAt ? new Date(settingsMap[churchId].updatedAt).getTime() : 0;
        const localTime = localMap[churchId].updatedAt ? new Date(localMap[churchId].updatedAt).getTime() : 0;
        if (localTime > cloudTime) {
          settingsMap[churchId] = localMap[churchId];
        }
      }
    });

    saveAllStoredChurchSettings(settingsMap);
    onUpdate(settingsMap);
  }, (err) => {
    console.error('subscribeChurchSettings error:', err);
    onUpdate(getAllStoredChurchSettings());
  });
}

export async function saveChurchSettingsToFirestore(settings: CompleteChurchSettings): Promise<void> {
  const churchId = settings.church_id || settings.id;
  await setDoc(doc(db, CHURCH_SETTINGS_COL, churchId), cleanForFirestore(settings), { merge: true });
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

const REMOVED_MOCK_MEMBER_IDS = new Set([
  'mem-1',
  'mem-2',
  'mem-3',
  'mem-4',
  'mem-5',
  'mem-gwc-1',
  'mem-crc-1',
]);

// USERS
export function subscribeUsers(onUpdate: (data: SaaSUser[]) => void): () => void {
  return onSnapshot(collection(db, USERS_COL), (snapshot) => {
    const list: SaaSUser[] = [];
    snapshot.forEach((d) => {
      const u = d.data() as SaaSUser;
      if (
        REMOVED_MOCK_USER_IDS.has(d.id) ||
        REMOVED_MOCK_USER_IDS.has(u.id) ||
        REMOVED_MOCK_USERNAMES.has(u.username?.toLowerCase())
      ) {
        deleteUserFromFirestore(d.id).catch(console.warn);
        return;
      }
      list.push(u);
    });

    // Ensure superadmin always exists in local state
    INITIAL_SAAS_USERS.forEach((initUser) => {
      if (!list.some((u) => u.username.toLowerCase() === initUser.username.toLowerCase())) {
        list.unshift(initUser);
      }
    });

    saveStoredUsers(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeUsers error:', err);
    onUpdate(getStoredUsers());
  });
}

export async function saveUserToFirestore(user: SaaSUser): Promise<void> {
  await setDoc(doc(db, USERS_COL, user.id), cleanForFirestore(user), { merge: true });
}

export async function deleteUserFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, USERS_COL, id));
}

// MEMBERS
export function subscribeMembers(onUpdate: (members: Member[]) => void): () => void {
  return onSnapshot(collection(db, MEMBERS_COL), (snapshot) => {
    const members: Member[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Member;
      if (REMOVED_MOCK_MEMBER_IDS.has(docSnap.id) || REMOVED_MOCK_MEMBER_IDS.has(data.id)) {
        deleteMemberFromFirestore(docSnap.id).catch(console.warn);
        return;
      }
      members.push({ ...data, id: docSnap.id || data.id });
    });
    members.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    saveStoredMembers(members);
    onUpdate(members);
  }, (err) => {
    console.error('subscribeMembers error:', err);
    onUpdate(getStoredMembers());
  });
}

export async function saveMemberToFirestore(member: Member): Promise<void> {
  await setDoc(doc(db, MEMBERS_COL, member.id), cleanForFirestore(member), { merge: true });
}

export async function deleteMemberFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, MEMBERS_COL, id));
}

// PRAYERS
export function subscribePrayers(onUpdate: (prayers: PrayerRequest[]) => void): () => void {
  return onSnapshot(collection(db, PRAYERS_COL), (snapshot) => {
    const prayers: PrayerRequest[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as PrayerRequest;
      if (
        ['pray-1', 'pray-2', 'pray-3', 'pray-gwc-1'].includes(docSnap.id) ||
        ['pray-1', 'pray-2', 'pray-3', 'pray-gwc-1'].includes(data.id) ||
        REMOVED_MOCK_MEMBER_IDS.has(data.memberId || '')
      ) {
        deletePrayerFromFirestore(docSnap.id).catch(console.warn);
        return;
      }
      prayers.push({ ...data, id: docSnap.id || data.id });
    });
    prayers.sort((a, b) => {
      if (a.status === 'Urgent' && b.status !== 'Urgent') return -1;
      if (a.status !== 'Urgent' && b.status === 'Urgent') return 1;
      return new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime();
    });
    saveStoredPrayers(prayers);
    onUpdate(prayers);
  }, (err) => {
    console.error('subscribePrayers error:', err);
    onUpdate(getStoredPrayers());
  });
}

export async function savePrayerToFirestore(prayer: PrayerRequest): Promise<void> {
  await setDoc(doc(db, PRAYERS_COL, prayer.id), cleanForFirestore(prayer), { merge: true });
}

export async function deletePrayerFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, PRAYERS_COL, id));
}

// ROSTER
export function subscribeRoster(onUpdate: (roster: RosterAssignment[]) => void): () => void {
  return onSnapshot(collection(db, ROSTER_COL), (snapshot) => {
    const roster: RosterAssignment[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as RosterAssignment;
      roster.push({ ...data, id: docSnap.id || data.id });
    });
    saveStoredRoster(roster);
    onUpdate(roster);
  }, (err) => {
    console.error('subscribeRoster error:', err);
    onUpdate(getStoredRoster());
  });
}

export async function saveRosterToFirestore(assignment: RosterAssignment): Promise<void> {
  await setDoc(doc(db, ROSTER_COL, assignment.id), cleanForFirestore(assignment), { merge: true });
}

export async function deleteRosterFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, ROSTER_COL, id));
}

// ATTENDANCE
export function subscribeAttendance(onUpdate: (data: AttendanceRecord[]) => void): () => void {
  return onSnapshot(collection(db, ATTENDANCE_COL), (snapshot) => {
    const records: AttendanceRecord[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as AttendanceRecord;
      records.push({ ...data, id: d.id || data.id });
    });
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    saveStoredAttendance(records);
    onUpdate(records);
  }, (err) => {
    console.error('subscribeAttendance error:', err);
    onUpdate(getStoredAttendance());
  });
}

export async function saveAttendanceToFirestore(record: AttendanceRecord): Promise<void> {
  await setDoc(doc(db, ATTENDANCE_COL, record.id), cleanForFirestore(record), { merge: true });
}

export async function deleteAttendanceFromFirestore(id: string): Promise<void> {
  if (!id) {
    console.warn('deleteAttendanceFromFirestore called with missing/empty id');
    return;
  }
  await deleteDoc(doc(db, ATTENDANCE_COL, id));
}

// EVENTS
export function subscribeEvents(onUpdate: (data: ChurchEvent[]) => void): () => void {
  return onSnapshot(collection(db, EVENTS_COL), (snapshot) => {
    const events: ChurchEvent[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as ChurchEvent;
      events.push({ ...data, id: d.id || data.id });
    });
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    saveStoredEvents(events);
    onUpdate(events);
  }, (err) => {
    console.error('subscribeEvents error:', err);
    onUpdate(getStoredEvents());
  });
}

export async function saveEventToFirestore(event: ChurchEvent): Promise<void> {
  await setDoc(doc(db, EVENTS_COL, event.id), cleanForFirestore(event), { merge: true });
}

export async function deleteEventFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, EVENTS_COL, id));
}

// ANNOUNCEMENTS
export function subscribeAnnouncements(onUpdate: (data: PastorAnnouncement[]) => void): () => void {
  return onSnapshot(collection(db, ANNOUNCEMENTS_COL), (snapshot) => {
    const list: PastorAnnouncement[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as PastorAnnouncement;
      list.push({ ...data, id: d.id || data.id });
    });
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    saveStoredAnnouncements(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeAnnouncements error:', err);
    onUpdate(getStoredAnnouncements());
  });
}

export async function saveAnnouncementToFirestore(item: PastorAnnouncement): Promise<void> {
  await setDoc(doc(db, ANNOUNCEMENTS_COL, item.id), cleanForFirestore(item), { merge: true });
}

export async function deleteAnnouncementFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
}

// NOTIFICATIONS
export function subscribeNotifications(onUpdate: (data: AppNotification[]) => void): () => void {
  return onSnapshot(collection(db, NOTIFICATIONS_COL), (snapshot) => {
    const notifications: AppNotification[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as AppNotification;
      notifications.push({ ...data, id: d.id || data.id });
    });
    notifications.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    saveStoredNotifications(notifications);
    onUpdate(notifications);
  }, (err) => {
    console.error('subscribeNotifications error:', err);
    onUpdate(getStoredNotifications());
  });
}

export async function saveNotificationToFirestore(notif: AppNotification): Promise<void> {
  await setDoc(doc(db, NOTIFICATIONS_COL, notif.id), cleanForFirestore(notif), { merge: true });
}

export async function deleteNotificationFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, NOTIFICATIONS_COL, id));
}

export async function clearAllNotificationsFromFirestore(notifs: AppNotification[]): Promise<void> {
  if (notifs.length === 0) return;
  const batch = writeBatch(db);
  notifs.forEach((n) => {
    if (n.id) {
      batch.delete(doc(db, NOTIFICATIONS_COL, n.id));
    }
  });
  await batch.commit();
}

// SUNDAY SCHOOL CLASSES
export function subscribeSundaySchoolClasses(onUpdate: (data: SundaySchoolClass[]) => void): () => void {
  return onSnapshot(collection(db, SUNDAY_SCHOOL_CLASSES_COL), (snapshot) => {
    const list: SundaySchoolClass[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as SundaySchoolClass;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredSundaySchoolClasses(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeSundaySchoolClasses error:', err);
    onUpdate(getStoredSundaySchoolClasses());
  });
}

export async function saveSundaySchoolClassToFirestore(cls: SundaySchoolClass): Promise<void> {
  await setDoc(doc(db, SUNDAY_SCHOOL_CLASSES_COL, cls.id), cleanForFirestore(cls), { merge: true });
}

export async function deleteSundaySchoolClassFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, SUNDAY_SCHOOL_CLASSES_COL, id));
}

// SUNDAY SCHOOL STUDENTS
export function subscribeSundaySchoolStudents(onUpdate: (data: SundaySchoolStudent[]) => void): () => void {
  return onSnapshot(collection(db, SUNDAY_SCHOOL_STUDENTS_COL), (snapshot) => {
    const list: SundaySchoolStudent[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as SundaySchoolStudent;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredSundaySchoolStudents(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeSundaySchoolStudents error:', err);
    onUpdate(getStoredSundaySchoolStudents());
  });
}

export async function saveSundaySchoolStudentToFirestore(student: SundaySchoolStudent): Promise<void> {
  await setDoc(doc(db, SUNDAY_SCHOOL_STUDENTS_COL, student.id), cleanForFirestore(student), { merge: true });
}

export async function deleteSundaySchoolStudentFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, SUNDAY_SCHOOL_STUDENTS_COL, id));
}

// SUNDAY SCHOOL ATTENDANCE
export function subscribeSundaySchoolAttendance(onUpdate: (data: SundaySchoolAttendanceRecord[]) => void): () => void {
  return onSnapshot(collection(db, SUNDAY_SCHOOL_ATTENDANCE_COL), (snapshot) => {
    const list: SundaySchoolAttendanceRecord[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as SundaySchoolAttendanceRecord;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredSundaySchoolAttendance(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeSundaySchoolAttendance error:', err);
    onUpdate(getStoredSundaySchoolAttendance());
  });
}

export async function saveSundaySchoolAttendanceToFirestore(record: SundaySchoolAttendanceRecord): Promise<void> {
  await setDoc(doc(db, SUNDAY_SCHOOL_ATTENDANCE_COL, record.id), cleanForFirestore(record), { merge: true });
}

export async function deleteSundaySchoolAttendanceFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, SUNDAY_SCHOOL_ATTENDANCE_COL, id));
}

// WHATSAPP TEMPLATES
export function subscribeWhatsAppTemplates(onUpdate: (data: WhatsAppReminderTemplate[]) => void): () => void {
  return onSnapshot(collection(db, WHATSAPP_TEMPLATES_COL), (snapshot) => {
    const list: WhatsAppReminderTemplate[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as WhatsAppReminderTemplate;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredWhatsAppTemplates(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeWhatsAppTemplates error:', err);
    onUpdate(getStoredWhatsAppTemplates());
  });
}

export async function saveWhatsAppTemplateToFirestore(tmpl: WhatsAppReminderTemplate): Promise<void> {
  await setDoc(doc(db, WHATSAPP_TEMPLATES_COL, tmpl.id), cleanForFirestore(tmpl), { merge: true });
}

export async function deleteWhatsAppTemplateFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, WHATSAPP_TEMPLATES_COL, id));
}

// WHATSAPP GROUPS
export function subscribeWhatsAppGroups(onUpdate: (data: WhatsAppGroup[]) => void): () => void {
  return onSnapshot(collection(db, WHATSAPP_GROUPS_COL), (snapshot) => {
    const list: WhatsAppGroup[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as WhatsAppGroup;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredWhatsAppGroups(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeWhatsAppGroups error:', err);
    onUpdate(getStoredWhatsAppGroups());
  });
}

export async function saveWhatsAppGroupToFirestore(group: WhatsAppGroup): Promise<void> {
  await setDoc(doc(db, WHATSAPP_GROUPS_COL, group.id), cleanForFirestore(group), { merge: true });
}

export async function deleteWhatsAppGroupFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, WHATSAPP_GROUPS_COL, id));
}

// =========================================================================
// 13. REUSABLE MINISTRIES MODULE FIRESTORE SERVICES
// =========================================================================

// MINISTRIES
export function subscribeMinistries(onUpdate: (data: ChurchMinistry[]) => void): () => void {
  return onSnapshot(collection(db, MINISTRIES_COL), (snapshot) => {
    const list: ChurchMinistry[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as ChurchMinistry;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredMinistries(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeMinistries error:', err);
    onUpdate(getStoredMinistries());
  });
}

export async function saveMinistryToFirestore(min: ChurchMinistry): Promise<void> {
  await setDoc(doc(db, MINISTRIES_COL, min.id), cleanForFirestore(min), { merge: true });
}

export async function deleteMinistryFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, MINISTRIES_COL, id));
}

// MINISTRY MEMBERS
export function subscribeMinistryMembers(onUpdate: (data: MinistryMember[]) => void): () => void {
  return onSnapshot(collection(db, MINISTRY_MEMBERS_COL), (snapshot) => {
    const list: MinistryMember[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as MinistryMember;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredMinistryMembers(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeMinistryMembers error:', err);
    onUpdate(getStoredMinistryMembers());
  });
}

export async function saveMinistryMemberToFirestore(mm: MinistryMember): Promise<void> {
  await setDoc(doc(db, MINISTRY_MEMBERS_COL, mm.id), cleanForFirestore(mm), { merge: true });
}

export async function deleteMinistryMemberFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, MINISTRY_MEMBERS_COL, id));
}

// MINISTRY TEAMS
export function subscribeMinistryTeams(onUpdate: (data: MinistryTeam[]) => void): () => void {
  return onSnapshot(collection(db, MINISTRY_TEAMS_COL), (snapshot) => {
    const list: MinistryTeam[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as MinistryTeam;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredMinistryTeams(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeMinistryTeams error:', err);
    onUpdate(getStoredMinistryTeams());
  });
}

export async function saveMinistryTeamToFirestore(team: MinistryTeam): Promise<void> {
  await setDoc(doc(db, MINISTRY_TEAMS_COL, team.id), cleanForFirestore(team), { merge: true });
}

export async function deleteMinistryTeamFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, MINISTRY_TEAMS_COL, id));
}

// MINISTRY TEAM MEMBERS
export function subscribeMinistryTeamMembers(onUpdate: (data: MinistryTeamMember[]) => void): () => void {
  return onSnapshot(collection(db, MINISTRY_TEAM_MEMBERS_COL), (snapshot) => {
    const list: MinistryTeamMember[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as MinistryTeamMember;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredMinistryTeamMembers(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeMinistryTeamMembers error:', err);
    onUpdate(getStoredMinistryTeamMembers());
  });
}

export async function saveMinistryTeamMemberToFirestore(mtm: MinistryTeamMember): Promise<void> {
  await setDoc(doc(db, MINISTRY_TEAM_MEMBERS_COL, mtm.id), cleanForFirestore(mtm), { merge: true });
}

export async function deleteMinistryTeamMemberFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, MINISTRY_TEAM_MEMBERS_COL, id));
}

// MINISTRY ACTIVITIES
export function subscribeMinistryActivities(onUpdate: (data: MinistryActivity[]) => void): () => void {
  return onSnapshot(collection(db, MINISTRY_ACTIVITIES_COL), (snapshot) => {
    const list: MinistryActivity[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as MinistryActivity;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredMinistryActivities(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeMinistryActivities error:', err);
    onUpdate(getStoredMinistryActivities());
  });
}

export async function saveMinistryActivityToFirestore(act: MinistryActivity): Promise<void> {
  await setDoc(doc(db, MINISTRY_ACTIVITIES_COL, act.id), cleanForFirestore(act), { merge: true });
}

export async function deleteMinistryActivityFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, MINISTRY_ACTIVITIES_COL, id));
}

// MINISTRY ANNOUNCEMENTS
export function subscribeMinistryAnnouncements(onUpdate: (data: MinistryAnnouncement[]) => void): () => void {
  return onSnapshot(collection(db, MINISTRY_ANNOUNCEMENTS_COL), (snapshot) => {
    const list: MinistryAnnouncement[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as MinistryAnnouncement;
      list.push({ ...data, id: d.id || data.id });
    });
    saveStoredMinistryAnnouncements(list);
    onUpdate(list);
  }, (err) => {
    console.error('subscribeMinistryAnnouncements error:', err);
    onUpdate(getStoredMinistryAnnouncements());
  });
}

export async function saveMinistryAnnouncementToFirestore(ann: MinistryAnnouncement): Promise<void> {
  await setDoc(doc(db, MINISTRY_ANNOUNCEMENTS_COL, ann.id), cleanForFirestore(ann), { merge: true });
}

export async function deleteMinistryAnnouncementFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, MINISTRY_ANNOUNCEMENTS_COL, id));
}

// VISITORS
const VISITORS_COL = 'visitors';
const VISITOR_VISITS_COL = 'visitor_visits';

export function subscribeVisitors(onUpdate: (data: Visitor[]) => void): () => void {
  return onSnapshot(collection(db, VISITORS_COL), (snapshot) => {
    const list: Visitor[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as Visitor;
      list.push({ ...data, id: d.id || data.id });
    });
    onUpdate(list);
  }, (err) => {
    console.error('subscribeVisitors error:', err);
  });
}

export async function saveVisitorToFirestore(visitor: Visitor): Promise<void> {
  await setDoc(doc(db, VISITORS_COL, visitor.id), cleanForFirestore(visitor), { merge: true });
}

export async function deleteVisitorFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, VISITORS_COL, id));
}

export async function saveVisitorVisitToFirestore(visit: VisitorVisit): Promise<void> {
  await setDoc(doc(db, VISITOR_VISITS_COL, visit.id), cleanForFirestore(visit), { merge: true });
}


