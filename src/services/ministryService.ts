import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Ministry, MinistryMember, OrgStatus, ChurchMember, MinistryEvent } from '@/types/database';
import { DEMO_MINISTRIES, DEMO_MEMBERS, DEMO_USERS } from '@/lib/mockData';

const LOCAL_STORAGE_MINISTRIES_KEY = 'church_cms_ministries_data';
const LOCAL_STORAGE_MINISTRY_MEMBERS_KEY = 'church_cms_ministry_members_data';
const LOCAL_STORAGE_MINISTRY_EVENTS_KEY = 'church_cms_ministry_events_data';

export interface CreateMinistryPayload {
  name: string;
  description?: string;
  leader_id?: string;
  assistant_leader_id?: string;
  status?: OrgStatus;
  meeting_schedule?: string;
  email?: string;
  phone?: string;
  color?: string;
  icon?: string;
}

export interface CreateMinistryEventPayload {
  ministry_id: string;
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time?: string;
  location: string;
  type: 'rehearsal' | 'meeting' | 'service' | 'workshop' | 'outreach';
}


const INITIAL_DEMO_MINISTRIES: Ministry[] = [];

const INITIAL_DEMO_MINISTRY_MEMBERS: MinistryMember[] = [];

function getLocalMinistries(churchId: string): Ministry[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MINISTRIES_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local ministries:', e);
  }
  return [];
}

function saveLocalMinistries(churchId: string, list: Ministry[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MINISTRIES_KEY}_${churchId}`, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save local ministries:', e);
  }
}

function getLocalMinistryMembers(churchId: string): MinistryMember[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MINISTRY_MEMBERS_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local ministry members:', e);
  }
  return [];
}

function saveLocalMinistryMembers(churchId: string, list: MinistryMember[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MINISTRY_MEMBERS_KEY}_${churchId}`, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save local ministry members:', e);
  }
}

const INITIAL_DEMO_MINISTRY_EVENTS: MinistryEvent[] = [];

function getLocalMinistryEvents(churchId: string): MinistryEvent[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MINISTRY_EVENTS_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local ministry events:', e);
  }
  return [];
}

