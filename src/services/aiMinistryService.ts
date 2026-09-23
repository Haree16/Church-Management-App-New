import { 
  SaaSUser, Member, ChurchMinistry, MinistryMember, 
  RosterAssignment, MinistryActivity, MinistryAnnouncement, 
  ChurchEvent, AttendanceRecord 
} from '@/types';
import { getUserAssignedMinistries } from '@/utils/ministryPermissions';
import { churchAiEngine } from './churchAiEngine';

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
  history?: any[];
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
      history
    } = options;

    // Authorization check
    const userMinistries = getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
    const matchedInfo = userMinistries.find(m => m.ministry.id === selectedMinistryId);

    if (!matchedInfo) {
      throw new Error('Access Denied: You are not assigned to this ministry.');
    }

    const result = await churchAiEngine.processUserRequest({
      prompt,
      churchId,
      userRole: currentUser?.role || 'Member',
      userName: currentUser?.name || 'Ministry Member',
      userEmail: currentUser?.email || '',
      engineMode: 'ministry',
      selectedMinistryId,
      history
    });

    return {
      text: result.responseText,
      actionDraft: result.proposedActionPayload
    };
  }
};
