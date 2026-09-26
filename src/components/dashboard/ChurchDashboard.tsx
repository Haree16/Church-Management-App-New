import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChurchTenant, SaaSUser, Member, AttendanceRecord, ChurchEvent, 
  PrayerRequest, ChurchMinistry, MinistryMember, MinistryTeam, 
  MinistryActivity, RosterAssignment, AppNotification, PastorAnnouncement, 
  CompleteChurchSettings, SundaySchoolClass, SundaySchoolStudent 
} from '../../types';
import { 
  Users, UserPlus, UserCheck, Calendar, Clock, MapPin, 
  Heart, HeartHandshake, Landmark, Megaphone, Bell, 
  Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, 
  Plus, MessageSquare, Shield, Layers, Award, ArrowUpRight, 
  Filter, Eye, Check, X, RefreshCw, BarChart3, ArrowRight, ShieldCheck,
  CheckSquare
} from 'lucide-react';
import { auditService } from '../../services/auditService';
import { AuditLog } from '../../types/database';
import { getRoleConfig, canCreateEditMinistry } from '../../utils/rbac';

import { WelcomeHeader } from './WelcomeHeader';
import { ChurchOverviewKPICards, KPICardData } from './ChurchOverviewKPICards';
import { AttendanceTrendWidget } from './AttendanceTrendWidget';
import { MemberGrowthWidget } from './MemberGrowthWidget';
import { ActionRequiredWidget } from './ActionRequiredWidget';
import { RecentActivityWidget } from './RecentActivityWidget';
import { UpcomingEventsWidget } from './UpcomingEventsWidget';
import { BirthdaysWidget } from './BirthdaysWidget';

export type DateRangeFilter = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all';

interface ChurchDashboardProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser;
  members: Member[];
  attendance: AttendanceRecord[];
  events: ChurchEvent[];
  prayers: PrayerRequest[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  ministryTeams: MinistryTeam[];
  ministryActivities: MinistryActivity[];
  roster: RosterAssignment[];
  notifications: AppNotification[];
  announcements: PastorAnnouncement[];
  sundaySchoolClasses?: SundaySchoolClass[];
  sundaySchoolStudents?: SundaySchoolStudent[];
  churchSettings?: CompleteChurchSettings;
  onNavigateTab: (tab: string, deepLinkId?: string) => void;
  onOpenAddMember?: () => void;
  onOpenAddPrayer?: () => void;
  onOpenAddEvent?: () => void;
  onOpenRecordAttendance?: () => void;
  onOpenCreateMinistry?: () => void;
  onOpenChurchAi?: () => void;
  onOpenAiPastor?: () => void;
  onOpenAiMinistry?: () => void;
  onToggleRosterConfirm?: (assignmentId: string) => void;
}

