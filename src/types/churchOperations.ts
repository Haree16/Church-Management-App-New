/**
 * Church Operations & WhatsApp Communication Types
 * Phase 3: AI Church Operations, Automated Notifications, and Official Meta WhatsApp Integration
 */

export type WhatsAppMessageStatus = 
  | 'queued' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed' 
  | 'opted_out';

export type WhatsAppEnvironment = 'unconfigured' | 'sandbox' | 'production';

export interface WhatsAppProviderConfig {
  churchId: string;
  environment: WhatsAppEnvironment;
  phoneNumberId: string; // Meta Graph API Phone Number ID
  wabaId: string;        // WhatsApp Business Account ID
  accessToken: string;   // Meta System User Permanent Token (kept secure)
  displayPhoneNumber: string; // e.g. +91 98765 43210
  webhookVerifyToken: string;
  statusCallbackUrl?: string;
  optOutKeywords: string[]; // default: ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL']
  optInKeywords: string[];  // default: ['START', 'SUBSCRIBE', 'JOIN', 'YES']
  updatedAt: string;
  updatedBy?: string;
}

export interface WhatsAppMessageRecord {
  id: string; // Message ID e.g. `wam_1728492000_abcd`
  churchId: string;
  idempotencyKey: string; // Prevents duplicate sends
  recipientPhone: string;
  recipientName: string;
  recipientType: 'member' | 'visitor' | 'volunteer' | 'group' | 'custom';
  recipientId?: string; // Member ID or Visitor ID
  templateName: string; // e.g. 'sunday_service_reminder'
  language: 'en' | 'ta';
  messageBody: string;
  status: WhatsAppMessageStatus;
  providerMessageId?: string; // WAMID from Meta
  failureReason?: string;
  retryCount: number;
  initiatedBy: string; // User Name
  initiatedByRole: string; // User Role
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface WhatsAppOptRecord {
  churchId: string;
  phone: string;
  isOptedOut: boolean;
  optedOutAt?: string;
  optedInAt?: string;
  reason?: string;
  source: 'incoming_keyword' | 'admin_manual' | 'member_profile';
  updatedAt: string;
}

export interface ApprovedWhatsAppTemplate {
  name: string;
  category: 'SERVICE_REMINDER' | 'VISITOR_WELCOME' | 'BIRTHDAY_GREETING' | 'VOLUNTEER_ASSIGNMENT' | 'ANNOUNCEMENT';
  language: 'en' | 'ta';
  title: string;
  description: string;
  bodyTemplate: string;
  variablePlaceholders: string[];
}

export interface BirthdayRecipient {
  memberId: string;
  name: string;
  phone: string;
  phoneMasked?: string;
  birthdateRaw?: string; // YYYY-MM-DD
  birthDayMonth: string;  // e.g. "October 14" (Privacy-protected: year omitted for regular viewers)
  daysUntilBirthday: number;
  isToday: boolean;
  preferredLanguage: 'en' | 'ta';
  hasBeenSentGreetingThisYear: boolean;
}

export interface VolunteerServiceGap {
  id: string;
  serviceDate: string;
  serviceName: string;
  ministryName: string;
  roleName: string;
  assignedMemberId?: string;
  assignedMemberName?: string;
  phone?: string;
  confirmed: boolean;
  isVacant: boolean;
}

export interface VisitorFollowUpItem {
  visitorId: string;
  name: string;
  phone: string;
  visitDate: string;
  serviceAttended: string;
  followUpStatus: 'new' | 'contact_pending' | 'welcome_sent' | 'completed' | 'declined';
  hasConsent: boolean; // Verified communication consent
  assignedVolunteerName?: string;
  draftWelcomeMessageEn: string;
  draftWelcomeMessageTa: string;
}

export interface OperationsDashboardMetrics {
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  totalMessagesFailed: number;
  totalOptedOutCount: number;
  deliverySuccessRatePercent: number;
  providerStatus: WhatsAppEnvironment;
  pendingVisitorFollowUpsCount: number;
  upcomingBirthdaysCount: number;
  upcomingServiceDate: string;
  assignedVolunteersCount: number;
  unfilledVolunteerGapsCount: number;
  recentActivity: Array<{
    id: string;
    timestamp: string;
    description: string;
    type: 'whatsapp_sent' | 'reminder_prepared' | 'visitor_contacted' | 'volunteer_assigned';
    status: 'success' | 'warning' | 'info';
  }>;
  metrics?: {
    totalSentPast30Days: number;
    deliveredCount: number;
    failedCount: number;
    optedOutCount: number;
    deliverySuccessRate: string;
    pendingVisitorFollowUps: number;
    upcomingBirthdaysCount: number;
    unfilledVolunteerGapsCount: number;
  };
}
