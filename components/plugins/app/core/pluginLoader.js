/**
 * Plugin Loader - Main Plugin System API
 *
 * This is the central plugin system that manages:
 * - Loading active plugins from database
 * - Registering hook systems (and future subsystems)
 * - Providing unified API for controllers
 *
 * Controllers access registered subsystems via this loader:
 * - pluginLoader.sidebarHook.getMenu()
 * - pluginLoader.sidebarHook.getSubMenu()
 * - Future: pluginLoader.widgets, pluginLoader.filters, etc.
 */

const path = require('path');
const master = require('mastercontroller');
const hookService = require('./hookRegistration');

class PluginLoader {
  constructor() {
    this.pluginsDir = path.join(__dirname, '../../../../bb-plugins');
    this.loadedPlugins = [];
    this.registeredHooks = new Map();
    this.hookService = hookService; // Make hookService available to registered hooks
  }

  /**
   * Register a hook system with the plugin loader
   * Makes the hook accessible as a property on the loader
   * Example: pluginLoader.hook(sidebarHook) → access via pluginLoader.sidebarHook
   *
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

    console.log(`  ✓ Registered hook system: ${hookName}`);
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
          sidebarHook: this.sidebarHook
        };

        // Call the method specified in database
        plugin[method_name_to_load](pluginAPI);

        this.loadedPlugins.push(file_path);
        console.log(`  ✓ ${name} loaded successfully via ${method_name_to_load}()`);
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
}

// Export singleton instance
module.exports = new PluginLoader();
