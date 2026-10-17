/**
 * Official WhatsApp Business Communication Service
 * Phase 3: Meta Cloud API Integration, Pre-Approved Bilingual Templates,
 * Idempotency, Opt-in/Opt-out Compliance, Delivery Tracking, and Audit Trails.
 */

import { 
  WhatsAppMessageRecord, 
  WhatsAppProviderConfig, 
  WhatsAppOptRecord, 
  ApprovedWhatsAppTemplate,
  WhatsAppMessageStatus 
} from '@/types/churchOperations';
import { auditService } from './auditService';

const CONFIG_STORAGE_KEY = 'nca_church_wa_provider_config';
const HISTORY_STORAGE_KEY = 'nca_church_wa_message_history';
const OPTOUT_STORAGE_KEY = 'nca_church_wa_opt_out_registry';

export const DEFAULT_WHATSAPP_TEMPLATES: ApprovedWhatsAppTemplate[] = [
  {
    name: 'sunday_service_reminder',
    category: 'SERVICE_REMINDER',
    language: 'en',
    title: 'Sunday Worship Service Reminder',
    description: 'Weekly invitation to in-person and livestream worship services.',
    bodyTemplate: `Grace and peace, {MemberName}! ✝️\n\nJoin us this Sunday for *{ServiceName}* at *{ServiceTime}*.\n\n📍 Location: {Location}\n🎤 Speaker: {Speaker}\n🎥 Livestream: {LivestreamLink}\n\nWe look forward to worshipping together! To stop receiving messages, reply STOP.`,
    variablePlaceholders: ['MemberName', 'ServiceName', 'ServiceTime', 'Location', 'Speaker', 'LivestreamLink']
  },
  {
    name: 'sunday_service_reminder',
    category: 'SERVICE_REMINDER',
    language: 'ta',
    title: 'ஞாயிறு ஆராதனை நினைவூட்டல் (Tamil)',
    description: 'ஞாயிறு ஆராதனைக்கான அன்பான அழைப்பு மற்றும் விவரங்கள்.',
    bodyTemplate: `கர்த்தருக்குள் அன்பான {MemberName}, ✝️\n\nஇந்த ஞாயிற்றுக்கிழமை *{ServiceName}* ஆராதனைக்கு உங்களை அன்புடன் அழைக்கிறோம்.\n\n⏰ நேரம்: *{ServiceTime}*\n📍 இடம்: {Location}\n🎤 தேவசெய்தி: {Speaker}\n🎥 நேரலை: {LivestreamLink}\n\nகுடும்பமாக வந்து தேவனைத் துதிப்போம்! செய்திகள் பெற விரும்பவில்லை எனில் STOP என அனுப்பவும்.`,
    variablePlaceholders: ['MemberName', 'ServiceName', 'ServiceTime', 'Location', 'Speaker', 'LivestreamLink']
  },
  {
    name: 'first_visitor_welcome',
    category: 'VISITOR_WELCOME',
    language: 'en',
    title: 'First-Time Visitor Welcome',
    description: 'Personalized pastoral welcome to new church guests.',
    bodyTemplate: `Dear {VisitorName},\n\nThank you for worshipping with us at *{ChurchName}* on {VisitDate}! It was a joy having you with us.\n\nIf you have any prayer requests or would like to connect with our pastoral care team, please reply to this message. We would love to pray with you!\n\nMay God richly bless your week! Reply STOP to opt out.`,
    variablePlaceholders: ['VisitorName', 'ChurchName', 'VisitDate']
  },
  {
    name: 'first_visitor_welcome',
    category: 'VISITOR_WELCOME',
    language: 'ta',
    title: 'புதியவர் வரவேற்பு செய்தி (Tamil)',
    description: 'சபைக்கு முதன்முறையாக வந்த விருந்தினர்களுக்கான நல்வரவு செய்தி.',
    bodyTemplate: `அன்புள்ள {VisitorName},\n\n*{ChurchName}* சபைக்கு வருகை தந்தமைக்கு எங்களது மனமார்ந்த நன்றிகள்! உங்களுடன் இணைந்து தேவனைத் துதித்தது எங்களுக்கு மிகுந்த மகிழ்ச்சி.\n\nதங்களுக்கு ஜெப உதவி தேவைப்பட்டால் தயங்காமல் எங்களுக்குத் தெரிவிக்கவும். கர்த்தர் உங்களையும் உங்கள் குடும்பத்தையும் நிறைவாக ஆசீர்வதிப்பாராக!`,
    variablePlaceholders: ['VisitorName', 'ChurchName', 'VisitDate']
  },
  {
    name: 'birthday_blessing',
    category: 'BIRTHDAY_GREETING',
    language: 'en',
    title: 'Birthday Blessing Greeting',
    description: 'Pastoral birthday greeting and Scripture blessing.',
    bodyTemplate: `Happy Birthday, {MemberName}! 🎂🎉\n\n*{ChurchName}* celebrates you today and thanks God for your life and fellowship!\n\n📖 *"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you."* (Numbers 6:24-25)\n\nWishing you a joyful, blessed year ahead filled with divine favor!`,
    variablePlaceholders: ['MemberName', 'ChurchName']
  },
  {
    name: 'birthday_blessing',
    category: 'BIRTHDAY_GREETING',
    language: 'ta',
    title: 'பிறந்தநாள் வாழ்த்து & தேவ ஆசீர்வாதம் (Tamil)',
    description: 'உறுப்பினர்களுக்கான வேத வசனத்துடன் கூடிய பிறந்தநாள் வாழ்த்து.',
    bodyTemplate: `இனிய பிறந்தநாள் வாழ்த்துகள், {MemberName}! 🎂🎉\n\nகர்த்தர் உங்கள் வாழ்வை ஆசீர்வதித்து, இந்த புதிய ஆண்டிலும் தமது கிருபையினால் உங்களை முடிசூட்டுவாராக!\n\n📖 *"கர்த்தர் உன்னை ஆசீர்வதித்து, உன்னைக் காக்கக்கடவர்; கர்த்தர் தம்முடைய முகத்தை உன்மேல் பிரகாசிக்கப்பண்ணி, உன்மேல் கிருபையாயிருக்கக்கடவர்."* (எண்ணாகமம் 6:24-25)\n\nசபையின் போதகர் மற்றும் குடும்பத்தாரின் அன்பான வாழ்த்துகள்!`,
    variablePlaceholders: ['MemberName']
  },
  {
    name: 'volunteer_duty_reminder',
    category: 'VOLUNTEER_ASSIGNMENT',
    language: 'en',
    title: 'Volunteer Roster Duty Reminder',
    description: 'Reminder for scheduled ministry volunteers on upcoming service.',
    bodyTemplate: `Hi {VolunteerName}! 🙏\n\nFriendly reminder of your service duty for *{ServiceName}* on *{ServiceDate}*:\n\n👥 Role: *{RoleName}* ({MinistryName})\n⏰ Reporting Time: {ReportTime}\n\nThank you for faithfully serving God's kingdom! Reply YES to confirm or let your team leader know if you have an emergency.`,
    variablePlaceholders: ['VolunteerName', 'ServiceName', 'ServiceDate', 'RoleName', 'MinistryName', 'ReportTime']
  },
  {
    name: 'volunteer_duty_reminder',
    category: 'VOLUNTEER_ASSIGNMENT',
    language: 'ta',
    title: 'ஊழிய பணி நினைவூட்டல் (Tamil)',
    description: 'ஞாயிறு ஊழிய பணிக்கு நியமிக்கப்பட்ட தொண்டர்களுக்கான நினைவூட்டல்.',
    bodyTemplate: `அன்பான {VolunteerName}, 🙏\n\n*{ServiceDate}* அன்று நடைபெறும் *{ServiceName}* ஆராதனையில் உங்கள் ஊழியப் பணி:\n\n👥 பணி: *{RoleName}* ({MinistryName})\n⏰ வருகை நேரம்: {ReportTime}\n\nஉண்மையுடன் ஊழியம் செய்யும் உங்கள் தியாகத்திற்கு நன்றி! வருகையை உறுதிப்படுத்த YES என பதிலளிக்கவும்.`,
    variablePlaceholders: ['VolunteerName', 'ServiceName', 'ServiceDate', 'RoleName', 'MinistryName', 'ReportTime']
  }
];

