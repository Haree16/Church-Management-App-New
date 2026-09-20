import { GoogleGenAI } from '@google/genai';
import { 
  SaaSUser, Member, ChurchMinistry, MinistryMember, 
  RosterAssignment, MinistryActivity, MinistryAnnouncement, 
  ChurchEvent, AttendanceRecord 
} from '@/types';
import { aiMinistryToolsService } from './aiMinistryToolsService';
import { getUserAssignedMinistries } from '@/utils/ministryPermissions';
import { auditService } from './auditService';

export interface MinistryChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionDraft?: {
    type: 'create_announcement' | 'whatsapp_message';
    ministryId: string;
    ministryName: string;
    title?: string;
    message?: string;
    draftText?: string;
  };
}

export interface AskAiMinistryOptions {
  prompt: string;
  selectedMinistryId: string;
  churchId: string;
  currentUser: SaaSUser | null | undefined;
  members: Member[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  roster: RosterAssignment[];
  activities: MinistryActivity[];
  announcements: MinistryAnnouncement[];
  events: ChurchEvent[];
  attendance: AttendanceRecord[];
}

const SYSTEM_INSTRUCTION = `You are the AI Ministry Assistant for Church Ministry Members & Leaders.
Your objective is to help ministry team members and leaders understand their duty assignments, schedule, roster shifts, team members, meetings, and ministry announcements.

Strict Rules:
1. Always base your answers strictly on the actual provided ministry data. Never invent members, dates, assignments, or events.
2. If data is unavailable or empty, state clearly: "I couldn't find that information in your ministry records."
3. Maintain an encouraging, respectful, clear, and practical tone.
4. Support English, Tamil (தமிழ்), and mixed Tamil-English naturally. If the user asks in Tamil or mixed Tamil, respond in fluent, natural Tamil.
5. Do NOT make spiritual or personal assumptions about absent members or motivation. Stick to objective facts.
6. Format your responses with markdown bolding, bullet points, and clean structure.`;

function getGeminiApiKey(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_GEMINI_API_KEY : '');
  return envKey && envKey.trim().length > 0 ? envKey.trim() : null;
}

