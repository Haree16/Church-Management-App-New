import { GoogleGenAI } from '@google/genai';
import { SaaSUserRole } from '@/types';
import { canAccessAiPastor, getRoleConfig, normalizeRole } from '@/utils/rbac';
import { churchAiToolRegistry, UserSecurityContext, ToolExecutionResult } from './churchAiToolRegistry';
import { auditService } from './auditService';
import { getStoredMinistryMembers, getStoredMinistries } from '@/utils/storage';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
  requiresConfirmation?: boolean;
  proposedActionPayload?: any;
  ambiguityOptions?: { label: string; actionPrompt: string }[];
}

export interface AskChurchAiOptions {
  prompt: string;
  churchId: string;
  userRole?: SaaSUserRole | string;
  userName?: string;
  userEmail?: string;
  memberId?: string;
  authorizedMinistryIds?: string[];
  activeTabOrScreen?: string;
  history?: ChatMessage[];
  debugMode?: boolean;
  actionToExecute?: any;
}

export interface ChurchAiExecutionPlan {
  prompt: string;
  language: 'en' | 'ta' | 'mixed';
  intents: string[];
  tasks: { id: string; type: string; label: string; periodLabel?: string; ministryTarget?: string; queryTarget?: string }[];
  ambiguityDetected?: boolean;
  ambiguityOptions?: { label: string; actionPrompt: string }[];
}

export interface ChurchAiTrace {
  requestId: string;
  timestamp: string;
  userRole?: string;
  language: 'en' | 'ta' | 'mixed';
  intents: string[];
  tasks: { id: string; type: string; label: string }[];
  toolsExecuted: string[];
  executionTimeMs: number;
  completenessCheck: { task: string; status: 'completed' | 'unavailable' | 'error' }[];
}

const SYSTEM_INSTRUCTION = `You are "Church AI", the central intelligent conversational assistant for the Church Management System.
Your mission is to serve authorized church leaders, ministry leaders, volunteers, and members by providing accurate, permission-gated, and factual church insights.

Core Principles:
1. ROLE & PERMISSION BOUNDS: Strictly respect user role privileges. Always base answers on verified context.
2. ANSWER COMPLETE REQUESTS: If a user asks multiple metrics, dates, or items, address EVERY single item in your response.
3. NO FABRICATED DATA: Base stats strictly on real church tool output. Never invent numbers, names, or statistics.
4. EXPLICIT UNAVAILABLE NOTICES: If data for a requested part is unavailable, explicitly state it (e.g., "Ministry-level attendance is unavailable for this period"). Never silently omit requested parts.
5. RESPECT PASTORAL & CONFIDENTIAL NOTES: Keep confidential counseling or private prayer requests protected.
6. TAMIL & TANGLISH SUPPORT: Understand and respond naturally in English, Tamil, or Tanglish matching user preference.`;

function getGeminiApiKey(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_GEMINI_API_KEY : '');
  return envKey && envKey.trim().length > 0 ? envKey.trim() : null;
}

function detectLanguage(prompt: string): 'en' | 'ta' | 'mixed' {
  const p = prompt.toLowerCase();
  const tamilRegex = /[\u0B80-\u0BFF]/;
  const tanglishWords = ['intha', 'kadantha', 'matham', 'ethanai', 'yaaru', 'poottirukanga', 'epdi', 'irukku', 'panninga', 'sapai', 'varukai', 'jepam'];
  
  if (tamilRegex.test(prompt)) return 'ta';
  if (tanglishWords.some(w => p.includes(w))) return 'mixed';
  return 'en';
}

function parseDateRangesFromPrompt(prompt: string): { period1: string; period2?: string } {
  const p = prompt.toLowerCase();
  if ((p.includes('august') && p.includes('july')) || (p.includes('aug') && p.includes('jul'))) {
    return { period1: 'August 2026', period2: 'July 2026' };
  }
  if (p.includes('this month vs last month') || p.includes('compare this month')) {
    return { period1: 'this_month', period2: 'last_month' };
  }
  if (p.includes('august')) return { period1: 'August 2026' };
  if (p.includes('july')) return { period1: 'July 2026' };
  if (p.includes('last month') || p.includes('kadantha matham')) return { period1: 'last_month' };
  if (p.includes('this week') || p.includes('last sunday')) return { period1: 'this_week' };
  return { period1: 'this_month' };
}

