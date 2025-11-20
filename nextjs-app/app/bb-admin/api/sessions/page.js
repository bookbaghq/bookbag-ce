"use client";

import { useState, useEffect, useMemo } from "react";
import ApiKeyService from "@/services/apiKeyService";
import Swal from "sweetalert2";
import Link from "next/link";
import { Activity, ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ApiSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const apiKeyService = useMemo(() => new ApiKeyService(), []);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await apiKeyService.listSessions();
      if (res.success && res.sessions) {
        setSessions(res.sessions);
      }
    } catch (error) {
      Swal.fire("Error", "Failed to fetch sessions", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id) => {
    const result = await Swal.fire({
      title: "Delete Session?",
      text: "This will remove all messages in this session!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        const res = await apiKeyService.deleteSession(id);
        if (res.success) {
          fetchSessions();
          Swal.fire("Deleted!", "Session has been deleted.", "success");
        } else {
          Swal.fire("Error", res.error || "Failed to delete session", "error");
        }
      } catch (error) {
        Swal.fire("Error", "Failed to delete session", "error");
      }
    }
  };

  const handleClearSessionsByApi = async (apiId, apiName) => {
    const result = await Swal.fire({
      title: `Clear All Sessions for "${apiName}"?`,
      text: "This will remove all sessions associated with this API key!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, clear them!"
    });

    if (result.isConfirmed) {
      try {
        const res = await apiKeyService.clearSessionsByApi(apiId);
        if (res.success) {
          fetchSessions();
          Swal.fire("Cleared!", "All sessions for this API key have been cleared.", "success");
        } else {
          Swal.fire("Error", res.error || "Failed to clear sessions", "error");
        }
      } catch (error) {
        Swal.fire("Error", "Failed to clear sessions", "error");
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString();
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Group sessions by API key for better organization
  const groupedSessions = sessions.reduce((acc, session) => {
    const apiId = session.api_id;
    if (!acc[apiId]) {
      acc[apiId] = {
        api_name: session.api_name || `API ${apiId}`,
        api_id: apiId,
        sessions: []
      };
    }
    acc[apiId].sessions.push(session);
    return acc;
  }, {});

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 w-full max-w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            API Sessions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage active API sessions
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchSessions} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/bb-admin/api">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to API Management
            </Button>
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card className="border rounded-md p-8 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Sessions</h3>
          <p className="text-muted-foreground">
            There are no API sessions currently active. Sessions will appear here once API keys start being used.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedSessions).map((group) => (
            <div key={group.api_id}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {group.api_name}
                  <Badge variant="secondary">{group.sessions.length} sessions</Badge>
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleClearSessionsByApi(group.api_id, group.api_name)}
                >
                  Clear All Sessions
                </Button>
              </div>

              <Card className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Tokens Used</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono text-sm">
                          {session.session_id.substring(0, 20)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.is_active ? "default" : "secondary"}>
                            {session.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.message_count || 0}
                        </TableCell>
                        <TableCell>
                          {(session.total_tokens_used || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatRelativeTime(session.created_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(session.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatRelativeTime(session.last_activity_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(session.last_activity_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteSession(session.id)}
                            title="Delete Session"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ))}

          {/* Summary Statistics */}
          <Card className="border rounded-md p-6">
            <h3 className="text-lg font-semibold mb-4">Session Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {sessions.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {sessions.filter(s => s.is_active).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {sessions.reduce((sum, s) => sum + (s.message_count || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Messages</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {sessions.reduce((sum, s) => sum + (s.total_tokens_used || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Tokens</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
