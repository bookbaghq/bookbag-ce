/**
 * User Plugin
 * Registers User Management menu items
 *
 * Uses: Generic Hooks System
 */

/**
 * Load method - called by pluginLoader with API
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginLoader }
 */
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;
  const master = require('mastercontroller');

  // Register admin_menu hook using generic hooks
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add top-level Users menu
    context.addMenuItem({
      id: 'users',
      label: 'Users',
      url: '/bb-admin/users',
      icon: 'User',
      position: 60
    });

    // Add submenus
    context.addSubmenuItem('users', {
      label: 'Dashboard',
      url: '/bb-admin/users'
    });

    context.addSubmenuItem('users', {
      label: 'All Users',
      url: '/bb-admin/users/all'
    });

    context.addSubmenuItem('users', {
      label: 'Add New',
      url: '/bb-admin/users/add-new'
    });

    context.addSubmenuItem('users', {
      label: 'Profile',
      url: '/bb-admin/users/profile'
    });

    context.addSubmenuItem('users', {
      label: 'Settings',
      url: '/bb-admin/users/settings'
    });
  }, 10);
}

module.exports = { load };
