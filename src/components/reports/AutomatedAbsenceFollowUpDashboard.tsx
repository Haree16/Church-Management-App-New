import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChurchTenant, SaaSUser, Member, AttendanceRecord, RosterAssignment, ChurchEvent, ChurchMinistry 
} from '@/types';
import { 
  getAbsenceFollowUpSettings, saveAbsenceFollowUpSettings, 
  getAutomatedAbsenceTasks, processAutomatedAbsenceFollowUps, 
  approveAndSendAbsenceTask, skipAbsenceTask, setMemberAbsenceDNC, 
  AutomatedAbsenceFollowUpTask, AbsenceFollowUpSettings, AbsenceRuleCode 
} from '@/services/absenceFollowUpService';
import { generateAbsenceInsightsSummary, answerAbsenceQuery } from '@/services/aiAbsenceService';
import { canAccessAllChurchReports } from '@/utils/rbac';
import { 
  Sparkles, RefreshCw, AlertCircle, CheckCircle2, Clock, Send, 
  ShieldAlert, Settings, Filter, Search, UserCheck, MessageSquare, 
  SlidersHorizontal, Check, X, Shield, Info, HelpCircle, ChevronRight, Eye 
} from 'lucide-react';

interface AutomatedAbsenceFollowUpDashboardProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser;
  members: Member[];
  attendance: AttendanceRecord[];
  roster?: RosterAssignment[];
  events?: ChurchEvent[];
  ministries?: ChurchMinistry[];
  onNavigateTab?: (tab: string, deepLinkId?: string) => void;
}

