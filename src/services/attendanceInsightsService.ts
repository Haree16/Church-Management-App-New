import { 
  AttendanceRecord, SundaySchoolAttendanceRecord, SundaySchoolClass, 
  SundaySchoolStudent, ChurchMinistry, MinistryMember, MinistryActivity, 
  ChurchEvent, Member, SaaSUser 
} from '../types';
import { canAccessAllChurchReports } from '../utils/rbac';
import { getUserAssignedMinistries } from '../utils/ministryPermissions';

export type InsightsDateFilter = 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'this_year' 
  | 'last_year' 
  | 'custom_range';

export type ServiceTypeFilter = 
  | 'ALL' 
  | 'Sunday Service' 
  | 'Prayer Meeting' 
  | 'Sunday School' 
  | 'Ministry' 
  | 'Event';

export interface DateRangeResult {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  formattedRangeText: string; // e.g. "September 1–30, 2026"
}

export interface AttendanceMetrics {
  totalServices: number;
  totalHeadcount: number;
  averageAttendance: number;
  highestRecord: { count: number; date: string; serviceName: string } | null;
  lowestRecord: { count: number; date: string; serviceName: string } | null;
  sundaySchoolAvg: number;
  ministryAttendanceAvg: number;
  eventsAvg: number;
}

export interface PeriodComparisonResult {
  currentPeriodLabel: string;
  currentAvg: number;
  currentTotal: number;
  previousPeriodLabel: string;
  previousAvg: number;
  previousTotal: number;
  differenceCount: number;
  percentageChange: number;
  factualComparisonText: string;
}

export interface TrendPoint {
  id: string;
  date: string;
  label: string;
  serviceName: string;
  total: number;
  members: number;
  guests: number;
}

export interface MinistryAttendanceStat {
  ministryId: string;
  ministryName: string;
  totalMembers: number;
  activitiesCount: number;
  averageAttendance: number;
  attendanceRate: number;
  isUserAuthorizedLeader: boolean;
}

export interface SundaySchoolClassStat {
  classId: string;
  className: string;
  teacherName: string;
  enrolledStudentsCount: number;
  sessionsCount: number;
  averageAttendance: number;
  highestAttendance: number;
  lowestAttendance: number;
}

export interface MemberAttendanceHistoryItem {
  date: string;
  serviceName: string;
  wasPresent: boolean;
}

export interface MemberAttendanceLookupResult {
  member: Member;
  totalServicesLogged: number;
  attendedCount: number;
  absentCount: number;
  turnoutPercentage: number;
  history: MemberAttendanceHistoryItem[];
}

export interface AttendanceInsightsData {
  dateRange: DateRangeResult;
  userRole: string;
  canAccessChurchWide: boolean;
  authorizedMinistries: ChurchMinistry[];
  metrics: AttendanceMetrics;
  comparison: PeriodComparisonResult;
  trend: TrendPoint[];
  ministryStats: MinistryAttendanceStat[];
  sundaySchoolStats: SundaySchoolClassStat[];
  factualInsightsText: string[];
}

/**
 * 1. Helper: Resolve Date Filter to YYYY-MM-DD bounds
 */
