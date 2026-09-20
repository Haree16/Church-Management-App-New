import { GoogleGenAI } from '@google/genai';
import { canAccessAiPastor } from '@/utils/rbac';
import { aiPastorToolsService } from './aiPastorToolsService';
import { auditService } from './auditService';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export interface AskAiPastorOptions {
  prompt: string;
  churchId: string;
  userRole?: string;
  userName?: string;
  history?: ChatMessage[];
  debugMode?: boolean;
}

export interface SubtaskPlan {
  id: string;
  type: string;
  label: string;
  periodLabel?: string;
  period2Label?: string;
  targetName?: string;
  ministryTarget?: string;
  roleQuery?: string;
  queryTarget?: string;
}

export interface ExecutionPlan {
  prompt: string;
  language: 'en' | 'ta' | 'mixed';
  intents: string[];
  tasks: SubtaskPlan[];
}

export interface ExecutionTrace {
  requestId: string;
  timestamp: string;
  userRole?: string;
  language: 'en' | 'ta' | 'mixed';
  intents: string[];
  tasks: SubtaskPlan[];
  toolsExecuted: string[];
  executionTimeMs: number;
  completenessCheck: { task: string; status: 'completed' | 'unavailable' | 'error' }[];
}

const SYSTEM_INSTRUCTION = `You are the AI Pastor Assistant for Church Leadership.
Your goal is to assist authorized church leaders (Pastors, Admins) by providing clear, accurate, concise, and factual insights using real church data.

Key Guidelines:
1. Always answer the COMPLETE user request. If a prompt asks for multiple metrics, date ranges, comparisons, or lists, address EVERY part in your response.
2. Base all numbers and facts strictly on the real church data provided in context. Never invent statistics, names, or counts.
3. If data for any requested part is unavailable or empty, state it explicitly (e.g., "Ministry-level attendance data was not available for this period"). Never silently omit requested parts.
4. Keep a respectful, encouraging, pastoral tone.
5. Structure complex multi-part answers using clear markdown headers (## Section), bullet points, and tables. Give the direct answer first.
6. Support Tamil, English, and Tanglish mixed queries naturally according to the user's language.`;

function getGeminiApiKey(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_GEMINI_API_KEY : '');
  return envKey && envKey.trim().length > 0 ? envKey.trim() : null;
}

// ---------------------------------------------------------------------------
// 1. Natural Language Language & Date Range Parsers
// ---------------------------------------------------------------------------

function detectLanguage(prompt: string): 'en' | 'ta' | 'mixed' {
  const p = prompt.toLowerCase();
  const tamilRegex = /[\u0B80-\u0BFF]/;
  const tanglishWords = ['intha', 'kadantha', 'matham', 'ethanai', 'yaaru', 'poottirukanga', 'epdi', 'irukku', 'panninga', 'sapai', 'varukai'];
  
  if (tamilRegex.test(prompt)) return 'ta';
  if (tanglishWords.some(w => p.includes(w))) return 'mixed';
  return 'en';
}

function parseDateRangesFromPrompt(prompt: string): { period1: string; period2?: string } {
  const p = prompt.toLowerCase();

  // Multi-month comparison (e.g. "August and July", "August vs July", "July compared to August")
  if ((p.includes('august') && p.includes('july')) || (p.includes('aug') && p.includes('jul'))) {
    if (p.indexOf('august') < p.indexOf('july') || p.indexOf('aug') < p.indexOf('jul')) {
      return { period1: 'August 2026', period2: 'July 2026' };
    }
    return { period1: 'July 2026', period2: 'August 2026' };
  }

  if (p.includes('this month vs last month') || p.includes('compare this month with last month') || p.includes('this month and last month')) {
    return { period1: 'this_month', period2: 'last_month' };
  }

  // Single date ranges
  if (p.includes('august') || p.includes('aug')) return { period1: 'August 2026' };
  if (p.includes('july') || p.includes('jul')) return { period1: 'July 2026' };
  if (p.includes('september') || p.includes('sept')) return { period1: 'September 2026' };
  if (p.includes('last month') || p.includes('kadantha matham')) return { period1: 'last_month' };
  if (p.includes('this week') || p.includes('last sunday')) return { period1: 'this_week' };
  if (p.includes('past 30 days') || p.includes('last 30 days')) return { period1: 'past_30_days' };
  if (p.includes('past 90 days') || p.includes('last 90 days')) return { period1: 'past_90_days' };
  if (p.includes('this year') || p.includes('2026')) return { period1: 'this_year' };

  return { period1: 'this_month' };
}

