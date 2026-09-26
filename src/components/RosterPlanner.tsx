import React, { useState, useMemo } from 'react';
import { RosterAssignment, Member, ChurchMinistry, SaaSUser, CompleteChurchSettings, ChurchEvent } from '../types';
import { MINISTRY_TEAMS } from '../data/initialData';
import { 
  Calendar, UserCheck, Plus, CheckCircle2, Clock, Trash2, Edit3, X, 
  Shield, Lock, Search, Filter, Layers, Check, MessageSquare, Send,
  Share2, ChevronRight, Sparkles, User, CalendarDays
} from 'lucide-react';
import { getRoleConfig } from '../utils/rbac';
import { inferServiceNameForDate } from '../utils/notificationUtils';
import { UserAvatar } from './common/UserAvatar';

interface RosterPlannerProps {
  roster?: RosterAssignment[];
  members?: Member[];
  ministries?: ChurchMinistry[];
  currentUser?: SaaSUser;
  churchSettings?: CompleteChurchSettings;
  events?: ChurchEvent[];
  onAddAssignment: (assignment: RosterAssignment) => void;
  onToggleConfirm: (id: string) => void;
  onRemoveAssignment: (id: string) => void;
}

export const RosterPlanner: React.FC<RosterPlannerProps> = ({
  roster = [],
  members = [],
  ministries = [],
  currentUser,
  churchSettings,
  events = [],
  onAddAssignment,
  onToggleConfirm,
  onRemoveAssignment
}) => {
  const safeRoster = roster || [];
  const safeMembers = members || [];
  const safeMinistries = ministries || [];

  const userRole = currentUser?.role || 'Member';
  const roleConfig = getRoleConfig(userRole);
  const canManage = roleConfig.canManageRoster || userRole === 'SuperAdmin' || userRole === 'PastorAdmin' || userRole === 'AssistantPastor' || userRole === 'MinistryLeader';

  // Identify matching church member for current user
  const currentMember = useMemo(() => {
    if (!currentUser) return null;
    const cleanPhone = (ph: string) => (ph || '').replace(/\D/g, '').slice(-10);
    return safeMembers.find((m) => 
      (currentUser.email && m.email && m.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
      (currentUser.phone && m.phone && cleanPhone(m.phone) === cleanPhone(currentUser.phone)) ||
      (`${m.firstName || ''} ${m.lastName || ''}`.trim().toLowerCase() === currentUser.name?.trim().toLowerCase())
    );
  }, [safeMembers, currentUser]);

  // List of standard church services
  const defaultServices = useMemo(() => {
    const fromSettings = (churchSettings?.services || [])
      .filter((s) => s.isActive !== false)
      .map((s) => ({
        id: s.id,
        name: s.name,
        day: s.day || 'Sunday',
        time: s.startTime || '09:00 AM',
      }));

    if (fromSettings.length > 0) return fromSettings;

    return [
      { id: 'srv-1', name: 'Sunday Morning Worship (9:00 AM)', day: 'Sunday', time: '09:00 AM' },
      { id: 'srv-2', name: 'Sunday Second Service (10:45 AM)', day: 'Sunday', time: '10:45 AM' },
      { id: 'srv-3', name: 'Sunday Evening Praise & Youth (6:00 PM)', day: 'Sunday', time: '06:00 PM' },
      { id: 'srv-4', name: 'Wednesday Word & Intercessory Prayer (7:00 PM)', day: 'Wednesday', time: '07:00 PM' },
      { id: 'srv-5', name: 'Friday Night Youth & Bible Fellowship (7:30 PM)', day: 'Friday', time: '07:30 PM' },
      { id: 'srv-6', name: 'Saturday Morning Dawn Prayer (6:00 AM)', day: 'Saturday', time: '06:00 AM' },
    ];
  }, [churchSettings]);

  // Generate dynamic list of upcoming service dates across ALL weekdays (Sunday, Wednesday, Friday, Saturday, etc.)
  const serviceDateOptions = useMemo(() => {
    const datesMap = new Map<string, string>();

    // 1. Collect all dates from existing roster entries
    safeRoster.forEach((r) => {
      if (r.serviceDate) {
        const d = new Date(r.serviceDate);
        const label = !isNaN(d.getTime())
          ? `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} (${r.serviceName || 'Service'})`
          : r.serviceDate;
        datesMap.set(r.serviceDate, label);
      }
    });

    // 2. Generate upcoming recurring service dates for next 4 weeks
    const today = new Date();
    const dayNameToNum: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    defaultServices.forEach((srv) => {
      const targetDayNum = dayNameToNum[srv.day.toLowerCase()] ?? 0;
      for (let week = 0; week < 5; week++) {
        const d = new Date(today);
        const currentDayNum = d.getDay();
        const diff = (targetDayNum - currentDayNum + 7) % 7 + (week * 7);
        d.setDate(d.getDate() + diff);
        const iso = d.toISOString().split('T')[0];
        const label = `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} — ${srv.name}`;
        if (!datesMap.has(iso)) {
          datesMap.set(iso, label);
        }
      }
    });

    // Convert map to sorted array
    return Array.from(datesMap.entries())
      .map(([date, label]) => ({ date, label }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [safeRoster, defaultServices]);

  // Initial selected date
  const [selectedServiceDate, setSelectedServiceDate] = useState<string>(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    const firstUpcoming = serviceDateOptions.find((o) => o.date >= todayIso);
    return firstUpcoming?.date || serviceDateOptions[0]?.date || todayIso;
  });

  // View Mode: 'by_date' (Single date view) | 'all_services' (Full schedule timeline) | 'my_duties' (Only current user's assignments)
  const [activeViewMode, setActiveViewMode] = useState<'by_date' | 'all_services' | 'my_duties'>('by_date');

  // Filters state
  const [filterTeam, setFilterTeam] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Confirmed' | 'Pending'>('All');
  const [filterService, setFilterService] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick schedule modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<RosterAssignment | null>(null);
  const [formDate, setFormDate] = useState(selectedServiceDate);
  const [formServiceName, setFormServiceName] = useState(defaultServices[0]?.name || 'Sunday Morning Worship Service');
  const [customServiceName, setCustomServiceName] = useState('');
  const [formRoleName, setFormRoleName] = useState('');
  const [formTeam, setFormTeam] = useState<string>(safeMinistries[0]?.name || 'Worship & Music');
  const [formMemberId, setFormMemberId] = useState('');

  // WhatsApp Share state
  const [copiedShare, setCopiedShare] = useState(false);

  // Filtered Roster computation
  const filteredRoster = useMemo(() => {
    return safeRoster.filter((item) => {
      // 1. Date Filter (if in single date mode)
      if (activeViewMode === 'by_date' && item.serviceDate !== selectedServiceDate) {
        return false;
      }

      // 2. My Duties Filter
      if (activeViewMode === 'my_duties') {
        const isOwn = (currentMember && item.memberId === currentMember.id) ||
          (currentUser?.name && item.memberName.toLowerCase().trim() === currentUser.name.toLowerCase().trim());
        if (!isOwn) return false;
      }

      // 3. Team Filter
      if (filterTeam !== 'All' && item.team !== filterTeam) {
        return false;
      }

      // 4. Status Filter
      if (filterStatus === 'Confirmed' && !item.confirmed) return false;
      if (filterStatus === 'Pending' && item.confirmed) return false;

      // 5. Service Filter
      if (filterService !== 'All' && !item.serviceName.toLowerCase().includes(filterService.toLowerCase())) {
        return false;
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.memberName.toLowerCase().includes(q);
        const matchRole = item.roleName.toLowerCase().includes(q);
        const matchTeam = item.team.toLowerCase().includes(q);
        const matchService = item.serviceName.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchTeam && !matchService) return false;
      }

      return true;
    });
  }, [safeRoster, activeViewMode, selectedServiceDate, currentMember, currentUser, filterTeam, filterStatus, filterService, searchQuery]);

  // Grouped by Date (for All Services view)
  const rosterGroupedByDate = useMemo(() => {
    const groups: Record<string, RosterAssignment[]> = {};
    filteredRoster.forEach((item) => {
      const d = item.serviceDate || 'Undated';
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRoster]);

  // Handlers for Modal
  const handleOpenCreate = () => {
    if (!canManage) return;
    setEditingAssignment(null);
    setFormDate(selectedServiceDate);
    const initialTeam = safeMinistries[0]?.name || 'Worship & Music';
    const autoService = inferServiceNameForDate(selectedServiceDate, initialTeam, churchSettings);
    setFormServiceName(autoService);
    setCustomServiceName('');
    setFormRoleName('');
    setFormTeam(initialTeam);
    setFormMemberId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (assignment: RosterAssignment) => {
    if (!canManage) return;
    setEditingAssignment(assignment);
    setFormDate(assignment.serviceDate);
    
    const matchingPredefined = defaultServices.find((s) => s.name === assignment.serviceName);
    if (matchingPredefined) {
      setFormServiceName(assignment.serviceName);
      setCustomServiceName('');
    } else {
      setFormServiceName('Custom');
      setCustomServiceName(assignment.serviceName);
    }

    setFormRoleName(assignment.roleName);
    setFormTeam(assignment.team || safeMinistries[0]?.name || 'Worship & Music');
    setFormMemberId(assignment.memberId);
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      alert('You do not have permission to modify roster assignments.');
      return;
    }
    if (!formRoleName.trim() || !formMemberId || !formDate) {
      alert('Please fill in role title, select a member, and specify a service date.');
      return;
    }

    const member = safeMembers.find((m) => m.id === formMemberId);
    if (!member) return;

    const finalServiceName = formServiceName === 'Custom' && customServiceName.trim()
      ? customServiceName.trim()
      : formServiceName;

    const assignmentData: RosterAssignment = {
      id: editingAssignment ? editingAssignment.id : ('rost-' + Date.now()),
      serviceDate: formDate,
      serviceName: finalServiceName,
      roleName: formRoleName.trim(),
      team: formTeam as any,
      memberId: member.id,
      memberName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
      confirmed: editingAssignment ? editingAssignment.confirmed : false,
      createdByUserId: editingAssignment?.createdByUserId || currentUser?.id,
      createdByName: editingAssignment?.createdByName || currentUser?.name || 'Roster Planner',
    };

    onAddAssignment(assignmentData);
    setIsModalOpen(false);
    setEditingAssignment(null);
    setSelectedServiceDate(formDate);
  };

  // WhatsApp Roster Sharing
  const handleShareRosterWhatsApp = () => {
    const formattedDate = new Date(selectedServiceDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const activeAssignments = safeRoster.filter((r) => r.serviceDate === selectedServiceDate);
    const serviceTitle = activeAssignments[0]?.serviceName || 'Church Gathering';

    let msg = `📋 *${serviceTitle} — Volunteer Duty Roster*\n` +
      `📅 *Date:* ${formattedDate}\n\n` +
      `*Assigned Team Members & Roles:*\n`;

    if (activeAssignments.length === 0) {
      msg += `_No roles assigned yet._\n`;
    } else {
      activeAssignments.forEach((a, i) => {
        msg += `${i + 1}. *${a.roleName}* (${a.team}): ${a.memberName} ${a.confirmed ? '✅ Confirmed' : '⏳ Pending'}\n`;
      });
    }

    msg += `\n_“Serve one another humbly in love.” — Galatians 5:13_\n` +
      `Please confirm your duties in the church app!`;

    navigator.clipboard.writeText(msg);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Helper for human-friendly date header
  const formattedSelectedDate = useMemo(() => {
    if (!selectedServiceDate) return '';
    const d = new Date(selectedServiceDate);
    if (isNaN(d.getTime())) return selectedServiceDate;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [selectedServiceDate]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div 
        data-theme-surface="dark"
        data-preserve-dark="true"
        className="dark-hero-panel bg-gradient-to-r from-amber-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border border-amber-800/40"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-[#fde68a] text-xs font-bold mb-2 border border-amber-500/30"
              style={{ color: '#fde68a' }}
            >
              <Calendar className="w-3.5 h-3.5 text-[#fbbf24]" style={{ color: '#fbbf24' }} />
              <span>Service Volunteer Roster & Scheduling</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" style={{ color: '#ffffff' }}>
              Church Service Duty Roster
            </h2>
            <div 
              className="text-[#fef3c7] text-xs sm:text-sm mt-1 max-w-xl font-normal leading-relaxed"
              style={{ color: '#fef3c7' }}
            >
              Schedule and manage volunteers across all church services — Sunday Worship, Midweek Prayer, Youth Nights, Dawn Prayer, and Special Gatherings.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleShareRosterWhatsApp}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center gap-2"
              title="Share the duty roster for selected service date to WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{copiedShare ? 'Copied & Opened!' : 'WhatsApp Roster'}</span>
            </button>

            {canManage && (
              <button
                onClick={handleOpenCreate}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Assign Volunteer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main View Mode Selector */}
      <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-sm overflow-x-auto no-scrollbar scrollbar-none text-xs font-bold">
        <button
          onClick={() => setActiveViewMode('by_date')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeViewMode === 'by_date'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>By Service Date</span>
        </button>

        <button
          onClick={() => setActiveViewMode('all_services')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeViewMode === 'all_services'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Upcoming Services ({safeRoster.length})</span>
        </button>

        <button
          onClick={() => setActiveViewMode('my_duties')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeViewMode === 'my_duties'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Scheduled Duties</span>
        </button>
      </div>

      {/* Primary Date & Service Navigation Bar (Visible in 'by_date' mode) */}
      {activeViewMode === 'by_date' && (
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white leading-tight">
                  {formattedSelectedDate}
                </h3>
                <p className="text-xs text-slate-400">
                  {filteredRoster.length} Roles Assigned • {filteredRoster.filter((r) => r.confirmed).length} Confirmed
                </p>
              </div>
            </div>

            {/* Quick Service Day Dropdown & Custom Date Picker */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 pl-2">Select Service:</span>
                <select
                  value={selectedServiceDate}
                  onChange={(e) => setSelectedServiceDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none pr-2 py-1 max-w-[240px] truncate"
                >
                  {serviceDateOptions.map((opt) => (
                    <option key={opt.date} value={opt.date} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Direct HTML5 Date Picker to Pick ANY day on the calendar */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 px-2 rounded-xl border border-slate-700" title="Choose any custom date">
                <span className="text-[10px] font-bold uppercase text-slate-400">Custom Date:</span>
                <input
                  type="date"
                  value={selectedServiceDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedServiceDate(e.target.value);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Filters Bar */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search input */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search volunteer, role, team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Ministry Team filter */}
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="All" className="bg-slate-900 text-white">All Ministry Teams</option>
            {safeMinistries.length > 0
              ? safeMinistries.map((m) => (
                  <option key={m.id} value={m.name} className="bg-slate-900 text-white">
                    {m.name}
                  </option>
                ))
              : MINISTRY_TEAMS.map((t) => (
                  <option key={t.id} value={t.name} className="bg-slate-900 text-white">
                    {t.name}
                  </option>
                ))}
          </select>

          {/* Confirmation status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="All" className="bg-slate-900 text-white">All Statuses</option>
            <option value="Confirmed" className="bg-slate-900 text-white">Confirmed Only</option>
            <option value="Pending" className="bg-slate-900 text-white">Pending Confirmation</option>
          </select>
        </div>

        <div className="text-xs font-bold text-slate-400">
          Showing <strong className="text-white font-extrabold">{filteredRoster.length}</strong> assignments
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SINGLE SERVICE DATE VIEW */}
      {/* ========================================================================= */}
      {activeViewMode === 'by_date' && (
        <div className="space-y-3">
          {filteredRoster.length === 0 ? (
            <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-dashed border-slate-800 space-y-3">
              <UserCheck className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-white text-sm">No volunteer roles assigned for this date yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {canManage 
                  ? 'Click "Assign Volunteer" to schedule team members for Wednesday, Friday, Saturday, or Sunday service roles.'
                  : 'Check back soon once ministry leadership publishes the duty roster for this service date.'}
              </p>
              {canManage && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Volunteer to {selectedServiceDate}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredRoster.map((item) => {
                const isOwnDuty = Boolean(
                  (currentMember && item.memberId === currentMember.id) ||
                  (currentUser?.name && item.memberName.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
                );

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between space-y-3 transition ${
                      isOwnDuty
                        ? 'bg-amber-950/20 border-amber-500/60 ring-2 ring-amber-500/20'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-md">
                              {item.team}
                            </span>
                            {isOwnDuty && (
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-md">
                                ★ Your Duty
                              </span>
                            )}
                          </div>
                          <h3 className="font-extrabold text-white text-sm mt-1.5 leading-snug">{item.roleName}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.serviceName}</p>
                        </div>

                        {/* Edit & Delete Controls for Admins & Leaders */}
                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                              title="Edit Assignment"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove ${item.memberName}'s assignment as ${item.roleName}?`)) {
                                  onRemoveAssignment(item.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition"
                              title="Remove Assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-200 mt-2.5 flex items-center gap-2">
                        <UserAvatar
                          name={item.memberName}
                          avatarUrl={safeMembers.find(m => m.id === item.memberId || `${m.firstName} ${m.lastName}`.toLowerCase().trim() === item.memberName.toLowerCase().trim())?.avatarUrl}
                          size="xs"
                          shape="circle"
                        />
                        <span className="truncate">{item.memberName}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${
                        item.confirmed ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {item.confirmed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Confirmed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Pending Confirmation</span>
                          </>
                        )}
                      </span>

                      {/* Confirmation Toggle Button */}
                      {(canManage || isOwnDuty) ? (
                        <button
                          onClick={() => onToggleConfirm(item.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 ${
                            item.confirmed
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                          }`}
                        >
                          {item.confirmed ? 'Mark Pending' : 'Confirm Attendance'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">View only</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ALL UPCOMING SERVICES (GROUPED TIMELINE) */}
      {/* ========================================================================= */}
      {activeViewMode === 'all_services' && (
        <div className="space-y-5">
          {rosterGroupedByDate.length === 0 ? (
            <div className="bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-800">
              <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">No upcoming service assignments scheduled.</p>
              {canManage && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                >
                  + Assign First Volunteer
                </button>
              )}
            </div>
          ) : (
            rosterGroupedByDate.map(([dateStr, items]) => {
              const d = new Date(dateStr);
              const headerText = !isNaN(d.getTime())
                ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
                : dateStr;
              const serviceTitle = items[0]?.serviceName || 'Service Gathering';

              return (
                <div key={dateStr} className="bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white">{headerText}</h4>
                        <p className="text-[11px] text-slate-400">{serviceTitle} • {items.length} Assigned</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedServiceDate(dateStr);
                          setActiveViewMode('by_date');
                        }}
                        className="text-xs font-bold text-amber-400 bg-amber-950/60 hover:bg-amber-900/60 px-3 py-1 rounded-xl border border-amber-800 transition"
                      >
                        View Date &rarr;
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {items.map((item) => (
                      <div key={item.id} className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                            {item.team}
                          </span>
                          <p className="text-xs font-bold text-white truncate mt-1">{item.roleName}</p>
                          <p className="text-[11px] text-slate-300 truncate">{item.memberName}</p>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className={`text-[10px] font-bold block ${item.confirmed ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {item.confirmed ? 'Confirmed ✓' : 'Pending'}
                          </span>
                          {(canManage || (currentMember && item.memberId === currentMember.id)) && (
                            <button
                              onClick={() => onToggleConfirm(item.id)}
                              className="text-[10px] text-blue-400 hover:underline font-semibold mt-1"
                            >
                              Toggle
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MY DUTIES VIEW */}
      {/* ========================================================================= */}
      {activeViewMode === 'my_duties' && (
        <div className="space-y-3">
          <div className="bg-amber-950/40 p-4 rounded-2xl border border-amber-800/80 text-xs text-amber-200 flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-amber-100">Showing assignments for: {currentUser?.name || 'Logged-in Volunteer'}</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">Confirm your attendance for upcoming services so ministry leaders can plan ahead.</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-900/60 text-amber-200 border border-amber-700/60 font-bold rounded-lg shrink-0">
              {filteredRoster.length} Duties
            </span>
          </div>

          {filteredRoster.length === 0 ? (
            <div className="bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-800 space-y-2">
              <UserCheck className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-200">You have no upcoming duties scheduled right now.</p>
              <p className="text-xs text-slate-400">When leaders assign you to a service duty, it will appear here and in your notifications.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredRoster.map((item) => (
                <div key={item.id} className="bg-slate-900 p-4 rounded-2xl border border-amber-500/40 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800">
                        {item.team}
                      </span>
                      <h4 className="text-sm font-black text-white mt-1">{item.roleName}</h4>
                      <p className="text-xs text-slate-300 font-semibold mt-0.5">📅 {item.serviceDate} • {item.serviceName}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${item.confirmed ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {item.confirmed ? '✓ Confirmed by you' : '⏳ Action Required: Please confirm'}
                    </span>

                    <button
                      onClick={() => onToggleConfirm(item.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                        item.confirmed
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {item.confirmed ? 'Mark Pending' : 'Confirm Attendance ✓'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASSIGN / EDIT VOLUNTEER MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-950/70 border border-amber-800/50 text-amber-400 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {editingAssignment ? 'Edit Volunteer Assignment' : 'Assign Volunteer Role'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Schedule volunteers across any church service day</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingAssignment(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateAssignment} className="space-y-3.5 text-xs">
              {/* Target Service Name */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Target Service / Gathering *</label>
                <select
                  value={formServiceName}
                  onChange={(e) => setFormServiceName(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {defaultServices.map((s) => (
                    <option key={s.id} value={s.name} className="bg-slate-900 text-white">
                      {s.name} ({s.day})
                    </option>
                  ))}
                  <option value="Special Revival Gathering" className="bg-slate-900 text-white">Special Revival Gathering</option>
                  <option value="Leadership Training Workshop" className="bg-slate-900 text-white">Leadership Training Workshop</option>
                  <option value="Custom" className="bg-slate-900 text-white">Custom Gathering Name...</option>
                </select>
              </div>

              {formServiceName === 'Custom' && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Custom Service Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saturday Night Worship Encounter"
                    value={customServiceName}
                    onChange={(e) => setCustomServiceName(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Service Date (Any Day: Sunday, Wednesday, Friday, Saturday, etc.) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Service Date (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => {
                      const newD = e.target.value;
                      setFormDate(newD);
                      if (formServiceName !== 'Custom') {
                        setFormServiceName(inferServiceNameForDate(newD, formTeam, churchSettings));
                      }
                    }}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Ministry Team *</label>
                  <select
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {safeMinistries.length > 0
                      ? safeMinistries.map((m) => (
                          <option key={m.id} value={m.name} className="bg-slate-900 text-white">
                            {m.name}
                          </option>
                        ))
                      : MINISTRY_TEAMS.map((t) => (
                          <option key={t.id} value={t.name} className="bg-slate-900 text-white">
                            {t.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {/* Role Title with Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-300">Role Title *</label>
                  <span className="text-[10px] text-slate-400 font-normal">Click preset to populate</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acoustic Guitarist, Head Usher, Sound Tech, Camera Operator"
                  value={formRoleName}
                  onChange={(e) => setFormRoleName(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                {/* Quick Role Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Worship Leader', 'Vocalist', 'Acoustic Guitar', 'Keys / Piano', 'Drums', 'Sound Engineer', 'Slide / Projection', 'Head Usher', 'Door Greeter', 'Intercessor', 'Sunday School Helper'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRoleName(r)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 hover:border-amber-800/60 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition"
                    >
                      + {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Member */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Assign Church Member *</label>
                <select
                  required
                  value={formMemberId}
                  onChange={(e) => setFormMemberId(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="" className="bg-slate-900 text-white">-- Choose Church Member / Volunteer --</option>
                  {safeMembers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.firstName} {m.lastName} — {(m.ministryTeams || []).join(', ') || 'No team'} ({m.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAssignment(null);
                  }}
                  className="px-4 py-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 font-bold rounded-xl transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow transition text-xs"
                >
                  {editingAssignment ? 'Save Changes' : 'Save Assignment & Notify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
