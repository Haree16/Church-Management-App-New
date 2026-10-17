import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  MessageSquare, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  UserCheck, 
  UserX,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AnalyticsTimeframe, 
  AdvancedAttendanceAnalytics, 
  AdvancedMembershipAnalytics, 
  AdvancedEventAnalytics, 
  AdvancedCommunicationAnalytics 
} from '@/types/churchAnalytics';
import { churchAnalyticsService } from '@/services/churchAnalyticsService';

interface AdvancedAnalyticsDashboardProps {
  churchId: string;
  userRole?: string;
}

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  churchId,
  userRole = 'PastorAdmin'
}) => {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('last_30_days');
  const [activeTab, setActiveTab] = useState<'attendance' | 'membership' | 'events' | 'communication'>('attendance');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [attendanceData, setAttendanceData] = useState<AdvancedAttendanceAnalytics | null>(null);
  const [membershipData, setMembershipData] = useState<AdvancedMembershipAnalytics | null>(null);
  const [eventData, setEventData] = useState<AdvancedEventAnalytics | null>(null);
  const [communicationData, setCommunicationData] = useState<AdvancedCommunicationAnalytics | null>(null);

  const loadAllAnalytics = async () => {
    setIsLoading(true);
    try {
      const [att, mem, ev, comm] = await Promise.all([
        churchAnalyticsService.getAdvancedAttendanceAnalytics(churchId, timeframe),
        churchAnalyticsService.getAdvancedMembershipAnalytics(churchId, timeframe),
        churchAnalyticsService.getAdvancedEventAnalytics(churchId, timeframe),
        churchAnalyticsService.getAdvancedCommunicationAnalytics(churchId, timeframe)
      ]);
      setAttendanceData(att);
      setMembershipData(mem);
      setEventData(ev);
      setCommunicationData(comm);
    } catch (err) {
      console.error('Failed to load advanced analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [churchId, timeframe]);

  const handleExportCSV = () => {
    if (!attendanceData || !membershipData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += '--- CHURCH ANALYTICS EXPORT ---\n';
    csvContent += `Church ID,${churchId}\n`;
    csvContent += `Timeframe,${timeframe}\n`;
    csvContent += `Generated At,${new Date().toISOString()}\n\n`;

    csvContent += 'ATTENDANCE SUMMARY\n';
    csvContent += `Current Headcount,${attendanceData.currentPeriod.totalHeadcount}\n`;
    csvContent += `Prior Headcount,${attendanceData.priorPeriod.totalHeadcount}\n`;
    csvContent += `Growth Variance %,${attendanceData.variancePercentage}%\n`;
    csvContent += `Unique Attendees,${attendanceData.currentPeriod.uniqueAttendeesCount}\n`;
    csvContent += `First-Time Visitors,${attendanceData.firstTimeVisitorsCount}\n\n`;

    csvContent += 'MEMBERSHIP SUMMARY\n';
    csvContent += `Total Members,${membershipData.totalMembers}\n`;
    csvContent += `Active Members,${membershipData.activeMembers}\n`;
    csvContent += `Active Membership Rate %,${membershipData.activeMembershipRatePercent}%\n`;
    csvContent += `Visitor-to-Member Conversion %,${membershipData.conversions.conversionRatePercent}%\n`;
    csvContent += `Data Hygiene Score %,${membershipData.dataQualityHygiene.hygieneScorePercent}%\n\n`;

    if (communicationData) {
      csvContent += 'COMMUNICATION SUMMARY\n';
      csvContent += `Messages Attempted,${communicationData.totalMessagesAttempted}\n`;
      csvContent += `Delivered Count,${communicationData.totalDelivered}\n`;
      csvContent += `Delivery Rate %,${communicationData.deliveryRatePercent}%\n`;
      csvContent += `Read Rate %,${communicationData.readRatePercent}%\n`;
      csvContent += `Opted Out,${communicationData.activeOptOutSubscribersCount}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `church_analytics_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Advanced AI Church Analytics
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Data-driven insights, multi-period variance comparisons, and engagement alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Timeframe selector */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg text-xs font-medium">
            {(['last_30_days', 'last_90_days', 'this_year', 'last_year'] as AnalyticsTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  timeframe === tf
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf === 'last_30_days' && 'Last 30 Days'}
                {tf === 'last_90_days' && 'Last 90 Days'}
                {tf === 'this_year' && 'This Year (2026)'}
                {tf === 'last_year' && 'Last Year (2025)'}
              </button>
            ))}
          </div>

          <button
            onClick={loadAllAnalytics}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Category Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
        {[
          { id: 'attendance', label: 'Attendance Trends', icon: TrendingUp },
          { id: 'membership', label: 'Membership & Growth', icon: Users },
          { id: 'events', label: 'Event Participation', icon: Calendar },
          { id: 'communication', label: 'WhatsApp Delivery', icon: MessageSquare }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
          <p className="text-sm">Calculating historical metrics & period comparisons...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ATTENDANCE ANALYTICS */}
          {activeTab === 'attendance' && attendanceData && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Headcount</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {attendanceData.currentPeriod.totalHeadcount}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Avg {attendanceData.currentPeriod.averageHeadcountPerService}/service ({attendanceData.currentPeriod.totalSessions} services)
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Period Variance</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {attendanceData.variancePercentage}%
                    </span>
                    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                      attendanceData.isPositiveGrowth 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {attendanceData.isPositiveGrowth ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                      {attendanceData.isPositiveGrowth ? 'Growth' : 'Decline'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Prior Period: {attendanceData.priorPeriod.totalHeadcount} ({attendanceData.priorPeriod.periodLabel})
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unique Attendees</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {attendanceData.currentPeriod.uniqueAttendeesCount}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Distinct individuals recorded in period
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">First-Time Visitors</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {attendanceData.firstTimeVisitorsCount}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {attendanceData.visitorRatioPercent}% of total attendance
                  </div>
                </div>
              </div>

              {/* Weekly Trend Bar representation */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Weekly Attendance Breakdown
                </h3>
                <div className="space-y-3">
                  {attendanceData.weeklyTrend.map((week, idx) => {
                    const maxCount = Math.max(...attendanceData.weeklyTrend.map(w => w.headcount), 1);
                    const pct = Math.round((week.headcount / maxCount) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>{week.weekLabel} ({week.startDate})</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {week.headcount} attendees ({week.uniqueMembers} members, {week.guests} visitors)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Declining Attendance Watchlist */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Disengagement Risk Watchlist (Declining Attendees)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {attendanceData.decliningAttendees.length} member(s) flagged
                  </span>
                </div>

                {attendanceData.decliningAttendees.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    No members detected with severe attendance drop in this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="pb-2 font-medium">Member Name</th>
                          <th className="pb-2 font-medium">Phone</th>
                          <th className="pb-2 font-medium">Prior Period</th>
                          <th className="pb-2 font-medium">Recent Period</th>
                          <th className="pb-2 font-medium">Decline</th>
                          <th className="pb-2 font-medium">Last Attended</th>
                          <th className="pb-2 font-medium">Suggested Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {attendanceData.decliningAttendees.map((m) => (
                          <tr key={m.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                            <td className="py-2.5 font-medium text-slate-900 dark:text-white">{m.name}</td>
                            <td className="py-2.5 text-slate-500 font-mono">{m.phoneMasked}</td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{m.priorAttendanceCount} times</td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{m.recentAttendanceCount} times</td>
                            <td className="py-2.5 font-semibold text-rose-500">-{m.percentageDrop}%</td>
                            <td className="py-2.5 text-slate-500">{m.lastAttendedDate || 'N/A'}</td>
                            <td className="py-2.5 text-indigo-600 dark:text-indigo-400">{m.recommendedAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Data Quality Gaps */}
              {attendanceData.dataQualityGaps.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Attendance Data Quality Audit Warnings
                  </div>
                  <div className="space-y-1.5 text-xs text-amber-700 dark:text-amber-300/90">
                    {attendanceData.dataQualityGaps.map((gap, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="font-mono font-medium">[{gap.serviceDate}]</span>
                        <span>{gap.serviceName}: {gap.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEMBERSHIP ANALYTICS */}
          {activeTab === 'membership' && membershipData && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Membership</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {membershipData.totalMembers}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {membershipData.activeMembers} active ({membershipData.activeMembershipRatePercent}% active rate)
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">New Joins in Period</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      +{membershipData.newMembersJoinedInPeriod}
                    </span>
                    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {membershipData.membershipGrowthRatePercent}% Growth
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Prior Period: {membershipData.priorPeriodNewMembers} new members
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Visitor Conversion</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {membershipData.conversions.conversionRatePercent}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {membershipData.conversions.convertedToMembersCount} of {membershipData.conversions.totalFirstTimeVisitors} visitors became members
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Data Hygiene Score</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {membershipData.dataQualityHygiene.hygieneScorePercent}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {membershipData.dataQualityHygiene.incompleteProfilesCount} incomplete, {membershipData.dataQualityHygiene.potentialDuplicatesCount} duplicate suspects
                  </div>
                </div>
              </div>

              {/* Visitor Conversion List */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Visitor-to-Member Conversions
                </h3>
                {membershipData.conversions.convertedList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    No visitor conversions recorded during this timeframe.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="pb-2 font-medium">Member Name</th>
                          <th className="pb-2 font-medium">Phone</th>
                          <th className="pb-2 font-medium">First Visit</th>
                          <th className="pb-2 font-medium">Current Status</th>
                          <th className="pb-2 font-medium">Assimilation Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {membershipData.conversions.convertedList.map((c) => (
                          <tr key={c.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                            <td className="py-2.5 font-medium text-slate-900 dark:text-white">{c.name}</td>
                            <td className="py-2.5 text-slate-500 font-mono">{c.phoneMasked}</td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{c.firstVisitDate}</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                {c.currentStatus}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{c.daysToConversion} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Ministry Belonging Breakdown */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Ministry Belonging & Active Engagement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {membershipData.ministryBelongingBreakdown.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-750">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{m.ministryName}</span>
                        <span className="text-xs font-mono font-medium text-slate-500">{m.percentageOfChurch}%</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {m.membersCount} member(s) actively assigned
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVENT ANALYTICS */}
          {activeTab === 'events' && eventData && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Events</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {eventData.totalEventsCompleted}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {eventData.totalEventsScheduled} total scheduled
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Turnout Rate</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {eventData.overallTurnoutRatePercent}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {eventData.overallActualTurnout} actual / {eventData.overallRegistrationCount} RSVPs
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Volunteers / Event</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {eventData.averageVolunteersPerEvent}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Serving roles filled
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Turnout by Category</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {eventData.turnoutByCategory.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Active event types analyzed
                  </div>
                </div>
              </div>

              {/* Events Table */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Event Turnout & Reconciliation Audit
                </h3>
                {eventData.eventsList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    No church events recorded in this timeframe.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="pb-2 font-medium">Event Title</th>
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Category</th>
                          <th className="pb-2 font-medium">Registered</th>
                          <th className="pb-2 font-medium">Turnout</th>
                          <th className="pb-2 font-medium">Turnout %</th>
                          <th className="pb-2 font-medium">Volunteers</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {eventData.eventsList.map((e) => (
                          <tr key={e.eventId} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                            <td className="py-2.5 font-medium text-slate-900 dark:text-white">{e.title}</td>
                            <td className="py-2.5 text-slate-500">{e.date}</td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{e.category}</td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{e.registeredCount}</td>
                            <td className="py-2.5 font-semibold text-slate-900 dark:text-white">{e.actualTurnoutCount}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                e.turnoutVariancePercent >= 80 
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                                {e.turnoutVariancePercent}%
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{e.volunteerCount}</td>
                            <td className="py-2.5">
                              {e.attendanceRecorded ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                                </span>
                              ) : (
                                <span className="text-amber-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> Pending Report
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COMMUNICATION ANALYTICS */}
          {activeTab === 'communication' && communicationData && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Attempted</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {communicationData.totalMessagesAttempted}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    WhatsApp Cloud API broadcasts
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Delivery Rate</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {communicationData.deliveryRatePercent}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {communicationData.totalDelivered} delivered ({communicationData.totalFailed} failed)
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Confirmed Read Rate</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {communicationData.readRatePercent}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {communicationData.totalRead} messages opened
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Opt-Out Compliance</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {communicationData.activeOptOutSubscribersCount}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Active STOP opt-out subscribers honored
                  </div>
                </div>
              </div>

              {/* Campaign Performance Table */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Approved Template & Campaign Performance
                </h3>
                {communicationData.campaignMetrics.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    No template campaigns recorded in this timeframe.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="pb-2 font-medium">Campaign Category</th>
                          <th className="pb-2 font-medium">Meta Template</th>
                          <th className="pb-2 font-medium">Attempted</th>
                          <th className="pb-2 font-medium">Delivered</th>
                          <th className="pb-2 font-medium">Read</th>
                          <th className="pb-2 font-medium">Failed</th>
                          <th className="pb-2 font-medium">Delivery Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {communicationData.campaignMetrics.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                            <td className="py-2.5 font-medium text-slate-900 dark:text-white">{c.categoryLabel}</td>
                            <td className="py-2.5 font-mono text-slate-500">{c.templateName}</td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300">{c.attemptedCount}</td>
                            <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-medium">{c.deliveredCount}</td>
                            <td className="py-2.5 text-indigo-600 dark:text-indigo-400">{c.readCount}</td>
                            <td className="py-2.5 text-rose-500">{c.failedCount}</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                {c.deliveryRatePercent}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
