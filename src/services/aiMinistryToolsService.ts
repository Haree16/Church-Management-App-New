import { 
  SaaSUser, Member, ChurchMinistry, MinistryMember, 
  RosterAssignment, MinistryActivity, MinistryAnnouncement, 
  ChurchEvent, AttendanceRecord 
} from '@/types';
import { getUserAssignedMinistries, UserMinistryInfo } from '@/utils/ministryPermissions';

/**
 * Authorization Guard: Verifies if user is authorized to access specified ministryId
 */
function verifyMinistryAuthorization(
  currentUser: SaaSUser | null | undefined,
  requestedMinistryId: string,
  members: Member[],
  ministries: ChurchMinistry[],
  ministryMembers: MinistryMember[]
): { authorized: boolean; ministryInfo?: UserMinistryInfo } {
  if (!currentUser) return { authorized: false };

  const assigned = getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  const match = assigned.find(m => m.ministry.id === requestedMinistryId);

  if (!match) {
    return { authorized: false };
  }

  return { authorized: true, ministryInfo: match };
}

export const aiMinistryToolsService = {
  /**
   * Tool 1: Get all authorized ministries for current user
   */
  async getMyMinistries(
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[]
  ): Promise<UserMinistryInfo[]> {
    return getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  },

  /**
   * Tool 2: Get ministry details & schedule
   */
  async getMinistryDetails(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[]
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry, isLeader, roleTitle } = auth.ministryInfo;
    const teamMembersCount = ministryMembers.filter(mm => mm.ministryId === ministry.id).length;

    return {
      ministryId: ministry.id,
      ministryName: ministry.name,
      description: ministry.description,
      meetingSchedule: ministry.meetingDay ? `${ministry.meetingDay} ${ministry.meetingTime || ''}`.trim() : 'Weekly',
      leaderName: ministry.leaderName || 'Assigned Leader',
      assistantLeaderName: ministry.assistantLeaderName || 'N/A',
      userRoleInMinistry: roleTitle,
      isUserLeader: isLeader,
      totalMembersCount: teamMembersCount,
      status: ministry.status
    };
  },

  /**
   * Tool 3: Get ministry member roster
   */
  async getMinistryMembersList(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[]
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry } = auth.ministryInfo;

    // Filter members belonging to this ministry
    const minMemberRecs = ministryMembers.filter(mm => mm.ministryId === ministry.id && mm.status !== 'Inactive');
    
    // Also include members matching by team name string array
    const matchedMembers = members.filter(m => {
      const isExplicitRec = minMemberRecs.some(rec => rec.memberId === m.id);
      const isTeamMatch = m.ministryTeams && m.ministryTeams.some(t => 
        t.toLowerCase() === ministry.name.toLowerCase() || ministry.name.toLowerCase().includes(t.toLowerCase())
      );
      return isExplicitRec || isTeamMatch;
    });

    return {
      ministryName: ministry.name,
      totalCount: matchedMembers.length,
      members: matchedMembers.map(m => {
        const rec = minMemberRecs.find(r => r.memberId === m.id);
        return {
          id: m.id,
          name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Ministry Member',
          role: rec?.ministryRole || rec?.role || (m.status === 'Leader' ? 'Leader' : 'Member'),
          joinedDate: m.joinedDate || 'N/A'
        };
      })
    };
  },

  /**
   * Tool 4: Get upcoming assignments for current user
   */
  async getMyAssignments(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    roster: RosterAssignment[],
    dateRange: string = 'upcoming'
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry } = auth.ministryInfo;

    // Find linked member ID for user
    const memberNameLower = (currentUser?.name || '').trim().toLowerCase();
    const userAssignments = roster.filter(r => {
      const isMemberMatch = r.memberId === currentUser?.id || 
                           (r.memberName && r.memberName.trim().toLowerCase() === memberNameLower);
      const isMinistryMatch = r.ministryId === ministry.id || 
                             (r.team && r.team.toLowerCase().includes(ministry.name.toLowerCase())) ||
                             (r.serviceName && r.serviceName.toLowerCase().includes(ministry.name.toLowerCase()));
      return isMemberMatch && isMinistryMatch;
    });

    const nowStr = new Date().toISOString().split('T')[0];
    let filtered = userAssignments;

    if (dateRange === 'upcoming') {
      filtered = userAssignments.filter(r => r.serviceDate >= nowStr);
    } else if (dateRange === 'this_week') {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      const limitStr = sevenDaysLater.toISOString().split('T')[0];
      filtered = userAssignments.filter(r => r.serviceDate >= nowStr && r.serviceDate <= limitStr);
    }

    // Sort by service date
    filtered.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));

    return {
      ministryName: ministry.name,
      totalAssignmentsCount: filtered.length,
      nextAssignment: filtered[0] ? {
        id: filtered[0].id,
        serviceDate: filtered[0].serviceDate,
        serviceName: filtered[0].serviceName,
        roleName: filtered[0].roleName,
        confirmed: filtered[0].confirmed
      } : null,
      assignments: filtered.map(r => ({
        id: r.id,
        serviceDate: r.serviceDate,
        serviceName: r.serviceName,
        roleName: r.roleName,
        confirmed: r.confirmed
      }))
    };
  },

  /**
   * Tool 5: Get all ministry roster assignments (Leaders / Authorized members)
   */
  async getMinistryAssignments(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    roster: RosterAssignment[],
    dateRange: string = 'this_sunday'
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry } = auth.ministryInfo;

    const ministryRoster = roster.filter(r => 
      r.ministryId === ministry.id || 
      (r.team && r.team.toLowerCase().includes(ministry.name.toLowerCase())) ||
      (r.serviceName && r.serviceName.toLowerCase().includes(ministry.name.toLowerCase()))
    );

    const unconfirmed = ministryRoster.filter(r => !r.confirmed);

    return {
      ministryName: ministry.name,
      totalAssignments: ministryRoster.length,
      unconfirmedCount: unconfirmed.length,
      unconfirmedAssignments: unconfirmed.map(r => ({
        id: r.id,
        memberName: r.memberName,
        roleName: r.roleName,
        serviceDate: r.serviceDate,
        serviceName: r.serviceName
      })),
      allAssignments: ministryRoster.map(r => ({
        id: r.id,
        memberName: r.memberName,
        roleName: r.roleName,
        serviceDate: r.serviceDate,
        serviceName: r.serviceName,
        confirmed: r.confirmed
      }))
    };
  },

  /**
   * Tool 6: Get upcoming ministry events & activities
   */
  async getMinistryEventsAndActivities(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    events: ChurchEvent[],
    activities: MinistryActivity[],
    dateRange: string = 'upcoming'
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry } = auth.ministryInfo;

    const minActivities = activities.filter(a => a.ministryId === ministry.id);
    const minEvents = events.filter(e => 
      e.category === 'Meeting' || 
      e.title.toLowerCase().includes(ministry.name.toLowerCase()) || 
      e.description.toLowerCase().includes(ministry.name.toLowerCase())
    );

    return {
      ministryName: ministry.name,
      meetingSchedule: ministry.meetingDay ? `${ministry.meetingDay} ${ministry.meetingTime || ''}`.trim() : 'Weekly',
      activities: minActivities.map(a => ({
        id: a.id,
        name: a.name,
        date: a.date,
        startTime: a.startTime,
        location: a.location,
        status: a.status,
        leaderName: a.leaderName
      })),
      events: minEvents.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        location: e.location,
        category: e.category
      }))
    };
  },

  /**
   * Tool 7: Get ministry announcements
   */
  async getMinistryAnnouncementsList(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    announcements: MinistryAnnouncement[]
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry } = auth.ministryInfo;

    const list = announcements.filter(a => a.ministryId === ministry.id);

    return {
      ministryName: ministry.name,
      totalAnnouncements: list.length,
      announcements: list.map(a => ({
        id: a.id,
        title: a.title,
        message: a.message,
        authorName: a.authorName,
        date: a.date,
        priority: a.priority
      }))
    };
  },

  /**
   * Tool 8: Get user's own ministry attendance or aggregate ministry attendance
   */
  async getMinistryAttendance(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    attendance: AttendanceRecord[],
    activities: MinistryActivity[]
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry, isLeader } = auth.ministryInfo;
    const minActivities = activities.filter(a => a.ministryId === ministry.id);

    return {
      ministryName: ministry.name,
      isLeaderView: isLeader,
      totalActivitiesLogged: minActivities.length,
      activitiesAttendanceSummary: minActivities.map(a => ({
        activityName: a.name,
        date: a.date,
        presentCount: a.presentMemberIds ? a.presentMemberIds.length : 0,
        status: a.status
      }))
    };
  },

  /**
   * Tool 9: Prepare draft announcement for confirmation (Leader Action)
   */
  async prepareMinistryAnnouncementDraft(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    title: string,
    message: string
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry, isLeader } = auth.ministryInfo;

    if (!isLeader) {
      throw new Error('Access Denied: Only Ministry Leaders can draft or post ministry announcements.');
    }

    return {
      actionType: 'create_announcement',
      requiresConfirmation: true,
      ministryId: ministry.id,
      ministryName: ministry.name,
      draftAnnouncement: {
        title: title || `${ministry.name} Notice`,
        message: message,
        authorName: currentUser?.name || 'Ministry Leader',
        date: new Date().toISOString().split('T')[0],
        priority: 'Normal'
      }
    };
  },

  /**
   * Tool 10: Prepare draft WhatsApp message for confirmation (Leader Action)
   */
  async prepareWhatsAppMessageDraft(
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    topic: string,
    customNote?: string
  ) {
    const auth = verifyMinistryAuthorization(currentUser, ministryId, members, ministries, ministryMembers);
    if (!auth.authorized || !auth.ministryInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry, isLeader } = auth.ministryInfo;

    const draftText = `அன்பான ${ministry.name} உறுப்பினர்களே,

${customNote || `${topic} பற்றிய முக்கிய அறிவிப்பு:`}

ஆலயத்திற்கு தவறாமல் வருகை தந்து இறை ஆசீர்வாதத்தைப் பெறுவோம்.

நன்றி!
- ${currentUser?.name || ministry.name + ' Leadership'}`;

    return {
      actionType: 'whatsapp_message',
      requiresConfirmation: true,
      ministryId: ministry.id,
      ministryName: ministry.name,
      isLeader,
      draftText
    };
  }
};
