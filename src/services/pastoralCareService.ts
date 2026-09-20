import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  PastoralCare,
  PastoralCareLog,
  PastoralCareType,
  PastoralCareStage,
  PastoralCareConfidentiality,
  FollowUpPriority,
  ContactMethod,
  UserRole,
} from '@/types/database';

const LOCAL_STORAGE_PASTORAL_KEY = 'church_cms_pastoral_care_data';

export interface CreatePastoralCarePayload {
  person_id?: string | null;
  person_type?: 'member' | 'visitor';
  person_name: string;
  person_email?: string | null;
  person_phone?: string | null;
  care_type: PastoralCareType;
  stage?: PastoralCareStage;
  priority?: FollowUpPriority;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  confidentiality_level?: PastoralCareConfidentiality;
  summary: string;
  private_notes?: string | null;
  safeguarding_flag?: boolean;
  safeguarding_notes?: string | null;
  due_date?: string | null;
}

export interface UpdatePastoralCarePayload {
  person_name?: string;
  person_email?: string | null;
  person_phone?: string | null;
  care_type?: PastoralCareType;
  stage?: PastoralCareStage;
  priority?: FollowUpPriority;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  confidentiality_level?: PastoralCareConfidentiality;
  summary?: string;
  private_notes?: string | null;
  safeguarding_flag?: boolean;
  safeguarding_notes?: string | null;
  due_date?: string | null;
  closed_at?: string | null;
}

export interface AddPastoralLogPayload {
  pastoral_care_id: string;
  contact_date?: string;
  contact_method: ContactMethod | string;
  notes: string;
  author_id?: string | null;
  author_name: string;
  author_role?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
}

export const PASTORAL_CARE_TYPES: { value: PastoralCareType; label: string; iconName?: string; description: string }[] = [
  { value: 'pastoral_visit', label: 'Pastoral Visit', description: 'Home or office visit for prayer, encouragement, or spiritual discussion' },
  { value: 'counseling', label: 'Pastoral Counseling', description: 'Confidential spiritual, marriage, or personal counseling session' },
  { value: 'hospital_visit', label: 'Hospital & Health Visit', description: 'Medical care, hospital, hospice, or recovery visitation' },
  { value: 'bereavement', label: 'Bereavement & Grief Support', description: 'Grief care, funeral support, and family bereavement' },
  { value: 'crisis', label: 'Crisis & Safeguarding', description: 'Emergency crisis care requiring immediate pastoral attention' },
  { value: 'general_checkin', label: 'General Pastoral Check-in', description: 'Routine pastoral touchpoint or encouragement call' },
];

export const PASTORAL_STAGES: { value: PastoralCareStage; label: string; badgeVariant: 'default' | 'purple' | 'emerald' | 'amber' | 'secondary' }[] = [
  { value: 'initial_contact', label: 'Initial Contact', badgeVariant: 'purple' },
  { value: 'in_progress', label: 'Active Care In Progress', badgeVariant: 'amber' },
  { value: 'scheduled_followup', label: 'Follow-up Scheduled', badgeVariant: 'default' },
  { value: 'resolved', label: 'Care Completed / Resolved', badgeVariant: 'emerald' },
  { value: 'referred', label: 'Referred Outside', badgeVariant: 'secondary' },
];

