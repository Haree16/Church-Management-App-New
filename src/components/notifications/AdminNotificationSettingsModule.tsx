import React, { useState } from 'react';
import { 
  getAdminNotificationSettings, saveAdminNotificationSettings, 
  runSmartNotificationScheduler, AdminNotificationSettings, SmartNotificationRule 
} from '@/services/smartNotificationService';
import { ChurchTenant, SaaSUser, Member, ChurchEvent, RosterAssignment, ChurchMinistry } from '@/types';
import { 
  Settings, Bell, Shield, Moon, RefreshCw, Check, Sparkles, Sliders, 
  Users, AlertCircle, Layers 
} from 'lucide-react';

interface AdminNotificationSettingsModuleProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser;
  allUsers?: SaaSUser[];
  members?: Member[];
  events?: ChurchEvent[];
  roster?: RosterAssignment[];
  ministries?: ChurchMinistry[];
}

export const AdminNotificationSettingsModule: React.FC<AdminNotificationSettingsModuleProps> = ({
  currentChurch,
  currentUser,
  allUsers = [],
  members = [],
  events = [],
  roster = [],
  ministries = []
}) => {
  const churchId = currentChurch?.id || 'church-1';
  const [settings, setSettings] = useState<AdminNotificationSettings>(() => 
    getAdminNotificationSettings(churchId)
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleToggleRule = (ruleId: string) => {
    setSettings((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveAdminNotificationSettings(churchId, settings, currentUser?.id);
    setStatusMsg('Master notification settings saved successfully!');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleTriggerScheduler = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const result = await runSmartNotificationScheduler({
        churchId,
        allUsers,
        members,
        events,
        roster,
        ministries
      });
      setStatusMsg(`Scheduler executed: ${result.remindersSent} new event & assignment reminders dispatched.`);
    } catch (e) {
      setStatusMsg('Failed to run scheduler execution.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Smart Notification Rules & Administration</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Configure church-wide notification rules, target roles, quiet hours policy, and automated reminder intervals.
          </p>
        </div>

        <button
          onClick={handleTriggerScheduler}
          disabled={isSyncing}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Run Scheduler Sync
        </button>
      </div>

      {statusMsg && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl p-3 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 text-indigo-400" /> {statusMsg}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Master Toggles */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-100">Master System Controls</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <label className="text-sm font-semibold text-slate-200 block">Enable Smart Notifications</label>
                <p className="text-xs text-slate-400">Master toggle for automated push & in-app smart alerts.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
              />
            </div>

            <div className="space-y-1.5 p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <label className="text-xs font-semibold text-slate-300">Default Delivery Channel</label>
              <select
                value={settings.defaultChannel}
                onChange={(e: any) => setSettings({ ...settings, defaultChannel: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
              >
                <option value="push">Mobile Push Notification</option>
                <option value="in_app">In-App Notification</option>
                <option value="whatsapp">WhatsApp Outreach</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rules Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-100">Notification Rules Engine ({settings.rules.length})</h3>

          <div className="space-y-3">
            {settings.rules.map((rule) => (
              <div key={rule.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-sm">{rule.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {rule.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      rule.priority === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      rule.priority === 'high' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {rule.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Event: <strong className="text-slate-300">{rule.eventType}</strong> • Quiet Hours: <strong className="text-slate-300">{rule.quietHoursBehavior}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule.id)}
                    className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
          >
            Save Admin Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
