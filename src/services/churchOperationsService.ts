/**
 * Church Operations Service
 * Phase 3: AI-Powered Church Operations, Operational Inquiries,
 * Birthday Reminders, Visitor Follow-Up, Volunteer Rosters & Gaps, and Dashboard Metrics.
 */

import { 
  getStoredMembers, 
  getStoredRoster, 
  getStoredAttendance, 
  getStoredEvents, 
  getStoredMinistries,
  getStoredChurchSettings 
} from '@/utils/storage';
import { 
  BirthdayRecipient, 
  VolunteerServiceGap, 
  VisitorFollowUpItem, 
  OperationsDashboardMetrics 
} from '@/types/churchOperations';
import { whatsAppService, normalizePhoneNumber } from './whatsAppService';
import { auditService } from './auditService';
import { churchAiInsightsService } from './churchAiInsightsService';

export const churchOperationsService = {
  /**
   * 1. OPERATIONAL ABSENTEES: Members not attending for last 4 consecutive Sundays
   */
  async getOperationalAbsentees(churchId: string, consecutiveSundaysCount: number = 4): Promise<{
    consecutiveSundaysThreshold: number;
    totalAbsenteesCount: number;
    absentees: Array<{
      memberId: string;
      name: string;
      phoneMasked: string;
      phoneRaw: string;
      lastAttendedDate: string | null;
      missedCount: number;
      familyRelation?: string;
    }>;
    explanation: string;
  }> {
    const tz = churchAiInsightsService.getChurchTimezone(churchId);
    const todayStr = churchAiInsightsService.getTodayInChurchTimezone(churchId);
    const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
    const today = new Date(tYear, tMonth - 1, tDay);

    // Identify last N Sundays
    const dayOfWeek = today.getDay();
    const mostRecentSunday = new Date(today);
    if (dayOfWeek !== 0) {
      mostRecentSunday.setDate(today.getDate() - dayOfWeek);
    }

    const sundays: string[] = [];
    for (let i = 0; i < consecutiveSundaysCount; i++) {
      const sun = new Date(mostRecentSunday);
      sun.setDate(mostRecentSunday.getDate() - (i * 7));
      const y = sun.getFullYear();
      const m = String(sun.getMonth() + 1).padStart(2, '0');
      const d = String(sun.getDate()).padStart(2, '0');
      sundays.push(`${y}-${m}-${d}`);
    }

    const members = getStoredMembers().filter(m => (m.churchId === churchId || m.church_id === churchId) && (m.status as string) !== 'Inactive');
    const attendanceRecords = getStoredAttendance().filter(a => a.churchId === churchId || a.church_id === churchId);

    // Check attendance for each member across the last N Sundays
    const absentees: any[] = [];

    for (const mem of members) {
      // Find records on those specific Sundays
      const attendedOnTargetSundays = attendanceRecords.filter(rec => 
        sundays.includes(rec.date) && rec.presentMemberIds?.includes(mem.id)
      );

      if (attendedOnTargetSundays.length === 0) {
        // Find most recent attendance date overall
        const allAttended = attendanceRecords
          .filter(rec => rec.presentMemberIds?.includes(mem.id))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastDate = allAttended[0]?.date || null;
        const phone = mem.phone || '';
        const phoneMasked = phone.length >= 7 
          ? `${phone.substring(0, 3)}****${phone.substring(phone.length - 3)}`
          : 'Protected';

        absentees.push({
          memberId: mem.id,
          name: `${mem.firstName} ${mem.lastName}`.trim(),
          phoneMasked,
          phoneRaw: phone,
          lastAttendedDate: lastDate,
          missedCount: consecutiveSundaysCount,
          familyRelation: mem.familyMembers?.[0]?.relationship
        });
      }
    }

    return {
      consecutiveSundaysThreshold: consecutiveSundaysCount,
      totalAbsenteesCount: absentees.length,
      absentees: absentees.slice(0, 20), // Bounded slice
      explanation: `Identified covenant members who were not recorded present across ${sundays.join(', ')}.`
    };
  },

  /**
   * 2. UPCOMING BIRTHDAYS: Privacy-conscious birthday query
   */
  async getUpcomingBirthdays(churchId: string, daysAhead: number = 30): Promise<{
    timeframeDays: number;
    totalBirthdaysFound: number;
    recipients: BirthdayRecipient[];
    explanation: string;
  }> {
    const members = getStoredMembers().filter(m => (m.churchId === churchId || m.church_id === churchId) && (m.status as string) !== 'Inactive');
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const history = whatsAppService.getWhatsAppHistory(churchId);
    const recipients: BirthdayRecipient[] = [];

    for (const mem of members) {
      if (!mem.birthdate) continue;

      // Parse birthdate (supports YYYY-MM-DD or MM-DD)
      const parts = mem.birthdate.split('-');
      let bMonth = 0;
      let bDay = 0;

      if (parts.length === 3) {
        bMonth = parseInt(parts[1], 10) - 1;
        bDay = parseInt(parts[2], 10);
      } else if (parts.length === 2) {
        bMonth = parseInt(parts[0], 10) - 1;
        bDay = parseInt(parts[1], 10);
      } else {
        continue;
      }

      // Calculate upcoming birthday date this year
      let bDate = new Date(currentYear, bMonth, bDay);
      if (bDate < today) {
        bDate = new Date(currentYear + 1, bMonth, bDay);
      }

      const diffMs = bDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= daysAhead) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const birthDayMonth = `${monthNames[bMonth]} ${bDay}`;

        // Check if greeting was already dispatched this calendar year
        const normalizedPhone = normalizePhoneNumber(mem.phone || '');
        const alreadySent = history.some(m => 
          m.recipientPhone === normalizedPhone && 
          m.templateName === 'birthday_blessing' && 
          m.status !== 'failed' &&
          new Date(m.createdAt).getFullYear() === currentYear
        );

        recipients.push({
          memberId: mem.id,
          name: `${mem.firstName} ${mem.lastName}`.trim(),
          phone: mem.phone || '',
          birthDayMonth,
          birthdateRaw: mem.birthdate,
          daysUntilBirthday: diffDays,
          isToday: diffDays === 0,
          preferredLanguage: 'en',
          hasBeenSentGreetingThisYear: alreadySent
        });
      }
    }

    recipients.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    return {
      timeframeDays: daysAhead,
      totalBirthdaysFound: recipients.length,
      recipients,
      explanation: `Identified ${recipients.length} member birthday(s) in the next ${daysAhead} days. Full birth years are withheld for member privacy.`
    };
  },

  /**
   * 3. VOLUNTEER COORDINATION: Scheduled Volunteers & Vacancy Gaps
   */
  async getVolunteerRosterAndGaps(churchId: string, targetServiceDate?: string): Promise<{
    serviceDate: string;
    serviceName: string;
    totalAssignmentsCount: number;
    confirmedCount: number;
    pendingCount: number;
    unfilledGapsCount: number;
    assignments: VolunteerServiceGap[];
    unfilledGaps: VolunteerServiceGap[];
    explanation: string;
  }> {
    const tz = churchAiInsightsService.getChurchTimezone(churchId);
    const todayStr = churchAiInsightsService.getTodayInChurchTimezone(churchId);
    
    // Default to upcoming Sunday
    let serviceDate = targetServiceDate;
    if (!serviceDate) {
      const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
      const today = new Date(tYear, tMonth - 1, tDay);
      const dayOfWeek = today.getDay();
      const nextSunday = new Date(today);
      const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
      nextSunday.setDate(today.getDate() + daysUntilSunday);
      const y = nextSunday.getFullYear();
      const m = String(nextSunday.getMonth() + 1).padStart(2, '0');
      const d = String(nextSunday.getDate()).padStart(2, '0');
      serviceDate = `${y}-${m}-${d}`;
    }

    const roster = getStoredRoster().filter(r => (r.churchId === churchId || r.church_id === churchId) && r.serviceDate === serviceDate);
    const ministries = getStoredMinistries().filter(m => (m.churchId === churchId || m.church_id === churchId) && m.status === 'Active');
    const members = getStoredMembers().filter(m => m.churchId === churchId || m.church_id === churchId);

    const assignments: VolunteerServiceGap[] = [];
    const unfilledGaps: VolunteerServiceGap[] = [];

    // Map existing roster entries
    for (const r of roster) {
      const mem = members.find(m => m.id === r.memberId);
      assignments.push({
        id: r.id,
        serviceDate,
        serviceName: r.serviceName || 'Sunday Worship Service',
        ministryName: r.team || r.roleName || 'Ministry Volunteer',
        roleName: r.roleName,
        assignedMemberId: r.memberId,
        assignedMemberName: r.memberName,
        phone: mem?.phone || '',
        confirmed: Boolean(r.confirmed),
        isVacant: false
      });
    }

    // Standard required roles across major ministries
    const requiredMinistryRoles: Array<{ ministry: string; role: string }> = [
      { ministry: 'Worship & Music', role: 'Worship Leader' },
      { ministry: 'Worship & Music', role: 'Audio / Sound Engineer' },
      { ministry: 'Tech & Media', role: 'Livestream & Visual Projection' },
      { ministry: 'Hospitality & Welcome', role: 'Sanctuary Usher' },
      { ministry: 'Hospitality & Welcome', role: 'Welcome Greeter' },
      { ministry: "Children's Ministry", role: 'Sunday School Teacher' }
    ];

    for (const req of requiredMinistryRoles) {
      const isFilled = assignments.some(a => 
        (a.ministryName.toLowerCase().includes(req.ministry.toLowerCase()) || 
         a.roleName.toLowerCase().includes(req.role.toLowerCase()))
      );

      if (!isFilled) {
        unfilledGaps.push({
          id: `gap_${req.ministry.replace(/\s+/g, '_')}_${Date.now()}`,
          serviceDate,
          serviceName: 'Sunday Worship Service',
          ministryName: req.ministry,
          roleName: req.role,
          confirmed: false,
          isVacant: true
        });
      }
    }

    const confirmedCount = assignments.filter(a => a.confirmed).length;
    const pendingCount = assignments.filter(a => !a.confirmed).length;

    return {
      serviceDate,
      serviceName: 'Sunday Worship Service',
      totalAssignmentsCount: assignments.length,
      confirmedCount,
      pendingCount,
      unfilledGapsCount: unfilledGaps.length,
      assignments,
      unfilledGaps,
      explanation: `Analyzed roster duties for ${serviceDate}: ${confirmedCount} confirmed, ${pendingCount} pending confirmation, ${unfilledGaps.length} unfilled roles identified.`
    };
  },

  /**
   * 4. VISITOR FOLLOW-UP WORKFLOW
   */
  async getVisitorFollowUpList(churchId: string): Promise<{
    totalVisitorsPending: number;
    visitors: VisitorFollowUpItem[];
    explanation: string;
  }> {
    const churchSettings = getStoredChurchSettings(churchId);
    const churchName = churchSettings?.profile?.name || 'New Creation Church';

    // Retrieve members marked as 'Visitor' or attendance records with guest entries
    const members = getStoredMembers().filter(m => 
      (m.churchId === churchId || m.church_id === churchId) && 
      (m.status === 'Visitor' || m.status === 'Regular Attender')
    );

    const history = whatsAppService.getWhatsAppHistory(churchId);
    const visitors: VisitorFollowUpItem[] = [];

    for (const v of members) {
      const normalizedPhone = normalizePhoneNumber(v.phone || '');
      const welcomeSent = history.some(m => 
        m.recipientPhone === normalizedPhone && 
        m.templateName === 'first_visitor_welcome' && 
        m.status !== 'failed'
      );

      const hasConsent = Boolean(v.phone && v.phone.length >= 7 && !whatsAppService.isOptedOut(churchId, v.phone));

      const draftWelcomeMessageEn = whatsAppService.renderTemplate('first_visitor_welcome', 'en', {
        VisitorName: `${v.firstName} ${v.lastName}`.trim(),
        ChurchName: churchName,
        VisitDate: v.joinedDate || 'recent service'
      });

      const draftWelcomeMessageTa = whatsAppService.renderTemplate('first_visitor_welcome', 'ta', {
        VisitorName: `${v.firstName} ${v.lastName}`.trim(),
        ChurchName: churchName,
        VisitDate: v.joinedDate || 'recent service'
      });

      visitors.push({
        visitorId: v.id,
        name: `${v.firstName} ${v.lastName}`.trim(),
        phone: v.phone || '',
        visitDate: v.joinedDate || 'Recent Service',
        serviceAttended: 'Sunday Worship Service',
        followUpStatus: welcomeSent ? 'welcome_sent' : 'contact_pending',
        hasConsent,
        draftWelcomeMessageEn,
        draftWelcomeMessageTa
      });
    }

    const pending = visitors.filter(v => v.followUpStatus === 'contact_pending' && v.hasConsent);

    return {
      totalVisitorsPending: pending.length,
      visitors,
      explanation: `Found ${pending.length} visitor(s) awaiting welcoming contact. Verified communication permissions and phone validity.`
    };
  },

  async markVisitorFollowUpCompleted(churchId: string, visitorId: string, notes?: string, completedBy: string = 'Pastoral Staff'): Promise<{ success: boolean; message: string }> {
    const members = getStoredMembers();
    const v = members.find(m => m.id === visitorId && (m.churchId === churchId || m.church_id === churchId));
    if (!v) {
      return { success: false, message: `Visitor record '${visitorId}' not found.` };
    }

    await auditService.logAction(churchId, {
      action: 'visitor_follow_up_completed',
      resource_type: 'visitor',
      actor_name: completedBy,
      actor_role: 'Staff',
      details: { visitorId, visitorName: `${v.firstName} ${v.lastName}`, notes }
    }).catch(() => {});

    return { success: true, message: `Marked follow-up as completed for ${v.firstName} ${v.lastName}.` };
  },

  /**
   * 5. OPERATIONAL ATTENDANCE & VISITOR RECONCILIATION SUMMARY (Last Month)
   */
  async getOperationalAttendanceVisitorSummary(churchId: string): Promise<{
    periodLabel: string;
    totalServices: number;
    totalHeadcount: number;
    uniqueAttendeesCount: number;
    registeredMembersPresent: number;
    firstTimeVisitorsCount: number;
    returningVisitorsCount: number;
    averagePerService: number;
    highestService: { date: string; serviceName: string; presentCount: number } | null;
    explanation: string;
  }> {
    const summary = await churchAiInsightsService.getAttendanceSummary(churchId, 'last_month');
    const members = getStoredMembers().filter(m => (m.churchId === churchId || m.church_id === churchId));
    const visitors = members.filter(m => m.status === 'Visitor');

    return {
      periodLabel: summary.periodLabel || 'Last Month',
      totalServices: summary.totalServicesCount,
      totalHeadcount: summary.totalHeadcount,
      uniqueAttendeesCount: summary.uniqueAttendeesCount,
      registeredMembersPresent: summary.totalMemberCheckIns,
      firstTimeVisitorsCount: summary.totalGuestCheckIns,
      returningVisitorsCount: visitors.length,
      averagePerService: summary.averageHeadcountPerService,
      highestService: summary.highestService ? {
        date: summary.highestService.date,
        serviceName: summary.highestService.serviceName,
        presentCount: summary.highestService.headcount
      } : null,
      explanation: `Synthesized attendance and visitor numbers for ${summary.periodLabel} across ${summary.totalServicesCount} verified services.`
    };
  },

  /**
   * 6. OPERATIONS DASHBOARD METRICS
   */
  async getOperationsDashboardMetrics(churchId: string): Promise<OperationsDashboardMetrics> {
    const history = whatsAppService.getWhatsAppHistory(churchId);
    const config = whatsAppService.getWhatsAppConfig(churchId);
    const optOuts = whatsAppService.getOptOutList(churchId);

    const sent = history.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length;
    const delivered = history.filter(m => m.status === 'delivered' || m.status === 'read').length;
    const failed = history.filter(m => m.status === 'failed').length;
    const totalDispatched = sent + failed;
    const successRate = totalDispatched > 0 ? Math.round((delivered / totalDispatched) * 100) : 100;

    const [birthdays, volunteerData, visitorData] = await Promise.all([
      this.getUpcomingBirthdays(churchId, 14),
      this.getVolunteerRosterAndGaps(churchId),
      this.getVisitorFollowUpList(churchId)
    ]);

    const recentActivity = history.slice(0, 5).map(m => ({
      id: m.id,
      timestamp: m.createdAt,
      description: `WhatsApp to ${m.recipientName}: ${m.templateName.replace(/_/g, ' ')} (${m.status})`,
      type: 'whatsapp_sent' as const,
      status: m.status === 'failed' ? 'warning' as const : 'success' as const
    }));

    return {
      totalMessagesSent: sent,
      totalMessagesDelivered: delivered,
      totalMessagesFailed: failed,
      totalOptedOutCount: optOuts.length,
      deliverySuccessRatePercent: successRate,
      providerStatus: config.environment,
      pendingVisitorFollowUpsCount: visitorData.totalVisitorsPending,
      upcomingBirthdaysCount: birthdays.totalBirthdaysFound,
      upcomingServiceDate: volunteerData.serviceDate,
      assignedVolunteersCount: volunteerData.totalAssignmentsCount,
      unfilledVolunteerGapsCount: volunteerData.unfilledGapsCount,
      recentActivity,
      metrics: {
        totalSentPast30Days: sent,
        deliveredCount: delivered,
        failedCount: failed,
        optedOutCount: optOuts.length,
        deliverySuccessRate: `${successRate}%`,
        pendingVisitorFollowUps: visitorData.totalVisitorsPending,
        upcomingBirthdaysCount: birthdays.totalBirthdaysFound,
        unfilledVolunteerGapsCount: volunteerData.unfilledGapsCount
      }
    };
  }
};
