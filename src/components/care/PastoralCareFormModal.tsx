import React, { useState, useEffect } from 'react';
import {
  PastoralCare,
  PastoralCareType,
  PastoralCareStage,
  PastoralCareConfidentiality,
  FollowUpPriority,
} from '@/types/database';
import {
  PASTORAL_CARE_TYPES,
  PASTORAL_STAGES,
  CONFIDENTIALITY_LEVELS,
  CreatePastoralCarePayload,
  UpdatePastoralCarePayload,
} from '@/services/pastoralCareService';
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
import { Shield, ShieldAlert, HeartHandshake, AlertTriangle, UserCheck, Calendar, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface PastoralCareFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePastoralCarePayload | UpdatePastoralCarePayload) => Promise<void>;
  initialData?: PastoralCare | null;
  mode?: 'create' | 'edit';
  prefilledPerson?: { id?: string; name: string; email?: string; phone?: string; type?: 'member' | 'visitor' } | null;
}

export const PastoralCareFormModal: React.FC<PastoralCareFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
  prefilledPerson,
}) => {
  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personType, setPersonType] = useState<'member' | 'visitor'>('member');
  const [careType, setCareType] = useState<PastoralCareType>('pastoral_visit');
  const [stage, setStage] = useState<PastoralCareStage>('initial_contact');
  const [priority, setPriority] = useState<FollowUpPriority>('medium');
  const [confidentialityLevel, setConfidentialityLevel] = useState<PastoralCareConfidentiality>('pastor_only');
  const [assignedToName, setAssignedToName] = useState('');
  const [summary, setSummary] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [safeguardingFlag, setSafeguardingFlag] = useState(false);
  const [safeguardingNotes, setSafeguardingNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setPersonName(initialData.person_name || '');
      setPersonEmail(initialData.person_email || '');
      setPersonPhone(initialData.person_phone || '');
      setPersonType(initialData.person_type || 'member');
      setCareType(initialData.care_type || 'pastoral_visit');
      setStage(initialData.stage || 'initial_contact');
      setPriority(initialData.priority || 'medium');
      setConfidentialityLevel(initialData.confidentiality_level || 'pastor_only');
      setAssignedToName(initialData.assigned_to_name || '');
      setSummary(initialData.summary || '');
      setPrivateNotes(initialData.private_notes || '');
      setSafeguardingFlag(!!initialData.safeguarding_flag);
      setSafeguardingNotes(initialData.safeguarding_notes || '');
      setDueDate(initialData.due_date || '');
    } else {
      setPersonName(prefilledPerson?.name || '');
      setPersonEmail(prefilledPerson?.email || '');
      setPersonPhone(prefilledPerson?.phone || '');
      setPersonType(prefilledPerson?.type || 'member');
      setCareType('pastoral_visit');
      setStage('initial_contact');
      setPriority('medium');
      setConfidentialityLevel('pastor_only');
      setAssignedToName('');
      setSummary('');
      setPrivateNotes('');
      setSafeguardingFlag(false);
      setSafeguardingNotes('');
      setDueDate('');
    }
  }, [initialData, mode, prefilledPerson, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      toast.error('Please specify the person name.');
      return;
    }
    if (!summary.trim()) {
      toast.error('Please enter a brief non-sensitive summary.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const payload: CreatePastoralCarePayload = {
          person_id: prefilledPerson?.id || initialData?.person_id || null,
          person_type: personType,
          person_name: personName.trim(),
          person_email: personEmail.trim() || null,
          person_phone: personPhone.trim() || null,
          care_type: careType,
          stage,
          priority,
          confidentiality_level: confidentialityLevel,
          assigned_to_name: assignedToName.trim() || 'Unassigned',
          summary: summary.trim(),
          private_notes: privateNotes.trim() || null,
          safeguarding_flag: safeguardingFlag,
          safeguarding_notes: safeguardingNotes.trim() || null,
          due_date: dueDate || null,
        };
        await onSubmit(payload);
        toast.success('Confidential Pastoral Care case opened.');
      } else {
        const payload: UpdatePastoralCarePayload = {
          person_name: personName.trim(),
          person_email: personEmail.trim() || null,
          person_phone: personPhone.trim() || null,
          care_type: careType,
          stage,
          priority,
          confidentiality_level: confidentialityLevel,
          assigned_to_name: assignedToName.trim() || 'Unassigned',
          summary: summary.trim(),
          private_notes: privateNotes.trim() || null,
          safeguarding_flag: safeguardingFlag,
          safeguarding_notes: safeguardingNotes.trim() || null,
          due_date: dueDate || null,
        };
        await onSubmit(payload);
        toast.success('Pastoral care record updated.');
      }
      onClose();
    } catch (err) {
      console.error('Error saving pastoral care case:', err);
      toast.error('Failed to save pastoral care record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border border-slate-800 p-6 rounded-3xl shadow-2xl dark:bg-slate-900 dark:text-white dark:border-slate-800">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-950/70 border border-purple-800/50 text-purple-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2 dark:text-white">
                {mode === 'create' ? 'Open Pastoral Care Case' : 'Edit Pastoral Care Record'}
                <Lock className="w-4 h-4 text-purple-400" />
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 dark:text-slate-400">
                Confidential pastoral record. Access is strictly restricted to authorized pastoral caregivers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Safeguarding Alert Reminder Banner */}
          <div className="p-3.5 bg-amber-950/50 border border-amber-800/60 rounded-xl flex items-start gap-3 text-xs text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-amber-300">Pastoral Care & Safeguarding Reminder:</strong> Please record objective pastoral summaries. If there is immediate harm or legal risk, activate the Safeguarding Flag below.
            </p>
          </div>

          {/* Person Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Person Name *</label>
              <Input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Brother John Doe"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Person Type</label>
              <Select value={personType} onValueChange={(val: 'member' | 'visitor') => setPersonType(val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="member" className="focus:bg-slate-800 focus:text-white">Church Member</SelectItem>
                  <SelectItem value="visitor" className="focus:bg-slate-800 focus:text-white">Church Visitor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Contact Email</label>
              <Input
                type="email"
                value={personEmail}
                onChange={(e) => setPersonEmail(e.target.value)}
                placeholder="john.doe@example.com"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Contact Phone</label>
              <Input
                value={personPhone}
                onChange={(e) => setPersonPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Care Type & Confidentiality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Care Type</label>
              <Select value={careType} onValueChange={(val: PastoralCareType) => setCareType(val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500">
                  <SelectValue placeholder="Select care type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {PASTORAL_CARE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="focus:bg-slate-800 focus:text-white">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Confidentiality Level</label>
              <Select
                value={confidentialityLevel}
                onValueChange={(val: PastoralCareConfidentiality) => setConfidentialityLevel(val)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500">
                  <SelectValue placeholder="Select confidentiality" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {CONFIDENTIALITY_LEVELS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="focus:bg-slate-800 focus:text-white">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stage, Priority, Assignee & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Care Stage</label>
              <Select value={stage} onValueChange={(val: PastoralCareStage) => setStage(val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {PASTORAL_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="focus:bg-slate-800 focus:text-white">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Priority Level</label>
              <Select value={priority} onValueChange={(val: FollowUpPriority) => setPriority(val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="low" className="focus:bg-slate-800 focus:text-white">Low Priority</SelectItem>
                  <SelectItem value="medium" className="focus:bg-slate-800 focus:text-white">Medium Priority</SelectItem>
                  <SelectItem value="high" className="focus:bg-slate-800 focus:text-white">High Priority</SelectItem>
                  <SelectItem value="urgent" className="focus:bg-slate-800 focus:text-white">Urgent Action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Assigned Caregiver</label>
              <Input
                value={assignedToName}
                onChange={(e) => setAssignedToName(e.target.value)}
                placeholder="e.g. Pastor Thomas"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold block">Scheduled Follow-up Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-purple-500 cursor-pointer [color-scheme:dark]"
            />
          </div>

          {/* Non-sensitive Summary */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold block">Pastoral Summary (Non-sensitive Overview) *</label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Pastoral home visit for prayer and encouragement following bereavement."
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-purple-500"
              required
            />
            <p className="text-[10px] text-slate-400">Brief summary displayed in care oversight lists.</p>
          </div>

          {/* Confidential Private Notes */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
              <span>Confidential Pastoral Notes (Restricted Access)</span>
              <Lock className="w-3.5 h-3.5 text-purple-400" />
            </label>
            <textarea
              value={privateNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrivateNotes(e.target.value)}
              placeholder="Record detailed pastoral conversation notes, spiritual counsel provided, and intercessory notes..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Safeguarding Switch & Notes */}
          <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-white">Safeguarding / Risk Awareness Flag</p>
                  <p className="text-[10px] text-slate-400">Flag for urgent pastoral attention or legal safeguarding safety awareness</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={safeguardingFlag}
                onChange={(e) => setSafeguardingFlag(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {safeguardingFlag && (
              <div className="space-y-1.5 pt-2 border-t border-slate-700">
                <label className="text-xs text-amber-300 font-semibold block">Safeguarding Details & Action Plan</label>
                <textarea
                  value={safeguardingNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSafeguardingNotes(e.target.value)}
                  placeholder="Note specific safety awareness, crisis protocol steps, or senior pastor notifications..."
                  rows={2}
                  className="w-full bg-amber-950/40 border border-amber-800/60 text-amber-100 placeholder:text-amber-400/60 text-xs p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl px-4 py-2 transition"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl px-4 py-2 shadow-lg transition"
            >
              {isSubmitting ? 'Saving Record...' : mode === 'create' ? 'Create Pastoral Record' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
