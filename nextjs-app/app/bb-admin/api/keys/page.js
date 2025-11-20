"use client";

import { useState, useEffect, useMemo } from "react";
import ApiKeyService from "@/services/apiKeyService";
import Swal from "sweetalert2";
import Link from "next/link";
import { Key, Plus, RefreshCw, Power, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const apiKeyService = useMemo(() => new ApiKeyService(), []);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const res = await apiKeyService.list();
      if (res.success && res.apis) {
        setApiKeys(res.apis);
      }
    } catch (error) {
      Swal.fire("Error", "Failed to fetch API keys", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    Swal.fire({ icon: "success", title: "Copied!", timer: 1500, showConfirmButton: false });
  };

  const handleToggle = async (id) => {
    try {
      const res = await apiKeyService.toggle(id);
      if (res.success) {
        fetchApiKeys();
        Swal.fire("Success", "API key status updated", "success");
      }
    } catch (error) {
      Swal.fire("Error", "Failed to toggle API key", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      const res = await apiKeyService.delete(id);
      if (res.success) {
        fetchApiKeys();
        Swal.fire("Deleted!", "API key has been deleted.", "success");
      }
    }
  };

  const handleRegenerate = async (id) => {
    const result = await Swal.fire({
      title: "Regenerate API Key?",
      text: "The old key will stop working immediately!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, regenerate!"
    });

    if (result.isConfirmed) {
      const res = await apiKeyService.regenerate(id);
      if (res.success && res.api) {
        fetchApiKeys();
        Swal.fire({
          icon: "success",
          title: "Regenerated!",
          html: `<p>New API Key: <code>${res.api.api_key}</code></p><p>Copy it now!</p>`
        });
      }
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 w-full max-w-full">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Key className="h-6 w-6" />
          API Keys
        </h1>
        <Link href="/bb-admin/api/create">
          <Button className="text-white" style={{ backgroundColor: "var(--chart-2)" }}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </Link>
      </div>

      <Card className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Rate Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No API keys found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((api) => (
                <TableRow key={api.id}>
                  <TableCell className="font-medium">{api.name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{api.api_key.substring(0, 20)}...</code>
                    <Button variant="ghost" size="sm" className="ml-2 h-6 w-6 p-0" onClick={() => handleCopy(api.api_key)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TableCell>
                  <TableCell>{api.model_name || "N/A"}</TableCell>
                  <TableCell>{api.rate_limit_requests || "100"} req/{api.rate_limit_window || "60"}s</TableCell>
                  <TableCell>
                    <Badge variant={api.is_active ? "default" : "secondary"}>
                      {api.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{api.total_requests || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(api.id)} title={api.is_active ? "Deactivate" : "Activate"}>
                        <Power className={`h-4 w-4 ${api.is_active ? "text-green-600" : "text-gray-400"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRegenerate(api.id)} title="Regenerate">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(api.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
