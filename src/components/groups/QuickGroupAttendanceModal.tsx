import React, { useState, useEffect } from 'react';
import { Group, GroupMember, ChurchMember, GroupAttendanceRecord } from '@/types/database';
import { groupService } from '@/services/groupService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCheck, CheckCircle2, Search, Calendar, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';

interface QuickGroupAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  groupMembers: GroupMember[];
  onAttendanceSaved: () => void;
  editingRecord?: GroupAttendanceRecord | null;
}

export const QuickGroupAttendanceModal: React.FC<QuickGroupAttendanceModalProps> = ({
  isOpen,
  onClose,
  group,
  groupMembers,
  onAttendanceSaved,
  editingRecord,
}) => {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingRecord) {
        setSessionDate(editingRecord.session_date);
        setTopic(editingRecord.topic || '');
        setNotes(editingRecord.notes || '');
        setSelectedMemberIds(editingRecord.attendee_ids || []);
      } else {
        // By default pre-check all active group members for fast single-tap confirmation
        const activeIds = groupMembers.map((gm) => gm.member_id || gm.user_id).filter(Boolean) as string[];
        setSelectedMemberIds(activeIds);
        setSessionDate(new Date().toISOString().split('T')[0]);
        setTopic('');
        setNotes('');
      }
      setSearchTerm('');
    }
  }, [isOpen, groupMembers, editingRecord]);

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = groupMembers.map((gm) => gm.member_id || gm.user_id).filter(Boolean) as string[];
    setSelectedMemberIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await groupService.updateGroupAttendance(group.church_id, editingRecord.id, {
          sessionDate,
          attendeeIds: selectedMemberIds,
          topic: topic.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success('Attendance session updated!');
      } else {
        await groupService.logGroupAttendance(
          group.church_id,
          group.id,
          sessionDate,
          selectedMemberIds,
          topic.trim() || undefined,
          notes.trim() || undefined
        );
        toast.success(`Recorded attendance: ${selectedMemberIds.length} present!`);
      }
      onAttendanceSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save group attendance:', err);
      toast.error('Failed to save group attendance record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = groupMembers.filter((gm) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = gm.church_member
      ? `${gm.church_member.profile?.first_name || ''} ${gm.church_member.profile?.last_name || ''}`.toLowerCase()
      : (gm.profile?.display_name || '').toLowerCase();
    return name.includes(term);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900 text-white border-2 border-emerald-500/40 p-5 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-3 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-4 -mx-5 -mt-5 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                {editingRecord ? 'Edit Group Attendance Session' : 'Quick 60-Second Meeting Attendance'}
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                  {editingRecord ? 'Edit Record' : 'Fast Check-in'}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {group.name} • {group.terminology || 'Small Group'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Session Date & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold block">Meeting Date *</label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold block">Study Topic / Scripture</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Romans 8: Life in the Spirit"
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          {/* Quick Select All Toolbar */}
          <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">
                {selectedMemberIds.length} of {groupMembers.length} Present
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                Mark All Present
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member checklist..."
              className="pl-8 bg-slate-800 border-slate-700 text-white text-xs h-8"
            />
          </div>

          {/* Member Checklist List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No members found in this group.</p>
            ) : (
              filteredMembers.map((gm) => {
                const memberId = gm.member_id || gm.user_id;
                const isChecked = selectedMemberIds.includes(memberId);
                const name = gm.church_member
                  ? `${gm.church_member.profile?.first_name || ''} ${gm.church_member.profile?.last_name || ''}`.trim()
                  : gm.profile?.display_name || 'Group Member';

                return (
                  <div
                    key={gm.id}
                    onClick={() => toggleMemberSelection(memberId)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent div
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer pointer-events-none"
                      />
                      <div>
                        <span className="font-bold text-xs text-white block">{name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{gm.role}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isChecked ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {isChecked ? 'PRESENT' : 'ABSENT'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-semibold block">General Meeting Summary / Notes</label>
            <textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="General fellowship highlights or upcoming meeting plans..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs p-2.5 rounded-xl outline-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold border border-slate-600 text-xs px-4 py-2 shadow-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5"
            >
              {isSubmitting ? 'Saving...' : 'Save Group Attendance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
