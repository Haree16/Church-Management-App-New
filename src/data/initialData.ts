import { 
  Member, PrayerRequest, MinistryTeamInfo, RosterAssignment,
  AttendanceRecord, ChurchEvent, AppNotification, PastorAnnouncement,
  ChurchTenant, SaaSUser, SundaySchoolClass, SundaySchoolStudent, SundaySchoolAttendanceRecord, WhatsAppReminderTemplate,
  WhatsAppGroup,
  CompleteChurchSettings,
  ChurchMinistry, MinistryMember, MinistryTeam, MinistryTeamMember,
  MinistryActivity, MinistryAnnouncement
} from '../types';

export const INITIAL_CHURCHES: ChurchTenant[] = [
  {
    id: 'church-1',
    name: 'New Creation Assembly Church',
    code: 'NCA-CHE',
    city: 'Chennai',
    state: 'Tamil Nadu',
    denomination: 'Pentecostal / Charismatic',
    logoUrl: '/nca_church_logo.jpg',
    pastorName: 'Senior Pastor',
    contactPhone: '+91 98401 23456',
    whatsappNumber: '+919840123456',
    currency: 'INR',
    subscriptionPlan: 'Growth Church',
    totalMembersCount: 0
  }
];

export const INITIAL_SAAS_USERS: SaaSUser[] = [
  {
    id: 'user-superadmin',
    church_id: 'church-1',
    churchId: 'church-1',
    member_id: 'mem-superadmin',
    memberId: 'mem-superadmin',
    username: 'superadmin',
    password: 'superadmin123',
    name: 'Universal Super Administrator',
    email: 'superadmin@churchsaas.com',
    phone: '+91 99999 88888',
    role: 'SuperAdmin',
    designation: 'Universal Super Administrator (All Churches)',
    avatarUrl: ''
  }
];

export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_PRAYERS: PrayerRequest[] = [];

export const MINISTRY_TEAMS: MinistryTeamInfo[] = [
  {
    id: 'Worship & Music',
    name: 'Worship & Music',
    leaderName: '',
    leaderEmail: '',
    description: 'Leads congregational worship songs, choir, instruments, and spiritual preparation for services.',
    color: 'bg-amber-500',
    requiredSkills: ['Vocal performance', 'Acoustic/Electric Guitar', 'Keyboard/Harmonium', 'Drums', 'Worship Leader']
  },
  {
    id: 'Hospitality & Welcome',
    name: 'Hospitality & Welcome',
    leaderName: '',
    leaderEmail: '',
    description: 'Greets members at the entrance, assists first-time visitors, prepares fellowship tea & snacks.',
    color: 'bg-emerald-500',
    requiredSkills: ['Greeter Coordination', 'Tea & Refreshment Setup', 'Ushering', 'Visitor Reception']
  },
  {
    id: "Children's Ministry",
    name: "Children's Ministry",
    leaderName: '',
    leaderEmail: '',
    description: 'Provides safe, joyful Sunday school and Bible learning classes for children.',
    color: 'bg-sky-500',
    requiredSkills: ['Sunday School Teacher', 'Storytelling', 'First Aid / CPR', 'Child Supervision']
  },
  {
    id: 'Tech & Media',
    name: 'Tech & Media',
    leaderName: '',
    leaderEmail: '',
    description: 'Operates sound systems, lyrics presentation, YouTube live streams, and stage mics.',
    color: 'bg-indigo-500',
    requiredSkills: ['Sound Mixer', 'Slide Presentation Tech', 'Live Stream Operator', 'Video Editing']
  },
  {
    id: 'Youth Ministry',
    name: 'Youth Ministry',
    leaderName: '',
    leaderEmail: '',
    description: 'Mentors high school and college students through youth fellowship, retreats, and prayer meets.',
    color: 'bg-purple-500',
    requiredSkills: ['Youth Group Leader', 'Camp Organizer', 'Youth Worship', 'Games Coordinator']
  },
  {
    id: 'Outreach & Missions',
    name: 'Outreach & Missions',
    leaderName: '',
    leaderEmail: '',
    description: 'Coordinates community food distribution (Annadhanam), medical camps, and village gospel outreach.',
    color: 'bg-rose-500',
    requiredSkills: ['Food Distribution', 'Hindi / Tamil / English Translation', 'Medical Camp Support']
  },
  {
    id: 'Facilities & Setup',
    name: 'Facilities & Setup',
    leaderName: '',
    leaderEmail: '',
    description: 'Maintains church premises, arranges seating for worship services, and manages repairs.',
    color: 'bg-amber-700',
    requiredSkills: ['Carpentry', 'Setup & Tear Down Crew', 'Electrical / Plumbing', 'General Maintenance']
  },
  {
    id: 'Prayer Team',
    name: 'Prayer Team',
    leaderName: '',
    leaderEmail: '',
    description: 'Intercedes for prayer requests, leads fasting prayer meetings, and holds altar prayer ministry.',
    color: 'bg-teal-600',
    requiredSkills: ['Intercessory Prayer', 'Altar Ministry', 'Fasting Prayer Facilitator']
  }
];

