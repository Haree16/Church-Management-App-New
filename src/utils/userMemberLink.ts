import { SaaSUser, Member } from '@/types';
import { ChurchMember, Profile } from '@/types/database';

/**
 * Utility functions for resolving explicit links between
 * System Users (Auth profiles / SaaS users) and Church Directory Members.
 */

/**
 * Resolves the Church Directory Member associated with a given User.
 * Link precedence:
 * 1. Explicit ID linkage: member.userId === user.id or user.memberId === member.id
 * 2. Email linkage: member.email.toLowerCase() === user.email.toLowerCase()
 * 3. Name linkage: member full name matches user.name
 */
export function findMemberForUser(
  user: { id: string; email?: string; name?: string; memberId?: string } | SaaSUser | Profile | null | undefined,
  members: (Member | ChurchMember)[]
): (Member | ChurchMember) | null {
  if (!user || !members || members.length === 0) return null;

  const uId = user.id;
  const uEmail = (user.email || '').toLowerCase().trim();
  const uMemberId = (user as any).memberId || (user as any).member_id;
  const uName = ((user as any).name || (user as any).display_name || '').toLowerCase().trim();

  // 1. Match by explicit member ID or user ID
  for (const m of members) {
    const mId = m.id;
    const mUserId = (m as any).user_id || (m as any).userId;
    if (uMemberId && mId === uMemberId) return m;
    if (mUserId && mUserId === uId) return m;
  }

  // 2. Match by email address
  if (uEmail) {
    for (const m of members) {
      const mEmail = (m as any).email || (m as any).profile?.email || '';
      if (mEmail && mEmail.toLowerCase().trim() === uEmail) {
        return m;
      }
    }
  }

  // 3. Match by name
  if (uName) {
    for (const m of members) {
      const mName = (
        (m as any).name ||
        (m as any).profile?.display_name ||
        `${(m as any).firstName || (m as any).profile?.first_name || ''} ${(m as any).lastName || (m as any).profile?.last_name || ''}`
      ).toLowerCase().trim();
      if (mName && (mName === uName || mName.includes(uName) || uName.includes(mName))) {
        return m;
      }
    }
  }

  return null;
}

/**
 * Resolves the System User / Auth Profile associated with a given Church Member.
 */
export function findUserForMember(
  member: Member | ChurchMember | null | undefined,
  users: (SaaSUser | Profile)[]
): (SaaSUser | Profile) | null {
  if (!member || !users || users.length === 0) return null;

  const mId = member.id;
  const mUserId = (member as any).user_id || (member as any).userId;
  const mEmail = ((member as any).email || (member as any).profile?.email || '').toLowerCase().trim();

  // 1. Match by explicit user ID
  if (mUserId) {
    const match = users.find((u) => u.id === mUserId);
    if (match) return match;
  }

  // 2. Match by explicit member ID property on User
  for (const u of users) {
    const uMemberId = (u as any).memberId || (u as any).member_id;
    if (uMemberId && uMemberId === mId) return u;
  }

  // 3. Match by email
  if (mEmail) {
    const match = users.find((u) => (u.email || '').toLowerCase().trim() === mEmail);
    if (match) return match;
  }

  return null;
}
