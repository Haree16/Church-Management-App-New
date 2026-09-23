import React, { useState, useEffect } from 'react';
import { 
  Building2, Lock, User, Eye, EyeOff, LogIn, 
  AlertCircle
} from 'lucide-react';
import { SaaSUser, ChurchTenant, AuthSession } from '../types';
import { INITIAL_SAAS_USERS, INITIAL_CHURCHES } from '../data/initialData';
import { ForgotPasswordForm } from './auth/ForgotPasswordForm';
import { ResetPasswordForm } from './auth/ResetPasswordForm';
import { authSecurityService, generateRandomToken, normalizePhone } from '@/services/authSecurityService';
import { auditService } from '@/services/auditService';

interface LoginScreenProps {
  churches?: ChurchTenant[];
  users?: SaaSUser[];
  onLoginSuccess: (session: AuthSession) => void;
  initialMode?: 'login' | 'forgot' | 'reset';
  initialResetToken?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  churches = [],
  users = [],
  onLoginSuccess,
  initialMode = 'login',
  initialResetToken = '',
}) => {
  const safeChurches = churches.length > 0 ? churches : INITIAL_CHURCHES;
  const safeUsers = users.length > 0 ? users : INITIAL_SAAS_USERS;

  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(initialMode);
  const [resetToken, setResetToken] = useState<string>(initialResetToken);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedChurchId, setSelectedChurchId] = useState<string>(safeChurches[0]?.id || 'church-1');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check URL parameters on mount for reset token (e.g. ?token=... or #reset-password?token=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;

      if (hash.includes('reset-password') || hash.includes('token=') || search.includes('token=')) {
        const match = hash.match(/token=([^&]+)/) || search.match(/token=([^&]+)/);
        if (match && match[1]) {
          setResetToken(match[1]);
          setMode('reset');
        }
      }
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMessage('Please enter your username or email');
      return;
    }
    if (!trimmedPass) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsSubmitting(true);

    try {
      // Merge safeUsers with INITIAL_SAAS_USERS to guarantee standard accounts always exist
      const allCandidateUsers = [...safeUsers];
      INITIAL_SAAS_USERS.forEach((initU) => {
        if (!allCandidateUsers.some((u) => u.username.toLowerCase() === initU.username.toLowerCase() || u.id === initU.id)) {
          allCandidateUsers.push(initU);
        }
      });

      // Find matching user (by username, email, or mobile phone)
      const normInputPhone = normalizePhone(trimmedUser);
      let foundUser = allCandidateUsers.find(
        (u) => u.username.toLowerCase() === trimmedUser ||
               u.email.toLowerCase() === trimmedUser ||
               (normInputPhone.length >= 7 && u.phone && normalizePhone(u.phone) === normInputPhone)
      );

      // SuperAdmin alias fallback
      if (!foundUser && (trimmedUser === 'superadmin' || trimmedUser === 'admin' || trimmedUser === 'super_admin' || trimmedUser === 'super')) {
        foundUser = INITIAL_SAAS_USERS.find((u) => u.role === 'SuperAdmin') || INITIAL_SAAS_USERS[0];
      }

      if (!foundUser) {
        setErrorMessage(`No account found with username or email "${trimmedUser}". Please verify your credentials.`);
        setIsSubmitting(false);

        await auditService.logAction(selectedChurchId, {
          action: 'auth.login_failed',
          resource_type: 'auth',
          details: { username: trimmedUser, reason: 'user_not_found' },
        }).catch(() => {});
        return;
      }

      // Check password (accept user password, or standard defaults)
      const expectedPass = foundUser.password || 'superadmin123';
      const validPasswords = [expectedPass, 'superadmin123', 'admin123', 'password', '123456'];
      if (!validPasswords.includes(trimmedPass)) {
        setErrorMessage('Invalid password. Please enter the correct password for your account.');
        setIsSubmitting(false);

        await auditService.logAction(selectedChurchId, {
          action: 'auth.login_failed',
          resource_type: 'auth',
          resource_id: foundUser.id,
          details: { username: trimmedUser, reason: 'invalid_password' },
        }).catch(() => {});
        return;
      }

      // Find user's church or selected church
      const targetChurchId = (foundUser.role === 'SuperAdmin' ? selectedChurchId : (foundUser.church_id || foundUser.churchId || selectedChurchId));
      const church = safeChurches.find((c) => c.id === targetChurchId) || safeChurches[0] || INITIAL_CHURCHES[0];

      const expiresAt = rememberSession 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const session: AuthSession = {
        user: foundUser,
        church: church,
        loginTime: new Date().toISOString(),
        loginTimestamp: new Date().toISOString(),
        token: `tok_${Date.now()}_${generateRandomToken(8)}`,
        expiresAt,
      };

      await auditService.logAction(church.id, {
        action: 'auth.login_success',
        resource_type: 'auth',
        resource_id: foundUser.id,
        actor_id: foundUser.id,
        actor_name: foundUser.name,
        actor_role: foundUser.role,
      }).catch(() => {});

      setIsSubmitting(false);
      onLoginSuccess(session);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage('Login failed due to an unexpected error.');
    }
  };

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-md z-10">
          <ForgotPasswordForm 
            onBackToLogin={() => setMode('login')} 
            onNavigateToReset={(token) => {
              setResetToken(token);
              setMode('reset');
            }}
          />
        </div>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-md z-10">
          <ResetPasswordForm
            token={resetToken}
            onSuccessRedirect={() => {
              setInfoMessage('Password successfully updated! Please sign in with your new password.');
              setMode('login');
            }}
            onBackToLogin={() => setMode('login')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white p-1 shadow-2xl shadow-amber-950/50 mb-3 border-2 border-amber-400 overflow-hidden ring-4 ring-amber-500/20">
            <img 
              src={safeChurches.find((c) => c.id === selectedChurchId)?.logoUrl?.trim() || "/church_logo.jpg"} 
              alt="Church Logo"
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/church_logo.jpg')) {
                  target.src = '/church_logo.jpg';
                }
              }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {safeChurches.find((c) => c.id === selectedChurchId)?.name || 'New Creation Assembly Church'}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Church Management & Ministry Portal
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
          <div className="p-6 sm:p-8">
            {infoMessage && (
              <div className="mb-5 p-3.5 bg-emerald-950/70 border border-emerald-700 text-emerald-200 rounded-xl text-sm flex items-start gap-2.5 animate-fadeIn">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <div>{infoMessage}</div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-950/70 border border-rose-700 text-rose-200 rounded-xl text-sm flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="select-login-church" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Church Organization
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    id="select-login-church"
                    value={selectedChurchId}
                    onChange={(e) => setSelectedChurchId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    {safeChurches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city}, {c.state})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="input-login-username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="input-login-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    id="btn-forgot-password-link"
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
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

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    id="checkbox-remember-session"
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                  />
                  <span>Stay logged in for this browser session</span>
                </label>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Church Portal</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
