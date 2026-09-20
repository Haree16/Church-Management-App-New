import React, { useState, useRef, useEffect } from 'react';
import { 
  Smartphone, Monitor, Database, Plus, Heart, Users, 
  HeartHandshake, Building2, LogOut, ChevronDown, 
  Shield, Check, Sparkles, User as UserIcon, Settings,
  Bell, BellRing, Trash2, CheckCheck, ExternalLink, X,
  Camera, Upload, Edit3, Save, Phone, Mail, Image as ImageIcon, CheckCircle2
} from 'lucide-react';
import { AppTab } from './BottomNav';
import { ChurchTenant, SaaSUser, ChurchModuleToggles, CompleteChurchSettings, AppNotification, Member } from '../types';
import { isNotificationForUser, isNotificationReadByUser, getUnreadNotificationsCount } from '../utils/notificationUtils';
import { getRoleConfig, canAccessChurchSettings, canAccessAiPastor } from '../utils/rbac';
import { UserAvatar } from './common/UserAvatar';

interface HeaderProps {
  memberCount: number;
  prayerCount: number;
  volunteerCount: number;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  onOpenAddMember?: () => void;
  onOpenAddPrayer?: () => void;
  onOpenExportModal: () => void;
  onOpenChurchAi?: () => void;
  onOpenAiPastor?: () => void;
  onOpenAiMinistry?: () => void;
  activeTab: AppTab;
  currentChurch?: ChurchTenant;
  currentUser?: SaaSUser;
  churches?: ChurchTenant[];
  churchSettings?: CompleteChurchSettings;
  moduleToggles?: ChurchModuleToggles;
  notifications?: AppNotification[];
  members?: Member[];
  onMarkNotifRead?: (id: string) => void;
  onMarkAllNotifsRead?: () => void;
  onDeleteNotif?: (id: string) => void;
  onClearAllNotifs?: () => void;
  onSelectChurch?: (church: ChurchTenant) => void;
  onLogout?: () => void;
  onNavigateTab?: (tab: AppTab) => void;
  onUpdateUserProfile?: (updatedUser: SaaSUser) => void;
}

