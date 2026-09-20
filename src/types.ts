export type MembershipStatus = 'Pastor' | 'Assistant Pastor' | 'Leader' | 'Clergy/Staff' | 'Member' | 'Regular Attender' | 'Visitor' | 'Youth';

export type MinistryRole = 'Worship & Music' | 'Hospitality & Welcome' | "Children's Ministry" | 'Tech & Media' | 'Youth Ministry' | 'Outreach & Missions' | 'Facilities & Setup' | 'Prayer Team' | string;

export type AvailabilityDay = 'Sunday First Service' | 'Sunday Second Service' | 'Wednesday Evening' | 'Saturday Events' | 'On-Call / As Needed';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: 'Spouse' | 'Child' | 'Parent' | 'Sibling' | 'Other';
  age?: number;
}

export interface Member {
  id: string;
  church_id?: string;
  churchId?: string;
  user_id?: string;  // Link to Auth User / Profile ID
  userId?: string;   // Link to Auth User / Profile ID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string; // Indian PIN Code (e.g. 600040)
  avatarUrl?: string;
  status: MembershipStatus;
  joinedDate: string;
  birthdate?: string;
  anniversary?: string;
  familyMembers: FamilyMember[];
  ministryTeams: MinistryRole[];
  availability: AvailabilityDay[];
  skills: string[];
  pastoralNotes?: string;
  isPrivateNotes: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  gender?: string;
  createdAt: string;
}

export type PrayerCategory = 'Health & Healing' | 'Family & Relationships' | 'Guidance & Faith' | 'Financial & Work' | 'Missions & Outreach' | 'Praise & Thanksgiving' | 'General';

export type PrayerStatus = 'Active' | 'Urgent' | 'Answered' | 'Ongoing';

export type ConfidentialityLevel = 'Public Congregation' | 'Prayer Team Only' | 'Pastoral Staff Only';

export interface PrayerUpdate {
  id: string;
  date: string;
  note: string;
  authorName: string;
}

export interface PrayerRequest {
  id: string;
  church_id?: string;
  churchId?: string;
  memberId?: string;
  memberName: string;
  title: string;
  description: string;
  category: PrayerCategory;
  status: PrayerStatus;
  confidentiality: ConfidentialityLevel;
  dateSubmitted: string;
  prayerCount: number;
  prayedUserIds?: string[];
  updates: PrayerUpdate[];
  answeredDate?: string;
  answeredTestimony?: string;
}

export interface MinistryTeamInfo {
  id: MinistryRole;
  name: MinistryRole;
  leaderName: string;
  leaderEmail: string;
  description: string;
  color: string;
  requiredSkills: string[];
}

