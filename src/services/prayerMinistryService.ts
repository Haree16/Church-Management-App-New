import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  PrayerGroup,
  PrayerGroupMember,
  PrayerGroupAttendanceRecord,
  PrayerMeeting,
  PrayerGuide,
  EnhancedPrayerRequest,
  PrayerFollowUpNote,
  PrayerMinistryPermissions,
  PrayerRequestPrivacy,
} from '@/types/prayerMinistry';
import { Member, SaaSUser, AppNotification } from '@/types';
import { cleanForFirestore } from '@/services/groupService';
import { saveNotificationToFirestore } from '@/services/firestoreService';

// Storage Keys (Local Cache)
const GROUPS_KEY = 'nca_church_pm_groups_v1';
const GROUP_MEMBERS_KEY = 'nca_church_pm_group_members_v1';
const GROUP_ATTENDANCE_KEY = 'nca_church_pm_group_attendance_v1';
const MEETINGS_KEY = 'nca_church_pm_meetings_v1';
const GUIDES_KEY = 'nca_church_pm_guides_v1';
const REQUESTS_KEY = 'nca_church_pm_requests_v1';

// Known mock / seed IDs to completely exclude
export const MOCK_PRAYER_IDS = new Set<string>([
  'pg-1',
  'pg-2',
  'pg-3',
  'pm-1',
  'pm-2',
  'pguide-1',
  'req-seed-1',
  'req-seed-2',
  'req-seed-3',
  'fn-1',
  'pt-1',
  'pt-2',
  'pt-3',
  'pt-4',
  'pray-1',
  'pray-2',
  'pray-3',
  'pray-gwc-1',
  'pgm-leader-pg-1',
  'pgm-leader-pg-2',
  'pgm-leader-pg-3',
]);

// Multi-tenant matcher for church scoping
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

// Maps generic Firestore 'prayers' documents to EnhancedPrayerRequest safely
function mapToEnhancedPrayerRequest(docId: string, data: any, churchId: string): EnhancedPrayerRequest {
  return {
    id: docId || data.id,
    church_id: data.church_id || data.churchId || churchId,
    member_id: data.member_id || data.memberId,
    author_name: data.author_name || data.requesterName || 'Anonymous',
    author_email: data.author_email,
    author_phone: data.author_phone,
    title: data.title || data.request || 'Prayer Request',
    description: data.description || data.request || '',
    category: data.category || 'General',
    privacy: (data.privacy as PrayerRequestPrivacy) || (data.isPrivate ? 'private' : 'church_wide'),
    target_group_id: data.target_group_id || data.targetGroupId,
    target_group_name: data.target_group_name || data.targetGroupName,
    status: data.status || 'Active',
    prayer_count: typeof data.prayer_count === 'number' ? data.prayer_count : (typeof data.prayerCount === 'number' ? data.prayerCount : 0),
    prayed_user_ids: Array.isArray(data.prayed_user_ids) ? data.prayed_user_ids : (Array.isArray(data.prayedUserIds) ? data.prayedUserIds : []),
    follow_up_notes: Array.isArray(data.follow_up_notes) ? data.follow_up_notes : [],
    is_answered: Boolean(data.is_answered || data.status === 'Answered'),
    answered_date: data.answered_date,
    testimony: data.testimony,
    testimony_published: Boolean(data.testimony_published),
    created_at: data.created_at || data.dateSubmitted || new Date().toISOString(),
    updated_at: data.updated_at || data.created_at || new Date().toISOString(),
  };
}

// Safe LocalStorage helpers - strictly filters out mock IDs and defaults to empty array []
function getLocalItem<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => !MOCK_PRAYER_IDS.has(item?.id)) as unknown as T;
    }
    return parsed;
  } catch {
    return defaultVal;
  }
}

