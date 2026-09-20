import { GoogleGenAI } from '@google/genai';
import { 
  ChurchTenant, SaaSUser, Member, AttendanceRecord, SundaySchoolAttendanceRecord, 
  SundaySchoolClass, SundaySchoolStudent, ChurchMinistry, MinistryMember, 
  MinistryActivity, ChurchEvent, RosterAssignment, PrayerRequest 
} from '../types';
import { canAccessAllChurchReports, normalizeRole } from '../utils/rbac';
import { getUserAssignedMinistries } from '../utils/ministryPermissions';
import { calculateAttendanceInsights } from './attendanceInsightsService';
import { calculateMemberEngagementInsights } from './memberEngagementService';
import { getAutomatedFollowUpTasks } from './visitorFollowUpService';
import { getAutomatedAbsenceTasks } from './absenceFollowUpService';
import { auditService } from './auditService';

export type AiReportCategory = 
  | 'attendance' 
  | 'engagement' 
  | 'ministry' 
  | 'sundayschool' 
  | 'events' 
  | 'visitors' 
  | 'absence' 
  | 'assignments' 
  | 'prayers' 
  | 'church_wide_summary';

export interface ParsedReportIntent {
  category: AiReportCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  periodLabel: string;
  scope: 'church_wide' | 'ministry' | 'sundayschool' | 'event';
  targetMinistryName?: string;
  isComparisonRequested: boolean;
  language: 'en' | 'ta' | 'mixed';
}

export interface StructuredReportMetric {
  label: string;
  value: string | number;
  subtext?: string;
  change?: string;
}

export interface StructuredReportPayload {
  title: string;
  periodText: string;
  scopeLabel: string;
  executiveSummary: string;
  metrics: StructuredReportMetric[];
  tableColumns: string[];
  tableRows: Array<Record<string, any>>;
  chartPoints: Array<{ label: string; value: number; date?: string }>;
  factualObservations: string[];
  comparisonSummary?: string | null;
  dataLimitations: string[];
  language: 'en' | 'ta' | 'mixed';
  generatedAt: string;
}

/**
 * 1. Server-Side Date Range & Intent Parser
 */
