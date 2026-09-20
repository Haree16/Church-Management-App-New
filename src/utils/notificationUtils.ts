import { AppNotification, SaaSUser, Member } from '../types';

/**
 * Normalizes phone strings for robust identity matching.
 */
export function sanitizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Finds the Member directory record corresponding to a SaaSUser.
 */
export function findLinkedMemberForUser(
  user: SaaSUser | null | undefined,
  members: Member[] = []
): Member | undefined {
  if (!user) return undefined;

  const userPhone = sanitizePhone(user.phone);
  const userEmail = (user.email || '').trim().toLowerCase();
  const userName = (user.name || '').trim().toLowerCase();

  return members.find((m) => {
    if (m.id === user.id) return true;
    if (userEmail && m.email && m.email.trim().toLowerCase() === userEmail) return true;
    if (userPhone && m.phone && sanitizePhone(m.phone) === userPhone) return true;
    if (userName) {
      const memberFullName = `${m.firstName || ''} ${m.lastName || ''}`.trim().toLowerCase();
      if (memberFullName === userName) return true;
    }
    return false;
  });
}

/**
 * Finds the SaaSUser account corresponding to a Member directory ID.
 */
export function findLinkedUserForMember(
  memberId: string,
  allUsers: SaaSUser[] = [],
  members: Member[] = []
): SaaSUser | undefined {
  if (!memberId) return undefined;

  // Direct match by ID
  const directUser = allUsers.find((u) => u.id === memberId);
  if (directUser) return directUser;

  const member = members.find((m) => m.id === memberId);
  if (!member) return undefined;

  const memberPhone = sanitizePhone(member.phone);
  const memberEmail = (member.email || '').trim().toLowerCase();
  const memberFullName = `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase();

  return allUsers.find((u) => {
    if (memberEmail && u.email && u.email.trim().toLowerCase() === memberEmail) return true;
    if (memberPhone && u.phone && sanitizePhone(u.phone) === memberPhone) return true;
    if (memberFullName && u.name && u.name.trim().toLowerCase() === memberFullName) return true;
    return false;
  });
}

/**
 * Checks if an AppNotification is targeted and visible to the currentUser.
 *
 * Rules:
 * 1. If excludeUserIds contains currentUser.id -> EXCLUDED
 * 2. If excludeMemberIds contains linkedMember.id -> EXCLUDED
 * 3. If targetUserIds is specified:
 *    - Must contain currentUser.id OR 'everyone' OR 'all' OR '*' OR linkedMember.id
 * 4. If targetMemberIds is specified:
 *    - Must contain linkedMember.id OR currentUser.id
 * 5. If neither targetUserIds nor targetMemberIds is set -> visible to whole church.
 */
export function isNotificationForUser(
  notification: AppNotification,
  currentUser: SaaSUser | null | undefined,
  members: Member[] = []
): boolean {
  if (!notification) return false;

  const currentUserId = currentUser?.id;
  const linkedMember = findLinkedMemberForUser(currentUser, members);
  const linkedMemberId = linkedMember?.id;

  // 1. Exclusions
  if (currentUserId && notification.excludeUserIds?.includes(currentUserId)) {
    return false;
  }
  if (linkedMemberId && notification.excludeMemberIds?.includes(linkedMemberId)) {
    return false;
  }

  // 2. Self-Created Suppression: Notifications created by the current user are for OTHER members (not the creator)
  if (currentUserId && notification.createdByUserId && notification.createdByUserId === currentUserId) {
    return false;
  }

  const hasTargetUsers = Array.isArray(notification.targetUserIds) && notification.targetUserIds.length > 0;
  const hasTargetMembers = Array.isArray(notification.targetMemberIds) && notification.targetMemberIds.length > 0;

  // 2. Targeted Notifications
  if (hasTargetUsers || hasTargetMembers) {
    let matched = false;

    if (hasTargetUsers && notification.targetUserIds) {
      if (
        notification.targetUserIds.includes('everyone') ||
        notification.targetUserIds.includes('all') ||
        notification.targetUserIds.includes('*')
      ) {
        matched = true;
      } else if (currentUserId && notification.targetUserIds.includes(currentUserId)) {
        matched = true;
      } else if (linkedMemberId && notification.targetUserIds.includes(linkedMemberId)) {
        matched = true;
      }
    }

    if (!matched && hasTargetMembers && notification.targetMemberIds) {
      if (linkedMemberId && notification.targetMemberIds.includes(linkedMemberId)) {
        matched = true;
      } else if (currentUserId && notification.targetMemberIds.includes(currentUserId)) {
        matched = true;
      }
    }

    return matched;
  }

  // 3. General Broadcasts (church-wide)
  const userChurchId = currentUser?.church_id || currentUser?.churchId || 'church-1';
  const notifChurchId = notification.church_id || notification.churchId || 'church-1';
  return notifChurchId === userChurchId;
}

/**
 * Determines whether a notification has been seen/read by currentUser.
 * It will show as unread until the user marks it as read.
 */
export function isNotificationReadByUser(
  notification: AppNotification,
  currentUser: SaaSUser | null | undefined
): boolean {
  if (!notification) return true;
  if (!currentUser?.id) return Boolean(notification.read);

  if (notification.readByUserIds && Array.isArray(notification.readByUserIds)) {
    return notification.readByUserIds.includes(currentUser.id);
  }

  return Boolean(notification.read);
}

/**
 * Returns an updated notification marking it read for the specific user.
 */
export function markNotificationReadForUser(
  notification: AppNotification,
  userId: string
): AppNotification {
  const currentReadUsers = notification.readByUserIds || [];
  const updatedReadUsers = currentReadUsers.includes(userId)
    ? currentReadUsers
    : [...currentReadUsers, userId];

  return {
    ...notification,
    read: true,
    readByUserIds: updatedReadUsers,
  };
}

/**
 * Computes the unread count for a given user across all notifications.
 */
export function getUnreadNotificationsCount(
  notifications: AppNotification[] = [],
  currentUser: SaaSUser | null | undefined,
  members: Member[] = []
): number {
  return notifications.filter(
    (n) => isNotificationForUser(n, currentUser, members) && !isNotificationReadByUser(n, currentUser)
  ).length;
}

/**
 * Automatically infers or formats the service name based on date and ministry name.
 */
export function inferServiceNameForDate(
  dateStr?: string,
  ministryName?: string,
  churchSettings?: any
): string {
  if (!dateStr) return ministryName ? `${ministryName} Gathering` : 'Sunday Morning Worship Service';
  
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return ministryName ? `${ministryName} Gathering` : 'Church Gathering';

  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

  // 1. If configured in churchSettings services
  if (churchSettings?.services && Array.isArray(churchSettings.services)) {
    const matched = churchSettings.services.find(
      (s: any) => s.isActive !== false && s.day?.toLowerCase() === dayName.toLowerCase()
    );
    if (matched && matched.name) {
      return matched.name;
    }
  }

  // 2. Default day-based mapping
  switch (dayName) {
    case 'Sunday':
      return 'Sunday Morning Worship Service';
    case 'Wednesday':
      return ministryName ? `${ministryName} Gathering` : 'Wednesday Word & Intercessory Prayer';
    case 'Friday':
      return ministryName ? `${ministryName} (Friday Fellowship)` : 'Friday Night Youth & Bible Fellowship';
    case 'Saturday':
      return ministryName ? `${ministryName} (Saturday Prayer)` : 'Saturday Morning Dawn Prayer';
    default:
      return ministryName ? `${ministryName} (${dayName} Gathering)` : `${dayName} Church Gathering`;
  }
}
