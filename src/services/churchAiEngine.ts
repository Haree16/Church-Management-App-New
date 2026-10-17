import { GoogleGenAI } from '@google/genai';
import { SaaSUserRole } from '@/types';
import { canAccessAiPastor, getRoleConfig, normalizeRole } from '@/utils/rbac';
import { churchAiToolRegistry, UserSecurityContext, ToolExecutionResult } from './churchAiToolRegistry';
import { auditService } from './auditService';
import { getStoredMinistryMembers, getStoredMinistries, getStoredAuthSession } from '@/utils/storage';

export interface StructuredIntent {
  primaryIntent: string;
  intents: string[];
  entities: {
    dateRange?: string;
    ministryName?: string;
    memberName?: string;
    locationContext?: string;
    status?: string;
    searchQuery?: string;
    daysThreshold?: number;
    [key: string]: any;
  };
  language: 'en' | 'ta' | 'mixed';
}

export interface TaskPlan {
  id: string;
  toolName: string;
  label: string;
  params: Record<string, any>;
}

export interface ExecutionPlan {
  prompt: string;
  intent: StructuredIntent;
  tasks: TaskPlan[];
}

export interface ValidatedTaskResult {
  taskId: string;
  toolName: string;
  label: string;
  status: 'valid' | 'no_records' | 'permission_denied' | 'service_failure' | 'incomplete' | 'invalid_params';
  data?: any;
  error?: string;
  requiresConfirmation?: boolean;
  proposedActionPayload?: any;
}

export interface ChurchAiTrace {
  requestId: string;
  timestamp: string;
  engineMode: 'general' | 'pastor' | 'ministry';
  userRole?: string;
  language: 'en' | 'ta' | 'mixed';
  intents: string[];
  entities: Record<string, any>;
  tasks: { id: string; toolName: string; label: string }[];
  toolsExecuted: string[];
  executionTimeMs: number;
  completenessCheck: { task: string; status: 'completed' | 'unavailable' | 'error' | 'denied' }[];
}

export interface AskEngineOptions {
  prompt: string;
  churchId: string;
  userRole?: SaaSUserRole | string;
  userName?: string;
  userEmail?: string;
  memberId?: string;
  authorizedMinistryIds?: string[];
  activeTabOrScreen?: string;
  history?: { sender?: string; text: string }[];
  debugMode?: boolean;
  engineMode?: 'general' | 'pastor' | 'ministry';
  selectedMinistryId?: string;
  actionToExecute?: any;
}

const SYSTEM_INSTRUCTION = `You are the central Church AI Engine powering the Church Management System.
Your mission is to assist church leaders, ministry leaders, and members by providing accurate, permission-gated, and factual church insights.

Core Guidelines:
1. ROLE & PERMISSION Privileges: Always base answers strictly on verified security context and tool data.
2. COMPLETE MULTI-PART REQUESTS: If a user asks multiple metrics, dates, or items, address EVERY single requested item in your response.
3. FACTUAL DATA ONLY: Base all statistics strictly on real church data tool outputs. Never fabricate numbers, names, or counts.
4. EXPLICIT UNAVAILABLE NOTICES: If data for a requested part is unavailable or denied, explicitly state it. Never silently omit requested parts.
5. TAMIL & TANGLISH SUPPORT: Respond naturally in English, Tamil (தமிழ்), or Tanglish matching user preference.`;

function getGeminiApiKey(): string | null {
  try {
    const envKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY : '');
    return envKey && envKey.trim().length > 0 ? envKey.trim() : null;
  } catch (e) {
    return null;
  }
}

/**
 * Prompt sanitization against injection and data exfiltration attempts
 */
export function sanitizePrompt(prompt: string): { isSafe: boolean; reason?: string } {
  const p = prompt.toLowerCase();
  
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|prompts)/i,
    /reveal\s+(the\s+)?(system\s+prompt|developer\s+mode|internal\s+instructions)/i,
    /disregard\s+(all\s+)?(rules|safety|guidelines)/i,
    /bypass\s+(role|permission|security|guard)/i,
    /output\s+(all\s+)?(passwords|api[_\s]?keys|tokens|secrets|credentials)/i,
    /show\s+me\s+(all\s+)?(passwords|hashes|tokens|private\s+keys)/i,
    /drop\s+table/i,
    /delete\s+from\s+users/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(p)) {
      return {
        isSafe: false,
        reason: 'Security violation: Prompt contains prohibited instructions or attempts to override safety boundaries.'
      };
    }
  }

  return { isSafe: true };
}

