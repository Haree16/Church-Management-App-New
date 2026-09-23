/**
 * Church AI Engine Automated Test Suite
 * Validates Intent Understanding, Task Decomposition, Tool Execution, Result Validation,
 * Completeness Checking, Role/Permission Enforcement, Tamil/Tanglish Parsing,
 * Write Action Confirmations, and Conversational Context Resolution.
 */

import { churchAiEngine, AskEngineOptions } from '../churchAiEngine';
import { churchAiToolRegistry, UserSecurityContext } from '../churchAiToolRegistry';

// Mock browser globals for Node.js execution
if (typeof window === 'undefined') {
  (global as any).window = {
    location: { origin: 'http://localhost:5173', hash: '', search: '' },
    crypto: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
    },
  };
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

export async function runChurchAiEngineTests() {
  console.log('\n==================================================');
  console.log(' RUNNING CHURCH AI ENGINE AUTOMATED TEST SUITE');
  console.log('==================================================\n');

  const basePastorOptions: AskEngineOptions = {
    prompt: '',
    churchId: 'church-1',
    userRole: 'PastorAdmin',
    userName: 'Senior Pastor',
    userEmail: 'pastor@church.org',
    memberId: 'mem-pastor-01',
    debugMode: true
  };

  // 1. Simple Question Test
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'How many members do we have?'
    });
    assert(res.responseText.includes('Total Members') || res.responseText.includes('Membership'), 'Simple Question - Member Count', 'Response should contain membership counts');
    assert(Boolean(res.trace?.tasks.some(t => t.toolName === 'get_member_count')), 'Simple Question Task Plan', 'Should select get_member_count tool');
  } catch (e: any) {
    assert(false, 'Simple Question - Member Count', e.message);
  }

  // 2. Multi-Part Question Test (Mandatory Requirement)
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'How many members do we have, how many attended this month, and which ministry had the highest attendance?'
    });
    assert(res.trace?.tasks.length === 3, 'Multi-Part Decomposition', `Expected 3 tasks, got ${res.trace?.tasks.length}`);
    assert(res.responseText.includes('Total Members') || res.responseText.includes('Membership'), 'Multi-Part Answer Part 1', 'Must contain member count');
    assert(res.responseText.includes('Attendance') || res.responseText.includes('Check-ins'), 'Multi-Part Answer Part 2', 'Must contain attendance summary');
    assert(res.responseText.includes('Ministry Attendance Breakdown') || res.responseText.includes('Highest Attendance'), 'Multi-Part Answer Part 3', 'Must contain ministry breakdown');
  } catch (e: any) {
    assert(false, 'Multi-Part Question Test', e.message);
  }

  // 3. Tamil Question Test
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'இந்த மாதம் எத்தனை பேர் attendance வந்திருக்காங்க?'
    });
    assert(res.trace?.language === 'ta' || res.trace?.language === 'mixed', 'Tamil Language Detection', `Expected ta/mixed, got ${res.trace?.language}`);
    assert(Boolean(res.trace?.tasks.some(t => t.toolName === 'get_attendance_summary')), 'Tamil Task Selection', 'Should select attendance summary');
  } catch (e: any) {
    assert(false, 'Tamil Question Test', e.message);
  }

  // 4. Mixed Language / Tanglish Test
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'இந்த month attendance summary கொடு.'
    });
    assert(res.trace?.language === 'mixed' || res.trace?.language === 'ta', 'Tanglish Language Detection', `Expected mixed/ta, got ${res.trace?.language}`);
    assert(res.responseText.includes('Sunday Attendance Summary') || res.responseText.includes('ஞாயிறு வருகை'), 'Tanglish Response Generation', 'Must generate formatted attendance response');
  } catch (e: any) {
    assert(false, 'Tanglish Question Test', e.message);
  }

  // 5. Ministry Lookup & Entity Resolution Test
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'Show me the Media Ministry members.'
    });
    assert(res.trace?.entities.ministryName === 'Media Ministry', 'Ministry Entity Resolution', `Expected Media Ministry, got ${res.trace?.entities.ministryName}`);
    assert(Boolean(res.trace?.tasks.some(t => t.toolName === 'get_ministry_members')), 'Ministry Members Tool Dispatch', 'Should call get_ministry_members');
  } catch (e: any) {
    assert(false, 'Ministry Lookup Test', e.message);
  }

  // 6. Visitor Follow-up Test
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'Show me visitors who still need follow-up.'
    });
    assert(Boolean(res.trace?.tasks.some(t => t.toolName === 'get_visitor_summary')), 'Visitor Summary Tool Dispatch', 'Should call get_visitor_summary');
    assert(res.responseText.includes('Visitors & Follow-up Summary') || res.responseText.includes('Visitors'), 'Visitor Followup Response', 'Must contain visitor data');
  } catch (e: any) {
    assert(false, 'Visitor Follow-up Test', e.message);
  }

  // 7. Sunday School Test
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'How many Sunday School students are there?'
    });
    assert(Boolean(res.trace?.tasks.some(t => t.toolName === 'get_class_summary')), 'Sunday School Tool Dispatch', 'Should call get_class_summary');
    assert(res.responseText.includes('Sunday School Classes'), 'Sunday School Response', 'Must contain Sunday school summary');
  } catch (e: any) {
    assert(false, 'Sunday School Test', e.message);
  }

  // 8. Report Generation Test
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'Create an attendance report for August.'
    });
    assert(Boolean(res.trace?.tasks.some(t => t.toolName === 'generate_attendance_report')), 'Report Generation Tool Dispatch', 'Should call generate_attendance_report');
  } catch (e: any) {
    assert(false, 'Report Generation Test', e.message);
  }

  // 9. Role & Permission Denial Test
  try {
    const ctx: UserSecurityContext = {
      churchId: 'church-1',
      userId: 'user-mem-01',
      userRole: 'Member',
      userName: 'Basic Member',
      authorizedMinistryIds: []
    };
    const toolRes = await churchAiToolRegistry.get_member_count({}, ctx);
    assert(toolRes.success === false, 'Permission Denial Test', 'Member should not have access to admin member count');
    assert(toolRes.error?.includes('Access Denied') === true, 'Permission Denial Message', 'Must return Access Denied error');
  } catch (e: any) {
    assert(false, 'Permission Denial Test', e.message);
  }

  // 10. Write Action Confirmation Requirement Test
  try {
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'Create an announcement for Sunday service at 10 AM.'
    });
    assert(res.requiresConfirmation === true, 'Write Confirmation Flag', 'Requires confirmation must be true for write action');
    assert(res.proposedActionPayload?.actionType === 'CREATE_ANNOUNCEMENT', 'Proposed Action Payload', 'Must construct proposed CREATE_ANNOUNCEMENT payload');
  } catch (e: any) {
    assert(false, 'Write Action Confirmation Test', e.message);
  }

  // 11. Conversational Context & Follow-Up Test
  try {
    const history = [
      { sender: 'user', text: 'Show members in Medavakkam' },
      { sender: 'assistant', text: 'Found 5 members in Medavakkam' }
    ];
    const res = await churchAiEngine.processUserRequest({
      ...basePastorOptions,
      prompt: 'Which of them joined this month?',
      history
    });
    assert(res.trace?.entities.locationContext === 'Medavakkam', 'Contextual Location Resolution', `Expected Medavakkam, got ${res.trace?.entities.locationContext}`);
    assert(Boolean(res.trace?.tasks.some(t => t.toolName === 'get_contextual_join_filter')), 'Contextual Join Filter Tool', 'Must trigger get_contextual_join_filter');
  } catch (e: any) {
    assert(false, 'Conversational Context Test', e.message);
  }

  console.log('\n==================================================');
  console.log(` TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('==================================================\n');

  return { passedCount, failedCount };
}
