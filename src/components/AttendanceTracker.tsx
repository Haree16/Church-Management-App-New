import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Member, AttendanceRecord, SaaSUser, CompleteChurchSettings, WhatsAppGroup } from '../types';
import { Users, Calendar, CheckCircle2, Circle, UserCheck, Plus, Sparkles, Clock, BarChart3, Save, Trash2, MessageSquare, Send, Copy, Check, X, HeartHandshake, ExternalLink } from 'lucide-react';
import { UserAvatar } from './common/UserAvatar';

interface AttendanceTrackerProps {
  members?: Member[];
  attendanceRecords?: AttendanceRecord[];
  currentUser?: SaaSUser;
  churchSettings?: CompleteChurchSettings;
  groups?: WhatsAppGroup[];
  onSaveRecord: (record: AttendanceRecord) => void;
  onDeleteRecord?: (id: string) => void;
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  members = [],
  attendanceRecords = [],
  currentUser,
  churchSettings,
  groups = [],
  onSaveRecord,
  onDeleteRecord,
}) => {
  const safeGroups = groups || [];
  const [isServiceWhatsAppModalOpen, setIsServiceWhatsAppModalOpen] = useState(false);
  const [serviceSummaryRecord, setServiceSummaryRecord] = useState<AttendanceRecord | null>(null);
  const [serviceSummaryMode, setServiceSummaryMode] = useState<'leadership_summary' | 'absentee_care'>('leadership_summary');
  const [selectedServiceTargetGroupId, setSelectedServiceTargetGroupId] = useState<string>('');
  const [serviceWhatsAppText, setServiceWhatsAppText] = useState('');
  const [serviceCopied, setServiceCopied] = useState(false);
  const customServices = (churchSettings?.services || []).filter(s => s.isActive !== false).map(s => s.name);
  const fallbackServices = [
    'Sunday First Service (9:00 AM)',
    'Sunday Second Service (10:45 AM)',
    'Wednesday Word & Prayer (7:00 PM)',
    'Friday Night Youth Fellowship (7:30 PM)',
    'Saturday Morning Intercession (8:00 AM)'
  ];
  const servicesList = customServices.length > 0 ? customServices : fallbackServices;

  const [selectedService, setSelectedService] = useState(servicesList[0] || 'Sunday Service');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [recorderName, setRecorderName] = useState(currentUser?.name || 'Church Usher / Leader');
  const [activeTab, setActiveTab] = useState<'take' | 'history'>('take');
  const [filterQuery, setFilterQuery] = useState('');

  const safeMembers = members || [];
  const safeRecords = attendanceRecords || [];

  const toggleMemberPresence = (id: string) => {
    setPresentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllMembers = () => {
    setPresentIds(safeMembers.map((m) => m.id));
  };

  const clearAllPresence = () => {
    setPresentIds([]);
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      date: serviceDate,
      serviceName: selectedService,
      presentMemberIds: presentIds,
      guestCount,
      notes,
      recordedBy: recorderName,
    };
    onSaveRecord(newRecord);
    alert(`Attendance saved successfully! Total present: ${presentIds.length + guestCount}`);
    setNotes('');
  };


  const generateServiceWhatsAppMessage = (record: AttendanceRecord | null, mode: 'leadership_summary' | 'absentee_care') => {
    const sName = record?.serviceName || selectedService;
    const sDate = record?.date 
      ? new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date(serviceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const pCount = record ? (record.presentMemberIds?.length || 0) : presentIds.length;
    const gCount = record ? (record.guestCount || 0) : guestCount;
    const total = pCount + gCount;
    const recName = record?.recordedBy || recorderName;
    const sNotes = record?.notes || notes;
    const churchTitle = churchSettings?.profile?.name || 'New Creation Assembly Church';

    if (mode === 'leadership_summary') {
      return `📊 *${churchTitle} - Service Attendance Report*\n\n` +
        `📍 *Service:* ${sName}\n` +
        `📅 *Date:* ${sDate}\n` +
        `👤 *Recorded By:* ${recName}\n\n` +
        `👥 *Attendance Headcount:*\n` +
        `• Registered Members: *${pCount}*\n` +
        `• First-Time Visitors: *${gCount}*\n` +
        `• Total Headcount: *${total}*\n\n` +
        (sNotes ? `📝 *Service Notes & Highlights:* ${sNotes}\n\n` : '') +
        `_Praise the Lord for a blessed service in His presence!_\n\n` +
        `*${churchTitle} Administration*`;
    } else {
      return `Dear Church Family of *${churchTitle}*,\n\n` +
        `Warm greetings in Christ! We missed you and your family at ${sName} on ${sDate}. You were in our prayers during service.\n\n` +
        `If you or your family need prayer intercession, home visitation, or pastoral assistance, please reply to this message anytime.\n\n` +
        `_“The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.” — Numbers 6:24-25_\n\n` +
        `With prayers & blessings,\n*${churchTitle} Pastoral Care Team*`;
    }
  };

  const handleOpenServiceWhatsAppModal = (record: AttendanceRecord | null, mode: 'leadership_summary' | 'absentee_care' = 'leadership_summary') => {
    setServiceSummaryRecord(record);
    setServiceSummaryMode(mode);
    const targetGrp = safeGroups.find(g => g.category === 'Leadership' || g.category === 'General') || safeGroups[0];
    setSelectedServiceTargetGroupId(targetGrp?.id || '');
    const msg = generateServiceWhatsAppMessage(record, mode);
    setServiceWhatsAppText(msg);
    setIsServiceWhatsAppModalOpen(true);
  };

  const handleDispatchServiceWhatsApp = () => {
    navigator.clipboard.writeText(serviceWhatsAppText);
    setServiceCopied(true);
    setTimeout(() => setServiceCopied(false), 3000);

    const targetGroup = safeGroups.find((g) => g.id === selectedServiceTargetGroupId);
    const encoded = encodeURIComponent(serviceWhatsAppText);
    const targetUrl = targetGroup?.inviteLink && targetGroup.inviteLink.startsWith('http')
      ? targetGroup.inviteLink
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(targetUrl, '_blank');
  };

  const filteredMembers = safeMembers
    .filter((m) =>
      `${m.firstName || ''} ${m.lastName || ''} ${m.status || ''} ${m.id || ''}`.toLowerCase().includes(filterQuery.toLowerCase())
    )
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' }));

  const totalMembersCount = safeMembers.length;
  const recentTotalAttendance = safeRecords.reduce((acc, curr) => acc + (curr.presentMemberIds?.length || 0) + (curr.guestCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div 
        data-theme-surface="dark"
        data-preserve-dark="true"
        className="dark-hero-panel bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-emerald-800/40"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#a7f3d0] text-xs font-semibold mb-3 border border-emerald-400/30"
              style={{ color: '#a7f3d0' }}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#34d399]" style={{ color: '#34d399' }} />
              <span>Member & Visitor Attendance Module</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" style={{ color: '#ffffff' }}>
              Church Attendance & Fellowship Logs
            </h2>
            <div 
              className="text-[#ecfdf5] text-sm mt-1 max-w-xl font-normal leading-relaxed"
              style={{ color: '#ecfdf5' }}
            >
              Track Sunday worship, midweek prayer, and youth service headcounts to shepherd every member and follow up with visitors.
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="text-center px-3 border-r border-white/20">
              <div 
                className="text-2xl font-black text-[#fbbf24]"
                style={{ color: '#fbbf24' }}
              >
                {totalMembersCount}
              </div>
              <div 
                className="text-[11px] text-[#e2e8f0] font-medium"
                style={{ color: '#e2e8f0' }}
              >
                Registered Members
              </div>
            </div>
            <div className="text-center px-3">
              <div 
                className="text-2xl font-black text-[#34d399]"
                style={{ color: '#34d399' }}
              >
                {attendanceRecords.length}
              </div>
              <div 
                className="text-[11px] text-[#e2e8f0] font-medium"
                style={{ color: '#e2e8f0' }}
              >
                Recorded Services
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar scrollbar-none">
        <button
          onClick={() => setActiveTab('take')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'take'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Mark Today's Service
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Attendance History & Reports ({attendanceRecords.length})
        </button>
      </div>

      {activeTab === 'take' ? (
        <form onSubmit={handleSaveAttendance} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Config Panel */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 text-slate-900 dark:text-white">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Service Information
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Service / Gathering</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {servicesList.map((s) => (
                  <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First-Time Visitors / Guests Count</label>
              <input
                type="number"
                min="0"
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Recorded By</label>
              <input
                type="text"
                value={recorderName}
                onChange={(e) => setRecorderName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Service Pastoral Notes</label>
              <textarea
                rows={3}
                placeholder="Key highlights, testimonies, or visitor follow-ups..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex justify-between items-center text-sm font-bold text-emerald-900 dark:text-emerald-200">
                <span>Present Members:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{presentIds.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-amber-900 dark:text-emerald-200 mt-1">
                <span>Guests / Visitors:</span>
                <span className="text-amber-700 dark:text-amber-400 font-extrabold">{guestCount}</span>
              </div>
              <div className="border-t border-emerald-200 dark:border-emerald-800/60 my-2 pt-2 flex justify-between items-center text-base font-extrabold text-emerald-950 dark:text-emerald-300">
                <span>Total Attendance:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black">{presentIds.length + guestCount}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Attendance Record
            </button>
          </div>

          {/* Member Roll Call List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col text-slate-900 dark:text-white">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Member Roll Call ({presentIds.length} of {members.length} checked)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllMembers}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-slate-800 transition"
                >
                  Mark All
                </button>
                <button
                  type="button"
                  onClick={clearAllPresence}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition"
                >
                  Uncheck All
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="Search member name or status..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredMembers.map((m) => {
                const isPresent = presentIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMemberPresence(m.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isPresent
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600/60 shadow-sm'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={`${m.firstName} ${m.lastName}`}
                        avatarUrl={m.avatarUrl}
                        size="sm"
                        shape="circle"
                        border="border border-slate-200 dark:border-slate-700 shadow-xs"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{m.firstName} {m.lastName}</p>
                        <span className="text-[10px] text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-medium border border-slate-200 dark:border-slate-600">
                          {m.status || 'Active Member'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isPresent ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/80" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      ) : (
        /* History Tab */
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-slate-900 dark:text-white">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Past Service Records</h3>
          {safeRecords.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No attendance logs recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {safeRecords.map((rec) => {
                const memberCount = (rec.presentMemberIds || []).length;
                const guestCount = rec.guestCount || 0;
                return (
                  <div key={rec.id} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          {rec.date}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{rec.serviceName}</h4>
                      </div>
                      {rec.notes && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{rec.notes}</p>}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Recorded by: {rec.recordedBy}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Members</p>
                          <p className="text-base font-extrabold text-slate-900 dark:text-white">{memberCount}</p>
                        </div>
                        <div className="text-center border-l border-slate-200 dark:border-slate-750 pl-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Guests</p>
                          <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">{guestCount}</p>
                        </div>
                        <div className="text-center border-l border-slate-200 dark:border-slate-750 pl-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total</p>
                          <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            {memberCount + guestCount}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenServiceWhatsAppModal(rec, 'leadership_summary')}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                        title="Broadcast Attendance Summary on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Summary</span>
                      </button>

                      {onDeleteRecord && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the attendance record for "${rec.serviceName}" on ${rec.date}?`)) {
                              onDeleteRecord(rec.id);
                            }
                          }}
                          className="p-2.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50 transition"
                          title="Delete this attendance entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    
      {/* MODAL: SERVICE ATTENDANCE WHATSAPP BROADCAST */}
      {isServiceWhatsAppModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsServiceWhatsAppModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto text-slate-900 dark:text-white my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Service Attendance WhatsApp Broadcast
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Broadcast headcount recap to Church Leadership or follow-up with members
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsServiceWhatsAppModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setServiceSummaryMode('leadership_summary');
                  setServiceWhatsAppText(generateServiceWhatsAppMessage(serviceSummaryRecord, 'leadership_summary'));
                }}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  serviceSummaryMode === 'leadership_summary'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Leadership Attendance Summary</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setServiceSummaryMode('absentee_care');
                  setServiceWhatsAppText(generateServiceWhatsAppMessage(serviceSummaryRecord, 'absentee_care'));
                }}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  serviceSummaryMode === 'absentee_care'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Absentee Care Broadcast</span>
              </button>
            </div>

            {/* Target WhatsApp Group */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Target Church WhatsApp Group Channel
              </label>
              <select
                value={selectedServiceTargetGroupId}
                onChange={(e) => setSelectedServiceTargetGroupId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {safeGroups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {g.name} ({g.category}) — {g.memberCount || 25} Members
                  </option>
                ))}
              </select>
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Formatted WhatsApp Message
                </label>
                <button
                  type="button"
                  onClick={() => setServiceWhatsAppText(generateServiceWhatsAppMessage(serviceSummaryRecord, serviceSummaryMode))}
                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Reset
                </button>
              </div>

              <textarea
                rows={8}
                value={serviceWhatsAppText}
                onChange={(e) => setServiceWhatsAppText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleDispatchServiceWhatsApp}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast to WhatsApp Group</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(serviceWhatsAppText);
                  setServiceCopied(true);
                  setTimeout(() => setServiceCopied(false), 2000);
                }}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 transition"
              >
                {serviceCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                <span>{serviceCopied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsServiceWhatsAppModalOpen(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
