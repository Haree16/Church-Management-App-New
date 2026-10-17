import React, { useState, useEffect, useMemo } from 'react';
import { 
  PrayerGroup, 
  PrayerGroupMember, 
  PrayerGroupAttendanceRecord,
  PrayerMeeting, 
  PrayerGuide, 
  EnhancedPrayerRequest, 
  PrayerFollowUpNote,
  PrayerMinistryPermissions,
  PrayerRequestPrivacy,
  PrayerCategoryType
} from '@/types/prayerMinistry';
import { Member, SaaSUser, ChurchTenant } from '@/types';
import { prayerMinistryService } from '@/services/prayerMinistryService';
import { findLinkedMemberForUser } from '@/utils/notificationUtils';
import { PrayerRequestModal } from './PrayerRequestModal';
import { PrayerGroupModal } from './PrayerGroupModal';
import { PrayerMeetingModal } from './PrayerMeetingModal';
import { PrayerGuideModal } from './PrayerGuideModal';
import { PrayerFollowUpModal } from './PrayerFollowUpModal';
import { QuickPrayerGroupAttendanceModal } from './QuickPrayerGroupAttendanceModal';
import { GroupAttendanceWhatsAppModal } from '../groups/GroupAttendanceWhatsAppModal';
import { 
  Heart, Users, Calendar, BookOpen, Plus, Search, Filter, 
  Clock, MapPin, Globe, Shield, CheckCircle2, AlertCircle, 
  Sparkles, Lock, ArrowRight, Check, MessageSquare, Trash2, 
  Edit3, Eye, Video, Send, Crown, UserCheck, Flame, RefreshCw,
  UserPlus, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { getStoredMembers } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PrayerMinistryModuleProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser | null;
  members: Member[];
  onNavigateTab?: (tab: string) => void;
  initialSubTab?: 'overview' | 'groups' | 'requests' | 'meetings' | 'guide';
}

