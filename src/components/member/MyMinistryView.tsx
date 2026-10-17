import React, { useState, useMemo } from 'react';
import { 
  ChurchTenant, SaaSUser, Member, ChurchMinistry, MinistryMember, 
  MinistryTeam, MinistryTeamMember, MinistryActivity, MinistryAnnouncement, RosterAssignment, ChurchEvent 
} from '../../types';
import { 
  getUserAssignedMinistries, isUserLeaderOfMinistry 
} from '../../utils/ministryPermissions';
import { findLinkedMemberForUser } from '../../utils/notificationUtils';
import { 
  Landmark, Users, Calendar, Clock, MapPin, Phone, Mail, 
  Megaphone, Plus, Trash2, Edit2, Shield, HeartHandshake, 
  CheckCircle2, ChevronRight, AlertCircle, Sparkles, UserCheck, 
  Lock, Bell, FileText, Check, Crown
} from 'lucide-react';

interface MyMinistryViewProps {
  currentChurch: ChurchTenant;
  currentUser: SaaSUser;
  members: Member[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  ministryTeams: MinistryTeam[];
  ministryTeamMembers?: MinistryTeamMember[];
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
  ministryTeamMembers = [],
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

  // Filter state for overall ministry leader to filter members by squad (default 'ALL')
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');

  // Ensure valid selection if userMinistries changes
  const activeUserMin = useMemo(() => {
    return (
      userMinistries.find((m) => m.ministry.id === selectedMinistryId) ||
      userMinistries[0] ||
      null
    );
  }, [userMinistries, selectedMinistryId]);

  const activeMinistry = activeUserMin?.ministry;

  const linkedMember = useMemo(() => {
    return findLinkedMemberForUser(currentUser, members);
  }, [currentUser, members]);

  // Sub-teams belonging to the active ministry
  const currentMinTeams = useMemo(() => {
    if (!activeMinistry) return [];
    return ministryTeams.filter((t) => t.ministryId === activeMinistry.id && t.status !== 'Inactive');
  }, [ministryTeams, activeMinistry]);

  // Check if current user is Overall Ministry Leader or Church Admin
  const isOverallMinistryLeader = useMemo(() => {
    if (!currentUser || !activeMinistry) return false;
    const userRole = currentUser.role;
    if (['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(userRole)) return true;

    const userName = (currentUser.name || '').trim().toLowerCase();
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const userPhone = (currentUser.phone || '').replace(/\D/g, '').slice(-10);

    // 1. Leader / Assistant Leader linked IDs on ChurchMinistry
    if (linkedMember) {
      if (activeMinistry.leaderMemberId && linkedMember.id === activeMinistry.leaderMemberId) return true;
      if (activeMinistry.assistantLeaderMemberId && linkedMember.id === activeMinistry.assistantLeaderMemberId) return true;
    }

    // 2. Direct Leader name / contact info match
    const minLeader = (activeMinistry.leaderName || '').trim().toLowerCase();
    const minAsst = (activeMinistry.assistantLeaderName || '').trim().toLowerCase();
    const minContactEmail = (activeMinistry.contactEmail || '').trim().toLowerCase();
    const minContactPhone = (activeMinistry.contactPhone || '').replace(/\D/g, '').slice(-10);

    if (minLeader && userName && minLeader.length > 1 && userName.length > 1) {
      if (minLeader === userName || minLeader.includes(userName) || userName.includes(minLeader)) return true;
    }
    if (minAsst && userName && minAsst.length > 1 && userName.length > 1) {
      if (minAsst === userName || minAsst.includes(userName) || userName.includes(minAsst)) return true;
    }
    if (minContactEmail && userEmail && minContactEmail === userEmail) return true;
    if (minContactPhone && userPhone && userPhone.length >= 7 && minContactPhone === userPhone) return true;

    // 3. Overall ministry leadership role in MinistryMember table
    const myMinRecord = ministryMembers.find(
      (mm) => mm.ministryId === activeMinistry.id && mm.status !== 'Inactive' &&
        (mm.memberId === linkedMember?.id || mm.memberId === currentUser.id)
    );
    if (myMinRecord) {
      const roleLower = (myMinRecord.ministryRole || myMinRecord.role || '').toLowerCase();
      if (
        roleLower.includes('ministry leader') || 
        roleLower.includes('director') || 
        roleLower.includes('coordinator') || 
        roleLower.includes('head') || 
        roleLower.includes('chair')
      ) {
        return true;
      }
    }

    return false;
  }, [currentUser, activeMinistry, linkedMember, ministryMembers]);

  // Sub-teams led by current user
  const myLedTeams = useMemo(() => {
    if (!currentUser || !activeMinistry) return [];
    const myMemId = linkedMember?.id || currentUser.id;
    const userName = (currentUser.name || '').trim().toLowerCase();

    return currentMinTeams.filter((t) => {
      if (myMemId && t.leaderMemberId === myMemId) return true;
      if (t.leaderName && userName && (
        t.leaderName.trim().toLowerCase() === userName ||
        t.leaderName.toLowerCase().includes(userName) ||
        userName.includes(t.leaderName.toLowerCase())
      )) return true;
      if (myMemId && ministryTeamMembers.some((tm) => tm.teamId === t.id && (tm.memberId === myMemId || tm.memberId === currentUser.id) && (tm.role === 'Team Leader' || tm.role?.toLowerCase().includes('leader')))) {
        return true;
      }
      return false;
    });
  }, [currentMinTeams, currentUser, linkedMember, ministryTeamMembers, activeMinistry]);

  const isAnyTeamLeader = myLedTeams.length > 0;

  // Sub-teams assigned to current user (as leader or member)
  const myAssignedTeams = useMemo(() => {
    if (!currentUser || !activeMinistry) return [];
    const myMemId = linkedMember?.id || currentUser.id;
    const userName = (currentUser.name || '').trim().toLowerCase();

    return currentMinTeams.filter((t) => {
      if (myLedTeams.some((lt) => lt.id === t.id)) return true;
      if (myMemId && t.leaderMemberId === myMemId) return true;
      if (t.leaderName && userName && (
        t.leaderName.trim().toLowerCase() === userName ||
        t.leaderName.toLowerCase().includes(userName) ||
        userName.includes(t.leaderName.toLowerCase())
      )) return true;
      if (myMemId && ministryTeamMembers.some((tm) => tm.teamId === t.id && (tm.memberId === myMemId || tm.memberId === currentUser.id) && tm.status !== 'Inactive')) {
        return true;
      }
      if (linkedMember?.ministryTeams && Array.isArray(linkedMember.ministryTeams)) {
        if (linkedMember.ministryTeams.some((mt) => mt.toLowerCase() === t.name.toLowerCase() || t.name.toLowerCase().includes(mt.toLowerCase()))) {
          return true;
        }
      }
      return false;
    });
  }, [currentMinTeams, myLedTeams, linkedMember, currentUser, ministryTeamMembers, activeMinistry]);

  // Overall leader or squad leader
  const isLeader = isOverallMinistryLeader || isAnyTeamLeader;

  // Accurately resolve current user's role title
  const myRoleTitle = useMemo(() => {
    if (isOverallMinistryLeader) return 'Ministry Leader';
    if (isAnyTeamLeader) return `Team Leader (${myLedTeams[0].name})`;
    if (myAssignedTeams.length > 0) return `Team Member (${myAssignedTeams[0].name})`;
    const raw = activeUserMin?.roleTitle || 'Team Member';
    return raw.toLowerCase() === 'volunteer' ? 'Team Member' : raw;
  }, [isOverallMinistryLeader, isAnyTeamLeader, myLedTeams, myAssignedTeams, activeUserMin]);

  // Helper to accurately resolve any member's ministry/team role (NEVER 'Volunteer')
  const getResolvedMemberInfo = (memberId: string, memberFullName: string, rawRole?: string) => {
    const normMemName = (memberFullName || '').trim().toLowerCase();

    // 1. Overall Ministry Leader?
    const isMinLeader = 
      (activeMinistry?.leaderMemberId && activeMinistry.leaderMemberId === memberId) ||
      (activeMinistry?.leaderName && normMemName.length > 1 && (
        activeMinistry.leaderName.trim().toLowerCase() === normMemName ||
        activeMinistry.leaderName.trim().toLowerCase().includes(normMemName) ||
        normMemName.includes(activeMinistry.leaderName.trim().toLowerCase())
      ));

    if (isMinLeader) {
      return {
        roleTitle: 'Ministry Leader',
        isLeader: true,
        isMinistryLeader: true,
        isTeamLeader: false,
      };
    }

    // 2. Assistant Ministry Leader?
    const isAsstLeader = 
      (activeMinistry?.assistantLeaderMemberId && activeMinistry.assistantLeaderMemberId === memberId) ||
      (activeMinistry?.assistantLeaderName && normMemName.length > 1 && (
        activeMinistry.assistantLeaderName.trim().toLowerCase() === normMemName ||
        activeMinistry.assistantLeaderName.trim().toLowerCase().includes(normMemName)
      ));

    if (isAsstLeader) {
      return {
        roleTitle: 'Assistant Leader',
        isLeader: true,
        isMinistryLeader: false,
        isTeamLeader: false,
      };
    }

    // 3. Sub-Team Leader of any team in this ministry?
    const ledTeam = currentMinTeams.find((t) => {
      if (t.leaderMemberId && t.leaderMemberId === memberId) return true;
      if (t.leaderName && normMemName.length > 1) {
        const normLead = t.leaderName.trim().toLowerCase();
        return normLead === normMemName || normLead.includes(normMemName) || normMemName.includes(normLead);
      }
      return false;
    });

    if (ledTeam) {
      return {
        roleTitle: `Team Leader (${ledTeam.name})`,
        isLeader: true,
        isMinistryLeader: false,
        isTeamLeader: true,
        teamName: ledTeam.name,
      };
    }

    // 4. Designated Team Leader in ministryTeamMembers?
    const tmLeaderRec = ministryTeamMembers.find(
      (tm) => tm.memberId === memberId && tm.ministryId === activeMinistry?.id &&
        (tm.role === 'Team Leader' || tm.role?.toLowerCase().includes('leader'))
    );
    if (tmLeaderRec) {
      const parentTeam = currentMinTeams.find((t) => t.id === tmLeaderRec.teamId);
      const teamName = parentTeam?.name || '';
      return {
        roleTitle: teamName ? `Team Leader (${teamName})` : 'Team Leader',
        isLeader: true,
        isMinistryLeader: false,
        isTeamLeader: true,
        teamName,
      };
    }

    // 5. Does rawRole explicitly specify a leader title?
    const rawClean = (rawRole || '').trim();
    if (rawClean && /leader|director|coordinator|head|chair/i.test(rawClean)) {
      return {
        roleTitle: rawClean,
        isLeader: true,
        isMinistryLeader: false,
        isTeamLeader: true,
      };
    }

    // 6. Sub-team member in ministryTeamMembers?
    const teamAssignment = ministryTeamMembers.find(
      (tm) => tm.memberId === memberId && tm.ministryId === activeMinistry?.id
    );
    if (teamAssignment) {
      const parentTeam = currentMinTeams.find((t) => t.id === teamAssignment.teamId);
      const teamName = parentTeam?.name || '';
      if (teamAssignment.role && !['volunteer', 'member'].includes(teamAssignment.role.toLowerCase())) {
        return {
          roleTitle: teamName ? `${teamAssignment.role} (${teamName})` : teamAssignment.role,
          isLeader: false,
          isMinistryLeader: false,
          isTeamLeader: false,
          teamName,
        };
      }
      return {
        roleTitle: teamName ? `Team Member (${teamName})` : 'Team Member',
        isLeader: false,
        isMinistryLeader: false,
        isTeamLeader: false,
        teamName,
      };
    }

    // 7. Check Member's ministryTeams tags
    const memberObj = members.find((m) => m.id === memberId);
    if (memberObj?.ministryTeams && Array.isArray(memberObj.ministryTeams)) {
      const matchedTeam = currentMinTeams.find((t) =>
        memberObj.ministryTeams.some((mt) => mt.toLowerCase() === t.name.toLowerCase() || t.name.toLowerCase().includes(mt.toLowerCase()))
      );
      if (matchedTeam) {
        return {
          roleTitle: `Team Member (${matchedTeam.name})`,
          isLeader: false,
          isMinistryLeader: false,
          isTeamLeader: false,
          teamName: matchedTeam.name,
        };
      }
    }

    // 8. Custom raw role (not volunteer or member)
    if (rawClean && !['volunteer', 'member'].includes(rawClean.toLowerCase())) {
      return {
        roleTitle: rawClean,
        isLeader: false,
        isMinistryLeader: false,
        isTeamLeader: false,
      };
    }

    // 9. Default fallback: ALWAYS 'Team Member', NEVER 'Volunteer'
    return {
      roleTitle: 'Team Member',
      isLeader: false,
      isMinistryLeader: false,
      isTeamLeader: false,
    };
  };

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

  // Ministry-specific member records
  const activeMinMemberRecords = useMemo(() => {
    if (!activeMinistry) return [];
    return ministryMembers.filter(
      (mm) => mm.ministryId === activeMinistry.id && mm.status !== 'Inactive'
    );
  }, [ministryMembers, activeMinistry]);

  // All ministry members with resolved details and sub-team linkages
  const allMinMembersWithDetails = useMemo(() => {
    if (!activeMinistry) return [];
    
    const mapped = activeMinMemberRecords.map((mm) => {
      const mDetail = members.find((m) => m.id === mm.memberId);
      const fullName = mDetail ? `${mDetail.firstName} ${mDetail.lastName}`.trim() : 'Church Member';
      const resolved = getResolvedMemberInfo(mm.memberId, fullName, mm.ministryRole || mm.role);

      // Find all sub-teams this member belongs to
      const memberTeams = currentMinTeams.filter((t) => {
        if (t.leaderMemberId === mm.memberId) return true;
        if (t.leaderName && fullName.length > 1) {
          const nl = t.leaderName.trim().toLowerCase();
          const nf = fullName.toLowerCase();
          if (nl === nf || nl.includes(nf) || nf.includes(nl)) return true;
        }
        if (ministryTeamMembers.some((tm) => tm.teamId === t.id && tm.memberId === mm.memberId && tm.status !== 'Inactive')) return true;
        if (mDetail?.ministryTeams && Array.isArray(mDetail.ministryTeams)) {
          if (mDetail.ministryTeams.some((mt) => mt.toLowerCase() === t.name.toLowerCase() || t.name.toLowerCase().includes(mt.toLowerCase()))) return true;
        }
        return false;
      });

      return {
        id: mm.id,
        memberId: mm.memberId,
        name: fullName,
        roleTitle: resolved.roleTitle,
        isLeader: resolved.isLeader,
        isMinistryLeader: resolved.isMinistryLeader,
        isTeamLeader: resolved.isTeamLeader,
        teamName: resolved.teamName || memberTeams[0]?.name || '',
        teamIds: memberTeams.map((t) => t.id),
        avatarUrl: mDetail?.avatarUrl,
        email: mDetail?.email,
        phone: mDetail?.phone,
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
          isLeader: true,
          isMinistryLeader: true,
          isTeamLeader: false,
          teamName: '',
          teamIds: [],
          avatarUrl: undefined,
          email: activeMinistry.contactEmail,
          phone: activeMinistry.contactPhone,
          joinedAt: activeMinistry.createdAt,
        });
      }
    }

    return mapped;
  }, [activeMinMemberRecords, activeMinistry, members, currentMinTeams, ministryTeamMembers]);

  // Scoped members visible based on user role:
  // - Overall Ministry Leader: sees all members (or filtered by selectedTeamFilter)
  // - Normal Member / Volunteer / Team Leader: sees ONLY their assigned team's members!
  const visibleMinMembersWithDetails = useMemo(() => {
    if (!activeMinistry) return [];

    // Overall Ministry Leader / Admin
    if (isOverallMinistryLeader) {
      if (selectedTeamFilter === 'ALL' || currentMinTeams.length === 0) {
        return allMinMembersWithDetails;
      }
      return allMinMembersWithDetails.filter((m) => m.teamIds.includes(selectedTeamFilter) || m.isMinistryLeader);
    }

    // Normal Member / Volunteer / Team Leader:
    // If ministry has NO sub-teams: show all members in the ministry
    if (currentMinTeams.length === 0) {
      return allMinMembersWithDetails;
    }

    // If user belongs to one or more sub-teams:
    if (myAssignedTeams.length > 0) {
      const myTeamIdSet = new Set(myAssignedTeams.map((t) => t.id));
      return allMinMembersWithDetails.filter((m) => {
        if (m.teamIds.some((tid) => myTeamIdSet.has(tid))) return true;
        if (m.memberId === linkedMember?.id || m.memberId === currentUser.id) return true;
        return false;
      });
    }

    // User is in the ministry, but not assigned to any sub-team yet
    return [];
  }, [isOverallMinistryLeader, selectedTeamFilter, currentMinTeams, allMinMembersWithDetails, myAssignedTeams, linkedMember, currentUser]);

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
                <div className="font-bold text-emerald-300">
                  {visibleMinMembersWithDetails.length} Members
                </div>
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

          {/* Sub-Teams / Squads Section */}
          {currentMinTeams.length > 0 && (
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3.5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>{isOverallMinistryLeader ? `${activeMinistry?.name} Sub-Teams` : 'My Ministry Team'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isOverallMinistryLeader
                      ? 'Sub-teams and squads operating under this ministry'
                      : 'Your designated serving squad and team leader'}
                  </p>
                </div>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl">
                  {isOverallMinistryLeader ? `${currentMinTeams.length} Teams` : `${myAssignedTeams.length} Assigned`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(isOverallMinistryLeader ? currentMinTeams : myAssignedTeams).map((team) => {
                  const teamMembersCount = allMinMembersWithDetails.filter((m) => m.teamIds.includes(team.id)).length;
                  const isUserTeam = myAssignedTeams.some((t) => t.id === team.id);
                  const isUserLeading = myLedTeams.some((t) => t.id === team.id);

                  return (
                    <div
                      key={team.id}
                      className={`p-3.5 rounded-2xl border transition space-y-2 ${
                        isUserTeam 
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-xs' 
                          : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-xs text-white">{team.name}</h4>
                            {isUserLeading && (
                              <span className="bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" />
                                Leader
                              </span>
                            )}
                          </div>
                          {team.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{team.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700/80 shrink-0">
                          {teamMembersCount} Members
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-700/60">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Team Leader: <strong className="text-white">{team.leaderName || 'To be assigned'}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ministry Members List (Privacy Guarded & Scoped by User Team) */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>
                    {!isOverallMinistryLeader && currentMinTeams.length > 0 && myAssignedTeams.length > 0
                      ? `${myAssignedTeams.map((t) => t.name).join(' & ')} Members`
                      : `${activeMinistry?.name} Members`}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {!isOverallMinistryLeader && currentMinTeams.length > 0
                    ? `Members serving in your ministry team (${activeMinistry?.name})`
                    : 'Members serving in this ministry team'}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl">
                  {visibleMinMembersWithDetails.length} Members
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

            {/* Sub-team filter pills for Overall Ministry Leaders */}
            {isOverallMinistryLeader && currentMinTeams.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Filter Team:
                </span>
                <button
                  onClick={() => setSelectedTeamFilter('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedTeamFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
                  }`}
                >
                  All Teams ({allMinMembersWithDetails.length})
                </button>
                {currentMinTeams.map((t) => {
                  const count = allMinMembersWithDetails.filter((m) => m.teamIds.includes(t.id)).length;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeamFilter(t.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                        selectedTeamFilter === t.id
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
                      }`}
                    >
                      {t.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scoped notification banner for team members */}
            {!isOverallMinistryLeader && currentMinTeams.length > 0 && myAssignedTeams.length > 0 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between text-xs text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Showing members of your assigned team: <strong>{myAssignedTeams.map((t) => t.name).join(', ')}</strong></span>
                </span>
                <span className="text-[10px] font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Your Squad View
                </span>
              </div>
            )}

            {visibleMinMembersWithDetails.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleMinMembersWithDetails.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
                      m.isLeader 
                        ? 'bg-amber-500/10 border-amber-500/30 shadow-xs' 
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                        m.isLeader 
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' 
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt={m.name} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          m.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-white">{m.name}</h4>
                          {m.isLeader && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
                          )}
                        </div>
                        <div className="mt-0.5">
                          {m.isLeader ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-extrabold">
                              {m.roleTitle}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                              {m.roleTitle}
                            </span>
                          )}
                        </div>
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
            ) : (
              <div className="p-6 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl text-center space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
                <h4 className="font-bold text-sm text-white">
                  {!isOverallMinistryLeader && currentMinTeams.length > 0 ? 'Not Assigned to a Sub-Team' : 'No Members Found'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {!isOverallMinistryLeader && currentMinTeams.length > 0 
                    ? `You are registered in ${activeMinistry?.name}, but you have not yet been assigned to a specific sub-team. Please contact your ministry leader (${activeMinistry?.leaderName || 'Ministry Leader'}) to be placed on a squad.`
                    : 'No members currently listed in this ministry squad.'}
                </p>
              </div>
            )}

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
