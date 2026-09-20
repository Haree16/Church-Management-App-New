import React, { useState, useMemo, useEffect } from 'react';
import { Member, PrayerRequest, ChurchMinistry, AttendanceRecord, RosterAssignment, ChurchEvent } from '@/types';
import { 
  X, Phone, Mail, MapPin, Calendar, Users, HeartHandshake, ShieldCheck, 
  Heart, Edit3, Trash2, Lock, Unlock, ExternalLink, MessageSquare, AlertCircle, 
  Plus, Camera, Crown, TrendingUp, TrendingDown, Activity, Sparkles, CheckCircle2,
  Clock, Award, Gift, Cake, ChevronRight, UserCheck, Shield, FileText, CheckSquare,
  Building, Star, UserPlus
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { PastoralCareModule } from '../care/PastoralCareModule';
import { MemberAbsenceTimelineWidget } from '../member/MemberAbsenceTimelineWidget';
import { groupService } from '@/services/groupService';

interface Member360ProfileProps {
  member: Member;
  allMembers?: Member[];
  prayers?: PrayerRequest[];
  ministries?: ChurchMinistry[];
  attendance?: AttendanceRecord[];
  events?: ChurchEvent[];
  roster?: RosterAssignment[];
  currentRole?: string;
  onClose?: () => void;
  onEdit?: (member: Member) => void;
  onDelete?: (id: string) => void;
  onAddPrayerForMember?: (member: Member) => void;
  onNavigateMinistry?: (ministryName: string) => void;
  onSelectFamilyMember?: (familyMember: Member) => void;
  onAppendNote?: (memberId: string, noteText: string) => void;
}

export const Member360Profile: React.FC<Member360ProfileProps> = ({
  member,
  allMembers = [],
  prayers = [],
  ministries = [],
  attendance = [],
  events = [],
  roster = [],
  currentRole = 'Pastor',
  onClose,
  onEdit,
  onDelete,
  onAddPrayerForMember,
  onNavigateMinistry,
  onSelectFamilyMember,
  onAppendNote,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'journey' | 'attendance' | 'ministries' | 'groups' | 'family' | 'care' | 'notes' | 'activity'>('overview');
  const [showNotes, setShowNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [memberGroups, setMemberGroups] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    groupService.getGroups(member.churchId || member.church_id || 'c1').then((groups) => {
      if (!isMounted) return;
      const filtered = groups.filter((g) => {
        const isLeader = g.leader_id === member.id || g.co_leader_id === member.id;
        const membersKey = `church_cms_group_members_data_${g.church_id}`;
        let isMember = false;
        try {
          const raw = localStorage.getItem(membersKey);
          if (raw) {
            const list = JSON.parse(raw);
            isMember = list.some((m: any) => m.group_id === g.id && (m.member_id === member.id || m.user_id === member.id));
          }
        } catch (e) {}
        return isLeader || isMember;
      });
      setMemberGroups(filtered);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [member.id, member.churchId, member.church_id]);

  const isLeaderOrAdmin = useMemo(() => {
    if (!currentRole) return true;
    const roleClean = currentRole.toLowerCase().replace(/[^a-z0-9]/g, '');
    const allowedRoles = [
      'superadmin',
      'pastoradmin',
      'assistantpastor',
      'churchadmin',
      'pastor',
      'leader',
      'ministryleader',
      'clergystaff',
      'staff',
      'admin',
      'treasurerstaff'
    ];
    return allowedRoles.some((r) => roleClean.includes(r));
  }, [currentRole]);

  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
  const initials = `${(member.firstName || '')[0] || ''}${(member.lastName || '')[0] || ''}`;

  // Member prayers
  const memberPrayers = useMemo(() => {
    return prayers.filter(
      (p) => p.memberId === member.id || (p.memberName && p.memberName.toLowerCase().includes(fullName.toLowerCase()))
    );
  }, [prayers, member.id, fullName]);

  // Member attendance records
  const memberAttendance = useMemo(() => {
    return attendance.filter(
      (a) => (a.presentMemberIds && a.presentMemberIds.includes(member.id)) || (a as any).member_id === member.id
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, member.id]);

  // Attendance metrics
  const attendanceMetrics = useMemo(() => {
    const totalLogged = memberAttendance.length;
    const latestRecord = memberAttendance[0] || null;
    const lastDate = latestRecord ? latestRecord.date : member.joinedDate || 'No records';

    // Attendance Rate % (against last 12 total church attendance sessions)
    const totalChurchSessions = Math.max(12, attendance.length);
    const attendanceRate = totalChurchSessions > 0
      ? Math.min(100, Math.round((totalLogged / Math.min(12, totalChurchSessions)) * 100))
      : 85;

    // Trend direction (compare last 6 sessions vs prior 6 sessions)
    const recent6 = memberAttendance.slice(0, 6).length;
    const prior6 = memberAttendance.slice(6, 12).length;
    const hasEnoughData = totalLogged >= 3;
    let trendDirection: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (recent6 > prior6 + 1) trendDirection = 'increasing';
    else if (recent6 < prior6 - 1) trendDirection = 'decreasing';

    return { totalLogged, lastDate, attendanceRate, trendDirection, hasEnoughData };
  }, [memberAttendance, attendance.length, member.joinedDate]);

  // Church Engagement Score Calculation (0-100 Score)
  const engagementScoreData = useMemo(() => {
    // 1. Attendance Rate Score (Max 40 pts)
    const attScore = Math.round((attendanceMetrics.attendanceRate / 100) * 40);

    // 2. Ministry Involvement Score (Max 25 pts)
    const ministryCount = (member.ministryTeams || []).length;
    const isMinistryLeader = (ministries || []).some(
      (m) =>
        m.leaderMemberId === member.id ||
        m.leaderName.toLowerCase().trim() === fullName.toLowerCase().trim()
    );
    const minScore = isMinistryLeader ? 25 : Math.min(20, ministryCount * 10);

    // 3. Family / Group Placement Score (Max 20 pts)
    const familyCount = (member.familyMembers || []).length;
    const groupScore = familyCount > 0 || (member as any).group ? 20 : 10;

    // 4. Activity & Prayer Participation Score (Max 15 pts)
    const prayerCount = memberPrayers.length;
    const activityScore = Math.min(15, prayerCount * 5 + 5);

    const totalScore = Math.min(100, attScore + minScore + groupScore + activityScore);

    let level: 'High' | 'Medium' | 'Low' = 'High';
    let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (totalScore < 50) {
      level = 'Low';
      badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
    } else if (totalScore < 75) {
      level = 'Medium';
      badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
    }

    return { totalScore, level, badgeBg, attScore, minScore, groupScore, activityScore };
  }, [attendanceMetrics, member.ministryTeams, member.familyMembers, member.id, fullName, ministries, memberPrayers.length]);

  // Member Journey Conceptual Steps
  const journeySteps = useMemo(() => {
    const status = member.status;
    const isLeader = (ministries || []).some(
      (m) => m.leaderMemberId === member.id || m.leaderName.toLowerCase().trim() === fullName.toLowerCase().trim()
    );
    const hasMinistry = (member.ministryTeams || []).length > 0;
    const hasBaptism = Boolean((member as any).baptismDate || (member as any).baptism_date);

    let currentStepIndex = 3; // Default Member
    if (status === 'Visitor') currentStepIndex = 0;
    else if (status === 'Regular Attender') currentStepIndex = 2;
    else if (isLeader || status === 'Leader' || status === 'Pastor') currentStepIndex = 6;
    else if (hasMinistry) currentStepIndex = 5;
    else if (hasBaptism) currentStepIndex = 4;

    const steps = [
      { key: 'visitor', label: 'First Visit' },
      { key: 'followup', label: 'Follow-up' },
      { key: 'attender', label: 'Regular Attender' },
      { key: 'member', label: 'Covenant Member' },
      { key: 'baptism', label: 'Water Baptism' },
      { key: 'ministry', label: 'Ministry Serving' },
      { key: 'leadership', label: 'Leadership' },
    ];

    return { steps, currentStepIndex };
  }, [member.status, member.ministryTeams, member.id, fullName, ministries]);

  // Timeline Events
  const timelineEvents = useMemo(() => {
    const eventsList = [];

    // First visit / Join Date
    if (member.joinedDate) {
      eventsList.push({
        date: member.joinedDate,
        title: member.status === 'Visitor' ? 'First Church Visit' : 'Covenant Membership Confirmed',
        desc: `Joined congregation directory as ${member.status}`,
        category: 'milestone',
        icon: 'star',
      });
    }

    // Baptism
    const bDate = (member as any).baptismDate || (member as any).baptism_date;
    if (bDate) {
      eventsList.push({
        date: bDate,
        title: 'Water Baptism Milestone',
        desc: 'Baptized in faith and welcomed into spiritual body',
        category: 'spiritual',
        icon: 'water',
      });
    }

    // Ministry Teams Joined
    if (member.ministryTeams && member.ministryTeams.length > 0) {
      eventsList.push({
        date: member.joinedDate || member.createdAt,
        title: `Joined Ministries: ${member.ministryTeams.join(', ')}`,
        desc: 'Committed to serving on active volunteer teams',
        category: 'ministry',
        icon: 'heart',
      });
    }

    // Ministry Leadership Events
    ministries.forEach((m) => {
      if ((m as any).leaderId === member.id || (m as any).leader_id === member.id || m.leaderName?.toLowerCase().includes(fullName.toLowerCase())) {
        eventsList.push({
          date: member.joinedDate || member.createdAt,
          title: `Became Ministry Leader: ${m.name}`,
          desc: 'Appointed as head leader of church ministry department',
          category: 'leadership',
          icon: 'crown',
        });
      }
    });

    // Small Group Events
    memberGroups.forEach((g) => {
      const isLeader = g.leader_id === member.id || g.co_leader_id === member.id;
      eventsList.push({
        date: g.created_at ? new Date(g.created_at).toISOString().split('T')[0] : (member.joinedDate || member.createdAt),
        title: isLeader ? `Became Group Leader: ${g.name}` : `Joined Small Group: ${g.name}`,
        desc: isLeader ? 'Appointed to shepherd cell group members & lead meetings' : `Active participant in ${g.terminology || 'Small Group'} meetings`,
        category: 'group',
        icon: isLeader ? 'crown' : 'users',
      });
    });

    // Attendance Logged
    memberAttendance.slice(0, 5).forEach((att) => {
      eventsList.push({
        date: att.date,
        title: `Attended: ${att.serviceName}`,
        desc: `Checked-in for service headcount`,
        category: 'attendance',
        icon: 'check',
      });
    });

    // Prayers
    memberPrayers.forEach((pr) => {
      eventsList.push({
        date: pr.dateSubmitted,
        title: `Submitted Prayer: "${pr.title}"`,
        desc: pr.description,
        category: 'prayer',
        icon: 'rose',
      });
    });

    return eventsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [member, memberAttendance, memberPrayers, memberGroups, ministries, fullName]);

  // WhatsApp Birthday / Anniversary links
  const getWhatsAppLink = (type: 'birthday' | 'anniversary') => {
    const cleanPhone = (member.phone || '').replace(/\D/g, '');
    const message = type === 'birthday'
      ? encodeURIComponent(`Dear ${member.firstName}, Happy Birthday from your church family! May God bless you abundantly this year. 🎂🎉`)
      : encodeURIComponent(`Happy Wedding Anniversary ${member.firstName}! May God bless your marriage with grace and joy. 💍✨`);
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
  };

  const handleAppendNote = () => {
    if (!newNoteText.trim()) return;
    if (onAppendNote) {
      onAppendNote(member.id, newNoteText);
      setNewNoteText('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white p-5 sm:p-7 relative shrink-0 overflow-hidden">
        {/* Glow ambient light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute right-4 top-4 z-30 text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center space-x-4">
            <div
              onClick={() => onEdit && onEdit(member)}
              className="relative group cursor-pointer shrink-0"
              title="Click to edit profile or photo"
            >
              <UserAvatar
                name={fullName}
                avatarUrl={member.avatarUrl}
                size="2xl"
                shape="rounded"
                border="border-2 border-amber-500 shadow-md"
                className="group-hover:opacity-85 transition"
              />
              <div className="absolute inset-0 bg-slate-950/60 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <Camera className="w-5 h-5 text-amber-300" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{fullName}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                  {member.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Member ID: <strong className="text-white">{member.id}</strong> • Joined: {new Date(member.joinedDate || member.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    {member.phone}
                  </span>
                )}
                {member.email && (
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    {member.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons Header */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {member.phone && (
              <a
                href={`tel:${member.phone.replace(/\D/g, '')}`}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            )}

            {member.phone && (
              <a
                href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(member)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>


      {/* 3. Navigation Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 px-4 pt-2 bg-white dark:bg-slate-900 text-xs font-bold">
        {[
          { id: 'overview', label: '360° Overview' },
          { id: 'journey', label: 'Member Journey' },
          { id: 'attendance', label: `Attendance (${attendanceMetrics.totalLogged})` },
          { id: 'ministries', label: `Ministries (${(member.ministryTeams || []).length})` },
          { id: 'groups', label: `Small Groups (${memberGroups.length})` },
          { id: 'family', label: `Family (${(member.familyMembers || []).length})` },
          { id: 'care', label: 'Pastoral Care' },
          { id: 'notes', label: 'Pastoral Notes' },
          { id: 'activity', label: 'Activity Timeline' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3 py-2 border-b-2 font-bold whitespace-nowrap transition ${
              activeTab === t.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Body Content */}
      <div className="p-5 space-y-5 overflow-y-auto max-h-[65vh] text-xs text-slate-700 dark:text-slate-300">
        {/* ========================================================================= */}
        {/* TAB 1: 360° OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Conceptual Journey Progress Track */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Member Journey Progression</span>
                </span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                  Current Step: {journeySteps.steps[journeySteps.currentStepIndex]?.label}
                </span>
              </div>

              {/* Progress Steps Track */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] pt-1">
                {journeySteps.steps.map((step, idx) => {
                  const isCompleted = idx <= journeySteps.currentStepIndex;
                  const isCurrent = idx === journeySteps.currentStepIndex;

                  return (
                    <div key={step.key} className="space-y-1.5 flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className={`font-medium line-clamp-1 ${isCurrent ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestones Card Grid */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-400">
                Spiritual Milestones & Records
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">First Visit</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {member.joinedDate || 'Recorded'}
                  </div>
                  <p className="text-[11px] text-slate-500">First contact card logged</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Water Baptism</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {(member as any).baptismDate || (member as any).baptism_date || 'Not recorded'}
                  </div>
                  <p className="text-[11px] text-slate-500">Baptism testimony record</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Covenant Membership</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {member.joinedDate || 'Confirmed'}
                  </div>
                  <p className="text-[11px] text-slate-500">Covenant member status</p>
                </div>
              </div>
            </div>

            {/* Contact Details & Address */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-400">
                Contact & Address
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{member.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-800 dark:text-slate-200">{member.email || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  {member.address ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{member.address}</p>
                        <p className="text-slate-500">{member.city}, {member.state} {member.zipCode}</p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${member.address}, ${member.city}, ${member.state} ${member.zipCode}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline mt-1 font-bold"
                        >
                          <span>Get Directions</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No physical address logged.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Birthdays & Anniversaries */}
            {(member.birthdate || member.anniversary) && (
              <div className="bg-pink-50/50 dark:bg-pink-950/20 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-100 dark:bg-pink-900/60 text-pink-600 flex items-center justify-center font-bold shrink-0">
                    <Cake className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Important Celebration Dates</h4>
                    <p className="text-slate-500 text-[11px]">
                      {member.birthdate && `Birthday: ${new Date(member.birthdate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`}
                      {member.anniversary && ` • Anniversary: ${new Date(member.anniversary).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`}
                    </p>
                  </div>
                </div>

                <a
                  href={getWhatsAppLink('birthday')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Celebration Wish</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MEMBER JOURNEY TIMELINE */}
        {/* ========================================================================= */}
        {activeTab === 'journey' && (
          <div className="space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-400">
              Chronological Journey Timeline
            </h3>

            {timelineEvents.length > 0 ? (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 pl-4 space-y-4">
                {timelineEvents.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{evt.title}</span>
                        <span className="text-slate-400 font-mono">{evt.date}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">{evt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic py-6 text-center">No timeline milestones logged yet.</p>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ATTENDANCE */}
        {/* ========================================================================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <MemberAbsenceTimelineWidget member={member} attendance={attendance} />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-400">
                  Detailed Service Attendance Logs
                </h3>
                <span className="text-emerald-600 font-bold text-xs">
                  Trend: {attendanceMetrics.hasEnoughData ? attendanceMetrics.trendDirection.toUpperCase() : 'Need 3+ records'}
                </span>
              </div>

              {/* Recent Attendance Records */}
              {memberAttendance.length > 0 ? (
                <div className="space-y-2">
                  {memberAttendance.map((att) => (
                    <div key={att.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{att.serviceName}</h4>
                        <p className="text-[11px] text-slate-500">{att.date} • {(att as any).time || 'Sunday Service'}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        Present
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic py-6 text-center">No individual attendance check-ins recorded for this member.</p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MINISTRIES */}
        {/* ========================================================================= */}
        {activeTab === 'ministries' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-400">
                Assigned Ministry Teams
              </h3>
            </div>

            {member.ministryTeams && member.ministryTeams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {member.ministryTeams.map((team) => (
                  <div key={team} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{team}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Ministry Volunteer Team</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic py-6 text-center">Not currently assigned to an active ministry department.</p>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: SMALL GROUPS */}
        {/* ========================================================================= */}
        {activeTab === 'groups' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-400">
                Small Group & Cell Group Membership
              </h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-md border border-amber-500/20">
                {memberGroups.length} Active Group{memberGroups.length === 1 ? '' : 's'}
              </span>
            </div>

            {memberGroups.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                <p className="font-bold text-slate-600 dark:text-slate-400 text-sm">Not Currently in a Small Group</p>
                <p className="text-slate-400 text-xs">Assign this member to a small group or cell group to track meeting attendance & pastoral care.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {memberGroups.map((g) => {
                  const isLeader = g.leader_id === member.id;
                  const isCoLeader = g.co_leader_id === member.id;
                  const roleLabel = isLeader ? 'Group Leader' : isCoLeader ? 'Assistant Leader' : 'Member';

                  return (
                    <div key={g.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-amber-500" />
                          {g.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isLeader ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {roleLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{g.description || 'No group description provided.'}</p>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                        <span>🗓 {g.meeting_day || 'Weekly'} • {g.meeting_time || '7:00 PM'}</span>
                        <span>📍 {g.location || 'Home'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: FAMILY */}
        {/* ========================================================================= */}
        {activeTab === 'family' && (
          <div className="space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-400">
              Household & Family Relationships
            </h3>

            {member.familyMembers && member.familyMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {member.familyMembers.map((fam) => {
                  // Find matching member object in allMembers list if present
                  const matchedMember = allMembers.find(
                    (m) => `${m.firstName} ${m.lastName}`.toLowerCase().trim() === fam.name.toLowerCase().trim()
                  );

                  return (
                    <div
                      key={fam.id}
                      onClick={() => matchedMember && onSelectFamilyMember && onSelectFamilyMember(matchedMember)}
                      className={`p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between ${
                        matchedMember ? 'cursor-pointer hover:border-amber-400 transition' : ''
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{fam.name}</h4>
                        <p className="text-[11px] text-slate-500">{fam.relationship} {fam.age ? `(${fam.age} yrs)` : ''}</p>
                      </div>
                      {matchedMember ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">View 360° &rarr;</span>
                      ) : (
                        <Users className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic py-6 text-center">No family members registered on file.</p>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5.5: PASTORAL CARE CASES */}
        {/* ========================================================================= */}
        {activeTab === 'care' && (
          <div className="space-y-4">
            <PastoralCareModule personId={member.id} personName={fullName} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: PASTORAL NOTES */}
        {/* ========================================================================= */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-200">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Confidential Pastoral & Care Notes</span>
                </div>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1 bg-amber-200/60 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg"
                >
                  {showNotes ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{showNotes ? 'Hide Confidential Notes' : 'Unlock Notes'}</span>
                </button>
              </div>

              {showNotes ? (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {member.pastoralNotes || 'No pastoral care notes appended yet.'}
                  </div>

                  {isLeaderOrAdmin && (
                    <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-900/40">
                      <label className="text-xs font-bold text-amber-950 dark:text-amber-200">Append Care Note</label>
                      <div className="flex gap-2">
                        <textarea
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Enter new pastoral observation or counseling note..."
                          rows={2}
                          className="flex-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none"
                        />
                        <button
                          onClick={handleAppendNote}
                          disabled={!newNoteText.trim()}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition shrink-0 disabled:opacity-50"
                        >
                          Append
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 italic">
                  Pastoral care notes are restricted for confidential leadership review. Click unlock to reveal.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ACTIVITY TIMELINE */}
        {/* ========================================================================= */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-400">
              Live Member Activity Feed
            </h3>

            <div className="space-y-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Member Directory Registration</h4>
                  <p className="text-[11px] text-slate-500">Record created on {member.joinedDate || member.createdAt}</p>
                </div>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        {onDelete && isLeaderOrAdmin ? (
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${fullName} from directory?`)) {
                onDelete(member.id);
                if (onClose) onClose();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Member</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400">ShepherdHub 360° Profile</span>
        )}

        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(member)}
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
