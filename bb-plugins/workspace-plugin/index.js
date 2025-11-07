/**
 * Workspace Plugin
 * Registers Workspace collaboration menu items
 *
 * Uses: Generic Hooks System
 */

/**
 * Load method - called by pluginLoader with API
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginLoader }
 */
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Register admin_menu hook using generic hooks
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add top-level Workspace menu
    context.addMenuItem({
      id: 'workspace',
      label: 'Workspaces',
      url: '/bb-admin/workspaces',
      icon: 'Users',
      position: 50
    });

    // Add submenus
    context.addSubmenuItem('workspace', {
      label: 'All',
      url: '/bb-admin/workspaces'
    });
  }, 10);
}

module.exports = { load };
