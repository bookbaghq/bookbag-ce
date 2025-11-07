/**
 * Dynamic Plugin Sidebar Loader
 *
 * WordPress-style dynamic component loading for client sidebars
 * Queries the backend for registered sidebar components and loads them dynamically
 *
 * Usage:
 *   <DynamicPluginSidebar usage="sidebar-left" chatId={chatId} />
 *   <DynamicPluginSidebar usage="sidebar-right" chatId={chatId} />
 */

'use client';

import { useState, useEffect } from 'react';

export function DynamicPluginSidebar({ usage, chatId, ...props }) {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [LoadedComponents, setLoadedComponents] = useState([]);

  useEffect(() => {
    async function loadSidebarComponents() {
      try {
        setLoading(true);
        setError(null);

        // 1. Query backend API for components with specified usage
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';
        const response = await fetch(`${backendUrl}/api/plugins/components/list?usage=${usage}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch components: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load components');
        }

        setComponents(data.components || []);

        // 2. Dynamically import all components
        const loadedComps = await Promise.all(
          (data.components || []).map(async (comp) => {
            try {
              // importPath format: "plugins/rag-plugin/nextjs/pages/client/KnowledgeBaseSidebar"
              // Extract plugin name and component path from the backend-provided path
              const pathParts = comp.importPath.split('/');
              const pluginName = pathParts[1]; // e.g., "rag-plugin"

              // Find the index of "nextjs" and get everything after it
              const nextjsIndex = pathParts.indexOf('nextjs');
              const componentPath = pathParts.slice(nextjsIndex + 1).join('/'); // e.g., "pages/client/KnowledgeBaseSidebar"

              // Highly constrained import - webpack ONLY looks in plugin's nextjs folder
              // This ensures no other plugin files are scanned during compilation
              // Note: Using bb-plugins alias (configured in next.config.mjs) to resolve outside nextjs-app
              // Add .js extension for webpack to resolve the module correctly
              const componentModule = await import(`bb-plugins/${pluginName}/nextjs/${componentPath}.js`);
              // Handle both default and named exports
              const Component = componentModule.default || componentModule[comp.name];

              return {
                name: comp.name,
                Component,
                metadata: comp.metadata
              };
            } catch (err) {
              console.error(`Error loading component ${comp.name}:`, err);
              return null;
            }
          })
        );

        // Filter out failed loads
        setLoadedComponents(loadedComps.filter(Boolean));

      } catch (err) {
        console.error('Error loading sidebar components:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSidebarComponents();
  }, [usage]);

  // Loading state
  if (loading) {
    return null; // Silent loading, sidebars are optional
  }

  // Error state - fail silently for sidebars
  if (error) {
    console.warn(`Sidebar ${usage} loading error:`, error);
    return null;
  }

  // No components registered - this is fine
  if (LoadedComponents.length === 0) {
    return null;
  }

  // Render all registered components for this sidebar position
  return (
    <>
      {LoadedComponents.map(({ name, Component, metadata }) => (
        <Component
          key={name}
          chatId={chatId}
          {...props}
        />
      ))}
    </>
  );
}
