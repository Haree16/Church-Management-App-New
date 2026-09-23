import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, ArrowLeft, Check, X } from 'lucide-react';
import { authSecurityService } from '@/services/authSecurityService';
import { validatePasswordPolicy } from '@/utils/passwordPolicy';
import { SaaSUser } from '@/types';

interface ResetPasswordFormProps {
  token?: string;
  onSuccessRedirect: () => void;
  onBackToLogin: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onSuccessRedirect,
  onBackToLogin,
}) => {
  const [resetToken, setResetToken] = useState<string>(token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userAccount, setUserAccount] = useState<SaaSUser | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time password policy validation
  const policy = useMemo(() => validatePasswordPolicy(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Extract token from URL hash or query params if missing
  useEffect(() => {
    let extracted = token;

    if (!extracted && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;

      if (hash.includes('token=')) {
        const match = hash.match(/token=([^&]+)/);
        if (match) extracted = match[1];
      } else if (search.includes('token=')) {
        const match = search.match(/token=([^&]+)/);
        if (match) extracted = match[1];
      }
    }

    if (extracted) {
      setResetToken(extracted);
      validateToken(extracted);
    } else {
      setIsValidating(false);
      setTokenValid(false);
      setTokenError('No reset token found in URL parameters. Please check your reset link.');
    }
  }, [token]);

  const validateToken = async (tok: string) => {
    setIsValidating(true);
    setTokenError(null);
    try {
      const res = await authSecurityService.validateResetToken(tok);
      setIsValidating(false);
      if (res.valid && res.user) {
        setTokenValid(true);
        setUserAccount(res.user);
      } else {
        setTokenValid(false);
        setTokenError(res.error || 'Invalid or expired password reset token.');
      }
    } catch (e) {
      setIsValidating(false);
      setTokenValid(false);
      setTokenError('Failed to validate reset token.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!policy.isValid) {
      setErrorMessage(`Password must meet all complexity requirements: ${policy.errors.join(', ')}.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authSecurityService.resetPasswordWithToken(resetToken, newPassword);
      setIsSubmitting(false);

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccessRedirect();
        }, 2200);
      } else {
        setErrorMessage(result.error || 'Failed to update password. Please try again.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'An error occurred during password reset.');
    }
  };

  if (isValidating) {
    return (
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-8 text-center text-slate-100">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-300 font-medium">Validating password reset security session...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-6 sm:p-8 text-slate-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-700/80 flex items-center justify-center mx-auto mb-3 text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Reset Link Invalid or Expired</h2>
          <p className="text-xs text-rose-300/90 mt-2 leading-relaxed bg-rose-950/40 p-3 rounded-xl border border-rose-900">
            {tokenError || 'This password reset link is invalid, expired, or has already been used.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sign In</span>
        </button>
      </div>
    );
  }

  // Calculate strength bar color and width
  const getStrengthConfig = () => {
    switch (policy.strength) {
      case 'strong':
        return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400', width: 'w-full' };
      case 'good':
        return { label: 'Good', color: 'bg-amber-400', textColor: 'text-amber-400', width: 'w-3/4' };
      case 'fair':
        return { label: 'Fair', color: 'bg-orange-500', textColor: 'text-orange-400', width: 'w-1/2' };
      default:
        return { label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-400', width: 'w-1/4' };
    }
  };

  const strengthConfig = getStrengthConfig();

  return (
    <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 p-6 sm:p-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 mb-2 text-amber-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Create New Password</h2>
        <p className="text-xs text-slate-300 mt-1">
          {userAccount ? `Setting new password for account (${userAccount.name || userAccount.email})` : 'Enter your new password below'}
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Password Updated Successfully!</h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              Your password has been changed and successfully updated in the database. Redirecting to login...
            </p>
          </div>

          <button
            type="button"
            onClick={onSuccessRedirect}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>Proceed to Login</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-700 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* New Password Input */}
          <div>
            <label htmlFor="input-new-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter new password"
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Strength:</span>
                  <span className={`font-semibold ${strengthConfig.textColor}`}>{strengthConfig.label}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className={`h-full ${strengthConfig.color} ${strengthConfig.width} transition-all duration-300`} />
                </div>
              </div>
            )}

            {/* Password Requirements Checklist */}
            <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <div className="text-slate-400 font-medium mb-1">Password must contain:</div>
              
              <div className={`flex items-center gap-1.5 transition-colors ${policy.rules.minLength ? 'text-emerald-400' : 'text-slate-400'}`}>
                {policy.rules.minLength ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500">•</span>}
                <span>At least 8 characters</span>
              </div>

              <div className={`flex items-center gap-1.5 transition-colors ${policy.rules.hasUppercase ? 'text-emerald-400' : 'text-slate-400'}`}>
                {policy.rules.hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500">•</span>}
                <span>At least one uppercase letter (A-Z)</span>
              </div>

              <div className={`flex items-center gap-1.5 transition-colors ${policy.rules.hasLowercase ? 'text-emerald-400' : 'text-slate-400'}`}>
                {policy.rules.hasLowercase ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500">•</span>}
                <span>At least one lowercase letter (a-z)</span>
              </div>

              <div className={`flex items-center gap-1.5 transition-colors ${policy.rules.hasNumber ? 'text-emerald-400' : 'text-slate-400'}`}>
                {policy.rules.hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500">•</span>}
                <span>At least one number (0-9)</span>
              </div>

              <div className={`flex items-center gap-1.5 transition-colors ${policy.rules.hasSpecial ? 'text-emerald-400' : 'text-slate-400'}`}>
                {policy.rules.hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500">•</span>}
                <span>At least one special character (!@#$%^&*)</span>
              </div>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="input-confirm-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Re-enter new password"
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                {passwordsMatch ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Passwords match
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            id="btn-submit-reset-password"
            type="submit"
            disabled={isSubmitting || !policy.isValid || !passwordsMatch}
            className="w-full mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Updating Password in Database...</span>
              </>
            ) : (
              <span>Reset Password in Database</span>
            )}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
