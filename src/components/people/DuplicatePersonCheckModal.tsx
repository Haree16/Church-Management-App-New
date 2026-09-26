import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Visitor, ChurchMember } from '@/types/database';
import { AlertTriangle, Phone, Mail, Calendar } from 'lucide-react';

interface DuplicatePersonCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: {
    visitors: Visitor[];
    members: ChurchMember[];
  };
  onProceedAnyway: () => void;
  onSelectExistingVisitor?: (visitor: Visitor) => void;
  onSelectExistingMember?: (member: ChurchMember) => void;
}

export function DuplicatePersonCheckModal({
  isOpen,
  onClose,
  duplicates,
  onProceedAnyway,
  onSelectExistingVisitor,
  onSelectExistingMember,
}: DuplicatePersonCheckModalProps) {
  const totalMatches = duplicates.visitors.length + duplicates.members.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-slate-900 text-white border border-slate-800 shadow-2xl p-6 rounded-2xl [&>button]:text-slate-400 [&>button:hover]:text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400 font-extrabold text-base">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            Possible Duplicate Found ({totalMatches})
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 font-medium">
            We found matching records in the database with the same phone number, email, or name.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {duplicates.visitors.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Matching Guests / Visitors ({duplicates.visitors.length})
              </h4>
              <div className="space-y-2">
                {duplicates.visitors.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 border rounded-xl bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {v.first_name} {v.last_name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                          {v.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-0.5 mt-1">
                        {v.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-500" /> {v.phone}
                          </div>
                        )}
                        {v.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-slate-500" /> {v.email}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Calendar className="h-3 w-3 text-slate-500" /> First visit: {v.first_visit_date || v.visit_date} (Visits: {v.visit_count || 1})
                        </div>
                      </div>
                    </div>
                    {onSelectExistingVisitor && (
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-xs font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 rounded-lg transition shrink-0"
                        onClick={() => onSelectExistingVisitor(v)}
                      >
                        Record Visit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {duplicates.members.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Matching Church Members ({duplicates.members.length})
              </h4>
              <div className="space-y-2">
                {duplicates.members.map((m) => {
                  const name = m.profile ? `${m.profile.first_name} ${m.profile.last_name}` : 'Church Member';
                  return (
                    <div
                      key={m.id}
                      className="p-3 border rounded-xl bg-slate-800/80 border-emerald-500/40 hover:bg-slate-800 transition-colors flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                            Member ({m.role})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-0.5 mt-1">
                          {m.profile?.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-slate-500" /> {m.profile.phone}
                            </div>
                          )}
                          {m.profile?.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-slate-500" /> {m.profile.email}
                            </div>
                          )}
                        </div>
                      </div>
                      {onSelectExistingMember && (
                        <button
                          type="button"
                          className="px-2.5 py-1.5 text-xs font-semibold border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 rounded-lg transition shrink-0"
                          onClick={() => onSelectExistingMember(m)}
                        >
                          View Member
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-extrabold text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-xl transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceedAnyway}
            className="px-4 py-2 text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl shadow-lg transition"
          >
            Create New Visitor Record
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