export function resolveReportDateRange(prompt: string, nowDate = new Date()): { startDate: string; endDate: string; periodLabel: string } {
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];
  const lower = prompt.toLowerCase();

  const year = nowDate.getFullYear();
  const month = nowDate.getMonth();

  // Last Month
  if (lower.includes('last month') || lower.includes('கடந்த மாதம்')) {
    const prevMonthDate = new Date(year, month - 1, 1);
    const lastDayPrevMonth = new Date(year, month, 0);
    return {
      startDate: formatYMD(prevMonthDate),
      endDate: formatYMD(lastDayPrevMonth),
      periodLabel: `${prevMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    };
  }

  // Last 3 Months / 90 Days
  if (lower.includes('3 months') || lower.includes('90 days') || lower.includes('3 மாதங்கள்')) {
    const sDate = new Date(nowDate);
    sDate.setDate(nowDate.getDate() - 90);
    return {
      startDate: formatYMD(sDate),
      endDate: formatYMD(nowDate),
      periodLabel: 'Last 90 Days'
    };
  }

  // This Year
  if (lower.includes('this year') || lower.includes('இந்த ஆண்டு')) {
    return {
      startDate: `${year}-01-01`,
      endDate: formatYMD(nowDate),
      periodLabel: `Year ${year}`
    };
  }

  // Default: This Month
  const firstDayThisMonth = new Date(year, month, 1);
  return {
    startDate: formatYMD(firstDayThisMonth),
    endDate: formatYMD(nowDate),
    periodLabel: `${nowDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
  };
}

/**
 * 2. Parse Natural Language Request using Gemini / Heuristics
 */
export async function parseReportIntent(prompt: string, userRole?: string): Promise<ParsedReportIntent> {
  const lower = prompt.toLowerCase();
  const dateRange = resolveReportDateRange(prompt);
  const isTa = /[\u0B80-\u0BFF]/.test(prompt) || lower.includes('tamil') || lower.includes('தமிழ்');

  let category: AiReportCategory = 'church_wide_summary';
  if (lower.includes('attendance') || lower.includes('வருகை')) category = 'attendance';
  else if (lower.includes('engagement') || lower.includes('activity') || lower.includes('ஈடுபாடு')) category = 'engagement';
  else if (lower.includes('visitor') || lower.includes('வந்த விருந்தினர்') || lower.includes('புதியவர்')) category = 'visitors';
  else if (lower.includes('absence') || lower.includes('வரவில்லை') || lower.includes('இல்லாதோர்')) category = 'absence';
  else if (lower.includes('ministry') || lower.includes('மினிஸ்ட்ரி') || lower.includes('ஊழியம்')) category = 'ministry';
  else if (lower.includes('sunday school') || lower.includes('சண்டே ஸ்கூல்')) category = 'sundayschool';
  else if (lower.includes('event') || lower.includes('நிகழ்ச்சி')) category = 'events';
  else if (lower.includes('prayer') || lower.includes('ஜெபம்')) category = 'prayers';
  else if (lower.includes('assignment') || lower.includes('பொறுப்பு')) category = 'assignments';

  const isComparisonRequested = lower.includes('compare') || lower.includes('vs') || lower.includes('ஒப்பீடு') || lower.includes('ஒப்பிடுக');

  return {
    category,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    periodLabel: dateRange.periodLabel,
    scope: category === 'ministry' ? 'ministry' : category === 'sundayschool' ? 'sundayschool' : 'church_wide',
    isComparisonRequested,
    language: isTa ? 'ta' : 'en'
  };
}

/**
 * 3. Server-Side Security & Permission Validator
 */
export function validateReportPermission(params: {
  currentUser?: SaaSUser;
  category: AiReportCategory;
  scope: 'church_wide' | 'ministry' | 'sundayschool' | 'event';
  targetMinistryId?: string;
  ministries?: ChurchMinistry[];
}): { authorized: boolean; reason?: string } {
  const { currentUser, category, scope, targetMinistryId, ministries = [] } = params;
  if (!currentUser) return { authorized: false, reason: 'User authentication required.' };

  const normRole = normalizeRole(currentUser.role);
  const isGlobalAdmin = canAccessAllChurchReports(normRole);

  // Global Admins can access all report scopes
  if (isGlobalAdmin) return { authorized: true };

  // Ministry Leaders can ONLY access reports for their assigned ministries
  if (normRole === 'MinistryLeader') {
    if (scope === 'ministry' || targetMinistryId) {
      const userAssigned = getUserAssignedMinistries(currentUser, [], ministries);
      const isAssigned = userAssigned.some(m => m.ministry && m.ministry.id === targetMinistryId);
      if (!isAssigned && targetMinistryId) {
        return { authorized: false, reason: 'Access denied. You are not authorized to view reports for this ministry.' };
      }
      return { authorized: true };
    }
    // Allow ministry leaders to view visitor/absence follow-up reports scoped to their duties
    if (category === 'visitors' || category === 'absence' || category === 'ministry') {
      return { authorized: true };
    }
    return { authorized: false, reason: 'Access denied. Church-wide administrative reports require Pastor/Admin permissions.' };
  }

  // Normal members cannot access administrative reports
  return { authorized: false, reason: 'Access denied. Normal members cannot access administrative reports.' };
}

/**
 * 4. Controlled Report Tools (Query & Calculation Engine)
 */
export function executeReportTool(params: {
  churchId: string;
  churchName: string;
  intent: ParsedReportIntent;
  members: Member[];
  attendanceRecords: AttendanceRecord[];
  sundaySchoolClasses?: SundaySchoolClass[];
  sundaySchoolStudents?: SundaySchoolStudent[];
  ministries?: ChurchMinistry[];
  ministryMembers?: MinistryMember[];
  ministryActivities?: MinistryActivity[];
  events?: ChurchEvent[];
  roster?: RosterAssignment[];
  prayers?: PrayerRequest[];
}): Record<string, any> {
  const {
    churchId,
    churchName,
    intent,
    members = [],
    attendanceRecords = [],
    sundaySchoolClasses = [],
    sundaySchoolStudents = [],
    ministries = [],
    ministryMembers = [],
    ministryActivities = [],
    events = [],
    roster = [],
    prayers = []
  } = params;

  // A. ATTENDANCE REPORT TOOL
  if (intent.category === 'attendance') {
    const insights = calculateAttendanceInsights({
      currentChurchId: churchId,
      attendanceRecords,
      sundaySchoolClasses,
      sundaySchoolStudents,
      ministries,
      ministryMembers,
      ministryActivities,
      events,
      members,
      dateFilter: 'this_month',
      customStart: intent.startDate,
      customEnd: intent.endDate
    });

    return {
      reportType: 'Attendance Report',
      periodLabel: intent.periodLabel,
      metrics: insights.metrics,
      comparison: insights.comparison,
      trend: insights.trend,
      breakdown: insights.ministryStats
    };
  }

  // B. MEMBER ENGAGEMENT / ACTIVITY REPORT TOOL
  if (intent.category === 'engagement') {
    const engagementData = calculateMemberEngagementInsights({
      currentChurchId: churchId,
      members,
      attendanceRecords,
      ministries,
      ministryMembers,
      ministryActivities,
      events,
      roster,
      dateFilter: 'this_month',
      customStart: intent.startDate,
      customEnd: intent.endDate
    });

    return {
      reportType: 'Member Engagement Report',
      periodLabel: intent.periodLabel,
      metrics: engagementData.metrics,
      comparison: engagementData.comparison,
      ministryStats: engagementData.ministryStats,
      factualInsights: engagementData.factualInsightsBullets
    };
  }

  // C. VISITOR FOLLOW-UP REPORT TOOL
  if (intent.category === 'visitors') {
    const tasks = getAutomatedFollowUpTasks(churchId);
    const totalVisitors = tasks.length;
    const awaitingApproval = tasks.filter(t => t.status === 'awaiting_approval').length;
    const sent = tasks.filter(t => t.status === 'sent').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const skipped = tasks.filter(t => t.status === 'skipped').length;

    return {
      reportType: 'Visitor Follow-up Report',
      periodLabel: intent.periodLabel,
      totalVisitors,
      awaitingApproval,
      sent,
      completed,
      skipped,
      recentTasks: tasks.slice(0, 10).map(t => ({
        visitor: t.visitorName,
        stage: t.stage,
        status: t.status,
        date: t.visitDate
      }))
    };
  }

  // D. ABSENCE FOLLOW-UP REPORT TOOL
  if (intent.category === 'absence') {
    const tasks = getAutomatedAbsenceTasks(churchId);
    const totalTasks = tasks.length;
    const awaitingApproval = tasks.filter(t => t.status === 'awaiting_approval').length;
    const sent = tasks.filter(t => t.status === 'sent').length;
    const resolvedByAttendance = tasks.filter(t => t.status === 'resolved_by_attendance').length;
    const skipped = tasks.filter(t => t.status === 'skipped').length;

    return {
      reportType: 'Automated Absence Follow-up Report',
      periodLabel: intent.periodLabel,
      totalTasks,
      awaitingApproval,
      sent,
      resolvedByAttendance,
      skipped,
      tasksSummary: tasks.slice(0, 10).map(t => ({
        member: t.memberName,
        rule: t.ruleDescription,
        lastAttended: t.lastAttendanceDate,
        daysInactive: t.daysSinceLastAttendance,
        status: t.status
      }))
    };
  }

  // E. MINISTRY & ASSIGNMENT REPORT TOOL
  if (intent.category === 'ministry' || intent.category === 'assignments') {
    const totalMinistries = ministries.length;
    const totalAssignments = roster.length;
    const totalActivities = ministryActivities.length;

    const ministrySummaries = ministries.map(m => {
      const mMembers = ministryMembers.filter(mm => mm.ministryId === m.id);
      const mRoster = roster.filter(r => r.ministryId === m.id);
      return {
        id: m.id,
        name: m.name,
        leaderName: m.leaderName || 'N/A',
        membersCount: mMembers.length,
        assignmentsCount: mRoster.length
      };
    });

    return {
      reportType: 'Ministry & Roster Assignment Report',
      periodLabel: intent.periodLabel,
      totalMinistries,
      totalAssignments,
      totalActivities,
      ministrySummaries
    };
  }

  // F. SUNDAY SCHOOL REPORT TOOL
  if (intent.category === 'sundayschool') {
    return {
      reportType: 'Sunday School Report',
      periodLabel: intent.periodLabel,
      totalClasses: sundaySchoolClasses.length,
      totalStudents: sundaySchoolStudents.length,
      classList: sundaySchoolClasses.map(c => ({
        name: c.className || (c as any).name || 'Sunday School Class',
        teacher: c.teacherName || 'Assigned Staff',
        studentCount: sundaySchoolStudents.filter(s => s.classId === c.id).length
      }))
    };
  }

  // DEFAULT / CHURCH-WIDE SUMMARY REPORT TOOL
  return {
    reportType: 'Church Summary Administration Report',
    periodLabel: intent.periodLabel,
    totalMembers: members.length,
    totalAttendanceRecords: attendanceRecords.length,
    totalEvents: events.length,
    totalMinistries: ministries.length,
    totalPrayers: prayers.length
  };
}

/**
 * 5. Structured AI Report Generator (Gemini 2.5 Flash + Fallbacks)
 */
export async function generateStructuredAiReport(params: {
  churchName: string;
  intent: ParsedReportIntent;
  toolData: Record<string, any>;
  currentUser?: SaaSUser;
}): Promise<StructuredReportPayload> {
  const { churchName, intent, toolData, currentUser } = params;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  const nowIso = new Date().toISOString();

  // Standard non-judgmental fallback payload
  const fallbackPayload: StructuredReportPayload = {
    title: `${toolData.reportType || 'Church Report'} - ${churchName}`,
    periodText: intent.periodLabel,
    scopeLabel: intent.scope === 'church_wide' ? 'Church-Wide' : 'Ministry Scoped',
    executiveSummary: `Factual executive summary for ${churchName} (${intent.periodLabel}): Metrics are based strictly on attendance and activity records logged in the system.`,
    metrics: [
      { label: 'Total Members Tracked', value: toolData.totalMembers || toolData.metrics?.totalMembers || toolData.totalVisitors || 0 },
      { label: 'Primary Activity Record', value: toolData.totalAttendanceRecords || toolData.metrics?.totalHeadcount || toolData.totalTasks || 0 },
      { label: 'Period Average', value: toolData.metrics?.averageAttendance || 'N/A' }
    ],
    tableColumns: ['Metric / Item', 'Recorded Count / Status'],
    tableRows: [
      { 'Metric / Item': 'Report Type', 'Recorded Count / Status': toolData.reportType || 'General' },
      { 'Metric / Item': 'Reporting Period', 'Recorded Count / Status': intent.periodLabel }
    ],
    chartPoints: (toolData.trend || []).slice(0, 6).map((t: any) => ({
      label: t.label || t.serviceName || 'Service',
      value: t.total || t.count || 0
    })),
    factualObservations: [
      `FACT: All metrics reflect actual database records logged for ${churchName}.`,
      `NEUTRAL OBSERVATION: Report generated for ${intent.periodLabel}.`,
      `LIMITATION: Records do not evaluate personal circumstances or unrecorded participation.`
    ],
    dataLimitations: [
      'This report is generated strictly from attendance logs and module records available in the application.',
      'Missing or unrecorded church activities are not included in calculations.'
    ],
    language: intent.language,
    generatedAt: nowIso
  };

  if (!apiKey) return fallbackPayload;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a professional, non-judgmental church administrative AI reporting assistant for ${churchName}.
Generate a structured report JSON based STRICTLY on the provided data payload.

Context & Rules:
- User Intent: ${JSON.stringify(intent)}
- Tool Data Payload: ${JSON.stringify(toolData)}
- Language Requested: ${intent.language === 'ta' ? 'Tamil (Tamil script)' : 'English'}

CRITICAL INSTRUCTIONS:
- NEVER use judgmental or assumption-based labels ("uncommitted", "spiritually weak", "backsliding", "lazy").
- Clear distinction between FACT, NEUTRAL OBSERVATION, and DATA LIMITATION.
- Do NOT invent or estimate numbers. Ground all metrics strictly on provided Tool Data.
- Return ONLY a raw JSON object with this exact schema:
{
  "title": "string",
  "periodText": "string",
  "scopeLabel": "string",
  "executiveSummary": "string",
  "metrics": [ { "label": "string", "value": "string/number", "subtext": "string", "change": "string" } ],
  "tableColumns": [ "string" ],
  "tableRows": [ { "ColumnName": "Value" } ],
  "chartPoints": [ { "label": "string", "value": 0 } ],
  "factualObservations": [ "string" ],
  "comparisonSummary": "string",
  "dataLimitations": [ "string" ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...fallbackPayload,
        title: parsed.title || fallbackPayload.title,
        executiveSummary: parsed.executiveSummary || fallbackPayload.executiveSummary,
        metrics: parsed.metrics || fallbackPayload.metrics,
        tableColumns: parsed.tableColumns || fallbackPayload.tableColumns,
        tableRows: parsed.tableRows || fallbackPayload.tableRows,
        chartPoints: parsed.chartPoints || fallbackPayload.chartPoints,
        factualObservations: parsed.factualObservations || fallbackPayload.factualObservations,
        comparisonSummary: parsed.comparisonSummary || null,
        dataLimitations: parsed.dataLimitations || fallbackPayload.dataLimitations
      };
    }
  } catch (err) {
    console.warn('AI report JSON generation failed, returning standard fallback:', err);
  }

  return fallbackPayload;
}
