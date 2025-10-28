/**
 * Model Plugin
 * Registers AI Models menu items
 */

const MasterRecord = require('masterrecord');


/**
 * Load method - called by pluginLoader with API
 * @param {Object} pluginAPI - { hookService, pluginLoader, sidebarHook }
 */
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  // Register admin_menu hook callback
  sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {

    // Add top-level Models menu
    sidebarHook.add_menu_page({
      id: 'models',
      label: 'Models',
      icon: 'Cpu',
      capability: 'read',
      priority: 25,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('models', {
      id: 'models-library',
      label: 'Library',
      path: '/bb-admin/models/library',
      capability: 'read',
      priority: 5
    });

    sidebarHook.add_submenu_page('models', {
      id: 'models-my-models',
      label: 'My Models',
      path: '/bb-admin/models/my-models',
      capability: 'read',
      priority: 10
    });

    sidebarHook.add_submenu_page('models', {
      id: 'models-settings',
      label: 'Settings',
      path: '/bb-admin/models/settings',
      capability: 'read', // based on role read is everyone
      priority: 15
    });

  });

}

module.exports = { load };
