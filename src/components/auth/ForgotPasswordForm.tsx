import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight, Smartphone, ShieldCheck, KeyRound } from 'lucide-react';
import { authSecurityService } from '@/services/authSecurityService';
import { SaaSUser } from '@/types';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onNavigateToReset?: (token: string, user?: SaaSUser) => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ 
  onBackToLogin,
  onNavigateToReset,
}) => {
  const [resetMethod, setResetMethod] = useState<'email' | 'mobile'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; token: string; user?: SaaSUser } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    const targetValue = resetMethod === 'email' ? emailInput.trim() : phoneInput.trim();

    if (!targetValue) {
      setErrorMessage(
        resetMethod === 'email' 
          ? 'Please enter your registered email address.' 
          : 'Please enter your registered mobile number.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate against the database (Firestore + Local Store)
      const res = await authSecurityService.validateAndInitiateReset(targetValue);
      setIsSubmitting(false);

      if (res.success && res.resetToken) {
        setSuccessInfo({
          message: res.message || 'Account verified! Navigating to reset password...',
          token: res.resetToken,
          user: res.user,
        });

        // Navigate directly to the reset password page/form
        if (onNavigateToReset) {
          setTimeout(() => {
            onNavigateToReset(res.resetToken!, res.user);
          }, 600);
        }
      } else {
        setErrorMessage(
          res.error || 
          (resetMethod === 'email' 
            ? 'No account found with this email in the database.' 
            : 'No account found with this mobile number in the database.')
        );
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage('An unexpected error occurred while verifying with the database. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 mb-3 text-amber-400">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Forgot Password</h2>
        <p className="text-xs text-slate-300 mt-1">
          Validate your registered email or mobile number in the database to reset your password.
        </p>
      </div>

      {/* Method Switcher Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
        <button
          type="button"
          onClick={() => {
            setResetMethod('email');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            resetMethod === 'email'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email Address</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setResetMethod('mobile');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            resetMethod === 'mobile'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Number</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3.5 bg-rose-950/80 border border-rose-700/90 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* Success / Navigating State */}
      {successInfo ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Database Verification Successful!</h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              {successInfo.user ? `Account matched: ${successInfo.user.name}` : successInfo.message}
            </p>
            <p className="text-[11px] text-emerald-400/80">
              Navigating to Reset Password page...
            </p>
          </div>

          {onNavigateToReset && (
            <button
              type="button"
              onClick={() => onNavigateToReset(successInfo.token, successInfo.user)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs"
            >
              <span>Continue to Set New Password</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      ) : (
        /* Input Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {resetMethod === 'email' ? (
            <div>
              <label htmlFor="input-forgot-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-forgot-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="name@church.org"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter the email address registered with your account.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="input-forgot-mobile" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registered Mobile Number
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-forgot-mobile"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter the phone number associated with your church profile or login.
              </p>
            </div>
          )}

          <button
            id="btn-validate-user"
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Checking Database...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Validate & Reset Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
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
