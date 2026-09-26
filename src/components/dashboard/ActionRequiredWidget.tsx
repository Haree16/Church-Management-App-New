import React, { useMemo } from 'react';
import { Member, PrayerRequest, ChurchEvent, AttendanceRecord, RosterAssignment } from '@/types';
import { AlertTriangle, ChevronRight, Phone, CheckSquare } from 'lucide-react';

export interface ActionItem {
  id: string;
  category: 'visitor' | 'prayer' | 'attendance' | 'event' | 'roster';
  title: string;
  subtitle: string;
  dateStr?: string;
  badgeText: string;
  badgeVariant: 'urgent' | 'warning' | 'info';
  actionLabel: string;
  actionTab: string;
  deepLinkId?: string;
  personPhone?: string;
}

interface ActionRequiredWidgetProps {
  members: Member[];
  prayers: PrayerRequest[];
  events: ChurchEvent[];
  attendance: AttendanceRecord[];
  roster: RosterAssignment[];
  onNavigateTab: (tab: string, deepLinkId?: string) => void;
  onToggleRosterConfirm?: (assignmentId: string) => void;
}

export const ActionRequiredWidget: React.FC<ActionRequiredWidgetProps> = ({
  members,
  prayers,
  events,
  attendance,
  roster,
  onNavigateTab,
  onToggleRosterConfirm,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute Action Items from real database entities
  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];

    // 1. Visitor Follow-ups: Members with status 'Visitor' who need follow-up
    const visitorMembers = members.filter((m) => m.status === 'Visitor');
    const pendingVisitors = visitorMembers.filter(
      (m) =>
        !m.pastoralNotes ||
        m.pastoralNotes.toLowerCase().includes('follow up') ||
        m.pastoralNotes.toLowerCase().includes('pending') ||
        m.pastoralNotes.toLowerCase().includes('welcome')
    );

    pendingVisitors.slice(0, 3).forEach((v) => {
      items.push({
        id: `act-vis-${v.id}`,
        category: 'visitor',
        title: `${v.firstName} ${v.lastName} — Visitor Follow-up`,
        subtitle: `First-time visitor on ${v.joinedDate || 'recent service'}. Awaiting welcome call or visit.`,
        dateStr: v.joinedDate,
        badgeText: 'Visitor Follow-up Pending',
        badgeVariant: 'warning',
        actionLabel: 'Contact Visitor',
        actionTab: 'directory',
        deepLinkId: v.id,
        personPhone: v.phone,
      });
    });

    // 2. Pending / Urgent Prayer Requests
    const urgentPrayers = prayers.filter((p) => p.status === 'Urgent' || p.status === 'Active');
    urgentPrayers.slice(0, 3).forEach((p) => {
      items.push({
        id: `act-pray-${p.id}`,
        category: 'prayer',
        title: `Prayer Request: ${p.title}`,
        subtitle: `${p.memberName || 'Member'}: "${p.description.slice(0, 85)}${p.description.length > 85 ? '...' : ''}"`,
        dateStr: p.dateSubmitted,
        badgeText: p.status === 'Urgent' ? 'Urgent Care Required' : 'Active Intercession',
        badgeVariant: p.status === 'Urgent' ? 'urgent' : 'info',
        actionLabel: 'View Prayer',
        actionTab: 'prayers',
        deepLinkId: p.id,
      });
    });

    // 3. Attendance Concerns: Inactive/Low-Attendance Members
    if (attendance.length > 0) {
      const recentAttendances = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
      const recentPresentIds = new Set<string>();
      recentAttendances.forEach((a) => (a.presentMemberIds || []).forEach((id) => recentPresentIds.add(id)));

      const activeMembersList = members.filter((m) => m.status === 'Member' || m.status === 'Regular Attender');
      const missingMembers = activeMembersList.filter((m) => !recentPresentIds.has(m.id));

      if (missingMembers.length > 0) {
        const sampleMissing = missingMembers[0];
        items.push({
          id: `act-att-concern`,
          category: 'attendance',
          title: `Attendance Concern: ${missingMembers.length} Absent Member${missingMembers.length > 1 ? 's' : ''}`,
          subtitle: `${sampleMissing.firstName} ${sampleMissing.lastName} and ${missingMembers.length - 1} others missed recent Sunday services. Pastoral reach-out recommended.`,
          dateStr: todayStr,
          badgeText: 'Low Attendance Alert',
          badgeVariant: 'warning',
          actionLabel: 'Review Attendance',
          actionTab: 'reports',
          deepLinkId: 'attendance',
        });
      }
    }

    // 4. Upcoming Events occurring within next 7 days requiring preparation
    const upcoming = events
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (upcoming.length > 0) {
      const nextEvt = upcoming[0];
      const isTomorrow = nextEvt.date === todayStr;
      items.push({
        id: `act-evt-${nextEvt.id}`,
        category: 'event',
        title: `Upcoming Event: ${nextEvt.title}`,
        subtitle: `${nextEvt.date} • ${nextEvt.time} at ${nextEvt.location}`,
        dateStr: nextEvt.date,
        badgeText: isTomorrow ? 'Happening Today / Tomorrow' : 'Upcoming Event',
        badgeVariant: isTomorrow ? 'urgent' : 'info',
        actionLabel: 'View Event',
        actionTab: 'calendar',
        deepLinkId: nextEvt.id,
      });
    }

    // 5. Unconfirmed Roster Duties
    const unconfirmedRoster = roster.filter((r) => !r.confirmed && r.serviceDate >= todayStr);
    if (unconfirmedRoster.length > 0) {
      const sample = unconfirmedRoster[0];
      items.push({
        id: `act-roster-${sample.id}`,
        category: 'roster',
        title: `Unconfirmed Serving Duty: ${sample.memberName}`,
        subtitle: `${sample.roleName} (${sample.team}) on ${sample.serviceDate} (${sample.serviceName}) awaiting confirmation.`,
        dateStr: sample.serviceDate,
        badgeText: 'Roster Confirmation Pending',
        badgeVariant: 'warning',
        actionLabel: 'Confirm Duty',
        actionTab: 'roster',
        deepLinkId: sample.id,
      });
    }

    return items;
  }, [members, prayers, events, attendance, roster, todayStr]);

  if (actionItems.length === 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 border border-emerald-500/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center justify-between text-white shadow-lg shadow-emerald-900/15 animate-fadeIn">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30 backdrop-blur-md shadow-inner">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-white tracking-wide" style={{ color: '#ffffff' }}>
              All Clear! No Pending Actions Required
            </h4>
            <p className="text-xs text-white font-medium mt-0.5 leading-relaxed" style={{ color: '#ffffff' }}>
              Visitor follow-ups, prayer care, and upcoming service rosters are up to date.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/5 dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm dark:shadow-xl text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <h3 className="font-black text-sm sm:text-base text-amber-700 dark:text-amber-300 tracking-wide uppercase">
            ACTION REQUIRED ({actionItems.length})
          </h3>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Operational records requiring immediate leadership response
        </span>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {actionItems.slice(0, 6).map((item) => {
          const badgeClass =
            item.badgeVariant === 'urgent'
              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
              : item.badgeVariant === 'warning'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
              : 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40';

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl p-4 border border-amber-500/20 hover:border-amber-400/60 shadow-xs dark:shadow-md transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                    {item.badgeText}
                  </span>
                  {item.dateStr && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">{item.dateStr}</span>
                  )}
                </div>

                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors leading-snug line-clamp-1">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {item.subtitle}
                </p>
              </div>

              {/* Action Footer */}
              <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                {item.personPhone ? (
                  <a
                    href={`tel:${item.personPhone}`}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pastoral Care</span>
                )}

                <button
                  onClick={() => {
                    if (item.category === 'roster' && item.deepLinkId && onToggleRosterConfirm) {
                      onToggleRosterConfirm(item.deepLinkId);
                    }
                    onNavigateTab(item.actionTab, item.deepLinkId);
                  }}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 active:scale-95 shrink-0"
                >
                  <span>{item.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
