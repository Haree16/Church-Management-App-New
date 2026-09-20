import { 
  Member, SaaSUser, AttendanceRecord, SundaySchoolAttendanceRecord, 
  ChurchMinistry, MinistryMember, MinistryActivity, ChurchEvent, 
  RosterAssignment 
} from '../types';
import { canAccessAllChurchReports } from '../utils/rbac';
import { getUserAssignedMinistries } from '../utils/ministryPermissions';

export type EngagementDateFilter = 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'last_30_days' 
  | 'last_90_days' 
  | 'this_year' 
  | 'custom_range';

export type EngagementActivityFilter = 
  | 'ALL' 
  | 'attendance' 
  | 'ministry' 
  | 'events' 
  | 'sundayschool' 
  | 'assignments';

export interface EngagementDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  formattedRangeText: string;
}

export interface MemberActivityRow {
  memberId: string;
  memberName: string;
  phone: string;
  email: string;
  status: string;
  assignedMinistries: string[];
  attendanceCount: number;
  ministryActivityCount: number;
  eventsCount: number;
  assignmentsCount: number;
  sundaySchoolCount: number;
  totalActivitiesLogged: number;
  hasRecentActivity: boolean;
  lastActivityDate: string | null;
  activityCategories: string[];
}

export interface MinistryEngagementStat {
  ministryId: string;
  ministryName: string;
  totalMembers: number;
  membersWithRecentActivity: number;
  membersWithNoRecentActivity: number;
  activityRatePercentage: number;
}

export interface EngagementSummaryMetrics {
  totalMembers: number;
  membersWithRecentActivity: number;
  membersWithNoRecentActivity: number;
  attendanceParticipants: number;
  ministryParticipants: number;
  eventParticipants: number;
  sundaySchoolParticipants: number;
  assignmentParticipants: number;
  participationRatePercentage: number;
}

export interface EngagementComparisonResult {
  currentPeriodLabel: string;
  currentEngagedCount: number;
  previousPeriodLabel: string;
  previousEngagedCount: number;
  differenceCount: number;
  percentageChange: number;
  factualComparisonText: string;
}

export interface EngagementTrendPoint {
  label: string;
  startDate: string;
  endDate: string;
  membersWithRecordedActivity: number;
}

export interface MemberEngagementData {
  dateRange: EngagementDateRange;
  userRole: string;
  canAccessChurchWide: boolean;
  isAuthorized: boolean;
  authorizedMinistries: ChurchMinistry[];
  metrics: EngagementSummaryMetrics;
  comparison: EngagementComparisonResult;
  trend: EngagementTrendPoint[];
  ministryStats: MinistryEngagementStat[];
  memberRows: MemberActivityRow[];
  membersWithoutActivity: MemberActivityRow[];
  factualInsightsBullets: string[];
}

/**
 * Helper: Resolve Engagement Date Filter
 */
