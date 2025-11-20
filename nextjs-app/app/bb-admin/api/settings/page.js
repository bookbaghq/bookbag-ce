"use client";

import { useState, useEffect, useMemo } from "react";
import ApiKeyService from "@/services/apiKeyService";
import Swal from "sweetalert2";
import Link from "next/link";
import { Settings, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ApiSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const apiKeyService = useMemo(() => new ApiKeyService(), []);

  // Form state
  const [formData, setFormData] = useState({
    global_rate_limit_enabled: true,
    global_rate_limit_requests: "1000",
    global_rate_limit_window: "3600",
    default_session_limit: "",
    default_max_messages_per_session: "100",
    session_expiration_hours: "24",
    api_key_prefix: "bb_",
    api_key_length: "32",
    log_requests: true,
    log_responses: false,
    require_https: false,
    allowed_origins: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiKeyService.getSettings();
      if (res.success && res.settings) {
        const settings = res.settings;
        setFormData({
          global_rate_limit_enabled: settings.global_rate_limit_enabled ?? true,
          global_rate_limit_requests: String(settings.global_rate_limit_requests ?? 1000),
          global_rate_limit_window: String(settings.global_rate_limit_window ?? 3600),
          default_session_limit: settings.default_session_limit ? String(settings.default_session_limit) : "",
          default_max_messages_per_session: String(settings.default_max_messages_per_session ?? 100),
          session_expiration_hours: String(settings.session_expiration_hours ?? 24),
          api_key_prefix: settings.api_key_prefix ?? "bb_",
          api_key_length: String(settings.api_key_length ?? 32),
          log_requests: settings.log_requests ?? true,
          log_responses: settings.log_responses ?? false,
          require_https: settings.require_https ?? false,
          allowed_origins: settings.allowed_origins ?? ""
        });
      }
    } catch (error) {
      Swal.fire("Error", "Failed to fetch settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, checked) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const validateForm = () => {
    if (formData.global_rate_limit_enabled) {
      const requests = parseInt(formData.global_rate_limit_requests);
      if (isNaN(requests) || requests <= 0) {
        Swal.fire("Validation Error", "Global rate limit requests must be a positive number", "warning");
        return false;
      }

      const window = parseInt(formData.global_rate_limit_window);
      if (isNaN(window) || window <= 0) {
        Swal.fire("Validation Error", "Global rate limit window must be a positive number", "warning");
        return false;
      }
    }

    const maxMessages = parseInt(formData.default_max_messages_per_session);
    if (isNaN(maxMessages) || maxMessages <= 0) {
      Swal.fire("Validation Error", "Default max messages per session must be a positive number", "warning");
      return false;
    }

    const expirationHours = parseInt(formData.session_expiration_hours);
    if (isNaN(expirationHours) || expirationHours <= 0) {
      Swal.fire("Validation Error", "Session expiration hours must be a positive number", "warning");
      return false;
    }

    if (!formData.api_key_prefix.trim()) {
      Swal.fire("Validation Error", "API key prefix is required", "warning");
      return false;
    }

    const keyLength = parseInt(formData.api_key_length);
    if (isNaN(keyLength) || keyLength < 16 || keyLength > 128) {
      Swal.fire("Validation Error", "API key length must be between 16 and 128", "warning");
      return false;
    }

    if (formData.default_session_limit) {
      const sessionLimit = parseInt(formData.default_session_limit);
      if (isNaN(sessionLimit) || sessionLimit <= 0) {
        Swal.fire("Validation Error", "Default session limit must be a positive number or empty", "warning");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const submitData = {
        global_rate_limit_enabled: formData.global_rate_limit_enabled,
        global_rate_limit_requests: parseInt(formData.global_rate_limit_requests),
        global_rate_limit_window: parseInt(formData.global_rate_limit_window),
        default_session_limit: formData.default_session_limit ? parseInt(formData.default_session_limit) : null,
        default_max_messages_per_session: parseInt(formData.default_max_messages_per_session),
        session_expiration_hours: parseInt(formData.session_expiration_hours),
        api_key_prefix: formData.api_key_prefix.trim(),
        api_key_length: parseInt(formData.api_key_length),
        log_requests: formData.log_requests,
        log_responses: formData.log_responses,
        require_https: formData.require_https,
        allowed_origins: formData.allowed_origins.trim() || null
      };

      const res = await apiKeyService.updateSettings(submitData);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Settings Saved!",
          text: "API settings have been updated successfully.",
          timer: 2000,
          showConfirmButton: false
        });
        fetchSettings();
      } else {
        Swal.fire("Error", res.error || "Failed to save settings", "error");
      }
    } catch (error) {
      Swal.fire("Error", "An unexpected error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-6 w-full max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            API Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure global API settings and defaults
          </p>
        </div>
        <Link href="/bb-admin/api">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to API Management
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Global Rate Limiting */}
          <Card>
            <CardHeader>
              <CardTitle>Global Rate Limiting</CardTitle>
              <CardDescription>
                Apply rate limits across all API keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="global_rate_limit_enabled"
                  checked={formData.global_rate_limit_enabled}
                  onChange={(e) => handleCheckboxChange("global_rate_limit_enabled", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="global_rate_limit_enabled" className="cursor-pointer">
                  Enable Global Rate Limiting
                </Label>
              </div>

              {formData.global_rate_limit_enabled && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="global_rate_limit_requests">
                      Global Requests Limit <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="global_rate_limit_requests"
                      type="number"
                      min="1"
                      placeholder="1000"
                      value={formData.global_rate_limit_requests}
                      onChange={(e) => handleInputChange("global_rate_limit_requests", e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum requests across all API keys
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="global_rate_limit_window">
                      Window (seconds) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="global_rate_limit_window"
                      type="number"
                      min="1"
                      placeholder="3600"
                      value={formData.global_rate_limit_window}
                      onChange={(e) => handleInputChange("global_rate_limit_window", e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Time window in seconds
                    </p>
                  </div>
                </div>
              )}

              {formData.global_rate_limit_enabled && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  Global limit: <strong>{formData.global_rate_limit_requests} requests per {formData.global_rate_limit_window} seconds</strong>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Default Session Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Default Session Settings</CardTitle>
              <CardDescription>
                Default values for new API keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_max_messages_per_session">
                    Default Max Messages <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="default_max_messages_per_session"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={formData.default_max_messages_per_session}
                    onChange={(e) => handleInputChange("default_max_messages_per_session", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Default max messages per session
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_session_limit">Default Session Limit</Label>
                  <Input
                    id="default_session_limit"
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    value={formData.default_session_limit}
                    onChange={(e) => handleInputChange("default_session_limit", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default concurrent sessions (optional)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_expiration_hours">
                  Session Expiration (hours) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="session_expiration_hours"
                  type="number"
                  min="1"
                  placeholder="24"
                  value={formData.session_expiration_hours}
                  onChange={(e) => handleInputChange("session_expiration_hours", e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Hours until inactive sessions expire
                </p>
              </div>
            </CardContent>
          </Card>

          {/* API Key Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>API Key Configuration</CardTitle>
              <CardDescription>
                Settings for API key generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api_key_prefix">
                    API Key Prefix <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="api_key_prefix"
                    placeholder="bb_"
                    value={formData.api_key_prefix}
                    onChange={(e) => handleInputChange("api_key_prefix", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Prefix for all generated API keys
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key_length">
                    API Key Length <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="api_key_length"
                    type="number"
                    min="16"
                    max="128"
                    placeholder="32"
                    value={formData.api_key_length}
                    onChange={(e) => handleInputChange("api_key_length", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Length of random key (16-128)
                  </p>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md text-sm">
                Example API key: <code className="font-mono">{formData.api_key_prefix}{"x".repeat(parseInt(formData.api_key_length) || 32)}</code>
              </div>
            </CardContent>
          </Card>

          {/* Logging Options */}
          <Card>
            <CardHeader>
              <CardTitle>Logging Options</CardTitle>
              <CardDescription>
                Control what gets logged for API requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="log_requests"
                  checked={formData.log_requests}
                  onChange={(e) => handleCheckboxChange("log_requests", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="log_requests" className="cursor-pointer">
                  Log API Requests
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="log_responses"
                  checked={formData.log_responses}
                  onChange={(e) => handleCheckboxChange("log_responses", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="log_responses" className="cursor-pointer">
                  Log API Responses
                </Label>
              </div>

              <p className="text-xs text-muted-foreground">
                Note: Logging responses may impact performance and increase storage requirements
              </p>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Security and access control options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="require_https"
                  checked={formData.require_https}
                  onChange={(e) => handleCheckboxChange("require_https", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="require_https" className="cursor-pointer">
                  Require HTTPS for API Requests
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowed_origins">Allowed Origins (CORS)</Label>
                <Textarea
                  id="allowed_origins"
                  placeholder="https://example.com, https://app.example.com (leave empty for all origins)"
                  value={formData.allowed_origins}
                  onChange={(e) => handleInputChange("allowed_origins", e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of allowed origins for CORS. Leave empty to allow all origins.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/bb-admin/api">
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={saving}
              className="text-white"
              style={{ backgroundColor: "var(--chart-2)" }}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
