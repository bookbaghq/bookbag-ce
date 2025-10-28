/**
 * Admin/Settings Plugin
 * Registers Settings menu items including the Manage page
 */

/**
 * Load method - called by pluginLoader with API
 * @param {Object} pluginAPI - { hookService, pluginLoader, sidebarHook }
 */
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  // Register admin_menu hook callback
  sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
    // Settings menu (always enabled - core functionality)
    sidebarHook.add_menu_page({
      id: 'admin',
      label: 'Admin',
      icon: 'Admin',
      capability: 'read',
      priority: 1,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('admin', {
      id: 'dashboard-general',
      label: 'Dashboard',
      path: '/bb-admin',
      capability: 'read',
      priority: 1
    });

    /* Add submenus
    sidebarHook.add_submenu_page('admin', {
      id: 'settings-general',
      label: 'Settings',
      path: '/bb-admin/admin/settings',
      capability: 'read',
      priority: 2
    });

    */


  });

}

module.exports = { load };
