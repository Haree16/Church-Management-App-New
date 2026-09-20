import React, { useState, useMemo, useEffect } from 'react';
import { SaaSUser, ChurchTenant } from '../../types';
import { Visitor } from '../../types/database';
import { 
  getVisitorFollowUpSettings, saveVisitorFollowUpSettings, 
  getAutomatedFollowUpTasks, processAutomatedVisitorFollowUps, 
  approveAndSendFollowUpTask, skipFollowUpTask, setVisitorDoNotContact, 
  VisitorFollowUpSettings, AutomatedVisitorFollowUpTask, generateVisitorFollowUpMessage 
} from '../../services/visitorFollowUpService';
import { 
  Users, UserCheck, Clock, CheckCircle2, AlertCircle, Sparkles, 
  Send, ShieldCheck, Filter, Search, Settings, RefreshCw, MessageSquare, 
  Check, Edit3, X, Sliders, Globe, PhoneCall, Mail, AlertTriangle, 
  Ban, ShieldAlert, ArrowRight, Play, ChevronRight, Copy
} from 'lucide-react';
import { toast } from 'sonner';

interface AutomatedVisitorFollowUpDashboardProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser | null;
  visitors: Visitor[];
  onNavigateTab?: (tab: string, deepLinkId?: string) => void;
}

