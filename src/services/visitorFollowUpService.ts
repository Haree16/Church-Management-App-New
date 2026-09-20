import { 
  Visitor, FollowUp, FollowUpHistory, UserRole 
} from '../types/database';
import { canAccessAllChurchReports, normalizeRole } from '../utils/rbac';
import { auditService } from './auditService';
import { GoogleGenAI } from '@google/genai';

export interface VisitorFollowUpSettings {
  enabled: boolean;
  firstFollowUpDelayHours: number;   // default: 24 (1 day)
  secondFollowUpDelayHours: number;  // default: 72 (3 days)
  thirdFollowUpDelayHours: number;   // default: 168 (7 days)
  maxFollowUpAttempts: number;       // default: 3
  requireApproval: boolean;          // default: true (Approval-First Design)
  preferredChannel: 'whatsapp' | 'email' | 'sms' | 'in_app';
  languagePreference: 'en' | 'ta' | 'auto';
  defaultAssignedUserId?: string | null;
  defaultAssignedUserName?: string | null;
  quietHoursStart?: string;          // e.g. "21:00"
  quietHoursEnd?: string;            // e.g. "08:00"
  doNotContactBehavior: 'suppress_all';
}

export type FollowUpTaskStage = 1 | 2 | 3;

export type AutomatedTaskStatus = 
  | 'new' 
  | 'follow_up_due' 
  | 'message_prepared' 
  | 'awaiting_approval' 
  | 'sent' 
  | 'completed' 
  | 'failed' 
  | 'skipped' 
  | 'do_not_contact';

export interface AutomatedVisitorFollowUpTask {
  id: string; // Idempotency key: `vft_${visitorId}_stage${stage}`
  churchId: string;
  visitorId: string;
  visitorName: string;
  visitorPhone?: string | null;
  visitorEmail?: string | null;
  serviceAttended?: string | null;
  visitDate: string;
  stage: FollowUpTaskStage;
  dueDate: string; // YYYY-MM-DD
  status: AutomatedTaskStatus;
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
  completedAt?: string | null;
  attemptsCount: number;
  lastAttemptAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const SETTINGS_STORAGE_KEY = 'church_cms_visitor_followup_settings';
const TASKS_STORAGE_KEY = 'church_cms_visitor_followup_tasks';

export const DEFAULT_VISITOR_FOLLOWUP_SETTINGS: VisitorFollowUpSettings = {
  enabled: true,
  firstFollowUpDelayHours: 24,
  secondFollowUpDelayHours: 72,
  thirdFollowUpDelayHours: 168,
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
export function getVisitorFollowUpSettings(churchId: string): VisitorFollowUpSettings {
  try {
    const raw = localStorage.getItem(`${SETTINGS_STORAGE_KEY}_${churchId}`);
    if (raw) return { ...DEFAULT_VISITOR_FOLLOWUP_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to read visitor follow-up settings:', e);
  }
  return DEFAULT_VISITOR_FOLLOWUP_SETTINGS;
}

export function saveVisitorFollowUpSettings(churchId: string, settings: VisitorFollowUpSettings, userId?: string) {
  try {
    localStorage.setItem(`${SETTINGS_STORAGE_KEY}_${churchId}`, JSON.stringify(settings));
    auditService.logAction(churchId, {
      action: 'visitor_followup_settings.updated',
      resource_type: 'settings',
      details: settings,
      actor_id: userId
    });
  } catch (e) {
    console.error('Failed to save visitor follow-up settings:', e);
  }
}

/**
 * 2. Tasks Accessors
 */
export function getAutomatedFollowUpTasks(churchId: string): AutomatedVisitorFollowUpTask[] {
  try {
    const raw = localStorage.getItem(`${TASKS_STORAGE_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read automated follow-up tasks:', e);
  }
  return [];
}

export function saveAutomatedFollowUpTasks(churchId: string, tasks: AutomatedVisitorFollowUpTask[]) {
  try {
    localStorage.setItem(`${TASKS_STORAGE_KEY}_${churchId}`, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save automated follow-up tasks:', e);
  }
}

/**
 * 3. Access Verification
 */
export function verifyVisitorFollowUpAccess(userRole?: string): boolean {
  const norm = normalizeRole(userRole);
  return canAccessAllChurchReports(norm) || norm === 'MinistryLeader';
}

/**
 * 4. AI & Template Message Generator
 */
export async function generateVisitorFollowUpMessage(params: {
  visitor: Visitor;
  churchName: string;
  stage: FollowUpTaskStage;
  language: 'en' | 'ta' | 'mixed';
}): Promise<string> {
  const { visitor, churchName, stage, language } = params;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const visitorName = `${visitor.first_name || ''} ${visitor.last_name || ''}`.trim() || 'Friend';
  const serviceName = visitor.service_attended || 'our church service';

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Generate a short, warm, respectful visitor follow-up message for stage ${stage} from ${churchName}.
Visitor Name: ${visitorName}
Service Attended: ${serviceName}
Target Language: ${language === 'ta' ? 'Tamil' : 'English'}

STRICT RULES:
1. Keep it short (2-3 sentences max).
2. NEVER pressure the visitor or say "you haven't responded" or "you need to come back".
3. Use verified church name (${churchName}) only. Do not invent events or promises.
4. If language is Tamil, respond in clean Tamil script.`;

      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.3, maxOutputTokens: 250 }
      });

      const text = res.text?.trim();
      if (text) return text;
    } catch (err) {
      console.warn('Gemini API call failed for visitor message, using fallback:', err);
    }
  }

