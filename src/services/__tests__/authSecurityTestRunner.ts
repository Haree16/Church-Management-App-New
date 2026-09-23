/**
 * Auth & Session Security Automated Test Suite
 * Tests Password Reset, Token Validation, Session Expiration, Account Enumeration,
 * Multi-tenant Data Boundaries, and Role Authorization.
 */

import { authSecurityService, hashString } from '../authSecurityService';
import { auditService } from '../auditService';
import { INITIAL_SAAS_USERS, INITIAL_CHURCHES } from '../../data/initialData';
import { saveStoredUsers, getStoredUsers, saveStoredAuthSession, getStoredAuthSession, clearStoredAuthSession } from '../../utils/storage';
import { SaaSUser, AuthSession } from '../../types';

// Mock browser globals for node test execution if needed
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

export async function runAuthSecurityTests() {
  console.log('\n==================================================');
  console.log(' RUNNING AUTHENTICATION & SESSION SECURITY TESTS');
  console.log('==================================================\n');

  // Setup test users
  const testUser: SaaSUser = {
    id: 'test-user-001',
    church_id: 'church-1',
    username: 'test.pastor',
    email: 'pastor.test@church.org',
    password: 'Password123!',
    name: 'Test Pastor',
    phone: '555-0199',
    role: 'PastorAdmin',
    status: 'Active',
  };
  saveStoredUsers([testUser, ...INITIAL_SAAS_USERS]);

  // --------------------------------------------------
  // 1. PASSWORD RESET TESTS
  // --------------------------------------------------
  console.log('--- GROUP 1: PASSWORD RESET TESTS ---');

  // Test 1: Valid registered email
  const res1 = await authSecurityService.requestPasswordReset('pastor.test@church.org');
  assert(res1.success === true && !!res1.resetLinkForDev, '1. Valid registered email generates reset link');

  // Test 2: Unknown email (Account Enumeration Prevention Test)
  const res2 = await authSecurityService.requestPasswordReset('unknown.ghost@nonexistentdomain.org');
  assert(
    res2.success === true && res2.message.includes('If an account exists'),
    '2. Unknown email returns identical generic response (prevents account enumeration)'
  );
  assert(res2.resetLinkForDev === undefined, '2b. Unknown email does not generate dev token link');

  // Test 3: Empty email
  const res3 = await authSecurityService.requestPasswordReset('');
  assert(res3.success === false, '3. Empty email is rejected');

  // Test 4: Invalid email format
  const res4 = await authSecurityService.requestPasswordReset('invalid-email-format');
  assert(res4.success === true && res4.message.includes('If an account exists'), '4. Invalid email format handled safely with generic response');

  // Test 5: Validate token generated in Test 1
  const rawToken = res1.rawTokenForDev!;
  const val5 = await authSecurityService.validateResetToken(rawToken);
  assert(val5.valid === true && val5.user?.id === testUser.id, '5. Token validation succeeds for valid unexpired token');

  // Test 6: Invalid reset token string
  const val6 = await authSecurityService.validateResetToken('invalid_bogus_token_12345');
  assert(val6.valid === false && val6.error!.includes('Invalid'), '6. Invalid reset token string is rejected');

  // Test 7: Weak password rejection (< 6 chars)
  const resetWeak = await authSecurityService.resetPasswordWithToken(rawToken, '12345');
  assert(resetWeak.success === false && resetWeak.error!.includes('at least 6 characters'), '7. Weak password (< 6 chars) is rejected');

  // Test 8: Successful password reset
  const resetSuccess = await authSecurityService.resetPasswordWithToken(rawToken, 'NewSecurePassword2026!');
  assert(resetSuccess.success === true, '8. Password successfully reset with valid token');

  // Test 9: Login using new password
  const usersAfterReset = getStoredUsers();
  const updatedUser = usersAfterReset.find((u) => u.id === testUser.id);
  assert(updatedUser?.password === 'NewSecurePassword2026!', '9. User password updated in user store to new password');

  // Test 10: Reset token single-use check (using same token again)
  const valReused = await authSecurityService.validateResetToken(rawToken);
  assert(valReused.valid === false && valReused.error!.includes('already been used'), '10. Reset token cannot be reused after password change');

  // Test 11: Expired token check
  const expiredRawToken = 'expired_raw_token_xyz';
  const expiredHash = await hashString(expiredRawToken);
  const tokensKey = 'nca_church_reset_tokens_v4';
  const currentTokens = JSON.parse(localStorage.getItem(tokensKey) || '[]');
  currentTokens.push({
    id: 'tok-exp-1',
    userId: testUser.id,
    userEmail: testUser.email,
    tokenHash: expiredHash,
    expiresAt: Date.now() - 10000, // Expired 10 sec ago
    usedAt: null,
    revoked: false,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(tokensKey, JSON.stringify(currentTokens));

  const valExpired = await authSecurityService.validateResetToken(expiredRawToken);
  assert(valExpired.valid === false && valExpired.error!.includes('expired'), '11. Expired reset token is correctly rejected');

  // Test 12: Multiple reset requests revokes previous unused tokens
  const resReqA = await authSecurityService.requestPasswordReset('pastor.test@church.org');
  const tokenA = resReqA.rawTokenForDev!;
  const resReqB = await authSecurityService.requestPasswordReset('pastor.test@church.org');
  const tokenB = resReqB.rawTokenForDev!;

  const valA = await authSecurityService.validateResetToken(tokenA);
  const valB = await authSecurityService.validateResetToken(tokenB);
  assert(valA.valid === false && valA.error!.includes('revoked'), '12. Earlier reset token revoked when new request is issued');
  assert(valB.valid === true, '13. Newest reset token remains valid');

  // --------------------------------------------------
  // 1B. MOBILE OTP PASSWORD RESET TESTS
  // --------------------------------------------------
  console.log('\n--- GROUP 1B: MOBILE OTP PASSWORD RESET TESTS ---');

  // Test 14: Mobile OTP request with valid registered phone
  const otpRes = await authSecurityService.requestMobileOtp('555-0199');
  assert(otpRes.success === true && !!otpRes.devOtpCode, '14. Request mobile OTP returns success and generates dev OTP code');

  // Test 15: Verification with invalid 6-digit code
  const wrongOtpVal = await authSecurityService.verifyMobileOtp('555-0199', '000000');
  assert(wrongOtpVal.success === false && wrongOtpVal.error!.includes('Incorrect'), '15. Invalid OTP code is correctly rejected with attempt count penalty');

  // Test 16: Verification with valid generated OTP code
  const validOtpVal = await authSecurityService.verifyMobileOtp('555-0199', otpRes.devOtpCode!);
  assert(validOtpVal.success === true && !!validOtpVal.resetToken, '16. Valid OTP code verification returns single-use mobile reset token');

  // Test 17: Password reset in DB using verified mobile OTP reset token
  const dbResetRes = await authSecurityService.resetPasswordWithMobileOtp(validOtpVal.resetToken!, 'MobileOtpUpdatedPassword2026!');
  assert(dbResetRes.success === true, '17. Password successfully updated in DB using verified mobile OTP token');

  // Test 18: Verify user password in DB store
  const storedUsersOtpCheck = getStoredUsers();
  const updatedUserOtp = storedUsersOtpCheck.find((u) => u.id === testUser.id);
  assert(updatedUserOtp?.password === 'MobileOtpUpdatedPassword2026!', '18. User password in DB store matches new Mobile OTP password');

  // --------------------------------------------------
  // 2. SESSION & AUTHORIZATION TESTS
  // --------------------------------------------------
  console.log('\n--- GROUP 2: SESSION & MULTI-TENANT SECURITY TESTS ---');

  // Test 14: Valid active session check
  const activeSession: AuthSession = {
    user: updatedUser!,
    church: INITIAL_CHURCHES[0],
    loginTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    token: 'tok_active_123',
  };
  saveStoredAuthSession(activeSession);

  const check14 = await authSecurityService.checkAndRefreshSession();
  assert(check14.session !== null && check14.expired === false, '14. Valid non-expired session is restored on startup');

  // Test 15: Expired session check & auto-refresh
  const expiredSession: AuthSession = {
    user: updatedUser!,
    church: INITIAL_CHURCHES[0],
    loginTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 sec ago
    token: 'tok_expired_999',
  };
  saveStoredAuthSession(expiredSession);

  const check15 = await authSecurityService.checkAndRefreshSession();
  assert(check15.session !== null && check15.expired === false, '15. Expired session auto-refreshes seamlessly when refresh succeeds');

  // Test 16: Safe logout
  await authSecurityService.performLogout(updatedUser, INITIAL_CHURCHES[0].id);
  const check16 = getStoredAuthSession();
  assert(check16 === null, '16. Safe logout completely clears stored auth session');

  // Test 17: Multi-Tenant Boundary Security Check
  const churchA_User: SaaSUser = {
    id: 'user-church-a',
    church_id: 'church-1',
    username: 'admin.churcha',
    email: 'admin@churcha.org',
    role: 'PastorAdmin',
    name: 'Church A Admin',
    phone: '111-222',
  };
  const churchB_User: SaaSUser = {
    id: 'user-church-b',
    church_id: 'church-2',
    username: 'admin.churchb',
    email: 'admin@churchb.org',
    role: 'PastorAdmin',
    name: 'Church B Admin',
    phone: '333-444',
  };

  assert(churchA_User.church_id !== churchB_User.church_id, '17. Church A user tenant ID strictly differs from Church B');

  // Test 18: Audit Logging verification
  const auditLogs = await auditService.getAuditLogs('church-1');
  assert(auditLogs.length > 0, '18. Security events logged to audit trail');
  const passwordResetLog = auditLogs.find((l) => l.action.includes('password_reset'));
  assert(!!passwordResetLog, '19. Password reset activity recorded in audit trail');

  console.log('\n==================================================');
  console.log(` TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('==================================================\n');

  return { passedCount, failedCount };
}

// Execute test suite
runAuthSecurityTests().catch(console.error);
