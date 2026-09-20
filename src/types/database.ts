// ==============================================================================
// Database TypeScript Schema Definitions - Phase 1, 2 & 3
// ==============================================================================

export type UserRole =
  | 'super_admin'
  | 'pastor'
  | 'church_admin'
  | 'ministry_leader'
  | 'group_leader'
  | 'cell_group_leader'
  | 'volunteer'
  | 'member';

export type MemberStatus =
  | 'active'
  | 'inactive'
  | 'transferred'
  | 'moved_away'
  | 'archived'
  | 'pending';

export type OrgStatus = 'active' | 'inactive' | 'paused' | 'archived';

export type MaritalStatus = 'single' | 'married' | 'widowed' | 'divorced' | 'separated';

export type Gender = 'male' | 'female' | 'other' | '';

export type FamilyRelationship = 'head' | 'spouse' | 'child' | 'parent' | 'other';

export type VisitorStatus =
  | 'new'
  | 'contact_pending'
  | 'contacted'
  | 'follow_up_required'
  | 'follow_up_scheduled'
  | 'follow_up_completed'
  | 'returned_visitor'
  | 'connected'
  | 'regular_attender'
  | 'regular_attendee'
  | 'became_member'
  | 'not_interested'
  | 'inactive';

export type VolunteerStatus = 'active' | 'inactive' | 'pending';

export type AssignmentStatus = 'scheduled' | 'confirmed' | 'declined' | 'completed';

export type FollowUpPriority = 'low' | 'medium' | 'high' | 'urgent';
export type FollowUpStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type FollowUpType =
  | 'new_visitor'
  | 'new_member'
  | 'baptism'
  | 'counseling'
  | 'hospital_visit'
  | 'home_visit'
  | 'prayer_request'
  | 'missing_member'
  | 'new_family'
  | 'other';

export type ContactMethod =
  | 'phone_call'
  | 'in_person'
  | 'home_visit'
  | 'hospital_visit'
  | 'email'
  | 'text_sms'
  | 'video_call'
  | 'meeting'
  | 'other';

export type PrayerPrivacy = 'private' | 'pastor_only' | 'prayer_team' | 'church_wide';

export type PrayerStatus = 'new' | 'praying' | 'answered' | 'closed';

export type PrayerCategory =
  | 'healing'
  | 'family'
  | 'spiritual_growth'
  | 'guidance'
  | 'financial'
  | 'salvation'
  | 'grief'
  | 'praise'
  | 'general'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'cheque'
  | 'card'
  | 'online'
  | 'other';

export type DonationStatus =
  | 'completed'
  | 'pending'
  | 'failed'
  | 'refunded'
  | 'archived';

export type FinanceEntityType = 'donation' | 'fund';

export type FinanceActionType = 'created' | 'updated' | 'archived' | 'deleted' | 'restored';

export type AnnouncementAudience =
  | 'everyone'
  | 'members'
  | 'ministry'
  | 'group'
  | 'volunteers'
  | 'youth'
  | 'parents'
  | 'new_members';

export type AnnouncementStatus =
  | 'draft'
  | 'published'
  | 'scheduled'
  | 'expired'
  | 'archived';

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';

export type NotificationCategory =
  | 'new_visitor'
  | 'new_prayer_request'
  | 'follow_up_due'
  | 'follow_up_overdue'
  | 'event_reminder'
  | 'volunteer_assignment'
  | 'announcement'
  | 'system_notification';

export type ChildGender = 'male' | 'female' | 'other';

export type ChildStatus = 'active' | 'graduated' | 'inactive';

export type ChildAttendanceStatus = 'checked_in' | 'checked_out' | 'absent';

export type YouthStatus = 'active' | 'graduated' | 'alumni' | 'inactive';

export type EventType =
  | 'Sunday Service'
  | 'Conference'
  | 'Prayer Meeting'
  | 'Bible Study'
  | 'Youth Event'
  | "Children's Event"
  | 'Outreach'
  | 'Retreat'
  | 'Meeting'
  | 'Other';

export type EventStatus = 'published' | 'draft' | 'cancelled' | 'completed';

export type RegistrationStatus = 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in';

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'first_time_visitor';

