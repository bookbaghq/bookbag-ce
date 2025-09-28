"use client";

import { useState, useEffect } from "react";
import Swal from 'sweetalert2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import api from '@/apiConfig.json'

export default function SettingsPage() {
  // State for settings
  const [settings, setSettings] = useState({
    sign_up_enabled: true,
    sign_in_enabled: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${api.ApiConfig.main}/${api.ApiConfig.settings.get.url}`, { credentials: 'include' });
        const data = await res.json();
        if (data?.success && data.settings) {
          setSettings({
            sign_up_enabled: !!data.settings.sign_up_enabled,
            sign_in_enabled: !!data.settings.sign_in_enabled,
          });
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load settings. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Handle toggle changes
  const handleToggleChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  // Save settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${api.ApiConfig.main}/${api.ApiConfig.settings.save.url}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Failed to save');
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Settings saved successfully'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">User Settings</h1>
        <p className="text-muted-foreground">
          Configure global settings for user registration and authentication.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading settings...</div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Sign-in Restrictions</CardTitle>
              <CardDescription>
                Control sign-up and sign-in availability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sign-up-enabled">Sign-up enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, new users can register for an account.
                  </p>
                </div>
                <Switch
                  id="sign-up-enabled"
                  checked={settings.sign_up_enabled}
                  onCheckedChange={() => handleToggleChange('sign_up_enabled')}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sign-in-enabled">Sign-in enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, visitors are auto-signed-in as a temporary user.
                  </p>
                </div>
                <Switch
                  id="sign-in-enabled"
                  checked={settings.sign_in_enabled}
                  onCheckedChange={() => handleToggleChange('sign_in_enabled')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Security Settings</CardTitle>
              <CardDescription>
                Configure advanced security options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enforce-password-change">Enforce Password Change</Label>
                  <p className="text-sm text-muted-foreground">
                    Require users to change their password after a certain number of days.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Coming soon
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor-auth">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require two-factor authentication for all users.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Coming soon
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              className="text-white" style={{ backgroundColor: "var(--chart-2)" }}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