export function resolveEngagementDateRange(
  filter: EngagementDateFilter, 
  customStart?: string, 
  customEnd?: string,
  nowDate = new Date()
): EngagementDateRange {
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

  if (filter === 'last_30_days') {
    const start = new Date(nowDate);
    start.setDate(nowDate.getDate() - 30);
    return {
      startDate: formatYMD(start),
      endDate: formatYMD(nowDate),
      formattedRangeText: `Last 30 Days (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${nowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
    };
  }

  if (filter === 'last_90_days') {
    const start = new Date(nowDate);
    start.setDate(nowDate.getDate() - 90);
    return {
      startDate: formatYMD(start),
      endDate: formatYMD(nowDate),
      formattedRangeText: `Last 90 Days (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${nowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
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
export function getPreviousEquivalentEngagementRange(current: EngagementDateRange): EngagementDateRange {
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
 * Main Calculation Engine & Access Control Enforcement Function
 */
export function calculateMemberEngagementInsights(params: {
  currentChurchId: string;
  currentUser?: SaaSUser | null;
  members: Member[];
  attendanceRecords: AttendanceRecord[];
  sundaySchoolRecords?: SundaySchoolAttendanceRecord[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  ministryActivities: MinistryActivity[];
  events: ChurchEvent[];
  roster: RosterAssignment[];
  dateFilter: EngagementDateFilter;
  customStart?: string;
  customEnd?: string;
  activityTypeFilter?: EngagementActivityFilter;
  targetMinistryId?: string;
}): MemberEngagementData {
  const {
    currentChurchId, currentUser, members = [], attendanceRecords = [],
    sundaySchoolRecords = [], ministries = [], ministryMembers = [],
    ministryActivities = [], events = [], roster = [], dateFilter,
    customStart, customEnd, activityTypeFilter = 'ALL', targetMinistryId
  } = params;

  const userRole = currentUser?.role || 'Member';
  const canAccessChurchWide = canAccessAllChurchReports(userRole);

  // Check Ministry Leadership Authorization
  const userAssignedMins = getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  const authorizedMinistries = userAssignedMins.filter(m => m.isLeader).map(m => m.ministry);
  const isMinistryLeader = authorizedMinistries.length > 0;

  // Security Check: Normal Member with no leadership access is denied church-wide view
  if (!canAccessChurchWide && !isMinistryLeader) {
    const emptyRange = resolveEngagementDateRange(dateFilter, customStart, customEnd);
    return {
      dateRange: emptyRange,
      userRole,
      canAccessChurchWide: false,
      isAuthorized: false,
      authorizedMinistries: [],
      metrics: {
        totalMembers: 0,
        membersWithRecentActivity: 0,
        membersWithNoRecentActivity: 0,
        attendanceParticipants: 0,
        ministryParticipants: 0,
        eventParticipants: 0,
        sundaySchoolParticipants: 0,
        assignmentParticipants: 0,
        participationRatePercentage: 0
      },
      comparison: {
        currentPeriodLabel: emptyRange.formattedRangeText,
        currentEngagedCount: 0,
        previousPeriodLabel: '',
        previousEngagedCount: 0,
        differenceCount: 0,
        percentageChange: 0,
        factualComparisonText: 'Access denied.'
      },
      trend: [],
      ministryStats: [],
      memberRows: [],
      membersWithoutActivity: [],
      factualInsightsBullets: ['Member Engagement Insights are restricted to authorized church leadership.']
    };
  }

  // Church-Scoped Collections
  const activeChurchId = currentChurchId || 'church-1';
  const churchMembers = members.filter(m => (m.church_id || m.churchId || 'church-1') === activeChurchId);
  const churchAttendance = attendanceRecords.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);
  const churchSSRecords = sundaySchoolRecords.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);
  const churchMinActivities = ministryActivities.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);
  const churchEvents = events.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);
  const churchRoster = roster.filter(r => (r.church_id || r.churchId || 'church-1') === activeChurchId);

  // Filter target members set based on permissions
  let targetMembers = churchMembers;
  if (!canAccessChurchWide && isMinistryLeader) {
    // Restrict member list ONLY to members in authorized ministries
    const authMinIds = new Set(authorizedMinistries.map(m => m.id));
    const allowedMemberIds = new Set(
      ministryMembers
        .filter(mm => authMinIds.has(mm.ministryId))
        .map(mm => mm.memberId)
    );
    targetMembers = churchMembers.filter(m => allowedMemberIds.has(m.id));
  } else if (targetMinistryId && targetMinistryId !== 'ALL') {
    // Filter by single target ministry if specified
    const allowedMemberIds = new Set(
      ministryMembers
        .filter(mm => mm.ministryId === targetMinistryId)
        .map(mm => mm.memberId)
    );
    targetMembers = churchMembers.filter(m => allowedMemberIds.has(m.id));
  }

  // 1. Resolve Date Ranges
  const dateRange = resolveEngagementDateRange(dateFilter, customStart, customEnd);
  const prevDateRange = getPreviousEquivalentEngagementRange(dateRange);

  // Helper function to calculate engagement per member for a given date range
  const calculateMemberRowsForRange = (range: EngagementDateRange, memberList: Member[]) => {
    // Pre-filter records in date range
    const attInPeriod = churchAttendance.filter(r => r.date >= range.startDate && r.date <= range.endDate);
    const ssInPeriod = churchSSRecords.filter(r => r.date >= range.startDate && r.date <= range.endDate);
    const minActInPeriod = churchMinActivities.filter(r => r.date >= range.startDate && r.date <= range.endDate && r.status === 'Completed');
    const eventsInPeriod = churchEvents.filter(r => r.date >= range.startDate && r.date <= range.endDate);
    const rosterInPeriod = churchRoster.filter(r => (r.serviceDate || '') >= range.startDate && (r.serviceDate || '') <= range.endDate);

    return memberList.map(member => {
      // Find assigned ministry names for member
      const memberMinRecs = ministryMembers.filter(mm => mm.memberId === member.id);
      const minNames = memberMinRecs
        .map(mm => ministries.find(m => m.id === mm.ministryId)?.name)
        .filter(Boolean) as string[];

      // 1. Attendance Signal
      let attendanceCount = 0;
      let lastAttDate: string | null = null;
      attInPeriod.forEach(r => {
        if ((r.presentMemberIds || []).includes(member.id)) {
          attendanceCount++;
          if (!lastAttDate || r.date > lastAttDate) lastAttDate = r.date;
        }
      });

      // 2. Sunday School Signal
      let sundaySchoolCount = 0;
      let lastSSDate: string | null = null;
      ssInPeriod.forEach(r => {
        if ((r.presentStudentIds || []).includes(member.id)) {
          sundaySchoolCount++;
          if (!lastSSDate || r.date > lastSSDate) lastSSDate = r.date;
        }
      });

      // 3. Ministry Activity Signal
      let ministryActivityCount = 0;
      let lastMinActDate: string | null = null;
      minActInPeriod.forEach(r => {
        if ((r.presentMemberIds || []).includes(member.id)) {
          ministryActivityCount++;
          if (!lastMinActDate || r.date > lastMinActDate) lastMinActDate = r.date;
        }
      });

      // 4. Event RSVP Signal
      let eventsCount = 0;
      let lastEventDate: string | null = null;
      eventsInPeriod.forEach(r => {
        if ((r.rsvpMemberIds || []).includes(member.id)) {
          eventsCount++;
          if (!lastEventDate || r.date > lastEventDate) lastEventDate = r.date;
        }
      });

      // 5. Duty Roster Assignment Signal
      let assignmentsCount = 0;
      let lastRosterDate: string | null = null;
      rosterInPeriod.forEach(r => {
        const nameMatch = `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase() === r.memberName.toLowerCase();
        if (r.memberId === member.id || nameMatch) {
          assignmentsCount++;
          if (!lastRosterDate || r.serviceDate > lastRosterDate) lastRosterDate = r.serviceDate;
        }
      });

      // Total Activities Logged
      const totalActivitiesLogged = attendanceCount + sundaySchoolCount + ministryActivityCount + eventsCount + assignmentsCount;
      const hasRecentActivity = totalActivitiesLogged > 0;

      // Find overall latest activity date
      const dateList: (string | null)[] = [lastAttDate, lastSSDate, lastMinActDate, lastEventDate, lastRosterDate];
      const validDates: string[] = dateList.filter((d): d is string => Boolean(d));
      validDates.sort();
      const lastActivityDate = validDates.length > 0 ? validDates[validDates.length - 1] : null;

      // Activity categories string list
      const activityCategories: string[] = [];
      if (attendanceCount > 0) activityCategories.push('Attendance');
      if (sundaySchoolCount > 0) activityCategories.push('Sunday School');
      if (ministryActivityCount > 0) activityCategories.push('Ministry');
      if (eventsCount > 0) activityCategories.push('Events');
      if (assignmentsCount > 0) activityCategories.push('Assignments');

      const fullMemberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Church Member';

      return {
        memberId: member.id,
        memberName: fullMemberName,
        phone: member.phone || '',
        email: member.email || '',
        status: member.status || 'Active',
        assignedMinistries: minNames,
        attendanceCount,
        ministryActivityCount,
        eventsCount,
        assignmentsCount,
        sundaySchoolCount,
        totalActivitiesLogged,
        hasRecentActivity,
        lastActivityDate,
        activityCategories
      };
    });
  };

  // Calculate Member Rows for Current & Previous Period
  const memberRows = calculateMemberRowsForRange(dateRange, targetMembers);
  const prevMemberRows = calculateMemberRowsForRange(prevDateRange, targetMembers);

  // Apply Activity Type Filter if requested
  const filteredMemberRows = memberRows.filter(row => {
    if (activityTypeFilter === 'ALL') return true;
    if (activityTypeFilter === 'attendance') return row.attendanceCount > 0;
    if (activityTypeFilter === 'ministry') return row.ministryActivityCount > 0;
    if (activityTypeFilter === 'events') return row.eventsCount > 0;
    if (activityTypeFilter === 'sundayschool') return row.sundaySchoolCount > 0;
    if (activityTypeFilter === 'assignments') return row.assignmentsCount > 0;
    return true;
  });

  // Calculate Metrics
  const totalMembers = targetMembers.length;
  const membersWithRecentActivity = memberRows.filter(r => r.hasRecentActivity).length;
  const membersWithNoRecentActivity = totalMembers - membersWithRecentActivity;

  const attendanceParticipants = memberRows.filter(r => r.attendanceCount > 0).length;
  const ministryParticipants = memberRows.filter(r => r.ministryActivityCount > 0).length;
  const eventParticipants = memberRows.filter(r => r.eventsCount > 0).length;
  const sundaySchoolParticipants = memberRows.filter(r => r.sundaySchoolCount > 0).length;
  const assignmentParticipants = memberRows.filter(r => r.assignmentsCount > 0).length;

  const participationRatePercentage = totalMembers > 0 
    ? Math.round((membersWithRecentActivity / totalMembers) * 100) 
    : 0;

  const metrics: EngagementSummaryMetrics = {
    totalMembers,
    membersWithRecentActivity,
    membersWithNoRecentActivity,
    attendanceParticipants,
    ministryParticipants,
    eventParticipants,
    sundaySchoolParticipants,
    assignmentParticipants,
    participationRatePercentage
  };

  // Calculate Comparison with Previous Period
  const prevEngagedCount = prevMemberRows.filter(r => r.hasRecentActivity).length;
  const diffCount = membersWithRecentActivity - prevEngagedCount;
  const pctChange = prevEngagedCount > 0 
    ? Math.round(((membersWithRecentActivity - prevEngagedCount) / prevEngagedCount) * 1000) / 10 
    : 0;

  const signStr = diffCount >= 0 ? '+' : '';
  const factualComparisonText = prevEngagedCount > 0
    ? `${membersWithRecentActivity} members had recorded activity in ${dateRange.formattedRangeText} compared with ${prevEngagedCount} in ${prevDateRange.formattedRangeText} (${signStr}${diffCount} members, ${signStr}${pctChange}%).`
    : `No previous period data available for comparison.`;

  const comparison: EngagementComparisonResult = {
    currentPeriodLabel: dateRange.formattedRangeText,
    currentEngagedCount: membersWithRecentActivity,
    previousPeriodLabel: prevDateRange.formattedRangeText,
    previousEngagedCount: prevEngagedCount,
    differenceCount: diffCount,
    percentageChange: pctChange,
    factualComparisonText
  };

  // Members With No Recent Activity list
  const membersWithoutActivity = filteredMemberRows.filter(r => !r.hasRecentActivity);

  // 4. Calculate Ministry Engagement Stats
  const accessibleMinistries = canAccessChurchWide ? ministries : authorizedMinistries;
  const ministryStats: MinistryEngagementStat[] = accessibleMinistries.map(min => {
    const minMems = ministryMembers.filter(mm => mm.ministryId === min.id);
    const minMemIds = new Set(minMems.map(mm => mm.memberId));

    const totalMinMembers = minMems.length;
    const engagedMinMembers = memberRows.filter(r => minMemIds.has(r.memberId) && r.hasRecentActivity).length;
    const unengagedMinMembers = totalMinMembers - engagedMinMembers;
    const rate = totalMinMembers > 0 ? Math.round((engagedMinMembers / totalMinMembers) * 100) : 0;

    return {
      ministryId: min.id,
      ministryName: min.name,
      totalMembers: totalMinMembers,
      membersWithRecentActivity: engagedMinMembers,
      membersWithNoRecentActivity: unengagedMinMembers,
      activityRatePercentage: rate
    };
  });

  // 5. Calculate Weekly Trend Points
  const trend: EngagementTrendPoint[] = [];
  const startDateObj = new Date(dateRange.startDate);
  const endDateObj = new Date(dateRange.endDate);
  const totalDays = Math.max(1, Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24)));

  const stepDays = Math.max(1, Math.ceil(totalDays / 4));
  for (let i = 0; i < 4; i++) {
    const wStart = new Date(startDateObj);
    wStart.setDate(startDateObj.getDate() + (i * stepDays));
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + stepDays - 1);
    if (wEnd > endDateObj) wEnd.setTime(endDateObj.getTime());

    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const rangeObj: EngagementDateRange = {
      startDate: formatYMD(wStart),
      endDate: formatYMD(wEnd),
      formattedRangeText: `${wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    };

    const periodRows = calculateMemberRowsForRange(rangeObj, targetMembers);
    const count = periodRows.filter(r => r.hasRecentActivity).length;

    trend.push({
      label: `Week ${i + 1} (${wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
      startDate: rangeObj.startDate,
      endDate: rangeObj.endDate,
      membersWithRecordedActivity: count
    });
  }

  // 6. Generate Factual Insights Bullet Points
  const factualInsightsBullets: string[] = [];
  factualInsightsBullets.push(`During ${dateRange.formattedRangeText}, ${membersWithRecentActivity} of ${totalMembers} members (${participationRatePercentage}%) had at least one recorded church-related activity.`);
  if (attendanceParticipants > 0) {
    factualInsightsBullets.push(`${attendanceParticipants} members had recorded church attendance during this period.`);
  }
  if (ministryParticipants > 0) {
    factualInsightsBullets.push(`${ministryParticipants} members participated in ministry activities.`);
  }
  if (eventParticipants > 0) {
    factualInsightsBullets.push(`${eventParticipants} members participated in events/RSVPs.`);
  }
  if (membersWithNoRecentActivity > 0) {
    factualInsightsBullets.push(`${membersWithNoRecentActivity} members had no recorded activity in the application during the selected period.`);
  }
  if (prevEngagedCount > 0) {
    factualInsightsBullets.push(factualComparisonText);
  }

  return {
    dateRange,
    userRole,
    canAccessChurchWide,
    isAuthorized: true,
    authorizedMinistries,
    metrics,
    comparison,
    trend,
    ministryStats,
    memberRows: filteredMemberRows,
    membersWithoutActivity,
    factualInsightsBullets
  };
}
