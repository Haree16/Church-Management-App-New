import { SaaSUserRole, ChurchModuleToggles } from '../types';
import { AppTab } from '../components/BottomNav';

export interface RoleConfig {
  role: SaaSUserRole;
  label: string;
  badgeColor: string;
  description: string;
  allowedTabs: AppTab[];
  canSwitchChurch: boolean;
  canManageMembers: boolean;
  canManageMinistries: boolean;
  canManagePrayers: boolean;
  canManageRoster: boolean;
  canRecordAttendance: boolean;
  canManageSundaySchool: boolean;
  canPublishAnnouncements: boolean;
  canSendWhatsApp: boolean;
  canManageEvents: boolean;
  canAccessSettings: boolean;
  canEditSettings: boolean;
  canAccessReports: boolean;
  canManageVisitors: boolean;
  canManagePastoralCare: boolean;
  canModeratePrayerWall: boolean;
}

export const ROLE_CONFIGS: Record<SaaSUserRole, RoleConfig> = {
  SuperAdmin: {
    role: 'SuperAdmin',
    label: 'Platform Super Admin',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    description: 'Universal platform management, all churches & global administration',
    allowedTabs: [
      'dashboard',
      'reports',
      'saas',
      'directory',
      'visitors',
      'ministries',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'groups',
      'attendance',
      'whatsapp',
      'prayers',
      'pastoral',
      'calendar',
      'sundayschool',
      'announcements',
      'volunteers',
      'roster',
      'notifications',
      'settings',
    ],
    canSwitchChurch: true,
    canManageMembers: true,
    canManageMinistries: true,
    canManagePrayers: true,
    canManageRoster: true,
    canRecordAttendance: true,
    canManageSundaySchool: true,
    canPublishAnnouncements: true,
    canSendWhatsApp: true,
    canManageEvents: true,
    canAccessSettings: true,
    canEditSettings: true,
    canAccessReports: true,
    canManageVisitors: true,
    canManagePastoralCare: true,
    canModeratePrayerWall: true,
  },
  PastorAdmin: {
    role: 'PastorAdmin',
    label: 'Senior / Lead Pastor (Admin)',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Full administrator access to church operations, members, ministries & bulletins',
    allowedTabs: [
      'dashboard',
      'reports',
      'directory',
      'visitors',
      'ministries',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'groups',
      'prayers',
      'pastoral',
      'roster',
      'attendance',
      'sundayschool',
      'whatsapp',
      'calendar',
      'announcements',
      'volunteers',
      'notifications',
      'saas',
      'settings',
    ],
    canSwitchChurch: false,
    canManageMembers: true,
    canManageMinistries: true,
    canManagePrayers: true,
    canManageRoster: true,
    canRecordAttendance: true,
    canManageSundaySchool: true,
    canPublishAnnouncements: true,
    canSendWhatsApp: true,
    canManageEvents: true,
    canAccessSettings: true,
    canEditSettings: true,
    canAccessReports: true,
    canManageVisitors: true,
    canManagePastoralCare: true,
    canModeratePrayerWall: true,
  },
  AssistantPastor: {
    role: 'AssistantPastor',
    label: 'Assistant Pastor',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    description: 'Full ministry access: directory, ministries, prayers, attendance, roster, Sunday school & bulletins',
    allowedTabs: [
      'dashboard',
      'reports',
      'directory',
      'visitors',
      'ministries',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'groups',
      'prayers',
      'pastoral',
      'roster',
      'attendance',
      'sundayschool',
      'whatsapp',
      'calendar',
      'announcements',
      'volunteers',
      'notifications',
      'settings',
    ],
    canSwitchChurch: false,
    canManageMembers: true,
    canManageMinistries: true,
    canManagePrayers: true,
    canManageRoster: true,
    canRecordAttendance: true,
    canManageSundaySchool: true,
    canPublishAnnouncements: true,
    canSendWhatsApp: true,
    canManageEvents: false,
    canAccessSettings: true,
    canEditSettings: false,
    canAccessReports: true,
    canManageVisitors: true,
    canManagePastoralCare: true,
    canModeratePrayerWall: true,
  },
  TreasurerStaff: {
    role: 'TreasurerStaff',
    label: 'Finance / Church Office Staff',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    description: 'Member directories, ministries, attendance tracking & church administration',
    allowedTabs: [
      'dashboard',
      'visitors',
      'ministries',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'groups',
      'attendance',
      'calendar',
      'announcements',
      'notifications',
      'saas',
      'settings',
    ],
    canSwitchChurch: false,
    canManageMembers: false,
    canManageMinistries: false,
    canManagePrayers: false,
    canManageRoster: false,
    canRecordAttendance: true,
    canManageSundaySchool: false,
    canPublishAnnouncements: false,
    canSendWhatsApp: true,
    canManageEvents: false,
    canAccessSettings: true,
    canEditSettings: true,
    canAccessReports: false,
    canManageVisitors: true,
    canManagePastoralCare: false,
    canModeratePrayerWall: false,
  },
  MinistryLeader: {
    role: 'MinistryLeader',
    label: 'Worship / Ministry Team Leader',
    badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
    description: 'Service roster planning, ministry teams, volunteers, prayer team & schedules',
    allowedTabs: [
      'dashboard',
      'visitors',
      'ministries',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'groups',
      'prayers',
      'roster',
      'volunteers',
      'attendance',
      'calendar',
      'announcements',
      'notifications',
    ],
    canSwitchChurch: false,
    canManageMembers: false,
    canManageMinistries: true,
    canManagePrayers: true,
    canManageRoster: true,
    canRecordAttendance: true,
    canManageSundaySchool: false,
    canPublishAnnouncements: false,
    canSendWhatsApp: true,
    canManageEvents: false,
    canAccessSettings: false,
    canEditSettings: false,
    canAccessReports: false,
    canManageVisitors: true,
    canManagePastoralCare: false,
    canModeratePrayerWall: true,
  },
  CellGroupLeader: {
    role: 'CellGroupLeader',
    label: 'Cell Group Leader',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Leads assigned cell group ministry, manages group roster & logs attendance',
    allowedTabs: [
      'dashboard',
      'groups',
      'attendance',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'prayers',
      'calendar',
      'announcements',
      'notifications',
    ],
    canSwitchChurch: false,
    canManageMembers: false,
    canManageMinistries: false,
    canManagePrayers: true,
    canManageRoster: true,
    canRecordAttendance: true,
    canManageSundaySchool: false,
    canPublishAnnouncements: false,
    canSendWhatsApp: true,
    canManageEvents: false,
    canAccessSettings: false,
    canEditSettings: false,
    canAccessReports: false,
    canManageVisitors: false,
    canManagePastoralCare: false,
    canModeratePrayerWall: false,
  },
  SundaySchoolTeacher: {
    role: 'SundaySchoolTeacher',
    label: 'Sunday School Teacher',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    description: 'Children ministry classes, student badges, verses & attendance',
    allowedTabs: [
      'dashboard',
      'sundayschool',
      'ministries',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'groups',
      'attendance',
      'calendar',
      'announcements',
      'prayers',
      'notifications',
    ],
    canSwitchChurch: false,
    canManageMembers: false,
    canManageMinistries: true,
    canManagePrayers: true,
    canManageRoster: false,
    canRecordAttendance: true,
    canManageSundaySchool: true,
    canPublishAnnouncements: false,
    canSendWhatsApp: true,
    canManageEvents: false,
    canAccessSettings: false,
    canEditSettings: false,
    canAccessReports: false,
    canManageVisitors: false,
    canManagePastoralCare: false,
    canModeratePrayerWall: false,
  },
  Member: {
    role: 'Member',
    label: 'Church Member / Congregation',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Prayer wall, church events calendar, pastoral bulletins, ministries & alerts',
    allowedTabs: [
      'dashboard',
      'prayers',
      'ministries',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'groups',
      'calendar',
      'announcements',
      'notifications',
    ],
    canSwitchChurch: false,
    canManageMembers: false,
    canManageMinistries: false,
    canManagePrayers: false,
    canManageRoster: false,
    canRecordAttendance: false,
    canManageSundaySchool: false,
    canPublishAnnouncements: false,
    canSendWhatsApp: false,
    canManageEvents: false,
    canAccessSettings: false,
    canEditSettings: false,
    canAccessReports: false,
    canManageVisitors: false,
    canManagePastoralCare: false,
    canModeratePrayerWall: false,
  },
  Volunteer: {
    role: 'Volunteer',
    label: 'Ministry Volunteer',
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
    description: 'Prayer wall, volunteer teams, ministries, duty roster, events & announcements',
    allowedTabs: [
      'dashboard',
      'prayers',
      'ministries',
      'my-ministry',
      'my-assignments',
      'my-attendance',
      'my-profile',
      'groups',
      'roster',
      'volunteers',
      'calendar',
      'announcements',
      'notifications',
    ],
    canSwitchChurch: false,
    canManageMembers: false,
    canManageMinistries: false,
    canManagePrayers: false,
    canManageRoster: false,
    canRecordAttendance: false,
    canManageSundaySchool: false,
    canPublishAnnouncements: false,
    canSendWhatsApp: false,
    canManageEvents: false,
    canAccessSettings: false,
    canEditSettings: false,
    canAccessReports: false,
    canManageVisitors: false,
    canManagePastoralCare: false,
    canModeratePrayerWall: false,
  },
};

