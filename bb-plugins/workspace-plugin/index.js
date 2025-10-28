/**
 * Workspace Plugin
 * Registers Workspace collaboration menu items
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


    // Add top-level Workspace menu
    sidebarHook.add_menu_page({
      id: 'workspace',
      label: 'Workspaces',
      icon: 'Users',
      capability: 'read',
      priority: 50,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('workspace', {
      id: 'workspace-list',
      label: 'All',
      path: '/bb-admin/workspaces',
      capability: 'read',
      priority: 5
    });

  });

}

module.exports = { load };
