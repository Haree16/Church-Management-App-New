import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Visitor, UserRole } from '@/types/database';
import { DEMO_MINISTRIES, DEMO_GROUPS, DEMO_FAMILIES } from '@/lib/mockData';
import { Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConvertVisitorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  visitor: Visitor | null;
  onConvert: (visitorId: string, memberPayload: any) => Promise<void>;
}

export function ConvertVisitorDialog({
  isOpen,
  onClose,
  visitor,
  onConvert,
}: ConvertVisitorDialogProps) {
  const [joinedDate, setJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  const [role, setRole] = useState<UserRole>('member');
  const [ministryId, setMinistryId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visitor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConvert(visitor.id, {
        first_name: visitor.first_name,
        last_name: visitor.last_name,
        email: visitor.email || `${visitor.first_name.toLowerCase()}.${visitor.last_name.toLowerCase()}@gracevalley.org`,
        phone: visitor.phone,
        address: visitor.address,
        city: visitor.city,
        state: visitor.state,
        postal_code: visitor.postal_code,
        joined_date: joinedDate,
        role: role,
        ministry_id: ministryId || null,
        group_id: groupId || null,
        family_id: familyId || null,
        notes: `Converted to covenant member from visitor record (First visited: ${visitor.visit_date}). ${notes}`.trim(),
      });
      toast.success(`${visitor.first_name} ${visitor.last_name} successfully converted to church member!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert visitor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "bg-slate-800 border border-slate-700 text-white font-medium text-xs sm:text-sm rounded-xl focus:border-emerald-500 placeholder:text-slate-500";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 text-white border border-slate-800 shadow-2xl p-0 overflow-hidden rounded-3xl">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          {/* Header Banner */}
          <div className="bg-slate-950 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Convert Visitor to Member
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Create a Covenant Member record while preserving guest history.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
            <div className="rounded-2xl bg-emerald-500/10 p-3.5 border border-emerald-500/30 space-y-1">
              <div className="font-extrabold text-white text-sm">
                {visitor.first_name} {visitor.last_name}
              </div>
              <div className="text-slate-300 font-medium">First Visit: {visitor.visit_date} ({visitor.service_attended || 'Sunday Service'})</div>
              <div className="text-slate-400">Email: {visitor.email || 'Not provided'} • Phone: {visitor.phone || 'Not provided'}</div>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-300 block">
                Church Joining Date *
              </label>
              <Input
                type="date"
                value={joinedDate}
                onChange={(e) => setJoinedDate(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-300 block">
                Covenant Role *
              </label>
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger className={inputStyle}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl">
                  <SelectItem value="member">Church Member</SelectItem>
                  <SelectItem value="cell_group_leader">Cell Group Leader</SelectItem>
                  <SelectItem value="group_leader">Small Group Leader</SelectItem>
                  <SelectItem value="ministry_leader">Ministry Leader</SelectItem>
                  <SelectItem value="volunteer">Ministry Volunteer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-300 block">
                Assign to Ministry (Optional)
              </label>
              <Select value={ministryId} onValueChange={setMinistryId}>
                <SelectTrigger className={inputStyle}>
                  <SelectValue placeholder="Select ministry" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl">
                  <SelectItem value="">None / General</SelectItem>
                  {DEMO_MINISTRIES.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-300 block">
                Assign to Small Group (Optional)
              </label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className={inputStyle}>
                  <SelectValue placeholder="Select small group" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl">
                  <SelectItem value="">None / General</SelectItem>
                  {DEMO_GROUPS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-300 block">
                Conversion Notes
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Completed new believers orientation class"
                className={inputStyle}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-950 border-t border-slate-800 p-4 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-extrabold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow transition"
            >
              {isSubmitting ? 'Converting...' : 'Convert to Member'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
