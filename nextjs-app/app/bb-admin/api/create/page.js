"use client";

import { useState, useEffect, useMemo } from "react";
import ApiKeyService from "@/services/apiKeyService";
import Swal from "sweetalert2";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Key, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function CreateApiKeyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const apiKeyService = useMemo(() => new ApiKeyService(), []);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    model_id: "",
    model_name: "",
    rate_limit_requests: "100",
    rate_limit_window: "60",
    session_limit: "",
    max_messages_per_session: "50"
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoadingModels(true);
      const res = await apiKeyService.getModels();
      if (res.success && res.models) {
        setModels(res.models);
      }
    } catch (error) {
      Swal.fire("Error", "Failed to fetch models", "error");
    } finally {
      setLoadingModels(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModelChange = (modelId) => {
    const selectedModel = models.find(m => m.id.toString() === modelId);
    setFormData(prev => ({
      ...prev,
      model_id: modelId,
      model_name: selectedModel ? selectedModel.name : ""
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Swal.fire("Validation Error", "API Key name is required", "warning");
      return false;
    }

    if (!formData.model_id) {
      Swal.fire("Validation Error", "Please select a model", "warning");
      return false;
    }

    const rateLimitRequests = parseInt(formData.rate_limit_requests);
    if (isNaN(rateLimitRequests) || rateLimitRequests <= 0) {
      Swal.fire("Validation Error", "Rate limit requests must be a positive number", "warning");
      return false;
    }

    const rateLimitWindow = parseInt(formData.rate_limit_window);
    if (isNaN(rateLimitWindow) || rateLimitWindow <= 0) {
      Swal.fire("Validation Error", "Rate limit window must be a positive number", "warning");
      return false;
    }

    const maxMessages = parseInt(formData.max_messages_per_session);
    if (isNaN(maxMessages) || maxMessages <= 0) {
      Swal.fire("Validation Error", "Max messages per session must be a positive number", "warning");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare data for submission
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        model_id: parseInt(formData.model_id),
        model_name: formData.model_name,
        rate_limit_requests: parseInt(formData.rate_limit_requests),
        rate_limit_window: parseInt(formData.rate_limit_window),
        session_limit: formData.session_limit ? parseInt(formData.session_limit) : null,
        max_messages_per_session: parseInt(formData.max_messages_per_session)
      };

      const res = await apiKeyService.create(submitData);

      if (res.success && res.data) {
        // Show success with the generated API key
        const apiKey = res.data.api_key;

        await Swal.fire({
          icon: "success",
          title: "API Key Created Successfully!",
          html: `
            <div class="text-left space-y-4">
              <p class="font-semibold">Your API Key:</p>
              <div class="bg-gray-100 p-3 rounded border">
                <code class="text-sm break-all">${apiKey}</code>
              </div>
              <p class="text-red-600 font-semibold">⚠️ Important: Copy this key now!</p>
              <p class="text-sm text-gray-600">For security reasons, this is the only time you'll see the full key. If you lose it, you'll need to regenerate a new one.</p>
            </div>
          `,
          confirmButtonText: "I've Copied It",
          allowOutsideClick: false,
          customClass: {
            popup: 'w-full max-w-2xl'
          }
        });

        // Navigate to the API keys list
        router.push("/bb-admin/api/keys");
      } else {
        Swal.fire("Error", res.error || "Failed to create API key", "error");
      }
    } catch (error) {
      Swal.fire("Error", "An unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Key className="h-6 w-6" />
            Create API Key
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a new API key for external applications
          </p>
        </div>
        <Link href="/bb-admin/api/keys">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>API Key Configuration</CardTitle>
            <CardDescription>
              Configure the settings for your new API key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API Key"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name to help you identify this API key
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description of what this API key is used for..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Model Configuration</h3>

              <div className="space-y-2">
                <Label htmlFor="model">
                  Model <span className="text-red-500">*</span>
                </Label>
                {loadingModels ? (
                  <div className="text-sm text-muted-foreground">Loading models...</div>
                ) : (
                  <Select
                    value={formData.model_id}
                    onValueChange={handleModelChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          {model.name || model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  The LLM model that this API key will use for generating responses
                </p>
              </div>
            </div>

            {/* Rate Limiting */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Rate Limiting</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_limit_requests">
                    Requests Limit <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rate_limit_requests"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={formData.rate_limit_requests}
                    onChange={(e) => handleInputChange("rate_limit_requests", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of requests allowed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_limit_window">
                    Window (seconds) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rate_limit_window"
                    type="number"
                    min="1"
                    placeholder="60"
                    value={formData.rate_limit_window}
                    onChange={(e) => handleInputChange("rate_limit_window", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Time window in seconds
                  </p>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md text-sm">
                Current rate limit: <strong>{formData.rate_limit_requests} requests per {formData.rate_limit_window} seconds</strong>
              </div>
            </div>

            {/* Session Configuration */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Session Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_messages_per_session">
                    Max Messages per Session <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="max_messages_per_session"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={formData.max_messages_per_session}
                    onChange={(e) => handleInputChange("max_messages_per_session", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum messages allowed per session
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session_limit">Session Limit (Optional)</Label>
                  <Input
                    id="session_limit"
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    value={formData.session_limit}
                    onChange={(e) => handleInputChange("session_limit", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum concurrent sessions (optional)
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/bb-admin/api/keys">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading || loadingModels}
                className="text-white"
                style={{ backgroundColor: "var(--chart-2)" }}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Creating..." : "Create API Key"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
