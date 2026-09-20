import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authSecurityService } from '@/services/authSecurityService';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || '';

  const [token, setToken] = useState(rawToken);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let tok = rawToken;
    if (!tok && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const match = hash.match(/token=([^&]+)/);
      if (match) tok = match[1];
    }

    if (tok) {
      setToken(tok);
      authSecurityService.validateResetToken(tok).then((res) => {
        setIsValidating(false);
        if (res.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(res.error || 'Invalid or expired reset token.');
        }
      });
    } else {
      setIsValidating(false);
      setTokenValid(false);
      setTokenError('No reset token provided in URL parameters.');
    }
  }, [rawToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await authSecurityService.resetPasswordWithToken(token, password);
      setIsLoading(false);

      if (result.success) {
        setIsSuccess(true);
        toast.success('Password updated successfully!');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(result.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'An error occurred during password reset.');
    }
  };

  if (isValidating) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-4">
        <div className="text-white text-center text-xs">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Validating reset token...
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-4">
        <Card className="border-slate-800 bg-slate-900/90 text-white shadow-2xl backdrop-blur-md w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-red-400">Invalid or Expired Reset Token</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {tokenError || 'The reset link is invalid or expired. Please request a new password reset link.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-white">
              <Link to="/forgot-password">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Request New Password Link
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-800 bg-slate-900/90 text-white shadow-2xl backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">Create New Password</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter your new password below.
            </CardDescription>
          </CardHeader>

          {isSuccess ? (
            <CardContent className="space-y-4 pt-2">
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <CheckCircle2 className="h-10 w-10 mb-2 text-emerald-400" />
                <h4 className="text-sm font-semibold">Password updated!</h4>
                <p className="mt-1 text-xs text-slate-300">
                  Redirecting you to the sign in page...
                </p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">New Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4" />}
                    className="border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500"
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Confirm New Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4" />}
                    className="border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500"
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white"
                  isLoading={isLoading}
                >
                  Save New Password
                </Button>
              </CardContent>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