export function canManagePastoralCare(role?: SaaSUserRole | string): boolean {
  const config = getRoleConfig(role);
  return config.canManagePastoralCare;
}

export function canModeratePrayerWall(role?: SaaSUserRole | string): boolean {
  const config = getRoleConfig(role);
  return config.canModeratePrayerWall;
}

export function canManageSmallGroups(role?: SaaSUserRole | string): boolean {
  const norm = normalizeRole(role);
  return ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'MinistryLeader', 'CellGroupLeader'].includes(norm);
}

export function canManageVisitors(role?: SaaSUserRole): boolean {
  const config = getRoleConfig(role);
  return config.canManageVisitors;
}

export function canManageChurchEvents(role?: SaaSUserRole): boolean {
  return role === 'SuperAdmin' || role === 'PastorAdmin';
}

export function canManageAllMinistries(role?: SaaSUserRole): boolean {
  return role === 'SuperAdmin' || role === 'PastorAdmin' || role === 'AssistantPastor';
}

export function canCreateEditMinistry(role?: SaaSUserRole): boolean {
  return role === 'SuperAdmin' || role === 'PastorAdmin';
}

export function canAccessReports(role?: SaaSUserRole | string): boolean {
  const norm = normalizeRole(role);
  return norm === 'SuperAdmin' || norm === 'PastorAdmin' || norm === 'AssistantPastor';
}