// Helper to normalize phone numbers to E.164 without spaces
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`; // Default India prefix if 10 digits
  return digits;
}

// Node.js safe LocalStorage reader
function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    // Return default on error
  }
  return defaultValue;
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    // Non-blocking
  }
}

export const whatsAppService = {
  /**
   * 1. CONFIGURATION MANAGEMENT
   */
  getWhatsAppConfig(churchId: string): WhatsAppProviderConfig {
    const all = getStorageItem<Record<string, WhatsAppProviderConfig>>(CONFIG_STORAGE_KEY, {});
    if (all[churchId]) return all[churchId];

    // Default configuration for new/unconfigured church
    const defaultConfig: WhatsAppProviderConfig = {
      churchId,
      environment: 'sandbox', // Starts in safe sandbox mode
      phoneNumberId: '',
      wabaId: '',
      accessToken: '',
      displayPhoneNumber: '+91 98765 43210',
      webhookVerifyToken: `church_verify_${churchId}`,
      optOutKeywords: ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL'],
      optInKeywords: ['START', 'SUBSCRIBE', 'JOIN', 'YES'],
      updatedAt: new Date().toISOString()
    };
    return defaultConfig;
  },

  async saveWhatsAppConfig(
    churchId: string, 
    config: Partial<WhatsAppProviderConfig>, 
    actorName: string = 'Admin',
    actorRole: string = 'SuperAdmin'
  ): Promise<WhatsAppProviderConfig> {
    const all = getStorageItem<Record<string, WhatsAppProviderConfig>>(CONFIG_STORAGE_KEY, {});
    const existing = all[churchId] || this.getWhatsAppConfig(churchId);

    const updated: WhatsAppProviderConfig = {
      ...existing,
      ...config,
      churchId,
      updatedAt: new Date().toISOString(),
      updatedBy: actorName
    };

    all[churchId] = updated;
    setStorageItem(CONFIG_STORAGE_KEY, all);

    await auditService.logAction(churchId, {
      action: 'whatsapp_config_updated',
      resource_type: 'whatsapp_integration',
      actor_name: actorName,
      actor_role: actorRole,
      details: {
        environment: updated.environment,
        hasPhoneNumberId: Boolean(updated.phoneNumberId),
        hasAccessToken: Boolean(updated.accessToken),
        displayPhoneNumber: updated.displayPhoneNumber
      }
    }).catch(() => {});

    return updated;
  },

  /**
   * 2. TEMPLATES REPOSITORY
   */
  getApprovedTemplates(): ApprovedWhatsAppTemplate[] {
    return DEFAULT_WHATSAPP_TEMPLATES;
  },

  renderTemplate(templateName: string, language: 'en' | 'ta', variables: Record<string, string>): string {
    const tpl = DEFAULT_WHATSAPP_TEMPLATES.find(t => t.name === templateName && t.language === language)
      || DEFAULT_WHATSAPP_TEMPLATES.find(t => t.name === templateName);

    if (!tpl) return '';

    let rendered = tpl.bodyTemplate;
    for (const [key, val] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), val || '');
    }
    return rendered;
  },

  /**
   * 3. OPT-OUT & COMPLIANCE MANAGEMENT
   */
  isOptedOut(churchId: string, phone: string): boolean {
    const normalized = normalizePhoneNumber(phone);
    if (!normalized) return false;

    const all = getStorageItem<Record<string, WhatsAppOptRecord>>(OPTOUT_STORAGE_KEY, {});
    const key = `${churchId}_${normalized}`;
    return all[key]?.isOptedOut === true;
  },

  async recordOptOut(
    churchId: string, 
    phone: string, 
    reason: string = 'User requested opt out', 
    source: WhatsAppOptRecord['source'] = 'admin_manual'
  ): Promise<WhatsAppOptRecord> {
    const normalized = normalizePhoneNumber(phone);
    const all = getStorageItem<Record<string, WhatsAppOptRecord>>(OPTOUT_STORAGE_KEY, {});
    const key = `${churchId}_${normalized}`;

    const record: WhatsAppOptRecord = {
      churchId,
      phone: normalized,
      isOptedOut: true,
      optedOutAt: new Date().toISOString(),
      reason,
      source,
      updatedAt: new Date().toISOString()
    };

    all[key] = record;
    setStorageItem(OPTOUT_STORAGE_KEY, all);

    await auditService.logAction(churchId, {
      action: 'whatsapp_opt_out_recorded',
      resource_type: 'whatsapp_recipient',
      actor_name: 'Compliance System',
      actor_role: 'System',
      details: { phone: normalized, reason, source }
    }).catch(() => {});

    return record;
  },

  async recordOptIn(churchId: string, phone: string, source: WhatsAppOptRecord['source'] = 'admin_manual'): Promise<WhatsAppOptRecord> {
    const normalized = normalizePhoneNumber(phone);
    const all = getStorageItem<Record<string, WhatsAppOptRecord>>(OPTOUT_STORAGE_KEY, {});
    const key = `${churchId}_${normalized}`;

    const record: WhatsAppOptRecord = {
      churchId,
      phone: normalized,
      isOptedOut: false,
      optedInAt: new Date().toISOString(),
      source,
      updatedAt: new Date().toISOString()
    };

    all[key] = record;
    setStorageItem(OPTOUT_STORAGE_KEY, all);
    return record;
  },

  getOptOutList(churchId: string): WhatsAppOptRecord[] {
    const all = getStorageItem<Record<string, WhatsAppOptRecord>>(OPTOUT_STORAGE_KEY, {});
    return Object.values(all).filter(r => r.churchId === churchId && r.isOptedOut);
  },

  /**
   * 4. MESSAGE DISPATCH ENGINE (With Idempotency & Live/Sandbox Logic)
   */
  async sendWhatsAppMessage(paramsOrChurchId: any, maybeParams?: any): Promise<WhatsAppMessageRecord> {
    const params = typeof paramsOrChurchId === 'string'
      ? {
          churchId: paramsOrChurchId,
          idempotencyKey: maybeParams?.idempotencyKey || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          recipientPhone: maybeParams?.recipientPhone || '',
          recipientName: maybeParams?.recipientName || 'Member',
          recipientType: maybeParams?.recipientType || 'member',
          recipientId: maybeParams?.recipientId,
          templateName: maybeParams?.templateName || 'general_announcement',
          language: maybeParams?.language || 'en',
          messageBody: maybeParams?.messageBody || maybeParams?.bodyText || '',
          initiatedBy: maybeParams?.initiatedBy || 'System',
          initiatedByRole: maybeParams?.initiatedByRole || 'Admin',
          metadata: maybeParams?.metadata
        }
      : paramsOrChurchId;

    const { churchId, idempotencyKey, recipientPhone, recipientName, templateName, messageBody, initiatedBy, initiatedByRole } = params;
    const language = params.language || 'en';
    const normalizedPhone = normalizePhoneNumber(recipientPhone);

    const history = this.getWhatsAppHistory(churchId);

    // 1. Idempotency Check: Prevent duplicate sends for same campaign/recipient
    const existing = history.find(m => m.idempotencyKey === idempotencyKey);
    if (existing && existing.status !== 'failed') {
      return existing;
    }

    // 2. Opt-out Compliance Check
    if (this.isOptedOut(churchId, normalizedPhone)) {
      const optedOutRecord: WhatsAppMessageRecord = {
        id: `wam_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        churchId,
        idempotencyKey,
        recipientPhone: normalizedPhone,
        recipientName,
        recipientType: params.recipientType,
        recipientId: params.recipientId,
        templateName,
        language,
        messageBody,
        status: 'opted_out',
        failureReason: 'Recipient has previously opted out of church communications.',
        retryCount: 0,
        initiatedBy,
        initiatedByRole,
        requiresApproval: false,
        createdAt: new Date().toISOString(),
        metadata: params.metadata
      };
      this.saveMessageToHistory(optedOutRecord);
      return optedOutRecord;
    }

    const config = this.getWhatsAppConfig(churchId);
    let status: WhatsAppMessageStatus = 'queued';
    let providerMessageId: string | undefined;
    let failureReason: string | undefined;

    // 3. Provider Delivery
    if (config.environment === 'production' && config.phoneNumberId && config.accessToken) {
      try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalizedPhone,
            type: 'text',
            text: { body: messageBody }
          })
        });

        const data = await response.json();
        if (response.ok && data.messages?.[0]?.id) {
          status = 'sent';
          providerMessageId = data.messages[0].id;
        } else {
          status = 'failed';
          failureReason = data.error?.message || `Provider returned status code ${response.status}`;
        }
      } catch (err: any) {
        status = 'failed';
        failureReason = err.message || 'Network error reaching Meta WhatsApp endpoint';
      }
    } else if (config.environment === 'sandbox') {
      // Safe sandbox simulation
      status = 'delivered';
      providerMessageId = `wamid.SBX.${Date.now()}.${Math.floor(Math.random() * 100000)}`;
    } else {
      // Unconfigured state
      status = 'queued';
      failureReason = 'Meta WhatsApp Cloud API credentials not configured in Church Settings.';
    }

    const record: WhatsAppMessageRecord = {
      id: `wam_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      churchId,
      idempotencyKey,
      recipientPhone: normalizedPhone,
      recipientName,
      recipientType: params.recipientType,
      recipientId: params.recipientId,
      templateName,
      language,
      messageBody,
      status,
      providerMessageId,
      failureReason,
      retryCount: 0,
      initiatedBy,
      initiatedByRole,
      requiresApproval: false,
      sentAt: status === 'sent' || status === 'delivered' ? new Date().toISOString() : undefined,
      deliveredAt: status === 'delivered' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      metadata: params.metadata
    };

    this.saveMessageToHistory(record);

    await auditService.logAction(churchId, {
      action: 'whatsapp_message_dispatched',
      resource_type: 'whatsapp_message',
      actor_name: initiatedBy,
      actor_role: initiatedByRole,
      details: {
        recipientPhone: normalizedPhone,
        recipientName,
        templateName,
        status,
        providerMessageId,
        failureReason
      }
    }).catch(() => {});

    return record;
  },

  /**
   * 5. BATCH BROADCAST SENDER
   */
  async sendWhatsAppBroadcast(params: {
    churchId: string;
    campaignId: string;
    recipients: Array<{ phone: string; name: string; recipientId?: string; recipientType: 'member' | 'visitor' | 'volunteer' | 'group' }>;
    templateName: string;
    language?: 'en' | 'ta';
    renderVariablesFn: (recipient: { phone: string; name: string }) => Record<string, string>;
    initiatedBy: string;
    initiatedByRole: string;
  }): Promise<{
    totalAttempted: number;
    deliveredCount: number;
    optedOutCount: number;
    failedCount: number;
    records: WhatsAppMessageRecord[];
  }> {
    const records: WhatsAppMessageRecord[] = [];
    let deliveredCount = 0;
    let optedOutCount = 0;
    let failedCount = 0;

    for (const r of params.recipients) {
      const vars = params.renderVariablesFn(r);
      const renderedText = this.renderTemplate(params.templateName, params.language || 'en', vars);
      const idempotencyKey = `camp_${params.campaignId}_${normalizePhoneNumber(r.phone)}`;

      const res = await this.sendWhatsAppMessage({
        churchId: params.churchId,
        idempotencyKey,
        recipientPhone: r.phone,
        recipientName: r.name,
        recipientType: r.recipientType,
        recipientId: r.recipientId,
        templateName: params.templateName,
        language: params.language,
        messageBody: renderedText,
        initiatedBy: params.initiatedBy,
        initiatedByRole: params.initiatedByRole,
        metadata: { campaignId: params.campaignId }
      });

      records.push(res);
      if (res.status === 'delivered' || res.status === 'sent') deliveredCount++;
      else if (res.status === 'opted_out') optedOutCount++;
      else failedCount++;
    }

    return {
      totalAttempted: params.recipients.length,
      deliveredCount,
      optedOutCount,
      failedCount,
      records
    };
  },

  /**
   * 6. MESSAGE HISTORY & RETRIES
   */
  getWhatsAppHistory(churchId: string, filter?: { status?: WhatsAppMessageStatus; phone?: string }): WhatsAppMessageRecord[] {
    const all = getStorageItem<Record<string, WhatsAppMessageRecord[]>>(HISTORY_STORAGE_KEY, {});
    const list = all[churchId] || [];

    return list.filter(m => {
      if (filter?.status && m.status !== filter.status) return false;
      if (filter?.phone && !m.recipientPhone.includes(filter.phone)) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  saveMessageToHistory(record: WhatsAppMessageRecord): void {
    const all = getStorageItem<Record<string, WhatsAppMessageRecord[]>>(HISTORY_STORAGE_KEY, {});
    const list = all[record.churchId] || [];

    const existingIdx = list.findIndex(m => m.id === record.id);
    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }

    // Keep max 500 records per church to manage storage
    all[record.churchId] = list.slice(0, 500);
    setStorageItem(HISTORY_STORAGE_KEY, all);
  },

  async retryFailedMessage(churchId: string, messageId: string, actorName: string = 'Admin'): Promise<WhatsAppMessageRecord | null> {
    const history = this.getWhatsAppHistory(churchId);
    const target = history.find(m => m.id === messageId);
    if (!target) return null;

    target.retryCount = (target.retryCount || 0) + 1;
    target.idempotencyKey = `retry_${target.id}_${target.retryCount}_${Date.now()}`;

    const res = await this.sendWhatsAppMessage({
      churchId,
      idempotencyKey: target.idempotencyKey,
      recipientPhone: target.recipientPhone,
      recipientName: target.recipientName,
      recipientType: target.recipientType,
      recipientId: target.recipientId,
      templateName: target.templateName,
      language: target.language,
      messageBody: target.messageBody,
      initiatedBy: actorName,
      initiatedByRole: 'Admin',
      metadata: { originalMessageId: messageId, retryCount: target.retryCount }
    });

    return res;
  },

  /**
   * 7. WEBHOOK RECEIVER (Meta Graph API Delivery Receipts & Inbound Keywords)
   */
  async handleIncomingWebhook(churchId: string, payload: any): Promise<{ handled: boolean; action?: string }> {
    try {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      // Status updates: delivered, read, failed
      if (change?.statuses?.[0]) {
        const s = change.statuses[0];
        const wamid = s.id;
        const metaStatus = s.status; // 'delivered', 'read', 'failed', 'sent'

        const history = this.getWhatsAppHistory(churchId);
        const match = history.find(m => m.providerMessageId === wamid);
        if (match) {
          if (metaStatus === 'delivered') match.status = 'delivered', match.deliveredAt = new Date().toISOString();
          else if (metaStatus === 'read') match.status = 'read', match.readAt = new Date().toISOString();
          else if (metaStatus === 'failed') match.status = 'failed', match.failureReason = s.errors?.[0]?.message || 'Carrier delivery failed';
          this.saveMessageToHistory(match);
          return { handled: true, action: `Status updated to ${metaStatus}` };
        }
      }

      // Inbound Messages: Check STOP/START keywords
      if (change?.messages?.[0]) {
        const msg = change.messages[0];
        const fromPhone = msg.from;
        const text = (msg.text?.body || '').trim().toUpperCase();

        const config = this.getWhatsAppConfig(churchId);
        if (config.optOutKeywords.includes(text)) {
          await this.recordOptOut(churchId, fromPhone, `Received opt-out keyword "${text}"`, 'incoming_keyword');
          return { handled: true, action: 'Recorded Opt-out' };
        } else if (config.optInKeywords.includes(text)) {
          await this.recordOptIn(churchId, fromPhone, 'incoming_keyword');
          return { handled: true, action: 'Recorded Opt-in' };
        }
      }
    } catch (e) {
      console.error('Error processing WhatsApp webhook:', e);
    }
    return { handled: false };
  }
};
