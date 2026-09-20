import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_DEFINITIONS } from '@/lib/permissions';
import {
  dashboardService,
  DashboardStats,
  DashboardChartsData,
  DateRangeOption,
} from '@/services/dashboardService';
import { Link } from 'react-router-dom';
import {
  Users,
  Layers,
  Heart,
  DollarSign,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Building2,
  UserCheck,
  UserPlus,
  HeartHandshake,
  MessageSquare,
  AlertTriangle,
  CalendarCheck2,
  Calendar,
  Baby,
  Megaphone,
  Send,
  TrendingUp,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

export function DashboardPage() {
  const { user, profile, activeChurch, currentRole } = useAuth();
  const churchId = activeChurch?.id || 'a0000000-0000-0000-0000-000000000001';
  const roleDef = currentRole ? ROLE_DEFINITIONS[currentRole] : null;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardChartsData | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [isLoading, setIsLoading] = useState(true);

  const canViewGiving = ['super_admin', 'church_admin', 'pastor'].includes(currentRole || '');

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, chartsData] = await Promise.all([
        dashboardService.getDashboardStats(churchId, currentRole, user?.id),
        dashboardService.getDashboardCharts(churchId, dateRange),
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [churchId, currentRole, dateRange]);

  return (
    <div className="space-y-6">
      {/* 1. Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none text-xs">
                {activeChurch?.name || 'New Creation Assembly Church'}
              </Badge>
              {roleDef && (
                <Badge variant="default" className="bg-sky-400 text-sky-950 hover:bg-sky-300 font-semibold text-xs">
                  {roleDef.name}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {profile?.first_name || user?.email?.split('@')[0] || 'Leader'}!
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/90 max-w-2xl">
              {activeChurch?.tagline || ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary" className="h-9 gap-1.5 shadow-sm font-semibold text-xs">
              <Link to="/people/members">
                <Users className="h-4 w-4" />
                Members ({stats?.totalMembers || 0})
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 gap-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/20 text-xs">
              <Link to="/people/visitors">
                <UserCheck className="h-4 w-4" />
                Visitors ({stats?.totalVisitors || 0})
              </Link>
            </Button>
          </div>
        </div>

        {/* Ambient decorative gradient bubbles */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-1/3 -top-10 h-48 w-48 rounded-full bg-sky-400/20 blur-2xl" />
      </div>

      {/* 2. Top KPI Statistic Cards (Grid of 4 Core Pillars) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {/* Total Members */}
        <StatCard
          title="Total Members"
          value={stats?.totalMembers || 0}
          description={`+${stats?.newMembersThisMonth || 0} new this month`}
          icon={<Users className="h-5 w-5 text-sky-600" />}
          change="+8.4%"
          trend="up"
          className="border-sky-100 dark:border-sky-950 bg-sky-50/20 dark:bg-sky-950/10"
        />

        {/* Sunday Attendance */}
        <StatCard
          title="Monthly Attendance"
          value={stats?.monthlyAttendance || 0}
          description="Avg ~150 / service"
          icon={<CalendarCheck2 className="h-5 w-5 text-emerald-600" />}
          change="+5.2%"
          trend="up"
          className="border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10"
        />

        {/* Active Prayers */}
        <StatCard
          title="Active Prayer Requests"
          value={stats?.activePrayers || 0}
          description={`${stats?.answeredPrayers || 0} prayers answered`}
          icon={<Heart className="h-5 w-5 text-rose-600" />}
          className="border-rose-100 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10"
        />

        {/* Giving this month (Role Protected) */}
        <StatCard
          title={canViewGiving ? "Giving This Month" : "Total Ministries"}
          value={canViewGiving ? `$${(stats?.monthlyGiving || 0).toLocaleString()}` : (stats?.totalMinistries || 0)}
          description={canViewGiving ? `$${(stats?.yearlyGiving || 0).toLocaleString()} YTD Total` : "Active serving teams"}
          icon={canViewGiving ? <DollarSign className="h-5 w-5 text-purple-600" /> : <Layers className="h-5 w-5 text-purple-600" />}
          change={canViewGiving ? "+6.7%" : undefined}
          trend={canViewGiving ? "up" : "neutral"}
          className="border-purple-100 dark:border-purple-950 bg-purple-50/20 dark:bg-purple-950/10"
        />
      </div>

      {/* 3. Secondary Metrics Bar (Visitors, Follow-ups, Events, Volunteers, Next-Gen) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
        <Link to="/people/visitors" className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold">Visitors</span>
            <UserCheck className="h-4 w-4 text-sky-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {stats?.totalVisitors || 0}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">+{stats?.newVisitorsThisMonth || 0} this month</span>
        </Link>

        <Link to="/engagement/follow-ups" className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold">Pending Care</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {stats?.pendingFollowUps || 0}
          </span>
          <span className={`text-[10px] ${stats?.overdueFollowUps ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
            {stats?.overdueFollowUps ? `${stats.overdueFollowUps} overdue` : 'On schedule'}
          </span>
        </Link>

        <Link to="/engagement/events" className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold">Events</span>
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {stats?.upcomingEventsCount || 0}
          </span>
          <span className="text-[10px] text-slate-400">Scheduled</span>
        </Link>

        <Link to="/church/volunteers" className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold">Volunteers</span>
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {stats?.totalVolunteers || 0}
          </span>
          <span className="text-[10px] text-slate-400">Active roster</span>
        </Link>

        <Link to="/children" className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold">Kids Kingdom</span>
            <Baby className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {stats?.totalChildren || 0}
          </span>
          <span className="text-[10px] text-slate-400">Enrolled children</span>
        </Link>

        <Link to="/youth" className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold">Youth Students</span>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {stats?.totalYouth || 0}
          </span>
          <span className="text-[10px] text-slate-400">Middle/High School</span>
        </Link>
      </div>

      {/* 4. Real Visual Charts Section with Dynamic Date Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sky-600" />
              Congregation Growth & Engagement Trends
            </h2>
            <p className="text-xs text-slate-500">Real database metric charts and participation analytics</p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white dark:bg-slate-900">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Past 1 Year</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="ghost"
              onClick={loadDashboardData}
              className="h-8 w-8 p-0"
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Chart 1: Member Growth Trend */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-600" />
                  Cumulative Member Growth
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  +{stats?.newMembersThisMonth || 0} this month
                </Badge>
              </div>
              <CardDescription className="text-xs">Active members count over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
                {charts?.memberGrowth.map((point) => {
                  const max = 180;
                  const heightPercent = Math.min(100, (point.value / max) * 100);
                  return (
                    <div key={point.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-300 opacity-80 group-hover:opacity-100">
                        {point.value}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-sky-600 to-sky-400 transition-all group-hover:from-sky-500 group-hover:to-sky-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] text-slate-500 font-medium">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Attendance Trend */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
                  Weekly Service Attendance Trend
                </CardTitle>
                <Badge variant="emerald" className="text-[10px] font-mono">
                  Avg 150/Service
                </Badge>
              </div>
              <CardDescription className="text-xs">Sunday morning in-person headcounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
                {charts?.attendanceTrend.map((point) => {
                  const max = 200;
                  const heightPercent = Math.min(100, (point.value / max) * 100);
                  return (
                    <div key={point.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 opacity-80 group-hover:opacity-100">
                        {point.value}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all group-hover:from-emerald-500 group-hover:to-emerald-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] text-slate-500 font-medium">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Chart 3: Giving Trend ($ Thousands) - Protected */}
          {canViewGiving ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    Monthly Giving & Contributions ($k)
                  </CardTitle>
                  <Badge variant="purple" className="text-[10px] font-mono">
                    +6.7% vs Target
                  </Badge>
                </div>
                <CardDescription className="text-xs">Tithes and designated fund totals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
                  {charts?.givingTrend.map((point) => {
                    const max = 70;
                    const heightPercent = Math.min(100, (point.value / max) * 100);
                    return (
                      <div key={point.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 opacity-80 group-hover:opacity-100">
                          ${point.value}k
                        </span>
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-purple-600 to-purple-400 transition-all group-hover:from-purple-500 group-hover:to-purple-300"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[10px] text-slate-500 font-medium">{point.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  Visitor & Guest Acquisition
                </CardTitle>
                <CardDescription className="text-xs">New guest connect cards received</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
                  {charts?.visitorTrend.map((point) => {
                    const max = 40;
                    const heightPercent = Math.min(100, (point.value / max) * 100);
                    return (
                      <div key={point.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 opacity-80 group-hover:opacity-100">
                          {point.value}
                        </span>
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[10px] text-slate-500 font-medium">{point.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart 4: Ministry Participation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-600" />
                Ministry & Volunteer Deployment
              </CardTitle>
              <CardDescription className="text-xs">Active members serving across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5 pt-2">
                {charts?.ministryParticipation.map((item) => {
                  const max = 30;
                  const percent = Math.min(100, (item.value / max) * 100);
                  return (
                    <div key={item.label} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{item.value} volunteers</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Quick Administrative Action Hub */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" />
            Quick Operational Actions
          </CardTitle>
          <CardDescription className="text-xs">Frequently accessed ministerial and administrative workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <Button asChild variant="outline" size="sm" className="h-10 text-xs gap-1.5 bg-white dark:bg-slate-800 justify-start">
              <Link to="/people/members">
                <UserPlus className="h-4 w-4 text-sky-600" />
                Add Member
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="h-10 text-xs gap-1.5 bg-white dark:bg-slate-800 justify-start">
              <Link to="/people/visitors">
                <UserCheck className="h-4 w-4 text-blue-600" />
                Log Visitor
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="h-10 text-xs gap-1.5 bg-white dark:bg-slate-800 justify-start">
              <Link to="/children">
                <Baby className="h-4 w-4 text-emerald-600" />
                Child Check-In
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="h-10 text-xs gap-1.5 bg-white dark:bg-slate-800 justify-start">
              <Link to="/engagement/prayer-requests">
                <Heart className="h-4 w-4 text-rose-600" />
                Prayer Request
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="h-10 text-xs gap-1.5 bg-white dark:bg-slate-800 justify-start">
              <Link to="/communication/announcements">
                <Megaphone className="h-4 w-4 text-purple-600" />
                Announce
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="h-10 text-xs gap-1.5 bg-white dark:bg-slate-800 justify-start">
              <Link to="/reports">
                <BarChart3 className="h-4 w-4 text-slate-600" />
                Full Reports
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default DashboardPage;
