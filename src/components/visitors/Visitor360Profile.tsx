import React, { useState, useEffect } from 'react';
import { Visitor, VisitorVisit, FollowUp, VisitorStatus, Profile } from '@/types/database';
import { visitorService } from '@/services/visitorService';
import { followUpService } from '@/services/followUpService';
import { PastoralCareModule } from '@/components/care/PastoralCareModule';
import { VisitorFollowUpTimelineWidget } from './VisitorFollowUpTimelineWidget';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UserCheck,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Heart,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserPlus,
  Edit,
  Trash2,
  ChevronRight,
  Send,
  Plus,
  Sparkles,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface Visitor360ProfileProps {
  visitor: Visitor;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onConvert?: (visitor: Visitor) => void;
  onEdit?: (visitor: Visitor) => void;
  onDelete?: (visitor: Visitor) => void;
}

export function Visitor360Profile({
  visitor,
  isOpen,
  onClose,
  onUpdate,
  onConvert,
  onEdit,
  onDelete,
}: Visitor360ProfileProps) {
  const [currentVisitor, setCurrentVisitor] = useState<Visitor>(visitor);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'followups' | 'care' | 'timeline'>('overview');
  const [visits, setVisits] = useState<VisitorVisit[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  // New Visit Dialog State
  const [showLogVisitDialog, setShowLogVisitDialog] = useState(false);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceAttended, setServiceAttended] = useState(visitor.service_attended || 'Sunday Contemporary Service');
  const [visitNotes, setVisitNotes] = useState('');
  const [submittingVisit, setSubmittingVisit] = useState(false);

  // New Follow-up Dialog State
  const [showAddFollowUpDialog, setShowAddFollowUpDialog] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState(`Follow up with ${visitor.first_name} ${visitor.last_name}`);
  const [followUpDueDate, setFollowUpDueDate] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0]);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [followUpType, setFollowUpType] = useState<string>('new_visitor');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  // Inline Editing State
  const [isEditingPrayer, setIsEditingPrayer] = useState(false);
  const [prayerText, setPrayerText] = useState(visitor.prayer_request || '');

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(visitor.notes || '');

  const [isEditingLeader, setIsEditingLeader] = useState(false);
  const [leaderText, setLeaderText] = useState(
    visitor.assigned_leader
      ? visitor.assigned_leader.display_name || `${visitor.assigned_leader.first_name} ${visitor.assigned_leader.last_name}`
      : visitor.assigned_to || ''
  );

  useEffect(() => {
    if (isOpen && visitor) {
      setCurrentVisitor(visitor);
      fetchVisitorData();
      setPrayerText(visitor.prayer_request || '');
      setNotesText(visitor.notes || '');
      setLeaderText(
        visitor.assigned_leader
          ? visitor.assigned_leader.display_name || `${visitor.assigned_leader.first_name} ${visitor.assigned_leader.last_name}`
          : visitor.assigned_to || ''
      );
    }
  }, [isOpen, visitor]);

  const handleSavePrayer = async () => {
    try {
      setCurrentVisitor((prev) => ({ ...prev, prayer_request: prayerText }));
      await visitorService.updateVisitor(visitor.church_id, visitor.id, { prayer_request: prayerText });
      toast.success('Prayer request updated successfully');
      setIsEditingPrayer(false);
      onUpdate();
    } catch (err) {
      toast.error('Failed to update prayer request');
    }
  };

  const handleSaveNotes = async () => {
    try {
      setCurrentVisitor((prev) => ({ ...prev, notes: notesText }));
      await visitorService.updateVisitor(visitor.church_id, visitor.id, { notes: notesText });
      toast.success('Pastoral notes updated successfully');
      setIsEditingNotes(false);
      onUpdate();
    } catch (err) {
      toast.error('Failed to update notes');
    }
  };

  const handleSaveLeader = async (newLeader: string) => {
    try {
      setCurrentVisitor((prev) => ({ ...prev, assigned_to: newLeader }));
      await visitorService.updateVisitor(visitor.church_id, visitor.id, { assigned_to: newLeader });
      toast.success('Assigned leader updated');
      setIsEditingLeader(false);
      onUpdate();
    } catch (err) {
      toast.error('Failed to update assigned leader');
    }
  };

  const fetchVisitorData = async () => {
    setLoading(true);
    try {
      const visitsData = await visitorService.getVisitorVisits(visitor.church_id, visitor.id);
      const followUpsData = await followUpService.getFollowUps(visitor.church_id);
      const visitorFollowUps = followUpsData.filter((f) => f.visitor_id === visitor.id);

      setVisits(visitsData);
      setFollowUps(visitorFollowUps);
    } catch (err) {
      console.error('Failed to load visitor 360 data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVisit(true);
    try {
      await visitorService.recordVisitorVisit(visitor.church_id, visitor.id, {
        visit_date: visitDate,
        service_attended: serviceAttended,
        notes: visitNotes,
      });
      toast.success('Return visit recorded successfully!');
      setShowLogVisitDialog(false);
      setVisitNotes('');
      fetchVisitorData();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record visit.');
    } finally {
      setSubmittingVisit(false);
    }
  };

  const handleAddFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFollowUp(true);
    try {
      await followUpService.createFollowUp(visitor.church_id, {
        title: followUpTitle,
        type: (followUpType as any) || 'new_visitor',
        priority: followUpPriority,
        due_date: followUpDueDate,
        status: 'pending',
        visitor_id: visitor.id,
        person_name: `${visitor.first_name} ${visitor.last_name}`,
        person_phone: visitor.phone || undefined,
        person_email: visitor.email || undefined,
        assigned_to: visitor.assigned_to || undefined,
        notes: followUpNotes,
      });
      toast.success('Follow-up task created!');
      setShowAddFollowUpDialog(false);
      setFollowUpNotes('');
      fetchVisitorData();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create follow-up task.');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleStatusChange = async (newStatus: VisitorStatus) => {
    try {
      setCurrentVisitor((prev) => ({ ...prev, status: newStatus }));
      await visitorService.updateVisitor(visitor.church_id, visitor.id, { status: newStatus });
      toast.success(`Visitor status updated to ${newStatus.replace(/_/g, ' ')}`);
      onUpdate();
    } catch (err: any) {
      toast.error('Failed to update visitor status.');
    }
  };

  const getStatusBadgeColor = (status: VisitorStatus) => {
    switch (status) {
      case 'new':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'contact_pending':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'contacted':
        return 'bg-sky-950 text-sky-300 border-sky-800';
      case 'follow_up_scheduled':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      case 'follow_up_completed':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'returned_visitor':
        return 'bg-teal-950 text-teal-300 border-teal-800';
      case 'regular_attendee':
      case 'regular_attender':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'became_member':
        return 'bg-violet-950 text-violet-300 border-violet-800';
      case 'inactive':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const initials = `${visitor.first_name?.[0] || ''}${visitor.last_name?.[0] || ''}`.toUpperCase() || 'V';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 bg-slate-900 text-white border-2 border-amber-500/40 shadow-2xl rounded-2xl [&>button]:text-slate-400 [&>button]:hover:text-white">
        {/* Header Section */}
        <div className="bg-slate-950 border-b border-slate-800 p-6 pb-4 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-white">
                    {visitor.first_name} {visitor.last_name}
                  </h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusBadgeColor(currentVisitor.status)}`}>
                    {currentVisitor.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {(visitor.visit_count || 1) > 1 && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-teal-950 text-teal-300 border border-teal-800">
                      Returned Visitor ({visitor.visit_count} Visits)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                  {visitor.phone && (
                    <a href={`tel:${visitor.phone}`} className="flex items-center gap-1 text-slate-300 hover:text-amber-400 font-medium">
                      <Phone className="h-3.5 w-3.5" /> {visitor.phone}
                    </a>
                  )}
                  {visitor.email && (
                    <a href={`mailto:${visitor.email}`} className="flex items-center gap-1 text-slate-300 hover:text-amber-400 font-medium">
                      <Mail className="h-3.5 w-3.5" /> {visitor.email}
                    </a>
                  )}
                  <span className="flex items-center gap-1 text-slate-400 font-medium">
                    <Calendar className="h-3.5 w-3.5" /> First Visit: {visitor.first_visit_date || visitor.visit_date}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold shadow-none"
                onClick={() => setShowLogVisitDialog(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-amber-400" /> Log Visit
              </Button>

              <Button
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-semibold shadow-none"
                onClick={() => setShowAddFollowUpDialog(true)}
              >
                <Clock className="h-3.5 w-3.5 mr-1 text-indigo-400" /> Add Follow-up
              </Button>

              {currentVisitor.status !== 'became_member' && onConvert && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm"
                  onClick={() => onConvert(visitor)}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Convert to Member
                </Button>
              )}

              {onEdit && (
                <Button
                  size="sm"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold shadow-none"
                  onClick={() => onEdit(visitor)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1 text-slate-400" /> Edit Profile
                </Button>
              )}

              {onDelete && (
                <Button
                  size="sm"
                  className="bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 font-semibold shadow-none"
                  onClick={() => onDelete(visitor)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-rose-400" /> Delete Guest
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 border-b border-slate-800 mt-6 -mb-4">
            <button
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-amber-500 text-amber-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'visits'
                  ? 'border-amber-500 text-amber-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('visits')}
            >
              Visit History
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {visits.length || visitor.visit_count || 1}
              </span>
            </button>
            <button
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'followups'
                  ? 'border-amber-500 text-amber-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('followups')}
            >
              Follow-ups & Care
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {followUps.length}
              </span>
            </button>
            <button
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'care'
                  ? 'border-amber-500 text-amber-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('care')}
            >
              Pastoral Care Records
            </button>
            <button
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-amber-500 text-amber-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline
            </button>
          </div>
        </div>

        {/* Tab Content Section */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Card */}
              <div className="md:col-span-2 space-y-6">
                {/* Guest Journey & Stage Selector */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl space-y-3 text-white">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-400" /> Lifecycle Stage Transition
                  </h3>
                  <div className="flex items-center gap-2">
                    <Select value={currentVisitor.status} onValueChange={(val) => handleStatusChange(val as VisitorStatus)}>
                      <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white text-xs">
                        <SelectValue placeholder="Update Stage" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="new">New First-Time Guest</SelectItem>
                        <SelectItem value="contact_pending">Contact Pending</SelectItem>
                        <SelectItem value="contacted">Contacted / Welcomed</SelectItem>
                        <SelectItem value="follow_up_scheduled">Follow-up Scheduled</SelectItem>
                        <SelectItem value="follow_up_completed">Follow-up Completed</SelectItem>
                        <SelectItem value="returned_visitor">Returned Visitor</SelectItem>
                        <SelectItem value="regular_attendee">Regular Attendee</SelectItem>
                        <SelectItem value="became_member">Became Member</SelectItem>
                        <SelectItem value="inactive">Inactive Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Prayer Request & Notes */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4 text-white">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Heart className="h-4 w-4 text-amber-400" /> Prayer Requests
                      </h3>
                      {!isEditingPrayer ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-400 hover:text-amber-400"
                          onClick={() => setIsEditingPrayer(true)}
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-slate-400"
                            onClick={() => {
                              setPrayerText(currentVisitor.prayer_request || '');
                              setIsEditingPrayer(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                            onClick={handleSavePrayer}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditingPrayer ? (
                      <textarea
                        className="w-full p-2.5 text-xs rounded-lg border border-slate-700 outline-none focus:border-amber-500 bg-slate-800 text-white"
                        rows={3}
                        value={prayerText}
                        onChange={(e) => setPrayerText(e.target.value)}
                        placeholder="Enter prayer requests..."
                      />
                    ) : (
                      <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-200 min-h-[50px]">
                        {currentVisitor.prayer_request || 'No specific prayer requests noted during registration.'}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" /> Pastoral & Team Notes
                      </h3>
                      {!isEditingNotes ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-400 hover:text-amber-400"
                          onClick={() => setIsEditingNotes(true)}
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-slate-400"
                            onClick={() => {
                              setNotesText(currentVisitor.notes || '');
                              setIsEditingNotes(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                            onClick={handleSaveNotes}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditingNotes ? (
                      <textarea
                        className="w-full p-2.5 text-xs rounded-lg border border-slate-700 outline-none focus:border-amber-500 bg-slate-800 text-white"
                        rows={3}
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Enter pastoral or follow-up notes..."
                      />
                    ) : (
                      <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-200 min-h-[50px]">
                        {currentVisitor.notes || 'No general notes.'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact & Location Details */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl space-y-3 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Contact & Personal Info
                    </h3>
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-slate-400 hover:text-amber-400"
                        onClick={() => onEdit(visitor)}
                      >
                        <Edit className="h-3 w-3 mr-1" /> Edit Profile
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-xs text-slate-400 block">Address</span>
                      <span className="text-white font-medium">
                        {currentVisitor.address ? `${currentVisitor.address}, ${currentVisitor.city || ''} ${currentVisitor.state || ''}` : 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Family Size</span>
                      <span className="text-white font-medium">{currentVisitor.family_size || 1} Person(s)</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Invited By</span>
                      <span className="text-white font-medium">{currentVisitor.invited_by || 'Self / Walk-in'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Heard About Church</span>
                      <span className="text-white font-medium">{currentVisitor.heard_about || 'Friend / Family'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                {/* Assigned Leader Card */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl space-y-3 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Assigned Pastoral Leader
                    </h3>
                    {!isEditingLeader ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-slate-400 hover:text-amber-400"
                        onClick={() => setIsEditingLeader(true)}
                      >
                        <Edit className="h-3 w-3 mr-1" /> Assign / Edit
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-slate-400"
                        onClick={() => setIsEditingLeader(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  {isEditingLeader ? (
                    <div className="space-y-2">
                      <Input
                        className="text-sm bg-slate-800 border-slate-700 text-white focus:border-amber-500"
                        placeholder="Enter leader name..."
                        value={leaderText}
                        onChange={(e) => setLeaderText(e.target.value)}
                      />
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                        onClick={() => handleSaveLeader(leaderText)}
                      >
                        Save Assigned Leader
                      </Button>
                    </div>
                  ) : currentVisitor.assigned_leader || currentVisitor.assigned_to ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-sm border border-slate-700">
                        {(currentVisitor.assigned_leader?.first_name?.[0] || currentVisitor.assigned_to?.[0] || 'L').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">
                          {currentVisitor.assigned_leader
                            ? currentVisitor.assigned_leader.display_name || `${currentVisitor.assigned_leader.first_name} ${currentVisitor.assigned_leader.last_name}`
                            : currentVisitor.assigned_to}
                        </div>
                        {currentVisitor.assigned_leader?.email && (
                          <div className="text-xs text-slate-400">{currentVisitor.assigned_leader.email}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No leader currently assigned. Click Assign / Edit above.</div>
                  )}
                </div>

                {/* Visit Summary */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl space-y-3 text-white">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Attendance Summary
                  </h3>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span>Total Recorded Visits:</span>
                      <span className="font-bold text-white">{currentVisitor.visit_count || visits.length || 1}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span>First Visit:</span>
                      <span className="font-medium text-white">{currentVisitor.first_visit_date || currentVisitor.visit_date}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span>Last Visit:</span>
                      <span className="font-medium text-white">{currentVisitor.last_visit_date || currentVisitor.visit_date}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Primary Service:</span>
                      <span className="font-medium text-white">{currentVisitor.service_attended || 'Sunday Service'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Recorded Church Visits</h3>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs" onClick={() => setShowLogVisitDialog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Record Return Visit
                </Button>
              </div>

              {visits.length === 0 ? (
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center text-slate-400 text-sm">
                  No additional return visits recorded yet. First visit was on {visitor.visit_date}.
                </div>
              ) : (
                <div className="space-y-3">
                  {visits.map((visit, index) => (
                    <div key={visit.id || index} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl flex items-start gap-3 text-white">
                      <div className="p-2.5 rounded-lg bg-slate-800 text-amber-400 border border-slate-700 mt-0.5">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-sm">
                            {visit.service_attended || visitor.service_attended || 'Sunday Service'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{visit.visit_date}</span>
                        </div>
                        {visit.notes && <p className="text-xs text-slate-300 mt-1">{visit.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Follow-up Tasks & Care History</h3>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs" onClick={() => setShowAddFollowUpDialog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Follow-up
                </Button>
              </div>

              {followUps.length === 0 ? (
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center text-slate-400 text-sm">
                  No follow-up tasks currently assigned for this visitor.
                </div>
              ) : (
                <div className="space-y-3">
                  {followUps.map((fu) => (
                    <div key={fu.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl flex items-start justify-between gap-4 text-white">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{fu.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            fu.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {fu.status.toUpperCase()}
                          </span>
                        </div>
                        {fu.notes && <p className="text-xs text-slate-300">{fu.notes}</p>}
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                          <span>Due: {fu.due_date}</span>
                          {fu.outcome && <span className="text-amber-400 font-medium">Outcome: {fu.outcome}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'care' && (
            <div className="space-y-4">
              <PastoralCareModule personId={visitor.id} personName={`${visitor.first_name} ${visitor.last_name}`} />
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <VisitorFollowUpTimelineWidget visitor={visitor} churchId={visitor.church_id || 'church-1'} />
              <div className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800 text-white">
                <h3 className="text-sm font-bold text-white mb-4">Manual Care Activity History</h3>
                <div className="relative border-l-2 border-slate-800 pl-4 space-y-6 ml-2">
                {/* First Visit */}
                <div className="relative">
                  <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  <div className="text-xs font-semibold text-white">First Visit Recorded</div>
                  <div className="text-[11px] text-slate-400">{visitor.first_visit_date || visitor.visit_date}</div>
                  <div className="text-xs text-slate-300 mt-1">
                    Attended {visitor.service_attended || 'Sunday Service'} (Invited by {visitor.invited_by || 'Self'}).
                  </div>
                </div>

                {/* Follow Ups */}
                {followUps.map((fu) => (
                  <div key={fu.id} className="relative">
                    <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-slate-900" />
                    <div className="text-xs font-semibold text-white">{fu.title}</div>
                    <div className="text-[11px] text-slate-400">{fu.created_at?.split('T')[0] || fu.due_date}</div>
                    <div className="text-xs text-slate-300 mt-1">
                      Status: {fu.status} {fu.outcome ? `(${fu.outcome})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex justify-end">
          <Button
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Log Visit Modal */}
      <Dialog open={showLogVisitDialog} onOpenChange={setShowLogVisitDialog}>
        <DialogContent className="max-w-md bg-slate-900 text-white border border-slate-800 p-6 shadow-2xl rounded-2xl">
          <form onSubmit={handleLogVisitSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">Log Return Sunday Visit</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Record attendance for {visitor.first_name} {visitor.last_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Visit Date</label>
                <Input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Service Attended</label>
                <Input
                  value={serviceAttended}
                  onChange={(e) => setServiceAttended(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notes / Feedback</label>
                <Input
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="e.g. Sat in row 3, expressed interest in small groups"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                onClick={() => setShowLogVisitDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm"
                disabled={submittingVisit}
              >
                {submittingVisit ? 'Saving...' : 'Record Visit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Follow-up Modal */}
      <Dialog open={showAddFollowUpDialog} onOpenChange={setShowAddFollowUpDialog}>
        <DialogContent className="max-w-md bg-slate-900 text-white border border-slate-800 p-6 shadow-2xl rounded-2xl">
          <form onSubmit={handleAddFollowUpSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">Schedule Guest Follow-up</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Create a pastoral or care check-in task for {visitor.first_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Task Title</label>
                <Input
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Due Date</label>
                <Input
                  type="date"
                  value={followUpDueDate}
                  onChange={(e) => setFollowUpDueDate(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Follow-up Category</label>
                <Select value={followUpType} onValueChange={(val: any) => setFollowUpType(val)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl">
                    <SelectItem value="new_visitor">👋 New Visitor Welcome Call</SelectItem>
                    <SelectItem value="home_visit">🏡 Small Group / Cell Group Connect</SelectItem>
                    <SelectItem value="counseling">💬 Pastoral Check-in</SelectItem>
                    <SelectItem value="baptism">💧 Baptism / Membership Class</SelectItem>
                    <SelectItem value="prayer_request">🙏 Prayer Request Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
                <Select value={followUpPriority} onValueChange={(val: any) => setFollowUpPriority(val)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border border-slate-800 shadow-xl">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notes</label>
                <Input
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Action items or questions to ask"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                onClick={() => setShowAddFollowUpDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm"
                disabled={submittingFollowUp}
              >
                {submittingFollowUp ? 'Creating...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