export const PrayerMinistryModule: React.FC<PrayerMinistryModuleProps> = ({
  currentChurch,
  currentUser,
  members = [],
  onNavigateTab,
  initialSubTab = 'overview',
}) => {
  const churchId = currentChurch?.id || 'church-1';

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'requests' | 'meetings' | 'guide'>(initialSubTab);

  // Data States
  const [groups, setGroups] = useState<PrayerGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<PrayerGroupMember[]>([]);
  const [meetings, setMeetings] = useState<PrayerMeeting[]>([]);
  const [guides, setGuides] = useState<PrayerGuide[]>([]);
  const [requests, setRequests] = useState<EnhancedPrayerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<EnhancedPrayerRequest | null>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<PrayerGroup | null>(null);

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingToEdit, setMeetingToEdit] = useState<PrayerMeeting | null>(null);

  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideToEdit, setGuideToEdit] = useState<PrayerGuide | null>(null);

  const [followUpRequest, setFollowUpRequest] = useState<EnhancedPrayerRequest | null>(null);

  // Attendance Modal State
  const [attendanceMeeting, setAttendanceMeeting] = useState<PrayerMeeting | null>(null);

  // Group Details & Selection States (same like cell group)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupDetailsTab, setSelectedGroupDetailsTab] = useState<'overview' | 'members' | 'attendance' | 'meetings' | 'requests'>('overview');
  const [mobileTab, setMobileTab] = useState<'list' | 'details'>('list');

  // Add Member Modal State (same like cell group)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedMemberIdToAdd, setSelectedMemberIdToAdd] = useState('');
  const [memberRoleToAdd, setMemberRoleToAdd] = useState<'Intercessor' | 'Member' | 'Co-Leader' | 'Leader'>('Intercessor');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Group Attendance State (same like cell group)
  const [groupAttendance, setGroupAttendance] = useState<PrayerGroupAttendanceRecord[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<PrayerGroupAttendanceRecord | null>(null);

  // Group Attendance WhatsApp Hub States
  const [isAttendanceWhatsAppModalOpen, setIsAttendanceWhatsAppModalOpen] = useState(false);
  const [whatsAppAttendanceRecord, setWhatsAppAttendanceRecord] = useState<PrayerGroupAttendanceRecord | null>(null);
  const [whatsAppPresentMembers, setWhatsAppPresentMembers] = useState<{ id: string; name: string; phone?: string }[]>([]);
  const [whatsAppAbsentMembers, setWhatsAppAbsentMembers] = useState<{ id: string; name: string; phone?: string }[]>([]);

  // Filters
  const [requestSearch, setRequestSearch] = useState('');
  const [requestFilter, setRequestFilter] = useState<'all' | 'my' | 'leaders' | 'group' | 'wall' | 'answered'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [groupSearch, setGroupSearch] = useState('');
  const [guideLanguage, setGuideLanguage] = useState<'en' | 'ta'>('en');

  // Linked Member & Permissions
  const linkedMember = useMemo(() => {
    return findLinkedMemberForUser(currentUser, members);
  }, [currentUser, members]);

  const permissions: PrayerMinistryPermissions = useMemo(() => {
    return prayerMinistryService.getPermissions(currentUser, linkedMember);
  }, [currentUser, linkedMember]);

  // Load Data on Mount & Church Switch directly from Database
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [g, gm, ga, m, gd, r] = await Promise.all([
        prayerMinistryService.fetchPrayerGroups(churchId),
        prayerMinistryService.fetchPrayerGroupMembers(churchId),
        prayerMinistryService.fetchPrayerGroupAttendance(churchId),
        prayerMinistryService.fetchPrayerMeetings(churchId),
        prayerMinistryService.fetchPrayerGuides(churchId),
        prayerMinistryService.fetchPrayerRequests(churchId),
      ]);

      setGroups(g);
      setGroupMembers(gm);
      setGroupAttendance(ga);
      setMeetings(m);
      setGuides(gd);
      setRequests(r);

      if (g.length > 0 && (!selectedGroupId || !g.some((grp) => grp.id === selectedGroupId))) {
        setSelectedGroupId(g[0].id);
      } else if (g.length === 0) {
        setSelectedGroupId(null);
      }
    } catch (e) {
      console.error('Failed to load prayer ministry data from database:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time live synchronization with Firestore database
    const unsubGroups = prayerMinistryService.subscribePrayerGroups(churchId, (latestGroups) => {
      setGroups(latestGroups);
      if (latestGroups.length > 0 && (!selectedGroupId || !latestGroups.some((grp) => grp.id === selectedGroupId))) {
        setSelectedGroupId(latestGroups[0].id);
      } else if (latestGroups.length === 0) {
        setSelectedGroupId(null);
      }
    });

    const unsubMembers = prayerMinistryService.subscribePrayerGroupMembers(churchId, (latestMembers) => {
      setGroupMembers(latestMembers);
    });

    const unsubAttendance = prayerMinistryService.subscribePrayerGroupAttendance(churchId, (latestAttendance) => {
      setGroupAttendance(latestAttendance);
    });

    const unsubMeetings = prayerMinistryService.subscribePrayerMeetings(churchId, (latestMeetings) => {
      setMeetings(latestMeetings);
    });

    const unsubGuides = prayerMinistryService.subscribePrayerGuides(churchId, (latestGuides) => {
      setGuides(latestGuides);
    });

    const unsubRequests = prayerMinistryService.subscribePrayerRequests(churchId, (latestRequests) => {
      setRequests(latestRequests);
    });

    return () => {
      unsubGroups();
      unsubMembers();
      unsubAttendance();
      unsubMeetings();
      unsubGuides();
      unsubRequests();
    };
  }, [churchId]);

  // Sub-teams & groups current user belongs to
  const userGroupIds = useMemo(() => {
    if (!currentUser) return [];
    const memberId = linkedMember?.id || currentUser.id;
    return groupMembers
      .filter((gm) => gm.member_id === memberId && gm.status === 'Active')
      .map((gm) => gm.group_id);
  }, [groupMembers, linkedMember, currentUser]);

  // Filter requests strictly based on user's authorized access
  const authorizedRequests = useMemo(() => {
    return prayerMinistryService.filterAuthorizedRequests(
      requests,
      currentUser,
      linkedMember,
      userGroupIds,
      permissions
    );
  }, [requests, currentUser, linkedMember, userGroupIds, permissions]);

  // Filtered requests according to UI sub-filter
  const filteredRequests = useMemo(() => {
    const memberId = linkedMember?.id || currentUser?.id;
    const userName = (currentUser?.name || '').trim().toLowerCase();

    return authorizedRequests.filter((r) => {
      // 1. Tab-level filter
      if (requestFilter === 'my') {
        const isAuthor =
          (r.member_id && r.member_id === memberId) ||
          (r.author_name && userName && r.author_name.toLowerCase() === userName);
        if (!isAuthor) return false;
      } else if (requestFilter === 'leaders') {
        if (r.privacy !== 'prayer_leaders') return false;
      } else if (requestFilter === 'group') {
        if (r.privacy !== 'group') return false;
      } else if (requestFilter === 'wall') {
        if (r.privacy !== 'church_wide') return false;
      } else if (requestFilter === 'answered') {
        if (!r.is_answered) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'ALL' && r.category !== selectedCategory) {
        return false;
      }

      // 3. Search query
      if (requestSearch.trim()) {
        const q = requestSearch.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchDesc = r.description.toLowerCase().includes(q);
        const matchAuthor = r.author_name.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchAuthor;
      }

      return true;
    });
  }, [authorizedRequests, requestFilter, selectedCategory, requestSearch, linkedMember, currentUser]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!groupSearch.trim()) return true;
      const q = groupSearch.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.leader_name.toLowerCase().includes(q) ||
        g.topics.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [groups, groupSearch]);

  // Full church member list for prayer group assignment
  const memberList = useMemo(() => {
    let list: any[] = [];
    if (members && members.length > 0) {
      list = members;
    } else {
      list = getStoredMembers() || [];
    }
    return list.filter((m: any) =>
      m.church_id === churchId ||
      m.churchId === churchId ||
      (!m.church_id && !m.churchId && (churchId === 'church-1' || churchId === 'a0000000-0000-0000-0000-000000000001'))
    );
  }, [members, churchId]);

  // Active Selected Prayer Group
  const activeGroup = useMemo(() => {
    if (selectedGroupId) {
      const found = groups.find((g) => g.id === selectedGroupId);
      if (found) return found;
    }
    return groups.length > 0 ? groups[0] : null;
  }, [groups, selectedGroupId]);

  // Members enrolled in active prayer group
  const activeGroupMembers = useMemo(() => {
    if (!activeGroup) return [];
    return groupMembers.filter((gm) => gm.group_id === activeGroup.id);
  }, [groupMembers, activeGroup]);

  // Attendance records for active prayer group
  const activeGroupAttendance = useMemo(() => {
    if (!activeGroup) return [];
    return groupAttendance.filter((a) => a.group_id === activeGroup.id);
  }, [groupAttendance, activeGroup]);

  // Operational attendance pattern calculation (same like cell group)
  const attendancePattern = useMemo(() => {
    if (!activeGroupAttendance || activeGroupAttendance.length === 0) return null;
    const totalSessions = activeGroupAttendance.length;
    const avgPresent = Math.round(
      activeGroupAttendance.reduce(
        (acc, r) => acc + (r.total_present || (r.attendee_ids?.length || 0)),
        0
      ) / totalSessions
    );
    return { totalSessions, avgPresent };
  }, [activeGroupAttendance]);

  // Check if current user can manage the active prayer group (or is group leader)
  const canManageActiveGroup = useMemo(() => {
    if (!currentUser) return false;
    if (permissions.canManageGroups) return true;
    if (!activeGroup) return false;
    const memberId = linkedMember?.id || currentUser.id;
    const userName = (currentUser.name || '').toLowerCase().trim();
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    return (
      activeGroup.leader_id === memberId ||
      activeGroup.leader_id === currentUser.id ||
      (Boolean(activeGroup.leader_name) && (activeGroup.leader_name || '').toLowerCase().trim() === userName) ||
      (Boolean(activeGroup.leader_email) && (activeGroup.leader_email || '').toLowerCase().trim() === userEmail) ||
      activeGroup.co_leader_id === memberId ||
      activeGroup.co_leader_id === currentUser.id ||
      (Boolean(activeGroup.co_leader_name) && (activeGroup.co_leader_name || '').toLowerCase().trim() === userName)
    );
  }, [permissions, activeGroup, currentUser, linkedMember]);

  // Featured Daily Prayer Guide (Top active guide)
  const featuredGuide = guides[0] || null;

  // Next Upcoming Meeting
  const nextMeeting = useMemo(() => {
    const now = new Date();
    return meetings.find((m) => new Date(`${m.date}T${m.start_time || '00:00'}`) >= now) || meetings[0] || null;
  }, [meetings]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSaveRequest = async (req: EnhancedPrayerRequest) => {
    await prayerMinistryService.savePrayerRequest(churchId, req, currentUser);
    loadData();
  };

  const handleDeleteRequest = async (id: string) => {
    if (confirm('Are you sure you want to delete this prayer request?')) {
      await prayerMinistryService.deletePrayerRequest(churchId, id);
      loadData();
    }
  };

  const handleTogglePray = async (requestId: string) => {
    const userId = currentUser?.id || 'guest-user';
    await prayerMinistryService.togglePrayForRequest(churchId, requestId, userId);
    loadData();
  };

  const handleAddFollowUpNote = async (requestId: string, note: PrayerFollowUpNote) => {
    await prayerMinistryService.addFollowUpNote(churchId, requestId, note);
    loadData();
    setFollowUpRequest(null);
  };

  const handleSaveGroup = async (group: PrayerGroup) => {
    await prayerMinistryService.savePrayerGroup(churchId, group);
    setSelectedGroupId(group.id);
    loadData();
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm('Are you sure you want to deactivate/delete this prayer group?')) {
      await prayerMinistryService.deletePrayerGroup(churchId, id);
      if (selectedGroupId === id) {
        setSelectedGroupId(null);
      }
      loadData();
    }
  };

  const handleAddMemberToGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeGroup || !selectedMemberIdToAdd) {
      toast.error('Please select a member to add.');
      return;
    }

    try {
      const memObj = memberList.find((m: any) => m.id === selectedMemberIdToAdd);
      const mName = memObj
        ? `${memObj.firstName || ''} ${memObj.lastName || ''}`.trim() || memObj.name || 'Member'
        : 'Member';
      const mEmail = memObj?.email || undefined;
      const mPhone = memObj?.phone || undefined;
      const mAvatar = memObj?.avatarUrl || memObj?.avatar_url || undefined;

      const newMembership: PrayerGroupMember = {
        id: `pgm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        church_id: churchId,
        group_id: activeGroup.id,
        member_id: selectedMemberIdToAdd,
        member_name: mName,
        member_email: mEmail,
        member_phone: mPhone,
        avatar_url: mAvatar,
        role: memberRoleToAdd,
        status: 'Active',
        joined_at: new Date().toISOString(),
      };

      await prayerMinistryService.saveGroupMember(churchId, newMembership);
      toast.success(`${mName} added to ${activeGroup.name}!`);
      setIsAddMemberModalOpen(false);
      setSelectedMemberIdToAdd('');
      setMemberRoleToAdd('Intercessor');
      setMemberSearchQuery('');
      loadData();
    } catch (err) {
      console.error('Failed to add member to prayer group:', err);
      toast.error('Failed to add member to prayer group.');
    }
  };

  const handleRemoveMemberFromGroup = async (memberRecordId: string, memberName: string) => {
    if (!activeGroup) return;
    if (confirm(`Are you sure you want to remove ${memberName} from ${activeGroup.name}?`)) {
      try {
        await prayerMinistryService.removeGroupMember(churchId, memberRecordId, activeGroup.id);
        toast.success(`${memberName} removed from prayer group.`);
        loadData();
      } catch (err) {
        console.error('Failed to remove member:', err);
        toast.error('Failed to remove member from group.');
      }
    }
  };

  const handleDeleteAttendanceRecord = async (attendanceId: string) => {
    if (!activeGroup) return;
    if (confirm('Are you sure you want to delete this attendance session?')) {
      try {
        await prayerMinistryService.deletePrayerGroupAttendance(churchId, attendanceId);
        toast.success('Attendance session deleted.');
        loadData();
      } catch (err) {
        console.error('Failed to delete attendance record:', err);
        toast.error('Failed to delete attendance record.');
      }
    }
  };

  const handleOpenAttendanceWhatsApp = (
    att: PrayerGroupAttendanceRecord,
    presentList: { id: string; name: string; phone?: string }[],
    absentList: { id: string; name: string; phone?: string }[]
  ) => {
    setWhatsAppAttendanceRecord(att);
    setWhatsAppPresentMembers(presentList);
    setWhatsAppAbsentMembers(absentList);
    setIsAttendanceWhatsAppModalOpen(true);
  };

  const handleJoinGroup = async (group: PrayerGroup) => {
    if (!currentUser) {
      toast.error('Please log in to join this prayer group.');
      return;
    }
    const memberId = linkedMember?.id || currentUser.id;
    const isAlready = groupMembers.some((gm) => gm.group_id === group.id && gm.member_id === memberId);
    if (isAlready) {
      toast.info('You are already a member of this prayer group.');
      return;
    }

    const newMembership: PrayerGroupMember = {
      id: `pgm-${Date.now()}`,
      church_id: churchId,
      group_id: group.id,
      member_id: memberId,
      member_name: currentUser.name || 'Member',
      member_email: currentUser.email,
      role: 'Intercessor',
      status: group.visibility === 'Open' ? 'Active' : 'Pending',
      joined_at: new Date().toISOString(),
    };

    await prayerMinistryService.saveGroupMember(churchId, newMembership);
    toast.success(group.visibility === 'Open' ? `Joined ${group.name} successfully!` : `Join request submitted for ${group.name}. Leader will review.`);
    loadData();
  };

  const handleSaveMeeting = async (meeting: PrayerMeeting) => {
    await prayerMinistryService.savePrayerMeeting(churchId, meeting);
    loadData();
  };

  const handleDeleteMeeting = async (id: string) => {
    if (confirm('Cancel and remove this prayer meeting?')) {
      await prayerMinistryService.deletePrayerMeeting(churchId, id);
      loadData();
    }
  };

  const handleToggleRsvp = async (meetingId: string) => {
    const userId = currentUser?.id || 'guest-user';
    await prayerMinistryService.toggleMeetingRsvp(churchId, meetingId, userId);
    loadData();
  };

  const handleSaveGuide = async (guide: PrayerGuide) => {
    await prayerMinistryService.savePrayerGuide(churchId, guide);
    loadData();
  };

  const handleDeleteGuide = async (id: string) => {
    if (confirm('Delete this prayer guide?')) {
      await prayerMinistryService.deletePrayerGuide(churchId, id);
      loadData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Hero Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none bg-amber-500" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                  <Heart className="w-4 h-4 fill-amber-400/20" />
                </span>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Prayer Ministry
                </span>
                {permissions.isMinistryLeader ? (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3" /> Ministry Leader
                  </span>
                ) : permissions.isGroupLeader ? (
                  <span className="bg-sky-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Shield className="w-3 h-3" /> Group Leader
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Intercessor / Member
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Prayer Ministry & Intercession
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Connecting believers in fervent prayer, confidential pastoral care, and daily Scripture guides
              </p>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => {
                  setRequestToEdit(null);
                  setIsRequestModalOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Request</span>
              </button>

              {permissions.canManageGroups && (
                <button
                  onClick={() => {
                    setGroupToEdit(null);
                    setIsGroupModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>New Group</span>
                </button>
              )}

              {permissions.canManageMeetings && (
                <button
                  onClick={() => {
                    setMeetingToEdit(null);
                    setIsMeetingModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Meeting</span>
                </button>
              )}

              {permissions.canPublishPrayerGuide && (
                <button
                  onClick={() => {
                    setGuideToEdit(null);
                    setIsGuideModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Guide</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-semibold uppercase">Prayer Groups</div>
                <div className="text-lg font-bold text-white">{groups.length} Groups</div>
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-semibold uppercase">Active Needs</div>
                <div className="text-lg font-bold text-white">{authorizedRequests.filter((r) => !r.is_answered).length} Requests</div>
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-semibold uppercase">Meetings</div>
                <div className="text-lg font-bold text-white">{meetings.length} Scheduled</div>
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-semibold uppercase">Answered Praises</div>
                <div className="text-lg font-bold text-emerald-300">{authorizedRequests.filter((r) => r.is_answered).length} Answered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition shrink-0 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition shrink-0 flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Prayer Groups ({groups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition shrink-0 flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Requests & Wall ({authorizedRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('meetings')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition shrink-0 flex items-center gap-2 ${
            activeTab === 'meetings'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Prayer Meetings ({meetings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition shrink-0 flex items-center gap-2 ${
            activeTab === 'guide'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Prayer Guide ({guides.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. OVERVIEW DASHBOARD */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Featured Guide & Recent Requests */}
            <div className="lg:col-span-2 space-y-6">
              {/* Featured Scripture Prayer Guide Card */}
              {featuredGuide && (
                <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3.5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <BookOpen className="w-4 h-4" />
                      <span>Scripture Prayer Guide • {featuredGuide.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-xl border border-slate-800 text-[10px]">
                      <button
                        onClick={() => setGuideLanguage('en')}
                        className={`font-bold px-1.5 py-0.5 rounded ${guideLanguage === 'en' ? 'text-amber-400' : 'text-slate-400'}`}
                      >
                        English
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        onClick={() => setGuideLanguage('ta')}
                        className={`font-bold px-1.5 py-0.5 rounded ${guideLanguage === 'ta' ? 'text-amber-400' : 'text-slate-400'}`}
                      >
                        தமிழ்
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white">
                      {guideLanguage === 'ta' && featuredGuide.title_ta ? featuredGuide.title_ta : featuredGuide.title}
                    </h3>
                    <div className="text-xs font-semibold text-amber-300 mt-0.5">
                      📖 {featuredGuide.scripture_reference}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-xs text-slate-300 italic leading-relaxed">
                    {guideLanguage === 'ta' && featuredGuide.scripture_text_ta
                      ? featuredGuide.scripture_text_ta
                      : featuredGuide.scripture_text_en}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {guideLanguage === 'ta' && featuredGuide.reflection_ta
                      ? featuredGuide.reflection_ta
                      : featuredGuide.reflection_en}
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Author: <strong className="text-white">{featuredGuide.author_name}</strong>
                    </span>
                    <button
                      onClick={() => setActiveTab('guide')}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <span>View All Prayer Points</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Prayer Needs (Privacy Scoped) */}
              <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Heart className="w-4 h-4 text-amber-400" />
                      <span>Recent Prayer Requests</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Requests you are authorized to intercede for
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <span>View All ({authorizedRequests.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {authorizedRequests.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-slate-800/70 border border-slate-750 rounded-2xl space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            r.privacy === 'private'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                              : r.privacy === 'prayer_leaders'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                              : r.privacy === 'group'
                              ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          }`}>
                            {r.privacy === 'private' ? '🔒 Private' : r.privacy === 'prayer_leaders' ? '🛡️ Leaders Only' : r.privacy === 'group' ? '👥 Group' : '🌐 Public Wall'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">{r.category}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-white">{r.title}</h4>
                      <p className="text-xs text-slate-300 line-clamp-2">{r.description}</p>

                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400">
                          By: <strong className="text-white">{r.author_name}</strong>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePray(r.id)}
                            className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center gap-1 transition"
                          >
                            <span>🙏</span>
                            <span>Prayed ({r.prayer_count})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Col: My Groups & Next Upcoming Meeting */}
            <div className="space-y-6">
              {/* Next Prayer Meeting Card */}
              {nextMeeting && (
                <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Upcoming Meeting
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                      {nextMeeting.meeting_type}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white">{nextMeeting.title}</h4>
                    <p className="text-[11px] text-slate-400">{nextMeeting.group_name}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{nextMeeting.date} • {nextMeeting.start_time} - {nextMeeting.end_time || ''}</span>
                    </div>
                    {nextMeeting.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{nextMeeting.location}</span>
                      </div>
                    )}
                    {nextMeeting.online_url && (
                      <div className="flex items-center gap-2">
                        <Video className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <a
                          href={nextMeeting.online_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline truncate"
                        >
                          Join Online Video Call
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleRsvp(nextMeeting.id)}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Attending ({nextMeeting.attendee_ids?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('meetings')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      All Meetings
                    </button>
                  </div>
                </div>
              )}

              {/* My Prayer Groups Summary */}
              <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3.5 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>My Prayer Groups</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('groups')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300"
                  >
                    Browse All
                  </button>
                </div>

                {groups.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                    No prayer groups created yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {groups.slice(0, 3).map((g) => {
                      const isMember = userGroupIds.includes(g.id);
                      return (
                        <div
                          key={g.id}
                          className="p-3 bg-slate-800/80 rounded-2xl border border-slate-750 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-xs text-white">{g.name}</h4>
                              <p className="text-[10px] text-slate-400">
                                {g.meeting_day} • {g.meeting_time}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/20 shrink-0">
                              {g.member_count} Members
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/60">
                            <span className="text-slate-400">
                              Leader: <strong className="text-white">{g.leader_name}</strong>
                            </span>
                            {!isMember ? (
                              <button
                                onClick={() => handleJoinGroup(g)}
                                className="text-amber-400 hover:text-amber-300 font-bold"
                              >
                                Join
                              </button>
                            ) : (
                              <span className="text-emerald-400 font-semibold text-[10px]">
                                ✓ Joined
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PRAYER GROUPS TAB */}
      {/* ============================================================ */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search groups by name, leader, topics..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 outline-none"
              />
            </div>

            {permissions.canManageGroups && (
              <button
                onClick={() => {
                  setGroupToEdit(null);
                  setIsGroupModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Prayer Group</span>
              </button>
            )}
          </div>

          {filteredGroups.length === 0 ? (
            <Card className="bg-slate-900 border-dashed border-slate-800 text-center p-8 text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h4 className="font-bold text-white text-sm">No Prayer Groups Found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {groupSearch ? 'No groups match your search.' : 'Click "Create Prayer Group" above to start your first prayer group.'}
              </p>
            </Card>
          ) : (
            <>
              {/* Mobile View Switcher (lg:hidden) */}
              <div className="flex lg:hidden rounded-xl bg-slate-900 border border-slate-800 p-1 mb-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMobileTab('list')}
                  className={`flex-1 py-2 rounded-lg text-center transition ${
                    mobileTab === 'list'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Group List ({filteredGroups.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('details')}
                  className={`flex-1 py-2 rounded-lg text-center transition ${
                    mobileTab === 'details'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Group Details {activeGroup ? `(${activeGroup.name})` : ''}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Column: Group Cards List */}
                <div className={`lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1 ${mobileTab === 'details' ? 'hidden lg:block' : 'block'}`}>
                  {filteredGroups.map((g) => {
                    const isSelected = activeGroup?.id === g.id;
                    const isMember = userGroupIds.includes(g.id);
                    const isLeader =
                      g.leader_id === linkedMember?.id ||
                      g.leader_id === currentUser?.id ||
                      (Boolean(currentUser?.name) && g.leader_name?.toLowerCase() === currentUser?.name?.toLowerCase());
                    const gMembers = groupMembers.filter((gm) => gm.group_id === g.id);
                    const canManageG = permissions.canManageGroups || isLeader;

                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          setMobileTab('details');
                        }}
                        className={`p-4 rounded-2xl border transition cursor-pointer relative space-y-3 ${
                          isSelected
                            ? 'bg-slate-800/95 border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-white text-sm">{g.name}</h4>
                              {isLeader && (
                                <span className="bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                                  Leader
                                </span>
                              )}
                              <span className="bg-slate-800 text-amber-300 border border-slate-700 text-[10px] px-2 py-0.5 rounded-md font-medium">
                                {g.frequency}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {g.description || 'Prayer group gathering for intercession and spiritual growth.'}
                            </p>
                          </div>

                          <span className="px-2 py-0.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold shrink-0">
                            {gMembers.length || g.member_count} Members
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-300 pt-0.5">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{g.meeting_day} • {g.meeting_time}</span>
                          </div>
                          {g.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{g.location}</span>
                            </div>
                          )}
                          {g.online_url && (
                            <div className="flex items-center gap-2">
                              <Video className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-amber-400 truncate">Online Call Active</span>
                            </div>
                          )}
                        </div>

                        {/* Topics Pills */}
                        {g.topics && g.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {g.topics.slice(0, 3).map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 text-[10px] border border-slate-700">
                                {t}
                              </span>
                            ))}
                            {g.topics.length > 3 && (
                              <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">+{g.topics.length - 3}</span>
                            )}
                          </div>
                        )}

                        <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-400">
                            Leader: <strong className="text-white">{g.leader_name}</strong>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {!isMember ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoinGroup(g);
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                              >
                                Join Group
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                                ✓ Joined
                              </span>
                            )}

                            {canManageG && (
                              <Button
                                size="sm"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGroupId(g.id);
                                  setIsAddMemberModalOpen(true);
                                }}
                                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold h-7 px-2.5 rounded-xl"
                                title="Add Member to Group"
                              >
                                <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Member
                              </Button>
                            )}

                            {permissions.canManageGroups && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGroupToEdit(g);
                                    setIsGroupModalOpen(true);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                  title="Edit group"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteGroup(g.id);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                  title="Delete group"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Group Detail Dashboard */}
                <div className={`lg:col-span-7 ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}`}>
                  {activeGroup ? (
                    <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div className="p-5 border-b border-slate-800 bg-slate-950/50 space-y-3">
                        <button
                          type="button"
                          onClick={() => setMobileTab('list')}
                          className="lg:hidden inline-flex items-center gap-1 text-xs text-amber-400 font-semibold hover:underline mb-1"
                        >
                          ← Back to Group List
                        </button>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-bold text-white">{activeGroup.name}</h3>
                              <Badge variant="outline" className="text-[10px] bg-amber-950/60 text-amber-300 border-amber-800 font-bold">
                                {activeGroup.frequency} • {activeGroup.meeting_type}
                              </Badge>
                              {activeGroup.visibility && (
                                <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-300 border-slate-700">
                                  {activeGroup.visibility}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {activeGroup.description || 'Spiritual prayer group gathering for intercession, healing, and revival.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                            {canManageActiveGroup && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingAttendance(null);
                                    setIsAttendanceModalOpen(true);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-8 px-3 shadow"
                                >
                                  <Zap className="w-3.5 h-3.5 mr-1" /> Quick Attendance
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setIsAddMemberModalOpen(true)}
                                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold h-8 px-3 shadow"
                                >
                                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Member
                                </Button>
                              </>
                            )}
                            {permissions.canManageGroups && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setGroupToEdit(activeGroup);
                                    setIsGroupModalOpen(true);
                                  }}
                                  className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs h-8"
                                  title="Edit Group"
                                >
                                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteGroup(activeGroup.id)}
                                  className="bg-slate-800 border-rose-900/60 text-rose-400 hover:bg-rose-950 text-xs h-8 px-2.5"
                                  title="Delete Group"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Operational Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-[11px] text-slate-400">
                          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 shadow-xs">
                            <span className="text-slate-400 block">Leader:</span>
                            <strong className="text-amber-400 font-bold">{activeGroup.leader_name}</strong>
                          </div>

                          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 shadow-xs">
                            <span className="text-slate-400 block">Schedule:</span>
                            <strong className="text-white">{activeGroup.meeting_day} • {activeGroup.meeting_time}</strong>
                          </div>

                          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 shadow-xs">
                            <span className="text-slate-400 block">Location:</span>
                            <strong className="text-white truncate block">{activeGroup.location || 'Online Call'}</strong>
                          </div>

                          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 shadow-xs">
                            <span className="text-slate-400 block">Enrolled Members:</span>
                            <strong className="text-amber-300 font-bold">
                              {activeGroupMembers.length} Members
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Detail Sub-Tabs (same like cell group) */}
                      <div className="border-b border-slate-800 px-5 flex items-center gap-2 overflow-x-auto text-xs font-semibold bg-slate-950/20">
                        <button
                          type="button"
                          onClick={() => setSelectedGroupDetailsTab('overview')}
                          className={`py-3 px-2 border-b-2 transition shrink-0 ${
                            selectedGroupDetailsTab === 'overview'
                              ? 'border-amber-400 text-amber-300 font-bold'
                              : 'border-transparent text-slate-400 hover:text-white'
                          }`}
                        >
                          Overview
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedGroupDetailsTab('members')}
                          className={`py-3 px-2 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                            selectedGroupDetailsTab === 'members'
                              ? 'border-amber-400 text-amber-300 font-bold'
                              : 'border-transparent text-slate-400 hover:text-white'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Members ({activeGroupMembers.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedGroupDetailsTab('attendance')}
                          className={`py-3 px-2 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                            selectedGroupDetailsTab === 'attendance'
                              ? 'border-emerald-400 text-emerald-300 font-bold'
                              : 'border-transparent text-slate-400 hover:text-white'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Attendance ({activeGroupAttendance.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedGroupDetailsTab('meetings')}
                          className={`py-3 px-2 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                            selectedGroupDetailsTab === 'meetings'
                              ? 'border-amber-400 text-amber-300 font-bold'
                              : 'border-transparent text-slate-400 hover:text-white'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Meetings ({meetings.filter((m) => m.group_id === activeGroup.id).length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedGroupDetailsTab('requests')}
                          className={`py-3 px-2 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                            selectedGroupDetailsTab === 'requests'
                              ? 'border-amber-400 text-amber-300 font-bold'
                              : 'border-transparent text-slate-400 hover:text-white'
                          }`}
                        >
                          <Heart className="w-3.5 h-3.5" />
                          <span>Requests ({requests.filter((r) => r.target_group_id === activeGroup.id).length})</span>
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="p-5">
                        {/* OVERVIEW */}
                        {selectedGroupDetailsTab === 'overview' && (
                          <div className="space-y-4">
                            {/* Operational Attendance Pattern Summary */}
                            {attendancePattern ? (
                              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-amber-300 block">Group Prayer Activity Rate:</span>
                                  <p className="text-slate-400 mt-0.5">
                                    Average <strong className="text-emerald-400">{attendancePattern.avgPresent} intercessors present</strong> per meeting across {attendancePattern.totalSessions} sessions logged.
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-emerald-950/80 text-emerald-300 border-emerald-800/80 font-bold">
                                  Active Attendance
                                </Badge>
                              </div>
                            ) : (
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-500 text-center flex items-center justify-between">
                                <span>No attendance sessions logged yet. Tap "Quick Attendance" to record intercessor presence.</span>
                                {canManageActiveGroup && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setEditingAttendance(null);
                                      setIsAttendanceModalOpen(true);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold h-6 px-2.5 ml-2 shrink-0"
                                  >
                                    <Zap className="w-3 h-3 mr-1" /> Quick Attendance
                                  </Button>
                                )}
                              </div>
                            )}
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Focus & Topics</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {activeGroup.topics.map((t, idx) => (
                                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-slate-700 text-xs">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {activeGroup.online_url && (
                              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span className="text-slate-300">Online Prayer Call Link:</span>
                                </div>
                                <a
                                  href={activeGroup.online_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-400 hover:underline font-bold"
                                >
                                  Join Room ↗
                                </a>
                              </div>
                            )}

                            {/* Quick Members Preview */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                  Roster Preview ({activeGroupMembers.length})
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setSelectedGroupDetailsTab('members')}
                                  className="text-xs font-bold text-amber-400 hover:underline"
                                >
                                  View All Members →
                                </button>
                              </div>

                              {activeGroupMembers.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-2">No members assigned yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {activeGroupMembers.slice(0, 4).map((gm) => (
                                    <div
                                      key={gm.id}
                                      className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                                          {gm.member_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <span className="font-bold text-white block">{gm.member_name}</span>
                                          <span className="text-[10px] text-slate-400">
                                            Role: <strong className="text-amber-300">{gm.role}</strong>
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(gm.joined_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* MEMBERS TAB (identical to cell group) */}
                        {selectedGroupDetailsTab === 'members' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Group Roster & Participation ({activeGroupMembers.length})
                              </h4>
                              {canManageActiveGroup && (
                                <Button
                                  size="sm"
                                  onClick={() => setIsAddMemberModalOpen(true)}
                                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold h-7"
                                >
                                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Member
                                </Button>
                              )}
                            </div>

                            {activeGroupMembers.length === 0 ? (
                              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl space-y-2">
                                <Users className="w-8 h-8 mx-auto text-slate-600" />
                                <p className="text-xs text-slate-400">No members assigned to this prayer group yet.</p>
                                {canManageActiveGroup && (
                                  <Button
                                    size="sm"
                                    onClick={() => setIsAddMemberModalOpen(true)}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold h-7"
                                  >
                                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Add First Member
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {activeGroupMembers.map((gm) => (
                                  <div
                                    key={gm.id}
                                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                                        {gm.member_name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-white">{gm.member_name}</span>
                                          <Badge
                                            variant="outline"
                                            className={`text-[9px] px-1.5 py-0 ${
                                              gm.role === 'Leader'
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                : gm.role === 'Co-Leader'
                                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                                : gm.role === 'Intercessor'
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                : 'bg-slate-800 text-slate-300 border-slate-700'
                                            }`}
                                          >
                                            {gm.role}
                                          </Badge>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-3">
                                          {gm.member_phone && <span>📞 {gm.member_phone}</span>}
                                          {gm.member_email && <span>✉️ {gm.member_email}</span>}
                                          <span>Joined: {new Date(gm.joined_at).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {canManageActiveGroup && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveMemberFromGroup(gm.id, gm.member_name)}
                                        className="text-slate-400 hover:text-rose-400 h-7 px-2"
                                        title="Remove member"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ATTENDANCE TAB (same like cell group) */}
                        {selectedGroupDetailsTab === 'attendance' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Attendance Session Records ({activeGroupAttendance.length})
                              </h4>
                              {canManageActiveGroup && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingAttendance(null);
                                    setIsAttendanceModalOpen(true);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-7"
                                >
                                  <Zap className="w-3.5 h-3.5 mr-1" /> Quick Attendance
                                </Button>
                              )}
                            </div>

                            {activeGroupAttendance.length === 0 ? (
                              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl space-y-2">
                                <Zap className="w-8 h-8 mx-auto text-slate-600" />
                                <p className="text-xs text-slate-400">No prayer attendance sessions recorded yet.</p>
                                {canManageActiveGroup && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setEditingAttendance(null);
                                      setIsAttendanceModalOpen(true);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-7"
                                  >
                                    <Zap className="w-3.5 h-3.5 mr-1" /> Record First Session
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {activeGroupAttendance.map((att) => {
                                  const attendeeIdSet = new Set(att.attendee_ids || []);
                                  const presentMembers: string[] = [];
                                  const absentMembers: string[] = [];
                                  const presentMemberObjs: { id: string; name: string; phone?: string }[] = [];
                                  const absentMemberObjs: { id: string; name: string; phone?: string }[] = [];

                                  activeGroupMembers.forEach((gm) => {
                                    const mId = gm.member_id || gm.id;
                                    const name = gm.member_name;
                                    const phone = gm.member_phone || '';
                                    if (attendeeIdSet.has(mId) || attendeeIdSet.has(gm.id)) {
                                      presentMembers.push(name);
                                      presentMemberObjs.push({ id: mId, name, phone });
                                    } else {
                                      absentMembers.push(name);
                                      absentMemberObjs.push({ id: mId, name, phone });
                                    }
                                  });

                                  // Add any extra attendees not found in active roster
                                  att.attendee_ids?.forEach((id) => {
                                    const inGroup = activeGroupMembers.some((gm) => gm.member_id === id || gm.id === id);
                                    if (!inGroup) {
                                      const found: any = memberList.find((m: any) => m.id === id || m.user_id === id);
                                      const guestName = found
                                        ? (found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim())
                                        : `Member (${id.slice(0, 6)})`;
                                      const guestPhone = found?.phone || found?.profile?.phone || '';
                                      if (guestName && !presentMembers.includes(guestName)) {
                                        presentMembers.push(guestName);
                                        presentMemberObjs.push({ id, name: guestName, phone: guestPhone });
                                      }
                                    }
                                  });

                                  return (
                                    <div key={att.id} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                          {att.session_date}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="bg-emerald-950/80 text-emerald-300 border-emerald-800/80 text-[10px] font-bold">
                                            ✓ {presentMembers.length} Present
                                          </Badge>
                                          {absentMembers.length > 0 && (
                                            <Badge variant="outline" className="bg-rose-950/80 text-rose-300 border-rose-800/80 text-[10px] font-bold">
                                              ✕ {absentMembers.length} Absent
                                            </Badge>
                                          )}
                                          <Button
                                            size="sm"
                                            onClick={() => handleOpenAttendanceWhatsApp(att, presentMemberObjs, absentMemberObjs)}
                                            className="h-6 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-md shadow-sm flex items-center gap-1"
                                            title="Share to WhatsApp, Follow Up Missing Members, Report to Pastor"
                                          >
                                            <MessageSquare className="w-3 h-3" />
                                            <span>WhatsApp</span>
                                          </Button>
                                          {canManageActiveGroup && (
                                            <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5 ml-1">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                  setEditingAttendance(att);
                                                  setIsAttendanceModalOpen(true);
                                                }}
                                                className="h-6 w-6 p-0 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-md"
                                                title="Edit Attendance Record"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteAttendanceRecord(att.id)}
                                                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md"
                                                title="Delete Attendance Record"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {att.topic && (
                                        <p className="text-slate-200 font-semibold text-xs">
                                          <span className="text-amber-400 font-bold mr-1">Focus / Scripture:</span>
                                          {att.topic}
                                        </p>
                                      )}
                                      {att.notes && (
                                        <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                                          {att.notes}
                                        </p>
                                      )}

                                      {/* Present & Absent Member Lists */}
                                      <div className="space-y-2 pt-1 border-t border-slate-800/60">
                                        <div>
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                                            Present Intercessors ({presentMembers.length}):
                                          </span>
                                          {presentMembers.length === 0 ? (
                                            <span className="text-[11px] text-slate-500 italic">No attendees logged.</span>
                                          ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                              {presentMembers.map((name, i) => (
                                                <span
                                                  key={i}
                                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium"
                                                >
                                                  <UserCheck className="w-3 h-3 text-emerald-400" />
                                                  {name}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {absentMembers.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
                                              Absent Members ({absentMembers.length}):
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                              {absentMembers.map((name, i) => (
                                                <span
                                                  key={i}
                                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300/90 text-[11px] font-medium"
                                                >
                                                  <AlertCircle className="w-3 h-3 text-rose-400" />
                                                  {name}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* MEETINGS TAB */}
                        {selectedGroupDetailsTab === 'meetings' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Upcoming & Past Meetings
                              </h4>
                              {permissions.canManageMeetings && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setMeetingToEdit(null);
                                    setIsMeetingModalOpen(true);
                                  }}
                                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold h-7"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Schedule Meeting
                                </Button>
                              )}
                            </div>

                            {meetings.filter((m) => m.group_id === activeGroup.id).length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-4 text-center">No prayer meetings scheduled for this group.</p>
                            ) : (
                              <div className="space-y-2">
                                {meetings
                                  .filter((m) => m.group_id === activeGroup.id)
                                  .map((m) => (
                                    <div
                                      key={m.id}
                                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <span className="font-bold text-white block">{m.title}</span>
                                        <span className="text-[10px] text-slate-400">
                                          {m.date} • {m.start_time} ({m.meeting_type})
                                        </span>
                                      </div>
                                      <span className="text-amber-400 font-bold text-[11px]">{m.location || 'Online'}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* REQUESTS TAB */}
                        {selectedGroupDetailsTab === 'requests' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Group Prayer Requests
                              </h4>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setRequestToEdit(null);
                                  setIsRequestModalOpen(true);
                                }}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold h-7"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Prayer Request
                              </Button>
                            </div>

                            {requests.filter((r) => r.target_group_id === activeGroup.id).length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-4 text-center">No specific prayer requests linked to this group.</p>
                            ) : (
                              <div className="space-y-2">
                                {requests
                                  .filter((r) => r.target_group_id === activeGroup.id)
                                  .map((r) => (
                                    <div
                                      key={r.id}
                                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-white">{r.title}</span>
                                        <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/40">
                                          {r.category}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] text-slate-400">{r.description}</p>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <Card className="bg-slate-900 border-dashed border-slate-800 text-center p-8 text-slate-400">
                      <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <h4 className="font-bold text-white text-sm">Select a Prayer Group</h4>
                      <p className="text-xs text-slate-400 mt-1">Choose a group from the list on the left to manage members and schedule meetings.</p>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. PRAYER REQUESTS & WALL TAB */}
      {/* ============================================================ */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Search prayer requests by title, author, keyword..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 outline-none"
                />
              </div>

              <button
                onClick={() => {
                  setRequestToEdit(null);
                  setIsRequestModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Request</span>
              </button>
            </div>

            {/* Scope Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setRequestFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                  requestFilter === 'all' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Authorized ({authorizedRequests.length})
              </button>
              <button
                onClick={() => setRequestFilter('my')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                  requestFilter === 'my' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                My Requests
              </button>
              {permissions.canViewSharedWithLeadersRequests && (
                <button
                  onClick={() => setRequestFilter('leaders')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                    requestFilter === 'leaders' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🛡️ Shared with Leaders
                </button>
              )}
              <button
                onClick={() => setRequestFilter('group')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                  requestFilter === 'group' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                👥 My Group Requests
              </button>
              <button
                onClick={() => setRequestFilter('wall')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                  requestFilter === 'wall' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🌐 Public Wall
              </button>
              <button
                onClick={() => setRequestFilter('answered')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                  requestFilter === 'answered' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🎉 Praises & Testimonies
              </button>
            </div>
          </div>

          {/* Requests Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((r) => {
              const isAuthor = r.member_id === linkedMember?.id || r.author_name.toLowerCase() === (currentUser?.name || '').toLowerCase();
              const canEdit = isAuthor || permissions.isChurchAdmin;

              return (
                <div
                  key={r.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 text-white flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          r.privacy === 'private'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : r.privacy === 'prayer_leaders'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                            : r.privacy === 'group'
                            ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        }`}>
                          {r.privacy === 'private' ? '🔒 Private' : r.privacy === 'prayer_leaders' ? '🛡️ Leaders Only' : r.privacy === 'group' ? `👥 ${r.target_group_name || 'Group'}` : '🌐 Public Wall'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">{r.category}</span>
                      </div>

                      {r.status === 'Urgent' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                          🚨 Urgent
                        </span>
                      )}
                      {r.is_answered && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                          🎉 Answered
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-white">{r.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{r.description}</p>

                    {/* Answered Testimony Box */}
                    {r.is_answered && r.testimony && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl space-y-1 text-xs">
                        <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Testimony & Praise Report:
                        </div>
                        <p className="text-slate-200 italic">"{r.testimony}"</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Submitted by: <strong className="text-white">{r.author_name}</strong></span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePray(r.id)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                        >
                          <span>🙏</span>
                          <span>I Prayed ({r.prayer_count})</span>
                        </button>

                        {permissions.canRecordFollowUp && (
                          <button
                            onClick={() => setFollowUpRequest(r)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs flex items-center gap-1 transition"
                            title="Add Pastoral follow-up touch"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                            <span>Notes ({r.follow_up_notes?.length || 0})</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => {
                                setRequestToEdit(r);
                                setIsRequestModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                              title="Edit request"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRequest(r.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                              title="Delete request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. PRAYER MEETINGS TAB */}
      {/* ============================================================ */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-white">Prayer Meetings & Watches</h3>
              <p className="text-[11px] text-slate-400">Scheduled corporate gatherings and virtual intercessory rooms</p>
            </div>

            {permissions.canManageMeetings && (
              <button
                onClick={() => {
                  setMeetingToEdit(null);
                  setIsMeetingModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Meeting</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map((m) => {
              const isAttending = (m.attendee_ids || []).includes(currentUser?.id || '');

              return (
                <div
                  key={m.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5 text-white flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-sky-400">{m.group_name || 'Church-Wide'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                        {m.meeting_type}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white">{m.title}</h3>
                    <p className="text-xs text-slate-400">{m.description}</p>

                    <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{m.date} • {m.start_time} - {m.end_time || ''}</span>
                      </div>
                      {m.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{m.location}</span>
                        </div>
                      )}
                      {m.online_url && (
                        <div className="flex items-center gap-2">
                          <Video className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <a href={m.online_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline truncate">
                            Join Online Call
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Organizer</div>
                      <div className="font-bold text-xs text-white">{m.organizer_name}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRsvp(m.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                          isAttending
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAttending ? 'Attending' : 'RSVP'} ({m.attendee_ids?.length || 0})</span>
                      </button>

                      {permissions.canManageMeetings && (
                        <>
                          <button
                            onClick={() => {
                              setMeetingToEdit(m);
                              setIsMeetingModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMeeting(m.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. PRAYER GUIDE TAB */}
      {/* ============================================================ */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-white">Daily & Weekly Scripture Prayer Guides</h3>
              <p className="text-[11px] text-slate-400">Bilingual English & Tamil (தமிழ்) prayer targets grounded in the Word</p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1 bg-slate-850 p-1 rounded-xl border border-slate-750 text-xs">
                <button
                  onClick={() => setGuideLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${guideLanguage === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setGuideLanguage('ta')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${guideLanguage === 'ta' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  தமிழ்
                </button>
              </div>

              {permissions.canPublishPrayerGuide && (
                <button
                  onClick={() => {
                    setGuideToEdit(null);
                    setIsGuideModalOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Guide</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {guides.map((g) => (
              <div
                key={g.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 text-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {g.date} • {guideLanguage === 'ta' && g.theme_ta ? g.theme_ta : g.theme}
                    </span>
                    <h3 className="font-bold text-base text-white mt-0.5">
                      {guideLanguage === 'ta' && g.title_ta ? g.title_ta : g.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      📖 {g.scripture_reference}
                    </span>

                    {permissions.canPublishPrayerGuide && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setGuideToEdit(g);
                            setIsGuideModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGuide(g.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-xs text-slate-200 italic leading-relaxed">
                  {guideLanguage === 'ta' && g.scripture_text_ta ? g.scripture_text_ta : g.scripture_text_en}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {guideLanguage === 'ta' && g.reflection_ta ? g.reflection_ta : g.reflection_en}
                </p>

                {/* Prayer Points List */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <h4 className="font-bold text-xs text-amber-300">
                    {guideLanguage === 'ta' ? 'ஜெபக் குறிப்புகள் (Prayer Points):' : 'Prayer Points for Intercession:'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {g.prayer_points.map((pt, idx) => (
                      <div
                        key={pt.id || idx}
                        className="p-3 bg-slate-850 border border-slate-750 rounded-2xl flex items-start gap-2.5 text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-slate-200 leading-relaxed">
                          {guideLanguage === 'ta' && pt.point_ta ? pt.point_ta : pt.point_en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}
      <PrayerRequestModal
        isOpen={isRequestModalOpen}
        requestToEdit={requestToEdit}
        members={members}
        prayerGroups={groups}
        currentUser={currentUser}
        currentChurchId={churchId}
        onClose={() => setIsRequestModalOpen(false)}
        onSave={handleSaveRequest}
      />

      <PrayerGroupModal
        isOpen={isGroupModalOpen}
        groupToEdit={groupToEdit}
        members={members}
        currentChurchId={churchId}
        onClose={() => setIsGroupModalOpen(false)}
        onSave={handleSaveGroup}
      />

      <PrayerMeetingModal
        isOpen={isMeetingModalOpen}
        meetingToEdit={meetingToEdit}
        prayerGroups={groups}
        members={members}
        currentUser={currentUser}
        currentChurchId={churchId}
        onClose={() => setIsMeetingModalOpen(false)}
        onSave={handleSaveMeeting}
      />

      <PrayerGuideModal
        isOpen={isGuideModalOpen}
        guideToEdit={guideToEdit}
        currentUser={currentUser}
        currentChurchId={churchId}
        onClose={() => setIsGuideModalOpen(false)}
        onSave={handleSaveGuide}
      />

      <PrayerFollowUpModal
        isOpen={Boolean(followUpRequest)}
        request={followUpRequest}
        currentUser={currentUser}
        onClose={() => setFollowUpRequest(null)}
        onAddNote={handleAddFollowUpNote}
      />

      {/* Add Member to Prayer Group Modal (same like cell group) */}
      <Dialog open={isAddMemberModalOpen} onOpenChange={setIsAddMemberModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 text-white border-2 border-amber-500/40 p-5 rounded-2xl shadow-2xl">
          <DialogHeader className="border-b border-slate-800 pb-3 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-4 -mx-5 -mt-5 rounded-t-2xl">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              Add Member to {activeGroup?.name || 'Prayer Group'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Select a church member from your directory to assign to this prayer group.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddMemberToGroup();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Select Member *</label>
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Filter directory by name or phone..."
                  className="pl-8 bg-slate-800 border-slate-700 text-white text-xs h-8"
                />
              </div>
              <Select value={selectedMemberIdToAdd} onValueChange={setSelectedMemberIdToAdd}>
                <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Choose a church member..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60">
                  {memberList
                    .filter((m: any) => {
                      if (!memberSearchQuery.trim()) return true;
                      const q = memberSearchQuery.toLowerCase();
                      const name = (m.name || (m.profile ? `${m.profile.first_name || ''} ${m.profile.last_name || ''}`.trim() : `${m.firstName || m.first_name || ''} ${m.lastName || m.last_name || ''}`.trim()) || '').toLowerCase();
                      const phone = (m.phone || m.profile?.phone || '').toLowerCase();
                      return name.includes(q) || phone.includes(q);
                    })
                    .map((m: any) => {
                      const name = m.name || (m.profile ? `${m.profile.first_name || ''} ${m.profile.last_name || ''}`.trim() : `${m.firstName || m.first_name || ''} ${m.lastName || m.last_name || ''}`.trim()) || 'Church Member';
                      const phone = m.phone || m.profile?.phone || (m.contact ? m.contact : '');
                      const isAlready = activeGroupMembers.some((gm) => gm.member_id === m.id || gm.member_id === m.user_id);
                      return (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          disabled={isAlready}
                          className="text-xs focus:bg-slate-800 focus:text-white"
                        >
                          {name} {phone ? `(${phone})` : ''} {isAlready ? '✓ Already in group' : ''}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold block">Prayer Group Role *</label>
              <Select value={memberRoleToAdd} onValueChange={(val: any) => setMemberRoleToAdd(val)}>
                <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="Intercessor" className="text-xs">Intercessor (Prayer Warrior)</SelectItem>
                  <SelectItem value="Member" className="text-xs">Member</SelectItem>
                  <SelectItem value="Co-Leader" className="text-xs">Co-Leader</SelectItem>
                  <SelectItem value="Leader" className="text-xs">Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => {
                  setIsAddMemberModalOpen(false);
                  setMemberSearchQuery('');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold border border-slate-600 text-xs px-4 py-2 shadow-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedMemberIdToAdd}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2"
              >
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Prayer Group Attendance Modal (same like cell group) */}
      {activeGroup && (
        <QuickPrayerGroupAttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setEditingAttendance(null);
          }}
          group={activeGroup}
          groupMembers={activeGroupMembers}
          onAttendanceSaved={() => {
            loadData();
          }}
          editingRecord={editingAttendance}
          onOpenWhatsAppReport={handleOpenAttendanceWhatsApp}
        />
      )}

      {/* WhatsApp Attendance & Care Hub Modal */}
      {activeGroup && whatsAppAttendanceRecord && (
        <GroupAttendanceWhatsAppModal
          isOpen={isAttendanceWhatsAppModalOpen}
          onClose={() => {
            setIsAttendanceWhatsAppModalOpen(false);
            setWhatsAppAttendanceRecord(null);
          }}
          type="prayer_group"
          churchName={currentChurch?.name || 'Grace Community Church'}
          pastorName={currentChurch?.pastorName || 'Senior Pastor'}
          pastorPhone={currentChurch?.whatsappNumber || currentChurch?.contactPhone || ''}
          groupName={activeGroup.name}
          leaderName={activeGroup.leader_name || 'Prayer Leader'}
          schedule={`${activeGroup.meeting_day || 'Weekly'} • ${activeGroup.meeting_time || '7:00 PM'}`}
          location={activeGroup.location || 'Online Call / Church'}
          sessionDate={whatsAppAttendanceRecord.session_date}
          topic={whatsAppAttendanceRecord.topic || undefined}
          notes={whatsAppAttendanceRecord.notes || undefined}
          presentMembers={whatsAppPresentMembers}
          absentMembers={whatsAppAbsentMembers}
          availableGroups={groups.map((g) => ({
            id: g.id,
            name: g.name,
            category: 'Prayer Group',
            inviteLink: g.online_url,
            memberCount: groupMembers.filter((gm) => gm.group_id === g.id).length,
          }))}
        />
      )}
    </div>
  );
};
