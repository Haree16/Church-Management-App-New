import React, { useState, useEffect } from 'react';
import { Group, GroupMember, ChurchMember, GroupAttendanceRecord } from '@/types/database';
import { groupService } from '@/services/groupService';
import { getStoredMembers } from '@/utils/storage';
import { DEMO_MEMBERS } from '@/lib/mockData';
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
import { UserCheck, CheckCircle2, Search, Calendar, Zap, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export function resolveGroupMemberName(gm: GroupMember, allMembers?: any[]): string {
  // 1. Direct name property on gm
  if ((gm as any).name && (gm as any).name !== 'Group Member') return (gm as any).name;
  if ((gm as any).memberName) return (gm as any).memberName;
  if ((gm as any).display_name && (gm as any).display_name !== 'Group Member') return (gm as any).display_name;

  // 2. Profile directly on gm
  if (gm.profile) {
    const fn = gm.profile.first_name || '';
    const ln = gm.profile.last_name || '';
    const fullName = `${fn} ${ln}`.trim();
    if (fullName) return fullName;
    if (gm.profile.display_name && gm.profile.display_name !== 'Group Member') {
      return gm.profile.display_name;
    }
  }

  // 3. Church Member object on gm
  if (gm.church_member) {
    const cm = gm.church_member as any;
    if (cm.profile) {
      const fn = cm.profile.first_name || '';
      const ln = cm.profile.last_name || '';
      const fullName = `${fn} ${ln}`.trim();
      if (fullName) return fullName;
      if (cm.profile.display_name && cm.profile.display_name !== 'Group Member') {
        return cm.profile.display_name;
      }
    }
    const fn = cm.firstName || cm.first_name || '';
    const ln = cm.lastName || cm.last_name || '';
    const fullName = `${fn} ${ln}`.trim();
    if (fullName) return fullName;
    if (cm.name && cm.name !== 'Group Member') return cm.name;
    if (cm.display_name && cm.display_name !== 'Group Member') return cm.display_name;
  }

  // 4. Look up in allMembers prop, local stored members, and demo members
  const targetId = gm.member_id || (gm as any).memberId || gm.user_id || gm.id;
  const lookupPool: any[] = [
    ...(Array.isArray(allMembers) ? allMembers : []),
    ...(getStoredMembers() || []),
    ...(DEMO_MEMBERS || [])
  ];

  if (targetId || gm.profile?.email) {
    const found: any = lookupPool.find((m: any) =>
      (targetId && (m.id === targetId || m.user_id === targetId || m.userId === targetId)) ||
      (gm.profile?.email && (m.email === gm.profile.email || m.profile?.email === gm.profile.email))
    );

    if (found) {
      if (found.name && found.name !== 'Group Member') return found.name;
      const fn = found.firstName || found.first_name || found.profile?.first_name || '';
      const ln = found.lastName || found.last_name || found.profile?.last_name || '';
      const fullName = `${fn} ${ln}`.trim();
      if (fullName) return fullName;
      if (found.profile?.display_name && found.profile?.display_name !== 'Group Member') {
        return found.profile?.display_name;
      }
    }
  }

  // 5. Fallback
  return gm.profile?.display_name || 'Group Member';
}

export function getMemberInitials(name: string): string {
  if (!name || name === 'Group Member') return 'GM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface QuickGroupAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  groupMembers: GroupMember[];
  allMembers?: any[];
  onAttendanceSaved: () => void;
  editingRecord?: GroupAttendanceRecord | null;
  onOpenWhatsAppReport?: (
    record: GroupAttendanceRecord,
    present: { id: string; name: string; phone?: string }[],
    absent: { id: string; name: string; phone?: string }[]
  ) => void;
}

export const QuickGroupAttendanceModal: React.FC<QuickGroupAttendanceModalProps> = ({
  isOpen,
  onClose,
  group,
  groupMembers,
  allMembers,
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
        // By default pre-check all active group members for fast single-tap confirmation
        const activeIds = groupMembers.map((gm) => gm.member_id || gm.user_id || gm.id).filter(Boolean) as string[];
        setSelectedMemberIds(activeIds);
        setSessionDate(new Date().toISOString().split('T')[0]);
        setTopic('');
        setNotes('');
      }
      setSearchTerm('');
    }
  }, [isOpen, groupMembers, editingRecord]);

  const isMemberChecked = (gm: GroupMember) => {
    const primaryId = gm.member_id || gm.user_id || gm.id;
    return Boolean(
      (primaryId && selectedMemberIds.includes(primaryId)) ||
      (gm.member_id && selectedMemberIds.includes(gm.member_id)) ||
      (gm.user_id && selectedMemberIds.includes(gm.user_id)) ||
      (gm.id && selectedMemberIds.includes(gm.id))
    );
  };

  const toggleMemberSelection = (gm: GroupMember) => {
    const primaryId = gm.member_id || gm.user_id || gm.id;
    const currentlyChecked = isMemberChecked(gm);
    setSelectedMemberIds((prev) => {
      if (currentlyChecked) {
        return prev.filter(
          (id) =>
            id !== primaryId &&
            id !== gm.member_id &&
            id !== gm.user_id &&
            id !== gm.id
        );
      } else {
        return [...prev, primaryId];
      }
    });
  };

  const handleSelectAll = () => {
    const allIds = groupMembers.map((gm) => gm.member_id || gm.user_id || gm.id).filter(Boolean) as string[];
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

  const handleSaveAndWhatsApp = async () => {
    setIsSubmitting(true);
    try {
      let savedRecord: GroupAttendanceRecord;
      if (editingRecord) {
        savedRecord = await groupService.updateGroupAttendance(group.church_id, editingRecord.id, {
          sessionDate,
          attendeeIds: selectedMemberIds,
          topic: topic.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success('Attendance session updated!');
      } else {
        savedRecord = await groupService.logGroupAttendance(
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

      if (onOpenWhatsAppReport) {
        const presentObjs: { id: string; name: string; phone?: string }[] = [];
        const absentObjs: { id: string; name: string; phone?: string }[] = [];
        groupMembers.forEach((gm) => {
          const mId = gm.member_id || gm.user_id || gm.id;
          const name = resolveGroupMemberName(gm, allMembers);
          const found: any = (allMembers || []).find((m: any) => m.id === mId || m.user_id === mId);
          const phone = (gm as any).phone || (gm as any).profile?.phone || found?.phone || found?.profile?.phone || '';
          if (isMemberChecked(gm)) {
            presentObjs.push({ id: mId, name, phone });
          } else {
            absentObjs.push({ id: mId, name, phone });
          }
        });
        onOpenWhatsAppReport(savedRecord, presentObjs, absentObjs);
      }
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
    const name = resolveGroupMemberName(gm, allMembers).toLowerCase();
    const role = (gm.role || '').toLowerCase();
    return name.includes(term) || role.includes(term);
  });

  const presentCount = groupMembers.filter((gm) => isMemberChecked(gm)).length;

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
                {presentCount} of {groupMembers.length} Present
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
                const isChecked = isMemberChecked(gm);
                const name = resolveGroupMemberName(gm, allMembers);
                const initials = getMemberInitials(name);
                const avatarUrl = gm.profile?.avatar_url || (gm.church_member as any)?.avatarUrl || (gm.church_member as any)?.avatar_url;

                return (
                  <div
                    key={gm.id}
                    onClick={() => toggleMemberSelection(gm)}
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
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 text-emerald-300 font-bold text-xs">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-white block">{name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{gm.role || 'Member'}</span>
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
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-600 text-xs px-4"
            >
              {isSubmitting ? 'Saving...' : 'Save Only'}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndWhatsApp}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 shadow flex items-center gap-1.5"
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
