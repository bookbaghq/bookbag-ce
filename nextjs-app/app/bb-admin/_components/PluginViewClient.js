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
import { getAllComponents } from '@/lib/pluginComponentLoader';
import api from '@/apiConfig.json';

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
        const backendUrl = api.ApiConfig.main;
        const response = await fetch(`${backendUrl}/api/plugins/views/get?slug=${slug}`);

        if (!response.ok) {
          console.warn(`Failed to fetch plugin view info: ${response.statusText}`);
          setError(`Failed to fetch view info: ${response.statusText}`);
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.success) {
          console.warn('Plugin view API error:', data.error);
          setError(data.error || 'View not found');
          setLoading(false);
          return;
        }

        const view = data.view;
        setViewInfo(view);

        // 2. Find component in static loader by viewSlug metadata
        const allComponents = getAllComponents();
        const matchingComponent = Object.entries(allComponents).find(([name, info]) =>
          info.metadata?.usage === 'admin-view' && info.metadata?.viewSlug === slug
        );

        if (!matchingComponent) {
          console.warn(`Plugin component not found for view slug: ${slug}`);
          setError(`Plugin component not found for view slug: ${slug}`);
          setLoading(false);
          return;
        }

        const [componentName, componentInfo] = matchingComponent;
        const Component = componentInfo.component;

        if (!Component) {
          console.warn(`Plugin component not loaded: ${componentName}`);
          setError(`Plugin component not loaded: ${componentName}`);
          setLoading(false);
          return;
        }

        setPluginComponent(() => Component);

      } catch (err) {
        console.warn('Error loading plugin view:', err);
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
