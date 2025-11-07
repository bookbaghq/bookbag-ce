'use client';

/**
 * Installed Plugins Management Page
 * List, activate, deactivate, and delete plugins
 */

import { useEffect, useState } from 'react';

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
        body: JSON.stringify({ pluginName })
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
        body: JSON.stringify({ pluginName })
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
          <p className="text-gray-600">Loading plugins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Plugins</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPlugins}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Installed Plugins</h1>
        <p className="text-gray-600">
          Manage your installed plugins. Activate or deactivate to enable/disable functionality.
        </p>
      </div>

      {plugins.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No plugins installed</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plugins.map((plugin) => {
            const currentAction = actionLoading[plugin.name];
            const isProcessing = Boolean(currentAction);

            return (
              <div
                key={plugin.id}
                className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
                  plugin.is_active ? 'border-green-300' : 'border-gray-200'
                }`}
              >
                {/* Plugin Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{plugin.label}</h3>
                    <p className="text-sm text-gray-500 mt-1">v{plugin.version}</p>
                  </div>
                  {plugin.is_active && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      Active
                    </span>
                  )}
                  {!plugin.is_active && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Plugin Description */}
                {plugin.description && (
                  <p className="text-gray-600 text-sm mb-4">{plugin.description}</p>
                )}

                {/* Plugin Meta */}
                <div className="text-xs text-gray-500 mb-4 space-y-1">
                  {plugin.author && <div>By: {plugin.author}</div>}
                  {plugin.category && (
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{plugin.category}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {plugin.is_active ? (
                    <button
                      onClick={() => handleDeactivate(plugin.name)}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentAction === 'deactivating' ? 'Deactivating...' : 'Deactivate'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(plugin.name)}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentAction === 'activating' ? 'Activating...' : 'Activate'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(plugin.name)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {currentAction === 'deleting' ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                {isProcessing && (
                  <div className="mt-3 text-xs text-gray-500 text-center">
                    {currentAction === 'activating' && 'Activating plugin and rebuilding...'}
                    {currentAction === 'deactivating' && 'Deactivating plugin and rebuilding...'}
                    {currentAction === 'deleting' && 'Deleting plugin...'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Note */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Note about Plugin Activation</h3>
        <p className="text-sm text-blue-800">
          When you activate or deactivate a plugin, the system will automatically rebuild the Next.js app to update the plugin registry. This may take a moment to complete.
        </p>
      </div>
    </div>
  );
}
