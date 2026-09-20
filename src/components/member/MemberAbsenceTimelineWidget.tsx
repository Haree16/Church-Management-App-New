import React, { useMemo } from 'react';
import { Member, AttendanceRecord } from '@/types';
import { 
  getAutomatedAbsenceTasks, 
  computeMemberAbsenceMetrics, 
  AutomatedAbsenceFollowUpTask 
} from '@/services/absenceFollowUpService';
import { 
  Clock, CheckCircle2, AlertCircle, MessageSquare, Send, 
  UserCheck, ShieldAlert, Sparkles, RefreshCw, Info 
} from 'lucide-react';

interface MemberAbsenceTimelineWidgetProps {
  member: Member;
  attendance: AttendanceRecord[];
}

export const MemberAbsenceTimelineWidget: React.FC<MemberAbsenceTimelineWidgetProps> = ({
  member,
  attendance = []
}) => {
  const churchId = member.churchId || member.church_id || 'church-1';
  const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member';

  const metrics = useMemo(() => {
    return computeMemberAbsenceMetrics(member.id, memberName, attendance);
  }, [member.id, memberName, attendance]);

  const memberTasks = useMemo(() => {
    const allTasks = getAutomatedAbsenceTasks(churchId);
    return allTasks.filter(t => t.memberId === member.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [churchId, member.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_approval':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Awaiting Approval</span>;
      case 'sent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"><Send className="w-3 h-3 mr-1" /> Message Sent</span>;
      case 'resolved_by_attendance':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Returned to Attendance</span>;
      case 'skipped':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">Skipped</span>;
      case 'do_not_contact':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20"><ShieldAlert className="w-3 h-3 mr-1" /> Do Not Contact</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-slate-200">Absence & Attendance History</h4>
        </div>
        <div className="text-xs text-slate-400">
          Last Recorded: <span className="font-medium text-slate-200">{metrics.lastAttendanceDate || 'No record'}</span>
          {metrics.lastAttendanceDate && (
            <span className="ml-1 text-slate-500">({metrics.daysSinceLastAttendance} days ago)</span>
          )}
        </div>
      </div>

      {/* Mandatory Disclaimer Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/90 leading-relaxed">
          These insights are based only on activities recorded in the Church Management App. They do not indicate a person's spiritual commitment or personal circumstances.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-1">
        <div className="bg-slate-850 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-xs text-slate-400 block">Total Attended</span>
          <span className="text-base font-bold text-emerald-400">{metrics.totalServicesAttended}</span>
        </div>
        <div className="bg-slate-850 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-xs text-slate-400 block">Days Inactive</span>
          <span className="text-base font-bold text-amber-400">{metrics.daysSinceLastAttendance === 999 ? 'N/A' : metrics.daysSinceLastAttendance}</span>
        </div>
        <div className="bg-slate-850 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-xs text-slate-400 block">Missed Sundays</span>
          <span className="text-base font-bold text-rose-400">{metrics.consecutiveMissedSundays}</span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3 pt-2">
        <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Follow-Up History</h5>
        {memberTasks.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4 bg-slate-950/40 rounded-lg border border-slate-800/50">
            No automated absence follow-up records logged for this member.
          </div>
        ) : (
          <div className="relative border-l border-slate-800 ml-3 space-y-4">
            {memberTasks.map((task) => (
              <div key={task.id} className="relative pl-6">
                {/* Bullet node */}
                <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-slate-800 border-2 border-indigo-500" />
                
                <div className="bg-slate-850 border border-slate-800/80 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Rule Triggered: {task.ruleDescription}
                    </span>
                    {getStatusBadge(task.status)}
                  </div>

                  <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded border border-slate-800/60">
                    "{task.editedMessage || task.preparedMessage}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Channel: <strong className="text-slate-400 uppercase">{task.channel}</strong></span>
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>

                  {task.resolutionNote && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      {task.resolutionNote}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
