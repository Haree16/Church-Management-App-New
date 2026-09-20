import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChurchTenant, SaaSUser, Member, AttendanceRecord, 
  SundaySchoolAttendanceRecord, SundaySchoolClass, SundaySchoolStudent, 
  ChurchMinistry, MinistryMember, MinistryActivity, ChurchEvent, 
  CompleteChurchSettings 
} from '../../types';
import { 
  calculateAttendanceInsights, getMemberAttendanceHistory, 
  InsightsDateFilter, ServiceTypeFilter, AttendanceInsightsData, 
  MemberAttendanceLookupResult 
} from '../../services/attendanceInsightsService';
import { 
  generateAiAttendanceSummary, answerAttendanceQuestion, 
  AiAttendanceResponse 
} from '../../services/aiAttendanceService';
import { 
  BarChart3, UserCheck, TrendingUp, Calendar, Clock, Filter, 
  Sparkles, Download, Printer, Search, RefreshCw, ChevronRight, 
  CheckCircle2, XCircle, ShieldAlert, GraduationCap, Landmark, 
  Users, MessageSquare, Send, ArrowUpRight, ArrowDownRight, Minus, 
  HelpCircle, ShieldCheck
} from 'lucide-react';

interface AttendanceInsightsDashboardProps {
  currentChurch: ChurchTenant;
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
  churchSettings?: CompleteChurchSettings;
  onNavigateTab?: (tab: string, deepLinkId?: string) => void;
}