export const aiMinistryService = {
  /**
   * Main entry point to ask AI Ministry Assistant
   */
  async askAiMinistry(options: AskAiMinistryOptions): Promise<{ text: string; actionDraft?: any }> {
    const {
      prompt,
      selectedMinistryId,
      churchId,
      currentUser,
      members,
      ministries,
      ministryMembers,
      roster,
      activities,
      announcements,
      events,
      attendance
    } = options;

    // 1. Authorization check
    const userMinistries = getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
    const matchedInfo = userMinistries.find(m => m.ministry.id === selectedMinistryId);

    if (!matchedInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const { ministry, isLeader } = matchedInfo;
    const apiKey = getGeminiApiKey();

    let responseText = '';
    let actionDraftPayload: any = null;

    // Check if user is asking to create an announcement or WhatsApp draft (Leader actions)
    const pLower = prompt.toLowerCase();
    const isAnnouncementRequest = pLower.includes('announcement') || pLower.includes('அறிவிப்பு') || pLower.includes('notice');
    const isWhatsAppRequest = pLower.includes('whatsapp') || pLower.includes('message') || pLower.includes('செய்தி');

    if (isLeader && (pLower.includes('create') || pLower.includes('draft') || pLower.includes('prepare') || pLower.includes('உருவாக்கு') || pLower.includes('தயார்'))) {
      if (isAnnouncementRequest) {
        const draft = await aiMinistryToolsService.prepareMinistryAnnouncementDraft(
          ministry.id, currentUser, members, ministries, ministryMembers,
          `${ministry.name} Notice`,
          prompt.replace(/create|draft|prepare|announcement|notice|அறிவிப்பு|உருவாக்கு/gi, '').trim() || `Meeting scheduled for ${ministry.name}.`
        );
        actionDraftPayload = {
          type: 'create_announcement',
          ministryId: ministry.id,
          ministryName: ministry.name,
          title: draft.draftAnnouncement.title,
          message: draft.draftAnnouncement.message
        };
      } else if (isWhatsAppRequest) {
        const draft = await aiMinistryToolsService.prepareWhatsAppMessageDraft(
          ministry.id, currentUser, members, ministries, ministryMembers,
          prompt,
          prompt
        );
        actionDraftPayload = {
          type: 'whatsapp_message',
          ministryId: ministry.id,
          ministryName: ministry.name,
          draftText: draft.draftText
        };
      }
    }

    // 2. Try Gemini API if key is present
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Gather real context for prompt
        const contextData = await this.gatherMinistryContext(
          prompt, selectedMinistryId, currentUser, members, 
          ministries, ministryMembers, roster, activities, 
          announcements, events, attendance
        );

        const fullPrompt = `${SYSTEM_INSTRUCTION}

[AUTHENTICATED USER CONTEXT]
User: ${currentUser?.name || 'User'}
Role in ${ministry.name}: ${matchedInfo.roleTitle} (Leader: ${isLeader ? 'YES' : 'NO'})

[REAL MINISTRY DATA FOR QUERY]
${JSON.stringify(contextData, null, 2)}

[USER QUERY]
${prompt}`;

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
        });

        if (result && result.text) {
          responseText = result.text;
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to local ministry data synthesizer:', geminiErr);
      }
    }

    // 3. Fallback synthesizer if Gemini key absent or call failed
    if (!responseText) {
      responseText = await this.synthesizeLocalMinistryResponse(
        prompt, selectedMinistryId, currentUser, matchedInfo, 
        members, ministries, ministryMembers, roster, 
        activities, announcements, events, attendance
      );
    }

    // Audit log
    try {
      await auditService.logAction(churchId, {
        action: 'ai_ministry_query',
        resource_type: 'ai_ministry_assistant',
        resource_id: ministry.id,
        actor_name: currentUser?.name || 'Ministry Member',
        actor_role: matchedInfo.roleTitle,
        details: {
          prompt,
          ministryName: ministry.name,
          responseSnippet: responseText.slice(0, 150)
        }
      });
    } catch (auditErr) {
      console.error('Audit log failed for AI Ministry Assistant:', auditErr);
    }

    return {
      text: responseText,
      actionDraft: actionDraftPayload
    };
  },

  /**
   * Gather relevant ministry data context
   */
  async gatherMinistryContext(
    prompt: string,
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    roster: RosterAssignment[],
    activities: MinistryActivity[],
    announcements: MinistryAnnouncement[],
    events: ChurchEvent[],
    attendance: AttendanceRecord[]
  ) {
    const p = prompt.toLowerCase();
    const context: Record<string, any> = {};

    if (p.includes('assignment') || p.includes('doing') || p.includes('duty') || p.includes('sunday') || p.includes('roster') || p.includes('கடமை')) {
      context.myAssignments = await aiMinistryToolsService.getMyAssignments(ministryId, currentUser, members, ministries, ministryMembers, roster);
      context.ministryRoster = await aiMinistryToolsService.getMinistryAssignments(ministryId, currentUser, members, ministries, ministryMembers, roster);
    }

    if (p.includes('who') || p.includes('member') || p.includes('team') || p.includes('leader') || p.includes('யார்') || p.includes('உறுப்பினர்கள்')) {
      context.ministryDetails = await aiMinistryToolsService.getMinistryDetails(ministryId, currentUser, members, ministries, ministryMembers);
      context.memberList = await aiMinistryToolsService.getMinistryMembersList(ministryId, currentUser, members, ministries, ministryMembers);
    }

    if (p.includes('event') || p.includes('meeting') || p.includes('activity') || p.includes('calendar') || p.includes('கூட்டம்') || p.includes('நிகழ்ச்சி')) {
      context.eventsAndActivities = await aiMinistryToolsService.getMinistryEventsAndActivities(ministryId, currentUser, members, ministries, ministryMembers, events, activities);
    }

    if (p.includes('announcement') || p.includes('notice') || p.includes('bulletin') || p.includes('அறிவிப்பு')) {
      context.announcements = await aiMinistryToolsService.getMinistryAnnouncementsList(ministryId, currentUser, members, ministries, ministryMembers, announcements);
    }

    if (p.includes('attend') || p.includes('turnout') || p.includes('வருகை')) {
      context.attendance = await aiMinistryToolsService.getMinistryAttendance(ministryId, currentUser, members, ministries, ministryMembers, attendance, activities);
    }

    if (Object.keys(context).length === 0) {
      context.ministryDetails = await aiMinistryToolsService.getMinistryDetails(ministryId, currentUser, members, ministries, ministryMembers);
      context.myAssignments = await aiMinistryToolsService.getMyAssignments(ministryId, currentUser, members, ministries, ministryMembers, roster);
      context.announcements = await aiMinistryToolsService.getMinistryAnnouncementsList(ministryId, currentUser, members, ministries, ministryMembers, announcements);
    }

    return context;
  },

  /**
   * Local Synthesizer fallback for fast offline natural responses
   */
  async synthesizeLocalMinistryResponse(
    prompt: string,
    ministryId: string,
    currentUser: SaaSUser | null | undefined,
    matchedInfo: any,
    members: Member[],
    ministries: ChurchMinistry[],
    ministryMembers: MinistryMember[],
    roster: RosterAssignment[],
    activities: MinistryActivity[],
    announcements: MinistryAnnouncement[],
    events: ChurchEvent[],
    attendance: AttendanceRecord[]
  ): Promise<string> {
    const p = prompt.toLowerCase();
    const isTamil = /[ஃ-ஹ]/.test(prompt) || p.includes('என்ன') || p.includes('யார்') || p.includes('எப்போது');
    const { ministry, isLeader } = matchedInfo;

    // 1. Assignments
    if (p.includes('assignment') || p.includes('doing') || p.includes('duty') || p.includes('sunday') || p.includes('roster') || p.includes('கடமை')) {
      const data = await aiMinistryToolsService.getMyAssignments(ministryId, currentUser, members, ministries, ministryMembers, roster);
      
      if (isTamil) {
        if (!data.nextAssignment) {
          return `### 📋 ${ministry.name} - உங்கள் அடுத்த பணி நியமனம்\n\nஉங்களுக்கு இந்த ஞாயிற்றுக்கிழமை எந்த பணி நியமனமும் (Assignment) பதிவு செய்யப்படவில்லை.`;
        }
        return `### 📋 ${ministry.name} - உங்கள் அடுத்த பணி நியமனம்\n\n- **சேவை / நிகழ்வு:** ${data.nextAssignment.serviceName}\n- **தேதி:** ${data.nextAssignment.serviceDate}\n- **பொறுப்பு / Role:** **${data.nextAssignment.roleName}**\n- **உறுதிப்படுத்தல் (Status):** ${data.nextAssignment.confirmed ? '✅ உறுதிப்படுத்தப்பட்டது (Confirmed)' : '⏳ காத்திருக்கிறது (Unconfirmed)'}`;
      }

      if (!data.nextAssignment) {
        return `### 📋 ${ministry.name} - My Assignments\n\nYou don't currently have an upcoming assignment recorded for this Sunday.`;
      }

      return `### 📋 ${ministry.name} - My Next Assignment\n\n- **Service:** ${data.nextAssignment.serviceName}\n- **Date:** ${data.nextAssignment.serviceDate}\n- **Role:** **${data.nextAssignment.roleName}**\n- **Confirmation Status:** ${data.nextAssignment.confirmed ? 'Confirmed' : 'Pending Confirmation'}`;
    }

    // 2. Members List
    if (p.includes('who') || p.includes('member') || p.includes('team') || p.includes('யார்') || p.includes('உறுப்பினர்கள்')) {
      const data = await aiMinistryToolsService.getMinistryMembersList(ministryId, currentUser, members, ministries, ministryMembers);
      const list = data.members.map(m => `- **${m.name}** (${m.role})`).join('\n');

      if (isTamil) {
        return `### 👥 ${ministry.name} - குழு உறுப்பினர்கள்\n\nநமது **${ministry.name}** குழுவில் மொத்தம் **${data.totalCount} உறுப்பினர்கள்** உள்ளனர்:\n\n${list}`;
      }

      return `### 👥 ${ministry.name} - Team Members\n\nThere are **${data.totalCount} members** assigned to ${ministry.name}:\n\n${list}`;
    }

    // 3. Events & Meetings
    if (p.includes('meeting') || p.includes('event') || p.includes('activity') || p.includes('கூட்டம்') || p.includes('நிகழ்ச்சி')) {
      const data = await aiMinistryToolsService.getMinistryEventsAndActivities(ministryId, currentUser, members, ministries, ministryMembers, events, activities);
      
      if (isTamil) {
        return `### 📅 ${ministry.name} - சந்திப்பு மற்றும் நிகழ்வுகள்\n\n- **வழக்கமான சந்திப்பு நேரம்:** ${data.meetingSchedule}\n- **திட்டமிடப்பட்ட செயல்பாடுகள்:** ${data.activities.length} நிகழ்வுகள் உள்ளன.`;
      }

      return `### 📅 ${ministry.name} - Meetings & Upcoming Events\n\n- **Regular Meeting Schedule:** ${data.meetingSchedule}\n- **Scheduled Activities:** ${data.activities.length} events logged.`;
    }

    // 4. Announcements
    if (p.includes('announcement') || p.includes('notice') || p.includes('bulletin') || p.includes('அறிவிப்பு')) {
      const data = await aiMinistryToolsService.getMinistryAnnouncementsList(ministryId, currentUser, members, ministries, ministryMembers, announcements);
      
      if (data.announcements.length === 0) {
        return isTamil 
          ? `### 📢 ${ministry.name} - சமீபத்திய அறிவிப்புகள்\n\nதற்போது எந்த புதிய அறிவிப்புகளும் இல்லை.`
          : `### 📢 ${ministry.name} - Latest Announcements\n\nThere are currently no active announcements for this ministry.`;
      }

      const list = data.announcements.map(a => `- **${a.title}**: ${a.message} (Posted by ${a.authorName} on ${a.date})`).join('\n');
      return `### 📢 ${ministry.name} - Announcements\n\n${list}`;
    }

    // 5. Default Overview
    const details = await aiMinistryToolsService.getMinistryDetails(ministryId, currentUser, members, ministries, ministryMembers);
    const myAssign = await aiMinistryToolsService.getMyAssignments(ministryId, currentUser, members, ministries, ministryMembers, roster);

    if (isTamil) {
      return `### 🕊️ ${ministry.name} - மேலோட்டம்\n\nவணக்கம்! **${ministry.name}** உதவி அமைப்பிற்கு உங்களை வரவேற்கிறோம்.\n\n- **உங்கள் பொறுப்பு:** ${details.userRoleInMinistry}\n- **மொத்த உறுப்பினர்கள்:** ${details.totalMembersCount}\n- **சந்திப்பு நேரம்:** ${details.meetingSchedule}\n- **அடுத்த பணி நியமனம்:** ${myAssign.nextAssignment ? `${myAssign.nextAssignment.roleName} (${myAssign.nextAssignment.serviceDate})` : 'எதுவும் இல்லை'}\n\nஉங்களுக்கு எவ்வாறு உதவ வேண்டும் என்று கேளுங்கள்!`;
    }

    return `### 🕊️ ${ministry.name} - Overview\n\nWelcome! Here is your summary for **${ministry.name}**:\n\n- **Your Role:** ${details.userRoleInMinistry}\n- **Total Team Members:** ${details.totalMembersCount}\n- **Meeting Schedule:** ${details.meetingSchedule}\n- **Next Assignment:** ${myAssign.nextAssignment ? `${myAssign.nextAssignment.roleName} on ${myAssign.nextAssignment.serviceDate}` : 'None scheduled'}\n\nHow can I help you with your ministry work today?`;
  }
};
