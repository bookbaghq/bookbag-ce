'use client';

/**
 * Installed Plugins Management Page
 * List, activate, deactivate, and delete plugins
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InstalledPluginsPage() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Fetch plugins on mount
  useEffect(() => {
    fetchPlugins();
  }, []);

  async function fetchPlugins() {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';
      const response = await fetch(`${backendUrl}/api/plugins/list`);

      if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load plugins');
      }

      setPlugins(data.plugins);
    } catch (err) {
      console.error('Error fetching plugins:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(pluginName) {
    try {
      setActionLoading(prev => ({ ...prev, [pluginName]: 'activating' }));

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';
      const response = await fetch(`${backendUrl}/api/plugins/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pluginName })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to activate plugin');
      }

      alert(`Plugin "${pluginName}" activated successfully!\n\n${data.rebuild?.message || ''}`);

      // Refresh the list
      await fetchPlugins();
    } catch (err) {
      console.error('Error activating plugin:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [pluginName]: null }));
    }
  }

  async function handleDeactivate(pluginName) {
    try {
      setActionLoading(prev => ({ ...prev, [pluginName]: 'deactivating' }));

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';
      const response = await fetch(`${backendUrl}/api/plugins/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pluginName })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to deactivate plugin');
      }

      alert(`Plugin "${pluginName}" deactivated successfully!\n\n${data.rebuild?.message || ''}`);

      // Refresh the list
      await fetchPlugins();
    } catch (err) {
      console.error('Error deactivating plugin:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [pluginName]: null }));
    }
  }

  async function handleDelete(pluginName) {
    if (!confirm(`Are you sure you want to delete "${pluginName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [pluginName]: 'deleting' }));

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';
      const response = await fetch(`${backendUrl}/api/plugins/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginName })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete plugin');
      }

      alert(`Plugin "${pluginName}" deleted successfully!`);

      // Refresh the list
      await fetchPlugins();
    } catch (err) {
      console.error('Error deleting plugin:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [pluginName]: null }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plugins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-4 border-destructive">
          <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Plugins</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchPlugins} variant="outline">Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Installed Plugins</h1>
        <p className="text-sm text-muted-foreground">
          Manage your installed plugins. Activate or deactivate to enable/disable functionality.
        </p>
      </div>

      {plugins.length === 0 ? (
        <div className="text-sm text-muted-foreground">No plugins installed</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins.map((plugin) => {
            const currentAction = actionLoading[plugin.name];
            const isProcessing = Boolean(currentAction);

            return (
              <Card key={plugin.name} className="p-4">
                {/* Plugin Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold">{plugin.label || plugin.name}</div>
                    {plugin.version && <div className="text-xs text-muted-foreground">v{plugin.version}</div>}
                  </div>
                  {plugin.is_active ? (
                    <span className="inline-flex items-center rounded-md border bg-background shadow-xs h-7 px-2 text-xs text-green-600 border-green-300">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md border bg-background shadow-xs h-7 px-2 text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Plugin Description */}
                {plugin.description && (
                  <p className="text-sm text-muted-foreground truncate mb-3">{plugin.description}</p>
                )}

                {/* Plugin Meta */}
                {(plugin.author || plugin.category) && (
                  <div className="text-xs text-muted-foreground mb-3 space-y-1">
                    {plugin.author && <div>By: {plugin.author}</div>}
                    {plugin.category && (
                      <div>
                        <span className="inline-flex items-center rounded-md border bg-background shadow-xs h-6 px-2">
                          {plugin.category}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {plugin.is_active ? (
                    <button
                      onClick={() => handleDeactivate(plugin.name)}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {currentAction === 'deactivating' ? 'Deactivating...' : 'Deactivate'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(plugin.name)}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {currentAction === 'activating' ? 'Activating...' : 'Activate'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(plugin.name)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center rounded-md border-0 bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 h-9 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {currentAction === 'deleting' ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                {isProcessing && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {currentAction === 'activating' && 'Activating plugin...'}
                    {currentAction === 'deactivating' && 'Deactivating plugin...'}
                    {currentAction === 'deleting' && 'Deleting plugin...'}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Note */}
      <Card className="p-4 bg-muted/50">
        <h3 className="text-sm font-semibold mb-1">Note about Plugin Activation</h3>
        <p className="text-sm text-muted-foreground">
          When you activate or deactivate a plugin, the system will automatically rebuild the Next.js app to update the plugin registry. This may take a moment to complete.
        </p>
      </Card>
    </div>
  );
}
