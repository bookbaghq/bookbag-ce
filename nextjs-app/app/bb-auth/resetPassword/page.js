'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

export default function ResetPasswordPage(){
  const params = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  function validatePassword(pw){
    const hasLowercase = /[a-z]/.test(pw);
    const hasUppercase = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(pw);
    const isLongEnough = pw.length >= 8;
    return hasLowercase && hasUppercase && hasNumber && hasSpecialChar && isLongEnough;
  }

  const resetSchema = z.object({
    token: z.string().min(1, 'Missing or invalid reset token.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').refine((pw) => validatePassword(pw), {
      message: 'Password must be at least 8 chars and include lowercase, uppercase, number, and special character.'
    }),
    confirm: z.string()
  }).refine((data) => data.password === data.confirm, {
    message: 'Passwords must match.',
    path: ['confirm']
  });

  async function onSubmit(e){
    e.preventDefault();
    // zod validation
    setPasswordError('');
    setConfirmError('');
    const parsed = resetSchema.safeParse({ token, password, confirm });
    if (!parsed.success) {
      const issues = parsed.error.issues || [];
      for (const issue of issues) {
        const field = issue.path?.[0];
        if (field === 'password' && !passwordError) setPasswordError(issue.message);
        if (field === 'confirm' && !confirmError) setConfirmError(issue.message);
      }
      // Do not open modal for client-side validation errors
      return;
    }
    setSubmitting(true);
    try{
      const backend = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const res = await fetch(`${backend}/bb-user/api/auth/changePassword`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const json = await res.json();
      if (!json?.success && json?.status !== 'ok') {
        // Backend error → show modal
        setErrorDialogMessage(json?.error || 'Failed to reset password');
        setErrorDialogOpen(true);
      } else {
        window.location.replace('/bb-auth/login');
      }
    }catch(e){
      // Network/backend error → show modal
      setErrorDialogMessage(e?.message || 'Failed to reset password');
      setErrorDialogOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token ? (
            <p className="text-sm text-red-600">This reset link is missing or invalid.</p>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPassword(v);
                    setPasswordError(v && !validatePassword(v) ? 'Must be 8+ chars incl. lower/upper/number/special.' : '');
                    // live-sync confirm match state
                    if (confirm) {
                      setConfirmError(v === confirm ? '' : 'Passwords must match.');
                    }
                  }}
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9" onClick={() => setShowPassword(s => !s)}>
                  {showPassword ? (<EyeOff className="h-4 w-4 text-muted-foreground" />) : (<Eye className="h-4 w-4 text-muted-foreground" />)}
                </button>
              </div>
              {passwordError ? (<p className="text-xs text-red-600">{passwordError}</p>) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm new password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => {
                    const v = e.target.value;
                    setConfirm(v);
                    setConfirmError(v === password ? '' : 'Passwords must match.');
                  }}
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9" onClick={() => setShowConfirm(s => !s)}>
                  {showConfirm ? (<EyeOff className="h-4 w-4 text-muted-foreground" />) : (<Eye className="h-4 w-4 text-muted-foreground" />)}
                </button>
              </div>
              {confirmError ? (<p className="text-xs text-red-600">{confirmError}</p>) : null}
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !token}>
              {submitting ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-red-600">{errorDialogMessage}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


