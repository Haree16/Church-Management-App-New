import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Church, ServiceTiming } from '@/types/database';
import { DEMO_CHURCH, DEMO_CHURCH_2 } from '@/lib/mockData';

const LOCAL_STORAGE_CHURCHES_KEY = 'church_cms_available_churches';

export interface CreateChurchPayload {
  name: string;
  slug?: string;
  tagline?: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  currency?: string;
}

export function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
}

export function getStoredChurches(): Church[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHURCHES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored churches:', e);
  }
  return [DEMO_CHURCH, DEMO_CHURCH_2];
}

import { saveStoredChurches as saveStorageChurches } from '@/utils/storage';

export function saveStoredChurches(churches: Church[]): void {
  try {
    saveStorageChurches(churches as any);
  } catch (e) {
    console.warn('Failed to store churches:', e);
  }
}

export const churchService = {
  async getChurchesForUser(userId: string): Promise<Church[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('church_members')
          .select('church:churches(*)')
          .eq('user_id', userId)
          .eq('status', 'active');

        if (!error && data) {
          const churches = data.map((m: any) => m.church).filter(Boolean);
          if (churches.length > 0) return churches;
        }

        // If user has no specific memberships yet, check all public active churches
        const { data: allChurches, error: allErr } = await supabase
          .from('churches')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (!allErr && allChurches && allChurches.length > 0) {
          return allChurches as Church[];
        }
      } catch (err) {
        console.error('Error fetching churches from Supabase:', err);
      }
    }
    return getStoredChurches();
  },

  async createChurch(payload: CreateChurchPayload, userId?: string): Promise<Church> {
    const slug = payload.slug || generateSlug(payload.name);
    const defaultTimings: ServiceTiming[] = [
      {
        id: `st-${Date.now()}-1`,
        name: 'Sunday Morning Service',
        day: 'Sunday',
        time: '09:00 AM',
        type: 'In-Person & Online',
      },
      {
        id: `st-${Date.now()}-2`,
        name: 'Wednesday Prayer & Bible Study',
        day: 'Wednesday',
        time: '07:00 PM',
        type: 'In-Person',
      },
    ];

    if (isSupabaseConfigured()) {
      try {
        // 1. Insert Church record
        const { data: churchData, error: churchErr } = await supabase
          .from('churches')
          .insert({
            name: payload.name,
            slug,
            tagline: payload.tagline || null,
            logo_url: payload.logo_url || null,
            email: payload.email || null,
            phone: payload.phone || null,
            website: payload.website || null,
            address: payload.address || 'No. 12, Mount Road, Anna Salai',
            city: payload.city || 'Chennai',
            state: payload.state || 'Tamil Nadu',
            postal_code: payload.postal_code || '600002',
            country: payload.country || 'India',
            timezone: payload.timezone || 'Asia/Kolkata',
            currency: payload.currency || 'INR',
            is_active: true,
          })
          .select()
          .single();

        if (churchErr) throw churchErr;
        if (!churchData) throw new Error('Failed to create church record');

        // 2. Initialize default church settings
        await supabase
          .from('church_settings')
          .insert({
            church_id: churchData.id,
            service_timings: defaultTimings,
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
          })
          .select()
          .maybeSingle();

        // 3. Assign current user as church_admin
        if (userId) {
          await supabase.from('church_members').insert({
            church_id: churchData.id,
            user_id: userId,
            role: 'church_admin',
            status: 'active',
            membership_date: new Date().toISOString().split('T')[0],
          });
        }

        const currentList = getStoredChurches();
        const updatedList = [churchData as Church, ...currentList.filter((c) => c.id !== churchData.id)];
        saveStoredChurches(updatedList);

        return churchData as Church;
      } catch (err: any) {
        console.error('Supabase createChurch error:', err);
        // If Supabase insert fails (e.g. offline/RLS), fall through to local storage
      }
    }

    // Local / offline fallback
    const newChurch: Church = {
      id: `c-${Date.now()}`,
      name: payload.name,
      slug,
      tagline: payload.tagline || null,
      logo_url: payload.logo_url || null,
      email: payload.email || null,
      phone: payload.phone || null,
      website: payload.website || null,
      address: payload.address || 'No. 12, Mount Road, Anna Salai',
      city: payload.city || 'Chennai',
      state: payload.state || 'Tamil Nadu',
      postal_code: payload.postal_code || '600002',
      country: payload.country || 'India',
      timezone: payload.timezone || 'Asia/Kolkata',
      currency: payload.currency || 'INR',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const currentList = getStoredChurches();
    const updatedList = [newChurch, ...currentList.filter((c) => c.id !== newChurch.id)];
    saveStoredChurches(updatedList);

    return newChurch;
  },

  async updateChurch(id: string, payload: Partial<Church>): Promise<Church> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('churches')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const currentList = getStoredChurches();
          const updatedList = currentList.map((c) => (c.id === id ? (data as Church) : c));
          saveStoredChurches(updatedList);
          return data as Church;
        }
      } catch (err) {
        console.error('Supabase updateChurch error:', err);
      }
    }

    const currentList = getStoredChurches();
    const updatedList = currentList.map((c) => (c.id === id ? { ...c, ...payload, updated_at: new Date().toISOString() } : c));
    saveStoredChurches(updatedList);
    const updated = updatedList.find((c) => c.id === id);
    if (!updated) {
      const createdFallback: Church = {
        id,
        name: payload.name || 'New Creation Assembly Church',
        slug: payload.slug || 'nca-church',
        tagline: payload.tagline || null,
        logo_url: payload.logo_url || null,
        email: payload.email || null,
        phone: payload.phone || null,
        website: payload.website || null,
        address: payload.address || 'No. 12, Mount Road, Anna Salai',
        city: payload.city || 'Chennai',
        state: payload.state || 'Tamil Nadu',
        postal_code: payload.postal_code || '600002',
        country: payload.country || 'India',
        timezone: payload.timezone || 'Asia/Kolkata',
        currency: payload.currency || 'INR',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...payload,
      };
      saveStoredChurches([createdFallback, ...currentList]);
      return createdFallback;
    }
    return updated;
  },
};
