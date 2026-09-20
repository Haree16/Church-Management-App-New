import React, { useState, useMemo, useRef } from 'react';
import { ChurchTenant, SaaSUser, SaaSUserRole } from '../types';
import { 
  Users, ShieldCheck, UserPlus, Search, Filter, Key, 
  Building2, CheckCircle2, Lock, Eye, EyeOff, Copy, 
  Check, Edit3, Trash2, ArrowRight, Shield, Sparkles, 
  Layers, Phone, Mail, UserCheck, AlertCircle, RefreshCw,
  ExternalLink, ChevronRight, X, Upload, Camera
} from 'lucide-react';
import { ROLE_CONFIGS, RoleConfig } from '../utils/rbac';
import { UserAvatar } from './common/UserAvatar';

interface UserManagementModuleProps {
  churches?: ChurchTenant[];
  currentChurch: ChurchTenant;
  currentUser: SaaSUser;
  allUsers?: SaaSUser[];
  onSaveUser: (user: SaaSUser) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser: (user: SaaSUser) => void;
  onSelectChurch?: (church: ChurchTenant) => void;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  churches = [],
  currentChurch,
  currentUser,
  allUsers = [],
  onSaveUser,
  onDeleteUser,
  onSwitchUser,
  onSelectChurch,
}) => {
  const safeChurches = churches || [];
  const safeUsers = allUsers || [];

  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isPastorAdmin = currentUser.role === 'PastorAdmin';
  const canManageAllChurches = isSuperAdmin;

  // Base visible users: SuperAdmin sees all, Senior Pastors only see users in their church
  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) return safeUsers;
    return safeUsers.filter(u => (u.church_id === currentChurch?.id || u.churchId === currentChurch?.id));
  }, [isSuperAdmin, safeUsers, currentChurch?.id]);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChurchFilter, setSelectedChurchFilter] = useState<string>(isSuperAdmin ? 'ALL' : currentChurch?.id || 'ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'matrix'>('cards');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<SaaSUser | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formRole, setFormRole] = useState<SaaSUserRole>('Member');
  const [formChurchId, setFormChurchId] = useState<string>(currentChurch?.id || 'church-1');
  const [formAvatarUrl, setFormAvatarUrl] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Suspended'>('Active');
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingUserPhoto, setIsUploadingUserPhoto] = useState(false);
  
  // UI Helpers
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleUserPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WEBP, GIF)');
      return;
    }
    setIsUploadingUserPhoto(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setFormAvatarUrl(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setFormAvatarUrl(event.target?.result as string);
        }
        setIsUploadingUserPhoto(false);
      };
      img.onerror = () => setIsUploadingUserPhoto(false);
    };
    reader.onerror = () => setIsUploadingUserPhoto(false);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCopyCredentials = (user: SaaSUser) => {
    const text = `Church Management Login:\nChurch: ${safeChurches.find(c => c.id === (user.church_id || user.churchId))?.name || 'Main Church'}\nUsername: ${user.username}\nPassword: ${user.password || 'admin123'}\nRole: ${user.role}`;
    navigator.clipboard.writeText(text);
    setCopiedUserId(user.id);
    setTimeout(() => setCopiedUserId(null), 2000);
  };

  // Open modal for new user
  const handleOpenCreateModal = (defaultRole: SaaSUserRole = 'Member', defaultChurchId?: string) => {
    setEditingUserId(null);
    setFormName('');
    setFormUsername('');
    setFormPassword(generateRandomPassword());
    setFormEmail('');
    setFormPhone('');
    setFormDesignation('');
    const safeRole = (!isSuperAdmin && defaultRole === 'SuperAdmin') ? 'PastorAdmin' : defaultRole;
    setFormRole(safeRole);
    setFormChurchId(isSuperAdmin ? (defaultChurchId || safeChurches[0]?.id || 'church-1') : (currentChurch?.id || 'church-1'));
    setFormAvatarUrl('');
    setFormStatus('Active');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing existing user
  const handleOpenEditModal = (user: SaaSUser) => {
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormPassword(user.password || 'admin123');
    setFormEmail(user.email || '');
    setFormPhone(user.phone || '');
    setFormDesignation(user.designation || '');
    setFormRole(user.role);
    setFormChurchId(isSuperAdmin ? (user.church_id || user.churchId || 'church-1') : (currentChurch?.id || 'church-1'));
    setFormAvatarUrl(user.avatarUrl || '');
    setFormStatus(user.status || 'Active');
    setFormError(null);
    setIsModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `grace@${result}`;
  };

  // Auto-generate username from name
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingUserId && !formUsername) {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
      if (clean) {
        setFormUsername(clean);
        if (!formEmail) {
          setFormEmail(`${clean}@church.org`);
        }
      }
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedUsername = formUsername.trim().toLowerCase();
    const trimmedPassword = formPassword.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedPhone = formPhone.trim();

    if (!trimmedName) {
      setFormError('Please enter the user’s full name.');
      return;
    }

    if (!trimmedUsername) {
      setFormError('Please enter a valid unique username.');
      return;
    }

    // Check for duplicate username
    const existing = safeUsers.find(u => u.username.toLowerCase() === trimmedUsername && u.id !== editingUserId);
    if (existing) {
      setFormError(`The username "${trimmedUsername}" is already in use by another user.`);
      return;
    }

    const assignedChurchId = isSuperAdmin ? formChurchId : (currentChurch?.id || 'church-1');
    const assignedRole = (!isSuperAdmin && formRole === 'SuperAdmin') ? 'PastorAdmin' : formRole;

    const payload: SaaSUser = {
      id: editingUserId || `user-${Date.now()}`,
      church_id: assignedChurchId,
      churchId: assignedChurchId,
      name: trimmedName,
      username: trimmedUsername,
      password: trimmedPassword || 'admin123',
      email: trimmedEmail || `${trimmedUsername}@church.org`,
      phone: trimmedPhone || '+91 90000 11111',
      role: assignedRole,
      designation: formDesignation.trim() || getDefaultDesignationForRole(assignedRole),
      avatarUrl: formAvatarUrl,
      status: formStatus,
      createdAt: editingUserId ? (safeUsers.find(u => u.id === editingUserId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      assignedBy: currentUser.name,
    };

    onSaveUser(payload);
    setIsModalOpen(false);

    setSuccessToast(editingUserId ? `User account for "${payload.name}" updated successfully.` : `New user "${payload.name}" created with role "${payload.role}".`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleDeleteUser = () => {
    if (!deleteConfirmUser) return;
    if (deleteConfirmUser.id === currentUser.id) {
      alert('You cannot delete your own active user account.');
      setDeleteConfirmUser(null);
      return;
    }

    onDeleteUser(deleteConfirmUser.id);
    setDeleteConfirmUser(null);
    setSuccessToast(`User "${deleteConfirmUser.name}" has been removed.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const getDefaultDesignationForRole = (role: SaaSUserRole): string => {
    switch (role) {
      case 'SuperAdmin': return 'Platform Super Administrator';
      case 'PastorAdmin': return 'Senior Pastor / Administrator';
      case 'AssistantPastor': return 'Assistant / Associate Pastor';
      case 'TreasurerStaff': return 'Church Office & Finance Staff';
      case 'MinistryLeader': return 'Worship & Ministry Leader';
      case 'CellGroupLeader': return 'Cell Group Leader';
      case 'SundaySchoolTeacher': return 'Children Sunday School Teacher';
      case 'Member': return 'Church Member / Attender';
      case 'Volunteer': return 'Ministry Team Volunteer';
      default: return 'Church Member';
    }
  };

  // Filtered users list scoped to visibleUsers
  const filteredUsers = useMemo(() => {
    return visibleUsers.filter(u => {
      // Church filter (only applicable for SuperAdmin)
      if (isSuperAdmin && selectedChurchFilter !== 'ALL') {
        const uChurch = u.church_id || u.churchId;
        if (uChurch !== selectedChurchFilter) return false;
      }

      // Role filter
      if (selectedRoleFilter !== 'ALL') {
        if (u.role !== selectedRoleFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const churchObj = safeChurches.find(c => c.id === (u.church_id || u.churchId));
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesUsername = u.username?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesRole = u.role?.toLowerCase().includes(q);
        const matchesChurch = churchObj?.name.toLowerCase().includes(q) || churchObj?.city.toLowerCase().includes(q);
        const matchesDesignation = u.designation?.toLowerCase().includes(q);

        if (!matchesName && !matchesUsername && !matchesEmail && !matchesRole && !matchesChurch && !matchesDesignation) {
          return false;
        }
      }

      return true;
    });
  }, [visibleUsers, isSuperAdmin, selectedChurchFilter, selectedRoleFilter, searchQuery, safeChurches]);

  // Metric stats calculated from visibleUsers
  const totalUsersCount = visibleUsers.length;
  const superAdminCount = visibleUsers.filter(u => u.role === 'SuperAdmin').length;
  const pastorCount = visibleUsers.filter(u => u.role === 'PastorAdmin' || u.role === 'AssistantPastor').length;
  const leaderCount = visibleUsers.filter(u => u.role === 'MinistryLeader' || u.role === 'SundaySchoolTeacher').length;
  const memberVolunteerCount = visibleUsers.filter(u => u.role === 'Member' || u.role === 'Volunteer' || u.role === 'TreasurerStaff').length;

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Toast message */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white border border-amber-500/50 shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-4">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-slate-100">{successToast}</div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isSuperAdmin ? 'SuperAdmin User Provisioning & Role Matrix' : 'Church User & Role Management'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isSuperAdmin ? 'Church User & Role Assignments' : `Staff & User Management — ${currentChurch?.name || 'Congregation'}`}
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {isSuperAdmin 
                ? 'Create, configure, and assign granular security roles across all registered church branches. Every user receives tailored permission scopes and verified credentials.'
                : `Create and manage login accounts for pastors, ministry leaders, Sunday school teachers, staff, and volunteers for ${currentChurch?.name || 'this church'}.`
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-create-superadmin-user"
              onClick={() => handleOpenCreateModal(isSuperAdmin ? 'PastorAdmin' : 'Member')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition active:scale-95 shrink-0"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Create New User</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-xl sm:text-2xl font-black text-amber-400">{totalUsersCount}</span>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Total User Accounts</p>
          </div>

          {isSuperAdmin ? (
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-xl sm:text-2xl font-black text-purple-400">{superAdminCount}</span>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Super Administrators</p>
            </div>
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-xl sm:text-2xl font-black text-amber-400">{currentChurch?.name?.split(' ')[0] || 'Local'}</span>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Church Congregation</p>
            </div>
          )}

          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{pastorCount}</span>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Senior Pastors & Staff</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-xl sm:text-2xl font-black text-sky-400">{leaderCount + memberVolunteerCount}</span>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Leaders & Members</p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, and View Switcher */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, email, designation, or branch..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Church Filter (SuperAdmin Only) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedChurchFilter}
                onChange={(e) => setSelectedChurchFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Churches ({safeChurches.length})</option>
                {safeChurches.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                ))}
              </select>
            </div>
          )}

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              {isSuperAdmin && <option value="SuperAdmin">SuperAdmin</option>}
              <option value="PastorAdmin">PastorAdmin</option>
              <option value="AssistantPastor">Assistant Pastor</option>
              <option value="TreasurerStaff">TreasurerStaff</option>
              <option value="MinistryLeader">MinistryLeader</option>
              <option value="CellGroupLeader">Cell Group Leader</option>
              <option value="SundaySchoolTeacher">SundaySchoolTeacher</option>
              <option value="Member">Member</option>
              <option value="Volunteer">Volunteer</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-xl font-bold transition ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-xl font-bold transition ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded-xl font-bold transition ${viewMode === 'matrix' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Role Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Role Permission Matrix View */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Interactive RBAC Role & Permission Matrix</h3>
            <p className="text-xs text-slate-500">Overview of capabilities granted to each user role across the church platform:</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3.5 font-bold text-slate-700">Role & Scope</th>
                  <th className="p-3.5 font-bold text-slate-700 text-center">Multi-Church</th>
                  <th className="p-3.5 font-bold text-slate-700 text-center">Directory</th>
                  <th className="p-3.5 font-bold text-slate-700 text-center">Prayers</th>
                  <th className="p-3.5 font-bold text-slate-700 text-center">Attendance</th>
                  <th className="p-3.5 font-bold text-slate-700 text-center">Sunday School</th>
                  <th className="p-3.5 font-bold text-slate-700 text-center">Roster / Vol</th>
                  <th className="p-3.5 font-bold text-slate-700 text-center">WhatsApp</th>
                  <th className="p-3.5 font-bold text-slate-700 text-center">Bulletins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'TreasurerStaff', 'MinistryLeader', 'CellGroupLeader', 'SundaySchoolTeacher', 'Volunteer', 'Member'] as SaaSUserRole[]).map(r => {
                  const cfg = ROLE_CONFIGS[r];
                  return (
                    <tr key={r} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${cfg.badgeColor}`}>
                            {cfg.label.split('(')[0].trim()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-xs">{cfg.description}</p>
                      </td>
                      <td className="p-3.5 text-center">{cfg.canSwitchChurch ? <span className="text-emerald-600 font-bold">✓ Universal</span> : <span className="text-slate-400">Single</span>}</td>
                      <td className="p-3.5 text-center">{cfg.canManageMembers ? <span className="text-emerald-600 font-bold">✓ Full</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3.5 text-center">{cfg.canManagePrayers ? <span className="text-emerald-600 font-bold">✓ Full</span> : <span className="text-slate-400">View/Post</span>}</td>
                      <td className="p-3.5 text-center">{cfg.canRecordAttendance ? <span className="text-emerald-600 font-bold">✓ Record</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3.5 text-center">{cfg.canManageSundaySchool ? <span className="text-emerald-600 font-bold">✓ Full</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3.5 text-center">{cfg.canManageRoster ? <span className="text-emerald-600 font-bold">✓ Manage</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3.5 text-center">{cfg.canSendWhatsApp ? <span className="text-emerald-600 font-bold">✓ Broadcast</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3.5 text-center">{cfg.canPublishAnnouncements ? <span className="text-emerald-600 font-bold">✓ Publish</span> : <span className="text-slate-400">Read</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const isCurrentUser = user.id === currentUser?.id;
            const roleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.Member;
            const userChurch = safeChurches.find(c => c.id === (user.church_id || user.churchId));
            const isPasswordVisible = visiblePasswords[user.id] || false;

            return (
              <div
                key={user.id}
                id={`card-saas-user-${user.username}`}
                className={`bg-white rounded-3xl p-5 border transition flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                  isCurrentUser
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-gradient-to-b from-indigo-50/30 to-white'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Profile */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={user.name}
                        avatarUrl={user.avatarUrl}
                        size="lg"
                        shape="rounded"
                        border="border-2 border-white shadow-sm"
                        indicator={
                          isCurrentUser ? (
                            <span className="w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full block"></span>
                          ) : undefined
                        }
                      />

                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">{user.name}</h4>
                          {isCurrentUser && (
                            <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.2 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{user.designation || roleConfig.label}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        title="Edit User & Role"
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {!isCurrentUser && (
                        <button
                          title="Delete User"
                          onClick={() => setDeleteConfirmUser(user)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Badges: Role and Church */}
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${roleConfig.badgeColor}`}>
                      {roleConfig.label}
                    </span>

                    <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5 text-slate-400" />
                      {userChurch?.city || 'Local'}
                    </span>
                  </div>
                </div>

                {/* Credentials & Details Box */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Username:
                    </span>
                    <span className="font-mono font-bold text-slate-900">{user.username}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" /> Password:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900">
                        {isPasswordVisible ? (user.password || 'admin123') : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {user.email && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {user.email}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleCopyCredentials(user)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-1.5 flex-1"
                  >
                    {copiedUserId === user.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Login</span>
                      </>
                    )}
                  </button>


                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700">User Profile</th>
                  <th className="p-4 font-bold text-slate-700">Role & Security</th>
                  <th className="p-4 font-bold text-slate-700">Assigned Branch</th>
                  <th className="p-4 font-bold text-slate-700">Username & Password</th>
                  <th className="p-4 font-bold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  const roleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.Member;
                  const userChurch = safeChurches.find(c => c.id === (user.church_id || user.churchId));
                  const isPasswordVisible = visiblePasswords[user.id] || false;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={user.name}
                            avatarUrl={user.avatarUrl}
                            size="md"
                            shape="rounded"
                            border="border border-slate-200"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900">{user.name}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{user.email || user.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${roleConfig.badgeColor}`}>
                          {roleConfig.label}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">{user.designation || 'Staff'}</p>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-800">{userChurch?.name || 'Main Church'}</div>
                        <p className="text-[10px] text-slate-500">{userChurch?.city}, {userChurch?.state}</p>
                      </td>

                      <td className="p-4 font-mono">
                        <div className="text-slate-900 font-bold">{user.username}</div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <span>{isPasswordVisible ? (user.password || 'admin123') : '••••••'}</span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyCredentials(user)}
                            title="Copy Login Credentials"
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            title="Edit Role & Permissions"
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 border border-slate-200 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {editingUserId ? 'Edit Church User & Role Assignment' : 'Create New Church User'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    SuperAdmin role management with cross-church scope
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              {/* Church Branch Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Assigned Church Branch <span className="text-rose-500">*</span>
                </label>
                {isSuperAdmin ? (
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={formChurchId}
                      onChange={(e) => setFormChurchId(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {safeChurches.map((church) => (
                        <option key={church.id} value={church.id}>
                          {church.name} ({church.city}, {church.state}) — {church.subscriptionPlan}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-900 font-bold">
                    <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{currentChurch?.name} ({currentChurch?.city}, {currentChurch?.state})</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  {isSuperAdmin 
                    ? 'User will belong to this church tenant and access records for this congregation.'
                    : `User will belong to ${currentChurch?.name || 'this church'} and will not have access to other churches.`
                  }
                </p>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Pastor Paul Varghese"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="e.g. Associate Pastor / Youth Lead"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection Matrix */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Security Role & Access Permission <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1">
                  {(['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'TreasurerStaff', 'MinistryLeader', 'CellGroupLeader', 'SundaySchoolTeacher', 'Member', 'Volunteer'] as SaaSUserRole[])
                    .filter(roleKey => isSuperAdmin || roleKey !== 'SuperAdmin')
                    .map(roleKey => {
                    const cfg = ROLE_CONFIGS[roleKey];
                    const isSelected = formRole === roleKey;

                    return (
                      <div
                        key={roleKey}
                        onClick={() => setFormRole(roleKey)}
                        className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col justify-between text-left ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${cfg.badgeColor}`}>
                            {cfg.label.split('(')[0].trim()}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">{cfg.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Credentials Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" /> Login Credentials
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormPassword(generateRandomPassword())}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Generate Password
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                      placeholder="e.g. paul.varghese"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="paul@church.org"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 98765 00000"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800">Profile Photo Avatar</label>
                  <button
                    type="button"
                    onClick={() => userFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Custom Photo</span>
                  </button>
                  <input
                    ref={userFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUserPhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={formName || 'User'}
                      avatarUrl={formAvatarUrl}
                      size="lg"
                      shape="rounded"
                      border="border-2 border-amber-500 shadow-sm"
                    />
                    {isUploadingUserPhoto && (
                      <div className="absolute inset-0 bg-slate-900/60 rounded-2xl flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-xs text-slate-600 flex items-center justify-between">
                    <span>{formAvatarUrl?.trim() ? 'Custom photo attached' : 'Default initials avatar will be generated'}</span>
                    {formAvatarUrl?.trim() && (
                      <button
                        type="button"
                        onClick={() => setFormAvatarUrl('')}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingUserId ? 'Save Changes' : 'Create User Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Delete User Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete user <strong className="text-slate-800 font-mono">@{deleteConfirmUser.username}</strong> ({deleteConfirmUser.name})? This user will no longer be able to log in.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
