/**
 * Types for Phase 4: Advanced Church Analytics & Workflow Automation
 */

export type AnalyticsTimeframe = 'last_30_days' | 'last_90_days' | 'this_year' | 'last_year';

export interface AttendancePeriodComparison {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  totalHeadcount: number;
  averageHeadcountPerService: number;
  uniqueAttendeesCount: number;
}

export interface DecliningAttendee {
  memberId: string;
  name: string;
  phoneMasked: string;
  status: string;
  priorAttendanceCount: number;
  recentAttendanceCount: number;
  percentageDrop: number;
  lastAttendedDate: string | null;
  recommendedAction: string;
}

export interface AttendanceDataQualityGap {
  serviceDate: string;
  serviceName: string;
  issueType: 'missing_member_checkins' | 'zero_headcount' | 'unregistered_guests_only' | 'unrecorded_service';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface AdvancedAttendanceAnalytics {
  timeframe: AnalyticsTimeframe;
  churchId: string;
  timezone: string;
  generatedAt: string;
  currentPeriod: AttendancePeriodComparison;
  priorPeriod: AttendancePeriodComparison;
  variancePercentage: number;
  isPositiveGrowth: boolean;
  firstTimeVisitorsCount: number;
  returningAttendeesCount: number;
  visitorRatioPercent: number;
  serviceTypeBreakdown: Array<{
    serviceName: string;
    totalHeadcount: number;
    sessionsCount: number;
    averageHeadcount: number;
  }>;
  ministryAttendanceBreakdown: Array<{
    ministryName: string;
    sessionsRecorded: number;
    totalPresent: number;
    averageTurnout: number;
  }>;
  decliningAttendees: DecliningAttendee[];
  dataQualityGaps: AttendanceDataQualityGap[];
  weeklyTrend: Array<{
    weekLabel: string;
    startDate: string;
    headcount: number;
    uniqueMembers: number;
    guests: number;
  }>;
  monthlyTrend: Array<{
    monthLabel: string;
    headcount: number;
    averagePerService: number;
    servicesCount: number;
  }>;
  insightsSummary: string;
}

export interface VisitorConversionItem {
  memberId: string;
  name: string;
  phoneMasked: string;
  firstVisitDate: string;
  currentStatus: string;
  daysToConversion: number;
}

export interface AdvancedMembershipAnalytics {
  timeframe: AnalyticsTimeframe;
  churchId: string;
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  activeMembershipRatePercent: number;
  newMembersJoinedInPeriod: number;
  priorPeriodNewMembers: number;
  membershipGrowthRatePercent: number;
  conversions: {
    totalFirstTimeVisitors: number;
    convertedToMembersCount: number;
    conversionRatePercent: number;
    convertedList: VisitorConversionItem[];
  };
  statusBreakdown: Record<string, number>;
  ministryBelongingBreakdown: Array<{
    ministryName: string;
    membersCount: number;
    percentageOfChurch: number;
  }>;
  dataQualityHygiene: {
    incompleteProfilesCount: number;
    potentialDuplicatesCount: number;
    hygieneScorePercent: number;
  };
  retentionRate12MonthsPercent: number;
  insightsSummary: string;
}

export interface EventTurnoutItem {
  eventId: string;
  title: string;
  date: string;
  category: string;
  registeredCount: number;
  actualTurnoutCount: number;
  turnoutVariancePercent: number;
  volunteerCount: number;
  attendanceRecorded: boolean;
}

export interface AdvancedEventAnalytics {
  timeframe: AnalyticsTimeframe;
  churchId: string;
  totalEventsScheduled: number;
  totalEventsCompleted: number;
  overallRegistrationCount: number;
  overallActualTurnout: number;
  overallTurnoutRatePercent: number;
  averageVolunteersPerEvent: number;
  turnoutByCategory: Array<{
    category: string;
    eventsCount: number;
    averageTurnout: number;
    averageRegistration: number;
    turnoutRatePercent: number;
  }>;
  eventsList: EventTurnoutItem[];
  insightsSummary: string;
}

export interface CommunicationCampaignMetric {
  templateName: string;
  categoryLabel: string;
  attemptedCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  optedOutCount: number;
  deliveryRatePercent: number;
}

export interface AdvancedCommunicationAnalytics {
  timeframe: AnalyticsTimeframe;
  churchId: string;
  totalMessagesAttempted: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalOptedOut: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  readRatePercent: number;
  optOutRatePercent: number;
  activeOptOutSubscribersCount: number;
  campaignMetrics: CommunicationCampaignMetric[];
  recentOptOuts: Array<{
    phoneMasked: string;
    optedOutAt: string;
    reason: string;
  }>;
  insightsSummary: string;
}

export interface AutomationWorkflowRule {
  id: string;
  name: string;
  description: string;
  category: 'absence' | 'visitor' | 'birthday' | 'volunteer' | 'disengagement';
  enabled: boolean;
  requiresApproval: boolean; // Human-in-the-loop guarantee
  thresholdValue: number;
  thresholdUnit: 'sundays' | 'days' | 'percentage';
  targetAction: 'pastoral_care_task' | 'whatsapp_welcome_draft' | 'birthday_greeting_draft' | 'roster_vacancy_alert' | 'disengagement_flag';
  lastRunAt?: string;
  lastTriggeredCount?: number;
}

export interface WorkflowActionItem {
  id: string;
  ruleId: string;
  targetId: string;
  targetName: string;
  targetPhoneMasked?: string;
  actionSummary: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface WorkflowExecutionLog {
  id: string;
  churchId: string;
  ruleId: string;
  ruleName: string;
  executedAt: string;
  recordsEvaluated: number;
  actionsProposedCount: number;
  status: 'pending_approval' | 'executed' | 'dismissed';
  proposedActions: WorkflowActionItem[];
}
