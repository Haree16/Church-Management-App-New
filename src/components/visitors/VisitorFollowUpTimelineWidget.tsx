import React from 'react';
import { Visitor } from '../../types/database';
import { getAutomatedFollowUpTasks, AutomatedVisitorFollowUpTask } from '../../services/visitorFollowUpService';
import { CheckCircle2, Clock, Send, Ban, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';

interface VisitorFollowUpTimelineWidgetProps {
  visitor: Visitor;
  churchId: string;
}

export const VisitorFollowUpTimelineWidget: React.FC<VisitorFollowUpTimelineWidgetProps> = ({
  visitor,
  churchId,
}) => {
  const allTasks = getAutomatedFollowUpTasks(churchId);
  const visitorTasks = allTasks
    .filter(t => t.visitorId === visitor.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4 text-white">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Follow-up Lifecycle Timeline</span>
        </h4>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
          Status: {visitor.status?.replace('_', ' ') || 'New'}
        </span>
      </div>

      {visitorTasks.length === 0 ? (
        <div className="py-6 text-center text-slate-400 space-y-1">
          <MessageSquare className="w-6 h-6 mx-auto text-slate-600" />
          <p className="text-xs font-semibold text-slate-300">No automated follow-up steps recorded yet.</p>
          <p className="text-[11px] text-slate-400">Follow-up tasks generate automatically based on configured delays.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 border-l-2 border-slate-800 ml-2">
          {/* Step 1: Visitor Recorded */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
            <div className="text-xs font-bold text-white">Visitor Recorded</div>
            <div className="text-[10px] text-slate-400">{visitor.visit_date} • {visitor.service_attended || 'Church Visit'}</div>
          </div>

          {/* Automated Tasks Timeline */}
          {visitorTasks.map((t) => (
            <div key={t.id} className="relative space-y-1">
              <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
                t.status === 'sent' || t.status === 'completed' ? 'bg-emerald-500' :
                t.status === 'awaiting_approval' ? 'bg-amber-400 animate-pulse' :
                t.status === 'do_not_contact' ? 'bg-rose-500' : 'bg-slate-700'
              }`} />
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Stage {t.stage} Follow-up ({t.channel.toUpperCase()})</span>
                <span className="text-[10px] font-black uppercase text-amber-400">{t.status.replace('_', ' ')}</span>
              </div>
              <p className="text-[11px] text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                "{t.editedMessage || t.preparedMessage}"
              </p>
              <div className="text-[10px] text-slate-400">
                Due: {t.dueDate} {t.approvedByUserId ? `• Approved & Sent` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
