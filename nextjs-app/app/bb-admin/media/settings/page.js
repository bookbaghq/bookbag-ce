'use client';

import { useState, useEffect } from 'react';
import { Save, HardDrive, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/apiConfig.json';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || api.ApiConfig.main;

export default function MediaSettingsPage() {
  const [settings, setSettings] = useState({
    storageLimitMB: 1024,
    storageEnabled: true
  });
  const [storageUsage, setStorageUsage] = useState({
    mb: 0,
    quota: 1024,
    percentUsed: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchStorageUsage();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/bb-media/api/media/settings`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageUsage = async () => {
    try {
      const response = await fetch(`${BASE_URL}/bb-media/api/media/storage`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setStorageUsage({
          mb: data.mb || 0,
          quota: data.quota || 1024,
          percentUsed: data.percentUsed || 0
        });
      }
    } catch (error) {
      console.error('Error fetching storage usage:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`${BASE_URL}/bb-media/api/media/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Settings saved successfully!');
        await fetchStorageUsage();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Media Settings</h1>
        <p className="text-muted-foreground">
          Configure storage limits and media management settings
        </p>
      </div>

      {/* Storage Usage Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Current Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used: {storageUsage.mb.toFixed(2)} MB</span>
              <span>Limit: {storageUsage.quota} MB</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  storageUsage.percentUsed > 90 ? 'bg-red-600' :
                  storageUsage.percentUsed > 75 ? 'bg-yellow-600' :
                  'bg-blue-600'
                }`}
                style={{ width: `${Math.min(storageUsage.percentUsed, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {storageUsage.percentUsed.toFixed(1)}% of storage used
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Storage Settings
          </CardTitle>
          <CardDescription>
            Configure storage limits and enable/disable media uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Storage Limit */}
          <div className="space-y-2">
            <Label htmlFor="storageLimit">Storage Limit (MB)</Label>
            <Input
              id="storageLimit"
              type="number"
              min="1"
              value={settings.storageLimitMB}
              onChange={(e) => setSettings({ ...settings, storageLimitMB: parseInt(e.target.value, 10) })}
              placeholder="1024"
            />
            <p className="text-xs text-muted-foreground">
              Maximum storage space allowed for media files. Uploads will be rejected once this limit is reached.
            </p>
          </div>

          {/* Storage Enabled */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="storageEnabled">Enable Storage</Label>
              <p className="text-xs text-muted-foreground">
                Allow file uploads through the media API
              </p>
            </div>
            <Switch
              id="storageEnabled"
              checked={settings.storageEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, storageEnabled: checked })}
            />
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          {/* Message */}
          {message && (
            <div className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
