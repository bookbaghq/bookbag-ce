'use client';

/**
 * Installed Plugins Management Page
 * List, activate, deactivate, and delete plugins
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/apiConfig.json';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function InstalledPluginsPage() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [readmeContent, setReadmeContent] = useState(null);
  const [readmeLoading, setReadmeLoading] = useState(false);

  // Fetch plugins on mount
  useEffect(() => {
    fetchPlugins();
  }, []);

  async function fetchPlugins() {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = api.ApiConfig.main;
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
      console.warn('Error fetching plugins:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(pluginSlug) {
    // Validate input
    if (!pluginSlug) {
      console.warn('handleActivate called with invalid slug:', pluginSlug);
      toast.error('Plugin activation failed: Invalid plugin identifier');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [pluginSlug]: 'activating' }));

      const backendUrl = api.ApiConfig.main;
      console.log('Activating plugin with slug:', pluginSlug);

      const response = await fetch(`${backendUrl}/api/plugins/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pluginSlug })
      });

      if (!response.ok) {
        console.warn('Plugin activation HTTP error:', response.status, response.statusText);
        toast.error(`Plugin activation failed: Server returned ${response.status}`);
        setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
        return;
      }

      const data = await response.json();

      if (!data.success) {
        console.warn('Plugin activation failed:', data.error);
        toast.error(data.error || 'Failed to activate plugin');
        setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
        return;
      }

      toast.success(`Plugin activated successfully! ${data.rebuild?.message || ''}`);

      // Refresh the list
      await fetchPlugins();
      setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
    } catch (err) {
      console.warn('Error activating plugin:', err);
      toast.error(`Plugin activation error: ${err.message || 'Unknown error'}`);
      setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
    }
  }

  async function handleDeactivate(pluginSlug) {
    // Validate input
    if (!pluginSlug) {
      console.warn('handleDeactivate called with invalid slug:', pluginSlug);
      toast.error('Plugin deactivation failed: Invalid plugin identifier');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [pluginSlug]: 'deactivating' }));

      const backendUrl = api.ApiConfig.main;
      const response = await fetch(`${backendUrl}/api/plugins/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pluginSlug })
      });

      if (!response.ok) {
        console.warn('Plugin deactivation HTTP error:', response.status, response.statusText);
        toast.error(`Plugin deactivation failed: Server returned ${response.status}`);
        setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
        return;
      }

      const data = await response.json();

      if (!data.success) {
        console.warn('Plugin deactivation failed:', data.error);
        toast.error(data.error || 'Failed to deactivate plugin');
        setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
        return;
      }

      toast.success(`Plugin deactivated successfully! ${data.rebuild?.message || ''}`);

      // Refresh the list
      await fetchPlugins();
      setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
    } catch (err) {
      console.warn('Error deactivating plugin:', err);
      toast.error(`Plugin deactivation error: ${err.message || 'Unknown error'}`);
      setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
    }
  }

  async function handleDelete(pluginSlug) {
    // Validate input
    if (!pluginSlug) {
      console.warn('handleDelete called with invalid slug:', pluginSlug);
      toast.error('Plugin deletion failed: Invalid plugin identifier');
      return;
    }

    if (!confirm(`Are you sure you want to delete this plugin?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [pluginSlug]: 'deleting' }));

      const backendUrl = api.ApiConfig.main;
      const response = await fetch(`${backendUrl}/api/plugins/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginName: pluginSlug })
      });

      if (!response.ok) {
        console.warn('Plugin deletion HTTP error:', response.status, response.statusText);
        toast.error(`Plugin deletion failed: Server returned ${response.status}`);
        setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
        return;
      }

      const data = await response.json();

      if (!data.success) {
        console.warn('Plugin deletion failed:', data.error);
        toast.error(data.error || 'Failed to delete plugin');
        setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
        return;
      }

      toast.success('Plugin deleted successfully!');

      // Refresh the list
      await fetchPlugins();
      setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
    } catch (err) {
      console.warn('Error deleting plugin:', err);
      toast.error(`Plugin deletion error: ${err.message || 'Unknown error'}`);
      setActionLoading(prev => ({ ...prev, [pluginSlug]: null }));
    }
  }

  async function handleViewProfile(plugin) {
    setSelectedPlugin(plugin);
    setProfileModalOpen(true);
    setReadmeLoading(true);
    setReadmeContent(null);

    try {
      const backendUrl = api.ApiConfig.main;
      const response = await fetch(`${backendUrl}/api/plugins/readme?name=${plugin.slug}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load plugin README');
      }

      setReadmeContent(data);
    } catch (err) {
      console.warn('Error fetching README:', err);
      setReadmeContent({
        success: false,
        error: err.message
      });
    } finally {
      setReadmeLoading(false);
    }
  }

  function closeProfileModal() {
    setProfileModalOpen(false);
    setSelectedPlugin(null);
    setReadmeContent(null);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading plugins...</p>
          </div>
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
            const currentAction = actionLoading[plugin.slug];
            const isProcessing = Boolean(currentAction);

            return (
              <Card key={plugin.slug} className="p-4">
                {/* Plugin Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold">{plugin.name}</div>
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
                      onClick={() => handleDeactivate(plugin.slug)}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {currentAction === 'deactivating' ? 'Deactivating...' : 'Deactivate'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(plugin.slug)}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {currentAction === 'activating' ? 'Activating...' : 'Activate'}
                    </button>
                  )}
                  <button
                    onClick={() => handleViewProfile(plugin)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => handleDelete(plugin.slug)}
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

      {/* Profile Modal - Right Side Drawer (35% width) */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50" onClick={closeProfileModal}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal Content - Right Side */}
          <div
            className="absolute right-0 top-0 bottom-0 w-[35%] bg-background shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedPlugin?.name || 'Plugin Profile'}</h2>
                {selectedPlugin?.version && (
                  <p className="text-sm text-muted-foreground">Version {selectedPlugin.version}</p>
                )}
              </div>
              <button
                onClick={closeProfileModal}
                className="rounded-md p-2 hover:bg-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {readmeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading README...</p>
                  </div>
                </div>
              ) : readmeContent?.success === false ? (
                <Card className="p-4 border-destructive">
                  <h3 className="text-sm font-semibold text-destructive mb-2">Error Loading README</h3>
                  <p className="text-sm text-muted-foreground">{readmeContent.error}</p>
                </Card>
              ) : readmeContent?.hasReadme === false ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-4 text-muted-foreground"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <h3 className="text-lg font-semibold mb-2">No README.md found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This plugin doesn't include a README file.
                  </p>
                  <div className="text-xs text-muted-foreground bg-muted p-4 rounded-md text-left">
                    <p className="font-semibold mb-2">Plugin Information:</p>
                    <p>Name: {readmeContent.plugin?.name}</p>
                    <p>Slug: {readmeContent.plugin?.slug}</p>
                    <p>Version: {readmeContent.plugin?.version}</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-base font-bold mt-3 mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                      code: ({node, inline, ...props}) =>
                        inline
                          ? <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props} />
                          : <code className="block bg-muted p-4 rounded-md overflow-x-auto text-sm" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-muted p-4 rounded-md overflow-x-auto mb-4" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-muted-foreground pl-4 italic my-4" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-6 border-t" {...props} />,
                      table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className="min-w-full border-collapse" {...props} /></div>,
                      th: ({node, ...props}) => <th className="border px-4 py-2 bg-muted font-semibold text-left" {...props} />,
                      td: ({node, ...props}) => <td className="border px-4 py-2" {...props} />,
                    }}
                  >
                    {readmeContent?.content || ''}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
