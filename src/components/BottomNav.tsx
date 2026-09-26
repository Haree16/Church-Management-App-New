import React, { useState, useMemo } from 'react';
import { 
  Users, Heart, Calendar, Bell, 
  Megaphone, HeartHandshake, UserCheck, Menu, X,
  GraduationCap, MessageSquare, Building2, Settings, Landmark,
  LayoutDashboard, BarChart3, UserPlus, BookOpen, User
} from 'lucide-react';
import { SaaSUserRole, ChurchModuleToggles, SaaSUser, Member, ChurchMinistry, MinistryMember } from '../types';
import { isTabAllowed, getRoleConfig, isModuleEnabledInChurch } from '../utils/rbac';
import { getUserAssignedMinistries } from '../utils/ministryPermissions';

export type AppTab = 
  | 'dashboard'
  | 'reports'
  | 'visitors'
  | 'directory' 
  | 'ministries'
  | 'my-ministry'
  | 'my-assignments'
  | 'my-attendance'
  | 'my-profile'
  | 'groups'
  | 'attendance' 
  | 'prayers' 
  | 'pastoral'
  | 'calendar' 
  | 'notifications' 
  | 'announcements' 
  | 'volunteers' 
  | 'roster' 
  | 'sundayschool'
  | 'whatsapp'
  | 'saas'
  | 'settings';

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  urgentPrayerCount: number;
  unreadNotifCount: number;
  userRole?: SaaSUserRole;
  moduleToggles?: ChurchModuleToggles;
  currentUser?: SaaSUser;
  members?: Member[];
  ministries?: ChurchMinistry[];
  ministryMembers?: MinistryMember[];
  onOpenMyProfile?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  urgentPrayerCount,
  unreadNotifCount,
  userRole = 'PastorAdmin' as SaaSUserRole,
  moduleToggles,
  currentUser,
  members = [],
  ministries = [],
  ministryMembers = [],
  onOpenMyProfile,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const roleConfig = getRoleConfig(userRole);

  const userMinistries = useMemo(() => {
    return getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  }, [currentUser, members, ministries, ministryMembers]);

  const isMinistryMember = userMinistries.length > 0;
  const isNormalMemberRole = userRole === 'Member' || userRole === 'Volunteer';

  const ALL_MODULES = [
    { id: 'dashboard' as AppTab, label: 'Dashboard', icon: LayoutDashboard, desc: 'Church analytics & personalized overview' },
    { id: 'my-ministry' as AppTab, label: 'My Ministry', icon: Landmark, desc: 'My assigned ministry team, events & members' },
    { id: 'my-assignments' as AppTab, label: 'My Assignments', icon: HeartHandshake, desc: 'My duty roster shifts & serving tasks' },
    { id: 'my-attendance' as AppTab, label: 'My Attendance', icon: UserCheck, desc: 'My attendance records & participation rate' },
    { id: 'my-profile' as AppTab, label: 'My Profile', icon: User, desc: 'View my member profile details' },
    { id: 'reports' as AppTab, label: 'Reports', icon: BarChart3, desc: 'Detailed reports, growth trends & exports' },
    { id: 'visitors' as AppTab, label: 'Visitors', icon: UserPlus, desc: 'Visitor lifecycle, follow-ups & conversion' },
    { id: 'directory' as AppTab, label: 'Members', icon: Users, desc: 'Church member & family directory' },
    { id: 'ministries' as AppTab, label: 'Ministries', icon: Landmark, desc: 'Church ministries, teams & activities' },
    { id: 'groups' as AppTab, label: 'Small Groups', icon: Users, desc: 'Small groups, cell groups, meetings & attendance' },
    { id: 'prayers' as AppTab, label: 'Prayers', icon: Heart, desc: 'Intercessory prayer requests & praises', badge: urgentPrayerCount > 0 ? urgentPrayerCount : undefined },
    { id: 'pastoral' as AppTab, label: 'Pastoral Care', icon: HeartHandshake, desc: 'Confidential care cases, hospital visits & counseling' },
    { id: 'calendar' as AppTab, label: 'Events', icon: Calendar, desc: 'Service calendar & event schedules' },
    { id: 'sundayschool' as AppTab, label: 'Sunday School', icon: GraduationCap, desc: 'Children classes, memory verses & badges' },
    { id: 'whatsapp' as AppTab, label: 'WhatsApp', icon: MessageSquare, desc: 'One-click WhatsApp reminders & notices' },
    { id: 'attendance' as AppTab, label: 'Attendance', icon: UserCheck, desc: 'Sunday service attendance tracking' },
    { id: 'announcements' as AppTab, label: 'Bulletins', icon: Megaphone, desc: 'Pastoral notes & church announcements' },
    { id: 'volunteers' as AppTab, label: 'Volunteers', icon: HeartHandshake, desc: 'Ministry teams & skill matching' },
    { id: 'roster' as AppTab, label: 'Roster', icon: Calendar, desc: 'Sunday service duty assignments' },
    { id: 'notifications' as AppTab, label: 'Alerts', icon: Bell, desc: 'Live church broadcast notifications', badge: unreadNotifCount > 0 ? unreadNotifCount : undefined },
    { id: 'saas' as AppTab, label: 'SaaS Console', icon: Building2, desc: 'Multi-tenant church switcher & user roles' },
    { id: 'settings' as AppTab, label: 'Settings', icon: Settings, desc: 'Church profile, services, ministries & preferences' },
  ];

  // Tailored tab lists for Normal Member vs Ministry Member (Section 11)
  const allowedModules = useMemo(() => {
    if (isNormalMemberRole) {
      if (isMinistryMember) {
        // Section 11: Ministry Member More Menu
        // Bible (Sunday School), Bulletins, Alerts, My Ministry, My Assignments, My Attendance, My Profile, My Prayer Requests, Small Groups, Settings
        const tabOrder: AppTab[] = [
          'dashboard',
          'prayers',
          'groups',
          'ministries',
          'calendar',
          'announcements',
          'notifications',
          'my-ministry',
          'my-assignments',
          'my-attendance',
          'my-profile',
        ];
        return tabOrder
          .filter((tabId) => isTabAllowed(userRole, tabId, moduleToggles))
          .map((tabId) => ALL_MODULES.find((m) => m.id === tabId))
          .filter(Boolean) as typeof ALL_MODULES;
      } else {
        // Section 11: Normal Member More Menu
        // Bulletins, Alerts, My Profile, My Prayer Requests, My Attendance, Small Groups
        const tabOrder: AppTab[] = [
          'dashboard',
          'prayers',
          'groups',
          'ministries',
          'calendar',
          'announcements',
          'notifications',
          'my-attendance',
          'my-profile',
        ];
        return tabOrder
          .filter((tabId) => isTabAllowed(userRole, tabId, moduleToggles))
          .map((tabId) => ALL_MODULES.find((m) => m.id === tabId))
          .filter(Boolean) as typeof ALL_MODULES;
      }
    }

    // Default admin / leader tabs
    return roleConfig.allowedTabs
      .filter((tabId) => isModuleEnabledInChurch(tabId, moduleToggles))
      .map((tabId) => ALL_MODULES.find((m) => m.id === tabId))
      .filter(Boolean) as typeof ALL_MODULES;
  }, [isNormalMemberRole, isMinistryMember, roleConfig, moduleToggles]);

  // Primary 4 tabs in bottom bar
  const hasMoreMenu = allowedModules.length > 5;
  const primaryTabs = isNormalMemberRole
    ? [
        ALL_MODULES.find((m) => m.id === 'dashboard')!,
        ALL_MODULES.find((m) => m.id === 'prayers')!,
        ALL_MODULES.find((m) => m.id === 'ministries')!,
        ALL_MODULES.find((m) => m.id === 'calendar')!,
      ].filter(Boolean)
    : (hasMoreMenu ? allowedModules.slice(0, 4) : allowedModules);

  // Overflow items for More Menu
  const overflowTabs = isNormalMemberRole
    ? allowedModules.filter((m) => !primaryTabs.some((p) => p.id === m.id))
    : (hasMoreMenu ? allowedModules.slice(4) : []);

  return (
    <>
      {/* Overflow Modules Drawer */}
      {showMoreMenu && hasMoreMenu && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-40 flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-white space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Menu className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {isMinistryMember ? 'Ministry Member Menu' : 'Member Menu'}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isMinistryMember
                    ? 'Includes your assigned ministry screens, roster assignments & attendance'
                    : 'Church bulletins, prayer requests & member portal'}
                </p>
              </div>

              <button
                id="btn-close-more-menu"
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {overflowTabs.map((mod) => {
                const Icon = mod.icon;
                const isActive = activeTab === mod.id;
                return (
                  <button
                    key={mod.id}
                    id={`btn-menu-${mod.id}`}
                    onClick={() => {
                      if (mod.id === 'my-profile' && onOpenMyProfile) {
                        onOpenMyProfile();
                      } else {
                        setActiveTab(mod.id);
                      }
                      setShowMoreMenu(false);
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex items-start gap-3 ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold leading-snug">{mod.label}</p>
                        {mod.badge !== undefined && (
                          <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            {mod.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{mod.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 fixed bottom-0 left-0 right-0 z-30 px-2 py-1.5 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`btn-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all ${
                  isActive
                    ? 'text-amber-600 dark:text-amber-400 font-extrabold bg-amber-500/15'
                    : 'hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight font-medium">{tab.label}</span>
              </button>
            );
          })}

          {hasMoreMenu && (() => {
            const isOverflowActive = overflowTabs.some(t => t.id === activeTab);
            const activeOverflowMod = overflowTabs.find(t => t.id === activeTab);
            return (
              <button
                id="btn-open-more-menu"
                onClick={() => setShowMoreMenu(true)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all ${
                  isOverflowActive
                    ? 'text-amber-600 dark:text-amber-400 font-extrabold bg-amber-500/15'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Menu className={`w-5 h-5 ${isOverflowActive ? 'stroke-[2.5] text-amber-500 dark:text-amber-400' : 'stroke-2 text-amber-500 dark:text-amber-400'}`} />
                <span className="text-[10px] mt-1 tracking-tight font-bold text-amber-600 dark:text-amber-400 truncate max-w-[65px]">
                  {isOverflowActive ? activeOverflowMod?.label : `More (${overflowTabs.length})`}
                </span>
              </button>
            );
          })()}
        </div>
      </nav>
    </>
  );
};
