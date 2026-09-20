import { 
  Member, AttendanceRecord, RosterAssignment, ChurchEvent, SundaySchoolAttendanceRecord 
} from '../types';
import { canAccessAllChurchReports, normalizeRole } from '../utils/rbac';
import { auditService } from './auditService';
import { GoogleGenAI } from '@google/genai';

export interface AbsenceFollowUpSettings {
  enabled: boolean;
  consecutiveMissedThreshold: number;   // default: 2
  daysInactive14Threshold: number;     // default: 14
  daysInactive30Threshold: number;     // default: 30
  consecutiveSundaysThreshold: number;  // default: 3
  maxFollowUpAttempts: number;         // default: 3
  requireApproval: boolean;            // default: true (Approval-First)
  preferredChannel: 'whatsapp' | 'email' | 'sms' | 'in_app';
  languagePreference: 'en' | 'ta' | 'auto';
  quietHoursStart?: string;            // e.g. "21:00"
  quietHoursEnd?: string;              // e.g. "08:00"
  doNotContactBehavior: 'suppress_all';
}

export type AbsenceRuleCode = 'consecutive_missed' | 'days_14' | 'days_30' | 'sundays_3';

export type AutomatedAbsenceTaskStatus = 
  | 'awaiting_approval' 
  | 'approved' 
  | 'sent' 
  | 'completed' 
  | 'resolved_by_attendance' 
  | 'skipped' 
  | 'do_not_contact';

