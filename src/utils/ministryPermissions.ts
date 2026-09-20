import { SaaSUser, Member, ChurchMinistry, MinistryMember } from '../types';
import { findLinkedMemberForUser } from './notificationUtils';
import { normalizeRole } from './rbac';

export interface UserMinistryInfo {
  ministry: ChurchMinistry;
  isLeader: boolean;
  roleTitle: string;
}

/**
 * Returns all ministries that the given user belongs to (as member or leader).
 */
export function getUserAssignedMinistries(
  currentUser: SaaSUser | null | undefined,
  members: Member[] = [],
  ministries: ChurchMinistry[] = [],
  ministryMembers: MinistryMember[] = []
): UserMinistryInfo[] {
  if (!currentUser) return [];

  const linkedMember = findLinkedMemberForUser(currentUser, members);
  const memberId = linkedMember?.id || currentUser.id;
  const userName = (currentUser.name || '').trim().toLowerCase();
  const userRole = normalizeRole(currentUser.role);

  const isGlobalAdmin = ['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(userRole);

  const results: UserMinistryInfo[] = [];

  ministries.forEach((min) => {
    let isAssigned = false;
    let isLeader = false;
    let roleTitle = 'Member';

    // 1. Check explicit MinistryMember table records
    const memberRec = ministryMembers.find(
      (mm) =>
        mm.ministryId === min.id &&
        mm.status !== 'Inactive' &&
        (mm.memberId === memberId || mm.memberId === currentUser.id)
    );
    if (memberRec) {
      isAssigned = true;
      roleTitle = memberRec.ministryRole || memberRec.role || 'Team Member';
      const roleLower = roleTitle.toLowerCase();
      if (
        roleLower.includes('leader') ||
        roleLower.includes('head') ||
        roleLower.includes('director') ||
        roleLower.includes('coordinator') ||
        roleLower.includes('chair') ||
        roleLower.includes('pastor')
      ) {
        isLeader = true;
      }
    }

    // 2. Check ChurchMinistry leader fields
    if (
      min.leaderMemberId === memberId ||
      min.leaderMemberId === currentUser.id ||
      (min.leaderName && min.leaderName.trim().toLowerCase() === userName)
    ) {
      isAssigned = true;
      isLeader = true;
      roleTitle = 'Ministry Leader';
    }

    if (
      min.assistantLeaderMemberId === memberId ||
      min.assistantLeaderMemberId === currentUser.id ||
      (min.assistantLeaderName && min.assistantLeaderName.trim().toLowerCase() === userName)
    ) {
      isAssigned = true;
      isLeader = true;
      if (roleTitle === 'Member' || roleTitle === 'Team Member') roleTitle = 'Assistant Leader';
    }

    // 3. Check Member.ministryTeams string array
    if (linkedMember?.ministryTeams && Array.isArray(linkedMember.ministryTeams)) {
      const match = linkedMember.ministryTeams.some(
        (t) =>
          t.toLowerCase() === min.name.toLowerCase() ||
          min.name.toLowerCase().includes(t.toLowerCase()) ||
          t.toLowerCase().includes(min.name.toLowerCase())
      );
      if (match) {
        isAssigned = true;
        if (linkedMember.status === 'Leader' || userRole === 'MinistryLeader') {
          isLeader = true;
          if (roleTitle === 'Member' || roleTitle === 'Team Member') roleTitle = 'Ministry Leader';
        }
      }
    }

    // If user is global admin (Pastor/Admin), they can access/lead all ministries
    if (isGlobalAdmin) {
      isAssigned = true;
      isLeader = true;
      if (roleTitle === 'Member' || roleTitle === 'Team Member') roleTitle = 'Pastor / Administrator';
    }

    if (isAssigned) {
      results.push({
        ministry: min,
        isLeader,
        roleTitle,
      });
    }
  });

  return results;
}

/**
 * Checks if a user is a leader of a specific ministry ID.
 */
export function isUserLeaderOfMinistry(
  ministryId: string,
  currentUser: SaaSUser | null | undefined,
  members: Member[] = [],
  ministries: ChurchMinistry[] = [],
  ministryMembers: MinistryMember[] = []
): boolean {
  if (!currentUser) return false;
  const userRole = normalizeRole(currentUser.role);
  if (['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(userRole)) {
    return true;
  }
  const assigned = getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  const info = assigned.find((a) => a.ministry.id === ministryId);
  return info ? info.isLeader : false;
}

/**
 * Checks if a user belongs to a specific ministry ID (as member or leader).
 */
export function isUserMemberOfMinistry(
  ministryId: string,
  currentUser: SaaSUser | null | undefined,
  members: Member[] = [],
  ministries: ChurchMinistry[] = [],
  ministryMembers: MinistryMember[] = []
): boolean {
  if (!currentUser) return false;
  const userRole = normalizeRole(currentUser.role);
  if (['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(userRole)) {
    return true;
  }
  const assigned = getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  return assigned.some((a) => a.ministry.id === ministryId);
}
