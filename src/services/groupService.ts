import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Group,
  GroupMember,
  OrgStatus,
  ChurchMember,
  GroupAttendanceRecord,
  GroupAnnouncement,
  PrayerRequest,
  MinistryEvent,
  Profile,
} from '@/types/database';
import { DEMO_MEMBERS, DEMO_USERS, DEMO_MINISTRIES } from '@/lib/mockData';
import { getStoredMembers } from '@/utils/storage';

const LOCAL_STORAGE_GROUPS_KEY = 'church_cms_groups_data';
const LOCAL_STORAGE_GROUP_MEMBERS_KEY = 'church_cms_group_members_data';
const LOCAL_STORAGE_GROUP_ATTENDANCE_KEY = 'church_cms_group_attendance_data';
const LOCAL_STORAGE_GROUP_ANNOUNCEMENTS_KEY = 'church_cms_group_announcements_data';
const LOCAL_STORAGE_GROUP_PRAYERS_KEY = 'church_cms_group_prayers_data';
const LOCAL_STORAGE_GROUP_EVENTS_KEY = 'church_cms_group_events_data';

export interface CreateGroupPayload {
  name: string;
  ministry_id?: string;
  description?: string;
  leader_id?: string;
  co_leader_id?: string;
  category?: string;
  meeting_day?: string;
  meeting_time?: string;
  frequency?: string;
  location?: string;
  address?: string;
  capacity?: number;
  status?: OrgStatus;
}

export interface CreateGroupAnnouncementPayload {
  group_id: string;
  author_id: string;
  author_name?: string;
  title: string;
  content: string;
  is_pinned?: boolean;
}

export interface CreateGroupPrayerPayload {
  group_id: string;
  author_name: string;
  title: string;
  request: string;
}

export interface CreateGroupEventPayload {
  group_id: string;
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time?: string;
  location: string;
}

function matchesChurchTenant(docChurchId: string | undefined | null, targetChurchId: string): boolean {
  if (!docChurchId) return true;
  if (docChurchId === targetChurchId) return true;
  if (
    (targetChurchId === 'church-1' || targetChurchId === 'a0000000-0000-0000-0000-000000000001') &&
    (docChurchId === 'church-1' || docChurchId === 'a0000000-0000-0000-0000-000000000001')
  ) {
    return true;
  }
  if (
    (targetChurchId === 'church-2' || targetChurchId === 'a0000000-0000-0000-0000-000000000002') &&
    (docChurchId === 'church-2' || docChurchId === 'a0000000-0000-0000-0000-000000000002')
  ) {
    return true;
  }
  return false;
}

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

function getLocalGroups(churchId: string): Group[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_GROUPS_KEY}_${churchId}`);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list
          .map((g) => ({ ...g, church_id: g.church_id || churchId }))
          .filter((g) => matchesChurchTenant(g.church_id, churchId));
      }
    }
  } catch (e) {
    console.error('Failed to load local groups:', e);
  }
  return [];
}

function saveLocalGroups(churchId: string, list: Group[]) {
  try {
    const stamped = list.map((g) => ({ ...g, church_id: g.church_id || churchId }));
    localStorage.setItem(`${LOCAL_STORAGE_GROUPS_KEY}_${churchId}`, JSON.stringify(stamped));
  } catch (e) {
    console.error('Failed to save local groups:', e);
  }
}

function getLocalGroupMembers(churchId: string): GroupMember[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_GROUP_MEMBERS_KEY}_${churchId}`);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.filter((gm) => matchesChurchTenant(gm.church_id, churchId));
      }
    }
  } catch (e) {
    console.error('Failed to load local group members:', e);
  }
  return [];
}

function saveLocalGroupMembers(churchId: string, list: GroupMember[]) {
  try {
    const stamped = list.map((gm) => ({ ...gm, church_id: gm.church_id || churchId }));
    localStorage.setItem(`${LOCAL_STORAGE_GROUP_MEMBERS_KEY}_${churchId}`, JSON.stringify(stamped));
  } catch (e) {
    console.error('Failed to save local group members:', e);
  }
}

function getLocalGroupAttendance(churchId: string): GroupAttendanceRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_GROUP_ATTENDANCE_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local group attendance:', e);
  }
  return [];
}

