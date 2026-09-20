import { SaaSUserRole } from '@/types';
import { canAccessAiPastor, getRoleConfig, normalizeRole } from '@/utils/rbac';
import { memberService } from './memberService';
import { ministryService } from './ministryService';
import { attendanceService } from './attendanceService';
import { eventService } from './eventService';
import { prayerService } from './prayerService';
import { visitorService } from './visitorService';
import { followUpService } from './followUpService';
import { announcementService } from './announcementService';
import { aiPastorToolsService } from './aiPastorToolsService';
import { 
  getStoredMembers, 
  getStoredUsers, 
  getStoredAttendance, 
  getStoredMinistries, 
  getStoredMinistryMembers, 
  getStoredEvents, 
  getStoredPrayers, 
  getStoredRoster,
  getStoredNotifications,
  getStoredAnnouncements,
  getStoredSundaySchoolClasses,
  getStoredSundaySchoolStudents,
  saveStoredAnnouncements,
  saveStoredRoster
} from '@/utils/storage';

export interface UserSecurityContext {
  churchId: string;
  userId: string;
  userRole: SaaSUserRole | string;
  userName: string;
  userEmail?: string;
  memberId?: string;
  authorizedMinistryIds: string[];
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  requiresActionConfirmation?: boolean;
  proposedActionPayload?: any;
}

function verifyRole(ctx: UserSecurityContext, allowedRoles: string[]): boolean {
  if (!ctx || !ctx.userRole) return false;
  const norm = normalizeRole(ctx.userRole);
  if (norm === 'SuperAdmin' || norm === 'PastorAdmin') return true;
  return allowedRoles.includes(norm);
}

function isPastorOrAdmin(ctx: UserSecurityContext): boolean {
  return verifyRole(ctx, ['SuperAdmin', 'PastorAdmin', 'AssistantPastor']);
}

function isMinistryLeader(ctx: UserSecurityContext): boolean {
  return verifyRole(ctx, ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'MinistryLeader']);
}

