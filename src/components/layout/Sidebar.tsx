import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  HeartHandshake,
  Church as ChurchIcon,
  Layers,
  Sparkles,
  CalendarCheck2,
  Calendar,
  Heart,
  MessageSquare,
  DollarSign,
  Wallet,
  FileBarChart2,
  Megaphone,
  Bell,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Sliders,
  Baby,
  School,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Permission } from '@/types/auth';
import { Badge } from '@/components/ui/badge';
import { ROLE_DEFINITIONS } from '@/lib/permissions';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  badge?: string;
}

interface NavSection {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  items: NavItem[];
}

export function Sidebar({ className, onClose }: { className?: string; onClose?: () => void }) {
  const { activeChurch, currentRole, profile } = useAuth();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const navSections: NavSection[] = [
    {
      title: 'People',
      permission: 'members:read',
      items: [
        { title: 'Members', href: '/people/members', icon: Users, permission: 'members:read' },
        { title: 'Families', href: '/people/families', icon: HeartHandshake, permission: 'families:read' },
        { title: 'Visitors', href: '/people/visitors', icon: UserCheck, permission: 'members:read' },
      ],
    },
    {
      title: 'Church',
      items: [
        { title: 'Ministries', href: '/church/ministries', icon: Layers, permission: 'ministries:read' },
        { title: 'Groups', href: '/church/groups', icon: ChurchIcon, permission: 'groups:read' },
        { title: 'Volunteers', href: '/church/volunteers', icon: Sparkles, permission: 'volunteers:read' },
      ],
    },
    {
      title: 'Engagement',
      items: [
        { title: 'Attendance', href: '/engagement/attendance', icon: CalendarCheck2, permission: 'attendance:read' },
        { title: 'Events', href: '/engagement/events', icon: Calendar, permission: 'events:read' },
        { title: 'Calendar', href: '/engagement/calendar', icon: Calendar, permission: 'events:read' },
        { title: 'Prayer Requests', href: '/engagement/prayer-requests', icon: Heart, permission: 'prayers:read_public' },
        { title: 'Follow-ups', href: '/engagement/follow-ups', icon: MessageSquare, permission: 'members:read' },
      ],
    },
    {
      title: 'Finance',
      permission: 'finance:view_own_giving',
      items: [
        { title: 'Donations', href: '/finance/donations', icon: DollarSign, permission: 'finance:view_own_giving' },
        { title: 'Funds', href: '/finance/funds', icon: Wallet, permission: 'finance:view_overview' },
        { title: 'Giving Reports', href: '/finance/giving-reports', icon: FileBarChart2, permission: 'finance:view_overview' },
      ],
    },
    {
      title: 'Next-Gen Ministries',
      items: [
        { title: "Children's Ministry", href: '/children', icon: Baby, permission: 'children:check_in' },
        { title: "Children Classes", href: '/children/classes', icon: School, permission: 'children:read' },
        { title: 'Youth Ministry', href: '/youth', icon: Sparkles, permission: 'youth:read' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { title: 'Announcements', href: '/communication/announcements', icon: Megaphone, permission: 'announcements:read' },
        { title: 'Broadcast Outbox', href: '/communication/composer', icon: Send, permission: 'communication:send' },
        { title: 'Notifications', href: '/communication/notifications', icon: Bell },
      ],
    },
  ];

  const roleDef = currentRole ? ROLE_DEFINITIONS[currentRole] : null;

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 select-none',
        className
      )}
    >
      {/* Church Branding Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          {activeChurch?.logo_url ? (
            <img
              src={activeChurch.logo_url}
              alt={activeChurch.name}
              className="h-9 w-9 rounded-lg object-cover ring-1 ring-slate-200 shadow-sm"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 font-bold text-white shadow-sm">
              <ChurchIcon className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col truncate">
            <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {activeChurch?.name || 'Church CMS'}
            </span>
            <span className="truncate text-[11px] text-slate-500">
              {activeChurch?.city ? `${activeChurch.city}, ${activeChurch.state || ''}` : 'Multi-Church Portal'}
            </span>
          </div>
        </div>
      </div>

      {/* User Role Pill */}
      {roleDef && (
        <div className="mx-3 mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-200">
                {profile?.display_name || 'Active User'}
              </span>
              <span className="text-[10px] text-slate-500">Logged in as</span>
            </div>
          </div>
          <Badge variant={roleDef.badgeVariant} className="text-[10px] uppercase tracking-wider px-1.5 py-0">
            {roleDef.name}
          </Badge>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {/* Dashboard Direct Link */}
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            )
          }
        >
          <LayoutDashboard className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span>Dashboard</span>
        </NavLink>

        {/* Categorized Sections */}
        {navSections.map((section) => {
          // Check section permissions
          if (section.permission && !hasPermission(currentRole, section.permission)) {
            return null;
          }

          // Filter visible sub-items
          const visibleItems = section.items.filter((item) =>
            item.permission ? hasPermission(currentRole, item.permission) : true
          );

          if (visibleItems.length === 0) return null;

          const isCollapsed = collapsedSections[section.title];

          return (
            <div key={section.title} className="pt-2">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <span>{section.title}</span>
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {!isCollapsed && (
                <div className="mt-1 space-y-0.5 pl-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                          isActive
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge && (
                        <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Global Reports */}
        {hasPermission(currentRole, 'reports:view') && (
          <div className="pt-2">
            <NavLink
              to="/reports"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )
              }
            >
              <BarChart3 className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Reports</span>
            </NavLink>
          </div>
        )}

        {/* Settings & Audit Logs */}
        {hasPermission(currentRole, 'church:settings_update') && (
          <div className="pt-1 space-y-1">
            <NavLink
              to="/settings/church"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )
              }
            >
              <Sliders className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Church Settings</span>
            </NavLink>

            <NavLink
              to="/settings/audit-logs"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )
              }
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Audit Trail</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Footer info */}
      <div className="border-t border-slate-100 p-3 text-center text-[10px] text-slate-400 dark:border-slate-800">
        Church Management System v2.0 (Production)
      </div>
    </aside>
  );
}
