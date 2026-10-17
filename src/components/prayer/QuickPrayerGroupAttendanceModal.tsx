import React, { useState, useEffect } from 'react';
import { PrayerGroup, PrayerGroupMember, PrayerGroupAttendanceRecord } from '@/types/prayerMinistry';
import { prayerMinistryService } from '@/services/prayerMinistryService';
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
import { Calendar, Zap, Users, Search, CheckCircle2, X, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface QuickPrayerGroupAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: PrayerGroup;
  groupMembers: PrayerGroupMember[];
  onAttendanceSaved: () => void;
  editingRecord?: PrayerGroupAttendanceRecord | null;
  onOpenWhatsAppReport?: (
    record: PrayerGroupAttendanceRecord,
    present: { id: string; name: string; phone?: string }[],
    absent: { id: string; name: string; phone?: string }[]
  ) => void;
}

export const QuickPrayerGroupAttendanceModal: React.FC<QuickPrayerGroupAttendanceModalProps> = ({
  isOpen,
  onClose,
  group,
  groupMembers,
  onAttendanceSaved,
  editingRecord,
  onOpenWhatsAppReport,
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
        // By default pre-select all active members for fast one-tap logging
        const activeIds = groupMembers
          .filter((gm) => gm.status === 'Active')
          .map((gm) => gm.member_id || gm.id);
        setSelectedMemberIds(activeIds);
        setSessionDate(new Date().toISOString().split('T')[0]);
        setTopic('');
        setNotes('');
      }
      setSearchTerm('');
    }
  }, [isOpen, groupMembers, editingRecord]);

  if (!isOpen) return null;

  const isChecked = (gm: PrayerGroupMember) => {
    const id = gm.member_id || gm.id;
    return selectedMemberIds.includes(id) || selectedMemberIds.includes(gm.id);
  };

  const toggleMember = (gm: PrayerGroupMember) => {
    const id = gm.member_id || gm.id;
    setSelectedMemberIds((prev) => {
      if (isChecked(gm)) {
        return prev.filter((item) => item !== id && item !== gm.id && item !== gm.member_id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    const allIds = groupMembers.map((gm) => gm.member_id || gm.id);
    setSelectedMemberIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionDate) {
      toast.error('Please specify a session date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await prayerMinistryService.updatePrayerGroupAttendance(group.church_id, editingRecord.id, {
          sessionDate,
          attendeeIds: selectedMemberIds,
          topic: topic.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success('Prayer session attendance updated!');
      } else {
        await prayerMinistryService.logPrayerGroupAttendance(
          group.church_id,
          group.id,
          sessionDate,
          selectedMemberIds,
          topic.trim() || undefined,
          notes.trim() || undefined
        );
        toast.success(`Recorded attendance: ${selectedMemberIds.length} intercessors present!`);
      }
      onAttendanceSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save prayer attendance:', err);
      toast.error('Failed to save prayer attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndWhatsApp = async () => {
    if (!sessionDate) {
      toast.error('Please specify a session date.');
      return;
    }

    setIsSubmitting(true);
    try {
      let savedRecord: PrayerGroupAttendanceRecord;
      if (editingRecord) {
        savedRecord = await prayerMinistryService.updatePrayerGroupAttendance(group.church_id, editingRecord.id, {
          sessionDate,
          attendeeIds: selectedMemberIds,
          topic: topic.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success('Prayer session attendance updated!');
      } else {
        savedRecord = await prayerMinistryService.logPrayerGroupAttendance(
          group.church_id,
          group.id,
          sessionDate,
          selectedMemberIds,
          topic.trim() || undefined,
          notes.trim() || undefined
        );
        toast.success(`Recorded attendance: ${selectedMemberIds.length} intercessors present!`);
      }
      onAttendanceSaved();
      onClose();

      if (onOpenWhatsAppReport) {
        const presentObjs: { id: string; name: string; phone?: string }[] = [];
        const absentObjs: { id: string; name: string; phone?: string }[] = [];
        groupMembers.forEach((gm) => {
          const mId = gm.member_id || gm.id;
          const name = gm.member_name || 'Intercessor';
          const phone = gm.member_phone || '';
          if (isChecked(gm)) {
            presentObjs.push({ id: mId, name, phone });
          } else {
            absentObjs.push({ id: mId, name, phone });
          }
        });
        onOpenWhatsAppReport(savedRecord, presentObjs, absentObjs);
      }
    } catch (err) {
      console.error('Failed to save prayer attendance:', err);
      toast.error('Failed to save prayer attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = groupMembers.filter((gm) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const name = (gm.member_name || '').toLowerCase();
    const phone = (gm.member_phone || '').toLowerCase();
    const role = (gm.role || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || role.includes(q);
  });

  const presentCount = groupMembers.filter((gm) => isChecked(gm)).length;
  const absentCount = groupMembers.length - presentCount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-2 border-emerald-500/40 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-3 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-4 -mx-6 -mt-6 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                {editingRecord ? 'Edit Attendance Session' : 'Quick Prayer Group Attendance'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {group.name} • Record attendee intercessors and prayer focus
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Session Date & Prayer Focus Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Session Date *
              </label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">
                Prayer Theme / Scripture Focus
              </label>
              <Input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Psalms 91 Watch, City Revival"
                className="bg-slate-800 border-slate-700 text-white text-xs h-9"
              />
            </div>
          </div>

          {/* Intercession Notes / Praise Reports */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold block">
              Session Prayer Notes & Praise Reports
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record specific prayer points raised, testimonies, or follow-up needs..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Member Roster Checklist Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Roster Checklist ({groupMembers.length})
                </span>
                <Badge variant="outline" className="bg-emerald-950/80 text-emerald-300 border-emerald-800/80 text-[10px] font-bold">
                  ✓ {presentCount} Present
                </Badge>
                {absentCount > 0 && (
                  <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">
                    ✕ {absentCount} Absent
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-[11px] transition"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Quick Member Filter Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search member name or phone..."
                className="pl-8 bg-slate-800 border-slate-700 text-white text-xs h-8"
              />
            </div>

            {/* Member Checkbox Grid / List */}
            {groupMembers.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">
                No members enrolled in this prayer group yet. Add members to track attendance.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredMembers.map((gm) => {
                  const checked = isChecked(gm);
                  return (
                    <div
                      key={gm.id}
                      onClick={() => toggleMember(gm)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                        checked
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-xs'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                            checked
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {checked ? '✓' : gm.member_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className={`font-bold block ${checked ? 'text-white' : 'text-slate-300'}`}>
                            {gm.member_name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Role: <strong className="text-amber-300">{gm.role}</strong>
                            {gm.member_phone ? ` • 📞 ${gm.member_phone}` : ''}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 font-bold ${
                          checked
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {checked ? '✓ Present' : 'Absent'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold border border-slate-600 text-xs px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || groupMembers.length === 0}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-600 text-xs px-4 py-2"
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              {editingRecord ? 'Update' : 'Save Only'}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndWhatsApp}
              disabled={isSubmitting || groupMembers.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 shadow flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Save & WhatsApp</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
