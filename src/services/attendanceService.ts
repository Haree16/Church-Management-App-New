import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSessionType,
  CheckInType,
  ChurchMember,
  Visitor,
  ChurchEvent,
  Group,
  Ministry,
} from '@/types/database';
import { DEMO_MEMBERS, DEMO_VISITORS, DEMO_SETTINGS, DEMO_GROUPS, DEMO_MINISTRIES } from '@/lib/mockData';

const LOCAL_STORAGE_ATTENDANCE_KEY = 'church_cms_attendance_data';

export interface RecordAttendancePayload {
  member_id?: string;
  visitor_id?: string;
  event_id?: string;
  group_id?: string;
  ministry_id?: string;
  service_timing_id?: string;
  session_type?: AttendanceSessionType | string;
  service_name: string;
  service_date: string;
  check_in_time?: string;
  check_in_type?: CheckInType | string;
  status?: AttendanceStatus;
  notes?: string;
}

export interface BulkAttendancePayload {
  session_name: string;
  session_date: string;
  session_type: AttendanceSessionType | string;
  service_timing_id?: string;
  event_id?: string;
  group_id?: string;
  ministry_id?: string;
  records: {
    member_id?: string;
    visitor_id?: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export interface QRCheckinPayload {
  qr_code?: string;
  membership_number?: string;
  phone_or_email?: string;
  service_name: string;
  service_date: string;
  service_timing_id?: string;
  event_id?: string;
}

const INITIAL_DEMO_ATTENDANCE: AttendanceRecord[] = [];

function getLocalAttendance(churchId: string): AttendanceRecord[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_ATTENDANCE_KEY}_${churchId}`);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load local attendance:', e);
  }
  return [];
}

function saveLocalAttendance(churchId: string, list: AttendanceRecord[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_ATTENDANCE_KEY}_${churchId}`, JSON.stringify(list));
    }
  } catch (e) {
    console.error('Failed to save local attendance:', e);
  }
}

