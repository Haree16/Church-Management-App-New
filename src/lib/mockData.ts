import {
  Church,
  ChurchMember,
  ChurchSettings,
  Family,
  FamilyMember,
  Group,
  Ministry,
  Notification,
  Profile,
  Visitor,
  FollowUp,
  AttendanceRecord,
  Donation,
  DonationFund,
  FinanceAuditLog,
  PrayerRequest,
  Announcement,
  CommunicationCampaign,
  ChildrenClass,
  Child,
  ChildAttendance,
  YouthProfile,
  YouthEvent,
  AuditLog,
} from '@/types/database';

export const DEMO_CHURCH: Church = {
  id: 'church-1',
  name: 'New Creation Assembly Church',
  slug: 'nca-church',
  tagline: '',
  logo_url: '/nca_church_logo.jpg',
  email: 'office@newcreation.org.in',
  phone: '+91 98401 23456',
  website: '',
  address: 'No. 12, Mount Road, Anna Salai',
  city: 'Chennai',
  state: 'Tamil Nadu',
  postal_code: '600002',
  country: 'India',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  is_active: true,
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_CHURCH_2: Church = {
  id: 'church-1',
  name: 'New Creation Assembly Church',
  slug: 'nca-church',
  tagline: '',
  logo_url: '/nca_church_logo.jpg',
  email: 'office@newcreation.org.in',
  phone: '+91 98401 23456',
  website: '',
  address: 'No. 12, Mount Road, Anna Salai',
  city: 'Chennai',
  state: 'Tamil Nadu',
  postal_code: '600002',
  country: 'India',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  is_active: true,
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date().toISOString(),
};

export interface DemoUserOption {
  email: string;
  role: 'super_admin' | 'pastor' | 'church_admin' | 'ministry_leader' | 'group_leader' | 'cell_group_leader' | 'volunteer' | 'member';
  name: string;
  title: string;
  avatar: string;
  phone: string;
  id: string;
}

export const DEMO_USERS: DemoUserOption[] = [
  {
    id: 'user-001',
    email: 'admin@newcreation.org.in',
    role: 'super_admin',
    name: 'Rev. Dr. David Paul',
    title: 'Senior Pastor & Super Admin',
    avatar: '',
    phone: '+91 98400 12345',
  },
  {
    id: 'user-002',
    email: 'pastor.mathew@newcreation.org.in',
    role: 'pastor',
    name: 'Pastor Mathew Thomas',
    title: 'Associate Pastor',
    avatar: '',
    phone: '+91 98400 67890',
  },
  {
    id: 'user-003',
    email: 'grace.admin@newcreation.org.in',
    role: 'church_admin',
    name: 'Grace Samuel',
    title: 'Church Administrator',
    avatar: '',
    phone: '+91 98401 11111',
  },
  {
    id: 'user-004',
    email: 'daniel.worship@newcreation.org.in',
    role: 'ministry_leader',
    name: 'Daniel Raj',
    title: 'Worship Ministry Leader',
    avatar: '',
    phone: '+91 98401 22222',
  },
  {
    id: 'user-harris',
    email: 'harris.leader@newcreation.org.in',
    role: 'cell_group_leader',
    name: 'Harris',
    title: 'Cell Group Leader',
    avatar: '',
    phone: '+91 98401 55555',
  },
  {
    id: 'user-mary',
    email: 'mary.member@newcreation.org.in',
    role: 'member',
    name: 'Mary Doe',
    title: 'Church Member (No Ministry)',
    avatar: '',
    phone: '+91 98401 44444',
  },
];

export const DEMO_SETTINGS: ChurchSettings = {
  id: 'cs-001',
  church_id: DEMO_CHURCH.id,
  service_timings: [],
  general_settings: {},
  feature_flags: {
    online_giving: true,
    attendance_tracking: true,
    prayer_requests: true,
    volunteer_scheduling: true,
    check_in_kiosk: true,
    sms_notifications: true,
  },
  branding: {
    primary_color: '#0284c7',
  },
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date().toISOString(),
};

// All mock collections are initialized clean/empty for database connection
export const DEMO_PROFILES: Profile[] = [];
export const DEMO_MEMBERS: ChurchMember[] = [];
export const DEMO_FAMILIES: Family[] = [];
export const DEMO_FAMILY_MEMBERS: FamilyMember[] = [];
export const DEMO_MINISTRIES: Ministry[] = [];
export const DEMO_GROUPS: Group[] = [];
export const DEMO_VOLUNTEERS: any[] = [];
export const DEMO_VISITORS: Visitor[] = [];
export const DEMO_FOLLOW_UPS: FollowUp[] = [];
export const DEMO_EVENTS: any[] = [];
export const DEMO_ATTENDANCE: AttendanceRecord[] = [];
export const DEMO_DONATIONS: Donation[] = [];
export const DEMO_FUNDS: DonationFund[] = [];
export const DEMO_FINANCE_AUDIT: FinanceAuditLog[] = [];
export const DEMO_PRAYER_REQUESTS: PrayerRequest[] = [];
export const DEMO_ANNOUNCEMENTS: Announcement[] = [];
export const DEMO_CAMPAIGNS: CommunicationCampaign[] = [];
export const DEMO_NOTIFICATIONS: Notification[] = [];
export const DEMO_CHILDREN: Child[] = [];
export const DEMO_CLASSES: ChildrenClass[] = [];
export const DEMO_CHILDREN_CLASSES: ChildrenClass[] = [];
export const DEMO_YOUTH: YouthProfile[] = [];
export const DEMO_YOUTH_PROFILES: YouthProfile[] = [];
export const DEMO_YOUTH_EVENTS: YouthEvent[] = [];
export const DEMO_CHILD_ATTENDANCE: ChildAttendance[] = [];
export const DEMO_CHILDREN_ATTENDANCE: ChildAttendance[] = [];
export const DEMO_COMMUNICATION_CAMPAIGNS: CommunicationCampaign[] = [];
export const DEMO_FINANCE_AUDIT_LOGS: FinanceAuditLog[] = [];
export const DEMO_AUDIT_LOGS: AuditLog[] = [];
