import React, { useState, useMemo } from 'react';
import { 
  ChurchTenant, SaaSUser, Member, ChurchMinistry, MinistryMember, 
  MinistryTeam, MinistryActivity, MinistryAnnouncement, RosterAssignment, ChurchEvent 
} from '../../types';
import { 
  getUserAssignedMinistries, isUserLeaderOfMinistry 
} from '../../utils/ministryPermissions';
import { findLinkedMemberForUser } from '../../utils/notificationUtils';
import { 
  Landmark, Users, Calendar, Clock, MapPin, Phone, Mail, 
  Megaphone, Plus, Trash2, Edit2, Shield, HeartHandshake, 
  CheckCircle2, ChevronRight, AlertCircle, Sparkles, UserCheck, 
  Lock, Bell, FileText, Check
} from 'lucide-react';

interface MyMinistryViewProps {
  currentChurch: ChurchTenant;
  currentUser: SaaSUser;
  members: Member[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  ministryTeams: MinistryTeam[];
  ministryActivities: MinistryActivity[];
  ministryAnnouncements: MinistryAnnouncement[];
  events: ChurchEvent[];
  roster: RosterAssignment[];
  onNavigateTab: (tab: string, deepLinkId?: string) => void;
  onSaveMinistryAnnouncement?: (announcement: MinistryAnnouncement) => Promise<void> | void;
  onDeleteMinistryAnnouncement?: (id: string) => Promise<void> | void;
  onSaveMinistryMember?: (member: MinistryMember) => Promise<void> | void;
  onDeleteMinistryMember?: (id: string) => Promise<void> | void;
  onToggleRosterConfirm?: (assignmentId: string) => void;
  onOpenAiMinistry?: () => void;
}

export const MyMinistryView: React.FC<MyMinistryViewProps> = ({
  currentChurch,
  currentUser,
  members = [],
  ministries = [],
  ministryMembers = [],
  ministryTeams = [],
  ministryActivities = [],
  ministryAnnouncements = [],
  events = [],
  roster = [],
  onNavigateTab,
  onSaveMinistryAnnouncement,
  onDeleteMinistryAnnouncement,
  onSaveMinistryMember,
  onDeleteMinistryMember,
  onToggleRosterConfirm,
  onOpenAiMinistry,
}) => {
  // Get all ministries the user is assigned to
  const userMinistries = useMemo(() => {
    return getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  }, [currentUser, members, ministries, ministryMembers]);

  // Active selected ministry state
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>(() => {
    return userMinistries[0]?.ministry.id || '';
  });

  // Ensure valid selection if userMinistries changes
  const activeUserMin = useMemo(() => {
    return (
      userMinistries.find((m) => m.ministry.id === selectedMinistryId) ||
      userMinistries[0] ||
      null
    );
  }, [userMinistries, selectedMinistryId]);

  const activeMinistry = activeUserMin?.ministry;
  const isLeader = activeUserMin?.isLeader || false;
  const myRoleTitle = activeUserMin?.roleTitle || 'Team Member';

  // Modal / Form state for creating announcement
  const [isAddAnnouncementOpen, setIsAddAnnouncementOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annPriority, setAnnPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state for adding a member to ministry (if leader)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedMemberToAddId, setSelectedMemberToAddId] = useState('');
  const [newMemberRoleTitle, setNewMemberRoleTitle] = useState('Team Member');

  const linkedMember = useMemo(() => {
    return findLinkedMemberForUser(currentUser, members);
  }, [currentUser, members]);

  // Ministry-specific members list
  const activeMinMemberRecords = useMemo(() => {
    if (!activeMinistry) return [];
    return ministryMembers.filter(
      (mm) => mm.ministryId === activeMinistry.id && mm.status !== 'Inactive'
    );
  }, [ministryMembers, activeMinistry]);

  const activeMinMembersWithDetails = useMemo(() => {
    if (!activeMinistry) return [];
    
    // Map records from MinistryMember
    const mapped = activeMinMemberRecords.map((mm) => {
      const mDetail = members.find((m) => m.id === mm.memberId);
      return {
        id: mm.id,
        memberId: mm.memberId,
        name: mDetail ? `${mDetail.firstName} ${mDetail.lastName}` : 'Church Member',
        roleTitle: mm.ministryRole || mm.role || 'Team Member',
        avatarUrl: mDetail?.avatarUrl,
        email: mDetail?.email,
        joinedAt: mm.joinedAt,
      };
    });

    // If leader is explicitly set on ChurchMinistry and not in mapped list, include leader
    if (activeMinistry.leaderName) {
      const leaderExists = mapped.some(
        (m) => m.name.toLowerCase() === activeMinistry.leaderName.toLowerCase()
      );
      if (!leaderExists) {
        mapped.unshift({
          id: `leader-${activeMinistry.id}`,
          memberId: activeMinistry.leaderMemberId || '',
          name: activeMinistry.leaderName,
          roleTitle: 'Ministry Leader',
          avatarUrl: undefined,
          email: activeMinistry.contactEmail,
          joinedAt: activeMinistry.createdAt,
        });
      }
    }

    return mapped;
  }, [activeMinMemberRecords, activeMinistry, members]);

  // Ministry Announcements
  const activeMinAnnouncements = useMemo(() => {
    if (!activeMinistry) return [];
    return ministryAnnouncements
      .filter((ma) => ma.ministryId === activeMinistry.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ministryAnnouncements, activeMinistry]);

  // Ministry Events & Activities
  const activeMinActivities = useMemo(() => {
    if (!activeMinistry) return [];
    return ministryActivities
      .filter((ma) => ma.ministryId === activeMinistry.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [ministryActivities, activeMinistry]);

  const activeMinEvents = useMemo(() => {
    if (!activeMinistry) return [];
    const nameLower = activeMinistry.name.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(nameLower) ||
        e.description.toLowerCase().includes(nameLower) ||
        e.category === 'Youth' && nameLower.includes('youth')
    );
  }, [events, activeMinistry]);

  // User's own roster assignments for this ministry
  const myMinRoster = useMemo(() => {
    if (!currentUser || !activeMinistry) return [];
    const memberId = linkedMember?.id || currentUser.id;
    const nameLower = currentUser.name.toLowerCase();
    const minNameLower = activeMinistry.name.toLowerCase();

    return roster.filter(
      (r) =>
        (r.memberId === memberId || r.memberName.toLowerCase() === nameLower) &&
        (r.ministryId === activeMinistry.id || r.team.toLowerCase().includes(minNameLower) || minNameLower.includes(r.team.toLowerCase()))
    );
  }, [roster, currentUser, linkedMember, activeMinistry]);

  // Available members to add (for leaders)
  const availableMembersToAdd = useMemo(() => {
    if (!activeMinistry) return [];
    const existingMemberIds = new Set(activeMinMemberRecords.map((mm) => mm.memberId));
    return members.filter((m) => !existingMemberIds.has(m.id));
  }, [members, activeMinMemberRecords, activeMinistry]);

  // Handle post announcement
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim() || !activeMinistry) return;

    setIsSubmitting(true);
    try {
      const newAnn: MinistryAnnouncement = {
        id: `mann-${Date.now()}`,
        church_id: currentChurch.id,
        churchId: currentChurch.id,
        ministryId: activeMinistry.id,
        title: annTitle.trim(),
        message: annMessage.trim(),
        authorName: currentUser.name || activeMinistry.leaderName || 'Ministry Leader',
        priority: annPriority,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      if (onSaveMinistryAnnouncement) {
        await onSaveMinistryAnnouncement(newAnn);
      }
      setAnnTitle('');
      setAnnMessage('');
      setIsAddAnnouncementOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle add member
  const handleAddMemberToMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberToAddId || !activeMinistry) return;

    setIsSubmitting(true);
    try {
      const newMemberRecord: MinistryMember = {
        id: `mm-${Date.now()}`,
        church_id: currentChurch.id,
        churchId: currentChurch.id,
        ministryId: activeMinistry.id,
        memberId: selectedMemberToAddId,
        ministryRole: newMemberRoleTitle,
        role: newMemberRoleTitle,
        status: 'Active',
        joinedAt: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (onSaveMinistryMember) {
        await onSaveMinistryMember(newMemberRecord);
      }
      setSelectedMemberToAddId('');
      setIsAddMemberModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userMinistries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-sm text-center space-y-4 text-white">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Landmark className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white">No Ministry Assignment Yet</h2>
            <p className="text-xs text-slate-400">
              You are currently registered as a church member. You can browse all available church ministries and reach out to get involved!
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('ministries')}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl shadow-md transition inline-flex items-center gap-2"
          >
            <Landmark className="w-4 h-4" />
            <span>Explore All Ministries</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Multiple Ministries Switcher Header (Section 15) */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div
          className="absolute -top-10 -right-10 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: activeMinistry?.color || '#f59e0b' }}
        />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                  <Landmark className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  My Ministry Dashboard
                </span>
                {isLeader && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Leader Controls
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mt-1">
                {activeMinistry?.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              {onOpenAiMinistry && (
                <button
                  onClick={onOpenAiMinistry}
                  className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>AI Ministry Assistant</span>
                </button>
              )}

              {/* Multiple Ministries Selector Pills */}
              {userMinistries.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-400 px-2 uppercase shrink-0">Switch:</span>
                  {userMinistries.map((um) => (
                    <button
                      key={um.ministry.id}
                      onClick={() => setSelectedMinistryId(um.ministry.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                        selectedMinistryId === um.ministry.id
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>{um.ministry.name}</span>
                      {um.isLeader && <span className="text-[9px] bg-slate-900/40 text-slate-900 px-1 rounded font-black">L</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key Info Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="flex items-center gap-2.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-semibold uppercase">My Role</div>
                <div className="font-bold text-amber-300">{myRoleTitle}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-semibold uppercase">Ministry Leader</div>
                <div className="font-bold text-white">{activeMinistry?.leaderName || 'Church Leadership'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-semibold uppercase">Active Team Size</div>
                <div className="font-bold text-emerald-300">{activeMinMembersWithDetails.length} Members</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Information, Members, Announcements */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Ministry Card */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3 text-white">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>About {activeMinistry?.name}</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeMinistry?.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800">
              {activeMinistry?.meetingDay && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong className="text-white">Schedule:</strong> {activeMinistry.meetingDay} {activeMinistry.meetingTime}</span>
                </div>
              )}
              {activeMinistry?.meetingLocation && (
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong className="text-white">Location:</strong> {activeMinistry.meetingLocation}</span>
                </div>
              )}
              {activeMinistry?.contactEmail && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{activeMinistry.contactEmail}</span>
                </div>
              )}
              {activeMinistry?.contactPhone && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{activeMinistry.contactPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ministry Members List (Section 5 - Privacy Guarded) */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>{activeMinistry?.name} Members</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Members serving in this ministry team
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl">
                  {activeMinMembersWithDetails.length} Members
                </span>
                {isLeader && (
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeMinMembersWithDetails.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center text-xs shrink-0">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        m.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{m.name}</h4>
                      <p className="text-[10px] text-amber-400 font-semibold">{m.roleTitle}</p>
                    </div>
                  </div>

                  {isLeader && onDeleteMinistryMember && !m.id.startsWith('leader-') && (
                    <button
                      onClick={() => onDeleteMinistryMember(m.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                      title="Remove member from ministry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-[11px] text-slate-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Member contact data is privacy-protected and strictly visible to team members.</span>
            </div>
          </div>

          {/* Ministry Announcements (Section 9) */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>Ministry Announcements</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Updates posted specifically for {activeMinistry?.name} members
                </p>
              </div>

              {isLeader && (
                <button
                  onClick={() => setIsAddAnnouncementOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Announcement</span>
                </button>
              )}
            </div>

            {activeMinAnnouncements.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                No ministry announcements posted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activeMinAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 rounded-2xl border border-slate-750 bg-slate-800/80 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ann.priority === 'Urgent'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : ann.priority === 'High'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-sky-950/80 text-sky-300 border border-sky-800'
                        }`}>
                          {ann.priority}
                        </span>
                        <h4 className="font-bold text-xs text-white">{ann.title}</h4>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{ann.date}</span>
                        {isLeader && onDeleteMinistryAnnouncement && (
                          <button
                            onClick={() => onDeleteMinistryAnnouncement(ann.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition"
                            title="Delete announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{ann.message}</p>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Posted by: <strong className="text-white">{ann.authorName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Assignments & Events */}
        <div className="space-y-6">
          {/* My Duty Roster Assignments (Section 6) */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>My Ministry Assignments</span>
              </h3>
              <button
                onClick={() => onNavigateTab('my-assignments')}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline"
              >
                View All
              </button>
            </div>

            {myMinRoster.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                No upcoming service roster duties assigned for this ministry.
              </div>
            ) : (
              <div className="space-y-2.5">
                {myMinRoster.map((r) => (
                  <div key={r.id} className="p-3 bg-slate-800/80 rounded-2xl border border-slate-750 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">{r.roleName}</span>
                      {onToggleRosterConfirm && (
                        <button
                          onClick={() => onToggleRosterConfirm(r.id)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 ${
                            r.confirmed
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{r.confirmed ? 'Confirmed' : 'Confirm'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{r.serviceDate} • {r.serviceName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ministry Activities & Events (Section 7) */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3 text-white">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Upcoming Ministry Events</span>
            </h3>

            {activeMinActivities.length === 0 && activeMinEvents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                No upcoming ministry events scheduled.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeMinActivities.map((act) => (
                  <div key={act.id} className="p-3 bg-slate-800/80 rounded-2xl border border-slate-750 space-y-1">
                    <h4 className="font-bold text-xs text-white">{act.name}</h4>
                    <p className="text-[11px] text-slate-400">{act.date} at {act.startTime} • {act.location}</p>
                  </div>
                ))}

                {activeMinEvents.map((ev) => (
                  <div key={ev.id} className="p-3 bg-slate-800/80 rounded-2xl border border-slate-750 space-y-1">
                    <h4 className="font-bold text-xs text-white">{ev.title}</h4>
                    <p className="text-[11px] text-slate-400">{ev.date} at {ev.time} • {ev.location}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Attendance Link */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 space-y-3 shadow-lg">
            <h4 className="font-bold text-xs text-amber-400 flex items-center gap-2 uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              <span>My Attendance Record</span>
            </h4>
            <p className="text-xs text-slate-300">
              Track your individual church attendance history and service participation metrics.
            </p>
            <button
              onClick={() => onNavigateTab('my-attendance')}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>View My Attendance</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Post Announcement Modal (Leaders Only) */}
      {isAddAnnouncementOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                Post {activeMinistry?.name} Announcement
              </h3>
              <button
                onClick={() => setIsAddAnnouncementOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-200 block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Please arrive 30 mins early for Sunday sound check"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Priority</label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Normal" className="bg-slate-900 text-white">Normal</option>
                  <option value="High" className="bg-slate-900 text-white">High Priority</option>
                  <option value="Urgent" className="bg-slate-900 text-white">Urgent Notice</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Announcement Message *</label>
                <textarea
                  required
                  rows={4}
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Enter detailed notice for team members..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAnnouncementOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-slate-300 hover:text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition"
                >
                  {isSubmitting ? 'Posting...' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal (Leaders Only) */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Add Member to {activeMinistry?.name}
              </h3>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMemberToMinistry} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-200 block mb-1">Select Church Member *</label>
                <select
                  required
                  value={selectedMemberToAddId}
                  onChange={(e) => setSelectedMemberToAddId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="" className="bg-slate-900 text-white">-- Choose Member --</option>
                  {availableMembersToAdd.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.firstName} {m.lastName} ({m.email || m.phone || 'Member'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Ministry Role Title</label>
                <input
                  type="text"
                  value={newMemberRoleTitle}
                  onChange={(e) => setNewMemberRoleTitle(e.target.value)}
                  placeholder="e.g. Media Team, Sound Mixer, Vocalist"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-slate-300 hover:text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedMemberToAddId}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition"
                >
                  {isSubmitting ? 'Adding...' : 'Add to Ministry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
