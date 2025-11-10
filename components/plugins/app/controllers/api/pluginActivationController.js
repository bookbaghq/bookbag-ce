/**
 * Plugin Activation Controller
 * API endpoints for activating/deactivating plugins (WordPress-style)
 *
 * WordPress Equivalent: wp-admin/plugins.php?action=activate&plugin=...
 */

const master = require('mastercontroller');

class pluginActivationController {

  constructor(req) {
    this._currentUser = req.authService.currentUser(req.request, req.userContext);
    this._pluginContext = req.pluginContext;
  }

  returnJson(obj) {
    return obj;
  }

  /**
   * Activate a plugin - runs npm install, migrations, setup
   * POST /api/plugins/activate
   * Body: { name: 'rag-plugin' }
   */
  async activatePlugin(req, res) {
    try {

      const pluginName = req.params?.formData.name;

      if (!pluginName) {
        console.log('pluginName is falsy:', pluginName);
        return this.returnJson({
          success: false,
          error: 'Missing plugin name'
        });
      }

      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available'
        });
      }

      // Run the plugin's activate() method
      const result = await pluginLoader.activatePlugin(pluginName);

      return this.returnJson(result);

    } catch (error) {
      console.error('Error activating plugin:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Deactivate a plugin
   * POST /api/plugins/deactivate
   * Body: { name: 'rag-plugin' }
   */
  async deactivatePlugin(req, res) {
    try {
      const pluginName = req.body?.name;

      if (!pluginName) {
        return this.returnJson({
          success: false,
          error: 'Missing plugin name'
        });
      }

      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available'
        });
      }

      // Run the plugin's deactivate() method
      const result = await pluginLoader.deactivatePlugin(pluginName);

      return this.returnJson(result);

    } catch (error) {
      console.error('Error deactivating plugin:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List all plugins (installed and available)
   * GET /api/plugins/list
   *
   * Returns plugins from database only (not filesystem scanning)
   */
  async listPlugins(req, res) {
    try {
      // Get all plugins from database only (not filesystem)
      const plugins = this._pluginContext.Plugin.toList();

      // Convert is_active from number to boolean for consistency
      const pluginList = plugins.map(plugin => ({
        slug: plugin.name,
        name: plugin.label,
        description: plugin.description || '',
        version: plugin.version || '1.0.0',
        author: plugin.author || '',
        icon: plugin.icon || 'Package',
        category: plugin.category || 'plugin',
        priority: plugin.priority || 10,
        is_active: plugin.is_active === 1,
        is_broken: plugin.is_broken === 1,
        last_error: plugin.last_error,
        error_count: plugin.error_count || 0,
        created_at: plugin.created_at,
        updated_at: plugin.updated_at
      }));

      return this.returnJson({
        success: true,
        plugins: pluginList,
        count: pluginList.length
      });

    } catch (error) {
      console.error('Error listing plugins:', error);
      return this.returnJson({
        success: false,
        error: error.message,
        plugins: []
      });
    }
  }

  /**
   * Get plugin README.md content
   * GET /api/plugins/readme?name=plugin-slug
   */
  async getPluginReadme(req, res) {
    try {
      const pluginName = req.params.query?.name;

      if (!pluginName) {
        return this.returnJson({
          success: false,
          error: 'Missing plugin name'
        });
      }

      // Get plugin from database
      const plugin = this._pluginContext.Plugin.where(r => r.name == $$,pluginName).single();

      if (!plugin) {
        return this.returnJson({
          success: false,
          error: 'Plugin not found'
        });
      }

      // Extract plugin directory from file_path
      // file_path format: /plugin-slug/index.js
      const pathParts = plugin.file_path.split('/').filter(Boolean);
      const pluginDir = pathParts[0];

      // Construct path to README.md
      const path = require('path');
      const fs = require('fs');

      const pluginPath = path.join(__dirname, '../../../../../bb-plugins', pluginDir);
      const readmePath = path.join(pluginPath, 'README.md');

      // Check if README.md exists
      if (!fs.existsSync(readmePath)) {
        return this.returnJson({
          success: true,
          hasReadme: false,
          plugin: {
            name: plugin.label,
            slug: plugin.name,
            version: plugin.version
          }
        });
      }

      // Read README.md content
      const readmeContent = fs.readFileSync(readmePath, 'utf8');

      return this.returnJson({
        success: true,
        hasReadme: true,
        content: readmeContent,
        plugin: {
          name: plugin.label,
          slug: plugin.name,
          version: plugin.version,
          author: plugin.author,
          description: plugin.description
        }
      });

    } catch (error) {
      console.error('Error getting plugin README:', error);
      return this.returnJson({
        success: false,
        error: error.message || 'Failed to get plugin README'
      });
    }
  }

  /**
   * Delete a plugin
   * DELETE /api/plugins/delete
   * Body: { pluginName: 'rag-plugin' }
   */
  async deletePlugin(req, res) {
    try {
      const pluginName = req.body?.pluginName;

      if (!pluginName) {
        return this.returnJson({
          success: false,
          error: 'Missing plugin name'
        });
      }

      // TODO: Implement plugin deletion in pluginLoader
      return this.returnJson({
        success: false,
        error: 'Plugin deletion is not yet implemented'
      });

    } catch (error) {
      console.error('Error deleting plugin:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get active plugins with their bundle information for runtime loading
   * GET /api/plugins/active
   *
   * Returns only active plugins with paths to their precompiled bundles (admin.js, client.js)
   * for dynamic runtime loading (PayloadCMS/Keystone-style)
   */
  async getActivePluginBundles(req, res) {
    try {
      const path = require('path');
      const fs = require('fs');
      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available',
          plugins: []
        });
      }

      // Get active plugins from database
      const activePlugins = pluginLoader.getActivePlugins();

      // Discover all plugins to get their metadata
      const allPlugins = pluginLoader.discoverPlugins();

      // Build response with bundle information
      const pluginsWithBundles = [];

      for (const activePlugin of activePlugins) {
        // Find the plugin metadata from filesystem
        const pluginMeta = allPlugins.find(p => p.slug === activePlugin.name);

        if (!pluginMeta) {
          console.warn(`Active plugin "${activePlugin.name}" not found in filesystem`);
          continue;
        }

        // Check for bundle files
        const pluginPath = path.join(__dirname, '../../../../../bb-plugins', pluginMeta.slug);
        const distPath = path.join(pluginPath, 'dist');

        const bundles = {};

        // Check for admin bundle
        const adminBundlePath = path.join(distPath, 'admin.js');
        if (fs.existsSync(adminBundlePath)) {
          bundles.admin = `/bb-plugins/${pluginMeta.slug}/dist/admin.js`;
        }

        // Check for client bundle
        const clientBundlePath = path.join(distPath, 'client.js');
        if (fs.existsSync(clientBundlePath)) {
          bundles.client = `/bb-plugins/${pluginMeta.slug}/dist/client.js`;
        }

        // Only include plugins that have at least one bundle
        if (Object.keys(bundles).length > 0) {
          pluginsWithBundles.push({
            slug: pluginMeta.slug,
            name: pluginMeta.name,
            version: pluginMeta.version,
            description: pluginMeta.description,
            category: pluginMeta.category,
            icon: pluginMeta.icon,
            bundles
          });
        }
      }

      return this.returnJson({
        success: true,
        plugins: pluginsWithBundles,
        count: pluginsWithBundles.length
      });

    } catch (error) {
      console.error('Error getting active plugin bundles:', error);
      return this.returnJson({
        success: false,
        error: error.message,
        plugins: []
      });
    }
  }
}

module.exports = pluginActivationController;
