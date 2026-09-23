import { GoogleGenAI } from '@google/genai';
import { SaaSUserRole } from '@/types';
import { canAccessAiPastor, getRoleConfig, normalizeRole } from '@/utils/rbac';
import { churchAiToolRegistry, UserSecurityContext, ToolExecutionResult } from './churchAiToolRegistry';
import { auditService } from './auditService';
import { getStoredMinistryMembers, getStoredMinistries } from '@/utils/storage';

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

export const churchAiEngine = {
  /**
   * Build authoritative Security Context
   */
  buildUserSecurityContext(options: AskEngineOptions): UserSecurityContext {
    const { churchId, userRole = 'Member', userName = 'Church Member', userEmail = '', memberId = '', authorizedMinistryIds } = options;

    let minIds = authorizedMinistryIds || [];
    if (minIds.length === 0) {
      try {
        const storedMinMembers = getStoredMinistryMembers();
        const matched = storedMinMembers.filter(mm => mm.memberId === memberId);
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
    if ((p.includes('august') && p.includes('july')) || (p.includes('aug') && p.includes('jul'))) {
      entities.dateRange = 'August 2026 vs July 2026';
    } else if (p.includes('last month') || p.includes('kadantha matham') || p.includes('previous month')) {
      entities.dateRange = 'last_month';
    } else if (p.includes('this week') || p.includes('last sunday')) {
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

    // MULTI-PART & READ INTENTS

    // 1. Members
    if (p.includes('how many members') || p.includes('member count') || p.includes('total members') || p.includes('how many people in church') || p.includes('number of members')) {
      intents.push('member_count');
      tasks.push({
        id: 'task-member-count',
        toolName: isLeadership ? 'get_member_count' : 'get_my_profile',
        label: 'Church Membership Count & Demographics',
        params: {}
      });
    }

    // 2. Attendance
    if (p.includes('attendance') || p.includes('attended') || p.includes('present') || p.includes('varukai') || p.includes('attendance summary')) {
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

    // 4. Ministry Members
    if (p.includes('ministry members') || p.includes('members of') || (p.includes('show me') && intent.entities.ministryName) || (p.includes('who is in') && intent.entities.ministryName)) {
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

    // 8. Events
    if (p.includes('event') || p.includes('events') || p.includes('calendar') || p.includes('schedule') || p.includes('coming this week')) {
      intents.push('events');
      tasks.push({
        id: 'task-events',
        toolName: 'get_upcoming_events',
        label: 'Upcoming Church Events',
        params: { limit: 5 }
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

    // 11. Reports
    if (p.includes('report') || p.includes('create report') || p.includes('generate report')) {
      intents.push('reports');
      if (p.includes('attendance')) {
        tasks.push({ id: 'task-report-attendance', toolName: 'generate_attendance_report', label: 'Attendance Report', params: { dateRange: intent.entities.dateRange } });
      } else if (p.includes('ministry')) {
        tasks.push({ id: 'task-report-ministry', toolName: 'generate_ministry_report', label: 'Ministry Report', params: { ministryName: intent.entities.ministryName } });
      } else {
        tasks.push({ id: 'task-report-member', toolName: 'generate_member_report', label: 'Member Report', params: {} });
      }
    }

    // 12. Bible Search
    if (p.includes('bible') || p.includes('verse') || p.includes('john 3:16') || p.includes('forgiveness') || p.includes('faith')) {
      intents.push('bible');
      tasks.push({
        id: 'task-bible',
        toolName: 'search_bible',
        label: 'Bible Verse Search',
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

    // 2. Action execution confirmation handler
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
        actor_name: userName || 'User',
        actor_role: userRole || 'Member',
        details: actionToExecute
      }).catch(() => {});

      return {
        responseText: result.success ? `✅ **Action Confirmed & Executed!**\n\n${result.data?.message || 'Operation completed successfully.'}` : `❌ **Action Failed:** ${result.error}`,
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

    // Proposed Action Confirmation Card
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

    // Member Count
    if (data.get_member_count) {
      const m = data.get_member_count;
      sections.push(`### 📊 ${isTa ? 'சபை உறுப்பினர்கள் விவரம்' : 'Church Membership Directory'}

- **Total Members:** **${m.totalMembers}** (${m.activeMembers} active, ${m.newMembersPast30DaysCount} new joins past 30 days)
- **Demographics:** ${m.genderBreakdown?.male || 0} Male, ${m.genderBreakdown?.female || 0} Female`);
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
      sections.push(`### ⛪ ${isTa ? 'ஞாயிறு வருகை சுருக்கம்' : 'Sunday Attendance Summary'} (${att.dateRange})

- **Average Present Per Service:** **${att.averagePresentPerService} people**
- **Logged Check-ins:** ${att.totalPresent} present, ${att.totalAbsent} absent across ${att.totalRecordsLogged} service logs.`);
    }

    // Ministry Attendance Breakdown
    if (data.get_ministry_attendance) {
      const minAtt = data.get_ministry_attendance;
      const list = minAtt.ministries ? minAtt.ministries.map((m: any) => `- **${m.ministryName}**: Avg **${m.averageAttendance} present**`).join('\n') : '';
      sections.push(`### 🏆 ${isTa ? 'ஊழிய வருகை விவரம்' : 'Ministry Attendance Breakdown'}

Highest Attendance: **${minAtt.highestAttendanceMinistry?.ministryName || 'N/A'}**

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

    // Reports
    if (data.generate_attendance_report || data.generate_member_report || data.generate_ministry_report) {
      const r = data.generate_attendance_report || data.generate_member_report || data.generate_ministry_report;
      sections.push(`### 📑 ${isTa ? 'அறிக்கை உருவாக்கம்' : r.reportTitle}

*Report generated at: ${r.generatedAt || new Date().toLocaleString()}*

${JSON.stringify(r.churchSummary || r.membersData || r, null, 2)}`);
    }

    // Bible Passage
    if (data.search_bible) {
      const b = data.search_bible;
      sections.push(`### 📖 ${isTa ? 'வேதாகம வசனம் (Bible Verse Search)' : 'Bible Verse Search'}

*${b.passage}*`);
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
