/**
 * Admin/Settings Plugin
 * Registers Settings menu items including the Manage page
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
    // Settings menu (always enabled - core functionality)
    context.addMenuItem({
      id: 'admin',
      label: 'Admin',
      url: '/bb-admin',
      icon: 'Settings',
      position: 1
    });

    // Add submenus
    context.addSubmenuItem('admin', {
      label: 'Dashboard',
      url: '/bb-admin'
    });

    context.addSubmenuItem('admin', {
      label: 'Settings',
      url: '/bb-admin/admin/settings'
    });
  }, 1); // High priority - run first
}

module.exports = { load };


