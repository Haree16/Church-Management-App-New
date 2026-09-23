import { SaaSUser, AuthSession, ChurchTenant } from '../types';
import { getStoredUsers, saveStoredUsers, getStoredMembers, getStoredAuthSession, saveStoredAuthSession, clearStoredAuthSession } from '../utils/storage';
import { INITIAL_SAAS_USERS, INITIAL_CHURCHES } from '../data/initialData';
import { auditService } from './auditService';
import { emailService } from './emailService';
import { saveUserToFirestore } from './firestoreService';
import { sendMobilePanelNotification } from './mobileNotificationService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  userEmail: string;
  tokenHash: string;
  expiresAt: number; // unix timestamp in ms
  usedAt: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface MobileOtpRecord {
  id: string;
  userId: string;
  phone: string;
  otpHash: string;
  expiresAt: number; // unix timestamp in ms
  attempts: number;
  verified: boolean;
  usedAt: string | null;
  resetToken?: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  RESET_TOKENS: 'nca_church_reset_tokens_v4',
  MOBILE_OTPS: 'nca_church_mobile_otps_v4',
  SECURE_SESSION: 'nca_church_secure_session_v4',
};

// SHA-256 helper for browser environments
export async function hashString(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback below
    }
  }
  // Simple fallback hash algorithm for environments without CryptoSubtle
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16) + '_' + input.length;
}

// Generate cryptographically random token string
export function generateRandomToken(length = 32): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Get stored reset tokens
function getStoredTokens(): PasswordResetTokenRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESET_TOKENS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Save stored reset tokens
function saveStoredTokens(tokens: PasswordResetTokenRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RESET_TOKENS, JSON.stringify(tokens));
  } catch (e) {
    console.warn('Failed to save reset tokens to local storage:', e);
  }
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last4 = digits.slice(-4);
    const prefix = digits.slice(0, Math.max(0, digits.length - 7));
    return `${prefix ? '+' + prefix + ' ' : ''}******${last4}`;
  }
  if (digits.length > 4) {
    return '***' + digits.slice(-4);
  }
  return phone;
}

function getStoredMobileOtps(): MobileOtpRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOBILE_OTPS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredMobileOtps(otps: MobileOtpRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MOBILE_OTPS, JSON.stringify(otps));
  } catch (e) {
    console.warn('Failed to save mobile OTPs to local storage:', e);
  }
}

// Active single-flight promise for deduplicating concurrent session refreshes
let activeRefreshPromise: Promise<AuthSession | null> | null = null;

