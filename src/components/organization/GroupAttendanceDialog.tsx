import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, Square, Calendar, BookOpen } from 'lucide-react';
import { GroupMember } from '@/types/database';
import { toast } from 'sonner';
import { resolveGroupMemberName } from '@/components/groups/QuickGroupAttendanceModal';

interface GroupAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  members: GroupMember[];
  onSave: (sessionDate: string, attendeeIds: string[], topic?: string, notes?: string) => Promise<void>;
}

export function GroupAttendanceDialog({
  isOpen,
  onClose,
  groupId,
  groupName,
  members,
  onSave,
}: GroupAttendanceDialogProps) {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize selected members on open
  React.useEffect(() => {
    if (isOpen) {
      setSelectedMemberIds(members.map((m) => m.member_id || m.user_id));
      setSessionDate(new Date().toISOString().split('T')[0]);
      setTopic('');
      setNotes('');
    }
  }, [isOpen, members]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedMemberIds(members.map((m) => m.member_id || m.user_id));
  };

  const clearAll = () => {
    setSelectedMemberIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionDate) {
      toast.error('Please select meeting session date');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(sessionDate, selectedMemberIds, topic, notes);
      toast.success(`Attendance logged (${selectedMemberIds.length}/${members.length} present)`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-sky-600" />
              Log Group Attendance
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record attendance for weekly small group meeting for <strong>{groupName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Meeting Date *
                </label>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Total Enrolled
                </label>
                <div className="h-9 flex items-center px-3 rounded-md bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedMemberIds.length} / {members.length} Present
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bible Study Topic / Lesson
              </label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Romans 8: Life in the Spirit"
                icon={<BookOpen className="h-4 w-4" />}
              />
            </div>

            {/* Member Checkboxes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mark Present Members
                </label>
                <div className="flex gap-2 text-[11px]">
                  <button type="button" onClick={selectAll} className="text-sky-600 hover:underline">
                    Select All
                  </button>
                  <span>•</span>
                  <button type="button" onClick={clearAll} className="text-slate-500 hover:underline">
                    Clear
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {members.length === 0 ? (
                  <p className="text-xs text-slate-500 p-2 text-center">No enrolled members to track</p>
                ) : (
                  members.map((m) => {
                    const mId = m.member_id || m.user_id;
                    const isChecked = selectedMemberIds.includes(mId);
                    const memberName = resolveGroupMemberName(m);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMember(mId)}
                        className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {memberName}
                          </span>
                          <span className="text-[10px] text-slate-400">({m.role})</span>
                        </div>

                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Session Notes & Prayer Highlights
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Discussion notes, special guests, prayer items..."
                rows={2}
                className="w-full rounded-md border border-slate-200 bg-transparent p-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-800"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-sky-600 hover:bg-sky-700 text-white">
              Save Attendance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