/**
 * Resizes and compresses image to lightweight base64 Data URL
 */
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
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
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => resolve(event.target?.result as string);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const Header: React.FC<HeaderProps> = ({
  memberCount,
  prayerCount,
  volunteerCount,
  isMobileFrame,
  onToggleFrame,
  onOpenAddMember,
  onOpenAddPrayer,
  onOpenExportModal,
  onOpenChurchAi,
  onOpenAiPastor,
  onOpenAiMinistry,
  activeTab,
  currentChurch,
  currentUser,
  churches = [],
  notifications = [],
  members = [],
  onMarkNotifRead,
  onMarkAllNotifsRead,
  onDeleteNotif,
  onClearAllNotifs,
  onSelectChurch,
  onLogout,
  onNavigateTab,
  onUpdateUserProfile,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChurchMenu, setShowChurchMenu] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [editDesignation, setEditDesignation] = useState(currentUser?.designation || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with currentUser changes
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || '');
      setEditPhone(currentUser.phone || '');
      setEditEmail(currentUser.email || '');
      setEditAvatarUrl(currentUser.avatarUrl || '');
      setEditDesignation(currentUser.designation || '');
    }
  }, [currentUser]);

  const safeNotifications = notifications || [];
  const churchNotifications = safeNotifications.filter(
    (n) => isNotificationForUser(n, currentUser, members)
  );
  const unreadNotifsCount = getUnreadNotificationsCount(safeNotifications, currentUser, members);

  const roleConfig = getRoleConfig(currentUser?.role);

  // Handle Photo File Pick
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    try {
      setIsUploadingPhoto(true);
      const compressedDataUrl = await compressImageFile(file);
      setEditAvatarUrl(compressedDataUrl);
      setShowPresetPicker(false);
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert('Failed to process image. Please try another photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!editName.trim()) {
      alert('Please enter your full name.');
      return;
    }

    const updatedUser: SaaSUser = {
      ...currentUser,
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      avatarUrl: editAvatarUrl.trim() || undefined,
      designation: editDesignation.trim() || undefined,
    };

    if (onUpdateUserProfile) {
      onUpdateUserProfile(updatedUser);
    }

    setSaveSuccessMsg('Profile & Member photo updated!');
    setTimeout(() => {
      setSaveSuccessMsg('');
      setIsEditingProfile(false);
    }, 1200);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-4 py-2.5 sticky top-0 z-30 shadow-md">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* App Title & Church Brand with Tenant Selector */}
        <div className="relative flex items-center space-x-2.5">
          <div 
            onClick={() => {
              if (roleConfig.canSwitchChurch) {
                setShowChurchMenu(!showChurchMenu);
              }
            }}
            className={`flex items-center space-x-2.5 ${roleConfig.canSwitchChurch ? 'cursor-pointer group' : ''}`}
            title={roleConfig.canSwitchChurch ? "Click to view or switch active church organization" : currentChurch?.name}
          >
            <div className={`w-10 h-10 rounded-full bg-white p-0.5 shadow-md shadow-amber-500/10 flex items-center justify-center overflow-hidden border border-amber-500/30 shrink-0 ${roleConfig.canSwitchChurch ? 'group-hover:scale-105 transition' : ''}`}>
              <img 
                src={currentChurch?.logoUrl?.trim() || "/church_logo.jpg"} 
                alt="Church Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/church_logo.jpg')) {
                    target.src = '/church_logo.jpg';
                  }
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className={`text-sm sm:text-base font-bold tracking-tight text-slate-100 flex items-center gap-1 ${roleConfig.canSwitchChurch ? 'group-hover:text-amber-400 transition' : ''}`}>
                  {currentChurch?.name || 'New Creation Assembly Church'}
                  {roleConfig.canSwitchChurch && (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300" />
                  )}
                </h1>
              </div>
              <p className="text-[11px] text-slate-400">
                {currentChurch?.city ? `${currentChurch.city}${currentChurch.state ? `, ${currentChurch.state}` : ''}` : 'Chennai, Tamil Nadu'}
              </p>
            </div>
          </div>

          {/* Church Switcher Dropdown (SuperAdmin Only) */}
          {showChurchMenu && roleConfig.canSwitchChurch && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowChurchMenu(false)} 
              />
              <div className="absolute top-12 left-0 bg-slate-800 border border-slate-700 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in">
                <div className="px-3 py-2 border-b border-slate-700/80 mb-1">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Church Organization</span>
                    <span className="text-[10px] text-slate-400 font-normal">Multi-Tenant</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Select an organization to switch active congregation.
                  </div>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {(churches || []).map((church) => {
                    const isCurrent = church.id === currentChurch?.id;
                    return (
                      <button
                        key={church.id}
                        onClick={() => {
                          if (onSelectChurch) onSelectChurch(church);
                          setShowChurchMenu(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2.5 transition ${
                          isCurrent
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                            : 'hover:bg-slate-700/60 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <img
                            src={church.logoUrl || '/church_logo.jpg'}
                            alt={church.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0 bg-white border border-slate-600"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/church_logo.jpg';
                            }}
                          />
                          <div className="truncate">
                            <div className="font-semibold truncate">{church.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{church.city}, {church.state}</div>
                          </div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {onNavigateTab && (
                  <div className="mt-2 pt-2 border-t border-slate-700/70">
                    <button
                      onClick={() => {
                        onNavigateTab('saas');
                        setShowChurchMenu(false);
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-[11px] font-medium text-center flex items-center justify-center gap-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      Open Multi-Tenant SaaS Console
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Controls & User Profile Badge */}
        <div className="flex items-center space-x-2 ml-auto">
          {onOpenChurchAi && (
            <button
              id="btn-header-church-ai"
              onClick={onOpenChurchAi}
              className="flex items-center space-x-1.5 font-bold text-xs px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md active:scale-95 transition-all border border-purple-400/30"
              title="Open Central Church AI Interface"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
              <span className="hidden sm:inline">Church AI</span>
            </button>
          )}

          {canAccessAiPastor(currentUser?.role) && onOpenAiPastor && (
            <button
              id="btn-header-ai-pastor"
              onClick={onOpenAiPastor}
              className="flex items-center space-x-1.5 font-bold text-xs px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md active:scale-95 transition-all border border-amber-400/30"
              title="Open AI Pastor Leadership Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span className="hidden sm:inline">AI Pastor</span>
            </button>
          )}

          {onOpenAiMinistry && (
            <button
              id="btn-header-ai-ministry"
              onClick={onOpenAiMinistry}
              className="flex items-center space-x-1.5 font-bold text-xs px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition-all border border-indigo-400/30"
              title="Consult AI Ministry Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
              <span className="hidden sm:inline">AI Ministry</span>
            </button>
          )}




          {/* Top Bell Icon Notification Button */}
          <div className="relative">
            <button
              id="btn-header-notifications"
              onClick={() => setShowNotifDrawer(!showNotifDrawer)}
              className={`relative p-2 rounded-xl border transition active:scale-95 flex items-center justify-center ${
                showNotifDrawer
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-2 ring-amber-400/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="View Church Notifications & Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-md animate-pulse">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notification Modal Popup (Matches Data Management Modal style) */}
            {showNotifDrawer && (
              <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95">
                  {/* Modal Header */}
                  <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                        <BellRing className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-bold truncate">Church Alerts & Notifications</h2>
                        <p className="text-[11px] text-slate-400 truncate">
                          {currentChurch?.name || 'New Creation Assembly Church'} • {unreadNotifsCount} Unread
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowNotifDrawer(false)}
                      className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition shrink-0"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recent Church Broadcasts</span>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab('notifications');
                            setShowNotifDrawer(false);
                          }}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                        >
                          Open Full Center &rarr;
                        </button>
                      )}
                    </div>

                    {churchNotifications.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs italic space-y-2">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-medium">No alerts or broadcast notices right now.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {churchNotifications.slice(0, 10).map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              const isUnread = !isNotificationReadByUser(notif, currentUser);
                              if (isUnread && onMarkNotifRead) onMarkNotifRead(notif.id);
                              if (notif.linkTab && onNavigateTab) {
                                onNavigateTab(notif.linkTab as AppTab);
                                setShowNotifDrawer(false);
                              }
                            }}
                            className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                              isNotificationReadByUser(notif, currentUser)
                                ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                : 'bg-amber-50/70 border-amber-300/80 shadow-xs hover:border-amber-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                notif.category === 'Emergency' ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse' :
                                notif.category === 'Ministry' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                notif.category === 'Activity' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                                notif.category === 'Roster' ? 'bg-amber-100 text-amber-900 border-amber-200' :
                                notif.category === 'Prayer' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                                notif.category === 'Event' ? 'bg-orange-100 text-orange-900 border-orange-200' :
                                'bg-sky-100 text-sky-900 border-sky-200'
                              }`}>
                                {notif.category}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-400">{notif.date}</span>
                                {onDeleteNotif && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteNotif(notif.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                    title="Delete this alert"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">{notif.title}</h4>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{notif.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  {churchNotifications.length > 0 && (
                    <div className="bg-slate-50 p-3.5 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        {onMarkAllNotifsRead && unreadNotifsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onMarkAllNotifsRead();
                            }}
                            className="text-xs text-blue-700 hover:text-blue-800 flex items-center gap-1.5 font-bold transition px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200"
                            title="Mark all as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark All Seen</span>
                          </button>
                        )}

                        {onClearAllNotifs && (
                          <button
                            type="button"
                            onClick={() => {
                              onClearAllNotifs();
                            }}
                            className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1.5 font-bold transition px-2.5 py-1.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200"
                            title="Delete and clear all alerts"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear All</span>
                          </button>
                        )}
                      </div>

                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab('notifications');
                            setShowNotifDrawer(false);
                          }}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
                        >
                          Full Center &rarr;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            id="btn-header-export-data"
            onClick={onOpenExportModal}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            title="Backup, Export CSV/JSON, or Reset Data"
          >
            <Database className="w-4 h-4" />
          </button>

          <button
            id="btn-toggle-viewport-frame"
            onClick={onToggleFrame}
            className={`hidden md:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition ${
              isMobileFrame
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={isMobileFrame ? 'Switch to Full Screen layout' : 'Switch to Mobile Frame view'}
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span>Full</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone</span>
              </>
            )}
          </button>

          {/* Logged in User Profile Pill & Modal Popup */}
          <div className="relative">
            <button
              id="btn-user-profile-menu"
              onClick={() => {
                setIsEditingProfile(false);
                setShowUserMenu(!showUserMenu);
              }}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-1 pl-1.5 pr-2.5 rounded-full transition"
            >
              <UserAvatar
                name={currentUser?.name}
                avatarUrl={currentUser?.avatarUrl}
                size="xs"
                shape="circle"
                border="border border-amber-400/60"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-100 leading-none truncate max-w-[100px]">
                  {currentUser?.name?.split(' ')[0] || 'User'}
                </div>
                <div className="text-[9px] text-amber-400 font-medium leading-none mt-0.5">
                  {roleConfig.label.split('/')[0].split('(')[0].trim()}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* User Profile Modal Popup (Matches Data Management Modal style) */}
            {showUserMenu && (
              <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
                  {/* Modal Header */}
                  <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="relative">
                        <UserAvatar
                          name={currentUser?.name}
                          avatarUrl={editAvatarUrl?.trim() || currentUser?.avatarUrl?.trim()}
                          size="lg"
                          shape="circle"
                          border="border-2 border-amber-400 shadow-md"
                        />
                        {isEditingProfile && (
                          <button
                            type="button"
                            onClick={() => profileFileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-slate-950 rounded-full shadow border border-white hover:bg-amber-400 transition"
                            title="Change Photo"
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base text-white truncate">{currentUser?.name}</h3>
                        <p className="text-xs text-slate-400 font-mono truncate">@{currentUser?.username || 'user'}</p>
                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md font-semibold border truncate max-w-full ${roleConfig.badgeColor}`}>
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setIsEditingProfile(false);
                      }}
                      className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition shrink-0"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Hidden File Input for Avatar Upload */}
                  <input
                    type="file"
                    ref={profileFileInputRef}
                    onChange={handlePhotoFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Modal Body */}
                  <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 flex-1">
                    {/* Success Notice */}
                    {saveSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{saveSuccessMsg}</span>
                      </div>
                    )}

                    {!isEditingProfile ? (
                      /* VIEW MODE */
                      <>
                        {/* Account Details Card */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Full Name:</span>
                            <span className="font-bold text-slate-900">{currentUser?.name}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Phone:</span>
                            <span className="font-bold text-slate-900 font-mono">{currentUser?.phone || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Email:</span>
                            <span className="font-bold text-slate-900 font-mono">{currentUser?.email || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Active Church:</span>
                            <span className="font-bold text-slate-900 truncate max-w-[200px] text-right">{currentChurch?.name}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Role & Access:</span>
                            <span className="font-bold text-amber-700">{roleConfig.label}</span>
                          </div>
                        </div>

                        {/* Edit Profile Action Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditName(currentUser?.name || '');
                            setEditPhone(currentUser?.phone || '');
                            setEditEmail(currentUser?.email || '');
                            setEditAvatarUrl(currentUser?.avatarUrl || '');
                            setEditDesignation(currentUser?.designation || '');
                            setIsEditingProfile(true);
                          }}
                          className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs"
                        >
                          <Edit3 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Edit Profile & Change Photo</span>
                        </button>

                        {/* Action Controls */}
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          {canAccessChurchSettings(currentUser?.role) && onNavigateTab && (
                            <button
                              id="btn-profile-go-settings"
                              onClick={() => {
                                onNavigateTab('settings');
                                setShowUserMenu(false);
                              }}
                              className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
                            >
                              <Settings className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>Church Settings & Module Customizer</span>
                            </button>
                          )}

                          {onNavigateTab && roleConfig.allowedTabs.includes('saas') && (
                            <button
                              id="btn-profile-go-saas"
                              onClick={() => {
                                onNavigateTab('saas');
                                setShowUserMenu(false);
                              }}
                              className="w-full py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
                            >
                              <Shield className="w-4 h-4 text-indigo-700 shrink-0" />
                              <span>Multi-Church SaaS Console & Roles</span>
                            </button>
                          )}

                          <button
                            id="btn-header-logout"
                            onClick={() => {
                              setShowUserMenu(false);
                              if (onLogout) onLogout();
                            }}
                            className="w-full py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
                          >
                            <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Log Out of Account</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      /* EDIT PROFILE & PHOTO FORM */
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        {/* Profile Photo Uploader Card */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-emerald-600" />
                              Profile Photo
                            </span>
                            <span className="text-[10px] text-slate-400">Syncs to Member Directory</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <UserAvatar
                              name={editName || currentUser?.name}
                              avatarUrl={editAvatarUrl}
                              size="xl"
                              shape="rounded"
                              border="border-2 border-emerald-500 shadow-md"
                            />

                            <div className="flex-1 space-y-1.5">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isUploadingPhoto}
                                  onClick={() => profileFileInputRef.current?.click()}
                                  className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                                </button>

                                {editAvatarUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setEditAvatarUrl('')}
                                    className="py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </div>

                              <p className="text-[10px] text-slate-500">Pick photo from device or use automatic initials badge.</p>
                            </div>
                          </div>
                        </div>

                        {/* Full Name */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. Pastor David Raj"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Phone & Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="+91 98401 23456"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="user@church.org"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Designation / Ministry Title */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Designation / Title</label>
                          <input
                            type="text"
                            value={editDesignation}
                            onChange={(e) => setEditDesignation(e.target.value)}
                            placeholder="e.g. Senior Pastor / Admin"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Helper info badge */}
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-900 leading-relaxed">
                          <strong>✓ Auto-Synchronization:</strong> Updating your photo, name, and phone here updates your account and automatically synchronizes with your profile on the <strong>Member Directory & Records page</strong>.
                        </div>

                        {/* Form Buttons */}
                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save & Update Member Profile</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
