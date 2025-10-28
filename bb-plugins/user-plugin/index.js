/**
 * User Plugin
 * Registers User Management menu items
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

    // Add top-level Users menu
    sidebarHook.add_menu_page({
      id: 'users',
      label: 'Users',
      icon: 'User',
      capability: 'read',
      priority: 60,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('users', {
      id: 'users-dashboard',
      label: 'Dashboard',
      path: '/bb-admin/users',
      capability: 'read',
      priority: 5
    });

    sidebarHook.add_submenu_page('users', {
      id: 'all-users',
      label: 'All Users',
      path: '/bb-admin/users/all',
      capability: 'read',
      priority: 10
    });

    sidebarHook.add_submenu_page('users', {
      id: 'add-new',
      label: 'Add New',
      path: '/bb-admin/users/add-new',
      capability: 'read',
      priority: 15
    });

    sidebarHook.add_submenu_page('users', {
      id: 'users-profile',
      label: 'Profile',
      path: '/bb-admin/users/profile',
      capability: 'read',
      priority: 20
    });

    sidebarHook.add_submenu_page('users', {
      id: 'users-settings',
      label: 'Settings',
      path: '/bb-admin/users/settings',
      capability: 'read',
      priority: 15
    });

  });

}

module.exports = { load };
