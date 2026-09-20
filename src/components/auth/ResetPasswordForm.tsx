import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { authSecurityService, PasswordResetTokenRecord } from '@/services/authSecurityService';
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
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userAccount, setUserAccount] = useState<SaaSUser | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
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
        }, 2500);
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
        <p className="text-xs text-slate-300 font-medium">Validating password reset security token...</p>
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

  return (
    <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 p-6 sm:p-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 mb-2 text-amber-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Create New Password</h2>
        <p className="text-xs text-slate-300 mt-1">
          {userAccount ? `Setting new password for account (${userAccount.email})` : 'Enter your new password below'}
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Password Updated Successfully!</h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              Your password has been changed. Previous active sessions have been invalidated. Redirecting to login...
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
              <div>{errorMessage}</div>
            </div>
          )}

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
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="input-confirm-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            id="btn-submit-reset-password"
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
