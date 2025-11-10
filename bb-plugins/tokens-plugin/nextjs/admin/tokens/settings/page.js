'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TokenSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/bb-tokens/api/settings`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
      setMessage(null);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/bb-tokens/api/settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Settings className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Token Settings</h1>
          <p className="text-muted-foreground">
            Configure token limits and usage policies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Global Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Global Token Limit</CardTitle>
          <CardDescription>
            Set a maximum token limit for the entire application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="global-enabled">Enable Global Limit</Label>
            <Switch
              id="global-enabled"
              checked={settings?.global_limit_enabled === 1}
              onCheckedChange={(checked) =>
                updateSetting('global_limit_enabled', checked ? 1 : 0)
              }
            />
          </div>

          {settings?.global_limit_enabled === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="global-limit">Token Limit</Label>
                <Input
                  id="global-limit"
                  type="number"
                  value={settings?.global_token_limit || ''}
                  onChange={(e) =>
                    updateSetting('global_token_limit', parseInt(e.target.value) || 0)
                  }
                  placeholder="1000000"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum tokens allowed across all users
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="global-period">Limit Period</Label>
                <Select
                  value={settings?.global_limit_period || 'monthly'}
                  onValueChange={(value) => updateSetting('global_limit_period', value)}
                >
                  <SelectTrigger id="global-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Per-User Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Per-User Token Limit</CardTitle>
          <CardDescription>
            Set individual token limits for each user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="user-enabled">Enable Per-User Limit</Label>
            <Switch
              id="user-enabled"
              checked={settings?.per_user_limit_enabled === 1}
              onCheckedChange={(checked) =>
                updateSetting('per_user_limit_enabled', checked ? 1 : 0)
              }
            />
          </div>

          {settings?.per_user_limit_enabled === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="user-limit">Token Limit Per User</Label>
                <Input
                  id="user-limit"
                  type="number"
                  value={settings?.per_user_token_limit || ''}
                  onChange={(e) =>
                    updateSetting('per_user_token_limit', parseInt(e.target.value) || 0)
                  }
                  placeholder="50000"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum tokens per individual user
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-period">Limit Period</Label>
                <Select
                  value={settings?.per_user_limit_period || 'monthly'}
                  onValueChange={(value) => updateSetting('per_user_limit_period', value)}
                >
                  <SelectTrigger id="user-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Per-Chat Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Chat Token Limit</CardTitle>
          <CardDescription>
            Set token limits for individual chat sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="chat-enabled">Enable Per-Chat Limit</Label>
            <Switch
              id="chat-enabled"
              checked={settings?.per_chat_limit_enabled === 1}
              onCheckedChange={(checked) =>
                updateSetting('per_chat_limit_enabled', checked ? 1 : 0)
              }
            />
          </div>

          {settings?.per_chat_limit_enabled === 1 && (
            <div className="space-y-2">
              <Label htmlFor="chat-limit">Token Limit Per Chat</Label>
              <Input
                id="chat-limit"
                type="number"
                value={settings?.per_chat_token_limit || ''}
                onChange={(e) =>
                  updateSetting('per_chat_token_limit', parseInt(e.target.value) || 0)
                }
                placeholder="10000"
              />
              <p className="text-sm text-muted-foreground">
                Maximum tokens per chat session (no time period)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
          <CardDescription>
            Control request frequency to prevent abuse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="rate-enabled">Enable Rate Limiting</Label>
            <Switch
              id="rate-enabled"
              checked={settings?.rate_limit_enabled === 1}
              onCheckedChange={(checked) =>
                updateSetting('rate_limit_enabled', checked ? 1 : 0)
              }
            />
          </div>

          {settings?.rate_limit_enabled === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rate-requests">Max Requests</Label>
                <Input
                  id="rate-requests"
                  type="number"
                  value={settings?.rate_limit_requests || ''}
                  onChange={(e) =>
                    updateSetting('rate_limit_requests', parseInt(e.target.value) || 0)
                  }
                  placeholder="100"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of requests allowed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate-window">Time Window (seconds)</Label>
                <Input
                  id="rate-window"
                  type="number"
                  value={settings?.rate_limit_window || ''}
                  onChange={(e) =>
                    updateSetting('rate_limit_window', parseInt(e.target.value) || 0)
                  }
                  placeholder="60"
                />
                <p className="text-sm text-muted-foreground">
                  Time period for rate limit window
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Configure alerts when limits are approaching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-enabled">Enable Notifications</Label>
            <Switch
              id="notify-enabled"
              checked={settings?.notify_on_limit_reached === 1}
              onCheckedChange={(checked) =>
                updateSetting('notify_on_limit_reached', checked ? 1 : 0)
              }
            />
          </div>

          {settings?.notify_on_limit_reached === 1 && (
            <div className="space-y-2">
              <Label htmlFor="notify-threshold">Warning Threshold (%)</Label>
              <Input
                id="notify-threshold"
                type="number"
                min="1"
                max="100"
                value={settings?.notify_threshold || ''}
                onChange={(e) =>
                  updateSetting('notify_threshold', parseInt(e.target.value) || 90)
                }
                placeholder="90"
              />
              <p className="text-sm text-muted-foreground">
                Send notification when usage reaches this percentage
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Tracking</CardTitle>
          <CardDescription>
            Track estimated costs for token usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="cost-enabled">Enable Cost Tracking</Label>
            <Switch
              id="cost-enabled"
              checked={settings?.track_costs === 1}
              onCheckedChange={(checked) =>
                updateSetting('track_costs', checked ? 1 : 0)
              }
            />
          </div>

          {settings?.track_costs === 1 && (
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={settings?.currency || 'USD'}
                onValueChange={(value) => updateSetting('currency', value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
