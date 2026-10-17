import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Check, 
  X, 
  ShieldCheck, 
  Clock, 
  Settings2, 
  AlertCircle, 
  CheckCircle2, 
  UserX, 
  HeartHandshake, 
  Cake, 
  Users, 
  TrendingDown,
  RefreshCw,
  Sliders,
  History,
  Info
} from 'lucide-react';
import { 
  AutomationWorkflowRule, 
  WorkflowActionItem, 
  WorkflowExecutionLog 
} from '@/types/churchAnalytics';
import { workflowAutomationService } from '@/services/workflowAutomationService';

interface WorkflowAutomationHubProps {
  churchId: string;
  userName?: string;
  userRole?: string;
}

export const WorkflowAutomationHub: React.FC<WorkflowAutomationHubProps> = ({
  churchId,
  userName = 'Administrator',
  userRole = 'PastorAdmin'
}) => {
  const [rules, setRules] = useState<AutomationWorkflowRule[]>([]);
  const [logs, setLogs] = useState<WorkflowExecutionLog[]>([]);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'approvals' | 'history'>('rules');

  const loadData = () => {
    try {
      const currentRules = workflowAutomationService.getWorkflowRules(churchId);
      const currentLogs = workflowAutomationService.getWorkflowLogs(churchId);
      setRules(currentRules);
      setLogs(currentLogs);
    } catch (err) {
      console.error('Failed to load workflow automation data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [churchId]);

  const handleToggleRule = (ruleId: string, currentEnabled: boolean) => {
    try {
      const updated = workflowAutomationService.updateWorkflowRule(churchId, ruleId, {
        enabled: !currentEnabled
      });
      setRules(prev => prev.map(r => r.id === ruleId ? updated : r));
      setFeedbackMessage({
        text: `Rule '${updated.name}' ${updated.enabled ? 'enabled' : 'disabled'}.`,
        type: 'info'
      });
    } catch (err: any) {
      setFeedbackMessage({ text: err.message, type: 'error' });
    }
  };

  const handleUpdateThreshold = (ruleId: string, newThreshold: number) => {
    try {
      const updated = workflowAutomationService.updateWorkflowRule(churchId, ruleId, {
        thresholdValue: newThreshold
      });
      setRules(prev => prev.map(r => r.id === ruleId ? updated : r));
      setFeedbackMessage({
        text: `Threshold for '${updated.name}' set to ${newThreshold} ${updated.thresholdUnit}.`,
        type: 'success'
      });
    } catch (err: any) {
      setFeedbackMessage({ text: err.message, type: 'error' });
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setFeedbackMessage(null);
    try {
      const newLogs = await workflowAutomationService.evaluateWorkflows(churchId);
      loadData();
      const totalActions = newLogs.reduce((acc, l) => acc + l.actionsProposedCount, 0);
      setFeedbackMessage({
        text: `Workflow evaluation complete: Staged ${totalActions} actions awaiting approval.`,
        type: 'success'
      });
      if (totalActions > 0) {
        setActiveSubTab('approvals');
      }
    } catch (err: any) {
      setFeedbackMessage({ text: `Evaluation failed: ${err.message}`, type: 'error' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApproveAction = async (logId: string, actionId: string) => {
    try {
      const result = await workflowAutomationService.approveWorkflowAction(churchId, logId, actionId, userName);
      if (result.success) {
        loadData();
        setFeedbackMessage({ text: result.message, type: 'success' });
      } else {
        setFeedbackMessage({ text: result.message, type: 'error' });
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err.message, type: 'error' });
    }
  };

  const handleRejectAction = (logId: string, actionId: string) => {
    try {
      const result = workflowAutomationService.rejectWorkflowAction(churchId, logId, actionId, 'Dismissed by administrator');
      if (result.success) {
        loadData();
        setFeedbackMessage({ text: result.message, type: 'info' });
      } else {
        setFeedbackMessage({ text: result.message, type: 'error' });
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err.message, type: 'error' });
    }
  };

  // Collect all pending actions across logs
  const pendingActions: Array<{ logId: string; logDate: string; action: WorkflowActionItem }> = [];
  logs.forEach(l => {
    l.proposedActions.forEach(a => {
      if (a.status === 'pending') {
        pendingActions.push({ logId: l.id, logDate: l.executedAt, action: a });
      }
    });
  });

  const getRuleIcon = (category: string) => {
    switch (category) {
      case 'absence': return <UserX className="w-5 h-5 text-rose-500" />;
      case 'visitor': return <HeartHandshake className="w-5 h-5 text-indigo-500" />;
      case 'birthday': return <Cake className="w-5 h-5 text-purple-500" />;
      case 'volunteer': return <Users className="w-5 h-5 text-emerald-500" />;
      case 'disengagement': return <TrendingDown className="w-5 h-5 text-amber-500" />;
      default: return <Bot className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg">
              <Bot className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Church Automation Hub & Workflows
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configurable care triggers with mandatory <strong className="text-purple-600 dark:text-purple-400">Human-in-the-Loop</strong> approval guarantees.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            {isEvaluating ? 'Evaluating...' : 'Run Automations Now'}
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' 
            : feedbackMessage.type === 'error'
            ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
            : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
        }`}>
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === 'rules'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Configured Rules ({rules.length})
        </button>

        <button
          onClick={() => setActiveSubTab('approvals')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === 'approvals'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Approvals
          {pendingActions.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 rounded-full">
              {pendingActions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === 'history'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Execution Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: CONFIGURED RULES */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 rounded-xl text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              All automation rules enforce <strong>Human-in-the-Loop</strong> approval. No WhatsApp broadcasts or member record alterations are dispatched automatically.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {rules.map((rule) => (
              <div 
                key={rule.id}
                className={`p-5 rounded-xl border transition-all ${
                  rule.enabled
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 opacity-75'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 mt-0.5">
                      {getRuleIcon(rule.category)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {rule.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {rule.category.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                        {rule.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    {/* Threshold input */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500">Threshold:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={rule.thresholdValue}
                        onChange={(e) => handleUpdateThreshold(rule.id, parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center"
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        {rule.thresholdUnit}
                      </span>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        rule.enabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Human Approval Required
                    </span>
                    <span>•</span>
                    <span>Target Action: <strong className="text-slate-700 dark:text-slate-300">{rule.targetAction}</strong></span>
                  </div>
                  <div>
                    {rule.lastRunAt ? (
                      <span>Last evaluated: {new Date(rule.lastRunAt).toLocaleDateString()}</span>
                    ) : (
                      <span>Never evaluated</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING APPROVAL QUEUE */}
      {activeSubTab === 'approvals' && (
        <div className="space-y-4">
          {pendingActions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                All Workflow Action Queues are Clear
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No proposed outreach tasks or greetings are waiting for administrator confirmation.
              </p>
              <button
                onClick={handleRunEvaluation}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                <Play className="w-3.5 h-3.5" /> Run Sweep Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingActions.map(({ logId, logDate, action }) => (
                <div 
                  key={action.id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {action.targetName}
                      </span>
                      {action.targetPhoneMasked && (
                        <span className="text-xs text-slate-500 font-mono">
                          ({action.targetPhoneMasked})
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                        Pending Confirmation
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {action.actionSummary}
                    </p>
                    <div className="text-xs text-slate-400">
                      Evaluated on: {new Date(action.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => handleRejectAction(logId, action.id)}
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => handleApproveAction(logId, action.id)}
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve & Execute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXECUTION LOGS */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 text-center rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              No workflow execution logs recorded yet. Click "Run Automations Now" to evaluate rules.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-750 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4 font-medium">Timestamp</th>
                      <th className="py-3 px-4 font-medium">Workflow Rule</th>
                      <th className="py-3 px-4 font-medium">Records Checked</th>
                      <th className="py-3 px-4 font-medium">Actions Staged</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                        <td className="py-2.5 px-4 font-mono text-slate-500">
                          {new Date(log.executedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                          {log.ruleName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                          {log.recordsEvaluated}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-purple-600 dark:text-purple-400">
                          {log.actionsProposedCount}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            log.status === 'executed'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : log.status === 'pending_approval'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {log.status === 'pending_approval' ? 'Pending Approval' : log.status === 'executed' ? 'Executed' : 'Dismissed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