// 1.1 COMPREHENSIVE REUSABLE MINISTRIES MODULE
export interface ChurchMinistry {
  id: string;
  church_id: string;
  churchId?: string;
  name: string;
  description: string;
  leaderMemberId?: string;
  leaderName: string;
  assistantLeaderMemberId?: string;
  assistantLeaderName?: string;
  status: 'Active' | 'Inactive';
  color: string;
  icon: string;
  contactPhone?: string;
  contactEmail?: string;
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
  notes?: string;
  requiredSkills?: string[];
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MinistryMember {
  id: string;
  church_id: string;
  churchId?: string;
  ministryId: string;
  memberId: string;
  ministryRole: string; // e.g. "Leader", "Assistant Leader", "Volunteer", "Coordinator", "Teacher", "Musician", "Vocalist", "Team Member"
  role?: string;
  status: 'Active' | 'Inactive';
  joinedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MinistryTeam {
  id: string;
  church_id: string;
  churchId?: string;
  ministryId: string;
  name: string;
  description: string;
  leaderMemberId?: string;
  leaderName?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface MinistryTeamMember {
  id: string;
  church_id: string;
  churchId?: string;
  teamId: string;
  ministryId: string;
  memberId: string;
  role: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface MinistryActivity {
  id: string;
  church_id: string;
  churchId?: string;
  ministryId: string;
  teamId?: string;
  name: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "06:30 PM"
  endTime?: string; // e.g. "08:00 PM"
  location: string;
  leaderName: string;
  leaderMemberId?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  presentMemberIds: string[];
  notes?: string;
  createdAt: string;
  createdByUserId?: string;
}

export interface MinistryAnnouncement {
  id: string;
  church_id: string;
  churchId?: string;
  ministryId: string;
  teamId?: string;
  title: string;
  message: string;
  authorName: string;
  date: string;
  expiryDate?: string;
  priority: 'Normal' | 'High' | 'Urgent';
  createdAt: string;
}

export interface RosterAssignment {
  id: string;
  church_id?: string;
  churchId?: string;
  ministryId?: string;
  serviceDate: string;
  serviceName: string;
  roleName: string;
  team: MinistryRole;
  memberId: string;
  memberName: string;
  confirmed: boolean;
  createdByUserId?: string;
  createdByName?: string;
}

// 2. ATTENDANCE MODULE
export interface AttendanceRecord {
  id: string;
  church_id?: string;
  churchId?: string;
  date: string;
  serviceName: string; // "Sunday 9AM Service", "Wednesday Prayer", "Youth Fellowship"
  presentMemberIds: string[];
  guestCount: number;
  notes?: string;
  recordedBy: string;
}

// 4. EVENT CALENDAR MODULE
export interface ChurchEvent {
  id: string;
  church_id?: string;
  churchId?: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:00 AM"
  location: string; // e.g. "Main Sanctuary", "Fellowship Hall"
  category: 'Service' | 'Fellowship' | 'Youth' | 'Conference' | 'Outreach' | 'Meeting';
  rsvpMemberIds: string[];
  imageUrl?: string;
}

// 6. PUSH NOTIFICATIONS MODULE
export interface AppNotification {
  id: string;
  church_id?: string;
  churchId?: string;
  title: string;
  message: string;
  category: 'Announcement' | 'Prayer' | 'Event' | 'Emergency' | 'Devotional' | 'Ministry' | 'Roster' | 'Activity';
  date: string;
  read: boolean;
  readByUserIds?: string[];
  linkTab?: string;
  createdByUserId?: string;
  authorName?: string;
  targetUserIds?: string[]; // Specific SaaSUser IDs targeted
  targetMemberIds?: string[]; // Specific Member IDs targeted
  excludeUserIds?: string[]; // User IDs excluded (e.g. creator)
  excludeMemberIds?: string[]; // Member IDs excluded
  metadata?: {
    ministryId?: string;
    ministryName?: string;
    teamId?: string;
    teamName?: string;
    activityId?: string;
    activityName?: string;
    rosterId?: string;
    memberId?: string;
    memberName?: string;
    actionType?: 'member_added' | 'activity_scheduled' | 'roster_created' | 'roster_confirmed' | 'announcement';
    [key: string]: any;
  };
}

// 8. PASTOR ANNOUNCEMENTS MODULE
export interface PastorAnnouncement {
  id: string;
  church_id?: string;
  churchId?: string;
  title: string;
  content: string;
  authorName: string; // e.g. "Pastor David Johnson"
  date: string;
  isPinned: boolean;
  category: 'General' | 'Sunday Bulletin' | 'Ministry Alert' | 'Emergency';
  audioUrl?: string;
}

// 11. MULTI-TENANT SAAS & ROLES MODULE
export type SaaSUserRole = 
  | 'SuperAdmin' 
  | 'PastorAdmin' 
  | 'AssistantPastor'
  | 'TreasurerStaff' 
  | 'MinistryLeader' 
  | 'CellGroupLeader'
  | 'SundaySchoolTeacher'
  | 'Member' 
  | 'Volunteer';

export interface ChurchTenant {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  denomination: string;
  logoUrl?: string;
  pastorName: string;
  contactPhone: string;
  whatsappNumber: string;
  currency: string;
  subscriptionPlan: 'Free Tier' | 'Growth Church' | 'Enterprise Multi-Campus';
  totalMembersCount?: number;
}

export interface SaaSUser {
  id: string;
  church_id: string;
  churchId?: string;
  member_id?: string; // Link to Church Member ID
  memberId?: string;  // Link to Church Member ID
  username: string;
  password?: string;
  name: string;
  email: string;
  phone: string;
  role: SaaSUserRole;
  avatarUrl?: string;
  designation?: string;
  status?: 'Active' | 'Suspended';
  createdAt?: string;
  assignedBy?: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: SaaSUser;
  church?: ChurchTenant;
  loginTime?: string;
  loginTimestamp?: string;
  token?: string;
  expiresAt?: string;
}

// 12. SUNDAY SCHOOL & CHILDREN'S MINISTRY MODULE
export interface SundaySchoolClass {
  id: string;
  church_id?: string;
  churchId?: string;
  className: string; // e.g., "Little Lambs (3-6 yrs)", "Bible Explorers (7-11 yrs)", "Teens in Christ (12-15 yrs)"
  ageGroup: string;
  teacherName: string;
  teacherPhone: string;
  roomNumber: string;
  currentLesson: string;
  memoryVerse: string;
}

export interface SundaySchoolStudent {
  id: string;
  church_id?: string;
  churchId?: string;
  classId: string;
  studentName: string;
  age: number;
  parentName: string;
  parentPhone: string;
  allergiesMedicalNotes?: string;
  attendancePresentCount: number;
  badges: string[]; // e.g. "Verse Master", "Perfect Attendance", "Helper"
}

export interface SundaySchoolAttendanceRecord {
  id: string;
  church_id?: string;
  churchId?: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  presentStudentIds: string[];
  absentStudentIds: string[];
  guestCount: number;
  lessonTaught?: string;
  memoryVerse?: string;
  notes?: string;
  recordedBy: string;
  createdAt?: string;
}

// 13. WHATSAPP REMINDERS & MESSAGING MODULE
export interface WhatsAppReminderTemplate {
  id: string;
  church_id?: string;
  churchId?: string;
  title: string;
  category: 'Service Reminder' | 'Prayer Alert' | 'Sunday School' | 'Attendance Follow-up' | 'Tithe Receipt' | 'General Announcement' | 'Event Invitation' | 'Custom' | string;
  templateText: string;
}

export interface WhatsAppGroup {
  id: string;
  church_id?: string;
  churchId?: string;
  name: string;
  category: 'General' | 'Leadership' | 'Youth' | 'Worship' | 'Sunday School' | 'Prayer Warriors' | 'Women' | 'Men' | 'Custom' | string;
  description?: string;
  inviteLink?: string; // e.g. https://chat.whatsapp.com/...
  memberCount?: number;
  leaderName?: string;
  color?: string;
  createdAt?: string;
}

// 14. CHURCH SETTINGS & CONFIGURATION MODULE
export interface ChurchServiceConfig {
  id: string;
  name: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // e.g. "09:00 AM"
  endTime?: string;   // e.g. "10:30 AM"
  location: string;  // e.g. "Main Sanctuary"
  isActive: boolean;
  description?: string;
  order: number;
}

export interface ChurchMinistryConfig {
  id: string;
  name: string;
  description: string;
  leaderName: string;
  leaderEmail?: string;
  leaderPhone?: string;
  leaderMemberId?: string;
  color: string;
  icon: string;
  isActive: boolean;
  requiredSkills?: string[];
  meetingSchedule?: string;
  order: number;
}

export interface ChurchMemberTypeConfig {
  type: string;
  displayName: string;
  description?: string;
  isEnabled: boolean;
  colorBadge?: string;
}

export interface ChurchMemberSettingsConfig {
  memberTypes: ChurchMemberTypeConfig[];
  allowedStatuses: string[];
  enableBirthdays: boolean;
  enableAnniversaries: boolean;
  enableSkillsTracking: boolean;
  enableEmergencyContacts: boolean;
  enablePastoralNotes: boolean;
  enableFamilyRelationships: boolean;
  requirePhone: boolean;
  requireEmail: boolean;
}

export interface ChurchAttendanceTypeConfig {
  id: string;
  name: string;
  isEnabled: boolean;
}

export interface ChurchAttendanceStatusConfig {
  id: string;
  name: string;
  isEnabled: boolean;
  color: string;
}

export interface ChurchAttendanceSettingsConfig {
  attendanceTypes: ChurchAttendanceTypeConfig[];
  attendanceStatuses: ChurchAttendanceStatusConfig[];
  enableGuestTracking: boolean;
  enableTemperatureTag: boolean;
  enableNotes: boolean;
  defaultView: 'take' | 'history' | 'summary';
}

export interface ChurchNotificationSettingsConfig {
  channels: {
    whatsapp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  preferences: {
    eventReminders: boolean;
    eventReminderLeadTime: '1_day' | '2_hours' | '1_hour';
    attendanceNotifications: boolean;
    birthdayNotifications: boolean;
    prayerNotifications: boolean;
    sundaySchoolNotifications: boolean;
    ministryNotifications: boolean;
    generalAnnouncements: boolean;
  };
}

export interface ChurchLocalizationConfig {
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml';
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
}

export interface ChurchAppearanceConfig {
  logoUrl: string;
  shortName: string;
  accentColor: string;
  themeMode: 'system' | 'light' | 'dark';
  headerTitleDisplay: 'full' | 'short' | 'with_tagline';
}

export interface ChurchSecurityConfig {
  directoryVisibility: 'public' | 'members_only' | 'leaders_only';
  prayerModeration: 'auto_publish' | 'pastor_approval';
  allowMemberSelfRegistration: boolean;
  rosterVisibility: 'all_members' | 'volunteers_only';
  sessionTimeout: '15m' | '30m' | '1h' | '1d' | 'indefinite';
}

export interface ChurchModuleToggles {
  dashboard: boolean;     // Dashboard & Church Analytics
  reports: boolean;       // Reports & Analytics Module
  visitors: boolean;      // Visitor Management & Follow-up
  ministries: boolean;    // Ministries Module
  groups: boolean;        // Small Groups & Life Groups
  directory: boolean;     // Members
  prayers: boolean;       // Prayer
  pastoral: boolean;      // Pastoral Care & Home Visits
  calendar: boolean;      // Events
  sundayschool: boolean;  // Sunday School
  attendance: boolean;    // Attendance
  volunteers: boolean;    // Volunteers
  roster: boolean;        // Roster
  whatsapp: boolean;      // WhatsApp
  announcements: boolean; // Bulletins
  notifications: boolean; // Alerts
  saas: boolean;          // SaaS Console
}

export interface ChurchSystemPreferencesConfig {
  defaultLandingTab: string;
  defaultMemberSort: 'name_asc' | 'name_desc' | 'id_asc' | 'joined_date_desc';
  defaultServiceId: string;
  defaultMinistryId: string;
  moduleToggles: ChurchModuleToggles;
}

export interface CompleteChurchSettings {
  id: string;
  church_id: string;
  profile: {
    name: string;
    shortName: string;
    tagline: string;
    logoUrl: string;
    description?: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    primaryContactName: string;
    primaryContactPhone: string;
    primaryContactEmail: string;
    denomination?: string;
  };
  services: ChurchServiceConfig[];
  ministries: ChurchMinistryConfig[];
  memberSettings: ChurchMemberSettingsConfig;
  attendanceSettings: ChurchAttendanceSettingsConfig;
  notificationSettings: ChurchNotificationSettingsConfig;
  localization: ChurchLocalizationConfig;
  appearance: ChurchAppearanceConfig;
  security: ChurchSecurityConfig;
  preferences: ChurchSystemPreferencesConfig;
  updatedAt: string;
  updatedBy?: string;
}

