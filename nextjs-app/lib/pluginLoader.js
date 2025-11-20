/**
 * Runtime Plugin Loader
 *
 * PayloadCMS/Keystone-style runtime plugin loading without Next.js rebuilds.
 * Fetches active plugins from backend and dynamically loads their precompiled bundles.
 */

import apiConfig from '@/apiConfig.json';

class PluginLoader {
  constructor() {
    this.plugins = new Map(); // In-memory registry: slug -> plugin data
    this.loadedBundles = new Map(); // Bundle URL -> loaded module
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize the plugin system - fetch and load all active plugins
   * @returns {Promise<void>}
   */
  async initialize() {
    // If already initialized, return
    if (this.isInitialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._doInitialize();
    await this.initPromise;
    this.initPromise = null;
  }

  async _doInitialize() {
    try {
      console.log('[PluginLoader] Initializing plugin system...');

      // Fetch active plugins from backend
      const backendUrl = apiConfig.BACKEND_URL || 'http://127.0.0.1:8080';
      const response = await fetch(`${backendUrl}/api/plugins/active`);

      if (!response.ok) {
        throw new Error(`Failed to fetch active plugins: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`API error: ${data.error || 'Unknown error'}`);
      }

      console.log(`[PluginLoader] Found ${data.count} active plugin(s)`);

      // Load each plugin's bundles
      for (const plugin of data.plugins) {
        await this.loadPlugin(plugin);
      }

      this.isInitialized = true;
      console.log('[PluginLoader] Plugin system initialized successfully');

    } catch (error) {
      console.error('[PluginLoader] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Load a single plugin and its bundles
   * @param {Object} plugin - Plugin metadata with bundles
   */
  async loadPlugin(plugin) {
    try {
      console.log(`[PluginLoader] Loading plugin: ${plugin.slug}`);

      const loadedBundles = {};

      // Load admin bundle if it exists
      if (plugin.bundles?.admin) {
        const adminModule = await this.loadBundle(plugin.bundles.admin);
        loadedBundles.admin = adminModule;
        console.log(`[PluginLoader]   ✓ Admin bundle loaded`);
      }

      // Load client bundle if it exists
      if (plugin.bundles?.client) {
        const clientModule = await this.loadBundle(plugin.bundles.client);
        loadedBundles.client = clientModule;
        console.log(`[PluginLoader]   ✓ Client bundle loaded`);
      }

      // Store in registry
      this.plugins.set(plugin.slug, {
        ...plugin,
        modules: loadedBundles
      });

    } catch (error) {
      console.error(`[PluginLoader] Failed to load plugin ${plugin.slug}:`, error);
      // Continue loading other plugins even if one fails
    }
  }

  /**
   * Dynamically load a plugin bundle (ES module)
   * @param {string} bundlePath - Path to bundle (e.g., /bb-plugins/rag-plugin/dist/admin.js)
   * @returns {Promise<Object>} - The loaded module
   */
  async loadBundle(bundlePath) {
    // Check if already loaded
    if (this.loadedBundles.has(bundlePath)) {
      return this.loadedBundles.get(bundlePath);
    }

    try {
      // Dynamically import the ES module
      // Note: The bundle path needs to be accessible from the browser
      const backendUrl = apiConfig.BACKEND_URL || 'http://127.0.0.1:8080';
      const bundleUrl = `${backendUrl}${bundlePath}`;

      const loadedModule = await import(/* webpackIgnore: true */ bundleUrl);

      // Cache the loaded module
      this.loadedBundles.set(bundlePath, loadedModule);

      return loadedModule;

    } catch (error) {
      console.error(`[PluginLoader] Failed to load bundle ${bundlePath}:`, error);
      throw error;
    }
  }

  /**
   * Get a loaded plugin by slug
   * @param {string} slug - Plugin slug
   * @returns {Object|null} - Plugin data with modules, or null
   */
  getPlugin(slug) {
    return this.plugins.get(slug) || null;
  }

  /**
   * Get a specific component from a plugin
   * @param {string} slug - Plugin slug
   * @param {string} componentName - Component name (e.g., 'RagSettings')
   * @param {string} bundle - Bundle type ('admin' or 'client')
   * @returns {React.Component|null}
   */
  getComponent(slug, componentName, bundle = 'admin') {
    const plugin = this.getPlugin(slug);
    if (!plugin || !plugin.modules[bundle]) {
      return null;
    }

    return plugin.modules[bundle][componentName] || null;
  }

  /**
   * Get all loaded plugins
   * @returns {Array} - Array of plugin data
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   * @param {string} category - Plugin category
   * @returns {Array} - Filtered plugins
   */
  getPluginsByCategory(category) {
    return this.getAllPlugins().filter(p => p.category === category);
  }

  /**
   * Reset the plugin system (useful for testing or reloading)
   */
  reset() {
    this.plugins.clear();
    this.loadedBundles.clear();
    this.isInitialized = false;
    this.initPromise = null;
  }
}

// Export singleton instance
export const pluginLoader = new PluginLoader();

// Export class for testing
export { PluginLoader };
