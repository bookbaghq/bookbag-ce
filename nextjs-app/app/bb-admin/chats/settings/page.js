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

export default function ChatSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    disableChatCreation: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/bb-chat/api/chat/settings`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setSettings({
          disableChatCreation: data.settings.disableChatCreation || false
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
      const response = await fetch(`${BASE_URL}/bb-chat/api/chat/settings`, {
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
        <h1 className="text-3xl font-bold mb-2">Chat Settings</h1>
        <p className="text-muted-foreground">
          Configure chat system settings and restrictions
        </p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Chat Creation Settings</CardTitle>
          <CardDescription>
            Control how and where users can create new chats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Disable Chat Creation */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="disableChatCreation" className="text-base font-medium">
                Disable Chat Creation
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, users can only create chats within workspaces. The &quot;New Chat&quot;
                button in the client will be hidden, and direct chat creation will be disabled.
                Users must join a workspace to create chats.
              </p>
            </div>
            <Switch
              id="disableChatCreation"
              checked={settings.disableChatCreation}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, disableChatCreation: checked })
              }
            />
          </div>

          {/* Info Message */}
          {settings.disableChatCreation && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Workspace-only mode is currently enabled.
                Users will not be able to create chats outside of workspaces. The &quot;New Chat&quot;
                button will be hidden from the client interface.
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

      {/* Additional Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Chat Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">Workspace-Only Mode</h3>
            <p>
              This setting is useful for organizations that want to enforce collaboration through
              workspaces. When enabled:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Users cannot create standalone chats</li>
              <li>All chats must be created within a workspace context</li>
              <li>The &quot;New Chat&quot; button is hidden from the client interface</li>
              <li>Users must be members of at least one workspace to chat</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Impact on Existing Chats</h3>
            <p>
              Existing standalone chats (created before enabling this setting) will continue to
              work normally. This setting only affects the creation of new chats. Users can still
              access and use their existing non-workspace chats.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Workspace Management</h3>
            <p>
              Administrators should ensure users have access to appropriate workspaces before
              enabling this setting. You can manage workspaces in the Workspaces admin section.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
