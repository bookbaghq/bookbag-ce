/**
 * WordPress-Style Plugin Admin View Loader (Server Component)
 *
 * This server component handles metadata generation for plugin pages.
 * The actual dynamic loading happens in the client component.
 */

import PluginViewClient from '../../_components/PluginViewClient';
import api from '@/apiConfig.json';

/**
 * Generate metadata for plugin pages
 * Attempts to load metadata from plugin-specific metadata.js files
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    // Try to load plugin-specific metadata
    const backendUrl = api.ApiConfig.main;
    const response = await fetch(`${backendUrl}/api/plugins/views/get?slug=${slug}`, {
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.view) {
        return {
          title: data.view.metadata?.title || data.view.title || 'Plugin Page',
          description: data.view.metadata?.description || `${data.view.title} - Bookbag Plugin`,
        };
      }
    }
  } catch (error) {
    console.error('Error loading plugin metadata:', error);
  }

  // Fallback metadata
  return {
    title: 'Plugin Page - Bookbag',
    description: 'Bookbag Plugin Administration',
  };
}

/**
 * Server component that renders the client component
 */
export default async function PluginViewPage({ params }) {
  const { slug } = await params;
  return <PluginViewClient slug={slug} />;
}
