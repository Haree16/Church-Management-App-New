/**
 * Automated Test Suite for:
 * 1. Today's Bible Verse (deterministic timezone lookup, bilingual support, bookmarking)
 * 2. AI Bible Assistant (theological fidelity, contextual explanation, Tamil support, guardrails, RBAC)
 */

import { dailyVerseService, getDateStringForTimezone } from '../dailyVerseService';
import { getDeterministicDailyVerse, CURATED_DAILY_VERSES } from '../../data/dailyVersesData';
import { aiBibleAssistantService } from '../aiBibleAssistantService';
import { isTabAllowed, getRoleConfig } from '../../utils/rbac';
import { SaaSUserRole } from '../../types';

// Mock browser globals for Node.js execution
if (typeof window === 'undefined') {
  (global as any).window = {
    location: { origin: 'http://localhost:5173', hash: '', search: '' },
    confirm: () => true,
    navigator: {
      clipboard: {
        writeText: async () => {},
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

export async function runBibleAndAiAssistantTests() {
  console.log('\n======================================================');
  console.log(' RUNNING BIBLE VERSE & AI SCRIPTURE ASSISTANT TESTS');
  console.log('======================================================\n');

  console.log('--- 1. DETERMINISTIC DAILY VERSE TESTS ---');

  // Test 1: Date string calculation in timezone
  const dateKolkata = getDateStringForTimezone('Asia/Kolkata', new Date('2026-10-15T12:00:00Z'));
  assert(dateKolkata === '2026-10-15', 'Timezone Date Calculation', `Expected 2026-10-15, got ${dateKolkata}`);

  // Test 2: Consistent verse returned across refreshes for the same day
  const v1 = getDeterministicDailyVerse('2026-10-15');
  const v2 = getDeterministicDailyVerse('2026-10-15');
  assert(v1.reference === v2.reference && v1.text === v2.text, 'Idempotent Same-Day Lookup', 'Verse must remain identical for the same date');

  // Test 3: Bilingual content verification
  assert(Boolean(v1.reference && v1.text), 'English Scripture Present', 'English reference and verse text must be non-empty');
  assert(Boolean(v1.tamilReference && v1.tamilText), 'Tamil Scripture Present', 'Tamil reference and verse text must be non-empty');
  assert(Boolean(v1.reflection && v1.tamilReflection), 'Bilingual Devotional Reflection Present');

  // Test 4: Offline resilience - getTodaysVerse works without active Firestore
  const todayVerse = await dailyVerseService.getTodaysVerse('church-1', 'Asia/Kolkata', '2026-10-15');
  assert(Boolean(todayVerse && todayVerse.reference), 'Offline Resilient Verse Loading', 'Must return verse without crashing');

  // Test 5: Save/Bookmark functionality
  const userId = 'member-test-01';
  const savedRecord = await dailyVerseService.bookmarkVerse('church-1', userId, todayVerse);
  assert(savedRecord.verseId === todayVerse.id, 'Bookmark Verse Created');
  assert(dailyVerseService.isVerseBookmarked(userId, todayVerse.id), 'Bookmark Status True');

  // Test 6: Unbookmark functionality
  await dailyVerseService.unbookmarkVerse(userId, todayVerse.id);
  assert(!dailyVerseService.isVerseBookmarked(userId, todayVerse.id), 'Bookmark Status False after Removal');

  console.log('\n--- 2. AI BIBLE ASSISTANT THEOLOGICAL TESTS ---');

  // Test 7: Psalm 23 Inquiry in English
  const resPsalm23En = await aiBibleAssistantService.askAssistant({
    prompt: 'Explain Psalm 23 in simple language.',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(resPsalm23En.responseText.includes('Psalm 23') || resPsalm23En.responseText.includes('shepherd'), 'Psalm 23 Explanation (EN)');
  assert(resPsalm23En.scriptureReferences.some(r => r.includes('Psalm 23')), 'Scripture Citation Psalm 23');
  assert(Boolean(resPsalm23En.disclaimer), 'Pastoral Care Disclaimer Present');

  // Test 8: Psalm 23 Inquiry in Tamil
  const resPsalm23Ta = await aiBibleAssistantService.askAssistant({
    prompt: 'சங்கீதம் 23-ஐ எளிய நடையில் விளக்குங்கள்.',
    churchId: 'church-1',
    preferredLanguage: 'ta',
  });
  assert(resPsalm23Ta.responseText.includes('சங்கீதம் 23') || resPsalm23Ta.responseText.includes('மேய்ப்பர்'), 'Psalm 23 Explanation (Tamil)');
  assert(Boolean(resPsalm23Ta.disclaimer), 'Tamil Pastoral Care Disclaimer Present');

  // Test 8b: Psalm 91 Inquiry in English
  const resPsalm91En = await aiBibleAssistantService.askAssistant({
    prompt: 'Explain Psalm 91',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(resPsalm91En.responseText.includes('Psalm 91') && resPsalm91En.responseText.includes('Most High'), 'Psalm 91 Explanation (EN)');
  assert(resPsalm91En.scriptureReferences.some(r => r.includes('Psalm 91')), 'Scripture Citation Psalm 91');

  // Test 8c: Psalm 91 Inquiry in Tamil
  const resPsalm91Ta = await aiBibleAssistantService.askAssistant({
    prompt: 'சங்கீதம் 91 விளக்கம்',
    churchId: 'church-1',
    preferredLanguage: 'ta',
  });
  assert(resPsalm91Ta.responseText.includes('சங்கீதம் 91') && resPsalm91Ta.responseText.includes('உன்னதமானவர்'), 'Psalm 91 Explanation (Tamil)');

  // Test 9: What does the Bible teach about forgiveness?
  const resForgive = await aiBibleAssistantService.askAssistant({
    prompt: 'What does the Bible teach about forgiveness?',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(resForgive.responseText.includes('Ephesians 4:32') || resForgive.responseText.includes('forgiv'), 'Forgiveness Biblical Doctrine');
  assert(resForgive.scriptureReferences.some(r => r.includes('Ephesians') || r.includes('Matthew')), 'Forgiveness Scripture Citations');

  // Test 10: Find Bible verses about anxiety and hope
  const resAnxiety = await aiBibleAssistantService.askAssistant({
    prompt: 'Find Bible verses about anxiety and hope.',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(resAnxiety.responseText.includes('Philippians 4:6') || resAnxiety.responseText.includes('anxiety'), 'Anxiety & Hope Scripture Search');

  // Test 11: Help me prepare a Bible study on prayer
  const resPrayerStudy = await aiBibleAssistantService.askAssistant({
    prompt: 'Help me prepare a Bible study on prayer.',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(resPrayerStudy.responseText.includes('Lord’s Prayer') || resPrayerStudy.responseText.includes('Matthew 6'), 'Bible Study on Prayer Outline');

  // Test 11b: Romans 12:1-2 Inquiry in English (Must explain living sacrifice / transformed mind and NOT return Romans 8)
  const resRomans12En = await aiBibleAssistantService.askAssistant({
    prompt: 'Explain Romans 12:1-2',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(
    (resRomans12En.responseText.toLowerCase().includes('romans 12') || resRomans12En.responseText.toLowerCase().includes('sacrifice') || resRomans12En.responseText.toLowerCase().includes('renewing')) &&
    !resRomans12En.responseText.includes('Romans 8: Life in the Spirit'),
    'Romans 12:1-2 Explanation (EN) distinguishes from Romans 8',
    `Got response starting with: ${resRomans12En.responseText.slice(0, 100)}`
  );

  // Test 11c: Romans 12:1-2 Inquiry in Tamil
  const resRomans12Ta = await aiBibleAssistantService.askAssistant({
    prompt: 'ரோமர் 12:1-2 விளக்கம்',
    churchId: 'church-1',
    preferredLanguage: 'ta',
  });
  assert(
    resRomans12Ta.responseText.includes('ரோமர் 12') || resRomans12Ta.responseText.includes('ஜீவபலி') || resRomans12Ta.responseText.includes('மறுரூப'),
    'Romans 12:1-2 Explanation (Tamil)',
    `Got response starting with: ${resRomans12Ta.responseText.slice(0, 100)}`
  );

  // Test 11d: Romans 8 Inquiry in English
  const resRomans8En = await aiBibleAssistantService.askAssistant({
    prompt: 'Explain Romans 8',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(
    resRomans8En.responseText.toLowerCase().includes('romans 8'),
    'Romans 8 Inquiry correctly resolves to Romans 8'
  );

  // Test 11e: Psalm 32 Exposition in English (Must have direct quotation, Maskil context, Romans 4 cross-ref, NO generic guidelines)
  const resPsalm32En = await aiBibleAssistantService.askAssistant({
    prompt: 'Explain Psalm 32',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(
    resPsalm32En.responseText.includes('Psalm 32') &&
    resPsalm32En.responseText.includes('Romans 4') &&
    resPsalm32En.responseText.includes('Blessed is he whose disobedience is forgiven') &&
    !resPsalm32En.responseText.includes('Guidelines for Studying this Topic'),
    'Psalm 32 Direct Exposition (EN) with Romans 4 Canonical Cross-Ref'
  );

  // Test 11f: Psalm 32 Exposition in Tamil
  const resPsalm32Ta = await aiBibleAssistantService.askAssistant({
    prompt: 'சங்கீதம் 32 விளக்கம்',
    churchId: 'church-1',
    preferredLanguage: 'ta',
  });
  assert(
    resPsalm32Ta.responseText.includes('சங்கீதம் 32') &&
    resPsalm32Ta.responseText.includes('ரோமர் 4') &&
    resPsalm32Ta.responseText.includes('மன்னிக்கப்பட்டதோ'),
    'Psalm 32 Direct Exposition (Tamil) with Romans 4 Link'
  );

  // Test 11g: Romans 4 Exposition in English (Must cite Abraham, David & Psalm 32, NO generic guidelines)
  const resRomans4En = await aiBibleAssistantService.askAssistant({
    prompt: 'Explain Romans 4',
    churchId: 'church-1',
    preferredLanguage: 'en',
  });
  assert(
    resRomans4En.responseText.includes('Romans 4') &&
    resRomans4En.responseText.includes('Psalm 32') &&
    resRomans4En.responseText.includes('Abraham') &&
    !resRomans4En.responseText.includes('Guidelines for Studying this Topic'),
    'Romans 4 Direct Exposition (EN) with Psalm 32 Canonical Cross-Ref'
  );

  // Test 11h: Romans 4 Exposition in Tamil
  const resRomans4Ta = await aiBibleAssistantService.askAssistant({
    prompt: 'ரோமர் 4 விளக்கம்',
    churchId: 'church-1',
    preferredLanguage: 'ta',
  });
  assert(
    resRomans4Ta.responseText.includes('ரோமர் 4') &&
    resRomans4Ta.responseText.includes('சங்கீதம் 32') &&
    resRomans4Ta.responseText.includes('ஆபிரகாம்'),
    'Romans 4 Direct Exposition (Tamil) with Psalm 32 Link'
  );

  console.log('\n--- 3. NAVIGATION & RBAC PERMISSION TESTS ---');

  // Test 12: Member role has access to bible-assistant
  assert(isTabAllowed('Member' as SaaSUserRole, 'bible-assistant'), 'Member Role Allowed Bible Assistant');

  // Test 13: Volunteer role has access to bible-assistant
  assert(isTabAllowed('Volunteer' as SaaSUserRole, 'bible-assistant'), 'Volunteer Role Allowed Bible Assistant');

  // Test 14: MinistryLeader role has access to bible-assistant
  assert(isTabAllowed('MinistryLeader' as SaaSUserRole, 'bible-assistant'), 'Ministry Leader Allowed Bible Assistant');

  // Test 15: PastorAdmin role has access to bible-assistant
  assert(isTabAllowed('PastorAdmin' as SaaSUserRole, 'bible-assistant'), 'Pastor Admin Allowed Bible Assistant');

  // Test 16: Local conversation storage isolation per user
  aiBibleAssistantService.saveStoredChatHistory('user-A', [{ id: '1', sender: 'user', text: 'Private query', timestamp: '10:00 AM' }]);
  const chatUserB = aiBibleAssistantService.getStoredChatHistory('user-B');
  assert(chatUserB.length === 0, 'User Chat History Isolation', 'User B must not see User A chat');

  aiBibleAssistantService.clearStoredChatHistory('user-A');
  assert(aiBibleAssistantService.getStoredChatHistory('user-A').length === 0, 'Clear Chat History works');

  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} tests failed.`);
  }
}
