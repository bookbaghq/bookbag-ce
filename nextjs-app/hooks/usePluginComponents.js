/**
 * Hook to dynamically load plugin components
 * Fetches registered components from the backend and dynamically imports them
 */

import { useState, useEffect } from 'react';
import api from '@/apiConfig.json';

const BASE_URL = api.ApiConfig.main;

export function usePluginComponents(usage) {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAndLoadComponents() {
      try {
        setLoading(true);

        // Fetch component metadata from backend
        const url = usage
          ? `${BASE_URL}/api/plugins/components/list?usage=${encodeURIComponent(usage)}`
          : `${BASE_URL}/api/plugins/components/list`;

        const response = await fetch(url, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch plugin components: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch components');
        }

        console.log('[usePluginComponents] Fetched components:', data);

        // Dynamically load each component
        const loadedComponents = [];

        for (const comp of data.components) {
          try {
            // The importPath should be the full path with the webpack alias already configured
            // e.g., "bb-plugins/rag-plugin/nextjs/client/KnowledgeBaseSidebar"
            // Add .js extension if not present
            const modulePath = comp.importPath.endsWith('.js') ? comp.importPath : `${comp.importPath}.js`;

            // Construct full URL to fetch from backend (backend now serves /bb-plugins statically)
            const fullUrl = `${BASE_URL}/${modulePath}`;

            console.log(`[usePluginComponents] Loading component "${comp.name}" from ${fullUrl}`);

            // Dynamic import with webpackIgnore to prevent bundler warnings
            const module = await import(/* webpackIgnore: true */ fullUrl);

            // Get default export or named export matching component name
            const Component = module.default || module[comp.name];

            if (!Component) {
              console.warn(`[usePluginComponents] Component "${comp.name}" not found in module`, module);
              continue;
            }

            loadedComponents.push({
              name: comp.name,
              Component,
              metadata: comp.metadata || {},
              pluginName: comp.pluginName
            });

            console.log(`[usePluginComponents] ✓ Loaded component "${comp.name}"`);
          } catch (err) {
            console.error(`[usePluginComponents] Failed to load component "${comp.name}":`, err);
          }
        }

        if (mounted) {
          setComponents(loadedComponents);
          setError(null);
        }

      } catch (err) {
        console.error('[usePluginComponents] Error:', err);
        if (mounted) {
          setError(err.message);
          setComponents([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchAndLoadComponents();

    return () => {
      mounted = false;
    };
  }, [usage]);

  return { components, loading, error };
}
