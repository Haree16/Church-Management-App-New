import React, { useState, useEffect } from 'react';
import { ChurchEvent, Member, ChurchTenant, SaaSUser } from '../types';
import { 
  Calendar, MapPin, Clock, Users, Plus, CheckCircle, Sparkles, 
  X, Share2, Download, Trash2, AlertTriangle, Edit3, Save, Eye,
  FileText, Check, Tag, Lock
} from 'lucide-react';
import { UserAvatar } from './common/UserAvatar';

interface EventCalendarProps {
  events?: ChurchEvent[];
  members?: Member[];
  currentChurch?: ChurchTenant;
  currentUser?: SaaSUser;
  canManageEvents?: boolean;
  onSaveEvent: (event: ChurchEvent) => void;
  onToggleRsvp: (eventId: string, memberId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export const EventCalendar: React.FC<EventCalendarProps> = ({
  events = [],
  members = [],
  currentChurch,
  currentUser,
  canManageEvents = false,
  onSaveEvent,
  onToggleRsvp,
  onDeleteEvent,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ChurchEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ChurchEvent | null>(null);
  const safeMembers = members || [];
  const safeEvents = events || [];
  const [currentMemberId, setCurrentMemberId] = useState('');

  const canChangeRsvpMember = currentUser
    ? ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'MinistryLeader', 'TreasurerStaff', 'SundaySchoolTeacher'].includes(currentUser.role)
    : true;

  useEffect(() => {
    if (currentUser && safeMembers.length > 0) {
      const matchingMember = safeMembers.find(m => 
        m.id === currentUser.id ||
        (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (m.phone && currentUser.phone && m.phone === currentUser.phone) ||
        (`${m.firstName} ${m.lastName}`.toLowerCase() === (currentUser.name || '').toLowerCase()) ||
        (m.firstName.toLowerCase() === (currentUser.username || '').toLowerCase())
      );
      if (matchingMember) {
        setCurrentMemberId(matchingMember.id);
      } else if (!currentMemberId && safeMembers[0]) {
        setCurrentMemberId(safeMembers[0].id);
      }
    } else if (!currentMemberId && safeMembers[0]) {
      setCurrentMemberId(safeMembers[0].id);
    }
  }, [currentUser, safeMembers]);

  // Event Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<ChurchEvent['category']>('Service');
  const [imageUrl, setImageUrl] = useState('');

  const categories = ['All', 'Service', 'Fellowship', 'Youth', 'Conference', 'Outreach', 'Meeting'];

  const filteredEvents = safeEvents.filter(
    (e) => selectedCategory === 'All' || e.category === selectedCategory
  );

  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('10:00 AM');
    setLocation(currentChurch?.name ? `${currentChurch.name} Main Sanctuary` : 'Main Sanctuary');
    setCategory('Service');
    setImageUrl('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=600&q=80');
    setShowEventModal(true);
  };

  const handleOpenEditModal = (evt: ChurchEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingEventId(evt.id);
    setTitle(evt.title);
    setDescription(evt.description || '');
    setDate(evt.date);
    setTime(evt.time || '10:00 AM');
    setLocation(evt.location || '');
    setCategory(evt.category || 'Service');
    setImageUrl(evt.imageUrl || '');
    setViewingEvent(null);
    setShowEventModal(true);
  };

  const handleSaveEventForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    const existingEvt = editingEventId ? safeEvents.find((ev) => ev.id === editingEventId) : null;

    const eventPayload: ChurchEvent = {
      id: editingEventId || `evt-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      date,
      time: time.trim() || '10:00 AM',
      location: location.trim() || (currentChurch?.name ? `${currentChurch.name} Main Sanctuary` : 'Main Sanctuary'),
      category,
      rsvpMemberIds: existingEvt?.rsvpMemberIds || [],
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=600&q=80',
    };

    onSaveEvent(eventPayload);
    setShowEventModal(false);
    setEditingEventId(null);
  };

  const downloadIcs = (evt: ChurchEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const orgName = currentChurch?.name || 'Church Organization';
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${orgName}//Church Calendar//EN
BEGIN:VEVENT
SUMMARY:${evt.title}
DESCRIPTION:${evt.description}
LOCATION:${evt.location}
DTSTART:${evt.date.replace(/-/g, '')}T090000Z
DTEND:${evt.date.replace(/-/g, '')}T110000Z
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${evt.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewingAttendingMembers = viewingEvent 
    ? safeMembers.filter((m) => (viewingEvent.rsvpMemberIds || []).includes(m.id))
    : [];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
              <Calendar className="w-3.5 h-3.5" />
              Church Events & Services Calendar
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gatherings, Conferences & Outreach
            </h2>
            <p className="text-amber-100/80 text-sm mt-1 max-w-xl">
              Stay connected with upcoming worship services, prayer meetings, youth conferences, and community outreach programs.
            </p>
          </div>

          {canManageEvents && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl shadow-lg text-xs flex items-center gap-2 transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Publish New Church Event
            </button>
          )}
        </div>
      </div>

      {/* Category Filter & RSVP Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Member selector for RSVPing */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span>RSVPing as:</span>
          <select
            value={currentMemberId}
            disabled={!canChangeRsvpMember}
            onChange={(e) => setCurrentMemberId(e.target.value)}
            className={`border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-900 focus:outline-none ${
              !canChangeRsvpMember
                ? 'bg-slate-100 opacity-80 cursor-not-allowed text-slate-600'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {safeMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredEvents.map((evt) => {
          const rsvpIds = evt.rsvpMemberIds || [];
          const hasRsvped = rsvpIds.includes(currentMemberId);
          return (
            <div
              key={evt.id}
              onClick={() => setViewingEvent(evt)}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition group cursor-pointer"
            >
              {evt.imageUrl && evt.imageUrl.trim() ? (
                <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                  <img src={evt.imageUrl.trim()} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-900/80 text-amber-400 backdrop-blur-md border border-white/20">
                    {evt.category}
                  </span>
                </div>
              ) : (
                <div className="h-24 w-full bg-gradient-to-r from-amber-900/80 to-slate-900 p-4 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {evt.category}
                  </span>
                  <span className="text-xs text-amber-200/70 font-semibold">{evt.date}</span>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{evt.date}</span>
                    <span className="text-slate-300">•</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-600">{evt.time}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-amber-700 transition">
                    {evt.title}
                  </h3>

                  {evt.description ? (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {evt.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No description provided.</p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingEvent(evt);
                    }}
                    className="flex items-center gap-1 text-xs text-slate-600 font-semibold hover:text-amber-700 transition"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rsvpIds.length} Attending</span>
                    <span className="text-[11px] text-amber-600 font-bold ml-1">Details &rarr;</span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {canManageEvents && (
                      <button
                        onClick={(e) => handleOpenEditModal(evt, e)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Edit Event"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {canManageEvents && onDeleteEvent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventToDelete(evt);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => downloadIcs(evt, e)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Add to Personal Calendar (.ics)"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRsvp(evt.id, currentMemberId);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        hasRsvped
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                      }`}
                    >
                      {hasRsvped ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          RSVP'd
                        </>
                      ) : (
                        'RSVP'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* READ-ONLY EVENT DETAILS POPUP MODAL */}
      {viewingEvent && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Banner Header */}
            {viewingEvent.imageUrl && viewingEvent.imageUrl.trim() ? (
              <div className="h-52 w-full relative overflow-hidden bg-slate-100 shrink-0">
                <img 
                  src={viewingEvent.imageUrl.trim()} 
                  alt={viewingEvent.title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-950/80 text-amber-400 backdrop-blur-md border border-white/20">
                  {viewingEvent.category}
                </span>

                <button
                  onClick={() => setViewingEvent(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="text-xl sm:text-2xl font-extrabold leading-tight drop-shadow-md">
                    {viewingEvent.title}
                  </h2>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-amber-900 to-slate-900 p-6 text-white shrink-0 relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {viewingEvent.category}
                  </span>
                  <button
                    onClick={() => setViewingEvent(null)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
                  {viewingEvent.title}
                </h2>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Event Metadata Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/60 text-amber-900 flex items-center justify-center shrink-0 font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-amber-800">Date</p>
                    <p className="text-xs font-extrabold text-slate-900">{viewingEvent.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/60 text-amber-900 flex items-center justify-center shrink-0 font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-amber-800">Time</p>
                    <p className="text-xs font-extrabold text-slate-900">{viewingEvent.time || '10:00 AM'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:col-span-1">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/60 text-amber-900 flex items-center justify-center shrink-0 font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] uppercase font-bold text-amber-800">Location</p>
                    <p className="text-xs font-extrabold text-slate-900 truncate" title={viewingEvent.location}>
                      {viewingEvent.location || 'Main Sanctuary'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Description Block */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  Event Description & Details
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {viewingEvent.description ? (
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                      {viewingEvent.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No detailed description has been provided for this event.</p>
                  )}
                </div>
              </div>

              {/* Confirmed Attendees Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    Confirmed Attendees ({(viewingEvent.rsvpMemberIds || []).length})
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">RSVP Roster</span>
                </div>

                {viewingAttendingMembers.length === 0 ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    No members have confirmed RSVP yet. Be the first to RSVP below!
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {viewingAttendingMembers.map((m) => (
                      <div
                        key={m.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800"
                      >
                        <UserAvatar
                          name={`${m.firstName} ${m.lastName}`}
                          avatarUrl={m.avatarUrl}
                          size="xs"
                          shape="circle"
                        />
                        <span>{m.firstName} {m.lastName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({m.phone})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Read-Only Modal Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {canManageEvents && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(viewingEvent)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    Edit Event
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => downloadIcs(viewingEvent)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Calendar (.ics)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onToggleRsvp(viewingEvent.id, currentMemberId);
                    const rsvpIds = viewingEvent.rsvpMemberIds || [];
                    const hasRsvped = rsvpIds.includes(currentMemberId);
                    const updatedRsvps = hasRsvped
                      ? rsvpIds.filter((id) => id !== currentMemberId)
                      : [...rsvpIds, currentMemberId];
                    setViewingEvent({ ...viewingEvent, rsvpMemberIds: updatedRsvps });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                    (viewingEvent.rsvpMemberIds || []).includes(currentMemberId)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold'
                  }`}
                >
                  {(viewingEvent.rsvpMemberIds || []).includes(currentMemberId) ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      RSVP Confirmed
                    </>
                  ) : (
                    'RSVP Now'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setViewingEvent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Schedule or Edit Event */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  {editingEventId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingEventId ? 'Edit Church Event' : 'Schedule New Church Event'}
                  </h3>
                  <p className="text-xs text-slate-500">Publish service or gathering details to the church calendar</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEventId(null);
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEventForm} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunday Celebration Service"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Sanctuary"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Image Banner URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Description</label>
                <textarea
                  rows={4}
                  placeholder="Details about the service, guest speakers, special schedules..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEventId(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingEventId ? 'Save Changes' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Church Event?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-800">"{eventToDelete.title}"</strong> ({eventToDelete.date})? This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteEvent) {
                    onDeleteEvent(eventToDelete.id);
                  }
                  setEventToDelete(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
