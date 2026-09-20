import React, { useState, useMemo } from 'react';
import { Member, MembershipStatus, MinistryRole, ChurchMinistry, SaaSUser } from '../types';
import { 
  Search, Phone, Mail, MapPin, Users, HeartHandshake, ShieldCheck, 
  ChevronRight, Sparkles, Filter, X, UserPlus, Heart, MessageSquare, Trash2,
  ArrowUpDown, Crown, Edit3, Upload, FileSpreadsheet, KeyRound, UserCheck, ShieldAlert
} from 'lucide-react';
import { UserAvatar } from './common/UserAvatar';
import { findLinkedUserForMember } from '../utils/notificationUtils';

interface MemberListProps {
  members?: Member[];
  ministries?: ChurchMinistry[];
  allUsers?: SaaSUser[];
  onSelectMember: (member: Member) => void;
  onEditMember: (member: Member) => void;
  onDeleteMember?: (id: string) => void;
  onAddNew: () => void;
  onOpenImport?: () => void;
  canManageMembers?: boolean;
  onSelectMemberPrayers?: (member: Member) => void;
}

export type MemberSortOption = 'id-asc' | 'id-desc' | 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';

export const MemberList: React.FC<MemberListProps> = ({
  members = [],
  ministries = [],
  allUsers = [],
  onSelectMember,
  onEditMember,
  onDeleteMember,
  onAddNew,
  onOpenImport,
  canManageMembers = true,
  onSelectMemberPrayers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus | 'ALL'>('ALL');
  const [selectedMinistry, setSelectedMinistry] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<MemberSortOption>('id-asc');

  const safeMembers = members || [];

  // Filter and sort members based on ID order by default, search query, status, and ministry team
  const filteredMembers = useMemo(() => {
    return safeMembers
      .filter((member) => {
        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase().trim();
        const email = (member.email || '').toLowerCase();
        const phone = member.phone || '';
        const id = (member.id || '').toLowerCase();
        const skills = member.skills || [];
        const ministryTeams = member.ministryTeams || [];

        const matchesSearch = 
          fullName.includes(searchQuery.toLowerCase()) ||
          email.includes(searchQuery.toLowerCase()) ||
          id.includes(searchQuery.toLowerCase()) ||
          phone.includes(searchQuery) ||
          skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = selectedStatus === 'ALL' || member.status === selectedStatus;
        const matchesMinistry =
          selectedMinistry === 'ALL' ||
          ministryTeams.some((t) => t.toLowerCase().trim() === selectedMinistry.toLowerCase().trim()) ||
          (ministries || []).some(
            (m) =>
              (m.id === selectedMinistry || m.name.toLowerCase().trim() === selectedMinistry.toLowerCase().trim()) &&
              (m.leaderMemberId === member.id ||
                (m.leaderName && m.leaderName.toLowerCase().trim() === fullName))
          );

        return matchesSearch && matchesStatus && matchesMinistry;
      })
      .sort((a, b) => {
        if (sortBy === 'id-asc') {
          return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'id-desc') {
          return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'name-asc') {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`;
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`;
          return nameA.localeCompare(nameB);
        }
        if (sortBy === 'name-desc') {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`;
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`;
          return nameB.localeCompare(nameA);
        }
        if (sortBy === 'date-desc') {
          return new Date(b.joinedDate || b.createdAt || 0).getTime() - new Date(a.joinedDate || a.createdAt || 0).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.joinedDate || a.createdAt || 0).getTime() - new Date(b.joinedDate || b.createdAt || 0).getTime();
        }
        return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [safeMembers, searchQuery, selectedStatus, selectedMinistry, sortBy]);

  const statusOptions: (MembershipStatus | 'ALL')[] = [
    'ALL',
    'Pastor',
    'Assistant Pastor',
    'Leader',
    'Clergy/Staff',
    'Member',
    'Regular Attender',
    'Visitor',
    'Youth'
  ];

  const getStatusBadgeColor = (status: MembershipStatus) => {
    switch (status) {
      case 'Pastor':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-semibold';
      case 'Assistant Pastor':
        return 'bg-violet-100 text-violet-800 border-violet-200 font-semibold';
      case 'Leader':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Clergy/Staff':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Member':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Regular Attender':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Visitor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Youth':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, phone, email, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canManageMembers && onOpenImport && (
              <button
                onClick={onOpenImport}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition"
                title="Bulk import members from CSV or Excel file"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Import Members</span>
              </button>
            )}

            {canManageMembers && (
              <button
                onClick={onAddNew}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scrollbar-none text-xs -mx-0.5 px-0.5">
          <span className="text-slate-400 font-medium px-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {statusOptions.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg border font-medium shrink-0 transition ${
                selectedStatus === st
                  ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Roles' : st}
            </button>
          ))}
        </div>

        {/* Dynamic Ministry Filter Chips */}
        {ministries && ministries.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scrollbar-none text-xs -mx-0.5 px-0.5 pt-1 border-t border-slate-100">
            <span className="text-slate-400 font-medium px-1 flex items-center gap-1 shrink-0">
              <HeartHandshake className="w-3 h-3 text-emerald-600" /> Ministry:
            </span>
            <button
              onClick={() => setSelectedMinistry('ALL')}
              className={`px-2.5 py-1 rounded-lg border font-medium shrink-0 transition ${
                selectedMinistry === 'ALL'
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Ministries
            </button>
            {ministries.map((min) => (
              <button
                key={min.id}
                onClick={() => setSelectedMinistry(min.name)}
                className={`px-2.5 py-1 rounded-lg border font-medium shrink-0 transition flex items-center gap-1 ${
                  selectedMinistry === min.name
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: min.color || '#10b981' }} />
                <span>{min.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Header with Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-800">{filteredMembers.length}</strong> of{' '}
            <strong className="text-slate-800">{safeMembers.length}</strong> church members
          </span>
          {(searchQuery || selectedStatus !== 'ALL' || selectedMinistry !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
                setSelectedMinistry('ALL');
              }}
              className="text-amber-600 hover:underline font-medium ml-2"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-slate-400 font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MemberSortOption)}
            className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-1 text-xs"
          >
            <option value="id-asc">Member ID (Ascending 1 → N)</option>
            <option value="id-desc">Member ID (Descending N → 1)</option>
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
            <option value="date-desc">Newest Joined</option>
            <option value="date-asc">Oldest Joined</option>
          </select>
        </div>
      </div>

      {/* Member Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800">No members match your search</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Try loosening your search query or clear filters to view the full directory.
          </p>
          <button
            onClick={onAddNew}
            className="inline-flex items-center space-x-1.5 bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold shadow hover:bg-amber-400 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMembers.map((member) => {
            const fullName = `${member.firstName || ''} ${member.lastName || ''}`;
            const initials = `${member.firstName?.[0] || 'M'}${member.lastName?.[0] || ''}`;

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all hover:border-amber-400/50 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Profile Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => onSelectMember(member)}
                      className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                    >
                      <UserAvatar
                        name={fullName}
                        avatarUrl={member.avatarUrl}
                        size="lg"
                        shape="rounded"
                        border="border border-slate-200"
                        className="group-hover:scale-105 transition"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition truncate">
                            {fullName}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{member.email || 'No email registered'}</p>
                        
                        {/* Status Tags */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(
                              member.status
                            )}`}
                          >
                            {member.status}
                          </span>

                          {/* Account Status Badge */}
                          {(() => {
                            const linkedUser = findLinkedUserForMember(member.id, allUsers, safeMembers);
                            let accStatus: 'No Account' | 'Invitation Pending' | 'Active' | 'Disabled' = 'No Account';
                            let badgeStyle = 'bg-slate-100 text-slate-500 border-slate-200';

                            if (linkedUser) {
                              if (linkedUser.status === 'Suspended') {
                                accStatus = 'Disabled';
                                badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
                              } else if (linkedUser.lastLogin) {
                                accStatus = 'Active';
                                badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
                              } else {
                                accStatus = 'Invitation Pending';
                                badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
                              }
                            }

                            return (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeStyle}`}
                                title={`App Login Account: ${accStatus}`}
                              >
                                <KeyRound className="w-2.5 h-2.5 opacity-70" />
                                <span>{accStatus}</span>
                              </span>
                            );
                          })()}

                          {member.familyMembers && member.familyMembers.length > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5 text-slate-400" />
                              {(member.familyMembers || []).length + 1} Household
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectMember(member)}
                      className="text-slate-400 hover:text-amber-600 p-1 rounded-lg hover:bg-amber-50 transition"
                      title="View Full Details"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-1 gap-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-700">{member.phone || 'No phone'}</span>
                    </div>

                    {member.address && (
                      <div className="flex items-center space-x-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{member.address}, {member.city}</span>
                      </div>
                    )}

                    {/* Ministry Leadership & Teams Badges */}
                    {(() => {
                      const memberFullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase().trim();
                      const ledMins = (ministries || []).filter(
                        (min) =>
                          min.leaderMemberId === member.id ||
                          (min.leaderName && min.leaderName.toLowerCase().trim() === memberFullName)
                      );

                      return (
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          {ledMins.map((min) => (
                            <span
                              key={`lead-${min.id}`}
                              className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                              title={`Leader of ${min.name}`}
                            >
                              <span>👑</span>
                              <span>Leader • {min.name}</span>
                            </span>
                          ))}

                          {member.ministryTeams && member.ministryTeams.length > 0 && (
                            <>
                              <HeartHandshake className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-0.5" />
                              {(member.ministryTeams || []).map((team) => (
                                <span
                                  key={team}
                                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium px-2 py-0.5 rounded-md"
                                >
                                  {team}
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {member.phone && (
                      <>
                        <a
                          href={`tel:${member.phone.replace(/[^0-9]/g, '')}`}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-600 transition flex items-center gap-1 font-medium"
                          title={`Call ${member.firstName}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Call</span>
                        </a>
                        <a
                          href={`sms:${member.phone.replace(/[^0-9]/g, '')}`}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 transition flex items-center gap-1 font-medium"
                          title={`Send SMS to ${member.firstName}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">SMS</span>
                        </a>
                      </>
                    )}

                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 transition flex items-center gap-1 font-medium"
                        title={`Email ${member.firstName}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Email</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMember(member);
                      }}
                      className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition cursor-pointer"
                      title="Edit Member"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteMember && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete ${fullName} from cloud directory?`)) {
                            onDeleteMember(member.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onSelectMember(member)}
                      className="text-amber-600 hover:text-amber-700 font-semibold text-xs hover:underline flex items-center gap-1"
                    >
                      View Profile &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
