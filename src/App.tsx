import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { 
  Member, PrayerRequest, RosterAssignment, AttendanceRecord, ChurchEvent, 
  AppNotification, PastorAnnouncement, 
  ChurchTenant, SaaSUser, AuthSession,
  SundaySchoolClass, SundaySchoolStudent, SundaySchoolAttendanceRecord, WhatsAppReminderTemplate,
  WhatsAppGroup,
  CompleteChurchSettings, ChurchMinistryConfig,
  ChurchMinistry, MinistryMember, MinistryTeam, MinistryTeamMember,
  MinistryActivity, MinistryAnnouncement
} from './types';
import { 
  getStoredMembers, saveStoredMembers, 
  getStoredPrayers, saveStoredPrayers, 
  getStoredRoster, saveStoredRoster,
  getStoredAttendance, saveStoredAttendance,
  getStoredEvents, saveStoredEvents,
  getStoredNotifications, saveStoredNotifications,
  getStoredAnnouncements, saveStoredAnnouncements,
  getStoredChurches, saveStoredChurches,
  getStoredUsers, saveStoredUsers,
  getStoredSundaySchoolClasses, saveStoredSundaySchoolClasses,
  getStoredSundaySchoolStudents, saveStoredSundaySchoolStudents,
  getStoredSundaySchoolAttendance, saveStoredSundaySchoolAttendance,
  getStoredWhatsAppTemplates, saveStoredWhatsAppTemplates,
  getStoredWhatsAppGroups, saveStoredWhatsAppGroups,
  getStoredAuthSession, saveStoredAuthSession, clearStoredAuthSession,
  getAllStoredChurchSettings, getStoredChurchSettings, saveStoredChurchSettings,
  saveAllStoredChurchSettings, resetAllDataToDefault,
  getStoredMinistries, saveStoredMinistries,
  getStoredMinistryMembers, saveStoredMinistryMembers,
  getStoredMinistryTeams, saveStoredMinistryTeams,
  getStoredMinistryTeamMembers, saveStoredMinistryTeamMembers,
  getStoredMinistryActivities, saveStoredMinistryActivities,
  getStoredMinistryAnnouncements, saveStoredMinistryAnnouncements
} from './utils/storage';
import {
  INITIAL_CHURCHES,
  INITIAL_SAAS_USERS,
  INITIAL_SUNDAY_SCHOOL_CLASSES,
  INITIAL_SUNDAY_SCHOOL_STUDENTS,
  INITIAL_WHATSAPP_TEMPLATES,
  INITIAL_WHATSAPP_GROUPS
} from './data/initialData';
import {
  seedFirestoreIfEmpty,
  subscribeMembers,
  subscribePrayers,
  subscribeRoster,
  subscribeAttendance,
  subscribeEvents,
  subscribeAnnouncements,
  subscribeNotifications,
  subscribeChurches,
  saveChurchToFirestore,
  subscribeUsers,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveMemberToFirestore,
  deleteMemberFromFirestore,
  savePrayerToFirestore,
  deletePrayerFromFirestore,
  saveRosterToFirestore,
  deleteRosterFromFirestore,
  saveAttendanceToFirestore,
  deleteAttendanceFromFirestore,
  saveEventToFirestore,
  deleteEventFromFirestore,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  saveNotificationToFirestore,
  deleteNotificationFromFirestore,
  clearAllNotificationsFromFirestore,
  subscribeSundaySchoolClasses,
  saveSundaySchoolClassToFirestore,
  deleteSundaySchoolClassFromFirestore,
  subscribeSundaySchoolStudents,
  saveSundaySchoolStudentToFirestore,
  deleteSundaySchoolStudentFromFirestore,
  subscribeSundaySchoolAttendance,
  saveSundaySchoolAttendanceToFirestore,
  deleteSundaySchoolAttendanceFromFirestore,
  subscribeWhatsAppTemplates,
  saveWhatsAppTemplateToFirestore,
  deleteWhatsAppTemplateFromFirestore,
  subscribeWhatsAppGroups,
  saveWhatsAppGroupToFirestore,
  deleteWhatsAppGroupFromFirestore,
  subscribeChurchSettings,
  saveChurchSettingsToFirestore,
  subscribeMinistries,
  saveMinistryToFirestore,
  deleteMinistryFromFirestore,
  subscribeMinistryMembers,
  saveMinistryMemberToFirestore,
  deleteMinistryMemberFromFirestore,
  subscribeMinistryTeams,
  saveMinistryTeamToFirestore,
  deleteMinistryTeamFromFirestore,
  subscribeMinistryTeamMembers,
  saveMinistryTeamMemberToFirestore,
  deleteMinistryTeamMemberFromFirestore,
  subscribeMinistryActivities,
  saveMinistryActivityToFirestore,
  deleteMinistryActivityFromFirestore,
  subscribeMinistryAnnouncements,
  saveMinistryAnnouncementToFirestore,
  deleteMinistryAnnouncementFromFirestore,
  subscribeVisitors,
  saveVisitorToFirestore,
  deleteVisitorFromFirestore
} from './services/firestoreService';
import { isTabAllowed, getDefaultTabForRole, getRoleConfig } from './utils/rbac';

import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { 
  isNotificationForUser, 
  isNotificationReadByUser, 
  findLinkedMemberForUser, 
  findLinkedUserForMember 
} from './utils/notificationUtils';
import { BottomNav, AppTab } from './components/BottomNav';
import { MemberList } from './components/MemberList';
import { MemberDetailModal } from './components/MemberDetailModal';
import { MemberFormModal } from './components/MemberFormModal';
import { PrayerWall } from './components/PrayerWall';
import { PrayerFormModal } from './components/PrayerFormModal';
import { VolunteerManager } from './components/VolunteerManager';
import { RosterPlanner } from './components/RosterPlanner';
import { AttendanceTracker } from './components/AttendanceTracker';
import { EventCalendar } from './components/EventCalendar';
import { NotificationCenter } from './components/NotificationCenter';
import { PastorAnnouncements } from './components/PastorAnnouncements';
import { ExportImportModal } from './components/ExportImportModal';
import { ImportMembersModal } from './components/ImportMembersModal';
import { MobileFrame } from './components/MobileFrame';
import { SaaSConsole } from './components/SaaSConsole';
import { SundaySchoolManager } from './components/SundaySchoolManager';
import { WhatsAppHub } from './components/WhatsAppHub';
import { ChurchSettingsModule } from './components/settings/ChurchSettingsModule';
import { MinistriesModule } from './components/ministries/MinistriesModule';
import { ChurchDashboard } from './components/dashboard/ChurchDashboard';
import { AiPastorAssistantModal } from './components/ai/AiPastorAssistantModal';
import { AiMinistryAssistantModal } from './components/ai/AiMinistryAssistantModal';
import { ChurchAiModal } from './components/ai/ChurchAiModal';
import { ReportsModule, ReportCategory } from './components/reports/ReportsModule';
import { VisitorsPage } from './pages/people/VisitorsPage';
import { PastoralCareModule } from './components/care/PastoralCareModule';
import { SmallGroupsModule } from './components/groups/SmallGroupsModule';
import { MyMinistryView } from './components/member/MyMinistryView';
import { MyAssignmentsView } from './components/member/MyAssignmentsView';
import { MyAttendanceView } from './components/member/MyAttendanceView';
import { MyProfileModal } from './components/member/MyProfileModal';
import { initMobileNotifications, sendMobilePanelNotification } from './services/mobileNotificationService';
import { authSecurityService } from './services/authSecurityService';
import { auditService } from './services/auditService';
import { applyChurchAccentTheme, applyThemeMode, getStoredThemeMode, getStoredThemePreference, toggleThemeMode, getResolvedTheme, ThemeMode } from './utils/themeUtils';

