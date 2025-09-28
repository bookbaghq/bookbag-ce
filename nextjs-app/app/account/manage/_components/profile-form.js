'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import ProfileService from "@/services/profileService"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export function ProfileForm() {
  const service = useMemo(() => new ProfileService(), []);
  const [user, setUser] = useState({ id: '', userName: '', firstName: '', lastName: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [passwordStrengthColor, setPasswordStrengthColor] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState("");
  const [formErrors, setFormErrors] = useState({ firstName: '', lastName: '', email: '', password: '' });

  useEffect(() => {
    (async () => {
      const resp = await service.myProfile();
      if (resp?.user) setUser(resp.user);
    })();
  }, [service]);

  const onChange = (e) => setUser(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const calculatePasswordStrength = (val) => {
    if (!val) { setPasswordStrength(""); setPasswordStrengthColor(""); return; }
    const hasLowercase = /[a-z]/.test(val);
    const hasUppercase = /[A-Z]/.test(val);
    const hasNumber = /[0-9]/.test(val);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(val);
    const isLongEnough = val.length >= 8;
    const strength = [hasLowercase, hasUppercase, hasNumber, hasSpecialChar, isLongEnough].filter(Boolean).length;
    if (strength <= 2) { setPasswordStrength("Weak"); setPasswordStrengthColor("bg-red-200 text-red-700"); }
    else if (strength <= 4) { setPasswordStrength("Medium"); setPasswordStrengthColor("bg-yellow-200 text-yellow-700"); }
    else { setPasswordStrength("Strong"); setPasswordStrengthColor("bg-green-200 text-green-700"); }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
    let newPassword = "";
    for (let i = 0; i < 12; i++) newPassword += chars[Math.floor(Math.random() * chars.length)];
    setPassword(newPassword);
    calculatePasswordStrength(newPassword);
  };

  async function onSave() {
    setSaving(true);
    // Client-side validation
    const errs = { firstName: '', lastName: '', email: '', password: '' };
    const trim = (v) => String(v || '').trim();
    const isValidEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trim(v));
    if (!trim(user.firstName)) errs.firstName = 'First name is required.';
    if (!trim(user.lastName)) errs.lastName = 'Last name is required.';
    if (!trim(user.email)) errs.email = 'Email is required.';
    else if (!isValidEmail(user.email)) errs.email = 'Please enter a valid email address.';
    if (password) {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
      const isLongEnough = password.length >= 8;
      if (!(hasLowercase && hasUppercase && hasNumber && hasSpecialChar && isLongEnough)) {
        errs.password = 'Password must be at least 8 chars and include lowercase, uppercase, number, and special character.';
      }
    }
    const hasErrors = Object.values(errs).some(Boolean);
    setFormErrors(errs);
    if (hasErrors) { setSaving(false); return; }
    try {
      const payload = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email };
      if (password) payload.password = password;
      const json = await service.saveMyProfile(payload);
      if (!json?.success) {
        setErrorDialogMessage(json?.error || 'Failed to save profile');
        setErrorDialogOpen(true);
      } else {
        setPassword("");
        setPasswordStrength("");
        setPasswordStrengthColor("");
      }
    } catch (e) {
      setErrorDialogMessage(e?.message || 'Failed to save profile');
      setErrorDialogOpen(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Name Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Name</CardTitle>
          <CardDescription>How your name appears across the app.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="text-sm font-medium">Username</label>
              <div className="md:col-span-2">
                <Input name="userName" value={user.userName} readOnly disabled className="bg-muted" />
              </div>
              <p className="text-sm text-muted-foreground">Usernames cannot be changed.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="text-sm font-medium">First Name</label>
              <div className="md:col-span-2">
                <Input name="firstName" value={user.firstName} onChange={onChange} />
                {formErrors.firstName ? (<p className="text-xs text-red-600 mt-1">{formErrors.firstName}</p>) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="text-sm font-medium">Last Name</label>
              <div className="md:col-span-2">
                <Input name="lastName" value={user.lastName} onChange={onChange} />
                {formErrors.lastName ? (<p className="text-xs text-red-600 mt-1">{formErrors.lastName}</p>) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <label className="text-sm font-medium pt-2">Email (required)</label>
              <div className="md:col-span-2 space-y-2">
                <Input name="email" type="email" value={user.email} onChange={onChange} required />
                {formErrors.email ? (<p className="text-xs text-red-600">{formErrors.email}</p>) : null}
                <p className="text-xs text-muted-foreground">If you change this, an email may be sent to confirm the new address.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Management Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <label className="text-sm font-medium pt-2">Password</label>
              <div className="md:col-span-3 space-y-2">
                <Button type="button" variant="outline" size="sm" onClick={generateRandomPassword} className="mb-2">Generate Password</Button>
                <div className="relative">
                  <Input
                    type={passwordVisible ? 'text' : 'password'}
                    placeholder="Enter a new password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); calculatePasswordStrength(e.target.value); }}
                  />
                  {formErrors.password ? (<p className="text-xs text-red-600 mt-1">{formErrors.password}</p>) : null}
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9" onClick={() => setPasswordVisible(!passwordVisible)}>
                    {passwordVisible ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {passwordStrength && (
                  <div className={`text-center py-1 px-4 text-sm rounded ${passwordStrengthColor}`}>{passwordStrength}</div>
                )}
                <p className="text-xs text-muted-foreground mt-2">Leave blank to keep your current password.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end mt-6">
        <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Button>
      </div>

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
    </>
  )
}
