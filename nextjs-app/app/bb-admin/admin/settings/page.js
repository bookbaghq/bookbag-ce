'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import api from '@/apiConfig.json';

const BASE_URL = api.ApiConfig.main;

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    is_rag_active: true,
    is_mail_active: true,
    is_user_active: true,
    is_workspace_active: true,
    is_media_active: true
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
          is_rag_active: data.settings.is_rag_active !== false,
          is_mail_active: data.settings.is_mail_active !== false,
          is_user_active: data.settings.is_user_active !== false,
          is_workspace_active: data.settings.is_workspace_active !== false,
          is_media_active: data.settings.is_media_active !== false
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
        <h1 className="text-3xl font-bold mb-2">System Settings</h1>
        <p className="text-muted-foreground">
          Configure which features and modules are enabled across the application
        </p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
          <CardDescription>
            Enable or disable system features and modules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* RAG Toggle */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="is_rag_active" className="text-base font-medium">
                RAG (Retrieval-Augmented Generation)
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable RAG functionality for document uploads, knowledge bases, and context-aware AI responses.
                When disabled, all document processing and retrieval features will be unavailable.
              </p>
            </div>
            <Switch
              id="is_rag_active"
              checked={settings.is_rag_active}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_rag_active: checked })
              }
            />
          </div>

          {/* Mail Toggle */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="is_mail_active" className="text-base font-medium">
                Email System
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable email functionality for notifications, password resets, and system communications.
                When disabled, no emails will be sent from the system.
              </p>
            </div>
            <Switch
              id="is_mail_active"
              checked={settings.is_mail_active}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_mail_active: checked })
              }
            />
          </div>

          {/* User Management Toggle */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="is_user_active" className="text-base font-medium">
                User Management
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable user management features including user creation, profile editing, and role management.
                Core authentication functionality remains active regardless of this setting.
              </p>
            </div>
            <Switch
              id="is_user_active"
              checked={settings.is_user_active}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_user_active: checked })
              }
            />
          </div>

          {/* Workspace Toggle */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="is_workspace_active" className="text-base font-medium">
                Workspaces
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable workspace functionality for team collaboration and shared resources.
                When disabled, users can only access their personal chats and documents.
              </p>
            </div>
            <Switch
              id="is_workspace_active"
              checked={settings.is_workspace_active}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_workspace_active: checked })
              }
            />
          </div>

          {/* Media Toggle */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="is_media_active" className="text-base font-medium">
                Media Library
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable media upload and management functionality including images, files, and attachments.
                When disabled, users cannot upload or manage media files.
              </p>
            </div>
            <Switch
              id="is_media_active"
              checked={settings.is_media_active}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_media_active: checked })
              }
            />
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
          <CardTitle>About System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">Feature Management</h3>
            <p>
              These settings allow you to enable or disable major system features and modules.
              Disabling a feature will hide related UI elements and prevent access to associated functionality.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Impact of Changes</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Changes take effect immediately after saving</li>
              <li>Disabled features remain in the database but are not accessible</li>
              <li>Re-enabling features restores full functionality</li>
              <li>Some core system features cannot be disabled for security reasons</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Best Practices</h3>
            <p>
              Only disable features that you do not need for your use case. Disabling features can help
              simplify the user interface and reduce system complexity. However, ensure that disabling
              a feature won&apos;t break workflows that depend on it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
