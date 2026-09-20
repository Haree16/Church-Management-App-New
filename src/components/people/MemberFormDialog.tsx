import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChurchMember, Gender, MaritalStatus, MemberStatus, UserRole } from '@/types/database';
import { DEMO_MINISTRIES, DEMO_GROUPS, DEMO_FAMILIES } from '@/lib/mockData';
import { CreateMemberPayload } from '@/services/memberService';
import { User, Phone, Mail, MapPin, Calendar, Heart, Shield, Sparkles, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface MemberFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateMemberPayload) => Promise<void>;
  initialData?: ChurchMember | null;
  mode?: 'create' | 'edit';
}

export function MemberFormDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'create',
}: MemberFormDialogProps) {
  const [formData, setFormData] = useState<CreateMemberPayload>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    avatar_url: '',
    gender: 'other',
    dob: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    marital_status: 'single',
    marriage_date: '',
    occupation: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    role: 'member',
    status: 'active',
    joined_date: new Date().toISOString().split('T')[0],
    baptism_date: '',
    salvation_date: '',
    previous_church: '',
    ministry_id: '',
    group_id: '',
    family_id: '',
    notes: '',
    create_welcome_follow_up: true,
  });

  const [activeTab, setActiveTab] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.profile?.first_name || '',
        last_name: initialData.profile?.last_name || '',
        email: initialData.profile?.email || '',
        phone: initialData.profile?.phone || '',
        avatar_url: initialData.profile?.avatar_url || '',
        gender: initialData.profile?.gender || 'other',
        dob: initialData.profile?.dob || '',
        address: initialData.profile?.address || '',
        city: initialData.profile?.city || '',
        state: initialData.profile?.state || '',
        postal_code: initialData.profile?.postal_code || '',
        marital_status: initialData.profile?.marital_status || 'single',
        marriage_date: initialData.profile?.marriage_date || '',
        occupation: initialData.profile?.occupation || '',
        emergency_contact_name: initialData.profile?.emergency_contact_name || '',
        emergency_contact_phone: initialData.profile?.emergency_contact_phone || '',
        role: initialData.role || 'member',
        status: initialData.status || 'active',
        joined_date: initialData.joined_date || initialData.membership_date || '',
        baptism_date: initialData.baptism_date || '',
        salvation_date: initialData.salvation_date || '',
        previous_church: initialData.previous_church || '',
        ministry_id: initialData.ministry_id || '',
        group_id: initialData.group_id || '',
        family_id: initialData.family_id || '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        avatar_url: '',
        gender: 'other',
        dob: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        marital_status: 'single',
        marriage_date: '',
        occupation: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        role: 'member',
        status: 'active',
        joined_date: new Date().toISOString().split('T')[0],
        baptism_date: '',
        salvation_date: '',
        previous_church: '',
        ministry_id: '',
        group_id: '',
        family_id: '',
        notes: '',
      });
    }
    setErrors({});
    setActiveTab('personal');
  }, [initialData, isOpen]);

  const handleChange = (field: keyof CreateMemberPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setActiveTab('personal');
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save member record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg">
              {mode === 'create' ? 'Add New Church Member' : 'Edit Member Profile'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete the member record across personal, spiritual, household, and church department tabs.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <TabsList className="grid grid-cols-4 w-full h-9">
                <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs">Contact & Address</TabsTrigger>
                <TabsTrigger value="spiritual" className="text-xs">Spiritual Milestones</TabsTrigger>
                <TabsTrigger value="church" className="text-xs">Church & Groups</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 space-y-4">
              {/* Tab 1: Personal Details */}
              <TabsContent value="personal" className="space-y-4 m-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      First Name *
                    </label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      placeholder="e.g. Sarah"
                      className={errors.first_name ? 'border-red-500' : ''}
                    />
                    {errors.first_name && <span className="text-[10px] text-red-500">{errors.first_name}</span>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Last Name *
                    </label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      placeholder="e.g. Jenkins"
                      className={errors.last_name ? 'border-red-500' : ''}
                    />
                    {errors.last_name && <span className="text-[10px] text-red-500">{errors.last_name}</span>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Gender
                    </label>
                    <Select
                      value={formData.gender || 'other'}
                      onValueChange={(val) => handleChange('gender', val as Gender)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other / Not Specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={formData.dob || ''}
                      onChange={(e) => handleChange('dob', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Marital Status
                    </label>
                    <Select
                      value={formData.marital_status || 'single'}
                      onValueChange={(val) => handleChange('marital_status', val as MaritalStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.marital_status === 'married' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Wedding Anniversary Date
                      </label>
                      <Input
                        type="date"
                        value={formData.marriage_date || ''}
                        onChange={(e) => handleChange('marriage_date', e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Occupation / Profession
                    </label>
                    <Input
                      value={formData.occupation || ''}
                      onChange={(e) => handleChange('occupation', e.target.value)}
                      placeholder="e.g. Teacher, Software Engineer, Graphic Designer"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Profile Avatar Image URL
                    </label>
                    <Input
                      value={formData.avatar_url || ''}
                      onChange={(e) => handleChange('avatar_url', e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Contact & Address */}
              <TabsContent value="contact" className="space-y-4 m-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="member@gracevalley.org"
                      icon={<Mail className="h-4 w-4" />}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <span className="text-[10px] text-red-500">{errors.email}</span>}
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Phone Number
                    </label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      icon={<Phone className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Street Address
                    </label>
                    <Input
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="123 Faith Lane"
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      City
                    </label>
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Chennai"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        State
                      </label>
                      <Input
                        value={formData.state || ''}
                        onChange={(e) => handleChange('state', e.target.value)}
                        placeholder="Tamil Nadu"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Postal Code
                      </label>
                      <Input
                        value={formData.postal_code || ''}
                        onChange={(e) => handleChange('postal_code', e.target.value)}
                        placeholder="600002"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-sky-600" />
                      Emergency Contact
                    </h4>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Emergency Contact Name
                    </label>
                    <Input
                      value={formData.emergency_contact_name || ''}
                      onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                      placeholder="e.g. John Doe (Spouse)"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Emergency Contact Phone
                    </label>
                    <Input
                      value={formData.emergency_contact_phone || ''}
                      onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                      placeholder="+1 (555) 999-9999"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Spiritual Milestones */}
              <TabsContent value="spiritual" className="space-y-4 m-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Church Joining Date
                    </label>
                    <Input
                      type="date"
                      value={formData.joined_date || ''}
                      onChange={(e) => handleChange('joined_date', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Salvation Date
                    </label>
                    <Input
                      type="date"
                      value={formData.salvation_date || ''}
                      onChange={(e) => handleChange('salvation_date', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Water Baptism Date
                    </label>
                    <Input
                      type="date"
                      value={formData.baptism_date || ''}
                      onChange={(e) => handleChange('baptism_date', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Previous Church
                    </label>
                    <Input
                      value={formData.previous_church || ''}
                      onChange={(e) => handleChange('previous_church', e.target.value)}
                      placeholder="e.g. First Baptist of Dallas"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pastoral Notes & Spiritual Journey
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="Enter background details, prayer notes, or ministry passions..."
                      rows={3}
                      className="w-full rounded-md border border-slate-200 bg-transparent p-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-800"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 4: Church, Role & Household */}
              <TabsContent value="church" className="space-y-4 m-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Membership Status
                    </label>
                    <Select
                      value={formData.status || 'active'}
                      onValueChange={(val) => handleChange('status', val as MemberStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="transferred">Transferred</SelectItem>
                        <SelectItem value="moved_away">Moved Away</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Church Role
                    </label>
                    <Select
                      value={formData.role || 'member'}
                      onValueChange={(val) => handleChange('role', val as UserRole)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="cell_group_leader">Cell Group Leader</SelectItem>
                        <SelectItem value="group_leader">Group Leader</SelectItem>
                        <SelectItem value="ministry_leader">Ministry Leader</SelectItem>
                        <SelectItem value="pastor">Pastor</SelectItem>
                        <SelectItem value="church_admin">Church Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Assigned Ministry
                    </label>
                    <Select
                      value={formData.ministry_id || 'none'}
                      onValueChange={(val) => handleChange('ministry_id', val === 'none' ? null : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ministry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {DEMO_MINISTRIES.map((min) => (
                          <SelectItem key={min.id} value={min.id}>
                            {min.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Small Group / Circle
                    </label>
                    <Select
                      value={formData.group_id || 'none'}
                      onValueChange={(val) => handleChange('group_id', val === 'none' ? null : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {DEMO_GROUPS.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Family Household
                    </label>
                    <Select
                      value={formData.family_id || 'none'}
                      onValueChange={(val) => handleChange('family_id', val === 'none' ? null : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select family household" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Individual)</SelectItem>
                        {DEMO_FAMILIES.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.family_name} ({f.city || 'Chennai'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {mode === 'create' && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!formData.create_welcome_follow_up}
                          onChange={(e) => handleChange('create_welcome_follow_up', e.target.checked)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                        />
                        <span>Automatically create a Welcome Follow-up task for pastoral team</span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 mt-0.5">
                        Creates an onboarding follow-up ticket assigned to pastoral care with a 5-day due date.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>

            <DialogFooter className="p-6 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {mode === 'create' ? 'Add Member' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
