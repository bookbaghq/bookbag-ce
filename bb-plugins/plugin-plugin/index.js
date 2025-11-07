/**
 * Plugin Management Plugin
 * A plugin that manages other plugins - provides CRUD operations and admin UI
 */

/**
 * Load method - called by pluginLoader with API
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginLoader, registerView, registerClientComponent }
 */
function load(pluginAPI) {
  const { hookService, HOOKS, pluginLoader } = pluginAPI;
  const path = require('path');
  const master = require('mastercontroller');

  // Register this plugin directory as a component so MasterController can find controllers
  // This allows the routes to resolve "api/pluginActivation#method" to this plugin's controllers
  try {
    console.log('  ✓ Registering Plugin Management plugin as MasterController component');
    master.component("bb-plugins", "plugin-plugin");
  } catch (error) {
    console.error('  ✗ Failed to register plugin as component:', error.message);
  }

  // Load routes
  try {
    const routesPath = path.join(__dirname, 'config', 'routes.js');
    console.log('  ✓ Loading Plugin Management routes from:', routesPath);
    require(routesPath);
    console.log('  ✓ Plugin Management routes registered successfully');
  } catch (error) {
    console.error('  ✗ Failed to load routes:', error.message);
  }

  // Register the "Installed Plugins" admin view (must be in load, not activate)
  // This ensures the plugin management UI is always available
  try {
    pluginLoader.registerView(
      'plugins-installed',
      'pages/admin/plugins/installed/page',
      'plugin-plugin',
      {
        title: 'Installed Plugins',
        label: 'Installed',
        description: 'View and manage installed plugins',
        capability: 'manage_options',
        icon: 'puzzle',
        menuGroup: 'Plugins',
        menuIcon: '🔌',
        menuOrder: 1,
        permissions: ['admin']
      }
    );
    console.log('  ✓ Registered "Installed Plugins" admin view');
  } catch (error) {
    console.error('  ✗ Failed to register view:', error.message);
  }

  // Register admin menu with submenu
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add parent menu item
    context.addMenuItem({
      id: 'plugins',
      label: 'Plugins',
      url: '/bb-admin/plugins',
      icon: 'Puzzle',
      position: 90
    });

    // Add submenu item for "Installed" plugins
    context.addSubmenuItem('plugins', {
      label: 'Installed',
      url: '/bb-admin/plugin/plugins-installed'
    });
  });
}

module.exports = {
  load,

  /**
   * Plugin activation hook
   * Called when the plugin is activated
   * Note: View registration happens in load() to ensure it's always available
   */
  async activate(pluginAPI) {
    console.log('✓ Plugin Management Plugin activated');

    return {
      success: true,
      message: 'Plugin Management Plugin activated successfully. View is already registered in load().'
    };
  },

  /**
   * Plugin deactivation hook
   * Called when the plugin is deactivated
   */
  async deactivate(pluginAPI) {
    console.log('✓ Plugin Management Plugin deactivated');

    // Unregister views
    pluginAPI.unregisterView('plugins-installed');

    return {
      success: true,
      message: 'Plugin Management Plugin deactivated successfully'
    };
  }
};
