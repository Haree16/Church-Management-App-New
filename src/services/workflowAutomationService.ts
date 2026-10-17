/**
 * Workflow Automation Service
 * Phase 4: Configurable Church Automation Engine with Human-in-the-Loop Safeguards
 * 
 * Rules:
 * 1. Consecutive Sunday Absence Care
 * 2. First-Time Visitor Assimilation
 * 3. Upcoming Birthday Blessings (Age-Privacy Protected)
 * 4. Volunteer Roster Vacancy Alert
 * 5. Attendance Disengagement Detection
 */

import {
  AutomationWorkflowRule,
  WorkflowActionItem,
  WorkflowExecutionLog
} from '@/types/churchAnalytics';
import { churchOperationsService } from './churchOperationsService';
import { churchAnalyticsService } from './churchAnalyticsService';
import { whatsAppService } from './whatsAppService';
import { auditService } from './auditService';
import { churchAiInsightsService } from './churchAiInsightsService';

const RULES_STORAGE_KEY = 'nca_church_workflow_rules_v4';
const LOGS_STORAGE_KEY = 'nca_church_workflow_logs_v4';

const DEFAULT_WORKFLOW_RULES: AutomationWorkflowRule[] = [
  {
    id: 'rule_absence_care',
    name: 'Consecutive Sunday Absence Care',
    description: 'Identifies active members who have missed consecutive Sunday services and prepares pastoral care outreach tasks.',
    category: 'absence',
    enabled: true,
    requiresApproval: true,
    thresholdValue: 3,
    thresholdUnit: 'sundays',
    targetAction: 'pastoral_care_task',
    lastTriggeredCount: 0
  },
  {
    id: 'rule_visitor_assimilation',
    name: 'First-Time Visitor Assimilation',
    description: 'Detects new visitors within the recent threshold who have not received a welcome follow-up and stages a consent-checked WhatsApp welcome draft.',
    category: 'visitor',
    enabled: true,
    requiresApproval: true,
    thresholdValue: 3,
    thresholdUnit: 'days',
    targetAction: 'whatsapp_welcome_draft',
    lastTriggeredCount: 0
  },
  {
    id: 'rule_birthday_blessings',
    name: 'Upcoming Birthday Blessings',
    description: 'Screens for upcoming member birthdays within the target window, strictly preserves age privacy, and drafts personalized greetings.',
    category: 'birthday',
    enabled: true,
    requiresApproval: true,
    thresholdValue: 7,
    thresholdUnit: 'days',
    targetAction: 'birthday_greeting_draft',
    lastTriggeredCount: 0
  },
  {
    id: 'rule_volunteer_vacancy',
    name: 'Volunteer Roster Vacancy Alert',
    description: 'Detects unfilled critical roster positions for upcoming Sunday worship services and prepares ministry coordinator alerts.',
    category: 'volunteer',
    enabled: true,
    requiresApproval: true,
    thresholdValue: 3,
    thresholdUnit: 'days',
    targetAction: 'roster_vacancy_alert',
    lastTriggeredCount: 0
  },
  {
    id: 'rule_disengagement_alert',
    name: 'Attendance Disengagement Detection',
    description: 'Identifies members with a sharp decline in attendance over the last 30 days compared to the prior period and flags them for care coordination.',
    category: 'disengagement',
    enabled: true,
    requiresApproval: true,
    thresholdValue: 50,
    thresholdUnit: 'percentage',
    targetAction: 'disengagement_flag',
    lastTriggeredCount: 0
  }
];

function safeGetStorage<T>(key: string, defaultVal: T): T {
  try {
    if (typeof localStorage === 'undefined') return defaultVal;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.warn('[WorkflowAutomationService] Failed to persist data to localStorage:', err);
  }
}