export const attendanceService = {
  async getAttendance(
    churchId: string,
    filters?: {
      date?: string;
      serviceTimingId?: string;
      sessionType?: string;
      eventId?: string;
      groupId?: string;
      ministryId?: string;
      status?: string;
      memberId?: string;
    }
  ): Promise<AttendanceRecord[]> {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          member:church_members(
            *,
            profile:profiles(*)
          ),
          visitor:visitors(*),
          event:events(*),
          group:groups(*),
          ministry:ministries(*)
        `)
        .eq('church_id', churchId)
        .order('service_date', { ascending: false });

      if (filters?.date) query = query.eq('service_date', filters.date);
      if (filters?.serviceTimingId && filters.serviceTimingId !== 'all') {
        query = query.eq('service_timing_id', filters.serviceTimingId);
      }
      if (filters?.sessionType && filters.sessionType !== 'all') {
        query = query.eq('session_type', filters.sessionType);
      }
      if (filters?.eventId && filters.eventId !== 'all') {
        query = query.eq('event_id', filters.eventId);
      }
      if (filters?.groupId && filters.groupId !== 'all') {
        query = query.eq('group_id', filters.groupId);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.memberId) {
        query = query.eq('member_id', filters.memberId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as AttendanceRecord[];
      }
    }

    let local = getLocalAttendance(churchId);

    if (filters?.date) {
      local = local.filter((a) => a.service_date === filters.date);
    }
    if (filters?.serviceTimingId && filters.serviceTimingId !== 'all') {
      local = local.filter((a) => a.service_timing_id === filters.serviceTimingId);
    }
    if (filters?.sessionType && filters.sessionType !== 'all') {
      local = local.filter((a) => a.session_type === filters.sessionType);
    }
    if (filters?.eventId && filters.eventId !== 'all') {
      local = local.filter((a) => a.event_id === filters.eventId);
    }
    if (filters?.groupId && filters.groupId !== 'all') {
      local = local.filter((a) => a.group_id === filters.groupId);
    }
    if (filters?.status && filters.status !== 'all') {
      local = local.filter((a) => a.status === filters.status);
    }
    if (filters?.memberId) {
      local = local.filter((a) => a.member_id === filters.memberId);
    }

    return local.map((a) => ({
      ...a,
      member: DEMO_MEMBERS.find((m) => m.id === a.member_id) || null,
      visitor: DEMO_VISITORS.find((v) => v.id === a.visitor_id) || null,
      group: DEMO_GROUPS.find((g) => g.id === a.group_id) || null,
      ministry: DEMO_MINISTRIES.find((m) => m.id === a.ministry_id) || null,
    }));
  },

  async recordAttendance(
    churchId: string,
    payload: RecordAttendancePayload
  ): Promise<AttendanceRecord> {
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      church_id: churchId,
      member_id: payload.member_id || null,
      visitor_id: payload.visitor_id || null,
      event_id: payload.event_id || null,
      group_id: payload.group_id || null,
      ministry_id: payload.ministry_id || null,
      service_timing_id: payload.service_timing_id || null,
      session_type: payload.session_type || 'Sunday Service',
      service_name: payload.service_name,
      service_date: payload.service_date,
      check_in_time: payload.check_in_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      check_in_type: payload.check_in_type || 'in_person',
      status: payload.status || 'present',
      notes: payload.notes || null,
      created_at: new Date().toISOString(),
      member: DEMO_MEMBERS.find((m) => m.id === payload.member_id) || null,
      visitor: DEMO_VISITORS.find((v) => v.id === payload.visitor_id) || null,
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('attendance')
        .insert([newRecord])
        .select('*')
        .single();
      if (!error && data) return data as AttendanceRecord;
    }

    const local = getLocalAttendance(churchId);
    const updated = [newRecord, ...local];
    saveLocalAttendance(churchId, updated);
    return newRecord;
  },

  async bulkRecordAttendance(
    churchId: string,
    payload: BulkAttendancePayload
  ): Promise<AttendanceRecord[]> {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newRecords: AttendanceRecord[] = payload.records.map((r, idx) => ({
      id: `att-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      church_id: churchId,
      member_id: r.member_id || null,
      visitor_id: r.visitor_id || null,
      event_id: payload.event_id || null,
      group_id: payload.group_id || null,
      ministry_id: payload.ministry_id || null,
      service_timing_id: payload.service_timing_id || null,
      session_type: payload.session_type,
      service_name: payload.session_name,
      service_date: payload.session_date,
      check_in_time: nowTime,
      check_in_type: 'manual_roster',
      status: r.status,
      notes: r.notes || null,
      created_at: new Date().toISOString(),
      member: DEMO_MEMBERS.find((m) => m.id === r.member_id) || null,
      visitor: DEMO_VISITORS.find((v) => v.id === r.visitor_id) || null,
    }));

    if (isSupabaseConfigured()) {
      await supabase.from('attendance').insert(newRecords);
    }

    const local = getLocalAttendance(churchId);
    const updated = [...newRecords, ...local];
    saveLocalAttendance(churchId, updated);
    return newRecords;
  },

  async undoAttendance(churchId: string, attendanceId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('attendance').delete().eq('id', attendanceId);
    }
    const local = getLocalAttendance(churchId);
    saveLocalAttendance(churchId, local.filter((a) => a.id !== attendanceId));
  },

  async processQRCheckin(
    churchId: string,
    payload: QRCheckinPayload
  ): Promise<{ success: boolean; attendeeName: string; isVisitor: boolean; record: AttendanceRecord }> {
    const members = DEMO_MEMBERS;
    const visitors = DEMO_VISITORS;

    let matchedMember: ChurchMember | undefined;
    let matchedVisitor: Visitor | undefined;

    const term = (payload.membership_number || payload.qr_code || payload.phone_or_email || '').trim().toLowerCase();

    if (term) {
      matchedMember = members.find((m) =>
        m.membership_number?.toLowerCase() === term ||
        m.id.toLowerCase() === term ||
        (m.profile?.phone && m.profile.phone.replace(/\D/g, '') === term.replace(/\D/g, '')) ||
        m.profile?.email?.toLowerCase() === term ||
        m.profile?.display_name?.toLowerCase().includes(term)
      );

      if (!matchedMember) {
        matchedVisitor = visitors.find((v) =>
          v.id.toLowerCase() === term ||
          (v.phone && v.phone.replace(/\D/g, '') === term.replace(/\D/g, '')) ||
          v.email?.toLowerCase() === term ||
          `${v.first_name} ${v.last_name}`.toLowerCase().includes(term)
        );
      }
    }

    if (!matchedMember && !matchedVisitor) {
      throw new Error(`No member or registered visitor found matching "${term}".`);
    }

    const record = await this.recordAttendance(churchId, {
      member_id: matchedMember?.id,
      visitor_id: matchedVisitor?.id,
      service_name: payload.service_name,
      service_date: payload.service_date,
      service_timing_id: payload.service_timing_id,
      event_id: payload.event_id,
      session_type: 'Sunday Service',
      check_in_type: payload.qr_code ? 'qr_scan' : 'kiosk',
      status: matchedVisitor ? 'first_time_visitor' : 'present',
      notes: payload.qr_code ? 'Scanned digital QR pass' : 'Self check-in kiosk search',
    });

    const attendeeName = matchedMember
      ? matchedMember.profile?.display_name || 'Member'
      : `${matchedVisitor?.first_name} ${matchedVisitor?.last_name} (Visitor)`;

    return {
      success: true,
      attendeeName,
      isVisitor: !!matchedVisitor,
      record,
    };
  },

  async getAttendanceReports(churchId: string) {
    const attendance = await this.getAttendance(churchId);

    // Group by Service Dates
    const dateMap: Record<string, { total: number; members: number; visitors: number; present: number }> = {};
    attendance.forEach((a) => {
      if (!dateMap[a.service_date]) {
        dateMap[a.service_date] = { total: 0, members: 0, visitors: 0, present: 0 };
      }
      dateMap[a.service_date].total += 1;
      if (a.status === 'present' || a.status === 'first_time_visitor') {
        dateMap[a.service_date].present += 1;
      }
      if (a.visitor_id || a.status === 'first_time_visitor') {
        dateMap[a.service_date].visitors += 1;
      } else {
        dateMap[a.service_date].members += 1;
      }
    });

    const dailyTrends = Object.entries(dateMap)
      .map(([date, d]) => ({
        date,
        total: d.total,
        present: d.present,
        members: d.members,
        visitors: d.visitors,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // By Service Name breakdown
    const serviceMap: Record<string, number> = {};
    attendance.forEach((a) => {
      const sName = a.service_name || 'Sunday Service';
      serviceMap[sName] = (serviceMap[sName] || 0) + 1;
    });

    const serviceBreakdown = Object.entries(serviceMap).map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / Math.max(attendance.length, 1)) * 100),
    }));

    return {
      totalRecords: attendance.length,
      dailyTrends,
      serviceBreakdown,
    };
  },

  async getAttendanceStats(churchId: string) {
    const attendance = await this.getAttendance(churchId);

    const presentCount = attendance.filter((a) => a.status === 'present').length;
    const visitorCount = attendance.filter((a) => a.status === 'first_time_visitor' || a.visitor_id).length;
    const qrScansCount = attendance.filter((a) => a.check_in_type === 'qr_scan').length;

    const confirmationRate = attendance.length > 0
      ? Math.round(((presentCount + visitorCount) / attendance.length) * 100)
      : 96;

    return {
      totalAttendees: attendance.length,
      sundayAttendance: presentCount + visitorCount,
      weeklyAverage: Math.round(attendance.length / 4) || 285,
      firstTimeVisitors: visitorCount,
      qrScansCount,
      confirmationRate,
    };
  },
};