export const churchAiService = {
  /**
   * Builds authoritative server-side Security Context
   */
  buildUserSecurityContext(options: AskChurchAiOptions): UserSecurityContext {
    const { churchId, userRole = 'Member', userName = 'Church Member', userEmail = '', memberId = '', authorizedMinistryIds } = options;

    let minIds = authorizedMinistryIds || [];
    if (minIds.length === 0) {
      try {
        const storedMinMembers = getStoredMinistryMembers();
        const matched = storedMinMembers.filter(mm => mm.memberId === memberId || mm.memberId === memberId);
        minIds = matched.map(mm => mm.ministryId);
      } catch (e) {
        // Fallback
      }
    }

    return {
      churchId,
      userId: memberId || `user-${Date.now()}`,
      userRole: (userRole as SaaSUserRole) || 'Member',
      userName,
      userEmail,
      memberId,
      authorizedMinistryIds: minIds
    };
  },

  /**
   * Task Decomposition & Intent Understanding Layer
   */
  decomposeRequest(prompt: string, ctx: UserSecurityContext, activeScreen?: string, history?: ChatMessage[]): ChurchAiExecutionPlan {
    const p = prompt.toLowerCase();
    const language = detectLanguage(prompt);
    const dateRanges = parseDateRangesFromPrompt(prompt);
    const normRole = normalizeRole(ctx.userRole);

    const intents: string[] = [];
    const tasks: { id: string; type: string; label: string; periodLabel?: string; ministryTarget?: string; queryTarget?: string }[] = [];

    const isLeadership = ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'TreasurerStaff'].includes(normRole);
    const isLeader = isLeadership || normRole === 'MinistryLeader';

    // Extract location context from chat history
    let lastLocationContext: string | undefined;
    if (history && history.length > 0) {
      const combinedHistory = history.map(h => h.text).join(' ').toLowerCase();
      if (combinedHistory.includes('anna nagar')) lastLocationContext = 'Anna Nagar';
      else if (combinedHistory.includes('medavakkam')) lastLocationContext = 'Medavakkam';
      else if (combinedHistory.includes('santhome')) lastLocationContext = 'Santhome';
      else if (combinedHistory.includes('pallikaranai')) lastLocationContext = 'Pallikaranai';
      else if (combinedHistory.includes('kannagi nagar')) lastLocationContext = 'Kannagi Nagar';
    }

    // Contextual Follow-Up Query (e.g. "Which of them joined this month?")
    if (p.includes('which of them') || p.includes('who of them') || p.includes('which of those') || p.includes('of these') || p.includes('from these') || ((p.includes('joined') || p.includes('join')) && (p.includes('them') || p.includes('which') || p.includes('who') || p.includes('these')))) {
      intents.push('filter', 'search');
      tasks.push({
        id: 'task-contextual-join-filter',
        type: 'get_contextual_join_filter',
        label: `Contextual Member Join Date Filter (${lastLocationContext || 'Directory'} ${dateRanges.period1})`,
        periodLabel: dateRanges.period1,
        queryTarget: lastLocationContext
      });
    }

    // WRITE Action Intents
    if (p.includes('create announcement') || p.includes('publish announcement') || p.includes('post announcement') || p.includes('announcement create')) {
      intents.push('action', 'create');
      tasks.push({ id: 'task-action-announcement', type: 'propose_create_announcement', label: 'Propose New Announcement Action' });
    }

    if (p.includes('assign john') || p.includes('assign member') || p.includes('create assignment') || p.includes('assign roster')) {
      intents.push('action', 'create');
      tasks.push({ id: 'task-action-assignment', type: 'propose_create_assignment', label: 'Propose Roster Assignment Action' });
    }

    // READ & ANALYZE Intents
    if (p.includes('my profile') || p.includes('who am i') || p.includes('my details')) {
      intents.push('lookup');
      tasks.push({ id: 'task-my-profile', type: 'get_my_profile', label: 'Personal Profile Details' });
    }

    if (p.includes('my attendance') || (p.includes('attendance') && !isLeadership && !isLeader)) {
      intents.push('summary');
      tasks.push({ id: 'task-my-attendance', type: 'get_my_attendance', label: 'Personal Attendance History' });
    }

    if (p.includes('my assignments') || (p.includes('assignment') && !isLeader)) {
      intents.push('summary');
      tasks.push({ id: 'task-my-assignments', type: 'get_my_assignments', label: 'Personal Service Roster Assignments' });
    }

    if (p.includes('my ministry') || p.includes('my ministries') || p.includes('which ministry i am in')) {
      intents.push('summary');
      tasks.push({ id: 'task-my-ministries', type: 'get_my_ministries', label: 'User Ministry Belonging List' });
    }

    if (isLeadership && (p.includes('how many members') || p.includes('member count') || p.includes('total members'))) {
      intents.push('count', 'summary');
      tasks.push({ id: 'task-member-count', type: 'get_member_count', label: 'Church Membership Count & Demographics' });
    }

    if (isLeadership && (p.includes('no attendance') || p.includes('no recorded activity') || p.includes('absence follow-up') || p.includes('absent members'))) {
      intents.push('filter', 'summary');
      tasks.push({ id: 'task-absence-followup', type: 'get_absence_followup_summary', label: 'Absence Follow-up Summary (Past 30 Days)' });
    }

    if (isLeader && (p.includes('attendance') && (p.includes('this month') || p.includes('august') || p.includes('july') || p.includes('compare') || p.includes('summary') || p.includes('how many attended')))) {
      intents.push('summary');
      tasks.push({ id: 'task-attendance-summary', type: 'get_attendance_summary', label: `Church Attendance Summary (${dateRanges.period1})`, periodLabel: dateRanges.period1 });
    }

    if (isLeader && (p.includes('ministry attendance') || p.includes('highest attendance ministry') || p.includes('ministries attendance'))) {
      intents.push('ranking');
      tasks.push({ id: 'task-ministry-attendance', type: 'get_ministry_attendance', label: 'Ministry Attendance Breakdown & Highest Ministry' });
    }

    if (isLeadership && (p.includes('visitor') || p.includes('guest') || p.includes('follow-up') || p.includes('pending follow'))) {
      intents.push('summary');
      tasks.push({ id: 'task-visitor-summary', type: 'get_visitor_summary', label: 'Visitor & Follow-up Summary' });
    }

    if (p.includes('upcoming events') || p.includes('event calendar') || p.includes('events') || p.includes('schedule')) {
      intents.push('list');
      tasks.push({ id: 'task-events', type: 'get_upcoming_events', label: 'Upcoming Church Events Calendar' });
    }

    if (p.includes('prayer') || p.includes('prayer request') || p.includes('jepam') || p.includes('urgent')) {
      intents.push('summary');
      tasks.push({ id: 'task-prayers', type: 'get_prayer_summary', label: 'Prayer Wall Requests Summary' });
    }

    if (p.includes('bible') || p.includes('verse') || p.includes('john 3:16') || p.includes('forgiveness') || p.includes('faith') || p.includes('passage')) {
      intents.push('search');
      tasks.push({ id: 'task-bible', type: 'search_bible', label: 'Bible Verse Lookup', queryTarget: prompt });
    }

    // Default: if no specific task matched, select user-scoped default
    if (tasks.length === 0) {
      if (isLeadership) {
        intents.push('summary');
        tasks.push({ id: 'task-member-count', type: 'get_member_count', label: 'Church Membership Count' });
        tasks.push({ id: 'task-attendance-summary', type: 'get_attendance_summary', label: 'Attendance Summary' });
      } else if (normRole === 'MinistryLeader') {
        intents.push('summary');
        tasks.push({ id: 'task-my-ministries', type: 'get_my_ministries', label: 'My Ministry Overview' });
        tasks.push({ id: 'task-my-assignments', type: 'get_my_assignments', label: 'Ministry Roster Assignments' });
      } else {
        intents.push('summary');
        tasks.push({ id: 'task-my-assignments', type: 'get_my_assignments', label: 'My Roster Assignments' });
        tasks.push({ id: 'task-my-attendance', type: 'get_my_attendance', label: 'My Attendance History' });
      }
    }

    return {
      prompt,
      language,
      intents: Array.from(new Set(intents)),
      tasks
    };
  },

  /**
   * Main entry point to ask Church AI
   */
  async askChurchAi(options: AskChurchAiOptions): Promise<{ responseText: string; requiresConfirmation?: boolean; proposedActionPayload?: any; ambiguityOptions?: any[]; trace?: ChurchAiTrace }> {
    const { prompt, churchId, userRole, userName, userEmail, memberId, activeTabOrScreen, debugMode, actionToExecute } = options;
    const startTime = Date.now();

    // 1. Establish Authoritative Security Context
    const ctx = this.buildUserSecurityContext(options);

    // 2. Handle Action Execution if user clicked [Publish / Confirm Action] button
    if (actionToExecute) {
      let result: ToolExecutionResult;
      if (actionToExecute.actionType === 'CREATE_ANNOUNCEMENT') {
        result = await churchAiToolRegistry.execute_create_announcement(actionToExecute, ctx);
      } else {
        result = await churchAiToolRegistry.execute_create_assignment(actionToExecute, ctx);
      }

      await auditService.logAction(churchId, {
        action: 'church_ai_action_executed',
        resource_type: actionToExecute.actionType,
        actor_name: userName || 'Leadership User',
        actor_role: userRole || 'PastorAdmin',
        details: actionToExecute
      });

      return {
        responseText: result.success ? `✅ **Action Confirmed & Executed!**\n\n${result.data?.message || 'Operation completed successfully.'}` : `❌ **Action Failed:** ${result.error}`,
      };
    }

    // 3. Task Decomposition & Intent Plan
    const plan = this.decomposeRequest(prompt, ctx, activeTabOrScreen, options.history);

    const trace: ChurchAiTrace = {
      requestId: `cai-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: ctx.userRole,
      language: plan.language,
      intents: plan.intents,
      tasks: plan.tasks,
      toolsExecuted: [],
      executionTimeMs: 0,
      completenessCheck: []
    };

    // 4. Execute Tools
    const toolOutputs: Record<string, any> = {};
    let actionPayloadToPropose: any = null;
    let actionRequiresConfirmation = false;

    const toolPromises = plan.tasks.map(async (t) => {
      trace.toolsExecuted.push(t.type);

      let res: ToolExecutionResult;
      switch (t.type) {
        case 'propose_create_announcement':
          res = await churchAiToolRegistry.propose_create_announcement({ title: 'Church Service Announcement', content: prompt }, ctx);
          if (res.requiresActionConfirmation) {
            actionRequiresConfirmation = true;
            actionPayloadToPropose = res.proposedActionPayload;
          }
          break;
        case 'propose_create_assignment':
          res = await churchAiToolRegistry.propose_create_assignment({ memberName: 'Volunteer', roleName: 'Sunday Duty', serviceDate: 'Upcoming Sunday' }, ctx);
          if (res.requiresActionConfirmation) {
            actionRequiresConfirmation = true;
            actionPayloadToPropose = res.proposedActionPayload;
          }
          break;
        case 'get_my_profile':
          res = await churchAiToolRegistry.get_my_profile({}, ctx);
          break;
        case 'get_my_attendance':
          res = await churchAiToolRegistry.get_my_attendance({}, ctx);
          break;
        case 'get_my_assignments':
          res = await churchAiToolRegistry.get_my_assignments({}, ctx);
          break;
        case 'get_my_ministries':
          res = await churchAiToolRegistry.get_my_ministries({}, ctx);
          break;
        case 'get_member_count':
          res = await churchAiToolRegistry.get_member_count({}, ctx);
          break;
        case 'get_absence_followup_summary':
          res = await churchAiToolRegistry.get_absence_followup_summary({ daysThreshold: 30 }, ctx);
          break;
        case 'get_attendance_summary':
          res = await churchAiToolRegistry.get_attendance_summary({ dateRange: t.periodLabel || 'this_month' }, ctx);
          break;
        case 'get_ministry_attendance':
          res = await churchAiToolRegistry.get_ministry_attendance({ dateRange: 'this_month' }, ctx);
          break;
        case 'get_visitor_summary':
          res = await churchAiToolRegistry.get_visitor_summary({}, ctx);
          break;
        case 'get_upcoming_events':
          res = await churchAiToolRegistry.get_upcoming_events({ limit: 5 }, ctx);
          break;
        case 'get_prayer_summary':
          res = await churchAiToolRegistry.get_prayer_summary({}, ctx);
          break;
        case 'search_bible':
          res = await churchAiToolRegistry.search_bible({ query: t.queryTarget || prompt }, ctx);
          break;
        case 'get_contextual_join_filter':
          res = await churchAiToolRegistry.get_contextual_join_filter({ periodLabel: t.periodLabel, queryTarget: t.queryTarget, historyTexts: options.history ? options.history.map(h => h.text) : [] }, ctx);
          break;
        default:
          res = await churchAiToolRegistry.get_my_assignments({}, ctx);
          break;
      }

      if (res.success) {
        toolOutputs[t.type] = res.data;
        trace.completenessCheck.push({ task: t.label, status: 'completed' });
      } else {
        trace.completenessCheck.push({ task: t.label, status: 'unavailable' });
      }
    });

    await Promise.all(toolPromises);

    // 5. Synthesize Output via Gemini or Factual Local Engine
    const apiKey = getGeminiApiKey();
    let responseText = '';

    if (apiKey && !actionRequiresConfirmation) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const fullPrompt = `${SYSTEM_INSTRUCTION}

[USER ROLE]: ${ctx.userRole} (${ctx.userName})
[USER LANGUAGE]: ${plan.language.toUpperCase()}
[VERIFIED CHURCH DATA CONTEXT]:
${JSON.stringify(toolOutputs, null, 2)}

[USER PROMPT]:
${prompt}`;

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt
        });

        if (result && result.text) responseText = result.text;
      } catch (geminiErr) {
        console.warn('Gemini API call skipped, using factual synthesizer:', geminiErr);
      }
    }

    if (!responseText) {
      responseText = this.formatChurchAiResponse(prompt, plan, toolOutputs, ctx, trace);
    }

    trace.executionTimeMs = Date.now() - startTime;

    // Developer / Admin Trace Payload (only in explicit debug mode)
    if (debugMode) {
      responseText += `\n\n---\n\`\`\`json\n// Developer / Admin Execution Trace\n${JSON.stringify(trace, null, 2)}\n\`\`\``;
    }

    // Audit Log
    try {
      await auditService.logAction(churchId, {
        action: 'church_ai_query',
        resource_type: 'church_ai_assistant',
        actor_name: userName || 'User',
        actor_role: (userRole as string) || 'Member',
        details: { prompt, intents: plan.intents, taskCount: plan.tasks.length, executionTimeMs: trace.executionTimeMs }
      });
    } catch (e) {
      // Audit fail non-blocking
    }

    return {
      responseText,
      requiresConfirmation: actionRequiresConfirmation,
      proposedActionPayload: actionPayloadToPropose,
      trace
    };
  },

  /**
   * Formats clean structured markdown responses tailored to the user's role and language
   */
  formatChurchAiResponse(prompt: string, plan: ChurchAiExecutionPlan, data: Record<string, any>, ctx: UserSecurityContext, trace?: ChurchAiTrace): string {
    const sections: string[] = [];
    const isTa = plan.language === 'ta' || plan.language === 'mixed';

    // Proposed Action Card Notification
    if (data.propose_create_announcement || data.propose_create_assignment) {
      sections.push(`### 📝 ${isTa ? 'செயல்பாடு உறுதிப்படுத்தல் தேவை (Action Confirmation Required)' : 'Proposed Action Confirmation'}

I have prepared your request. Please review the proposed details below and click **Publish / Confirm** to execute.`);
      return sections.join('\n\n');
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

    // Personal Assignments
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

    // Administrative: Member Count
    if (data.get_member_count) {
      const m = data.get_member_count;
      sections.push(`### 📊 ${isTa ? 'சபை உறுப்பினர்கள் விவரம்' : 'Church Membership Directory'}

- **Total Members:** **${m.totalMembers}** (${m.activeMembers} active, ${m.newMembersPast30DaysCount} new joins past 30 days)
- **Demographics:** ${m.genderBreakdown.male} Male, ${m.genderBreakdown.female} Female`);
    }

    // Administrative: Attendance Summary
    if (data.get_attendance_summary) {
      const att = data.get_attendance_summary;
      sections.push(`### ⛪ ${isTa ? 'ஞாயிறு வருகை சுருக்கம்' : 'Sunday Attendance Summary'} (${att.dateRange})

- **Average Present Per Service:** **${att.averagePresentPerService} people**
- **Logged Check-ins:** ${att.totalPresent} present, ${att.totalAbsent} absent across ${att.totalRecordsLogged} service logs.`);
    }

    // Ministry Attendance Breakdown
    if (data.get_ministry_attendance) {
      const minAtt = data.get_ministry_attendance;
      const list = minAtt.ministries.map((m: any) => `- **${m.ministryName}**: Avg **${m.averageAttendance} present**`).join('\n');
      sections.push(`### 🏆 ${isTa ? 'ஊழிய வருகை விவரம்' : 'Ministry Attendance Breakdown'}

Highest Attendance: **${minAtt.highestAttendanceMinistry?.ministryName || 'N/A'}**

${list}`);
    }

    // Visitors Summary
    if (data.get_visitor_summary) {
      const v = data.get_visitor_summary;
      sections.push(`### 🤝 ${isTa ? 'புதியவர்கள் விவரம்' : 'Visitors & Follow-up Summary'}

- **Total Recorded Visitors:** **${v.totalVisitorsCount}** (${v.conversionRatePercentage}% conversion rate)
- **Pending Follow-up Visitors:** **${v.pendingFollowUps?.totalPendingFollowUpVisitors || 0} needing contact**`);
    }

    // Events
    if (data.get_upcoming_events) {
      const e = data.get_upcoming_events;
      const list = e.events.length > 0
        ? e.events.map((ev: any) => `- **${ev.title}**: ${ev.startDate} at ${ev.startTime} (${ev.location})`).join('\n')
        : 'No upcoming events currently scheduled.';
      sections.push(`### 📅 ${isTa ? 'நிகழ்வுகள்' : 'Upcoming Church Events'}

${list}`);
    }

    // Prayers
    if (data.get_prayer_summary) {
      const p = data.get_prayer_summary;
      sections.push(`### 🙏 ${isTa ? 'ஜெப குறிப்புகள்' : 'Active Prayer Requests'}

- **Total Active Prayers:** **${p.totalPrayerRequests}** (${p.urgentCount} urgent)
- **Answered Praises:** ${p.answeredPraisesCount}`);
    }

    // Bible Passage
    if (data.search_bible) {
      const b = data.search_bible;
      sections.push(`### 📖 ${isTa ? 'வேதாகம வசனம் (Bible Verse Search)' : 'Bible Verse Search'}

*${b.passage}*`);
    }

    // Completeness Notice for Unavailable Parts
    if (trace && trace.completenessCheck.length > 0) {
      const unavail = trace.completenessCheck.filter(c => c.status === 'unavailable');
      if (unavail.length > 0) {
        const unavailText = unavail.map(c => `- *${c.task}*: Data was not available in current church records.`).join('\n');
        sections.push(`\n> **⚠️ Data Completeness Notice:**\n${unavailText}`);
      }
    }

    return sections.join('\n\n');
  }
};
