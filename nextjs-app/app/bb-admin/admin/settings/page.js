'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import api from '@/apiConfig.json';

const BASE_URL = api.ApiConfig.main;

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    disable_client_side: false,
    plugin_upload_max_file_size: 104857600 // Default 100MB in bytes
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/admin/settings`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setSettings({
          disable_client_side: data.settings.disable_client_side || false,
          plugin_upload_max_file_size: data.settings.plugin_upload_max_file_size || 104857600
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
      const response = await fetch(`${BASE_URL}/api/admin/settings`, {
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
        <h1 className="text-3xl font-bold mb-2">Client Access Settings</h1>
        <p className="text-muted-foreground">
          Configure client-side access and availability
        </p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Access Control</CardTitle>
          <CardDescription>
            Control access to the client-side interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Disable Client Side Toggle */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="disable_client_side" className="text-base font-medium">
                Disable Client-Side Access
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, users will not be able to access the client-side interface.
                All requests to the bb-client page will be redirected to the login page.
              </p>
            </div>
            <Switch
              id="disable_client_side"
              checked={settings.disable_client_side}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, disable_client_side: checked })
              }
            />
          </div>

          {/* Warning Message */}
          {settings.disable_client_side && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Warning:</strong> Client-side access is currently disabled.
                Users will be redirected to the login page when attempting to access the client interface.
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

      {/* Plugin Upload Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Plugin Upload Settings</CardTitle>
          <CardDescription>
            Configure maximum file size for plugin uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max File Size Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plugin_upload_max_file_size" className="text-base font-medium">
                Maximum Plugin Upload Size (MB)
              </Label>
              <p className="text-sm text-muted-foreground">
                Set the maximum file size allowed for plugin ZIP uploads. This limit helps control server resources and upload times.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Input
                id="plugin_upload_max_file_size"
                type="number"
                min="1"
                max="1000"
                value={Math.round(settings.plugin_upload_max_file_size / 1048576)}
                onChange={(e) => {
                  const mb = parseInt(e.target.value) || 100;
                  const bytes = mb * 1048576;
                  setSettings({ ...settings, plugin_upload_max_file_size: bytes });
                }}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">MB</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> The current limit is set to {Math.round(settings.plugin_upload_max_file_size / 1048576)} MB ({(settings.plugin_upload_max_file_size / 1048576).toFixed(2)} MB).
                This matches WordPress-style plugin management where administrators can control upload limits similar to PHP&apos;s upload_max_filesize setting.
              </p>
            </div>
          </div>

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

      {/* Additional Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Client Access Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">Client-Side Access</h3>
            <p>
              This setting allows you to completely disable access to the client-side interface.
              When enabled, all users attempting to access the bb-client page will be redirected
              to the login page. This is useful for maintenance periods or when you want to
              temporarily restrict client access.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Impact of Changes</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Changes take effect immediately after saving</li>
              <li>Admin access remains unaffected</li>
              <li>Users will be redirected to login when accessing bb-client</li>
              <li>Re-enabling access restores full client functionality</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Best Practices</h3>
            <p>
              Use this setting carefully as it will prevent all users from accessing the client interface.
              Make sure to communicate with your users before enabling this setting to avoid confusion.
              This setting is ideal for scheduled maintenance or system updates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
