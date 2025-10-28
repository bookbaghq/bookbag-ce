'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Image, Mail, Users, User, Loader2 } from 'lucide-react';

const iconMap = {
  Database: Database,
  Image: Image,
  Mail: Mail,
  Users: Users,
  User: User
};

export default function ManagePluginsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const backendUrl = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const response = await fetch(`${backendUrl}/api/settings/list`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings || []);
      } else {
        showMessage('Failed to load settings', 'error');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showMessage('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (settingName) => {
    setToggling(settingName);

    try {
      const backendUrl = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const response = await fetch(`${backendUrl}/api/settings/${settingName}/toggle`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setSettings(prev =>
          prev.map(s =>
            s.name === settingName ? { ...s, is_active: data.setting.is_active } : s
          )
        );
        showMessage(data.message, 'success');
      } else {
        showMessage(data.error || 'Failed to toggle setting', 'error');
      }
    } catch (error) {
      console.error('Error toggling setting:', error);
      showMessage('Error updating setting', 'error');
    } finally {
      setToggling(null);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Manage Plugins</h1>
        <p className="text-muted-foreground">
          Enable or disable plugins to customize your BookBag experience
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {settings.map((setting) => {
          const IconComponent = iconMap[setting.icon] || Database;
          const isToggling = toggling === setting.name;

          return (
            <Card key={setting.name} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${setting.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <IconComponent className={`w-5 h-5 ${setting.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{setting.label}</CardTitle>
                      <CardDescription className="mt-1">
                        {setting.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                      {setting.is_active ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <div className="relative">
                      {isToggling && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary absolute -left-6 top-1" />
                      )}
                      <Switch
                        checked={setting.is_active}
                        onCheckedChange={() => handleToggle(setting.name)}
                        disabled={isToggling}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              {setting.category && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Category:</span>
                    <Badge variant="outline" className="text-xs">
                      {setting.category}
                    </Badge>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {settings.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No plugins found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
