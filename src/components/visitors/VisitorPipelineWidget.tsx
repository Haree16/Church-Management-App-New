import React from 'react';
import { Visitor, VisitorStatus } from '@/types/database';
import { UserCheck, ChevronRight } from 'lucide-react';

interface VisitorPipelineWidgetProps {
  visitors: Visitor[];
  onSelectVisitor: (visitor: Visitor) => void;
  onStatusChange: (visitorId: string, newStatus: VisitorStatus) => void;
}

const STAGES: { key: VisitorStatus; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'new', label: 'New Guests', color: 'text-emerald-400', bgColor: 'bg-slate-900', borderColor: 'border-emerald-800/80' },
  { key: 'contact_pending', label: 'Contact Pending', color: 'text-amber-400', bgColor: 'bg-slate-900', borderColor: 'border-amber-800/80' },
  { key: 'contacted', label: 'Contacted', color: 'text-sky-400', bgColor: 'bg-slate-900', borderColor: 'border-sky-800/80' },
  { key: 'follow_up_scheduled', label: 'Follow-up Due', color: 'text-indigo-400', bgColor: 'bg-slate-900', borderColor: 'border-indigo-800/80' },
  { key: 'follow_up_completed', label: 'Follow-up Done', color: 'text-purple-400', bgColor: 'bg-slate-900', borderColor: 'border-purple-800/80' },
  { key: 'returned_visitor', label: 'Returned Visitor', color: 'text-teal-400', bgColor: 'bg-slate-900', borderColor: 'border-teal-800/80' },
  { key: 'regular_attendee', label: 'Regular Attendee', color: 'text-cyan-400', bgColor: 'bg-slate-900', borderColor: 'border-cyan-800/80' },
  { key: 'became_member', label: 'Became Member', color: 'text-violet-400', bgColor: 'bg-slate-900', borderColor: 'border-violet-800/80' },
];

export function VisitorPipelineWidget({ visitors, onSelectVisitor }: VisitorPipelineWidgetProps) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between text-white">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" /> Visitor Journey Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Track visitors through stages from first Sunday attendance to member conversion.
          </p>
        </div>
      </div>

      {/* Horizontal Stage Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const stageVisitors = visitors.filter((v) => v.status === stage.key);
          return (
            <div
              key={stage.key}
              className={`rounded-2xl border ${stage.borderColor} ${stage.bgColor} p-3 flex flex-col justify-between min-h-[320px] shadow-lg text-white`}
            >
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                  <h4 className={`text-xs font-black uppercase tracking-tight ${stage.color}`}>{stage.label}</h4>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-slate-950 text-slate-200 border border-slate-700">
                    {stageVisitors.length}
                  </span>
                </div>

                <div className="space-y-2 mt-2">
                  {stageVisitors.length === 0 ? (
                    <div className="text-[11px] text-slate-500 font-semibold italic text-center py-8">No guests</div>
                  ) : (
                    stageVisitors.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => onSelectVisitor(v)}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-md hover:shadow-xl cursor-pointer transition hover:border-amber-500/60 group text-white"
                      >
                        <div className="font-extrabold text-white text-xs group-hover:text-amber-400 transition flex items-center justify-between">
                          <span>
                            {v.first_name} {v.last_name}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-1 space-y-0.5">
                          {v.phone && <div>📞 {v.phone}</div>}
                          <div>📅 {v.visit_date}</div>
                          {(v.visit_count || 1) > 1 && (
                            <div className="text-amber-400 font-extrabold">🔁 {v.visit_count} visits</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