export type AttendanceSessionType =
  | 'Sunday Service'
  | 'Bible Study'
  | 'Prayer Meeting'
  | 'Youth Meeting'
  | "Children's Meeting"
  | 'Small Groups'
  | 'Special Events';

export type CheckInType = 'in_person' | 'qr_scan' | 'kiosk' | 'manual_roster';

export interface ServiceTiming {
  id: string;
  name: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  time: string;
  type: string;
}

export interface ChurchBranding {
  primary_color: string;
  secondary_color?: string;
  accent_color?: string;
  banner_url?: string | null;
}

export interface ChurchFeatureFlags {
  online_giving: boolean;
  attendance_tracking: boolean;
  prayer_requests: boolean;
  volunteer_scheduling: boolean;
  check_in_kiosk: boolean;
  sms_notifications: boolean;
  [key: string]: boolean;
}

export interface Church {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  gender?: Gender;
  dob?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
  marital_status?: MaritalStatus;
  marriage_date?: string | null;
  occupation?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChurchMember {
  id: string;
  church_id: string;
  user_id: string;
  role: UserRole;
  status: MemberStatus;
  membership_number: string | null;
  membership_date: string | null;
  joined_date?: string | null;
  baptism_date?: string | null;
  salvation_date?: string | null;
  previous_church?: string | null;
  title: string | null;
  notes: string | null;
  ministry_id?: string | null;
  group_id?: string | null;
  family_id?: string | null;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  church?: Church;
  family?: Family | null;
  ministry?: Ministry | null;
  group?: Group | null;
}

export interface Family {
  id: string;
  church_id: string;
  family_name: string;
  primary_contact_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  primary_contact?: Profile | null;
  members?: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  church_id: string;
  family_id: string;
  user_id: string;
  relationship: FamilyRelationship;
  is_emergency_contact: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  church_member?: ChurchMember;
}

export interface Ministry {
  id: string;
  church_id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  assistant_leader_id?: string | null;
  status: OrgStatus;
  meeting_schedule?: string | null;
  email?: string | null;
  phone?: string | null;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  leader?: Profile | null;
  assistant_leader?: Profile | null;
  members?: MinistryMember[];
  member_count?: number;
  volunteer_count?: number;
}

export interface MinistryMember {
  id: string;
  church_id: string;
  ministry_id: string;
  user_id: string;
  member_id: string | null;
  role: string; // e.g. Director, Vocalist, Musician, Sound Tech, Teacher
  status: OrgStatus;
  joined_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  church_member?: ChurchMember;
}

export interface Group {
  id: string;
  church_id: string;
  ministry_id: string | null;
  name: string;
  description: string | null;
  leader_id: string | null;
  leader_name?: string | null;
  co_leader_id: string | null;
  assistant_leader_id?: string | null;
  assistant_leader_name?: string | null;
  category?: string;
  group_type?: string;
  terminology?: string; // e.g. 'Small Group', 'Cell Group', 'Home Group', 'Life Group', 'Bible Study Group'
  status: OrgStatus;
  meeting_day: string | null;
  meeting_time: string | null;
  frequency: string;
  meeting_frequency?: string;
  location: string | null;
  address: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  leader?: Profile | null;
  assistant_leader?: Profile | null;
  ministry?: Ministry | null;
  members?: GroupMember[];
  member_count?: number;
  meetings_count?: number;
  average_attendance_rate?: number;
}

export interface GroupMember {
  id: string;
  church_id: string;
  group_id: string;
  user_id: string;
  member_id: string | null;
  role: string; // Leader, Co-Leader, Host, Member, Coordinator
  status: OrgStatus;
  joined_date: string;
  left_date?: string | null;
  reason_left?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  church_member?: ChurchMember;
}

export interface GroupMeeting {
  id: string;
  church_id: string;
  group_id: string;
  meeting_date: string;
  start_time?: string;
  end_time?: string;
  topic?: string | null;
  scripture_reference?: string | null;
  notes?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_by?: string | null;
  created_at: string;
  // Joined fields
  group?: Group | null;
  attendance_record?: GroupAttendanceRecord | null;
}

export interface GroupMemberHistory {
  id: string;
  church_id: string;
  group_id: string;
  member_id: string;
  role: string;
  status: string;
  joined_date: string;
  left_date?: string | null;
  reason_left?: string | null;
  created_at: string;
  // Joined fields
  group?: Group | null;
  member?: ChurchMember | null;
}

export interface MinistryMemberHistory {
  id: string;
  church_id: string;
  ministry_id: string;
  member_id: string;
  role: string;
  status: string;
  joined_date: string;
  left_date?: string | null;
  created_at: string;
  // Joined fields
  ministry?: Ministry | null;
  member?: ChurchMember | null;
}

export interface Volunteer {
  id: string;
  church_id: string;
  user_id: string;
  member_id: string | null;
  skills: string[];
  availability: string[];
  preferred_service: string | null;
  status: VolunteerStatus;
  background_check_status?: string;
  background_check_date?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  church_member?: ChurchMember;
  assignments?: VolunteerAssignment[];
}

export interface VolunteerAssignment {
  id: string;
  church_id: string;
  volunteer_id: string;
  ministry_id: string | null;
  service_timing_id: string | null;
  event_name: string;
  assignment_date: string;
  start_time: string;
  end_time?: string | null;
  location: string;
  responsibility: string; // e.g. Front Door Greeter, Lead Vocals, Audio Tech, Nursery
  status: AssignmentStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  volunteer?: Volunteer;
  ministry?: Ministry | null;
}

export interface GroupAttendanceRecord {
  id: string;
  church_id: string;
  group_id: string;
  session_date: string;
  topic?: string | null;
  notes?: string | null;
  attendee_ids: string[]; // member_ids
  total_present: number;
  created_at: string;
}

export interface GroupAnnouncement {
  id: string;
  church_id: string;
  group_id: string;
  author_id: string;
  author_name?: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export interface MinistryEvent {
  id: string;
  church_id: string;
  ministry_id: string;
  title: string;
  description?: string | null;
  event_date: string;
  start_time: string;
  end_time?: string | null;
  location: string;
  type: 'rehearsal' | 'meeting' | 'service' | 'workshop' | 'outreach';
  attendee_count?: number;
  created_at: string;
}


export interface ChurchSettings {
  id: string;
  church_id: string;
  service_timings: ServiceTiming[];
  general_settings: Record<string, any>;
  feature_flags: ChurchFeatureFlags;
  branding: ChurchBranding;
  created_at: string;
  updated_at: string;
}

export interface VisitorVisit {
  id: string;
  church_id: string;
  visitor_id: string;
  visit_date: string;
  service_attended?: string | null;
  event_id?: string | null;
  invited_by?: string | null;
  source?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Visitor {
  id: string;
  church_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  visit_date: string;
  first_visit_date?: string | null;
  last_visit_date?: string | null;
  visit_count?: number;
  preferred_contact_method?: string | null;
  preferred_contact_time?: string | null;
  gender?: string | null;
  dob?: string | null;
  service_attended: string | null;
  invited_by: string | null;
  heard_about: string | null;
  family_size: number;
  prayer_request: string | null;
  notes: string | null;
  status: VisitorStatus;
  assigned_to: string | null;
  converted_member_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_leader?: Profile | null;
  visits?: VisitorVisit[];
}

export interface FollowUpHistory {
  id: string;
  church_id: string;
  follow_up_id: string;
  contact_date: string;
  person_contacted: string;
  contact_method: ContactMethod | string;
  notes: string;
  user_id: string | null;
  user_name: string;
  user_role?: string | null;
  next_action: string | null;
  created_at: string;
}

export interface FollowUp {
  id: string;
  church_id: string;
  visitor_id: string | null;
  member_id: string | null;
  prayer_request_id?: string | null;
  person_name?: string | null;
  person_phone?: string | null;
  person_email?: string | null;
  assigned_to: string | null;
  type: FollowUpType;
  title: string;
  notes: string | null;
  due_date: string | null;
  completed_at: string | null;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  outcome: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_profile?: Profile | null;
  visitor?: Visitor | null;
  member?: ChurchMember | null;
  history?: FollowUpHistory[];
}

export interface ChurchEvent {
  id: string;
  church_id: string;
  name: string;
  description: string | null;
  event_type: EventType;
  start_date: string; // ISO datetime e.g. 2026-08-28T18:00:00Z
  end_date: string; // ISO datetime e.g. 2026-08-28T21:00:00Z
  location: string;
  address?: string | null;
  organizer_id: string | null;
  ministry_id: string | null;
  group_id: string | null;
  capacity: number | null;
  registration_required: boolean;
  registration_deadline: string | null;
  status: EventStatus;
  banner_url?: string | null;
  qr_code_identifier: string;
  is_featured?: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  organizer?: Profile | null;
  ministry?: Ministry | null;
  group?: Group | null;
  registrations?: EventRegistration[];
  registration_count?: number;
  attendee_count?: number;
}

export interface EventRegistration {
  id: string;
  church_id: string;
  event_id: string;
  member_id: string | null;
  visitor_id: string | null;
  attendee_name: string;
  attendee_email: string | null;
  attendee_phone: string | null;
  ticket_count: number;
  status: RegistrationStatus;
  notes: string | null;
  registered_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  event?: ChurchEvent | null;
  member?: ChurchMember | null;
  visitor?: Visitor | null;
}

export interface AttendanceRecord {
  id: string;
  church_id: string;
  member_id: string | null;
  visitor_id?: string | null;
  event_id?: string | null;
  group_id?: string | null;
  ministry_id?: string | null;
  service_timing_id: string | null;
  session_type?: AttendanceSessionType | string;
  service_name: string;
  service_date: string;
  check_in_time: string;
  check_in_type: CheckInType | string;
  status?: AttendanceStatus;
  temperature_tag?: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  member?: ChurchMember | null;
  visitor?: Visitor | null;
  event?: ChurchEvent | null;
  group?: Group | null;
  ministry?: Ministry | null;
}

export interface DonationFund {
  id: string;
  church_id: string;
  name: string;
  code: string;
  description: string | null;
  target_amount: number | null;
  current_balance: number;
  is_default: boolean;
  is_active: boolean;
  is_tax_deductible: boolean;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  church_id: string;
  member_id: string | null;
  fund_id?: string | null;
  donor_name: string;
  donor_email: string | null;
  donor_phone?: string | null;
  amount: number;
  currency: string;
  fund_name: string;
  payment_method: PaymentMethod | string;
  reference_number: string | null;
  donation_date: string;
  status: DonationStatus | string;
  is_tax_deductible: boolean;
  notes: string | null;
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at?: string;
  // Joined fields
  member?: ChurchMember | null;
  fund?: DonationFund | null;
  recorded_profile?: Profile | null;
}

export interface FinanceAuditLog {
  id: string;
  church_id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  action: FinanceActionType;
  user_id: string | null;
  user_name: string;
  user_role?: string | null;
  previous_value?: any | null;
  new_value?: any | null;
  notes?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface PrayerNote {
  id: string;
  church_id: string;
  prayer_request_id: string;
  author_id: string | null;
  author_name: string;
  author_role?: string | null;
  note: string;
  created_at: string;
}

export type TestimonyPermission = 'anonymous' | 'public' | 'private';
export type PrayerModerationStatus = 'pending' | 'approved' | 'rejected';

export interface PrayerRequest {
  id: string;
  church_id: string;
  member_id: string | null;
  author_name: string;
  author_email?: string | null;
  author_phone?: string | null;
  title: string;
  request: string;
  description?: string; // alias of request
  category: string;
  privacy: PrayerPrivacy;
  is_confidential?: boolean;
  status: PrayerStatus;
  is_answered: boolean;
  assigned_team_id: string | null;
  assigned_to: string | null;
  notes: string | null;
  praise_report: string | null;
  testimony_notes?: string | null;
  testimony_permission?: TestimonyPermission;
  moderation_status?: PrayerModerationStatus;
  moderated_by?: string | null;
  moderated_at?: string | null;
  is_anonymous?: boolean;
  prayer_count: number;
  prayed_user_ids?: string[];
  created_at: string;
  updated_at: string;
  // Joined fields
  member?: ChurchMember | null;
  assigned_profile?: Profile | null;
  assigned_ministry?: Ministry | null;
  prayer_notes?: PrayerNote[];
}

export type PastoralCareType =
  | 'pastoral_visit'
  | 'counseling'
  | 'hospital_visit'
  | 'bereavement'
  | 'crisis'
  | 'general_checkin';

export type PastoralCareStage =
  | 'initial_contact'
  | 'in_progress'
  | 'scheduled_followup'
  | 'resolved'
  | 'referred';

export type PastoralCareConfidentiality = 'pastor_only' | 'pastoral_team' | 'care_leaders';

export interface PastoralCare {
  id: string;
  church_id: string;
  person_id?: string | null;
  person_type: 'member' | 'visitor';
  person_name: string;
  person_email?: string | null;
  person_phone?: string | null;
  care_type: PastoralCareType;
  stage: PastoralCareStage;
  priority: FollowUpPriority;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  confidentiality_level: PastoralCareConfidentiality;
  summary: string;
  private_notes?: string | null;
  safeguarding_flag?: boolean;
  safeguarding_notes?: string | null;
  due_date?: string | null;
  closed_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_profile?: Profile | null;
  logs?: PastoralCareLog[];
}

export interface PastoralCareLog {
  id: string;
  church_id: string;
  pastoral_care_id: string;
  contact_date: string;
  contact_method: ContactMethod | string;
  notes: string;
  author_id?: string | null;
  author_name: string;
  author_role?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  created_at: string;
}

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'system';

export interface Notification {
  id: string;
  church_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  is_read: boolean;
  link: string | null;
  sender_name?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Announcement {
  id: string;
  church_id: string;
  title: string;
  message: string;
  content?: string; // alias for message
  author_id?: string | null;
  author_name: string;
  author_role?: string | null;
  audience: AnnouncementAudience;
  target_ministry_id?: string | null;
  target_group_id?: string | null;
  priority: AnnouncementPriority;
  channels?: string[];
  publish_date: string;
  expiry_date?: string | null;
  status: AnnouncementStatus;
  views_count?: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  ministry?: Ministry | null;
  group?: Group | null;
}

export interface CommunicationCampaign {
  id: string;
  church_id: string;
  title: string;
  channel: CommunicationChannel;
  audience_type: AnnouncementAudience;
  subject?: string | null;
  content: string;
  sender_name?: string | null;
  sender_email?: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_for?: string | null;
  sent_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ChildrenClass {
  id: string;
  church_id: string;
  name: string;
  description?: string | null;
  age_range_min: number;
  age_range_max: number;
  room_number?: string | null;
  max_capacity?: number | null;
  lead_teacher_id?: string | null;
  lead_teacher_name?: string | null;
  color?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  lead_teacher?: ChurchMember | null;
  students_count?: number;
}

export interface Child {
  id: string;
  church_id: string;
  child_name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: ChildGender;
  parent_guardian_id?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  allergies_medical_notes?: string | null;
  security_pin?: string | null;
  photo_url?: string | null;
  status: ChildStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  parent_guardian?: ChurchMember | null;
  class?: ChildrenClass | null;
}

export interface ChildAttendance {
  id: string;
  church_id: string;
  child_id: string;
  class_id: string;
  session_date: string;
  check_in_time: string;
  check_out_time?: string | null;
  checked_in_by?: string | null;
  checked_out_by?: string | null;
  status: ChildAttendanceStatus;
  security_code?: string | null;
  notes?: string | null;
  created_at: string;
  // Joined fields
  child?: Child | null;
  class?: ChildrenClass | null;
}

export interface YouthProfile {
  id: string;
  church_id: string;
  member_id?: string | null;
  name: string;
  grade?: string | null;
  school_name?: string | null;
  date_of_birth?: string | null;
  gender: ChildGender;
  phone?: string | null;
  email?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
  emergency_contact?: string | null;
  baptism_status?: string | null;
  mentor_id?: string | null;
  mentor_name?: string | null;
  group_id?: string | null;
  status: YouthStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  member?: ChurchMember | null;
  group?: Group | null;
  mentor?: ChurchMember | null;
}

export interface YouthEvent {
  id: string;
  church_id: string;
  title: string;
  description?: string | null;
  event_type: string;
  start_time: string;
  end_time?: string | null;
  location?: string | null;
  lead_leader_name?: string | null;
  target_grades?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  church_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: Profile | null;
}
