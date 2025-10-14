'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import api from '@/apiConfig.json';
import { getBackendBaseUrl } from '@/lib/backendUrl';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    sign_up_enabled: true,
    sign_in_enabled: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const BASE = getBackendBaseUrl();
      const response = await fetch(`${BASE}/${api.ApiConfig.settings.get.url}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings({
          sign_up_enabled: !!data.settings.sign_up_enabled,
          sign_in_enabled: !!data.settings.sign_in_enabled
        });
      } else {
        toast.error(data.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const BASE = getBackendBaseUrl();
      const response = await fetch(`${BASE}/${api.ApiConfig.settings.save.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-3xl font-bold mb-2">User Settings</h1>
        <p className="text-muted-foreground">
          Configure global settings for user registration and authentication
        </p>
      </div>

      {/* Authentication Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Settings</CardTitle>
          <CardDescription>
            Control sign-up and sign-in availability for users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sign-up Enabled */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="sign-up-enabled" className="text-base font-medium">
                Enable Sign-up
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, new users can register for an account. When disabled,
                the sign-up form will be hidden and registration will be blocked.
              </p>
            </div>
            <Switch
              id="sign-up-enabled"
              checked={settings.sign_up_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, sign_up_enabled: checked })
              }
            />
          </div>

          {/* Sign-in Enabled */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="sign-in-enabled" className="text-base font-medium">
                Enable Sign-in
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, users must sign in with their credentials. When disabled,
                visitors are automatically signed in as a temporary user.
              </p>
            </div>
            <Switch
              id="sign-in-enabled"
              checked={settings.sign_in_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, sign_in_enabled: checked })
              }
            />
          </div>

          {/* Info Message */}
          {!settings.sign_in_enabled && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Sign-in is currently disabled.
                All visitors will be automatically signed in as temporary users.
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
            >
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

      {/* Additional Security Settings Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Additional Security Settings</CardTitle>
          <CardDescription>
            Configure advanced security options (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enforce Password Change */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg opacity-50">
            <div className="space-y-0.5 flex-1">
              <Label className="text-base font-medium">
                Enforce Password Change
              </Label>
              <p className="text-sm text-muted-foreground">
                Require users to change their password after a certain number of days.
              </p>
            </div>
            <div className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-md">
              Coming Soon
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg opacity-50">
            <div className="space-y-0.5 flex-1">
              <Label className="text-base font-medium">
                Two-Factor Authentication
              </Label>
              <p className="text-sm text-muted-foreground">
                Require two-factor authentication for all users.
              </p>
            </div>
            <div className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-md">
              Coming Soon
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About User Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About User Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">Authentication Control</h3>
            <p>
              These settings control how users access your application. You can enable or disable
              sign-up to control new registrations, and enable or disable sign-in to control
              authentication requirements.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Settings Explanation</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Enable Sign-up:</strong> Controls whether new users can register for accounts
              </li>
              <li>
                <strong>Enable Sign-in:</strong> Controls whether users must authenticate or auto-login as temporary users
              </li>
              <li>
                <strong>Coming Soon Features:</strong> Password policies and two-factor authentication will be available in future updates
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Impact</h3>
            <p>
              When sign-up is disabled, the registration form will be hidden and new user
              registrations will be blocked. When sign-in is disabled, all visitors will
              automatically be signed in as temporary users without requiring authentication.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
