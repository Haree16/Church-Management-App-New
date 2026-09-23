import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
        <ForgotPasswordForm 
          onBackToLogin={() => navigate('/login')} 
          onNavigateToReset={(token) => navigate(`/reset-password?token=${token}`)}
        />
    </div>
  );
}

