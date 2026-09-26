import React, { useMemo } from 'react';
import { ChurchTenant, SaaSUser } from '@/types';
import { CompleteChurchSettings } from '@/types';
import { 
  Users, UserPlus, UserCheck, Calendar, Heart, 
  Landmark, Sparkles, MessageSquare, Clock 
} from 'lucide-react';
import { getRoleConfig, canAccessAiPastor } from '@/utils/rbac';

interface WelcomeHeaderProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser;
  churchSettings?: CompleteChurchSettings;
  totalMembersCount: number;
  totalVisitorsCount: number;
  onOpenAddMember?: () => void;
  onOpenAddPrayer?: () => void;
  onOpenAddEvent?: () => void;
  onOpenRecordAttendance?: () => void;
  onOpenCreateMinistry?: () => void;
  onOpenChurchAi?: () => void;
  onOpenAiPastor?: () => void;
  onOpenAiMinistry?: () => void;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  currentChurch,
  currentUser,
  churchSettings,
  totalMembersCount,
  totalVisitorsCount,
  onOpenAddMember,
  onOpenAddPrayer,
  onOpenAddEvent,
  onOpenRecordAttendance,
  onOpenCreateMinistry,
  onOpenChurchAi,
  onOpenAiPastor,
  onOpenAiMinistry,
}) => {
  const userRole = currentUser?.role || 'Member';
  const roleConfig = getRoleConfig(userRole);
  const churchTimezone = churchSettings?.localization?.timezone || 'Asia/Kolkata';

  // Localized date formatting
  const nowFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: churchTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [churchTimezone]);

  // Contextual Greeting based on time of day and role
  const greeting = useMemo(() => {
    try {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: churchTimezone,
        hour: 'numeric',
        hour12: false,
      }).format(new Date());
      const hour = parseInt(hourStr, 10);
      let prefix = 'Welcome';
      if (hour < 12) prefix = 'Good Morning';
      else if (hour < 17) prefix = 'Good Afternoon';
      else prefix = 'Good Evening';

      const title = userRole.includes('Pastor') ? 'Pastor' : userRole.includes('Admin') ? 'Leader' : '';
      const name = currentUser?.name ? currentUser.name.split(' ')[0] : 'Friend';
      return `${prefix}${title ? `, ${title}` : ''} ${name}`;
    } catch {
      return `Welcome, ${currentUser?.name || 'Leader'}`;
    }
  }, [churchTimezone, currentUser, userRole]);

  return (
    <div 
      data-theme-surface="dark"
      className="dark-hero-panel bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-800/80 relative overflow-hidden"
    >
      {/* Decorative ambient glowing lights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Contextual Greeting & Church Details */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {churchSettings?.profile?.name || currentChurch.name}
            </span>
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
              <Clock className="w-3.5 h-3.5 text-slate-300" />
              {nowFormatted}
            </span>
            <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
              {roleConfig.label}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Here is your church overview for today. Track attendance, monitor congregation growth, respond to care requests, and manage ministry operations.
          </p>
        </div>

        {/* Right Side: Quick Action Buttons (Permission Scoped) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
          {onOpenChurchAi && (
            <button
              onClick={onOpenChurchAi}
              className="px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 border border-purple-400/30"
              title="Open Central Church AI Interface"
            >
              <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
              <span>Church AI</span>
            </button>
          )}

          {canAccessAiPastor(userRole) && onOpenAiPastor && (
            <button
              onClick={onOpenAiPastor}
              className="px-3.5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 border border-amber-400/30"
              title="Open AI Pastor Leadership Assistant"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>AI Pastor</span>
            </button>
          )}

          {onOpenAiMinistry && (
            <button
              onClick={onOpenAiMinistry}
              className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 border border-indigo-400/30"
              title="Consult AI Ministry Assistant"
            >
              <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
              <span>AI Ministry Assistant</span>
            </button>
          )}

          {roleConfig.canManageMembers && onOpenAddMember && (
            <button
              onClick={onOpenAddMember}
              className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          )}

          {roleConfig.canRecordAttendance && onOpenRecordAttendance && (
            <button
              onClick={onOpenRecordAttendance}
              className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Record Attendance</span>
            </button>
          )}

          {onOpenAddEvent && (
            <button
              onClick={onOpenAddEvent}
              className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          )}

          {onOpenAddPrayer && (
            <button
              onClick={onOpenAddPrayer}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Add Prayer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
