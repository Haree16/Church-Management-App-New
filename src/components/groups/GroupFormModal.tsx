import React, { useState, useEffect, useMemo } from 'react';
import { Group, OrgStatus, Profile } from '@/types/database';
import { CreateGroupPayload } from '@/services/groupService';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar, MapPin, Clock, Layers, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateGroupPayload) => Promise<void>;
  initialData?: Group | null;
  mode?: 'create' | 'edit';
  availableLeaders?: Profile[];
}

export const TERMINOLOGY_OPTIONS = [
  'Small Group',
  'Cell Group',
  'Home Group',
  'Life Group',
  'Bible Study Group',
  'Discipleship Group',
];

export const CATEGORY_OPTIONS = [
  'General Fellowship',
  'Men\'s Group',
  'Women\'s Group',
  'Young Adults & College',
  'Youth & High School',
  'Couples & Marriage',
  'Seniors & Golden Years',
  'Prayer & Intercession',
  'Bible Study',
];

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const isMinistryMatch = (groupCategory: string, minTeams: string[] = []): boolean => {
  if (!groupCategory || !minTeams || minTeams.length === 0) return false;
  const catLower = groupCategory.toLowerCase();
  return minTeams.some((t) => {
    const tLower = t.toLowerCase();
    if (tLower === catLower) return true;
    if (catLower.includes('youth') && tLower.includes('youth')) return true;
    if (catLower.includes('worship') && tLower.includes('worship')) return true;
    if (catLower.includes('prayer') && tLower.includes('prayer')) return true;
    if (catLower.includes('men') && tLower.includes('men')) return true;
    if (catLower.includes('women') && tLower.includes('women')) return true;
    if (catLower.includes('child') && (tLower.includes('child') || tLower.includes('sunday school'))) return true;
    if ((catLower.includes('media') || catLower.includes('tech')) && (tLower.includes('media') || tLower.includes('tech'))) return true;
    if (catLower.includes('fellowship') || catLower.includes('general')) return true;
    return false;
  });
};

export const GroupFormModal: React.FC<GroupFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
  availableLeaders = [],
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [terminology, setTerminology] = useState('Small Group');
  const [category, setCategory] = useState('General Fellowship');
  const [leaderId, setLeaderId] = useState('');
  const [coLeaderId, setCoLeaderId] = useState('');
  const [meetingDay, setMeetingDay] = useState('Tuesday');
  const [meetingTime, setMeetingTime] = useState('07:00 PM');
  const [frequency, setFrequency] = useState('Weekly');
  const [location, setLocation] = useState('Host Home');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState(15);
  const [status, setStatus] = useState<OrgStatus>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterRelevantLeaders, setFilterRelevantLeaders] = useState(false);

  const processedLeaders = useMemo(() => {
    const items = availableLeaders.map((u: any) => {
      const minTeams: string[] = u.ministryTeams || u.ministry_teams || [];
      const isRelevant = isMinistryMatch(category, minTeams);
      return {
        ...u,
        minTeams,
        isRelevant,
      };
    });

    items.sort((a, b) => {
      if (a.isRelevant && !b.isRelevant) return -1;
      if (!a.isRelevant && b.isRelevant) return 1;
      const nameA = a.display_name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || '';
      const nameB = b.display_name || `${b.first_name || ''} ${b.last_name || ''}`.trim() || '';
      return nameA.localeCompare(nameB);
    });

    if (filterRelevantLeaders) {
      return items.filter((u) => u.isRelevant);
    }
    return items;
  }, [availableLeaders, category, filterRelevantLeaders]);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setTerminology(initialData.terminology || 'Small Group');
      setCategory(initialData.category || 'General Fellowship');
      setLeaderId(initialData.leader_id || '');
      setCoLeaderId(initialData.co_leader_id || '');
      setMeetingDay(initialData.meeting_day || 'Tuesday');
      setMeetingTime(initialData.meeting_time || '07:00 PM');
      setFrequency(initialData.frequency || initialData.meeting_frequency || 'Weekly');
      setLocation(initialData.location || 'Host Home');
      setAddress(initialData.address || '');
      setCapacity(initialData.capacity || 15);
      setStatus(initialData.status || 'active');
    } else {
      setName('');
      setDescription('');
      setTerminology('Small Group');
      setCategory('General Fellowship');
      setLeaderId('');
      setCoLeaderId('');
      setMeetingDay('Tuesday');
      setMeetingTime('07:00 PM');
      setFrequency('Weekly');
      setLocation('Host Home');
      setAddress('');
      setCapacity(15);
      setStatus('active');
    }
  }, [initialData, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please specify group name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateGroupPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        leader_id: leaderId || undefined,
        co_leader_id: coLeaderId || undefined,
        meeting_day: meetingDay,
        meeting_time: meetingTime,
        frequency,
        location,
        address: address.trim() || undefined,
        capacity: Number(capacity) || 15,
        status,
      };

      await onSubmit(payload);
      toast.success(mode === 'create' ? `${terminology} created successfully!` : `${terminology} updated!`);
      onClose();
    } catch (err) {
      console.error('Error saving group:', err);
      toast.error('Failed to save group details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-2 border-amber-500/40 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-4 -mx-6 -mt-6 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                {mode === 'create' ? `Create New ${terminology}` : `Edit ${terminology}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Define group details, schedule, leadership, and meeting capacity.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Group Name & Terminology */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Group Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grace & Hope Cell Group"
                className="bg-slate-800 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Terminology</label>
              <Select value={terminology} onValueChange={setTerminology}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Terminology" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {TERMINOLOGY_OPTIONS.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold block">Description</label>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Brief overview of spiritual focus, Bible study topics, or fellowship vision..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs p-2.5 rounded-xl outline-none"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Group Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Status</label>
              <Select value={status} onValueChange={(val: OrgStatus) => setStatus(val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused / Break</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Leaders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Group Leader</label>
              <Select value={leaderId || 'none'} onValueChange={(val) => setLeaderId(val === 'none' ? '' : val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Select primary leader" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60 overflow-y-auto">
                  <SelectItem value="none">-- No Leader Assigned --</SelectItem>
                  {availableLeaders.map((u: any) => {
                    const name = u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.id;
                    return (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {name} {u.email ? `(${u.email})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Co-Leader / Assistant</label>
              <Select value={coLeaderId || 'none'} onValueChange={(val) => setCoLeaderId(val === 'none' ? '' : val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Select co-leader (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60 overflow-y-auto">
                  <SelectItem value="none">-- None --</SelectItem>
                  {availableLeaders.map((u: any) => {
                    const name = u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.id;
                    return (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {name} {u.email ? `(${u.email})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Meeting Day</label>
              <Select value={meetingDay} onValueChange={setMeetingDay}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Meeting Time</label>
              <Input
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                placeholder="e.g. 07:00 PM"
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Frequency</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly (Every 2 weeks)</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Custom">Custom Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location, Address & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Location Type</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Host Home / Room 204"
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Address / Venue</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Church Way or Zoom Link"
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Max Capacity</label>
              <Input
                type="number"
                min={2}
                max={500}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>
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
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
            >
              {isSubmitting ? 'Saving Group...' : mode === 'create' ? `Create ${terminology}` : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
