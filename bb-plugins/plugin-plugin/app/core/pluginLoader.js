/**
 * Plugin Loader - Main Plugin System API
 *
 * This is the central plugin system that manages:
 * - Loading active plugins from database
 * - Providing hookService and HOOKS to plugins
 * - Firing plugin lifecycle hooks
 *
 * Plugins receive:
 * - hookService: Central hook registration service
 * - HOOKS: All hook constants
 * - pluginLoader: Reference to this loader
 */

const path = require('path');
const master = require('mastercontroller');
const hookService = require('./hookRegistration');
const { HOOKS } = require('./hookConstants');
const registryGenerator = require('./registryGenerator');
const PluginDiscovery = require('./pluginDiscovery');

class PluginLoader {
  constructor() {
    this.pluginsDir = path.join(__dirname, '../../../../bb-plugins');
    this.loadedPlugins = [];
    this.registeredHooks = new Map();
    this.registeredPages = new Map(); // Map of route -> plugin page path (deprecated)
    this.registeredViews = new Map(); // Map of slug -> plugin view info (NEW: WordPress-style)
    this.registeredClientComponents = new Map(); // Map of component name -> plugin component info
    this.hookService = hookService; // Make hookService available to registered hooks
    this.pluginDiscovery = new PluginDiscovery(this.pluginsDir); // WordPress-style plugin discovery
  }

  /**
   * Legacy hook registration method (deprecated)
   * Kept for backward compatibility but no longer used
   *
   * @deprecated Use generic hooks via hookService instead
   * @param {Object} hookSystem - Hook system object with a 'name' property
   */
  hook(hookSystem) {
    if (!hookSystem || !hookSystem.name) {
      throw new Error('Hook system must have a "name" property');
    }

    const hookName = hookSystem.name;

    // Register the hook system
    this.registeredHooks.set(hookName, hookSystem);

    // Make it accessible as a property
    this[hookName] = hookSystem;

    console.log(`  ✓ Registered legacy hook system: ${hookName} (deprecated)`);
  }

  /**
   * Get list of active plugins from database
   * Similar to WordPress get_option('active_plugins')
   *
   * @param {string} tenantId - Tenant identifier (not used with context pattern)
   * @returns {Array} Array of plugin objects with file_path
   */
  getActivePlugins(tenantId = 'default') {
    try {
      // Get pluginContext from master (registered in config/initializers/config.js)
      const pluginContext = master.requestList.pluginContext;

      if (!pluginContext) {
        console.error('pluginContext not found in master');
        return [];
      }

      // Query using MasterRecord context pattern
      const plugins = pluginContext.Plugin
        .where(p => p.is_active == $$, "1")
        .orderBy(p => p.priority)
        .toList();

      return plugins.filter(p => p.file_path);
    } catch (error) {
      console.error('Error fetching active plugins:', error);
      return [];
    }
  }

