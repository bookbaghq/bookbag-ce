/**
 * Plugin Management API Controller
 * Handles plugin CRUD operations and activation/deactivation with rebuild
 */

const master = require('mastercontroller');
const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

class PluginManagementController {
  /**
   * List all plugins from database
   * GET /api/plugins/list
   */
  async listPlugins(req, res) {
    try {
      const pluginContext = master.requestList.pluginContext;

      if (!pluginContext) {
        return res.status(500).json({
          success: false,
          error: 'Plugin context not initialized'
        });
      }

      // Get all plugins (both active and inactive)
      const plugins = pluginContext.Plugin
        .orderBy(p => p.priority)
        .toList();

      return res.json({
        success: true,
        plugins: plugins.map(p => ({
          id: p.id,
          name: p.name,
          label: p.label,
          description: p.description,
          version: p.version,
          author: p.author,
          icon: p.icon,
          category: p.category,
          is_active: p.is_active == "1",
          priority: p.priority,
          file_path: p.file_path,
          created_at: p.created_at,
          updated_at: p.updated_at
        }))
      });

    } catch (error) {
      console.error('Error listing plugins:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Activate a plugin and trigger rebuild
   * POST /api/plugins/activate
   * Body: { pluginName: string }
   */
  async activatePlugin(req, res) {
    try {
      const { pluginName } = req.body;

      if (!pluginName) {
        return res.status(400).json({
          success: false,
          error: 'pluginName is required'
        });
      }

      const pluginContext = master.requestList.pluginContext;
      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginContext || !pluginLoader) {
        return res.status(500).json({
          success: false,
          error: 'Plugin system not initialized'
        });
      }

      // Find the plugin
      const plugin = pluginContext.Plugin
        .where(p => p.name == $$, pluginName)
        .single();

      if (!plugin) {
        return res.status(404).json({
          success: false,
          error: `Plugin not found: ${pluginName}`
        });
      }

      // Check if already active
      if (plugin.is_active == "1") {
        return res.json({
          success: true,
          message: `Plugin "${pluginName}" is already active`,
          alreadyActive: true
        });
      }

      // Update database - set is_active to true
      plugin.is_active = "1";
      plugin.updated_at = Date.now().toString();
      plugin.save();

      console.log(`✓ Plugin "${pluginName}" activated in database`);

      // Run plugin activation hook
      const activationResult = await pluginLoader.activatePlugin(pluginName);

      if (!activationResult.success) {
        console.error(`⚠ Plugin activation hook failed:`, activationResult.error);
        // Continue anyway - the plugin is marked active
      }

      // Trigger rebuild process
      console.log('🔄 Starting rebuild process...');
      const rebuildResult = await this.triggerRebuild();

      return res.json({
        success: true,
        message: `Plugin "${pluginName}" activated successfully`,
        plugin: {
          name: pluginName,
          is_active: true
        },
        rebuild: rebuildResult
      });

    } catch (error) {
      console.error('Error activating plugin:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Deactivate a plugin and trigger rebuild
   * POST /api/plugins/deactivate
   * Body: { pluginName: string }
   */
  async deactivatePlugin(req, res) {
    try {
      const { pluginName } = req.body;

      if (!pluginName) {
        return res.status(400).json({
          success: false,
          error: 'pluginName is required'
        });
      }

      const pluginContext = master.requestList.pluginContext;
      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginContext || !pluginLoader) {
        return res.status(500).json({
          success: false,
          error: 'Plugin system not initialized'
        });
      }

      // Find the plugin
      const plugin = pluginContext.Plugin
        .where(p => p.name == $$, pluginName)
        .single();

      if (!plugin) {
        return res.status(404).json({
          success: false,
          error: `Plugin not found: ${pluginName}`
        });
      }

      // Check if already inactive
      if (plugin.is_active == "0") {
        return res.json({
          success: true,
          message: `Plugin "${pluginName}" is already inactive`,
          alreadyInactive: true
        });
      }

      // Update database - set is_active to false
      plugin.is_active = "0";
      plugin.updated_at = Date.now().toString();
      plugin.save();

      console.log(`✓ Plugin "${pluginName}" deactivated in database`);

      // Run plugin deactivation hook
      const deactivationResult = await pluginLoader.deactivatePlugin(pluginName);

      if (!deactivationResult.success) {
        console.error(`⚠ Plugin deactivation hook failed:`, deactivationResult.error);
        // Continue anyway - the plugin is marked inactive
      }

      // Trigger rebuild process
      console.log('🔄 Starting rebuild process...');
      const rebuildResult = await this.triggerRebuild();

      return res.json({
        success: true,
        message: `Plugin "${pluginName}" deactivated successfully`,
        plugin: {
          name: pluginName,
          is_active: false
        },
        rebuild: rebuildResult
      });

    } catch (error) {
      console.error('Error deactivating plugin:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete a plugin
   * DELETE /api/plugins/delete
   * Body: { pluginName: string }
   */
  async deletePlugin(req, res) {
    try {
      const { pluginName } = req.body;

      if (!pluginName) {
        return res.status(400).json({
          success: false,
          error: 'pluginName is required'
        });
      }

      const pluginContext = master.requestList.pluginContext;

      if (!pluginContext) {
        return res.status(500).json({
          success: false,
          error: 'Plugin context not initialized'
        });
      }

      // Find the plugin
      const plugin = pluginContext.Plugin
        .where(p => p.name == $$, pluginName)
        .single();

      if (!plugin) {
        return res.status(404).json({
          success: false,
          error: `Plugin not found: ${pluginName}`
        });
      }

      // Deactivate first if active
      if (plugin.is_active == "1") {
        console.log(`  Deactivating plugin before deletion...`);
        plugin.is_active = "0";
        plugin.save();
      }

      // Delete from database
      plugin.delete();

      console.log(`✓ Plugin "${pluginName}" deleted from database`);

      // Trigger rebuild to remove from registry
      console.log('🔄 Starting rebuild process...');
      const rebuildResult = await this.triggerRebuild();

      return res.json({
        success: true,
        message: `Plugin "${pluginName}" deleted successfully`,
        rebuild: rebuildResult
      });

    } catch (error) {
      console.error('Error deleting plugin:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get registered client components by usage type
   * GET /api/plugins/components?usage=sidebar-left
   */
  async getClientComponents(req, res) {
    try {
      const { usage } = req.query;
      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return res.status(500).json({
          success: false,
          error: 'Plugin loader not initialized'
        });
      }

      let components = [];

      // Get all registered client components
      const registeredComponents = pluginLoader.getRegisteredClientComponents();

      for (const [name, info] of registeredComponents.entries()) {
        // Filter by usage if specified
        if (!usage || (info.metadata && info.metadata.usage === usage)) {
          components.push({
            name,
            pluginName: info.pluginName,
            importPath: info.importPath,
            metadata: info.metadata || {}
          });
        }
      }

      return res.json({
        success: true,
        components,
        count: components.length
      });

    } catch (error) {
      console.error('Error getting client components:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Trigger the rebuild process:
   * 1. Restart backend server (regenerates registry)
   * 2. Rebuild Next.js frontend
   * 3. Restart frontend (if using pm2 or similar)
   */
  async triggerRebuild() {
    try {
      const rootDir = path.join(__dirname, '../../../../');
      const nextjsDir = path.join(rootDir, 'nextjs-app');

      // Runtime plugin loading: No rebuild needed
      // Plugins are loaded dynamically at runtime via pluginLoader.js

      return {
        success: true,
        message: 'Plugin changes applied - no rebuild required',
        note: 'Plugins are loaded at runtime. Changes are immediately available.'
      };

    } catch (error) {
      console.error('Error triggering rebuild:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new PluginManagementController();