export const churchAiToolRegistry = {
  // -------------------------------------------------------------------------
  // 1. MEMBERS TOOLS
  // -------------------------------------------------------------------------
  async get_my_profile(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const members = await aiPastorToolsService.getAllMembers(ctx.churchId);
      const profile = members.find(m => m.id === ctx.memberId || m.email?.toLowerCase() === ctx.userEmail?.toLowerCase() || m.name.toLowerCase().includes(ctx.userName.toLowerCase()));
      
      return {
        toolName: 'get_my_profile',
        success: true,
        data: profile || {
          id: ctx.userId,
          name: ctx.userName,
          role: ctx.userRole,
          email: ctx.userEmail || 'N/A'
        }
      };
    } catch (err: any) {
      return { toolName: 'get_my_profile', success: false, error: err.message };
    }
  },

  async get_member_count(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'get_member_count', success: false, error: 'Access Denied: Administrative access required.' };
    }
    try {
      const summary = await aiPastorToolsService.getMemberCountAndSummary(ctx.churchId, ctx.userRole);
      return { toolName: 'get_member_count', success: true, data: summary };
    } catch (err: any) {
      return { toolName: 'get_member_count', success: false, error: err.message };
    }
  },

  async search_members(params: { query: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'search_members', success: false, error: 'Access Denied: Member search is restricted to leadership.' };
    }
    try {
      const results = await aiPastorToolsService.searchMembersByQuery(ctx.churchId, params.query, ctx.userRole);
      return { toolName: 'search_members', success: true, data: results };
    } catch (err: any) {
      return { toolName: 'search_members', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 2. MINISTRIES TOOLS
  // -------------------------------------------------------------------------
  async get_my_ministries(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const allMinistries = getStoredMinistries();
      const minMembers = getStoredMinistryMembers();

      // Find ministries user is part of
      const userMinIds = new Set(ctx.authorizedMinistryIds);
      minMembers.forEach(mm => {
        if (mm.memberId === ctx.memberId || mm.memberId === ctx.userId) {
          userMinIds.add(mm.ministryId);
        }
      });

      const matched = allMinistries.filter(m => userMinIds.has(m.id) || isPastorOrAdmin(ctx));
      return {
        toolName: 'get_my_ministries',
        success: true,
        data: {
          totalMinistries: matched.length,
          ministries: matched.map(m => ({
            id: m.id,
            name: m.name,
            leaderName: m.leaderName || 'Assigned Leader',
            meetingSchedule: (m.meetingDay ? `${m.meetingDay} ${m.meetingTime || ''}`.trim() : '') || 'Weekly'
          }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_my_ministries', success: false, error: err.message };
    }
  },

  async get_ministry_details(params: { ministryIdOrName: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const details = await aiPastorToolsService.getMinistryDetailsByName(ctx.churchId, params.ministryIdOrName, ctx.userRole);
      if (!details) {
        return { toolName: 'get_ministry_details', success: false, error: `Ministry matching '${params.ministryIdOrName}' not found.` };
      }
      return { toolName: 'get_ministry_details', success: true, data: details };
    } catch (err: any) {
      return { toolName: 'get_ministry_details', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 3. ATTENDANCE TOOLS
  // -------------------------------------------------------------------------
  async get_my_attendance(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const records = getStoredAttendance();
      const myRecords = records.filter((r: any) => {
        const pList = r.presentMemberIds || r.present_member_ids || [];
        return pList.includes(ctx.memberId) || r.memberId === ctx.memberId || r.member_id === ctx.memberId;
      });
      const present = myRecords.length;
      const total = records.length;

      return {
        toolName: 'get_my_attendance',
        success: true,
        data: {
          totalLoggedServices: total,
          totalPresent: present,
          attendanceRate: total > 0 ? `${Math.round((present / total) * 100)}%` : '100% (Good Standing)',
          recentHistory: myRecords.slice(0, 5).map((r: any) => ({
            date: r.date || r.service_date || 'Sunday Service',
            serviceName: r.serviceName || 'Main Service',
            status: 'Present'
          }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_my_attendance', success: false, error: err.message };
    }
  },

  async get_attendance_summary(params: { dateRange?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_attendance_summary', success: false, error: 'Access Denied: Church-wide attendance summaries require leadership access.' };
    }
    try {
      const summary = await aiPastorToolsService.getAttendanceSummary(ctx.churchId, params.dateRange || 'this_month', ctx.userRole);
      return { toolName: 'get_attendance_summary', success: true, data: summary };
    } catch (err: any) {
      return { toolName: 'get_attendance_summary', success: false, error: err.message };
    }
  },

  async get_ministry_attendance(params: { dateRange?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isMinistryLeader(ctx)) {
      return { toolName: 'get_ministry_attendance', success: false, error: 'Access Denied: Ministry attendance requires leader privileges.' };
    }
    try {
      const data = await aiPastorToolsService.getMinistryAttendance(ctx.churchId, params.dateRange || 'this_month', ctx.userRole);
      return { toolName: 'get_ministry_attendance', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_ministry_attendance', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 4. ASSIGNMENTS & ROSTER TOOLS
  // -------------------------------------------------------------------------
  async get_my_assignments(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const roster = getStoredRoster();
      const members = await aiPastorToolsService.getAllMembers(ctx.churchId);

      const myAssignments = roster.filter(r => {
        if (r.memberId === ctx.memberId || r.memberId === ctx.userId) return true;
        const assignee = members.find(m => m.id === r.memberId);
        return assignee && (assignee.email?.toLowerCase() === ctx.userEmail?.toLowerCase() || assignee.name.toLowerCase().includes(ctx.userName.toLowerCase()));
      });

      return {
        toolName: 'get_my_assignments',
        success: true,
        data: {
          totalAssignmentsCount: myAssignments.length,
          assignments: myAssignments.map(r => ({
            id: r.id,
            roleName: r.roleName || r.serviceName,
            serviceDate: r.serviceDate || 'Upcoming Sunday',
            status: r.confirmed ? 'Confirmed' : 'Scheduled'
          }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_my_assignments', success: false, error: err.message };
    }
  },

  async get_ministry_assignments(params: { ministryName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isMinistryLeader(ctx)) {
      return { toolName: 'get_ministry_assignments', success: false, error: 'Access Denied: Ministry assignments require team leader privileges.' };
    }
    try {
      const data = await aiPastorToolsService.getRosterAssignments(ctx.churchId, params.ministryName, ctx.userRole);
      return { toolName: 'get_ministry_assignments', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_ministry_assignments', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 5. EVENTS & CALENDAR TOOLS
  // -------------------------------------------------------------------------
  async get_upcoming_events(params: { limit?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const data = await aiPastorToolsService.getUpcomingEvents(ctx.churchId, params.limit || 5, ctx.userRole);
      return { toolName: 'get_upcoming_events', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_upcoming_events', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 6. PRAYER REQUESTS TOOLS
  // -------------------------------------------------------------------------
  async get_prayer_summary(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const summary = await aiPastorToolsService.getPrayerRequestsSummary(ctx.churchId, ctx.userRole);
      return { toolName: 'get_prayer_summary', success: true, data: summary };
    } catch (err: any) {
      return { toolName: 'get_prayer_summary', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 7. VISITORS & ABSENCE FOLLOW-UP TOOLS
  // -------------------------------------------------------------------------
  async get_visitor_summary(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_visitor_summary', success: false, error: 'Access Denied: Visitor summary requires leader access.' };
    }
    try {
      const summary = await aiPastorToolsService.getVisitorSummary(ctx.churchId, 'all_time', ctx.userRole);
      const followUps = await aiPastorToolsService.getPendingVisitorFollowups(ctx.churchId, ctx.userRole);
      return { toolName: 'get_visitor_summary', success: true, data: { ...summary, pendingFollowUps: followUps } };
    } catch (err: any) {
      return { toolName: 'get_visitor_summary', success: false, error: err.message };
    }
  },

  async get_absence_followup_summary(params: { daysThreshold?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'get_absence_followup_summary', success: false, error: 'Access Denied: Absence follow-ups require pastor/admin access.' };
    }
    try {
      const summary = await aiPastorToolsService.getAbsenceFollowupSummary(ctx.churchId, params.daysThreshold || 30, ctx.userRole);
      return { toolName: 'get_absence_followup_summary', success: true, data: summary };
    } catch (err: any) {
      return { toolName: 'get_absence_followup_summary', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 8. BIBLE VERSE SEARCH TOOL
  // -------------------------------------------------------------------------
  async search_bible(params: { query: string }, _ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    const q = params.query.toLowerCase();
    const passages: Record<string, string> = {
      'john 3:16': 'John 3:16 — "For God so loved the world that He gave His one and only Son, that whoever believes in Him shall not perish but have eternal life."',
      'forgiveness': 'Ephesians 4:32 — "Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you."',
      'faith': 'Hebrews 11:1 — "Now faith is confidence in what we hope for and assurance about what we do not see."',
      'peace': 'Philippians 4:6-7 — "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."',
      'love': '1 Corinthians 13:4-7 — "Love is patient, love is kind. It does not envy, it does not boast, it is not proud... Love never fails."'
    };

    let resultText = passages['john 3:16'];
    for (const [key, text] of Object.entries(passages)) {
      if (q.includes(key)) {
        resultText = text;
        break;
      }
    }

    return {
      toolName: 'search_bible',
      success: true,
      data: {
        query: params.query,
        translation: 'NIV (Holy Bible)',
        passage: resultText
      }
    };
  },

  // -------------------------------------------------------------------------
  // 9. PROPOSED ACTIONS (WRITE OPERATIONS REQUIRE CONFIRMATION)
  // -------------------------------------------------------------------------
  async propose_create_announcement(params: { title: string; content: string; targetRole?: string; ministryName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'propose_create_announcement', success: false, error: 'Access Denied: Creating announcements requires leadership access.' };
    }

    return {
      toolName: 'propose_create_announcement',
      success: true,
      requiresActionConfirmation: true,
      proposedActionPayload: {
        actionType: 'CREATE_ANNOUNCEMENT',
        title: params.title || 'Church Bulletin Announcement',
        content: params.content,
        targetRole: params.targetRole || (params.ministryName ? `Ministry: ${params.ministryName}` : 'All Members'),
        createdByName: ctx.userName,
        churchId: ctx.churchId
      }
    };
  },

  async execute_create_announcement(payload: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'execute_create_announcement', success: false, error: 'Access Denied.' };
    }
    try {
      const announcements = getStoredAnnouncements();
      const newAnn: any = {
        id: `ann-${Date.now()}`,
        church_id: ctx.churchId,
        title: payload.title,
        content: payload.content,
        target_role: payload.targetRole || 'All',
        created_by_name: ctx.userName,
        created_at: new Date().toISOString()
      };
      announcements.unshift(newAnn);
      saveStoredAnnouncements(announcements);

      return {
        toolName: 'execute_create_announcement',
        success: true,
        data: { message: `Announcement "${payload.title}" has been successfully published!`, announcementId: newAnn.id }
      };
    } catch (err: any) {
      return { toolName: 'execute_create_announcement', success: false, error: err.message };
    }
  },

  async propose_create_assignment(params: { memberName: string; roleName: string; serviceDate: string; ministryName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'propose_create_assignment', success: false, error: 'Access Denied: Volunteer assignments require leadership access.' };
    }

    return {
      toolName: 'propose_create_assignment',
      success: true,
      requiresActionConfirmation: true,
      proposedActionPayload: {
        actionType: 'CREATE_ROSTER_ASSIGNMENT',
        memberName: params.memberName,
        roleName: params.roleName || 'Volunteer Duty',
        serviceDate: params.serviceDate || 'Upcoming Sunday',
        ministryName: params.ministryName || 'Worship Service',
        churchId: ctx.churchId
      }
    };
  },

  async execute_create_assignment(payload: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'execute_create_assignment', success: false, error: 'Access Denied.' };
    }
    try {
      const roster = getStoredRoster();
      const newAssign: any = {
        id: `rost-${Date.now()}`,
        churchId: ctx.churchId,
        memberName: payload.memberName,
        memberId: `mem-${Date.now()}`,
        serviceName: payload.ministryName || 'Sunday Service',
        roleName: payload.roleName,
        serviceDate: payload.serviceDate,
        confirmed: false
      };
      roster.unshift(newAssign);
      saveStoredRoster(roster);

      return {
        toolName: 'execute_create_assignment',
        success: true,
        data: { message: `Successfully assigned ${payload.memberName} to ${payload.roleName} for ${payload.serviceDate}.`, assignmentId: newAssign.id }
      };
    } catch (err: any) {
      return { toolName: 'execute_create_assignment', success: false, error: err.message };
    }
  },

  async get_contextual_join_filter(params: { periodLabel?: string; queryTarget?: string; historyTexts?: string[] }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'get_contextual_join_filter', success: false, error: 'Access Denied.' };
    }
    try {
      const data = await aiPastorToolsService.getContextualJoinFilter(
        ctx.churchId,
        params.periodLabel || 'this_month',
        params.queryTarget,
        params.historyTexts || [],
        ctx.userRole
      );
      return { toolName: 'get_contextual_join_filter', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_contextual_join_filter', success: false, error: err.message };
    }
  }
};
