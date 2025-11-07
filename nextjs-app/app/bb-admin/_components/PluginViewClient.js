/**
 * WordPress-Style Plugin Admin View Loader (Client Component)
 *
 * This handles the dynamic loading of plugin admin pages.
 * URL pattern: /bb-admin/plugin/[slug]
 *
 * Example: /bb-admin/plugin/rag-settings loads the RAG Settings page
 */

'use client';

import { useEffect, useState } from 'react';

export default function PluginViewClient({ slug }) {
  const [viewInfo, setViewInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [PluginComponent, setPluginComponent] = useState(null);

  useEffect(() => {
    async function loadView() {
      try {
        setLoading(true);
        setError(null);

        // 1. Query backend API to get view info
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';
        const response = await fetch(`${backendUrl}/api/plugins/views/get?slug=${slug}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch view info: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'View not found');
        }

        const view = data.view;
        setViewInfo(view);

        // 2. Load plugin component from static registry
        // The registry is auto-generated from the database and contains static imports
        const { getPluginComponent } = await import('@/plugins/registry');
        const Component = getPluginComponent(view.slug);

        if (!Component) {
          throw new Error(`Plugin component not found in registry for slug: ${view.slug}`);
        }

        setPluginComponent(() => Component);

      } catch (err) {
        console.error('Error loading plugin view:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadView();
    }
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading plugin view...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Plugin View Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500">
            <p>Slug: <code className="bg-gray-100 px-2 py-1 rounded">{slug}</code></p>
          </div>
        </div>
      </div>
    );
  }

  // Render the plugin component
  if (PluginComponent) {
    return (
      <div className="plugin-view-container">
        <PluginComponent />
      </div>
    );
  }

  return null;
}
