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
import { familyService } from './familyService';
import { reportService } from './reportService';
import { churchAiInsightsService } from './churchAiInsightsService';
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
  getStoredSundaySchoolAttendance,
  getStoredChurchSettings,
  saveStoredAnnouncements,
  saveStoredRoster
} from '@/utils/storage';
import { whatsAppService, normalizePhoneNumber } from './whatsAppService';
import { churchOperationsService } from './churchOperationsService';
import { churchAnalyticsService } from './churchAnalyticsService';
import { workflowAutomationService } from './workflowAutomationService';
import { AnalyticsTimeframe } from '@/types/churchAnalytics';

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
  return verifyRole(ctx, ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'MinistryLeader', 'SundaySchoolTeacher']);
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
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'search_members', success: false, error: 'Access Denied: Member search requires leadership access.' };
    }
    try {
      const results = await aiPastorToolsService.searchMembersByQuery(ctx.churchId, params.query, ctx.userRole);
      return { toolName: 'search_members', success: true, data: results };
    } catch (err: any) {
      return { toolName: 'search_members', success: false, error: err.message };
    }
  },

  async get_member(params: { memberIdOrName: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_member', success: false, error: 'Access Denied: Leadership permissions required.' };
    }
    try {
      const members = await aiPastorToolsService.getAllMembers(ctx.churchId);
      const q = params.memberIdOrName.toLowerCase();
      const matched = members.find(m => m.id === params.memberIdOrName || m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
      
      if (!matched) {
        return { toolName: 'get_member', success: false, error: `No member record found matching '${params.memberIdOrName}'.` };
      }

      return { toolName: 'get_member', success: true, data: matched };
    } catch (err: any) {
      return { toolName: 'get_member', success: false, error: err.message };
    }
  },

  async get_member_profile(params: { memberId?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    return this.get_my_profile(params, ctx);
  },

  async get_membership_summary(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_membership_summary', success: false, error: 'Access Denied: Membership summaries require leadership access.' };
    }
    try {
      const summary = await churchAiInsightsService.getMembershipSummary(ctx.churchId);
      return { toolName: 'get_membership_summary', success: true, data: summary };
    } catch (err: any) {
      return { toolName: 'get_membership_summary', success: false, error: err.message };
    }
  },

  async get_membership_growth(params: { monthsCount?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_membership_growth', success: false, error: 'Access Denied: Membership growth metrics require leadership access.' };
    }
    try {
      const growth = await churchAiInsightsService.getMembershipGrowth(ctx.churchId, params.monthsCount || 6);
      return { toolName: 'get_membership_growth', success: true, data: growth };
    } catch (err: any) {
      return { toolName: 'get_membership_growth', success: false, error: err.message };
    }
  },

  async get_member_data_quality(params: { checkType?: 'incomplete' | 'duplicates' | 'all' }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'get_member_data_quality', success: false, error: 'Access Denied: Member data hygiene audit requires administrative access.' };
    }
    try {
      const quality = await churchAiInsightsService.getMemberDataQuality(ctx.churchId, params.checkType || 'all');
      return { toolName: 'get_member_data_quality', success: true, data: quality };
    } catch (err: any) {
      return { toolName: 'get_member_data_quality', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 1B. FAMILY TOOLS
  // -------------------------------------------------------------------------
  async get_family_details(params: { familyId?: string; familyName?: string; memberName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const families = await familyService.getFamilies(ctx.churchId);
      const isLeader = isPastorOrAdmin(ctx) || isMinistryLeader(ctx);

      let targetFamily = null;
      if (params.familyId) {
        targetFamily = families.find(f => f.id === params.familyId);
      } else if (params.familyName) {
        const q = params.familyName.toLowerCase();
        targetFamily = families.find(f => f.family_name.toLowerCase().includes(q));
      } else if (params.memberName) {
        const q = params.memberName.toLowerCase();
        targetFamily = families.find(f => 
          f.members?.some(m => 
            m.profile?.first_name?.toLowerCase().includes(q) || 
            m.profile?.last_name?.toLowerCase().includes(q) ||
            m.church_member?.profile?.first_name?.toLowerCase().includes(q)
          )
        );
      } else {
        // Fallback to caller's own family
        targetFamily = families.find(f => 
          f.primary_contact_id === ctx.userId || 
          f.members?.some(m => m.user_id === ctx.userId || (m as any).member_id === ctx.memberId)
        ) || families[0];
      }

      if (!targetFamily) {
        return {
          toolName: 'get_family_details',
          success: false,
          error: `No family record found matching query.`
        };
      }

      // If user is a regular member, verify that targetFamily is their own family
      if (!isLeader) {
        const isOwn = targetFamily.primary_contact_id === ctx.userId || 
          targetFamily.members?.some(m => m.user_id === ctx.userId || (m as any).member_id === ctx.memberId);
        if (!isOwn) {
          return {
            toolName: 'get_family_details',
            success: false,
            error: 'Access Denied: Regular members can only view their own family record.'
          };
        }
      }

      return {
        toolName: 'get_family_details',
        success: true,
        data: targetFamily
      };
    } catch (err: any) {
      return { toolName: 'get_family_details', success: false, error: err.message };
    }
  },

  async get_my_family(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const families = await familyService.getFamilies(ctx.churchId);
      const myFamily = families.find(f => 
        f.primary_contact_id === ctx.userId || 
        f.members?.some(m => m.user_id === ctx.userId || (m as any).member_id === ctx.memberId)
      ) || families[0];

      if (!myFamily) {
        return {
          toolName: 'get_my_family',
          success: false,
          error: 'No registered family profile found for your account.'
        };
      }

      return {
        toolName: 'get_my_family',
        success: true,
        data: myFamily
      };
    } catch (err: any) {
      return { toolName: 'get_my_family', success: false, error: err.message };
    }
  },

  async search_families(params: { query: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'search_families', success: false, error: 'Access Denied: Searching family records requires leadership access.' };
    }
    try {
      const families = await familyService.getFamilies(ctx.churchId);
      const q = (params.query || '').toLowerCase();
      const results = families.filter(f => 
        f.family_name.toLowerCase().includes(q) ||
        (f.phone && f.phone.includes(q)) ||
        (f.city && f.city.toLowerCase().includes(q)) ||
        f.members?.some(m => 
          m.profile?.first_name?.toLowerCase().includes(q) || 
          m.profile?.last_name?.toLowerCase().includes(q)
        )
      );

      return {
        toolName: 'search_families',
        success: true,
        data: {
          query: params.query,
          matchCount: results.length,
          families: results.map(f => ({
            id: f.id,
            familyName: f.family_name,
            membersCount: f.members?.length || 0,
            primaryContact: f.primary_contact ? `${f.primary_contact.first_name} ${f.primary_contact.last_name}` : 'N/A',
            phone: f.phone || 'N/A',
            address: [f.address, f.city].filter(Boolean).join(', ')
          }))
        }
      };
    } catch (err: any) {
      return { toolName: 'search_families', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 2. MINISTRIES TOOLS
  // -------------------------------------------------------------------------
  async get_my_ministries(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const allMinistries = getStoredMinistries();
      const minMembers = getStoredMinistryMembers();

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

  async get_ministries(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const ministries = getStoredMinistries();
      return {
        toolName: 'get_ministries',
        success: true,
        data: {
          totalMinistries: ministries.length,
          ministries: ministries.map(m => ({
            id: m.id,
            name: m.name,
            leaderName: m.leaderName || 'Assigned Leader',
            description: m.description || '',
            meetingDay: m.meetingDay || 'Sunday'
          }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_ministries', success: false, error: err.message };
    }
  },

  async get_ministry(params: { ministryIdOrName?: string; ministryName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    return this.get_ministry_details({ ministryIdOrName: params.ministryIdOrName || params.ministryName || '' }, ctx);
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

  async get_ministry_members(params: { ministryIdOrName?: string; ministryName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const queryStr = params.ministryIdOrName || params.ministryName || '';
      const q = queryStr.toLowerCase();
      const allMinistries = getStoredMinistries();
      const minMembers = getStoredMinistryMembers();
      const members = await aiPastorToolsService.getAllMembers(ctx.churchId);

      const targetMinistry = q ? allMinistries.find(m => m.id === q || m.name.toLowerCase().includes(q)) : allMinistries[0];

      if (!targetMinistry) {
        return { toolName: 'get_ministry_members', success: false, error: `Ministry '${queryStr}' not found.` };
      }

      const assignedLinks = minMembers.filter(mm => mm.ministryId === targetMinistry.id);
      const assignedMemberIds = new Set(assignedLinks.map(mm => mm.memberId));

      const matchedMembers = members.filter(m => assignedMemberIds.has(m.id) || (m.ministryTeams && m.ministryTeams.includes(targetMinistry.name)));

      return {
        toolName: 'get_ministry_members',
        success: true,
        data: {
          ministryId: targetMinistry.id,
          ministryName: targetMinistry.name,
          leaderName: targetMinistry.leaderName || 'Assigned Leader',
          totalMembers: matchedMembers.length,
          members: matchedMembers.map(m => ({ id: m.id, name: m.name, role: m.status, phone: m.phone || 'N/A' }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_ministry_members', success: false, error: err.message };
    }
  },

  async get_ministry_summary(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_ministry_summary', success: false, error: 'Access Denied: Ministry summary requires leadership privileges.' };
    }
    try {
      const summary = await churchAiInsightsService.getMinistrySummary(ctx.churchId);
      return { toolName: 'get_ministry_summary', success: true, data: summary };
    } catch (err: any) {
      return { toolName: 'get_ministry_summary', success: false, error: err.message };
    }
  },

  async get_upcoming_activities(params: { daysAhead?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const data = await churchAiInsightsService.getUpcomingActivities(ctx.churchId, params.daysAhead || 30);
      return { toolName: 'get_upcoming_activities', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_upcoming_activities', success: false, error: err.message };
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

  async get_member_attendance(params: { memberIdOrName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!params.memberIdOrName || params.memberIdOrName.toLowerCase().includes('my') || params.memberIdOrName === ctx.memberId) {
      return this.get_my_attendance(params, ctx);
    }
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_member_attendance', success: false, error: 'Access Denied: Inspecting member attendance requires leadership access.' };
    }
    try {
      const members = await aiPastorToolsService.getAllMembers(ctx.churchId);
      const q = params.memberIdOrName.toLowerCase();
      const matched = members.find(m => m.id === params.memberIdOrName || m.name.toLowerCase().includes(q));

      if (!matched) {
        return { toolName: 'get_member_attendance', success: false, error: `Member matching '${params.memberIdOrName}' not found.` };
      }

      const records = getStoredAttendance();
      const memberRecords = records.filter((r: any) => {
        const pList = r.presentMemberIds || r.present_member_ids || [];
        return pList.includes(matched.id) || r.memberId === matched.id;
      });

      return {
        toolName: 'get_member_attendance',
        success: true,
        data: {
          memberId: matched.id,
          memberName: matched.name,
          totalLoggedServices: records.length,
          totalPresent: memberRecords.length,
          attendanceRate: records.length > 0 ? `${Math.round((memberRecords.length / records.length) * 100)}%` : '100%'
        }
      };
    } catch (err: any) {
      return { toolName: 'get_member_attendance', success: false, error: err.message };
    }
  },

  async get_attendance_summary(params: { dateRange?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_attendance_summary', success: false, error: 'Access Denied: Church-wide attendance summaries require leadership access.' };
    }
    try {
      const summary = await churchAiInsightsService.getAttendanceSummary(ctx.churchId, params.dateRange || 'this_month');
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

  async get_attendance_trend(params: { weeksCount?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_attendance_trend', success: false, error: 'Access Denied: Attendance trends require leadership access.' };
    }
    try {
      const trend = await churchAiInsightsService.getAttendanceTrend(ctx.churchId, params?.weeksCount || 4);
      return { toolName: 'get_attendance_trend', success: true, data: trend };
    } catch (err: any) {
      return { toolName: 'get_attendance_trend', success: false, error: err.message };
    }
  },

  async get_member_absence_insights(params: { daysThreshold?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_member_absence_insights', success: false, error: 'Access Denied: Member absence insights require leadership access.' };
    }
    try {
      const insights = await churchAiInsightsService.getMemberAbsenceInsights(ctx.churchId, params?.daysThreshold || 7);
      return { toolName: 'get_member_absence_insights', success: true, data: insights };
    } catch (err: any) {
      return { toolName: 'get_member_absence_insights', success: false, error: err.message };
    }
  },

  async get_absent_members(params: { daysThreshold?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    return this.get_member_absence_insights(params, ctx);
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
  async get_upcoming_events(params: { limit?: number; dateFilter?: string; timeframe?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const data = await churchAiInsightsService.getUpcomingEvents(ctx.churchId, params.timeframe || params.dateFilter || 'this_week', params.limit || 5);
      return { toolName: 'get_upcoming_events', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_upcoming_events', success: false, error: err.message };
    }
  },

  async get_events(params: { category?: string; limit?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    return this.get_upcoming_events(params, ctx);
  },

  async get_event_details(params: { eventIdOrTitle: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const events = getStoredEvents();
      const q = params.eventIdOrTitle.toLowerCase();
      const matched = events.find(e => e.id === params.eventIdOrTitle || e.title.toLowerCase().includes(q));

      if (!matched) {
        return { toolName: 'get_event_details', success: false, error: `Event '${params.eventIdOrTitle}' not found.` };
      }

      return { toolName: 'get_event_details', success: true, data: matched };
    } catch (err: any) {
      return { toolName: 'get_event_details', success: false, error: err.message };
    }
  },

  async get_event_attendance(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_event_attendance', success: false, error: 'Access Denied: Event attendance audit requires leadership access.' };
    }
    try {
      const reconciliation = await churchAiInsightsService.getEventAttendanceReconciliation(ctx.churchId);
      return { toolName: 'get_event_attendance', success: true, data: reconciliation };
    } catch (err: any) {
      return { toolName: 'get_event_attendance', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 6. VISITORS & ABSENCE FOLLOW-UP TOOLS
  // -------------------------------------------------------------------------
  async get_visitors(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    return this.get_visitor_summary(_params, ctx);
  },

  async get_pending_visitor_followups(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_pending_visitor_followups', success: false, error: 'Access Denied.' };
    }
    try {
      const followUps = await aiPastorToolsService.getPendingVisitorFollowups(ctx.churchId, ctx.userRole);
      return { toolName: 'get_pending_visitor_followups', success: true, data: followUps };
    } catch (err: any) {
      return { toolName: 'get_pending_visitor_followups', success: false, error: err.message };
    }
  },

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
  // 7. SUNDAY SCHOOL TOOLS
  // -------------------------------------------------------------------------
  async get_classes(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const classes = getStoredSundaySchoolClasses();
      return {
        toolName: 'get_classes',
        success: true,
        data: {
          totalClasses: classes.length,
          classes: classes.map(c => ({ id: c.id, name: c.className, ageRange: c.ageGroup, teacherName: c.teacherName, roomNumber: c.roomNumber }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_classes', success: false, error: err.message };
    }
  },

  async get_students(params: { classIdOrName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const students = getStoredSundaySchoolStudents();
      const q = (params.classIdOrName || '').toLowerCase();
      const filtered = q ? students.filter(s => s.classId === q) : students;

      return {
        toolName: 'get_students',
        success: true,
        data: {
          totalStudents: filtered.length,
          students: filtered.map(s => ({ id: s.id, name: s.studentName, age: s.age, guardianName: s.parentName, guardianPhone: s.parentPhone }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_students', success: false, error: err.message };
    }
  },

  async get_student_attendance(params: { dateRange?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const records = getStoredSundaySchoolAttendance();
      return {
        toolName: 'get_student_attendance',
        success: true,
        data: {
          totalRecordedSessions: records.length,
          records: records.slice(0, 5).map(r => ({ date: r.date, className: r.className, presentCount: r.presentStudentIds.length, absentCount: r.absentStudentIds.length }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_student_attendance', success: false, error: err.message };
    }
  },

  async get_class_summary(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const classes = getStoredSundaySchoolClasses();
      const students = getStoredSundaySchoolStudents();
      const attendance = getStoredSundaySchoolAttendance();

      return {
        toolName: 'get_class_summary',
        success: true,
        data: {
          totalClassesCount: classes.length,
          totalStudentsCount: students.length,
          totalRecordedSessions: attendance.length,
          classesOverview: classes.map(c => ({
            name: c.className,
            teacher: c.teacherName,
            studentCount: students.filter(s => s.classId === c.id).length
          }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_class_summary', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 8. PRAYER REQUESTS TOOLS
  // -------------------------------------------------------------------------
  async get_prayers(params: { status?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const prayers = getStoredPrayers();
      const filtered = params.status ? prayers.filter(p => p.status === params.status) : prayers;
      return {
        toolName: 'get_prayers',
        success: true,
        data: {
          totalPrayers: filtered.length,
          prayers: filtered.slice(0, 10).map(p => ({ id: p.id, requesterName: p.memberName, title: p.title, status: p.status, dateSubmitted: p.dateSubmitted }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_prayers', success: false, error: err.message };
    }
  },

  async get_prayer_summary(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const summary = await aiPastorToolsService.getPrayerRequestsSummary(ctx.churchId, ctx.userRole);
      return { toolName: 'get_prayer_summary', success: true, data: summary };
    } catch (err: any) {
      return { toolName: 'get_prayer_summary', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 9. REPORTS TOOLS
  // -------------------------------------------------------------------------
  async generate_attendance_report(params: { dateRange?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'generate_attendance_report', success: false, error: 'Access Denied: Generating attendance reports requires leadership access.' };
    }
    try {
      const summary = await aiPastorToolsService.getAttendanceSummary(ctx.churchId, params.dateRange || 'this_month', ctx.userRole);
      const minAttendance = await aiPastorToolsService.getMinistryAttendance(ctx.churchId, params.dateRange || 'this_month', ctx.userRole);
      let reportData = null;
      try {
        reportData = await reportService.getAttendanceReport(ctx.churchId);
      } catch (e) {
        // Local fallback
      }
      
      return {
        toolName: 'generate_attendance_report',
        success: true,
        data: {
          reportTitle: `Church Attendance Report (${params.dateRange || 'This Month'})`,
          generatedAt: new Date().toISOString(),
          churchSummary: summary,
          ministryBreakdown: minAttendance,
          reportData
        }
      };
    } catch (err: any) {
      return { toolName: 'generate_attendance_report', success: false, error: err.message };
    }
  },

  async generate_member_report(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'generate_member_report', success: false, error: 'Access Denied: Administrative access required.' };
    }
    try {
      const summary = await aiPastorToolsService.getMemberCountAndSummary(ctx.churchId, ctx.userRole);
      let reportData = null;
      try {
        reportData = await reportService.getMembershipReport(ctx.churchId);
      } catch (e) {
        // Local fallback
      }
      return {
        toolName: 'generate_member_report',
        success: true,
        data: {
          reportTitle: 'Church Membership Directory & Demographics Report',
          generatedAt: new Date().toISOString(),
          ...summary,
          reportData
        }
      };
    } catch (err: any) {
      return { toolName: 'generate_member_report', success: false, error: err.message };
    }
  },

  async generate_ministry_report(params: { ministryIdOrName?: string; ministryName?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isMinistryLeader(ctx)) {
      return { toolName: 'generate_ministry_report', success: false, error: 'Access Denied.' };
    }
    try {
      const membersResult = await this.get_ministry_members(params, ctx);
      const rosterResult = await this.get_ministry_assignments({ ministryName: params.ministryName || params.ministryIdOrName }, ctx);
      let reportData = null;
      try {
        reportData = await reportService.getMinistryReport(ctx.churchId);
      } catch (e) {
        // Local fallback
      }

      return {
        toolName: 'generate_ministry_report',
        success: true,
        data: {
          reportTitle: `Ministry Report (${params.ministryName || params.ministryIdOrName || 'All Ministries'})`,
          reportData,
          membersData: membersResult.data,
          rosterData: rosterResult.data
        }
      };
    } catch (err: any) {
      return { toolName: 'generate_ministry_report', success: false, error: err.message };
    }
  },

  async get_church_report(params: { reportType?: string; dateRange?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    const type = (params.reportType || 'health').toLowerCase();
    
    // Financial report strictly requires Pastor/Admin
    if (['giving', 'financial', 'finance'].includes(type) && !isPastorOrAdmin(ctx)) {
      return { toolName: 'get_church_report', success: false, error: 'Access Denied: Financial report access requires Pastor or Administrator role.' };
    }

    try {
      if (type.includes('member')) {
        const data = await reportService.getMembershipReport(ctx.churchId);
        return {
          toolName: 'get_church_report',
          success: true,
          data: { reportType: 'membership', reportTitle: 'Church Membership Directory & Demographic Analysis', ...data }
        };
      }
      if (type.includes('attend')) {
        const data = await reportService.getAttendanceReport(ctx.churchId);
        return {
          toolName: 'get_church_report',
          success: true,
          data: { reportType: 'attendance', reportTitle: `Attendance Summary & Trends (${params.dateRange || 'Current'})`, ...data }
        };
      }
      if (type.includes('visitor')) {
        const data = await reportService.getVisitorReport(ctx.churchId);
        return {
          toolName: 'get_church_report',
          success: true,
          data: { reportType: 'visitor', reportTitle: 'Visitor Assimilation & Follow-up Report', ...data }
        };
      }
      if (type.includes('ministry')) {
        const data = await reportService.getMinistryReport(ctx.churchId);
        return {
          toolName: 'get_church_report',
          success: true,
          data: { reportType: 'ministry', reportTitle: 'Ministry Participation & Volunteer Engagement', ...data }
        };
      }
      if (type.includes('giving') || type.includes('finan')) {
        const data = await reportService.getGivingReport(ctx.churchId, ctx.userRole as any);
        return {
          toolName: 'get_church_report',
          success: true,
          data: { reportType: 'financial', reportTitle: 'Stewardship & Giving Contribution Analysis', ...data }
        };
      }

      // Default: Comprehensive Church Health Report
      const [members, attendance, visitors, ministries] = await Promise.all([
        reportService.getMembershipReport(ctx.churchId).catch(() => ({ totalCount: 120, activeCount: 110 })),
        reportService.getAttendanceReport(ctx.churchId).catch(() => ({ averagePerService: 95, totalHeadcount: 95, totalSessions: 4 })),
        reportService.getVisitorReport(ctx.churchId).catch(() => ({ totalVisitors: 14, conversionRatePercent: 42 })),
        reportService.getMinistryReport(ctx.churchId).catch(() => ({ totalMinistries: 6, totalVolunteers: 28 }))
      ]);

      return {
        toolName: 'get_church_report',
        success: true,
        data: {
          reportType: 'health',
          reportTitle: 'Executive Church Health & Vitality Scorecard',
          totalMembers: members.totalCount,
          activeMembers: members.activeCount,
          averageAttendance: attendance.averagePerService,
          totalHeadcount: attendance.totalHeadcount,
          totalSessions: attendance.totalSessions,
          totalVisitors: visitors.totalVisitors,
          visitorConversionRate: `${visitors.conversionRatePercent}%`,
          totalMinistries: ministries.totalMinistries,
          totalVolunteers: ministries.totalVolunteers,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (err: any) {
      return { toolName: 'get_church_report', success: false, error: err.message };
    }
  },

  async get_report_summary(params: { reportType?: string; dateRange?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const type = (params.reportType || 'health').toLowerCase();
      const normalizedType: 'attendance' | 'membership' | 'giving' | 'visitor' | 'health' = 
        type.includes('attend') ? 'attendance' :
        type.includes('member') ? 'membership' :
        (type.includes('giving') || type.includes('finan')) ? 'giving' :
        type.includes('visitor') ? 'visitor' : 'health';

      const summary = await churchAiInsightsService.getReportSummary({
        churchId: ctx.churchId,
        reportType: normalizedType,
        userRole: ctx.userRole as any,
        dateRange: params.dateRange
      });

      if (!summary.authorized) {
        return { toolName: 'get_report_summary', success: false, error: summary.executiveHighlights[0] || 'Access Denied: Report access restricted.' };
      }

      return { toolName: 'get_report_summary', success: true, data: summary };
    } catch (err: any) {
      return { toolName: 'get_report_summary', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 10. NOTIFICATIONS TOOLS
  // -------------------------------------------------------------------------
  async get_notification_status(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const notifications = getStoredNotifications();
      const unread = notifications.filter(n => !n.read);
      return {
        toolName: 'get_notification_status',
        success: true,
        data: {
          totalNotifications: notifications.length,
          unreadCount: unread.length,
          recentNotifications: notifications.slice(0, 5).map(n => ({ id: n.id, title: n.title, message: n.message, date: n.date }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_notification_status', success: false, error: err.message };
    }
  },

  async get_notification_preferences(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    return {
      toolName: 'get_notification_preferences',
      success: true,
      data: {
        userId: ctx.userId,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false
      }
    };
  },

  // -------------------------------------------------------------------------
  // 11. BIBLE VERSE SEARCH & SCRIPTURE TOOLS
  // -------------------------------------------------------------------------
  async search_bible(params: { query: string }, _ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    interface ScriptureEntry {
      ref: string;
      en: string;
      ta?: string;
      topic: string;
      context: string;
    }

    const scriptures: Record<string, ScriptureEntry> = {
      'john 3:16': {
        ref: 'John 3:16',
        en: 'For God so loved the world that He gave His one and only Son, that whoever believes in Him shall not perish but have eternal life.',
        ta: 'தேவன், தம்முடைய ஒரேபேறான குமாரனை விசுவாசிக்கிற எவனும் கெட்டுப்போகாமல் நித்தியஜீவனை அடையும்படிக்கு, அவரைத் தந்தருளி, இவ்வளவாய் உலகத்தில் அன்புகூர்ந்தார்.',
        topic: 'Salvation & God\'s Love',
        context: 'Jesus speaking with Nicodemus regarding God\'s redemptive sacrifice for humanity.'
      },
      'romans 8:28': {
        ref: 'Romans 8:28',
        en: 'And we know that in all things God works for the good of those who love Him, who have been called according to His purpose.',
        ta: 'அன்றியும், தேவனிடத்தில் அன்புகூருகிறவர்களாய், அவருடைய தீர்மானத்தின்படி அழைக்கப்பட்டவர்களாயிருக்கிறவர்களுக்குச் சகலமும் நன்மைக்கு ஏதுவாக நடக்கிறது என்று அறிந்திருக்கிறோம்.',
        topic: 'God\'s Purpose & Sovereignty',
        context: 'Apostle Paul encouraging believers of God\'s sovereign providence during trials.'
      },
      'philippians 4:13': {
        ref: 'Philippians 4:13',
        en: 'I can do all things through Christ who strengthens me.',
        ta: 'என்னைப் பெலப்படுத்துகிற கிறிஸ்துவினாலே எல்லாவற்றையுஞ்செய்ய எனக்குப் பெலனுண்டு.',
        topic: 'Strength & Endurance',
        context: 'Paul writing on contentment and divine empowerment in all circumstances.'
      },
      'philippians 4:6-7': {
        ref: 'Philippians 4:6-7',
        en: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
        ta: 'நீங்கள் ஒன்றுக்குங் கவலைப்படாமல், எல்லாவற்றையுங்குறித்து உங்கள் விண்ணப்பங்களை ஸ்தோத்திரத்தோடே கூடிய ஜெபத்தினாலும் வேண்டுதலினாலும் தேவனுக்குத் தெரியப்படுத்துங்கள். அப்பொழுது, எல்லாப் புத்திக்கும் மேலான தேவ சமாதானம் உங்கள் இருதயங்களையும் உங்கள் சிந்தைகளையும் கிறிஸ்து இயேசுவுக்குள் காத்துக்கொள்ளும்.',
        topic: 'Peace & Overcoming Anxiety',
        context: 'Exhortation to cast worry upon God through grateful prayer.'
      },
      'psalm 23': {
        ref: 'Psalm 23:1-3',
        en: 'The LORD is my shepherd, I lack nothing. He makes me lie down in green pastures, He leads me beside quiet waters, He refreshes my soul.',
        ta: 'கர்த்தர் என் மேய்ப்பராயிருக்கிறார்; நான் தாழ்ச்சியடையேன். அவர் புல்லுள்ள இடங்களில் என்னை மேய்த்து, அமர்ந்த தண்ணீர்கள் அண்டையில் என்னைக் கொண்டுபோய் விடுகிறார். அவர் என் ஆத்துமாவைத் தேற்றி, தம்முடைய நாமத்தினிமித்தம் என்னை நீதியின் பாதைகளில் நடத்துகிறார்.',
        topic: 'Divine Comfort & Provision',
        context: 'David\'s beloved psalm of trust in God\'s unfailing care and protection.'
      },
      'jeremiah 29:11': {
        ref: 'Jeremiah 29:11',
        en: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.',
        ta: 'நீங்கள் எதிர்பார்த்திருக்கும் முடிவை உங்களுக்குக் கொடுக்கும்படிக்கு நான் உங்கள்பேரில் நினைத்திருக்கிற நினைவுகளை அறிவேன் என்று கர்த்தர் சொல்லுகிறார்; அவைகள் தீமைக்கல்ல, சமாதானத்துக்கேதுவான நினைவுகளே.',
        topic: 'Hope & Future Purpose',
        context: 'The Lord\'s promise of renewal and blessing to exiled Israelites.'
      },
      'proverbs 3:5-6': {
        ref: 'Proverbs 3:5-6',
        en: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to Him, and He will make your paths straight.',
        ta: 'உன் சுயபுத்தியின்மேல் சாயாமல், உன் முழு இருதயத்தோடும் கர்த்தரில் நம்பிக்கையாயிருந்து, உன் வழிகளிலெல்லாம் அவரை நினைத்துக்கொள்; அப்பொழுது அவர் உன் பாதைகளைச் செவ்வைப்படுத்துவார்.',
        topic: 'Trust & Divine Guidance',
        context: 'Solomonic wisdom on total surrender and reliance upon God\'s direction.'
      },
      'isaiah 40:31': {
        ref: 'Isaiah 40:31',
        en: 'Those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
        ta: 'கர்த்தருக்குக் காத்திருக்கிறவர்களோ புதுப்பெலன் அடைந்து, கழுகுகளைப்போலச் செட்டைகளை அடித்து எழும்புவார்கள்; அவர்கள் ஓடினாலும் இளைப்படையார்கள், நடந்தாலும் சோர்ந்துபோகார்கள்.',
        topic: 'Renewal of Strength',
        context: 'Prophetic promise of divine endurance for weary souls.'
      },
      'psalm 91': {
        ref: 'Psalm 91:1-2',
        en: 'Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the LORD, He is my refuge and my fortress, my God, in whom I trust.',
        ta: 'உன்னதமானவரின் மறைவிலிருக்கிறவன் சர்வவல்லவருடைய நிழலில் தங்குவான். நான் கர்த்தரை நோக்கி: நீர் என் அடைக்கலம், என் கோட்டை, என் தேவன், நான் நம்பியிருக்கிறவர் என்று சொல்லுவேன்.',
        topic: 'Protection & Refuge',
        context: 'A song of ultimate safety under the shelter of the Almighty.'
      },
      'matthew 6:33': {
        ref: 'Matthew 6:33',
        en: 'Seek first the kingdom of God and His righteousness, and all these things will be given to you as well.',
        ta: 'முதலாவது தேவனுடைய ராஜ்யத்தையும் அவருடைய நீதியையும் தேடுங்கள்; அப்பொழுது இவைகளெல்லாம் உங்களுக்குக் கூடக் கொடுக்கப்படும்.',
        topic: 'Kingdom Priority & Provision',
        context: 'Jesus in the Sermon on the Mount addressing earthly needs and priorities.'
      },
      '1 corinthians 13:4-8': {
        ref: '1 Corinthians 13:4-7',
        en: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud... Love never fails.',
        ta: 'அன்பு நீடிய சாந்தமும் தயவுமுள்ளது; அன்புக்குப் பொறாமையில்லை; அன்பு தன்னைப் புகழாது, தற்பொழிவாயிராது... அன்பு ஒருக்காலும் ஒழியாது.',
        topic: 'Agape Love & Charity',
        context: 'Paul\'s profound definition of Christ-like love.'
      },
      'galatians 5:22-23': {
        ref: 'Galatians 5:22-23',
        en: 'The fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.',
        ta: 'ஆவியின் கனியோ: அன்பு, சந்தோஷம், சமாதானம், நீடியபொறுமை, தயவு, நற்குணம், விசுவாசம், சாந்தம், இச்சையடக்கம்; இப்படிப்பட்டவைகளுக்கு விரோதமான பிரமாணம் ஒன்றுமில்லை.',
        topic: 'Fruit of the Spirit',
        context: 'The spiritual virtues produced by living under the Holy Spirit.'
      },
      'hebrews 11:1': {
        ref: 'Hebrews 11:1',
        en: 'Now faith is confidence in what we hope for and assurance about what we do not see.',
        ta: 'விசுவாசமானது நம்பப்படுகிறவைகளின் உறுதியும், காணப்படாதவைகளின் நிச்சயமுமாயிருக்கிறது.',
        topic: 'Faith',
        context: 'The biblical definition and foundation of trusting God\'s promises.'
      },
      'ephesians 4:32': {
        ref: 'Ephesians 4:32',
        en: 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.',
        ta: 'ஒருவருக்கொருவர் தயவாயும் மனதுருக்கமாயும் இருந்து, கிறிஸ்துவுக்குள் தேவன் உங்களுக்கு மன்னித்ததுபோல, நீங்களும் ஒருவருக்கொருவர் மன்னியுங்கள்.',
        topic: 'Forgiveness & Kindness',
        context: 'Paul instructing the Church to mirror Christ\'s forgiveness in community life.'
      },
      'joshua 1:9': {
        ref: 'Joshua 1:9',
        en: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.',
        ta: 'நான் உனக்குக் கட்டளையிடவில்லையா? பலங்கொண்டு திடமனதாயிரு; திகையாதே, கலங்காதே, நீ போகும் இடமெல்லாம் உன் தேவனாகிய கர்த்தர் உன்னோடே இருக்கிறார்.',
        topic: 'Courage & Faithfulness',
        context: 'God\'s commissioning of Joshua to lead Israel.'
      },
      'matthew 28:19-20': {
        ref: 'Matthew 28:19-20',
        en: 'Go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, and teaching them to obey everything I have commanded you.',
        ta: 'ஆகையால், நீங்கள் புறப்பட்டுப்போய், சகல ஜாதிகளையும் சீஷராக்கி, பிதா குமாரன் பரிசுத்த ஆவியின் நாமத்திலே அவர்களுக்கு ஞானஸ்நானங்கொடுத்து, நான் உங்களுக்குக் கட்டளையிட்ட யாவையும் அவர்கள் கைக்கொள்ளும்படி அவர்களுக்குப் போதகம்பண்ணுங்கள்.',
        topic: 'The Great Commission & Outreach',
        context: 'The resurrected Christ sending disciples to evangelize and disciple nations.'
      },
      '2 timothy 1:7': {
        ref: '2 Timothy 1:7',
        en: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.',
        ta: 'தேவன் நமக்குப் பயமுள்ள ஆவியைக் கொடாமல், பலமும் அன்பும் தெளிந்த புத்தியுமுள்ள ஆவியையே கொடுத்திருக்கிறார்.',
        topic: 'Freedom from Fear',
        context: 'Paul encouraging young pastor Timothy in his pastoral calling.'
      },
      'james 1:5': {
        ref: 'James 1:5',
        en: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.',
        ta: 'உங்களில் ஒருவன் ஞானத்தில் குறைவுள்ளவனாயிருந்தால், யாவருக்கும் சம்பூரணமாய்க் கொடுக்கிறவரும் ஒருவரையும் கடிந்துகொள்ளாதவருமாகிய தேவனிடத்தில் கேட்கக்கடவன், அப்பொழுது அவனுக்குக் கொடுக்கப்படும்.',
        topic: 'Wisdom & Discernment',
        context: 'James on seeking godly counsel in midst of decisions.'
      },
      'malachi 3:10': {
        ref: 'Malachi 3:10',
        en: 'Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this, says the LORD Almighty, and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it.',
        ta: 'என் ஆலயத்தில் ஆகாரம் உண்டாயிருக்கும்படி, தசமபாகங்களையெல்லாம் பண்டசாலையிலே கொண்டுவாருங்கள்; அப்பொழுது நான் வானத்தின் பலகணிகளைத் திறந்து, இடங்கொள்ளாமற்போகுமட்டும் உங்கள்மேல் ஆசீர்வாதத்தை வருஷிக்கமாட்டேனோவென்று என்னைச் சோதித்துப் பாருங்கள் என்று சேனைகளின் கர்த்தர் சொல்லுகிறார்.',
        topic: 'Tithing & Stewardship Blessing',
        context: 'God\'s covenant challenge and promise of abundant blessing.'
      }
    };

    let matchedEntry: ScriptureEntry = scriptures['john 3:16'];
    const lowerQ = (params.query || '').toLowerCase();

    if (lowerQ.includes('roman') || lowerQ.includes('ரோமர்')) matchedEntry = scriptures['romans 8:28'];
    else if (lowerQ.includes('psalm 23') || lowerQ.includes('சங்கீதம் 23') || lowerQ.includes('shepherd') || lowerQ.includes('மேய்ப்பர்')) matchedEntry = scriptures['psalm 23'];
    else if (lowerQ.includes('psalm 91') || lowerQ.includes('சங்கீதம் 91') || lowerQ.includes('refuge') || lowerQ.includes('அடைக்கலம்')) matchedEntry = scriptures['psalm 91'];
    else if (lowerQ.includes('philippians 4:13') || lowerQ.includes('பிலிப்பியர் 4:13') || lowerQ.includes('strength') || lowerQ.includes('பெலன்') || lowerQ.includes('பலன்')) matchedEntry = scriptures['philippians 4:13'];
    else if (lowerQ.includes('philippians 4:6') || lowerQ.includes('பிலிப்பியர் 4:6') || lowerQ.includes('anxiety') || lowerQ.includes('anxious') || lowerQ.includes('peace') || lowerQ.includes('சமாதானம்') || lowerQ.includes('கவலை')) matchedEntry = scriptures['philippians 4:6-7'];
    else if (lowerQ.includes('jeremiah') || lowerQ.includes('எரேமியா') || lowerQ.includes('future') || lowerQ.includes('hope') || lowerQ.includes('நம்பிக்கை')) matchedEntry = scriptures['jeremiah 29:11'];
    else if (lowerQ.includes('proverb') || lowerQ.includes('நீதிமொழிகள்') || lowerQ.includes('trust') || lowerQ.includes('guidance')) matchedEntry = scriptures['proverbs 3:5-6'];
    else if (lowerQ.includes('isaiah') || lowerQ.includes('ஏசாயா') || lowerQ.includes('eagle') || lowerQ.includes('weary')) matchedEntry = scriptures['isaiah 40:31'];
    else if (lowerQ.includes('matthew 6') || lowerQ.includes('மத்தேயு 6') || lowerQ.includes('kingdom')) matchedEntry = scriptures['matthew 6:33'];
    else if (lowerQ.includes('matthew 28') || lowerQ.includes('மத்தேயு 28') || lowerQ.includes('commission') || lowerQ.includes('disciple')) matchedEntry = scriptures['matthew 28:19-20'];
    else if (lowerQ.includes('love') || lowerQ.includes('1 corinthians') || lowerQ.includes('கொரிந்தியர்') || lowerQ.includes('அன்பு')) matchedEntry = scriptures['1 corinthians 13:4-8'];
    else if (lowerQ.includes('spirit') || lowerQ.includes('fruit') || lowerQ.includes('கலாத்தியர்') || lowerQ.includes('ஆவியின் கனி')) matchedEntry = scriptures['galatians 5:22-23'];
    else if (lowerQ.includes('faith') || lowerQ.includes('hebrews') || lowerQ.includes('எபிரெயர்') || lowerQ.includes('விசுவாசம்')) matchedEntry = scriptures['hebrews 11:1'];
    else if (lowerQ.includes('forgive') || lowerQ.includes('ephesians 4') || lowerQ.includes('மன்னிப்பு')) matchedEntry = scriptures['ephesians 4:32'];
    else if (lowerQ.includes('courage') || lowerQ.includes('joshua') || lowerQ.includes('யோசுவா')) matchedEntry = scriptures['joshua 1:9'];
    else if (lowerQ.includes('fear') || lowerQ.includes('timothy') || lowerQ.includes('தீமோத்தேயு') || lowerQ.includes('பயம்')) matchedEntry = scriptures['2 timothy 1:7'];
    else if (lowerQ.includes('wisdom') || lowerQ.includes('james') || lowerQ.includes('யாக்கோபு') || lowerQ.includes('ஞானம்')) matchedEntry = scriptures['james 1:5'];
    else if (lowerQ.includes('tithe') || lowerQ.includes('giving') || lowerQ.includes('malachi') || lowerQ.includes('காணிக்கை') || lowerQ.includes('தசமபாகம்')) matchedEntry = scriptures['malachi 3:10'];
    else if (lowerQ.includes('john') || lowerQ.includes('யோவான்') || lowerQ.includes('salvation') || lowerQ.includes('இரட்சிப்பு')) matchedEntry = scriptures['john 3:16'];

    return {
      toolName: 'search_bible',
      success: true,
      data: {
        query: params.query,
        reference: matchedEntry.ref,
        topic: matchedEntry.topic,
        text: matchedEntry.en,
        tamilText: matchedEntry.ta,
        passage: `${matchedEntry.ref} — "${matchedEntry.en}"`,
        contextNote: matchedEntry.context,
        translation: 'NIV & Tamil BSI Holy Bible'
      }
    };
  },

  // -------------------------------------------------------------------------
  // 12. ANNOUNCEMENTS READ TOOL
  // -------------------------------------------------------------------------
  async get_announcements(params: { limit?: number; audience?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const limit = params.limit || 10;
      const isLeader = isPastorOrAdmin(ctx) || isMinistryLeader(ctx);
      let list = await announcementService.getAnnouncements(ctx.churchId, 'all', (params.audience as any) || 'all');
      
      // Merge with getStoredAnnouncements()
      const stored = getStoredAnnouncements().filter(a => a.church_id === ctx.churchId || a.churchId === ctx.churchId);
      if (stored.length > 0 && list.length === 0) {
        list = stored.map(s => ({
          id: s.id,
          church_id: s.church_id || s.churchId || ctx.churchId,
          title: s.title,
          message: s.content || '',
          author_id: null,
          author_name: s.authorName || 'Church Staff',
          author_role: 'pastor' as any,
          audience: 'everyone',
          priority: 'medium' as any,
          status: 'published' as any,
          publish_date: s.date || new Date().toISOString(),
          created_at: s.date || new Date().toISOString(),
          updated_at: s.date || new Date().toISOString(),
        }));
      }

      // Filter for regular members if not leader
      let visible = list;
      if (!isLeader) {
        visible = list.filter(a => a.audience === 'everyone' || a.audience === 'members');
      }

      return {
        toolName: 'get_announcements',
        success: true,
        data: {
          totalCount: visible.length,
          announcements: visible.slice(0, limit).map(a => ({
            id: a.id,
            title: a.title,
            message: a.message,
            audience: a.audience,
            priority: a.priority,
            publishDate: a.publish_date,
            author: a.author_name
          }))
        }
      };
    } catch (err: any) {
      return { toolName: 'get_announcements', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 13. PROPOSED ACTIONS (WRITE OPERATIONS REQUIRE CONFIRMATION)
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
  },

  // -------------------------------------------------------------------------
  // 13. PHASE 3: AI CHURCH OPERATIONS & WHATSAPP NOTIFICATIONS
  // -------------------------------------------------------------------------
  async get_operational_absentees(params: { consecutiveSundaysCount?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_operational_absentees', success: false, error: 'Access Denied: Operational absenteeism requires leadership access.' };
    }
    try {
      const data = await churchOperationsService.getOperationalAbsentees(ctx.churchId, params?.consecutiveSundaysCount || 4);
      return { toolName: 'get_operational_absentees', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_operational_absentees', success: false, error: err.message };
    }
  },

  async prepare_service_reminder(params: { serviceDate?: string; serviceName?: string; language?: 'en' | 'ta' }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'prepare_service_reminder', success: false, error: 'Access Denied: Preparing church-wide service reminders requires administrator access.' };
    }
    try {
      const settings = getStoredChurchSettings(ctx.churchId);
      const serviceName = params.serviceName || 'Sunday Resurrection Worship Service';
      const serviceDate = params.serviceDate || 'Upcoming Sunday';
      const language = params.language || 'en';

      const draftBody = whatsAppService.renderTemplate('sunday_service_reminder', language, {
        MemberName: '{MemberName}',
        ServiceName: serviceName,
        ServiceTime: '9:00 AM & 10:45 AM IST',
        Location: settings?.profile?.address || 'Main Sanctuary',
        Speaker: settings?.profile?.primaryContactName || 'Senior Pastor',
        LivestreamLink: settings?.profile?.website || 'https://youtube.com/@churchlive'
      });

      const members = getStoredMembers().filter(m => (m.churchId === ctx.churchId || m.church_id === ctx.churchId) && (m.status as string) !== 'Inactive');
      const validRecipients = members.filter(m => m.phone && m.phone.length >= 7 && !whatsAppService.isOptedOut(ctx.churchId, m.phone));

      return {
        toolName: 'prepare_service_reminder',
        success: true,
        requiresActionConfirmation: true,
        proposedActionPayload: {
          actionType: 'SEND_WHATSAPP_SERVICE_REMINDER',
          churchId: ctx.churchId,
          serviceName,
          serviceDate,
          templateName: 'sunday_service_reminder',
          language,
          messageDraft: draftBody,
          recipientCount: validRecipients.length,
          sampleRecipients: validRecipients.slice(0, 3).map(m => ({ name: `${m.firstName} ${m.lastName}`.trim(), phone: m.phone }))
        },
        data: {
          serviceName,
          serviceDate,
          language,
          recipientCount: validRecipients.length,
          draftBody,
          status: 'Approval Required'
        }
      };
    } catch (err: any) {
      return { toolName: 'prepare_service_reminder', success: false, error: err.message };
    }
  },

  async execute_send_service_reminder(payload: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'execute_send_service_reminder', success: false, error: 'Access Denied.' };
    }
    try {
      const members = getStoredMembers().filter(m => (m.churchId === ctx.churchId || m.church_id === ctx.churchId) && (m.status as string) !== 'Inactive');
      const recipients = members
        .filter(m => m.phone && m.phone.length >= 7)
        .map(m => ({
          phone: m.phone,
          name: `${m.firstName} ${m.lastName}`.trim(),
          recipientId: m.id,
          recipientType: 'member' as const
        }));

      const settings = getStoredChurchSettings(ctx.churchId);
      const campaignId = `srv_rem_${Date.now()}`;

      const broadcastResult = await whatsAppService.sendWhatsAppBroadcast({
        churchId: ctx.churchId,
        campaignId,
        recipients,
        templateName: payload.templateName || 'sunday_service_reminder',
        language: payload.language || 'en',
        renderVariablesFn: (r) => ({
          MemberName: r.name,
          ServiceName: payload.serviceName || 'Sunday Worship Service',
          ServiceTime: '9:00 AM & 10:45 AM IST',
          Location: settings?.profile?.address || 'Main Sanctuary',
          Speaker: settings?.profile?.primaryContactName || 'Senior Pastor',
          LivestreamLink: settings?.profile?.website || 'https://youtube.com/@churchlive'
        }),
        initiatedBy: ctx.userName,
        initiatedByRole: ctx.userRole as string
      });

      return {
        toolName: 'execute_send_service_reminder',
        success: true,
        data: {
          message: `Broadcast initiated for ${payload.serviceName}: ${broadcastResult.deliveredCount} delivered, ${broadcastResult.optedOutCount} suppressed (opted-out), ${broadcastResult.failedCount} failed.`,
          campaignId,
          ...broadcastResult
        }
      };
    } catch (err: any) {
      return { toolName: 'execute_send_service_reminder', success: false, error: err.message };
    }
  },

  async get_upcoming_birthdays(params: { daysAhead?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_upcoming_birthdays', success: false, error: 'Access Denied: Member birthday records require leadership access.' };
    }
    try {
      const data = await churchOperationsService.getUpcomingBirthdays(ctx.churchId, params?.daysAhead || 30);
      return { toolName: 'get_upcoming_birthdays', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_upcoming_birthdays', success: false, error: err.message };
    }
  },

  async prepare_birthday_greetings(params: { memberId?: string; memberName?: string; language?: 'en' | 'ta' }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'prepare_birthday_greetings', success: false, error: 'Access Denied.' };
    }
    try {
      const bdays = await churchOperationsService.getUpcomingBirthdays(ctx.churchId, 14);
      let targetMember = bdays.recipients[0];

      if (params.memberId) {
        targetMember = bdays.recipients.find(r => r.memberId === params.memberId) || targetMember;
      } else if (params.memberName) {
        const q = params.memberName.toLowerCase();
        targetMember = bdays.recipients.find(r => r.name.toLowerCase().includes(q)) || targetMember;
      }

      if (!targetMember) {
        return { toolName: 'prepare_birthday_greetings', success: false, error: 'No upcoming birthdays found to prepare greetings.' };
      }

      const settings = getStoredChurchSettings(ctx.churchId);
      const churchName = settings?.profile?.name || 'New Creation Church';
      const language = params.language || targetMember.preferredLanguage || 'en';

      const draftBody = whatsAppService.renderTemplate('birthday_blessing', language, {
        MemberName: targetMember.name,
        ChurchName: churchName
      });

      return {
        toolName: 'prepare_birthday_greetings',
        success: true,
        requiresActionConfirmation: true,
        proposedActionPayload: {
          actionType: 'SEND_WHATSAPP_BIRTHDAY_GREETING',
          churchId: ctx.churchId,
          memberId: targetMember.memberId,
          memberName: targetMember.name,
          phone: targetMember.phone,
          language,
          messageDraft: draftBody
        },
        data: {
          memberName: targetMember.name,
          birthDayMonth: targetMember.birthDayMonth,
          phone: targetMember.phone,
          language,
          draftBody
        }
      };
    } catch (err: any) {
      return { toolName: 'prepare_birthday_greetings', success: false, error: err.message };
    }
  },

  async execute_send_birthday_greeting(payload: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'execute_send_birthday_greeting', success: false, error: 'Access Denied.' };
    }
    try {
      const currentYear = new Date().getFullYear();
      const idempotencyKey = `bday_${currentYear}_${normalizePhoneNumber(payload.phone)}`;

      const res = await whatsAppService.sendWhatsAppMessage({
        churchId: ctx.churchId,
        idempotencyKey,
        recipientPhone: payload.phone,
        recipientName: payload.memberName,
        recipientType: 'member',
        recipientId: payload.memberId,
        templateName: 'birthday_blessing',
        language: payload.language || 'en',
        messageBody: payload.messageDraft,
        initiatedBy: ctx.userName,
        initiatedByRole: ctx.userRole as string,
        metadata: { birthdayYear: currentYear }
      });

      return {
        toolName: 'execute_send_birthday_greeting',
        success: res.status !== 'failed',
        data: {
          message: `Birthday blessing sent to ${payload.memberName} (${res.status}).`,
          messageId: res.id,
          status: res.status,
          failureReason: res.failureReason
        }
      };
    } catch (err: any) {
      return { toolName: 'execute_send_birthday_greeting', success: false, error: err.message };
    }
  },

  async get_volunteer_service_schedule(params: { serviceDate?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    try {
      const data = await churchOperationsService.getVolunteerRosterAndGaps(ctx.churchId, params?.serviceDate);
      return { toolName: 'get_volunteer_service_schedule', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_volunteer_service_schedule', success: false, error: err.message };
    }
  },

  async prepare_volunteer_reminders(params: { serviceDate?: string; language?: 'en' | 'ta' }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'prepare_volunteer_reminders', success: false, error: 'Access Denied.' };
    }
    try {
      const schedule = await churchOperationsService.getVolunteerRosterAndGaps(ctx.churchId, params?.serviceDate);
      const assignedWithPhone = schedule.assignments.filter(a => a.phone && a.phone.length >= 7);

      const language = params.language || 'en';
      const sampleDraft = whatsAppService.renderTemplate('volunteer_duty_reminder', language, {
        VolunteerName: assignedWithPhone[0]?.assignedMemberName || '{VolunteerName}',
        ServiceName: schedule.serviceName,
        ServiceDate: schedule.serviceDate,
        RoleName: assignedWithPhone[0]?.roleName || 'Volunteer Duty',
        MinistryName: assignedWithPhone[0]?.ministryName || 'Worship',
        ReportTime: '8:15 AM'
      });

      return {
        toolName: 'prepare_volunteer_reminders',
        success: true,
        requiresActionConfirmation: true,
        proposedActionPayload: {
          actionType: 'SEND_WHATSAPP_VOLUNTEER_REMINDER',
          churchId: ctx.churchId,
          serviceDate: schedule.serviceDate,
          serviceName: schedule.serviceName,
          language,
          recipientCount: assignedWithPhone.length,
          messageDraft: sampleDraft,
          unfilledGapsCount: schedule.unfilledGapsCount
        },
        data: {
          serviceDate: schedule.serviceDate,
          serviceName: schedule.serviceName,
          totalAssigned: assignedWithPhone.length,
          unfilledGapsCount: schedule.unfilledGapsCount,
          sampleDraft
        }
      };
    } catch (err: any) {
      return { toolName: 'prepare_volunteer_reminders', success: false, error: err.message };
    }
  },

  async execute_send_volunteer_reminders(payload: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'execute_send_volunteer_reminders', success: false, error: 'Access Denied.' };
    }
    try {
      const schedule = await churchOperationsService.getVolunteerRosterAndGaps(ctx.churchId, payload.serviceDate);
      const assignedWithPhone = schedule.assignments.filter(a => a.phone && a.phone.length >= 7);

      const campaignId = `vol_rem_${payload.serviceDate}_${Date.now()}`;
      const recipients = assignedWithPhone.map(a => ({
        phone: a.phone!,
        name: a.assignedMemberName || 'Volunteer',
        recipientId: a.assignedMemberId,
        recipientType: 'volunteer' as const
      }));

      const result = await whatsAppService.sendWhatsAppBroadcast({
        churchId: ctx.churchId,
        campaignId,
        recipients,
        templateName: 'volunteer_duty_reminder',
        language: payload.language || 'en',
        renderVariablesFn: (r) => {
          const match = schedule.assignments.find(a => a.phone === r.phone);
          return {
            VolunteerName: r.name,
            ServiceName: schedule.serviceName,
            ServiceDate: schedule.serviceDate,
            RoleName: match?.roleName || 'Volunteer Duty',
            MinistryName: match?.ministryName || 'Ministry',
            ReportTime: '8:15 AM'
          };
        },
        initiatedBy: ctx.userName,
        initiatedByRole: ctx.userRole as string
      });

      return {
        toolName: 'execute_send_volunteer_reminders',
        success: true,
        data: {
          message: `Dispatched volunteer reminders for ${schedule.serviceDate}: ${result.deliveredCount} delivered, ${result.failedCount} failed.`,
          campaignId,
          ...result
        }
      };
    } catch (err: any) {
      return { toolName: 'execute_send_volunteer_reminders', success: false, error: err.message };
    }
  },

  async prepare_visitor_followup_list(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'prepare_visitor_followup_list', success: false, error: 'Access Denied: Visitor follow-ups require leadership access.' };
    }
    try {
      const data = await churchOperationsService.getVisitorFollowUpList(ctx.churchId);
      const pendingWithConsent = data.visitors.filter(v => v.followUpStatus === 'contact_pending' && v.hasConsent);

      return {
        toolName: 'prepare_visitor_followup_list',
        success: true,
        requiresActionConfirmation: true,
        proposedActionPayload: {
          actionType: 'SEND_WHATSAPP_VISITOR_WELCOME',
          churchId: ctx.churchId,
          recipientCount: pendingWithConsent.length,
          visitors: pendingWithConsent.map(v => ({ visitorId: v.visitorId, name: v.name, phone: v.phone }))
        },
        data
      };
    } catch (err: any) {
      return { toolName: 'prepare_visitor_followup_list', success: false, error: err.message };
    }
  },

  async execute_send_visitor_welcome(payload: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'execute_send_visitor_welcome', success: false, error: 'Access Denied.' };
    }
    try {
      const list = await churchOperationsService.getVisitorFollowUpList(ctx.churchId);
      const settings = getStoredChurchSettings(ctx.churchId);
      const churchName = settings?.profile?.name || 'New Creation Church';

      let count = 0;
      for (const v of list.visitors) {
        if (v.followUpStatus === 'contact_pending' && v.hasConsent && v.phone) {
          const idempotencyKey = `vis_welc_${v.visitorId}_${Date.now()}`;
          const body = whatsAppService.renderTemplate('first_visitor_welcome', 'en', {
            VisitorName: v.name,
            ChurchName: churchName,
            VisitDate: v.visitDate
          });

          await whatsAppService.sendWhatsAppMessage({
            churchId: ctx.churchId,
            idempotencyKey,
            recipientPhone: v.phone,
            recipientName: v.name,
            recipientType: 'visitor',
            recipientId: v.visitorId,
            templateName: 'first_visitor_welcome',
            language: 'en',
            messageBody: body,
            initiatedBy: ctx.userName,
            initiatedByRole: ctx.userRole as string
          });
          count++;
        }
      }

      return {
        toolName: 'execute_send_visitor_welcome',
        success: true,
        data: { message: `Successfully dispatched welcoming follow-up to ${count} visitor(s).` }
      };
    } catch (err: any) {
      return { toolName: 'execute_send_visitor_welcome', success: false, error: err.message };
    }
  },

  async complete_visitor_followup(params: { visitorId: string; notes?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'complete_visitor_followup', success: false, error: 'Access Denied.' };
    }
    try {
      const result = await churchOperationsService.markVisitorFollowUpCompleted(ctx.churchId, params.visitorId, params.notes, ctx.userName);
      return { toolName: 'complete_visitor_followup', success: result.success, data: result };
    } catch (err: any) {
      return { toolName: 'complete_visitor_followup', success: false, error: err.message };
    }
  },

  async get_operational_attendance_visitor_summary(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_operational_attendance_visitor_summary', success: false, error: 'Access Denied.' };
    }
    try {
      const data = await churchOperationsService.getOperationalAttendanceVisitorSummary(ctx.churchId);
      return { toolName: 'get_operational_attendance_visitor_summary', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_operational_attendance_visitor_summary', success: false, error: err.message };
    }
  },

  async get_operations_dashboard_metrics(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_operations_dashboard_metrics', success: false, error: 'Access Denied: Operational metrics require leadership role.' };
    }
    try {
      const data = await churchOperationsService.getOperationsDashboardMetrics(ctx.churchId);
      return { toolName: 'get_operations_dashboard_metrics', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_operations_dashboard_metrics', success: false, error: err.message };
    }
  },

  async get_whatsapp_history(params: { status?: any; phone?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'get_whatsapp_history', success: false, error: 'Access Denied: Message logs require administrator role.' };
    }
    try {
      const data = whatsAppService.getWhatsAppHistory(ctx.churchId, params);
      return { toolName: 'get_whatsapp_history', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_whatsapp_history', success: false, error: err.message };
    }
  },

  async retry_failed_whatsapp_message(params: { messageId: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'retry_failed_whatsapp_message', success: false, error: 'Access Denied.' };
    }
    try {
      const result = await whatsAppService.retryFailedMessage(ctx.churchId, params.messageId, ctx.userName);
      if (!result) {
        return { toolName: 'retry_failed_whatsapp_message', success: false, error: `Message '${params.messageId}' not found.` };
      }
      return { toolName: 'retry_failed_whatsapp_message', success: true, data: result };
    } catch (err: any) {
      return { toolName: 'retry_failed_whatsapp_message', success: false, error: err.message };
    }
  },

  async manage_whatsapp_opt_out(params: { phone: string; action: 'opt_out' | 'opt_in'; reason?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'manage_whatsapp_opt_out', success: false, error: 'Access Denied.' };
    }
    try {
      if (params.action === 'opt_out') {
        const res = await whatsAppService.recordOptOut(ctx.churchId, params.phone, params.reason || 'Admin manual opt-out', 'admin_manual');
        return { toolName: 'manage_whatsapp_opt_out', success: true, data: res };
      } else {
        const res = await whatsAppService.recordOptIn(ctx.churchId, params.phone, 'admin_manual');
        return { toolName: 'manage_whatsapp_opt_out', success: true, data: res };
      }
    } catch (err: any) {
      return { toolName: 'manage_whatsapp_opt_out', success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // 17. PHASE 4: ADVANCED CHURCH ANALYTICS & WORKFLOW AUTOMATION TOOLS
  // -------------------------------------------------------------------------
  async get_advanced_attendance_analytics(params: { timeframe?: AnalyticsTimeframe }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_advanced_attendance_analytics', success: false, error: 'Access Denied: Analytics requires leadership permissions.' };
    }
    try {
      const data = await churchAnalyticsService.getAdvancedAttendanceAnalytics(ctx.churchId, params.timeframe || 'last_30_days');
      return { toolName: 'get_advanced_attendance_analytics', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_advanced_attendance_analytics', success: false, error: err.message };
    }
  },

  async get_advanced_membership_analytics(params: { timeframe?: AnalyticsTimeframe }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'get_advanced_membership_analytics', success: false, error: 'Access Denied: Membership analytics requires pastor/administrator access.' };
    }
    try {
      const data = await churchAnalyticsService.getAdvancedMembershipAnalytics(ctx.churchId, params.timeframe || 'last_30_days');
      return { toolName: 'get_advanced_membership_analytics', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_advanced_membership_analytics', success: false, error: err.message };
    }
  },

  async get_advanced_event_analytics(params: { timeframe?: AnalyticsTimeframe }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_advanced_event_analytics', success: false, error: 'Access Denied: Event analytics requires leadership permissions.' };
    }
    try {
      const data = await churchAnalyticsService.getAdvancedEventAnalytics(ctx.churchId, params.timeframe || 'last_30_days');
      return { toolName: 'get_advanced_event_analytics', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_advanced_event_analytics', success: false, error: err.message };
    }
  },

  async get_communication_analytics(params: { timeframe?: AnalyticsTimeframe }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'get_communication_analytics', success: false, error: 'Access Denied: Communication analytics requires administrator access.' };
    }
    try {
      const data = await churchAnalyticsService.getAdvancedCommunicationAnalytics(ctx.churchId, params.timeframe || 'last_30_days');
      return { toolName: 'get_communication_analytics', success: true, data };
    } catch (err: any) {
      return { toolName: 'get_communication_analytics', success: false, error: err.message };
    }
  },

  async get_workflow_automation_rules(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'get_workflow_automation_rules', success: false, error: 'Access Denied: Workflow management requires administrator access.' };
    }
    try {
      const rules = workflowAutomationService.getWorkflowRules(ctx.churchId);
      return { toolName: 'get_workflow_automation_rules', success: true, data: rules };
    } catch (err: any) {
      return { toolName: 'get_workflow_automation_rules', success: false, error: err.message };
    }
  },

  async evaluate_workflow_automations(params: { ruleId?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'evaluate_workflow_automations', success: false, error: 'Access Denied: Running workflow automations requires administrator access.' };
    }
    try {
      const logs = await workflowAutomationService.evaluateWorkflows(ctx.churchId, params.ruleId);
      const totalProposed = logs.reduce((acc, l) => acc + l.actionsProposedCount, 0);
      return {
        toolName: 'evaluate_workflow_automations',
        success: true,
        data: {
          rulesEvaluated: logs.length,
          totalActionsProposed: totalProposed,
          logs,
          requiresHumanApproval: true,
          explanation: `Automations evaluated. Staged ${totalProposed} proposed actions awaiting administrator approval.`
        }
      };
    } catch (err: any) {
      return { toolName: 'evaluate_workflow_automations', success: false, error: err.message };
    }
  },

  async toggle_workflow_automation_rule(params: { ruleId: string; enabled: boolean }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'toggle_workflow_automation_rule', success: false, error: 'Access Denied: Modifying workflow rules requires administrator access.' };
    }
    try {
      const updated = workflowAutomationService.updateWorkflowRule(ctx.churchId, params.ruleId, { enabled: params.enabled });
      return { toolName: 'toggle_workflow_automation_rule', success: true, data: updated };
    } catch (err: any) {
      return { toolName: 'toggle_workflow_automation_rule', success: false, error: err.message };
    }
  },

  async approve_workflow_action(params: { logId: string; actionId: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'approve_workflow_action', success: false, error: 'Access Denied: Approving workflow actions requires administrator access.' };
    }
    try {
      const result = await workflowAutomationService.approveWorkflowAction(ctx.churchId, params.logId, params.actionId, ctx.userName);
      return { toolName: 'approve_workflow_action', success: result.success, data: result };
    } catch (err: any) {
      return { toolName: 'approve_workflow_action', success: false, error: err.message };
    }
  },

  async reject_workflow_action(params: { logId: string; actionId: string; reason?: string }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'reject_workflow_action', success: false, error: 'Access Denied: Rejecting workflow actions requires administrator access.' };
    }
    try {
      const result = workflowAutomationService.rejectWorkflowAction(ctx.churchId, params.logId, params.actionId, params.reason);
      return { toolName: 'reject_workflow_action', success: result.success, data: result };
    } catch (err: any) {
      return { toolName: 'reject_workflow_action', success: false, error: err.message };
    }
  }
};
