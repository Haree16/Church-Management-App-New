/**
 * Official Outbound Email Service using Resend API
 */

const getResendApiKey = (): string | undefined => {
  if (typeof window !== 'undefined') {
    // 1. Check local storage key
    const customKey = localStorage.getItem('nca_church_resend_api_key');
    if (customKey && customKey.trim()) return customKey.trim();

    // 2. Check import.meta.env
    try {
      const envKey = (import.meta as any)?.env?.VITE_RESEND_API_KEY;
      if (envKey && envKey.trim()) return envKey.trim();
    } catch (e) {
      // Silent fallback
    }
  }
  return undefined;
};

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const emailService = {
  /**
   * Save Resend API key to local settings
   */
  setApiKey(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nca_church_resend_api_key', key.trim());
    }
  },

  /**
   * Check if Resend API key is configured
   */
  isConfigured(): boolean {
    return Boolean(getResendApiKey());
  },

  /**
   * Dispatch outbound email via Resend API
   */
  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const apiKey = getResendApiKey();

    if (!apiKey) {
      console.warn('Resend API key is not set. Email dispatch logged in dev mode.');
      return {
        success: false,
        error: 'Resend API key not configured. Please add your VITE_RESEND_API_KEY to send real emails to inbox.',
      };
    }

    const fromAddress = payload.fromEmail 
      ? `${payload.fromName || 'Church Admin'} <${payload.fromEmail}>`
      : `${payload.fromName || 'Church Management System'} <onboarding@resend.dev>`;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
        }),
      });

      const data = await response.json();

      if (response.ok && data.id) {
        return {
          success: true,
          messageId: data.id,
        };
      } else {
        return {
          success: false,
          error: data.message || data.error?.message || 'Failed to send email via Resend API.',
        };
      }
    } catch (err: any) {
      console.error('Outbound email error:', err);
      return {
        success: false,
        error: err.message || 'Network error sending email.',
      };
    }
  },

  /**
   * Send Password Reset Email Template
   */
  async sendPasswordResetEmail(email: string, resetLink: string, churchName = 'New Creation Assembly Church'): Promise<SendEmailResult> {
    const subject = `Reset your password - ${churchName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo-title { color: #f59e0b; font-size: 22px; font-weight: bold; margin: 8px 0 0 0; }
          .h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
          .p { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { background: linear-gradient(to right, #f59e0b, #d97706); color: #090d16 !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(245,158,11,0.3); }
          .notice { font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 20px; margin-top: 32px; }
          .link-fallback { word-break: break-all; color: #38bdf8; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <div class="logo-title">⛪ ${churchName}</div>
          </div>
          <div class="h1">Reset your password</div>
          <p class="p">You requested to reset your password for your Church Management System account. Click the button below to create a new password. This link will expire in 45 minutes.</p>
          
          <div class="btn-container">
            <a href="${resetLink}" target="_blank" class="btn">Reset Password</a>
          </div>

          <p class="p">If the button above does not work, copy and paste this URL into your browser:</p>
          <p class="link-fallback"><a href="${resetLink}" style="color: #38bdf8;">${resetLink}</a></p>

          <div class="notice">
            <p>If you did not request a password reset, please ignore this email or contact your church administrator immediately.</p>
            <p>© ${new Date().getFullYear()} ${churchName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      fromName: churchName,
    });
  },
};
