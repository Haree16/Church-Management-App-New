import React, { useState, useMemo } from 'react';
import { 
  ChurchTenant, SaaSUser, Member, AttendanceRecord, 
  SundaySchoolAttendanceRecord, ChurchMinistry, MinistryMember, 
  MinistryActivity, ChurchEvent, RosterAssignment, CompleteChurchSettings 
} from '../../types';
import { 
  calculateMemberEngagementInsights, EngagementDateFilter, 
  EngagementActivityFilter, MemberEngagementData, MemberActivityRow 
} from '../../services/memberEngagementService';
import { 
  generateAiEngagementSummary, answerEngagementQuestion, 
  AiEngagementResponse 
} from '../../services/aiEngagementService';
import { 
  Users, UserCheck, TrendingUp, Calendar, Clock, Filter, 
  Sparkles, Download, Printer, Search, RefreshCw, ChevronRight, 
  CheckCircle2, XCircle, ShieldAlert, GraduationCap, Landmark, 
  MessageSquare, Send, ArrowUpRight, ArrowDownRight, Minus, 
  ShieldCheck, Info, UserX, UserPlus, HeartHandshake, Eye, X
} from 'lucide-react';

interface MemberEngagementDashboardProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser | null;
  members: Member[];
  attendanceRecords: AttendanceRecord[];
  sundaySchoolRecords?: SundaySchoolAttendanceRecord[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  ministryActivities: MinistryActivity[];
  events: ChurchEvent[];
  roster: RosterAssignment[];
  churchSettings?: CompleteChurchSettings;
  onNavigateTab?: (tab: string, deepLinkId?: string) => void;
  onCreateFollowUp?: (member: Member) => void;
}

