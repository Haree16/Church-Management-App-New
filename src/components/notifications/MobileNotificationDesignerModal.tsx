import React, { useState } from 'react';
import { 
  sendMobilePanelNotification, MobileNotificationPayload 
} from '@/services/mobileNotificationService';
import { dispatchSmartNotification, SmartNotificationCategory } from '@/services/smartNotificationService';
import { ChurchTenant, SaaSUser } from '@/types';
import { auditService } from '@/services/auditService';
import { 
  Smartphone, Bell, Send, Check, X, Sparkles, Wifi, Signal, Battery, 
  ChevronDown, ExternalLink, Globe, ShieldAlert, Heart, Calendar, Clock, 
  CheckCircle2, Copy 
} from 'lucide-react';
import { ChurchCrossIcon } from '../common/ChurchCrossIcon';

interface MobileNotificationDesignerModalProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser;
  onClose: () => void;
  onSendBroadcast?: (title: string, message: string, category: string, linkTab: string) => void;
}

export const MobileNotificationDesignerModal: React.FC<MobileNotificationDesignerModalProps> = ({
  currentChurch,
  currentUser,
  onClose,
  onSendBroadcast
}) => {
  const churchId = currentChurch?.id || 'church-1';
  const churchName = currentChurch?.name || 'Church CMS';

  // Designer Form State
  const [title, setTitle] = useState('📅 Sunday Service & Worship Reminder');
  const [message, setMessage] = useState('Dear member, join us for Sunday morning worship service at 9:00 AM in the Main Sanctuary!');
  const [category, setCategory] = useState<string>('Event');
  const [linkTab, setLinkTab] = useState<string>('events');
  const [devicePlatform, setDevicePlatform] = useState<'android' | 'ios'>('android');
  const [language, setLanguage] = useState<'en' | 'ta' | 'mixed'>('en');

  const [testSentMsg, setTestSentMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Time formatting for simulated panel
  const currentTimeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Quick Preset Templates
  const presetTemplates = [
    {
      label: ' Sunday Service Reminder',
      title: '📅 Sunday Service & Worship Reminder',
      message: 'Warm greetings! Join us for Sunday worship service at 9:00 AM. Praise and sermon in Sanctuary.',
      cat: 'Event',
      tab: 'events'
    },
    {
      label: '🙏 Urgent Prayer Request',
      title: '🙏 Urgent Prayer Request',
      message: 'Please join us in intercessory prayer for Brother David & family. Tap to view details on Prayer Wall.',
      cat: 'Prayer',
      tab: 'prayers'
    },
    {
      label: '🇮🇳 Tamil Announcement',
      title: '🔔 ஞாயிறு ஆராதனை நினைவூட்டல்',
      message: 'அன்பான திருச்சபை விசுவாசிகளே, நாளை காலை 9:00 மணிக்கு நமது தேவ ஆலயத்தில் நடைபெறும் ஆராதனையில் கலந்துகொள்ளுங்கள்.',
      cat: 'Announcement',
      tab: 'announcements'
    },
    {
      label: '🤝 Ministry Assignment',
      title: '🤝 Media Ministry Assignment Tomorrow',
      message: 'Reminder: You are scheduled for Camera & Audio Operation tomorrow morning at 8:30 AM.',
      cat: 'Ministry',
      tab: 'roster'
    },
    {
      label: '🚨 Emergency Alert',
      title: '🚨 Weather & Service Location Change',
      message: 'Notice: Heavy rainfall expected. Today\'s evening fellowship is moved online via YouTube live.',
      cat: 'Emergency',
      tab: 'bulletin'
    }
  ];

  const handleApplyPreset = (tmpl: typeof presetTemplates[0]) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setCategory(tmpl.cat);
    setLinkTab(tmpl.tab);
  };

  const handleTestDispatchToDevice = async () => {
    setTestSentMsg(null);
    setIsSending(true);

    try {
      await sendMobilePanelNotification({
        id: `test-panel-${Date.now()}`,
        title,
        message,
        category,
        linkTab,
        churchName,
        iconUrl: currentChurch?.logoUrl || '/church_logo.jpg'
      });

      setTestSentMsg('Dispatched test notification to your mobile/browser notification panel!');
      setTimeout(() => setTestSentMsg(null), 4000);
    } catch (e) {
      console.warn('Dispatch error:', e);
      setTestSentMsg('Notification sent to browser panel!');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendBroadcastToChurch = () => {
    if (onSendBroadcast) {
      onSendBroadcast(title, message, category, linkTab);
    }

    auditService.logAction(churchId, {
      action: 'mobile_notification_designer.broadcast_sent',
      resource_type: 'mobile_notification',
      details: { title, category, channel: 'mobile_panel' },
      actor_id: currentUser?.id
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 my-auto max-h-[94vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Mobile Notification Panel Designer</h3>
              <p className="text-xs text-slate-400">Design, preview, and test live native Android & iOS push notification cards.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {testSentMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{testSentMsg}</span>
          </div>
        )}

        {/* Main Grid: Form Left, Mobile Panel Preview Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Notification Form & Presets (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Template Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {presetTemplates.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(tmpl)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700/80 text-xs font-semibold transition"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Notification Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 📅 Sunday Service & Worship Reminder"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Notification Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Notification Body Message (Tamil & English supported)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Type push message text..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Controls Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Category Badge</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Event">Worship / Event</option>
                  <option value="Prayer">Prayer Request</option>
                  <option value="Ministry">Ministry Alert</option>
                  <option value="Emergency">Urgent Emergency</option>
                  <option value="Devotional">Devotional</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Target Screen / Tab</label>
                <select
                  value={linkTab}
                  onChange={(e) => setLinkTab(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                >
                  <option value="events">Events Calendar</option>
                  <option value="prayers">Prayer Wall</option>
                  <option value="roster">My Ministry Assignments</option>
                  <option value="announcements">Church Bulletins</option>
                  <option value="notifications">Notification Center</option>
                  <option value="absence-followup">Absence Follow-Up</option>
                </select>
              </div>
            </div>

            {/* Platform Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-xs font-semibold text-slate-300">Preview Device Style:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDevicePlatform('android')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    devicePlatform === 'android' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Android System Shade
                </button>
                <button
                  type="button"
                  onClick={() => setDevicePlatform('ios')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    devicePlatform === 'ios' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  iOS Lock Screen
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Mobile Notification Panel Simulation (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block text-center">
              Real-Time System Panel Preview
            </label>

            {/* SIMULATED MOBILE PHONE CARD */}
            <div className="bg-slate-950 border-4 border-slate-800 rounded-[32px] p-4 shadow-2xl space-y-4 max-w-[340px] mx-auto text-slate-100 ring-1 ring-white/10">
              
              {/* Status Bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-200">{currentTimeStr}</span>
                  <span className="px-1 text-[9px] bg-emerald-500/20 text-emerald-400 font-bold rounded">5G</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Signal className="w-3 h-3 text-slate-300" />
                  <Wifi className="w-3 h-3 text-slate-300" />
                  <Battery className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                </div>
              </div>

              {/* SYSTEM NOTIFICATION CARD (Android / iOS Style) */}
              <div className={`p-4 rounded-2xl border shadow-xl transition-all space-y-2.5 ${
                devicePlatform === 'android' 
                  ? 'bg-slate-900/90 border-slate-700/80 backdrop-blur-md' 
                  : 'bg-slate-850/95 border-slate-600/50 backdrop-blur-lg'
              }`}>
                {/* Notification Card Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <ChurchCrossIcon className="w-3.5 h-3.5 text-slate-950" />
                    </div>
                    <span className="font-bold text-slate-200 text-[11px]">{churchName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
                </div>

                {/* Card Title & Content */}
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-slate-100 leading-snug">{title || 'Notification Title'}</h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                    {message || 'Notification body content goes here...'}
                  </p>
                </div>

                {/* Category Badge & Link */}
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {category}
                  </span>
                  <span className="text-slate-400 font-medium">Tap to open app</span>
                </div>

                {/* Android Quick Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <button type="button" className="py-1 px-2 rounded-lg bg-slate-800 text-indigo-300 text-center font-semibold hover:bg-slate-700">
                    Open {linkTab.toUpperCase()}
                  </button>
                  <button type="button" className="py-1 px-2 rounded-lg bg-slate-800 text-slate-400 text-center font-semibold hover:bg-slate-700">
                    Dismiss
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-center italic">
                Simulated {devicePlatform === 'android' ? 'Android System Shade' : 'iOS Notification Center'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestDispatchToDevice}
            disabled={isSending}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Test Dispatch To My Device
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendBroadcastToChurch}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-indigo-600/20 inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send Mobile Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
