import { Member, SaaSUser } from '../types';

export type PrayerMinistryRole = 
  | 'ChurchAdmin'
  | 'PrayerMinistryLeader'
  | 'PrayerGroupLeader'
  | 'PrayerTeamMember'
  | 'NormalBeliever';

export type PrayerRequestPrivacy = 
  | 'private'           // Private to requester only (DEFAULT)
  | 'prayer_leaders'    // Shared with Prayer Ministry Leaders & Pastors
  | 'group'             // Shared with members of an explicitly selected prayer group
  | 'church_wide';      // Publicly visible on Congregation Prayer Wall

export type PrayerCategoryType =
  | 'Health & Healing'
  | 'Family & Relationships'
  | 'Spiritual Growth'
  | 'Church & Leadership'
  | 'Community & Nations'
  | 'Guidance & Faith'
  | 'Financial & Work'
  | 'Praise & Thanksgiving'
  | 'Other Special Need';

export interface PrayerFollowUpNote {
  id: string;
  prayer_request_id: string;
  author_id?: string;
  author_name: string;
  author_role: string;
  note: string;
  created_at: string;
}

export interface EnhancedPrayerRequest {
  id: string;
  church_id: string;
  member_id?: string;
  author_name: string;
  author_email?: string;
  author_phone?: string;
  title: string;
  description: string;
  category: PrayerCategoryType | string;
  privacy: PrayerRequestPrivacy;
  target_group_id?: string;
  target_group_name?: string;
  status: 'Active' | 'Urgent' | 'Answered' | 'Archived';
  prayer_count: number;
  prayed_user_ids: string[];
  follow_up_notes: PrayerFollowUpNote[];
  is_answered: boolean;
  answered_date?: string;
  testimony?: string;
  testimony_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrayerGroup {
  id: string;
  church_id: string;
  name: string;
  description: string;
  leader_id?: string;
  leader_name: string;
  leader_email?: string;
  leader_phone?: string;
  co_leader_id?: string;
  co_leader_name?: string;
  meeting_day: string;
  meeting_time: string;
  frequency: 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Daily';
  meeting_type: 'In-Person' | 'Online' | 'Hybrid';
  location?: string;
  online_url?: string;
  topics: string[];
  status: 'Active' | 'Inactive';
  visibility: 'Open' | 'Request to Join' | 'Invite Only';
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface PrayerGroupMember {
  id: string;
  church_id: string;
  group_id: string;
  member_id: string;
  member_name: string;
  member_email?: string;
  member_phone?: string;
  avatar_url?: string;
  role: 'Leader' | 'Co-Leader' | 'Intercessor' | 'Member';
  status: 'Active' | 'Pending';
  joined_at: string;
}

export interface PrayerGroupAttendanceRecord {
  id: string;
  church_id: string;
  group_id: string;
  session_date: string;
  topic?: string | null;
  notes?: string | null;
  attendee_ids: string[]; // member_ids of present members
  total_present: number;
  created_at: string;
}

export interface PrayerMeetingAttendanceRecord {
  member_id: string;
  member_name: string;
  present: boolean;
  recorded_at?: string;
}

export interface PrayerMeeting {
  id: string;
  church_id: string;
  group_id?: string;
  group_name?: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time?: string;
  meeting_type: 'In-Person' | 'Online' | 'Hybrid';
  location?: string;
  online_url?: string;
  organizer_id?: string;
  organizer_name: string;
  attendee_ids: string[];
  attendance_enabled: boolean;
  attendance_records: PrayerMeetingAttendanceRecord[];
  is_cancelled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrayerGuidePoint {
  id: string;
  point_en: string;
  point_ta: string;
  category?: string;
}

export interface PrayerGuide {
  id: string;
  church_id: string;
  title: string;
  title_ta?: string;
  date: string;
  theme: string;
  theme_ta?: string;
  scripture_reference: string;
  scripture_text_en: string;
  scripture_text_ta?: string;
  reflection_en: string;
  reflection_ta?: string;
  prayer_points: PrayerGuidePoint[];
  author_name: string;
  author_role: string;
  status: 'Published' | 'Draft';
  created_at: string;
  updated_at: string;
}

export interface PrayerMinistryPermissions {
  isChurchAdmin: boolean;
  isMinistryLeader: boolean;
  isGroupLeader: boolean;
  isIntercessor: boolean;
  canManageGroups: boolean;
  canManageMeetings: boolean;
  canRecordAttendance: boolean;
  canPublishPrayerGuide: boolean;
  canViewSharedWithLeadersRequests: boolean;
  canRecordFollowUp: boolean;
  canModerateTestimonies: boolean;
}
