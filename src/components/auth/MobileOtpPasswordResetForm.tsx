import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, ShieldCheck, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, 
  ArrowLeft, Send, Smartphone, Sparkles, RefreshCw, Lock, Database 
} from 'lucide-react';
import { authSecurityService, maskPhoneNumber } from '@/services/authSecurityService';
import { validatePasswordPolicy } from '@/utils/passwordPolicy';

interface MobileOtpPasswordResetFormProps {
  onBackToLogin: () => void;
  onSuccess?: () => void;
  initialPhone?: string;
}

export const MobileOtpPasswordResetForm: React.FC<MobileOtpPasswordResetFormProps> = ({
  onBackToLogin,
  onSuccess,
  initialPhone = '',
}) => {
  // Wizard steps: 1 = Enter Phone, 2 = Verify OTP, 3 = Change Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [phone, setPhone] = useState(initialPhone);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI / Status states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [phoneMasked, setPhoneMasked] = useState<string>('');
  const [devOtpCode, setDevOtpCode] = useState<string | undefined>(undefined);
  const [resetToken, setResetToken] = useState<string>('');

  // Resend OTP countdown timer
  const [countdown, setCountdown] = useState(0);

  // Refs for 6-digit OTP inputs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // STEP 1: Request OTP to Mobile Number
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setErrorMessage('Please enter your mobile phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authSecurityService.requestMobileOtp(trimmedPhone);
      setIsLoading(false);

      if (res.success) {
        setPhoneMasked(res.phoneMasked || maskPhoneNumber(trimmedPhone));
        setDevOtpCode(res.devOtpCode);
        setStep(2);
        setCountdown(60);
        setInfoMessage(res.message);
        // Focus first OTP input
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setErrorMessage(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('An error occurred while sending OTP. Please try again.');
    }
  };

  // STEP 2: Handle OTP Digit Input Navigation
  const handleDigitChange = (index: number, value: string) => {
    // Take last entered character if multiple typed
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const digitsArr = pastedData.split('');
      const filled = ['', '', '', '', '', ''].map((_, i) => digitsArr[i] || '');
      setOtpDigits(filled);
      const lastFilledIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  // Quick fill dev OTP
  const handleQuickFillDevOtp = () => {
    if (devOtpCode && devOtpCode.length === 6) {
      setOtpDigits(devOtpCode.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // STEP 2 SUBMIT: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authSecurityService.verifyMobileOtp(phone, fullOtp);
      setIsLoading(false);

      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setStep(3);
        setInfoMessage('OTP verified! Enter your new password below.');
      } else {
        setErrorMessage(res.error || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('Failed to verify OTP code.');
    }
  };

  // STEP 3 SUBMIT: Update Password in Database
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.isValid) {
      setErrorMessage(`Password must meet all complexity requirements: ${policy.errors.join(', ')}.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authSecurityService.resetPasswordWithMobileOtp(resetToken, newPassword);
      setIsLoading(false);

      if (res.success) {
        setStep(4);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Failed to update password in database.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('An unexpected error occurred while updating password.');
    }
  };

  // Password strength score calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pass)) score += 25;
    return score;
  };
  const strengthScore = getPasswordStrength(newPassword);

  return (
    <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 p-6 sm:p-8">
      {/* Top Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
          {step === 1 && <Smartphone className="w-6 h-6" />}
          {step === 2 && <ShieldCheck className="w-6 h-6" />}
          {step === 3 && <KeyRound className="w-6 h-6" />}
          {step === 4 && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">
          {step === 1 && 'Reset Password via Mobile'}
          {step === 2 && 'Verify Mobile OTP'}
          {step === 3 && 'Set New Password'}
          {step === 4 && 'Password Updated!'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {step === 1 && 'Enter your registered mobile phone number to receive a 6-digit OTP code.'}
          {step === 2 && `Enter the 6-digit code sent to ${phoneMasked || 'your mobile device'}.`}
          {step === 3 && 'Choose a strong password for your account to update in database.'}
          {step === 4 && 'Your password has been securely updated in the database.'}
        </p>
      </div>

      {/* Step Indicator */}
      {step < 4 && (
        <div className="flex items-center justify-between mb-6 px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20'
                    : step > s
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-12 sm:w-16 rounded transition-colors ${
                    step > s ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-950/80 border border-rose-700/80 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Info Alert */}
      {infoMessage && step < 4 && (
        <div className="mb-4 p-3 bg-amber-950/50 border border-amber-500/30 text-amber-200 rounded-xl text-xs flex items-start gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>{infoMessage}</div>
        </div>
      )}

      {/* STEP 1: Enter Mobile Number */}
      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Registered Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210 or 9876543210"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              We'll send a 6-digit OTP code directly to your mobile device via native mobile push notification & SMS.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send 6-Digit OTP</span>
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

      {/* STEP 2: Enter 6-Digit OTP */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          {/* Dev Simulation Badge / Quick Fill */}
          {devOtpCode && (
            <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs space-y-1.5 text-amber-200">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dev Testing OTP Notice</span>
                </span>
                <span className="font-mono bg-amber-900/80 px-2 py-0.5 rounded text-amber-300 text-xs border border-amber-700">
                  {devOtpCode}
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                OTP dispatched to mobile notification panel.
              </p>
              <button
                type="button"
                onClick={handleQuickFillDevOtp}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-1 px-2 rounded text-[11px] transition-colors"
              >
                Auto-Fill Code ({devOtpCode})
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
              Enter 6-Digit OTP Code
            </label>
            <div className="flex items-center justify-center gap-2" onPaste={handlePasteOtp}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-11 h-12 sm:w-12 sm:h-13 text-center text-lg sm:text-xl font-mono font-bold bg-slate-950 border border-slate-700 text-amber-400 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || otpDigits.join('').length !== 6}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify OTP Code</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-slate-400 hover:text-slate-200 transition-colors font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Number</span>
            </button>

            <button
              type="button"
              disabled={countdown > 0 || isLoading}
              onClick={handleRequestOtp}
              className="text-amber-400 hover:text-amber-300 disabled:text-slate-500 font-semibold transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${countdown > 0 ? 'animate-spin' : ''}`} />
              <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Change Password */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
                minLength={6}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strengthScore <= 25
                        ? 'w-1/4 bg-rose-500'
                        : strengthScore <= 50
                        ? 'w-2/4 bg-amber-500'
                        : strengthScore <= 75
                        ? 'w-3/4 bg-sky-500'
                        : 'w-full bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Strength: {strengthScore <= 25 ? 'Weak' : strengthScore <= 50 ? 'Fair' : strengthScore <= 75 ? 'Good' : 'Strong'}</span>
                  <span>Min 6 characters</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Updates password across Firestore Database, local cache & Supabase Auth.</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Save New Password to DB</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 4: Success Confirmation */}
      {step === 4 && (
        <div className="space-y-5 text-center">
          <div className="p-5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 space-y-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
            <h3 className="text-base font-bold text-white">Password Successfully Updated!</h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              Your account password has been updated in the database. You can now log in using your new credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.99]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sign In with New Password</span>
          </button>
        </div>
      )}
    </div>
  );
};