function saveLocalGroupAttendance(churchId: string, list: GroupAttendanceRecord[]) {
  try {
    const stamped = list.map((a) => ({ ...a, church_id: a.church_id || churchId }));
    localStorage.setItem(`${LOCAL_STORAGE_GROUP_ATTENDANCE_KEY}_${churchId}`, JSON.stringify(stamped));
  } catch (e) {
    console.error('Failed to save local group attendance:', e);
  }
}

function getLocalGroupAnnouncements(churchId: string): GroupAnnouncement[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_GROUP_ANNOUNCEMENTS_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local group announcements:', e);
  }
  return [];
}

function saveLocalGroupAnnouncements(churchId: string, list: GroupAnnouncement[]) {
  try {
    const stamped = list.map((ann) => ({ ...ann, church_id: ann.church_id || churchId }));
    localStorage.setItem(`${LOCAL_STORAGE_GROUP_ANNOUNCEMENTS_KEY}_${churchId}`, JSON.stringify(stamped));
  } catch (e) {
    console.error('Failed to save local group announcements:', e);
  }
}

function getLocalGroupPrayers(churchId: string): PrayerRequest[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_GROUP_PRAYERS_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local group prayers:', e);
  }
  return [];
}

function saveLocalGroupPrayers(churchId: string, list: PrayerRequest[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_GROUP_PRAYERS_KEY}_${churchId}`, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save local group prayers:', e);
  }
}

function getLocalGroupEvents(churchId: string): MinistryEvent[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_GROUP_EVENTS_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local group events:', e);
  }
  return [];
}

function saveLocalGroupEvents(churchId: string, list: MinistryEvent[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_GROUP_EVENTS_KEY}_${churchId}`, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save local group events:', e);
  }
}