export default function App() {
  // Authentication & Session Persistence
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [loginScreenMode, setLoginScreenMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [loginResetToken, setLoginResetToken] = useState<string>('');

  // SaaS Tenants & Users
  const [churches, setChurches] = useState<ChurchTenant[]>(() => getStoredChurches());
  const [allUsers, setAllUsers] = useState<SaaSUser[]>(() => getStoredUsers());
  
  // Current active church tenant
  const [currentChurch, setCurrentChurch] = useState<ChurchTenant>(() => {
    const saved = getStoredAuthSession();
    const storedChurches = getStoredChurches();
    if (saved && saved.user) {
      const match = storedChurches.find(c => c.id === (saved.user.church_id || saved.user.churchId));
      if (match) return match;
    }
    return storedChurches[0] || INITIAL_CHURCHES[0];
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const saved = getStoredAuthSession();
    return saved ? getDefaultTabForRole(saved.user.role) : 'directory';
  });
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  // Core Data Tables (All records across the app)
  const [rawMembers, setRawMembers] = useState<Member[]>(() => getStoredMembers());
  const [rawPrayers, setRawPrayers] = useState<PrayerRequest[]>(() => getStoredPrayers());
  const [rawRoster, setRawRoster] = useState<RosterAssignment[]>(() => getStoredRoster());
  const [rawAttendance, setRawAttendance] = useState<AttendanceRecord[]>(() => getStoredAttendance());
  const [rawEvents, setRawEvents] = useState<ChurchEvent[]>(() => getStoredEvents());
  const [rawNotifications, setRawNotifications] = useState<AppNotification[]>(() => getStoredNotifications());
  const [rawAnnouncements, setRawAnnouncements] = useState<PastorAnnouncement[]>(() => getStoredAnnouncements());

  const [rawMinistries, setRawMinistries] = useState<ChurchMinistry[]>(() => getStoredMinistries());
  const [rawMinistryMembers, setRawMinistryMembers] = useState<MinistryMember[]>(() => getStoredMinistryMembers());
  const [rawMinistryTeams, setRawMinistryTeams] = useState<MinistryTeam[]>(() => getStoredMinistryTeams());
  const [rawMinistryTeamMembers, setRawMinistryTeamMembers] = useState<MinistryTeamMember[]>(() => getStoredMinistryTeamMembers());
  const [rawMinistryActivities, setRawMinistryActivities] = useState<MinistryActivity[]>(() => getStoredMinistryActivities());
  const [rawMinistryAnnouncements, setRawMinistryAnnouncements] = useState<MinistryAnnouncement[]>(() => getStoredMinistryAnnouncements());
  const [selectedMinistryNavId, setSelectedMinistryNavId] = useState<string | null>(null);
  const [selectedReportCategoryNav, setSelectedReportCategoryNav] = useState<ReportCategory | undefined>(undefined);

  const [rawSundaySchoolClasses, setRawSundaySchoolClasses] = useState<SundaySchoolClass[]>(() => getStoredSundaySchoolClasses());
  const [rawSundaySchoolStudents, setRawSundaySchoolStudents] = useState<SundaySchoolStudent[]>(() => getStoredSundaySchoolStudents());
  const [rawSundaySchoolAttendance, setRawSundaySchoolAttendance] = useState<SundaySchoolAttendanceRecord[]>(() => getStoredSundaySchoolAttendance());
  const [rawWhatsappTemplates, setRawWhatsappTemplates] = useState<WhatsAppReminderTemplate[]>(() => getStoredWhatsAppTemplates());
  const [rawWhatsappGroups, setRawWhatsappGroups] = useState<WhatsAppGroup[]>(() => getStoredWhatsAppGroups());
  const [allChurchSettings, setAllChurchSettings] = useState<Record<string, CompleteChurchSettings>>(() => getAllStoredChurchSettings());

  // Track already notified notification IDs to avoid duplicates
  const notifiedIdsRef = useRef<Set<string>>(new Set(getStoredNotifications().map(n => n.id)));
  const currentChurchRef = useRef(currentChurch);
  currentChurchRef.current = currentChurch;

  // Modals
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<Member | null>(null);
  const [selectedMemberEdit, setSelectedMemberEdit] = useState<Member | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddPrayerOpen, setIsAddPrayerOpen] = useState(false);
  const [prayerToEdit, setPrayerToEdit] = useState<PrayerRequest | null>(null);
  const [initialPrayerMember, setInitialPrayerMember] = useState<Member | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isAiPastorOpen, setIsAiPastorOpen] = useState(false);
  const [isAiMinistryOpen, setIsAiMinistryOpen] = useState(false);
  const [isChurchAiOpen, setIsChurchAiOpen] = useState(false);

  // Initialize data on mount and subscribe to Firestore live sync
  useEffect(() => {
    // 1. Initial load from local cache for instant UI rendering
    setChurches(getStoredChurches());
    setAllUsers(getStoredUsers());
    setAllChurchSettings(getAllStoredChurchSettings());
    setRawMembers(getStoredMembers());
    setRawMinistries(getStoredMinistries());
    setRawMinistryMembers(getStoredMinistryMembers());
    setRawMinistryTeams(getStoredMinistryTeams());
    setRawMinistryTeamMembers(getStoredMinistryTeamMembers());
    setRawMinistryActivities(getStoredMinistryActivities());
    setRawMinistryAnnouncements(getStoredMinistryAnnouncements());
    setRawPrayers(getStoredPrayers());
    setRawRoster(getStoredRoster());
    setRawAttendance(getStoredAttendance());
    setRawEvents(getStoredEvents());
    setRawNotifications(getStoredNotifications());
    setRawAnnouncements(getStoredAnnouncements());
    setRawSundaySchoolClasses(getStoredSundaySchoolClasses());
    setRawSundaySchoolStudents(getStoredSundaySchoolStudents());
    setRawSundaySchoolAttendance(getStoredSundaySchoolAttendance());
    setRawWhatsappTemplates(getStoredWhatsAppTemplates());
    setRawWhatsappGroups(getStoredWhatsAppGroups());

    // 2. Seed Firestore if database is empty
    seedFirestoreIfEmpty();

    // 3. Subscribe to real-time Firestore updates across devices
    const unsubscribeChurches = subscribeChurches((cloud) => setChurches(cloud));
    const unsubscribeUsers = subscribeUsers((cloud) => setAllUsers(cloud));
    const unsubscribeChurchSettings = subscribeChurchSettings((cloud) => setAllChurchSettings(cloud));
    const unsubscribeMembers = subscribeMembers((cloud) => setRawMembers(cloud));
    const unsubscribeMinistries = subscribeMinistries((cloud) => setRawMinistries(cloud));
    const unsubscribeMinistryMembers = subscribeMinistryMembers((cloud) => setRawMinistryMembers(cloud));
    const unsubscribeMinistryTeams = subscribeMinistryTeams((cloud) => setRawMinistryTeams(cloud));
    const unsubscribeMinistryTeamMembers = subscribeMinistryTeamMembers((cloud) => setRawMinistryTeamMembers(cloud));
    const unsubscribeMinistryActivities = subscribeMinistryActivities((cloud) => setRawMinistryActivities(cloud));
    const unsubscribeMinistryAnnouncements = subscribeMinistryAnnouncements((cloud) => setRawMinistryAnnouncements(cloud));
    const unsubscribePrayers = subscribePrayers((cloud) => setRawPrayers(cloud));
    const unsubscribeRoster = subscribeRoster((cloud) => setRawRoster(cloud));
    const unsubscribeAttendance = subscribeAttendance((cloud) => setRawAttendance(cloud));
    const unsubscribeEvents = subscribeEvents((cloud) => setRawEvents(cloud));
    const unsubscribeAnnouncements = subscribeAnnouncements((cloud) => setRawAnnouncements(cloud));
    const unsubscribeNotifications = subscribeNotifications((cloud) => {
      setRawNotifications(cloud);
      // Real-time alert delivery from other users (suppressing creator's own alerts)
      const currentUserId = authSessionRef.current?.user?.id;
      cloud.forEach((notif) => {
        if (!notifiedIdsRef.current.has(notif.id)) {
          notifiedIdsRef.current.add(notif.id);
          const isReadByMe = currentUserId ? Boolean(notif.readByUserIds?.includes(currentUserId)) : notif.read;
          // If notification is created by another member and not yet read by current user, notify on this device:
          if (!isReadByMe && notif.createdByUserId && notif.createdByUserId !== currentUserId) {
            sendMobilePanelNotification({
              id: notif.id,
              title: notif.title,
              message: notif.message,
              category: notif.category,
              linkTab: notif.linkTab,
              churchName: currentChurchRef.current?.name || 'Church CMS',
              iconUrl: currentChurchRef.current?.logoUrl?.trim() || '/church_logo.jpg',
            });
          }
        }
      });
    });
    const unsubscribeSSClasses = subscribeSundaySchoolClasses((cloud) => setRawSundaySchoolClasses(cloud));
    const unsubscribeSSStudents = subscribeSundaySchoolStudents((cloud) => setRawSundaySchoolStudents(cloud));
    const unsubscribeSSAttendance = subscribeSundaySchoolAttendance((cloud) => setRawSundaySchoolAttendance(cloud));
    const unsubscribeWATemplates = subscribeWhatsAppTemplates((cloud) => setRawWhatsappTemplates(cloud));
    const unsubscribeWAGroups = subscribeWhatsAppGroups((cloud) => setRawWhatsappGroups(cloud));
    const unsubscribeVisitors = subscribeVisitors(() => {});

    return () => {
      unsubscribeChurches();
      unsubscribeUsers();
      unsubscribeChurchSettings();
      unsubscribeMembers();
      unsubscribeMinistries();
      unsubscribeMinistryMembers();
      unsubscribeMinistryTeams();
      unsubscribeMinistryTeamMembers();
      unsubscribeMinistryActivities();
      unsubscribeMinistryAnnouncements();
      unsubscribePrayers();
      unsubscribeRoster();
      unsubscribeAttendance();
      unsubscribeEvents();
      unsubscribeAnnouncements();
      unsubscribeNotifications();
      unsubscribeSSClasses();
      unsubscribeSSStudents();
      unsubscribeSSAttendance();
      unsubscribeWATemplates();
      unsubscribeWAGroups();
      unsubscribeVisitors();
    };
  }, []);

  // Initialize Mobile Notification Channels, Deep Links, and Session Security
  useEffect(() => {
    initMobileNotifications((targetTab) => {
      handleNavigateTab(targetTab as AppTab);
    });

    // Check and refresh active authentication session
    authSecurityService.checkAndRefreshSession().then((res) => {
      if (res.expired) {
        setAuthSession(null);
      } else if (res.session) {
        setAuthSession(res.session);
      }
    });

    // Listen to Android Deep Links / App Links
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', (event) => {
        const url = event.url;
        if (url && (url.includes('token=') || url.includes('reset-password'))) {
          const match = url.match(/token=([^&]+)/);
          if (match && match[1]) {
            setLoginResetToken(match[1]);
            setLoginScreenMode('reset');
            setAuthSession(null);
          }
        }
      }).catch(console.warn);
    }
  }, []);

  // Track references for back button listener
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const tabHistoryRef = useRef<AppTab[]>([getDefaultTabForRole(authSession?.user?.role)]);

  const selectedMemberDetailRef = useRef(selectedMemberDetail);
  selectedMemberDetailRef.current = selectedMemberDetail;

  const selectedMemberEditRef = useRef(selectedMemberEdit);
  selectedMemberEditRef.current = selectedMemberEdit;

  const isAddMemberOpenRef = useRef(isAddMemberOpen);
  isAddMemberOpenRef.current = isAddMemberOpen;

  const isAddPrayerOpenRef = useRef(isAddPrayerOpen);
  isAddPrayerOpenRef.current = isAddPrayerOpen;

  const isExportModalOpenRef = useRef(isExportModalOpen);
  isExportModalOpenRef.current = isExportModalOpen;

  const authSessionRef = useRef(authSession);
  authSessionRef.current = authSession;

  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressTimeRef = useRef<number>(0);

  // Tab navigation wrapper that maintains navigation history
  const handleNavigateTab = (tab: AppTab) => {
    if (tab !== activeTab) {
      tabHistoryRef.current.push(tab);
      setActiveTab(tab);
    }
  };

  // Hardware Back Button listener on Android devices
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListener = CapApp.addListener('backButton', () => {
      // 1. If not logged in on login screen, minimize/exit
      if (!authSessionRef.current) {
        CapApp.exitApp();
        return;
      }

      // 2. If Member detail modal is open -> close it
      if (selectedMemberDetailRef.current) {
        setSelectedMemberDetail(null);
        return;
      }

      // 3. If Add/Edit Member modal is open -> close it
      if (isAddMemberOpenRef.current || selectedMemberEditRef.current) {
        setIsAddMemberOpen(false);
        setSelectedMemberEdit(null);
        return;
      }

      // 4. If Add Prayer modal is open -> close it
      if (isAddPrayerOpenRef.current) {
        setIsAddPrayerOpen(false);
        setPrayerToEdit(null);
        setInitialPrayerMember(null);
        return;
      }

      // 5. If Export/Import modal is open -> close it
      if (isExportModalOpenRef.current) {
        setIsExportModalOpen(false);
        return;
      }

      // 6. Check DOM for any open popup/modal or dropdown
      const openDialog = document.querySelector('[role="dialog"], .modal-overlay, [data-modal="open"]');
      if (openDialog) {
        const closeBtn = openDialog.querySelector('button[aria-label="Close"], button:has(.lucide-x), .btn-close') as HTMLButtonElement;
        if (closeBtn) {
          closeBtn.click();
          return;
        }
      }

      // 7. Check tab navigation history: if on a subtab, go back to previous tab
      const defaultTab = getDefaultTabForRole(authSessionRef.current?.user?.role);
      if (tabHistoryRef.current.length > 1) {
        tabHistoryRef.current.pop(); // Pop current tab
        const prevTab = tabHistoryRef.current[tabHistoryRef.current.length - 1] || defaultTab;
        setActiveTab(prevTab);
        return;
      } else if (activeTabRef.current !== defaultTab) {
        tabHistoryRef.current = [defaultTab];
        setActiveTab(defaultTab);
        return;
      }

      // 8. On home/default tab with no modals open -> Require double-tap back within 2s to exit
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPressTimeRef.current = now;
        setShowExitToast(true);
        setTimeout(() => setShowExitToast(false), 2000);
      }
    });

    return () => {
      backListener.then((handler) => handler.remove());
    };
  }, []);

  // When auth session changes or is initialized, ensure tab is permitted
  useEffect(() => {
    if (authSession?.user) {
      if (!isTabAllowed(authSession.user.role, activeTab)) {
        const defaultTab = getDefaultTabForRole(authSession.user.role);
        tabHistoryRef.current = [defaultTab];
        setActiveTab(defaultTab);
      }
    }
  }, [authSession?.user, activeTab]);

  // Login handler: keeps session active until user explicitly logs out
  const handleLoginSuccess = (session: AuthSession) => {
    setAuthSession(session);
    saveStoredAuthSession(session);

    // Auto-select user's affiliated church if present
    const targetChurchId = session.user.church_id || session.user.churchId;
    const churchMatch = churches.find(c => c.id === targetChurchId);
    if (churchMatch) {
      setCurrentChurch(churchMatch);
    }
    const defaultTab = getDefaultTabForRole(session.user.role);
    tabHistoryRef.current = [defaultTab];
    setActiveTab(defaultTab);
  };

  // Logout handler: clears session from local storage, performs security cleanup and returns to login screen
  const handleLogout = async () => {
    await authSecurityService.performLogout(authSession?.user, currentChurch.id);
    setAuthSession(null);
    setLoginScreenMode('login');
    setLoginResetToken('');
  };

  // Switch church tenant
  const handleSelectChurch = (church: ChurchTenant) => {
    setCurrentChurch(church);
  };

  // Switch simulated or active user (for SaaS / testing / multi-user)
  const handleSwitchUser = (user: SaaSUser) => {
    const newSession: AuthSession = {
      user,
      token: 'token-' + Date.now(),
      loginTimestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    setAuthSession(newSession);
    saveStoredAuthSession(newSession);

    const userChurch = churches.find(c => c.id === (user.church_id || user.churchId));
    if (userChurch) {
      setCurrentChurch(userChurch);
    }
    setActiveTab(getDefaultTabForRole(user.role));
  };

  const handleAddUser = (newUser: SaaSUser) => {
    setAllUsers(prev => [...prev, newUser]);
  };

  // -------------------------------------------------------------
  // MULTI-TENANCY FILTERING: Each table strictly filters by currentChurch.id
  // -------------------------------------------------------------
  const activeChurchId = currentChurch.id;

  const members = useMemo(() => {
    return rawMembers
      .filter(m => (m.church_id === activeChurchId || m.churchId === activeChurchId || (!m.church_id && !m.churchId && activeChurchId === 'church-1')))
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
  }, [rawMembers, activeChurchId]);

  const prayers = useMemo(() => {
    return rawPrayers.filter(p => (p.church_id === activeChurchId || p.churchId === activeChurchId || (!p.church_id && !p.churchId && activeChurchId === 'church-1')));
  }, [rawPrayers, activeChurchId]);

  const roster = useMemo(() => {
    return rawRoster.filter(r => (r.church_id === activeChurchId || r.churchId === activeChurchId || (!r.church_id && !r.churchId && activeChurchId === 'church-1')));
  }, [rawRoster, activeChurchId]);

  const attendance = useMemo(() => {
    return rawAttendance.filter(a => (a.church_id === activeChurchId || a.churchId === activeChurchId || (!a.church_id && !a.churchId && activeChurchId === 'church-1')));
  }, [rawAttendance, activeChurchId]);

  const events = useMemo(() => {
    return rawEvents.filter(e => (e.church_id === activeChurchId || e.churchId === activeChurchId || (!e.church_id && !e.churchId && activeChurchId === 'church-1')));
  }, [rawEvents, activeChurchId]);

  const churchUsers = useMemo(() => {
    return allUsers.filter(
      (u) =>
        u.church_id === activeChurchId ||
        u.churchId === activeChurchId ||
        (!u.church_id && !u.churchId && activeChurchId === 'church-1')
    );
  }, [allUsers, activeChurchId]);

  const notifications = useMemo(() => {
    const currentUserId = authSession?.user?.id;
    return rawNotifications
      .filter(n => (n.church_id === activeChurchId || n.churchId === activeChurchId || (!n.church_id && !n.churchId && activeChurchId === 'church-1')))
      .filter(n => {
        // Once ALL users in the active church have seen the notification, it is hidden from notifications list
        if (churchUsers.length > 0) {
          const readList = n.readByUserIds || (n.read ? churchUsers.map(u => u.id) : []);
          const allSeen = churchUsers.every(u => readList.includes(u.id));
          if (allSeen) return false;
        }
        return true;
      })
      .map(n => {
        const isReadForMe = Boolean(currentUserId && n.readByUserIds?.includes(currentUserId));
        return {
          ...n,
          read: isReadForMe,
        };
      });
  }, [rawNotifications, activeChurchId, churchUsers, authSession?.user?.id]);

  const announcements = useMemo(() => {
    return rawAnnouncements.filter(a => (a.church_id === activeChurchId || a.churchId === activeChurchId || (!a.church_id && !a.churchId && activeChurchId === 'church-1')));
  }, [rawAnnouncements, activeChurchId]);

  const sundaySchoolClasses = useMemo(() => {
    return rawSundaySchoolClasses.filter(c => (c.church_id === activeChurchId || c.churchId === activeChurchId || (!c.church_id && !c.churchId && activeChurchId === 'church-1')));
  }, [rawSundaySchoolClasses, activeChurchId]);

  const sundaySchoolStudents = useMemo(() => {
    return rawSundaySchoolStudents.filter(s => (s.church_id === activeChurchId || s.churchId === activeChurchId || (!s.church_id && !s.churchId && activeChurchId === 'church-1')));
  }, [rawSundaySchoolStudents, activeChurchId]);

  const sundaySchoolAttendance = useMemo(() => {
    return rawSundaySchoolAttendance.filter(a => (a.church_id === activeChurchId || a.churchId === activeChurchId || (!a.church_id && !a.churchId && activeChurchId === 'church-1')));
  }, [rawSundaySchoolAttendance, activeChurchId]);

  const whatsappTemplates = useMemo(() => {
    return rawWhatsappTemplates.filter(w => (w.church_id === activeChurchId || w.churchId === activeChurchId || (!w.church_id && !w.churchId && activeChurchId === 'church-1')));
  }, [rawWhatsappTemplates, activeChurchId]);

  const whatsappGroups = useMemo(() => {
    return rawWhatsappGroups.filter(w => (w.church_id === activeChurchId || w.churchId === activeChurchId || (!w.church_id && !w.churchId && activeChurchId === 'church-1')));
  }, [rawWhatsappGroups, activeChurchId]);

  // -------------------------------------------------------------
  // REUSABLE MINISTRIES MODULE DATA SCOPED TO ACTIVE CHURCH
  // -------------------------------------------------------------
  const ministries = useMemo(() => {
    return rawMinistries
      .filter(m => (m.church_id === activeChurchId || m.churchId === activeChurchId || (!m.church_id && !m.churchId && activeChurchId === 'church-1')))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [rawMinistries, activeChurchId]);

  const ministryMembers = useMemo(() => {
    return rawMinistryMembers.filter(mm => (mm.church_id === activeChurchId || mm.churchId === activeChurchId || (!mm.church_id && !mm.churchId && activeChurchId === 'church-1')));
  }, [rawMinistryMembers, activeChurchId]);

  const ministryTeams = useMemo(() => {
    return rawMinistryTeams.filter(mt => (mt.church_id === activeChurchId || mt.churchId === activeChurchId || (!mt.church_id && !mt.churchId && activeChurchId === 'church-1')));
  }, [rawMinistryTeams, activeChurchId]);

  const ministryTeamMembers = useMemo(() => {
    return rawMinistryTeamMembers.filter(mtm => (mtm.church_id === activeChurchId || mtm.churchId === activeChurchId || (!mtm.church_id && !mtm.churchId && activeChurchId === 'church-1')));
  }, [rawMinistryTeamMembers, activeChurchId]);

  const ministryActivities = useMemo(() => {
    return rawMinistryActivities
      .filter(ma => (ma.church_id === activeChurchId || ma.churchId === activeChurchId || (!ma.church_id && !ma.churchId && activeChurchId === 'church-1')))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rawMinistryActivities, activeChurchId]);

  const ministryAnnouncements = useMemo(() => {
    return rawMinistryAnnouncements
      .filter(ma => (ma.church_id === activeChurchId || ma.churchId === activeChurchId || (!ma.church_id && !ma.churchId && activeChurchId === 'church-1')))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawMinistryAnnouncements, activeChurchId]);

  // Active Church Settings scoped strictly by activeChurchId
  const activeChurchSettings = useMemo(() => {
    return allChurchSettings[activeChurchId] || getStoredChurchSettings(activeChurchId);
  }, [allChurchSettings, activeChurchId]);

  // Apply Church Accent Color dynamically to root theme
  useEffect(() => {
    const accentColor = activeChurchSettings?.appearance?.accentColor || '#f59e0b';
    applyChurchAccentTheme(accentColor);
  }, [activeChurchSettings?.appearance?.accentColor]);

  // Theme Mode (Light / Dark / System) State
  // Priority: User's explicitly saved device choice in localStorage always takes precedence.
  // If no preference was ever saved on this device, fall back to church appearance setting or 'dark'.
  const [currentThemeMode, setCurrentThemeMode] = useState<ThemeMode>(() => {
    return getStoredThemePreference() || activeChurchSettings?.appearance?.themeMode || 'dark';
  });

  useEffect(() => {
    // When church settings change or component mounts:
    // If the device has an explicit preference in localStorage, respect it.
    // If not, adopt the church's appearance setting.
    const explicitDevicePref = getStoredThemePreference();
    const mode = explicitDevicePref || activeChurchSettings?.appearance?.themeMode || 'dark';
    setCurrentThemeMode(mode);
    applyThemeMode(mode);
  }, [activeChurchSettings?.appearance?.themeMode]);

  const handleToggleThemeMode = () => {
    const next = toggleThemeMode();
    setCurrentThemeMode(next);
    // Also sync to activeChurchSettings and localStorage so both stay consistent
    if (activeChurchSettings) {
      const updatedSettings: CompleteChurchSettings = {
        ...activeChurchSettings,
        appearance: {
          ...activeChurchSettings.appearance,
          themeMode: next,
        },
      };
      const nextMap = { ...allChurchSettings, [activeChurchId]: updatedSettings };
      setAllChurchSettings(nextMap);
      saveStoredChurchSettings(activeChurchId, updatedSettings);
    }
  };

  const isDarkMode = getResolvedTheme(currentThemeMode) === 'dark';

  const activeModuleToggles = activeChurchSettings?.preferences?.moduleToggles;

  // -------------------------------------------------------------
  const handleSaveMinistry = async (min: ChurchMinistry) => {
    const stamped: ChurchMinistry = {
      ...min,
      church_id: activeChurchId,
      churchId: activeChurchId,
      updatedAt: new Date().toISOString(),
    };
    const next = rawMinistries.some(m => m.id === stamped.id)
      ? rawMinistries.map(m => m.id === stamped.id ? stamped : m)
      : [...rawMinistries, stamped];
    setRawMinistries(next);
    saveStoredMinistries(next);
    await saveMinistryToFirestore(stamped).catch(console.warn);

    // Synchronize to activeChurchSettings.ministries
    const currentSettings = allChurchSettings[activeChurchId] || getStoredChurchSettings(activeChurchId);
    if (currentSettings) {
      const currentConfigs = currentSettings.ministries || [];
      const configIdx = currentConfigs.findIndex(
        (c) => c.id === stamped.id || c.name.toLowerCase() === stamped.name.toLowerCase()
      );
      const updatedConfig: ChurchMinistryConfig = {
        id: stamped.id,
        name: stamped.name,
        description: stamped.description,
        leaderName: stamped.leaderName,
        leaderMemberId: stamped.leaderMemberId,
        leaderPhone: stamped.contactPhone,
        leaderEmail: stamped.contactEmail,
        color: stamped.color,
        icon: stamped.icon,
        isActive: stamped.status === 'Active',
        meetingSchedule: stamped.meetingTime || stamped.meetingDay || '',
        requiredSkills: stamped.requiredSkills || [],
        order: stamped.order || currentConfigs.length + 1,
      };

      const nextConfigs = configIdx >= 0
        ? currentConfigs.map((c, i) => (i === configIdx ? updatedConfig : c))
        : [...currentConfigs, updatedConfig];

      const updatedSettings: CompleteChurchSettings = {
        ...currentSettings,
        ministries: nextConfigs,
        updatedAt: new Date().toISOString(),
      };

      const nextMap = { ...allChurchSettings, [activeChurchId]: updatedSettings };
      setAllChurchSettings(nextMap);
      saveStoredChurchSettings(activeChurchId, updatedSettings);
      saveChurchSettingsToFirestore(updatedSettings).catch(console.warn);
    }
  };

  const handleDeleteMinistry = async (id: string) => {
    const targetMin = rawMinistries.find(m => m.id === id);
    const next = rawMinistries.filter(m => m.id !== id);
    setRawMinistries(next);
    saveStoredMinistries(next);
    await deleteMinistryFromFirestore(id).catch(console.warn);

    // Synchronize deletion to activeChurchSettings.ministries
    const currentSettings = allChurchSettings[activeChurchId] || getStoredChurchSettings(activeChurchId);
    if (currentSettings && currentSettings.ministries) {
      const nextConfigs = currentSettings.ministries.filter(
        c => c.id !== id && (!targetMin || c.name.toLowerCase() !== targetMin.name.toLowerCase())
      );
      const updatedSettings: CompleteChurchSettings = {
        ...currentSettings,
        ministries: nextConfigs,
        updatedAt: new Date().toISOString(),
      };
      const nextMap = { ...allChurchSettings, [activeChurchId]: updatedSettings };
      setAllChurchSettings(nextMap);
      saveStoredChurchSettings(activeChurchId, updatedSettings);
      saveChurchSettingsToFirestore(updatedSettings).catch(console.warn);
    }
  };

  const handleSaveMinistryMember = async (mm: MinistryMember) => {
    const isNew = !rawMinistryMembers.some(m => m.id === mm.id || (m.memberId === mm.memberId && m.ministryId === mm.ministryId));
    const stamped: MinistryMember = {
      ...mm,
      church_id: activeChurchId,
      churchId: activeChurchId,
      updatedAt: new Date().toISOString(),
    };
    const next = rawMinistryMembers.some(m => m.id === stamped.id)
      ? rawMinistryMembers.map(m => m.id === stamped.id ? stamped : m)
      : [...rawMinistryMembers, stamped];
    setRawMinistryMembers(next);
    saveStoredMinistryMembers(next);
    await saveMinistryMemberToFirestore(stamped).catch(console.warn);

    // Keep member.ministryTeams synced for seamless backward compatibility
    const targetMin = rawMinistries.find(m => m.id === stamped.ministryId);
    const targetMember = rawMembers.find(m => m.id === stamped.memberId);
    if (targetMin && targetMember) {
      if (!targetMember.ministryTeams?.includes(targetMin.name as any)) {
        const updatedMember: Member = {
          ...targetMember,
          ministryTeams: [...(targetMember.ministryTeams || []), targetMin.name as any]
        };
        const nextMembers = rawMembers.map(m => m.id === targetMember.id ? updatedMember : m);
        setRawMembers(nextMembers);
        saveStoredMembers(nextMembers);
        saveMemberToFirestore(updatedMember).catch(console.warn);
      }
    }

    // DISPATCH TARGETED MINISTRY ALERT: Shown ONLY to the added member until seen
    if (isNew) {
      const minName = targetMin?.name || 'Ministry';
      const targetUser = findLinkedUserForMember(stamped.memberId, allUsers, rawMembers);

      const addMemberAlert: AppNotification = {
        id: `notif-min-member-${Date.now()}-${stamped.memberId}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: `🤝 Welcome to ${minName}!`,
        message: `You have been added to the "${minName}" team as "${stamped.ministryRole || stamped.role || 'Team Member'}". Welcome to the ministry team!`,
        category: 'Ministry',
        date: new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        targetUserIds: targetUser ? [targetUser.id] : [],
        targetMemberIds: [stamped.memberId],
        linkTab: 'ministries',
        createdByUserId: currentUser?.id,
        authorName: currentUser?.name || 'Ministry Leader',
        metadata: {
          ministryId: stamped.ministryId,
          ministryName: minName,
          memberId: stamped.memberId,
          memberName: targetMember ? `${targetMember.firstName} ${targetMember.lastName}` : undefined,
          actionType: 'member_added',
        }
      };

      const nextNotifs = [addMemberAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(addMemberAlert).catch(console.warn);
    }
  };

  const handleDeleteMinistryMember = async (id: string) => {
    const next = rawMinistryMembers.filter(m => m.id !== id);
    setRawMinistryMembers(next);
    saveStoredMinistryMembers(next);
    await deleteMinistryMemberFromFirestore(id).catch(console.warn);
  };

  const handleSaveMinistryTeam = async (team: MinistryTeam) => {
    const stamped: MinistryTeam = {
      ...team,
      church_id: activeChurchId,
      churchId: activeChurchId,
      updatedAt: new Date().toISOString(),
    };
    const next = rawMinistryTeams.some(t => t.id === stamped.id)
      ? rawMinistryTeams.map(t => t.id === stamped.id ? stamped : t)
      : [...rawMinistryTeams, stamped];
    setRawMinistryTeams(next);
    saveStoredMinistryTeams(next);
    await saveMinistryTeamToFirestore(stamped).catch(console.warn);
  };

  const handleDeleteMinistryTeam = async (id: string) => {
    const next = rawMinistryTeams.filter(t => t.id !== id);
    setRawMinistryTeams(next);
    saveStoredMinistryTeams(next);
    await deleteMinistryTeamFromFirestore(id).catch(console.warn);
  };

  const handleSaveMinistryTeamMember = async (mtm: MinistryTeamMember) => {
    const isNew = !rawMinistryTeamMembers.some(t => t.id === mtm.id || (t.memberId === mtm.memberId && t.teamId === mtm.teamId));
    const stamped: MinistryTeamMember = {
      ...mtm,
      church_id: activeChurchId,
      churchId: activeChurchId,
    };
    const next = rawMinistryTeamMembers.some(t => t.id === stamped.id)
      ? rawMinistryTeamMembers.map(t => t.id === stamped.id ? stamped : t)
      : [...rawMinistryTeamMembers, stamped];
    setRawMinistryTeamMembers(next);
    saveStoredMinistryTeamMembers(next);
    await saveMinistryTeamMemberToFirestore(stamped).catch(console.warn);

    // DISPATCH TARGETED TEAM ALERT: Shown ONLY to the added member until seen
    if (isNew) {
      const targetTeam = rawMinistryTeams.find(t => t.id === stamped.teamId);
      const targetMin = rawMinistries.find(m => m.id === stamped.ministryId);
      const targetMember = rawMembers.find(m => m.id === stamped.memberId);
      const teamName = targetTeam?.name || 'Ministry Team';
      const minName = targetMin?.name || 'Ministry';
      const targetUser = findLinkedUserForMember(stamped.memberId, allUsers, rawMembers);

      const addTeamMemberAlert: AppNotification = {
        id: `notif-team-member-${Date.now()}-${stamped.memberId}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: `👥 Added to ${teamName} (${minName})`,
        message: `You have been added to the "${teamName}" team in ${minName} as "${stamped.role || 'Team Member'}".`,
        category: 'Ministry',
        date: new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        targetUserIds: targetUser ? [targetUser.id] : [],
        targetMemberIds: [stamped.memberId],
        linkTab: 'ministries',
        createdByUserId: currentUser?.id,
        authorName: currentUser?.name || 'Ministry Leader',
        metadata: {
          ministryId: stamped.ministryId,
          ministryName: minName,
          teamId: stamped.teamId,
          teamName,
          memberId: stamped.memberId,
          memberName: targetMember ? `${targetMember.firstName} ${targetMember.lastName}` : undefined,
          actionType: 'member_added',
        }
      };

      const nextNotifs = [addTeamMemberAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(addTeamMemberAlert).catch(console.warn);
    }
  };

  const handleDeleteMinistryTeamMember = async (id: string) => {
    const next = rawMinistryTeamMembers.filter(t => t.id !== id);
    setRawMinistryTeamMembers(next);
    saveStoredMinistryTeamMembers(next);
    await deleteMinistryTeamMemberFromFirestore(id).catch(console.warn);
  };

  const handleSaveMinistryActivity = async (act: MinistryActivity) => {
    const isNew = !rawMinistryActivities.some(a => a.id === act.id);
    const creatorUserId = act.createdByUserId || currentUser?.id;
    const stamped: MinistryActivity = {
      ...act,
      church_id: activeChurchId,
      churchId: activeChurchId,
      createdByUserId: creatorUserId,
    };
    const next = isNew
      ? [...rawMinistryActivities, stamped]
      : rawMinistryActivities.map(a => a.id === stamped.id ? stamped : a);
    setRawMinistryActivities(next);
    saveStoredMinistryActivities(next);
    await saveMinistryActivityToFirestore(stamped).catch(console.warn);

    // DISPATCH ACTIVITY ALERT: Notify all team/ministry members EXCEPT the activity creator user
    if (isNew && stamped.status !== 'Cancelled') {
      const targetMin = rawMinistries.find(m => m.id === stamped.ministryId);
      const targetTeam = rawMinistryTeams.find(t => t.id === stamped.teamId);
      const minName = targetMin?.name || 'Ministry';
      const teamName = targetTeam?.name;

      // Collect member IDs in this ministry and team
      const minMemberIds = rawMinistryMembers.filter(mm => mm.ministryId === stamped.ministryId).map(mm => mm.memberId);
      const teamMemberIds = stamped.teamId
        ? rawMinistryTeamMembers.filter(tm => tm.teamId === stamped.teamId).map(tm => tm.memberId)
        : [];
      const targetMemberIds = Array.from(new Set([...minMemberIds, ...teamMemberIds]));

      // Collect user IDs for these members
      const targetUserIds = targetMemberIds
        .map(mid => findLinkedUserForMember(mid, allUsers, rawMembers)?.id)
        .filter((uid): uid is string => Boolean(uid));

      // Exclude creator
      const currentMember = findLinkedMemberForUser(currentUser, rawMembers);

      const activityAlert: AppNotification = {
        id: `notif-min-act-${Date.now()}-${stamped.id}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: `📅 ${teamName ? `${teamName} (${minName})` : minName}: ${stamped.name} Scheduled`,
        message: `New activity "${stamped.name}" scheduled for ${stamped.date} at ${stamped.startTime} (${stamped.location || 'Church'}). Leader: ${stamped.leaderName || 'Ministry Leader'}.`,
        category: 'Activity',
        date: stamped.date || new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        targetUserIds: targetUserIds.length > 0 ? targetUserIds : undefined,
        targetMemberIds: targetMemberIds.length > 0 ? targetMemberIds : undefined,
        excludeUserIds: creatorUserId ? [creatorUserId] : [],
        excludeMemberIds: currentMember ? [currentMember.id] : [],
        linkTab: 'ministries',
        createdByUserId: creatorUserId,
        authorName: currentUser?.name || stamped.leaderName || 'Ministry Leader',
        metadata: {
          ministryId: stamped.ministryId,
          ministryName: minName,
          teamId: stamped.teamId,
          teamName,
          activityId: stamped.id,
          activityName: stamped.name,
          actionType: 'activity_scheduled',
        }
      };

      const nextNotifs = [activityAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(activityAlert).catch(console.warn);
    }
  };

  const handleDeleteMinistryActivity = async (id: string) => {
    const next = rawMinistryActivities.filter(a => a.id !== id);
    setRawMinistryActivities(next);
    saveStoredMinistryActivities(next);
    await deleteMinistryActivityFromFirestore(id).catch(console.warn);
  };

  const handleSaveMinistryAnnouncement = async (ann: MinistryAnnouncement) => {
    const isNew = !rawMinistryAnnouncements.some(a => a.id === ann.id);
    const stamped: MinistryAnnouncement = {
      ...ann,
      church_id: activeChurchId,
      churchId: activeChurchId,
    };
    const next = isNew
      ? [stamped, ...rawMinistryAnnouncements]
      : rawMinistryAnnouncements.map(a => a.id === stamped.id ? stamped : a);
    setRawMinistryAnnouncements(next);
    saveStoredMinistryAnnouncements(next);
    await saveMinistryAnnouncementToFirestore(stamped).catch(console.warn);

    // Notify users in Alerts
    if (isNew) {
      const minName = rawMinistries.find(m => m.id === stamped.ministryId)?.name || 'Ministry';
      const ministryAlert: AppNotification = {
        id: `notif-min-ann-${Date.now()}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: `📢 ${minName} Announcement: ${stamped.title}`,
        message: `${stamped.authorName || 'Ministry Leader'}: "${stamped.message.slice(0, 120)}${stamped.message.length > 120 ? '...' : ''}"`,
        category: 'Announcement',
        date: stamped.date || new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        linkTab: 'ministries',
        createdByUserId: currentUser?.id,
        authorName: stamped.authorName || currentUser?.name,
      };

      const nextNotifs = [ministryAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(ministryAlert).catch(console.warn);
      // Stored in Firestore so other users receive it; creator is not self-notified.
    }
  };

  const handleDeleteMinistryAnnouncement = async (id: string) => {
    const next = rawMinistryAnnouncements.filter(a => a.id !== id);
    setRawMinistryAnnouncements(next);
    saveStoredMinistryAnnouncements(next);
    await deleteMinistryAnnouncementFromFirestore(id).catch(console.warn);
  };

  const handleNavigateToMinistry = (ministryNameOrId: string) => {
    const match = rawMinistries.find(
      (m) => ((m.church_id || m.churchId) === activeChurchId) && (m.id === ministryNameOrId || m.name.toLowerCase() === ministryNameOrId.toLowerCase() || m.name.toLowerCase().includes(ministryNameOrId.toLowerCase()) || ministryNameOrId.toLowerCase().includes(m.name.toLowerCase()))
    );
    if (match) {
      setSelectedMinistryNavId(match.id);
    }
    handleNavigateTab('ministries');
  };
  const handleSaveChurchSettings = async (updatedSettings: CompleteChurchSettings) => {
    const stampedSettings: CompleteChurchSettings = {
      ...updatedSettings,
      church_id: activeChurchId,
      updatedAt: new Date().toISOString(),
    };

    // Update in-memory state and localStorage
    const nextMap = { ...allChurchSettings, [activeChurchId]: stampedSettings };
    setAllChurchSettings(nextMap);
    saveStoredChurchSettings(activeChurchId, stampedSettings);

    // Save to Firestore
    await saveChurchSettingsToFirestore(stampedSettings).catch(console.warn);

    // Synchronize Ministries with rawMinistries (Deletions, Updates, Additions)
    if (stampedSettings.ministries && Array.isArray(stampedSettings.ministries)) {
      let ministriesUpdated = false;
      const currentTenantMinistries = rawMinistries.filter(
        (m) => (m.church_id || m.churchId) === activeChurchId || (!m.church_id && !m.churchId && activeChurchId === 'church-1')
      );
      const otherTenantMinistries = rawMinistries.filter(
        (m) => (m.church_id || m.churchId) !== activeChurchId && !(!m.church_id && !m.churchId && activeChurchId === 'church-1')
      );

      // 1. Permanently delete ministries that were removed from Church Settings
      const keptTenantMinistries: ChurchMinistry[] = [];
      for (const oldMin of currentTenantMinistries) {
        const isKept = stampedSettings.ministries.some(
          (cfg) => cfg.id === oldMin.id || cfg.name.toLowerCase().trim() === oldMin.name.toLowerCase().trim()
        );
        if (isKept) {
          keptTenantMinistries.push(oldMin);
        } else {
          deleteMinistryFromFirestore(oldMin.id).catch(console.warn);
          ministriesUpdated = true;
        }
      }

      // 2. Update existing kept ministries or Add newly configured ones
      const nextTenantMinistries: ChurchMinistry[] = [...keptTenantMinistries];

      stampedSettings.ministries.forEach((cfg) => {
        const existingIdx = nextTenantMinistries.findIndex(
          (m) => m.id === cfg.id || m.name.toLowerCase().trim() === cfg.name.toLowerCase().trim()
        );

        if (existingIdx >= 0) {
          const oldMin = nextTenantMinistries[existingIdx];
          const updatedMin: ChurchMinistry = {
            ...oldMin,
            name: cfg.name,
            description: cfg.description || oldMin.description,
            leaderName: cfg.leaderName || oldMin.leaderName,
            leaderMemberId: cfg.leaderMemberId !== undefined ? cfg.leaderMemberId : oldMin.leaderMemberId,
            contactPhone: cfg.leaderPhone || oldMin.contactPhone,
            contactEmail: cfg.leaderEmail || oldMin.contactEmail,
            color: cfg.color || oldMin.color,
            icon: cfg.icon || oldMin.icon,
            status: cfg.isActive ? 'Active' : 'Inactive',
            meetingTime: cfg.meetingSchedule || oldMin.meetingTime,
            requiredSkills: cfg.requiredSkills || oldMin.requiredSkills,
            order: cfg.order || oldMin.order,
            updatedAt: new Date().toISOString(),
          };
          nextTenantMinistries[existingIdx] = updatedMin;
          saveMinistryToFirestore(updatedMin).catch(console.warn);
          ministriesUpdated = true;
        } else {
          const newMin: ChurchMinistry = {
            id: cfg.id || `min-${Date.now()}`,
            church_id: activeChurchId,
            churchId: activeChurchId,
            name: cfg.name,
            description: cfg.description || '',
            leaderName: cfg.leaderName || '',
            leaderMemberId: cfg.leaderMemberId || '',
            contactPhone: cfg.leaderPhone || '',
            contactEmail: cfg.leaderEmail || '',
            color: cfg.color || '#f59e0b',
            icon: cfg.icon || 'Heart',
            status: cfg.isActive ? 'Active' : 'Inactive',
            meetingTime: cfg.meetingSchedule || '',
            requiredSkills: cfg.requiredSkills || [],
            order: cfg.order || nextTenantMinistries.length + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          nextTenantMinistries.push(newMin);
          saveMinistryToFirestore(newMin).catch(console.warn);
          ministriesUpdated = true;
        }
      });

      if (ministriesUpdated || nextTenantMinistries.length !== currentTenantMinistries.length) {
        const fullNextMinistries = [...otherTenantMinistries, ...nextTenantMinistries];
        setRawMinistries(fullNextMinistries);
        saveStoredMinistries(fullNextMinistries);
      }
    }

    // If church name, logo, or contact was updated, synchronize currentChurch and churches list
    if (
      stampedSettings.profile.name !== currentChurch.name ||
      stampedSettings.profile.logoUrl !== currentChurch.logoUrl ||
      stampedSettings.profile.city !== currentChurch.city ||
      stampedSettings.profile.primaryContactName !== currentChurch.pastorName
    ) {
      const updatedChurchTenant: ChurchTenant = {
        ...currentChurch,
        name: stampedSettings.profile.name,
        logoUrl: stampedSettings.profile.logoUrl || currentChurch.logoUrl,
        city: stampedSettings.profile.city || currentChurch.city,
        state: stampedSettings.profile.state || currentChurch.state,
        contactPhone: stampedSettings.profile.phone || currentChurch.contactPhone,
        pastorName: stampedSettings.profile.primaryContactName || currentChurch.pastorName,
      };

      setCurrentChurch(updatedChurchTenant);
      const nextChurches = churches.map(c => c.id === activeChurchId ? updatedChurchTenant : c);
      setChurches(nextChurches);
      saveStoredChurches(nextChurches);
      saveChurchToFirestore(updatedChurchTenant).catch(console.warn);
    }
  };

  const handleSaveMembers = (updatedAll: Member[]) => {
    setRawMembers(updatedAll);
    saveStoredMembers(updatedAll);
  };

  const handleAddOrUpdateMember = (member: Member) => {
    const stampedMember: Member = {
      ...member,
      church_id: activeChurchId,
      churchId: activeChurchId,
    };
    const existingIndex = rawMembers.findIndex(m => m.id === stampedMember.id);
    let nextMembers: Member[];
    if (existingIndex >= 0) {
      nextMembers = [...rawMembers];
      nextMembers[existingIndex] = stampedMember;
    } else {
      nextMembers = [stampedMember, ...rawMembers];
    }
    handleSaveMembers(nextMembers);
    saveMemberToFirestore(stampedMember);

    if (selectedMemberDetail && selectedMemberDetail.id === stampedMember.id) {
      setSelectedMemberDetail(stampedMember);
    }
  };

  const handleDeleteMember = (id: string) => {
    const nextMembers = rawMembers.filter(m => m.id !== id);
    handleSaveMembers(nextMembers);
    deleteMemberFromFirestore(id);
    if (selectedMemberDetail?.id === id) {
      setSelectedMemberDetail(null);
    }
  };

  const handleImportComplete = (newMembers: Member[], updatedMembers: Member[], createdUsers?: SaaSUser[]) => {
    let nextMembers = [...rawMembers];

    if (updatedMembers.length > 0) {
      const updatedMap = new Map(updatedMembers.map(m => [m.id, m]));
      nextMembers = nextMembers.map(m => updatedMap.get(m.id) || m);
      updatedMembers.forEach(m => {
        saveMemberToFirestore(m).catch(console.warn);
      });
    }

    if (newMembers.length > 0) {
      nextMembers = [...newMembers, ...nextMembers];
      newMembers.forEach(m => {
        saveMemberToFirestore(m).catch(console.warn);
      });
    }

    if (newMembers.length > 0 || updatedMembers.length > 0) {
      handleSaveMembers(nextMembers);
    }

    if (createdUsers && createdUsers.length > 0) {
      const nextUsers = [...allUsers];
      createdUsers.forEach(u => {
        if (!nextUsers.some(ex => ex.id === u.id || (ex.email && ex.email.toLowerCase() === u.email?.toLowerCase()))) {
          nextUsers.unshift(u);
          saveUserToFirestore(u).catch(console.warn);
        }
      });
      setAllUsers(nextUsers);
      saveStoredUsers(nextUsers);
    }
  };

  const handleAddPrayer = (prayer: PrayerRequest) => {
    const isNew = !rawPrayers.some(p => p.id === prayer.id);
    const stampedPrayer: PrayerRequest = {
      ...prayer,
      church_id: activeChurchId,
      churchId: activeChurchId,
    };
    const nextPrayers = isNew
      ? [stampedPrayer, ...rawPrayers]
      : rawPrayers.map(p => p.id === stampedPrayer.id ? stampedPrayer : p);
    setRawPrayers(nextPrayers);
    saveStoredPrayers(nextPrayers);
    savePrayerToFirestore(stampedPrayer);

    // Automatically notify users in Alerts (when new prayer created)
    if (isNew) {
      const isUrgent = stampedPrayer.status === 'Urgent';
      const newAlert: AppNotification = {
        id: `notif-pray-${Date.now()}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: isUrgent 
          ? `🚨 Urgent Prayer: ${stampedPrayer.title}` 
          : `🙏 New Prayer Request: ${stampedPrayer.title}`,
        message: `${stampedPrayer.memberName || 'A church member'} requested prayer (${stampedPrayer.category}): "${stampedPrayer.description.slice(0, 110)}${stampedPrayer.description.length > 110 ? '...' : ''}"`,
        category: isUrgent ? 'Emergency' : 'Prayer',
        date: new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        linkTab: 'prayers',
        createdByUserId: currentUser?.id,
        authorName: stampedPrayer.memberName || currentUser?.name,
      };

      const nextNotifs = [newAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(newAlert).catch(console.warn);
      // Stored in Firestore so other members receive it; creator is not self-notified.
    }
  };

  const handlePrayForRequest = (id: string, userId?: string) => {
    const uid = userId || currentUser?.id || 'current-session-user';
    const target = rawPrayers.find(p => p.id === id);
    if (!target) return;

    const existingPrayedIds = target.prayedUserIds || [];
    const hasAlreadyPrayed = existingPrayedIds.includes(uid);

    let nextPrayedUserIds: string[];
    let nextCount: number;

    if (hasAlreadyPrayed) {
      // Toggle OFF: remove user and decrement count by 1
      nextPrayedUserIds = existingPrayedIds.filter(u => u !== uid);
      nextCount = Math.max(0, target.prayerCount - 1);
    } else {
      // Toggle ON: add user and increment count by 1
      nextPrayedUserIds = [...existingPrayedIds, uid];
      nextCount = target.prayerCount + 1;
    }

    const updated: PrayerRequest = {
      ...target,
      prayerCount: nextCount,
      prayedUserIds: nextPrayedUserIds,
    };

    const next = rawPrayers.map((p) => p.id === id ? updated : p);
    setRawPrayers(next);
    saveStoredPrayers(next);
    savePrayerToFirestore(updated);
  };

  const handleMarkAnswered = (id: string, testimony: string) => {
    const target = rawPrayers.find(p => p.id === id);
    if (!target) return;
    const updated: PrayerRequest = {
      ...target,
      status: 'Answered' as const,
      answeredDate: new Date().toISOString().split('T')[0],
      answeredTestimony: testimony
    };
    const next = rawPrayers.map((p) => p.id === id ? updated : p);
    setRawPrayers(next);
    saveStoredPrayers(next);
    savePrayerToFirestore(updated);

    // Also notify users in Alerts about praise report
    if (testimony) {
      const praiseAlert: AppNotification = {
        id: `notif-praise-${Date.now()}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: `✨ Praise Report: ${target.title}`,
        message: `Praise God! Prayer answered for ${target.memberName}: "${testimony.slice(0, 110)}${testimony.length > 110 ? '...' : ''}"`,
        category: 'Prayer',
        date: new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        linkTab: 'prayers',
        createdByUserId: currentUser?.id,
        authorName: currentUser?.name,
      };
      const nextNotifs = [praiseAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(praiseAlert).catch(console.warn);
      // Stored in Firestore so other members receive it; creator is not self-notified.
    }
  };

  const handleAddPrayerUpdate = (id: string, updateNote: string) => {
    const target = rawPrayers.find(p => p.id === id);
    if (!target) return;
    const newUpdate = {
      id: 'upd-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      note: updateNote,
      authorName: authSession?.user.name || 'Church Leader'
    };
    const updated = { ...target, updates: [...target.updates, newUpdate] };
    const next = rawPrayers.map((p) => p.id === id ? updated : p);
    setRawPrayers(next);
    saveStoredPrayers(next);
    savePrayerToFirestore(updated);

    // Notify users of prayer progress update
    const updateAlert: AppNotification = {
      id: `notif-update-${Date.now()}`,
      church_id: activeChurchId,
      churchId: activeChurchId,
      title: `📝 Prayer Update: ${target.title}`,
      message: `Update from ${newUpdate.authorName}: "${updateNote.slice(0, 110)}${updateNote.length > 110 ? '...' : ''}"`,
      category: 'Prayer',
      date: new Date().toISOString().split('T')[0],
      read: false,
      readByUserIds: [],
      linkTab: 'prayers',
      createdByUserId: currentUser?.id,
      authorName: newUpdate.authorName,
    };
    const nextNotifs = [updateAlert, ...rawNotifications];
    setRawNotifications(nextNotifs);
    saveStoredNotifications(nextNotifs);
    saveNotificationToFirestore(updateAlert).catch(console.warn);
    // Stored in Firestore so other members receive it; creator is not self-notified.
  };

  const handleDeletePrayer = (id: string) => {
    const next = rawPrayers.filter((p) => p.id !== id);
    setRawPrayers(next);
    saveStoredPrayers(next);
    deletePrayerFromFirestore(id);
  };

  const handleAddRosterAssignment = (assignment: RosterAssignment) => {
    const isNew = !rawRoster.some(r => r.id === assignment.id);
    const creatorUserId = assignment.createdByUserId || currentUser?.id;
    const stamped: RosterAssignment = {
      ...assignment,
      church_id: activeChurchId,
      churchId: activeChurchId,
      createdByUserId: creatorUserId,
      createdByName: assignment.createdByName || currentUser?.name || 'Roster Planner',
    };
    const next = isNew
      ? [stamped, ...rawRoster]
      : rawRoster.map(r => r.id === stamped.id ? stamped : r);
    setRawRoster(next);
    saveStoredRoster(next);
    saveRosterToFirestore(stamped);

    // DISPATCH ROSTER ALERT: Notify the assigned volunteer member/user
    if (isNew) {
      const targetUser = findLinkedUserForMember(stamped.memberId, allUsers, rawMembers);

      const rosterAlert: AppNotification = {
        id: `notif-roster-assign-${Date.now()}-${stamped.id}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: `📋 Roster Assignment: ${stamped.serviceName || 'Sunday Service'}`,
        message: `Hi ${stamped.memberName}, you have been scheduled as "${stamped.roleName}" (${stamped.team}) on ${stamped.serviceDate}. Please review and confirm your availability in Roster Planner.`,
        category: 'Roster',
        date: new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        targetUserIds: targetUser ? [targetUser.id] : [],
        targetMemberIds: [stamped.memberId],
        linkTab: 'roster',
        createdByUserId: creatorUserId,
        authorName: currentUser?.name || 'Roster Planner',
        metadata: {
          rosterId: stamped.id,
          memberId: stamped.memberId,
          memberName: stamped.memberName,
          actionType: 'roster_created',
        }
      };

      const nextNotifs = [rosterAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(rosterAlert).catch(console.warn);
    }
  };

  const handleToggleRosterConfirm = (id: string) => {
    const target = rawRoster.find(r => r.id === id);
    if (!target) return;
    const willBeConfirmed = !target.confirmed;
    const updated = { ...target, confirmed: willBeConfirmed };
    const next = rawRoster.map((r) => r.id === id ? updated : r);
    setRawRoster(next);
    saveStoredRoster(next);
    saveRosterToFirestore(updated);

    // DISPATCH CONFIRMATION ALERT: Notify ONLY the user who created the roster
    if (willBeConfirmed) {
      let creatorUserId = target.createdByUserId;

      if (!creatorUserId && target.createdByName) {
        const creatorUser = allUsers.find((u) => 
          (u.church_id === activeChurchId || u.churchId === activeChurchId || activeChurchId === 'church-1') &&
          u.name?.trim().toLowerCase() === target.createdByName?.trim().toLowerCase()
        );
        if (creatorUser) {
          creatorUserId = creatorUser.id;
        }
      }

      // Deliver exclusively to the creator user (if found and not the confirming user)
      if (creatorUserId && creatorUserId !== currentUser?.id) {
        const confirmAlert: AppNotification = {
          id: `notif-roster-confirm-${Date.now()}-${target.id}`,
          church_id: activeChurchId,
          churchId: activeChurchId,
          title: `✅ Roster Confirmed: ${target.memberName}`,
          message: `${target.memberName} confirmed availability for "${target.roleName}" (${target.team}) on ${target.serviceDate} (${target.serviceName}).`,
          category: 'Roster',
          date: new Date().toISOString().split('T')[0],
          read: false,
          readByUserIds: [],
          targetUserIds: [creatorUserId], // STRICTLY only the user who created this roster
          excludeUserIds: currentUser?.id ? [currentUser.id] : [],
          linkTab: 'roster',
          createdByUserId: currentUser?.id,
          authorName: currentUser?.name || target.memberName,
          metadata: {
            rosterId: target.id,
            memberId: target.memberId,
            memberName: target.memberName,
            actionType: 'roster_confirmed',
          }
        };

        const nextNotifs = [confirmAlert, ...rawNotifications];
        setRawNotifications(nextNotifs);
        saveStoredNotifications(nextNotifs);
        saveNotificationToFirestore(confirmAlert).catch(console.warn);
      }
    }
  };

  const handleRemoveRosterAssignment = (id: string) => {
    const next = rawRoster.filter(r => r.id !== id);
    setRawRoster(next);
    saveStoredRoster(next);
    deleteRosterFromFirestore(id);
  };

  const handleSaveAttendance = (record: AttendanceRecord) => {
    const stamped: AttendanceRecord = {
      ...record,
      church_id: activeChurchId,
      churchId: activeChurchId
    };
    const next = [stamped, ...rawAttendance];
    setRawAttendance(next);
    saveStoredAttendance(next);
    saveAttendanceToFirestore(stamped);
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!id) return;
    const next = rawAttendance.filter(a => a.id !== id);
    setRawAttendance(next);
    saveStoredAttendance(next);
    try {
      await deleteAttendanceFromFirestore(id);
    } catch (err) {
      console.error('Failed to delete attendance record from database:', err);
    }
  };

  const handleSaveEvent = (evt: ChurchEvent) => {
    const isNew = !rawEvents.some(e => e.id === evt.id);
    const stamped: ChurchEvent = {
      ...evt,
      church_id: activeChurchId,
      churchId: activeChurchId
    };
    const next = isNew
      ? [stamped, ...rawEvents]
      : rawEvents.map(e => e.id === stamped.id ? stamped : e);
    setRawEvents(next);
    saveStoredEvents(next);
    saveEventToFirestore(stamped);

    // Automatically notify users in Alerts (same like prayer)
    if (isNew) {
      const eventAlert: AppNotification = {
        id: `notif-evt-${Date.now()}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: `🗓️ New Event: ${stamped.title}`,
        message: `${stamped.category || 'Event'} scheduled for ${stamped.date}${stamped.time ? ` at ${stamped.time}` : ''} (${stamped.location || 'Church'}). ${stamped.description ? `"${stamped.description.slice(0, 110)}${stamped.description.length > 110 ? '...' : ''}"` : 'Join us for this church gathering!'}`,
        category: 'Event',
        date: new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        linkTab: 'calendar',
        createdByUserId: currentUser?.id,
        authorName: currentUser?.name,
      };

      const nextNotifs = [eventAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(eventAlert).catch(console.warn);
      // Stored in Firestore so other members receive it; creator is not self-notified.
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    const next = rawEvents.filter(e => e.id !== eventId);
    setRawEvents(next);
    saveStoredEvents(next);
    deleteEventFromFirestore(eventId);
  };

  const handleToggleRsvp = (eventId: string, memberId: string) => {
    const target = rawEvents.find((e) => e.id === eventId);
    if (!target) return;
    const hasRsvped = target.rsvpMemberIds.includes(memberId);
    const updatedRsvps = hasRsvped
      ? target.rsvpMemberIds.filter((id) => id !== memberId)
      : [...target.rsvpMemberIds, memberId];

    const updated = { ...target, rsvpMemberIds: updatedRsvps };
    const next = rawEvents.map((e) => e.id === eventId ? updated : e);
    setRawEvents(next);
    saveStoredEvents(next);
    saveEventToFirestore(updated);
  };

  const handleMarkNotifRead = (id: string) => {
    const currentUserId = currentUser?.id;
    const target = rawNotifications.find((n) => n.id === id);
    if (!target) return;
    const nextReadUserIds = Array.from(
      new Set([...(target.readByUserIds || []), ...(currentUserId ? [currentUserId] : [])])
    );
    const updated: AppNotification = {
      ...target,
      readByUserIds: nextReadUserIds,
      read: nextReadUserIds.length > 0,
    };
    const next = rawNotifications.map((n) => (n.id === id ? updated : n));
    setRawNotifications(next);
    saveStoredNotifications(next);
    saveNotificationToFirestore(updated).catch(console.warn);
  };

  const handleMarkAllNotifsRead = () => {
    const currentUserId = currentUser?.id;
    if (!currentUserId) return;
    const next = rawNotifications.map((n) => {
      if (
        n.church_id === activeChurchId ||
        n.churchId === activeChurchId ||
        (!n.church_id && !n.churchId && activeChurchId === 'church-1')
      ) {
        const nextReadUserIds = Array.from(
          new Set([...(n.readByUserIds || []), currentUserId])
        );
        const updated: AppNotification = {
          ...n,
          readByUserIds: nextReadUserIds,
          read: nextReadUserIds.length > 0,
        };
        saveNotificationToFirestore(updated).catch(console.warn);
        return updated;
      }
      return n;
    });
    setRawNotifications(next);
    saveStoredNotifications(next);
  };

  const handleDeleteNotification = (id: string) => {
    const next = rawNotifications.filter((n) => n.id !== id);
    setRawNotifications(next);
    saveStoredNotifications(next);
    deleteNotificationFromFirestore(id).catch(console.warn);
  };

  const handleClearAllNotifs = async () => {
    if (!window.confirm('Are you sure you want to clear all alerts for this church? This will delete them from the notification center.')) {
      return;
    }
    const notifsToClear = rawNotifications.filter(
      (n) =>
        n.church_id === activeChurchId ||
        n.churchId === activeChurchId ||
        (!n.church_id && !n.churchId && activeChurchId === 'church-1')
    );
    const remaining = rawNotifications.filter(
      (n) =>
        n.church_id !== activeChurchId &&
        n.churchId !== activeChurchId &&
        (Boolean(n.church_id) || Boolean(n.churchId) || activeChurchId !== 'church-1')
    );
    setRawNotifications(remaining);
    saveStoredNotifications(remaining);
    await clearAllNotificationsFromFirestore(notifsToClear).catch(console.warn);
  };

  const handleSendNotification = (notif: AppNotification) => {
    const stamped: AppNotification = {
      ...notif,
      church_id: activeChurchId,
      churchId: activeChurchId,
      createdByUserId: currentUser?.id,
      authorName: currentUser?.name,
      read: false,
      readByUserIds: [],
    };
    const next = [stamped, ...rawNotifications];
    setRawNotifications(next);
    saveStoredNotifications(next);
    saveNotificationToFirestore(stamped);
    // Stored in Firestore so other members receive it; creator is not self-notified.
  };

  const handleSaveAnnouncement = (item: PastorAnnouncement) => {
    const isNew = !rawAnnouncements.some(a => a.id === item.id);
    const stamped: PastorAnnouncement = {
      ...item,
      church_id: activeChurchId,
      churchId: activeChurchId
    };
    const next = isNew
      ? [stamped, ...rawAnnouncements]
      : rawAnnouncements.map(a => a.id === stamped.id ? stamped : a);
    setRawAnnouncements(next);
    saveStoredAnnouncements(next);
    saveAnnouncementToFirestore(stamped);

    // Automatically notify users in Alerts (same like events and prayers)
    if (isNew) {
      const isEmergency = stamped.category === 'Emergency';
      const prefix = isEmergency
        ? '🚨 Urgent Notice'
        : stamped.category === 'Sunday Bulletin'
        ? '📜 Sunday Bulletin'
        : stamped.category === 'Ministry Alert'
        ? '⚠️ Ministry Alert'
        : '📢 Pastoral Announcement';

      const announcementAlert: AppNotification = {
        id: `notif-ann-${Date.now()}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        title: `${prefix}: ${stamped.title}`,
        message: `${stamped.authorName || 'Pastoral Staff'}: "${stamped.content.slice(0, 120)}${stamped.content.length > 120 ? '...' : ''}"`,
        category: isEmergency ? 'Emergency' : 'Announcement',
        date: stamped.date || new Date().toISOString().split('T')[0],
        read: false,
        readByUserIds: [],
        linkTab: 'announcements',
        createdByUserId: currentUser?.id,
        authorName: stamped.authorName || currentUser?.name,
      };

      const nextNotifs = [announcementAlert, ...rawNotifications];
      setRawNotifications(nextNotifs);
      saveStoredNotifications(nextNotifs);
      saveNotificationToFirestore(announcementAlert).catch(console.warn);
      // Stored in Firestore so other members receive it; creator is not self-notified.
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    const next = rawAnnouncements.filter(a => a.id !== id);
    setRawAnnouncements(next);
    saveStoredAnnouncements(next);
    deleteAnnouncementFromFirestore(id);
  };

  const handleSaveSundaySchoolClass = (cls: SundaySchoolClass) => {
    const stamped: SundaySchoolClass = {
      ...cls,
      church_id: activeChurchId,
      churchId: activeChurchId
    };
    const exists = rawSundaySchoolClasses.some(c => c.id === cls.id);
    const next = exists
      ? rawSundaySchoolClasses.map(c => c.id === cls.id ? stamped : c)
      : [...rawSundaySchoolClasses, stamped];
    setRawSundaySchoolClasses(next);
    saveStoredSundaySchoolClasses(next);
    saveSundaySchoolClassToFirestore(stamped);
  };

  const handleDeleteSundaySchoolClass = (classId: string) => {
    const nextClasses = rawSundaySchoolClasses.filter(c => c.id !== classId);
    setRawSundaySchoolClasses(nextClasses);
    saveStoredSundaySchoolClasses(nextClasses);
    deleteSundaySchoolClassFromFirestore(classId);

    // Also remove any students belonging to this class
    const studentsInClass = rawSundaySchoolStudents.filter(s => s.classId === classId);
    if (studentsInClass.length > 0) {
      const nextStudents = rawSundaySchoolStudents.filter(s => s.classId !== classId);
      setRawSundaySchoolStudents(nextStudents);
      saveStoredSundaySchoolStudents(nextStudents);
      studentsInClass.forEach(s => deleteSundaySchoolStudentFromFirestore(s.id));
    }
  };

  const handleSaveSundaySchoolStudent = (stud: SundaySchoolStudent) => {
    const stamped: SundaySchoolStudent = {
      ...stud,
      church_id: activeChurchId,
      churchId: activeChurchId
    };
    const exists = rawSundaySchoolStudents.some(s => s.id === stud.id);
    const next = exists
      ? rawSundaySchoolStudents.map(s => s.id === stud.id ? stamped : s)
      : [...rawSundaySchoolStudents, stamped];
    setRawSundaySchoolStudents(next);
    saveStoredSundaySchoolStudents(next);
    saveSundaySchoolStudentToFirestore(stamped);
  };

  const handleDeleteSundaySchoolStudent = (studentId: string) => {
    const next = rawSundaySchoolStudents.filter(s => s.id !== studentId);
    setRawSundaySchoolStudents(next);
    saveStoredSundaySchoolStudents(next);
    deleteSundaySchoolStudentFromFirestore(studentId);
  };

  const handleAwardBadge = (studentId: string, badgeName: string) => {
    const target = rawSundaySchoolStudents.find(s => s.id === studentId);
    if (!target) return;
    const updated = { ...target, badges: [...target.badges, badgeName] };
    const next = rawSundaySchoolStudents.map(s => s.id === studentId ? updated : s);
    setRawSundaySchoolStudents(next);
    saveStoredSundaySchoolStudents(next);
    saveSundaySchoolStudentToFirestore(updated);
  };

  const handleSaveSundaySchoolAttendance = (record: SundaySchoolAttendanceRecord) => {
    const stamped: SundaySchoolAttendanceRecord = {
      ...record,
      church_id: activeChurchId,
      churchId: activeChurchId,
      createdAt: record.createdAt || new Date().toISOString()
    };
    const exists = rawSundaySchoolAttendance.some(a => a.id === record.id);
    const nextAttendance = exists
      ? rawSundaySchoolAttendance.map(a => a.id === record.id ? stamped : a)
      : [stamped, ...rawSundaySchoolAttendance];
    setRawSundaySchoolAttendance(nextAttendance);
    saveStoredSundaySchoolAttendance(nextAttendance);
    saveSundaySchoolAttendanceToFirestore(stamped);

    // If new attendance session, automatically increment attendance count for present students
    if (!exists && stamped.presentStudentIds && stamped.presentStudentIds.length > 0) {
      const nextStudents = rawSundaySchoolStudents.map(stud => {
        if (stamped.presentStudentIds.includes(stud.id)) {
          const updatedStud: SundaySchoolStudent = {
            ...stud,
            attendancePresentCount: (stud.attendancePresentCount || 0) + 1
          };
          saveSundaySchoolStudentToFirestore(updatedStud);
          return updatedStud;
        }
        return stud;
      });
      setRawSundaySchoolStudents(nextStudents);
      saveStoredSundaySchoolStudents(nextStudents);
    }
  };

  const handleDeleteSundaySchoolAttendance = (attendanceId: string) => {
    const next = rawSundaySchoolAttendance.filter(a => a.id !== attendanceId);
    setRawSundaySchoolAttendance(next);
    saveStoredSundaySchoolAttendance(next);
    deleteSundaySchoolAttendanceFromFirestore(attendanceId);
  };

  const handleSaveWhatsAppTemplate = async (template: WhatsAppReminderTemplate) => {
    const stamped: WhatsAppReminderTemplate = {
      ...template,
      church_id: activeChurchId,
      churchId: activeChurchId,
    };
    const exists = rawWhatsappTemplates.some(t => t.id === stamped.id);
    const next = exists
      ? rawWhatsappTemplates.map(t => t.id === stamped.id ? stamped : t)
      : [stamped, ...rawWhatsappTemplates];
    setRawWhatsappTemplates(next);
    saveStoredWhatsAppTemplates(next);
    try {
      await saveWhatsAppTemplateToFirestore(stamped);
    } catch (err) {
      console.error('Failed to save WhatsApp template to Firestore:', err);
    }
  };

  const handleDeleteWhatsAppTemplate = async (id: string) => {
    if (!id) return;
    const next = rawWhatsappTemplates.filter(t => t.id !== id);
    setRawWhatsappTemplates(next);
    saveStoredWhatsAppTemplates(next);
    try {
      await deleteWhatsAppTemplateFromFirestore(id);
    } catch (err) {
      console.error('Failed to delete WhatsApp template from Firestore:', err);
    }
  };

  const handleSaveWhatsAppGroup = async (group: WhatsAppGroup) => {
    const stamped: WhatsAppGroup = {
      ...group,
      church_id: activeChurchId,
      churchId: activeChurchId,
    };
    const exists = rawWhatsappGroups.some(g => g.id === stamped.id);
    const next = exists
      ? rawWhatsappGroups.map(g => g.id === stamped.id ? stamped : g)
      : [stamped, ...rawWhatsappGroups];
    setRawWhatsappGroups(next);
    saveStoredWhatsAppGroups(next);
    try {
      await saveWhatsAppGroupToFirestore(stamped);
    } catch (err) {
      console.error('Failed to save WhatsApp group to Firestore:', err);
    }
  };

  const handleDeleteWhatsAppGroup = async (id: string) => {
    if (!id) return;
    const next = rawWhatsappGroups.filter(g => g.id !== id);
    setRawWhatsappGroups(next);
    saveStoredWhatsAppGroups(next);
    try {
      await deleteWhatsAppGroupFromFirestore(id);
    } catch (err) {
      console.error('Failed to delete WhatsApp group from Firestore:', err);
    }
  };

  const handleRegisterChurch = (newChurch: ChurchTenant) => {
    const next = [...churches, newChurch];
    setChurches(next);
    saveStoredChurches(next);
    saveChurchToFirestore(newChurch);
  };

  const handleSaveUser = (user: SaaSUser) => {
    const exists = allUsers.some(u => u.id === user.id);
    const next = exists ? allUsers.map(u => u.id === user.id ? user : u) : [user, ...allUsers];
    setAllUsers(next);
    saveStoredUsers(next);
    saveUserToFirestore(user);
  };

  const handleDeleteUser = (userId: string) => {
    const next = allUsers.filter(u => u.id !== userId);
    setAllUsers(next);
    saveStoredUsers(next);
    deleteUserFromFirestore(userId);
  };

  const handleUpdateUserProfile = (updatedUser: SaaSUser) => {
    // 1. Update in allUsers state & persistence
    const nextUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    setAllUsers(nextUsers);
    saveStoredUsers(nextUsers);
    saveUserToFirestore(updatedUser).catch(console.warn);

    // 2. Update current active authSession
    if (authSession && authSession.user.id === updatedUser.id) {
      const nextSession: AuthSession = {
        ...authSession,
        user: updatedUser
      };
      setAuthSession(nextSession);
      saveStoredAuthSession(nextSession);
    }

    // 3. Find matching member in rawMembers and synchronize photo and details
    const cleanPhone = (ph: string) => (ph || '').replace(/\D/g, '').slice(-10);
    
    // Match candidate by email, phone, or name
    let targetMember = rawMembers.find(m => 
      (updatedUser.email && m.email && m.email.toLowerCase().trim() === updatedUser.email.toLowerCase().trim()) ||
      (updatedUser.phone && m.phone && cleanPhone(m.phone) === cleanPhone(updatedUser.phone)) ||
      (`${m.firstName || ''} ${m.lastName || ''}`.trim().toLowerCase() === updatedUser.name.trim().toLowerCase())
    );

    if (targetMember) {
      const nameParts = updatedUser.name.trim().split(' ');
      const firstName = nameParts[0] || targetMember.firstName;
      const lastName = nameParts.slice(1).join(' ') || targetMember.lastName;

      const updatedMember: Member = {
        ...targetMember,
        firstName,
        lastName,
        avatarUrl: updatedUser.avatarUrl,
        email: updatedUser.email || targetMember.email,
        phone: updatedUser.phone || targetMember.phone,
      };

      const nextMembers = rawMembers.map(m => m.id === updatedMember.id ? updatedMember : m);
      setRawMembers(nextMembers);
      saveStoredMembers(nextMembers);
      saveMemberToFirestore(updatedMember).catch(console.warn);
    } else {
      // If no exact match found yet, create or link a member record for this user in their active church
      const nameParts = updatedUser.name.trim().split(' ');
      const firstName = nameParts[0] || updatedUser.name;
      const lastName = nameParts.slice(1).join(' ') || '';

      const newMember: Member = {
        id: `mem-usr-${updatedUser.id}`,
        church_id: activeChurchId,
        churchId: activeChurchId,
        firstName,
        lastName,
        email: updatedUser.email || `${updatedUser.username}@church.org`,
        phone: updatedUser.phone || '+91 98401 23456',
        address: 'Church Campus',
        city: currentChurch?.city || 'Chennai',
        state: currentChurch?.state || 'Tamil Nadu',
        zipCode: '600040',
        avatarUrl: updatedUser.avatarUrl,
        status: updatedUser.role.includes('Pastor') ? 'Pastor' : updatedUser.role.includes('Leader') ? 'Leader' : 'Member',
        joinedDate: new Date().toISOString().split('T')[0],
        familyMembers: [],
        ministryTeams: [],
        availability: ['Sunday First Service'],
        skills: ['Leadership', 'Ministry'],
        isPrivateNotes: false,
        createdAt: new Date().toISOString()
      };

      const nextMembers = [newMember, ...rawMembers];
      setRawMembers(nextMembers);
      saveStoredMembers(nextMembers);
      saveMemberToFirestore(newMember).catch(console.warn);
    }
  };

  const handleResetData = () => {
    resetAllDataToDefault();
    setChurches(getStoredChurches());
    setAllUsers(getStoredUsers());
    setRawMembers(getStoredMembers());
    setRawPrayers(getStoredPrayers());
    setRawRoster(getStoredRoster());
    setRawAttendance(getStoredAttendance());
    setRawEvents(getStoredEvents());
    setRawNotifications(getStoredNotifications());
    setRawAnnouncements(getStoredAnnouncements());
    setRawSundaySchoolClasses(getStoredSundaySchoolClasses());
    setRawSundaySchoolStudents(getStoredSundaySchoolStudents());
    setRawWhatsappTemplates(getStoredWhatsAppTemplates());
  };

  // If user is not authenticated, render Login screen
  if (!authSession || !authSession.user) {
    return (
      <LoginScreen 
        onLoginSuccess={handleLoginSuccess}
        churches={churches}
        users={allUsers}
        initialMode={loginScreenMode}
        initialResetToken={loginResetToken}
      />
    );
  }

  const currentUser = authSession.user;
  const userRole = currentUser.role;
  const roleConfig = getRoleConfig(userRole);

  const urgentPrayersCount = prayers.filter(p => p.status === 'Urgent').length;
  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const activeVolunteersCount = members.filter(m => m.ministryTeams.length > 0).length;

  return (
    <MobileFrame isMobileFrame={isMobileFrame} onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}>
      <div className="flex flex-col flex-1 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans w-full max-w-full overflow-x-hidden transition-colors duration-150">
        {/* Top Header */}
        <Header
          memberCount={members.length}
          prayerCount={prayers.length}
          volunteerCount={activeVolunteersCount}
          members={members}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
          onOpenAddMember={() => {
            setSelectedMemberEdit(null);
            setIsAddMemberOpen(true);
          }}
          onOpenAddPrayer={() => {
            setInitialPrayerMember(null);
            setIsAddPrayerOpen(true);
          }}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenChurchAi={() => setIsChurchAiOpen(true)}
          onOpenAiPastor={() => setIsAiPastorOpen(true)}
          onOpenAiMinistry={() => setIsAiMinistryOpen(true)}
          activeTab={activeTab}
          currentChurch={currentChurch}
          currentUser={currentUser}
          churches={churches}
          churchSettings={activeChurchSettings}
          moduleToggles={activeModuleToggles}
          notifications={notifications}
          onMarkNotifRead={handleMarkNotifRead}
          onMarkAllNotifsRead={handleMarkAllNotifsRead}
          onDeleteNotif={handleDeleteNotification}
          onClearAllNotifs={handleClearAllNotifs}
          onSelectChurch={handleSelectChurch}
          onLogout={handleLogout}
          onUpdateUserProfile={handleUpdateUserProfile}
          isDarkMode={isDarkMode}
          onToggleThemeMode={handleToggleThemeMode}
          onNavigateTab={(tab) => {
            if (isTabAllowed(userRole, tab, activeModuleToggles)) {
              handleNavigateTab(tab);
            }
          }}
        />

        {/* Role Banner */}
        <div className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Active Church: <strong className="text-amber-600 dark:text-amber-400">{activeChurchSettings?.profile?.name || currentChurch.name}</strong> ({activeChurchSettings?.profile?.city || currentChurch.city})
            </span>
            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
              User: <strong className="text-slate-900 dark:text-white">{currentUser.name}</strong> (<span className="text-amber-600 dark:text-amber-300 font-semibold">{roleConfig.label}</span>)
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-2 sm:p-5 max-w-6xl w-full min-w-0 mx-auto pb-24 sm:pb-28 overflow-x-hidden">
          {activeTab === 'dashboard' && isTabAllowed(userRole, 'dashboard', activeModuleToggles) && (
            <ChurchDashboard
              currentChurch={currentChurch}
              currentUser={currentUser}
              members={members}
              attendance={attendance}
              events={events}
              prayers={prayers}
              ministries={ministries}
              ministryMembers={ministryMembers}
              ministryTeams={ministryTeams}
              ministryActivities={ministryActivities}
              roster={roster}
              notifications={notifications}
              announcements={announcements}
              sundaySchoolClasses={sundaySchoolClasses}
              sundaySchoolStudents={sundaySchoolStudents}
              churchSettings={activeChurchSettings}
              onNavigateTab={(tab, deepLinkId) => {
                if (deepLinkId && tab === 'ministries') {
                  setSelectedMinistryNavId(deepLinkId);
                }
                if (deepLinkId && tab === 'reports') {
                  setSelectedReportCategoryNav(deepLinkId as ReportCategory);
                }
                handleNavigateTab(tab as AppTab);
              }}
              onOpenAddMember={() => {
                if (roleConfig.canManageMembers) {
                  setSelectedMemberEdit(null);
                  setIsAddMemberOpen(true);
                }
              }}
              onOpenAddPrayer={() => {
                setInitialPrayerMember(null);
                setIsAddPrayerOpen(true);
              }}
              onOpenAddEvent={() => handleNavigateTab('calendar')}
              onOpenRecordAttendance={() => handleNavigateTab('attendance')}
              onOpenCreateMinistry={() => handleNavigateTab('ministries')}
              onOpenChurchAi={() => setIsChurchAiOpen(true)}
              onOpenAiPastor={() => setIsAiPastorOpen(true)}
              onOpenAiMinistry={() => setIsAiMinistryOpen(true)}
              onToggleRosterConfirm={handleToggleRosterConfirm}
            />
          )}

          {activeTab === 'reports' && isTabAllowed(userRole, 'reports', activeModuleToggles) && (
            <ReportsModule
              currentChurch={currentChurch}
              currentUser={currentUser}
              members={members}
              attendance={attendance}
              events={events}
              prayers={prayers}
              ministries={ministries}
              ministryMembers={ministryMembers}
              ministryTeams={ministryTeams}
              ministryActivities={ministryActivities}
              roster={roster}
              notifications={notifications}
              announcements={announcements}
              sundaySchoolClasses={sundaySchoolClasses}
              sundaySchoolStudents={sundaySchoolStudents}
              churchSettings={activeChurchSettings}
              initialCategory={selectedReportCategoryNav || 'members'}
              onNavigateTab={(tab, deepLinkId) => {
                if (deepLinkId && tab === 'ministries') {
                  setSelectedMinistryNavId(deepLinkId);
                }
                handleNavigateTab(tab as AppTab);
              }}
              onDeleteAttendance={roleConfig.canRecordAttendance ? handleDeleteAttendance : undefined}
            />
          )}

          {activeTab === 'directory' && isTabAllowed(userRole, 'directory', activeModuleToggles) && (
            <MemberList
              members={members}
              ministries={ministries}
              allUsers={allUsers}
              canManageMembers={roleConfig.canManageMembers}
              onOpenImport={() => setIsImportModalOpen(true)}
              onSelectMember={(m) => setSelectedMemberDetail(m)}
              onEditMember={(m) => {
                if (roleConfig.canManageMembers) {
                  setSelectedMemberEdit(m);
                  setIsAddMemberOpen(true);
                }
              }}
              onDeleteMember={roleConfig.canManageMembers ? handleDeleteMember : undefined}
              onAddNew={() => {
                if (roleConfig.canManageMembers) {
                  setSelectedMemberEdit(null);
                  setIsAddMemberOpen(true);
                }
              }}
            />
          )}

          {activeTab === 'visitors' && isTabAllowed(userRole, 'visitors', activeModuleToggles) && (
            <VisitorsPage
              currentChurch={currentChurch}
              currentUser={currentUser}
              allUsers={allUsers}
              members={rawMembers}
              churchSettings={activeChurchSettings}
            />
          )}

          {activeTab === 'ministries' && isTabAllowed(userRole, 'ministries', activeModuleToggles) && (
            <MinistriesModule
              currentChurch={currentChurch}
              currentUser={currentUser}
              members={members}
              ministries={ministries}
              ministryMembers={ministryMembers}
              ministryTeams={ministryTeams}
              ministryTeamMembers={ministryTeamMembers}
              ministryActivities={ministryActivities}
              ministryAnnouncements={ministryAnnouncements}
              events={events}
              roster={roster}
              attendance={attendance}
              churchSettings={activeChurchSettings}
              onSaveMinistry={handleSaveMinistry}
              onDeleteMinistry={handleDeleteMinistry}
              onSaveMinistryMember={handleSaveMinistryMember}
              onDeleteMinistryMember={handleDeleteMinistryMember}
              onSaveMinistryTeam={handleSaveMinistryTeam}
              onDeleteMinistryTeam={handleDeleteMinistryTeam}
              onSaveMinistryTeamMember={handleSaveMinistryTeamMember}
              onDeleteMinistryTeamMember={handleDeleteMinistryTeamMember}
              onSaveMinistryActivity={handleSaveMinistryActivity}
              onDeleteMinistryActivity={handleDeleteMinistryActivity}
              onSaveMinistryAnnouncement={handleSaveMinistryAnnouncement}
              onDeleteMinistryAnnouncement={handleDeleteMinistryAnnouncement}
              onSaveRosterAssignment={handleAddRosterAssignment}
              onDeleteRosterAssignment={handleRemoveRosterAssignment}
              onNavigateTab={(tab) => handleNavigateTab(tab as AppTab)}
              initialSelectedMinistryId={selectedMinistryNavId}
              onOpenAiMinistry={() => setIsAiMinistryOpen(true)}
            />
          )}

          {activeTab === 'my-ministry' && (
            <MyMinistryView
              currentChurch={currentChurch}
              currentUser={currentUser}
              members={members}
              ministries={ministries}
              ministryMembers={ministryMembers}
              ministryTeams={ministryTeams}
              ministryActivities={ministryActivities}
              ministryAnnouncements={ministryAnnouncements}
              events={events}
              roster={roster}
              onNavigateTab={(tab, deepLinkId) => {
                if (deepLinkId) setSelectedMinistryNavId(deepLinkId);
                handleNavigateTab(tab as AppTab);
              }}
              onSaveMinistryAnnouncement={handleSaveMinistryAnnouncement}
              onDeleteMinistryAnnouncement={handleDeleteMinistryAnnouncement}
              onSaveMinistryMember={handleSaveMinistryMember}
              onDeleteMinistryMember={handleDeleteMinistryMember}
              onToggleRosterConfirm={handleToggleRosterConfirm}
              onOpenAiMinistry={() => setIsAiMinistryOpen(true)}
            />
          )}

          {activeTab === 'my-assignments' && (
            <MyAssignmentsView
              currentUser={currentUser}
              members={members}
              roster={roster}
              ministryActivities={ministryActivities}
              ministries={ministries}
              onToggleRosterConfirm={handleToggleRosterConfirm}
              onNavigateTab={(tab) => handleNavigateTab(tab as AppTab)}
            />
          )}

          {activeTab === 'my-attendance' && (
            <MyAttendanceView
              currentUser={currentUser}
              members={members}
              attendance={attendance}
              ministryActivities={ministryActivities}
              sundaySchoolAttendance={rawSundaySchoolAttendance}
              onNavigateTab={(tab) => handleNavigateTab(tab as AppTab)}
            />
          )}

          {activeTab === 'groups' && isTabAllowed(userRole, 'groups', activeModuleToggles) && (
            <SmallGroupsModule members={members} currentUser={currentUser} currentRole={userRole} currentChurch={currentChurch} churchId={currentChurch.id} />
          )}

          {activeTab === 'attendance' && isTabAllowed(userRole, 'attendance', activeModuleToggles) && (
            <AttendanceTracker
              members={members}
              attendanceRecords={attendance}
              currentUser={currentUser}
              churchSettings={activeChurchSettings}
              groups={whatsappGroups}
              onSaveRecord={handleSaveAttendance}
              onDeleteRecord={roleConfig.canRecordAttendance ? handleDeleteAttendance : undefined}
            />
          )}

          {activeTab === 'prayers' && isTabAllowed(userRole, 'prayers', activeModuleToggles) && (
            <PrayerWall
              prayers={prayers}
              members={members}
              currentUser={currentUser}
              currentUserId={currentUser?.id}
              canManagePrayers={roleConfig.canManagePrayers}
              onPrayForRequest={handlePrayForRequest}
              onMarkAnswered={handleMarkAnswered}
              onAddPrayerUpdate={handleAddPrayerUpdate}
              onDeletePrayer={roleConfig.canManagePrayers ? handleDeletePrayer : undefined}
              onOpenAddPrayerModal={() => {
                setPrayerToEdit(null);
                setInitialPrayerMember(null);
                setIsAddPrayerOpen(true);
              }}
              onEditPrayer={(prayer) => {
                setPrayerToEdit(prayer);
                setInitialPrayerMember(null);
                setIsAddPrayerOpen(true);
              }}
            />
          )}

          {activeTab === 'pastoral' && isTabAllowed(userRole, 'pastoral', activeModuleToggles) && (
            <PastoralCareModule />
          )}

          {activeTab === 'calendar' && isTabAllowed(userRole, 'calendar', activeModuleToggles) && (
            <EventCalendar
              events={events}
              members={members}
              currentChurch={currentChurch}
              currentUser={currentUser}
              canManageEvents={roleConfig.canManageEvents}
              onSaveEvent={handleSaveEvent}
              onToggleRsvp={handleToggleRsvp}
              onDeleteEvent={roleConfig.canManageEvents ? handleDeleteEvent : undefined}
            />
          )}

          {activeTab === 'notifications' && isTabAllowed(userRole, 'notifications', activeModuleToggles) && (
            <NotificationCenter
              notifications={notifications}
              currentChurch={currentChurch}
              currentUser={currentUser}
              allUsers={allUsers}
              onMarkRead={handleMarkNotifRead}
              onMarkAllRead={handleMarkAllNotifsRead}
              onDeleteNotification={handleDeleteNotification}
              onClearAll={handleClearAllNotifs}
              onSendNotification={handleSendNotification}
              onNavigateTab={(tab) => handleNavigateTab(tab as AppTab)}
            />
          )}

          {activeTab === 'announcements' && isTabAllowed(userRole, 'announcements', activeModuleToggles) && (
            <PastorAnnouncements
              announcements={announcements}
              currentUser={currentUser}
              currentChurch={currentChurch}
              onSaveAnnouncement={handleSaveAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
            />
          )}

          {activeTab === 'volunteers' && isTabAllowed(userRole, 'volunteers', activeModuleToggles) && (
            <VolunteerManager
              members={members}
              ministries={ministries}
              ministryMembers={ministryMembers}
              onSelectMember={(m) => setSelectedMemberDetail(m)}
              onEditMember={(m) => {
                if (roleConfig.canManageMembers) {
                  setSelectedMemberEdit(m);
                  setIsAddMemberOpen(true);
                }
              }}
              onNavigateMinistry={handleNavigateToMinistry}
            />
          )}

          {activeTab === 'roster' && isTabAllowed(userRole, 'roster', activeModuleToggles) && (
            <RosterPlanner
              roster={roster}
              members={members}
              ministries={ministries}
              currentUser={currentUser}
              churchSettings={activeChurchSettings}
              events={events}
              onAddAssignment={handleAddRosterAssignment}
              onToggleConfirm={handleToggleRosterConfirm}
              onRemoveAssignment={handleRemoveRosterAssignment}
            />
          )}

          {activeTab === 'sundayschool' && isTabAllowed(userRole, 'sundayschool', activeModuleToggles) && (
            <SundaySchoolManager
              classes={sundaySchoolClasses}
              students={sundaySchoolStudents}
              attendanceRecords={sundaySchoolAttendance}
              groups={whatsappGroups}
              currentChurchId={activeChurchId}
              churchName={currentChurch?.name || 'New Creation Assembly Church'}
              currentUser={authSession?.user}
              canManageSundaySchool={roleConfig.canManageSundaySchool}
              onSaveClass={handleSaveSundaySchoolClass}
              onAddClass={handleSaveSundaySchoolClass}
              onSaveStudent={handleSaveSundaySchoolStudent}
              onAddStudent={handleSaveSundaySchoolStudent}
              onAwardBadge={handleAwardBadge}
              onDeleteStudent={handleDeleteSundaySchoolStudent}
              onDeleteClass={roleConfig.canManageSundaySchool ? handleDeleteSundaySchoolClass : undefined}
              onSaveAttendance={handleSaveSundaySchoolAttendance}
              onDeleteAttendance={handleDeleteSundaySchoolAttendance}
            />
          )}

          {activeTab === 'whatsapp' && isTabAllowed(userRole, 'whatsapp', activeModuleToggles) && (
            <WhatsAppHub
              members={members}
              templates={whatsappTemplates}
              groups={whatsappGroups}
              currentChurch={currentChurch}
              canManageTemplates={roleConfig.canSendWhatsApp}
              sundaySchoolClasses={sundaySchoolClasses}
              sundaySchoolStudents={sundaySchoolStudents}
              sundaySchoolAttendance={sundaySchoolAttendance}
              churchSettings={activeChurchSettings}
              events={events}
              attendance={attendance}
              onSaveTemplate={handleSaveWhatsAppTemplate}
              onDeleteTemplate={roleConfig.canSendWhatsApp ? handleDeleteWhatsAppTemplate : undefined}
              onSaveGroup={handleSaveWhatsAppGroup}
              onDeleteGroup={roleConfig.canSendWhatsApp ? handleDeleteWhatsAppGroup : undefined}
            />
          )}

          {activeTab === 'saas' && isTabAllowed(userRole, 'saas', activeModuleToggles) && (
            <SaaSConsole
              churches={churches}
              currentChurch={currentChurch}
              currentUser={currentUser}
              onSelectChurch={handleSelectChurch}
              onSwitchUser={handleSwitchUser}
              onRegisterChurch={handleRegisterChurch}
              onAddUser={handleSaveUser}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              allUsers={allUsers}
              members={rawMembers}
              prayers={rawPrayers}
              attendance={rawAttendance}
              events={rawEvents}
              sundaySchoolClasses={rawSundaySchoolClasses}
            />
          )}

          {activeTab === 'settings' && isTabAllowed(userRole, 'settings', activeModuleToggles) && (
            <ChurchSettingsModule
              currentChurch={currentChurch}
              currentUser={currentUser}
              members={members}
              settings={activeChurchSettings}
              onSaveSettings={handleSaveChurchSettings}
              onNavigateTab={(tab) => handleNavigateTab(tab as AppTab)}
            />
          )}
        </main>

        {/* Bottom Navigation Tabs */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={handleNavigateTab}
          urgentPrayerCount={urgentPrayersCount}
          unreadNotifCount={unreadNotifCount}
          userRole={userRole}
          moduleToggles={activeModuleToggles}
          currentUser={currentUser}
          members={members}
          ministries={ministries}
          ministryMembers={ministryMembers}
          onOpenMyProfile={() => setIsMyProfileOpen(true)}
        />

        {/* My Member Profile Modal */}
        <MyProfileModal
          isOpen={isMyProfileOpen}
          onClose={() => setIsMyProfileOpen(false)}
          currentUser={currentUser}
          members={members}
        />

        {/* Central Church AI Modal */}
        <ChurchAiModal
          isOpen={isChurchAiOpen}
          onClose={() => setIsChurchAiOpen(false)}
          churchId={currentChurch.id}
          userRole={userRole}
          userName={currentUser.name}
          userEmail={currentUser.email}
          memberId={currentUser.id}
          activeTabOrScreen={activeTab}
        />

        {/* AI Pastor Assistant Modal */}
        <AiPastorAssistantModal
          isOpen={isAiPastorOpen}
          onClose={() => setIsAiPastorOpen(false)}
          churchId={currentChurch.id}
          userRole={userRole}
          userName={currentUser.name}
        />

        {/* AI Ministry Assistant Modal */}
        <AiMinistryAssistantModal
          isOpen={isAiMinistryOpen}
          onClose={() => setIsAiMinistryOpen(false)}
          currentChurchId={currentChurch.id}
          currentUser={currentUser}
          members={members}
          ministries={ministries}
          ministryMembers={ministryMembers}
          roster={roster}
          activities={ministryActivities}
          announcements={ministryAnnouncements}
          events={events}
          attendance={attendance}
          onSaveMinistryAnnouncement={handleSaveMinistryAnnouncement}
        />

        {/* Modals */}
        <MemberDetailModal
          member={selectedMemberDetail}
          prayers={prayers}
          ministries={ministries}
          onClose={() => setSelectedMemberDetail(null)}
          onEdit={(m) => {
            if (roleConfig.canManageMembers) {
              setSelectedMemberDetail(null);
              setSelectedMemberEdit(m);
              setIsAddMemberOpen(true);
            }
          }}
          onDelete={roleConfig.canManageMembers ? handleDeleteMember : undefined}
          onAddPrayerForMember={(m) => {
            setPrayerToEdit(null);
            setInitialPrayerMember(m);
            setIsAddPrayerOpen(true);
          }}
          onNavigateMinistry={handleNavigateToMinistry}
        />

        <MemberFormModal
          isOpen={isAddMemberOpen}
          member={selectedMemberEdit}
          existingMembers={rawMembers}
          currentChurchId={activeChurchId}
          ministries={ministries}
          onClose={() => {
            setIsAddMemberOpen(false);
            setSelectedMemberEdit(null);
          }}
          onSave={handleAddOrUpdateMember}
          onSelectExistingMember={(existing) => {
            setSelectedMemberDetail(existing);
          }}
        />

        <PrayerFormModal
          isOpen={isAddPrayerOpen}
          prayerToEdit={prayerToEdit}
          members={members}
          initialMember={initialPrayerMember}
          currentChurchId={activeChurchId}
          currentUser={currentUser}
          onClose={() => {
            setIsAddPrayerOpen(false);
            setPrayerToEdit(null);
            setInitialPrayerMember(null);
          }}
          onSave={handleAddPrayer}
        />

        <ExportImportModal
          isOpen={isExportModalOpen}
          currentChurch={currentChurch}
          members={members}
          prayers={prayers}
          onClose={() => setIsExportModalOpen(false)}
          onResetData={handleResetData}
          onOpenImport={() => setIsImportModalOpen(true)}
        />

        <ImportMembersModal
          isOpen={isImportModalOpen}
          currentChurchId={activeChurchId}
          currentChurchName={currentChurch?.name}
          existingMembers={rawMembers}
          ministries={ministries}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={handleImportComplete}
        />

        {/* Floating Double-Back Exit Toast */}
        {showExitToast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl border border-slate-700/80 z-50 pointer-events-none animate-in fade-in backdrop-blur-md">
            Press back again to exit
          </div>
        )}
      </div>
    </MobileFrame>
  );
}