export const CONFIDENTIALITY_LEVELS: { value: PastoralCareConfidentiality; label: string; description: string; color: string }[] = [
  { value: 'pastor_only', label: 'Pastor Only', description: 'Strictly confidential to Senior Pastors and Primary Caregiver', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300' },
  { value: 'pastoral_team', label: 'Pastoral Team', description: 'Accessible to ordained pastoral team and elders', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300' },
  { value: 'care_leaders', label: 'Care Team Leaders', description: 'Accessible to authorized lay care team leaders', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300' },
];

const INITIAL_DEMO_PASTORAL_CARE: PastoralCare[] = [];

function getLocalPastoralCare(churchId: string): PastoralCare[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PASTORAL_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read local pastoral care cases:', e);
  }
  saveLocalPastoralCare(churchId, INITIAL_DEMO_PASTORAL_CARE);
  return INITIAL_DEMO_PASTORAL_CARE;
}

function saveLocalPastoralCare(churchId: string, cases: PastoralCare[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PASTORAL_KEY}_${churchId}`, JSON.stringify(cases));
  } catch (e) {
    console.error('Failed to save local pastoral care cases:', e);
  }
}

export const pastoralCareService = {
  async getPastoralCareCases(
    churchId: string,
    currentUserRole?: UserRole | string | null,
    currentUserId?: string | null,
    personId?: string | null
  ): Promise<PastoralCare[]> {
    let list: PastoralCare[] = [];

    if (isSupabaseConfigured()) {
      let query = supabase
        .from('pastoral_care')
        .select(`
          *,
          assigned_profile:profiles!pastoral_care_assigned_to_fkey(*),
          logs:pastoral_care_logs(*)
        `)
        .eq('church_id', churchId)
        .order('created_at', { ascending: false });

      if (personId) {
        query = query.eq('person_id', personId);
      }

      const { data, error } = await query;
      if (!error && data) {
        list = data as PastoralCare[];
      } else {
        list = getLocalPastoralCare(churchId);
      }
    } else {
      list = getLocalPastoralCare(churchId);
    }

    if (personId) {
      list = list.filter((c) => c.person_id === personId);
    }

    // Confidentiality filtering
    const isPastorOrAdmin = ['super_admin', 'pastor', 'church_admin', 'SuperAdmin', 'PastorAdmin', 'AssistantPastor'].includes(currentUserRole || '');

    return list.filter((c) => {
      // 1. Pastors and Admins have full access
      if (isPastorOrAdmin) return true;

      // 2. Direct Assignee can access case
      if (currentUserId && c.assigned_to === currentUserId) return true;

      // 3. Care leaders level accessible to Ministry Leaders
      if (c.confidentiality_level === 'care_leaders' && currentUserRole === 'ministry_leader') return true;

      // Regular members & volunteers cannot view confidential pastoral care records
      return false;
    });
  },

  async getPastoralCareById(
    churchId: string,
    id: string,
    currentUserRole?: UserRole | string | null,
    currentUserId?: string | null
  ): Promise<PastoralCare | null> {
    const list = await this.getPastoralCareCases(churchId, currentUserRole, currentUserId);
    return list.find((c) => c.id === id) || null;
  },

  async createPastoralCareCase(churchId: string, payload: CreatePastoralCarePayload): Promise<PastoralCare> {
    const caseId = `pc-${Date.now()}`;
    const newCase: PastoralCare = {
      id: caseId,
      church_id: churchId,
      person_id: payload.person_id || null,
      person_type: payload.person_type || 'member',
      person_name: payload.person_name,
      person_email: payload.person_email || null,
      person_phone: payload.person_phone || null,
      care_type: payload.care_type,
      stage: payload.stage || 'initial_contact',
      priority: payload.priority || 'medium',
      assigned_to: payload.assigned_to || null,
      assigned_to_name: payload.assigned_to_name || 'Unassigned',
      confidentiality_level: payload.confidentiality_level || 'pastor_only',
      summary: payload.summary,
      private_notes: payload.private_notes || null,
      safeguarding_flag: !!payload.safeguarding_flag,
      safeguarding_notes: payload.safeguarding_notes || null,
      due_date: payload.due_date || null,
      closed_at: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      logs: [],
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('pastoral_care')
        .insert([{
          church_id: churchId,
          person_id: newCase.person_id,
          person_type: newCase.person_type,
          person_name: newCase.person_name,
          person_email: newCase.person_email,
          person_phone: newCase.person_phone,
          care_type: newCase.care_type,
          stage: newCase.stage,
          priority: newCase.priority,
          assigned_to: newCase.assigned_to,
          assigned_to_name: newCase.assigned_to_name,
          confidentiality_level: newCase.confidentiality_level,
          summary: newCase.summary,
          private_notes: newCase.private_notes,
          safeguarding_flag: newCase.safeguarding_flag,
          safeguarding_notes: newCase.safeguarding_notes,
          due_date: newCase.due_date,
        }])
        .select('*')
        .single();

      if (!error && data) {
        return data as PastoralCare;
      }
    }

    const local = getLocalPastoralCare(churchId);
    const updated = [newCase, ...local];
    saveLocalPastoralCare(churchId, updated);
    return newCase;
  },

  async updatePastoralCareCase(
    churchId: string,
    id: string,
    payload: UpdatePastoralCarePayload
  ): Promise<PastoralCare> {
    if (isSupabaseConfigured()) {
      const updateData: any = { updated_at: new Date().toISOString(), ...payload };
      const { data, error } = await supabase
        .from('pastoral_care')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (!error && data) return data as PastoralCare;
    }

    const local = getLocalPastoralCare(churchId);
    const idx = local.findIndex((c) => c.id === id);
    if (idx >= 0) {
      local[idx] = {
        ...local[idx],
        ...payload,
        updated_at: new Date().toISOString(),
      };
      saveLocalPastoralCare(churchId, local);
      return local[idx];
    }
    throw new Error('Pastoral care record not found');
  },

  async addPastoralLog(churchId: string, payload: AddPastoralLogPayload): Promise<PastoralCareLog> {
    const logId = `pcl-${Date.now()}`;
    const newLog: PastoralCareLog = {
      id: logId,
      church_id: churchId,
      pastoral_care_id: payload.pastoral_care_id,
      contact_date: payload.contact_date || new Date().toISOString(),
      contact_method: payload.contact_method || 'in_person',
      notes: payload.notes,
      author_id: payload.author_id || null,
      author_name: payload.author_name,
      author_role: payload.author_role || 'Pastoral Caregiver',
      next_action: payload.next_action || null,
      next_action_date: payload.next_action_date || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('pastoral_care_logs')
        .insert([{
          church_id: churchId,
          pastoral_care_id: payload.pastoral_care_id,
          contact_date: newLog.contact_date,
          contact_method: newLog.contact_method,
          notes: newLog.notes,
          author_id: newLog.author_id,
          author_name: newLog.author_name,
          author_role: newLog.author_role,
          next_action: newLog.next_action,
          next_action_date: newLog.next_action_date,
        }])
        .select('*')
        .single();

      if (!error && data) return data as PastoralCareLog;
    }

    const local = getLocalPastoralCare(churchId);
    const idx = local.findIndex((c) => c.id === payload.pastoral_care_id);
    if (idx >= 0) {
      const logs = local[idx].logs || [];
      local[idx].logs = [newLog, ...logs];
      local[idx].updated_at = new Date().toISOString();
      saveLocalPastoralCare(churchId, local);
    }
    return newLog;
  },

  async closePastoralCareCase(churchId: string, id: string, closingNotes?: string): Promise<PastoralCare> {
    return this.updatePastoralCareCase(churchId, id, {
      stage: 'resolved',
      closed_at: new Date().toISOString(),
      ...(closingNotes ? { private_notes: closingNotes } : {}),
    });
  },

  async deletePastoralCareCase(churchId: string, id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('pastoral_care').delete().eq('id', id);
    }
    const local = getLocalPastoralCare(churchId);
    const updated = local.filter((c) => c.id !== id);
    saveLocalPastoralCare(churchId, updated);
  },
};
