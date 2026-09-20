import React, { useState } from 'react';
import { ChurchTenant, SaaSUser, SaaSUserRole, Member, PrayerRequest, AttendanceRecord, ChurchEvent, SundaySchoolClass } from '../types';
import { 
  Building2, ShieldCheck, UserCheck, Plus, CheckCircle2, 
  Globe, Sparkles, Key, Users, ArrowRight, Shield, 
  Lock, Check, Layers, AlertCircle, UserPlus, SlidersHorizontal
} from 'lucide-react';
import { ROLE_CONFIGS } from '../utils/rbac';
import { UserManagementModule } from './UserManagementModule';
import { UserAvatar } from './common/UserAvatar';

interface SaaSConsoleProps {
  churches?: ChurchTenant[];
  currentChurch: ChurchTenant;
  currentUser: SaaSUser;
  onSelectChurch: (church: ChurchTenant) => void;
  onSwitchUser: (user: SaaSUser) => void;
  onRegisterChurch: (newChurch: ChurchTenant) => void;
  onAddUser?: (newUser: SaaSUser) => void;
  onSaveUser?: (user: SaaSUser) => void;
  onDeleteUser?: (userId: string) => void;
  allUsers?: SaaSUser[];
  members?: Member[];
  prayers?: PrayerRequest[];
  attendance?: AttendanceRecord[];
  events?: ChurchEvent[];
  sundaySchoolClasses?: SundaySchoolClass[];
  initialSubTab?: 'tenants' | 'users';
}

