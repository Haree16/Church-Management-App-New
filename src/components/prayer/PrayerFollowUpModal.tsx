import React, { useState } from 'react';
import { EnhancedPrayerRequest, PrayerFollowUpNote } from '@/types/prayerMinistry';
import { SaaSUser } from '@/types';
import { X, MessageSquare, Plus, Clock, ShieldCheck, Heart, Send } from 'lucide-react';

interface PrayerFollowUpModalProps {
  isOpen: boolean;
  request: EnhancedPrayerRequest | null;
  currentUser?: SaaSUser | null;
  onClose: () => void;
  onAddNote: (requestId: string, note: PrayerFollowUpNote) => void;
}

export const PrayerFollowUpModal: React.FC<PrayerFollowUpModalProps> = ({
  isOpen,
  request,
  currentUser,
  onClose,
  onAddNote,
}) => {
  const [noteText, setNoteText] = useState('');

  if (!isOpen || !request) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const newNote: PrayerFollowUpNote = {
      id: `fn-${Date.now()}`,
      prayer_request_id: request.id,
      author_id: currentUser?.id,
      author_name: currentUser?.name || 'Intercessor',
      author_role: currentUser?.role || 'Prayer Team Member',
      note: noteText.trim(),
      created_at: new Date().toISOString(),
    };

    onAddNote(request.id, newNote);
    setNoteText('');
  };

  const notes = request.follow_up_notes || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Prayer Follow-Up & Pastoral Care</h3>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                For: <span className="text-white font-medium">{request.title}</span> ({request.author_name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Original Request Synopsis */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-bold uppercase tracking-wider text-amber-400">Original Request</span>
              <span>{new Date(request.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-slate-300 text-xs italic">"{request.description}"</p>
          </div>

          {/* Add New Follow-Up Note Form */}
          <form onSubmit={handleAddSubmit} className="space-y-2 bg-slate-850 p-3.5 rounded-2xl border border-slate-750">
            <label className="font-bold text-white text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Record Prayer Touch / Pastoral Update</span>
            </label>
            <textarea
              rows={3}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Called and interceded over phone; member reported reduced pain. Follow-up planned next Tuesday..."
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                Visible only to prayer leaders & caregivers
              </span>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Touch</span>
              </button>
            </div>
          </form>

          {/* Follow-up History Timeline */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-300">Care History ({notes.length})</h4>
              <span className="text-[10px] text-slate-500">Chronological</span>
            </div>

            {notes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                No follow-up notes recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{n.author_name}</span>
                        <span className="bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                          {n.author_role}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 flex justify-end bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
