import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <ForgotPasswordForm onBackToLogin={() => navigate('/login')} />
      </div>
    </div>
  );
}