export const SaaSConsole: React.FC<SaaSConsoleProps> = ({
  churches = [],
  currentChurch,
  currentUser,
  onSelectChurch,
  onSwitchUser,
  onRegisterChurch,
  onAddUser,
  onSaveUser,
  onDeleteUser,
  allUsers = [],
  members = [],
  prayers = [],
  attendance = [],
  events = [],
  sundaySchoolClasses = [],
  initialSubTab,
}) => {
  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const [activeSubTab, setActiveSubTab] = useState<'tenants' | 'users'>(
    initialSubTab || (isSuperAdmin ? 'tenants' : 'users')
  );
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const safeChurches = churches || [];
  const safeUsers = allUsers || [];
  const safeMembers = members || [];
  const safePrayers = prayers || [];
  const safeAttendance = attendance || [];
  const safeEvents = events || [];
  const safeSundaySchoolClasses = sundaySchoolClasses || [];

  const handleUserSave = (user: SaaSUser) => {
    if (onSaveUser) {
      onSaveUser(user);
    } else if (onAddUser) {
      onAddUser(user);
    }
  };

  const handleUserDelete = (userId: string) => {
    if (onDeleteUser) {
      onDeleteUser(userId);
    }
  };

  // New Church form
  const [churchName, setChurchName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [denomination, setDenomination] = useState('Pentecostal / Charismatic');
  const [pastorName, setPastorName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<'Free Tier' | 'Growth Church' | 'Enterprise Multi-Campus'>('Growth Church');

  // New User form
  const [newUserName, setNewUserName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('pass123');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<SaaSUserRole>('Member');
  const [newUserChurchId, setNewUserChurchId] = useState<string>(currentChurch?.id || 'church-1');

  const handleCreateChurch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchName.trim()) return;

    const newId = `church-${Date.now()}`;
    const newTenant: ChurchTenant = {
      id: newId,
      name: churchName.trim(),
      code: churchName.substring(0, 3).toUpperCase() + '-' + (city.substring(0, 3).toUpperCase() || 'IND'),
      city: city.trim() || 'Chennai',
      state: state.trim() || 'Tamil Nadu',
      denomination,
      pastorName: pastorName.trim() || 'Senior Pastor',
      contactPhone: phone.trim() || '+91 98765 00000',
      whatsappNumber: phone.trim().replace(/\D/g, '') || '919876500000',
      currency: 'INR',
      subscriptionPlan: plan,
      totalMembersCount: 1,
    };

    onRegisterChurch(newTenant);
    onSelectChurch(newTenant);
    setIsRegisterOpen(false);
    setChurchName('');
    setCity('');
    setState('');
    setPastorName('');
    setPhone('');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUsername.trim()) return;

    const user: SaaSUser = {
      id: `user-${Date.now()}`,
      church_id: newUserChurchId,
      churchId: newUserChurchId,
      name: newUserName.trim(),
      username: newUsername.trim().toLowerCase(),
      password: newUserPassword.trim() || 'password123',
      email: newUserEmail.trim() || `${newUsername.trim()}@church.org`,
      phone: newUserPhone.trim() || '+91 90000 11111',
      role: newUserRole,
      avatarUrl: ''
    };

    handleUserSave(user);
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUsername('');
    setNewUserEmail('');
    setNewUserPhone('');
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-0.5">
          {isSuperAdmin && (
            <button
              id="tab-saas-tenants"
              onClick={() => setActiveSubTab('tenants')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${
                activeSubTab === 'tenants'
                  ? 'bg-slate-900 text-amber-400 shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Church Tenants & Isolation</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {safeChurches.length}
              </span>
            </button>
          )}

          <button
            id="tab-saas-users"
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${
              activeSubTab === 'users'
                ? 'bg-slate-900 text-amber-400 shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>{isSuperAdmin ? 'SuperAdmin User & Role Module' : 'Church User & Role Management'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {isSuperAdmin ? safeUsers.length : safeUsers.filter(u => (u.church_id === currentChurch.id || u.churchId === currentChurch.id)).length} Users
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Logged in as: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role})</span>
        </div>
      </div>

      {/* When Users Subtab is Active: Render dedicated UserManagementModule */}
      {activeSubTab === 'users' ? (
        <UserManagementModule
          churches={safeChurches}
          currentChurch={currentChurch}
          currentUser={currentUser}
          allUsers={safeUsers}
          onSaveUser={handleUserSave}
          onDeleteUser={handleUserDelete}
          onSwitchUser={onSwitchUser}
          onSelectChurch={onSelectChurch}
        />
      ) : (
        <>
          {/* SaaS Multi-Tenant Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
                  <Building2 className="w-3.5 h-3.5" />
                  Multi-Church SaaS Console & Data Isolation
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Church Management Cloud Control
                </h2>
                <p className="text-slate-300 text-sm mt-1 max-w-xl">
                  Multi-tenant architecture: seamlessly manage multiple church locations, branch settings, and role-based permissions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-open-create-user"
                  onClick={() => setActiveSubTab('users')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-2xl border border-slate-700 shadow transition"
                >
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Manage Users & Roles ({safeUsers.length})</span>
                </button>
                {isSuperAdmin && (
                  <button
                    id="btn-open-register-church"
                    onClick={() => setIsRegisterOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg transition active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Register Church Tenant</span>
                  </button>
                )}
              </div>
            </div>
          </div>



      {/* Active Church & Active Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Tenant Box */}
        <div className="bg-white p-6 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Active Church Tenant
            </span>
            <span className="text-xs font-bold text-slate-500">{currentChurch.city}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center text-xl font-black shrink-0 shadow">
              {currentChurch.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">{currentChurch.name}</h3>
              <p className="text-xs text-slate-500">{currentChurch.city}, {currentChurch.state} • {currentChurch.denomination}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Senior Pastor: <strong>{currentChurch.pastorName}</strong></span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
              {currentChurch.subscriptionPlan}
            </span>
          </div>
        </div>

        {/* Active User Session Box */}
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-wider text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
              Current Logged In User
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${ROLE_CONFIGS[currentUser.role]?.badgeColor || ''}`}>
              {ROLE_CONFIGS[currentUser.role]?.label || currentUser.role}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <UserAvatar
              name={currentUser.name}
              avatarUrl={currentUser.avatarUrl}
              size="lg"
              shape="rounded"
              border="border border-indigo-200 shadow-sm"
            />
            <div>
              <h3 className="text-base font-bold text-slate-900">{currentUser.name}</h3>
              <p className="text-xs text-slate-500">Username: <strong className="text-slate-800 font-mono">{currentUser.username}</strong> • {currentUser.email}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span>Role Permissions:</span>
            <span className="font-semibold text-slate-800">
              {ROLE_CONFIGS[currentUser.role]?.description || 'Church Access'}
            </span>
          </div>
        </div>
      </div>

      {/* Church Selector Grid */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Registered Church Tenants ({safeChurches.length})</h3>
            <p className="text-xs text-slate-500">Switch active church to filter records for that congregation.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {safeChurches.map((ch) => {
            const isSelected = ch.id === currentChurch?.id;
            return (
              <div
                key={ch.id}
                id={`card-tenant-${ch.id}`}
                onClick={() => onSelectChurch(ch)}
                className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">{ch.denomination || 'Congregation'}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-amber-600" /> Active
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 mt-2">{ch.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{ch.city}, {ch.state}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Pastor: {ch.pastorName?.split(' ')[0] || 'Pastor'}</span>
                  <span className="font-bold text-slate-800">{ch.subscriptionPlan}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All User Accounts & Logins Grid */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">User Accounts & Role Credentials ({safeUsers.length})</h3>
            <p className="text-xs text-slate-500">Each user has username & password credentials and a designated church affiliation:</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {safeUsers.map((usr) => {
            const isCurrent = usr.id === currentUser?.id;
            const roleConfig = ROLE_CONFIGS[usr.role] || ROLE_CONFIGS.Member;
            const userChurch = safeChurches.find(c => c.id === (usr.church_id || usr.churchId));

            return (
              <div
                key={usr.id}
                id={`card-user-${usr.username}`}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'bg-indigo-950 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/40'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    name={usr.name}
                    avatarUrl={usr.avatarUrl}
                    size="md"
                    shape="rounded"
                    border="border border-slate-300"
                  />
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-extrabold truncate">{usr.name}</p>
                      {isCurrent && (
                        <span className="text-[9px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md font-semibold border ${roleConfig.badgeColor}`}>
                      {roleConfig.label.split('(')[0].trim()}
                    </span>
                  </div>
                </div>

                <div className={`pt-2 border-t text-[11px] space-y-1 ${isCurrent ? 'border-indigo-800 text-indigo-200' : 'border-slate-200 text-slate-600'}`}>
                  <div className="flex justify-between">
                    <span>Username:</span>
                    <strong className={`font-mono ${isCurrent ? 'text-amber-300' : 'text-slate-900'}`}>{usr.username}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Password:</span>
                    <strong className="font-mono">{usr.password || 'admin123'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Church:</span>
                    <span className="truncate max-w-[120px]">{userChurch?.name || 'Main Church'}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Create New SaaS User Account</h3>
                <p className="text-xs text-slate-500">Configure role-based access & credentials</p>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Deacon Joshua Raj"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. joshua.deacon"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Church *</label>
                <select
                  value={newUserChurchId}
                  onChange={(e) => setNewUserChurchId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {safeChurches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Permission *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as SaaSUserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="PastorAdmin">PastorAdmin (Full Church Access & User Provisioning)</option>
                  <option value="AssistantPastor">AssistantPastor (Full Ministry Operations - No SaaS Console)</option>
                  <option value="SundaySchoolTeacher">SundaySchoolTeacher (Children Ministry & Classes)</option>
                  <option value="MinistryLeader">MinistryLeader (Worship, Roster & Volunteers)</option>
                  <option value="TreasurerStaff">TreasurerStaff (Administration & Attendance)</option>
                  <option value="Member">Member (Prayer Wall, Calendar & Bulletins)</option>
                  <option value="Volunteer">Volunteer (Teams & Duty Roster)</option>
                  <option value="SuperAdmin">SuperAdmin (Global Platform Administrator)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@church.in"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Registration Modal (SuperAdmin Only) */}
      {isRegisterOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Register New Church Tenant</h3>
                <p className="text-xs text-slate-500">Provision a fresh church management database instance</p>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateChurch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Church Name *</label>
                <input
                  type="text"
                  required
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="e.g. Hope Harvest Fellowship"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Kochi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Kerala"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Senior Pastor Name</label>
                  <input
                    type="text"
                    value={pastorName}
                    onChange={(e) => setPastorName(e.target.value)}
                    placeholder="e.g. Pastor Paul Varghese"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Denomination / Fellowship</label>
                <select
                  value={denomination}
                  onChange={(e) => setDenomination(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Pentecostal / Charismatic">Pentecostal / Charismatic</option>
                  <option value="Evangelical Non-Denominational">Evangelical Non-Denominational</option>
                  <option value="Assembly of God">Assembly of God</option>
                  <option value="Baptist / CSI / CNI">Baptist / CSI / CNI</option>
                  <option value="Independent Community Church">Independent Community Church</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select SaaS Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Free Tier', 'Growth Church', 'Enterprise Multi-Campus'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlan(p)}
                      className={`p-2.5 rounded-xl text-[11px] font-bold border transition ${
                        plan === p
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition"
              >
                Provision Church SaaS Account
              </button>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
