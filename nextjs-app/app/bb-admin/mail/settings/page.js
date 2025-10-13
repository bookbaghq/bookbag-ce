"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import MailService from "@/services/mailService";
import { toast } from 'sonner';

export default function MailSettingsPage() {
  const service = React.useMemo(() => new MailService(), []);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "general";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [returnPathMatchesFrom, setReturnPathMatchesFrom] = useState(false);
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  // SMTP state (single connection)
  const [smtpForm, setSmtpForm] = useState({ id: null, host: "", port: "25", secure: false, auth_user: "", auth_pass: "", is_backup: false, is_active: true });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpHasExistingPassword, setSmtpHasExistingPassword] = useState(false);
  const [smtpPassVisible, setSmtpPassVisible] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState("");

  // Test email state
  const [testToEmail, setTestToEmail] = useState("");
  const [testSubject, setTestSubject] = useState("Test Email");
  const [testText, setTestText] = useState("Hello from Bookbag");
  const [testSending, setTestSending] = useState(false);

  const loadGeneralSettings = useCallback(async () => {
    const resp = await service.getSettings();
    if (resp?.success && resp.settings) {
      const s = resp.settings || {};
      setFromEmail(String(s.from_email || ""));
      setFromName(String(s.from_name || ""));
      setReturnPathMatchesFrom(!!s.return_path_matches_from);
      setWeeklySummaryEnabled(!!s.weekly_summary_enabled);
    }
  }, [service]);

  // Load General settings only when the General tab is active (covers initial load when default tab is general)
  useEffect(() => {
    if (activeTab === 'general') {
      loadGeneralSettings();
    }
  }, [activeTab, loadGeneralSettings]);

  // Load single SMTP connection
  const smtpLoad = useCallback(async () => {
    const resp = await service.listSmtp();
    if (resp?.success) {
      const conn = resp.smtp || null;
      if (conn) {
        setSmtpForm({
          id: conn.id ?? null,
          host: conn.host || "",
          port: String(conn.port ?? "25"),
          secure: !!conn.secure,
          auth_user: conn.auth_user || "",
          auth_pass: conn.auth_pass || '',
          is_backup: !!conn.is_backup,
          is_active: !!conn.is_active,
        });
        setSmtpHasExistingPassword(!!conn.auth_pass);
      } else {
        setSmtpForm({ id: null, host: "", port: "25", secure: false, auth_user: "", auth_pass: "", is_backup: false, is_active: true });
        setSmtpHasExistingPassword(false);
      }
    }
  }, [service]);

  // Load SMTP only when SMTP tab is active (covers initial load if initial tab is smtp)
  useEffect(() => {
    if (activeTab === 'smtp') {
      smtpLoad();
    }
  }, [activeTab, smtpLoad]);

  // Simple email validation
  function isValidEmail(email) {
    const value = String(email || '').trim();
    if (!value) return false;
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  }

  async function onSave() {
    setSaving(true);
    try {
      const name = String(fromName || '').trim();
      const email = String(fromEmail || '').trim();
      if (!name) {
        setErrorDialogMessage('From Name is required.');
        setErrorDialogOpen(true);
        return;
      }
      if (!isValidEmail(email)) {
        setErrorDialogMessage('From Email is required and must be a valid email address.');
        setErrorDialogOpen(true);
        return;
      }
      const resp = await service.saveSettings({ from_email: email, from_name: name, return_path_matches_from: returnPathMatchesFrom, weekly_summary_enabled: weeklySummaryEnabled });
      if (!resp?.success) {
        setErrorDialogMessage(normalizeError(resp));
        setErrorDialogOpen(true);
      }
    } catch (e) {
      setErrorDialogMessage(normalizeError(e));
      setErrorDialogOpen(true);
    } finally {
      setSaving(false);
    }
  }

  function copy(text) {
    try { navigator.clipboard.writeText(text); toast.success('Copied'); } catch { toast.error('Copy failed'); }
  }

  // SMTP helpers
  function smtpSetField(k, v) { setSmtpForm(prev => ({ ...prev, [k]: v })); }

  // Client-side error normalizer similar to backend errorService
  function normalizeError(raw) {
    try {
      if (typeof raw === 'string') {
        const obj = JSON.parse(raw);
        if (obj && obj.error) return obj.error.message || String(raw);
        return String(raw);
      }
      if (raw && typeof raw === 'object') {
        if (raw.error) return raw.error.message || JSON.stringify(raw.error);
        if (raw.message) return raw.message;
        return JSON.stringify(raw);
      }
      return 'An unknown error occurred';
    } catch (_) {
      return typeof raw === 'string' ? raw : (raw?.message || 'An unknown error occurred');
    }
  }

  async function smtpOnSave() {
    setSmtpSaving(true);
    try {
      const payload = { ...smtpForm };
      // If we previously had a password and the field is left as placeholder or blank, don't send it (keep existing)
      if (smtpHasExistingPassword && (!smtpForm.auth_pass || smtpForm.auth_pass === '*****')) {
        delete payload.auth_pass;
      }
      const resp = await service.saveSmtp(payload);
      if (resp?.success) {
        await smtpLoad();
      } else {
        setErrorDialogMessage(normalizeError(resp));
        setErrorDialogOpen(true);
      }
    } catch (e) {
      setErrorDialogMessage(normalizeError(e));
      setErrorDialogOpen(true);
    } finally {
      setSmtpSaving(false);
    }
  }

  async function onSendTest() {
    setTestSending(true);
    try {
      const resp = await service.sendTest({ toEmail: testToEmail, subject: testSubject, text: testText });
      if (!resp?.success) {
        setErrorDialogMessage(normalizeError(resp));
        setErrorDialogOpen(true);
      }
    } catch (e) {
      setErrorDialogMessage(normalizeError(e));
      setErrorDialogOpen(true);
    } finally {
      setTestSending(false);
    }
  }

  const curlExample = `curl -X POST \\
  "$API_BASE/bb-mail/api/send" \\
  -H 'Content-Type: application/json' \\
  --cookie 'login=YOUR_SESSION_TOKEN' \\
  -d '{
    "to": "user@example.com",
    "subject": "Welcome!",
    "text": "Thanks for signing up"
  }'`;

  const fetchExample = `await fetch('/bb-mail/api/send', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Password Reset',
    html: '<b>Click the link to reset your password</b>'
  })
});`;

  const nodeExample = `import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://your-domain';

async function sendMail() {
  const res = await fetch(API_BASE + '/bb-mail/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Include cookie header if your API requires session auth
    // headers: { 'Content-Type': 'application/json', 'Cookie': 'login=YOUR_SESSION_TOKEN' },
    body: JSON.stringify({
      to: 'user@example.com',
      subject: 'Admin Created Your Account',
      text: 'Your temporary password is 1234'
    })
  });
  const json = await res.json();
  console.log(json);
}

sendMail();`;

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>From address and behavior</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 max-w-xl">
              <div className="grid gap-2">
                <label className="text-sm">From Email</label>
                <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="noreply@example.com" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">From Name</label>
                <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="My App" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={returnPathMatchesFrom} onChange={e => setReturnPathMatchesFrom(e.target.checked)} />
                Set return-path to match from email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={weeklySummaryEnabled} onChange={e => setWeeklySummaryEnabled(e.target.checked)} />
                Weekly Email Summaries
              </label>
            </CardContent>
            <CardFooter>
              <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </CardFooter>
            <div className="mt-4 pr-4 pl-6 pt-2 pb-8 text-sm space-y-2 w-full">
              <div className="font-medium">About Return-Path and Weekly Summaries</div>
              <div>
                <span className="font-medium">Return-Path matches From</span>: Sets the SMTP envelope sender (bounce address) to your From Email. This routes bounces to the same address and can improve DMARC alignment. If your provider uses a dedicated bounce/return domain, leave this off.
              </div>
              <div>
                <span className="font-medium">Weekly Email Summaries</span>: When enabled, the app may send a weekly digest of activity (e.g., stats/alerts) if a scheduler or background job is configured to deliver them.
              </div>
              <div className="text-xs text-muted-foreground">Note: DMARC alignment is strongest when Return-Path and From share the same domain.</div>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Send via API</CardTitle>
              <CardDescription>POST /bb-mail/api/send</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="text-sm text-muted-foreground">
                Required fields: <span className="text-foreground">to</span>, <span className="text-foreground">subject</span>, and one of <span className="text-foreground">text</span> or <span className="text-foreground">html</span>.
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">cURL</div>
                  <Button variant="outline" size="sm" onClick={() => copy(curlExample)}>Copy</Button>
                </div>
                <pre className="rounded-lg border bg-muted p-3 text-xs overflow-auto">
{curlExample}
                </pre>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">JavaScript (fetch)</div>
                  <Button variant="outline" size="sm" onClick={() => copy(fetchExample)}>Copy</Button>
                </div>
                <pre className="rounded-lg border bg-muted p-3 text-xs overflow-auto">
{fetchExample}
                </pre>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Node.js</div>
                  <Button variant="outline" size="sm" onClick={() => copy(nodeExample)}>Copy</Button>
                </div>
                <pre className="rounded-lg border bg-muted p-3 text-xs overflow-auto">
{nodeExample}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Connection</CardTitle>
              <CardDescription>Configure the single transport used to send email</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 max-w-md">
              <div className="grid gap-2">
                <label className="text-sm">Host</label>
                <Input value={smtpForm.host} onChange={e => smtpSetField('host', e.target.value)} placeholder="smtp.example.com" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <label className="text-sm">Port</label>
                  <Input type="text" value={String(smtpForm.port ?? "")} onChange={e => smtpSetField('port', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={smtpForm.secure} onChange={e => smtpSetField('secure', e.target.checked)} /> Secure
                  </label>
                  <div className="text-xs text-muted-foreground">Encrypts the connection using TLS/SSL. Typically port 465 (SMTPS) or 587 with STARTTLS.</div>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Auth User</label>
                <Input value={smtpForm.auth_user} onChange={e => smtpSetField('auth_user', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Auth Pass</label>
                <div className="relative">
                  <Input
                    type={smtpPassVisible ? "text" : "password"}
                    value={smtpForm.auth_pass}
                    onChange={e => smtpSetField('auth_pass', e.target.value)}
                    placeholder={smtpHasExistingPassword ? 'Leave blank to keep existing' : ''}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setSmtpPassVisible(v => !v)}
                    aria-label={smtpPassVisible ? 'Hide password' : 'Show password'}
                  >
                    {smtpPassVisible ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={smtpForm.is_active} onChange={e => smtpSetField('is_active', e.target.checked)} /> Active
              </label>
              <div className="text-xs text-muted-foreground">Default transport used for sending email.</div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={smtpForm.is_backup} onChange={e => smtpSetField('is_backup', e.target.checked)} /> Backup Connection
              </label>
              <div className="text-xs text-muted-foreground">Fallback transport if the active connection fails.</div>
            </CardContent>
            <CardFooter>
              <Button onClick={smtpOnSave} disabled={smtpSaving}>{smtpSaving ? 'Saving...' : 'Save'}</Button>
            </CardFooter>
            <div className="mt-4 pr-4 pl-6 pt-2 pb-8 text-sm space-y-2 w-full">
              <div className="font-medium">About Secure and Backup</div>
              <div>
                <span className="font-medium">Secure</span>: Enables TLS/SSL for the SMTP connection. Use port 465 when Secure is on. When Secure is off, ports 587 or 25 start unencrypted and upgrade with STARTTLS if the server supports it.
              </div>
              <div>
                <span className="font-medium">Backup Connection</span>: A fallback transport used only if the primary active connection fails. It is not load balancing; mail is sent via the primary unless it fails.
              </div>
              <div className="text-xs text-muted-foreground">Tip: If sends fail with Secure on, verify the server and use port 465. If using port 587/25, turn Secure off to allow STARTTLS.</div>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="test">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>Verify your setup</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm">To</label>
                <Input value={testToEmail} onChange={e => setTestToEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Subject</label>
                <Input value={testSubject} onChange={e => setTestSubject(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Text</label>
                <Input value={testText} onChange={e => setTestText(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={onSendTest} disabled={testSending || !testToEmail}>{testSending ? 'Sending...' : 'Send Test'}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Error dialog */}
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


