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
  getStoredSundaySchoolAttendance,
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

  async get_attendance_trend(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx) && !isMinistryLeader(ctx)) {
      return { toolName: 'get_attendance_trend', success: false, error: 'Access Denied: Attendance trends require leadership access.' };
    }
    try {
      const curr = await aiPastorToolsService.getAttendanceSummary(ctx.churchId, 'this_month', ctx.userRole);
      const prev = await aiPastorToolsService.getAttendanceSummary(ctx.churchId, 'last_month', ctx.userRole);
      return {
        toolName: 'get_attendance_trend',
        success: true,
        data: {
          currentMonthAvg: curr.averagePresentPerService,
          previousMonthAvg: prev.averagePresentPerService,
          trendDirection: curr.averagePresentPerService >= prev.averagePresentPerService ? 'upward' : 'downward',
          months: [
            { period: 'Last Month', avgAttendance: prev.averagePresentPerService, totalPresent: prev.totalPresent },
            { period: 'This Month', avgAttendance: curr.averagePresentPerService, totalPresent: curr.totalPresent }
          ]
        }
      };
    } catch (err: any) {
      return { toolName: 'get_attendance_trend', success: false, error: err.message };
    }
  },

  async get_absent_members(params: { daysThreshold?: number }, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    return this.get_absence_followup_summary(params, ctx);
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
      
      return {
        toolName: 'generate_attendance_report',
        success: true,
        data: {
          reportTitle: `Church Attendance Report (${params.dateRange || 'This Month'})`,
          generatedAt: new Date().toISOString(),
          churchSummary: summary,
          ministryBreakdown: minAttendance
        }
      };
    } catch (err: any) {
      return { toolName: 'generate_attendance_report', success: false, error: err.message };
    }
  },

  async generate_member_report(_params: any, ctx: UserSecurityContext): Promise<ToolExecutionResult> {
    if (!isPastorOrAdmin(ctx)) {
      return { toolName: 'generate_member_report', success: false, error: 'Access Denied.' };
    }
    try {
      const summary = await aiPastorToolsService.getMemberCountAndSummary(ctx.churchId, ctx.userRole);
      return {
        toolName: 'generate_member_report',
        success: true,
        data: {
          reportTitle: 'Church Membership Directory & Demographics Report',
          generatedAt: new Date().toISOString(),
          ...summary
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

      return {
        toolName: 'generate_ministry_report',
        success: true,
        data: {
          reportTitle: `Ministry Report (${params.ministryName || params.ministryIdOrName || 'All Ministries'})`,
          membersData: membersResult.data,
          rosterData: rosterResult.data
        }
      };
    } catch (err: any) {
      return { toolName: 'generate_ministry_report', success: false, error: err.message };
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
  // 11. BIBLE VERSE SEARCH & SEARCH TOOLS
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
  // 12. PROPOSED ACTIONS (WRITE OPERATIONS REQUIRE CONFIRMATION)
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
