import React, { useMemo } from 'react';
import { SaaSUser, Member, RosterAssignment, MinistryActivity, ChurchMinistry } from '../../types';
import { findLinkedMemberForUser } from '../../utils/notificationUtils';
import { Calendar, Clock, MapPin, Check, HeartHandshake, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';

interface MyAssignmentsViewProps {
  currentUser: SaaSUser;
  members: Member[];
  roster: RosterAssignment[];
  ministryActivities: MinistryActivity[];
  ministries: ChurchMinistry[];
  onToggleRosterConfirm?: (assignmentId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const MyAssignmentsView: React.FC<MyAssignmentsViewProps> = ({
  currentUser,
  members = [],
  roster = [],
  ministryActivities = [],
  ministries = [],
  onToggleRosterConfirm,
  onNavigateTab,
}) => {
  const linkedMember = useMemo(() => {
    return findLinkedMemberForUser(currentUser, members);
  }, [currentUser, members]);

  const memberId = linkedMember?.id || currentUser.id;
  const userNameLower = (currentUser.name || '').trim().toLowerCase();

  // Filter service roster assignments for current member
  const myRosterAssignments = useMemo(() => {
    return roster.filter(
      (r) =>
        r.memberId === memberId ||
        (r.memberName && r.memberName.trim().toLowerCase() === userNameLower)
    ).sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  }, [roster, memberId, userNameLower]);

  // Filter ministry activities assigned to current member
  const myActivityAssignments = useMemo(() => {
    return ministryActivities.filter(
      (act) =>
        act.presentMemberIds?.includes(memberId) ||
        act.presentMemberIds?.includes(currentUser.id) ||
        (act.leaderMemberId === memberId || act.leaderName?.toLowerCase() === userNameLower)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ministryActivities, memberId, currentUser, userNameLower]);

  const todayIso = new Date().toISOString().split('T')[0];

  const upcomingRoster = useMemo(() => {
    return myRosterAssignments.filter((r) => r.serviceDate >= todayIso);
  }, [myRosterAssignments, todayIso]);

  const pastRoster = useMemo(() => {
    return myRosterAssignments.filter((r) => r.serviceDate < todayIso);
  }, [myRosterAssignments, todayIso]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                <HeartHandshake className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                My Serving Schedule
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              My Assignments & Duties
            </h1>
            <p className="text-xs text-slate-300">
              Personalized duty shifts for worship services, media team, and ministry gatherings.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-center">
            <div className="text-xl font-black text-amber-400">{upcomingRoster.length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Duties</div>
          </div>
        </div>
      </div>

      {/* Upcoming Roster Assignments */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-amber-600" />
            <span>Upcoming Service Assignments ({upcomingRoster.length})</span>
          </h2>
        </div>

        {upcomingRoster.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            You have no upcoming service roster assignments.
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingRoster.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-amber-300">
                      {r.roleName}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Team: <strong className="text-slate-700">{r.team}</strong>
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{r.serviceName}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" /> {r.serviceDate}
                    </span>
                    {r.createdByName && (
                      <span>Assigned by: <strong>{r.createdByName}</strong></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {onToggleRosterConfirm && (
                    <button
                      onClick={() => onToggleRosterConfirm(r.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        r.confirmed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{r.confirmed ? 'Serving Confirmed' : 'Confirm Serving'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ministry Activity Shifts */}
      {myActivityAssignments.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <HeartHandshake className="w-4.5 h-4.5 text-amber-600" />
            <span>Ministry Activities & Event Shifts</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myActivityAssignments.map((act) => (
              <div key={act.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">
                    {act.status}
                  </span>
                  <span className="text-[11px] text-slate-400">{act.date}</span>
                </div>
                <h4 className="font-bold text-xs text-slate-900">{act.name}</h4>
                <p className="text-[11px] text-slate-500">{act.startTime} • {act.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Roster Assignments */}
      {pastRoster.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
            Past Serving History ({pastRoster.length})
          </h2>

          <div className="space-y-2">
            {pastRoster.slice(0, 5).map((r) => (
              <div key={r.id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
                <div>
                  <strong className="text-slate-800">{r.roleName}</strong> ({r.team}) — {r.serviceName}
                </div>
                <div className="text-slate-400 text-[11px]">{r.serviceDate}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
