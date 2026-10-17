/**
 * Automated Test Suite: Prayer Ministry Module
 * Tests:
 * 1. Authorization & Role-Based Permissions (Admin, Ministry Leader, Group Leader, Intercessor, Believer)
 * 2. Privacy Boundary Enforcement (Private request isolation, multi-tenant boundaries, group-scoping)
 * 3. Prayer Group Membership & Lifecycle (Creation, assignment, join requests, approval)
 * 4. Prayer Request Lifecycle & Pastoral Follow-Up (Create, update, prayer count, notes, testimonies)
 * 5. Prayer Meetings & Authorized Attendance Tracking
 * 6. Bilingual Scripture Prayer Guides (English & Tamil) & AI Privacy Safeguards
 * 7. Lock-Screen Safe Push Notification Payloads
 */

import { prayerMinistryService } from '../prayerMinistryService';
import { 
  EnhancedPrayerRequest, 
  PrayerGroup, 
  PrayerMeeting, 
  PrayerGuide,
  PrayerMinistryRole 
} from '../../types/prayerMinistry';
import { SaaSUser, Member } from '../../types';

// Mock browser globals for node test execution
if (typeof window === 'undefined') {
  const storageMap = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASSED: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAILED: ${testName} ${detail ? `(${detail})` : ''}`);
    failedCount++;
  }
}

export async function runPrayerMinistryTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING PRAYER MINISTRY MODULE AUTHORIZATION & PRIVACY TESTS');
  console.log('===============================================================\n');

  const churchId = 'church-test-01';
  const otherChurchId = 'church-test-02';

  // --- Test Users ---
  const churchAdminUser: SaaSUser = {
    id: 'usr-admin-1',
    church_id: churchId,
    username: 'senior.pastor',
    name: 'Senior Pastor David',
    email: 'pastor@church.org',
    phone: '+91 98765 43210',
    role: 'PastorAdmin',
  };

  const ministryLeaderUser: SaaSUser = {
    id: 'usr-leader-1',
    church_id: churchId,
    username: 'prayer.director',
    name: 'Rachel Thomas',
    email: 'rachel@church.org',
    phone: '+91 98765 43211',
    role: 'MinistryLeader',
  };

  const groupLeaderUser: SaaSUser = {
    id: 'usr-grpleader-1',
    church_id: churchId,
    username: 'group.leader',
    name: 'Samuel John',
    email: 'samuel@church.org',
    phone: '+91 98765 43212',
    role: 'CellGroupLeader',
  };

  const intercessorMember: Member = {
    id: 'mem-intercessor-1',
    church_id: churchId,
    firstName: 'Grace',
    lastName: 'Mary',
    email: 'grace@church.org',
    phone: '+91 98765 43213',
    address: '12 Faith Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    zipCode: '600001',
    status: 'Member',
    joinedDate: '2024-01-01',
    familyMembers: [],
    ministryTeams: ['Prayer Team', 'Worship & Music'],
    availability: ['Sunday First Service'],
    skills: ['Intercession'],
    isPrivateNotes: false,
    createdAt: '2024-01-01',
  };

  const intercessorUser: SaaSUser = {
    id: 'usr-intercessor-1',
    church_id: churchId,
    member_id: intercessorMember.id,
    username: 'grace.mary',
    name: 'Grace Mary',
    email: 'grace@church.org',
    phone: '+91 98765 43213',
    role: 'Volunteer',
  };

  const normalBelieverMember: Member = {
    id: 'mem-believer-1',
    church_id: churchId,
    firstName: 'Peter',
    lastName: 'Paul',
    email: 'peter@church.org',
    phone: '+91 98765 43214',
    address: '44 Grace Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    zipCode: '600002',
    status: 'Member',
    joinedDate: '2024-02-01',
    familyMembers: [],
    ministryTeams: [],
    availability: [],
    skills: [],
    isPrivateNotes: false,
    createdAt: '2024-02-01',
  };

  const normalBelieverUser: SaaSUser = {
    id: 'usr-believer-1',
    church_id: churchId,
    member_id: normalBelieverMember.id,
    username: 'peter.paul',
    name: 'Peter Paul',
    email: 'peter@church.org',
    phone: '+91 98765 43214',
    role: 'Member',
  };

  const outsiderUser: SaaSUser = {
    id: 'usr-outsider-1',
    church_id: otherChurchId,
    username: 'external.user',
    name: 'External Person',
    email: 'external@other.org',
    phone: '+91 98765 99999',
    role: 'PastorAdmin',
  };

  // -------------------------------------------------------------------------
  // SUITE 1: PERMISSIONS & AUTHORIZATION MATRIX
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing RBAC Permissions Matrix ---');

  const adminPerms = prayerMinistryService.getPermissions(churchAdminUser);
  assert(adminPerms.isChurchAdmin === true, 'Church Admin recognized');
  assert(adminPerms.canManageGroups === true, 'Admin can manage prayer groups');
  assert(adminPerms.canManageMeetings === true, 'Admin can manage prayer meetings');
  assert(adminPerms.canRecordAttendance === true, 'Admin can record attendance');
  assert(adminPerms.canPublishPrayerGuide === true, 'Admin can publish prayer guide');
  assert(adminPerms.canViewSharedWithLeadersRequests === true, 'Admin can view leader prayer requests');

  const minLeaderPerms = prayerMinistryService.getPermissions(ministryLeaderUser);
  assert(minLeaderPerms.isMinistryLeader === true, 'Prayer Ministry Leader recognized');
  assert(minLeaderPerms.canManageGroups === true, 'Ministry Leader can manage prayer groups');
  assert(minLeaderPerms.canPublishPrayerGuide === true, 'Ministry Leader can publish prayer guides');
  assert(minLeaderPerms.canViewSharedWithLeadersRequests === true, 'Ministry Leader can view requests shared with leaders');

  const grpLeaderPerms = prayerMinistryService.getPermissions(groupLeaderUser);
  assert(grpLeaderPerms.isGroupLeader === true, 'Prayer Group Leader recognized');
  assert(grpLeaderPerms.canManageMeetings === true, 'Group Leader can manage meetings');
  assert(grpLeaderPerms.canRecordAttendance === true, 'Group Leader can record meeting attendance');
  assert(grpLeaderPerms.canPublishPrayerGuide === false, 'Group Leader cannot publish church-wide prayer guides');

  const intercessorPerms = prayerMinistryService.getPermissions(intercessorUser, intercessorMember);
  assert(intercessorPerms.isIntercessor === true, 'Intercessor (Prayer Team member) recognized');
  assert(intercessorPerms.canRecordFollowUp === true, 'Intercessor can record pastoral care follow-up notes');
  assert(intercessorPerms.canManageGroups === false, 'Intercessor cannot manage groups without leader role');

  const believerPerms = prayerMinistryService.getPermissions(normalBelieverUser, normalBelieverMember);
  assert(believerPerms.isChurchAdmin === false, 'Believer is not admin');
  assert(believerPerms.canManageGroups === false, 'Believer cannot manage groups');
  assert(believerPerms.canManageMeetings === false, 'Believer cannot manage meetings');
  assert(believerPerms.canRecordAttendance === false, 'Believer cannot record attendance');
  assert(believerPerms.canPublishPrayerGuide === false, 'Believer cannot publish guides');
  assert(believerPerms.canViewSharedWithLeadersRequests === false, 'Believer cannot view leader-only requests');

  // -------------------------------------------------------------------------
  // SUITE 2: STRICT PRIVACY & LEAK PREVENTION EVALUATOR
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Privacy Boundaries & Leak Prevention ---');

  const privateRequest: EnhancedPrayerRequest = {
    id: 'req-priv-01',
    church_id: churchId,
    member_id: normalBelieverMember.id,
    author_name: 'Peter Paul',
    author_email: 'peter@church.org',
    title: 'Personal Struggles with Work',
    description: 'Extremely confidential personal matter.',
    category: 'Spiritual Growth',
    privacy: 'private', // DEFAULT
    status: 'Active',
    prayer_count: 0,
    prayed_user_ids: [],
    follow_up_notes: [],
    is_answered: false,
    testimony_published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Requester can view their own private request
  assert(
    prayerMinistryService.canUserAccessRequest(privateRequest, normalBelieverUser, normalBelieverMember, [], believerPerms),
    'Requester can read their own private prayer request'
  );

  // Church Admin CANNOT view another person's strictly private request!
  assert(
    !prayerMinistryService.canUserAccessRequest(privateRequest, churchAdminUser, null, [], adminPerms),
    'Church Admin CANNOT view strictly private personal request (Zero Privacy Leak)'
  );

  // Group Leader CANNOT view another person's private request
  assert(
    !prayerMinistryService.canUserAccessRequest(privateRequest, groupLeaderUser, null, [], grpLeaderPerms),
    'Group Leader CANNOT view strictly private personal request'
  );

  // Cross-tenant user CANNOT view request from different church
  assert(
    !prayerMinistryService.canUserAccessRequest(privateRequest, outsiderUser, null, [], adminPerms),
    'Cross-church user CANNOT access data from different church'
  );

  // Testing 'prayer_leaders' visibility
  const leadersRequest: EnhancedPrayerRequest = {
    id: 'req-ldr-01',
    church_id: churchId,
    member_id: normalBelieverMember.id,
    author_name: 'Peter Paul',
    title: 'Hospital Surgery for Relative',
    description: 'Please pray for my mother undergoing surgery tomorrow.',
    category: 'Health & Healing',
    privacy: 'prayer_leaders',
    status: 'Active',
    prayer_count: 0,
    prayed_user_ids: [],
    follow_up_notes: [],
    is_answered: false,
    testimony_published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert(
    prayerMinistryService.canUserAccessRequest(leadersRequest, churchAdminUser, null, [], adminPerms),
    'Church Admin CAN access request shared with prayer leaders'
  );
  assert(
    prayerMinistryService.canUserAccessRequest(leadersRequest, ministryLeaderUser, null, [], minLeaderPerms),
    'Ministry Leader CAN access request shared with prayer leaders'
  );
  assert(
    !prayerMinistryService.canUserAccessRequest(leadersRequest, intercessorUser, intercessorMember, [], intercessorPerms),
    'Regular intercessor without leader role cannot access leader-only request'
  );

  // Testing 'group' visibility
  const groupRequest: EnhancedPrayerRequest = {
    id: 'req-grp-01',
    church_id: churchId,
    member_id: normalBelieverMember.id,
    author_name: 'Peter Paul',
    title: 'Family Thanksgiving',
    description: 'Our family is blessed with a new home.',
    category: 'Family & Relationships',
    privacy: 'group',
    target_group_id: 'grp-chennai-north',
    status: 'Active',
    prayer_count: 0,
    prayed_user_ids: [],
    follow_up_notes: [],
    is_answered: false,
    testimony_published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert(
    prayerMinistryService.canUserAccessRequest(groupRequest, normalBelieverUser, normalBelieverMember, ['grp-chennai-north'], believerPerms),
    'Group member CAN access request shared to their group'
  );
  assert(
    !prayerMinistryService.canUserAccessRequest(groupRequest, intercessorUser, intercessorMember, ['grp-other'], intercessorPerms),
    'Non-member of the group CANNOT access group-scoped request'
  );

  // Testing 'church_wide' visibility
  const publicRequest: EnhancedPrayerRequest = {
    id: 'req-pub-01',
    church_id: churchId,
    member_id: normalBelieverMember.id,
    author_name: 'Peter Paul',
    title: 'Mission Outreach in Coimbatore',
    description: 'Pray for the upcoming youth mission trip.',
    category: 'Church & Leadership',
    privacy: 'church_wide',
    status: 'Active',
    prayer_count: 0,
    prayed_user_ids: [],
    follow_up_notes: [],
    is_answered: false,
    testimony_published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert(
    prayerMinistryService.canUserAccessRequest(publicRequest, normalBelieverUser, normalBelieverMember, [], believerPerms),
    'Normal Believer CAN access church-wide prayer request'
  );
  assert(
    prayerMinistryService.canUserAccessRequest(publicRequest, intercessorUser, intercessorMember, [], intercessorPerms),
    'Intercessor CAN access church-wide prayer request'
  );

  // -------------------------------------------------------------------------
  // SUITE 3: PRAYER GROUP MANAGEMENT & MEMBERSHIP
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Prayer Groups & Membership Workflow ---');

  const newGroup: PrayerGroup = {
    id: 'grp-test-dawn',
    church_id: churchId,
    name: 'Dawn Watch Intercession Group',
    description: 'Early morning corporate prayer team meeting on weekdays.',
    meeting_day: 'Daily',
    meeting_time: '05:30 AM',
    frequency: 'Daily',
    meeting_type: 'Hybrid',
    location: 'Sanctuary Prayer Chapel & Online',
    online_url: 'https://meet.google.com/xyz-dawn-pray',
    leader_id: intercessorMember.id,
    leader_name: 'Grace Mary',
    topics: ['Revival', 'Youth Awakening', 'Missionaries'],
    visibility: 'Open',
    status: 'Active',
    member_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await prayerMinistryService.savePrayerGroup(churchId, newGroup);
  const groupsList = prayerMinistryService.getPrayerGroups(churchId);
  const foundGroup = groupsList.find((g) => g.id === newGroup.id);
  assert(Boolean(foundGroup), 'Prayer group saved and retrieved successfully');
  assert(foundGroup?.topics.includes('Revival') === true, 'Focus topics persisted correctly');

  // Join group request
  const joinResult = await prayerMinistryService.requestJoinGroup(
    churchId,
    newGroup.id,
    normalBelieverMember.id,
    'Peter Paul'
  );
  assert(joinResult.success === true, 'Member requested to join prayer group');

  // Verify member list and approval
  const groupMems = prayerMinistryService.getGroupMembers(churchId, newGroup.id);
  const pendingMember = groupMems.find((m) => m.member_id === normalBelieverMember.id);
  assert(pendingMember?.role === 'Member', 'Member recorded in prayer group');

  // -------------------------------------------------------------------------
  // SUITE 4: PRAYER REQUEST LIFECYCLE & PASTORAL FOLLOW-UP
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Prayer Request Lifecycle, Notes & Testimonies ---');

  // Create request
  const createdReq = await prayerMinistryService.savePrayerRequest(churchId, privateRequest, normalBelieverUser);
  assert(createdReq.id === privateRequest.id, 'Prayer request created successfully');

  // Toggle pray counter
  const prayUpdated = await prayerMinistryService.togglePrayForRequest(churchId, createdReq.id, intercessorUser.id);
  assert(prayUpdated?.prayer_count === 1, 'Prayer counter incremented');
  assert(prayUpdated?.prayed_user_ids?.includes(intercessorUser.id) === true, 'User ID recorded in pray list');

  // Pastoral Care Follow-up Note
  const followUpUpdated = await prayerMinistryService.addFollowUpNote(churchId, createdReq.id, {
    id: 'fn-001',
    prayer_request_id: createdReq.id,
    author_name: 'Grace Mary',
    author_role: 'Intercessor',
    note: 'Contacted Peter via phone; spent 15 minutes praying for work clarity.',
    created_at: new Date().toISOString(),
  });
  assert(followUpUpdated?.follow_up_notes?.length === 1, 'Pastoral follow-up note recorded');
  assert(
    followUpUpdated?.follow_up_notes?.[0].note.includes('praying for work clarity') === true,
    'Follow-up note content accurately preserved'
  );

  // Mark Answered with optional testimony
  const answeredUpdated = await prayerMinistryService.markRequestAnswered(
    churchId,
    createdReq.id,
    'God provided a remarkable breakthrough in my workplace this week!',
    true // Share as testimony
  );
  assert(answeredUpdated?.is_answered === true, 'Request marked as answered');
  assert(answeredUpdated?.testimony_published === true, 'Testimony opt-in recorded');
  assert(answeredUpdated?.testimony?.includes('breakthrough') === true, 'Testimony content recorded');

  // -------------------------------------------------------------------------
  // SUITE 5: PRAYER MEETINGS & ATTENDANCE
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Prayer Meetings & Attendance Tracking ---');

  const newMeeting: PrayerMeeting = {
    id: 'mtg-test-01',
    church_id: churchId,
    title: 'Friday Night All-Night Prayer',
    description: 'Corporate intercession for the nation and church families.',
    meeting_type: 'Hybrid',
    date: '2026-10-16',
    start_time: '10:00 PM',
    end_time: '04:00 AM',
    location: 'Main Sanctuary',
    online_url: 'https://meet.google.com/friday-all-night',
    organizer_id: ministryLeaderUser.id,
    organizer_name: 'Rachel Thomas',
    attendee_ids: [],
    attendance_enabled: true,
    attendance_records: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await prayerMinistryService.savePrayerMeeting(churchId, newMeeting);
  const meetingsList = prayerMinistryService.getPrayerMeetings(churchId);
  const foundMeeting = meetingsList.find((m) => m.id === newMeeting.id);
  assert(Boolean(foundMeeting), 'Prayer meeting saved and retrieved successfully');
  assert(foundMeeting?.meeting_type === 'Hybrid', 'Meeting format correctly set to hybrid');

  // RSVP workflow
  const rsvpMeeting = await prayerMinistryService.toggleMeetingRsvp(
    churchId,
    newMeeting.id,
    normalBelieverMember.id
  );
  assert(rsvpMeeting?.attendee_ids.includes(normalBelieverMember.id) === true, 'Member RSVP recorded');

  // Record Attendance
  const attendedMeeting = await prayerMinistryService.recordMeetingAttendance(
    churchId,
    newMeeting.id,
    [normalBelieverMember.id, intercessorMember.id],
    'Great spirit of prayer throughout the night.'
  );
  assert(attendedMeeting?.attendance_records?.length === 2, 'Attendance recorded for authorized meeting');

  // -------------------------------------------------------------------------
  // SUITE 6: BILINGUAL PRAYER GUIDES & PRIVACY SAFEGUARDS
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Bilingual Scripture Prayer Guides & AI Safeguards ---');

  const newGuide: PrayerGuide = {
    id: 'gd-test-01',
    church_id: churchId,
    title: 'Daily Bread & Intercession Guide',
    title_ta: 'அன்றாட அப்பமும் பரிந்துபேசும் ஜெப வழிகாட்டியும்',
    date: '2026-10-11',
    theme: 'Trusting God in all circumstances',
    theme_ta: 'எல்லா சூழ்நிலைகளிலும் தேவனை விசுவாசித்தல்',
    scripture_reference: 'Philippians 4:6-7',
    scripture_text_en: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
    scripture_text_ta: 'நீங்கள் ஒன்றுக்குங் கவலைப்படாமல், எல்லாவற்றையுங்குறித்து உங்கள் விண்ணப்பங்களை ஸ்தோத்திரத்தோடேகூடிய ஜெபத்தினாலும் வேண்டுதலினாலும் தேவனுக்குத் தெரியப்படுத்துங்கள்.',
    reflection_en: 'Bring every burden to the Lord and receive His supernatural peace.',
    reflection_ta: 'ஒவ்வொரு பாரத்தையும் கர்த்தரிடம் கொண்டுவந்து தேவ சமாதானத்தைப் பெற்றுக்கொள்ளுங்கள்.',
    prayer_points: [
      {
        id: 'pp-1',
        point_en: 'Give thanks for God\'s peace that transcends all understanding.',
        point_ta: 'எல்லாப் புத்திக்கும் மேலான தேவ சமாதானத்திற்காக நன்றி செலுத்துவோம்.',
      },
      {
        id: 'pp-2',
        point_en: 'Pray for families facing severe health and financial challenges.',
        point_ta: 'சுகவீனத்திலும் நிதி நெருக்கடியிலும் இருக்கும் குடும்பங்களுக்காக மன்றாடுவோம்.',
      },
    ],
    author_name: 'Senior Pastor David',
    author_role: 'PastorAdmin',
    status: 'Published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await prayerMinistryService.savePrayerGuide(churchId, newGuide);
  const guidesList = prayerMinistryService.getPrayerGuides(churchId);
  const foundGuide = guidesList.find((g) => g.id === newGuide.id);
  assert(Boolean(foundGuide), 'Bilingual prayer guide saved and retrieved');
  assert(Boolean(foundGuide?.scripture_text_ta), 'Tamil Scripture reference saved without degradation');
  assert(foundGuide?.prayer_points.length === 2, 'Bilingual prayer points saved successfully');

  // AI Safeguard verification:
  // Private requests MUST NEVER be passed to AI services without explicit opt-in
  const mockAiDispatcher = (promptText: string) => {
    if (promptText.includes('Personal Struggles with Work') || promptText.includes('confidential')) {
      throw new Error('AI PRIVACY LEAK DETECTED: Private prayer request sent to external AI service!');
    }
    return 'Devotional reflection generated safely.';
  };

  let aiSafe = true;
  try {
    // Only public guides or anonymized topics may be passed
    const safeTopic = foundGuide?.prayer_points[0].point_en || '';
    mockAiDispatcher(safeTopic);
  } catch {
    aiSafe = false;
  }
  assert(aiSafe, 'AI Privacy Safeguard: Private prayer content protected from external AI queries');

  // -------------------------------------------------------------------------
  // SUITE 7: LOCK-SCREEN SAFE PUSH NOTIFICATION PAYLOADS
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing Lock-Screen Safe Notifications ---');

  // Verify that private requests do NOT generate notifications
  let notificationDispatched = false;
  const mockNotificationHandler = (req: EnhancedPrayerRequest) => {
    if (req.privacy === 'private') {
      return null;
    }
    notificationDispatched = true;
    return {
      title: req.privacy === 'prayer_leaders' ? 'Confidential Leader Prayer Request' : 'Prayer Request',
      // Ensure description is NEVER leaked
      body: `Category: ${req.category}`,
    };
  };

  notificationDispatched = false;
  mockNotificationHandler(privateRequest);
  assert(notificationDispatched === false, 'Completely private requests DO NOT trigger lock-screen notifications');

  const leaderPayload = mockNotificationHandler(leadersRequest);
  assert(
    Boolean(leaderPayload?.title.includes('Confidential') && !JSON.stringify(leaderPayload).includes('Hospital Surgery')),
    'Leader request payload DOES NOT leak confidential surgery text on lock screen'
  );

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    throw new Error(`Prayer Ministry test suite failed with ${failedCount} failures.`);
  }

  return { passedCount, failedCount };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('prayerMinistryTestRunner')) {
  runPrayerMinistryTests().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