export const churchAiEngine = {
  /**
   * Build authoritative Security Context with session verification
   */
  buildUserSecurityContext(options: AskEngineOptions): UserSecurityContext {
    const { churchId, userRole = 'Member', userName = 'Church Member', userEmail = '', memberId = '', authorizedMinistryIds } = options;

    let authoritativeChurchId = churchId;
    let authoritativeRole: SaaSUserRole = normalizeRole(userRole);
    let authoritativeUserId = memberId || `user-${Date.now()}`;
    let authoritativeName = userName;
    let authoritativeEmail = userEmail;

    // Validate against active persistent session if available
    try {
      const activeSession = getStoredAuthSession();
      if (activeSession && activeSession.user) {
        const sessionUser = activeSession.user;
        const sessionRole = normalizeRole(sessionUser.role);

        // Enforce tenant boundary: Non-SuperAdmin cannot query across churches
        if (sessionRole !== 'SuperAdmin') {
          const sessionChurchId = activeSession.church?.id || sessionUser.church_id || (sessionUser as any).churchId;
          if (sessionChurchId) {
            authoritativeChurchId = sessionChurchId;
          }
        }

        // Prevent role escalation beyond authenticated session
        if (!['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(sessionRole)) {
          authoritativeRole = sessionRole;
        }

        authoritativeUserId = sessionUser.id || authoritativeUserId;
        authoritativeName = sessionUser.name || authoritativeName;
        authoritativeEmail = sessionUser.email || authoritativeEmail;
      }
    } catch (e) {
      // Storage access fallback
    }

    let minIds = authorizedMinistryIds || [];
    if (minIds.length === 0) {
      try {
        const storedMinMembers = getStoredMinistryMembers();
        const matched = storedMinMembers.filter(mm => mm.memberId === memberId || mm.memberId === authoritativeUserId);
        minIds = matched.map(mm => mm.ministryId);
      } catch (e) {
        // Fallback
      }
    }

    return {
      churchId: authoritativeChurchId,
      userId: authoritativeUserId,
      userRole: authoritativeRole,
      userName: authoritativeName,
      userEmail: authoritativeEmail,
      memberId,
      authorizedMinistryIds: minIds
    };
  },

  /**
   * Entity Resolution & Language Detection
   */
  resolveEntities(prompt: string, history?: { sender?: string; text: string }[]): StructuredIntent {
    const p = prompt.toLowerCase();
    
    // Language detection
    let language: 'en' | 'ta' | 'mixed' = 'en';
    const tamilRegex = /[\u0B80-\u0BFF]/;
    const tanglishWords = ['intha', 'kadantha', 'matham', 'ethanai', 'yaaru', 'poottirukanga', 'epdi', 'irukku', 'panninga', 'sapai', 'varukai', 'jepam', 'kodungka', 'kodukanga'];
    if (tamilRegex.test(prompt)) language = 'ta';
    else if (tanglishWords.some(w => p.includes(w))) language = 'mixed';

    const entities: Record<string, any> = {};

    // Date range resolution
    if (p.includes('last 4 sundays') || p.includes('four sundays') || p.includes('4 sundays') || p.includes('நான்கு ஞாயிறு')) {
      entities.dateRange = 'last_4_sundays';
    } else if (p.includes('last sunday') || p.includes('கடந்த ஞாயிறு')) {
      entities.dateRange = 'last_sunday';
    } else if ((p.includes('august') && p.includes('july')) || (p.includes('aug') && p.includes('jul'))) {
      entities.dateRange = 'August 2026 vs July 2026';
    } else if (p.includes('last month') || p.includes('kadantha matham') || p.includes('previous month') || p.includes('கடந்த மாதம்')) {
      entities.dateRange = 'last_month';
    } else if (p.includes('this week') || p.includes('இந்த வாரம்')) {
      entities.dateRange = 'this_week';
    } else if (p.includes('august') || p.includes('aug')) {
      entities.dateRange = 'August 2026';
    } else if (p.includes('july') || p.includes('jul')) {
      entities.dateRange = 'July 2026';
    } else {
      entities.dateRange = 'this_month';
    }

    // Ministry entity resolution
    const allMinistries = getStoredMinistries();
    for (const m of allMinistries) {
      const mNameLower = m.name.toLowerCase();
      const simpleName = mNameLower.replace('ministry', '').replace('team', '').trim();
      if (p.includes(mNameLower) || (simpleName.length > 2 && p.includes(simpleName))) {
        entities.ministryName = m.name;
        break;
      }
    }
    if (!entities.ministryName) {
      if (p.includes('media')) entities.ministryName = 'Media Ministry';
      else if (p.includes('worship') || p.includes('singing') || p.includes('music')) entities.ministryName = 'Worship Ministry';
      else if (p.includes('youth')) entities.ministryName = 'Youth Ministry';
      else if (p.includes('children') || p.includes('kids')) entities.ministryName = 'Children Ministry';
      else if (p.includes('usher')) entities.ministryName = 'Ushering Ministry';
      else if (p.includes('prayer')) entities.ministryName = 'Prayer Ministry';
    }

    // Location context resolution from history
    if (history && history.length > 0) {
      const combined = history.map(h => h.text).join(' ').toLowerCase();
      if (combined.includes('anna nagar')) entities.locationContext = 'Anna Nagar';
      else if (combined.includes('medavakkam')) entities.locationContext = 'Medavakkam';
      else if (combined.includes('santhome')) entities.locationContext = 'Santhome';
      else if (combined.includes('pallikaranai')) entities.locationContext = 'Pallikaranai';
      else if (combined.includes('kannagi nagar')) entities.locationContext = 'Kannagi Nagar';
    }

    return {
      primaryIntent: 'general_inquiry',
      intents: [],
      entities,
      language
    };
  },

  /**
   * Task Decomposition Engine
   * Mandatory requirement: Breaks complex or multi-part queries into distinct subtasks.
   */
  decomposeRequest(prompt: string, ctx: UserSecurityContext, activeScreen?: string, history?: { sender?: string; text: string }[], engineMode: 'general' | 'pastor' | 'ministry' = 'general', selectedMinistryId?: string): ExecutionPlan {
    const p = prompt.toLowerCase();
    const intent = this.resolveEntities(prompt, history);
    const isTa = intent.language === 'ta' || intent.language === 'mixed';
    const normRole = normalizeRole(ctx.userRole);

    const isLeadership = ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'TreasurerStaff'].includes(normRole) || engineMode === 'pastor';
    const isLeader = isLeadership || normRole === 'MinistryLeader' || normRole === 'SundaySchoolTeacher' || engineMode === 'ministry';

    const tasks: TaskPlan[] = [];
    const intents: string[] = [];

    // Contextual Follow-Up Query (e.g. "Which of them joined this month?")
    if (p.includes('which of them') || p.includes('who of them') || p.includes('which of those') || p.includes('of these') || p.includes('from these') || ((p.includes('joined') || p.includes('join')) && (p.includes('them') || p.includes('these')))) {
      intents.push('filter', 'search');
      tasks.push({
        id: 'task-contextual-join-filter',
        toolName: 'get_contextual_join_filter',
        label: `Contextual Member Join Filter (${intent.entities.locationContext || 'Directory'} ${intent.entities.dateRange})`,
        params: { periodLabel: intent.entities.dateRange, queryTarget: intent.entities.locationContext, historyTexts: history ? history.map(h => h.text) : [] }
      });
    }

    // WRITE Action Intents
    if (p.includes('announcement') && (p.includes('create') || p.includes('publish') || p.includes('post') || p.includes('make') || p.includes('new') || p.includes('draft'))) {
      intents.push('action', 'create');
      tasks.push({
        id: 'task-action-announcement',
        toolName: 'propose_create_announcement',
        label: 'Propose New Announcement Action',
        params: { title: 'Church Service Announcement', content: prompt, ministryName: intent.entities.ministryName }
      });
    }

    if ((p.includes('assign') || p.includes('roster')) && (p.includes('create') || p.includes('assign') || p.includes('add') || p.includes('schedule') || p.includes('duty'))) {
      intents.push('action', 'create');
      tasks.push({
        id: 'task-action-assignment',
        toolName: 'propose_create_assignment',
        label: 'Propose Roster Assignment Action',
        params: { memberName: 'Volunteer', roleName: 'Sunday Duty', serviceDate: 'Upcoming Sunday', ministryName: intent.entities.ministryName }
      });
    }

    // ============================================================
    // PHASE 4: ADVANCED AI CHURCH ANALYTICS & WORKFLOW AUTOMATION
    // ============================================================
    const resolveTimeframeParam = (str: string): 'last_30_days' | 'last_90_days' | 'this_year' | 'last_year' => {
      if (str.includes('90 days') || str.includes('quarter') || str.includes('quarterly') || str.includes('3 months')) return 'last_90_days';
      if (str.includes('this year') || str.includes('annual') || str.includes('ytd')) return 'this_year';
      if (str.includes('last year') || str.includes('prior year')) return 'last_year';
      return 'last_30_days';
    };

    const isWorkflowQuery = (p.includes('workflow') || p.includes('automation') || p.includes('automations')) &&
      (p.includes('rule') || p.includes('run') || p.includes('evaluate') || p.includes('trigger') || p.includes('hub') || p.includes('status') || p.includes('engine'));

    const isAdvancedAttendanceQuery = (
      p.includes('advanced attendance') ||
      p.includes('declining attendance') ||
      p.includes('disengagement') ||
      (p.includes('attendance') && (p.includes('variance') || p.includes('trend analysis') || p.includes('quality gap') || p.includes('gap') || p.includes('analytics')))
    );

    const isAdvancedMembershipQuery = (
      p.includes('membership analytics') ||
      p.includes('visitor-to-member') ||
      p.includes('visitor conversion') ||
      p.includes('retention rate') ||
      (p.includes('membership') && p.includes('hygiene')) ||
      (p.includes('advanced') && p.includes('membership'))
    );

    const isAdvancedEventQuery = (
      p.includes('event analytics') ||
      (p.includes('event') && (p.includes('turnout') || p.includes('registration vs') || p.includes('variance'))) ||
      (p.includes('event') && p.includes('volunteer rate'))
    );

    const isAdvancedCommQuery = (
      p.includes('communication analytics') ||
      (p.includes('campaign') && (p.includes('metric') || p.includes('performance'))) ||
      (p.includes('delivery rate') && (p.includes('whatsapp') || p.includes('message') || p.includes('communication'))) ||
      p.includes('opt-out trend')
    );

    // ============================================================
    // PHASE 3: AI CHURCH OPERATIONS & WHATSAPP COMMUNICATION
    // ============================================================

    // Op-1: Operational Absentees (4 consecutive Sundays)
    const isConsecutiveAbsenteeQuery = (
      ((p.includes('not attended') || p.includes('haven\'t attended') || p.includes('absent')) &&
       (p.includes('four sundays') || p.includes('4 sundays') || p.includes('consecutive') || p.includes('வராத'))) ||
      p.includes('last four sundays') ||
      p.includes('கடந்த 4 ஞாயிறு') ||
      p.includes('4 ஞாயிற்றுக்கிழமைகளாக')
    );

    // Op-2: Sunday Service Reminder
    const isServiceReminderQuery = (
      ((p.includes('reminder') || p.includes('நினைவூட்ட') || p.includes('நினைவூட்டு') || p.includes('நினைவூட்டல்')) && (p.includes('sunday') || p.includes('worship') || p.includes('service') || p.includes('ஆராதனை') || p.includes('ஞாயிறு'))) ||
      p.includes('service reminder') ||
      p.includes('sunday reminder') ||
      p.includes('prepare a reminder for this sunday')
    );

    // Op-3: Upcoming Birthdays & Greetings
    const isBirthdayQuery = p.includes('birthday') || p.includes('birthdays') || p.includes('பிறந்தநாள்');

    // Op-4: Volunteer Schedule & Reminders
    const isVolunteerQuery = (
      (p.includes('volunteer') || p.includes('volunteers') || p.includes('தன்னார்வலர்') || p.includes('தன்னார்வலர்கள்')) &&
      (p.includes('service') || p.includes('sunday') || p.includes('assigned') || p.includes('roster') || p.includes('reminder') || p.includes('schedule') || p.includes('ஆராதனை') || p.includes('பணி'))
    );

    // Op-5: First-Time Visitors Follow-up
    const isVisitorFollowupQuery = (
      ((p.includes('first-time') || p.includes('first time') || p.includes('new visitor') || p.includes('முதல் முறை') || p.includes('புதிய பார்வையாளர்')) &&
       (p.includes('follow') || p.includes('list') || p.includes('welcome') || p.includes('கவனிப்பு') || p.includes('visitor'))) ||
      p.includes('follow-up list for first-time visitors')
    );

    // Op-6: Operational Attendance & Visitor Summary (Last Month)
    const isAttendanceVisitorSummaryQuery = (
      (p.includes('attendance') && p.includes('visitor') && (p.includes('summar') || p.includes('last month') || p.includes('numbers') || p.includes('சுருக்க') || p.includes('எண்ணிக்கை'))) ||
      p.includes('attendance and visitor numbers') ||
      p.includes('வருகை மற்றும் பார்வையாளர்')
    );

    // Op-7: WhatsApp History & Operations Dashboard
    const isWhatsAppHistoryQuery = (p.includes('whatsapp') && (p.includes('history') || p.includes('log') || p.includes('status') || p.includes('sent'))) || p.includes('delivery status');
    const isOperationsDashboardQuery = (p.includes('operation') || p.includes('operations') || p.includes('communication') || p.includes('whatsapp')) && (p.includes('dashboard') || p.includes('metric') || p.includes('kpi') || p.includes('stats'));

    if (isWorkflowQuery) {
      if (p.includes('run') || p.includes('evaluate') || p.includes('trigger') || p.includes('execute')) {
        intents.push('evaluate_workflow_automations');
        tasks.push({
          id: 'task-evaluate-workflows',
          toolName: 'evaluate_workflow_automations',
          label: 'Evaluate Workflow Automation Rules (Staged Actions)',
          params: {}
        });
      } else {
        intents.push('workflow_automation_rules');
        tasks.push({
          id: 'task-workflow-rules',
          toolName: 'get_workflow_automation_rules',
          label: 'Configured Workflow Automation Rules & Safeguards',
          params: {}
        });
      }
    } else if (isAdvancedAttendanceQuery) {
      const tf = resolveTimeframeParam(p);
      intents.push('advanced_attendance_analytics');
      tasks.push({
        id: 'task-advanced-attendance-analytics',
        toolName: 'get_advanced_attendance_analytics',
        label: `Advanced Attendance Analytics & Trends (${tf})`,
        params: { timeframe: tf }
      });
    } else if (isAdvancedMembershipQuery) {
      const tf = resolveTimeframeParam(p);
      intents.push('advanced_membership_analytics');
      tasks.push({
        id: 'task-advanced-membership-analytics',
        toolName: 'get_advanced_membership_analytics',
        label: `Advanced Membership Analytics & Conversions (${tf})`,
        params: { timeframe: tf }
      });
    } else if (isAdvancedEventQuery) {
      const tf = resolveTimeframeParam(p);
      intents.push('advanced_event_analytics');
      tasks.push({
        id: 'task-advanced-event-analytics',
        toolName: 'get_advanced_event_analytics',
        label: `Advanced Event Turnout & Participation Analytics (${tf})`,
        params: { timeframe: tf }
      });
    } else if (isAdvancedCommQuery) {
      const tf = resolveTimeframeParam(p);
      intents.push('communication_analytics');
      tasks.push({
        id: 'task-communication-analytics',
        toolName: 'get_communication_analytics',
        label: `WhatsApp Communication & Delivery Analytics (${tf})`,
        params: { timeframe: tf }
      });
    } else if (isConsecutiveAbsenteeQuery) {
      intents.push('operational_absentees');
      tasks.push({
        id: 'task-operational-absentees',
        toolName: 'get_operational_absentees',
        label: 'Consecutive Absentee Members Analysis (4 Sundays)',
        params: { consecutiveSundaysCount: 4 }
      });
    } else if (isServiceReminderQuery) {
      intents.push('service_reminder', 'action_proposal');
      tasks.push({
        id: 'task-service-reminder',
        toolName: 'prepare_service_reminder',
        label: 'Prepare Sunday Service Worship Reminder',
        params: { serviceDate: 'Upcoming Sunday', templateLanguage: isTa ? 'ta' : 'en' }
      });
    } else if (isBirthdayQuery) {
      if (p.includes('prepare') || p.includes('send') || p.includes('greeting') || p.includes('வாழ்த்து')) {
        intents.push('birthday_greetings', 'action_proposal');
        tasks.push({
          id: 'task-prepare-birthday-greetings',
          toolName: 'prepare_birthday_greetings',
          label: 'Prepare Birthday Greetings WhatsApp Campaign',
          params: {}
        });
      } else {
        intents.push('upcoming_birthdays');
        tasks.push({
          id: 'task-upcoming-birthdays',
          toolName: 'get_upcoming_birthdays',
          label: 'Upcoming Member Birthdays (Next 30 Days)',
          params: { windowDays: 30 }
        });
      }
    } else if (isVolunteerQuery) {
      if (p.includes('prepare reminder') || p.includes('send reminder') || p.includes('remind')) {
        intents.push('volunteer_reminders', 'action_proposal');
        tasks.push({
          id: 'task-prepare-volunteer-reminders',
          toolName: 'prepare_volunteer_reminders',
          label: 'Prepare Volunteer Duty WhatsApp Reminders',
          params: { serviceDate: 'Upcoming Sunday' }
        });
      } else {
        intents.push('volunteer_schedule');
        tasks.push({
          id: 'task-volunteer-schedule',
          toolName: 'get_volunteer_service_schedule',
          label: 'Volunteers Assigned to Sunday Service & Vacancy Audit',
          params: { serviceDate: 'Upcoming Sunday' }
        });
      }
    } else if (isVisitorFollowupQuery) {
      intents.push('visitor_followup', 'action_proposal');
      tasks.push({
        id: 'task-visitor-followup',
        toolName: 'prepare_visitor_followup_list',
        label: 'Prepare Follow-up List for First-Time Visitors',
        params: {}
      });
    } else if (isAttendanceVisitorSummaryQuery) {
      intents.push('attendance_visitor_summary');
      tasks.push({
        id: 'task-attendance-visitor-summary',
        toolName: 'get_operational_attendance_visitor_summary',
        label: 'Synthesize Attendance and Visitor Numbers for Last Month',
        params: { periodText: 'last_month' }
      });
    } else if (isWhatsAppHistoryQuery) {
      intents.push('whatsapp_history');
      tasks.push({
        id: 'task-whatsapp-history',
        toolName: 'get_whatsapp_history',
        label: 'WhatsApp Message Delivery History & Logs',
        params: { limit: 15 }
      });
    } else if (isOperationsDashboardQuery) {
      intents.push('operations_dashboard');
      tasks.push({
        id: 'task-operations-dashboard',
        toolName: 'get_operations_dashboard_metrics',
        label: 'Church Operations & Communication Dashboard',
        params: {}
      });
    }

    // MULTI-PART & READ INTENTS

    // 1. Attendance Comparisons & Insights
    if ((p.includes('compare') && (p.includes('sunday') || p.includes('week') || p.includes('attendance') || p.includes('visitor'))) || p.includes('four sundays') || p.includes('4 sundays') || p.includes('attendance trend') || p.includes('ஒப்பீடு') || p.includes('ஒப்பிடுக')) {
      intents.push('attendance_trend');
      tasks.push({
        id: 'task-attendance-trend',
        toolName: 'get_attendance_trend',
        label: 'Attendance Comparison & Trend Across Last 4 Sundays',
        params: { weeksCount: 4 }
      });
    } else if ((p.includes('absent') && (p.includes('service') || p.includes('last service') || p.includes('sunday') || p.includes('meeting'))) || p.includes('absent from the last') || p.includes('absent from last') || p.includes('வருகை தராதவர்கள்')) {
      intents.push('member_absence');
      tasks.push({
        id: 'task-member-absence',
        toolName: 'get_member_absence_insights',
        label: 'Member Absenteeism Analysis for Last Service',
        params: { daysThreshold: 7 }
      });
    } else if (p.includes('attendance') || p.includes('attended') || p.includes('present') || p.includes('varukai') || p.includes('last sunday') || p.includes('highest attendance') || p.includes('வருகை')) {
      if (isLeadership || isLeader) {
        intents.push('attendance_summary');
        tasks.push({
          id: 'task-attendance-summary',
          toolName: 'get_attendance_summary',
          label: `Church Attendance Summary (${intent.entities.dateRange})`,
          params: { dateRange: intent.entities.dateRange }
        });
      } else {
        intents.push('my_attendance');
        tasks.push({
          id: 'task-my-attendance',
          toolName: 'get_my_attendance',
          label: 'Personal Attendance History',
          params: {}
        });
      }
    }

    // 2. Membership Insights, Growth & Data Hygiene
    if (p.includes('growth') || p.includes('six months') || p.includes('6 months') || p.includes('வளர்ச்சி') || (p.includes('joined') && (p.includes('months') || p.includes('trend')))) {
      intents.push('membership_growth');
      tasks.push({
        id: 'task-membership-growth',
        toolName: 'get_membership_growth',
        label: 'Membership Growth Over Last 6 Months',
        params: { monthsCount: 6 }
      });
    } else if (p.includes('incomplete') || p.includes('missing phone') || p.includes('missing email') || p.includes('missing info') || p.includes('முழுமையடையாத')) {
      intents.push('member_data_quality');
      tasks.push({
        id: 'task-member-data-quality-incomplete',
        toolName: 'get_member_data_quality',
        label: 'Incomplete Member Profiles Audit',
        params: { checkType: 'incomplete' }
      });
    } else if (p.includes('duplicate') || p.includes('duplicates') || p.includes('இரட்டை') || p.includes('போலி')) {
      intents.push('member_data_quality');
      tasks.push({
        id: 'task-member-data-quality-duplicates',
        toolName: 'get_member_data_quality',
        label: 'Potential Duplicate Member Records Detection',
        params: { checkType: 'duplicates' }
      });
    } else if (p.includes('active member') || p.includes('active members') || p.includes('how many active') || (p.includes('joined') && p.includes('month'))) {
      intents.push('membership_summary');
      tasks.push({
        id: 'task-membership-summary',
        toolName: 'get_membership_summary',
        label: 'Active Membership Summary & New Joins This Month',
        params: {}
      });
    } else if (p.includes('how many members') || p.includes('member count') || p.includes('total members') || p.includes('how many people in church') || p.includes('number of members')) {
      intents.push('member_count');
      tasks.push({
        id: 'task-member-count',
        toolName: isLeadership ? 'get_member_count' : 'get_my_profile',
        label: 'Church Membership Count & Demographics',
        params: {}
      });
    }

    // 3. Ministry Attendance & Breakdown
    if (p.includes('highest attendance ministry') || p.includes('ministry attendance') || p.includes('highest attendance') || p.includes('which ministry had')) {
      intents.push('ministry_attendance');
      tasks.push({
        id: 'task-ministry-attendance',
        toolName: 'get_ministry_attendance',
        label: 'Ministry Attendance Breakdown',
        params: { dateRange: intent.entities.dateRange }
      });
    }

    // 4. Ministry Overview & Upcoming Activities
    if (p.includes('belong to each ministry') || p.includes('ministries recorded attendance') || p.includes('participation trend') || p.includes('each ministry')) {
      intents.push('ministry_summary');
      tasks.push({
        id: 'task-ministry-summary',
        toolName: 'get_ministry_summary',
        label: 'Church Ministries Overview & Participation Statistics',
        params: {}
      });
    } else if (p.includes('scheduled activities') || p.includes('activities are coming up') || p.includes('upcoming activities')) {
      intents.push('upcoming_activities');
      tasks.push({
        id: 'task-upcoming-activities',
        toolName: 'get_upcoming_activities',
        label: 'Upcoming Scheduled Ministry Activities',
        params: { daysAhead: 30 }
      });
    } else if (p.includes('ministry members') || p.includes('members of') || (p.includes('show me') && intent.entities.ministryName) || (p.includes('who is in') && intent.entities.ministryName)) {
      intents.push('ministry_members');
      tasks.push({
        id: 'task-ministry-members',
        toolName: 'get_ministry_members',
        label: `Ministry Members (${intent.entities.ministryName || 'General'})`,
        params: { ministryIdOrName: intent.entities.ministryName || selectedMinistryId }
      });
    }

    // 5. My Profile & User-specific
    if (p.includes('my profile') || p.includes('who am i') || p.includes('my details')) {
      intents.push('my_profile');
      tasks.push({
        id: 'task-my-profile',
        toolName: 'get_my_profile',
        label: 'Personal Member Profile',
        params: {}
      });
    }

    if (p.includes('my assignments') || p.includes('my roster') || p.includes('duty') || (p.includes('assignment') && !isLeader)) {
      intents.push('my_assignments');
      tasks.push({
        id: 'task-my-assignments',
        toolName: 'get_my_assignments',
        label: 'Personal Roster Duty Assignments',
        params: {}
      });
    }

    if (p.includes('my ministry') || p.includes('my ministries') || p.includes('which ministry i am in')) {
      intents.push('my_ministries');
      tasks.push({
        id: 'task-my-ministries',
        toolName: 'get_my_ministries',
        label: 'User Ministry Belonging List',
        params: {}
      });
    }

    // 6. Visitors & Follow-ups
    if (p.includes('visitor') || p.includes('guest') || p.includes('pending follow') || p.includes('follow-up')) {
      intents.push('visitor_summary');
      tasks.push({
        id: 'task-visitor-summary',
        toolName: 'get_visitor_summary',
        label: 'Visitor & Pending Follow-up Summary',
        params: {}
      });
    }

    // 7. Absence Follow-up
    if (p.includes('no attendance') || p.includes('absent members') || p.includes('haven\'t attended') || p.includes('absence follow-up')) {
      intents.push('absence_followup');
      tasks.push({
        id: 'task-absence-followup',
        toolName: 'get_absence_followup_summary',
        label: 'Absence Follow-up Summary (Past 30 Days)',
        params: { daysThreshold: 30 }
      });
    }

    // 8. Events & Attendance Reconciliation
    if (p.includes('compare attendance across recent events') || p.includes('events need an attendance report') || (p.includes('attendance') && p.includes('event')) || p.includes('event attendance')) {
      intents.push('event_attendance');
      tasks.push({
        id: 'task-event-attendance',
        toolName: 'get_event_attendance',
        label: 'Recent Events Attendance Reconciliation & Reporting Status',
        params: {}
      });
    } else if (p.includes('event') || p.includes('events') || p.includes('calendar') || p.includes('schedule') || p.includes('coming this week') || p.includes('நிகழ்ச்சி')) {
      intents.push('events');
      tasks.push({
        id: 'task-events',
        toolName: 'get_upcoming_events',
        label: 'Upcoming Church Events',
        params: {
          limit: p.includes('next event') || p.includes('registered for the next') ? 1 : 5,
          timeframe: p.includes('this week') ? 'this_week' : 'upcoming'
        }
      });
    }

    // 9. Sunday School
    if (p.includes('sunday school') || p.includes('students') || p.includes('children class') || p.includes('class summary')) {
      intents.push('sunday_school');
      tasks.push({
        id: 'task-sunday-school',
        toolName: 'get_class_summary',
        label: 'Sunday School Classes & Students Summary',
        params: {}
      });
    }

    // 10. Prayers
    if (p.includes('prayer') || p.includes('prayer request') || p.includes('jepam') || p.includes('urgent')) {
      intents.push('prayers');
      tasks.push({
        id: 'task-prayers',
        toolName: 'get_prayer_summary',
        label: 'Prayer Requests Summary',
        params: {}
      });
    }

    // 10B. Families & Households
    if (p.includes('family') || p.includes('families') || p.includes('household') || p.includes('குடும்பம்')) {
      if (p.includes('my family') || p.includes('our family') || (!isLeadership && !p.includes('search') && !p.includes('all'))) {
        intents.push('my_family');
        tasks.push({
          id: 'task-my-family',
          toolName: 'get_my_family',
          label: 'My Family Profile & Household Members',
          params: {}
        });
      } else if (p.includes('search') || p.includes('find') || p.includes('all') || p.includes('list')) {
        intents.push('family_search');
        tasks.push({
          id: 'task-search-families',
          toolName: isLeadership ? 'search_families' : 'get_my_family',
          label: 'Search Church Families',
          params: { query: intent.entities.memberName || prompt }
        });
      } else {
        intents.push('family_details');
        tasks.push({
          id: 'task-family-details',
          toolName: 'get_family_details',
          label: 'Church Family Details',
          params: { familyName: intent.entities.memberName }
        });
      }
    }

    // 10C. Announcements & Bulletins (Read)
    const isAnnouncementWrite = p.includes('announcement') && (p.includes('create') || p.includes('publish') || p.includes('post') || p.includes('make') || p.includes('new') || p.includes('draft'));
    if (!isAnnouncementWrite && (p.includes('announcement') || p.includes('announcements') || p.includes('bulletin') || p.includes('notice') || p.includes('church update') || p.includes('அறிவிப்பு') || p.includes('அறிவிப்புகள்'))) {
      intents.push('announcements');
      tasks.push({
        id: 'task-announcements',
        toolName: 'get_announcements',
        label: 'Church Announcements & Bulletins',
        params: { limit: 5 }
      });
    }

    // 11. Reports & Executive Summaries
    if (p.includes('report') || p.includes('create report') || p.includes('generate report') || p.includes('health') || p.includes('vitality') || p.includes('அறிக்கை')) {
      intents.push('reports');
      const isCreateOrGenerate = p.includes('create') || (p.includes('generate') && !p.includes('summary'));
      if (isCreateOrGenerate) {
        if (p.includes('attendance')) {
          tasks.push({ id: 'task-report-attendance', toolName: 'generate_attendance_report', label: 'Attendance Report Generation', params: { dateRange: intent.entities.dateRange } });
        } else if (p.includes('ministry')) {
          tasks.push({ id: 'task-report-ministry', toolName: 'generate_ministry_report', label: 'Ministry Report Generation', params: { ministryName: intent.entities.ministryName } });
        } else if (p.includes('health') || p.includes('vitality') || p.includes('overall')) {
          tasks.push({ id: 'task-report-health', toolName: 'get_church_report', label: 'Church Health & Vitality Scorecard', params: { reportType: 'health' } });
        } else if (p.includes('giving') || p.includes('financial') || p.includes('finance')) {
          tasks.push({ id: 'task-report-giving', toolName: 'get_church_report', label: 'Financial & Giving Report', params: { reportType: 'giving' } });
        } else {
          tasks.push({ id: 'task-report-member', toolName: 'generate_member_report', label: 'Member Report Generation', params: {} });
        }
      } else {
        if (p.includes('attendance')) {
          tasks.push({ id: 'task-report-attendance', toolName: 'get_report_summary', label: 'Attendance Report Summary', params: { reportType: 'attendance', dateRange: intent.entities.dateRange } });
        } else if (p.includes('ministry')) {
          tasks.push({ id: 'task-report-ministry', toolName: 'get_report_summary', label: 'Ministry Report Summary', params: { reportType: 'ministry', ministryName: intent.entities.ministryName } });
        } else if (p.includes('giving') || p.includes('financial') || p.includes('finance')) {
          tasks.push({ id: 'task-report-giving', toolName: 'get_report_summary', label: 'Financial & Giving Report Summary', params: { reportType: 'giving' } });
        } else if (p.includes('visitor')) {
          tasks.push({ id: 'task-report-visitor', toolName: 'get_report_summary', label: 'Visitor Assimilation Report Summary', params: { reportType: 'visitor' } });
        } else if (p.includes('health') || p.includes('vitality') || p.includes('overall') || p.includes('executive')) {
          tasks.push({ id: 'task-report-health', toolName: 'get_report_summary', label: 'Executive Church Health & Vitality Scorecard', params: { reportType: 'health' } });
        } else {
          tasks.push({ id: 'task-report-member', toolName: 'get_report_summary', label: 'Membership Report Summary', params: { reportType: 'membership' } });
        }
      }
    }

    // 12. Bible Search & Scripture Lookup
    const bibleKeywords = [
      'bible', 'verse', 'scripture', 'passage', 'chapter', 'testament',
      'வசனம்', 'வேதம்', 'வேத வசனம்', 'ரோமர்', 'சங்கீதம்', 'யோவான்', 'பிலிப்பியர்', 'நீதிமொழிகள்', 'ஏசாயா',
      'john 3:16', 'romans 8:28', 'psalm 23', 'psalm 91', 'philippians 4:13', 'jeremiah 29:11', 'proverbs 3:5',
      'matthew 6:33', 'matthew 28', 'isaiah 40:31', 'forgiveness', 'faith', 'peace', 'love', 'anxiety', 'fear',
      'strength', 'comfort', 'healing', 'hope', 'wisdom', 'tithe', 'fruit of the spirit', 'armor of god'
    ];
    if (bibleKeywords.some(kw => p.includes(kw))) {
      intents.push('bible');
      tasks.push({
        id: 'task-bible',
        toolName: 'search_bible',
        label: 'Bible Verse & Scripture Lookup',
        params: { query: prompt }
      });
    }

    // Default fallback task assignment if no specific intents matched
    if (tasks.length === 0) {
      if (isLeadership) {
        intents.push('member_count', 'attendance_summary');
        tasks.push({ id: 'task-member-count', toolName: 'get_member_count', label: 'Church Membership Directory', params: {} });
        tasks.push({ id: 'task-attendance-summary', toolName: 'get_attendance_summary', label: 'Attendance Summary', params: { dateRange: 'this_month' } });
      } else if (normRole === 'MinistryLeader') {
        intents.push('my_ministries', 'my_assignments');
        tasks.push({ id: 'task-my-ministries', toolName: 'get_my_ministries', label: 'My Ministry Overview', params: {} });
        tasks.push({ id: 'task-my-assignments', toolName: 'get_my_assignments', label: 'Ministry Assignments', params: {} });
      } else {
        intents.push('my_assignments', 'my_attendance');
        tasks.push({ id: 'task-my-assignments', toolName: 'get_my_assignments', label: 'My Assignments', params: {} });
        tasks.push({ id: 'task-my-attendance', toolName: 'get_my_attendance', label: 'My Attendance', params: {} });
      }
    }

    intent.intents = Array.from(new Set(intents));
    intent.primaryIntent = intent.intents[0] || 'general_inquiry';

    return {
      prompt,
      intent,
      tasks
    };
  },

  /**
   * Main Entry Point to process any Church AI request
   */
  async processUserRequest(options: AskEngineOptions): Promise<{
    responseText: string;
    requiresConfirmation?: boolean;
    proposedActionPayload?: any;
    trace?: ChurchAiTrace;
  }> {
    const { prompt, churchId, userRole, userName, userEmail, memberId, activeTabOrScreen, debugMode, engineMode = 'general', selectedMinistryId, actionToExecute } = options;
    const startTime = Date.now();

    // 1. Build Security Context
    const ctx = this.buildUserSecurityContext(options);

    // 2. Prompt Security & Injection Guard
    if (prompt) {
      const securityCheck = sanitizePrompt(prompt);
      if (!securityCheck.isSafe) {
        await auditService.logAction(ctx.churchId, {
          action: 'church_ai_security_violation_blocked',
          resource_type: 'AI_PROMPT_INJECTION',
          actor_name: ctx.userName,
          actor_role: ctx.userRole,
          details: { prompt, reason: securityCheck.reason }
        }).catch(() => {});

        return {
          responseText: `🛡️ **Security Alert: Request Blocked**\n\n${securityCheck.reason || 'This prompt violates application safety policy. System instructions, administrative credentials, and role privileges cannot be overridden.'}`
        };
      }
    }

    // 2. Action execution confirmation handler
    if (actionToExecute) {
      let result: ToolExecutionResult;
      const aType = actionToExecute.actionType;
      const payload = actionToExecute.payload || actionToExecute;

      if (aType === 'CREATE_ANNOUNCEMENT') {
        result = await churchAiToolRegistry.execute_create_announcement(actionToExecute, ctx);
      } else if (aType === 'CREATE_ASSIGNMENT') {
        result = await churchAiToolRegistry.execute_create_assignment(actionToExecute, ctx);
      } else if (aType === 'SEND_WHATSAPP_SERVICE_REMINDER') {
        result = await churchAiToolRegistry.execute_send_service_reminder(payload, ctx);
      } else if (aType === 'SEND_WHATSAPP_BIRTHDAY_GREETING') {
        result = await churchAiToolRegistry.execute_send_birthday_greeting(payload, ctx);
      } else if (aType === 'SEND_WHATSAPP_VOLUNTEER_REMINDER') {
        result = await churchAiToolRegistry.execute_send_volunteer_reminders(payload, ctx);
      } else if (aType === 'SEND_WHATSAPP_VISITOR_WELCOME') {
        result = await churchAiToolRegistry.execute_send_visitor_welcome(payload, ctx);
      } else if (aType === 'COMPLETE_VISITOR_FOLLOWUP') {
        result = await churchAiToolRegistry.complete_visitor_followup(payload, ctx);
      } else if (aType === 'RETRY_FAILED_WHATSAPP_MESSAGE') {
        result = await churchAiToolRegistry.retry_failed_whatsapp_message(payload, ctx);
      } else {
        result = await churchAiToolRegistry.execute_create_assignment(actionToExecute, ctx);
      }

      await auditService.logAction(churchId, {
        action: 'church_ai_action_executed',
        resource_type: aType,
        actor_name: userName || 'User',
        actor_role: userRole || 'Member',
        details: actionToExecute
      }).catch(() => {});

      let successSummary = result.data?.message || 'Operation completed successfully.';
      if (result.data?.broadcastSummary) {
        const bs = result.data.broadcastSummary;
        successSummary = `📢 **Broadcast Queued Successfully!**\n\n- **Campaign:** \`${bs.campaignId || 'WHATSAPP_BROADCAST'}\`\n- **Messages Queued:** **${bs.sentCount}**\n- **Suppressed (Opted-out):** ${bs.optedOutExcludedCount}\n- **Failed:** ${bs.failedCount}\n- **Execution Environment:** \`${bs.environment || 'production'}\``;
      }

      return {
        responseText: result.success ? `✅ **Action Confirmed & Executed!**\n\n${successSummary}` : `❌ **Action Failed:** ${result.error}`,
      };
    }

    // 3. Task Decomposition
    const plan = this.decomposeRequest(prompt, ctx, activeTabOrScreen, options.history, engineMode, selectedMinistryId);

    const trace: ChurchAiTrace = {
      requestId: `cai-${Date.now()}`,
      timestamp: new Date().toISOString(),
      engineMode,
      userRole: ctx.userRole,
      language: plan.intent.language,
      intents: plan.intent.intents,
      entities: plan.intent.entities,
      tasks: plan.tasks.map(t => ({ id: t.id, toolName: t.toolName, label: t.label })),
      toolsExecuted: [],
      executionTimeMs: 0,
      completenessCheck: []
    };

    // 4. Tool Execution & Validation Layer
    const toolOutputs: Record<string, any> = {};
    const validatedResults: ValidatedTaskResult[] = [];
    let actionPayloadToPropose: any = null;
    let actionRequiresConfirmation = false;

    const toolPromises = plan.tasks.map(async (task) => {
      trace.toolsExecuted.push(task.toolName);

      const registryMethod = (churchAiToolRegistry as any)[task.toolName];
      let res: ToolExecutionResult;

      if (typeof registryMethod === 'function') {
        res = await registryMethod.call(churchAiToolRegistry, task.params, ctx);
      } else {
        res = { toolName: task.toolName, success: false, error: `Tool '${task.toolName}' is not registered.` };
      }

      let status: ValidatedTaskResult['status'] = 'valid';
      if (!res.success) {
        if (res.error?.includes('Access Denied')) status = 'permission_denied';
        else status = 'service_failure';
      } else if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
        status = 'no_records';
      }

      if (res.requiresActionConfirmation) {
        actionRequiresConfirmation = true;
        actionPayloadToPropose = res.proposedActionPayload;
      }

      validatedResults.push({
        taskId: task.id,
        toolName: task.toolName,
        label: task.label,
        status,
        data: res.data,
        error: res.error,
        requiresConfirmation: res.requiresActionConfirmation,
        proposedActionPayload: res.proposedActionPayload
      });

      if (res.success) {
        toolOutputs[task.toolName] = res.data;
        trace.completenessCheck.push({ task: task.label, status: 'completed' });
      } else {
        trace.completenessCheck.push({ task: task.label, status: status === 'permission_denied' ? 'denied' : 'unavailable' });
      }
    });

    await Promise.all(toolPromises);

    // 5. Response Generation via Gemini LLM or Factual Synthesizer
    const apiKey = getGeminiApiKey();
    let responseText = '';

    if (apiKey && !actionRequiresConfirmation) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const fullPrompt = `${SYSTEM_INSTRUCTION}

[USER ROLE]: ${ctx.userRole} (${ctx.userName})
[USER LANGUAGE]: ${plan.intent.language.toUpperCase()}
[ENGINE MODE]: ${engineMode.toUpperCase()}
[REQUESTED INTENTS]: ${plan.intent.intents.join(', ')}
[VERIFIED CHURCH TOOL RESULTS]:
${JSON.stringify(toolOutputs, null, 2)}

[COMPLETENESS CHECK]:
${JSON.stringify(trace.completenessCheck, null, 2)}

[USER PROMPT]:
${prompt}`;

        let genText = '';
        const candidateModels = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.8-flash'];
        for (const modelName of candidateModels) {
          try {
            const result = await ai.models.generateContent({
              model: modelName,
              contents: fullPrompt
            });
            if (result && result.text) {
              genText = result.text;
              break;
            }
          } catch (mErr) {
            // Fall through to next model
          }
        }
        if (genText) responseText = genText;
      } catch (geminiErr) {
        console.warn('Gemini API call skipped, using factual synthesizer:', geminiErr);
      }
    }

    if (!responseText) {
      responseText = this.synthesizeFactualResponse(prompt, plan, toolOutputs, validatedResults, ctx, trace);
    }

    trace.executionTimeMs = Date.now() - startTime;

    if (debugMode) {
      responseText += `\n\n---\n\`\`\`json\n// Developer / Admin Execution Trace\n${JSON.stringify(trace, null, 2)}\n\`\`\``;
    }

    // Audit Log
    try {
      await auditService.logAction(churchId, {
        action: 'church_ai_engine_query',
        resource_type: 'church_ai_engine',
        actor_name: userName || 'User',
        actor_role: userRole || 'Member',
        details: { prompt, intents: plan.intent.intents, taskCount: plan.tasks.length, executionTimeMs: trace.executionTimeMs }
      });
    } catch (e) {
      // Non-blocking
    }

    return {
      responseText,
      requiresConfirmation: actionRequiresConfirmation,
      proposedActionPayload: actionPayloadToPropose,
      trace
    };
  },

  /**
   * Factual Response Synthesizer
   */
  synthesizeFactualResponse(
    prompt: string,
    plan: ExecutionPlan,
    data: Record<string, any>,
    validatedResults: ValidatedTaskResult[],
    ctx: UserSecurityContext,
    trace: ChurchAiTrace
  ): string {
    const sections: string[] = [];
    const isTa = plan.intent.language === 'ta' || plan.intent.language === 'mixed';

    // Phase 3: WhatsApp Action Proposals & Confirmation Cards
    if (data.prepare_visitor_followup_list) {
      const vf = data.prepare_visitor_followup_list;
      const rows = (vf.followUpList && vf.followUpList.length > 0)
        ? vf.followUpList.map((v: any) =>
            `- **${v.visitorName}** (Visited: ${v.visitDate}) | Phone: \`${v.phoneMasked}\` | Consent: **${v.contactConsentGiven ? '✅ Explicit Opt-In' : '⚠️ No Consent'}**`
          ).join('\n')
        : 'No pending first-time visitors.';

      sections.push(`### 🤝 ${isTa ? 'முதல் முறை பார்வையாளர் தொடர் கவனிப்பு பட்டியல்' : 'First-Time Visitors Follow-Up List'}

Found **${vf.totalPendingVisitorsCount} pending visitor(s)** requiring pastoral care:

${rows}

**Sample Welcome Message:**
> ${vf.followUpList?.[0]?.suggestedMessageText || 'Welcome to church! We are glad you worshiped with us.'}

🛡️ *Contact consent verified. Messages will only be sent to visitors with explicit opt-in.*  
Please review the details above and click **Confirm / Send** below to dispatch.`);
      return sections.join('\n\n');
    }

    if (data.prepare_service_reminder || data.prepare_birthday_greetings || data.prepare_volunteer_reminders) {
      const p = data.prepare_service_reminder || data.prepare_birthday_greetings || data.prepare_volunteer_reminders;
      sections.push(`### 📲 ${isTa ? 'வாட்ஸ்அப் தகவல் அனுப்புதல் உறுதிப்படுத்தல்' : 'WhatsApp Action Confirmation Required'}

${p.explanation || 'Review the details below before dispatching messages.'}

- **Campaign:** \`${p.campaignType || 'OPERATIONAL_BROADCAST'}\`
- **Eligible Recipients:** **${p.totalEligibleRecipients || p.totalEligibleVolunteers || 0}**
${p.optedOutExcludedCount !== undefined ? `- **Opt-out Exclusions:** ${p.optedOutExcludedCount} recipients suppressed (privacy & STOP compliance)` : ''}
${p.templateId ? `- **Template:** \`${p.templateId}\`` : ''}

**Sample Message Preview:**
> ${p.sampleMessagePreview || 'Worship service reminder from your church.'}

> ⚠️ **Safe Action Guard:** Messages are queued in sandbox/configured Meta Cloud API. No live broadcasts occur without this explicit confirmation.`);
      return sections.join('\n\n');
    }

    // Proposed Action Confirmation Card (Legacy / General)
    if (data.propose_create_announcement || data.propose_create_assignment) {
      sections.push(`### 📝 ${isTa ? 'செயல்பாடு உறுதிப்படுத்தல் தேவை (Action Confirmation Required)' : 'Proposed Action Confirmation'}

I have prepared your request. Please review the proposed details below and click **Publish / Confirm** to execute.`);
      return sections.join('\n\n');
    }

    // ============================================================
    // PHASE 4: ADVANCED ANALYTICS & WORKFLOW AUTOMATION FORMATTERS
    // ============================================================

    // 1. Advanced Attendance Analytics
    if (data.get_advanced_attendance_analytics) {
      const a = data.get_advanced_attendance_analytics;
      const curr = a.currentPeriod;
      const prior = a.priorPeriod;
      const growthSymbol = a.isPositiveGrowth ? '▲' : '▼';

      const declineRows = (a.decliningAttendees && a.decliningAttendees.length > 0)
        ? a.decliningAttendees.slice(0, 5).map((d: any) =>
            `| **${d.name}** | \`${d.phoneMasked}\` | ${d.priorAttendanceCount} | ${d.recentAttendanceCount} | **-${d.percentageDrop}%** | ${d.lastAttendedDate || 'N/A'} |`
          ).join('\n')
        : '| *No significant attendance drop detected* | - | - | - | - | - |';

      const gapRows = (a.dataQualityGaps && a.dataQualityGaps.length > 0)
        ? a.dataQualityGaps.map((g: any) =>
            `- ⚠️ **${g.serviceDate} (${g.serviceName})**: ${g.description} [Severity: *${g.severity}*]`
          ).join('\n')
        : '✅ No data quality gaps detected.';

      sections.push(`### 📊 ${isTa ? 'மேம்பட்ட வருகை பகுப்பாய்வு' : `Advanced Attendance Analytics (${a.timeframe.replace(/_/g, ' ').toUpperCase()})`}

- **Current Period Headcount:** **${curr.totalHeadcount}** (${curr.averageHeadcountPerService} avg/service across ${curr.totalSessions} services)
- **Prior Period Comparison:** **${prior.totalHeadcount}** (${prior.averageHeadcountPerService} avg/service)
- **Growth Variance:** **${growthSymbol} ${a.variancePercentage}%** (${a.isPositiveGrowth ? 'Growth' : 'Decline'} compared to prior equivalent period)
- **First-Time Visitors:** **${a.firstTimeVisitorsCount}** (${a.visitorRatioPercent}% visitor ratio) | Returning Attendees: **${a.returningAttendeesCount}**

**📉 Declining Attendance / Disengagement Watchlist:**
| Member Name | Phone | Prior Count | Recent Count | Drop % | Last Attended |
| :--- | :--- | :--- | :--- | :--- | :--- |
${declineRows}

**🛡️ Attendance Data Quality Audit:**
${gapRows}

> 💡 *Executive Summary: ${a.insightsSummary}*`);
    }

    // 2. Advanced Membership Analytics
    if (data.get_advanced_membership_analytics) {
      const m = data.get_advanced_membership_analytics;
      const growthSymbol = m.membershipGrowthRatePercent >= 0 ? '▲' : '▼';

      const convertedRows = (m.conversions?.convertedList && m.conversions.convertedList.length > 0)
        ? m.conversions.convertedList.slice(0, 5).map((c: any) =>
            `- **${c.name}** (\`${c.phoneMasked}\`): First visited ${c.firstVisitDate}, converted in ${c.daysToConversion} days.`
          ).join('\n')
        : 'No visitors converted in this period.';

      const ministryRows = (m.ministryBelongingBreakdown && m.ministryBelongingBreakdown.length > 0)
        ? m.ministryBelongingBreakdown.map((mb: any) =>
            `| ${mb.ministryName} | **${mb.membersCount}** | ${mb.percentageOfChurch}% |`
          ).join('\n')
        : '';

      sections.push(`### 👥 ${isTa ? 'மேம்பட்ட உறுப்பினர் பகுப்பாய்வு' : `Advanced Membership Analytics (${m.timeframe.replace(/_/g, ' ').toUpperCase()})`}

- **Total Registered Members:** **${m.totalMembers}** | Active: **${m.activeMembers}** (${m.activeMembershipRatePercent}% active rate)
- **New Joins in Period:** **${m.newMembersJoinedInPeriod}** (Prior Period: ${m.priorPeriodNewMembers}) | Net Growth: **${growthSymbol} ${m.membershipGrowthRatePercent}%**
- **Visitor-to-Member Conversion:** **${m.conversions.conversionRatePercent}%** (${m.conversions.convertedToMembersCount} converted out of ${m.conversions.totalFirstTimeVisitors} visitors)
- **12-Month Retention Rate:** **${m.retentionRate12MonthsPercent}%**
- **Data Hygiene Score:** **${m.dataQualityHygiene.hygieneScorePercent}%** (${m.dataQualityHygiene.incompleteProfilesCount} incomplete profiles, ${m.dataQualityHygiene.potentialDuplicatesCount} suspected duplicates)

**🤝 Recent Visitor-to-Member Conversions:**
${convertedRows}

**🕊️ Ministry Belonging Breakdown:**
| Ministry | Active Members | Church Share % |
| :--- | :--- | :--- |
${ministryRows}

> 💡 *Executive Summary: ${m.insightsSummary}*`);
    }

    // 3. Advanced Event Analytics
    if (data.get_advanced_event_analytics) {
      const ev = data.get_advanced_event_analytics;
      const eventRows = (ev.eventsList && ev.eventsList.length > 0)
        ? ev.eventsList.map((e: any) =>
            `| **${e.title}** | ${e.date} | ${e.category} | ${e.registeredCount} | ${e.actualTurnoutCount} | **${e.turnoutVariancePercent}%** | ${e.volunteerCount} |`
          ).join('\n')
        : '| *No events recorded* | - | - | - | - | - | - |';

      sections.push(`### 🎪 ${isTa ? 'நிகழ்ச்சி வருகை & தன்னார்வலர் பகுப்பாய்வு' : `Advanced Event Turnout & Volunteer Analytics (${ev.timeframe.replace(/_/g, ' ').toUpperCase()})`}

- **Total Events:** **${ev.totalEventsCompleted}** completed (${ev.totalEventsScheduled} scheduled)
- **Overall Registration:** **${ev.overallRegistrationCount}** | Actual Turnout: **${ev.overallActualTurnout}**
- **Overall Turnout Rate:** **${ev.overallTurnoutRatePercent}%**
- **Average Volunteer Participation:** **${ev.averageVolunteersPerEvent} volunteers / event**

| Event | Date | Category | RSVPs | Turnout | Turnout Rate | Volunteers |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${eventRows}

> 💡 *Turnout Insights: ${ev.insightsSummary}*`);
    }

    // 4. Advanced Communication Analytics
    if (data.get_communication_analytics) {
      const c = data.get_communication_analytics;
      const campRows = (c.campaignMetrics && c.campaignMetrics.length > 0)
        ? c.campaignMetrics.map((camp: any) =>
            `| **${camp.categoryLabel}** (\`${camp.templateName}\`) | ${camp.attemptedCount} | ${camp.deliveredCount} | ${camp.readCount} | ${camp.failedCount} | **${camp.deliveryRatePercent}%** |`
          ).join('\n')
        : '| *No campaign records* | - | - | - | - | - |';

      sections.push(`### 📲 ${isTa ? 'வாட்ஸ்அப் தகவல் விநியோக பகுப்பாய்வு' : `WhatsApp Communication & Delivery Analytics (${c.timeframe.replace(/_/g, ' ').toUpperCase()})`}

- **Total Messages Attempted:** **${c.totalMessagesAttempted}**
- **Delivery Rate:** **${c.deliveryRatePercent}%** (${c.totalDelivered} delivered)
- **Read Rate:** **${c.readRatePercent}%** (${c.totalRead} confirmed read)
- **Failure Rate:** **${c.failureRatePercent}%** (${c.totalFailed} delivery failures)
- **Opt-Out Compliance:** **${c.optOutRatePercent}%** (${c.activeOptOutSubscribersCount} total opted-out subscribers honored)

**📊 Campaign Performance Breakdown:**
| Campaign / Template | Attempted | Delivered | Read | Failed | Delivery Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
${campRows}

> 💡 *Communication Insights: ${c.insightsSummary}*`);
    }

    // 5. Workflow Automation Rules
    if (data.get_workflow_automation_rules) {
      const rules = data.get_workflow_automation_rules;
      const ruleRows = Array.isArray(rules)
        ? rules.map((r: any) =>
            `| **${r.name}** | \`${r.category}\` | ${r.thresholdValue} ${r.thresholdUnit} | \`${r.targetAction}\` | **${r.enabled ? '🟢 Active' : '⚪ Disabled'}** |`
          ).join('\n')
        : '';

      sections.push(`### ⚙️ ${isTa ? 'தானியங்கி பணிப்பாய்வு விதிகள்' : 'Configured Workflow Automation Rules'}

All automation workflows enforce **Human-in-the-Loop** safeguards (\`requiresApproval: true\`). Actions are staged for administrative review before dispatch.

| Workflow Rule | Category | Trigger Threshold | Proposed Action | Status |
| :--- | :--- | :--- | :--- | :--- |
${ruleRows}

> 💡 *You can trigger an automated sweep anytime by saying: "Run workflow automations" or navigating to the Automation Hub in Reports.*`);
    }

    // 6. Evaluate Workflow Automations
    if (data.evaluate_workflow_automations) {
      const ev = data.evaluate_workflow_automations;
      const logs = ev.logs || [];
      const allActions = logs.flatMap((l: any) => l.proposedActions || []);

      const actionRows = allActions.length > 0
        ? allActions.map((a: any) =>
            `| **${a.targetName}** | \`${a.ruleId}\` | ${a.actionSummary} | **⏳ Pending Approval** |`
          ).join('\n')
        : '| *No actions required* | - | All conditions normal | - |';

      sections.push(`### 🚀 ${isTa ? 'தானியங்கி பணிப்பாய்வு மதிப்பீட்டு முடிவுகள்' : 'Workflow Automation Evaluation Results'}

**Rules Evaluated:** ${ev.rulesEvaluated || logs.length}  
**Actions Staged for Approval:** **${ev.totalActionsProposed}**

| Target Recipient / Role | Triggered Rule | Proposed Action Summary | Status |
| :--- | :--- | :--- | :--- |
${actionRows}

> 🛡️ **Human-in-the-Loop Safeguard:** These actions have been staged in the pending approval queue. No automated WhatsApp messages or record alterations were dispatched without administrative authorization.  
> 👉 Review and approve them in the **Automation Hub** under Reports.`);
    }

    // ============================================================
    // PHASE 3: FACTUAL DATA FORMATTERS
    // ============================================================

    // 1. Operational Absentees (4+ Consecutive Sundays)
    if (data.get_operational_absentees) {
      const abs = data.get_operational_absentees;
      if (abs.absenteeList && abs.absenteeList.length > 0) {
        const rows = abs.absenteeList.map((m: any) =>
          `| **${m.name}** | \`${m.phoneMasked}\` | ${m.consecutiveMissedSundays} Sundays | ${m.lastAttendedDate} |`
        ).join('\n');

        sections.push(`### ⚠️ ${isTa ? 'தொடர்ந்து 4 ஞாயிறுகள் வராத உறுப்பினர்கள்' : 'Members Absent for 4+ Consecutive Sundays'}

**${abs.totalAbsentMembersCount} member(s)** have not attended church across evaluated dates: **${abs.evaluatedDates?.join(', ') || 'past 4 weeks'}**.

| Member Name | Phone (Masked) | Missed Consecutive | Last Attended |
| :--- | :--- | :--- | :--- |
${rows}

> 🛡️ *Privacy Note: Contact phone numbers are masked for privacy compliance.*  
> 💡 *Pastor Care Recommendation: ${abs.recommendedAction}*`);
      } else {
        sections.push(`### ✅ ${isTa ? 'தொடர்ந்து 4 ஞாயிறுகள் வராதவர்கள் இல்லை' : 'No Consecutive Absentees Detected'}

Great news! No members missed all 4 consecutive Sundays across the evaluated dates (${abs.evaluatedDates?.join(', ') || 'past 4 weeks'}).`);
      }
    }

    // 2. Upcoming Birthdays
    if (data.get_upcoming_birthdays) {
      const b = data.get_upcoming_birthdays;
      if (b.upcomingBirthdays && b.upcomingBirthdays.length > 0) {
        const rows = b.upcomingBirthdays.map((m: any) =>
          `| **${m.name}** | **${m.birthdayDisplay}** | in ${m.daysRemaining} days | ${m.alreadySentThisYear ? '✅ Already Greeted' : '⏳ Pending'} |`
        ).join('\n');

        sections.push(`### 🎂 ${isTa ? 'இந்த மாத பிறந்தநாட்கள்' : 'Upcoming Member Birthdays (Next 30 Days)'}

We found **${b.totalUpcomingBirthdaysCount} upcoming birthday(s)** in the church directory:

| Member Name | Birthday | Days Ahead | Status |
| :--- | :--- | :--- | :--- |
${rows}

> 🛡️ *${b.privacyNotice || 'Privacy Notice: Birth years are masked to protect member age privacy.'}*  
> 💡 *You can say: "Prepare birthday greetings" to review and dispatch personalized WhatsApp blessings.*`);
      } else {
        sections.push(`### 🎂 ${isTa ? 'பிறந்தநாட்கள் எதுவும் இல்லை' : 'No Upcoming Birthdays'}

There are no member birthdays recorded in the upcoming ${b.windowDays || 30}-day window.

> 🛡️ *Privacy Notice: Birth years are masked to protect member age privacy.*`);
      }
    }

    // 3. Volunteer Service Schedule & Vacancies
    if (data.get_volunteer_service_schedule) {
      const vol = data.get_volunteer_service_schedule;
      const rosterRows = (vol.roster && vol.roster.length > 0)
        ? vol.roster.map((r: any) => `| ${r.ministryName} | **${r.roleName}** | ${r.assigneeName} | \`${r.status}\` |`).join('\n')
        : '| *No assignments* | - | - | - |';

      let gapSection = '';
      if (vol.unfilledGaps && vol.unfilledGaps.length > 0) {
        const gapRows = vol.unfilledGaps.map((g: any) =>
          `- ⚠️ **${g.ministryName}**: Missing volunteer for **${g.roleName}** (${g.serviceDate}) [Priority: *${g.priority}*]`
        ).join('\n');
        gapSection = `\n\n**🚨 Unfilled Roster Vacancies (${vol.totalUnfilledVacancies}):**\n${gapRows}`;
      } else {
        gapSection = `\n\n✅ **All service volunteer positions are fully staffed!**`;
      }

      sections.push(`### 👥 ${isTa ? 'இந்த ஞாயிறு தன்னார்வலர் அட்டவணை' : `Volunteers Assigned for ${vol.serviceDate || 'This Sunday'}`}

**Total Assigned Volunteers:** **${vol.totalAssignedVolunteers}**  
**Unfilled Gaps:** **${vol.totalUnfilledVacancies}**

| Ministry | Role | Assigned Member | Status |
| :--- | :--- | :--- | :--- |
${rosterRows}${gapSection}

> 💡 *You can say: "Prepare reminders for volunteers" to send them WhatsApp service alerts.*`);
    }

    // 4. Operational Attendance & Visitor Summary (Last Month)
    if (data.get_operational_attendance_visitor_summary) {
      const sum = data.get_operational_attendance_visitor_summary;
      const rows = (sum.serviceBreakdown && sum.serviceBreakdown.length > 0)
        ? sum.serviceBreakdown.map((s: any) =>
            `| ${s.date} | ${s.title} | **${s.totalHeadcount}** | ${s.membersPresent} | ${s.visitorsCount} |`
          ).join('\n')
        : '| - | No services found | 0 | 0 | 0 |';

      sections.push(`### 📈 ${isTa ? 'கடந்த மாத வருகை & புதியவர்கள் சுருக்கம்' : `Attendance & Visitor Summary (${sum.periodText || 'Last Month'})`}

- **Total Services Held:** **${sum.totalServicesCount}**
- **Total Headcount Recorded:** **${sum.totalHeadcount}** (Average: **${sum.averageHeadcountPerService}** worshippers/service)
- **Registered Members Present:** **${sum.totalRegisteredMembersPresent}**
- **First-Time Visitors Welcomed:** **${sum.totalFirstTimeVisitorsCount}**

| Service Date | Service Name | Total Headcount | Members | Visitors |
| :--- | :--- | :--- | :--- | :--- |
${rows}

> 💡 *Insights: ${sum.explanation}*`);
    }

    // 5. Operations Dashboard & WhatsApp Delivery Metrics
    if (data.get_operations_dashboard_metrics) {
      const db = data.get_operations_dashboard_metrics;
      const m = db.metrics;
      const p = db.providerStatus;

      sections.push(`### 📊 ${isTa ? 'செயல்பாட்டு கட்டுப்பாட்டு அறை (Operations Dashboard)' : 'Church Operations & Communication Dashboard'}

**Meta WhatsApp Cloud API Status:**  
- **Environment:** \`${p.environment}\` (${p.isConfigured ? '🟢 Connected' : '🟡 Sandbox / Simulation Mode'})
- **Provider:** ${p.provider} | **Sender ID:** \`${p.phoneNumberIdMasked}\`

**Key Performance Indicators (Past 30 Days):**
- **Messages Dispatched:** **${m.totalSentPast30Days}**
- **Delivered:** **${m.deliveredCount}** (${m.deliverySuccessRate} success rate)
- **Failed:** **${m.failedCount}**
- **Opted Out (STOP):** **${m.optedOutCount}**

**Action Queues:**
- 🤝 **Pending Visitor Follow-ups:** **${m.pendingVisitorFollowUps}**
- 🎂 **Upcoming Birthdays (30 Days):** **${m.upcomingBirthdaysCount}**
- ⚠️ **Unfilled Volunteer Vacancies:** **${m.unfilledVolunteerGapsCount}**`);
    }

    // 6. WhatsApp History Log
    if (data.get_whatsapp_history) {
      const h = data.get_whatsapp_history;
      if (h.messages && h.messages.length > 0) {
        const rows = h.messages.map((msg: any) =>
          `| ${msg.sentAt?.slice(0, 16)} | **${msg.recipientName}** | \`${msg.recipientPhoneMasked}\` | \`${msg.templateId}\` | **${msg.status.toUpperCase()}** |`
        ).join('\n');

        sections.push(`### 📬 ${isTa ? 'வாட்ஸ்அப் தகவல் வரலாறு' : 'WhatsApp Delivery History (Recent)'}

Showing **${h.messages.length}** of **${h.totalRecordsCount}** message records:

| Timestamp | Recipient | Phone | Template | Delivery Status |
| :--- | :--- | :--- | :--- | :--- |
${rows}

> 💡 *Note: Failed messages can be retried directly from the WhatsApp Hub.*`);
      } else {
        sections.push(`### 📬 ${isTa ? 'தகவல்கள் எதுவும் இல்லை' : 'No WhatsApp Messages Dispatched Yet'}

No messages have been dispatched in the current church environment.`);
      }
    }

    // Contextual Join Filter
    if (data.get_contextual_join_filter) {
      const f = data.get_contextual_join_filter;
      const periodText = f.periodLabel === 'this_year' ? 'this year (2026)' : 'this month (September 2026)';
      if (f.matchedMembers && f.matchedMembers.length > 0) {
        sections.push(`### 📍 ${isTa ? 'உறுப்பினர்கள் சேர்ந்த விவரம்' : `Members Matching Search (${f.locationContext})`}

Out of **${f.totalContextMembers} member(s)** from **${f.locationContext}**, **${f.matchedMembers.length} member(s)** joined ${periodText}:

${f.matchedMembers.map((m: any) => `- **${m.name}** (${m.status || 'Member'}) — Address: *${m.address || f.locationContext}* | Contact: ${m.phone || 'N/A'} | Joined: **${m.joinedDate}**`).join('\n')}`);
      } else {
        sections.push(`### 📍 ${isTa ? 'உறுப்பினர்கள் சேர்ந்த விவரம்' : `Members Matching Search (${f.locationContext})`}

Out of **${f.totalContextMembers} member(s)** from **${f.locationContext}**, **0 members** joined ${periodText}.`);
      }
    }

    // Personal Profile
    if (data.get_my_profile) {
      const p = data.get_my_profile;
      sections.push(`### 👤 ${isTa ? 'எனது சுயவிவரம் (My Profile)' : 'Personal Member Profile'}

- **Name:** **${p.name}**
- **Assigned Role:** \`${ctx.userRole}\`
- **Email:** ${p.email || 'N/A'}`);
    }

    // Personal Roster Duty Assignments
    if (data.get_my_assignments) {
      const a = data.get_my_assignments;
      if (a.assignments && a.assignments.length > 0) {
        const list = a.assignments.map((as: any) => `- **${as.roleName}**: **${as.serviceDate}** (${as.status})`).join('\n');
        sections.push(`### 📅 ${isTa ? 'எனது ஊழிய பணிகள் (My Assignments)' : 'My Roster Assignments'}

You have **${a.totalAssignmentsCount} upcoming assignment(s)**:

${list}`);
      } else {
        sections.push(`### 📅 ${isTa ? 'எனது ஊழிய பணிகள் (My Assignments)' : 'My Roster Assignments'}

You currently have **no upcoming roster assignments** scheduled.`);
      }
    }

    // Personal Attendance
    if (data.get_my_attendance) {
      const att = data.get_my_attendance;
      sections.push(`### ⛪ ${isTa ? 'எனது வருகை விவரம் (My Attendance)' : 'My Attendance Record'}

- **Attendance Standing:** **${att.attendanceRate}**
- **Total Logged Services:** ${att.totalPresent} present out of ${att.totalLoggedServices} records.`);
    }

    // My Ministries
    if (data.get_my_ministries) {
      const min = data.get_my_ministries;
      const list = min.ministries.map((m: any) => `- **${m.name}** (Leader: ${m.leaderName})`).join('\n');
      sections.push(`### 🕊️ ${isTa ? 'எனது ஊழியங்கள் (My Ministries)' : 'My Ministries'}

You belong to **${min.totalMinistries} church ministry team(s)**:

${list}`);
    }

    // Member Count & Membership Summary
    if (data.get_membership_summary) {
      const ms = data.get_membership_summary;
      const statusRows = ms.statusBreakdown
        ? Object.entries(ms.statusBreakdown).map(([status, count]) => `- **${status}:** ${count}`).join('\n')
        : '';
      sections.push(`### 👥 ${isTa ? 'சபை உறுப்பினர் சுருக்கம்' : 'Church Membership Overview'}

- **Total Registered Members:** **${ms.totalMembers}**
- **Active Members:** **${ms.activeMembers}** (${ms.inactiveMembers} inactive)
- **New Members Joined This Month:** **${ms.newMembersThisMonth}**
- **Gender Demographics:** ${ms.genderBreakdown?.male || 0} Male, ${ms.genderBreakdown?.female || 0} Female

**Status Breakdown:**
${statusRows}

> *${ms.explanation || 'Based on active church membership database records.'}*`);
    } else if (data.get_member_count) {
      const m = data.get_member_count;
      sections.push(`### 📊 ${isTa ? 'சபை உறுப்பினர்கள் விவரம்' : 'Church Membership Directory'}

- **Total Members:** **${m.totalMembers}** (${m.activeMembers} active, ${m.newMembersPast30DaysCount} new joins past 30 days)
- **Demographics:** ${m.genderBreakdown?.male || 0} Male, ${m.genderBreakdown?.female || 0} Female`);
    }

    // Membership Growth (6 Months)
    if (data.get_membership_growth) {
      const mg = data.get_membership_growth;
      const maxJoins = Math.max(...(mg.monthlyBreakdown?.map((m: any) => m.newJoinsCount) || [1]), 1);
      const rows = (mg.monthlyBreakdown && mg.monthlyBreakdown.length > 0)
        ? mg.monthlyBreakdown.map((m: any) => {
            const barLen = Math.max(1, Math.min(15, Math.round((m.newJoinsCount / maxJoins) * 12)));
            const bar = '█'.repeat(barLen);
            return `| ${m.monthLabel} | **+${m.newJoinsCount}** | \`${bar}\` | **${m.runningTotalMembers}** |`;
          }).join('\n')
        : '';

      sections.push(`### 📈 ${isTa ? 'கடந்த 6 மாத உறுப்பினர் வளர்ச்சி' : 'Membership Growth Over Last 6 Months'}

- **Total New Joins (Past 6 Months):** **+${mg.totalNewMembersInPeriod} members**
- **Current Total Membership:** **${mg.currentTotalMembers}**
- **Average Growth Velocity:** **${mg.averageNewJoinsPerMonth} new members / month** (${mg.growthRatePercent}% net growth)

| Month | New Joins | Volume | Running Total |
|---|---|---|---|
${rows}

> *${mg.explanation || 'Derived from verified member enrollment dates.'}*`);
    }

    // Member Data Quality & Duplicate Detection
    if (data.get_member_data_quality) {
      const dq = data.get_member_data_quality;
      const inc = dq.incompleteRecords;
      const dup = dq.potentialDuplicates;

      const incSamples = (inc?.sampleIncomplete && inc.sampleIncomplete.length > 0)
        ? `\n**Sample Profiles with Missing Info:**\n` +
          inc.sampleIncomplete.slice(0, 5).map((m: any) => `- **${m.name}**: Missing *${m.missingFields.join(', ')}*`).join('\n')
        : '';

      const dupPairs = (dup?.pairs && dup.pairs.length > 0)
        ? `\n**Suspected Duplicate Records:**\n` +
          dup.pairs.slice(0, 5).map((p: any) => `- **${p.memberA.name}** & **${p.memberB.name}** (${p.matchReason})`).join('\n')
        : 'No duplicate records detected.';

      sections.push(`### 🛡️ ${isTa ? 'உறுப்பினர் தரவு தணிக்கை' : 'Member Directory Data Quality Audit'}

- **Overall Data Quality Score:** **${dq.dataQualityScorePercent}%** (${dq.recordsWithIssuesCount} records with issues out of ${dq.totalMembersAudited} audited)
- **Incomplete Profiles:** **${inc?.totalIncomplete || 0}** (Missing Phone: ${inc?.missingPhoneCount || 0}, Missing Email: ${inc?.missingEmailCount || 0}, Missing Address: ${inc?.missingAddressCount || 0})
- **Potential Duplicate Pairs:** **${dup?.potentialDuplicatePairsCount || 0}**
${incSamples}
${dupPairs}

> 🔒 **Data Safety Guarantee:** ${dq.actionGuarantee || 'The AI Assistant never automatically merges or deletes member records. Review records in Church Settings / Members.'}`);
    }

    // Ministry Members
    if (data.get_ministry_members) {
      const mm = data.get_ministry_members;
      const list = mm.members && mm.members.length > 0
        ? mm.members.map((m: any) => `- **${m.name}** (${m.role}) — Phone: ${m.phone}`).join('\n')
        : 'No members assigned yet.';
      sections.push(`### 👥 ${isTa ? 'ஊழிய உறுப்பினர்கள்' : `${mm.ministryName} Members`}

Total Members: **${mm.totalMembers}** | Leader: **${mm.leaderName}**

${list}`);
    }

    // Attendance Summary
    if (data.get_attendance_summary) {
      const att = data.get_attendance_summary;
      const highestInfo = att.highestAttendanceService
        ? `- **Highest Service:** **${att.highestAttendanceService.serviceName}** (${att.highestAttendanceService.presentCount} attendees on ${att.highestAttendanceService.date})\n`
        : '';
      const breakdownRows = (att.serviceBreakdown && att.serviceBreakdown.length > 0)
        ? `\n**Service Breakdown:**\n| Date | Service | Members | Guests | Total |\n|---|---|---|---|---|\n` +
          att.serviceBreakdown.map((s: any) => `| ${s.date} | ${s.serviceName} | ${s.membersCount} | ${s.guestsCount} | **${s.totalPresent}** |`).join('\n')
        : '';

      sections.push(`### ⛪ ${isTa ? 'ஞாயிறு வருகை சுருக்கம்' : 'Sunday Attendance Summary'} (${att.dateRange})

- **Average Present Per Service:** **${att.averagePresentPerService} attendees**
- **Unique Attendees (Deduplicated):** **${att.uniqueAttendeesCount ?? att.totalPresent}**
- **Member vs Guest Breakdown:** **${att.registeredMembersPresent ?? 0} registered members**, **${att.guestVisitorsPresent ?? 0} visitors**
- **Total Sessions Analyzed:** ${att.totalSessions ?? att.totalRecordsLogged ?? 1} service logs
${highestInfo}
> *${att.explanation || 'Counts deduplicated across multiple services on the same day without double-counting.'}*
${breakdownRows}`);
    }

    // Attendance Trend (Last 4 Sundays)
    if (data.get_attendance_trend) {
      const tr = data.get_attendance_trend;
      const trendIcon = tr.trendDirection === 'growing' ? '📈' : tr.trendDirection === 'declining' ? '📉' : '➡️';
      const trendLabel = tr.trendDirection === 'growing' ? 'Growing (+)' : tr.trendDirection === 'declining' ? 'Declining (-)' : 'Stable';
      
      const rows = (tr.sundays && tr.sundays.length > 0)
        ? tr.sundays.map((s: any) => {
            const barLength = Math.max(1, Math.min(20, Math.round((s.totalPresent / (tr.highestSunday?.attendance || 100)) * 15)));
            const bar = '█'.repeat(barLength);
            return `| ${s.formattedDate} | **${s.totalPresent}** | ${s.membersCount} | ${s.guestsCount} | \`${bar}\` |`;
          }).join('\n')
        : '';

      sections.push(`### ${trendIcon} ${isTa ? 'கடந்த 4 ஞாயிறுகளின் வருகை ஒப்பீடு' : 'Attendance Trend & Comparison (Last 4 Sundays)'}

- **Average Attendance:** **${tr.averageAttendance} attendees**
- **Trend Direction:** **${trendLabel}** (${tr.percentChange >= 0 ? '+' : ''}${tr.percentChange}% overall change)
- **Highest Sunday:** **${tr.highestSunday?.formattedDate || tr.highestSunday?.date || 'N/A'}** (${tr.highestSunday?.attendance || 0} attendees)
- **Lowest Sunday:** **${tr.lowestSunday?.formattedDate || tr.lowestSunday?.date || 'N/A'}** (${tr.lowestSunday?.attendance || 0} attendees)

| Sunday Date | Total Attendees | Registered Members | Guests / Visitors | Relative Volume |
|---|---|---|---|---|
${rows}

> *${tr.explanation || 'Attendance deduplicated across services per Sunday.'}*`);
    }

    // Member Absenteeism Analysis (Last Service)
    if (data.get_member_absence_insights) {
      const abs = data.get_member_absence_insights;
      const samples = (abs.sampleAbsentMembers && abs.sampleAbsentMembers.length > 0)
        ? `\n**Sample Absent Members (Needing Pastoral Touch):**\n` +
          abs.sampleAbsentMembers.map((m: any) => `- **${m.name}** (Phone: \`${m.phoneMasked}\`, Last attended: ${m.lastAttendedDate || 'N/A'})`).join('\n')
        : '';

      sections.push(`### ⚠️ ${isTa ? 'கடைசி ஆராதனையில் வருகை தராதவர்கள்' : 'Member Absenteeism Analysis (Last Service)'}

- **Target Service:** **${abs.targetServiceName}** on **${abs.targetServiceDate}**
- **Registered Members Present:** **${abs.membersPresentCount}** out of **${abs.totalActiveRegisteredMembers}** active members
- **Registered Members Absent:** **${abs.membersAbsentCount} members** (${abs.absenteeismRatePercent}% absent)
- **Member Turnout Rate:** **${abs.turnoutRatePercent}%**
- **Guest / Visitor Attendees:** **${abs.guestAttendeesCount}** (Total Service Headcount: **${abs.totalActualHeadcount}**)
${samples}

> *${abs.explanation || 'Distinguishes registered covenant members from visitors.'}*`);
    }

    // Ministry Attendance Breakdown
    if (data.get_ministry_attendance) {
      const minAtt = data.get_ministry_attendance;
      const list = minAtt.ministries ? minAtt.ministries.map((m: any) => `- **${m.ministryName}**: Avg **${m.averageAttendance} present**`).join('\n') : '';
      sections.push(`### 🏆 ${isTa ? 'ஊழிய வருகை விவரம்' : 'Ministry Attendance Breakdown'}

Highest Attendance: **${minAtt.highestAttendanceMinistry?.ministryName || 'N/A'}**

${list}`);
    }

    // Ministries Summary & Engagement
    if (data.get_ministry_summary) {
      const ms = data.get_ministry_summary;
      const rows = (ms.ministries && ms.ministries.length > 0)
        ? ms.ministries.map((m: any) => {
            const attBadge = m.hasAttendanceThisMonth ? `✅ Yes (${m.totalPresentThisMonth} present)` : '⏳ Pending';
            return `| **${m.name}** | ${m.leaderName} | ${m.activeMembersCount} | ${attBadge} | ${m.upcomingActivitiesCount} |`;
          }).join('\n')
        : '';

      sections.push(`### 🕊️ ${isTa ? 'ஊழியங்களின் மேலோட்டம்' : 'Church Ministries Summary & Engagement'}

- **Active Ministries:** **${ms.activeMinistries}** of ${ms.totalMinistries} total ministries
- **Total Volunteers / Members Serving:** **${ms.totalVolunteersEnrolled}**
- **Ministries Recording Attendance This Month:** **${ms.ministriesWithAttendanceThisMonth}**

| Ministry Name | Leader | Active Members | Attendance Logged (This Month) | Upcoming Activities |
|---|---|---|---|---|
${rows}

> *${ms.explanation || 'Summarized from active church ministry rosters and attendance logs.'}*`);
    }

    // Upcoming Scheduled Activities
    if (data.get_upcoming_activities) {
      const act = data.get_upcoming_activities;
      const list = (act.activities && act.activities.length > 0)
        ? act.activities.map((a: any) => `- **${a.title}** (${a.ministryName}) — 📅 **${a.date}** at ${a.time} | 📍 ${a.location}\n  *${a.description || 'Ministry activity'}*`).join('\n\n')
        : 'No scheduled ministry activities found in the next 30 days.';

      sections.push(`### 📆 ${isTa ? 'வரவிருக்கும் ஊழிய நிகழ்வுகள்' : 'Upcoming Scheduled Ministry Activities'} (Next 30 Days)

Total Activities Scheduled: **${act.totalActivitiesFound}**

${list}`);
    }

    // Visitors Summary
    if (data.get_visitor_summary) {
      const v = data.get_visitor_summary;
      sections.push(`### 🤝 ${isTa ? 'புதியவர்கள் விவரம்' : 'Visitors & Follow-up Summary'}

- **Total Recorded Visitors:** **${v.totalVisitorsCount || 0}** (${v.conversionRatePercentage || 0}% conversion rate)
- **Pending Follow-up Visitors:** **${v.pendingFollowUps?.totalPendingFollowUpVisitors || 0} needing contact**`);
    }

    // Events
    if (data.get_upcoming_events) {
      const e = data.get_upcoming_events;
      const list = e.events && e.events.length > 0
        ? e.events.map((ev: any) => `- **${ev.title}**: ${ev.startDate} at ${ev.startTime} (${ev.location})`).join('\n')
        : 'No upcoming events currently scheduled.';
      sections.push(`### 📅 ${isTa ? 'நிகழ்வுகள்' : 'Upcoming Church Events'}

${list}`);
    }

    // Event Attendance Reconciliation & Reporting Status
    if (data.get_event_attendance) {
      const ea = data.get_event_attendance;
      const rows = (ea.reconciledEvents && ea.reconciledEvents.length > 0)
        ? ea.reconciledEvents.map((e: any) => {
            const reportStatus = e.attendanceReportSubmitted ? '✅ Logged' : '⚠️ Missing Report';
            return `| **${e.title}** | ${e.date} | ${e.registeredCount} | ${e.actualAttendeesCount} | ${e.variance >= 0 ? '+' : ''}${e.variance} | ${reportStatus} |`;
          }).join('\n')
        : '';

      const pendingList = (ea.eventsNeedingReports && ea.eventsNeedingReports.length > 0)
        ? `\n**Events Needing Attendance Submission:**\n` +
          ea.eventsNeedingReports.map((e: any) => `- **${e.title}** (${e.date}) — ${e.registeredCount} RSVPs registered`).join('\n')
        : '\nAll completed events have attendance reports submitted.';

      sections.push(`### 🎪 ${isTa ? 'நிகழ்ச்சி வருகை & அறிக்கை சரிபார்ப்பு' : 'Event Attendance Reconciliation & Reports Status'}

- **Events Analyzed:** **${ea.totalEventsAnalyzed}**
- **Events Missing Attendance Reports:** **${ea.eventsNeedingAttendanceReportCount}**

| Event Title | Date | RSVPs Registered | Actual Attendees | Turnout Variance | Attendance Report |
|---|---|---|---|---|---|
${rows}
${pendingList}

> *${ea.explanation || 'RSVP counts reconciled against check-in records.'}*`);
    }

    // Sunday School
    if (data.get_class_summary) {
      const ss = data.get_class_summary;
      const overview = ss.classesOverview ? ss.classesOverview.map((c: any) => `- **${c.name}** (Teacher: ${c.teacher}) — ${c.studentCount} students`).join('\n') : '';
      sections.push(`### 🏫 ${isTa ? 'சண்டே ஸ்கூல் சுருக்கம்' : 'Sunday School Classes & Students Summary'}

Total Classes: **${ss.totalClassesCount}** | Total Students: **${ss.totalStudentsCount}**

${overview}`);
    }

    // Prayers
    if (data.get_prayer_summary) {
      const p = data.get_prayer_summary;
      sections.push(`### 🙏 ${isTa ? 'ஜெப குறிப்புகள்' : 'Active Prayer Requests'}

- **Total Active Prayers:** **${p.totalPrayerRequests}** (${p.urgentCount} urgent)
- **Answered Praises:** ${p.answeredPraisesCount}`);
    }

    // Family Profile & Household
    if (data.get_my_family || data.get_family_details) {
      const fam = data.get_my_family || data.get_family_details;
      const membersList = fam.members && fam.members.length > 0
        ? fam.members.map((m: any) => `- **${m.profile?.first_name || m.profile?.display_name || 'Member'} ${m.profile?.last_name || ''}** (${m.relationship || 'Member'})`).join('\n')
        : '- Head of Household registered.';
      sections.push(`### 👨‍👩‍👧‍👦 ${isTa ? 'குடும்ப விவரம் (Family Profile)' : `${fam.family_name || 'Church'} Family Record`}

- **Family Name:** **${fam.family_name}**
- **Contact Phone:** ${fam.phone || 'N/A'}
- **Address:** ${[fam.address, fam.city, fam.state].filter(Boolean).join(', ') || 'Registered on file'}
- **Total Registered Members:** **${fam.members?.length || 1}**

**Household Members:**
${membersList}`);
    }

    // Family Directory Search
    if (data.search_families) {
      const sf = data.search_families;
      const list = sf.families && sf.families.length > 0
        ? sf.families.map((f: any) => `- **${f.familyName}** (${f.membersCount} members) — Primary: **${f.primaryContact}** | Phone: ${f.phone} | Address: ${f.address || 'N/A'}`).join('\n')
        : 'No matching families found.';
      sections.push(`### 🔍 ${isTa ? 'குடும்ப தேடல் முடிவுகள்' : 'Church Families Directory'}

Found **${sf.matchCount} matching family/families** for "${sf.query}":

${list}`);
    }

    // Announcements & Bulletins
    if (data.get_announcements) {
      const ann = data.get_announcements;
      const list = ann.announcements && ann.announcements.length > 0
        ? ann.announcements.map((a: any) => `#### 📢 ${a.title}
*Published by ${a.author} on ${new Date(a.publishDate).toLocaleDateString()} (Audience: ${a.audience})*

${a.message}`).join('\n\n')
        : 'No active announcements at this time.';
      sections.push(`### 📢 ${isTa ? 'சபை அறிவிப்புகள் (Announcements)' : 'Church Announcements & Bulletins'}

${list}`);
    }

    // Conversational Report Summary with Route Deep-links & Key Metrics
    if (data.get_report_summary) {
      const rep = data.get_report_summary;
      const metricBadges = (rep.keyMetrics && rep.keyMetrics.length > 0)
        ? rep.keyMetrics.map((m: any) => `- **${m.label}:** **${m.value}**${m.change ? ` *(${m.change})*` : ''}`).join('\n')
        : '';

      const highlights = (rep.executiveHighlights && rep.executiveHighlights.length > 0)
        ? rep.executiveHighlights.map((h: string) => `- ${h}`).join('\n')
        : '';

      const actions = rep.actionsAvailable || ['View full report in Reports screen', 'Export PDF', 'Export Excel'];
      const actionLinks = actions.map((a: string) => `👉 **${a}**`).join(' | ');

      const route = rep.routePath || rep.reportRoute || '/reports';
      const period = rep.periodText || rep.dateRange || 'Current Period';

      sections.push(`### 📑 ${rep.reportTitle} (${period})

${metricBadges}

**Key Executive Highlights:**
${highlights}

${actionLinks}
👉 [Open ${rep.reportTitle} in System](${route})`);
    }

    // Executive Church Reports
    if (data.get_church_report) {
      const rep = data.get_church_report;
      if (rep.reportType === 'health') {
        sections.push(`### 📊 ${isTa ? 'சபை வளர்ச்சி & ஆரோக்கிய அறிக்கை' : rep.reportTitle}

- **Total Membership:** **${rep.totalMembers}** (${rep.activeMembers} active members)
- **Average Weekly Attendance:** **${rep.averageAttendance} worshippers**
- **Total Headcount Recorded:** ${rep.totalHeadcount} across ${rep.totalSessions} services
- **Recent Visitors:** **${rep.totalVisitors}** (${rep.visitorConversionRate} retention rate)
- **Active Ministries:** **${rep.totalMinistries}** (${rep.totalVolunteers} volunteers serving)`);
      } else if (rep.reportType === 'membership') {
        sections.push(`### 👥 ${isTa ? 'உறுப்பினர்கள் அறிக்கை' : rep.reportTitle}

- **Total Members:** **${rep.totalCount}** (${rep.activeCount} active, ${rep.inactiveCount} inactive)
- **New This Month:** ${rep.newThisMonth}
- **Demographics:** ${rep.maleCount} Male, ${rep.femaleCount} Female`);
      } else if (rep.reportType === 'visitor') {
        sections.push(`### 🤝 ${isTa ? 'புதியவர்கள் அறிக்கை' : rep.reportTitle}

- **Total Visitors:** **${rep.totalVisitors}** (${rep.newThisMonth} new this month)
- **Follow-up Status:** ${rep.followUpCompleted} completed | ${rep.followUpPending} pending
- **Conversion Rate:** **${rep.conversionRatePercent}%**`);
      } else if (rep.reportType === 'financial') {
        sections.push(`### 💰 ${isTa ? 'காணிக்கை & நிதி அறிக்கை' : rep.reportTitle}

- **Total Giving This Year:** **₹${rep.totalGiving?.toLocaleString()}**
- **Monthly Average:** ₹${rep.monthlyAverage?.toLocaleString()}
- **Active Givers / Donors:** ${rep.donorCount}`);
      } else {
        sections.push(`### 📑 ${rep.reportTitle}

- Generated on: ${new Date().toLocaleDateString()}
- Total Records: ${rep.records?.length || 0}`);
      }
    }

    // Reports (Legacy & specific module reports)
    if (data.generate_attendance_report || data.generate_member_report || data.generate_ministry_report) {
      const r = data.generate_attendance_report || data.generate_member_report || data.generate_ministry_report;
      sections.push(`### 📑 ${isTa ? 'அறிக்கை உருவாக்கம்' : r.reportTitle}

*Report generated at: ${r.generatedAt || new Date().toLocaleString()}*

${r.churchSummary ? `- **Total Present:** ${r.churchSummary.totalPresent} | **Average:** ${r.churchSummary.averagePresentPerService}` : ''}
${r.reportData ? `- **Report Dataset:** ${r.reportData.totalCount || r.reportData.totalHeadcount || r.reportData.totalMinistries || 'Ready'} records analyzed.` : ''}`);
    }

    // Bible Passage
    if (data.search_bible) {
      const b = data.search_bible;
      const tamilPart = b.tamilText ? `\n\n> ✝️ **தமிழ் வேதம் (Tamil BSI):**\n> *${b.tamilText}*` : '';
      sections.push(`### 📖 ${isTa ? 'வேதாகம வசனம்' : 'Scripture Promise'} — **${b.reference || 'Holy Bible'}**

> "${b.text || b.passage}"${tamilPart}

**Context & Theme:** ${b.topic || 'Biblical Wisdom'} — *${b.contextNote || 'Given for spiritual encouragement.'}*`);
    }

    // Mandatory Completeness Notice
    const deniedOrUnavail = validatedResults.filter(r => r.status === 'permission_denied' || r.status === 'service_failure');
    if (deniedOrUnavail.length > 0) {
      const notices = deniedOrUnavail.map(r => {
        if (r.status === 'permission_denied') return `- *${r.label}*: Access denied for your user role.`;
        return `- *${r.label}*: Information was currently unavailable.`;
      }).join('\n');

      sections.push(`\n> **⚠️ Data Completeness Notice:**\n${notices}`);
    }

    return sections.join('\n\n');
  }
};