function setLocalItem<T>(key: string, val: T): void {
  try {
    if (Array.isArray(val)) {
      const filtered = val.filter((item: any) => !MOCK_PRAYER_IDS.has(item?.id));
      localStorage.setItem(key, JSON.stringify(filtered));
    } else {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch (e) {
    console.warn('LocalStorage error in prayerMinistryService:', e);
  }
}

export const prayerMinistryService = {
  // ==========================================
  // PERMISSIONS & AUTHORIZATION
  // ==========================================
  getPermissions(currentUser?: SaaSUser | null, linkedMember?: Member | null): PrayerMinistryPermissions {
    if (!currentUser) {
      return {
        isChurchAdmin: false,
        isMinistryLeader: false,
        isGroupLeader: false,
        isIntercessor: false,
        canManageGroups: false,
        canManageMeetings: false,
        canRecordAttendance: false,
        canPublishPrayerGuide: false,
        canViewSharedWithLeadersRequests: false,
        canRecordFollowUp: false,
        canModerateTestimonies: false,
      };
    }

    const role = (currentUser.role || '').trim();
    const isChurchAdmin = ['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(role);
    const isMinistryLeader = isChurchAdmin || role === 'MinistryLeader';
    
    // Check if linked member leads prayer groups or is in prayer team
    const isGroupLeader = isChurchAdmin || isMinistryLeader || role === 'CellGroupLeader';
    const isIntercessor = isChurchAdmin || isMinistryLeader || isGroupLeader || 
      (linkedMember?.ministryTeams || []).some((t) => t.toLowerCase().includes('prayer'));

    return {
      isChurchAdmin,
      isMinistryLeader,
      isGroupLeader,
      isIntercessor,
      canManageGroups: isChurchAdmin || isMinistryLeader,
      canManageMeetings: isChurchAdmin || isMinistryLeader || isGroupLeader,
      canRecordAttendance: isChurchAdmin || isMinistryLeader || isGroupLeader,
      canPublishPrayerGuide: isChurchAdmin || isMinistryLeader,
      canViewSharedWithLeadersRequests: isChurchAdmin || isMinistryLeader,
      canRecordFollowUp: isChurchAdmin || isMinistryLeader || isIntercessor,
      canModerateTestimonies: isChurchAdmin || isMinistryLeader,
    };
  },

  // ==========================================
  // STRICT PRIVACY EVALUATOR
  // ==========================================
  canUserAccessRequest(
    request: EnhancedPrayerRequest,
    currentUser?: SaaSUser | null,
    linkedMember?: Member | null,
    userGroupIds: string[] = [],
    perms?: PrayerMinistryPermissions
  ): boolean {
    if (!currentUser) return request.privacy === 'church_wide';

    // 1. Cross-church isolation check
    const userChurch = currentUser.church_id || (currentUser as any).churchId || 'church-1';
    if (request.church_id && !matchesChurchTenant(request.church_id, userChurch)) {
      return false;
    }

    const memberId = linkedMember?.id || currentUser.id;
    const userName = (currentUser.name || '').trim().toLowerCase();
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const isAuthor = 
      (request.member_id && request.member_id === memberId) ||
      (request.author_name && userName && request.author_name.trim().toLowerCase() === userName) ||
      (request.author_email && userEmail && request.author_email.trim().toLowerCase() === userEmail);

    // Requester always has access to their own request
    if (isAuthor) return true;

    // 2. Strict 'private': ONLY the author can read!
    if (request.privacy === 'private') {
      return false;
    }

    // 3. 'prayer_leaders': Requester + Church Admins + Prayer Ministry Leaders
    if (request.privacy === 'prayer_leaders') {
      return Boolean(perms?.canViewSharedWithLeadersRequests);
    }

    // 4. 'group': Requester + members of the explicitly targeted prayer group
    if (request.privacy === 'group') {
      if (request.target_group_id && userGroupIds.includes(request.target_group_id)) {
        return true;
      }
      // Church Admin can also supervise group requests
      return Boolean(perms?.isChurchAdmin);
    }

    // 5. 'church_wide': public to the congregation
    if (request.privacy === 'church_wide') {
      return true;
    }

    return false;
  },

  filterAuthorizedRequests(
    allRequests: EnhancedPrayerRequest[],
    currentUser?: SaaSUser | null,
    linkedMember?: Member | null,
    userGroupIds: string[] = [],
    perms?: PrayerMinistryPermissions
  ): EnhancedPrayerRequest[] {
    const p = perms || this.getPermissions(currentUser, linkedMember);
    return allRequests.filter((r) => this.canUserAccessRequest(r, currentUser, linkedMember, userGroupIds, p));
  },

  // ==========================================
  // PRAYER REQUESTS: DB SYNC & CRUD
  // ==========================================
  getPrayerRequests(churchId: string): EnhancedPrayerRequest[] {
    const list = getLocalItem<EnhancedPrayerRequest[]>(`${REQUESTS_KEY}_${churchId}`, []);
    return list.filter((r) => matchesChurchTenant(r.church_id, churchId) && !MOCK_PRAYER_IDS.has(r.id));
  },

  async fetchPrayerRequests(churchId: string): Promise<EnhancedPrayerRequest[]> {
    const requests: EnhancedPrayerRequest[] = [];
    try {
      const snap = await getDocs(collection(db, 'prayers'));
      snap.forEach((d) => {
        if (MOCK_PRAYER_IDS.has(d.id)) return;
        const raw = d.data();
        if (matchesChurchTenant(raw.church_id || raw.churchId, churchId)) {
          requests.push(mapToEnhancedPrayerRequest(d.id, raw, churchId));
        }
      });
      requests.sort((a, b) => {
        if (a.status === 'Urgent' && b.status !== 'Urgent') return -1;
        if (a.status !== 'Urgent' && b.status === 'Urgent') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (e) {
      console.warn('Firestore fetchPrayerRequests error:', e);
    }
    setLocalItem(`${REQUESTS_KEY}_${churchId}`, requests);
    return requests;
  },

  subscribePrayerRequests(churchId: string, onUpdate: (requests: EnhancedPrayerRequest[]) => void): () => void {
    return onSnapshot(
      collection(db, 'prayers'),
      (snap) => {
        const requests: EnhancedPrayerRequest[] = [];
        snap.forEach((d) => {
          if (MOCK_PRAYER_IDS.has(d.id)) return;
          const raw = d.data();
          if (matchesChurchTenant(raw.church_id || raw.churchId, churchId)) {
            requests.push(mapToEnhancedPrayerRequest(d.id, raw, churchId));
          }
        });
        requests.sort((a, b) => {
          if (a.status === 'Urgent' && b.status !== 'Urgent') return -1;
          if (a.status !== 'Urgent' && b.status === 'Urgent') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setLocalItem(`${REQUESTS_KEY}_${churchId}`, requests);
        onUpdate(requests);
      },
      (err) => {
        console.error('subscribePrayerRequests error:', err);
        onUpdate(this.getPrayerRequests(churchId));
      }
    );
  },

  async savePrayerRequest(churchId: string, req: EnhancedPrayerRequest, currentUser?: SaaSUser | null): Promise<EnhancedPrayerRequest> {
    const current = this.getPrayerRequests(churchId);
    const stamped: EnhancedPrayerRequest = {
      ...req,
      church_id: churchId,
      updated_at: new Date().toISOString(),
    };

    const exists = current.some((r) => r.id === stamped.id);
    const updated = exists
      ? current.map((r) => (r.id === stamped.id ? stamped : r))
      : [stamped, ...current];

    setLocalItem(`${REQUESTS_KEY}_${churchId}`, updated);

    // Sync to Firestore collection 'prayers'
    try {
      await setDoc(doc(db, 'prayers', stamped.id), cleanForFirestore(stamped), { merge: true });
    } catch (e) {
      console.warn('Firestore savePrayerRequest failed, stored in local cache:', e);
    }

    // Lock-screen Safe Notification on New Creation
    if (!exists) {
      this.dispatchSafePrayerNotification(churchId, stamped, currentUser);
    }

    return stamped;
  },

  async deletePrayerRequest(churchId: string, id: string): Promise<void> {
    const current = this.getPrayerRequests(churchId);
    const next = current.filter((r) => r.id !== id);
    setLocalItem(`${REQUESTS_KEY}_${churchId}`, next);

    try {
      await deleteDoc(doc(db, 'prayers', id));
    } catch (e) {
      console.warn('Firestore deletePrayerRequest failed:', e);
    }
  },

  async togglePrayForRequest(churchId: string, requestId: string, userId: string): Promise<EnhancedPrayerRequest | null> {
    const current = this.getPrayerRequests(churchId);
    const target = current.find((r) => r.id === requestId);
    if (!target) return null;

    const prayedSet = new Set(target.prayed_user_ids || []);
    let newCount = target.prayer_count || 0;

    if (prayedSet.has(userId)) {
      prayedSet.delete(userId);
      newCount = Math.max(0, newCount - 1);
    } else {
      prayedSet.add(userId);
      newCount += 1;
    }

    const updated: EnhancedPrayerRequest = {
      ...target,
      prayer_count: newCount,
      prayed_user_ids: Array.from(prayedSet),
      updated_at: new Date().toISOString(),
    };

    return this.savePrayerRequest(churchId, updated);
  },

  async addFollowUpNote(churchId: string, requestId: string, note: PrayerFollowUpNote): Promise<EnhancedPrayerRequest | null> {
    const current = this.getPrayerRequests(churchId);
    const target = current.find((r) => r.id === requestId);
    if (!target) return null;

    const updated: EnhancedPrayerRequest = {
      ...target,
      follow_up_notes: [note, ...(target.follow_up_notes || [])],
      updated_at: new Date().toISOString(),
    };

    return this.savePrayerRequest(churchId, updated);
  },

  async markAnsweredWithTestimony(
    churchId: string,
    requestId: string,
    testimony: string,
    publishTestimony: boolean = false
  ): Promise<EnhancedPrayerRequest | null> {
    const current = this.getPrayerRequests(churchId);
    const target = current.find((r) => r.id === requestId);
    if (!target) return null;

    const updated: EnhancedPrayerRequest = {
      ...target,
      is_answered: true,
      status: 'Answered',
      answered_date: new Date().toISOString().split('T')[0],
      testimony: testimony.trim(),
      testimony_published: publishTestimony,
      updated_at: new Date().toISOString(),
    };

    return this.savePrayerRequest(churchId, updated);
  },

  async markRequestAnswered(
    churchId: string,
    requestId: string,
    testimony: string,
    publishTestimony: boolean = false
  ): Promise<EnhancedPrayerRequest | null> {
    return this.markAnsweredWithTestimony(churchId, requestId, testimony, publishTestimony);
  },

  // ==========================================
  // PRAYER GROUPS: DB SYNC & CRUD
  // ==========================================
  getPrayerGroups(churchId: string): PrayerGroup[] {
    const list = getLocalItem<PrayerGroup[]>(`${GROUPS_KEY}_${churchId}`, []);
    return list.filter((g) => matchesChurchTenant(g.church_id, churchId) && !MOCK_PRAYER_IDS.has(g.id));
  },

  async fetchPrayerGroups(churchId: string): Promise<PrayerGroup[]> {
    const groups: PrayerGroup[] = [];
    try {
      const snap = await getDocs(collection(db, 'prayer_groups'));
      snap.forEach((d) => {
        if (MOCK_PRAYER_IDS.has(d.id)) return;
        const data = d.data() as PrayerGroup;
        if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
          groups.push({ ...data, id: d.id, church_id: churchId });
        }
      });
      groups.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (e) {
      console.warn('Firestore fetchPrayerGroups error:', e);
    }
    setLocalItem(`${GROUPS_KEY}_${churchId}`, groups);
    return groups;
  },

  subscribePrayerGroups(churchId: string, onUpdate: (groups: PrayerGroup[]) => void): () => void {
    return onSnapshot(
      collection(db, 'prayer_groups'),
      (snap) => {
        const groups: PrayerGroup[] = [];
        snap.forEach((d) => {
          if (MOCK_PRAYER_IDS.has(d.id)) return;
          const data = d.data() as PrayerGroup;
          if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
            groups.push({ ...data, id: d.id, church_id: churchId });
          }
        });
        groups.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setLocalItem(`${GROUPS_KEY}_${churchId}`, groups);
        onUpdate(groups);
      },
      (err) => {
        console.error('subscribePrayerGroups error:', err);
        onUpdate(this.getPrayerGroups(churchId));
      }
    );
  },

  async savePrayerGroup(churchId: string, group: PrayerGroup): Promise<PrayerGroup> {
    const current = this.getPrayerGroups(churchId);
    const stamped: PrayerGroup = {
      ...group,
      church_id: churchId,
      updated_at: new Date().toISOString(),
    };

    const exists = current.some((g) => g.id === stamped.id);
    const updated = exists
      ? current.map((g) => (g.id === stamped.id ? stamped : g))
      : [...current, stamped];

    setLocalItem(`${GROUPS_KEY}_${churchId}`, updated);

    // Auto-register leader as a member if specified
    if (stamped.leader_name) {
      const existingMembers = this.getPrayerGroupMembers(churchId);
      const hasLeader = existingMembers.some(
        (m) => m.group_id === stamped.id && (m.role === 'Leader' || m.member_name === stamped.leader_name || (stamped.leader_id && m.member_id === stamped.leader_id))
      );
      if (!hasLeader) {
        const leaderMember: PrayerGroupMember = {
          id: `pgm-leader-${stamped.id}`,
          church_id: churchId,
          group_id: stamped.id,
          member_id: stamped.leader_id || `leader-${stamped.id}`,
          member_name: stamped.leader_name,
          member_email: stamped.leader_email,
          member_phone: stamped.leader_phone,
          role: 'Leader',
          status: 'Active',
          joined_at: stamped.created_at || new Date().toISOString(),
        };
        existingMembers.push(leaderMember);
        setLocalItem(`${GROUP_MEMBERS_KEY}_${churchId}`, existingMembers);
        try {
          await setDoc(doc(db, 'prayer_group_members', leaderMember.id), cleanForFirestore(leaderMember), { merge: true });
        } catch (e) {}
      }
    }

    this.syncGroupMemberCount(churchId, stamped.id);

    try {
      await setDoc(doc(db, 'prayer_groups', stamped.id), cleanForFirestore(stamped), { merge: true });
    } catch (e) {
      console.warn('Firestore savePrayerGroup failed, stored in local cache:', e);
    }

    return stamped;
  },

  async deletePrayerGroup(churchId: string, id: string): Promise<void> {
    const current = this.getPrayerGroups(churchId);
    const next = current.filter((g) => g.id !== id);
    setLocalItem(`${GROUPS_KEY}_${churchId}`, next);

    try {
      await deleteDoc(doc(db, 'prayer_groups', id));
    } catch (e) {
      console.warn('Firestore deletePrayerGroup failed:', e);
    }
  },

  // ==========================================
  // PRAYER GROUP MEMBERS: DB SYNC & CRUD
  // ==========================================
  getPrayerGroupMembers(churchId: string, groupId?: string): PrayerGroupMember[] {
    const list = getLocalItem<PrayerGroupMember[]>(`${GROUP_MEMBERS_KEY}_${churchId}`, []);
    const filtered = list.filter((m) => matchesChurchTenant(m.church_id, churchId) && !MOCK_PRAYER_IDS.has(m.id));
    if (groupId) return filtered.filter((m) => m.group_id === groupId);
    return filtered;
  },

  async fetchPrayerGroupMembers(churchId: string, groupId?: string): Promise<PrayerGroupMember[]> {
    const members: PrayerGroupMember[] = [];
    try {
      const snap = await getDocs(collection(db, 'prayer_group_members'));
      snap.forEach((d) => {
        if (MOCK_PRAYER_IDS.has(d.id)) return;
        const data = d.data() as PrayerGroupMember;
        if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
          members.push({ ...data, id: d.id, church_id: churchId });
        }
      });
    } catch (e) {
      console.warn('Firestore fetchPrayerGroupMembers error:', e);
    }
    setLocalItem(`${GROUP_MEMBERS_KEY}_${churchId}`, members);
    if (groupId) return members.filter((m) => m.group_id === groupId);
    return members;
  },

  subscribePrayerGroupMembers(churchId: string, onUpdate: (members: PrayerGroupMember[]) => void): () => void {
    return onSnapshot(
      collection(db, 'prayer_group_members'),
      (snap) => {
        const members: PrayerGroupMember[] = [];
        snap.forEach((d) => {
          if (MOCK_PRAYER_IDS.has(d.id)) return;
          const data = d.data() as PrayerGroupMember;
          if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
            members.push({ ...data, id: d.id, church_id: churchId });
          }
        });
        setLocalItem(`${GROUP_MEMBERS_KEY}_${churchId}`, members);
        onUpdate(members);
      },
      (err) => {
        console.error('subscribePrayerGroupMembers error:', err);
        onUpdate(this.getPrayerGroupMembers(churchId));
      }
    );
  },

  async saveGroupMember(churchId: string, member: PrayerGroupMember): Promise<PrayerGroupMember> {
    const current = this.getPrayerGroupMembers(churchId);
    const stamped: PrayerGroupMember = {
      ...member,
      church_id: churchId,
    };

    const exists = current.some((m) => m.id === stamped.id || (m.group_id === stamped.group_id && m.member_id === stamped.member_id));
    const updated = exists
      ? current.map((m) => (m.id === stamped.id ? stamped : m))
      : [...current, stamped];

    setLocalItem(`${GROUP_MEMBERS_KEY}_${churchId}`, updated);

    // Update group member_count
    this.syncGroupMemberCount(churchId, stamped.group_id);

    try {
      await setDoc(doc(db, 'prayer_group_members', stamped.id), cleanForFirestore(stamped), { merge: true });
    } catch (e) {
      console.warn('Firestore saveGroupMember failed, stored in local cache:', e);
    }

    return stamped;
  },

  async removeGroupMember(churchId: string, memberRecordId: string, groupId: string): Promise<void> {
    const current = this.getPrayerGroupMembers(churchId);
    const next = current.filter((m) => m.id !== memberRecordId);
    setLocalItem(`${GROUP_MEMBERS_KEY}_${churchId}`, next);

    this.syncGroupMemberCount(churchId, groupId);

    try {
      await deleteDoc(doc(db, 'prayer_group_members', memberRecordId));
    } catch (e) {
      console.warn('Firestore removeGroupMember failed:', e);
    }
  },

  syncGroupMemberCount(churchId: string, groupId: string) {
    const members = this.getPrayerGroupMembers(churchId, groupId).filter((m) => m.status === 'Active');
    const groups = this.getPrayerGroups(churchId);
    const target = groups.find((g) => g.id === groupId);
    if (target) {
      target.member_count = members.length;
      setLocalItem(`${GROUPS_KEY}_${churchId}`, groups);
      try {
        setDoc(doc(db, 'prayer_groups', groupId), cleanForFirestore(target), { merge: true }).catch(() => {});
      } catch (e) {}
    }
  },

  getGroupMembers(churchId: string, groupId?: string): PrayerGroupMember[] {
    return this.getPrayerGroupMembers(churchId, groupId);
  },

  async requestJoinGroup(
    churchId: string,
    groupId: string,
    memberId: string,
    memberName: string
  ): Promise<{ success: boolean; member?: PrayerGroupMember }> {
    const existing = this.getPrayerGroupMembers(churchId, groupId);
    const alreadyIn = existing.find((m) => m.member_id === memberId);
    if (alreadyIn) {
      return { success: true, member: alreadyIn };
    }
    const newMember: PrayerGroupMember = {
      id: `pgm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      church_id: churchId,
      group_id: groupId,
      member_id: memberId,
      member_name: memberName,
      role: 'Member',
      status: 'Active',
      joined_at: new Date().toISOString(),
    };
    const saved = await this.saveGroupMember(churchId, newMember);
    return { success: true, member: saved };
  },

  // ==========================================
  // PRAYER GROUP ATTENDANCE: DB SYNC & CRUD
  // ==========================================
  getPrayerGroupAttendance(churchId: string, groupId?: string): PrayerGroupAttendanceRecord[] {
    const list = getLocalItem<PrayerGroupAttendanceRecord[]>(`${GROUP_ATTENDANCE_KEY}_${churchId}`, []);
    const filtered = list.filter((a) => matchesChurchTenant(a.church_id, churchId) && !MOCK_PRAYER_IDS.has(a.id));
    if (groupId) return filtered.filter((a) => a.group_id === groupId);
    return filtered.sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
  },

  async fetchPrayerGroupAttendance(churchId: string, groupId?: string): Promise<PrayerGroupAttendanceRecord[]> {
    const records: PrayerGroupAttendanceRecord[] = [];
    try {
      const snap = await getDocs(collection(db, 'prayer_group_attendance'));
      snap.forEach((d) => {
        if (MOCK_PRAYER_IDS.has(d.id)) return;
        const data = d.data() as PrayerGroupAttendanceRecord;
        if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
          records.push({ ...data, id: d.id, church_id: churchId });
        }
      });
      records.sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
    } catch (e) {
      console.warn('Firestore fetchPrayerGroupAttendance error:', e);
    }
    setLocalItem(`${GROUP_ATTENDANCE_KEY}_${churchId}`, records);
    if (groupId) return records.filter((a) => a.group_id === groupId);
    return records;
  },

  subscribePrayerGroupAttendance(churchId: string, onUpdate: (records: PrayerGroupAttendanceRecord[]) => void): () => void {
    return onSnapshot(
      collection(db, 'prayer_group_attendance'),
      (snap) => {
        const records: PrayerGroupAttendanceRecord[] = [];
        snap.forEach((d) => {
          if (MOCK_PRAYER_IDS.has(d.id)) return;
          const data = d.data() as PrayerGroupAttendanceRecord;
          if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
            records.push({ ...data, id: d.id, church_id: churchId });
          }
        });
        records.sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
        setLocalItem(`${GROUP_ATTENDANCE_KEY}_${churchId}`, records);
        onUpdate(records);
      },
      (err) => {
        console.error('subscribePrayerGroupAttendance error:', err);
        onUpdate(this.getPrayerGroupAttendance(churchId));
      }
    );
  },

  async logPrayerGroupAttendance(
    churchId: string,
    groupId: string,
    sessionDate: string,
    attendeeIds: string[],
    topic?: string,
    notes?: string
  ): Promise<PrayerGroupAttendanceRecord> {
    const record: PrayerGroupAttendanceRecord = {
      id: `pga-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      church_id: churchId,
      group_id: groupId,
      session_date: sessionDate,
      topic: topic || null,
      notes: notes || null,
      attendee_ids: attendeeIds,
      total_present: attendeeIds.length,
      created_at: new Date().toISOString(),
    };

    const current = this.getPrayerGroupAttendance(churchId);
    const updated = [record, ...current];
    setLocalItem(`${GROUP_ATTENDANCE_KEY}_${churchId}`, updated);

    try {
      await setDoc(doc(db, 'prayer_group_attendance', record.id), cleanForFirestore(record));
    } catch (e) {
      console.warn('Firestore logPrayerGroupAttendance failed, stored in local cache:', e);
    }

    return record;
  },

  async updatePrayerGroupAttendance(
    churchId: string,
    attendanceId: string,
    payload: {
      sessionDate?: string;
      attendeeIds?: string[];
      topic?: string;
      notes?: string;
    }
  ): Promise<PrayerGroupAttendanceRecord> {
    const current = this.getPrayerGroupAttendance(churchId);
    const idx = current.findIndex((a) => a.id === attendanceId);

    if (idx >= 0) {
      current[idx] = {
        ...current[idx],
        session_date: payload.sessionDate ?? current[idx].session_date,
        attendee_ids: payload.attendeeIds ?? current[idx].attendee_ids,
        total_present: payload.attendeeIds ? payload.attendeeIds.length : current[idx].total_present,
        topic: payload.topic !== undefined ? payload.topic : current[idx].topic,
        notes: payload.notes !== undefined ? payload.notes : current[idx].notes,
      };
      setLocalItem(`${GROUP_ATTENDANCE_KEY}_${churchId}`, current);

      try {
        await setDoc(doc(db, 'prayer_group_attendance', attendanceId), cleanForFirestore(current[idx]), { merge: true });
      } catch (e) {
        console.warn('Firestore updatePrayerGroupAttendance failed, stored in local cache:', e);
      }

      return current[idx];
    }

    throw new Error('Attendance session not found');
  },

  async deletePrayerGroupAttendance(churchId: string, attendanceId: string): Promise<void> {
    const current = this.getPrayerGroupAttendance(churchId);
    const next = current.filter((a) => a.id !== attendanceId);
    setLocalItem(`${GROUP_ATTENDANCE_KEY}_${churchId}`, next);

    try {
      await deleteDoc(doc(db, 'prayer_group_attendance', attendanceId));
    } catch (e) {
      console.warn('Firestore deletePrayerGroupAttendance failed:', e);
    }
  },

  // ==========================================
  // PRAYER MEETINGS: DB SYNC & CRUD
  // ==========================================
  getPrayerMeetings(churchId: string): PrayerMeeting[] {
    const list = getLocalItem<PrayerMeeting[]>(`${MEETINGS_KEY}_${churchId}`, []);
    return list
      .filter((m) => matchesChurchTenant(m.church_id, churchId) && !MOCK_PRAYER_IDS.has(m.id))
      .sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime());
  },

  async fetchPrayerMeetings(churchId: string): Promise<PrayerMeeting[]> {
    const meetings: PrayerMeeting[] = [];
    try {
      const snap = await getDocs(collection(db, 'prayer_meetings'));
      snap.forEach((d) => {
        if (MOCK_PRAYER_IDS.has(d.id)) return;
        const data = d.data() as PrayerMeeting;
        if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
          meetings.push({ ...data, id: d.id, church_id: churchId });
        }
      });
      meetings.sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime());
    } catch (e) {
      console.warn('Firestore fetchPrayerMeetings error:', e);
    }
    setLocalItem(`${MEETINGS_KEY}_${churchId}`, meetings);
    return meetings;
  },

  subscribePrayerMeetings(churchId: string, onUpdate: (meetings: PrayerMeeting[]) => void): () => void {
    return onSnapshot(
      collection(db, 'prayer_meetings'),
      (snap) => {
        const meetings: PrayerMeeting[] = [];
        snap.forEach((d) => {
          if (MOCK_PRAYER_IDS.has(d.id)) return;
          const data = d.data() as PrayerMeeting;
          if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
            meetings.push({ ...data, id: d.id, church_id: churchId });
          }
        });
        meetings.sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime());
        setLocalItem(`${MEETINGS_KEY}_${churchId}`, meetings);
        onUpdate(meetings);
      },
      (err) => {
        console.error('subscribePrayerMeetings error:', err);
        onUpdate(this.getPrayerMeetings(churchId));
      }
    );
  },

  async savePrayerMeeting(churchId: string, meeting: PrayerMeeting): Promise<PrayerMeeting> {
    const current = this.getPrayerMeetings(churchId);
    const stamped: PrayerMeeting = {
      ...meeting,
      church_id: churchId,
      updated_at: new Date().toISOString(),
    };

    const exists = current.some((m) => m.id === stamped.id);
    const updated = exists
      ? current.map((m) => (m.id === stamped.id ? stamped : m))
      : [...current, stamped];

    setLocalItem(`${MEETINGS_KEY}_${churchId}`, updated);

    try {
      await setDoc(doc(db, 'prayer_meetings', stamped.id), cleanForFirestore(stamped), { merge: true });
    } catch (e) {
      console.warn('Firestore savePrayerMeeting failed, stored in local cache:', e);
    }

    return stamped;
  },

  async deletePrayerMeeting(churchId: string, id: string): Promise<void> {
    const current = this.getPrayerMeetings(churchId);
    const next = current.filter((m) => m.id !== id);
    setLocalItem(`${MEETINGS_KEY}_${churchId}`, next);

    try {
      await deleteDoc(doc(db, 'prayer_meetings', id));
    } catch (e) {
      console.warn('Firestore deletePrayerMeeting failed:', e);
    }
  },

  async toggleMeetingRsvp(churchId: string, meetingId: string, userId: string): Promise<PrayerMeeting | null> {
    const current = this.getPrayerMeetings(churchId);
    const target = current.find((m) => m.id === meetingId);
    if (!target) return null;

    const set = new Set(target.attendee_ids || []);
    if (set.has(userId)) {
      set.delete(userId);
    } else {
      set.add(userId);
    }

    const updated: PrayerMeeting = {
      ...target,
      attendee_ids: Array.from(set),
      updated_at: new Date().toISOString(),
    };

    return this.savePrayerMeeting(churchId, updated);
  },

  async recordMeetingAttendance(
    churchId: string,
    meetingId: string,
    presentMemberIds: string[],
    notes?: string
  ): Promise<PrayerMeeting | null> {
    const current = this.getPrayerMeetings(churchId);
    const target = current.find((m) => m.id === meetingId);
    if (!target) return null;

    const records = presentMemberIds.map((mId) => ({
      member_id: mId,
      member_name: 'Member',
      present: true,
      recorded_at: new Date().toISOString(),
    }));

    const updated: PrayerMeeting = {
      ...target,
      attendance_enabled: true,
      attendance_records: records,
      notes: notes !== undefined ? notes : (target as any).notes,
      updated_at: new Date().toISOString(),
    } as any;

    return this.savePrayerMeeting(churchId, updated);
  },

  // ==========================================
  // PRAYER GUIDES: DB SYNC & CRUD
  // ==========================================
  getPrayerGuides(churchId: string): PrayerGuide[] {
    const list = getLocalItem<PrayerGuide[]>(`${GUIDES_KEY}_${churchId}`, []);
    return list
      .filter((g) => matchesChurchTenant(g.church_id, churchId) && !MOCK_PRAYER_IDS.has(g.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async fetchPrayerGuides(churchId: string): Promise<PrayerGuide[]> {
    const guides: PrayerGuide[] = [];
    try {
      const snap = await getDocs(collection(db, 'prayer_guides'));
      snap.forEach((d) => {
        if (MOCK_PRAYER_IDS.has(d.id)) return;
        const data = d.data() as PrayerGuide;
        if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
          guides.push({ ...data, id: d.id, church_id: churchId });
        }
      });
      guides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.warn('Firestore fetchPrayerGuides error:', e);
    }
    setLocalItem(`${GUIDES_KEY}_${churchId}`, guides);
    return guides;
  },

  subscribePrayerGuides(churchId: string, onUpdate: (guides: PrayerGuide[]) => void): () => void {
    return onSnapshot(
      collection(db, 'prayer_guides'),
      (snap) => {
        const guides: PrayerGuide[] = [];
        snap.forEach((d) => {
          if (MOCK_PRAYER_IDS.has(d.id)) return;
          const data = d.data() as PrayerGuide;
          if (data && !MOCK_PRAYER_IDS.has(data.id) && matchesChurchTenant(data.church_id, churchId)) {
            guides.push({ ...data, id: d.id, church_id: churchId });
          }
        });
        guides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLocalItem(`${GUIDES_KEY}_${churchId}`, guides);
        onUpdate(guides);
      },
      (err) => {
        console.error('subscribePrayerGuides error:', err);
        onUpdate(this.getPrayerGuides(churchId));
      }
    );
  },

  async savePrayerGuide(churchId: string, guide: PrayerGuide): Promise<PrayerGuide> {
    const current = this.getPrayerGuides(churchId);
    const stamped: PrayerGuide = {
      ...guide,
      church_id: churchId,
      updated_at: new Date().toISOString(),
    };

    const exists = current.some((g) => g.id === stamped.id);
    const updated = exists
      ? current.map((g) => (g.id === stamped.id ? stamped : g))
      : [stamped, ...current];

    setLocalItem(`${GUIDES_KEY}_${churchId}`, updated);

    try {
      await setDoc(doc(db, 'prayer_guides', stamped.id), cleanForFirestore(stamped), { merge: true });
    } catch (e) {
      console.warn('Firestore savePrayerGuide failed, stored in local cache:', e);
    }

    return stamped;
  },

  async deletePrayerGuide(churchId: string, id: string): Promise<void> {
    const current = this.getPrayerGuides(churchId);
    const next = current.filter((g) => g.id !== id);
    setLocalItem(`${GUIDES_KEY}_${churchId}`, next);

    try {
      await deleteDoc(doc(db, 'prayer_guides', id));
    } catch (e) {
      console.warn('Firestore deletePrayerGuide failed:', e);
    }
  },

  // ==========================================
  // LOCK-SCREEN SAFE NOTIFICATION DISPATCHER
  // ==========================================
  dispatchSafePrayerNotification(
    churchId: string,
    req: EnhancedPrayerRequest,
    currentUser?: SaaSUser | null
  ) {
    let notifTitle = '🙏 New Prayer Request Submitted';
    let notifMsg = `A new prayer request in category "${req.category}" has been submitted. Please uphold in prayer.`;

    if (req.privacy === 'private') {
      return;
    }

    if (req.privacy === 'prayer_leaders') {
      notifTitle = '🛡️ Confidential Leader Prayer Request';
      notifMsg = `A confidential prayer need has been shared with church prayer leaders.`;
    } else if (req.privacy === 'group') {
      notifTitle = `👥 ${req.target_group_name || 'Prayer Group'}: New Prayer Need`;
      notifMsg = `A prayer request has been shared within your prayer group.`;
    }

    const notif: AppNotification = {
      id: `notif-pray-${Date.now()}`,
      church_id: churchId,
      churchId: churchId,
      title: notifTitle,
      message: notifMsg,
      category: 'Prayer',
      date: new Date().toISOString().split('T')[0],
      read: false,
      readByUserIds: [],
      linkTab: 'prayers',
      createdByUserId: currentUser?.id,
      authorName: currentUser?.name || 'Prayer Ministry',
    };

    saveNotificationToFirestore(notif).catch(console.warn);
  },
};
