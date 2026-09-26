import React, { useState, useMemo } from 'react';
import { 
  ChurchMinistry, MinistryMember, MinistryTeam, MinistryTeamMember, 
  MinistryActivity, MinistryAnnouncement, Member, ChurchTenant, 
  SaaSUser, ChurchEvent, RosterAssignment, AttendanceRecord,
  CompleteChurchSettings
} from '../../types';
import { 
  Landmark, Users, UserPlus, Plus, Search, Calendar, 
  Clock, MapPin, Phone, Mail, CheckCircle2, Trash2, 
  Edit3, ChevronRight, ArrowLeft, Sparkles, Music, GraduationCap, 
  Heart, Shield, Globe, Coffee, Video, MessageSquare, 
  Copy, FileText, Layers, BookOpen, Award, 
  Download, UserCheck, Square, 
  X, Megaphone
} from 'lucide-react';
import { auditService } from '../../services/auditService';
import { canCreateEditMinistry, canManageAllMinistries, getRoleConfig } from '../../utils/rbac';
import { UserAvatar } from '../common/UserAvatar';
import { inferServiceNameForDate } from '../../utils/notificationUtils';

interface MinistriesModuleProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser;
  members: Member[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  ministryTeams: MinistryTeam[];
  ministryTeamMembers: MinistryTeamMember[];
  ministryActivities: MinistryActivity[];
  ministryAnnouncements: MinistryAnnouncement[];
  events: ChurchEvent[];
  roster: RosterAssignment[];
  attendance: AttendanceRecord[];
  churchSettings?: CompleteChurchSettings;
  onSaveMinistry: (ministry: ChurchMinistry) => Promise<void> | void;
  onDeleteMinistry: (id: string) => Promise<void> | void;
  onSaveMinistryMember: (member: MinistryMember) => Promise<void> | void;
  onDeleteMinistryMember: (id: string) => Promise<void> | void;
  onSaveMinistryTeam: (team: MinistryTeam) => Promise<void> | void;
  onDeleteMinistryTeam: (id: string) => Promise<void> | void;
  onSaveMinistryTeamMember: (teamMember: MinistryTeamMember) => Promise<void> | void;
  onDeleteMinistryTeamMember: (id: string) => Promise<void> | void;
  onSaveMinistryActivity: (activity: MinistryActivity) => Promise<void> | void;
  onDeleteMinistryActivity: (id: string) => Promise<void> | void;
  onSaveMinistryAnnouncement: (announcement: MinistryAnnouncement) => Promise<void> | void;
  onDeleteMinistryAnnouncement: (id: string) => Promise<void> | void;
  onSaveRosterAssignment?: (assignment: RosterAssignment) => Promise<void> | void;
  onDeleteRosterAssignment?: (id: string) => Promise<void> | void;
  onNavigateTab?: (tab: string) => void;
  initialSelectedMinistryId?: string | null;
  onOpenAiMinistry?: () => void;
}

type MinistryTab = 
  | 'overview' 
  | 'members' 
  | 'teams' 
  | 'activities' 
  | 'attendance' 
  | 'events' 
  | 'roster' 
  | 'volunteers' 
  | 'communication' 
  | 'reports' 
  | 'settings';

