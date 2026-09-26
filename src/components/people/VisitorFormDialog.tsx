import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Visitor, VisitorStatus } from '@/types/database';
import { CreateVisitorPayload } from '@/services/visitorService';
import { getStoredUsers, getStoredMembers, getAllStoredChurchSettings, getDefaultChurchSettings, getStoredAuthSession } from '@/utils/storage';
import { UserCheck, Phone, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

export interface PastoralLeaderOption {
  id: string;
  name: string;
  title?: string;
  role?: string;
  email?: string;
}

export interface ChurchServiceOption {
  id: string;
  name: string;
  time?: string;
}

interface VisitorFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateVisitorPayload) => Promise<void>;
  initialData?: Visitor | null;
  mode?: 'create' | 'edit';
  churchId?: string;
  availableLeaders?: PastoralLeaderOption[];
  availableServices?: ChurchServiceOption[];
}

export function VisitorFormDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  churchId,
  availableLeaders,
  availableServices,
}: VisitorFormDialogProps) {
  const leadersList = useMemo<PastoralLeaderOption[]>(() => {
    if (availableLeaders && availableLeaders.length > 0) {
      return availableLeaders;
    }

    const leaders: PastoralLeaderOption[] = [];
    const seenIds = new Set<string>();

    // 1. Qualified SaaS Users
    const users = getStoredUsers();
    users.forEach((u) => {
      if (churchId && u.church_id && u.church_id !== churchId && u.churchId !== churchId && u.role !== 'SuperAdmin') {
        return;
      }
      const isLeadershipRole = ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'MinistryLeader', 'Staff'].includes(u.role);
      const isPastoralDesignation = Boolean(
        u.designation && /pastor|minister|elder|reverend|bishop|leader|clergy|admin/i.test(u.designation)
      );

      if (isLeadershipRole || isPastoralDesignation) {
        if (!seenIds.has(u.id)) {
          seenIds.add(u.id);
          leaders.push({
            id: u.id,
            name: u.name,
            title: u.designation || (u.role === 'SuperAdmin' ? 'Super Administrator' : u.role === 'PastorAdmin' ? 'Senior Pastor' : u.role === 'AssistantPastor' ? 'Assistant Pastor' : u.role === 'MinistryLeader' ? 'Ministry Leader' : u.role || 'Pastoral Staff'),
            role: u.role,
            email: u.email,
          });
        }
      }
    });

    // 2. Qualified Members
    const members = getStoredMembers();
    members.forEach((m) => {
      if (churchId && m.churchId && m.churchId !== churchId && m.church_id !== churchId) {
        return;
      }
      const isPastoralStatus = ['Pastor', 'Assistant Pastor', 'Leader', 'Clergy/Staff'].includes(m.status);
      const hasPastoralTeams = Boolean(
        m.ministryTeams && m.ministryTeams.some((t: string) => /pastor|leader|clergy|elder/i.test(t))
      );

      if (isPastoralStatus || hasPastoralTeams) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          leaders.push({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`.trim(),
            title: m.status || 'Leader',
            role: m.status,
            email: m.email,
          });
        }
      }
    });

    // 3. Fallback: logged in user
    const session = getStoredAuthSession();
    if (session?.user && !seenIds.has(session.user.id)) {
      leaders.unshift({
        id: session.user.id,
        name: session.user.name,
        title: session.user.designation || session.user.role || 'Staff',
        role: session.user.role,
        email: session.user.email,
      });
    }

    return leaders;
  }, [availableLeaders, churchId]);

  const servicesList = useMemo<ChurchServiceOption[]>(() => {
    if (availableServices && availableServices.length > 0) {
      return availableServices;
    }

    const allSettings = getAllStoredChurchSettings();
    const churchSettings = (churchId ? allSettings[churchId] : null) || getDefaultChurchSettings(churchId || 'church-1');
    if (churchSettings?.services && churchSettings.services.length > 0) {
      return churchSettings.services.map((s) => ({
        id: s.id,
        name: s.name,
        time: s.startTime,
      }));
    }

    return [
      { id: 'st-1', name: 'Sunday Morning Worship Service', time: '08:30 AM' },
      { id: 'st-2', name: 'Sunday Evening Service', time: '06:00 PM' },
      { id: 'st-3', name: 'Wednesday Prayer & Bible Study', time: '07:00 PM' },
      { id: 'st-4', name: 'Youth Fellowship', time: '07:30 PM' },
    ];
  }, [availableServices, churchId]);

  const [formData, setFormData] = useState<CreateVisitorPayload>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    visit_date: new Date().toISOString().split('T')[0],
    service_attended: servicesList[0]?.name || 'Sunday Morning Worship Service',
    invited_by: '',
    heard_about: 'Friend / Family',
    family_size: 1,
    prayer_request: '',
    notes: '',
    status: 'new',
    assigned_to: '',
    create_follow_up: true,
    follow_up_title: '',
    follow_up_due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        postal_code: initialData.postal_code || '',
        visit_date: initialData.visit_date || '',
        service_attended: initialData.service_attended || '',
        invited_by: initialData.invited_by || '',
        heard_about: initialData.heard_about || 'Friend / Family',
        family_size: initialData.family_size || 1,
        prayer_request: initialData.prayer_request || '',
        notes: initialData.notes || '',
        status: initialData.status || 'new',
        assigned_to: initialData.assigned_to || '',
        create_follow_up: false,
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        visit_date: new Date().toISOString().split('T')[0],
        service_attended: servicesList[0]?.name || 'Sunday Morning Worship Service',
        invited_by: '',
        heard_about: 'Friend / Family',
        family_size: 1,
        prayer_request: '',
        notes: '',
        status: 'new',
        assigned_to: '',
        create_follow_up: true,
        follow_up_title: '',
        follow_up_due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
      });
    }
    setErrors({});
  }, [initialData, isOpen, servicesList]);

  const handleChange = (field: keyof CreateVisitorPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.visit_date) newErrors.visit_date = 'Visit date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please complete required visitor fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save guest record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "bg-slate-800 border border-slate-700 text-white font-medium text-xs sm:text-sm rounded-xl focus:border-amber-500 placeholder:text-slate-500";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-900 text-white border border-slate-800 shadow-2xl p-0 overflow-hidden rounded-3xl">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          {/* Header Banner */}
          <div className="bg-slate-950 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  {mode === 'create' ? 'Record Sunday Guest Connection' : 'Edit Visitor Record'}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Log connection card details and automate follow-up workflows for first-time visitors.
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
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  First Name *
                </label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="e.g. Michael"
                  className={`${inputStyle} ${errors.first_name ? 'border-red-500' : ''}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Last Name *
                </label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="e.g. Taylor"
                  className={`${inputStyle} ${errors.last_name ? 'border-red-500' : ''}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Phone Number
                </label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  icon={<Phone className="h-4 w-4 text-slate-400" />}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="michael@example.com"
                  icon={<Mail className="h-4 w-4 text-slate-400" />}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Visit Date *
                </label>
                <Input
                  type="date"
                  value={formData.visit_date}
                  onChange={(e) => handleChange('visit_date', e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Service Attended
                </label>
                <Select
                  value={formData.service_attended || servicesList[0]?.name || 'Sunday Morning Worship Service'}
                  onValueChange={(val) => handleChange('service_attended', val)}
                >
                  <SelectTrigger className={inputStyle}>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl max-h-60 overflow-y-auto">
                    {servicesList.map((st) => (
                      <SelectItem key={st.id} value={st.name}>
                        {st.name} {st.time ? `(${st.time})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  How Did They Hear About Us?
                </label>
                <Select
                  value={formData.heard_about || 'Friend / Family'}
                  onValueChange={(val) => handleChange('heard_about', val)}
                >
                  <SelectTrigger className={inputStyle}>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl">
                    <SelectItem value="Friend / Family">Friend or Family</SelectItem>
                    <SelectItem value="Social Media / Instagram">Social Media / Instagram / FB</SelectItem>
                    <SelectItem value="Church Website / Google Search">Google / Website</SelectItem>
                    <SelectItem value="Drive By / Neighborhood Sign">Drove By / Neighborhood</SelectItem>
                    <SelectItem value="Community Outreach Event">Community Outreach Event</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Invited By (Member Name)
                </label>
                <Input
                  value={formData.invited_by || ''}
                  onChange={(e) => handleChange('invited_by', e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Family / Party Size
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.family_size || 1}
                  onChange={(e) => handleChange('family_size', parseInt(e.target.value) || 1)}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Follow-up Status
                </label>
                <Select
                  value={formData.status || 'new'}
                  onValueChange={(val) => handleChange('status', val as VisitorStatus)}
                >
                  <SelectTrigger className={inputStyle}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl">
                    <SelectItem value="new">New Guest</SelectItem>
                    <SelectItem value="contact_pending">Contact Pending</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="follow_up_scheduled">Follow-up Scheduled</SelectItem>
                    <SelectItem value="follow_up_completed">Follow-up Completed</SelectItem>
                    <SelectItem value="returned_visitor">Returned Visitor</SelectItem>
                    <SelectItem value="became_member">Became Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Assigned Pastoral Leader
                </label>
                <Select
                  value={formData.assigned_to || 'none'}
                  onValueChange={(val) => handleChange('assigned_to', val === 'none' ? undefined : val)}
                >
                  <SelectTrigger className={inputStyle}>
                    <SelectValue placeholder="Select leader for follow-up" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl max-h-60 overflow-y-auto">
                    <SelectItem value="none">None / Unassigned</SelectItem>
                    {leadersList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} {u.title ? `(${u.title})` : ''}
                      </SelectItem>
                    ))}
                    {formData.assigned_to && formData.assigned_to !== 'none' && !leadersList.some((l) => l.id === formData.assigned_to) && (
                      <SelectItem value={formData.assigned_to}>
                        {initialData?.assigned_leader?.display_name || initialData?.assigned_to || formData.assigned_to}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Prayer Request (From Guest Card)
                </label>
                <textarea
                  value={formData.prayer_request || ''}
                  onChange={(e) => handleChange('prayer_request', e.target.value)}
                  placeholder="Enter any prayer requests or spiritual questions submitted on the card..."
                  rows={2}
                  className={`w-full p-2.5 ${inputStyle}`}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-300 block">
                  Staff Notes & Observations
                </label>
                <Input
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="e.g. Interested in young adults small groups and children's church."
                  className={inputStyle}
                />
              </div>
            </div>

            {/* Automated Follow-up Trigger */}
            {mode === 'create' && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-white">
                <label className="flex items-center gap-2 font-extrabold text-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.create_follow_up}
                    onChange={(e) => handleChange('create_follow_up', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 accent-amber-500"
                  />
                  <span>Automatically generate Follow-up Task for pastoral team</span>
                </label>
                {formData.create_follow_up && (
                  <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 pt-2 border-t border-slate-800">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Task Title</span>
                      <Input
                        value={formData.follow_up_title || `Welcome call with ${formData.first_name || 'Guest'}`}
                        onChange={(e) => handleChange('follow_up_title', e.target.value)}
                        className={`h-8 ${inputStyle}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Due Date</span>
                      <Input
                        type="date"
                        value={formData.follow_up_due_date || ''}
                        onChange={(e) => handleChange('follow_up_due_date', e.target.value)}
                        className={`h-8 ${inputStyle}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-950 border-t border-slate-800 p-4 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-extrabold text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl shadow-lg transition"
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Save Guest Record' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
