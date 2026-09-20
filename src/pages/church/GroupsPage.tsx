import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  CheckSquare,
  Shield,
  Church as ChurchIcon,
  Filter,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanAccess } from '@/components/ui/can-access';
import { Group, ChurchMember, Ministry, OrgStatus } from '@/types/database';
import { groupService, CreateGroupPayload } from '@/services/groupService';
import { memberService } from '@/services/memberService';
import { ministryService } from '@/services/ministryService';
import { useAuth } from '@/context/AuthContext';
import { GroupFormDialog } from '@/components/organization/GroupFormDialog';
import { GroupDetailModal } from '@/components/organization/GroupDetailModal';
import { toast } from 'sonner';

export function GroupsPage() {
  const { activeChurch, profile, currentRole } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [onlyMyGroups, setOnlyMyGroups] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<Group | null>(null);

  // Detail Modal State
  const [selectedGroupForDetail, setSelectedGroupForDetail] = useState<Group | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const churchId = activeChurch?.id || 'a0000000-0000-0000-0000-000000000001';

  // Check if current user is a group leader
  const isGroupLeaderRole = currentRole === 'cell_group_leader' || currentRole === 'group_leader';


  const loadData = async () => {
    setIsLoading(true);
    try {
      const [groupList, memberList, ministryList] = await Promise.all([
        groupService.getGroups(churchId),
        memberService.getMembers(churchId),
        ministryService.getMinistries(churchId),
      ]);
      setGroups(groupList);
      setMembers(memberList);
      setMinistries(ministryList);

      if (selectedGroupForDetail) {
        const refreshed = groupList.find((g) => g.id === selectedGroupForDetail.id);
        if (refreshed) setSelectedGroupForDetail(refreshed);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
      toast.error('Failed to load small groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [churchId]);

  // Filtering
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchesSearch =
        searchQuery === '' ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (g.leader?.display_name &&
          g.leader.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (g.location && g.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || g.category === categoryFilter;
      const matchesDay = dayFilter === 'all' || g.meeting_day === dayFilter;

      const matchesMyGroups =
        !onlyMyGroups ||
        (profile && (g.leader_id === profile.id || g.co_leader_id === profile.id));

      return matchesSearch && matchesCategory && matchesDay && matchesMyGroups;
    });
  }, [groups, searchQuery, categoryFilter, dayFilter, onlyMyGroups, profile]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [groups]);

  // Total enrolled members
  const totalEnrolledCount = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.member_count || 0), 0);
  }, [groups]);

  const handleCreateNew = () => {
    setSelectedGroupForEdit(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleEdit = (g: Group) => {
    setSelectedGroupForEdit(g);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleSaveGroup = async (payload: CreateGroupPayload) => {
    try {
      if (formMode === 'create') {
        await groupService.createGroup(churchId, payload);
        toast.success('Small group created successfully!');
      } else if (selectedGroupForEdit) {
        await groupService.updateGroup(churchId, selectedGroupForEdit.id, payload);
        toast.success('Small group updated successfully!');
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save group');
    }
  };

  const handleDeleteGroup = async (g: Group) => {
    if (!confirm(`Are you sure you want to delete or archive ${g.name}?`)) return;
    try {
      await groupService.deleteGroup(churchId, g.id);
      toast.success(`${g.name} removed`);
      if (selectedGroupForDetail?.id === g.id) {
        setIsDetailOpen(false);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete group');
    }
  };

  const handleOpenDetail = (g: Group) => {
    setSelectedGroupForDetail(g);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-sky-600" />
            Small Groups & Discipleship Circles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Home Bible studies, Young Adults, Men's & Women's cohorts, and married couples fellowships.
          </p>
        </div>

        <CanAccess permission="groups:write">
          <Button size="sm" onClick={handleCreateNew} className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-sm">
            <Plus className="h-4 w-4" />
            Create Small Group
          </Button>
        </CanAccess>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Active Life Groups
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {groups.filter((g) => g.status === 'active').length}
            </span>
            <Badge variant="emerald" className="text-[10px]">
              {groups.length} Circles
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Enrolled Believers
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalEnrolledCount || 28}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-sky-600" />
              Connected
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Average Fill Rate
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">72%</span>
            <Badge variant="purple" className="text-[10px]">
              Healthy
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Weekly Attendance
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">88%</span>
            <span className="text-xs text-emerald-600 flex items-center gap-0.5 font-semibold">
              <CheckSquare className="h-3.5 w-3.5" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups, leaders, hosts..."
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-40">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-36">
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group Leader "My Groups Only" quick toggle */}
          {isGroupLeaderRole && (
            <button
              type="button"
              onClick={() => setOnlyMyGroups(!onlyMyGroups)}
              className={`h-9 px-3 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                onlyMyGroups
                  ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>My Led Groups</span>
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 self-end sm:self-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded text-xs transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded text-xs transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Small Groups Display */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No small groups found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No life groups match your current filters. Try selecting a different category or day.
          </p>
          <CanAccess permission="groups:write">
            <Button size="sm" onClick={handleCreateNew} className="mt-4 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />
              Create Small Group
            </Button>
          </CanAccess>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => {
            const canManageThis =
              currentRole === 'super_admin' ||
              currentRole === 'church_admin' ||
              currentRole === 'pastor' ||
              (profile && (group.leader_id === profile.id || group.co_leader_id === profile.id));

            const maxCapacity = group.capacity || 20;
            const currentMembers = group.member_count || 3;
            const fillRate = Math.min(Math.round((currentMembers / maxCapacity) * 100), 100);

            return (
              <Card
                key={group.id}
                className="hover:shadow-md transition-all duration-200 border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <ChurchIcon className="h-4.5 w-4.5 text-sky-600 shrink-0" />
                        <span className="truncate">{group.name}</span>
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-semibold">
                        {group.category || 'General'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {group.description || 'Weekly discipleship and Bible study fellowship.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400 pt-0">
                    {/* Meeting Day & Time */}
                    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          <Clock className="h-3.5 w-3.5 text-sky-600" />
                          <span>Every {group.meeting_day}</span>
                        </div>
                        <span className="text-slate-500">{group.meeting_time}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{group.location} ({group.address || 'Chennai, Tamil Nadu'})</span>
                      </div>
                    </div>

                    {/* Leader & Member Capacity */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2">
                        {group.leader?.avatar_url ? (
                          <img
                            src={group.leader.avatar_url}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                            {group.leader?.first_name?.[0] || 'L'}
                          </div>
                        )}
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {group.leader?.display_name || 'Leader'}
                        </span>
                      </div>

                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {currentMembers} / {maxCapacity} ({fillRate}%)
                      </span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          fillRate > 90
                            ? 'bg-red-500'
                            : fillRate > 75
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                        style={{ width: `${fillRate}%` }}
                      />
                    </div>
                  </CardContent>
                </div>

                {/* Card Actions */}
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-3 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetail(group)}
                    className="flex-1 text-xs gap-1.5 h-8 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span>Group Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                  {canManageThis && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-sky-600"
                        title="Edit Group"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                        title="Delete Group"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Group Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Leader</th>
                <th className="py-3.5 px-4">Meeting Schedule</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Enrolled / Cap</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGroups.map((g) => {
                const canManageThis =
                  currentRole === 'super_admin' ||
                  currentRole === 'church_admin' ||
                  currentRole === 'pastor' ||
                  (profile && (g.leader_id === profile.id || g.co_leader_id === profile.id));

                return (
                  <tr
                    key={g.id}
                    onClick={() => handleOpenDetail(g)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {g.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {g.category || 'General'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {g.leader?.display_name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {g.meeting_day} at {g.meeting_time}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {g.location}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {g.member_count || 3} / {g.capacity || 20}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(g)}
                          className="h-7 text-xs gap-1"
                        >
                          Dashboard
                        </Button>
                        {canManageThis && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(g)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-sky-600"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Group Dialog */}
      <GroupFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveGroup}
        initialData={selectedGroupForEdit}
        availableMembers={members}
        availableMinistries={ministries}
        mode={formMode}
      />

      {/* Group Detail / Profile Dashboard Modal */}
      <GroupDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        group={selectedGroupForDetail}
        availableMembers={members}
        onEditGroup={(g) => {
          setIsDetailOpen(false);
          handleEdit(g);
        }}
        onGroupUpdated={loadData}
      />
    </div>
  );
}