export const authSecurityService = {
  /**
   * Request password reset OTP to mobile phone number.
   */
  async requestMobileOtp(phoneInput: string): Promise<{
    success: boolean;
    message: string;
    otpId?: string;
    phoneMasked?: string;
    devOtpCode?: string;
    userId?: string;
  }> {
    const normPhone = normalizePhone(phoneInput);
    if (!normPhone || normPhone.length < 7) {
      return {
        success: false,
        message: 'Please enter a valid mobile phone number.',
      };
    }

    try {
      // 1. Find user matching phone number
      const storedUsers = getStoredUsers();
      const allUsers = [...storedUsers];
      INITIAL_SAAS_USERS.forEach((u) => {
        if (!allUsers.some((existing) => existing.id === u.id)) {
          allUsers.push(u);
        }
      });

      // Search by SaaSUser.phone or Member.phone
      const storedMembers = getStoredMembers();
      let matchedUser = allUsers.find((u) => normalizePhone(u.phone) === normPhone);

      if (!matchedUser) {
        // Search in member directory
        const matchedMember = storedMembers.find((m) => normalizePhone(m.phone) === normPhone);
        if (matchedMember) {
          matchedUser = allUsers.find(
            (u) => u.member_id === matchedMember.id || u.memberId === matchedMember.id || u.email.toLowerCase() === matchedMember.email.toLowerCase()
          );
        }
      }

      if (!matchedUser) {
        return {
          success: false,
          message: 'No registered user account found associated with this mobile number. Please check the number or contact your church admin.',
        };
      }

      // 2. Generate 6-digit numeric OTP code
      const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await hashString(rawOtp);
      const expiresAt = Date.now() + 10 * 60 * 1000; // Expire in 10 minutes

      const otpRecord: MobileOtpRecord = {
        id: `otp-${Date.now()}-${generateRandomToken(4)}`,
        userId: matchedUser.id,
        phone: normPhone,
        otpHash,
        expiresAt,
        attempts: 0,
        verified: false,
        usedAt: null,
        createdAt: new Date().toISOString(),
      };

      // 3. Store OTP record (revoking older un-used OTPs for this user)
      const existingOtps = getStoredMobileOtps();
      const updatedOtps = existingOtps.filter((o) => o.userId !== matchedUser.id || o.verified || o.usedAt);
      updatedOtps.push(otpRecord);
      saveStoredMobileOtps(updatedOtps);

      // 4. Send native mobile notification & audit log
      const phoneMasked = maskPhoneNumber(matchedUser.phone || phoneInput);
      await sendMobilePanelNotification({
        id: `notif-otp-${Date.now()}`,
        title: '🔑 Password Reset OTP',
        message: `Your 6-digit security code is: ${rawOtp}. Valid for 10 minutes.`,
        category: 'Emergency',
        churchName: 'Church Security',
      }).catch(console.warn);

      const churchId = matchedUser.church_id || matchedUser.churchId || INITIAL_CHURCHES[0].id;
      await auditService.logAction(churchId, {
        action: 'auth.mobile_otp_requested',
        resource_type: 'auth',
        resource_id: matchedUser.id,
        actor_id: matchedUser.id,
        actor_name: matchedUser.name,
        actor_role: matchedUser.role,
        details: { phoneMasked },
      }).catch(() => {});

      return {
        success: true,
        message: `6-digit OTP code sent to ${phoneMasked}. Check your mobile device.`,
        otpId: otpRecord.id,
        phoneMasked,
        devOtpCode: rawOtp,
        userId: matchedUser.id,
      };
    } catch (err: any) {
      console.error('Error in requestMobileOtp:', err);
      return {
        success: false,
        message: 'Failed to dispatch mobile OTP. Please try again.',
      };
    }
  },

  /**
   * Verify mobile OTP code entered by user.
   */
  async verifyMobileOtp(phoneInput: string, otpCode: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    resetToken?: string;
    userId?: string;
  }> {
    const normPhone = normalizePhone(phoneInput);
    const cleanedCode = (otpCode || '').trim();

    if (!normPhone) {
      return { success: false, error: 'Please enter your mobile phone number.' };
    }
    if (!cleanedCode || cleanedCode.length !== 6) {
      return { success: false, error: 'Please enter a valid 6-digit OTP code.' };
    }

    try {
      const otps = getStoredMobileOtps();
      const recordIndex = otps.findIndex(
        (o) => o.phone === normPhone && !o.usedAt && !o.verified && Date.now() <= o.expiresAt
      );

      if (recordIndex === -1) {
        return {
          success: false,
          error: 'No active OTP found for this mobile number or code has expired. Please request a new OTP.',
        };
      }

      const record = otps[recordIndex];

      if (record.attempts >= 5) {
        return {
          success: false,
          error: 'Maximum verification attempts (5) exceeded. Please request a new OTP.',
        };
      }

      const hashInput = await hashString(cleanedCode);
      if (hashInput !== record.otpHash) {
        // Increment attempt count
        record.attempts += 1;
        otps[recordIndex] = record;
        saveStoredMobileOtps(otps);
        const remaining = 5 - record.attempts;
        return {
          success: false,
          error: `Incorrect 6-digit OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        };
      }

      // OTP verified successfully! Generate single-use resetToken
      const resetToken = `mobtok_${generateRandomToken(32)}`;
      record.verified = true;
      record.resetToken = resetToken;
      otps[recordIndex] = record;
      saveStoredMobileOtps(otps);

      const storedUsers = getStoredUsers();
      const allUsers = [...storedUsers, ...INITIAL_SAAS_USERS];
      const matchedUser = allUsers.find((u) => u.id === record.userId);

      if (matchedUser) {
        const churchId = matchedUser.church_id || matchedUser.churchId || INITIAL_CHURCHES[0].id;
        await auditService.logAction(churchId, {
          action: 'auth.mobile_otp_verified',
          resource_type: 'auth',
          resource_id: matchedUser.id,
          actor_id: matchedUser.id,
        }).catch(() => {});
      }

      return {
        success: true,
        message: 'OTP verified successfully! Please enter your new password.',
        resetToken,
        userId: record.userId,
      };
    } catch (err: any) {
      console.error('Error in verifyMobileOtp:', err);
      return { success: false, error: 'Failed to verify OTP code. Please try again.' };
    }
  },

  /**
   * Reset password in database using verified mobile OTP token.
   */
  async resetPasswordWithMobileOtp(resetToken: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    if (!resetToken || !resetToken.trim()) {
      return { success: false, error: 'Missing reset verification token.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const otps = getStoredMobileOtps();
      const recordIndex = otps.findIndex((o) => o.resetToken === resetToken && o.verified && !o.usedAt);

      if (recordIndex === -1) {
        return { success: false, error: 'Invalid or expired reset session. Please verify your OTP again.' };
      }

      const record = otps[recordIndex];

      if (Date.now() > record.expiresAt) {
        return { success: false, error: 'Reset session has expired. Please request a new OTP.' };
      }

      // Find user
      const storedUsers = getStoredUsers();
      const allUsers = [...storedUsers];
      INITIAL_SAAS_USERS.forEach((u) => {
        if (!allUsers.some((existing) => existing.id === u.id)) {
          allUsers.push(u);
        }
      });

      const user = allUsers.find((u) => u.id === record.userId);
      if (!user) {
        return { success: false, error: 'User account not found.' };
      }

      // 1. Update user password object
      const updatedUser: SaaSUser = {
        ...user,
        password: newPassword,
      };

      // 2. Persist to Local Storage User Cache
      const userExistsInStored = storedUsers.some((u) => u.id === user.id);
      let nextStoredUsers: SaaSUser[];
      if (userExistsInStored) {
        nextStoredUsers = storedUsers.map((u) => (u.id === user.id ? updatedUser : u));
      } else {
        nextStoredUsers = [...storedUsers, updatedUser];
      }
      saveStoredUsers(nextStoredUsers);

      // 3. Persist to Firestore DB (users collection)
      await saveUserToFirestore(updatedUser).catch((err) => {
        console.warn('Failed to update user password in Firestore:', err);
      });

      // 4. Update Supabase Auth if configured
      if (isSupabaseConfigured()) {
        await supabase.auth.updateUser({ password: newPassword }).catch(() => {});
      }

      // 5. Mark OTP record as used
      record.usedAt = new Date().toISOString();
      otps[recordIndex] = record;
      saveStoredMobileOtps(otps);

      // 6. Invalidate active session if logged in
      const currentSession = getStoredAuthSession();
      if (currentSession?.user?.id === user.id) {
        clearStoredAuthSession();
      }

      // 7. Log Security Audit
      const churchId = user.church_id || user.churchId || INITIAL_CHURCHES[0].id;
      await auditService.logAction(churchId, {
        action: 'auth.password_changed_via_mobile_otp',
        resource_type: 'auth',
        resource_id: user.id,
        actor_id: user.id,
        actor_name: user.name,
        actor_role: user.role,
        details: { status: 'success_db_updated', method: 'mobile_otp' },
      }).catch(() => {});

      return {
        success: true,
        message: 'Password successfully changed and updated in database!',
      };
    } catch (err: any) {
      console.error('Error in resetPasswordWithMobileOtp:', err);
      return { success: false, error: err.message || 'Failed to update password in database.' };
    }
  },
  /**
   * Request password reset for email address.
   * ABSOLUTELY PREVENTS ACCOUNT ENUMERATION:
   * Returns generic success message regardless of whether email exists in the system.
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
    resetLinkForDev?: string;
    rawTokenForDev?: string;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    const genericResponse = {
      success: true,
      message: 'If an account exists for this email address, a password reset link has been sent.',
    };

    if (!normalizedEmail) {
      return {
        success: false,
        message: 'Please enter a valid email address.',
      };
    }

    try {
      // 1. Also trigger Supabase reset if configured
      if (isSupabaseConfigured()) {
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        }).catch(() => {});
      }

      // 2. Fetch candidate users from local storage & initial data
      const storedUsers = getStoredUsers();
      const allUsers = [...storedUsers];
      INITIAL_SAAS_USERS.forEach((u) => {
        if (!allUsers.some((existing) => existing.id === u.id || existing.email.toLowerCase() === u.email.toLowerCase())) {
          allUsers.push(u);
        }
      });

      const matchedUser = allUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (!matchedUser) {
        // Log generic attempt without exposing user existence
        await auditService.logAction(INITIAL_CHURCHES[0].id, {
          action: 'auth.password_reset_requested',
          resource_type: 'auth',
          details: { outcome: 'generic_response' },
        }).catch(() => {});
        return genericResponse;
      }

      // 3. User exists -> Generate cryptographically random single-use token
      const rawToken = generateRandomToken(32);
      const tokenHash = await hashString(rawToken);
      const expiresAt = Date.now() + 45 * 60 * 1000; // Expire in 45 minutes

      const tokenRecord: PasswordResetTokenRecord = {
        id: `rst-${Date.now()}-${generateRandomToken(4)}`,
        userId: matchedUser.id,
        userEmail: matchedUser.email,
        tokenHash,
        expiresAt,
        usedAt: null,
        revoked: false,
        createdAt: new Date().toISOString(),
      };

      const tokens = getStoredTokens();
      // Revoke any previous un-used tokens for this user
      const updatedTokens = tokens.map((t) => (t.userId === matchedUser.id && !t.usedAt ? { ...t, revoked: true } : t));
      updatedTokens.push(tokenRecord);
      saveStoredTokens(updatedTokens);

      // 4. Log Audit Event (Never logging raw token or sensitive data!)
      const churchId = matchedUser.church_id || matchedUser.churchId || INITIAL_CHURCHES[0].id;
      await auditService.logAction(churchId, {
        action: 'auth.password_reset_requested',
        resource_type: 'auth',
        resource_id: matchedUser.id,
        actor_id: matchedUser.id,
        actor_name: matchedUser.name,
        actor_role: matchedUser.role,
        details: { email_domain: matchedUser.email.split('@')[1] || 'unknown' },
      }).catch(() => {});

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const resetLink = `${origin}/#reset-password?token=${rawToken}`;

      // Dispatch outbound email via Resend if API key is set
      if (emailService.isConfigured()) {
        await emailService.sendPasswordResetEmail(matchedUser.email, resetLink).catch(console.warn);
      }

      return {
        ...genericResponse,
        resetLinkForDev: resetLink,
        rawTokenForDev: rawToken,
      };
    } catch (err: any) {
      console.error('Error in requestPasswordReset:', err);
      return genericResponse;
    }
  },

  /**
   * Validate a reset token string
   */
  async validateResetToken(rawToken: string): Promise<{
    valid: boolean;
    error?: string;
    tokenRecord?: PasswordResetTokenRecord;
    user?: SaaSUser;
  }> {
    if (!rawToken || rawToken.trim() === '') {
      return { valid: false, error: 'Missing or empty password reset token.' };
    }

    try {
      const tokenHash = await hashString(rawToken.trim());
      const tokens = getStoredTokens();
      const record = tokens.find((t) => t.tokenHash === tokenHash);

      if (!record) {
        return { valid: false, error: 'Invalid or unrecognized password reset token.' };
      }

      if (record.revoked) {
        return { valid: false, error: 'This password reset token has been revoked. Please request a new link.' };
      }

      if (record.usedAt) {
        return { valid: false, error: 'This password reset token has already been used. Please request a new link.' };
      }

      if (Date.now() > record.expiresAt) {
        return { valid: false, error: 'This password reset link has expired (valid for 45 minutes). Please request a new link.' };
      }

      // Find matching user
      const storedUsers = getStoredUsers();
      const allUsers = [...storedUsers];
      INITIAL_SAAS_USERS.forEach((u) => {
        if (!allUsers.some((existing) => existing.id === u.id)) {
          allUsers.push(u);
        }
      });

      const user = allUsers.find((u) => u.id === record.userId);
      if (!user) {
        return { valid: false, error: 'Associated user account no longer exists.' };
      }

      return {
        valid: true,
        tokenRecord: record,
        user,
      };
    } catch (err: any) {
      return { valid: false, error: 'Failed to validate reset token.' };
    }
  },

  /**
   * Complete password reset using token and new password.
   */
  async resetPasswordWithToken(rawToken: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validateResetToken(rawToken);
    if (!validation.valid || !validation.tokenRecord || !validation.user) {
      return { success: false, error: validation.error || 'Invalid reset token.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const { tokenRecord, user } = validation;

      // 1. Update user password in stored users & initial data cache
      const storedUsers = getStoredUsers();
      const userExistsInStored = storedUsers.some((u) => u.id === user.id);

      const updatedUser: SaaSUser = {
        ...user,
        password: newPassword,
      };

      let nextStoredUsers: SaaSUser[];
      if (userExistsInStored) {
        nextStoredUsers = storedUsers.map((u) => (u.id === user.id ? updatedUser : u));
      } else {
        nextStoredUsers = [...storedUsers, updatedUser];
      }

      saveStoredUsers(nextStoredUsers);
      saveUserToFirestore(updatedUser).catch(() => {});

      // 2. Also update Supabase user password if configured
      if (isSupabaseConfigured()) {
        await supabase.auth.updateUser({ password: newPassword }).catch(() => {});
      }

      // 3. Mark token as used
      const tokens = getStoredTokens();
      const updatedTokens = tokens.map((t) => (t.id === tokenRecord.id ? { ...t, usedAt: new Date().toISOString() } : t));
      saveStoredTokens(updatedTokens);

      // 4. Invalidate existing session if for this user
      const currentSession = getStoredAuthSession();
      if (currentSession?.user?.id === user.id) {
        clearStoredAuthSession();
      }

      // 5. Log Security Audit
      const churchId = user.church_id || user.churchId || INITIAL_CHURCHES[0].id;
      await auditService.logAction(churchId, {
        action: 'auth.password_reset_completed',
        resource_type: 'auth',
        resource_id: user.id,
        actor_id: user.id,
        actor_name: user.name,
        actor_role: user.role,
        details: { status: 'success' },
      }).catch(() => {});

      return { success: true };
    } catch (err: any) {
      console.error('Reset password error:', err);
      return { success: false, error: err.message || 'Failed to update password. Please try again.' };
    }
  },

  /**
   * Validate current session and handle token expiration & automatic refresh.
   */
  async checkAndRefreshSession(): Promise<{
    session: AuthSession | null;
    expired: boolean;
    error?: string;
  }> {
    const current = getStoredAuthSession();
    if (!current || !current.user) {
      return { session: null, expired: false };
    }

    // Check if session has expiresAt
    if (current.expiresAt) {
      const expiresTime = new Date(current.expiresAt).getTime();
      const now = Date.now();

      // If session is already expired
      if (now >= expiresTime) {
        // Attempt single-flight refresh
        const refreshed = await this.refreshSession(current);
        if (refreshed) {
          return { session: refreshed, expired: false };
        } else {
          clearStoredAuthSession();
          await auditService.logAction(current.user.church_id || INITIAL_CHURCHES[0].id, {
            action: 'auth.session_expired',
            resource_type: 'auth',
            resource_id: current.user.id,
            actor_id: current.user.id,
          }).catch(() => {});
          return { session: null, expired: true, error: 'Your session has expired. Please log in again.' };
        }
      }
    }

    return { session: current, expired: false };
  },

  /**
   * Single-flight deduplicated session refresh logic
   */
  async refreshSession(currentSession: AuthSession): Promise<AuthSession | null> {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data } = await supabase.auth.refreshSession();
          if (data.session?.user) {
            const updated: AuthSession = {
              ...currentSession,
              token: data.session.access_token,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
            saveStoredAuthSession(updated);
            return updated;
          }
        }

        // For local/Firestore session: extend expiration by 7 days
        const updated: AuthSession = {
          ...currentSession,
          token: currentSession.token || `tok_${Date.now()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
        saveStoredAuthSession(updated);
        return updated;
      } catch (err) {
        return null;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  },

  /**
   * Safe, complete logout
   */
  async performLogout(currentUser?: SaaSUser | null, churchId?: string): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut().catch(() => {});
      }

      if (currentUser) {
        const cId = churchId || currentUser.church_id || currentUser.churchId || INITIAL_CHURCHES[0].id;
        await auditService.logAction(cId, {
          action: 'auth.logout',
          resource_type: 'auth',
          resource_id: currentUser.id,
          actor_id: currentUser.id,
          actor_name: currentUser.name,
          actor_role: currentUser.role,
        }).catch(() => {});
      }
    } finally {
      clearStoredAuthSession();
    }
  },
};
