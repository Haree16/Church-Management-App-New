import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AuditLog } from '@/types/database';

const LOCAL_STORAGE_KEY = 'church_cms_audit_logs';

export interface LogAuditPayload {
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, any>;
  actor_id?: string | null;
  actor_name?: string;
  actor_role?: string | null;
}

const DEMO_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    church_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: 'u0000000-0000-0000-0000-000000000001',
    action: 'donation.recorded',
    resource_type: 'donations',
    resource_id: 'don-001',
    details: { amount: 500, fund: 'General Offering', donor: 'Sarah Jenkins' },
    ip_address: '192.168.1.45',
    user_agent: 'Chrome/124.0 (macOS)',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'aud-2',
    church_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: 'u0000000-0000-0000-0000-000000000001',
    action: 'member.updated',
    resource_type: 'members',
    resource_id: 'cm-002',
    details: { field: 'status', old_value: 'inactive', new_value: 'active' },
    ip_address: '192.168.1.45',
    user_agent: 'Chrome/124.0 (macOS)',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'aud-3',
    church_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: 'u0000000-0000-0000-0000-000000000002',
    action: 'child.checked_in',
    resource_type: 'children',
    resource_id: 'ch-1',
    details: { child: 'Noah Jenkins', class: 'Little Lambs Nursery', pin: 'PIN-8842' },
    ip_address: '192.168.1.60',
    user_agent: 'Safari/17.0 (iOS Checkin iPad)',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 'aud-4',
    church_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: 'u0000000-0000-0000-0000-000000000001',
    action: 'prayer.answered',
    resource_type: 'prayer_requests',
    resource_id: 'pr-1',
    details: { prayer_title: 'Healing for David\'s Mother', notes: 'Surgery went successfully' },
    ip_address: '192.168.1.45',
    user_agent: 'Chrome/124.0 (macOS)',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'aud-5',
    church_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: 'u0000000-0000-0000-0000-000000000001',
    action: 'settings.updated',
    resource_type: 'church_settings',
    resource_id: 'cs-001',
    details: { changed_keys: ['service_times', 'primary_color'] },
    ip_address: '192.168.1.45',
    user_agent: 'Chrome/124.0 (macOS)',
    created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
  },
];

function getLocalAuditLogs(churchId: string): AuditLog[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${churchId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Silent fallback
  }
  return [];
}

function saveLocalAuditLogs(churchId: string, logs: AuditLog[]) {
  try {
    // Keep only the 50 most recent logs for local storage
    const trimmed = (logs || []).slice(0, 50);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${churchId}`, JSON.stringify(trimmed));
  } catch (e) {
    try {
      // If quota exceeded, cap at 20 most recent logs
      const compact = (logs || []).slice(0, 20);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${churchId}`, JSON.stringify(compact));
    } catch (e2) {
      // Silent fallback when quota is completely full
    }
  }
}

export const auditService = {
  async getAuditLogs(churchId: string, resourceType?: string): Promise<AuditLog[]> {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (resourceType && resourceType !== 'all') {
        query = query.eq('resource_type', resourceType);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as AuditLog[];
      }
    }

    let list = getLocalAuditLogs(churchId);
    if (resourceType && resourceType !== 'all') {
      list = list.filter((l) => l.resource_type === resourceType);
    }
    return list;
  },

  async logAction(churchId: string, payload: LogAuditPayload): Promise<void> {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      church_id: churchId,
      user_id: payload.actor_id || null,
      action: payload.action,
      resource_type: payload.resource_type,
      resource_id: payload.resource_id || null,
      details: payload.details || {},
      ip_address: '127.0.0.1',
      user_agent: typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'Server/MobileApp',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      await supabase.from('audit_logs').insert([{
        church_id: churchId,
        actor_id: newLog.user_id,
        actor_name: payload.actor_name || 'Staff User',
        actor_role: payload.actor_role || 'staff',
        action: newLog.action,
        resource_type: newLog.resource_type,
        resource_id: newLog.resource_id,
        details: newLog.details,
        ip_address: newLog.ip_address,
        user_agent: newLog.user_agent,
      }]);
    }

    const current = getLocalAuditLogs(churchId);
    const updated = [newLog, ...current];
    saveLocalAuditLogs(churchId, updated);
  },
};
