import React, { useMemo } from 'react';
import { SaaSUser, Member, AttendanceRecord, MinistryActivity, SundaySchoolAttendanceRecord } from '../../types';
import { findLinkedMemberForUser } from '../../utils/notificationUtils';
import { UserCheck, Calendar, CheckCircle2, XCircle, Clock, ShieldCheck, BarChart3, Lock } from 'lucide-react';

interface MyAttendanceViewProps {
  currentUser: SaaSUser;
  members: Member[];
  attendance: AttendanceRecord[];
  ministryActivities: MinistryActivity[];
  sundaySchoolAttendance?: SundaySchoolAttendanceRecord[];
  onNavigateTab: (tab: string) => void;
}

export const MyAttendanceView: React.FC<MyAttendanceViewProps> = ({
  currentUser,
  members = [],
  attendance = [],
  ministryActivities = [],
  sundaySchoolAttendance = [],
  onNavigateTab,
}) => {
  const linkedMember = useMemo(() => {
    return findLinkedMemberForUser(currentUser, members);
  }, [currentUser, members]);

  const memberId = linkedMember?.id || currentUser.id;

  // Filter attendance records where member was recorded present
  const myAttendanceLog = useMemo(() => {
    const records: {
      id: string;
      date: string;
      title: string;
      type: 'Sunday Service' | 'Ministry Meeting' | 'Sunday School';
      status: 'Present' | 'Absent';
    }[] = [];

    // 1. Sunday Services
    attendance.forEach((att) => {
      const isPresent = att.presentMemberIds?.includes(memberId) || att.presentMemberIds?.includes(currentUser.id);
      records.push({
        id: `att-${att.id}`,
        date: att.date,
        title: att.serviceName || 'Sunday Service',
        type: 'Sunday Service',
        status: isPresent ? 'Present' : 'Absent',
      });
    });

    // 2. Ministry Activities
    ministryActivities.forEach((act) => {
      const isPresent = act.presentMemberIds?.includes(memberId) || act.presentMemberIds?.includes(currentUser.id);
      records.push({
        id: `mact-${act.id}`,
        date: act.date,
        title: act.name,
        type: 'Ministry Meeting',
        status: isPresent ? 'Present' : 'Absent',
      });
    });

    // 3. Sunday School
    sundaySchoolAttendance.forEach((ssa) => {
      const isPresent = ssa.presentStudentIds?.includes(memberId);
      records.push({
        id: `ssa-${ssa.id}`,
        date: ssa.date,
        title: 'Sunday School Class',
        type: 'Sunday School',
        status: isPresent ? 'Present' : 'Absent',
      });
    });

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, ministryActivities, sundaySchoolAttendance, memberId, currentUser]);

  const totalSessions = myAttendanceLog.length;
  const attendedSessions = myAttendanceLog.filter((r) => r.status === 'Present').length;
  const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                <UserCheck className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Member Attendance Portal
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              My Attendance Record
            </h1>
            <p className="text-xs text-slate-300">
              Personal attendance history for worship services, ministry gatherings, and Sunday school.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 px-5 py-3 rounded-2xl text-center shrink-0">
            <div className="text-2xl font-black text-emerald-400">{attendanceRate}%</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalSessions}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sessions</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{attendedSessions}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sessions Attended</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{attendanceRate}%</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Participation Rate</div>
          </div>
        </div>
      </div>

      {/* Attendance History Log */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-emerald-600" />
            <span>Attendance Log</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Read-Only Member View</span>
        </div>

        {myAttendanceLog.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No attendance records found for your account yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {myAttendanceLog.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">{rec.title}</div>
                  <div className="text-[11px] text-slate-500">{rec.date} • {rec.type}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 ${
                      rec.status === 'Present'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {rec.status === 'Present' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{rec.status}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-slate-100/70 rounded-2xl text-[11px] text-slate-500 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Attendance records are officially managed and verified by authorized church leaders.</span>
        </div>
      </div>
    </div>
  );
};
