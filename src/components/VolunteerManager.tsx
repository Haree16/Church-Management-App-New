import React, { useState, useMemo } from 'react';
import { Member, AvailabilityDay, ChurchMinistry, MinistryMember } from '../types';
import { MINISTRY_TEAMS } from '../data/initialData';
import { 
  HeartHandshake, Users, ShieldCheck, CheckCircle, Search, 
  Clock, Sparkles, Filter, ChevronRight, Phone, Mail, UserCheck,
  ExternalLink, Award, Crown
} from 'lucide-react';
import { UserAvatar } from './common/UserAvatar';

interface VolunteerManagerProps {
  members: Member[];
  ministries?: ChurchMinistry[];
  ministryMembers?: MinistryMember[];
  onSelectMember: (member: Member) => void;
  onEditMember: (member: Member) => void;
  onNavigateMinistry?: (ministryIdOrName: string) => void;
}

export const VolunteerManager: React.FC<VolunteerManagerProps> = ({
  members = [],
  ministries = [],
  ministryMembers = [],
  onSelectMember,
  onEditMember,
  onNavigateMinistry,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityDay | 'ALL'>('ALL');
  const [skillSearch, setSkillSearch] = useState('');

  const safeMembers = members || [];

  // Dynamic Active Church Ministries & Teams
  const activeTeams = useMemo(() => {
    if (ministries && ministries.length > 0) {
      return ministries.map((m) => ({
        id: m.id,
        name: m.name,
        leaderName: m.leaderName?.trim() || 'Unassigned',
        leaderMemberId: m.leaderMemberId,
        color: m.color || '#10b981',
        icon: m.icon || 'Heart',
        status: m.status,
      }));
    }
    return MINISTRY_TEAMS.map((t) => ({
      id: t.id,
      name: t.name,
      leaderName: t.leaderName?.trim() || 'Unassigned',
      leaderMemberId: undefined,
      color: '#10b981',
      icon: 'Heart',
      status: 'Active' as const,
    }));
  }, [ministries]);

  // Helper to check if a member belongs to or leads a team
  const isMemberInTeam = (
    m: Member,
    team: { id: string; name: string; leaderMemberId?: string; leaderName?: string }
  ) => {
    const memberFullName = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase().trim();
    const isAssignedByName = (m.ministryTeams || []).some(
      (t) =>
        t.toLowerCase().trim() === team.name.toLowerCase().trim() ||
        t.toLowerCase().trim() === team.id.toLowerCase().trim()
    );
    const isAssignedInRoster = (ministryMembers || []).some(
      (mm) => mm.ministryId === team.id && mm.memberId === m.id
    );
    const isLeader =
      (team.leaderMemberId && team.leaderMemberId === m.id) ||
      (team.leaderName &&
        team.leaderName !== 'Unassigned' &&
        team.leaderName.toLowerCase().trim() === memberFullName);

    return Boolean(isAssignedByName || isAssignedInRoster || isLeader);
  };

  // Calculate members available for each team, ordered by Member ID
  const availableVolunteers = useMemo(() => {
    return safeMembers
      .filter((m) => {
        const availability = m.availability || [];
        const skills = m.skills || [];

        const targetTeam =
          selectedTeam === 'ALL'
            ? null
            : activeTeams.find((t) => t.id === selectedTeam || t.name === selectedTeam);

        const matchesTeam = selectedTeam === 'ALL' || (targetTeam && isMemberInTeam(m, targetTeam));
        const matchesAvail = selectedAvailability === 'ALL' || availability.includes(selectedAvailability);
        const matchesSkill = !skillSearch || skills.some((s) => s.toLowerCase().includes(skillSearch.toLowerCase()));

        return matchesTeam && matchesAvail && matchesSkill;
      })
      .sort((a, b) =>
        String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [safeMembers, selectedTeam, activeTeams, selectedAvailability, skillSearch, ministryMembers]);

  const totalActiveVolunteersCount = useMemo(() => {
    return safeMembers.filter((m) => {
      const hasTeams = (m.ministryTeams || []).length > 0;
      const hasRoster = (ministryMembers || []).some((mm) => mm.memberId === m.id);
      const isAnyLeader = activeTeams.some(
        (t) =>
          t.leaderMemberId === m.id ||
          (t.leaderName &&
            t.leaderName !== 'Unassigned' &&
            t.leaderName.toLowerCase().trim() === `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase().trim())
      );
      return hasTeams || hasRoster || isAnyLeader;
    }).length;
  }, [safeMembers, ministryMembers, activeTeams]);

  const ALL_AVAILABILITIES: AvailabilityDay[] = [
    'Sunday First Service',
    'Sunday Second Service',
    'Wednesday Evening',
    'Saturday Events',
    'On-Call / As Needed',
  ];

  return (
    <div className="space-y-4">
      {/* Ministry Teams Overview Cards */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-sm space-y-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Ministry Teams & Volunteers</h2>
              <p className="text-xs text-slate-400">
                Browse church ministries, active roster squads, team leaders, and volunteer skills.
              </p>
            </div>
          </div>
          <span className="text-xs bg-emerald-950/80 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-800 self-start sm:self-auto">
            {totalActiveVolunteersCount} Active Volunteers
          </span>
        </div>

        {/* Ministry Team Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedTeam('ALL')}
            className={`p-3 rounded-2xl border text-xs font-semibold text-left transition flex flex-col justify-between gap-1.5 ${
              selectedTeam === 'ALL'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-xs">All Ministries</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20 text-current">
                {safeMembers.length}
              </span>
            </div>
            <span className="text-[10px] opacity-80 block truncate">Total Congregation</span>
          </button>

          {activeTeams.map((team) => {
            const teamVolunteers = safeMembers.filter((m) => isMemberInTeam(m, team));
            const isSelected = selectedTeam === team.id || selectedTeam === team.name;

            return (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelectedTeam(team.id)}
                className={`p-3 rounded-2xl border text-xs text-left transition flex flex-col justify-between gap-1.5 relative group ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-500/50 hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-bold truncate text-xs">{team.name}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold shrink-0 ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {teamVolunteers.length}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1 text-[10px] border-t border-slate-700/60">
                  <span className="truncate opacity-90 text-slate-300">
                    👑 Leader: <strong className="text-white">{team.leaderName}</strong>
                  </span>
                  {onNavigateMinistry && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateMinistry(team.id || team.name);
                      }}
                      className={`text-[10px] underline cursor-pointer shrink-0 transition ${
                        isSelected ? 'text-amber-300 hover:text-white' : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                      title="Open full ministry details"
                    >
                      View &rarr;
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability & Skill Search Filters */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Skill search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search volunteers by skill (e.g. Guitar, Sound Mixer, First Aid, CPR)..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Availability filter */}
          <div className="sm:w-64">
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value as any)}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Service Times & Days</option>
              {ALL_AVAILABILITIES.map((day) => (
                <option key={day} value={day} className="bg-slate-900 text-white">
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Volunteer Members Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span>
            Found <strong className="text-white font-extrabold">{availableVolunteers.length}</strong> available volunteers
          </span>
        </div>

        {availableVolunteers.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-800">
            <UserCheck className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-300 text-xs">No volunteers match the selected filter</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Try clearing your skill search or selecting "All Service Times".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableVolunteers.map((vol) => {
              const volFullName = `${vol.firstName || ''} ${vol.lastName || ''}`.toLowerCase().trim();
              const ledTeams = activeTeams.filter(
                (t) =>
                  t.leaderMemberId === vol.id ||
                  (t.leaderName &&
                    t.leaderName !== 'Unassigned' &&
                    t.leaderName.toLowerCase().trim() === volFullName)
              );

              return (
                <div
                  key={vol.id}
                  className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm hover:border-emerald-500/60 transition space-y-3 text-white"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-center space-x-3 cursor-pointer"
                      onClick={() => onSelectMember(vol)}
                    >
                      <UserAvatar
                        name={`${vol.firstName} ${vol.lastName}`}
                        avatarUrl={vol.avatarUrl}
                        size="md"
                        shape="rounded"
                        border="border border-slate-700"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-white text-sm hover:text-emerald-400 transition">
                            {vol.firstName} {vol.lastName}
                          </h3>
                          {ledTeams.length > 0 && (
                            <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 px-1.5 py-0.2 rounded-md shadow-2xs">
                              👑 Leader
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{vol.phone || vol.email}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditMember(vol)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline"
                    >
                      Edit Teams
                    </button>
                  </div>

                  {/* Assigned Teams & Leadership */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Ministry Teams:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ledTeams.map((lt) => (
                        <span
                          key={`lead-${lt.id}`}
                          className="bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-500/30 flex items-center gap-1 shadow-2xs"
                        >
                          👑 Leader: {lt.name}
                        </span>
                      ))}

                      {vol.ministryTeams && vol.ministryTeams.length > 0 ? (
                        (vol.ministryTeams || [])
                          .filter((t) => !ledTeams.some((lt) => lt.name.toLowerCase() === t.toLowerCase()))
                          .map((t) => (
                            <span
                              key={t}
                              className="bg-emerald-950/80 text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-md border border-emerald-800"
                            >
                              {t}
                            </span>
                          ))
                      ) : (
                        ledTeams.length === 0 && (
                          <span className="text-[11px] text-slate-500 italic">No team assigned</span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Availability Days */}
                  <div className="text-xs text-slate-300 flex items-center gap-1.5 pt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {vol.availability && vol.availability.length > 0
                        ? (vol.availability || []).join(' • ')
                        : 'Availability not recorded'}
                    </span>
                  </div>

                  {/* Skills tags */}
                  {vol.skills && vol.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(vol.skills || []).map((s) => (
                        <span
                          key={s}
                          className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-medium"
                        >
                          ★ {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
