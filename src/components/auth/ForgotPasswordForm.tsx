import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send, ExternalLink, Copy, Key, Settings } from 'lucide-react';
import { authSecurityService } from '@/services/authSecurityService';
import { emailService } from '@/services/emailService';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | undefined>(undefined);
  const [copiedLink, setCopiedLink] = useState(false);

  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [resendApiKey, setResendApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (resendApiKey.trim()) {
      emailService.setApiKey(resendApiKey.trim());
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 2500);
      setShowKeyConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await authSecurityService.requestPasswordReset(trimmedEmail);
      setIsSubmitting(false);

      if (res.success) {
        setIsSuccess(true);
        setFeedbackMessage(res.message);
        if (res.resetLinkForDev) {
          setDevResetLink(res.resetLinkForDev);
        }
      } else {
        setErrorMessage(res.message || 'Failed to request password reset.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  const handleCopyLink = () => {
    if (devResetLink) {
      navigator.clipboard.writeText(devResetLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 p-6 sm:p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Forgot your password?</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowKeyConfig(!showKeyConfig)}
          title="Configure Resend API Key for Real Outbound Emails"
          className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 text-center mb-6 leading-relaxed">
        Enter your registered email address below and we'll send you instructions to reset your password.
      </p>

      {/* Resend API Key Drawer / Configuration */}
      {showKeyConfig && (
        <div className="mb-5 p-4 bg-slate-900/90 border border-amber-500/40 rounded-xl space-y-3 animate-fadeIn text-xs">
          <div className="flex items-center justify-between text-amber-400 font-semibold">
            <div className="flex items-center gap-1.5">
              <Key className="w-4 h-4" />
              <span>Resend Outbound Email API Key</span>
            </div>
            <span className="text-[10px] text-slate-400">Official Mailer</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Enter your Resend API Key (<code className="text-amber-300 font-mono">re_...</code>) below to dispatch real emails directly to inbox addresses:
          </p>
          <form onSubmit={handleSaveApiKey} className="space-y-2">
            <input
              type="password"
              placeholder="re_123456789..."
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-colors text-xs"
              >
                Save Resend Key
              </button>
              {apiKeySaved && <span className="text-emerald-400 text-xs font-semibold">Saved!</span>}
            </div>
          </form>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3.5 bg-rose-950/70 border border-rose-700 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {isSuccess ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-200 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Check Your Inbox</h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed">{feedbackMessage}</p>
          </div>

          {/* Development / Direct Reset Link Simulation */}
          {devResetLink && (
            <div className="p-3.5 bg-slate-900/90 border border-sky-600/50 rounded-xl text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-sky-400 font-semibold text-[11px] uppercase tracking-wider">
                <span>Direct Reset Link (Testing Simulation)</span>
                <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800">Dev Environment</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Click below or copy the link to set a new password:
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={devResetLink}
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors truncate"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>Open Reset Password Page</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="input-forgot-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@church.org"
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          <button
            id="btn-send-reset-link"
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Reset Link</span>
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
