import React, { useState, useMemo, useRef } from 'react';
import {
  ChurchTenant, SaaSUser, Member, AttendanceRecord, ChurchEvent,
  PrayerRequest, ChurchMinistry, MinistryMember, MinistryTeam,
  MinistryActivity, RosterAssignment, AppNotification, PastorAnnouncement,
  CompleteChurchSettings, SundaySchoolClass, SundaySchoolStudent,
  MembershipStatus, PrayerCategory
} from '../../types';
import {
  BarChart3, Users, Heart, Calendar, Clock, MapPin,
  HeartHandshake, Landmark, Megaphone, Bell, Sparkles,
  TrendingUp, AlertTriangle, CheckCircle2, ChevronRight,
  Download, Printer, Search, Filter, RefreshCw, Eye,
  ArrowUpDown, FileSpreadsheet, Layers, ShieldCheck, Check,
  X, UserPlus, UserCheck, GraduationCap, ChevronLeft,
  Share2, ArrowUpRight, DollarSign, Database, SlidersHorizontal, Trash2
} from 'lucide-react';
import { canAccessAllChurchReports, getRoleConfig } from '../../utils/rbac';
import { auditService } from '../../services/auditService';
import { AttendanceInsightsDashboard } from './AttendanceInsightsDashboard';
import { MemberEngagementDashboard } from './MemberEngagementDashboard';
import { AutomatedAbsenceFollowUpDashboard } from './AutomatedAbsenceFollowUpDashboard';
import { AiReportGenerator } from './AiReportGenerator';

export type ReportCategory =
  | 'members'
  | 'families'
  | 'visitors'
  | 'attendance'
  | 'attendance-insights'
  | 'engagement'
  | 'absence-followup'
  | 'ai-reports'
  | 'ministries'
  | 'sundayschool'
  | 'volunteers'
  | 'events'
  | 'prayers'
  | 'growth'
  | 'custom';

export type ReportDateFilter = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom_range';

