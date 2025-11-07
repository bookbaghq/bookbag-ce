/**
 * Plugin Activation Controller
 * API endpoints for activating/deactivating plugins (WordPress-style)
 *
 * WordPress Equivalent: wp-admin/plugins.php?action=activate&plugin=...
 */

const master = require('mastercontroller');

class pluginActivationController {
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
   */
  async listPlugins(req, res) {
    try {
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

      // Discover all plugins from filesystem
      const allPlugins = pluginLoader.discoverPlugins();

      // Mark which plugins are active
      // Note: Database uses 'name' for directory name, filesystem uses 'slug' for directory name
      const plugins = allPlugins.map(plugin => ({
        ...plugin,
        is_active: activePlugins.some(ap => ap.name === plugin.slug)
      }));

      return this.returnJson({
        success: true,
        plugins,
        count: plugins.length
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
}

module.exports = pluginActivationController;
