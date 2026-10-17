import React, { useState, useEffect } from 'react';
import { PrayerMeeting, PrayerGroup } from '@/types/prayerMinistry';
import { Member, SaaSUser } from '@/types';
import { X, Calendar, Clock, MapPin, Globe, Save, UserCheck, Shield } from 'lucide-react';

interface PrayerMeetingModalProps {
  isOpen: boolean;
  meetingToEdit?: PrayerMeeting | null;
  prayerGroups: PrayerGroup[];
  members: Member[];
  currentUser?: SaaSUser | null;
  currentChurchId: string;
  onClose: () => void;
  onSave: (meeting: PrayerMeeting) => void;
}

export const PrayerMeetingModal: React.FC<PrayerMeetingModalProps> = ({
  isOpen,
  meetingToEdit,
  prayerGroups = [],
  members = [],
  currentUser,
  currentChurchId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('06:00 AM');
  const [endTime, setEndTime] = useState('07:00 AM');
  const [meetingType, setMeetingType] = useState<'In-Person' | 'Online' | 'Hybrid'>('Hybrid');
  const [location, setLocation] = useState('Main Sanctuary');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerId, setOrganizerId] = useState('');
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);

  useEffect(() => {
    if (meetingToEdit) {
      setTitle(meetingToEdit.title || '');
      setDescription(meetingToEdit.description || '');
      setGroupId(meetingToEdit.group_id || '');
      setDate(meetingToEdit.date || new Date().toISOString().split('T')[0]);
      setStartTime(meetingToEdit.start_time || '06:00 AM');
      setEndTime(meetingToEdit.end_time || '07:00 AM');
      setMeetingType(meetingToEdit.meeting_type || 'Hybrid');
      setLocation(meetingToEdit.location || '');
      setOnlineUrl(meetingToEdit.online_url || '');
      setOrganizerName(meetingToEdit.organizer_name || '');
      setOrganizerId(meetingToEdit.organizer_id || '');
      setAttendanceEnabled(meetingToEdit.attendance_enabled || false);
    } else {
      setTitle('');
      setDescription('');
      setGroupId(prayerGroups[0]?.id || '');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('06:00 AM');
      setEndTime('07:00 AM');
      setMeetingType('Hybrid');
      setLocation('Main Sanctuary Prayer Room');
      setOnlineUrl('https://meet.google.com/prayer-gathering');
      setOrganizerName(currentUser?.name || 'Prayer Leader');
      setOrganizerId(currentUser?.id || '');
      setAttendanceEnabled(true);
    }
  }, [meetingToEdit, isOpen, currentUser, prayerGroups]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      alert('Meeting title and date are required.');
      return;
    }

    const selectedGroup = prayerGroups.find((g) => g.id === groupId);

    const payload: PrayerMeeting = {
      id: meetingToEdit?.id || `pm-${Date.now()}`,
      church_id: currentChurchId,
      group_id: groupId || undefined,
      group_name: selectedGroup ? selectedGroup.name : 'Church-Wide Gathering',
      title: title.trim(),
      description: description.trim(),
      date,
      start_time: startTime.trim(),
      end_time: endTime.trim() || undefined,
      meeting_type: meetingType,
      location: location.trim() || undefined,
      online_url: onlineUrl.trim() || undefined,
      organizer_id: organizerId || undefined,
      organizer_name: organizerName.trim() || 'Prayer Leader',
      attendee_ids: meetingToEdit?.attendee_ids || [],
      attendance_enabled: attendanceEnabled,
      attendance_records: meetingToEdit?.attendance_records || [],
      created_at: meetingToEdit?.created_at || new Date().toISOString(),
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
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {meetingToEdit ? 'Edit Prayer Meeting' : 'Schedule Prayer Meeting'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Setup upcoming intercessory meetings, virtual prayer calls, or watches
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
          {/* Meeting Title */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Meeting Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dawn Revival Prayer, Wednesday Fasting Prayer..."
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Meeting Purpose / Agenda</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specific prayer targets, scripture focus, or meeting instructions..."
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Associated Group */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Prayer Group / Host Cohort</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">🌐 All Church (Church-Wide Gathering)</option>
              {prayerGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  👥 {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="06:00 AM"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">End Time</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="07:00 AM"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
          </div>

          {/* Format & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Format</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              >
                <option value="Hybrid">Hybrid (In-Person & Online)</option>
                <option value="In-Person">In-Person Only</option>
                <option value="Online">Online Video Call</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Physical Venue</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Main Sanctuary / Prayer Room"
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

          {/* Organizer */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Lead Organizer / Pastor</label>
            <input
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
            />
          </div>

          {/* Attendance Tracking Feature Toggle */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Enable Attendance Recording</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Allows leaders to mark attendee participation records for this prayer service.
              </div>
            </div>
            <input
              type="checkbox"
              checked={attendanceEnabled}
              onChange={(e) => setAttendanceEnabled(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
            />
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
              <span>{meetingToEdit ? 'Save Changes' : 'Schedule Meeting'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