export function resolveInsightsDateRange(
  filter: InsightsDateFilter, 
  customStart?: string, 
  customEnd?: string,
  nowDate = new Date()
): DateRangeResult {
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];
  const formatMonthName = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (filter === 'custom_range' && customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    return {
      startDate: customStart,
      endDate: customEnd,
      formattedRangeText: `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
  }

  const year = nowDate.getFullYear();
  const month = nowDate.getMonth();

  if (filter === 'this_week') {
    const dayOfWeek = nowDate.getDay();
    const sunday = new Date(nowDate);
    sunday.setDate(nowDate.getDate() - dayOfWeek);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    return {
      startDate: formatYMD(sunday),
      endDate: formatYMD(saturday),
      formattedRangeText: `This Week (${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
    };
  }

  if (filter === 'last_week') {
    const dayOfWeek = nowDate.getDay();
    const lastSunday = new Date(nowDate);
    lastSunday.setDate(nowDate.getDate() - dayOfWeek - 7);
    const lastSaturday = new Date(lastSunday);
    lastSaturday.setDate(lastSunday.getDate() + 6);
    return {
      startDate: formatYMD(lastSunday),
      endDate: formatYMD(lastSaturday),
      formattedRangeText: `Last Week (${lastSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastSaturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
    };
  }

  if (filter === 'last_month') {
    const lastMonthObj = new Date(year, month - 1, 1);
    const lastMonthEnd = new Date(year, month, 0);
    return {
      startDate: formatYMD(lastMonthObj),
      endDate: formatYMD(lastMonthEnd),
      formattedRangeText: formatMonthName(lastMonthObj)
    };
  }

  if (filter === 'this_year') {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    return {
      startDate: formatYMD(yearStart),
      endDate: formatYMD(yearEnd),
      formattedRangeText: `Year ${year}`
    };
  }

  if (filter === 'last_year') {
    const prevYear = year - 1;
    const yearStart = new Date(prevYear, 0, 1);
    const yearEnd = new Date(prevYear, 11, 31);
    return {
      startDate: formatYMD(yearStart),
      endDate: formatYMD(yearEnd),
      formattedRangeText: `Year ${prevYear}`
    };
  }

  // Default: 'this_month'
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  return {
    startDate: formatYMD(monthStart),
    endDate: formatYMD(monthEnd),
    formattedRangeText: formatMonthName(monthStart)
  };
}

/**
 * Helper: Resolve Previous Equivalent Date Range for Comparison
 */
export function getPreviousEquivalentDateRange(current: DateRangeResult): DateRangeResult {
  const start = new Date(current.startDate);
  const end = new Date(current.endDate);
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

  const prevEnd = new Date(start);
  prevEnd.setDate(start.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - durationDays + 1);

  const formatYMD = (d: Date) => d.toISOString().split('T')[0];
  return {
    startDate: formatYMD(prevStart),
    endDate: formatYMD(prevEnd),
    formattedRangeText: `${prevStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${prevEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  };
}

/**
 * 2. Main Calculation & Permission Enforcement Function
 */
export function calculateAttendanceInsights(params: {
  currentChurchId: string;
  currentUser?: SaaSUser | null;
  members: Member[];
  attendanceRecords: AttendanceRecord[];
  sundaySchoolRecords?: SundaySchoolAttendanceRecord[];
  sundaySchoolClasses?: SundaySchoolClass[];
  sundaySchoolStudents?: SundaySchoolStudent[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  ministryActivities: MinistryActivity[];
  events: ChurchEvent[];
  dateFilter: InsightsDateFilter;
  customStart?: string;
  customEnd?: string;
  serviceTypeFilter?: ServiceTypeFilter;
  targetMinistryId?: string;
}): AttendanceInsightsData {
  const {
    currentChurchId, currentUser, members = [], attendanceRecords = [],
    sundaySchoolRecords = [], sundaySchoolClasses = [], sundaySchoolStudents = [],
    ministries = [], ministryMembers = [], ministryActivities = [], events = [],
    dateFilter, customStart, customEnd, serviceTypeFilter = 'ALL', targetMinistryId
  } = params;

  const userRole = currentUser?.role || 'Member';
  const canAccessChurchWide = canAccessAllChurchReports(userRole);

  // Get ministries where current user is authorized as leader
  const userAssignedMins = getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  const authorizedMinistries = userAssignedMins.filter(m => m.isLeader).map(m => m.ministry);
  const isMinistryLeader = authorizedMinistries.length > 0;

  // Security check: Normal members with no leadership role cannot view church-wide insights
  if (!canAccessChurchWide && !isMinistryLeader) {
    return {
      dateRange: resolveInsightsDateRange(dateFilter, customStart, customEnd),
      userRole,
      canAccessChurchWide: false,
      authorizedMinistries: [],
      metrics: {
        totalServices: 0,
        totalHeadcount: 0,
        averageAttendance: 0,
        highestRecord: null,
        lowestRecord: null,
        sundaySchoolAvg: 0,
        ministryAttendanceAvg: 0,
        eventsAvg: 0
      },
      comparison: {
        currentPeriodLabel: '',
        currentAvg: 0,
        currentTotal: 0,
        previousPeriodLabel: '',
        previousAvg: 0,
        previousTotal: 0,
        differenceCount: 0,
        percentageChange: 0,
        factualComparisonText: 'Access denied.'
      },
      trend: [],
      ministryStats: [],
      sundaySchoolStats: [],
      factualInsightsText: ['Normal church members may view individual attendance under My Attendance.']
    };
  }

  // Filter Church-scoped Attendance Records
  const activeChurchId = currentChurchId || 'church-1';
  const churchAttendance = attendanceRecords.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);
  const churchSSRecords = sundaySchoolRecords.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);
  const churchMinActivities = ministryActivities.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);
  const churchEvents = events.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);

  // 1. Resolve Current Date Range
  const dateRange = resolveInsightsDateRange(dateFilter, customStart, customEnd);
  const prevDateRange = getPreviousEquivalentDateRange(dateRange);

  // Helper: Filter records by date range & service type
  const filterByRangeAndType = (records: AttendanceRecord[], range: DateRangeResult, stFilter: ServiceTypeFilter) => {
    return records.filter(rec => {
      if (rec.date < range.startDate || rec.date > range.endDate) return false;
      if (stFilter === 'ALL') return true;
      if (stFilter === 'Sunday Service') return rec.serviceName.toLowerCase().includes('sunday');
      if (stFilter === 'Prayer Meeting') return rec.serviceName.toLowerCase().includes('prayer') || rec.serviceName.toLowerCase().includes('wednesday');
      if (stFilter === 'Sunday School') return rec.serviceName.toLowerCase().includes('school');
      if (stFilter === 'Ministry') return rec.serviceName.toLowerCase().includes('ministry');
      if (stFilter === 'Event') return rec.serviceName.toLowerCase().includes('event');
      return true;
    });
  };

  const currentRecords = filterByRangeAndType(churchAttendance, dateRange, serviceTypeFilter);
  const previousRecords = filterByRangeAndType(churchAttendance, prevDateRange, serviceTypeFilter);

  // 2. Metrics Calculation (avoid double counting)
  let totalHeadcount = 0;
  let highestRecord: { count: number; date: string; serviceName: string } | null = null;
  let lowestRecord: { count: number; date: string; serviceName: string } | null = null;

  for (const rec of currentRecords) {
    const count = (rec.presentMemberIds?.length || 0) + (rec.guestCount || 0);
    totalHeadcount += count;

    if (!highestRecord || count > highestRecord.count) {
      highestRecord = { count, date: rec.date, serviceName: rec.serviceName };
    }
    if (!lowestRecord || count < lowestRecord.count) {
      lowestRecord = { count, date: rec.date, serviceName: rec.serviceName };
    }
  }

  const totalServices = currentRecords.length;
  const averageAttendance = totalServices > 0 ? Math.round(totalHeadcount / totalServices) : 0;

  // Sunday School Avg in date range
  const currentSSInPeriod = churchSSRecords.filter(r => r.date >= dateRange.startDate && r.date <= dateRange.endDate);
  let totalSSHeadcount = 0;
  currentSSInPeriod.forEach(r => {
    totalSSHeadcount += (r.presentStudentIds?.length || 0) + (r.guestCount || 0);
  });
  const sundaySchoolAvg = currentSSInPeriod.length > 0 ? Math.round(totalSSHeadcount / currentSSInPeriod.length) : 0;

  // Ministry Activity Avg in date range
  const currentMinInPeriod = churchMinActivities.filter(a => a.date >= dateRange.startDate && a.date <= dateRange.endDate && a.status === 'Completed');
  let totalMinHeadcount = 0;
  currentMinInPeriod.forEach(a => {
    totalMinHeadcount += (a.presentMemberIds?.length || 0);
  });
  const ministryAttendanceAvg = currentMinInPeriod.length > 0 ? Math.round(totalMinHeadcount / currentMinInPeriod.length) : 0;

  // Events Avg in date range
  const currentEventsInPeriod = churchEvents.filter(e => e.date >= dateRange.startDate && e.date <= dateRange.endDate);
  let totalEventRSVPs = 0;
  currentEventsInPeriod.forEach(e => {
    totalEventRSVPs += (e.rsvpMemberIds?.length || 0);
  });
  const eventsAvg = currentEventsInPeriod.length > 0 ? Math.round(totalEventRSVPs / currentEventsInPeriod.length) : 0;

  const metrics: AttendanceMetrics = {
    totalServices,
    totalHeadcount,
    averageAttendance,
    highestRecord,
    lowestRecord,
    sundaySchoolAvg,
    ministryAttendanceAvg,
    eventsAvg
  };

  // 3. Comparison with Previous Period
  let prevTotalHeadcount = 0;
  previousRecords.forEach(rec => {
    prevTotalHeadcount += (rec.presentMemberIds?.length || 0) + (rec.guestCount || 0);
  });
  const prevTotalServices = previousRecords.length;
  const previousAvg = prevTotalServices > 0 ? Math.round(prevTotalHeadcount / prevTotalServices) : 0;

  const differenceCount = averageAttendance - previousAvg;
  const percentageChange = previousAvg > 0 ? Math.round(((averageAttendance - previousAvg) / previousAvg) * 1000) / 10 : 0;

  const signStr = differenceCount >= 0 ? '+' : '';
  const factualComparisonText = previousAvg > 0 
    ? `Average attendance changed by ${signStr}${differenceCount} attendees (${signStr}${percentageChange}%) compared to ${prevDateRange.formattedRangeText}.`
    : `No previous period data available for comparison.`;

  const comparison: PeriodComparisonResult = {
    currentPeriodLabel: dateRange.formattedRangeText,
    currentAvg: averageAttendance,
    currentTotal: totalHeadcount,
    previousPeriodLabel: prevDateRange.formattedRangeText,
    previousAvg,
    previousTotal: prevTotalHeadcount,
    differenceCount,
    percentageChange,
    factualComparisonText
  };

  // 4. Trend Data Points
  const sortedCurrent = [...currentRecords].sort((a, b) => a.date.localeCompare(b.date));
  const trend: TrendPoint[] = sortedCurrent.map(rec => {
    const total = (rec.presentMemberIds?.length || 0) + (rec.guestCount || 0);
    const guests = rec.guestCount || 0;
    return {
      id: rec.id,
      date: rec.date,
      label: rec.date ? rec.date.substring(5) : 'N/A',
      serviceName: rec.serviceName,
      total,
      members: Math.max(0, total - guests),
      guests
    };
  });

  // 5. Ministry Attendance Stats (Filtered by Leader Authorization)
  const accessibleMinistries = canAccessChurchWide 
    ? ministries 
    : authorizedMinistries;

  const ministryStats: MinistryAttendanceStat[] = accessibleMinistries.map(min => {
    const minActivities = churchMinActivities.filter(a => a.ministryId === min.id && a.date >= dateRange.startDate && a.date <= dateRange.endDate);
    const totalMems = ministryMembers.filter(mm => mm.ministryId === min.id).length;

    let sumAtt = 0;
    minActivities.forEach(a => {
      sumAtt += (a.presentMemberIds?.length || 0);
    });
    const avgAtt = minActivities.length > 0 ? Math.round(sumAtt / minActivities.length) : 0;
    const rate = totalMems > 0 ? Math.round((avgAtt / totalMems) * 100) : 0;

    const isLeader = authorizedMinistries.some(m => m.id === min.id) || canAccessChurchWide;

    return {
      ministryId: min.id,
      ministryName: min.name,
      totalMembers: totalMems,
      activitiesCount: minActivities.length,
      averageAttendance: avgAtt,
      attendanceRate: Math.min(100, rate),
      isUserAuthorizedLeader: isLeader
    };
  });

  // 6. Sunday School Stats by Class
  const sundaySchoolStats: SundaySchoolClassStat[] = (sundaySchoolClasses || []).map(cls => {
    const classRecords = churchSSRecords.filter(r => r.classId === cls.id && r.date >= dateRange.startDate && r.date <= dateRange.endDate);
    const enrolled = (sundaySchoolStudents || []).filter(s => s.classId === cls.id).length;

    let sumClassAtt = 0;
    let highest = 0;
    let lowest = 9999;

    classRecords.forEach(r => {
      const cnt = (r.presentStudentIds?.length || 0) + (r.guestCount || 0);
      sumClassAtt += cnt;
      if (cnt > highest) highest = cnt;
      if (cnt < lowest) lowest = cnt;
    });

    const avg = classRecords.length > 0 ? Math.round(sumClassAtt / classRecords.length) : 0;

    return {
      classId: cls.id,
      className: cls.className,
      teacherName: cls.teacherName,
      enrolledStudentsCount: enrolled,
      sessionsCount: classRecords.length,
      averageAttendance: avg,
      highestAttendance: classRecords.length > 0 ? highest : 0,
      lowestAttendance: classRecords.length > 0 ? lowest : 0
    };
  });

  // 7. Generate Factual Bullet Points
  const factualInsightsText: string[] = [];
  if (totalServices > 0) {
    factualInsightsText.push(`Average service attendance for ${dateRange.formattedRangeText} is ${averageAttendance} attendees across ${totalServices} logged service session(s).`);
  } else {
    factualInsightsText.push(`No service attendance records are available for the selected period (${dateRange.formattedRangeText}).`);
  }

  if (highestRecord) {
    const h = highestRecord as { count: number; date: string; serviceName: string };
    factualInsightsText.push(`Highest attendance recorded was ${h.count} attendees on ${h.date} during "${h.serviceName}".`);
  }
  if (lowestRecord) {
    const l = lowestRecord as { count: number; date: string; serviceName: string };
    const h = highestRecord as { count: number; date: string; serviceName: string } | null;
    if (!h || l.date !== h.date) {
      factualInsightsText.push(`Lowest attendance recorded was ${l.count} attendees on ${l.date} during "${l.serviceName}".`);
    }
  }
  if (sundaySchoolAvg > 0) {
    factualInsightsText.push(`Sunday School attendance averaged ${sundaySchoolAvg} students per session during this period.`);
  }
  if (previousAvg > 0) {
    factualInsightsText.push(factualComparisonText);
  }

  return {
    dateRange,
    userRole,
    canAccessChurchWide,
    authorizedMinistries,
    metrics,
    comparison,
    trend,
    ministryStats,
    sundaySchoolStats,
    factualInsightsText
  };
}

/**
 * 3. Individual Member Attendance History Lookup (Pastor / Admin only)
 */
export function getMemberAttendanceHistory(params: {
  memberId: string;
  members: Member[];
  attendanceRecords: AttendanceRecord[];
  currentUser?: SaaSUser | null;
}): MemberAttendanceLookupResult | null {
  const { memberId, members = [], attendanceRecords = [], currentUser } = params;

  // Authorization check
  const userRole = currentUser?.role || 'Member';
  if (!canAccessAllChurchReports(userRole)) {
    return null;
  }

  const member = members.find(m => m.id === memberId);
  if (!member) return null;

  const sortedAttendance = [...attendanceRecords].sort((a, b) => b.date.localeCompare(a.date));
  let attendedCount = 0;

  const history: MemberAttendanceHistoryItem[] = sortedAttendance.map(rec => {
    const present = (rec.presentMemberIds || []).includes(memberId);
    if (present) attendedCount++;
    return {
      date: rec.date,
      serviceName: rec.serviceName,
      wasPresent: present
    };
  });

  const totalServicesLogged = attendanceRecords.length;
  const absentCount = totalServicesLogged - attendedCount;
  const turnoutPercentage = totalServicesLogged > 0 ? Math.round((attendedCount / totalServicesLogged) * 100) : 0;

  return {
    member,
    totalServicesLogged,
    attendedCount,
    absentCount,
    turnoutPercentage,
    history
  };
}