export function canAccessAllChurchReports(role?: SaaSUserRole | string): boolean {
  const norm = normalizeRole(role);
  return norm === 'SuperAdmin' || norm === 'PastorAdmin' || norm === 'AssistantPastor';
}

export function normalizeRole(role?: string): SaaSUserRole {
  if (!role) return 'PastorAdmin';
  const r = role.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (r.includes('superadmin') || r.includes('super_admin')) return 'SuperAdmin';
  if (r.includes('assistantpastor')) return 'AssistantPastor';
  if (r.includes('pastor') || r.includes('churchadmin') || r.includes('admin')) return 'PastorAdmin';
  if (r.includes('treasurer') || r.includes('finance') || r.includes('office')) return 'TreasurerStaff';
  if (r.includes('cellgroup') || r.includes('cell_group') || r.includes('groupleader') || r.includes('group_leader')) return 'CellGroupLeader';
  if (r.includes('ministryleader') || r.includes('leader')) return 'MinistryLeader';
  if (r.includes('sundayschool') || r.includes('teacher')) return 'SundaySchoolTeacher';
  if (r.includes('volunteer')) return 'Volunteer';
  if (r.includes('member')) return 'Member';
  return 'PastorAdmin';
}

export function getRoleConfig(role?: SaaSUserRole | string): RoleConfig {
  if (!role) {
    return ROLE_CONFIGS.PastorAdmin;
  }
  if (ROLE_CONFIGS[role as SaaSUserRole]) {
    return ROLE_CONFIGS[role as SaaSUserRole];
  }
  const norm = normalizeRole(role);
  return ROLE_CONFIGS[norm] || ROLE_CONFIGS.PastorAdmin;
}

export function isModuleEnabledInChurch(tab: AppTab, moduleToggles?: ChurchModuleToggles): boolean {
  if (!moduleToggles) return true;
  // Dashboard, Settings, and personal member views remain active
  if (
    tab === 'dashboard' ||
    tab === 'settings' ||
    tab === 'my-ministry' ||
    tab === 'my-assignments' ||
    tab === 'my-attendance' ||
    tab === 'my-profile'
  ) return true;
  return moduleToggles[tab as keyof ChurchModuleToggles] !== false;
}

export function isTabAllowed(
  role: SaaSUserRole | string | undefined,
  tab: AppTab,
  moduleToggles?: ChurchModuleToggles
): boolean {
  const config = getRoleConfig(role);
  if (!config.allowedTabs.includes(tab)) {
    if (
      tab === 'dashboard' ||
      tab === 'groups' ||
      tab === 'my-ministry' ||
      tab === 'my-assignments' ||
      tab === 'my-attendance' ||
      tab === 'my-profile'
    ) return true;
    return false;
  }
  return isModuleEnabledInChurch(tab, moduleToggles);
}

export function getDefaultTabForRole(
  role: SaaSUserRole | undefined,
  moduleToggles?: ChurchModuleToggles
): AppTab {
  const config = getRoleConfig(role);
  for (const tab of config.allowedTabs) {
    if (isTabAllowed(role, tab, moduleToggles)) {
      return tab;
    }
  }
  return 'prayers';
}

export function canAccessChurchSettings(role?: SaaSUserRole): boolean {
  const config = getRoleConfig(role);
  return config.canAccessSettings;
}

export function canEditChurchSettings(role?: SaaSUserRole): boolean {
  const config = getRoleConfig(role);
  return config.canEditSettings;
}

export function canManageSystemPreferences(role?: SaaSUserRole | string): boolean {
  return normalizeRole(role) === 'SuperAdmin';
}

export function canPublishAnnouncements(role?: SaaSUserRole | string): boolean {
  if (!role) return false;
  const norm = normalizeRole(role);
  return ['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(norm);
}

export function canAccessAiPastor(role?: SaaSUserRole | string): boolean {
  if (!role) return false;
  const norm = normalizeRole(role);
  return ['SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(norm);
}