export const MemberEngagementDashboard: React.FC<MemberEngagementDashboardProps> = ({
  currentChurch,
  currentUser,
  members = [],
  attendanceRecords = [],
  sundaySchoolRecords = [],
  ministries = [],
  ministryMembers = [],
  ministryActivities = [],
  events = [],
  roster = [],
  churchSettings,
  onNavigateTab,
  onCreateFollowUp,
}) => {
  const activeChurchId = currentChurch?.id || 'church-1';
  const userRole = currentUser?.role || 'Member';

  // Filters State
  const [dateFilter, setDateFilter] = useState<EngagementDateFilter>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<EngagementActivityFilter>('ALL');
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>('ALL');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [tableFilterTab, setTableFilterTab] = useState<'ALL' | 'WITH_ACTIVITY' | 'NO_ACTIVITY'>('ALL');

  // Selected Member Detail Drawer State
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<MemberActivityRow | null>(null);

  // AI Assistant State
  const [aiSummary, setAiSummary] = useState<AiEngagementResponse | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState<boolean>(false);
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<AiEngagementResponse | null>(null);
  const [isAiQuestionLoading, setIsAiQuestionLoading] = useState<boolean>(false);

  // 1. Calculate Member Engagement Insights
  const engagementData: MemberEngagementData = useMemo(() => {
    return calculateMemberEngagementInsights({
      currentChurchId: activeChurchId,
      currentUser,
      members,
      attendanceRecords,
      sundaySchoolRecords,
      ministries,
      ministryMembers,
      ministryActivities,
      events,
      roster,
      dateFilter,
      customStart: dateFilter === 'custom_range' ? customStart : undefined,
      customEnd: dateFilter === 'custom_range' ? customEnd : undefined,
      activityTypeFilter,
      targetMinistryId: selectedMinistryId !== 'ALL' ? selectedMinistryId : undefined,
    });
  }, [
    activeChurchId, currentUser, members, attendanceRecords, 
    sundaySchoolRecords, ministries, ministryMembers, ministryActivities, 
    events, roster, dateFilter, customStart, customEnd, activityTypeFilter, selectedMinistryId
  ]);

  // Filtered Table Rows
  const displayedTableRows = useMemo(() => {
    let rows = engagementData.memberRows;

    if (tableFilterTab === 'WITH_ACTIVITY') {
      rows = rows.filter(r => r.hasRecentActivity);
    } else if (tableFilterTab === 'NO_ACTIVITY') {
      rows = rows.filter(r => !r.hasRecentActivity);
    }

    if (memberSearchQuery) {
      const q = memberSearchQuery.toLowerCase();
      rows = rows.filter(r => 
        r.memberName.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        r.assignedMinistries.some(m => m.toLowerCase().includes(q))
      );
    }

    return rows;
  }, [engagementData.memberRows, tableFilterTab, memberSearchQuery]);

  // Handle AI Summary Generation
  const handleGenerateAiSummary = async () => {
    setIsAiSummaryLoading(true);
    try {
      const res = await generateAiEngagementSummary(engagementData);
      setAiSummary(res);
    } catch (err) {
      console.error('Failed to generate AI engagement summary:', err);
    } finally {
      setIsAiSummaryLoading(false);
    }
  };

  // Handle AI Question Submit
  const handleAskAiQuestion = async (qText?: string) => {
    const questionToAsk = qText || userQuestion;
    if (!questionToAsk.trim()) return;

    setIsAiQuestionLoading(true);
    try {
      const res = await answerEngagementQuestion({
        questionText: questionToAsk,
        engagementData,
        userName: currentUser?.name || 'Leader'
      });
      setAiAnswer(res);
      if (!qText) setUserQuestion('');
    } catch (err) {
      console.error('Failed to answer AI engagement question:', err);
    } finally {
      setIsAiQuestionLoading(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const rows = [
      ['Member Name', 'Status', 'Assigned Ministries', 'Church Attendance', 'Ministry Activity', 'Events', 'Assignments', 'Has Recent Activity', 'Last Activity Date'],
      ...engagementData.memberRows.map(r => [
        `"${r.memberName}"`,
        r.status,
        `"${r.assignedMinistries.join(', ')}"`,
        r.attendanceCount,
        r.ministryActivityCount,
        r.eventsCount,
        r.assignmentsCount,
        r.hasRecentActivity ? 'Yes' : 'No',
        r.lastActivityDate || 'None'
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Member_Engagement_Insights_${engagementData.dateRange.startDate}_to_${engagementData.dateRange.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Security Access Check
  if (!engagementData.isAuthorized) {
    return (
      <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-sm text-center max-w-2xl mx-auto space-y-4 my-8 text-white">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-white">Access Restricted</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Member Engagement Insights are reserved for authorized church leadership (Pastors, Administrators, and Ministry Leaders).
        </p>
        <p className="text-xs text-slate-400">
          As a church member, you may view your individual attendance records under the <strong>"My Attendance"</strong> section.
        </p>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('my-attendance')}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl transition inline-flex items-center gap-2 shadow"
          >
            <UserCheck className="w-4 h-4 text-slate-950" />
            <span>Go to My Attendance</span>
          </button>
        )}
      </div>
    );
  }

  const { metrics, comparison, trend, ministryStats, membersWithoutActivity, factualInsightsBullets } = engagementData;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Member Engagement Insights
            </h1>
            {!engagementData.canAccessChurchWide && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                Ministry Scoped View
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
            <span>{currentChurch.name}</span>
            <span>•</span>
            <span className="text-indigo-300 font-semibold">{engagementData.dateRange.formattedRangeText}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleGenerateAiSummary}
            disabled={isAiSummaryLoading}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>{isAiSummaryLoading ? 'Analyzing...' : 'Generate AI Summary'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 2. Mandatory Terminology & Scope Disclaimer Banner (Section 2 & 5) */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-amber-900 dark:text-amber-300 block">Important Data Disclaimer</span>
          <p className="leading-relaxed text-amber-800 dark:text-amber-200/90 font-medium">
            These insights are based only on activities recorded in the Church Management App. They do not indicate a person's spiritual commitment or personal circumstances.
          </p>
        </div>
      </div>

      {/* 3. Date Range & Filters Bar */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Evaluation Period:</span>
          </div>
          <span className="text-xs font-black text-indigo-300 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800">
            {engagementData.dateRange.formattedRangeText}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['this_week', 'last_week', 'this_month', 'last_month', 'last_30_days', 'last_90_days', 'this_year', 'custom_range'] as EngagementDateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dateFilter === f
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              {f === 'this_week' && 'This Week'}
              {f === 'last_week' && 'Last Week'}
              {f === 'this_month' && 'This Month'}
              {f === 'last_month' && 'Last Month'}
              {f === 'last_30_days' && 'Last 30 Days'}
              {f === 'last_90_days' && 'Last 90 Days'}
              {f === 'this_year' && 'This Year'}
              {f === 'custom_range' && 'Custom Range'}
            </button>
          ))}
        </div>

        {dateFilter === 'custom_range' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Summary Cards (Section 5) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Members */}
        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-sm space-y-1 text-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
          <div className="text-3xl font-black text-white">{metrics.totalMembers}</div>
          <span className="text-[10px] text-slate-400 font-semibold block">Evaluated set</span>
        </div>

        {/* Members With Recent Activity */}
        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-sm space-y-1 relative overflow-hidden text-white">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider truncate block">Recent Activity</span>
          <div className="text-3xl font-black text-emerald-400">{metrics.membersWithRecentActivity}</div>
          <span className="text-[10px] text-emerald-400 font-bold block">{metrics.participationRatePercentage}% of members</span>
        </div>

        {/* Members With No Recent Activity */}
        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-sm space-y-1 text-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate block">No Recent Activity</span>
          <div className="text-3xl font-black text-slate-200">{metrics.membersWithNoRecentActivity}</div>
          <span className="text-[10px] text-slate-400 font-semibold block">No recorded logs</span>
        </div>

        {/* Recorded Attendance */}
        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-sm space-y-1 text-white">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider truncate block">Attendance</span>
          <div className="text-3xl font-black text-blue-400">{metrics.attendanceParticipants}</div>
          <span className="text-[10px] text-slate-400 font-semibold block">Attended service</span>
        </div>

        {/* Ministry Participants */}
        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-sm space-y-1 text-white">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider truncate block">Ministry</span>
          <div className="text-3xl font-black text-amber-400">{metrics.ministryParticipants}</div>
          <span className="text-[10px] text-slate-400 font-semibold block">Participated</span>
        </div>

        {/* Event Participants */}
        <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-sm space-y-1 text-white">
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider truncate block">Events</span>
          <div className="text-3xl font-black text-purple-400">{metrics.eventParticipants}</div>
          <span className="text-[10px] text-slate-400 font-semibold block">RSVP / Attended</span>
        </div>
      </div>

      {/* 5. AI Executive Summary (if generated) */}
      {aiSummary && (
        <div 
          data-theme-surface="dark"
          className="dark-hero-panel bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 border border-indigo-800/60 shadow-lg space-y-2 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h3 className="font-extrabold text-sm text-indigo-200 uppercase tracking-wider">AI Executive Engagement Summary</h3>
            </div>
            <span className="text-[10px] font-bold bg-indigo-950 px-2.5 py-0.5 rounded-full text-indigo-300 border border-indigo-800">
              Gemini 2.5 Flash
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            "{aiSummary.answer}"
          </p>
        </div>
      )}

      {/* 6. Activity Breakdown Cards (Section 16) */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Activity Breakdown by Category</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium italic">
            Note: Members may participate in multiple categories. Category totals overlap.
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Church Attendance</div>
            <div className="text-xl font-black text-white">{metrics.attendanceParticipants} <span className="text-xs text-slate-400 font-normal">members</span></div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Ministry Activities</div>
            <div className="text-xl font-black text-white">{metrics.ministryParticipants} <span className="text-xs text-slate-400 font-normal">members</span></div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Event Participation</div>
            <div className="text-xl font-black text-white">{metrics.eventParticipants} <span className="text-xs text-slate-400 font-normal">members</span></div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Sunday School</div>
            <div className="text-xl font-black text-white">{metrics.sundaySchoolParticipants} <span className="text-xs text-slate-400 font-normal">members</span></div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Roster Assignments</div>
            <div className="text-xl font-black text-white">{metrics.assignmentParticipants} <span className="text-xs text-slate-400 font-normal">members</span></div>
          </div>
        </div>
      </div>

      {/* 7. Visual Activity Trend Chart (Section 14) */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Activity Trend Trajectory</span>
            </h3>
            <p className="text-xs text-slate-400">Weekly trajectory of <strong className="text-white">Members with recorded activity</strong></p>
          </div>
        </div>

        {trend.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No activity data logged in selected range.</p>
        ) : (
          <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-800">
            {(() => {
              const maxVal = Math.max(...trend.map(t => t.membersWithRecordedActivity), 1);
              return trend.map((t, idx) => {
                const heightPct = Math.round((t.membersWithRecordedActivity / maxVal) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <span className="text-xs font-black text-slate-200">{t.membersWithRecordedActivity}</span>
                    <div className="w-full max-w-[40px] bg-slate-800 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                      <div 
                        className="w-full bg-indigo-500 group-hover:bg-indigo-400 transition-all duration-300" 
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center">
                      {t.label}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* 8. Period Comparison Panel (Section 15) */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3 text-white">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>Period-over-Period Engagement Comparison</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Selected Period</span>
            <div className="text-base font-black text-white">{comparison.currentPeriodLabel}</div>
            <div className="text-xs text-slate-300">
              Members with recorded activity: <strong className="text-white">{comparison.currentEngagedCount}</strong>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Previous Period</span>
            <div className="text-base font-black text-white">{comparison.previousPeriodLabel}</div>
            <div className="text-xs text-slate-300">
              Members with recorded activity: <strong className="text-white">{comparison.previousEngagedCount}</strong>
            </div>
          </div>
        </div>

        <div className="p-3 bg-indigo-950/60 rounded-2xl border border-indigo-800/80 text-xs font-semibold text-indigo-300">
          {comparison.factualComparisonText}
        </div>
      </div>

      {/* 9. Ministry Engagement Stats (Section 12 & 13) */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Ministry Recorded Participation</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Factual participation counts</span>
        </div>

        {ministryStats.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No ministry activity recorded for authorized scope.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ministryStats.map((min) => (
              <div key={min.ministryId} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{min.ministryName}</span>
                  <span className="text-[10px] font-black bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">
                    {min.activityRatePercentage}% rate
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">With Activity</span>
                    <span className="font-black text-emerald-400 text-sm">{min.membersWithRecentActivity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">No Activity</span>
                    <span className="font-black text-slate-300 text-sm">{min.membersWithNoRecentActivity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 10. Member Activity Table (Section 9 & 17) */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Member Activity Records</span>
            </h3>
            <p className="text-xs text-slate-400">Detailed factual activity breakdown per member</p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Search member by name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setTableFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              tableFilterTab === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            All Members ({engagementData.memberRows.length})
          </button>
          <button
            onClick={() => setTableFilterTab('WITH_ACTIVITY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              tableFilterTab === 'WITH_ACTIVITY'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            Recent Recorded Activity ({metrics.membersWithRecentActivity})
          </button>
          <button
            onClick={() => setTableFilterTab('NO_ACTIVITY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              tableFilterTab === 'NO_ACTIVITY'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            No Recent Activity ({metrics.membersWithNoRecentActivity})
          </button>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                <th className="p-3">Member</th>
                <th className="p-3">Attendance</th>
                <th className="p-3">Ministries</th>
                <th className="p-3">Events</th>
                <th className="p-3">Assignments</th>
                <th className="p-3">Last Recorded Activity</th>
                <th className="p-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-medium text-slate-300">
              {displayedTableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No matching member records found for the selected filter.
                  </td>
                </tr>
              ) : (
                displayedTableRows.slice(0, 100).map((row) => (
                  <tr key={row.memberId} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-white">{row.memberName}</td>
                    <td className="p-3 font-semibold text-blue-400">{row.attendanceCount} sessions</td>
                    <td className="p-3 text-slate-300 truncate max-w-[140px]">{row.assignedMinistries.join(', ') || '—'}</td>
                    <td className="p-3 text-purple-400 font-semibold">{row.eventsCount} events</td>
                    <td className="p-3 text-amber-400 font-semibold">{row.assignmentsCount} shifts</td>
                    <td className="p-3">
                      {row.lastActivityDate ? (
                        <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 font-bold rounded-lg border border-emerald-800">
                          {row.lastActivityDate}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No activity logged</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedMemberDetail(row)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl transition text-[11px] border border-slate-700"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 11. "Members With No Recent Recorded Activity" Section (Section 11 & 24) */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <UserX className="w-4 h-4 text-slate-400" />
              <span>Members With No Recent Recorded Activity</span>
            </h3>
            <p className="text-xs text-slate-400">
              No recorded church, ministry, or event activity during the selected period ({engagementData.dateRange.formattedRangeText}).
            </p>
          </div>
          <span className="text-xs font-black text-slate-200 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            {membersWithoutActivity.length} members
          </span>
        </div>

        {membersWithoutActivity.length === 0 ? (
          <p className="text-xs text-emerald-300 font-semibold bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800">
            All evaluated members have recorded activity during this period!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {membersWithoutActivity.slice(0, 15).map((row) => {
              const fullMemberObj = members.find(m => m.id === row.memberId);
              return (
                <div key={row.memberId} className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-xs">{row.memberName}</div>
                    <div className="text-[11px] text-slate-400">No activity logged in period</div>
                  </div>
                  {onCreateFollowUp && fullMemberObj && (
                    <button
                      onClick={() => onCreateFollowUp(fullMemberObj)}
                      className="px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 font-bold text-[11px] rounded-xl transition border border-indigo-800 shrink-0"
                    >
                      + Follow-up
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 12. Factual Insights Summary List */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3 text-white">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Factual Participation Bulletins</span>
        </h3>
        <div className="space-y-2">
          {factualInsightsBullets.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 13. Interactive AI Questions Panel (Section 19 & 20) */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <MessageSquare className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm text-white">Ask AI Engagement Assistant</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">Supports English & Tamil (தமிழ்)</span>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            "How many members had activity this month?",
            "How many members attended church at least once this month?",
            "How many members participated in a ministry?",
            "Show members with no recorded activity in the last 30 days.",
            "Compare member activity this month with last month.",
            "இந்த மாதம் எத்தனை உறுப்பினர்கள் church activities-ல் கலந்து கொண்டுள்ளனர்?"
          ].map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAskAiQuestion(q)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAiQuestion()}
            placeholder="Ask a question about member engagement (e.g. Compare member activity this month)..."
            className="flex-1 px-4 py-2.5 bg-slate-950 rounded-2xl text-xs text-white placeholder:text-slate-500 border border-slate-800 outline-none focus:border-indigo-500 transition"
          />
          <button
            onClick={() => handleAskAiQuestion()}
            disabled={isAiQuestionLoading || !userQuestion.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </div>

        {/* AI Answer Card */}
        {aiAnswer && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-900/60 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> Response
              </span>
              <span className="text-slate-500">{aiAnswer.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Synthesizer'}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {aiAnswer.answer}
            </p>
          </div>
        )}
      </div>

      {/* 14. Member Detail Modal (Section 10) */}
      {selectedMemberDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-800 relative text-white">
            <button
              onClick={() => setSelectedMemberDetail(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">Member Activity Profile</span>
              <h3 className="text-xl font-black text-white">{selectedMemberDetail.memberName}</h3>
              <p className="text-xs text-slate-400">Status: {selectedMemberDetail.status} • Phone: {selectedMemberDetail.phone || 'N/A'}</p>
            </div>

            <div className="space-y-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-700/80">
                <span className="text-slate-400">Church Attendance:</span>
                <strong className="text-blue-400 font-bold">{selectedMemberDetail.attendanceCount} sessions</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-700/80">
                <span className="text-slate-400">Assigned Ministries:</span>
                <strong className="text-slate-200 font-bold">{selectedMemberDetail.assignedMinistries.join(', ') || 'None'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-700/80">
                <span className="text-slate-400">Ministry Activities:</span>
                <strong className="text-amber-400 font-bold">{selectedMemberDetail.ministryActivityCount} recorded activities</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-700/80">
                <span className="text-slate-400">Events Participation:</span>
                <strong className="text-purple-400 font-bold">{selectedMemberDetail.eventsCount} recorded events</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-700/80">
                <span className="text-slate-400">Duty Roster Shifts:</span>
                <strong className="text-emerald-400 font-bold">{selectedMemberDetail.assignmentsCount} assignments</strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 font-semibold">Last Recorded Activity Date:</span>
                <strong className="text-white font-bold">{selectedMemberDetail.lastActivityDate || 'No recorded activity'}</strong>
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={() => setSelectedMemberDetail(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
