import React, { useState, useEffect } from 'react';
import { PrayerGroup } from '@/types/prayerMinistry';
import { Member } from '@/types';
import { X, Users, Save, Shield, MapPin, Clock, Calendar, Globe, Sparkles } from 'lucide-react';

interface PrayerGroupModalProps {
  isOpen: boolean;
  groupToEdit?: PrayerGroup | null;
  members: Member[];
  currentChurchId: string;
  onClose: () => void;
  onSave: (group: PrayerGroup) => void;
}

const TOPIC_PRESETS = [
  'City Revival & Spiritual Awakening',
  'Physical & Emotional Healing',
  'Family & Marriage Wholeness',
  'Youth & Next-Gen Students',
  'Missions & Unreached Peoples',
  'Workplace & Business Leaders',
  'Pastoral Staff & Elders',
  'Comfort & Bereavement Care',
  'Financial Provision & Debt Freedom',
];

export const PrayerGroupModal: React.FC<PrayerGroupModalProps> = ({
  isOpen,
  groupToEdit,
  members = [],
  currentChurchId,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [coLeaderId, setCoLeaderId] = useState('');
  const [meetingDay, setMeetingDay] = useState('Saturday');
  const [meetingTime, setMeetingTime] = useState('06:00 AM - 07:00 AM');
  const [frequency, setFrequency] = useState<'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Daily'>('Weekly');
  const [meetingType, setMeetingType] = useState<'In-Person' | 'Online' | 'Hybrid'>('Hybrid');
  const [location, setLocation] = useState('Main Sanctuary Prayer Room');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [visibility, setVisibility] = useState<'Open' | 'Request to Join' | 'Invite Only'>('Open');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name || '');
      setDescription(groupToEdit.description || '');
      setLeaderId(groupToEdit.leader_id || '');
      setCoLeaderId(groupToEdit.co_leader_id || '');
      setMeetingDay(groupToEdit.meeting_day || 'Saturday');
      setMeetingTime(groupToEdit.meeting_time || '06:00 AM - 07:00 AM');
      setFrequency(groupToEdit.frequency || 'Weekly');
      setMeetingType(groupToEdit.meeting_type || 'Hybrid');
      setLocation(groupToEdit.location || '');
      setOnlineUrl(groupToEdit.online_url || '');
      setSelectedTopics(groupToEdit.topics || []);
      setVisibility(groupToEdit.visibility || 'Open');
      setStatus(groupToEdit.status || 'Active');
    } else {
      setName('');
      setDescription('');
      setLeaderId(members[0]?.id || '');
      setCoLeaderId('');
      setMeetingDay('Every Saturday');
      setMeetingTime('06:00 AM - 07:00 AM');
      setFrequency('Weekly');
      setMeetingType('Hybrid');
      setLocation('Main Sanctuary Prayer Room');
      setOnlineUrl('https://meet.google.com/prayer-revival');
      setSelectedTopics(['City Revival & Spiritual Awakening', 'Physical & Emotional Healing']);
      setVisibility('Open');
      setStatus('Active');
    }
  }, [groupToEdit, isOpen, members]);

  if (!isOpen) return null;

  const handleToggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleAddCustomTopic = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTopic.trim()) {
      e.preventDefault();
      if (!selectedTopics.includes(customTopic.trim())) {
        setSelectedTopics([...selectedTopics, customTopic.trim()]);
      }
      setCustomTopic('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Prayer group name is required.');
      return;
    }

    const leaderObj = members.find((m) => m.id === leaderId);
    const coLeaderObj = members.find((m) => m.id === coLeaderId);

    const payload: PrayerGroup = {
      id: groupToEdit?.id || `pg-${Date.now()}`,
      church_id: currentChurchId,
      name: name.trim(),
      description: description.trim(),
      leader_id: leaderId || undefined,
      leader_name: leaderObj ? `${leaderObj.firstName} ${leaderObj.lastName}` : (groupToEdit?.leader_name || 'Leader'),
      leader_email: leaderObj?.email,
      leader_phone: leaderObj?.phone,
      co_leader_id: coLeaderId || undefined,
      co_leader_name: coLeaderObj ? `${coLeaderObj.firstName} ${coLeaderObj.lastName}` : undefined,
      meeting_day: meetingDay.trim(),
      meeting_time: meetingTime.trim(),
      frequency,
      meeting_type: meetingType,
      location: location.trim() || undefined,
      online_url: onlineUrl.trim() || undefined,
      topics: selectedTopics,
      visibility,
      status,
      member_count: groupToEdit?.member_count || 1,
      created_at: groupToEdit?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {groupToEdit ? 'Edit Prayer Group' : 'Create New Prayer Group'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Organize intercessors, prayer cells, and scheduled cohorts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Group Name */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Prayer Group Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dawn Intercessors, Healing & Wholeness Cell..."
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Purpose & Group Focus</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the mandate, focus areas, and target intercessors for this squad..."
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Leaders Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Prayer Group Leader *</label>
              <select
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Choose Leader --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.status || 'Member'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Co-Leader (Optional)</label>
              <select
                value={coLeaderId}
                onChange={(e) => setCoLeaderId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- None / To Be Assigned --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Meeting Day</label>
              <input
                type="text"
                value={meetingDay}
                onChange={(e) => setMeetingDay(e.target.value)}
                placeholder="e.g. Every Saturday"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Meeting Time</label>
              <input
                type="text"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                placeholder="e.g. 06:00 AM - 07:00 AM"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              >
                <option value="Weekly">Weekly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
          </div>

          {/* Meeting Type & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Meeting Format</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              >
                <option value="Hybrid">Hybrid (In-Person & Online)</option>
                <option value="In-Person">In-Person Only</option>
                <option value="Online">Online Video Call Only</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Physical Venue</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Sanctuary / Room 3B"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
          </div>

          {(meetingType === 'Online' || meetingType === 'Hybrid') && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Google Meet / Zoom URL</label>
              <input
                type="url"
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
          )}

          {/* Topics & Prayer Focus */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Prayer Focus Topics</span>
              <span className="text-[10px] text-slate-400">Click to toggle</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_PRESETS.map((t) => {
                const isSelected = selectedTopics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTopic(t)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={handleAddCustomTopic}
              placeholder="+ Type custom topic and press Enter..."
              className="w-full p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 outline-none text-[11px]"
            />
          </div>

          {/* Visibility & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Join Permission</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              >
                <option value="Open">Open (Anyone can join directly)</option>
                <option value="Request to Join">Request to Join (Requires Approval)</option>
                <option value="Invite Only">Invite Only (Private Cohort)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Group Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              >
                <option value="Active">Active Intercession</option>
                <option value="Inactive">Inactive / Temporarily Paused</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{groupToEdit ? 'Save Changes' : 'Create Group'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