// ---------------------------------------------------------------------------
// 2. Question Decomposition Layer
// ---------------------------------------------------------------------------

function decomposeUserRequest(prompt: string, history: ChatMessage[] = []): ExecutionPlan {
  const p = prompt.toLowerCase();
  const language = detectLanguage(prompt);
  const dateRanges = parseDateRangesFromPrompt(prompt);

  const intents: string[] = [];
  const tasks: SubtaskPlan[] = [];

  // Check follow-up context from recent chat history if current prompt is short / contextual
  let lastMinistryContext: string | undefined;
  let lastPersonContext: string | undefined;
  let lastLocationContext: string | undefined;

  if (history && history.length > 0) {
    const combinedHistory = history.map(h => h.text).join(' ').toLowerCase();
    if (combinedHistory.includes('media')) lastMinistryContext = 'Media & Tech Ministry';
    if (combinedHistory.includes('worship')) lastMinistryContext = 'Worship & Music Ministry';
    if (combinedHistory.includes('anna nagar')) lastLocationContext = 'Anna Nagar';
    else if (combinedHistory.includes('medavakkam')) lastLocationContext = 'Medavakkam';
    else if (combinedHistory.includes('santhome')) lastLocationContext = 'Santhome';
    else if (combinedHistory.includes('pallikaranai')) lastLocationContext = 'Pallikaranai';
    else if (combinedHistory.includes('kannagi nagar')) lastLocationContext = 'Kannagi Nagar';
  }

  // Task: Contextual Member Follow-up (e.g., "Which of them joined this month?")
  if (p.includes('which of them') || p.includes('who of them') || p.includes('which of those') || p.includes('of these') || p.includes('from these') || ((p.includes('joined') || p.includes('join')) && (p.includes('them') || p.includes('which') || p.includes('who') || p.includes('these')))) {
    intents.push('filter', 'search');
    tasks.push({
      id: 'task-contextual-join-filter',
      type: 'contextual_member_filter',
      label: `Contextual Member Join Date Filter (${lastLocationContext || 'Directory'} ${dateRanges.period1})`,
      periodLabel: dateRanges.period1,
      queryTarget: lastLocationContext
    });
  }

  // Task: Member Count & Demographics
  if (p.includes('how many members') || p.includes('member count') || p.includes('total members') || p.includes('ethanai members') || (p.includes('member') && p.includes('there'))) {
    intents.push('count', 'summary');
    tasks.push({ id: 'task-member-count', type: 'member_count', label: 'Total Church Membership Summary' });
  }

  // Task: Member Absence / Activity Gap
  if (p.includes('no recorded activity') || p.includes('no attendance') || p.includes('absent members') || p.includes('missing attendance') || p.includes('haven\'t attended') || p.includes('inactive members')) {
    intents.push('filter', 'list');
    tasks.push({ id: 'task-absence', type: 'member_absence', label: 'Members with No Recorded Activity in Past 30 Days' });
  }

  // Task: Attendance Summary & Comparisons
  if (p.includes('attendance') || p.includes('turnout') || p.includes('varukai') || p.includes('check-in') || p.includes('present')) {
    intents.push('summary');
    tasks.push({
      id: 'task-attendance-p1',
      type: 'attendance_summary',
      label: `Attendance Summary (${dateRanges.period1})`,
      periodLabel: dateRanges.period1
    });

    if (dateRanges.period2 || p.includes('compare') || p.includes('difference') || p.includes('vs') || p.includes('opidu')) {
      intents.push('comparison');
      const p2 = dateRanges.period2 || (dateRanges.period1 === 'this_month' ? 'last_month' : 'July 2026');
      tasks.push({
        id: 'task-attendance-p2',
        type: 'attendance_summary',
        label: `Attendance Summary (${p2})`,
        periodLabel: p2
      });
      tasks.push({
        id: 'task-attendance-comp',
        type: 'attendance_comparison',
        label: `Attendance Period Comparison (${dateRanges.period1} vs ${p2})`,
        periodLabel: dateRanges.period1,
        period2Label: p2
      });
    }

    if (p.includes('highest attendance') || p.includes('ministry attendance') || p.includes('highest ministry') || p.includes('which ministry')) {
      intents.push('ranking');
      tasks.push({
        id: 'task-ministry-attendance',
        type: 'ministry_attendance',
        label: `Ministry Attendance Breakdown & Highest Ministry`,
        periodLabel: dateRanges.period1
      });
    }
  }

  // Task: Visitors & Follow-ups
  if (p.includes('visitor') || p.includes('guest') || p.includes('puthiyavarkal') || p.includes('newcomer') || p.includes('follow-up') || p.includes('pending follow')) {
    intents.push('summary', 'filter');
    tasks.push({ id: 'task-visitors', type: 'visitor_summary', label: 'Visitor Summary & Conversion Rate' });
    tasks.push({ id: 'task-visitor-followup', type: 'visitor_followup', label: 'Pending Visitor Follow-up Tasks' });
  }

  // Task: Ministry & Team Leadership / Assignments
  if (p.includes('ministr') || p.includes('team') || p.includes('who leads') || p.includes('leader') || p.includes('serve in') || p.includes('media') || p.includes('worship') || p.includes('hospitality')) {
    intents.push('summary', 'list');
    const minName = lastMinistryContext || (p.includes('media') ? 'Media & Tech Ministry' : p.includes('worship') ? 'Worship & Music Ministry' : undefined);
    
    tasks.push({
      id: 'task-ministries',
      type: minName ? 'ministry_details' : 'ministry_summary',
      label: minName ? `Ministry Details for ${minName}` : 'Ministries & Leaders Overview',
      ministryTarget: minName
    });

    if (p.includes('assignment') || p.includes('this sunday') || p.includes('roster') || p.includes('schedule') || p.includes('pani')) {
      tasks.push({
        id: 'task-roster',
        type: 'roster_assignments',
        label: `Roster & Sunday Assignments${minName ? ` for ${minName}` : ''}`,
        ministryTarget: minName
      });
    }
  }

  // Task: Upcoming Events
  if (p.includes('event') || p.includes('calendar') || p.includes('upcoming') || p.includes('schedule')) {
    intents.push('list');
    tasks.push({ id: 'task-events', type: 'upcoming_events', label: 'Upcoming Church Events' });
  }

  // Task: Prayer Requests
  if (p.includes('prayer') || p.includes('request') || p.includes('jepam') || p.includes('urgent')) {
    intents.push('summary');
    tasks.push({ id: 'task-prayers', type: 'prayer_summary', label: 'Prayer Requests Summary' });
  }

  // Task: Sunday School
  if (p.includes('sunday school') || p.includes('children') || p.includes('kids') || p.includes('teacher')) {
    intents.push('summary');
    tasks.push({ id: 'task-sunday-school', type: 'sunday_school', label: 'Sunday School Overview' });
  }

  // Task: User Account & System User Searches
  if (p.includes('user account') || p.includes('account') || p.includes('login') || p.includes('credentials') || p.includes('has account') || p.includes('have account')) {
    intents.push('lookup');
    tasks.push({ id: 'task-user-account', type: 'user_account_check', label: 'System User Account Status Check' });
  }

  if (p.includes('super admin') || p.includes('superadmin') || p.includes('admin access') || p.includes('pastor access')) {
    intents.push('lookup');
    tasks.push({ id: 'task-user-role', type: 'user_role_search', label: 'Admin User Privilege Lookup' });
  }

  // Task: Location Search
  if (p.includes('anna nagar') || p.includes('medavakkam') || p.includes('santhome') || p.includes('pallikaranai') || p.includes('kannagi nagar') || p.includes('from') || p.includes('living in') || p.includes('lives')) {
    if (!p.includes('how many members') && !p.includes('who is the last member')) {
      intents.push('search', 'filter');
      tasks.push({ id: 'task-location', type: 'location_search', label: 'Location & Directory Search' });
    }
  }

  // Task: Latest Member
  if (p.includes('last member') || p.includes('latest member') || p.includes('newest member') || p.includes('who joined last')) {
    intents.push('lookup');
    tasks.push({ id: 'task-latest-member', type: 'latest_member', label: 'Latest Registered Member Search' });
  }

  // Default: Overview if no specific task was identified
  if (tasks.length === 0) {
    intents.push('summary');
    tasks.push({ id: 'task-overview', type: 'church_overview', label: 'General Church Leadership Overview' });
  }

  return {
    prompt,
    language,
    intents: Array.from(new Set(intents)),
    tasks
  };
}