export const groupService = {
  async getGroups(churchId: string, userLeaderFilter?: string): Promise<Group[]> {
    let cloudGroups: Group[] = [];
    try {
      const snap = await getDocs(collection(db, 'groups'));
      snap.forEach((d) => {
        const data = d.data() as Group;
        if (matchesChurchTenant(data.church_id, churchId)) {
          cloudGroups.push({ ...data, church_id: churchId });
        }
      });
    } catch (e) {
      console.warn('Firebase getGroups error:', e);
    }

    // Keep localStorage in sync with cloud DB
    saveLocalGroups(churchId, cloudGroups);

    let result = cloudGroups;
    if (userLeaderFilter) {
      result = result.filter((g) => g.leader_id === userLeaderFilter || g.co_leader_id === userLeaderFilter);
    }

    const members = await this.getAllGroupMembers(churchId);
    const storedMembers = getStoredMembers();

    return result.map((g) => {
      const gMembers = members.filter((gm) => gm.group_id === g.id);

      // Resolve leader profile dynamically
      let leaderProfile: Profile | null = g.leader || null;
      if (!leaderProfile && g.leader_id) {
        const demoU = DEMO_USERS.find((u) => u.id === g.leader_id);
        if (demoU) {
          leaderProfile = {
            id: g.leader_id,
            email: demoU.email,
            first_name: demoU.name.split(' ')[0],
            last_name: demoU.name.split(' ').slice(1).join(' '),
            display_name: demoU.name,
            phone: demoU.phone,
            avatar_url: demoU.avatar,
            is_super_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        } else {
          const storedM: any = storedMembers.find((m: any) => m.id === g.leader_id || (m as any).user_id === g.leader_id || (m as any).profile_id === g.leader_id);
          if (storedM) {
            const name = storedM.name || (storedM.profile ? `${storedM.profile.first_name || ''} ${storedM.profile.last_name || ''}`.trim() : `${storedM.firstName || storedM.first_name || ''} ${storedM.lastName || storedM.last_name || ''}`.trim()) || 'Group Leader';
            leaderProfile = storedM.profile || {
              id: storedM.id,
              first_name: storedM.firstName || storedM.first_name || name.split(' ')[0],
              last_name: storedM.lastName || storedM.last_name || name.split(' ').slice(1).join(' '),
              display_name: name,
              email: storedM.email || '',
              phone: storedM.phone || '',
              avatar_url: storedM.avatarUrl || '',
              is_super_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        }
      }

      // Check group members for a designated Leader role if still missing
      if (!leaderProfile) {
        const leaderMember = gMembers.find((gm) => gm.role === 'Leader' || gm.role === 'Leader/Host' || gm.role === 'Co-Leader');
        if (leaderMember) {
          const mId = leaderMember.member_id || leaderMember.user_id;
          const storedM: any = storedMembers.find((m: any) => m.id === mId || (m as any).user_id === mId);
          const name = (leaderMember as any).name || (storedM ? (storedM.name || `${storedM.firstName || ''} ${storedM.lastName || ''}`.trim()) : undefined) || leaderMember.profile?.display_name || 'Group Leader';
          leaderProfile = leaderMember.profile || {
            id: leaderMember.id,
            first_name: name.split(' ')[0],
            last_name: name.split(' ').slice(1).join(' '),
            display_name: name,
            email: '',
            phone: '',
            avatar_url: '',
            is_super_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }

      const leaderName = leaderProfile?.display_name || g.leader_name || (g as any).leaderName || (g.leader_id ? 'Assigned Leader' : 'Leader Not Assigned');

      let assistantLeaderProfile: Profile | null = g.assistant_leader || null;
      if (!assistantLeaderProfile && g.co_leader_id) {
        const demoU = DEMO_USERS.find((u) => u.id === g.co_leader_id);
        if (demoU) {
          assistantLeaderProfile = {
            id: g.co_leader_id,
            email: demoU.email,
            first_name: demoU.name.split(' ')[0],
            last_name: demoU.name.split(' ').slice(1).join(' '),
            display_name: demoU.name,
            phone: demoU.phone,
            avatar_url: demoU.avatar,
            is_super_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        } else {
          const storedM: any = storedMembers.find((m: any) => m.id === g.co_leader_id || (m as any).user_id === g.co_leader_id);
          if (storedM) {
            const name = storedM.name || (storedM.profile ? `${storedM.profile.first_name || ''} ${storedM.profile.last_name || ''}`.trim() : `${storedM.firstName || ''} ${storedM.lastName || ''}`.trim());
            assistantLeaderProfile = storedM.profile || {
              id: storedM.id,
              first_name: name.split(' ')[0],
              last_name: name.split(' ').slice(1).join(' '),
              display_name: name,
              email: storedM.email || '',
              phone: storedM.phone || '',
              avatar_url: '',
              is_super_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        }
      }

      return {
        ...g,
        church_id: churchId,
        leader_name: leaderName,
        leader: leaderProfile,
        assistant_leader: assistantLeaderProfile,
        ministry: DEMO_MINISTRIES.find((m) => m.id === g.ministry_id) || null,
        member_count: gMembers.length,
        members: gMembers,
      };
    });
  },

  async getAllGroupMembers(churchId: string): Promise<GroupMember[]> {
    let cloudMembers: GroupMember[] = [];
    try {
      const snap = await getDocs(collection(db, 'group_members'));
      snap.forEach((d) => {
        const data = d.data() as GroupMember;
        if (matchesChurchTenant(data.church_id, churchId)) {
          cloudMembers.push({ ...data, church_id: churchId });
        }
      });
    } catch (e) {
      console.warn('Firebase getAllGroupMembers warning:', e);
    }
    const local = getLocalGroupMembers(churchId);
    const map = new Map<string, GroupMember>();
    cloudMembers.forEach((m) => map.set(m.id, m));
    local.forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    return Array.from(map.values()).filter((gm) => matchesChurchTenant(gm.church_id, churchId));
  },

  async getGroupById(churchId: string, groupId: string): Promise<{
    group: Group | null;
    members: GroupMember[];
    attendance: GroupAttendanceRecord[];
    announcements: GroupAnnouncement[];
    prayers: PrayerRequest[];
    events: MinistryEvent[];
  }> {
    const groups = await this.getGroups(churchId);
    const group = groups.find((g) => g.id === groupId) || null;

    let members: GroupMember[] = [];
    try {
      const q = query(collection(db, 'group_members'), where('group_id', '==', groupId));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const m = d.data() as GroupMember;
        if (matchesChurchTenant(m.church_id, churchId)) {
          members.push({ ...m, church_id: churchId });
        }
      });
    } catch (e) {
      console.warn('Firebase getGroupById members error:', e);
    }

    if (members.length === 0) {
      const localMembers = getLocalGroupMembers(churchId).filter((gm) => gm.group_id === groupId);
      const storedMembers = getStoredMembers();
      members = localMembers.map((gm) => {
        const mem: any = storedMembers.find((m: any) => m.id === gm.member_id || (m as any).user_id === gm.user_id || m.id === (gm as any).memberId) || DEMO_MEMBERS.find((m: any) => m.id === gm.member_id || m.user_id === gm.user_id);
        const name = mem?.name || (mem?.profile ? `${mem.profile.first_name || ''} ${mem.profile.last_name || ''}`.trim() : `${mem?.firstName || ''} ${mem?.lastName || ''}`.trim()) || 'Group Member';
        
        const memberProfile = gm.profile || mem?.profile || {
          id: mem?.id || gm.member_id || gm.id,
          first_name: mem?.firstName || mem?.first_name || name.split(' ')[0] || 'Member',
          last_name: mem?.lastName || mem?.last_name || name.split(' ').slice(1).join(' ') || '',
          display_name: name,
          email: mem?.email || '',
          phone: mem?.phone || '',
          avatar_url: mem?.avatarUrl || mem?.avatar_url || '',
          is_super_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const churchMemberObj: ChurchMember = (gm.church_member as ChurchMember) || {
          id: mem?.id || gm.member_id || gm.id,
          user_id: mem?.user_id || gm.user_id || `user-${gm.id}`,
          church_id: churchId,
          role: 'member',
          status: 'active',
          membership_number: null,
          membership_date: null,
          custom_fields: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile: memberProfile
        };

        return {
          ...gm,
          church_id: churchId,
          profile: memberProfile,
          church_member: churchMemberObj,
        } as GroupMember;
      });
    }

    const attendance = await this.getGroupAttendance(churchId, groupId);
    const announcements = await this.getGroupAnnouncements(churchId, groupId);
    const prayers = await this.getGroupPrayers(churchId, groupId);
    const events = await this.getGroupEvents(churchId, groupId);

    return { group, members, attendance, announcements, prayers, events };
  },

  async createGroup(churchId: string, payload: CreateGroupPayload): Promise<Group> {
    const newGroup: Group = {
      id: `g-${Date.now()}`,
      church_id: churchId,
      name: payload.name,
      ministry_id: payload.ministry_id || null,
      description: payload.description || null,
      leader_id: payload.leader_id || null,
      co_leader_id: payload.co_leader_id || null,
      category: payload.category || 'General',
      status: payload.status || 'active',
      meeting_day: payload.meeting_day || 'Tuesday',
      meeting_time: payload.meeting_time || '07:00 PM',
      frequency: payload.frequency || 'Weekly',
      location: payload.location || "Host Home",
      address: payload.address || null,
      capacity: payload.capacity || 20,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member_count: 0,
    };

    try {
      await setDoc(doc(db, 'groups', newGroup.id), cleanForFirestore(newGroup));
    } catch (e) {
      console.warn('Firebase createGroup warning:', e);
    }

    const local = getLocalGroups(churchId);
    const updated = [newGroup, ...local];
    saveLocalGroups(churchId, updated);
    return newGroup;
  },

  async updateGroup(
    churchId: string,
    groupId: string,
    payload: Partial<CreateGroupPayload>
  ): Promise<Group> {
    const updateData = cleanForFirestore({ ...payload, church_id: churchId, updated_at: new Date().toISOString() });
    try {
      await setDoc(doc(db, 'groups', groupId), updateData, { merge: true });
    } catch (e) {
      console.warn('Firebase updateGroup warning:', e);
    }

    const local = getLocalGroups(churchId);
    const idx = local.findIndex((g) => g.id === groupId);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...payload, church_id: churchId, updated_at: new Date().toISOString() };
      saveLocalGroups(churchId, local);
      return local[idx];
    }
    throw new Error('Group not found');
  },

  async deleteGroup(churchId: string, groupId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (e) {
      console.warn('Firebase deleteGroup warning:', e);
    }
    const local = getLocalGroups(churchId);
    saveLocalGroups(churchId, local.filter((g) => g.id !== groupId));
  },

  async addGroupMember(
    churchId: string,
    groupId: string,
    member: ChurchMember,
    role: string = 'Member',
    notes?: string
  ): Promise<GroupMember> {
    const newGM: GroupMember = {
      id: `gm-${Date.now()}`,
      church_id: churchId,
      group_id: groupId,
      user_id: member.user_id,
      member_id: member.id,
      role: role || 'Member',
      status: 'active',
      joined_date: new Date().toISOString().split('T')[0],
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: member.profile,
      church_member: member,
    };

    try {
      await setDoc(doc(db, 'group_members', newGM.id), cleanForFirestore({
        id: newGM.id,
        church_id: churchId,
        group_id: groupId,
        user_id: member.user_id,
        member_id: member.id,
        role: newGM.role,
        status: newGM.status,
        joined_date: newGM.joined_date,
        notes: newGM.notes,
        created_at: newGM.created_at,
        updated_at: newGM.updated_at
      }));
    } catch (e) {
      console.warn('Firebase addGroupMember warning:', e);
    }

    const local = getLocalGroupMembers(churchId);
    const updated = [newGM, ...local];
    saveLocalGroupMembers(churchId, updated);
    return newGM;
  },

  async updateGroupMemberRole(
    churchId: string,
    groupMemberId: string,
    role: string
  ): Promise<void> {
    try {
      await setDoc(doc(db, 'group_members', groupMemberId), { role, church_id: churchId, updated_at: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Firebase updateGroupMemberRole warning:', e);
    }
    const local = getLocalGroupMembers(churchId);
    const idx = local.findIndex((gm) => gm.id === groupMemberId);
    if (idx >= 0) {
      local[idx].role = role;
      saveLocalGroupMembers(churchId, local);
    }
  },

  async removeGroupMember(churchId: string, groupMemberId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'group_members', groupMemberId));
    } catch (e) {
      console.warn('Firebase removeGroupMember warning:', e);
    }
    const local = getLocalGroupMembers(churchId);
    saveLocalGroupMembers(churchId, local.filter((gm) => gm.id !== groupMemberId));
  },

  // Attendance
  async getGroupAttendance(churchId: string, groupId: string): Promise<GroupAttendanceRecord[]> {
    let cloudRecords: GroupAttendanceRecord[] = [];
    try {
      const snap = await getDocs(collection(db, 'group_attendance'));
      snap.forEach((d) => {
        const data = d.data() as GroupAttendanceRecord;
        if (matchesChurchTenant(data.church_id, churchId) && data.group_id === groupId) {
          cloudRecords.push({ ...data, church_id: churchId });
        }
      });
    } catch (e) {
      console.warn('Firebase getGroupAttendance warning:', e);
    }

    const local = getLocalGroupAttendance(churchId).filter((a) => a.group_id === groupId);
    const map = new Map<string, GroupAttendanceRecord>();
    cloudRecords.forEach((a) => map.set(a.id, a));
    local.forEach((a) => {
      if (!map.has(a.id)) map.set(a.id, a);
    });
    return Array.from(map.values()).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
  },

  async logGroupAttendance(
    churchId: string,
    groupId: string,
    sessionDate: string,
    attendeeIds: string[],
    topic?: string,
    notes?: string
  ): Promise<GroupAttendanceRecord> {
    const record: GroupAttendanceRecord = {
      id: `ga-${Date.now()}`,
      church_id: churchId,
      group_id: groupId,
      session_date: sessionDate,
      topic: topic || null,
      notes: notes || null,
      attendee_ids: attendeeIds,
      total_present: attendeeIds.length,
      created_at: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'group_attendance', record.id), cleanForFirestore(record));
    } catch (e) {
      console.warn('Firebase logGroupAttendance warning:', e);
    }

    const local = getLocalGroupAttendance(churchId);
    const updated = [record, ...local];
    saveLocalGroupAttendance(churchId, updated);
    return record;
  },

  async updateGroupAttendance(
    churchId: string,
    attendanceId: string,
    payload: {
      sessionDate?: string;
      attendeeIds?: string[];
      topic?: string;
      notes?: string;
    }
  ): Promise<GroupAttendanceRecord> {
    const updates: any = { church_id: churchId };
    if (payload.sessionDate !== undefined) updates.session_date = payload.sessionDate;
    if (payload.attendeeIds !== undefined) {
      updates.attendee_ids = payload.attendeeIds;
      updates.total_present = payload.attendeeIds.length;
    }
    if (payload.topic !== undefined) updates.topic = payload.topic;
    if (payload.notes !== undefined) updates.notes = payload.notes;

    try {
      await setDoc(doc(db, 'group_attendance', attendanceId), cleanForFirestore(updates), { merge: true });
    } catch (e) {
      console.warn('Firebase updateGroupAttendance warning:', e);
    }

    const local = getLocalGroupAttendance(churchId);
    const idx = local.findIndex((a) => a.id === attendanceId);
    let updatedRecord: GroupAttendanceRecord | null = null;

    if (idx >= 0) {
      local[idx] = {
        ...local[idx],
        church_id: churchId,
        session_date: payload.sessionDate ?? local[idx].session_date,
        attendee_ids: payload.attendeeIds ?? local[idx].attendee_ids,
        total_present: payload.attendeeIds ? payload.attendeeIds.length : local[idx].total_present,
        topic: payload.topic !== undefined ? payload.topic : local[idx].topic,
        notes: payload.notes !== undefined ? payload.notes : local[idx].notes,
      };
      updatedRecord = local[idx];
      saveLocalGroupAttendance(churchId, local);
    }

    if (updatedRecord) return updatedRecord;
    return {
      id: attendanceId,
      church_id: churchId,
      group_id: '',
      session_date: payload.sessionDate || new Date().toISOString().split('T')[0],
      topic: payload.topic || null,
      notes: payload.notes || null,
      attendee_ids: payload.attendeeIds || [],
      total_present: payload.attendeeIds ? payload.attendeeIds.length : 0,
      created_at: new Date().toISOString(),
    };
  },

  async deleteGroupAttendance(churchId: string, attendanceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'group_attendance', attendanceId));
    } catch (e) {
      console.warn('Firebase deleteGroupAttendance warning:', e);
    }
    const local = getLocalGroupAttendance(churchId);
    saveLocalGroupAttendance(churchId, local.filter((a) => a.id !== attendanceId));
  },

  // Announcements
  async getGroupAnnouncements(churchId: string, groupId: string): Promise<GroupAnnouncement[]> {
    let cloudAnn: GroupAnnouncement[] = [];
    try {
      const snap = await getDocs(collection(db, 'group_announcements'));
      snap.forEach((d) => {
        const data = d.data() as GroupAnnouncement;
        if (matchesChurchTenant(data.church_id, churchId) && data.group_id === groupId) {
          cloudAnn.push({ ...data, church_id: churchId });
        }
      });
    } catch (e) {
      console.warn('Firebase getGroupAnnouncements warning:', e);
    }

    const local = getLocalGroupAnnouncements(churchId).filter((a) => a.group_id === groupId);
    const map = new Map<string, GroupAnnouncement>();
    cloudAnn.forEach((a) => map.set(a.id, a));
    local.forEach((a) => {
      if (!map.has(a.id)) map.set(a.id, a);
    });
    return Array.from(map.values()).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },

  async createGroupAnnouncement(
    churchId: string,
    payload: CreateGroupAnnouncementPayload
  ): Promise<GroupAnnouncement> {
    const newAnn: GroupAnnouncement = {
      id: `gan-${Date.now()}`,
      church_id: churchId,
      group_id: payload.group_id,
      author_id: payload.author_id,
      author_name: payload.author_name || 'Group Leader',
      title: payload.title,
      content: payload.content,
      is_pinned: payload.is_pinned ?? false,
      created_at: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'group_announcements', newAnn.id), cleanForFirestore(newAnn));
    } catch (e) {
      console.warn('Firebase createGroupAnnouncement warning:', e);
    }

    const local = getLocalGroupAnnouncements(churchId);
    const updated = [newAnn, ...local];
    saveLocalGroupAnnouncements(churchId, updated);
    return newAnn;
  },

  async deleteGroupAnnouncement(churchId: string, announcementId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'group_announcements', announcementId));
    } catch (e) {
      console.warn('Firebase deleteGroupAnnouncement warning:', e);
    }
    const local = getLocalGroupAnnouncements(churchId);
    saveLocalGroupAnnouncements(churchId, local.filter((a) => a.id !== announcementId));
  },

  // Prayer Requests
  async getGroupPrayers(churchId: string, groupId: string): Promise<PrayerRequest[]> {
    let cloudPrayers: PrayerRequest[] = [];
    try {
      const snap = await getDocs(collection(db, 'group_prayers'));
      snap.forEach((d) => {
        const data = d.data() as PrayerRequest;
        if (matchesChurchTenant(data.church_id, churchId)) cloudPrayers.push(data);
      });
    } catch (e) {}

    const local = getLocalGroupPrayers(churchId);
    const map = new Map<string, PrayerRequest>();
    cloudPrayers.forEach((p) => map.set(p.id, p));
    local.forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  },

  async createGroupPrayer(
    churchId: string,
    payload: CreateGroupPrayerPayload
  ): Promise<PrayerRequest> {
    const newPrayer: PrayerRequest = {
      id: `pr-${Date.now()}`,
      church_id: churchId,
      member_id: null,
      author_name: payload.author_name,
      title: payload.title,
      request: payload.request,
      description: payload.request,
      category: 'general',
      privacy: 'church_wide',
      status: 'new',
      assigned_team_id: null,
      assigned_to: null,
      notes: null,
      is_confidential: false,
      is_answered: false,
      praise_report: null,
      prayer_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'group_prayers', newPrayer.id), cleanForFirestore(newPrayer));
    } catch (e) {}

    const local = getLocalGroupPrayers(churchId);
    const updated = [newPrayer, ...local];
    saveLocalGroupPrayers(churchId, updated);
    return newPrayer;
  },

  async toggleGroupPrayerAnswered(
    churchId: string,
    prayerId: string,
    praiseReport?: string
  ): Promise<void> {
    const local = getLocalGroupPrayers(churchId);
    const idx = local.findIndex((p) => p.id === prayerId);
    if (idx >= 0) {
      local[idx].is_answered = !local[idx].is_answered;
      if (praiseReport) local[idx].praise_report = praiseReport;
      local[idx].updated_at = new Date().toISOString();
      saveLocalGroupPrayers(churchId, local);

      try {
        await setDoc(doc(db, 'group_prayers', prayerId), cleanForFirestore({
          church_id: churchId,
          is_answered: local[idx].is_answered,
          praise_report: local[idx].praise_report,
          updated_at: local[idx].updated_at,
        }), { merge: true });
      } catch (e) {}
    }
  },

  // Events & Meetings
  async getGroupEvents(churchId: string, groupId: string): Promise<MinistryEvent[]> {
    let cloudEvents: MinistryEvent[] = [];
    try {
      const snap = await getDocs(collection(db, 'group_events'));
      snap.forEach((d) => {
        const data = d.data() as MinistryEvent;
        if (matchesChurchTenant(data.church_id, churchId)) cloudEvents.push(data);
      });
    } catch (e) {}

    const local = getLocalGroupEvents(churchId);
    const map = new Map<string, MinistryEvent>();
    cloudEvents.forEach((e) => map.set(e.id, e));
    local.forEach((e) => {
      if (!map.has(e.id)) map.set(e.id, e);
    });
    return Array.from(map.values()).filter((e) => e.ministry_id === groupId || e.ministry_id === 'g0000000-0000-0000-0000-000000000001');
  },

  async createGroupEvent(
    churchId: string,
    payload: CreateGroupEventPayload
  ): Promise<MinistryEvent> {
    const newEvent: MinistryEvent = {
      id: `ge-${Date.now()}`,
      church_id: churchId,
      ministry_id: payload.group_id,
      title: payload.title,
      description: payload.description || null,
      event_date: payload.event_date,
      start_time: payload.start_time,
      end_time: payload.end_time || null,
      location: payload.location,
      type: 'meeting',
      attendee_count: 0,
      created_at: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'group_events', newEvent.id), cleanForFirestore(newEvent));
    } catch (e) {}

    const local = getLocalGroupEvents(churchId);
    const updated = [newEvent, ...local];
    saveLocalGroupEvents(churchId, updated);
    return newEvent;
  },

  async deleteGroupEvent(churchId: string, eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'group_events', eventId));
    } catch (e) {}
    const local = getLocalGroupEvents(churchId);
    saveLocalGroupEvents(churchId, local.filter((e) => e.id !== eventId));
  },
};
