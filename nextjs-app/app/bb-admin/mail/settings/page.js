'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Save, Eye, EyeOff, Copy, Send } from 'lucide-react';
import MailService from '@/services/mailService';
import { toast } from 'sonner';

export default function MailSettingsPage() {
  const service = React.useMemo(() => new MailService(), []);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [returnPathMatchesFrom, setReturnPathMatchesFrom] = useState(false);
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  // SMTP state
  const [smtpForm, setSmtpForm] = useState({
    id: null,
    host: '',
    port: '25',
    secure: false,
    auth_user: '',
    auth_pass: '',
    is_backup: false,
    is_active: true
  });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpHasExistingPassword, setSmtpHasExistingPassword] = useState(false);
  const [smtpPassVisible, setSmtpPassVisible] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');

  // Test email state
  const [testToEmail, setTestToEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email');
  const [testText, setTestText] = useState('Hello from Bookbag');
  const [testSending, setTestSending] = useState(false);

  const loadGeneralSettings = useCallback(async () => {
    const resp = await service.getSettings();
    if (resp?.success && resp.settings) {
      const s = resp.settings || {};
      setFromEmail(String(s.from_email || ''));
      setFromName(String(s.from_name || ''));
      setReturnPathMatchesFrom(!!s.return_path_matches_from);
      setWeeklySummaryEnabled(!!s.weekly_summary_enabled);
    }
    setLoading(false);
  }, [service]);

  useEffect(() => {
    if (activeTab === 'general') {
      loadGeneralSettings();
    }
  }, [activeTab, loadGeneralSettings]);

  const smtpLoad = useCallback(async () => {
    setLoading(true);
    const resp = await service.listSmtp();
    if (resp?.success) {
      const conn = resp.smtp || null;
      if (conn) {
        setSmtpForm({
          id: conn.id ?? null,
          host: conn.host || '',
          port: String(conn.port ?? '25'),
          secure: !!conn.secure,
          auth_user: conn.auth_user || '',
          auth_pass: conn.auth_pass || '',
          is_backup: !!conn.is_backup,
          is_active: !!conn.is_active
        });
        setSmtpHasExistingPassword(!!conn.auth_pass);
      } else {
        setSmtpForm({
          id: null,
          host: '',
          port: '25',
          secure: false,
          auth_user: '',
          auth_pass: '',
          is_backup: false,
          is_active: true
        });
        setSmtpHasExistingPassword(false);
      }
    }
    setLoading(false);
  }, [service]);

  useEffect(() => {
    if (activeTab === 'smtp') {
      smtpLoad();
    }
  }, [activeTab, smtpLoad]);

  useEffect(() => {
    if (activeTab === 'api' || activeTab === 'test') {
      setLoading(false);
    }
  }, [activeTab]);

  function isValidEmail(email) {
    const value = String(email || '').trim();
    if (!value) return false;
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  }

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
      return typeof raw === 'string' ? raw : raw?.message || 'An unknown error occurred';
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      const name = String(fromName || '').trim();
      const email = String(fromEmail || '').trim();
      if (!name) {
        toast.error('From Name is required');
        return;
      }
      if (!isValidEmail(email)) {
        toast.error('From Email is required and must be a valid email address');
        return;
      }
      const resp = await service.saveSettings({
        from_email: email,
        from_name: name,
        return_path_matches_from: returnPathMatchesFrom,
        weekly_summary_enabled: weeklySummaryEnabled
      });
      if (resp?.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(normalizeError(resp));
      }
    } catch (e) {
      toast.error(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  function copy(text) {
    try {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  }

  function smtpSetField(k, v) {
    setSmtpForm((prev) => ({ ...prev, [k]: v }));
  }

  async function smtpOnSave() {
    setSmtpSaving(true);
    try {
      const payload = { ...smtpForm };
      if (smtpHasExistingPassword && (!smtpForm.auth_pass || smtpForm.auth_pass === '*****')) {
        delete payload.auth_pass;
      }
      const resp = await service.saveSmtp(payload);
      if (resp?.success) {
        toast.success('SMTP settings saved successfully');
        await smtpLoad();
      } else {
        toast.error(normalizeError(resp));
      }
    } catch (e) {
      toast.error(normalizeError(e));
    } finally {
      setSmtpSaving(false);
    }
  }

  async function onSendTest() {
    setTestSending(true);
    try {
      const resp = await service.sendTest({ toEmail: testToEmail, subject: testSubject, text: testText });
      if (resp?.success) {
        toast.success('Test email sent successfully');
      } else {
        toast.error(normalizeError(resp));
      }
    } catch (e) {
      toast.error(normalizeError(e));
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mail Settings</h1>
        <p className="text-muted-foreground">
          Configure email delivery, SMTP connections, and test your setup
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure sender information and email behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* From Email */}
              <div className="space-y-2">
                <Label htmlFor="from-email" className="text-base font-medium">
                  From Email
                </Label>
                <Input
                  id="from-email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="noreply@example.com"
                />
                <p className="text-sm text-muted-foreground">
                  The email address that will appear as the sender for all outgoing emails
                </p>
              </div>

              {/* From Name */}
              <div className="space-y-2">
                <Label htmlFor="from-name" className="text-base font-medium">
                  From Name
                </Label>
                <Input
                  id="from-name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="My App"
                />
                <p className="text-sm text-muted-foreground">
                  The display name that will appear alongside the from email address
                </p>
              </div>

              {/* Return Path Matches From */}
              <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="return-path" className="text-base font-medium">
                    Return-Path Matches From
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sets the SMTP envelope sender (bounce address) to your From Email. This routes bounces
                    to the same address and can improve DMARC alignment.
                  </p>
                </div>
                <Switch
                  id="return-path"
                  checked={returnPathMatchesFrom}
                  onCheckedChange={setReturnPathMatchesFrom}
                />
              </div>

              {/* Weekly Summary */}
              <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="weekly-summary" className="text-base font-medium">
                    Weekly Email Summaries
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the app may send a weekly digest of activity (e.g., stats/alerts) if a
                    scheduler or background job is configured to deliver them.
                  </p>
                </div>
                <Switch
                  id="weekly-summary"
                  checked={weeklySummaryEnabled}
                  onCheckedChange={setWeeklySummaryEnabled}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={onSave} disabled={saving} size="lg">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>About General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground mb-2">From Address Configuration</h3>
                <p>
                  The From Email and From Name determine how recipients see the sender of your emails. Choose
                  a professional, recognizable sender address to improve deliverability and trust.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">DMARC Alignment</h3>
                <p>
                  DMARC alignment is strongest when Return-Path and From share the same domain. If your
                  provider uses a dedicated bounce/return domain, leave Return-Path matching disabled.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Connection</CardTitle>
              <CardDescription>Configure the transport used to send email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Host */}
              <div className="space-y-2">
                <Label htmlFor="smtp-host" className="text-base font-medium">
                  Host
                </Label>
                <Input
                  id="smtp-host"
                  value={smtpForm.host}
                  onChange={(e) => smtpSetField('host', e.target.value)}
                  placeholder="smtp.example.com"
                />
                <p className="text-sm text-muted-foreground">The SMTP server hostname or IP address</p>
              </div>

              {/* Port */}
              <div className="space-y-2">
                <Label htmlFor="smtp-port" className="text-base font-medium">
                  Port
                </Label>
                <Input
                  id="smtp-port"
                  type="text"
                  value={String(smtpForm.port ?? '')}
                  onChange={(e) => smtpSetField('port', e.target.value)}
                  placeholder="25"
                />
                <p className="text-sm text-muted-foreground">Common ports: 25, 587, 465</p>
              </div>

              {/* Secure (TLS/SSL) */}
              <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="smtp-secure" className="text-base font-medium">
                    Secure (TLS/SSL)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable TLS/SSL encryption for secure SMTP connection
                  </p>
                </div>
                <Switch
                  id="smtp-secure"
                  checked={smtpForm.secure}
                  onCheckedChange={(checked) => smtpSetField('secure', checked)}
                />
              </div>

              {/* Auth User */}
              <div className="space-y-2">
                <Label htmlFor="smtp-user" className="text-base font-medium">
                  Auth User
                </Label>
                <Input
                  id="smtp-user"
                  value={smtpForm.auth_user}
                  onChange={(e) => smtpSetField('auth_user', e.target.value)}
                  placeholder="username@example.com"
                />
                <p className="text-sm text-muted-foreground">SMTP authentication username</p>
              </div>

              {/* Auth Pass */}
              <div className="space-y-2">
                <Label htmlFor="smtp-pass" className="text-base font-medium">
                  Auth Password
                </Label>
                <div className="relative">
                  <Input
                    id="smtp-pass"
                    type={smtpPassVisible ? 'text' : 'password'}
                    value={smtpForm.auth_pass}
                    onChange={(e) => smtpSetField('auth_pass', e.target.value)}
                    placeholder={smtpHasExistingPassword ? 'Leave blank to keep existing' : ''}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setSmtpPassVisible((v) => !v)}
                    aria-label={smtpPassVisible ? 'Hide password' : 'Show password'}
                  >
                    {smtpPassVisible ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">SMTP authentication password</p>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="smtp-active" className="text-base font-medium">
                    Active
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this connection as the primary transport for sending email
                  </p>
                </div>
                <Switch
                  id="smtp-active"
                  checked={smtpForm.is_active}
                  onCheckedChange={(checked) => smtpSetField('is_active', checked)}
                />
              </div>

              {/* Backup */}
              <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="smtp-backup" className="text-base font-medium">
                    Backup Connection
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use this connection as a fallback if the primary connection fails
                  </p>
                </div>
                <Switch
                  id="smtp-backup"
                  checked={smtpForm.is_backup}
                  onCheckedChange={(checked) => smtpSetField('is_backup', checked)}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={smtpOnSave} disabled={smtpSaving} size="lg">
                  {smtpSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save SMTP Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>About SMTP Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground mb-2">TLS/SSL Security</h3>
                <p>
                  Enable Secure for encrypted connections. Use port 465 when Secure is on. When Secure is off,
                  ports 587 or 25 start unencrypted and upgrade with STARTTLS if the server supports it.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Backup Connection</h3>
                <p>
                  A fallback transport used only if the primary active connection fails. It is not load
                  balancing; mail is sent via the primary unless it fails.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Troubleshooting</h3>
                <p>
                  If sends fail with Secure on, verify the server and use port 465. If using port 587/25, turn
                  Secure off to allow STARTTLS.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>Verify your email configuration by sending a test message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* To Email */}
              <div className="space-y-2">
                <Label htmlFor="test-to" className="text-base font-medium">
                  To
                </Label>
                <Input
                  id="test-to"
                  value={testToEmail}
                  onChange={(e) => setTestToEmail(e.target.value)}
                  placeholder="user@example.com"
                />
                <p className="text-sm text-muted-foreground">Recipient email address</p>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="test-subject" className="text-base font-medium">
                  Subject
                </Label>
                <Input
                  id="test-subject"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Email subject line</p>
              </div>

              {/* Text */}
              <div className="space-y-2">
                <Label htmlFor="test-text" className="text-base font-medium">
                  Message
                </Label>
                <Input
                  id="test-text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Email message body</p>
              </div>

              {/* Send Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={onSendTest} disabled={testSending || !testToEmail} size="lg">
                  {testSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>About Test Emails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground mb-2">Testing Your Configuration</h3>
                <p>
                  Use this test form to verify that your SMTP connection and general settings are configured
                  correctly. The test email will be sent using your current configuration.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">What to Check</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Verify the email arrives in the recipient's inbox</li>
                  <li>Check that the From address matches your settings</li>
                  <li>Ensure the email is not marked as spam</li>
                  <li>Confirm that any custom headers or settings are applied</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Send via API</CardTitle>
              <CardDescription>Use the API endpoint POST /bb-mail/api/send to send emails programmatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Required fields: <span className="text-foreground font-medium">to</span>,{' '}
                <span className="text-foreground font-medium">subject</span>, and one of{' '}
                <span className="text-foreground font-medium">text</span> or{' '}
                <span className="text-foreground font-medium">html</span>.
              </div>

              {/* cURL Example */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">cURL</Label>
                  <Button variant="outline" size="sm" onClick={() => copy(curlExample)}>
                    <Copy className="mr-2 h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <pre className="rounded-lg border bg-muted p-4 text-xs overflow-auto">{curlExample}</pre>
              </div>

              {/* JavaScript Example */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">JavaScript (fetch)</Label>
                  <Button variant="outline" size="sm" onClick={() => copy(fetchExample)}>
                    <Copy className="mr-2 h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <pre className="rounded-lg border bg-muted p-4 text-xs overflow-auto">{fetchExample}</pre>
              </div>

              {/* Node.js Example */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Node.js</Label>
                  <Button variant="outline" size="sm" onClick={() => copy(nodeExample)}>
                    <Copy className="mr-2 h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <pre className="rounded-lg border bg-muted p-4 text-xs overflow-auto">{nodeExample}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>About the Mail API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground mb-2">API Endpoint</h3>
                <p>
                  Send emails programmatically by making a POST request to <code className="bg-muted px-1 py-0.5 rounded">/bb-mail/api/send</code>.
                  Authentication is required via session cookies.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Request Format</h3>
                <p>
                  The request body should be JSON with the following fields:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                  <li><code className="bg-muted px-1 py-0.5 rounded">to</code> (required): Recipient email address</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">subject</code> (required): Email subject</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">text</code> or <code className="bg-muted px-1 py-0.5 rounded">html</code> (required): Email body content</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-red-600">{errorDialogMessage}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