  /**
   * Load and execute a single plugin file
   * WordPress equivalent: include_once WP_PLUGIN_DIR . '/' . $plugin
   *
   * @param {Object} pluginData - Plugin object from database with file_path and method_name_to_load
   */
  loadPluginFile(pluginData) {
    try {
      const { name } = pluginData;

      // Use file_path from database, fallback to '<plugin-name>/index.js'
      const file_path = pluginData.file_path || `${name}/index.js`;

      // Use method_name_to_load from database, fallback to 'load'
      const method_name_to_load = pluginData.method_name_to_load || 'load';

      const fullPath = path.join(this.pluginsDir, file_path);

      console.log(`  Loading plugin: ${name} (${file_path} -> ${method_name_to_load}())`);

      // Require the plugin's file from database
      const plugin = require(fullPath);

      // Check if plugin has the specified method from database
      if (typeof plugin[method_name_to_load] === 'function') {
        // Pass the plugin API to the method
        const pluginAPI = {
          hookService: this.hookService,
          pluginLoader: this,
          HOOKS: HOOKS, // Include HOOKS constants for convenience
          registerPage: (route, componentPath) => {
            this.registerPage(route, componentPath, name);
          },
          registerView: (slug, componentPath, metadata = {}) => {
            this.registerView(slug, componentPath, name, metadata);
          },
          registerClientComponent: (componentName, componentPath, metadata = {}) => {
            this.registerClientComponent(componentName, componentPath, name, metadata);
          }
        };

        // Call the method specified in database
        plugin[method_name_to_load](pluginAPI);

        this.loadedPlugins.push(file_path);
        console.log(`  ✓ ${name} loaded successfully via ${method_name_to_load}()`);

        // Fire PLUGIN_LOADED hook
        hookService.doAction(HOOKS.PLUGIN_LOADED, {
          pluginName: name,
          pluginPath: fullPath,
          pluginMetadata: pluginData
        }).catch(err => {
          console.error(`  ⚠ Error firing PLUGIN_LOADED hook for ${name}:`, err);
        });
      } else {
        console.warn(`  ⚠ Plugin "${name}" has no ${method_name_to_load}() method, skipping`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to load plugin ${pluginData.name}:`, error.message);
    }
  }

  /**
   * Load all active plugins from database
   * WordPress equivalent:
   * foreach ( get_option( 'active_plugins' ) as $plugin ) {
   *     include_once WP_PLUGIN_DIR . '/' . $plugin;
   * }
   *
   * @param {string} tenantId - Tenant identifier
   */
  loadActivePlugins(tenantId = 'default') {
    console.log('🔌 Loading active plugins from database...');

    // Get list of active plugins from database
    const activePlugins = this.getActivePlugins(tenantId);

    if (activePlugins.length === 0) {
      console.log('  No active plugins found in database');
      return;
    }

    console.log(`  Found ${activePlugins.length} active plugin(s)`);

    // Load each plugin file using database fields
    // file_path from database (fallback to '<plugin-name>/index.js')
    // method_name_to_load from database (fallback to 'load')
    for (const plugin of activePlugins) {
      // Pass the entire plugin object (includes file_path, method_name_to_load, name, etc.)
      this.loadPluginFile(plugin);
    }

    console.log('✓ All active plugins loaded');

    // Generate Next.js plugin registry from registered views
    console.log('🔄 Generating Next.js plugin registry...');
    registryGenerator.generateRegistry();
  }

  /**
   * Get list of loaded plugins
   * @returns {Array<string>} Array of loaded plugin file paths
   */
  getLoadedPlugins() {
    return this.loadedPlugins;
  }

  /**
   * Get registered hook systems
   * @returns {Map} Map of registered hook systems
   */
  getRegisteredHooks() {
    return this.registeredHooks;
  }

  /**
   * Check if a hook system is registered
   * @param {string} hookName - Name of the hook system
   * @returns {boolean}
   */
  hasHook(hookName) {
    return this.registeredHooks.has(hookName);
  }

  /**
   * Register a plugin page (frontend route)
   * This allows plugins to provide their own Next.js pages
   *
   * @param {string} route - Frontend route (e.g., '/bb-admin/rag/settings')
   * @param {string} componentPath - Relative path to page component within plugin's nextjs/ folder (e.g., 'pages/admin/rag/settings/page.js')
   * @param {string} pluginName - Name of the plugin registering the page
   *
   * Example:
   *   pluginAPI.registerPage('/bb-admin/rag/settings', 'pages/admin/rag/settings/page.js', 'rag-plugin');
   *
   * Note: All frontend files should be in the plugin's nextjs/ folder.
   * The system will automatically look in nextjs/ for the component.
   */
  registerPage(route, componentPath, pluginName) {
    // Normalize route (remove trailing slash, ensure leading slash)
    const normalizedRoute = ('/' + route).replace(/\/+/g, '/').replace(/\/$/, '') || '/';

    // Automatically prepend 'nextjs/' to the componentPath
    const fullComponentPath = componentPath.startsWith('nextjs/')
      ? componentPath
      : `nextjs/${componentPath}`;

    const fullPath = path.join(this.pluginsDir, pluginName, fullComponentPath);

    this.registeredPages.set(normalizedRoute, {
      pluginName,
      componentPath: fullComponentPath,
      fullPath
    });

    console.log(`  ✓ Registered page: ${normalizedRoute} -> ${pluginName}/${fullComponentPath}`);
  }

  /**
   * Get plugin page information for a route
   * @param {string} route - Frontend route to check
   * @returns {Object|null} Page info or null if not found
   */
  getPluginPage(route) {
    const normalizedRoute = ('/' + route).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    return this.registeredPages.get(normalizedRoute) || null;
  }

  /**
   * Get all registered pages
   * @returns {Map} Map of all registered pages
   */
  getRegisteredPages() {
    return this.registeredPages;
  }

  /**
   * Check if a page is registered
   * @param {string} route - Frontend route to check
   * @returns {boolean}
   */
  hasPage(route) {
    const normalizedRoute = ('/' + route).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    return this.registeredPages.has(normalizedRoute);
  }

  /**
   * Register a client-side component provided by a plugin
   * This allows the plugin system to know what UI components are available
   *
   * @param {string} componentName - Name of the component (e.g., 'KnowledgeBaseSidebar')
   * @param {string} componentPath - Relative path to component within plugin's nextjs/ folder (e.g., 'components/KnowledgeBaseSidebar')
   * @param {string} pluginName - Name of the plugin registering the component
   * @param {Object} metadata - Optional metadata about the component
   *
   * Example:
   *   pluginAPI.registerClientComponent('KnowledgeBaseSidebar', 'components/KnowledgeBaseSidebar', 'rag-plugin', {
   *     description: 'Document management sidebar for chat interface',
   *     usage: 'chat-sidebar'
   *   });
   *
   * Note: All frontend files should be in the plugin's nextjs/ folder.
   * The system will automatically look in nextjs/ for the component.
   */
  registerClientComponent(componentName, componentPath, pluginName, metadata = {}) {
    // Automatically prepend 'nextjs/' to the componentPath
    const fullComponentPath = componentPath.startsWith('nextjs/')
      ? componentPath
      : `nextjs/${componentPath}`;

    const fullPath = path.join(this.pluginsDir, pluginName, fullComponentPath);

    // Construct import path for Next.js dynamic imports (via symlink)
    // Remove .js extension if present since Next.js handles that
    const cleanPath = fullComponentPath.replace(/\.js$/, '');
    const importPath = `plugins/${pluginName}/${cleanPath}`;

    this.registeredClientComponents.set(componentName, {
      pluginName,
      componentPath: fullComponentPath,
      fullPath,
      importPath,
      metadata
    });

    console.log(`  ✓ Registered client component: ${componentName} -> ${importPath}`);
  }

  /**
   * Get client component information
   * @param {string} componentName - Component name to look up
   * @returns {Object|null} Component info or null if not found
   */
  getClientComponent(componentName) {
    return this.registeredClientComponents.get(componentName) || null;
  }

  /**
   * Get all registered client components
   * @returns {Map} Map of all registered client components
   */
  getRegisteredClientComponents() {
    return this.registeredClientComponents;
  }

  /**
   * Check if a client component is registered
   * @param {string} componentName - Component name to check
   * @returns {boolean}
   */
  hasClientComponent(componentName) {
    return this.registeredClientComponents.has(componentName);
  }

  /**
   * Get client components by usage type
   * @param {string} usage - Usage type (e.g., 'sidebar-left', 'sidebar-right', 'menu', 'chat-sidebar')
   * @returns {Array} Array of component info objects matching the usage type
   */
  getClientComponentsByUsage(usage) {
    const components = [];
    for (const [name, info] of this.registeredClientComponents.entries()) {
      if (info.metadata && info.metadata.usage === usage) {
        components.push({
          name,
          ...info
        });
      }
    }
    return components;
  }

  /**
   * Register an admin view (WordPress-style)
   * Views are accessed via /bb-admin/plugin/[slug]
   *
   * @param {string} slug - URL slug for the view (e.g., 'rag-settings')
   * @param {string} componentPath - Relative path to component within plugin's nextjs/ folder (e.g., 'pages/admin/rag/Settings')
   * @param {string} pluginName - Name of the plugin registering the view
   * @param {Object} metadata - Optional metadata (title, capabilities, icon, etc.)
   *
   * Example:
   *   pluginAPI.registerView('rag-settings', 'pages/admin/rag/Settings', 'rag-plugin', {
   *     title: 'RAG Settings',
   *     capability: 'manage_options',
   *     icon: 'settings'
   *   });
   *
   * Note: All frontend files should be in the plugin's nextjs/ folder.
   * The system will automatically look in nextjs/ for the component.
   */
  registerView(slug, componentPath, pluginName, metadata = {}) {
    // Automatically prepend 'nextjs/' to the componentPath
    const fullComponentPath = componentPath.startsWith('nextjs/')
      ? componentPath
      : `nextjs/${componentPath}`;

    // Ensure .js extension for dynamic imports
    const importPath = fullComponentPath.endsWith('.js')
      ? `plugins/${pluginName}/${fullComponentPath}`
      : `plugins/${pluginName}/${fullComponentPath}.js`;

    this.registeredViews.set(slug, {
      slug,
      pluginName,
      componentPath: fullComponentPath,
      // Component import path for Next.js (via symlink)
      importPath,
      metadata: {
        title: metadata.title || slug,
        capability: metadata.capability || 'manage_options',
        icon: metadata.icon || 'file',
        ...metadata
      }
    });

    console.log(`  ✓ Registered admin view: ${slug} -> ${pluginName}/${fullComponentPath}`);
  }

  /**
   * Get admin view information
   * @param {string} slug - View slug to look up
   * @returns {Object|null} View info or null if not found
   */
  getView(slug) {
    return this.registeredViews.get(slug) || null;
  }

  /**
   * Get all registered admin views
   * @returns {Map} Map of all registered views
   */
  getRegisteredViews() {
    return this.registeredViews;
  }

  /**
   * Check if an admin view is registered
   * @param {string} slug - View slug to check
   * @returns {boolean}
   */
  hasView(slug) {
    return this.registeredViews.has(slug);
  }

  /**
   * Activate a plugin - runs npm install, migrations, setup tasks
   * WordPress equivalent: activate_plugin()
   *
   * @param {string} pluginName - Name of the plugin to activate
   * @returns {Promise<Object>} Result object with success status
   */
  async activatePlugin(pluginName) {
    try {
      console.log(`\n🔌 Activating plugin: ${pluginName}`);

      // Find plugin in database
      const pluginContext = master.requestList.pluginContext;
      const plugin = pluginContext.Plugin.where(p => p.name == $$, pluginName).first();

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginName}`);
      }

      // Use file_path from database
      const file_path = plugin.file_path || `${pluginName}/index.js`;
      const fullPath = path.join(this.pluginsDir, file_path);

      // Require the plugin file
      const pluginModule = require(fullPath);

      // Check if plugin has activate() method
      if (typeof pluginModule.activate !== 'function') {
        console.log(`  ℹ Plugin "${pluginName}" has no activate() method, skipping activation tasks`);
        return {
          success: true,
          message: `Plugin "${pluginName}" activated (no activation tasks)`
        };
      }

      // Call plugin's activate() method
      const pluginAPI = {
        hookService: this.hookService,
        HOOKS: HOOKS,
        pluginLoader: this,
        pluginPath: path.dirname(fullPath)
      };

      const result = await pluginModule.activate(pluginAPI);

      // Regenerate Next.js plugin registry after activation
      console.log('🔄 Regenerating Next.js plugin registry...');
      registryGenerator.generateRegistry();

      return result;

    } catch (error) {
      console.error(`✗ Failed to activate plugin ${pluginName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deactivate a plugin
   * WordPress equivalent: deactivate_plugin()
   *
   * @param {string} pluginName - Name of the plugin to deactivate
   * @returns {Promise<Object>} Result object with success status
   */
  async deactivatePlugin(pluginName) {
    try {
      console.log(`\n🔌 Deactivating plugin: ${pluginName}`);

      // Find plugin in database
      const pluginContext = master.requestList.pluginContext;
      const plugin = pluginContext.Plugin.where(p => p.name == $$, pluginName).first();

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginName}`);
      }

      // Use file_path from database
      const file_path = plugin.file_path || `${pluginName}/index.js`;
      const fullPath = path.join(this.pluginsDir, file_path);

      // Require the plugin file
      const pluginModule = require(fullPath);

      // Check if plugin has deactivate() method
      if (typeof pluginModule.deactivate !== 'function') {
        console.log(`  ℹ Plugin "${pluginName}" has no deactivate() method, skipping deactivation tasks`);
        return {
          success: true,
          message: `Plugin "${pluginName}" deactivated (no deactivation tasks)`
        };
      }

      // Call plugin's deactivate() method
      const pluginAPI = {
        hookService: this.hookService,
        HOOKS: HOOKS,
        pluginLoader: this,
        pluginPath: path.dirname(fullPath)
      };

      const result = await pluginModule.deactivate(pluginAPI);

      // Regenerate Next.js plugin registry after deactivation
      console.log('🔄 Regenerating Next.js plugin registry...');
      registryGenerator.generateRegistry();

      return result;

    } catch (error) {
      console.error(`✗ Failed to deactivate plugin ${pluginName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Discover all available plugins from filesystem
   * WordPress equivalent: Scans plugin directory for valid plugins
   *
   * @returns {Array} Array of plugin metadata from plugin.json files
   */
  discoverPlugins() {
    return this.pluginDiscovery.discoverPlugins();
  }

  /**
   * Get metadata for a specific plugin
   *
   * @param {string} pluginSlug - Plugin slug/directory name
   * @returns {Object|null} Plugin metadata or null if not found
   */
  getPluginMetadata(pluginSlug) {
    return this.pluginDiscovery.getPluginMetadata(pluginSlug);
  }

  /**
   * Get plugin discovery service
   * Useful for admin interfaces that need to manage plugins
   *
   * @returns {PluginDiscovery} Plugin discovery service instance
   */
  getPluginDiscovery() {
    return this.pluginDiscovery;
  }
}

// Export singleton instance
module.exports = new PluginLoader();
