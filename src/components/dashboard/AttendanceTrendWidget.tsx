import React, { useState, useMemo } from 'react';
import { AttendanceRecord } from '@/types';
import { BarChart3, UserCheck, TrendingUp, Filter, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface AttendanceTrendWidgetProps {
  attendanceRecords: AttendanceRecord[];
  onNavigateTab: (tab: string, deepLinkId?: string) => void;
  onOpenRecordAttendance?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export type TrendViewMode = 'weekly' | 'monthly';

export const AttendanceTrendWidget: React.FC<AttendanceTrendWidgetProps> = ({
  attendanceRecords,
  onNavigateTab,
  onOpenRecordAttendance,
  isLoading,
  isError,
  onRetry,
}) => {
  const [viewMode, setViewMode] = useState<TrendViewMode>('weekly');
  const [selectedService, setSelectedService] = useState<string>('ALL');

  // Filtered attendance by service type
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      if (selectedService === 'ALL') return true;
      return rec.serviceName === selectedService;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [attendanceRecords, selectedService]);

  // Aggregate by Weekly or Monthly
  const chartPoints = useMemo(() => {
    if (filteredRecords.length === 0) return [];

    if (viewMode === 'weekly') {
      // Group by past 8-12 weeks
      const recent = filteredRecords.slice(-12);
      return recent.map((rec) => {
        const total = (rec.presentMemberIds?.length || 0) + (rec.guestCount || 0);
        const guests = rec.guestCount || 0;
        return {
          id: rec.id,
          label: rec.date ? rec.date.substring(5) : 'N/A',
          fullDate: rec.date,
          serviceName: rec.serviceName,
          total,
          members: total - guests,
          guests,
        };
      });
    } else {
      // Monthly aggregation
      const monthMap: Record<string, { total: number; count: number; guests: number }> = {};
      filteredRecords.forEach((rec) => {
        const monthKey = rec.date ? rec.date.substring(0, 7) : 'Unknown';
        const total = (rec.presentMemberIds?.length || 0) + (rec.guestCount || 0);
        const guests = rec.guestCount || 0;

        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { total: 0, count: 0, guests: 0 };
        }
        monthMap[monthKey].total += total;
        monthMap[monthKey].guests += guests;
        monthMap[monthKey].count += 1;
      });

      const sortedMonths = Object.keys(monthMap).sort().slice(-6);
      return sortedMonths.map((mKey) => {
        const data = monthMap[mKey];
        const avg = Math.round(data.total / data.count);
        const avgGuests = Math.round(data.guests / data.count);
        const dateObj = new Date(`${mKey}-01`);
        const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

        return {
          id: mKey,
          label: monthLabel,
          fullDate: mKey,
          serviceName: 'Monthly Average',
          total: avg,
          members: avg - avgGuests,
          guests: avgGuests,
        };
      });
    }
  }, [filteredRecords, viewMode]);

  // Statistics Summary
  const stats = useMemo(() => {
    if (chartPoints.length === 0) {
      return { totalSum: 0, avg: 0, highest: 0, lowest: 0, trendPercent: 0 };
    }
    const totals = chartPoints.map((p) => p.total);
    const highest = Math.max(...totals);
    const lowest = Math.min(...totals);
    const sum = totals.reduce((acc, curr) => acc + curr, 0);
    const avg = Math.round(sum / totals.length);

    // Trend calculation comparing latest vs first point in chart
    const first = totals[0] || 1;
    const latest = totals[totals.length - 1] || 0;
    const diff = latest - first;
    const trendPercent = first > 0 ? Math.round((diff / first) * 100) : 0;

    return { totalSum: sum, avg, highest, lowest, trendPercent };
  }, [chartPoints]);

  const maxChartVal = useMemo(() => {
    const vals = chartPoints.map((p) => p.total);
    return Math.max(...vals, 50);
  }, [chartPoints]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h4 className="font-bold text-sm text-rose-900">Unable to load attendance analytics</h4>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Attendance Trend & Service Analytics</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Historical attendance trajectory ({viewMode === 'weekly' ? 'Weekly sessions' : 'Monthly averages'}).
          </p>
        </div>

        {/* Filters & Toggle */}
        <div className="flex items-center gap-2">
          {/* Service Selector */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="ALL">All Services</option>
            <option value="Sunday 9AM Service">Sunday Service</option>
            <option value="Wednesday Prayer">Wednesday Prayer</option>
            <option value="Youth Fellowship">Youth Fellowship</option>
          </select>

          {/* View Mode Toggle: Weekly vs Monthly */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === 'weekly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>

          <button
            onClick={() => onNavigateTab('reports', 'attendance')}
            className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline hidden sm:inline"
          >
            Full Report &rarr;
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {chartPoints.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Average Attendance</span>
            <div className="text-base font-black text-slate-900 dark:text-slate-100">{stats.avg} <span className="text-[10px] text-slate-400 font-normal">/ service</span></div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Highest Headcount</span>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{stats.highest}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Lowest Headcount</span>
            <div className="text-base font-black text-slate-700 dark:text-slate-300">{stats.lowest}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Period Trend</span>
            <div className={`text-base font-black flex items-center gap-1 ${stats.trendPercent >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              <TrendingUp className={`w-4 h-4 ${stats.trendPercent < 0 ? 'rotate-180' : ''}`} />
              <span>{stats.trendPercent >= 0 ? `+${stats.trendPercent}%` : `${stats.trendPercent}%`}</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Bar Chart */}
      {chartPoints.length > 0 ? (
        <div className="space-y-3 pt-2">
          <div className="h-44 flex items-end gap-2 sm:gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            {chartPoints.map((point) => {
              const heightPercent = Math.max(15, Math.round((point.total / maxChartVal) * 100));
              const guestHeightPercent = point.total > 0 ? Math.round((point.guests / point.total) * 100) : 0;

              return (
                <div key={point.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Floating Hover Tooltip */}
                  <div className="absolute -top-12 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-lg border border-slate-700 text-center">
                    <div className="text-emerald-400">{point.total} Total Attendees</div>
                    <div className="text-slate-300 text-[9px] font-normal">{point.members} Members • {point.guests} Guests</div>
                  </div>

                  {/* Main Column */}
                  <div
                    className="w-full max-w-[38px] rounded-t-xl bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 transition-all duration-200 relative overflow-hidden shadow-xs"
                    style={{ height: `${heightPercent}%` }}
                  >
                    {/* Guest Portion overlay */}
                    {point.guests > 0 && (
                      <div
                        className="absolute bottom-0 inset-x-0 bg-emerald-800/80"
                        style={{ height: `${guestHeightPercent}%` }}
                        title={`${point.guests} Visitors`}
                      />
                    )}
                  </div>

                  {/* Date Label */}
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-full">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span>Members</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-800" />
                <span>Visitors / Guests</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Showing last {chartPoints.length} {viewMode === 'weekly' ? 'recorded sessions' : 'months'}
              </span>
              <button
                onClick={() => onNavigateTab('reports', 'attendance-insights')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition"
              >
                <span>Attendance Insights</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
          <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">No attendance data available yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Log your first Sunday service attendance headcount to populate real-time trends.
          </p>
          {onOpenRecordAttendance && (
            <button
              onClick={onOpenRecordAttendance}
              className="mt-1 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-500 transition"
            >
              + Record Attendance
            </button>
          )}
        </div>
      )}
    </div>
  );
};