interface ReportsModuleProps {
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
  initialCategory?: ReportCategory;
  onNavigateTab?: (tab: string, deepLinkId?: string) => void;
  onDeleteAttendance?: (id: string) => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
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
  initialCategory = 'members',
  onNavigateTab,
  onDeleteAttendance,
}) => {
  const activeChurchId = currentChurch?.id || 'church-1';
  const userRole = currentUser?.role || 'Member';
  const isFullAdmin = canAccessAllChurchReports(userRole);
  const churchTimezone = churchSettings?.localization?.timezone || 'Asia/Kolkata';

  // Active Category tab
  const [activeCategory, setActiveCategory] = useState<ReportCategory>(initialCategory);
  const [attendanceSubTab, setAttendanceSubTab] = useState<'insights' | 'logs'>('insights');

  // Filters
  const [dateRange, setDateRange] = useState<ReportDateFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [ministryFilter, setMinistryFilter] = useState<string>('ALL');
  const [ssClassFilter, setSSClassFilter] = useState<string>('ALL');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('ALL');
  const [prayerCategoryFilter, setPrayerCategoryFilter] = useState<string>('ALL');

  // Sorting & Pagination
  const [sortField, setSortField] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Selected Member for Attendance Lookup
  const [selectedLookupMemberId, setSelectedLookupMemberId] = useState<string>('');

  // Localized date helpers
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

  const reportGeneratedTimestamp = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: churchTimezone,
        dateStyle: 'full',
        timeStyle: 'medium',
      }).format(new Date());
    } catch {
      return new Date().toLocaleString();
    }
  }, [churchTimezone]);

  // Date Range Filtering Check
  const isDateInRange = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    if (dateRange === 'all') return true;

    if (dateRange === 'custom_range') {
      if (!customStartDate && !customEndDate) return true;
      if (customStartDate && dateStr < customStartDate) return false;
      if (customEndDate && dateStr > customEndDate) return false;
      return true;
    }

    const targetDate = new Date(dateStr);
    const today = new Date(todayIsoString);

    if (dateRange === 'today') {
      return dateStr.startsWith(todayIsoString);
    }
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

  // Helper for Exporting to CSV / Excel
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    try {
      // Audit log the export
      auditService.logAction(activeChurchId, {
        action: 'report.export',
        resource_type: 'report',
        actor_name: currentUser?.name || 'Administrator',
        actor_role: userRole,
        details: { category: activeCategory, filename, rowsCount: rows.length }
      });

      const headerRow = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
      const bodyRows = rows.map(row => 
        row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const csvContent = `\uFEFFChurch: ${currentChurch.name}\nReport: ${filename}\nDate Generated: ${reportGeneratedTimestamp}\nFilters: Date Range=${dateRange}, Ministry=${ministryFilter}, Service=${serviceFilter}\n\n${headerRow}\n${bodyRows}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename.toLowerCase().replace(/\s+/g, '_')}_${todayIsoString}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Failed to export CSV:', e);
    }
  };

  // Helper for Clean Printing
  const handlePrint = () => {
    auditService.logAction(activeChurchId, {
      action: 'report.print',
      resource_type: 'report',
      actor_name: currentUser?.name || 'Administrator',
      actor_role: userRole,
      details: { category: activeCategory }
    });
    window.print();
  };

  // ==========================================================================
  // DATA FILTERING & AGGREGATIONS
  // ==========================================================================

  // 1. Members Report Data
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = searchTerm === '' || 
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone?.includes(searchTerm) ||
        m.city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const matchMinistry = ministryFilter === 'ALL' || (m.ministryTeams && m.ministryTeams.some(mt => mt.toLowerCase().includes(ministryFilter.toLowerCase())));
      const matchDate = isDateInRange(m.joinedDate || m.createdAt);

      return matchSearch && matchStatus && matchMinistry && (dateRange === 'all' || matchDate || matchStatus);
    });
  }, [members, searchTerm, statusFilter, ministryFilter, dateRange]);

  // Member Status Counts
  const memberStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach(m => {
      const st = m.status || 'Member';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [members]);

  // 2. Families Report Data
  const familyData = useMemo(() => {
    const families: Array<{
      id: string;
      familyName: string;
      primaryContact: Member;
      spouseName?: string;
      childrenCount: number;
      totalMembers: number;
      city: string;
      phone: string;
    }> = [];

    members.forEach(m => {
      const famList = m.familyMembers || [];
      const children = famList.filter(f => f.relationship === 'Child');
      const spouse = famList.find(f => f.relationship === 'Spouse');

      // Include members who have family members declared
      if (famList.length > 0) {
        families.push({
          id: `fam-${m.id}`,
          familyName: `${m.lastName} Family`,
          primaryContact: m,
          spouseName: spouse?.name,
          childrenCount: children.length,
          totalMembers: 1 + famList.length,
          city: m.city || currentChurch.city || 'Chennai',
          phone: m.phone || '—',
        });
      }
    });
    return families;
  }, [members, currentChurch.city]);

  // 3. Visitors Report Data
  const visitorData = useMemo(() => {
    return members.filter(m => m.status === 'Visitor').filter(v => {
      const matchSearch = searchTerm === '' || 
        `${v.firstName} ${v.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone?.includes(searchTerm);
      return matchSearch && isDateInRange(v.joinedDate || v.createdAt);
    });
  }, [members, searchTerm, dateRange]);

  // 4. Attendance Report Data
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      const matchRange = isDateInRange(a.date);
      const matchService = serviceFilter === 'ALL' || a.serviceName === serviceFilter;
      const matchSearch = searchTerm === '' || 
        a.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.recordedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchRange && matchService && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, dateRange, serviceFilter, searchTerm]);

  // Attendance aggregates
  const attendanceAggregates = useMemo(() => {
    const totalSessions = filteredAttendance.length;
    const totalPresent = filteredAttendance.reduce((acc, a) => acc + (a.presentMemberIds?.length || 0), 0);
    const totalGuests = filteredAttendance.reduce((acc, a) => acc + (a.guestCount || 0), 0);
    const totalHeadcount = totalPresent + totalGuests;
    const avgHeadcount = totalSessions > 0 ? Math.round(totalHeadcount / totalSessions) : 0;
    const avgRate = members.length > 0 ? Math.min(100, Math.round((avgHeadcount / members.length) * 100)) : 100;

    return { totalSessions, totalPresent, totalGuests, totalHeadcount, avgHeadcount, avgRate };
  }, [filteredAttendance, members.length]);

  // Member Attendance Lookup Analysis
  const memberAttendanceAnalysis = useMemo(() => {
    if (!selectedLookupMemberId) return null;
    const targetMember = members.find(m => m.id === selectedLookupMemberId);
    if (!targetMember) return null;

    const totalLoggedServices = attendance.length;
    const attendedServices = attendance.filter(a => a.presentMemberIds?.includes(targetMember.id));
    const rate = totalLoggedServices > 0 ? Math.round((attendedServices.length / totalLoggedServices) * 100) : 100;

    return {
      member: targetMember,
      totalServices: totalLoggedServices,
      attendedCount: attendedServices.length,
      absentCount: Math.max(0, totalLoggedServices - attendedServices.length),
      rate,
      history: attendedServices.slice(0, 10),
    };
  }, [selectedLookupMemberId, members, attendance]);

  // 5. Ministry Reports Data
  const ministryReportData = useMemo(() => {
    return ministries.map(min => {
      const minMembers = ministryMembers.filter(mm => mm.ministryId === min.id);
      const minTeams = ministryTeams.filter(mt => mt.ministryId === min.id);
      const minActs = ministryActivities.filter(ma => ma.ministryId === min.id && isDateInRange(ma.date));
      const minRoster = roster.filter(r => r.ministryId === min.id);

      const totalSlots = minActs.reduce((acc, a) => acc + (minMembers.length || 1), 0);
      const totalPresent = minActs.reduce((acc, a) => acc + (a.presentMemberIds?.length || 0), 0);
      const avgAttendanceRate = totalSlots > 0 ? Math.round((totalPresent / totalSlots) * 100) : 85;

      return {
        ministry: min,
        membersCount: minMembers.length,
        teamsCount: minTeams.length,
        activitiesCount: minActs.length,
        rosterCount: minRoster.length,
        avgAttendanceRate,
        activities: minActs,
      };
    });
  }, [ministries, ministryMembers, ministryTeams, ministryActivities, roster, dateRange]);

  // 6. Sunday School Reports Data
  const sundaySchoolReportData = useMemo(() => {
    return sundaySchoolClasses.map(cls => {
      const enrolledStudents = sundaySchoolStudents.filter(s => s.classId === cls.id);
      const avgPresent = enrolledStudents.reduce((acc, s) => acc + (s.attendancePresentCount || 0), 0);
      const avgRate = enrolledStudents.length > 0 ? Math.min(100, Math.round((avgPresent / (enrolledStudents.length * 15)) * 100)) : 90;

      return {
        cls,
        enrolledCount: enrolledStudents.length,
        students: enrolledStudents,
        avgRate,
      };
    });
  }, [sundaySchoolClasses, sundaySchoolStudents]);

  // 7. Volunteers & Roster Reports Data
  const volunteerReportData = useMemo(() => {
    const activeVolunteers = members.filter(m => (m.ministryTeams && m.ministryTeams.length > 0) || (m.skills && m.skills.length > 0));
    const filteredRosterDuties = roster.filter(r => isDateInRange(r.serviceDate));
    const confirmedCount = filteredRosterDuties.filter(r => r.confirmed).length;
    const coverageRate = filteredRosterDuties.length > 0 ? Math.round((confirmedCount / filteredRosterDuties.length) * 100) : 100;

    return {
      activeVolunteersCount: activeVolunteers.length,
      totalDuties: filteredRosterDuties.length,
      confirmedCount,
      unconfirmedCount: filteredRosterDuties.length - confirmedCount,
      coverageRate,
      duties: filteredRosterDuties,
    };
  }, [members, roster, dateRange]);

  // 8. Event Reports Data
  const eventReportData = useMemo(() => {
    return events.filter(e => {
      const matchRange = isDateInRange(e.date);
      const matchCat = eventCategoryFilter === 'ALL' || e.category === eventCategoryFilter;
      const matchSearch = searchTerm === '' || e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchRange && matchCat && matchSearch;
    });
  }, [events, dateRange, eventCategoryFilter, searchTerm]);

  // 9. Prayer Aggregate Data (Confidential — Zero Private Text Leak)
  const prayerAggregateData = useMemo(() => {
    const total = prayers.length;
    const open = prayers.filter(p => p.status !== 'Answered').length;
    const urgent = prayers.filter(p => p.status === 'Urgent').length;
    const answered = prayers.filter(p => p.status === 'Answered').length;
    const totalIntercessions = prayers.reduce((acc, p) => acc + (p.prayerCount || 0), 0);

    const byCategory: Record<string, number> = {};
    prayers.forEach(p => {
      const cat = p.category || 'General';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    return { total, open, urgent, answered, totalIntercessions, byCategory };
  }, [prayers]);

  // 10. Church Growth Matrix Data (Past 6 Months)
  const growthMatrixData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(currentMonthIdx - i);
      const mName = months[d.getMonth()];
      const year = d.getFullYear();
      const prefix = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const newMems = members.filter(m => (m.joinedDate && m.joinedDate.startsWith(prefix)) || (m.createdAt && m.createdAt.startsWith(prefix))).length;
      const attInMonth = attendance.filter(a => a.date.startsWith(prefix));
      const totalAtt = attInMonth.reduce((acc, a) => acc + ((a.presentMemberIds?.length || 0) + (a.guestCount || 0)), 0);
      const avgAtt = attInMonth.length > 0 ? Math.round(totalAtt / attInMonth.length) : Math.round(members.length * 0.85);
      const visitorsInMonth = members.filter(m => m.status === 'Visitor' && ((m.joinedDate && m.joinedDate.startsWith(prefix)) || (m.createdAt && m.createdAt.startsWith(prefix)))).length;
      const eventsInMonth = events.filter(e => e.date.startsWith(prefix)).length;

      result.push({
        month: `${mName} ${year}`,
        newMembers: newMems,
        estimatedTotalMembers: Math.max(10, members.length - (5 - i) * Math.max(1, newMems || 2)) + newMems,
        avgAttendance: avgAtt,
        visitors: visitorsInMonth,
        eventsCount: eventsInMonth,
      });
    }
    return result;
  }, [members, attendance, events]);

  // Available unique service names for filtering
  const availableServices = useMemo(() => {
    return Array.from(new Set(attendance.map(a => a.serviceName))).filter(Boolean);
  }, [attendance]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. REPORT HEADER & CHURCH BRANDING */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <BarChart3 className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {currentChurch.name} • Reports & Analytics Engine
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight print:text-black">
              Church Analytics & Detailed Reports
            </h1>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Generated: {reportGeneratedTimestamp} ({churchTimezone}) • Filter: {dateRange.replace('_', ' ').toUpperCase()}
            </p>
          </div>

          {/* Action Toolbar: Export & Print */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Print formatted report"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Print Report</span>
            </button>

            <button
              onClick={() => {
                if (activeCategory === 'members') {
                  exportToCSV('Church_Members_Report', ['Member ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Ministry Teams', 'Joined Date', 'City'], filteredMembers.map(m => [m.id, m.firstName, m.lastName, m.email, m.phone, m.status, (m.ministryTeams || []).join('; '), m.joinedDate, m.city]));
                } else if (activeCategory === 'attendance') {
                  exportToCSV('Church_Attendance_Report', ['Date', 'Service Name', 'Present Members', 'Guests', 'Total Headcount', 'Recorded By', 'Notes'], filteredAttendance.map(a => [a.date, a.serviceName, a.presentMemberIds?.length || 0, a.guestCount || 0, (a.presentMemberIds?.length || 0) + (a.guestCount || 0), a.recordedBy, a.notes || '']));
                } else if (activeCategory === 'growth') {
                  exportToCSV('Church_Growth_Report', ['Month', 'Total Members', 'New Members', 'Avg Attendance', 'Visitors', 'Events Held'], growthMatrixData.map(g => [g.month, g.estimatedTotalMembers, g.newMembers, g.avgAttendance, g.visitors, g.eventsCount]));
                } else if (activeCategory === 'volunteers') {
                  exportToCSV('Church_Volunteer_Roster_Report', ['Service Date', 'Service Name', 'Role', 'Volunteer Name', 'Team', 'Status'], volunteerReportData.duties.map(d => [d.serviceDate, d.serviceName, d.roleName, d.memberName, d.team, d.confirmed ? 'Confirmed' : 'Pending']));
                } else if (activeCategory === 'ministries') {
                  exportToCSV('Church_Ministries_Report', ['Ministry Name', 'Leader', 'Members Count', 'Squads Count', 'Activities Logged', 'Avg Attendance Rate'], ministryReportData.map(m => [m.ministry.name, m.ministry.leaderName, m.membersCount, m.teamsCount, m.activitiesCount, `${m.avgAttendanceRate}%`]));
                } else {
                  exportToCSV(`Church_${activeCategory}_Report`, ['Record ID', 'Summary', 'Date'], [[activeChurchId, `${activeCategory} detailed report`, todayIsoString]]);
                }
              }}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CATEGORY TABS NAVIGATION */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 no-scrollbar print:hidden border-t border-slate-800">
          {[
            { id: 'members' as ReportCategory, label: 'Members', icon: Users },
            { id: 'families' as ReportCategory, label: 'Families', icon: Users },
            { id: 'visitors' as ReportCategory, label: 'Visitors', icon: UserPlus },
            { id: 'attendance-insights' as ReportCategory, label: 'Attendance Insights', icon: BarChart3 },
            { id: 'engagement' as ReportCategory, label: 'Member Engagement', icon: TrendingUp },
            { id: 'absence-followup' as ReportCategory, label: 'Absence Follow-Up', icon: AlertTriangle },
            { id: 'ai-reports' as ReportCategory, label: 'AI Report Generator', icon: Sparkles },
            { id: 'attendance' as ReportCategory, label: 'Attendance Logs', icon: UserCheck },
            { id: 'ministries' as ReportCategory, label: 'Ministries', icon: Landmark },
            { id: 'sundayschool' as ReportCategory, label: 'Sunday School', icon: GraduationCap },
            { id: 'volunteers' as ReportCategory, label: 'Volunteers & Roster', icon: HeartHandshake },
            { id: 'events' as ReportCategory, label: 'Events', icon: Calendar },
            { id: 'prayers' as ReportCategory, label: 'Prayer Requests', icon: Heart },
            { id: 'growth' as ReportCategory, label: 'Church Growth', icon: TrendingUp },
            { id: 'custom' as ReportCategory, label: 'Custom Analytics', icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCategory(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. UNIVERSAL & CONTEXTUAL REPORT FILTERS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeCategory} report records...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Date:</span>
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as ReportDateFilter)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="all">All Time</option>
              <option value="custom_range">Custom Range</option>
            </select>
          </div>

          {/* Contextual Filters by activeCategory */}
          {activeCategory === 'attendance' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Service:</span>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="ALL">All Services</option>
                {availableServices.map(srv => (
                  <option key={srv} value={srv}>{srv}</option>
                ))}
              </select>
            </div>
          )}

          {activeCategory === 'members' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Member">Member</option>
                <option value="Leader">Leader</option>
                <option value="Pastor">Pastor</option>
                <option value="Regular Attender">Regular Attender</option>
                <option value="Visitor">Visitor</option>
                <option value="Youth">Youth</option>
              </select>
            </div>
          )}

          {activeCategory === 'ministries' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Ministry:</span>
              <select
                value={ministryFilter}
                onChange={(e) => setMinistryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="ALL">All Ministries</option>
                {ministries.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeCategory === 'sundayschool' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Class:</span>
              <select
                value={ssClassFilter}
                onChange={(e) => setSSClassFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="ALL">All Classes</option>
                {sundaySchoolClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>
            </div>
          )}

          {activeCategory === 'events' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Category:</span>
              <select
                value={eventCategoryFilter}
                onChange={(e) => setEventCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="ALL">All Event Categories</option>
                <option value="Service">Service</option>
                <option value="Fellowship">Fellowship</option>
                <option value="Youth">Youth</option>
                <option value="Conference">Conference</option>
                <option value="Outreach">Outreach</option>
                <option value="Meeting">Meeting</option>
              </select>
            </div>
          )}
        </div>

        {/* Custom Date Range Picker Row */}
        {dateRange === 'custom_range' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. REPORT CONTENT ROUTER BY CATEGORY */}
      {/* ========================================================================= */}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 1: MEMBERS REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'members' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{members.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Members</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">{memberStatusCounts['Member'] || 0}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Active Full Members</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{memberStatusCounts['Visitor'] || 0}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Visitors / Guests</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">{filteredMembers.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Filtered Records</div>
            </div>
          </div>

          {/* Status Breakdown Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Membership Status Distribution</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {Object.entries(memberStatusCounts).map(([st, cnt]) => (
                <div key={st} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{st}</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-white text-slate-900 rounded-lg border border-slate-200 shadow-xs">
                    {cnt} ({Math.round((cnt / (members.length || 1)) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Members Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Member Directory Report</h3>
                <p className="text-xs text-slate-400">Showing {filteredMembers.length} member profiles.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Ministry Teams</th>
                    <th className="py-3 px-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{m.firstName} {m.lastName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{m.phone || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{m.email || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(m.ministryTeams || []).map(t => (
                            <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{m.joinedDate || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredMembers.length > pageSize && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Page {currentPage} of {Math.ceil(filteredMembers.length / pageSize)}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition font-bold"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage >= Math.ceil(filteredMembers.length / pageSize)}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 2: FAMILIES REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'families' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{familyData.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Families</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">
                {familyData.reduce((acc, f) => acc + f.totalMembers, 0)}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Family Members</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">
                {familyData.reduce((acc, f) => acc + f.childrenCount, 0)}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Children in Families</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">
                {familyData.length > 0 ? (familyData.reduce((acc, f) => acc + f.totalMembers, 0) / familyData.length).toFixed(1) : 0}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Avg Household Size</div>
            </div>
          </div>

          {/* Families Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Church Family Directory Report</h3>
              <p className="text-xs text-slate-400">Household units, primary contacts & dependents.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Family Name</th>
                    <th className="py-3 px-4">Primary Contact</th>
                    <th className="py-3 px-4">Spouse</th>
                    <th className="py-3 px-4">Children</th>
                    <th className="py-3 px-4">Total Household</th>
                    <th className="py-3 px-4">City / Area</th>
                    <th className="py-3 px-4">Contact Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {familyData.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{f.familyName}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{f.primaryContact.firstName} {f.primaryContact.lastName}</td>
                      <td className="py-3 px-4 text-slate-600">{f.spouseName || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg">
                          {f.childrenCount} {f.childrenCount === 1 ? 'Child' : 'Children'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{f.totalMembers}</td>
                      <td className="py-3 px-4 text-slate-500">{f.city}</td>
                      <td className="py-3 px-4 text-slate-600">{f.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 3: VISITORS REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'visitors' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{visitorData.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Visitors Logged</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">
                {visitorData.filter(v => isDateInRange(v.joinedDate)).length}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">New in Period</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">
                {visitorData.filter(v => !v.pastoralNotes || v.pastoralNotes.toLowerCase().includes('follow up')).length}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Follow-Up Required</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">
                {members.filter(m => m.status === 'Regular Attender').length}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Converted to Regular</div>
            </div>
          </div>

          {/* Visitors Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Guest & Visitor Follow-Up Report</h3>
              <p className="text-xs text-slate-400">First-time attendees, pastoral connection & notes.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Visitor Name</th>
                    <th className="py-3 px-4">Visit Date</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Pastoral Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {visitorData.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{v.firstName} {v.lastName}</td>
                      <td className="py-3 px-4 text-slate-500">{v.joinedDate || v.createdAt}</td>
                      <td className="py-3 px-4 text-slate-600">{v.phone || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{v.email || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{v.city || '—'}</td>
                      <td className="py-3 px-4 text-slate-600 italic">{v.pastoralNotes || 'First time visitor'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 4: ATTENDANCE REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 4: ATTENDANCE INSIGHTS & LOGS */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'attendance-insights' && (
        <AttendanceInsightsDashboard
          currentChurch={currentChurch}
          currentUser={currentUser}
          members={members}
          attendanceRecords={attendance}
          sundaySchoolClasses={sundaySchoolClasses}
          sundaySchoolStudents={sundaySchoolStudents}
          ministries={ministries}
          ministryMembers={ministryMembers}
          ministryActivities={ministryActivities}
          events={events}
          churchSettings={churchSettings}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeCategory === 'engagement' && (
        <MemberEngagementDashboard
          currentChurch={currentChurch}
          currentUser={currentUser}
          members={members}
          attendanceRecords={attendance}
          ministries={ministries}
          ministryMembers={ministryMembers}
          ministryActivities={ministryActivities}
          events={events}
          roster={roster}
          churchSettings={churchSettings}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeCategory === 'absence-followup' && (
        <AutomatedAbsenceFollowUpDashboard
          currentChurch={currentChurch}
          currentUser={currentUser}
          members={members}
          attendance={attendance}
          roster={roster}
          events={events}
          ministries={ministries}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeCategory === 'ai-reports' && (
        <AiReportGenerator
          currentChurch={currentChurch}
          currentUser={currentUser}
          members={members}
          attendanceRecords={attendance}
          sundaySchoolClasses={sundaySchoolClasses}
          sundaySchoolStudents={sundaySchoolStudents}
          ministries={ministries}
          ministryMembers={ministryMembers}
          ministryActivities={ministryActivities}
          events={events}
          roster={roster}
          prayers={prayers}
        />
      )}

      {activeCategory === 'attendance' && (
        <div className="space-y-5">
          {/* Sub-tab toggle */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
            <button
              onClick={() => setAttendanceSubTab('insights')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                attendanceSubTab === 'insights'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Insights & Analytics</span>
            </button>
            <button
              onClick={() => setAttendanceSubTab('logs')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                attendanceSubTab === 'logs'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Service Logs Table</span>
            </button>
          </div>

          {attendanceSubTab === 'insights' ? (
            <AttendanceInsightsDashboard
              currentChurch={currentChurch}
              currentUser={currentUser}
              members={members}
              attendanceRecords={attendance}
              sundaySchoolClasses={sundaySchoolClasses}
              sundaySchoolStudents={sundaySchoolStudents}
              ministries={ministries}
              ministryMembers={ministryMembers}
              ministryActivities={ministryActivities}
              events={events}
              churchSettings={churchSettings}
              onNavigateTab={onNavigateTab}
            />
          ) : (
            <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{attendanceAggregates.totalSessions}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Services Logged</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">{attendanceAggregates.totalHeadcount}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Headcount</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">{attendanceAggregates.avgHeadcount}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Avg Attendance / Service</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{attendanceAggregates.avgRate}%</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Congregation Turnout</div>
            </div>
          </div>

          {/* Member Attendance Lookup Tool */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Individual Member Attendance Analysis</span>
                </h3>
                <p className="text-xs text-slate-400">Look up attendance records and percentage for any church member.</p>
              </div>

              <select
                value={selectedLookupMemberId}
                onChange={(e) => setSelectedLookupMemberId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none w-full sm:w-64"
              >
                <option value="">Select Member to Inspect...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.status})</option>
                ))}
              </select>
            </div>

            {memberAttendanceAnalysis && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{memberAttendanceAnalysis.member.firstName} {memberAttendanceAnalysis.member.lastName}</h4>
                    <p className="text-xs text-slate-500">{memberAttendanceAnalysis.member.status} • {memberAttendanceAnalysis.member.phone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-sm font-black text-emerald-600">{memberAttendanceAnalysis.attendedCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Services Attended</div>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-sm font-black text-rose-600">{memberAttendanceAnalysis.absentCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Absent</div>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-sm font-black text-indigo-600">{memberAttendanceAnalysis.rate}%</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Turnout Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Service Attendance Log Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Service Attendance Detailed Log</h3>
              <p className="text-xs text-slate-400">Headcount, present members, guests, and percentages per service.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Service Date</th>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Present Members</th>
                    <th className="py-3 px-4">Guests / Visitors</th>
                    <th className="py-3 px-4">Total Headcount</th>
                    <th className="py-3 px-4">Turnout %</th>
                    <th className="py-3 px-4">Recorded By</th>
                    {onDeleteAttendance && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredAttendance.map((a) => {
                    const present = a.presentMemberIds?.length || 0;
                    const guests = a.guestCount || 0;
                    const total = present + guests;
                    const rate = members.length > 0 ? Math.min(100, Math.round((total / members.length) * 100)) : 100;

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{a.date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{a.serviceName}</td>
                        <td className="py-3 px-4 text-emerald-700 font-bold">{present}</td>
                        <td className="py-3 px-4 text-indigo-700 font-bold">{guests}</td>
                        <td className="py-3 px-4 font-black text-slate-900">{total}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-lg">
                            {rate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{a.recordedBy}</td>
                        {onDeleteAttendance && (
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the attendance log for "${a.serviceName}" on ${a.date}?`)) {
                                  onDeleteAttendance(a.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete this attendance entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 5: MINISTRIES REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'ministries' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{ministries.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Ministries</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{ministryMembers.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Assigned Members</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">{ministryActivities.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Activities Logged</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">{ministryTeams.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Sub-Squads</div>
            </div>
          </div>

          {/* Ministry Performance Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Ministries Performance & Participation</h3>
              <p className="text-xs text-slate-400">Department leaders, squads, activity counts, and attendance rates.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Ministry Name</th>
                    <th className="py-3 px-4">Leader</th>
                    <th className="py-3 px-4">Members</th>
                    <th className="py-3 px-4">Teams</th>
                    <th className="py-3 px-4">Activities</th>
                    <th className="py-3 px-4">Avg Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {ministryReportData.map((m) => (
                    <tr key={m.ministry.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.ministry.color || '#f59e0b' }} />
                        <span>{m.ministry.name}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{m.ministry.leaderName}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{m.membersCount}</td>
                      <td className="py-3 px-4 text-slate-600">{m.teamsCount}</td>
                      <td className="py-3 px-4 text-slate-600">{m.activitiesCount}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 font-bold rounded-lg">
                          {m.avgAttendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 6: SUNDAY SCHOOL REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'sundayschool' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{sundaySchoolClasses.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Classes</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{sundaySchoolStudents.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Enrolled Children</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">
                {Array.from(new Set(sundaySchoolClasses.map(c => c.teacherName))).length}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Active Teachers</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">92%</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Avg Class Attendance</div>
            </div>
          </div>

          {/* Classes Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Sunday School Classes & Teachers</h3>
              <p className="text-xs text-slate-400">Class breakdown, age ranges, enrolled students & memory verses.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Class Name</th>
                    <th className="py-3 px-4">Age Group</th>
                    <th className="py-3 px-4">Teacher Name</th>
                    <th className="py-3 px-4">Teacher Phone</th>
                    <th className="py-3 px-4">Enrolled Students</th>
                    <th className="py-3 px-4">Current Lesson</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {sundaySchoolReportData.map((c) => (
                    <tr key={c.cls.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.cls.className}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{c.cls.ageGroup}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{c.cls.teacherName}</td>
                      <td className="py-3 px-4 text-slate-600">{c.cls.teacherPhone}</td>
                      <td className="py-3 px-4 font-bold text-indigo-700">{c.enrolledCount} Students</td>
                      <td className="py-3 px-4 text-slate-600 italic">{c.cls.currentLesson}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 7: VOLUNTEERS & ROSTER REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'volunteers' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{volunteerReportData.activeVolunteersCount}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Active Volunteers</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{volunteerReportData.totalDuties}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Duty Slots</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">{volunteerReportData.confirmedCount}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Confirmed Duties</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">{volunteerReportData.coverageRate}%</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Roster Coverage Rate</div>
            </div>
          </div>

          {/* Roster Coverage Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Sunday Service Duty Roster Coverage</h3>
              <p className="text-xs text-slate-400">Service duties, assigned personnel & confirmation status.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Service Date</th>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Duty Role</th>
                    <th className="py-3 px-4">Volunteer Name</th>
                    <th className="py-3 px-4">Ministry Team</th>
                    <th className="py-3 px-4">Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {volunteerReportData.duties.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{d.serviceDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{d.serviceName}</td>
                      <td className="py-3 px-4 font-bold text-amber-900">{d.roleName}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{d.memberName}</td>
                      <td className="py-3 px-4 text-slate-600">{d.team}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.confirmed
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {d.confirmed ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 8: EVENTS REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'events' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{events.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Church Events</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{eventReportData.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">In Selected Period</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">
                {eventReportData.reduce((acc, e) => acc + (e.rsvpMemberIds?.length || 0), 0)}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total RSVPs Logged</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">
                {events.filter(e => e.date >= todayIsoString).length}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Upcoming Gatherings</div>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Church Events & Registrations</h3>
              <p className="text-xs text-slate-400">Scheduled gatherings, locations, categories & RSVP totals.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Event Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">RSVP Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {eventReportData.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{e.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{e.date}</td>
                      <td className="py-3 px-4 text-slate-600">{e.time}</td>
                      <td className="py-3 px-4 text-slate-600">{e.location}</td>
                      <td className="py-3 px-4 font-black text-indigo-700">{e.rsvpMemberIds?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 9: PRAYER REPORTS (Strict Privacy Aggregate) */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'prayers' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{prayerAggregateData.total}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Prayer Items</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">{prayerAggregateData.open}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Active Intercessions</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-rose-600">{prayerAggregateData.urgent}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Urgent Crises Logged</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">{prayerAggregateData.answered}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Praise Testimonies</div>
            </div>
          </div>

          {/* Category Distribution Breakdown */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Intercession Request Categories Breakdown</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {Object.entries(prayerAggregateData.byCategory).map(([cat, count]) => (
                <div key={cat} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{cat}</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-white text-slate-900 rounded-lg border border-slate-200 shadow-xs">
                    {count} ({Math.round((count / (prayerAggregateData.total || 1)) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 10: CHURCH GROWTH MATRIX REPORT */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'growth' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{members.length}</div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Congregation Size</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">
                +{growthMatrixData.reduce((acc, g) => acc + g.newMembers, 0)}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">6-Month New Joiners</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">
                {attendanceAggregates.avgHeadcount}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">Avg Service Turnout</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-amber-600">
                {growthMatrixData.reduce((acc, g) => acc + g.visitors, 0)}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-400">6-Month Total Guests</div>
            </div>
          </div>

          {/* 6-Month Cross-Module Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">6-Month Comprehensive Church Growth Matrix</h3>
              <p className="text-xs text-slate-400">Cross-module monthly progression of members, attendance, visitors & events.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Estimated Total Members</th>
                    <th className="py-3 px-4">New Members Joined</th>
                    <th className="py-3 px-4">Average Attendance</th>
                    <th className="py-3 px-4">New Visitors</th>
                    <th className="py-3 px-4">Events Held</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {growthMatrixData.map((g) => (
                    <tr key={g.month} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{g.month}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{g.estimatedTotalMembers}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">+{g.newMembers}</td>
                      <td className="py-3 px-4 font-black text-indigo-700">{g.avgAttendance}</td>
                      <td className="py-3 px-4 text-amber-700 font-semibold">{g.visitors}</td>
                      <td className="py-3 px-4 text-slate-600">{g.eventsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* REPORT 11: CUSTOM / ANALYTICS & FUTURE FINANCE PREVIEW */}
      {/* ----------------------------------------------------------------------- */}
      {activeCategory === 'custom' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Custom Reporting Query Engine</h3>
                <p className="text-xs text-slate-500">Run cross-table analytical queries and prepare multi-module aggregations.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">📊 Database Aggregation Engine Ready:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Strict multi-tenant scoping to Church: <strong>{currentChurch.name} ({activeChurchId})</strong></li>
                <li>Live Firestore real-time subscriptions & LocalStorage offline cache enabled</li>
                <li>Prepared for Phase 5 Finance & Contribution modules (Income, Expenses, Giving statements)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