export const MinistriesModule: React.FC<MinistriesModuleProps> = ({
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
  churchSettings,
  onSaveMinistry,
  onDeleteMinistry,
  onSaveMinistryMember,
  onDeleteMinistryMember,
  onSaveMinistryTeam,
  onDeleteMinistryTeam,
  onSaveMinistryActivity,
  onDeleteMinistryActivity,
  onSaveMinistryAnnouncement,
  onDeleteMinistryAnnouncement,
  onSaveRosterAssignment,
  onDeleteRosterAssignment,
  onNavigateTab,
  initialSelectedMinistryId = null,
  onOpenAiMinistry,
}) => {
  const activeChurchId = currentChurch?.id || 'church-1';
  const userRole = currentUser?.role || 'Member';
  const isSuperOrPastor = canCreateEditMinistry(userRole);

  // Selected Ministry Dashboard State
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(initialSelectedMinistryId);
  const [activeMinistryTab, setActiveMinistryTab] = useState<MinistryTab>('overview');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');

  // Modals State
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<ChurchMinistry | null>(null);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<string>('');
  const [memberRoleToAdd, setMemberRoleToAdd] = useState<string>('Team Member');

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<MinistryTeam | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormDesc, setTeamFormDesc] = useState('');
  const [teamFormLeader, setTeamFormLeader] = useState('');

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<MinistryActivity | null>(null);
  const [activityFormName, setActivityFormName] = useState('');
  const [activityFormDesc, setActivityFormDesc] = useState('');
  const [activityFormDate, setActivityFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityFormStartTime, setActivityFormStartTime] = useState('06:00 PM');
  const [activityFormEndTime, setActivityFormEndTime] = useState('07:30 PM');
  const [activityFormLocation, setActivityFormLocation] = useState('Main Sanctuary');
  const [activityFormTeamId, setActivityFormTeamId] = useState<string>('');
  const [activityFormStatus, setActivityFormStatus] = useState<'Scheduled' | 'Completed' | 'Cancelled'>('Scheduled');

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<MinistryAnnouncement | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annPriority, setAnnPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');

  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterRoleName, setRosterRoleName] = useState('');
  const [rosterDate, setRosterDate] = useState(new Date().toISOString().split('T')[0]);
  const [rosterServiceName, setRosterServiceName] = useState('');
  const [rosterMemberId, setRosterMemberId] = useState('');

  // WhatsApp Quick Message State
  const [waCustomMessage, setWaCustomMessage] = useState('');
  const [waCopied, setWaCopied] = useState(false);

  // 1. Church-scoped collections
  const churchMinistryMembers = useMemo(() => {
    return ministryMembers.filter((mm) => (mm.church_id || mm.churchId || 'church-1') === activeChurchId);
  }, [ministryMembers, activeChurchId]);

  const churchMinistryTeams = useMemo(() => {
    return ministryTeams.filter((mt) => (mt.church_id || mt.churchId || 'church-1') === activeChurchId);
  }, [ministryTeams, activeChurchId]);

  const churchTeamMembers = useMemo(() => {
    return ministryTeamMembers.filter((mtm) => (mtm.church_id || mtm.churchId || 'church-1') === activeChurchId);
  }, [ministryTeamMembers, activeChurchId]);

  const churchActivities = useMemo(() => {
    return ministryActivities.filter((ma) => (ma.church_id || ma.churchId || 'church-1') === activeChurchId);
  }, [ministryActivities, activeChurchId]);

  const churchAnnouncements = useMemo(() => {
    return ministryAnnouncements.filter((ma) => (ma.church_id || ma.churchId || 'church-1') === activeChurchId);
  }, [ministryAnnouncements, activeChurchId]);

  const churchMembers = useMemo(() => {
    return members.filter((m) => (m.church_id || m.churchId || 'church-1') === activeChurchId);
  }, [members, activeChurchId]);

  const hasGlobalMinistryAccess = canManageAllMinistries(userRole);

  // Find matching member profile for current user
  const currentMemberRecord = useMemo(() => {
    if (!currentUser) return null;
    const cleanPhone = (ph: string) => (ph || '').replace(/\D/g, '').slice(-10);
    return churchMembers.find((m) => 
      (currentUser.email && m.email && m.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
      (currentUser.phone && m.phone && cleanPhone(m.phone) === cleanPhone(currentUser.phone)) ||
      (`${m.firstName || ''} ${m.lastName || ''}`.trim().toLowerCase() === currentUser.name?.trim().toLowerCase())
    );
  }, [churchMembers, currentUser]);

  // Determine ministries that this specific user is assigned to / permitted to view
  const accessibleMinistries = useMemo(() => {
    const allChurchMins = ministries.filter((m) => (m.church_id || m.churchId || 'church-1') === activeChurchId);
    
    // SuperAdmin, PastorAdmin, AssistantPastor see all ministries
    if (hasGlobalMinistryAccess) {
      return allChurchMins;
    }

    if (!currentUser) return [];

    const userName = (currentUser.name || '').trim().toLowerCase();
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const userPhone = (currentUser.phone || '').replace(/\D/g, '').slice(-10);

    return allChurchMins.filter((min) => {
      // 1. Is user the Leader of this ministry?
      const minLeader = (min.leaderName || '').trim().toLowerCase();
      const minContactEmail = (min.contactEmail || '').trim().toLowerCase();
      const minContactPhone = (min.contactPhone || '').replace(/\D/g, '').slice(-10);

      if (minLeader && userName && (minLeader === userName || minLeader.includes(userName) || userName.includes(minLeader))) {
        return true;
      }
      if (minContactEmail && userEmail && minContactEmail === userEmail) {
        return true;
      }
      if (minContactPhone && userPhone && minContactPhone === userPhone) {
        return true;
      }

      // 2. Is user in ministryMembers list for this ministry?
      const isMemberOfMin = churchMinistryMembers.some((mm) => {
        if (mm.ministryId !== min.id) return false;
        if (currentMemberRecord && mm.memberId === currentMemberRecord.id) return true;
        const memberObj = churchMembers.find((m) => m.id === mm.memberId);
        if (memberObj) {
          const memFullName = `${memberObj.firstName || ''} ${memberObj.lastName || ''}`.trim().toLowerCase();
          if (userName && memFullName === userName) return true;
          if (userEmail && memberObj.email && memberObj.email.trim().toLowerCase() === userEmail) return true;
          if (userPhone && memberObj.phone && memberObj.phone.replace(/\D/g, '').slice(-10) === userPhone) return true;
        }
        return false;
      });
      if (isMemberOfMin) return true;

      // 3. Is user's church member record tagged with this ministry?
      if (currentMemberRecord && currentMemberRecord.ministryTeams) {
        if (currentMemberRecord.ministryTeams.some((t) => t.toLowerCase() === min.name.toLowerCase())) {
          return true;
        }
      }

      return false;
    });
  }, [ministries, activeChurchId, hasGlobalMinistryAccess, currentUser, currentMemberRecord, churchMinistryMembers, churchMembers]);

  const churchMinistries = accessibleMinistries;

  // Active Ministry object if selected
  const activeMinistry = useMemo(() => {
    if (!selectedMinistryId) return null;
    return accessibleMinistries.find((m) => m.id === selectedMinistryId) || null;
  }, [accessibleMinistries, selectedMinistryId]);

  // Filtered Ministries List for Main Screen
  const filteredMinistries = useMemo(() => {
    return accessibleMinistries.filter((min) => {
      const matchesSearch = 
        !searchQuery ||
        min.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        min.leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (min.description && min.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || min.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [accessibleMinistries, searchQuery, statusFilter]);

  // Permission check for managing active ministry (Creation / Edit / Management actions)
  const canManageActiveMinistry = useMemo(() => {
    if (isSuperOrPastor) return true;
    if (!activeMinistry || !currentUser) return false;

    const userName = (currentUser.name || '').trim().toLowerCase();
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const userPhone = (currentUser.phone || '').replace(/\D/g, '').slice(-10);

    // 1. Is user linked to leaderMemberId or assistantLeaderMemberId?
    if (currentMemberRecord) {
      if (activeMinistry.leaderMemberId && currentMemberRecord.id === activeMinistry.leaderMemberId) return true;
      if (activeMinistry.assistantLeaderMemberId && currentMemberRecord.id === activeMinistry.assistantLeaderMemberId) return true;
    }

    // 2. Is leaderName, contactEmail, contactPhone matching currentUser?
    const minLeader = (activeMinistry.leaderName || '').trim().toLowerCase();
    const minContactEmail = (activeMinistry.contactEmail || '').trim().toLowerCase();
    const minContactPhone = (activeMinistry.contactPhone || '').replace(/\D/g, '').slice(-10);

    if (minLeader && userName && minLeader.length > 1 && userName.length > 1) {
      if (minLeader === userName || minLeader.includes(userName) || userName.includes(minLeader)) {
        return true;
      }
    }
    if (minContactEmail && userEmail && minContactEmail === userEmail) {
      return true;
    }
    if (minContactPhone && userPhone && userPhone.length >= 7 && minContactPhone === userPhone) {
      return true;
    }

    // 3. Is user a MinistryMember in this active ministry with a leader/coordinator/director role?
    const isLeadershipMember = churchMinistryMembers.some((mm) => {
      if (mm.ministryId !== activeMinistry.id) return false;

      // Check if mm is current user
      let isUserMatch = false;
      if (currentMemberRecord && mm.memberId === currentMemberRecord.id) {
        isUserMatch = true;
      } else {
        const memberObj = churchMembers.find((m) => m.id === mm.memberId);
        if (memberObj) {
          const memFullName = `${memberObj.firstName || ''} ${memberObj.lastName || ''}`.trim().toLowerCase();
          if (userName && memFullName === userName) isUserMatch = true;
          if (userEmail && memberObj.email && memberObj.email.trim().toLowerCase() === userEmail) isUserMatch = true;
          if (userPhone && memberObj.phone && memberObj.phone.replace(/\D/g, '').slice(-10) === userPhone) isUserMatch = true;
        }
      }

      if (!isUserMatch) return false;

      // Must have leadership role in this ministry
      const roleLower = (mm.ministryRole || mm.role || '').toLowerCase();
      return roleLower.includes('leader') || roleLower.includes('director') || roleLower.includes('coordinator') || roleLower.includes('head') || roleLower.includes('chair');
    });

    if (isLeadershipMember) {
      return true;
    }

    return false;
  }, [isSuperOrPastor, activeMinistry, currentUser, currentMemberRecord, churchMinistryMembers, churchMembers]);

  // Permission check for managing announcements (Admin or Ministry Leader)
  const canManageAnnouncements = isSuperOrPastor || canManageActiveMinistry;

  // Ministry-specific associated data
  const currentMinMembers = useMemo(() => {
    if (!activeMinistry) return [];
    return churchMinistryMembers.filter((mm) => mm.ministryId === activeMinistry.id);
  }, [churchMinistryMembers, activeMinistry]);

  const currentMinTeams = useMemo(() => {
    if (!activeMinistry) return [];
    return churchMinistryTeams.filter((mt) => mt.ministryId === activeMinistry.id);
  }, [churchMinistryTeams, activeMinistry]);

  const currentMinActivities = useMemo(() => {
    if (!activeMinistry) return [];
    return churchActivities.filter((act) => act.ministryId === activeMinistry.id);
  }, [churchActivities, activeMinistry]);

  const currentMinAnnouncements = useMemo(() => {
    if (!activeMinistry) return [];
    return churchAnnouncements.filter((ann) => ann.ministryId === activeMinistry.id);
  }, [churchAnnouncements, activeMinistry]);

  const currentMinEvents = useMemo(() => {
    if (!activeMinistry) return [];
    const minName = activeMinistry.name.toLowerCase();
    return events.filter((e) => {
      const matchChurch = (e.church_id || e.churchId || 'church-1') === activeChurchId;
      const matchCategory = e.category.toLowerCase().includes(minName) || e.title.toLowerCase().includes(minName);
      return matchChurch && matchCategory;
    });
  }, [events, activeMinistry, activeChurchId]);

  const currentMinRoster = useMemo(() => {
    if (!activeMinistry) return [];
    const minName = activeMinistry.name.toLowerCase();
    return roster.filter((r) => {
      const matchChurch = (r.church_id || r.churchId || 'church-1') === activeChurchId;
      const matchMin = r.ministryId === activeMinistry.id || r.team.toLowerCase().includes(minName) || minName.includes(r.team.toLowerCase());
      return matchChurch && matchMin;
    });
  }, [roster, activeMinistry, activeChurchId]);

  // Skill matched church volunteers for this ministry
  const potentialVolunteers = useMemo(() => {
    if (!activeMinistry) return [];
    const requiredSkills = (activeMinistry.requiredSkills || []).map((s) => s.toLowerCase());
    const existingMemberIds = new Set(currentMinMembers.map((mm) => mm.memberId));

    return churchMembers.filter((m) => {
      if (existingMemberIds.has(m.id)) return false;
      const memberSkills = (m.skills || []).map((s) => s.toLowerCase());
      const hasMatchingSkill = requiredSkills.length === 0 || memberSkills.some((s) => requiredSkills.some((rs) => rs.includes(s) || s.includes(rs)));
      const hasMinistryTag = (m.ministryTeams || []).some((t) => t.toLowerCase().includes(activeMinistry.name.toLowerCase()) || activeMinistry.name.toLowerCase().includes(t.toLowerCase()));
      return hasMatchingSkill || hasMinistryTag;
    });
  }, [churchMembers, currentMinMembers, activeMinistry]);

  // Icon Resolver Helper
  const renderMinistryIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'Music': return <Music className={className} />;
      case 'GraduationCap': return <GraduationCap className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Heart': return <Heart className={className} />;
      case 'Coffee': return <Coffee className={className} />;
      case 'Video': return <Video className={className} />;
      case 'Globe': return <Globe className={className} />;
      case 'Shield': return <Shield className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'Award': return <Award className={className} />;
      case 'Megaphone': return <Megaphone className={className} />;
      default: return <Landmark className={className} />;
    }
  };

  // Helper to open create ministry
  const handleOpenCreateMinistry = () => {
    setEditingMinistry({
      id: `min-${Date.now()}`,
      church_id: activeChurchId,
      churchId: activeChurchId,
      name: '',
      description: '',
      leaderName: '',
      leaderMemberId: '',
      assistantLeaderName: '',
      assistantLeaderMemberId: '',
      status: 'Active',
      color: '#f59e0b',
      icon: 'Landmark',
      contactPhone: '',
      contactEmail: '',
      meetingDay: 'Sunday',
      meetingTime: '06:00 PM',
      meetingLocation: 'Main Sanctuary',
      notes: '',
      requiredSkills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsMinistryModalOpen(true);
  };

  // Save Ministry
  const handleSaveMinistrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMinistry || !editingMinistry.name.trim()) {
      alert('Ministry Name is required.');
      return;
    }

    const stamped: ChurchMinistry = {
      ...editingMinistry,
      church_id: activeChurchId,
      churchId: activeChurchId,
      updatedAt: new Date().toISOString(),
    };

    await onSaveMinistry(stamped);
    auditService.logAction(activeChurchId, {
      action: 'ministry.updated',
      resource_type: 'ministries',
      resource_id: stamped.id,
      actor_name: currentUser?.name || 'Admin',
      details: { name: stamped.name }
    });
    setIsMinistryModalOpen(false);
    setEditingMinistry(null);
  };

  // Add Member to Active Ministry
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMinistry || !selectedMemberToAdd) {
      alert('Please select a member to add.');
      return;
    }

    const targetMember = churchMembers.find((m) => m.id === selectedMemberToAdd);
    const existing = currentMinMembers.find((mm) => mm.memberId === selectedMemberToAdd);
    if (existing) {
      alert('This member is already registered in this ministry.');
      return;
    }

    const newMembership: MinistryMember = {
      id: `mm-${Date.now()}`,
      church_id: activeChurchId,
      churchId: activeChurchId,
      ministryId: activeMinistry.id,
      memberId: selectedMemberToAdd,
      ministryRole: memberRoleToAdd || 'Team Member',
      status: 'Active',
      joinedAt: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveMinistryMember(newMembership);
    auditService.logAction(activeChurchId, {
      action: 'ministry_member.added',
      resource_type: 'ministry_members',
      resource_id: newMembership.id,
      actor_name: currentUser?.name || 'Admin',
      details: { member: targetMember?.firstName, ministry: activeMinistry.name }
    });
    setIsAddMemberModalOpen(false);
    setSelectedMemberToAdd('');
    setMemberRoleToAdd('Team Member');
  };

  // Remove Member from Ministry
  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this ministry? Their church membership and records will remain completely intact.`)) {
      return;
    }
    await onDeleteMinistryMember(membershipId);
    auditService.logAction(activeChurchId, {
      action: 'ministry_member.removed',
      resource_type: 'ministry_members',
      resource_id: membershipId,
      actor_name: currentUser?.name || 'Admin',
      details: { member: memberName }
    });
  };

  // Create or Update Team
  const handleSaveTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMinistry || !teamFormName.trim()) {
      alert('Team Name is required.');
      return;
    }

    const teamData: MinistryTeam = {
      id: editingTeam?.id || `team-${Date.now()}`,
      church_id: activeChurchId,
      churchId: activeChurchId,
      ministryId: activeMinistry.id,
      name: teamFormName.trim(),
      description: teamFormDesc.trim(),
      leaderName: teamFormLeader.trim(),
      status: editingTeam?.status || 'Active',
      createdAt: editingTeam?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveMinistryTeam(teamData);
    setIsTeamModalOpen(false);
    setEditingTeam(null);
    setTeamFormName('');
    setTeamFormDesc('');
    setTeamFormLeader('');
  };

  // Open Create Activity Modal
  const handleOpenCreateActivity = () => {
    setEditingActivity(null);
    setActivityFormName('');
    setActivityFormDesc('');
    setActivityFormDate(new Date().toISOString().split('T')[0]);
    setActivityFormStartTime('06:00 PM');
    setActivityFormEndTime('07:30 PM');
    setActivityFormLocation('Main Sanctuary');
    setActivityFormTeamId('');
    setActivityFormStatus('Scheduled');
    setIsActivityModalOpen(true);
  };

  // Open Edit Activity Modal
  const handleOpenEditActivity = (act: MinistryActivity) => {
    setEditingActivity(act);
    setActivityFormName(act.name);
    setActivityFormDesc(act.description || '');
    setActivityFormDate(act.date);
    setActivityFormStartTime(act.startTime || '06:00 PM');
    setActivityFormEndTime(act.endTime || '07:30 PM');
    setActivityFormLocation(act.location || 'Main Sanctuary');
    setActivityFormTeamId(act.teamId || '');
    setActivityFormStatus(act.status || 'Scheduled');
    setIsActivityModalOpen(true);
  };

  // Create or Update Activity
  const handleSaveActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMinistry || !activityFormName.trim()) {
      alert('Activity Name is required.');
      return;
    }

    const activityData: MinistryActivity = {
      id: editingActivity ? editingActivity.id : `act-${Date.now()}`,
      church_id: activeChurchId,
      churchId: activeChurchId,
      ministryId: activeMinistry.id,
      teamId: activityFormTeamId || undefined,
      name: activityFormName.trim(),
      description: activityFormDesc.trim(),
      date: activityFormDate,
      startTime: activityFormStartTime,
      endTime: activityFormEndTime,
      location: activityFormLocation.trim(),
      leaderName: activeMinistry.leaderName,
      status: activityFormStatus,
      presentMemberIds: editingActivity ? editingActivity.presentMemberIds : [],
      notes: editingActivity ? editingActivity.notes : undefined,
      createdAt: editingActivity ? editingActivity.createdAt : new Date().toISOString(),
      createdByUserId: editingActivity?.createdByUserId || currentUser?.id,
    };

    await onSaveMinistryActivity(activityData);
    setIsActivityModalOpen(false);
    setEditingActivity(null);
    setActivityFormName('');
    setActivityFormDesc('');
  };

  // Toggle Activity Attendance
  const handleToggleActivityAttendance = async (activity: MinistryActivity, memberId: string) => {
    const isPresent = activity.presentMemberIds.includes(memberId);
    const updatedIds = isPresent
      ? activity.presentMemberIds.filter((id) => id !== memberId)
      : [...activity.presentMemberIds, memberId];

    const updatedActivity: MinistryActivity = {
      ...activity,
      presentMemberIds: updatedIds,
    };
    await onSaveMinistryActivity(updatedActivity);
  };

  // Create or Update Announcement
  const handleSaveAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMinistry || !annTitle.trim() || !annMessage.trim()) {
      alert('Title and Message are required.');
      return;
    }

    const newAnnouncement: MinistryAnnouncement = {
      id: editingAnnouncement ? editingAnnouncement.id : `ma-${Date.now()}`,
      church_id: activeChurchId,
      churchId: activeChurchId,
      ministryId: activeMinistry.id,
      title: annTitle.trim(),
      message: annMessage.trim(),
      authorName: editingAnnouncement ? editingAnnouncement.authorName : (currentUser?.name || activeMinistry.leaderName),
      date: editingAnnouncement ? editingAnnouncement.date : new Date().toISOString().split('T')[0],
      priority: annPriority,
      createdAt: editingAnnouncement ? editingAnnouncement.createdAt : new Date().toISOString(),
    };

    if (onSaveMinistryAnnouncement) {
      await onSaveMinistryAnnouncement(newAnnouncement);
    }
    setIsAnnouncementModalOpen(false);
    setEditingAnnouncement(null);
    setAnnTitle('');
    setAnnMessage('');
  };

  // Create Roster Assignment
  const handleSaveRosterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMinistry || !rosterRoleName.trim() || !rosterMemberId) {
      alert('Please fill role name and select volunteer.');
      return;
    }

    const targetMember = churchMembers.find((m) => m.id === rosterMemberId);
    if (!targetMember || !onSaveRosterAssignment) return;

    const finalServiceName = rosterServiceName.trim() || inferServiceNameForDate(rosterDate, activeMinistry.name, churchSettings);

    const newAssignment: RosterAssignment = {
      id: `roster-${Date.now()}`,
      church_id: activeChurchId,
      churchId: activeChurchId,
      ministryId: activeMinistry.id,
      serviceDate: rosterDate,
      serviceName: finalServiceName,
      roleName: rosterRoleName.trim(),
      team: (activeMinistry.name as any),
      memberId: targetMember.id,
      memberName: `${targetMember.firstName} ${targetMember.lastName}`,
      confirmed: false,
      createdByUserId: currentUser?.id,
      createdByName: currentUser?.name || 'Ministry Leader',
    };

    await onSaveRosterAssignment(newAssignment);
    setIsRosterModalOpen(false);
    setRosterRoleName('');
    setRosterMemberId('');
  };

  // Send WhatsApp to Ministry Members
  const handleCopyWhatsAppBroadcast = () => {
    if (!activeMinistry) return;
    const broadcastText = `*${activeMinistry.name} Update — ${currentChurch.name}*\n\n${waCustomMessage || `Reminder: ${activeMinistry.name} gathering on ${activeMinistry.meetingDay} at ${activeMinistry.meetingTime} (${activeMinistry.meetingLocation}). God bless you!`}\n\n- ${activeMinistry.leaderName}`;
    navigator.clipboard.writeText(broadcastText);
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 3000);
  };

  // Export Ministry Members CSV
  const handleExportMinistryCSV = () => {
    if (!activeMinistry) return;
    const rows = [
      ['Member ID', 'Name', 'Ministry Role', 'Status', 'Phone', 'Email', 'Joined Date'],
      ...currentMinMembers.map((mm) => {
        const m = churchMembers.find((cm) => cm.id === mm.memberId);
        return [
          mm.memberId,
          m ? `${m.firstName} ${m.lastName}` : 'Unknown',
          mm.ministryRole,
          mm.status,
          m?.phone || '',
          m?.email || '',
          mm.joinedAt,
        ];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(item => `"${item}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeMinistry.name.replace(/\s+/g, '_')}_Members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Metrics for Active Ministry
  const memberCount = currentMinMembers.length;
  const teamCount = currentMinTeams.length;
  const activityCount = currentMinActivities.length;
  const totalActivitySpots = currentMinActivities.reduce((acc) => acc + (memberCount || 1), 0);
  const totalAttendances = currentMinActivities.reduce((acc, act) => acc + act.presentMemberIds.length, 0);
  const avgAttendancePercent = totalActivitySpots > 0 ? Math.round((totalAttendances / totalActivitySpots) * 100) : 100;

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* VIEW: INDIVIDUAL MINISTRY DASHBOARD */}
      {/* ========================================================================= */}
      {activeMinistry ? (
        <div className="space-y-5">
          {/* Ministry Header Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ backgroundColor: activeMinistry.color || '#f59e0b' }} />
            
            <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
              <button
                onClick={() => {
                  setSelectedMinistryId(null);
                  setActiveMinistryTab('overview');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Ministries</span>
              </button>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${activeMinistry.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                  {activeMinistry.status}
                </span>
                {(isSuperOrPastor || canManageActiveMinistry) && (
                  <button
                    onClick={() => {
                      setEditingMinistry(activeMinistry);
                      setIsMinistryModalOpen(true);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
                    title="Edit Ministry Settings"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-lg border-2 border-white/20 shrink-0"
                style={{ backgroundColor: activeMinistry.color || '#f59e0b' }}
              >
                {renderMinistryIcon(activeMinistry.icon, 'w-7 h-7')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{activeMinistry.name}</h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl line-clamp-2">{activeMinistry.description}</p>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <strong className="text-slate-200">Leader:</strong> {activeMinistry.leaderName || 'Unassigned'}
                  </span>
                  {activeMinistry.assistantLeaderName && (
                    <span className="flex items-center gap-1">
                      <strong className="text-slate-400">Asst:</strong> {activeMinistry.assistantLeaderName}
                    </span>
                  )}
                  {activeMinistry.meetingDay && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{activeMinistry.meetingDay} {activeMinistry.meetingTime}</span>
                    </span>
                  )}
                  {activeMinistry.meetingLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>{activeMinistry.meetingLocation}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-Navigation Tabs Bar */}
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
              {[
                { id: 'overview' as MinistryTab, label: 'Overview', icon: Landmark },
                { id: 'members' as MinistryTab, label: `Members (${memberCount})`, icon: Users },
                { id: 'teams' as MinistryTab, label: `Teams (${teamCount})`, icon: Layers },
                { id: 'activities' as MinistryTab, label: `Activities (${activityCount})`, icon: Calendar },
                { id: 'attendance' as MinistryTab, label: 'Attendance', icon: UserCheck },
                { id: 'events' as MinistryTab, label: `Events (${currentMinEvents.length})`, icon: Sparkles },
                { id: 'roster' as MinistryTab, label: `Roster (${currentMinRoster.length})`, icon: Clock },
                { id: 'volunteers' as MinistryTab, label: `Volunteers (${potentialVolunteers.length})`, icon: Heart },
                { id: 'communication' as MinistryTab, label: 'Communication', icon: MessageSquare },
                { id: 'reports' as MinistryTab, label: 'Reports', icon: FileText },
                ...((isSuperOrPastor || canManageActiveMinistry) ? [{ id: 'settings' as MinistryTab, label: 'Settings', icon: Edit3 }] : []),
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMinistryTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveMinistryTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SUB-TAB 1: OVERVIEW */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'overview' && (
            <div className="space-y-5">
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{memberCount}</div>
                    <div className="text-[11px] font-semibold uppercase text-slate-400">Total Members</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{teamCount}</div>
                    <div className="text-[11px] font-semibold uppercase text-slate-400">Active Teams</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{avgAttendancePercent}%</div>
                    <div className="text-[11px] font-semibold uppercase text-slate-400">Avg Attendance</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{activityCount}</div>
                    <div className="text-[11px] font-semibold uppercase text-slate-400">Activities</div>
                  </div>
                </div>
              </div>

              {/* Upcoming Activities & Announcements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Upcoming Activity Card */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span>Upcoming Activities</span>
                    </h3>
                    <button
                      onClick={() => setActiveMinistryTab('activities')}
                      className="text-xs text-amber-600 hover:underline font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  {currentMinActivities.length > 0 ? (
                    <div className="space-y-2.5">
                      {currentMinActivities.slice(0, 3).map((act) => (
                        <div key={act.id} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900">{act.name}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600">
                              <span className="font-semibold">{act.date}</span>
                              <span>•</span>
                              <span>{act.startTime}</span>
                              <span>•</span>
                              <span>{act.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              act.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              act.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {act.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditActivity(act)}
                              className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Activity"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs italic">
                      No upcoming activities scheduled.
                    </div>
                  )}
                </div>

                {/* Ministry Announcements Card */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-rose-500" />
                      <span>Ministry Announcements</span>
                    </h3>
                    {canManageAnnouncements && (
                      <button
                        onClick={() => {
                          setEditingAnnouncement(null);
                          setAnnTitle('');
                          setAnnMessage('');
                          setAnnPriority('Normal');
                          setIsAnnouncementModalOpen(true);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>Add Announcement</span>
                      </button>
                    )}
                  </div>

                  {currentMinAnnouncements.length > 0 ? (
                    <div className="space-y-2.5">
                      {currentMinAnnouncements.slice(0, 5).map((ann) => (
                        <div key={ann.id} className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-xs text-rose-950">{ann.title}</h4>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${ann.priority === 'Urgent' ? 'bg-rose-500 text-white' : ann.priority === 'High' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'}`}>
                                {ann.priority}
                              </span>
                              {canManageAnnouncements && (
                                <div className="flex items-center gap-1 ml-1">
                                  <button
                                    type="button"
                                    title="Edit Announcement"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingAnnouncement(ann);
                                      setAnnTitle(ann.title);
                                      setAnnMessage(ann.message);
                                      setAnnPriority(ann.priority || 'Normal');
                                      setIsAnnouncementModalOpen(true);
                                    }}
                                    className="p-1 rounded-lg hover:bg-rose-200/70 text-rose-700 transition"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete Announcement"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm(`Are you sure you want to delete "${ann.title}"?`)) {
                                        if (onDeleteMinistryAnnouncement) {
                                          await onDeleteMinistryAnnouncement(ann.id);
                                        }
                                      }
                                    }}
                                    className="p-1 rounded-lg hover:bg-rose-200/70 text-rose-700 transition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{ann.message}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-rose-100/60">
                            <span>By: {ann.authorName}</span>
                            <span>{ann.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs italic">
                      No announcements published yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 2: MINISTRY MEMBERS */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'members' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ministry Members & Roles</h3>
                  <p className="text-xs text-slate-500">Manage church members serving in {activeMinistry.name}.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportMinistryCSV}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  {canManageActiveMinistry && (
                    <button
                      onClick={() => setIsAddMemberModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>
              </div>

              {currentMinMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentMinMembers.map((mm) => {
                    const m = churchMembers.find((cm) => cm.id === mm.memberId);
                    const fullName = m ? `${m.firstName} ${m.lastName}` : 'Member';
                    const initials = m ? `${m.firstName[0] || ''}${m.lastName[0] || ''}` : 'M';

                    return (
                      <div key={mm.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-400/50 transition flex items-start gap-3 relative group">
                        <UserAvatar
                          name={fullName}
                          avatarUrl={m?.avatarUrl}
                          size="md"
                          shape="rounded"
                          border="border border-slate-200 shadow-2xs"
                        />

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{fullName}</h4>
                          <div className="text-[11px] font-semibold text-amber-700 mt-0.5 truncate">{mm.ministryRole}</div>
                          <div className="text-[10px] text-slate-400 mt-1">Joined: {mm.joinedAt}</div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {m?.phone && (
                              <a href={`tel:${m.phone}`} className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-amber-600 transition" title="Call">
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                            {m?.email && (
                              <a href={`mailto:${m.email}`} className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-amber-600 transition" title="Email">
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {canManageActiveMinistry && (
                          <button
                            onClick={() => handleRemoveMember(mm.id, fullName)}
                            className="text-slate-300 hover:text-rose-500 p-1 transition opacity-0 group-hover:opacity-100"
                            title="Remove from Ministry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 space-y-3">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-700">No members assigned yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add church members to {activeMinistry.name} to assign specific roles, track attendance, and schedule teams.
                  </p>
                  {canManageActiveMinistry && (
                    <button
                      onClick={() => setIsAddMemberModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assign First Member</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 3: MINISTRY TEAMS */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'teams' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ministry Teams & Squads</h3>
                  <p className="text-xs text-slate-500">Organize sub-teams (e.g. Vocalists, Praise Band, Tech, Ushers) within {activeMinistry.name}.</p>
                </div>

                {canManageActiveMinistry && (
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setTeamFormName('');
                      setTeamFormDesc('');
                      setTeamFormLeader('');
                      setIsTeamModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Team</span>
                  </button>
                )}
              </div>

              {currentMinTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentMinTeams.map((team) => {
                    const squadMembers = churchTeamMembers.filter((tm) => tm.teamId === team.id);
                    return (
                      <div key={team.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{team.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{team.description || 'No description'}</p>
                            {team.leaderName && (
                              <span className="inline-block mt-1 text-[11px] text-amber-700 font-semibold">
                                Leader: {team.leaderName}
                              </span>
                            )}
                          </div>

                          {(isSuperOrPastor || canManageActiveMinistry) && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingTeam(team);
                                  setTeamFormName(team.name);
                                  setTeamFormDesc(team.description || '');
                                  setTeamFormLeader(team.leaderName || '');
                                  setIsTeamModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Delete team "${team.name}"?`)) {
                                    await onDeleteMinistryTeam(team.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200/80">
                          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Assigned Members ({squadMembers.length})
                          </div>
                          {squadMembers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {squadMembers.map((tm) => {
                                const m = churchMembers.find((cm) => cm.id === tm.memberId);
                                return (
                                  <span key={tm.id} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium">
                                    {m ? `${m.firstName} ${m.lastName}` : 'Member'} ({tm.role})
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No members assigned to this squad yet.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  No teams configured yet. {canManageActiveMinistry ? 'Click "Create Team" to organize sub-squads.' : ''}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 4: ACTIVITIES & SCHEDULE */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'activities' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ministry Activities & Meetings</h3>
                  <p className="text-xs text-slate-500">Recurring and upcoming rehearsals, Bible studies, and trainings.</p>
                </div>

                {canManageActiveMinistry && (
                  <button
                    onClick={handleOpenCreateActivity}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Activity</span>
                  </button>
                )}
              </div>

              {currentMinActivities.length > 0 ? (
                <div className="space-y-3">
                  {currentMinActivities.map((act) => (
                    <div key={act.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{act.name}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">{act.description}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              {act.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              {act.startTime} {act.endTime ? `- ${act.endTime}` : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              {act.location}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            act.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            act.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {act.status}
                          </span>

                          {canManageActiveMinistry && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditActivity(act)}
                              className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Activity Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(isSuperOrPastor || canManageActiveMinistry) && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Delete activity "${act.name}"?`)) {
                                  await onDeleteMinistryActivity(act.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Activity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Attendance Checklist */}
                      <div className="pt-3 border-t border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Member Attendance ({act.presentMemberIds.length} / {currentMinMembers.length} present)
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {currentMinMembers.map((mm) => {
                            const m = churchMembers.find((cm) => cm.id === mm.memberId);
                            const isPresent = act.presentMemberIds.includes(mm.memberId);
                            return (
                              <button
                                key={mm.id}
                                onClick={() => {
                                  if (canManageActiveMinistry) {
                                    handleToggleActivityAttendance(act, mm.memberId);
                                  }
                                }}
                                disabled={!canManageActiveMinistry}
                                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                                  isPresent 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                    : 'bg-white text-slate-500 border-slate-200'
                                } ${!canManageActiveMinistry ? 'cursor-default opacity-85' : 'hover:border-slate-300'}`}
                              >
                                {isPresent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}
                                <span>{m ? `${m.firstName} ${m.lastName}` : 'Member'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  No activities scheduled. Click "Schedule Activity" to add rehearsals or meetings.
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 5: ATTENDANCE OVERVIEW */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'attendance' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-900 text-base">Ministry Attendance Log</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Total Sessions Held</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{currentMinActivities.length}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Registered Ministry Members</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{currentMinMembers.length}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Overall Attendance Rate</div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">{avgAttendancePercent}%</div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Attendance Breakdown per Activity</h4>
                {currentMinActivities.map((act) => (
                  <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{act.name}</span>
                      <span className="text-slate-400 ml-2">({act.date})</span>
                    </div>
                    <div className="font-bold text-slate-700">
                      {act.presentMemberIds.length} / {currentMinMembers.length} Present
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 6: EVENTS INTEGRATION */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'events' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ministry Events</h3>
                  <p className="text-xs text-slate-500">Connected with church-wide events calendar.</p>
                </div>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('calendar')}
                    className="text-xs text-amber-600 hover:underline font-semibold"
                  >
                    Go to Calendar &rarr;
                  </button>
                )}
              </div>

              {currentMinEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentMinEvents.map((evt) => (
                    <div key={evt.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          {evt.category}
                        </span>
                        <span className="text-xs text-slate-400">{evt.date}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900">{evt.title}</h4>
                      <p className="text-xs text-slate-600">{evt.description}</p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
                        <span>{evt.time}</span>
                        <span>•</span>
                        <span>{evt.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  No tagged events found in the central calendar for this ministry.
                </p>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 7: ROSTER INTEGRATION */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'roster' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ministry Service Roster</h3>
                  <p className="text-xs text-slate-500">Service duties assigned to {activeMinistry.name}.</p>
                </div>

                {onSaveRosterAssignment && canManageActiveMinistry && (
                  <button
                    onClick={() => setIsRosterModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Roster</span>
                  </button>
                )}
              </div>

              {currentMinRoster.length > 0 ? (
                <div className="space-y-2.5">
                  {currentMinRoster.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{r.roleName} — {r.memberName}</div>
                        <div className="text-[11px] text-slate-500">{r.serviceDate} • {r.serviceName}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${r.confirmed ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                          {r.confirmed ? 'Confirmed' : 'Pending'}
                        </span>
                        {onDeleteRosterAssignment && canManageActiveMinistry && (
                          <button
                            type="button"
                            title="Delete Roster Duty"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to remove ${r.memberName}'s duty as ${r.roleName}?`)) {
                                await onDeleteRosterAssignment(r.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  No active roster assignments found for this ministry.
                </p>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 8: VOLUNTEER MATCHING */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'volunteers' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Potential Volunteer Matches</h3>
                <p className="text-xs text-slate-500">Church members possessing matching skills or availability for {activeMinistry.name}.</p>
              </div>

              {potentialVolunteers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {potentialVolunteers.map((m) => (
                    <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-xs text-slate-900">{m.firstName} {m.lastName}</div>
                      <div className="text-[11px] text-slate-500">{m.phone || 'No phone'}</div>
                      <div className="flex flex-wrap gap-1">
                        {(m.skills || []).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 bg-amber-50 text-amber-900 rounded text-[10px] border border-amber-200">
                            {s}
                          </span>
                        ))}
                      </div>
                      {canManageActiveMinistry && (
                        <button
                          onClick={async () => {
                            const newMembership: MinistryMember = {
                              id: `mm-${Date.now()}`,
                              church_id: activeChurchId,
                              churchId: activeChurchId,
                              ministryId: activeMinistry.id,
                              memberId: m.id,
                              ministryRole: 'Volunteer',
                              status: 'Active',
                              joinedAt: new Date().toISOString().split('T')[0],
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            await onSaveMinistryMember(newMembership);
                          }}
                          className="w-full mt-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                        >
                          + Recruit to Ministry
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  All matching church volunteers are already recruited to this ministry.
                </p>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 9: COMMUNICATION & WHATSAPP */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'communication' && (
            <div className="space-y-5">
              {/* Ministry Announcements & Broadcasts */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-rose-500" />
                      <span>Ministry Announcements & Bulletins</span>
                    </h3>
                    <p className="text-xs text-slate-500">Post updates and alerts for {activeMinistry.name} members.</p>
                  </div>

                  {canManageAnnouncements && (
                    <button
                      onClick={() => {
                        setEditingAnnouncement(null);
                        setAnnTitle('');
                        setAnnMessage('');
                        setAnnPriority('Normal');
                        setIsAnnouncementModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>New Announcement</span>
                    </button>
                  )}
                </div>

                {currentMinAnnouncements.length > 0 ? (
                  <div className="space-y-3">
                    {currentMinAnnouncements.map((ann) => (
                      <div key={ann.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                              ann.priority === 'Urgent' ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse' :
                              ann.priority === 'High' ? 'bg-amber-100 text-amber-900 border-amber-200' :
                              'bg-slate-200 text-slate-800 border-slate-300'
                            }`}>
                              {ann.priority}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">{ann.title}</h4>
                          </div>

                          {canManageAnnouncements && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Edit Announcement"
                                onClick={() => {
                                  setEditingAnnouncement(ann);
                                  setAnnTitle(ann.title);
                                  setAnnMessage(ann.message);
                                  setAnnPriority(ann.priority || 'Normal');
                                  setIsAnnouncementModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete Announcement"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete the announcement "${ann.title}"?`)) {
                                    if (onDeleteMinistryAnnouncement) {
                                      await onDeleteMinistryAnnouncement(ann.id);
                                    }
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{ann.message}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>Posted by: <strong>{ann.authorName}</strong></span>
                          <span>{ann.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No announcements published yet for this ministry.
                  </div>
                )}
              </div>

              {/* WhatsApp Notice Generator */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ministry WhatsApp Notice Generator</h3>
                  <p className="text-xs text-slate-500">Draft and broadcast notices directly to {activeMinistry.name} members.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">Custom Notice Message</label>
                  <textarea
                    value={waCustomMessage}
                    onChange={(e) => setWaCustomMessage(e.target.value)}
                    placeholder={`Reminder: ${activeMinistry.name} rehearsal/meeting is scheduled for ${activeMinistry.meetingDay} at ${activeMinistry.meetingTime} at ${activeMinistry.meetingLocation}. Please confirm your attendance.`}
                    rows={4}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white transition"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyWhatsAppBroadcast}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{waCopied ? 'Copied to Clipboard!' : 'Copy WhatsApp Message'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 10: REPORTS */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'reports' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Ministry Summary Report</h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700">
                <div><strong>Ministry:</strong> {activeMinistry.name}</div>
                <div><strong>Leader:</strong> {activeMinistry.leaderName}</div>
                <div><strong>Total Registered Members:</strong> {memberCount}</div>
                <div><strong>Sub-Teams:</strong> {teamCount}</div>
                <div><strong>Activities Logged:</strong> {activityCount}</div>
                <div><strong>Average Attendance:</strong> {avgAttendancePercent}%</div>
              </div>

              <button
                onClick={handleExportMinistryCSV}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Full Member & Attendance CSV</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 11: SETTINGS (ADMIN ONLY) */}
          {/* ========================================================================= */}
          {activeMinistryTab === 'settings' && isSuperOrPastor && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-900 text-base">Ministry Settings & Danger Zone</h3>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Edit Ministry Profile</h4>
                    <p className="text-xs text-slate-500">Update name, meeting day, time, leader, and color accent.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMinistry(activeMinistry);
                      setIsMinistryModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-rose-950">Delete Ministry</h4>
                    <p className="text-xs text-rose-600">Remove this ministry department. Member personal profiles will remain safe.</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you completely sure you want to delete the "${activeMinistry.name}" ministry?`)) {
                        await onDeleteMinistry(activeMinistry.id);
                        setSelectedMinistryId(null);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition"
                  >
                    Delete Ministry
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW: MAIN MINISTRIES DIRECTORY / CARDS LIST */
        /* ========================================================================= */
        <div className="space-y-5">
          {/* Top Banner & Action Header */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Landmark className="w-5 h-5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {hasGlobalMinistryAccess ? 'Ministries & Departments' : 'My Assigned Ministries'}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                {currentChurch.name} • {hasGlobalMinistryAccess ? `${filteredMinistries.length} Departments Configured` : `${filteredMinistries.length} Assigned to You`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {onOpenAiMinistry && (
                <button
                  onClick={onOpenAiMinistry}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>AI Ministry Assistant</span>
                </button>
              )}
              {isSuperOrPastor && (
                <button
                  onClick={handleOpenCreateMinistry}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>New Ministry</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ministries by name, leader, or description..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 rounded-xl text-xs text-white placeholder:text-slate-400 border border-slate-800 focus:border-amber-500 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['ALL', 'Active', 'Inactive'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {st === 'ALL' ? 'All Status' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Ministry Cards Grid */}
          {filteredMinistries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMinistries.map((min) => {
                const minMembers = churchMinistryMembers.filter((mm) => mm.ministryId === min.id);
                const minTeams = churchMinistryTeams.filter((mt) => mt.ministryId === min.id);

                return (
                  <div
                    key={min.id}
                    onClick={() => {
                      setSelectedMinistryId(min.id);
                      setActiveMinistryTab('overview');
                    }}
                    className="bg-slate-900 rounded-3xl p-5 border border-slate-800 hover:border-amber-400/80 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group relative text-white"
                  >
                    <div className="space-y-3">
                      {/* Card Header with Icon & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-md shrink-0 group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: min.color || '#f59e0b' }}
                        >
                          {renderMinistryIcon(min.icon, 'w-6 h-6')}
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${min.status === 'Active' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {min.status}
                          </span>
                          {isSuperOrPastor && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMinistry(min);
                                  setIsMinistryModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
                                title="Edit Ministry"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete the ministry "${min.name}"? This action is permanent.`)) {
                                    await onDeleteMinistry(min.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 transition"
                                title="Delete Ministry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ministry Title & Description */}
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                          {min.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {min.description || 'Dedicated church ministry department.'}
                        </p>
                      </div>

                      {/* Leader and Meeting info */}
                      <div className="space-y-1 text-xs text-slate-300 pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Leader: <strong className="text-white">{min.leaderName || 'Unassigned'}</strong></span>
                        </div>
                        {min.meetingDay && (
                          <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{min.meetingDay} {min.meetingTime || ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer with Quick Stats & Open Button */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                        <span title="Registered Members">👥 {minMembers.length}</span>
                        <span title="Sub-Teams">📂 {minTeams.length}</span>
                      </div>

                      <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        <span>Manage</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
              <Landmark className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="font-bold text-base text-white">
                {!hasGlobalMinistryAccess ? 'No Assigned Ministries' : 'No ministries found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {!hasGlobalMinistryAccess 
                  ? 'You are not assigned to any ministry department yet. Contact your Church Administrator or Ministry Leader to be assigned.'
                  : (searchQuery ? `No ministries match "${searchQuery}".` : 'Get started by creating your first church ministry department.')}
              </p>
              {isSuperOrPastor && (
                <button
                  onClick={handleOpenCreateMinistry}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Ministry</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT MINISTRY */}
      {/* ========================================================================= */}
      {isMinistryModalOpen && editingMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 overflow-hidden max-h-[90vh] flex flex-col my-auto animate-in zoom-in-95 text-white">
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Landmark className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">{editingMinistry.name ? `Edit ${editingMinistry.name}` : 'New Ministry Department'}</h3>
              </div>
              <button
                onClick={() => setIsMinistryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMinistrySubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Ministry Name *</label>
                <input
                  type="text"
                  required
                  value={editingMinistry.name}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, name: e.target.value })}
                  placeholder="e.g. Worship & Music, Sunday School, Youth..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={editingMinistry.description}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, description: e.target.value })}
                  placeholder="What is the mission and purpose of this ministry?"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Ministry Leader</label>
                  <select
                    value={editingMinistry.leaderMemberId || ''}
                    onChange={(e) => {
                      const sel = churchMembers.find((m) => m.id === e.target.value);
                      setEditingMinistry({
                        ...editingMinistry,
                        leaderMemberId: e.target.value,
                        leaderName: sel ? `${sel.firstName} ${sel.lastName}` : editingMinistry.leaderName,
                        contactPhone: sel?.phone || editingMinistry.contactPhone,
                        contactEmail: sel?.email || editingMinistry.contactEmail,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="" className="bg-slate-900 text-white">Select from Church Directory...</option>
                    {churchMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white">{m.firstName} {m.lastName} ({m.status})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Assistant Leader</label>
                  <select
                    value={editingMinistry.assistantLeaderMemberId || ''}
                    onChange={(e) => {
                      const sel = churchMembers.find((m) => m.id === e.target.value);
                      setEditingMinistry({
                        ...editingMinistry,
                        assistantLeaderMemberId: e.target.value,
                        assistantLeaderName: sel ? `${sel.firstName} ${sel.lastName}` : '',
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="" className="bg-slate-900 text-white">Select Assistant Leader...</option>
                    {churchMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white">{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Meeting Day</label>
                  <select
                    value={editingMinistry.meetingDay || 'Sunday'}
                    onChange={(e) => setEditingMinistry({ ...editingMinistry, meetingDay: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Monthly'].map((d) => (
                      <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Meeting Time</label>
                  <input
                    type="text"
                    value={editingMinistry.meetingTime || ''}
                    onChange={(e) => setEditingMinistry({ ...editingMinistry, meetingTime: e.target.value })}
                    placeholder="06:00 PM"
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Status</label>
                  <select
                    value={editingMinistry.status}
                    onChange={(e) => setEditingMinistry({ ...editingMinistry, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Active" className="bg-slate-900 text-white">Active</option>
                    <option value="Inactive" className="bg-slate-900 text-white">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Meeting Location</label>
                <input
                  type="text"
                  value={editingMinistry.meetingLocation || ''}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, meetingLocation: e.target.value })}
                  placeholder="e.g. Main Sanctuary Stage, Fellowship Hall, Room 204"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Color & Icon Palette */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingMinistry.color || '#f59e0b'}
                      onChange={(e) => setEditingMinistry({ ...editingMinistry, color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-700 bg-slate-800"
                    />
                    <span className="font-mono text-[11px] text-slate-400">{editingMinistry.color}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Icon</label>
                  <select
                    value={editingMinistry.icon || 'Landmark'}
                    onChange={(e) => setEditingMinistry({ ...editingMinistry, icon: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {['Landmark', 'Music', 'GraduationCap', 'Sparkles', 'Heart', 'Coffee', 'Video', 'Globe', 'Shield', 'BookOpen', 'Award', 'Megaphone'].map((ic) => (
                      <option key={ic} value={ic} className="bg-slate-900 text-white">{ic}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMinistryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition"
                >
                  Save Ministry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD MEMBER TO MINISTRY */}
      {/* ========================================================================= */}
      {isAddMemberModalOpen && activeMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 text-white">
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Assign Member to {activeMinistry.name}</h3>
              </div>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Select Church Member *</label>
                <select
                  required
                  value={selectedMemberToAdd}
                  onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="" className="bg-slate-900 text-white">Choose a member from church directory...</option>
                  {churchMembers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">{m.firstName} {m.lastName} — ({m.status})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Role within this Ministry *</label>
                <input
                  type="text"
                  required
                  value={memberRoleToAdd}
                  onChange={(e) => setMemberRoleToAdd(e.target.value)}
                  placeholder="e.g. Vocalist, Guitarist, Teacher, Coordinator, Usher..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition"
                >
                  Assign to Ministry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT TEAM */}
      {/* ========================================================================= */}
      {isTeamModalOpen && activeMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 text-white">
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">{editingTeam ? 'Edit Sub-Team' : `New Team in ${activeMinistry.name}`}</h3>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Team / Squad Name *</label>
                <input
                  type="text"
                  required
                  value={teamFormName}
                  onChange={(e) => setTeamFormName(e.target.value)}
                  placeholder="e.g. Vocal Ensemble, Praise Band, Tech & Mics..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={teamFormDesc}
                  onChange={(e) => setTeamFormDesc(e.target.value)}
                  placeholder="Specific role and duties of this sub-team..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Team Leader</label>
                <input
                  type="text"
                  value={teamFormLeader}
                  onChange={(e) => setTeamFormLeader(e.target.value)}
                  placeholder="Leader name"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition"
                >
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SCHEDULE / EDIT ACTIVITY */}
      {/* ========================================================================= */}
      {isActivityModalOpen && activeMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 max-h-[92vh] overflow-y-auto text-white">
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">
                  {editingActivity ? 'Edit Ministry Activity' : 'Schedule Ministry Activity'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsActivityModalOpen(false);
                  setEditingActivity(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveActivitySubmit} className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Activity Name *</label>
                <input
                  type="text"
                  required
                  value={activityFormName}
                  onChange={(e) => setActivityFormName(e.target.value)}
                  placeholder="e.g. Band Rehearsal, Bible Study, Training..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {currentMinTeams.length > 0 && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Assigned Sub-Team (Optional)</label>
                  <select
                    value={activityFormTeamId}
                    onChange={(e) => setActivityFormTeamId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="" className="bg-slate-900 text-white">All Teams / Whole Ministry</option>
                    {currentMinTeams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Date *</label>
                  <input
                    type="date"
                    required
                    value={activityFormDate}
                    onChange={(e) => setActivityFormDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Start Time</label>
                  <input
                    type="text"
                    value={activityFormStartTime}
                    onChange={(e) => setActivityFormStartTime(e.target.value)}
                    placeholder="06:00 PM"
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">End Time (Optional)</label>
                  <input
                    type="text"
                    value={activityFormEndTime}
                    onChange={(e) => setActivityFormEndTime(e.target.value)}
                    placeholder="07:30 PM"
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Status</label>
                  <select
                    value={activityFormStatus}
                    onChange={(e) => setActivityFormStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Scheduled" className="bg-slate-900 text-white">Scheduled</option>
                    <option value="Completed" className="bg-slate-900 text-white">Completed</option>
                    <option value="Cancelled" className="bg-slate-900 text-white">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Location</label>
                <input
                  type="text"
                  value={activityFormLocation}
                  onChange={(e) => setActivityFormLocation(e.target.value)}
                  placeholder="Main Sanctuary Stage"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description / Agenda</label>
                <textarea
                  rows={2}
                  value={activityFormDesc}
                  onChange={(e) => setActivityFormDesc(e.target.value)}
                  placeholder="Agenda, songs, or instructions for attendees..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsActivityModalOpen(false);
                    setEditingActivity(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition"
                >
                  {editingActivity ? 'Save Changes' : 'Schedule Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: POST ANNOUNCEMENT */}
      {/* ========================================================================= */}
      {isAnnouncementModalOpen && activeMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 text-white">
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">Post Ministry Announcement</h3>
              </div>
              <button
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncementSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. New Song Setlist Uploaded..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Message Content *</label>
                <textarea
                  rows={3}
                  required
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Important message or instructions for ministry team members..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Priority Level</label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Normal" className="bg-slate-900 text-white">Normal</option>
                  <option value="High" className="bg-slate-900 text-white">High</option>
                  <option value="Urgent" className="bg-slate-900 text-white">Urgent</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN ROSTER */}
      {/* ========================================================================= */}
      {isRosterModalOpen && activeMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 text-white">
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Assign Service Roster Duty</h3>
              </div>
              <button
                onClick={() => setIsRosterModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRosterSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Service Date *</label>
                <input
                  type="date"
                  required
                  value={rosterDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setRosterDate(newDate);
                    setRosterServiceName(inferServiceNameForDate(newDate, activeMinistry.name, churchSettings));
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Service / Gathering Name *</label>
                <input
                  type="text"
                  required
                  value={rosterServiceName || inferServiceNameForDate(rosterDate, activeMinistry.name, churchSettings)}
                  onChange={(e) => setRosterServiceName(e.target.value)}
                  placeholder="e.g. Wednesday Word & Prayer, Cottage Prayer Gathering..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Duty / Role Name *</label>
                <input
                  type="text"
                  required
                  value={rosterRoleName}
                  onChange={(e) => setRosterRoleName(e.target.value)}
                  placeholder="e.g. Lead Vocals, Acoustic Guitar, Stage Sound..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Assign Member *</label>
                <select
                  required
                  value={rosterMemberId}
                  onChange={(e) => setRosterMemberId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="" className="bg-slate-900 text-white">Select volunteer from this ministry...</option>
                  {currentMinMembers.map((mm) => {
                    const m = churchMembers.find((cm) => cm.id === mm.memberId);
                    return (
                      <option key={mm.id} value={mm.memberId} className="bg-slate-900 text-white">
                        {m ? `${m.firstName} ${m.lastName}` : 'Member'} — ({mm.ministryRole})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRosterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition"
                >
                  Save Duty Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