export const AutomatedAbsenceFollowUpDashboard: React.FC<AutomatedAbsenceFollowUpDashboardProps> = ({
  currentChurch,
  currentUser,
  members = [],
  attendance = [],
  roster = [],
  events = [],
  ministries = [],
  onNavigateTab
}) => {
  const churchId = currentChurch?.id || 'church-1';
  const userRole = currentUser?.role || 'Member';
  const isAuthorized = canAccessAllChurchReports(userRole) || userRole === 'MinistryLeader';

  const [settings, setSettings] = useState<AbsenceFollowUpSettings>(() => getAbsenceFollowUpSettings(churchId));
  const [tasks, setTasks] = useState<AutomatedAbsenceFollowUpTask[]>(() => getAutomatedAbsenceTasks(churchId));
  const [activeTab, setActiveTab] = useState<'queue' | 'tasks' | 'settings' | 'analytics'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isProcessingSync, setIsProcessingSync] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Message editing state for Approval Queue
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [selectedChannels, setSelectedChannels] = useState<Record<string, 'whatsapp' | 'email' | 'sms' | 'in_app'>>({});

  // AI Modal / Q&A state
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiQuery, setAiQuery] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Run initial sync if no tasks exist
  useEffect(() => {
    let isMounted = true;
    if (tasks.length === 0 && isAuthorized) {
      setIsProcessingSync(true);
      processAutomatedAbsenceFollowUps({
        churchId,
        churchName: currentChurch?.name || 'Church',
        members,
        attendanceRecords: attendance,
        roster,
        events,
        userRole,
        userId: currentUser?.id
      }).then((res) => {
        if (!isMounted) return;
        setTasks(res.tasks);
        setIsProcessingSync(false);
      }).catch(() => {
        if (isMounted) setIsProcessingSync(false);
      });
    }
    return () => { isMounted = false; };
  }, [churchId, members.length, attendance.length]);

  const handleRunSync = async () => {
    setIsProcessingSync(true);
    setSyncMessage(null);
    try {
      const res = await processAutomatedAbsenceFollowUps({
        churchId,
        churchName: currentChurch?.name || 'Church',
        members,
        attendanceRecords: attendance,
        roster,
        events,
        userRole,
        userId: currentUser?.id
      });
      setTasks(res.tasks);
      setSyncMessage(`Sync Complete: ${res.newTasksCreated} new follow-up tasks created, ${res.resolvedByAttendanceCount} tasks auto-resolved by return-to-attendance.`);
    } catch (e) {
      console.error('Failed to run sync:', e);
      setSyncMessage('Failed to execute absence sync.');
    } finally {
      setIsProcessingSync(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveAbsenceFollowUpSettings(churchId, settings, currentUser?.id);
    setSyncMessage('Settings saved successfully!');
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleApproveAndSend = (task: AutomatedAbsenceFollowUpTask) => {
    const finalMsg = editedMessages[task.id] || task.preparedMessage;
    const finalChannel = selectedChannels[task.id] || task.channel;
    
    const updated = approveAndSendAbsenceTask({
      churchId,
      taskId: task.id,
      userId: currentUser?.id || 'user',
      editedMessage: finalMsg,
      channel: finalChannel
    });

    if (updated) {
      setTasks(getAutomatedAbsenceTasks(churchId));

      // Trigger standard WhatsApp web link if WhatsApp channel is selected
      if (finalChannel === 'whatsapp' && task.phone) {
        const cleanPhone = task.phone.replace(/[^0-9]/g, '');
        const encodedText = encodeURIComponent(finalMsg);
        window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
      }
    }
  };

  const handleSkipTask = (taskId: string) => {
    skipAbsenceTask({ churchId, taskId, userId: currentUser?.id || 'user' });
    setTasks(getAutomatedAbsenceTasks(churchId));
  };

  const handleMarkDNC = (memberId: string) => {
    setMemberAbsenceDNC(churchId, memberId, currentUser?.id);
    setTasks(getAutomatedAbsenceTasks(churchId));
  };

  const handleOpenAiModal = async () => {
    setShowAiModal(true);
    setIsAiLoading(true);
    const summary = await generateAbsenceInsightsSummary({
      churchName: currentChurch?.name || 'Church',
      tasks,
      settings,
      language: settings.languagePreference === 'ta' ? 'ta' : 'en'
    });
    setAiSummary(summary);
    setIsAiLoading(false);
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    const answer = await answerAbsenceQuery({
      churchName: currentChurch?.name || 'Church',
      query: aiQuery,
      tasks,
      language: settings.languagePreference === 'ta' ? 'ta' : 'en'
    });
    setAiAnswer(answer);
    setIsAiLoading(false);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const awaitingApproval = tasks.filter(t => t.status === 'awaiting_approval').length;
    const sent = tasks.filter(t => t.status === 'sent').length;
    const resolved = tasks.filter(t => t.status === 'resolved_by_attendance').length;
    const skippedOrDNC = tasks.filter(t => t.status === 'skipped' || t.status === 'do_not_contact').length;
    return { total, awaitingApproval, sent, resolved, skippedOrDNC };
  }, [tasks]);

  // Approval Queue list
  const approvalQueue = useMemo(() => {
    return tasks.filter(t => t.status === 'awaiting_approval');
  }, [tasks]);

  // Filtered tasks for directory
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchSearch = !searchTerm || 
        t.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ruleDescription.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [tasks, statusFilter, searchTerm]);

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">Access Restricted</h3>
        <p className="text-sm text-slate-400 mt-1">You do not have permission to view Automated Absence Follow-Up reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100">Automated Absence Follow-Up</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Engine Active
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Factual attendance pattern detection, return-to-attendance auto-resets, and approval-first caring outreach.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleOpenAiModal}
            className="flex-1 md:flex-initial inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-sm font-semibold transition"
          >
            <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
            AI Absence Insights
          </button>
          <button
            onClick={handleRunSync}
            disabled={isProcessingSync}
            className="flex-1 md:flex-initial inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-semibold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isProcessingSync ? 'animate-spin' : ''}`} />
            Run Sync
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl p-3 flex items-center justify-between text-sm">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-indigo-400 hover:text-indigo-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Mandatory Non-Judgmental Disclaimer Banner */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Non-Judgmental Data Standard</h4>
          <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed mt-0.5 font-medium">
            These insights are based only on activities recorded in the Church Management App. They do not indicate a person's spiritual commitment or personal circumstances.
          </p>
        </div>
      </div>

      {/* 3. Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Total Tracked</span>
          <span className="text-2xl font-bold text-slate-100">{metrics.total}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Awaiting Approval</span>
          <span className="text-2xl font-bold text-amber-400">{metrics.awaitingApproval}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Follow-Ups Sent</span>
          <span className="text-2xl font-bold text-blue-400">{metrics.sent}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Returned to Attendance</span>
          <span className="text-2xl font-bold text-emerald-400">{metrics.resolved}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400 block">Excluded / DNC</span>
          <span className="text-2xl font-bold text-slate-400">{metrics.skippedOrDNC}</span>
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <div className="border-b border-slate-800 flex items-center space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Approval Queue
          {metrics.awaitingApproval > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
              {metrics.awaitingApproval}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          All Absence Tasks ({tasks.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Automation Settings
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Factual Analytics
        </button>
      </div>

      {/* TAB 1: APPROVAL QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-200">
              Outreach Approval Queue ({approvalQueue.length})
            </h3>
            <span className="text-xs text-slate-400">
              Approval-First Safety: Review message before sending via WhatsApp, Email, or SMS
            </span>
          </div>

          {approvalQueue.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-200">Approval Queue Empty</h4>
              <p className="text-sm text-slate-400 mt-1">
                No draft follow-up messages are pending approval right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvalQueue.map((task) => {
                const currentMsg = editedMessages[task.id] !== undefined ? editedMessages[task.id] : task.preparedMessage;
                const currentChannel = selectedChannels[task.id] || task.channel;

                return (
                  <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    {/* Header info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold text-slate-100">{task.memberName}</h4>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Phone: <strong className="text-slate-300">{task.phone || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Last Attended: <strong className="text-amber-400">{task.lastAttendanceDate || 'No record'}</strong></span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {task.ruleDescription}
                      </span>
                    </div>

                    {/* Message Box */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <label className="font-semibold text-slate-300">Prepared Message (Tamil / English):</label>
                        <span>Language: <strong className="text-indigo-400 uppercase">{task.language}</strong></span>
                      </div>
                      <textarea
                        value={currentMsg}
                        onChange={(e) => setEditedMessages({ ...editedMessages, [task.id]: e.target.value })}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Channel Selector */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-2">
                        <span>Channel:</span>
                        <select
                          value={currentChannel}
                          onChange={(e: any) => setSelectedChannels({ ...selectedChannels, [task.id]: e.target.value })}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">Email</option>
                          <option value="sms">SMS</option>
                          <option value="in_app">In-App Notification</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleMarkDNC(task.memberId)}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                      >
                        Do Not Contact
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleApproveAndSend(task)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Approve & Send ({currentChannel.toUpperCase()})
                      </button>

                      <button
                        onClick={() => handleSkipTask(task.id)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL ABSENCE TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search member name or rule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs text-slate-400">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="awaiting_approval">Awaiting Approval</option>
                <option value="sent">Message Sent</option>
                <option value="resolved_by_attendance">Returned to Attendance</option>
                <option value="skipped">Skipped</option>
                <option value="do_not_contact">Do Not Contact</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Member Name</th>
                    <th className="p-4">Rule Triggered</th>
                    <th className="p-4">Last Attended</th>
                    <th className="p-4">Days Inactive</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Channel</th>
                    <th className="p-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No absence tasks match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-850/50 transition">
                        <td className="p-4 font-semibold text-slate-100">{t.memberName}</td>
                        <td className="p-4 text-slate-300">{t.ruleDescription}</td>
                        <td className="p-4 text-amber-400 font-medium">{t.lastAttendanceDate || 'No record'}</td>
                        <td className="p-4 text-slate-200">{t.daysSinceLastAttendance} days</td>
                        <td className="p-4">
                          {t.status === 'awaiting_approval' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                              Awaiting Approval
                            </span>
                          )}
                          {t.status === 'sent' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                              Sent
                            </span>
                          )}
                          {t.status === 'resolved_by_attendance' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                              Returned to Attendance
                            </span>
                          )}
                          {t.status === 'skipped' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              Skipped
                            </span>
                          )}
                          {t.status === 'do_not_contact' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                              Do Not Contact
                            </span>
                          )}
                        </td>
                        <td className="p-4 uppercase text-slate-400 font-semibold">{t.channel}</td>
                        <td className="p-4 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATION SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-3xl">
          <h3 className="text-base font-bold text-slate-100">Automated Absence Follow-Up Configuration</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <label className="text-sm font-semibold text-slate-200 block">Enable Automated Absence Detection</label>
                <p className="text-xs text-slate-400">Automatically analyze attendance logs and flag members meeting absence rules.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <label className="text-sm font-semibold text-slate-200 block">Require Approval before Sending (Approval-First)</label>
                <p className="text-xs text-slate-400">Place generated follow-up messages in the approval queue before sending.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireApproval}
                onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Consecutive Missed Services Threshold</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.consecutiveMissedThreshold}
                  onChange={(e) => setSettings({ ...settings, consecutiveMissedThreshold: parseInt(e.target.value) || 2 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Consecutive Missed Sundays Threshold</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.consecutiveSundaysThreshold}
                  onChange={(e) => setSettings({ ...settings, consecutiveSundaysThreshold: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">14-Day Inactivity Threshold (Days)</label>
                <input
                  type="number"
                  min={7}
                  max={30}
                  value={settings.daysInactive14Threshold}
                  onChange={(e) => setSettings({ ...settings, daysInactive14Threshold: parseInt(e.target.value) || 14 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">30-Day Inactivity Threshold (Days)</label>
                <input
                  type="number"
                  min={15}
                  max={90}
                  value={settings.daysInactive30Threshold}
                  onChange={(e) => setSettings({ ...settings, daysInactive30Threshold: parseInt(e.target.value) || 30 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Preferred Channel</label>
                <select
                  value={settings.preferredChannel}
                  onChange={(e: any) => setSettings({ ...settings, preferredChannel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="in_app">In-App Notification</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Language Preference</label>
                <select
                  value={settings.languagePreference}
                  onChange={(e: any) => setSettings({ ...settings, languagePreference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200"
                >
                  <option value="auto">Bilingual (English & Tamil)</option>
                  <option value="ta">Tamil Only (தமிழ்)</option>
                  <option value="en">English Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
            >
              Save Configuration
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: FACTUAL ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100">Rule Trigger Distribution</h3>
            <div className="space-y-3">
              {[
                { label: '30 Days Inactive', code: 'days_30', color: 'bg-rose-500' },
                { label: '14 Days Inactive', code: 'days_14', color: 'bg-amber-500' },
                { label: '3 Consecutive Sundays Missed', code: 'sundays_3', color: 'bg-indigo-500' },
                { label: '2 Consecutive Services Missed', code: 'consecutive_missed', color: 'bg-blue-500' }
              ].map((item) => {
                const count = tasks.filter(t => t.ruleCode === item.code).length;
                const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;

                return (
                  <div key={item.code} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{item.label}</span>
                      <span className="font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100">Resolution & Return Rate</h3>
            <div className="flex items-center justify-center p-6 border border-slate-800 rounded-xl bg-slate-950/60">
              <div className="text-center">
                <span className="text-4xl font-extrabold text-emerald-400">
                  {tasks.length > 0 ? Math.round((metrics.resolved / tasks.length) * 100) : 0}%
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Members who returned to attendance after follow-up
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-2">
              <p>• <strong>Automatic Resolution:</strong> Active follow-up cycles automatically resolve as soon as a new attendance record is logged.</p>
              <p>• <strong>Idempotency Enforcement:</strong> Unique task keys prevent duplicate follow-ups for the same absence period.</p>
            </div>
          </div>
        </div>
      )}

      {/* AI ABSENCE INSIGHTS MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">AI Absence Assistant (Tamil & English)</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Summary Section */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Executive System Summary</h4>
              {isAiLoading ? (
                <p className="text-xs text-slate-400 animate-pulse">Generating factual summary...</p>
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{aiSummary}</p>
              )}
            </div>

            {/* Q&A Form */}
            <form onSubmit={handleAskAi} className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Ask a Question (Tamil / English):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. How many members missed 3 consecutive Sundays?"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !aiQuery.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  Ask
                </button>
              </div>
            </form>

            {aiAnswer && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-200 leading-relaxed">
                {aiAnswer}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
