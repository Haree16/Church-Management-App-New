import React, { useState, useEffect } from 'react';
import { FollowUp } from '@/types/database';
import { followUpService } from '@/services/followUpService';
import { visitorService } from '@/services/visitorService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Clock, CheckCircle2, AlertTriangle, Phone, Mail, Calendar, Check, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface FollowUpQueueViewProps {
  churchId: string;
  currentUserId?: string;
  onSelectVisitor?: (visitorId: string) => void;
}

export function FollowUpQueueView({ churchId, currentUserId, onSelectVisitor }: FollowUpQueueViewProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed' | 'all'>('today');
  const [scopeTab, setScopeTab] = useState<'my' | 'team'>('my');

  // Complete FollowUp Modal State
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [outcome, setOutcome] = useState('Connected - Welcomed & Prayed');
  const [completionNotes, setCompletionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFollowUps();
  }, [churchId]);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const data = await followUpService.getFollowUps(churchId);
      setFollowUps(data);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredFollowUps = followUps.filter((f) => {
    if (scopeTab === 'my' && currentUserId && f.assigned_to !== currentUserId) {
      return false;
    }

    const dueDate = f.due_date ? f.due_date.split('T')[0] : '';

    if (filterTab === 'completed') return f.status === 'completed';
    if (f.status === 'completed') return false;

    if (filterTab === 'overdue') return dueDate < todayStr;
    if (filterTab === 'today') return dueDate === todayStr;
    if (filterTab === 'upcoming') return dueDate > todayStr;

    return true;
  });

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    setSubmitting(true);
    try {
      await followUpService.completeFollowUp(churchId, selectedFollowUp.id, outcome, completionNotes);
      if (selectedFollowUp.visitor_id) {
        await visitorService.updateVisitor(churchId, selectedFollowUp.visitor_id, {
          status: 'follow_up_completed',
        });
      }
      toast.success('Follow-up task completed!');
      setSelectedFollowUp(null);
      setCompletionNotes('');
      fetchFollowUps();
    } catch (err: any) {
      toast.error('Failed to complete follow-up task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Banner */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" /> Visitor Follow-up & Care Queue
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage pastoral calls, welcome check-ins, and small group connection tasks.
          </p>
        </div>

        <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs shrink-0 border border-slate-700">
          <button
            className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
              scopeTab === 'my' ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setScopeTab('my')}
          >
            My Assigned Tasks
          </button>
          <button
            className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
              scopeTab === 'team' ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setScopeTab('team')}
          >
            Entire Team Queue
          </button>
        </div>
      </div>

      {/* Date Filter Pills */}
      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none text-xs">
        <span className="text-slate-400 font-medium px-1 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> Due Filter:
        </span>
        {[
          { key: 'today', label: 'Due Today', icon: Calendar },
          { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
          { key: 'upcoming', label: 'Upcoming', icon: Clock },
          { key: 'completed', label: 'Completed', icon: CheckCircle2 },
          { key: 'all', label: 'All Tasks', icon: Calendar },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterTab(f.key as any)}
            className={`px-3 py-1.5 rounded-xl border font-bold shrink-0 transition flex items-center gap-1.5 ${
              filterTab === f.key
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-extrabold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs font-semibold shadow-xl">
            Loading follow-up tasks...
          </div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs font-medium shadow-xl">
            No follow-up tasks match this filter.
          </div>
        ) : (
          filteredFollowUps.map((task) => (
            <div
              key={task.id}
              className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-white"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-white text-sm sm:text-base">{task.title}</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      task.priority === 'urgent' || task.priority === 'high'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {task.priority} Priority
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold flex-wrap">
                  <span className="text-amber-300 font-bold">👤 {task.person_name || 'Guest Visitor'}</span>
                  {task.person_phone && (
                    <a href={`tel:${task.person_phone}`} className="hover:text-amber-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {task.person_phone}
                    </a>
                  )}
                  {task.person_email && (
                    <a href={`mailto:${task.person_email}`} className="hover:text-amber-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> {task.person_email}
                    </a>
                  )}
                  <span>📅 Due: {task.due_date}</span>
                </div>

                {task.notes && <p className="text-xs text-slate-300 font-medium">{task.notes}</p>}
                {task.outcome && (
                  <div className="text-xs font-bold text-emerald-300 bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-800/60">
                    Outcome: {task.outcome}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {task.visitor_id && onSelectVisitor && (
                  <button
                    onClick={() => onSelectVisitor(task.visitor_id!)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
                  >
                    View Guest 360°
                  </button>
                )}

                {task.status !== 'completed' && (
                  <button
                    onClick={() => setSelectedFollowUp(task)}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Complete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Complete Follow-up Modal */}
      {selectedFollowUp && (
        <Dialog open={!!selectedFollowUp} onOpenChange={(open) => !open && setSelectedFollowUp(null)}>
          <DialogContent className="max-w-md bg-slate-900 text-white border-2 border-emerald-500/40 p-6 rounded-2xl shadow-2xl">
            <form onSubmit={handleCompleteSubmit}>
              <DialogHeader className="border-b border-slate-800 pb-3">
                <DialogTitle className="text-base font-extrabold text-white">Complete Guest Follow-up</DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Record outcome for {selectedFollowUp.person_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Interaction Outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500"
                  >
                    <option value="Connected - Welcomed & Prayed">Connected - Welcomed & Prayed</option>
                    <option value="Connected - Interested in Small Groups">Connected - Interested in Small Groups</option>
                    <option value="Connected - Scheduled Pastoral Visit">Connected - Scheduled Pastoral Visit</option>
                    <option value="Connected - Wants to Join Church">Connected - Wants to Join Church</option>
                    <option value="Left Voicemail / Text Sent">Left Voicemail / Text Sent</option>
                    <option value="Requested No Further Contact">Requested No Further Contact</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Pastoral Notes</label>
                  <textarea
                    rows={3}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Details of conversation, prayer needs, or small group connection..."
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedFollowUp(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow"
                >
                  {submitting ? 'Saving...' : 'Save & Mark Complete'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