function saveLocalMinistryEvents(churchId: string, list: MinistryEvent[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MINISTRY_EVENTS_KEY}_${churchId}`, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save local ministry events:', e);
  }
}

export const ministryService = {
  async getMinistries(churchId: string): Promise<Ministry[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('ministries')
        .select(`
          *,
          leader:profiles!ministries_leader_id_fkey(*),
          assistant_leader:profiles!ministries_assistant_leader_id_fkey(*)
        `)
        .eq('church_id', churchId)
        .order('name', { ascending: true });

      if (!error && data) {
        return data as Ministry[];
      }
    }

    const local = getLocalMinistries(churchId);
    const members = getLocalMinistryMembers(churchId);

    return local.map((min) => {
      const minMembers = members.filter((mm) => mm.ministry_id === min.id);
      return {
        ...min,
        leader: DEMO_USERS.find((u) => u.id === min.leader_id)
          ? {
              id: min.leader_id!,
              email: DEMO_USERS.find((u) => u.id === min.leader_id)!.email,
              first_name: DEMO_USERS.find((u) => u.id === min.leader_id)!.name.split(' ')[0],
              last_name: DEMO_USERS.find((u) => u.id === min.leader_id)!.name.split(' ').slice(1).join(' '),
              display_name: DEMO_USERS.find((u) => u.id === min.leader_id)!.name,
              phone: DEMO_USERS.find((u) => u.id === min.leader_id)!.phone,
              avatar_url: DEMO_USERS.find((u) => u.id === min.leader_id)!.avatar,
              is_super_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : null,
        assistant_leader: DEMO_USERS.find((u) => u.id === min.assistant_leader_id)
          ? {
              id: min.assistant_leader_id!,
              email: DEMO_USERS.find((u) => u.id === min.assistant_leader_id)!.email,
              first_name: DEMO_USERS.find((u) => u.id === min.assistant_leader_id)!.name.split(' ')[0],
              last_name: DEMO_USERS.find((u) => u.id === min.assistant_leader_id)!.name.split(' ').slice(1).join(' '),
              display_name: DEMO_USERS.find((u) => u.id === min.assistant_leader_id)!.name,
              phone: DEMO_USERS.find((u) => u.id === min.assistant_leader_id)!.phone,
              avatar_url: DEMO_USERS.find((u) => u.id === min.assistant_leader_id)!.avatar,
              is_super_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : null,
        member_count: minMembers.length,
        volunteer_count: Math.max(minMembers.length + 2, 4),
      };
    });
  },

  async getMinistryMembers(churchId: string, ministryId?: string): Promise<MinistryMember[]> {
    let members: MinistryMember[] = [];
    if (isSupabaseConfigured()) {
      let q = supabase
        .from('ministry_members')
        .select('*, profile:profiles(*), church_member:church_members(*)');
      if (ministryId) q = q.eq('ministry_id', ministryId);
      const { data } = await q;
      if (data) members = data as MinistryMember[];
    }
    if (members.length === 0) {
      const localMembers = getLocalMinistryMembers(churchId);
      members = ministryId ? localMembers.filter((mm) => mm.ministry_id === ministryId) : localMembers;
    }
    return members;
  },

  async getMinistryById(churchId: string, ministryId: string): Promise<{
    ministry: Ministry | null;
    members: MinistryMember[];
    events: MinistryEvent[];
  }> {
    const ministries = await this.getMinistries(churchId);
    const ministry = ministries.find((m) => m.id === ministryId) || null;

    let members: MinistryMember[] = [];
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('ministry_members')
        .select('*, profile:profiles(*), church_member:church_members(*)')
        .eq('ministry_id', ministryId);
      if (data && data.length > 0) members = data;
    }

    if (members.length === 0) {
      const localMembers = getLocalMinistryMembers(churchId).filter((mm) => mm.ministry_id === ministryId);
      members = localMembers.map((mm) => {
        const mem = DEMO_MEMBERS.find((m) => m.id === mm.member_id || m.user_id === mm.user_id);
        return {
          ...mm,
          profile: mem?.profile,
          church_member: mem,
        };
      });
    }

    const events = await this.getMinistryEvents(churchId, ministryId);

    return { ministry, members, events };
  },

  async createMinistry(churchId: string, payload: CreateMinistryPayload): Promise<Ministry> {
    const newMinistry: Ministry = {
      id: `m-${Date.now()}`,
      church_id: churchId,
      name: payload.name,
      description: payload.description || null,
      leader_id: payload.leader_id || null,
      assistant_leader_id: payload.assistant_leader_id || null,
      status: payload.status || 'active',
      meeting_schedule: payload.meeting_schedule || null,
      email: payload.email || null,
      phone: payload.phone || null,
      color: payload.color || '#6366f1',
      icon: payload.icon || 'Layers',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member_count: 0,
      volunteer_count: 0,
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('ministries')
        .insert([newMinistry])
        .select('*')
        .single();
      if (!error && data) return data as Ministry;
    }

    const local = getLocalMinistries(churchId);
    const updated = [newMinistry, ...local];
    saveLocalMinistries(churchId, updated);
    return newMinistry;
  },

  async updateMinistry(
    churchId: string,
    ministryId: string,
    payload: Partial<CreateMinistryPayload>
  ): Promise<Ministry> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('ministries')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', ministryId)
        .select('*')
        .single();
      if (!error && data) return data as Ministry;
    }

    const local = getLocalMinistries(churchId);
    const idx = local.findIndex((m) => m.id === ministryId);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...payload, updated_at: new Date().toISOString() };
      saveLocalMinistries(churchId, local);
      return local[idx];
    }
    throw new Error('Ministry not found');
  },

  async deleteMinistry(churchId: string, ministryId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('ministries').delete().eq('id', ministryId);
    }
    const local = getLocalMinistries(churchId);
    saveLocalMinistries(churchId, local.filter((m) => m.id !== ministryId));
  },

  async addMinistryMember(
    churchId: string,
    ministryId: string,
    member: ChurchMember,
    role: string = 'Member',
    notes?: string
  ): Promise<MinistryMember> {
    const newMM: MinistryMember = {
      id: `mm-${Date.now()}`,
      church_id: churchId,
      ministry_id: ministryId,
      user_id: member.user_id,
      member_id: member.id,
      role: role || 'Member',
      status: 'active',
      joined_date: new Date().toISOString().split('T')[0],
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: member.profile,
      church_member: member,
    };

    if (isSupabaseConfigured()) {
      await supabase.from('ministry_members').insert([{
        church_id: churchId,
        ministry_id: ministryId,
        user_id: member.user_id,
        member_id: member.id,
        role: newMM.role,
        status: newMM.status,
        joined_date: newMM.joined_date,
        notes: newMM.notes,
      }]);
    }

    const local = getLocalMinistryMembers(churchId);
    const updated = [newMM, ...local];
    saveLocalMinistryMembers(churchId, updated);
    return newMM;
  },

  async updateMinistryMemberRole(
    churchId: string,
    ministryMemberId: string,
    role: string
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('ministry_members')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', ministryMemberId);
    }
    const local = getLocalMinistryMembers(churchId);
    const idx = local.findIndex((m) => m.id === ministryMemberId);
    if (idx >= 0) {
      local[idx].role = role;
      saveLocalMinistryMembers(churchId, local);
    }
  },

  async removeMinistryMember(churchId: string, ministryMemberId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('ministry_members').delete().eq('id', ministryMemberId);
    }
    const local = getLocalMinistryMembers(churchId);
    saveLocalMinistryMembers(churchId, local.filter((m) => m.id !== ministryMemberId));
  },

  async getMinistryEvents(churchId: string, ministryId?: string): Promise<MinistryEvent[]> {
    if (isSupabaseConfigured()) {
      let query = supabase.from('ministry_events').select('*').eq('church_id', churchId);
      if (ministryId) query = query.eq('ministry_id', ministryId);
      const { data, error } = await query.order('event_date', { ascending: true });
      if (!error && data && data.length > 0) return data as MinistryEvent[];
    }

    let local = getLocalMinistryEvents(churchId);
    if (ministryId) {
      local = local.filter((e) => e.ministry_id === ministryId);
    }
    return local;
  },

  async createMinistryEvent(
    churchId: string,
    payload: CreateMinistryEventPayload
  ): Promise<MinistryEvent> {
    const newEvent: MinistryEvent = {
      id: `me-${Date.now()}`,
      church_id: churchId,
      ministry_id: payload.ministry_id,
      title: payload.title,
      description: payload.description || null,
      event_date: payload.event_date,
      start_time: payload.start_time,
      end_time: payload.end_time || null,
      location: payload.location,
      type: payload.type,
      attendee_count: 0,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('ministry_events')
        .insert([newEvent])
        .select('*')
        .single();
      if (!error && data) return data as MinistryEvent;
    }

    const local = getLocalMinistryEvents(churchId);
    const updated = [newEvent, ...local];
    saveLocalMinistryEvents(churchId, updated);
    return newEvent;
  },

  async deleteMinistryEvent(churchId: string, eventId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('ministry_events').delete().eq('id', eventId);
    }
    const local = getLocalMinistryEvents(churchId);
    saveLocalMinistryEvents(churchId, local.filter((e) => e.id !== eventId));
  },
};