export const workflowAutomationService = {
  /**
   * Retrieve all configured automation rules for a church
   */
  getWorkflowRules(churchId: string): AutomationWorkflowRule[] {
    const allRulesMap = safeGetStorage<Record<string, AutomationWorkflowRule[]>>(RULES_STORAGE_KEY, {});
    const churchRules = allRulesMap[churchId];

    if (!churchRules || !Array.isArray(churchRules) || churchRules.length === 0) {
      // Seed default rules for church
      const initial = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW_RULES));
      allRulesMap[churchId] = initial;
      safeSetStorage(RULES_STORAGE_KEY, allRulesMap);
      return initial;
    }

    // Merge any missing default rules in case new rules were added
    let updated = false;
    const merged = [...churchRules];
    for (const defRule of DEFAULT_WORKFLOW_RULES) {
      if (!merged.some(r => r.id === defRule.id)) {
        merged.push({ ...defRule });
        updated = true;
      }
    }

    if (updated) {
      allRulesMap[churchId] = merged;
      safeSetStorage(RULES_STORAGE_KEY, allRulesMap);
    }

    return merged;
  },

  /**
   * Update or toggle an automation rule
   */
  updateWorkflowRule(
    churchId: string,
    ruleId: string,
    updates: Partial<AutomationWorkflowRule>
  ): AutomationWorkflowRule {
    const rules = this.getWorkflowRules(churchId);
    const index = rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      throw new Error(`Workflow rule ${ruleId} not found.`);
    }

    rules[index] = {
      ...rules[index],
      ...updates
    };

    const allRulesMap = safeGetStorage<Record<string, AutomationWorkflowRule[]>>(RULES_STORAGE_KEY, {});
    allRulesMap[churchId] = rules;
    safeSetStorage(RULES_STORAGE_KEY, allRulesMap);

    auditService.log({
      churchId,
      userId: 'system',
      userEmail: 'admin@church.org',
      action: 'UPDATE_WORKFLOW_RULE',
      resourceType: 'workflow_rule',
      resourceId: ruleId,
      details: { updates }
    });

    return rules[index];
  },

  /**
   * Retrieve execution logs for a church
   */
  getWorkflowLogs(churchId: string): WorkflowExecutionLog[] {
    const allLogsMap = safeGetStorage<Record<string, WorkflowExecutionLog[]>>(LOGS_STORAGE_KEY, {});
    const churchLogs = allLogsMap[churchId] || [];
    return churchLogs.sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
  },

  /**
   * Save an execution log
   */
  saveWorkflowLog(churchId: string, log: WorkflowExecutionLog): void {
    const allLogsMap = safeGetStorage<Record<string, WorkflowExecutionLog[]>>(LOGS_STORAGE_KEY, {});
    const churchLogs = allLogsMap[churchId] || [];
    churchLogs.unshift(log);
    // Keep last 50 logs
    if (churchLogs.length > 50) churchLogs.splice(50);
    allLogsMap[churchId] = churchLogs;
    safeSetStorage(LOGS_STORAGE_KEY, allLogsMap);
  },

  /**
   * Run evaluation across enabled automation rules (or a specific rule)
   * Staging all proposed actions for pastor/admin approval
   */
  async evaluateWorkflows(churchId: string, targetRuleId?: string): Promise<WorkflowExecutionLog[]> {
    const rules = this.getWorkflowRules(churchId);
    const rulesToEvaluate = targetRuleId 
      ? rules.filter(r => r.id === targetRuleId && r.enabled)
      : rules.filter(r => r.enabled);

    const generatedLogs: WorkflowExecutionLog[] = [];
    const nowIso = new Date().toISOString();

    for (const rule of rulesToEvaluate) {
      const actions: WorkflowActionItem[] = [];
      let recordsEvaluated = 0;

      try {
        switch (rule.category) {
          case 'absence': {
            // Rule 1: Consecutive Sunday Absence Care
            const absenceResult = await churchOperationsService.getOperationalAbsentees(
              churchId,
              rule.thresholdValue || 3
            );
            recordsEvaluated = absenceResult.absentees.length;

            for (const item of absenceResult.absentees) {
              actions.push({
                id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                ruleId: rule.id,
                targetId: item.memberId,
                targetName: item.name,
                targetPhoneMasked: item.phoneMasked,
                actionSummary: `Pastoral Care Outreach: Missed ${item.missedCount} consecutive Sundays. Last attended: ${item.lastAttendedDate || 'None on record'}.`,
                status: 'pending',
                createdAt: nowIso
              });
            }
            break;
          }

          case 'visitor': {
            // Rule 2: First-Time Visitor Assimilation
            const visitorResult = await churchOperationsService.getVisitorFollowUpList(churchId);
            const pendingVisitors = visitorResult.visitors.filter(v => v.followUpStatus === 'contact_pending');
            recordsEvaluated = visitorResult.visitors.length;

            for (const item of pendingVisitors) {
              const consentNote = item.hasConsent ? 'Consent verified' : 'Requires consent confirmation';
              actions.push({
                id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                ruleId: rule.id,
                targetId: item.visitorId,
                targetName: item.name,
                targetPhoneMasked: item.phone ? `${item.phone.substring(0, 3)}****${item.phone.substring(item.phone.length - 3)}` : 'No Phone',
                actionSummary: `Send Welcome Greeting (WhatsApp): Visited on ${item.visitDate}. (${consentNote})`,
                status: 'pending',
                createdAt: nowIso
              });
            }
            break;
          }

          case 'birthday': {
            // Rule 3: Upcoming Birthday Blessings (Age-privacy preserved)
            const birthdayResult = await churchOperationsService.getUpcomingBirthdays(
              churchId,
              rule.thresholdValue || 7
            );
            recordsEvaluated = birthdayResult.recipients.length;

            for (const item of birthdayResult.recipients) {
              if (!item.hasBeenSentGreetingThisYear) {
                const dayText = item.isToday ? 'Today' : `in ${item.daysUntilBirthday} day(s)`;
                actions.push({
                  id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  ruleId: rule.id,
                  targetId: item.memberId,
                  targetName: item.name,
                  targetPhoneMasked: item.phoneMasked,
                  actionSummary: `Send Birthday Greeting Draft: Birthday is ${dayText} (${item.birthDayMonth}). Member age is protected.`,
                  status: 'pending',
                  createdAt: nowIso
                });
              }
            }
            break;
          }

          case 'volunteer': {
            // Rule 4: Volunteer Roster Vacancy Alert
            const rosterResult = await churchOperationsService.getVolunteerRosterAndGaps(churchId);
            recordsEvaluated = rosterResult.assignments.length + rosterResult.unfilledGaps.length;

            for (const gap of rosterResult.unfilledGaps) {
              actions.push({
                id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                ruleId: rule.id,
                targetId: gap.id,
                targetName: `${gap.ministryName} - ${gap.roleName}`,
                actionSummary: `Roster Vacancy Alert: Unfilled role '${gap.roleName}' for service on ${gap.serviceDate}.`,
                status: 'pending',
                createdAt: nowIso
              });
            }
            break;
          }

          case 'disengagement': {
            // Rule 5: Attendance Disengagement Detection
            const attendanceAnalytics = await churchAnalyticsService.getAdvancedAttendanceAnalytics(
              churchId,
              'last_30_days'
            );
            const threshold = rule.thresholdValue || 50;
            const dropMembers = attendanceAnalytics.decliningAttendees.filter(d => d.percentageDrop >= threshold);
            recordsEvaluated = attendanceAnalytics.decliningAttendees.length;

            for (const drop of dropMembers) {
              actions.push({
                id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                ruleId: rule.id,
                targetId: drop.memberId,
                targetName: drop.name,
                targetPhoneMasked: drop.phoneMasked,
                actionSummary: `Disengagement Flag: Attendance decreased by ${drop.percentageDrop}% (Prior: ${drop.priorAttendanceCount}, Recent: ${drop.recentAttendanceCount}).`,
                status: 'pending',
                createdAt: nowIso
              });
            }
            break;
          }
        }

        const log: WorkflowExecutionLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          churchId,
          ruleId: rule.id,
          ruleName: rule.name,
          executedAt: nowIso,
          recordsEvaluated,
          actionsProposedCount: actions.length,
          status: actions.length > 0 ? 'pending_approval' : 'executed',
          proposedActions: actions
        };

        this.saveWorkflowLog(churchId, log);
        generatedLogs.push(log);

        // Update rule lastRunAt
        this.updateWorkflowRule(churchId, rule.id, {
          lastRunAt: nowIso,
          lastTriggeredCount: actions.length
        });

      } catch (err: any) {
        console.error(`[WorkflowAutomationService] Error evaluating rule ${rule.id}:`, err);
      }
    }

    return generatedLogs;
  },

  /**
   * Human-in-the-loop: Approve an action
   */
  async approveWorkflowAction(
    churchId: string,
    logId: string,
    actionId: string,
    approvedBy: string = 'Administrator'
  ): Promise<{ success: boolean; message: string; action: WorkflowActionItem | null }> {
    const logs = this.getWorkflowLogs(churchId);
    const targetLog = logs.find(l => l.id === logId);
    if (!targetLog) {
      return { success: false, message: `Log entry ${logId} not found.`, action: null };
    }

    const action = targetLog.proposedActions.find(a => a.id === actionId);
    if (!action) {
      return { success: false, message: `Action ${actionId} not found in log.`, action: null };
    }

    if (action.status !== 'pending') {
      return { success: false, message: `Action ${actionId} is already ${action.status}.`, action };
    }

    action.status = 'approved';
    action.approvedAt = new Date().toISOString();
    action.approvedBy = approvedBy;

    // Check if all actions in log are resolved
    const stillPending = targetLog.proposedActions.some(a => a.status === 'pending');
    if (!stillPending) {
      targetLog.status = 'executed';
    }

    // Save updated logs
    const allLogsMap = safeGetStorage<Record<string, WorkflowExecutionLog[]>>(LOGS_STORAGE_KEY, {});
    allLogsMap[churchId] = logs;
    safeSetStorage(LOGS_STORAGE_KEY, allLogsMap);

    // Audit log
    auditService.log({
      churchId,
      userId: approvedBy,
      userEmail: `${approvedBy.toLowerCase().replace(/\s+/g, '')}@church.org`,
      action: 'APPROVE_WORKFLOW_ACTION',
      resourceType: 'workflow_action',
      resourceId: actionId,
      details: {
        ruleId: action.ruleId,
        targetName: action.targetName,
        actionSummary: action.actionSummary
      }
    });

    return {
      success: true,
      message: `Action for ${action.targetName} approved successfully by ${approvedBy}.`,
      action
    };
  },

  /**
   * Human-in-the-loop: Reject an action
   */
  rejectWorkflowAction(
    churchId: string,
    logId: string,
    actionId: string,
    reason: string = 'Dismissed by administrator'
  ): { success: boolean; message: string; action: WorkflowActionItem | null } {
    const logs = this.getWorkflowLogs(churchId);
    const targetLog = logs.find(l => l.id === logId);
    if (!targetLog) {
      return { success: false, message: `Log entry ${logId} not found.`, action: null };
    }

    const action = targetLog.proposedActions.find(a => a.id === actionId);
    if (!action) {
      return { success: false, message: `Action ${actionId} not found in log.`, action: null };
    }

    action.status = 'rejected';

    const stillPending = targetLog.proposedActions.some(a => a.status === 'pending');
    if (!stillPending) {
      targetLog.status = 'dismissed';
    }

    // Save updated logs
    const allLogsMap = safeGetStorage<Record<string, WorkflowExecutionLog[]>>(LOGS_STORAGE_KEY, {});
    allLogsMap[churchId] = logs;
    safeSetStorage(LOGS_STORAGE_KEY, allLogsMap);

    return {
      success: true,
      message: `Action for ${action.targetName} rejected (${reason}).`,
      action
    };
  },

  /**
   * Clear all workflow execution logs for a church
   */
  clearWorkflowLogs(churchId: string): void {
    const allLogsMap = safeGetStorage<Record<string, WorkflowExecutionLog[]>>(LOGS_STORAGE_KEY, {});
    delete allLogsMap[churchId];
    safeSetStorage(LOGS_STORAGE_KEY, allLogsMap);
  }
};
