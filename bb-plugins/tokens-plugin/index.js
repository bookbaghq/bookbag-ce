/**
 * Tokens Plugin
 * Registers Token Analytics menu items
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

    // Add top-level Tokens menu
    sidebarHook.add_menu_page({
      id: 'tokens',
      label: 'Tokens',
      icon: 'Activity',
      capability: 'read',
      priority: 35,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('tokens', {
      id: 'tokens-analytics',
      label: 'Analytics',
      path: '/bb-admin/tokens/analytics',
      capability: 'read',
      priority: 5
    });

  });

}

module.exports = { load };
