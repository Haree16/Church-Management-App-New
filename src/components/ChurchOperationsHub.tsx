import React, { useState, useEffect } from 'react';
import { 
  ChurchTenant, 
  Member 
} from '../types';
import { 
  WhatsAppMessageRecord, 
  WhatsAppProviderConfig, 
  WhatsAppEnvironment,
  OperationsDashboardMetrics 
} from '../types/churchOperations';
import { whatsAppService } from '../services/whatsAppService';
import { churchOperationsService } from '../services/churchOperationsService';
import { 
  MessageSquare, Send, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  Settings, Key, Shield, UserX, Calendar, HeartHandshake, Users, 
  Clock, ExternalLink, Check, Copy, Tag, PhoneCall, ShieldCheck
} from 'lucide-react';

interface ChurchOperationsHubProps {
  currentChurch: ChurchTenant;
  members?: Member[];
  onOpenAiQuery?: (prompt: string) => void;
}

export const ChurchOperationsHub: React.FC<ChurchOperationsHubProps> = ({
  currentChurch,
  members = [],
  onOpenAiQuery
}) => {
  const churchId = currentChurch?.id || 'church-1';

  // Sub-tabs: 'dashboard' | 'history' | 'compliance'
  const [subTab, setSubTab] = useState<'dashboard' | 'history' | 'compliance'>('dashboard');

  // Live Metrics & Data State
  const [metrics, setMetrics] = useState<OperationsDashboardMetrics | null>(null);
  const [history, setHistory] = useState<WhatsAppMessageRecord[]>([]);
  const [providerConfig, setProviderConfig] = useState<WhatsAppProviderConfig>(() => whatsAppService.getWhatsAppConfig(churchId));
  const [optOutList, setOptOutList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Config Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configEnv, setConfigEnv] = useState<WhatsAppEnvironment>(providerConfig.environment);
  const [phoneNumberIdInput, setPhoneNumberIdInput] = useState(providerConfig.phoneNumberId || '');
  const [wabaIdInput, setWabaIdInput] = useState(providerConfig.wabaId || '');
  const [tokenInput, setTokenInput] = useState(providerConfig.accessToken || '');
  const [configSavedToast, setConfigSavedToast] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Manual Opt-Out Input
  const [manualOptOutPhone, setManualOptOutPhone] = useState('');

  // Load metrics & data
  const refreshData = async () => {
    setLoading(true);
    try {
      const liveMetrics = await churchOperationsService.getOperationsDashboardMetrics(churchId);
      setMetrics(liveMetrics);
      const liveHistory = whatsAppService.getWhatsAppHistory(churchId);
      setHistory(liveHistory);
      const conf = whatsAppService.getWhatsAppConfig(churchId);
      setProviderConfig(conf);
      setOptOutList(whatsAppService.getOptOutList(churchId).map(r => r.phone));
    } catch (e) {
      console.error('Error refreshing operations data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [churchId]);

  // Handle saving WhatsApp Provider Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: WhatsAppProviderConfig = {
      ...providerConfig,
      environment: configEnv,
      phoneNumberId: phoneNumberIdInput.trim(),
      wabaId: wabaIdInput.trim(),
      accessToken: tokenInput.trim(),
      updatedAt: new Date().toISOString()
    };
    whatsAppService.saveWhatsAppConfig(churchId, updated);
    setProviderConfig(updated);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 3000);
    setIsConfigModalOpen(false);
    refreshData();
  };

  // Handle retry message
  const handleRetryMessage = async (msgId: string) => {
    const res = await whatsAppService.retryFailedMessage(churchId, msgId);
    if (res && res.status !== 'failed') {
      alert(`Message successfully queued for retry! Status: ${res.status}`);
      refreshData();
    } else {
      alert(`Retry failed: ${res?.failureReason || 'Provider error'}`);
    }
  };

  // Handle manual opt-out
  const handleAddOptOut = async () => {
    if (!manualOptOutPhone.trim()) return;
    await whatsAppService.recordOptOut(churchId, manualOptOutPhone.trim(), 'manual_admin');
    setManualOptOutPhone('');
    refreshData();
  };

  // Handle manual opt-in restore
  const handleRestoreOptIn = async (phone: string) => {
    await whatsAppService.recordOptIn(churchId, phone);
    refreshData();
  };

  // Filtered history list
  const filteredHistory = history.filter(item => {
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch = !historySearch || 
      item.recipientName.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.recipientPhone.includes(historySearch) ||
      item.templateName.toLowerCase().includes(historySearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
      case 'sent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800"><Clock className="w-3 h-3" /> Queued / Sent</span>;
      case 'read':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800"><CheckCircle2 className="w-3 h-3" /> Read</span>;
      case 'opted_out':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><UserX className="w-3 h-3" /> Suppressed (STOP)</span>;
      case 'failed':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"><XCircle className="w-3 h-3" /> Failed</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Church Operations & Meta Cloud API</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provider: <span className="font-semibold text-slate-700 dark:text-slate-300">Meta WhatsApp Cloud API</span> • 
              Mode: <span className={`font-semibold ${providerConfig.environment === 'production' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {providerConfig.environment === 'production' ? 'Production (Live Carrier)' : providerConfig.environment === 'sandbox' ? 'Sandbox Simulation' : 'Unconfigured'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            Meta API Config
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setSubTab('dashboard')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition ${
            subTab === 'dashboard'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Operations KPI Dashboard
        </button>
        <button
          onClick={() => setSubTab('history')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 ${
            subTab === 'history'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Message Delivery History ({history.length})
        </button>
        <button
          onClick={() => setSubTab('compliance')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 ${
            subTab === 'compliance'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Opt-Out & Privacy Registry ({optOutList.length})
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 1: OPERATIONS KPI DASHBOARD */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'dashboard' && metrics && (
        <div className="space-y-6">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Messages Sent</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.totalMessagesSent}</div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{metrics.deliverySuccessRatePercent}% success</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Visitor Follow-Ups</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{metrics.pendingVisitorFollowUpsCount}</div>
              <span className="text-[11px] text-slate-400">Pastoral Care Pending</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Birthdays (30d)</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{metrics.upcomingBirthdaysCount}</div>
              <span className="text-[11px] text-slate-400">Upcoming Blessings</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Volunteer Gaps</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{metrics.unfilledVolunteerGapsCount}</div>
              <span className="text-[11px] text-slate-400">Vacant Sunday Positions</span>
            </div>
          </div>

          {/* Quick AI Operations Launcher */}
          <div className="bg-gradient-to-r from-emerald-900/20 via-teal-900/10 to-slate-900/20 p-5 rounded-2xl border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Operational AI Assistant Shortcuts (Phase 3 Actions)
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Explicit Confirmation Required</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => onOpenAiQuery?.("Prepare a reminder for this Sunday's worship service.")}
                className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-left rounded-xl border border-slate-200 dark:border-slate-700 transition space-y-1"
              >
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  Sunday Service Reminder
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Broadcasts bilingual reminder to all registered church attendees.
                </div>
              </button>

              <button
                onClick={() => onOpenAiQuery?.("Prepare a follow-up list for first-time visitors.")}
                className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-left rounded-xl border border-slate-200 dark:border-slate-700 transition space-y-1"
              >
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-amber-500" />
                  Visitor Follow-Up
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reviews consented first-time visitors and drafts personalized welcome.
                </div>
              </button>

              <button
                onClick={() => onOpenAiQuery?.("Show volunteers assigned to this Sunday's service.")}
                className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-left rounded-xl border border-slate-200 dark:border-slate-700 transition space-y-1"
              >
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  Volunteer Roster & Gaps
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Audits roster coverage and alerts unfilled ministry duties.
                </div>
              </button>

              <button
                onClick={() => onOpenAiQuery?.("Show members who have not attended church for the last four Sundays.")}
                className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-left rounded-xl border border-slate-200 dark:border-slate-700 transition space-y-1"
              >
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  4-Sunday Absentees
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pastoral care alert for members missing 4 consecutive weeks.
                </div>
              </button>

              <button
                onClick={() => onOpenAiQuery?.("List upcoming birthdays this month.")}
                className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-left rounded-xl border border-slate-200 dark:border-slate-700 transition space-y-1"
              >
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  Upcoming Birthdays
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lists birthdays with age-privacy masking and greeting preview.
                </div>
              </button>

              <button
                onClick={() => onOpenAiQuery?.("Summarize attendance and visitor numbers for the last month.")}
                className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-left rounded-xl border border-slate-200 dark:border-slate-700 transition space-y-1"
              >
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Monthly Operations Summary
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Headcounts, member attendance rates, and guest arrivals.
                </div>
              </button>
            </div>
          </div>

          {/* Provider Details Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Meta WhatsApp Cloud API Configuration Status
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">Phone Number ID</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {providerConfig.phoneNumberId ? `${providerConfig.phoneNumberId.slice(0, 4)}...${providerConfig.phoneNumberId.slice(-4)}` : 'Unconfigured'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">WABA Account ID</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {providerConfig.wabaId ? `${providerConfig.wabaId.slice(0, 4)}...${providerConfig.wabaId.slice(-4)}` : 'Unconfigured'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">Webhook Status</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Inbound STOP/START
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 2: MESSAGE DELIVERY HISTORY & LOGS */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'history' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Filter Status:</span>
              {['all', 'delivered', 'sent', 'failed', 'opted_out'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                    filterStatus === st
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search recipient name or phone..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* History Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No message records matching the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 uppercase font-black text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Phone (Masked)</th>
                      <th className="py-3 px-4">Template</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(item.createdAt || Date.now()).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-bold">{item.recipientName}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {item.recipientPhone.length >= 7 
                            ? `${item.recipientPhone.substring(0, 3)}****${item.recipientPhone.substring(item.recipientPhone.length - 3)}`
                            : item.recipientPhone}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            {item.templateName}
                          </span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                        <td className="py-3 px-4">
                          {item.status === 'failed' ? (
                            <button
                              onClick={() => handleRetryMessage(item.id)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition"
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 3: OPT-OUT & COMPLIANCE REGISTRY */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'compliance' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              WhatsApp Opt-Out & Unsubscribe Registry
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              In accordance with Meta Business Messaging Policy, any recipient texting <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, or <strong>நிறுத்து</strong> is automatically suppressed from all automated broadcasts.
            </p>
          </div>

          {/* Add Manual Opt-Out */}
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Enter phone number (e.g. 919840123456)"
              value={manualOptOutPhone}
              onChange={e => setManualOptOutPhone(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleAddOptOut}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
            >
              Suppress Number
            </button>
          </div>

          {/* Opt-Out List */}
          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Suppressed Numbers ({optOutList.length}):
            </h5>
            {optOutList.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No phone numbers are currently opted out.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {optOutList.map(phone => (
                  <div key={phone} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300">
                    <span>{phone}</span>
                    <button
                      onClick={() => handleRestoreOptIn(phone)}
                      className="text-rose-500 hover:text-rose-700 text-[11px] font-bold"
                      title="Restore Opt-In"
                    >
                      × Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* META CLOUD API CONFIGURATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 text-white rounded-3xl p-6 max-w-lg w-full border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">Meta WhatsApp Cloud API Configuration</h3>
              </div>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Environment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfigEnv('sandbox')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      configEnv === 'sandbox'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Sandbox Simulation
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigEnv('production')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      configEnv === 'production'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Meta Cloud API (Live)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number ID</label>
                <input
                  type="text"
                  placeholder="e.g. 109283746592837"
                  value={phoneNumberIdInput}
                  onChange={e => setPhoneNumberIdInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp Business Account (WABA) ID</label>
                <input
                  type="text"
                  placeholder="e.g. 982736451928374"
                  value={wabaIdInput}
                  onChange={e => setWabaIdInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Permanent System User Access Token</label>
                <input
                  type="password"
                  placeholder="EAABw..."
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Kept securely on server side. Never exposed in public bundles.</span>
              </div>

              {/* Webhook Endpoint Info */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Webhook Endpoint for Delivery Receipts & STOP:</span>
                <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
                  <span>https://churchmanagementapp.ai.studio/api/whatsapp/webhook</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://churchmanagementapp.ai.studio/api/whatsapp/webhook');
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="text-[10px] text-slate-300 hover:text-white font-sans font-bold"
                  >
                    {copiedWebhook ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