export const AutomatedVisitorFollowUpDashboard: React.FC<AutomatedVisitorFollowUpDashboardProps> = ({
  currentChurch,
  currentUser,
  visitors = [],
  onNavigateTab,
}) => {
  const activeChurchId = currentChurch?.id || 'church-1';
  const userRole = currentUser?.role || 'Member';

  // Tabs
  const [activeTab, setActiveTab] = useState<'queue' | 'tasks' | 'settings' | 'analytics'>('queue');

  // Local State
  const [settings, setSettings] = useState<VisitorFollowUpSettings>(() => getVisitorFollowUpSettings(activeChurchId));
  const [tasks, setTasks] = useState<AutomatedVisitorFollowUpTask[]>(() => getAutomatedFollowUpTasks(activeChurchId));
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Filters State for Tasks view
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Editing Task Message State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');

  // Sync / Run Automation engine on mount and manual trigger
  const runAutomationSync = async () => {
    setIsProcessing(true);
    try {
      // Cast visitors if needed
      const result = await processAutomatedVisitorFollowUps({
        churchId: activeChurchId,
        churchName: currentChurch.name,
        visitors: visitors as any,
      });

      const updated = getAutomatedFollowUpTasks(activeChurchId);
      setTasks(updated);

      if (result.tasksCreated > 0) {
        toast.success(`Automation Sync: ${result.tasksCreated} new follow-up tasks prepared!`);
      }
    } catch (err) {
      console.error('Failed to run visitor follow-up automation:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    runAutomationSync();
  }, [activeChurchId, visitors.length]);

  // Derived Metrics
  const awaitingApprovalTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'awaiting_approval');
  }, [tasks]);

  const dueTodayTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate === todayStr && (t.status === 'follow_up_due' || t.status === 'awaiting_approval'));
  }, [tasks]);

  const sentTasks = useMemo(() => tasks.filter(t => t.status === 'sent'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);
  const suppressedTasks = useMemo(() => tasks.filter(t => t.status === 'do_not_contact' || t.status === 'skipped'), [tasks]);

  // Filtered Tasks for All Tasks tab
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (stageFilter !== 'ALL' && t.stage.toString() !== stageFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.visitorName.toLowerCase().includes(q) || (t.visitorPhone && t.visitorPhone.includes(q));
      }
      return true;
    });
  }, [tasks, statusFilter, stageFilter, searchQuery]);

  // Handle Approve & Send Action
  const handleApproveAndSend = (task: AutomatedVisitorFollowUpTask) => {
    const msgToUse = editingTaskId === task.id ? editingMessageText : (task.editedMessage || task.preparedMessage);
    
    const res = approveAndSendFollowUpTask({
      taskId: task.id,
      churchId: activeChurchId,
      editedMessage: msgToUse,
      userId: currentUser?.id,
      userName: currentUser?.name
    });

    if (res.success) {
      toast.success(`Follow-up message approved for ${task.visitorName}!`);
      setTasks(getAutomatedFollowUpTasks(activeChurchId));
      setEditingTaskId(null);

      // Open WhatsApp web URL if available
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
    }
  };

  // Handle Skip
  const handleSkip = (taskId: string) => {
    skipFollowUpTask(taskId, activeChurchId, 'Skipped by staff', currentUser?.id);
    toast.info('Follow-up task skipped.');
    setTasks(getAutomatedFollowUpTasks(activeChurchId));
  };

  // Handle Do Not Contact
  const handleDoNotContact = (visitorId: string) => {
    setVisitorDoNotContact(activeChurchId, visitorId, currentUser?.id);
    toast.warning('Visitor marked Do Not Contact. All future follow-ups suppressed.');
    setTasks(getAutomatedFollowUpTasks(activeChurchId));
  };

  // Save Settings
  const handleSaveSettings = () => {
    saveVisitorFollowUpSettings(activeChurchId, settings, currentUser?.id);
    toast.success('Visitor Follow-up Settings saved successfully!');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Automated Visitor Follow-up
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
              settings.enabled 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {settings.enabled ? (settings.requireApproval ? 'Automation Active • Approval-First ON' : 'Automation Active • Auto-Send ON') : 'Automation Disabled'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {currentChurch.name} • Seamless automated follow-up workflow & AI message drafts for new guests
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={runAutomationSync}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Syncing...' : 'Sync Follow-ups'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Visitors</span>
          <div className="text-3xl font-black text-white">{visitors.length}</div>
          <span className="text-[10px] text-slate-400 font-semibold block">Recorded guests</span>
        </div>

        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider truncate block">Due Today</span>
          <div className="text-3xl font-black text-amber-400">{dueTodayTasks.length}</div>
          <span className="text-[10px] text-amber-500 font-bold block">Action scheduled</span>
        </div>

        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider truncate block">Awaiting Approval</span>
          <div className="text-3xl font-black text-sky-400">{awaitingApprovalTasks.length}</div>
          <span className="text-[10px] text-sky-400 font-bold block">Review required</span>
        </div>

        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider truncate block">Follow-ups Sent</span>
          <div className="text-3xl font-black text-emerald-400">{sentTasks.length}</div>
          <span className="text-[10px] text-emerald-400 font-bold block">Transmitted</span>
        </div>

        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider truncate block">Completed</span>
          <div className="text-3xl font-black text-cyan-400">{completedTasks.length}</div>
          <span className="text-[10px] text-cyan-400 font-bold block">Connected</span>
        </div>

        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate block">Suppressed / DNC</span>
          <div className="text-3xl font-black text-slate-400">{suppressedTasks.length}</div>
          <span className="text-[10px] text-slate-500 font-semibold block">Skipped / DNC</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Approval Queue</span>
          {awaitingApprovalTasks.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-950 text-amber-400 border border-amber-500/40 font-black rounded-full text-[10px]">
              {awaitingApprovalTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>All Follow-up Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Automation Settings</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: APPROVAL QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Approval-First Follow-up Queue</span>
              </h3>
              <p className="text-xs text-slate-400">Review AI-prepared follow-up messages before sending to new church visitors</p>
            </div>
          </div>

          {awaitingApprovalTasks.length === 0 ? (
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl text-center space-y-2 text-white">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-sm text-white">Queue is Clear!</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No visitor follow-up messages are currently awaiting approval. Newly created visitor records will automatically populate here when follow-ups become due.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {awaitingApprovalTasks.map((task) => {
                const isEditing = editingTaskId === task.id;
                const messageToShow = isEditing ? editingMessageText : (task.editedMessage || task.preparedMessage);

                return (
                  <div key={task.id} className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-white text-base">{task.visitorName}</h4>
                          <span className="px-2.5 py-0.5 bg-slate-800 text-slate-200 text-[10px] font-black rounded-full border border-slate-700">
                            Stage {task.stage} Follow-up
                          </span>
                          <span className="px-2.5 py-0.5 bg-amber-950 text-amber-400 text-[10px] font-black rounded-full border border-amber-800 uppercase">
                            {task.language === 'ta' ? 'Tamil (தமிழ்)' : 'English'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Visited: {task.visitDate} • Service: {task.serviceAttended || 'General Service'} • Phone: <strong className="text-white">{task.visitorPhone || 'N/A'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-semibold">Due Date: {task.dueDate}</span>
                      </div>
                    </div>

                    {/* Prepared Message Box */}
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" /> AI Message Draft:
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setEditingMessageText(task.editedMessage || task.preparedMessage);
                            }}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Message
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingMessageText}
                            onChange={(e) => setEditingMessageText(e.target.value)}
                            rows={3}
                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                            >
                              Done Editing
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200 leading-relaxed font-medium">
                          "{messageToShow}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDoNotContact(task.visitorId)}
                          className="px-3 py-1.5 bg-rose-950/60 text-rose-400 hover:bg-rose-900/60 rounded-xl text-xs font-bold transition border border-rose-800 flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Do Not Contact
                        </button>
                        <button
                          onClick={() => handleSkip(task.id)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Skip
                        </button>
                      </div>

                      <button
                        onClick={() => handleApproveAndSend(task)}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        <span>Approve & Send via {task.channel.toUpperCase()}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALL FOLLOW-UP TASKS */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-white text-base">All Automated Follow-up Tasks</h3>
              <p className="text-xs text-slate-400">Complete task registry across all follow-up stages</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search visitor name or phone..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
            {['ALL', 'awaiting_approval', 'sent', 'completed', 'skipped', 'do_not_contact'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === st ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                  <th className="p-3">Visitor</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No matching automated follow-up tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-3">
                        <div className="font-bold text-white">{t.visitorName}</div>
                        <div className="text-[10px] text-slate-400">{t.visitorPhone || 'No phone'}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-800 font-bold text-slate-300 rounded-md border border-slate-700">
                          Stage {t.stage}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-200">{t.dueDate}</td>
                      <td className="p-3 uppercase font-bold text-amber-400">{t.channel}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          t.status === 'sent' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          t.status === 'awaiting_approval' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          t.status === 'completed' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {t.status === 'awaiting_approval' && (
                          <button
                            onClick={() => handleApproveAndSend(t)}
                            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px]"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUTOMATION SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-6 text-white">
          <div>
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span>Visitor Follow-up Automation Rules</span>
            </h3>
            <p className="text-xs text-slate-400">Configure delays, approval requirements, quiet hours, and default language</p>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div>
                <div className="font-bold text-white text-xs">Enable Automated Visitor Follow-up</div>
                <div className="text-[11px] text-slate-400">Automatically prepare and schedule follow-up tasks for new visitors</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Require Approval Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div>
                <div className="font-bold text-white text-xs">Require Approval Before Sending (Approval-First Design)</div>
                <div className="text-[11px] text-slate-400">Queue prepared messages for review by authorized staff before sending</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireApproval}
                onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Delays Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">1st Follow-up Delay (Hours)</label>
                <input
                  type="number"
                  value={settings.firstFollowUpDelayHours}
                  onChange={(e) => setSettings({ ...settings, firstFollowUpDelayHours: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">2nd Follow-up Delay (Hours)</label>
                <input
                  type="number"
                  value={settings.secondFollowUpDelayHours}
                  onChange={(e) => setSettings({ ...settings, secondFollowUpDelayHours: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">3rd Follow-up Delay (Hours)</label>
                <input
                  type="number"
                  value={settings.thirdFollowUpDelayHours}
                  onChange={(e) => setSettings({ ...settings, thirdFollowUpDelayHours: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Channel & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Preferred Channel</label>
                <select
                  value={settings.preferredChannel}
                  onChange={(e) => setSettings({ ...settings, preferredChannel: e.target.value as any })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500"
                >
                  <option value="whatsapp">WhatsApp Web / API</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS Text</option>
                  <option value="in_app">In-App Staff Task</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Default Language</label>
                <select
                  value={settings.languagePreference}
                  onChange={(e) => setSettings({ ...settings, languagePreference: e.target.value as any })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500"
                >
                  <option value="auto">Auto (Detect Tamil / English)</option>
                  <option value="en">English</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                onClick={handleSaveSettings}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl transition shadow-md active:scale-95"
              >
                Save Automation Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
