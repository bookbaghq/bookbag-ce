'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import api from '@/apiConfig.json';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || api.ApiConfig.main;

export default function RagSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    disableRag: false,
    disableRagChat: false,
    disableRagWorkspace: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/bb-rag/api/rag/settings`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setSettings({
          disableRag: data.settings.disableRag || false,
          disableRagChat: data.settings.disableRagChat || false,
          disableRagWorkspace: data.settings.disableRagWorkspace || false
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
      const response = await fetch(`${BASE_URL}/bb-rag/api/rag/settings`, {
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
        <h1 className="text-3xl font-bold mb-2">RAG Settings</h1>
        <p className="text-muted-foreground">
          Configure Retrieval-Augmented Generation (RAG) system settings
        </p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>RAG Features</CardTitle>
          <CardDescription>
            Control RAG functionality across different areas of the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Disable RAG Globally */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="disableRag" className="text-base font-medium">
                Disable RAG System
              </Label>
              <p className="text-sm text-muted-foreground">
                Completely disable all RAG functionality throughout the application.
                When enabled, no document uploads, queries, or retrieval operations will work.
              </p>
            </div>
            <Switch
              id="disableRag"
              checked={settings.disableRag}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, disableRag: checked })
              }
            />
          </div>

          {/* Disable RAG Chat */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="disableRagChat" className="text-base font-medium">
                Disable RAG for Chats
              </Label>
              <p className="text-sm text-muted-foreground">
                Prevent users from uploading documents or using RAG features in individual chats.
                Chat-level document uploads and knowledge base queries will be disabled.
              </p>
            </div>
            <Switch
              id="disableRagChat"
              checked={settings.disableRagChat}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, disableRagChat: checked })
              }
              disabled={settings.disableRag}
            />
          </div>

          {/* Disable RAG Workspace */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="disableRagWorkspace" className="text-base font-medium">
                Disable RAG for Workspaces
              </Label>
              <p className="text-sm text-muted-foreground">
                Prevent workspace-level RAG functionality. Users won&apos;t be able to upload
                shared documents at the workspace level or use workspace knowledge bases.
              </p>
            </div>
            <Switch
              id="disableRagWorkspace"
              checked={settings.disableRagWorkspace}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, disableRagWorkspace: checked })
              }
              disabled={settings.disableRag}
            />
          </div>

          {/* Info Message */}
          {settings.disableRag && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> RAG is currently disabled globally.
                All document upload and retrieval features are inactive.
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
          <CardTitle>About RAG Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">What is RAG?</h3>
            <p>
              Retrieval-Augmented Generation (RAG) allows the system to use uploaded documents
              as context when generating responses. Users can upload PDFs, text files, and other
              documents to create custom knowledge bases.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Settings Explanation</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Disable RAG System:</strong> Master switch that disables all RAG features
              </li>
              <li>
                <strong>Disable RAG for Chats:</strong> Only affects individual chat-level RAG
              </li>
              <li>
                <strong>Disable RAG for Workspaces:</strong> Only affects workspace-level shared RAG
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">Impact</h3>
            <p>
              When RAG features are disabled, existing documents and embeddings remain in the system
              but cannot be queried or used. Uploads will be blocked. Re-enabling these settings
              will restore full functionality.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