// ---------------------------------------------------------------------------
// 3. Multi-Tool Orchestrator & Validation Pipeline
// ---------------------------------------------------------------------------

export const aiPastorService = {
  /**
   * Main entry point to ask AI Pastor Assistant
   */
  async askAiPastor(options: AskAiPastorOptions): Promise<string> {
    const { prompt, churchId, userRole, userName, history, debugMode } = options;
    const startTime = Date.now();

    // 1. RBAC Security Check
    if (!canAccessAiPastor(userRole)) {
      throw new Error('Access Denied: The AI Pastor Assistant is strictly reserved for authorized church leadership (Pastors & Super Admins).');
    }

    // 2. Decompose Request into Execution Plan
    const plan = decomposeUserRequest(prompt, history);
    const trace: ExecutionTrace = {
      requestId: `req-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole,
      language: plan.language,
      intents: plan.intents,
      tasks: plan.tasks,
      toolsExecuted: [],
      executionTimeMs: 0,
      completenessCheck: []
    };

    // 3. Execute Tools & Gather Data Context
    const toolResults = await this.executePlanTools(plan, churchId, userRole, history, trace);

    // 4. Synthesize Complete Response
    const apiKey = getGeminiApiKey();
    let responseText = '';

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const fullPrompt = `${SYSTEM_INSTRUCTION}

[USER LANGUAGE]: ${plan.language.toUpperCase()}
[EXECUTION PLAN & FACTUAL DATA CONTEXT]:
${JSON.stringify(toolResults, null, 2)}

[USER QUERY]:
${prompt}`;

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
        });

        if (result && result.text) {
          responseText = result.text;
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, using local factual synthesizer:', geminiErr);
      }
    }

    // Fallback to robust local synthesizer if no Gemini response
    if (!responseText) {
      responseText = this.formatLocalSynthesizedResponse(prompt, plan, toolResults, trace);
    }

    trace.executionTimeMs = Date.now() - startTime;

    // 5. Append Debug Trace Payload only if explicit debugMode requested
    if (debugMode) {
      responseText += `\n\n---\n\`\`\`json\n// Developer / Admin Execution Trace\n${JSON.stringify(trace, null, 2)}\n\`\`\``;
    }

    // 6. Audit Logging
    try {
      await auditService.logAction(churchId, {
        action: 'ai_pastor_query',
        resource_type: 'ai_pastor_assistant',
        actor_name: userName || 'Leadership User',
        actor_role: userRole || 'PastorAdmin',
        details: {
          prompt,
          intents: plan.intents,
          taskCount: plan.tasks.length,
          executionTimeMs: trace.executionTimeMs,
          responseSnippet: responseText.slice(0, 150)
        }
      });
    } catch (auditErr) {
      console.error('Audit log failure:', auditErr);
    }

    return responseText;
  },

  /**
   * Executes tools in parallel where possible and performs completeness checks
   */
  async executePlanTools(plan: ExecutionPlan, churchId: string, userRole?: string, historyMessages: ChatMessage[] = [], trace?: ExecutionTrace) {
    const results: Record<string, any> = {};

    const toolPromises = plan.tasks.map(async (task) => {
      try {
        if (trace) trace.toolsExecuted.push(task.type);

        switch (task.type) {
          case 'member_count':
            results.memberSummary = await aiPastorToolsService.getMemberCountAndSummary(churchId, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'member_absence':
            results.absenceSummary = await aiPastorToolsService.getAbsenceFollowupSummary(churchId, 30, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'attendance_summary':
            const range = task.periodLabel || 'this_month';
            results[`attendance_${range}`] = await aiPastorToolsService.getAttendanceSummary(churchId, range, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'attendance_comparison':
            const p1 = task.periodLabel || 'this_month';
            const p2 = task.period2Label || 'last_month';
            results.attendanceComparison = await aiPastorToolsService.getAttendanceComparison(churchId, p1, p2, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'ministry_attendance':
            results.ministryAttendance = await aiPastorToolsService.getMinistryAttendance(churchId, task.periodLabel || 'this_month', userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'visitor_summary':
            results.visitorSummary = await aiPastorToolsService.getVisitorSummary(churchId, 'all_time', userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'visitor_followup':
            results.visitorFollowup = await aiPastorToolsService.getPendingVisitorFollowups(churchId, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'ministry_summary':
            results.ministriesSummary = await aiPastorToolsService.getMinistriesAndLeaders(churchId, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'ministry_details':
            results.ministryDetails = await aiPastorToolsService.getMinistryDetailsByName(churchId, task.ministryTarget || plan.prompt, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: results.ministryDetails ? 'completed' : 'unavailable' });
            break;

          case 'roster_assignments':
            results.rosterAssignments = await aiPastorToolsService.getRosterAssignments(churchId, task.ministryTarget || plan.prompt, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'upcoming_events':
            results.upcomingEvents = await aiPastorToolsService.getUpcomingEvents(churchId, 5, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'prayer_summary':
            results.prayerSummary = await aiPastorToolsService.getPrayerRequestsSummary(churchId, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'sunday_school':
            results.sundaySchoolSummary = await aiPastorToolsService.getSundaySchoolSummary(churchId, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'user_account_check':
            results.userAccountCheck = await aiPastorToolsService.checkUserAccountForPerson(churchId, plan.prompt, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'user_role_search':
            results.usersByRole = await aiPastorToolsService.getUsersByRole(churchId, plan.prompt, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'location_search':
            results.locationSearch = await aiPastorToolsService.searchMembersByQuery(churchId, plan.prompt, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'contextual_member_filter':
            results.contextualJoinFilter = await aiPastorToolsService.getContextualJoinFilter(
              churchId,
              task.periodLabel || 'this_month',
              task.queryTarget,
              historyMessages ? historyMessages.map((h: any) => h.text) : [],
              userRole
            );
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'latest_member':
            results.latestMember = await aiPastorToolsService.getLatestMember(churchId, userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;

          case 'church_overview':
          default:
            results.churchOverview = await aiPastorToolsService.getChurchActivityOverview(churchId, 'this_month', userRole);
            if (trace) trace.completenessCheck.push({ task: task.label, status: 'completed' });
            break;
        }
      } catch (err) {
        console.error(`Tool execution error for task ${task.type}:`, err);
        if (trace) trace.completenessCheck.push({ task: task.label, status: 'error' });
      }
    });

    await Promise.all(toolPromises);
    return results;
  },

  /**
   * Formats structured markdown response from executed tools addressing every task in the plan
   */
  formatLocalSynthesizedResponse(prompt: string, plan: ExecutionPlan, data: Record<string, any>, trace?: ExecutionTrace): string {
    const sections: string[] = [];
    const isTamil = plan.language === 'ta' || plan.language === 'mixed';

    // Contextual Join Filter Response
    if (data.contextualJoinFilter) {
      const f = data.contextualJoinFilter;
      const periodText = f.periodLabel === 'this_year' ? 'this year (2026)' : 'this month (September 2026)';
      if (f.matchedMembers && f.matchedMembers.length > 0) {
        sections.push(`### 📍 ${isTamil ? 'உறுப்பினர்கள் சேர்ந்த விவரம்' : `Members Matching Search (${f.locationContext})`}

Out of **${f.totalContextMembers} member(s)** from **${f.locationContext}**, **${f.matchedMembers.length} member(s)** joined ${periodText}:

${f.matchedMembers.map((m: any) => `- **${m.name}** (${m.status || 'Member'}) — Address: *${m.address || f.locationContext}* | Contact: ${m.phone || 'N/A'} | Joined: **${m.joinedDate}**`).join('\n')}`);
      } else {
        sections.push(`### 📍 ${isTamil ? 'உறுப்பினர்கள் சேர்ந்த விவரம்' : `Members Matching Search (${f.locationContext})`}

Out of **${f.totalContextMembers} member(s)** from **${f.locationContext}**, **0 members** joined ${periodText}.`);
      }
    }

    // 1. Membership Count
    if (data.memberSummary) {
      const m = data.memberSummary;
      sections.push(`### 📊 ${isTamil ? 'சபை உறுப்பினர்கள் சுருக்கம் (Membership Summary)' : 'Church Membership Summary'}

- **${isTamil ? 'மொத்த உறுப்பினர்கள்:' : 'Total Directory Members:'}** **${m.totalMembers}**
- **${isTamil ? 'செயல்பாட்டிலுள்ளவர்கள்:' : 'Active Members:'}** ${m.activeMembers}
- **${isTamil ? 'செயல்படாதவர்கள்:' : 'Inactive Members:'}** ${m.inactiveMembers}
- **${isTamil ? 'புதிய உறுப்பினர்கள் (கடந்த 30 நாட்கள்):' : 'New Joins (Past 30 Days):'}** ${m.newMembersPast30DaysCount}
- **${isTamil ? 'பாலின விவரம்:' : 'Demographics:'}** ${m.genderBreakdown.male} Male, ${m.genderBreakdown.female} Female${m.genderBreakdown.unspecified > 0 ? `, ${m.genderBreakdown.unspecified} Unspecified` : ''}`);
    }

    // 2. Attendance Summaries & Comparisons
    if (data.attendanceComparison) {
      const comp = data.attendanceComparison;
      sections.push(`### ⛪ ${isTamil ? 'ஞாயிறு வருகை ஒப்பீடு (Attendance Comparison)' : 'Sunday Attendance Comparison'}

- **${comp.period1.label}:** **${comp.period1.average} average present per service** (${comp.period1.totalPresent} total check-ins)
- **${comp.period2.label}:** **${comp.period2.average} average present per service** (${comp.period2.totalPresent} total check-ins)
- **${isTamil ? 'வித்தியாசம் (Difference):' : 'Difference & Change:'}** **${comp.differenceAverage >= 0 ? `+${comp.differenceAverage}` : comp.differenceAverage}** (${comp.percentageChange >= 0 ? `+${comp.percentageChange}%` : `${comp.percentageChange}%`})

*${comp.summaryText}*`);
    } else {
      Object.keys(data).forEach(k => {
        if (k.startsWith('attendance_') && data[k]) {
          const att = data[k];
          sections.push(`### ⛪ ${isTamil ? 'ஞாயிறு வருகை சுருக்கம்' : 'Sunday Attendance Summary'} (${att.dateRange})

- **Average Present Per Service:** **${att.averagePresentPerService} people**
- **Logged Check-ins:** ${att.totalPresent} present, ${att.totalAbsent} absent across ${att.totalRecordsLogged} records.`);
        }
      });
    }

    // 3. Ministry Attendance Breakdown & Highest Ministry
    if (data.ministryAttendance) {
      const minAtt = data.ministryAttendance;
      const list = minAtt.ministries.map((m: any) => `- **${m.ministryName}**: Avg **${m.averageAttendance} present** (${m.totalTeamMembers} team members)`).join('\n');
      sections.push(`### 🏆 ${isTamil ? 'ஊழியங்கள் வாரியாக வருகை' : 'Ministry Attendance Breakdown'}

- **Highest Attendance Ministry:** **${minAtt.highestAttendanceMinistry ? minAtt.highestAttendanceMinistry.ministryName : 'N/A'}** (Avg **${minAtt.highestAttendanceMinistry?.averageAttendance || 0}**)

**Ministry Attendance Ranking:**
${list}`);
    }

    // 4. Member Absence Follow-up
    if (data.absenceSummary) {
      const abs = data.absenceSummary;
      const list = abs.absentMembers.slice(0, 5).map((m: any) => `- **${m.name}** — Phone: ${m.phone} | Last Attended: ${m.lastAttendedDate}`).join('\n');
      sections.push(`### ⚠️ ${isTamil ? 'வருகை பதிவில்லாத உறுப்பினர்கள்' : 'Members with No Recorded Attendance (Past 30 Days)'}

- **Total Inactive / Absent Members Count:** **${abs.absentMembersCount} members** (${abs.absentPercentage}% of congregation)

**Members Requiring Pastoral Care Contact:**
${list}`);
    }

    // 5. Visitors & Follow-ups
    if (data.visitorSummary || data.visitorFollowup) {
      const v = data.visitorSummary;
      const f = data.visitorFollowup;
      sections.push(`### 🤝 ${isTamil ? 'புதியவர்கள் மற்றும் தொடர் தொடர்புகள்' : 'Visitors & Follow-up Tasks Summary'}

- **Total Recorded Visitors:** **${v ? v.totalVisitorsCount : 0}** (${v ? v.firstTimeVisitors : 0} first-time, ${v ? v.convertedVisitors : 0} converted to members)
- **Visitor Conversion Rate:** **${v ? v.conversionRatePercentage : 0}%**
- **Pending Visitor Follow-up Tasks:** **${f ? f.totalPendingFollowUpVisitors : 0} visitors needing contact**`);
    }

    // 6. Ministry Details & Roster Assignments
    if (data.ministryDetails) {
      const md = data.ministryDetails;
      sections.push(`### 🕊️ ${md.ministryName} Details

- **Ministry Leader:** **${md.leaderName}**
- **Meeting Schedule:** ${md.meetingSchedule}
- **Active Team Count:** **${md.totalMembers} members**`);
    }

    if (data.rosterAssignments) {
      const r = data.rosterAssignments;
      const list = r.assignments.length > 0
        ? r.assignments.map((a: any) => `- **${a.role}**: **${a.assignedPerson}** (${a.serviceDate})`).join('\n')
        : 'No specific assignments scheduled for this period.';
      sections.push(`### 📋 ${isTamil ? 'ஊழிய பணிகள்' : 'Sunday Roster & Service Assignments'}

${list}`);
    }

    // 7. Upcoming Events
    if (data.upcomingEvents) {
      const e = data.upcomingEvents;
      const list = e.events.length > 0
        ? e.events.map((ev: any) => `- **${ev.title}**: ${ev.startDate} at ${ev.startTime} (${ev.location})`).join('\n')
        : 'No upcoming church events currently scheduled.';
      sections.push(`### 📅 ${isTamil ? 'வரவிருக்கும் நிகழ்வுகள்' : 'Upcoming Church Events'}

${list}`);
    }

    // 8. User Account Search / Role Searches
    if (data.userAccountCheck) {
      const res = data.userAccountCheck;
      const uFound = res.matchingUsers[0];
      const mFound = res.matchingMembers[0];

      if (uFound) {
        sections.push(`### 🔐 User Account Status for "${uFound.name}"

- **Person Name:** **${uFound.name}**
- **System User Login Account:** ✅ **Active User Account**
- **Assigned Role:** \`${uFound.role}\` (${uFound.designation})
- **Username / Login:** \`${uFound.username || uFound.email}\`
- **Email:** ${uFound.email}`);
      } else if (mFound) {
        sections.push(`### 🔐 User Account Status for "${mFound.name}"

- **Member Profile:** Registered Church Member (**${mFound.name}**)
- **Joined Date:** ${mFound.joinedDate}
- **System User Login Account:** ❌ **No System Login Account**`);
      } else {
        sections.push(`### 🔐 User Account Search Result\n\nNo member profile or login account found matching "**${res.searchedName}**".`);
      }
    }

    if (data.usersByRole) {
      const u = data.usersByRole;
      const list = u.users.map((usr: any) => `- **${usr.name}** (\`${usr.username || usr.email}\`) — Role: **${usr.role}**`).join('\n');
      sections.push(`### 🔐 Administrative Users\n\n${list}`);
    }

    // 9. Location Search
    if (data.locationSearch) {
      const loc = data.locationSearch;
      if (loc.length === 0) {
        sections.push(`### 📍 Directory Location Search\n\nNo members were found matching your location search query (**"${prompt}"**).`);
      } else {
        const list = loc.map((m: any) => `- **${m.name}** (${m.status}) — Address: *${m.address || m.city || 'Chennai'}* | Contact: ${m.phone || m.email || 'N/A'}`).join('\n');
        sections.push(`### 📍 Members Matching Location Search\nFound **${loc.length} member(s)**:\n\n${list}`);
      }
    }

    // 10. Latest Member
    if (data.latestMember) {
      const lm = data.latestMember;
      sections.push(`### 👤 Latest Registered Member\n\n- **Name:** **${lm.name}**\n- **Joined Date:** ${lm.joinedDate}\n- **Address:** ${lm.address || lm.city || 'Chennai'}\n- **Contact:** ${lm.phone || lm.email || 'N/A'}`);
    }

    // 11. General Overview fallback
    if (data.churchOverview) {
      const m = data.churchOverview.churchMetrics;
      sections.push(`### ✝️ Church Leadership Overview

Welcome, Pastor! Here is your operational summary:
- **Total Members:** **${m.totalMembers}** (${m.activeMembers} active)
- **Average Attendance:** **${m.averageAttendance}**
- **Total Visitors:** **${m.totalVisitors}** (${m.visitorConversionRate} conversion rate)
- **Active Prayers:** **${m.activePrayers}** (${m.urgentPrayers} urgent)
- **Upcoming Events:** **${m.upcomingEventsCount}**`);
    }

    // Explicit Check for Missing / Unavailable Data Parts
    if (trace && trace.completenessCheck.length > 0) {
      const unavail = trace.completenessCheck.filter(c => c.status === 'unavailable' || c.status === 'error');
      if (unavail.length > 0) {
        const unavailText = unavail.map(c => `- *${c.task}*: Data was not available in current church records.`).join('\n');
        sections.push(`\n> **⚠️ Data Completeness Notice:**\n${unavailText}`);
      }
    }

    return sections.join('\n\n');
  }
};