export interface AutomatedAbsenceFollowUpTask {
  id: string; // Idempotency key: `aft_${memberId}_${ruleCode}_${lastAttendanceDate || 'none'}`
  churchId: string;
  memberId: string;
  memberName: string;
  phone?: string | null;
  email?: string | null;
  ruleCode: AbsenceRuleCode;
  ruleDescription: string;
  lastAttendanceDate: string | null; // YYYY-MM-DD or null
  daysSinceLastAttendance: number;
  missedServicesCount: number;
  dueDate: string; // YYYY-MM-DD
  status: AutomatedAbsenceTaskStatus;
  channel: 'whatsapp' | 'email' | 'sms' | 'in_app';
  language: 'en' | 'ta' | 'mixed';
  preparedMessage: string;
  editedMessage?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  approvalRequired: boolean;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  sentAt?: string | null;
  resolvedAt?: string | null;
  attemptsCount: number;
  lastAttemptAt?: string | null;
  failureReason?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

const SETTINGS_STORAGE_KEY = 'church_cms_absence_followup_settings';
const TASKS_STORAGE_KEY = 'church_cms_absence_followup_tasks';
const DNC_STORAGE_KEY = 'church_cms_absence_dnc_members';

export const DEFAULT_ABSENCE_FOLLOWUP_SETTINGS: AbsenceFollowUpSettings = {
  enabled: true,
  consecutiveMissedThreshold: 2,
  daysInactive14Threshold: 14,
  daysInactive30Threshold: 30,
  consecutiveSundaysThreshold: 3,
  maxFollowUpAttempts: 3,
  requireApproval: true, // Safety approval-first default
  preferredChannel: 'whatsapp',
  languagePreference: 'auto',
  quietHoursStart: '21:00',
  quietHoursEnd: '08:00',
  doNotContactBehavior: 'suppress_all'
};

/**
 * 1. Settings Accessors
 */
export function getAbsenceFollowUpSettings(churchId: string): AbsenceFollowUpSettings {
  try {
    const raw = localStorage.getItem(`${SETTINGS_STORAGE_KEY}_${churchId}`);
    if (raw) return { ...DEFAULT_ABSENCE_FOLLOWUP_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to read absence follow-up settings:', e);
  }
  return DEFAULT_ABSENCE_FOLLOWUP_SETTINGS;
}

export function saveAbsenceFollowUpSettings(churchId: string, settings: AbsenceFollowUpSettings, userId?: string) {
  try {
    localStorage.setItem(`${SETTINGS_STORAGE_KEY}_${churchId}`, JSON.stringify(settings));
    auditService.logAction(churchId, {
      action: 'absence_followup_settings.updated',
      resource_type: 'settings',
      details: settings,
      actor_id: userId
    });
  } catch (e) {
    console.error('Failed to save absence follow-up settings:', e);
  }
}

/**
 * 2. Tasks Accessors
 */
export function getAutomatedAbsenceTasks(churchId: string): AutomatedAbsenceFollowUpTask[] {
  try {
    const raw = localStorage.getItem(`${TASKS_STORAGE_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read automated absence tasks:', e);
  }
  return [];
}

export function saveAutomatedAbsenceTasks(churchId: string, tasks: AutomatedAbsenceFollowUpTask[]) {
  try {
    localStorage.setItem(`${TASKS_STORAGE_KEY}_${churchId}`, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save automated absence tasks:', e);
  }
}

/**
 * Do Not Contact (DNC) Members Registry
 */
export function getAbsenceDNCMembers(churchId: string): string[] {
  try {
    const raw = localStorage.getItem(`${DNC_STORAGE_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function setMemberAbsenceDNC(churchId: string, memberId: string, userId?: string) {
  try {
    const list = getAbsenceDNCMembers(churchId);
    if (!list.includes(memberId)) {
      list.push(memberId);
      localStorage.setItem(`${DNC_STORAGE_KEY}_${churchId}`, JSON.stringify(list));
    }
    // Also mark all open tasks for this member as do_not_contact
    const tasks = getAutomatedAbsenceTasks(churchId);
    let updated = false;
    tasks.forEach((t) => {
      if (t.memberId === memberId && (t.status === 'awaiting_approval' || t.status === 'approved')) {
        t.status = 'do_not_contact';
        t.updatedAt = new Date().toISOString();
        updated = true;
      }
    });
    if (updated) saveAutomatedAbsenceTasks(churchId, tasks);

    auditService.logAction(churchId, {
      action: 'absence_followup.member_dnc_set',
      resource_type: 'member',
      resource_id: memberId,
      actor_id: userId
    });
  } catch (e) {
    console.error('Failed to set DNC for member:', e);
  }
}

/**
 * 3. Security Check
 */
export function verifyAbsenceFollowUpAccess(userRole?: string): boolean {
  const norm = normalizeRole(userRole);
  return canAccessAllChurchReports(norm) || norm === 'MinistryLeader';
}

/**
 * 4. Helper: Calculate member's attendance record and inactivity metrics
 */
export interface MemberAbsenceMetrics {
  memberId: string;
  memberName: string;
  lastAttendanceDate: string | null;
  daysSinceLastAttendance: number;
  consecutiveMissedServices: number;
  consecutiveMissedSundays: number;
  totalServicesAttended: number;
  attendanceHistory: string[]; // Sorted YYYY-MM-DD descending
}

export function computeMemberAbsenceMetrics(
  memberId: string,
  memberName: string,
  attendanceRecords: AttendanceRecord[],
  roster: RosterAssignment[] = [],
  events: ChurchEvent[] = [],
  nowDate = new Date()
): MemberAbsenceMetrics {
  const attendedDatesSet = new Set<string>();

  // Extract recorded attendance from standard attendance records
  attendanceRecords.forEach((rec: any) => {
    const recDate = rec.date || rec.service_date;
    if (!recDate) return;
    const isPresent = (Array.isArray(rec.presentMemberIds) && rec.presentMemberIds.includes(memberId)) ||
                      rec.member_id === memberId || rec.memberId === memberId;
    if (isPresent) {
      attendedDatesSet.add(recDate.split('T')[0]);
    }
  });

  // Extract from roster assignments marked as completed or confirmed
  roster.forEach((r: any) => {
    if (r.memberId === memberId && (r.confirmed || r.status === 'completed' || r.status === 'confirmed') && r.serviceDate) {
      attendedDatesSet.add(r.serviceDate.split('T')[0]);
    }
  });

  const sortedAttendedDates = Array.from(attendedDatesSet).sort().reverse();
  const lastAttendanceDate = sortedAttendedDates.length > 0 ? sortedAttendedDates[0] : null;

  let daysSinceLastAttendance = 999;
  if (lastAttendanceDate) {
    const lastDate = new Date(lastAttendanceDate);
    const diffTime = nowDate.getTime() - lastDate.getTime();
    daysSinceLastAttendance = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  // Get unique distinct service dates across all recorded services
  const allServiceDates = Array.from(new Set(attendanceRecords.map((r: any) => {
    const d = r.date || r.service_date;
    return d ? d.split('T')[0] : '';
  }))).filter(Boolean).sort().reverse();
  
  // Count consecutive missed recent services
  let consecutiveMissedServices = 0;
  for (const sDate of allServiceDates) {
    if (!attendedDatesSet.has(sDate)) {
      consecutiveMissedServices++;
    } else {
      break;
    }
  }

  // Count consecutive missed Sundays
  const sundayServiceDates = allServiceDates.filter(d => {
    const dt = new Date(d);
    return dt.getDay() === 0;
  });

  let consecutiveMissedSundays = 0;
  for (const sDate of sundayServiceDates) {
    if (!attendedDatesSet.has(sDate)) {
      consecutiveMissedSundays++;
    } else {
      break;
    }
  }

  return {
    memberId,
    memberName,
    lastAttendanceDate,
    daysSinceLastAttendance,
    consecutiveMissedServices,
    consecutiveMissedSundays,
    totalServicesAttended: sortedAttendedDates.length,
    attendanceHistory: sortedAttendedDates
  };
}

/**
 * 5. Prepared Factual Message Generator (Tamil & English)
 */
export async function generateAbsenceFollowUpMessage(params: {
  memberName: string;
  churchName: string;
  ruleCode: AbsenceRuleCode;
  daysInactive: number;
  lastAttendanceDate: string | null;
  language: 'en' | 'ta' | 'mixed';
}): Promise<string> {
  const { memberName, churchName, ruleCode, daysInactive, lastAttendanceDate, language } = params;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  const cleanName = memberName ? memberName.split(' ')[0] : 'Member';

  // Static neutral fallbacks in English and Tamil
  let fallbackEn = `Dear ${cleanName}, warm greetings from ${churchName}. We noticed you haven't been in our recent church services and wanted to check in on you. Please let us know if you need prayer or any pastoral support!`;
  let fallbackTa = `வணக்கம் ${cleanName}, ${churchName}-ன் அன்பான வாழ்த்துகள். சமீபத்திய சபைக் கூடுகைகளில் உங்களைக் காணவில்லை. நீங்கள் நலமாக இருக்கிறீர்களா என அறிந்துகொள்ள விரும்புகிறோம். உங்களுக்கு ஜெபப் பரிந்துரை தேவைப்பட்டால் எங்களைத் தொடர்புகொள்ளவும்.`;

  if (ruleCode === 'days_30') {
    fallbackEn = `Dear ${cleanName}, greetings from ${churchName}. We missed seeing you in our gatherings over the past month. We hope you are doing well and would love to hear from you if you need any assistance or prayer.`;
    fallbackTa = `வணக்கம் ${cleanName}, ${churchName}-ன் அன்பான வாழ்த்துகள். கடந்த ஒரு மாதமாக உங்களை ஆராதனைகளில் காணவில்லை. நீங்கள் சௌக்கியமாக இருக்கிறீர்கள் என நம்புகிறோம். திருச்சபையின் ஜெப உதவி தேவைப்பட்டால் எங்களை தயங்காமல் தொடர்பு கொள்ளவும்.`;
  } else if (ruleCode === 'sundays_3') {
    fallbackEn = `Dear ${cleanName}, greetings from ${churchName}. We noticed you were absent for the last 3 Sunday worship services. We are praying for your well-being and hope to see you soon!`;
    fallbackTa = `வணக்கம் ${cleanName}, ${churchName}-ன் அன்பான வாழ்த்துகள். கடந்த 3 ஞாயிறு ஆராதனைகளில் உங்கள் வருகை பதிவாகவில்லை. உங்கள் நலனுக்காக ஜெபிக்கிறோம். விரைவில் உங்களைக் காண ஆவலாக இருக்கிறோம்.`;
  }

  if (language === 'ta') {
    if (!apiKey) return fallbackTa;
  } else if (language === 'en') {
    if (!apiKey) return fallbackEn;
  } else {
    // auto / mixed default fallback
    if (!apiKey) return `${fallbackEn}\n\n${fallbackTa}`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a warm, caring, non-judgmental church follow-up assistant for ${churchName}.
Write a short, encouraging follow-up message for church member "${cleanName}".

Context:
- Rule triggered: ${ruleCode}
- Days without recorded attendance: ${daysInactive}
- Last recorded attendance: ${lastAttendanceDate || 'No recent record'}
- Target Language: ${language === 'ta' ? 'Tamil (Tamil script)' : language === 'en' ? 'English' : 'Bilingual (English first, followed by Tamil)'}

CRITICAL INSTRUCTIONS:
- NEVER use judgmental terms like "uncommitted", "backsliding", "spiritually weak", "lazy", or "unfaithful".
- Keep it under 50 words.
- Express warm care, ask about their well-being, offer prayer support.
- Output ONLY the final message text. No titles, preambles, or markdown formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim();
    if (text && text.length > 10) {
      return text;
    }
  } catch (err) {
    console.warn('AI absence follow-up message generation failed, using standard fallback:', err);
  }

  if (language === 'ta') return fallbackTa;
  if (language === 'en') return fallbackEn;
  return `${fallbackEn}\n\n${fallbackTa}`;
}

/**
 * 6. Main Automation Sync Processor (Idempotent + Return-to-Attendance Reset)
 */
export async function processAutomatedAbsenceFollowUps(params: {
  churchId: string;
  churchName: string;
  members: Member[];
  attendanceRecords: AttendanceRecord[];
  roster?: RosterAssignment[];
  events?: ChurchEvent[];
  userRole?: string;
  userId?: string;
}): Promise<{
  processedCount: number;
  newTasksCreated: number;
  resolvedByAttendanceCount: number;
  tasks: AutomatedAbsenceFollowUpTask[];
}> {
  const {
    churchId,
    churchName,
    members = [],
    attendanceRecords = [],
    roster = [],
    events = [],
    userRole,
    userId
  } = params;

  if (!verifyAbsenceFollowUpAccess(userRole)) {
    return { processedCount: 0, newTasksCreated: 0, resolvedByAttendanceCount: 0, tasks: [] };
  }

  const settings = getAbsenceFollowUpSettings(churchId);
  if (!settings.enabled) {
    return { processedCount: 0, newTasksCreated: 0, resolvedByAttendanceCount: 0, tasks: getAutomatedAbsenceTasks(churchId) };
  }

  const existingTasks = getAutomatedAbsenceTasks(churchId);
  const existingTasksMap = new Map<string, AutomatedAbsenceFollowUpTask>();
  existingTasks.forEach((t) => existingTasksMap.set(t.id, t));

  const dncList = getAbsenceDNCMembers(churchId);
  const now = new Date();
  const nowDateStr = now.toISOString().split('T')[0];

  let newTasksCreated = 0;
  let resolvedByAttendanceCount = 0;
  const updatedTasks: AutomatedAbsenceFollowUpTask[] = [...existingTasks];

  for (const member of members) {
    // Exclude non-active members (inactive, archived, transferred, moved_away)
    const statusLower = (member.status || '').toLowerCase();
    if (['inactive', 'archived', 'transferred', 'moved_away'].includes(statusLower)) {
      continue;
    }

    // Exclude explicit Do Not Contact members
    if (dncList.includes(member.id)) {
      continue;
    }

    const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Church Member';
    const metrics = computeMemberAbsenceMetrics(member.id, memberName, attendanceRecords, roster, events, now);

    // --------------------------------------------------------------------------
    // A. RETURN-TO-ATTENDANCE AUTOMATIC RESET LOGIC
    // Check if member has active open tasks that are now resolved because a new attendance was logged
    // --------------------------------------------------------------------------
    updatedTasks.forEach((task) => {
      if (
        task.memberId === member.id &&
        (task.status === 'awaiting_approval' || task.status === 'approved' || task.status === 'sent')
      ) {
        // If member's last attendance date is AFTER task creation date or task's previous last attendance date
        if (
          metrics.lastAttendanceDate &&
          (!task.lastAttendanceDate || metrics.lastAttendanceDate > task.lastAttendanceDate || metrics.lastAttendanceDate >= task.createdAt.split('T')[0])
        ) {
          task.status = 'resolved_by_attendance';
          task.resolvedAt = new Date().toISOString();
          task.updatedAt = new Date().toISOString();
          task.resolutionNote = `Automatically resolved: Attendance recorded on ${metrics.lastAttendanceDate}.`;
          resolvedByAttendanceCount++;

          auditService.logAction(churchId, {
            action: 'absence_followup.resolved_by_attendance',
            resource_type: 'member',
            resource_id: member.id,
            details: { taskId: task.id, newAttendanceDate: metrics.lastAttendanceDate },
            actor_id: userId || 'system'
          });
        }
      }
    });

    // --------------------------------------------------------------------------
    // B. ABSENCE RULE EVALUATION & IDEMPOTENT TASK CREATION
    // --------------------------------------------------------------------------
    const rulesToEvaluate: Array<{ code: AbsenceRuleCode; desc: string; triggered: boolean }> = [
      {
        code: 'days_30',
        desc: `30 days without recorded attendance (${metrics.daysSinceLastAttendance} days elapsed)`,
        triggered: metrics.daysSinceLastAttendance >= settings.daysInactive30Threshold
      },
      {
        code: 'days_14',
        desc: `14 days without recorded attendance (${metrics.daysSinceLastAttendance} days elapsed)`,
        triggered: metrics.daysSinceLastAttendance >= settings.daysInactive14Threshold && metrics.daysSinceLastAttendance < settings.daysInactive30Threshold
      },
      {
        code: 'sundays_3',
        desc: `Missed ${metrics.consecutiveMissedSundays} consecutive Sunday services`,
        triggered: metrics.consecutiveMissedSundays >= settings.consecutiveSundaysThreshold
      },
      {
        code: 'consecutive_missed',
        desc: `Missed ${metrics.consecutiveMissedServices} consecutive recorded services`,
        triggered: metrics.consecutiveMissedServices >= settings.consecutiveMissedThreshold && metrics.consecutiveMissedSundays < settings.consecutiveSundaysThreshold
      }
    ];

    // Pick the most significant triggered rule
    const activeRule = rulesToEvaluate.find(r => r.triggered);

    if (activeRule) {
      // Idempotency Key Format: `aft_${member.id}_${activeRule.code}_${metrics.lastAttendanceDate || 'none'}`
      const idempotencyKey = `aft_${member.id}_${activeRule.code}_${metrics.lastAttendanceDate || 'none'}`;

      // Check if task already exists
      const existingTaskIndex = updatedTasks.findIndex(t => t.id === idempotencyKey);

      if (existingTaskIndex === -1) {
        // Generate message in English/Tamil based on settings
        const preparedMessage = await generateAbsenceFollowUpMessage({
          memberName,
          churchName,
          ruleCode: activeRule.code,
          daysInactive: metrics.daysSinceLastAttendance,
          lastAttendanceDate: metrics.lastAttendanceDate,
          language: settings.languagePreference === 'ta' ? 'ta' : settings.languagePreference === 'en' ? 'en' : 'mixed'
        });

        const newTask: AutomatedAbsenceFollowUpTask = {
          id: idempotencyKey,
          churchId,
          memberId: member.id,
          memberName,
          phone: member.phone || null,
          email: member.email || null,
          ruleCode: activeRule.code,
          ruleDescription: activeRule.desc,
          lastAttendanceDate: metrics.lastAttendanceDate,
          daysSinceLastAttendance: metrics.daysSinceLastAttendance,
          missedServicesCount: activeRule.code === 'sundays_3' ? metrics.consecutiveMissedSundays : metrics.consecutiveMissedServices,
          dueDate: nowDateStr,
          status: settings.requireApproval ? 'awaiting_approval' : 'sent',
          channel: settings.preferredChannel,
          language: settings.languagePreference === 'ta' ? 'ta' : settings.languagePreference === 'en' ? 'en' : 'mixed',
          preparedMessage,
          approvalRequired: settings.requireApproval,
          sentAt: settings.requireApproval ? undefined : new Date().toISOString(),
          attemptsCount: settings.requireApproval ? 0 : 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        updatedTasks.unshift(newTask);
        newTasksCreated++;

        auditService.logAction(churchId, {
          action: 'absence_followup.task_created',
          resource_type: 'member',
          resource_id: member.id,
          details: { taskId: idempotencyKey, ruleCode: activeRule.code, status: newTask.status },
          actor_id: userId || 'system'
        });
      }
    }
  }

  saveAutomatedAbsenceTasks(churchId, updatedTasks);

  return {
    processedCount: members.length,
    newTasksCreated,
    resolvedByAttendanceCount,
    tasks: updatedTasks
  };
}

/**
 * 7. Action Handlers: Approve, Skip, Send
 */
export function approveAndSendAbsenceTask(params: {
  churchId: string;
  taskId: string;
  userId: string;
  editedMessage?: string;
  channel?: 'whatsapp' | 'email' | 'sms' | 'in_app';
}): AutomatedAbsenceFollowUpTask | null {
  const { churchId, taskId, userId, editedMessage, channel } = params;
  const tasks = getAutomatedAbsenceTasks(churchId);
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) return null;

  const task = tasks[taskIndex];
  task.status = 'sent';
  if (editedMessage) task.editedMessage = editedMessage;
  if (channel) task.channel = channel;
  task.approvedByUserId = userId;
  task.approvedAt = new Date().toISOString();
  task.sentAt = new Date().toISOString();
  task.attemptsCount += 1;
  task.lastAttemptAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();

  tasks[taskIndex] = task;
  saveAutomatedAbsenceTasks(churchId, tasks);

  auditService.logAction(churchId, {
    action: 'absence_followup.task_approved_and_sent',
    resource_type: 'absence_task',
    resource_id: taskId,
    details: { memberId: task.memberId, channel: task.channel },
    actor_id: userId
  });

  return task;
}

export function skipAbsenceTask(params: {
  churchId: string;
  taskId: string;
  userId: string;
  reason?: string;
}): boolean {
  const { churchId, taskId, userId, reason } = params;
  const tasks = getAutomatedAbsenceTasks(churchId);
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) return false;

  tasks[taskIndex].status = 'skipped';
  tasks[taskIndex].resolutionNote = reason || 'Skipped by staff';
  tasks[taskIndex].updatedAt = new Date().toISOString();

  saveAutomatedAbsenceTasks(churchId, tasks);

  auditService.logAction(churchId, {
    action: 'absence_followup.task_skipped',
    resource_type: 'absence_task',
    resource_id: taskId,
    details: { reason },
    actor_id: userId
  });

  return true;
}