export const ChurchDashboard: React.FC<ChurchDashboardProps> = ({
  currentChurch,
  currentUser,
  members = [],
  attendance = [],
  events = [],
  prayers = [],
  ministries = [],
  ministryMembers = [],
  ministryTeams = [],
  ministryActivities = [],
  roster = [],
  notifications = [],
  announcements = [],
  sundaySchoolClasses = [],
  sundaySchoolStudents = [],
  churchSettings,
  onNavigateTab,
  onOpenAddMember,
  onOpenAddPrayer,
  onOpenAddEvent,
  onOpenRecordAttendance,
  onOpenCreateMinistry,
  onOpenChurchAi,
  onOpenAiPastor,
  onOpenAiMinistry,
  onToggleRosterConfirm,
}) => {
  const activeChurchId = currentChurch?.id || 'church-1';
  const userRole = currentUser?.role || 'Member';
  const roleConfig = getRoleConfig(userRole);
  const isLeaderOrAdmin = ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'TreasurerStaff'].includes(userRole);
  const isMinistryLeader = ['MinistryLeader', 'SundaySchoolTeacher'].includes(userRole);

  const churchTimezone = churchSettings?.localization?.timezone || 'Asia/Kolkata';

  // Date Filter State
  const [dateRange, setDateRange] = useState<DateRangeFilter>('this_month');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Timezone date helpers
  const nowInTimezone = useMemo(() => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('en-US', {
        timeZone: churchTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        weekday: 'long',
      }).format(now);
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [churchTimezone]);

  const todayIsoString = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: churchTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, [churchTimezone]);

  const greeting = useMemo(() => {
    try {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: churchTimezone,
        hour: 'numeric',
        hour12: false,
      }).format(new Date());
      const hour = parseInt(hourStr, 10);
      if (hour < 12) return 'Good Morning';
      if (hour < 17) return 'Good Afternoon';
      return 'Good Evening';
    } catch {
      return 'Welcome';
    }
  }, [churchTimezone]);

  // Date range filter predicate
  const isDateInRange = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    if (dateRange === 'all') return true;

    const targetDate = new Date(dateStr);
    const today = new Date(todayIsoString);

    if (dateRange === 'today') return dateStr.startsWith(todayIsoString);
    if (dateRange === 'this_week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return targetDate >= startOfWeek && targetDate <= endOfWeek;
    }
    if (dateRange === 'this_month') {
      return dateStr.startsWith(todayIsoString.substring(0, 7));
    }
    if (dateRange === 'last_month') {
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevYearMonth = prevMonth.toISOString().substring(0, 7);
      return dateStr.startsWith(prevYearMonth);
    }
    if (dateRange === 'this_year') {
      return dateStr.startsWith(todayIsoString.substring(0, 4));
    }
    return true;
  };

  // KPI Calculations
  const kpiData = useMemo<KPICardData>(() => {
    const totalMembersCount = members.length;
    const activeMembersCount = members.filter(
      (m) =>
        m.status === 'Member' ||
        m.status === 'Leader' ||
        m.status === 'Pastor' ||
        m.status === 'Regular Attender' ||
        m.status === 'Clergy/Staff'
    ).length;

    const newMembersThisMonth = members.filter(
      (m) => (m.joinedDate && isDateInRange(m.joinedDate)) || (m.createdAt && isDateInRange(m.createdAt))
    ).length;

    const newMembersPrevMonth = members.filter((m) => {
      const today = new Date(todayIsoString);
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevPrefix = prevMonth.toISOString().substring(0, 7);
      return (m.joinedDate && m.joinedDate.startsWith(prevPrefix)) || (m.createdAt && m.createdAt.startsWith(prevPrefix));
    }).length;

    const visitorMembers = members.filter((m) => m.status === 'Visitor');
    const totalVisitorsCount = visitorMembers.length;

    const visitorsThisMonth = visitorMembers.filter(
      (m) => (m.joinedDate && isDateInRange(m.joinedDate)) || (m.createdAt && isDateInRange(m.createdAt))
    ).length;

    const visitorsPrevMonth = visitorMembers.filter((m) => {
      const today = new Date(todayIsoString);
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevPrefix = prevMonth.toISOString().substring(0, 7);
      return (m.joinedDate && m.joinedDate.startsWith(prevPrefix)) || (m.createdAt && m.createdAt.startsWith(prevPrefix));
    }).length;

    const filteredAtt = attendance.filter((a) => isDateInRange(a.date));
    const latestAttRecord = attendance.length > 0
      ? [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    const latestAttendanceCount = latestAttRecord
      ? (latestAttRecord.presentMemberIds?.length || 0) + (latestAttRecord.guestCount || 0)
      : 0;

    const sumAtt = filteredAtt.reduce((sum, a) => sum + ((a.presentMemberIds?.length || 0) + (a.guestCount || 0)), 0);
    const avgAttendanceMonth = filteredAtt.length > 0
      ? Math.round(sumAtt / filteredAtt.length)
      : latestAttendanceCount;

    const attendanceRatePercent = activeMembersCount > 0
      ? Math.min(100, Math.round((avgAttendanceMonth / activeMembersCount) * 100))
      : 100;

    const upcomingEventsCount = events.filter((e) => e.date >= todayIsoString).length;

    return {
      totalMembers: totalMembersCount,
      membersPrevMonth: newMembersPrevMonth,
      activeMembers: activeMembersCount,
      newMembersThisMonth,
      newMembersPrevMonth,
      totalVisitors: totalVisitorsCount,
      visitorsThisMonth,
      visitorsPrevMonth,
      latestAttendance: latestAttendanceCount,
      avgAttendanceMonth,
      attendanceRate: attendanceRatePercent,
      upcomingEventsCount,
    };
  }, [members, attendance, events, todayIsoString, dateRange]);

  // Scoped Data for Ministry Leaders
  const myMinistries = useMemo(() => {
    if (!currentUser) return [];
    const memberRecord = members.find(
      (m) => m.id === currentUser.id || m.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
    const memberTeams = memberRecord?.ministryTeams || [];
    const activeMins = ministries.filter((m) => m.status === 'Active');

    return activeMins.filter(
      (min) =>
        min.leaderMemberId === currentUser.id ||
        min.assistantLeaderMemberId === currentUser.id ||
        min.leaderName.toLowerCase() === currentUser.name.toLowerCase() ||
        memberTeams.some((t) => t.toLowerCase().includes(min.name.toLowerCase()) || min.name.toLowerCase().includes(t.toLowerCase())) ||
        ministryMembers.some((mm) => mm.ministryId === min.id && (mm.memberId === currentUser.id || mm.memberId === memberRecord?.id))
    );
  }, [ministries, currentUser, members, ministryMembers]);

  const primaryLeaderMinistry = myMinistries[0] || ministries[0] || null;

  const myAssignedRoster = useMemo(() => {
    if (!currentUser) return [];
    const memberRecord = members.find(
      (m) => m.id === currentUser.id || m.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
    const memberId = memberRecord?.id || currentUser.id;

    return roster.filter(
      (r) => (r.memberId === memberId || r.memberName.toLowerCase() === currentUser.name.toLowerCase()) && r.serviceDate >= todayIsoString
    );
  }, [roster, currentUser, members, todayIsoString]);

  // ==========================================================================
  // VIEW 1: MINISTRY LEADER DASHBOARD
  // ==========================================================================
  if (isMinistryLeader && primaryLeaderMinistry) {
    const leaderMinMembers = ministryMembers.filter((mm) => mm.ministryId === primaryLeaderMinistry.id);
    const leaderMinTeams = ministryTeams.filter((mt) => mt.ministryId === primaryLeaderMinistry.id);
    const leaderMinActs = ministryActivities.filter((ma) => ma.ministryId === primaryLeaderMinistry.id);
    const leaderMinRoster = roster.filter(
      (r) => r.ministryId === primaryLeaderMinistry.id || r.team.toLowerCase().includes(primaryLeaderMinistry.name.toLowerCase())
    );

    return (
      <div className="space-y-5 pb-12 animate-in fade-in duration-200">
        {/* Leader Greeting Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{ backgroundColor: primaryLeaderMinistry.color || '#f59e0b' }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Landmark className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  {primaryLeaderMinistry.name} Ministry Leader
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {greeting}, {currentUser?.name || 'Leader'} 👋
              </h1>
              <p className="text-xs text-slate-400">
                {currentChurch.name} • {nowInTimezone} ({churchTimezone})
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('ministries', primaryLeaderMinistry.id)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-1.5 shadow-md transition"
            >
              <span>Manage Ministry Profile</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Required Items */}
        <ActionRequiredWidget
          members={members}
          prayers={prayers}
          events={events}
          attendance={attendance}
          roster={roster}
          onNavigateTab={onNavigateTab}
          onToggleRosterConfirm={onToggleRosterConfirm}
        />

        {/* Ministry KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{leaderMinMembers.length}</div>
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Team Members</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{leaderMinTeams.length}</div>
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Sub-Squads</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{leaderMinActs.length}</div>
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Activities Logged</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{leaderMinRoster.length}</div>
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Roster Duties</div>
            </div>
          </div>
        </div>

        {/* Rehearsals & Roster Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <UpcomingEventsWidget events={events} onNavigateTab={onNavigateTab} />
          <RecentActivityWidget
            churchId={activeChurchId}
            members={members}
            prayers={prayers}
            attendance={attendance}
            events={events}
          />
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: MEMBER & VOLUNTEER DASHBOARD (Zero Admin Leak)
  // ==========================================================================
  if (!isLeaderOrAdmin && !isMinistryLeader) {
    return (
      <div className="space-y-5 pb-12 animate-in fade-in duration-200">
        {/* Member Welcome Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">{currentChurch.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {greeting}, {currentUser?.name || 'Friend'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Welcome to your church home. Here is what is happening across our congregation today.
            </p>
          </div>
        </div>

        {/* My Ministry Widget (Section 3 - Only for Ministry Members) */}
        {myMinistries.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 relative overflow-hidden text-slate-900 dark:text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-[10px] uppercase tracking-wider">
                    My Ministry
                  </span>
                  {myMinistries.length > 1 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      (+{myMinistries.length - 1} more)
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {myMinistries[0].name}
                </h2>
              </div>

              <button
                onClick={() => onNavigateTab('my-ministry')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0"
              >
                <span>View Ministry</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Ministry Leader</span>
                <div className="font-bold text-slate-900 dark:text-white truncate">
                  {myMinistries[0].leaderName || 'Church Leadership'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Next Assignment</span>
                <div className="font-bold text-amber-600 dark:text-amber-400 truncate">
                  {myAssignedRoster.length > 0
                    ? `${myAssignedRoster[0].roleName} (${myAssignedRoster[0].serviceName})`
                    : 'No shift assigned'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Upcoming Event</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                  {myMinistries[0].meetingDay
                    ? `${myMinistries[0].meetingDay} ${myMinistries[0].meetingTime || ''}`
                    : 'Regular Worship Service'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Serving Duties Roster (If Volunteer) */}
        {myAssignedRoster.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>My Serving Duties</span>
              </h3>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {myAssignedRoster.length} Upcoming
              </span>
            </div>

            <div className="space-y-2">
              {myAssignedRoster.map((r) => (
                <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{r.roleName} ({r.team})</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{r.serviceDate} • {r.serviceName}</p>
                  </div>
                  {onToggleRosterConfirm && (
                    <button
                      onClick={() => onToggleRosterConfirm(r.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        r.confirmed
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{r.confirmed ? 'Confirmed' : 'Confirm Serving'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member Grid: Events & Birthdays */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <UpcomingEventsWidget events={events} onNavigateTab={onNavigateTab} />
          <BirthdaysWidget members={members} onNavigateTab={onNavigateTab} />
        </div>

        {/* Quick Prayer Wall Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-900 dark:text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Need Prayer or Praise Report?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Our pastoral team and prayer warriors are standing with you in faith.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenAddPrayer && (
              <button
                onClick={onOpenAddPrayer}
                className="flex-1 sm:flex-none px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
              >
                + Submit Prayer Request
              </button>
            )}
            <button
              onClick={() => onNavigateTab('prayers')}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs transition"
            >
              Open Prayer Wall
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 3: PASTOR & CHURCH ADMIN DASHBOARD (Modern 2026 SaaS Layout)
  // Mobile Hierarchy (Requirement 20):
  // 1. Welcome Header
  // 2. Quick Actions / Care Actions
  // 3. Action Required
  // 4. KPI Summary Cards
  // 5. Attendance Trend
  // 6. Member Growth
  // 7. Upcoming Events
  // 8. Recent Activity Feed
  // 9. Birthdays & Important Dates
  // ==========================================================================
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Welcome Header */}
      <WelcomeHeader
        currentChurch={currentChurch}
        currentUser={currentUser}
        churchSettings={churchSettings}
        totalMembersCount={kpiData.totalMembers}
        totalVisitorsCount={kpiData.totalVisitors}
        onOpenAddMember={onOpenAddMember}
        onOpenAddPrayer={onOpenAddPrayer}
        onOpenAddEvent={onOpenAddEvent}
        onOpenRecordAttendance={onOpenRecordAttendance}
        onOpenCreateMinistry={onOpenCreateMinistry}
        onOpenChurchAi={onOpenChurchAi}
        onOpenAiPastor={onOpenAiPastor}
        onOpenAiMinistry={onOpenAiMinistry}
      />

      {/* Date Range Selector Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Dashboard Intelligence Timeframe:</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
          {[
            { id: 'today' as DateRangeFilter, label: 'Today' },
            { id: 'this_week' as DateRangeFilter, label: 'This Week' },
            { id: 'this_month' as DateRangeFilter, label: 'This Month' },
            { id: 'last_month' as DateRangeFilter, label: 'Last Month' },
            { id: 'this_year' as DateRangeFilter, label: 'This Year' },
            { id: 'all' as DateRangeFilter, label: 'All Time' },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`px-3 py-1 rounded-lg transition whitespace-nowrap ${
                dateRange === range.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Action Required (Records needing immediate attention) */}
      <ActionRequiredWidget
        members={members}
        prayers={prayers}
        events={events}
        attendance={attendance}
        roster={roster}
        onNavigateTab={onNavigateTab}
        onToggleRosterConfirm={onToggleRosterConfirm}
      />

      {/* 4. KPI Overview Cards */}
      <ChurchOverviewKPICards
        data={kpiData}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => {
          setIsError(false);
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 300);
        }}
        onNavigateTab={onNavigateTab}
      />

      {/* 5 & 6. Attendance Analytics & Member Growth Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <AttendanceTrendWidget
            attendanceRecords={attendance}
            onNavigateTab={onNavigateTab}
            onOpenRecordAttendance={onOpenRecordAttendance}
            isLoading={isLoading}
            isError={isError}
          />
        </div>

        <div className="lg:col-span-5">
          <MemberGrowthWidget
            members={members}
            onNavigateTab={onNavigateTab}
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </div>

      {/* 7 & 8. Upcoming Events & Recent Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UpcomingEventsWidget
          events={events}
          onNavigateTab={onNavigateTab}
          isLoading={isLoading}
        />

        <RecentActivityWidget
          churchId={activeChurchId}
          members={members}
          prayers={prayers}
          attendance={attendance}
          events={events}
          isLoading={isLoading}
        />
      </div>

      {/* 9. Birthdays & Important Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <BirthdaysWidget
            members={members}
            onNavigateTab={onNavigateTab}
            isLoading={isLoading}
          />
        </div>

        <div className="lg:col-span-4 flex">
          {/* Active Ministries Quick Launcher */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between w-full space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-600" />
                <span>Active Ministries</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ministries.filter((m) => m.status === 'Active').length} active serving departments.
              </p>
            </div>

            <div className="space-y-2">
              {ministries.filter((m) => m.status === 'Active').slice(0, 3).map((min) => (
                <div
                  key={min.id}
                  onClick={() => onNavigateTab('ministries', min.id)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: min.color || '#f59e0b' }} />
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{min.name}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800">
                    {ministryMembers.filter((mm) => mm.ministryId === min.id).length} Team
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('ministries')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-1 text-right block"
            >
              Manage Ministries &rarr;
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
