'use client';

/**
 * Plugin Migration History Page
 * WordPress-style Site Health > Database Updates view
 * Displays all plugin migration executions with filtering capabilities
 */

import { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/apiConfig.json';

const BASE_URL = api.ApiConfig.main;

export default function MigrationHistoryPage() {
  const [stats, setStats] = useState(null);
  const [migrations, setMigrations] = useState([]);
  const [filteredMigrations, setFilteredMigrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, success, failed
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Apply filters whenever search term or status filter changes
    filterMigrations();
  }, [searchTerm, statusFilter, migrations]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both stats and migration history in parallel
      const [statsRes, historyRes] = await Promise.all([
        fetch(`${BASE_URL}/api/plugins/migrations/stats`, {
          credentials: 'include',
        }),
        fetch(`${BASE_URL}/api/plugins/migrations/history?limit=100`, {
          credentials: 'include',
        })
      ]);

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      if (statsData.success) {
        setStats(statsData.stats);
      } else {
        toast.error(statsData.error || 'Failed to load migration stats');
      }

      if (historyData.success) {
        setMigrations(historyData.data || []);
      } else {
        toast.error(historyData.error || 'Failed to load migration history');
      }
    } catch (error) {
      console.error('Failed to fetch migration data:', error);
      toast.error('Failed to load migration data');
    } finally {
      setLoading(false);
    }
  };

  const filterMigrations = () => {
    let filtered = [...migrations];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Filter by search term (plugin name or context)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.plugin?.toLowerCase().includes(term) ||
        m.context?.toLowerCase().includes(term)
      );
    }

    setFilteredMigrations(filtered);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(parseInt(timestamp)).toLocaleString();
  };

  const getStatusBadge = (status) => {
    if (status === 'success') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </span>
      );
    } else if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-800 text-xs font-medium">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-medium">
        <Clock className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const toggleLogExpansion = (logId) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading migration history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Plugin Migration History</h1>
          <p className="text-muted-foreground mt-1">
            Track all plugin database migrations and their execution status
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Database className="h-4 w-4" />
            <span className="text-sm">Total Migrations</span>
          </div>
          <p className="text-2xl font-bold">{stats?.total || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Successful</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats?.success || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Failed</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats?.failed || 0}</p>
        </Card>
      </div>

      {/* Plugin Stats */}
      {stats?.byPlugin && Object.keys(stats.byPlugin).length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Migrations by Plugin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stats.byPlugin).map(([pluginName, pluginStats]) => (
              <div key={pluginName} className="border rounded-lg p-3">
                <div className="font-medium mb-2">{pluginName}</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{pluginStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success:</span>
                    <span className="font-medium text-green-600">{pluginStats.success}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-medium text-red-600">{pluginStats.failed}</span>
                  </div>
                  {pluginStats.lastRun && (
                    <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      Last run: {formatDate(pluginStats.lastRun)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by plugin name or context..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            All
          </Button>
          <Button
            variant={statusFilter === 'success' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('success')}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Success
          </Button>
          <Button
            variant={statusFilter === 'failed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('failed')}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Failed
          </Button>
        </div>
      </div>

      {/* Migration History Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Plugin</th>
                <th className="text-left p-4 font-medium">Context</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Executed At</th>
                <th className="text-right p-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredMigrations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-8">
                    <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {migrations.length === 0
                        ? 'No migration history yet'
                        : 'No migrations match your filters'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMigrations.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <span className="font-medium">{log.plugin}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">{log.context}</span>
                      </td>
                      <td className="p-4">{getStatusBadge(log.status)}</td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(log.ran_at)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLogExpansion(log.id)}
                          className="gap-2"
                        >
                          {expandedLogId === log.id ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                      <tr className="bg-muted/30">
                        <td colSpan="5" className="p-4">
                          <div className="space-y-3">
                            {/* Error Message */}
                            {log.error_message && (
                              <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950 p-3 rounded">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                                      Error Message
                                    </h4>
                                    <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                                      {log.error_message}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Standard Output */}
                            {log.stdout && (
                              <div className="border rounded-lg p-3 bg-background">
                                <h4 className="font-semibold text-sm mb-2">Standard Output</h4>
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                                  {log.stdout}
                                </pre>
                              </div>
                            )}

                            {/* Standard Error */}
                            {log.stderr && (
                              <div className="border rounded-lg p-3 bg-background">
                                <h4 className="font-semibold text-sm mb-2">Standard Error</h4>
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                                  {log.stderr}
                                </pre>
                              </div>
                            )}

                            {/* No output */}
                            {!log.error_message && !log.stdout && !log.stderr && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No detailed output available for this migration
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info Note */}
      <Card className="p-4 bg-muted/50">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Database className="h-4 w-4" />
          About Migration History
        </h3>
        <p className="text-sm text-muted-foreground">
          This page tracks all plugin database migrations executed by the MasterRecord migration manager.
          Each entry shows the plugin name, context, execution status, and detailed logs for debugging purposes.
          Failed migrations are highlighted in red and include error messages to help troubleshoot issues.
        </p>
      </Card>
    </div>
  );
}
