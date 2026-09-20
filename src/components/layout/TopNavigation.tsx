import React, { useState, useEffect } from 'react';
import { Menu, Bell, Check, Building2, User, LogOut, ChevronDown, Sparkles, ExternalLink, Settings, Search, Command, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Breadcrumbs } from './Breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { getInitials, formatDate } from '@/lib/utils';
import { DEMO_USERS } from '@/lib/mockData';
import { ROLE_DEFINITIONS } from '@/lib/permissions';
import { Link, useNavigate } from 'react-router-dom';
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog';
import { CreateChurchDialog } from '@/components/church/CreateChurchDialog';

import { canAccessAiPastor } from '@/utils/rbac';

interface TopNavigationProps {
  onOpenMobileMenu: () => void;
  onOpenChurchAi?: () => void;
  onOpenAiPastor?: () => void;
  onOpenAiMinistry?: () => void;
}

export function TopNavigation({ onOpenMobileMenu, onOpenChurchAi, onOpenAiPastor, onOpenAiMinistry }: TopNavigationProps) {
  const { user, profile, activeChurch, availableChurches, currentRole, switchRole, switchChurch, createChurch, setDemoUser, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateChurchOpen, setIsCreateChurchOpen] = useState(false);

  const currentRoleDef = currentRole ? ROLE_DEFINITIONS[currentRole] : null;

  // Keyboard shortcut ⌘K for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-6 backdrop-blur-xs">
        {/* Left Side: Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 text-slate-600 dark:text-slate-300"
          onClick={onOpenMobileMenu}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        {/* Global Search Bar Button */}
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 text-xs text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search church records...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Church AI Quick Launcher */}
          {onOpenChurchAi && (
            <button
              type="button"
              onClick={onOpenChurchAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/10 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 hover:bg-purple-900/20 transition-colors text-xs font-semibold"
              title="Open Central Church AI Interface"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
              <span>Church AI</span>
            </button>
          )}

          {/* AI Pastor Quick Launcher */}
          {canAccessAiPastor(currentRole || undefined) && onOpenAiPastor && (
            <button
              type="button"
              onClick={onOpenAiPastor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/10 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-900/20 transition-colors text-xs font-semibold"
              title="Open AI Pastor Leadership Assistant"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">AI Pastor</span>
            </button>
          )}

          {/* AI Ministry Assistant Quick Launcher */}
          {onOpenAiMinistry && (
            <button
              type="button"
              onClick={onOpenAiMinistry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-900/10 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-900/20 transition-colors text-xs font-semibold"
              title="Consult AI Ministry Assistant"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span className="hidden sm:inline">AI Ministry</span>
            </button>
          )}

          {/* Church Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200 text-xs font-medium">
                <Building2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span className="max-w-[120px] truncate sm:max-w-[160px]">{activeChurch?.name || 'Select Church'}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-xs">Your Churches</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableChurches.map((church) => {
              const isActive = church.id === activeChurch?.id;
              return (
                <DropdownMenuItem
                  key={church.id}
                  onClick={() => switchChurch(church.id)}
                  className="flex items-center justify-between cursor-pointer text-xs"
                >
                  <span className={isActive ? 'font-semibold text-sky-600 dark:text-sky-400' : ''}>
                    {church.name}
                  </span>
                  {isActive && <Check className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsCreateChurchOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold text-sky-600 cursor-pointer hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Church</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Role Switcher (Developer & Demo Testing) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="hidden md:inline-flex h-9 gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Role:</span>
              <span className="text-sky-700 dark:text-sky-300">{currentRoleDef?.name || 'Member'}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs">
              <div className="font-bold">Test Any Role Instantly</div>
              <div className="text-[10px] text-slate-500 font-normal">Simulates RLS & permission gating</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEMO_USERS.map((demo) => {
              const isSelected = currentRole === demo.role;
              return (
                <DropdownMenuItem
                  key={demo.role}
                  onClick={() => setDemoUser(demo)}
                  className="flex items-center justify-between cursor-pointer py-1.5"
                >
                  <div className="flex flex-col">
                    <span className={`text-xs ${isSelected ? 'font-bold text-sky-600' : 'font-medium'}`}>
                      {demo.title}
                    </span>
                    <span className="text-[10px] text-slate-400">{demo.name} ({demo.email})</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-sky-600 shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 text-slate-600 hover:bg-slate-100 dark:text-slate-300">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                  {unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="default" className="h-4 px-1.5 text-[9px]">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No notifications</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.link) navigate(notif.link);
                    }}
                    className={`flex flex-col gap-1 p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      !notif.is_read ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(notif.created_at, 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 p-2 text-center dark:border-slate-800">
              <Link
                to="/communication/notifications"
                className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400 inline-flex items-center gap-1"
              >
                View all notifications <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name || 'User'} />
                <AvatarFallback>
                  {getInitials(profile?.display_name, user?.email)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.display_name || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <div className="pt-1">
                  <Badge variant={currentRoleDef?.badgeVariant || 'default'} className="text-[10px]">
                    {currentRoleDef?.name || 'Member'}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer text-xs">
                <User className="mr-2 h-4 w-4 text-slate-500" />
                <span>Dashboard</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate('/settings/church')} className="cursor-pointer text-xs">
                <Settings className="mr-2 h-4 w-4 text-slate-500" />
                <span>Church Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="cursor-pointer text-xs text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/30"
            >
              <LogOut className="mr-2 h-4 w-4 text-red-600" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <GlobalSearchDialog
      isOpen={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
    />

    <CreateChurchDialog
      isOpen={isCreateChurchOpen}
      onClose={() => setIsCreateChurchOpen(false)}
      onCreate={createChurch}
    />
  </>
  );
}