export const AttendanceInsightsDashboard: React.FC<AttendanceInsightsDashboardProps> = ({
  currentChurch,
  currentUser,
  members = [],
  attendanceRecords = [],
  sundaySchoolRecords = [],
  sundaySchoolClasses = [],
  sundaySchoolStudents = [],
  ministries = [],
  ministryMembers = [],
  ministryActivities = [],
  events = [],
  churchSettings,
  onNavigateTab,
}) => {
  const activeChurchId = currentChurch?.id || 'church-1';
  const userRole = currentUser?.role || 'Member';

  // Filters State
  const [dateFilter, setDateFilter] = useState<InsightsDateFilter>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceTypeFilter>('ALL');
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>('ALL');
  const [selectedSSClassId, setSelectedSSClassId] = useState<string>('ALL');

  // Member Lookup State (Pastor/Admin only)
  const [selectedMemberLookupId, setSelectedMemberLookupId] = useState<string>('');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  // AI Assistant State
  const [aiSummary, setAiSummary] = useState<AiAttendanceResponse | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState<boolean>(false);
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<AiAttendanceResponse | null>(null);
  const [isAiQuestionLoading, setIsAiQuestionLoading] = useState<boolean>(false);

  // 1. Calculate Attendance Insights Data
  const insightsData: AttendanceInsightsData = useMemo(() => {
    return calculateAttendanceInsights({
      currentChurchId: activeChurchId,
      currentUser,
      members,
      attendanceRecords,
      sundaySchoolRecords,
      sundaySchoolClasses,
      sundaySchoolStudents,
      ministries,
      ministryMembers,
      ministryActivities,
      events,
      dateFilter,
      customStart: dateFilter === 'custom_range' ? customStart : undefined,
      customEnd: dateFilter === 'custom_range' ? customEnd : undefined,
      serviceTypeFilter,
      targetMinistryId: selectedMinistryId !== 'ALL' ? selectedMinistryId : undefined,
    });
  }, [
    activeChurchId, currentUser, members, attendanceRecords, 
    sundaySchoolRecords, sundaySchoolClasses, sundaySchoolStudents, 
    ministries, ministryMembers, ministryActivities, events, 
    dateFilter, customStart, customEnd, serviceTypeFilter, selectedMinistryId
  ]);

  // 2. Member Lookup Data
  const memberLookupResult: MemberAttendanceLookupResult | null = useMemo(() => {
    if (!selectedMemberLookupId) return null;
    return getMemberAttendanceHistory({
      memberId: selectedMemberLookupId,
      members,
      attendanceRecords,
      currentUser
    });
  }, [selectedMemberLookupId, members, attendanceRecords, currentUser]);

  // Filtered member dropdown list for search
  const filteredLookupMembers = useMemo(() => {
    if (!memberSearchQuery) return members.slice(0, 50);
    const q = memberSearchQuery.toLowerCase();
    return members.filter(m => 
      `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q))
    ).slice(0, 50);
  }, [members, memberSearchQuery]);

  // Handle AI Summary Generation
  const handleGenerateAiSummary = async () => {
    setIsAiSummaryLoading(true);
    try {
      const res = await generateAiAttendanceSummary(insightsData);
      setAiSummary(res);
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
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
      const res = await answerAttendanceQuestion({
        questionText: questionToAsk,
        insightsData,
        memberLookupResult,
        userName: currentUser?.name || 'Leader'
      });
      setAiAnswer(res);
      if (!qText) setUserQuestion('');
    } catch (err) {
      console.error('Failed to answer AI attendance question:', err);
    } finally {
      setIsAiQuestionLoading(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const rows = [
      ['Service Date', 'Service Name', 'Total Attendance', 'Members Present', 'Guests'],
      ...insightsData.trend.map(t => [t.date, `"${t.serviceName}"`, t.total, t.members, t.guests])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Insights_${insightsData.dateRange.startDate}_to_${insightsData.dateRange.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check Security Permission
  const hasAccess = insightsData.canAccessChurchWide || insightsData.authorizedMinistries.length > 0;

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Church-wide Attendance Insights are reserved for authorized church leadership (Pastors, Administrators, and Ministry Leaders).
        </p>
        <p className="text-xs text-slate-400">
          As a church member, you may view your individual attendance records under the <strong>"My Attendance"</strong> section.
        </p>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('my-attendance')}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition inline-flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Go to My Attendance</span>
          </button>
        )}
      </div>
    );
  }

  const { metrics, comparison, trend, ministryStats, sundaySchoolStats, factualInsightsText } = insightsData;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Attendance Insights
            </h1>
            {!insightsData.canAccessChurchWide && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                Ministry Scoped View
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
            <span>{currentChurch.name}</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{insightsData.dateRange.formattedRangeText}</span>
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

      {/* 2. Date Range Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date Period:</span>
          </div>
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {insightsData.dateRange.formattedRangeText}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'last_year', 'custom_range'] as InsightsDateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dateFilter === f
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'this_week' && 'This Week'}
              {f === 'last_week' && 'Last Week'}
              {f === 'this_month' && 'This Month'}
              {f === 'last_month' && 'Last Month'}
              {f === 'this_year' && 'This Year'}
              {f === 'last_year' && 'Last Year'}
              {f === 'custom_range' && 'Custom Range'}
            </button>
          ))}
        </div>

        {dateFilter === 'custom_range' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Service Type Analysis Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Filter Service:</span>
        {(['ALL', 'Sunday Service', 'Prayer Meeting', 'Sunday School', 'Ministry', 'Event'] as ServiceTypeFilter[]).map((st) => (
          <button
            key={st}
            onClick={() => setServiceTypeFilter(st)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition shrink-0 ${
              serviceTypeFilter === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? 'All Service Types' : st}
          </button>
        ))}
      </div>

      {/* 4. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Average Attendance Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Attendance</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">{metrics.averageAttendance}</span>
            <span className="text-xs text-slate-400 font-semibold">/ service</span>
          </div>
          {comparison.previousAvg > 0 && (
            <div className="flex items-center gap-1 text-xs font-bold">
              {comparison.differenceCount >= 0 ? (
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +{comparison.differenceCount} (+{comparison.percentageChange}%)
                </span>
              ) : (
                <span className="text-rose-600 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {comparison.differenceCount} ({comparison.percentageChange}%)
                </span>
              )}
              <span className="text-slate-400 font-normal">vs prev</span>
            </div>
          )}
        </div>

        {/* Highest Attendance Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Highest Attendance</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900">
            {metrics.highestRecord ? metrics.highestRecord.count : '—'}
          </div>
          <p className="text-xs text-slate-500 font-medium truncate">
            {metrics.highestRecord ? `${metrics.highestRecord.date} • ${metrics.highestRecord.serviceName}` : 'No records logged'}
          </p>
        </div>

        {/* Lowest Attendance Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lowest Attendance</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900">
            {metrics.lowestRecord ? metrics.lowestRecord.count : '—'}
          </div>
          <p className="text-xs text-slate-500 font-medium truncate">
            {metrics.lowestRecord ? `${metrics.lowestRecord.date} • ${metrics.lowestRecord.serviceName}` : 'No records logged'}
          </p>
        </div>

        {/* Total Services Logged Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Services</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900">{metrics.totalServices}</div>
          <p className="text-xs text-slate-500 font-medium">
            Total Headcount: <strong>{metrics.totalHeadcount}</strong>
          </p>
        </div>
      </div>

      {/* 5. AI Executive Summary Banner (if generated) */}
      {aiSummary && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 border border-indigo-800/60 shadow-lg space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h3 className="font-extrabold text-sm text-indigo-200 uppercase tracking-wider">AI Executive Summary</h3>
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

      {/* 6. Visual Attendance Trend Chart */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>Attendance Trend</span>
            </h3>
            <p className="text-xs text-slate-400">Recorded turnout breakdown by service date</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Members
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Guests
            </span>
          </div>
        </div>

        {trend.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Calendar className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-xs font-bold">No attendance records are available for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* SVG Visual Bar Chart */}
            <div className="h-48 sm:h-56 w-full flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
              {(() => {
                const maxVal = Math.max(...trend.map(t => t.total), 1);
                return trend.map((t) => {
                  const memHeightPct = Math.round((t.members / maxVal) * 100);
                  const guestHeightPct = Math.round((t.guests / maxVal) * 100);
                  const isPeak = metrics.highestRecord && t.total === metrics.highestRecord.count;

                  return (
                    <div key={t.id} className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 group relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition duration-150 absolute -top-12 z-20 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg pointer-events-none whitespace-nowrap">
                        <div>{t.serviceName}</div>
                        <div>Total: {t.total} ({t.members} M, {t.guests} G)</div>
                        <div className="text-slate-400 font-normal">{t.date}</div>
                      </div>

                      {/* Total label above bar */}
                      <span className={`text-[10px] font-black ${isPeak ? 'text-amber-600 font-black' : 'text-slate-700'}`}>
                        {t.total}
                      </span>

                      {/* Stacked Bar Container */}
                      <div className="w-full max-w-[28px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                        {t.guests > 0 && (
                          <div 
                            className="w-full bg-amber-400 transition-all duration-300" 
                            style={{ height: `${guestHeightPct}%` }}
                          />
                        )}
                        <div 
                          className="w-full bg-emerald-500 group-hover:bg-emerald-600 transition-all duration-300" 
                          style={{ height: `${memHeightPct}%` }}
                        />
                      </div>

                      {/* Date label */}
                      <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">
                        {t.label}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* 7. Period Comparison Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <span>Period-over-Period Comparison</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Selected Period</span>
            <div className="text-base font-black text-slate-900">{comparison.currentPeriodLabel}</div>
            <div className="text-xs text-slate-600">
              Average: <strong className="text-slate-900">{comparison.currentAvg}</strong> attendees ({comparison.currentTotal} total)
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Previous Period</span>
            <div className="text-base font-black text-slate-900">{comparison.previousPeriodLabel}</div>
            <div className="text-xs text-slate-600">
              Average: <strong className="text-slate-900">{comparison.previousAvg}</strong> attendees ({comparison.previousTotal} total)
            </div>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs font-semibold text-emerald-900">
          {comparison.factualComparisonText}
        </div>
      </div>

      {/* 8. Sub-Sections: Sunday School & Ministry Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sunday School Insights Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/10 text-blue-600 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Sunday School Attendance</h3>
            </div>
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              Avg: {metrics.sundaySchoolAvg}
            </span>
          </div>

          {sundaySchoolStats.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No Sunday School classes configured.</p>
          ) : (
            <div className="space-y-2.5">
              {sundaySchoolStats.map((cls) => (
                <div key={cls.classId} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{cls.className}</div>
                    <div className="text-[11px] text-slate-400">Teacher: {cls.teacherName} • {cls.enrolledStudentsCount} Enrolled</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-blue-600">{cls.averageAttendance} avg</div>
                    <div className="text-[10px] text-slate-400">Peak: {cls.highestAttendance}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ministry Attendance Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-xl">
                <Landmark className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Ministry Attendance Overview</h3>
            </div>
            <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
              Avg: {metrics.ministryAttendanceAvg}
            </span>
          </div>

          {ministryStats.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No authorized ministry activities logged in period.</p>
          ) : (
            <div className="space-y-2.5">
              {ministryStats.map((min) => (
                <div key={min.ministryId} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>{min.ministryName}</span>
                      {min.isUserAuthorizedLeader && (
                        <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded">Leader</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{min.totalMembers} Roster Members • {min.activitiesCount} Sessions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-amber-600">{min.averageAttendance} avg</div>
                    <div className="text-[10px] text-slate-500 font-bold">{min.attendanceRate}% turnout</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 9. Individual Member Attendance Lookup (Pastor / Admin only) */}
      {insightsData.canAccessChurchWide && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Individual Member Attendance Lookup</span>
              </h3>
              <p className="text-xs text-slate-400">Search and view neutral check-in history for any church member</p>
            </div>

            {/* Member Selector */}
            <div className="relative w-full sm:w-72">
              <select
                value={selectedMemberLookupId}
                onChange={(e) => setSelectedMemberLookupId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="">Select Member to Inspect...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.status})</option>
                ))}
              </select>
            </div>
          </div>

          {memberLookupResult && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {memberLookupResult.member.firstName} {memberLookupResult.member.lastName}
                  </h4>
                  <p className="text-xs text-slate-500">{memberLookupResult.member.status} • Phone: {memberLookupResult.member.phone || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-sm font-black text-emerald-600">{memberLookupResult.attendedCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Attended</div>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-sm font-black text-slate-600">{memberLookupResult.totalServicesLogged}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Services</div>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-sm font-black text-indigo-600">{memberLookupResult.turnoutPercentage}%</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Turnout Rate</div>
                  </div>
                </div>
              </div>

              {/* Factual Log Timeline */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Factual Check-in Log:</span>
                {memberLookupResult.history.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 bg-white rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700">{item.date} — {item.serviceName}</span>
                    {item.wasPresent ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Minus className="w-3.5 h-3.5" /> Absent
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10. Factual Insights List Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Factual Insights Summary</span>
        </h3>
        <div className="space-y-2">
          {factualInsightsText.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 11. Interactive AI Questions Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <MessageSquare className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm text-white">Ask AI Attendance Assistant</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">Supports English & Tamil (தமிழ்)</span>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            "How was attendance last month?",
            "What was our highest attendance this year?",
            "Compare August and September",
            "How is Sunday School attendance?",
            "கடந்த மாத ஆராதனை வருகை அறிக்கை"
          ].map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAskAiQuestion(q)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
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
            placeholder="Ask a question about attendance (e.g. Compare August and September)..."
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
    </div>
  );
};