  // Fallback Templates
  if (language === 'ta') {
    if (stage === 1) {
      return `வணக்கம் ${visitorName}, ${churchName} ஆராதனையில் கலந்து கொண்டதற்கு மிக்க நன்றி! உங்கள் வருகை எங்களுக்கு மிகுந்த மகிழ்ச்சி அளிக்கிறது. கடவுளின் ஆசீர்வாதம் உங்களுடன் இருப்பதாக.`;
    } else if (stage === 2) {
      return `வணக்கம் ${visitorName}, ${churchName}-ல் இருந்து அன்பான வாழ்த்துக்கள். உங்களுக்கு ஏதேனும் ஜெப தேவைகள் இருந்தால் தயங்காமல் எங்களை தொடர்பு கொள்ளவும்.`;
    } else {
      return `வணக்கம் ${visitorName}, எங்கள் சபை ஆராதனைகள் மற்றும் நிகழ்ச்சிகள் பற்றிய தகவல்களுக்கு எப்போதும் எங்களை தொடர்பு கொள்ளலாம். மீண்டும் வருக!`;
    }
  }

  // English Default
  if (stage === 1) {
    return `Hi ${visitorName}, thank you for visiting ${churchName} for ${serviceName}! We were truly blessed to have you with us. Please feel free to reach out if you have any questions or prayer requests.`;
  } else if (stage === 2) {
    return `Hi ${visitorName}, warm greetings from ${churchName}! We hope you had a wonderful week. We are praying for you and would love to welcome you back anytime.`;
  } else {
    return `Hi ${visitorName}, greetings from ${churchName}! You are always welcome in our church family. Let us know if we can serve or pray for you in any way.`;
  }
}

/**
 * 5. Scheduler Engine (Idempotent & Duplicate-Safe)
 */
export async function processAutomatedVisitorFollowUps(params: {
  churchId: string;
  churchName: string;
  visitors: Visitor[];
  nowDate?: Date;
}): Promise<{ tasksCreated: number; tasksUpdated: number }> {
  const { churchId, churchName, visitors = [], nowDate = new Date() } = params;
  const settings = getVisitorFollowUpSettings(churchId);

  if (!settings.enabled) {
    return { tasksCreated: 0, tasksUpdated: 0 };
  }

  const existingTasks = getAutomatedFollowUpTasks(churchId);
  const taskMap = new Map<string, AutomatedVisitorFollowUpTask>();
  existingTasks.forEach(t => taskMap.set(t.id, t));

  let createdCount = 0;
  let updatedCount = 0;

  for (const visitor of visitors) {
    // 1. Do Not Contact Check
    if (visitor.status === 'not_interested' || visitor.status === 'inactive') {
      // Suppress active tasks if marked Do Not Contact
      existingTasks.forEach(t => {
        if (t.visitorId === visitor.id && t.status !== 'completed' && t.status !== 'do_not_contact') {
          t.status = 'do_not_contact';
          updatedCount++;
        }
      });
      continue;
    }

    const visitDateObj = new Date(visitor.visit_date || visitor.created_at || nowDate.toISOString());
    const hoursSinceVisit = Math.max(0, (nowDate.getTime() - visitDateObj.getTime()) / (1000 * 3600));

    // Determine target follow-up stage
    let dueStage: FollowUpTaskStage | null = null;
    let delayHours = 0;

    if (hoursSinceVisit >= settings.firstFollowUpDelayHours && hoursSinceVisit < settings.secondFollowUpDelayHours) {
      dueStage = 1;
      delayHours = settings.firstFollowUpDelayHours;
    } else if (hoursSinceVisit >= settings.secondFollowUpDelayHours && hoursSinceVisit < settings.thirdFollowUpDelayHours) {
      dueStage = 2;
      delayHours = settings.secondFollowUpDelayHours;
    } else if (hoursSinceVisit >= settings.thirdFollowUpDelayHours) {
      dueStage = 3;
      delayHours = settings.thirdFollowUpDelayHours;
    }

    if (!dueStage) continue;

    // Idempotency Key: vft_${visitorId}_stage${stage}
    const taskId = `vft_${visitor.id}_stage${dueStage}`;

    if (!taskMap.has(taskId)) {
      // Detect language preference
      const isTaName = /[\u0B80-\u0BFF]/.test(visitor.first_name || '') || settings.languagePreference === 'ta';
      const langPreference: 'en' | 'ta' | 'mixed' = isTaName ? 'ta' : 'en';

      const message = await generateVisitorFollowUpMessage({
        visitor,
        churchName,
        stage: dueStage,
        language: langPreference
      });

      const dueDate = new Date(visitDateObj.getTime() + (delayHours * 3600 * 1000)).toISOString().split('T')[0];
      const initialStatus: AutomatedTaskStatus = settings.requireApproval ? 'awaiting_approval' : 'follow_up_due';

      const newTask: AutomatedVisitorFollowUpTask = {
        id: taskId,
        churchId,
        visitorId: visitor.id,
        visitorName: `${visitor.first_name || ''} ${visitor.last_name || ''}`.trim() || 'Visitor',
        visitorPhone: visitor.phone,
        visitorEmail: visitor.email,
        serviceAttended: visitor.service_attended,
        visitDate: visitor.visit_date || nowDate.toISOString().split('T')[0],
        stage: dueStage,
        dueDate,
        status: initialStatus,
        channel: settings.preferredChannel,
        language: langPreference,
        preparedMessage: message,
        assignedUserId: visitor.assigned_to || settings.defaultAssignedUserId,
        assignedUserName: settings.defaultAssignedUserName,
        approvalRequired: settings.requireApproval,
        attemptsCount: 0,
        createdAt: nowDate.toISOString(),
        updatedAt: nowDate.toISOString()
      };

      taskMap.set(taskId, newTask);
      createdCount++;
    }
  }

  const updatedTasks = Array.from(taskMap.values());
  saveAutomatedFollowUpTasks(churchId, updatedTasks);

  return { tasksCreated: createdCount, tasksUpdated: updatedCount };
}

