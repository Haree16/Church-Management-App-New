import React, { useState } from 'react';
import { 
  getUserNotificationPreferences, saveUserNotificationPreferences, 
  UserNotificationPreferences, SmartNotificationCategory 
} from '@/services/smartNotificationService';
import { 
  Bell, Settings, Moon, Smartphone, Globe, Check, X, Shield, 
  Calendar, Users, Heart, GraduationCap, Clock, AlertCircle 
} from 'lucide-react';

interface SmartNotificationPreferencesModalProps {
  churchId: string;
  userId: string;
  onClose: () => void;
}

export const SmartNotificationPreferencesModal: React.FC<SmartNotificationPreferencesModalProps> = ({
  churchId,
  userId,
  onClose
}) => {
  const [prefs, setPrefs] = useState<UserNotificationPreferences>(() => 
    getUserNotificationPreferences(churchId, userId)
  );
  const [savedMsg, setSavedMsg] = useState(false);

  const handleToggleCategory = (cat: SmartNotificationCategory) => {
    if (cat === 'system') return; // Mandatory
    setPrefs((prev) => ({
      ...prev,
      enabledCategories: {
        ...prev.enabledCategories,
        [cat]: !prev.enabledCategories[cat]
      }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserNotificationPreferences(churchId, userId, prefs);
    setSavedMsg(true);
    setTimeout(() => {
      setSavedMsg(false);
      onClose();
    }, 1000);
  };

  const categoryLabels: Array<{ id: SmartNotificationCategory; label: string; icon: any; mandatory?: boolean }> = [
    { id: 'events', label: 'Events & Calendar Reminders', icon: Calendar },
    { id: 'ministry', label: 'Ministry Roster & Team Alerts', icon: Users },
    { id: 'prayer', label: 'Prayer Request Updates', icon: Heart },
    { id: 'sundayschool', label: 'Sunday School & Classes', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance & Check-in Alerts', icon: Clock },
    { id: 'visitor_followup', label: 'Visitor Follow-Up Tasks (Staff Only)', icon: Users },
    { id: 'absence_followup', label: 'Absence Follow-Up Tasks (Staff Only)', icon: AlertCircle },
    { id: 'system', label: 'System & Security Alerts (Mandatory)', icon: Shield, mandatory: true }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-100">Smart Notification Preferences</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4" /> Preferences saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Notification Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Notification Categories
            </h4>

            <div className="space-y-2">
              {categoryLabels.map((cat) => {
                const Icon = cat.icon;
                const isEnabled = prefs.enabledCategories[cat.id];

                return (
                  <div
                    key={cat.id}
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      isEnabled
                        ? 'bg-slate-850 border-slate-700/80'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-medium text-slate-200">{cat.label}</span>
                    </div>

                    <input
                      type="checkbox"
                      disabled={cat.mandatory}
                      checked={isEnabled}
                      onChange={() => handleToggleCategory(cat.id)}
                      className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preferences Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            {/* Preferred Channel */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                Preferred Channel
              </label>
              <select
                value={prefs.preferredChannel}
                onChange={(e: any) => setPrefs({ ...prefs, preferredChannel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
              >
                <option value="push">Mobile Push Notification</option>
                <option value="in_app">In-App Notification</option>
                <option value="whatsapp">WhatsApp Outreach</option>
                <option value="email">Email</option>
                <option value="sms">SMS Text</option>
              </select>
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                Language Preference
              </label>
              <select
                value={prefs.language}
                onChange={(e: any) => setPrefs({ ...prefs, language: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
              >
                <option value="auto">Bilingual (English & Tamil)</option>
                <option value="ta">Tamil Only (தமிழ்)</option>
                <option value="en">English Only</option>
              </select>
            </div>

            {/* Quiet Hours Start */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Quiet Hours Start
              </label>
              <input
                type="time"
                value={prefs.quietHoursStart}
                onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200"
              />
            </div>

            {/* Quiet Hours End */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Quiet Hours End
              </label>
              <input
                type="time"
                value={prefs.quietHoursEnd}
                onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