export const INITIAL_ROSTER: RosterAssignment[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_EVENTS: ChurchEvent[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_ANNOUNCEMENTS: PastorAnnouncement[] = [];

export const INITIAL_SUNDAY_SCHOOL_CLASSES: SundaySchoolClass[] = [];

export const INITIAL_SUNDAY_SCHOOL_STUDENTS: SundaySchoolStudent[] = [];

export const INITIAL_SUNDAY_SCHOOL_ATTENDANCE: SundaySchoolAttendanceRecord[] = [];

export const INITIAL_WHATSAPP_TEMPLATES: WhatsAppReminderTemplate[] = [];

export const INITIAL_WHATSAPP_GROUPS: WhatsAppGroup[] = [];

export const INITIAL_CHURCH_SETTINGS: Record<string, CompleteChurchSettings> = {
  'church-1': {
    id: 'cs-church-1',
    church_id: 'church-1',
    profile: {
      name: 'New Creation Assembly Church',
      shortName: 'NCA Church',
      tagline: 'Loving God, Loving People, Serving Chennai',
      logoUrl: '/nca_church_logo.jpg',
      description: 'A vibrant, Christ-centered community committed to preaching the Word, fervent intercessory prayer, and authentic fellowship in Chennai.',
      address: 'No. 12, Mount Road, Anna Salai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600002',
      country: 'India',
      phone: '+91 98401 23456',
      email: 'office@newcreation.org.in',
      website: 'https://newcreation.org.in',
      primaryContactName: 'Church Administration',
      primaryContactPhone: '+91 98401 23456',
      primaryContactEmail: 'office@newcreation.org.in',
      denomination: 'Pentecostal / Charismatic',
    },
    services: [
      {
        id: 'srv-1',
        name: 'Sunday Morning Worship Service',
        day: 'Sunday',
        startTime: '08:30 AM',
        endTime: '10:30 AM',
        location: 'Main Sanctuary',
        isActive: true,
        description: 'Congregational worship, intercession, Holy Communion, and sermon.',
        order: 1,
      },
      {
        id: 'srv-2',
        name: 'Sunday Evening Celebration Service',
        day: 'Sunday',
        startTime: '06:00 PM',
        endTime: '08:00 PM',
        location: 'Main Sanctuary',
        isActive: true,
        description: 'Evening worship and word ministering.',
        order: 2,
      },
      {
        id: 'srv-3',
        name: 'Midweek Fasting & Prayer Meeting',
        day: 'Wednesday',
        startTime: '06:30 PM',
        endTime: '08:00 PM',
        location: 'Prayer Chapel',
        isActive: true,
        description: 'Intercessory prayer for families, sick, and community.',
        order: 3,
      },
    ],
    ministries: [
      {
        id: 'min-1',
        name: 'Worship & Music',
        description: 'Leads congregational worship songs, choir, instruments, and spiritual preparation for services.',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        color: '#f59e0b',
        icon: 'Music',
        isActive: true,
        requiredSkills: ['Vocal performance', 'Acoustic/Electric Guitar', 'Keyboard/Harmonium', 'Drums', 'Worship Leader'],
        meetingSchedule: 'Thursday Rehearsal 6:30 PM & Sunday 8:00 AM Call',
        order: 1,
      },
      {
        id: 'min-2',
        name: 'Hospitality & Welcome',
        description: 'Greets members at the entrance, assists first-time visitors, prepares fellowship tea & snacks.',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        color: '#10b981',
        icon: 'Coffee',
        isActive: true,
        requiredSkills: ['Greeter Coordination', 'Tea & Refreshment Setup', 'Ushering', 'Visitor Reception'],
        meetingSchedule: 'Sunday Morning Shift Rotations',
        order: 2,
      },
      {
        id: 'min-3',
        name: "Children's Ministry",
        description: 'Provides safe, joyful Sunday school and Bible learning classes for children.',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        color: '#0284c7',
        icon: 'GraduationCap',
        isActive: true,
        requiredSkills: ['Sunday School Teacher', 'Storytelling', 'First Aid / CPR', 'Child Supervision'],
        meetingSchedule: 'Sunday 10:00 AM Classes',
        order: 3,
      },
      {
        id: 'min-4',
        name: 'Tech & Media',
        description: 'Operates sound systems, lyrics presentation, YouTube live streams, and stage mics.',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        color: '#6366f1',
        icon: 'Video',
        isActive: true,
        requiredSkills: ['Sound Mixer', 'Slide Presentation Tech', 'Live Stream Operator', 'Video Editing'],
        meetingSchedule: 'Sunday Sound Check 7:45 AM',
        order: 4,
      },
      {
        id: 'min-5',
        name: 'Youth Ministry',
        description: 'Mentors high school and college students through youth fellowship, retreats, and prayer meets.',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        color: '#8b5cf6',
        icon: 'Sparkles',
        isActive: true,
        requiredSkills: ['Youth Group Leader', 'Camp Organizer', 'Youth Worship', 'Games Coordinator'],
        meetingSchedule: 'Friday 7:30 PM & Sunday 6:00 PM',
        order: 5,
      },
      {
        id: 'min-6',
        name: 'Outreach & Missions',
        description: 'Coordinates community food distribution (Annadhanam), medical camps, and village gospel outreach.',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        color: '#f43f5e',
        icon: 'Globe',
        isActive: true,
        requiredSkills: ['Food Distribution', 'Hindi / Tamil / English Translation', 'Medical Camp Support'],
        meetingSchedule: '1st Saturday of Month 9:00 AM',
        order: 6,
      },
      {
        id: 'min-7',
        name: 'Facilities & Setup',
        description: 'Maintains church premises, arranges seating for worship services, and manages repairs.',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        color: '#d97706',
        icon: 'Shield',
        isActive: true,
        requiredSkills: ['Carpentry', 'Setup & Tear Down Crew', 'Electrical / Plumbing', 'General Maintenance'],
        meetingSchedule: 'Saturday 4:00 PM Setup',
        order: 7,
      },
      {
        id: 'min-8',
        name: 'Prayer Team',
        description: 'Intercedes for prayer requests, leads fasting prayer meetings, and holds altar prayer ministry.',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        color: '#0d9488',
        icon: 'Heart',
        isActive: true,
        requiredSkills: ['Intercessory Prayer', 'Altar Ministry', 'Fasting Prayer Facilitator'],
        meetingSchedule: 'Wednesday 7:00 PM & Daily Intercession Chains',
        order: 8,
      },
    ],
    memberSettings: {
      memberTypes: [
        { type: 'Pastor', displayName: 'Senior Pastor', description: 'Ordained pastoral clergy', isEnabled: true, colorBadge: 'bg-amber-100 text-amber-900 border-amber-300' },
        { type: 'Assistant Pastor', displayName: 'Associate / Assistant Pastor', description: 'Assisting pastoral team', isEnabled: true, colorBadge: 'bg-blue-100 text-blue-900 border-blue-300' },
        { type: 'Leader', displayName: 'Ministry Leader / Elder', description: 'Department and team coordinators', isEnabled: true, colorBadge: 'bg-purple-100 text-purple-900 border-purple-300' },
        { type: 'Clergy/Staff', displayName: 'Church Office & Staff', description: 'Administrative staff and officers', isEnabled: true, colorBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
        { type: 'Member', displayName: 'Committed Member', description: 'Baptized, registered church family', isEnabled: true, colorBadge: 'bg-slate-100 text-slate-900 border-slate-300' },
        { type: 'Regular Attender', displayName: 'Regular Attender', description: 'Regular attendee exploring membership', isEnabled: true, colorBadge: 'bg-teal-100 text-teal-900 border-teal-300' },
        { type: 'Visitor', displayName: 'First-Time / Guest Visitor', description: 'New guest visiting services', isEnabled: true, colorBadge: 'bg-rose-100 text-rose-900 border-rose-300' },
        { type: 'Youth', displayName: 'Youth & Young Adult', description: 'Teen and university student members', isEnabled: true, colorBadge: 'bg-sky-100 text-sky-900 border-sky-300' },
      ],
      allowedStatuses: ['Active', 'Inactive', 'Transferred', 'Moved Away', 'Pending', 'Archived'],
      enableBirthdays: true,
      enableAnniversaries: true,
      enableSkillsTracking: true,
      enableEmergencyContacts: true,
      enablePastoralNotes: true,
      enableFamilyRelationships: true,
      requirePhone: true,
      requireEmail: false,
    },
    attendanceSettings: {
      attendanceTypes: [
        { id: 'att-type-1', name: 'Sunday Morning Service', isEnabled: true },
        { id: 'att-type-2', name: 'Sunday School', isEnabled: true },
        { id: 'att-type-3', name: 'Youth Fellowship', isEnabled: true },
        { id: 'att-type-4', name: 'Midweek Prayer Meeting', isEnabled: true },
        { id: 'att-type-5', name: 'Bible Study', isEnabled: true },
        { id: 'att-type-6', name: 'Special Celebration Event', isEnabled: true },
        { id: 'att-type-7', name: 'Ministry Team Meeting', isEnabled: true },
      ],
      attendanceStatuses: [
        { id: 'present', name: 'Present', isEnabled: true, color: '#10b981' },
        { id: 'absent', name: 'Absent', isEnabled: true, color: '#ef4444' },
        { id: 'late', name: 'Late', isEnabled: true, color: '#f59e0b' },
        { id: 'visitor', name: 'Guest / Visitor', isEnabled: true, color: '#3b82f6' },
        { id: 'excused', name: 'Excused / On Leave', isEnabled: true, color: '#8b5cf6' },
      ],
      enableGuestTracking: true,
      enableTemperatureTag: false,
      enableNotes: true,
      defaultView: 'take',
    },
    notificationSettings: {
      channels: {
        whatsapp: true,
        email: true,
        sms: false,
        push: true,
      },
      preferences: {
        eventReminders: true,
        eventReminderLeadTime: '1_day',
        attendanceNotifications: true,
        birthdayNotifications: true,
        prayerNotifications: true,
        sundaySchoolNotifications: true,
        ministryNotifications: true,
        generalAnnouncements: true,
      },
    },
    localization: {
      language: 'en',
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
    },
    appearance: {
      logoUrl: '/nca_church_logo.jpg',
      shortName: 'NCA Church',
      accentColor: '#f59e0b',
      themeMode: 'system',
      headerTitleDisplay: 'full',
    },
    security: {
      directoryVisibility: 'members_only',
      prayerModeration: 'auto_publish',
      allowMemberSelfRegistration: true,
      rosterVisibility: 'all_members',
      sessionTimeout: '1d',
    },
    preferences: {
      defaultLandingTab: 'directory',
      defaultMemberSort: 'name_asc',
      defaultServiceId: 'srv-1',
      defaultMinistryId: 'min-1',
      moduleToggles: {
        dashboard: true,
        reports: true,
        visitors: true,
        ministries: true,
        groups: true,
        directory: true,
        prayers: true,
        pastoral: true,
        calendar: true,
        sundayschool: true,
        attendance: true,
        volunteers: true,
        roster: true,
        whatsapp: true,
        announcements: true,
        notifications: true,
        saas: true,
      },
    },
    updatedAt: new Date().toISOString(),
    updatedBy: 'Universal Super Administrator',
  },
};

// =========================================================================
// 12. COMPREHENSIVE MULTI-TENANT INITIAL MINISTRIES DATA
// =========================================================================

export const INITIAL_MINISTRIES: ChurchMinistry[] = [];
export const INITIAL_MINISTRY_MEMBERS: MinistryMember[] = [];
export const INITIAL_MINISTRY_TEAMS: MinistryTeam[] = [];
export const INITIAL_MINISTRY_TEAM_MEMBERS: MinistryTeamMember[] = [];
export const INITIAL_MINISTRY_ACTIVITIES: MinistryActivity[] = [];
export const INITIAL_MINISTRY_ANNOUNCEMENTS: MinistryAnnouncement[] = [];