/**
 * 6. Action Handlers: Approve & Send, Edit, Skip, Do Not Contact
 */
export function approveAndSendFollowUpTask(params: {
  taskId: string;
  churchId: string;
  editedMessage?: string;
  userId?: string;
  userName?: string;
}): { success: boolean; task?: AutomatedVisitorFollowUpTask; whatsappUrl?: string } {
  const { taskId, churchId, editedMessage, userId, userName } = params;
  const tasks = getAutomatedFollowUpTasks(churchId);
  const task = tasks.find(t => t.id === taskId);

  if (!task) return { success: false };

  const finalMsg = editedMessage !== undefined ? editedMessage : (task.editedMessage || task.preparedMessage);
  const nowStr = new Date().toISOString();

  task.editedMessage = finalMsg;
  task.approvedByUserId = userId || 'user-1';
  task.approvedAt = nowStr;
  task.sentAt = nowStr;
  task.status = 'sent';
  task.attemptsCount += 1;
  task.updatedAt = nowStr;

  saveAutomatedFollowUpTasks(churchId, tasks);

  // Generate WhatsApp web link if channel is whatsapp and phone exists
  let whatsappUrl: string | undefined = undefined;
  if (task.visitorPhone) {
    const cleanPhone = task.visitorPhone.replace(/\D/g, '');
    whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`;
  }

  // Log Audit Action
  auditService.logAction(churchId, {
    action: 'visitor_followup.approved_and_sent',
    resource_type: 'visitor_followup_task',
    resource_id: taskId,
    details: { visitorId: task.visitorId, stage: task.stage, channel: task.channel },
    actor_id: userId,
    actor_name: userName
  });

  return { success: true, task, whatsappUrl };
}

export function skipFollowUpTask(taskId: string, churchId: string, reason?: string, userId?: string) {
  const tasks = getAutomatedFollowUpTasks(churchId);
  const task = tasks.find(t => t.id === taskId);

  if (task) {
    task.status = 'skipped';
    task.failureReason = reason || 'Skipped by user';
    task.updatedAt = new Date().toISOString();
    saveAutomatedFollowUpTasks(churchId, tasks);

    auditService.logAction(churchId, {
      action: 'visitor_followup.skipped',
      resource_type: 'visitor_followup_task',
      resource_id: taskId,
      details: { reason },
      actor_id: userId
    });
  }
}

export function setVisitorDoNotContact(churchId: string, visitorId: string, userId?: string) {
  const tasks = getAutomatedFollowUpTasks(churchId);
  tasks.forEach(t => {
    if (t.visitorId === visitorId) {
      t.status = 'do_not_contact';
      t.updatedAt = new Date().toISOString();
    }
  });
  saveAutomatedFollowUpTasks(churchId, tasks);

  auditService.logAction(churchId, {
    action: 'visitor.set_do_not_contact',
    resource_type: 'visitor',
    resource_id: visitorId,
    actor_id: userId
  });
}
