/**
 * Model Plugin
 * Registers AI Models menu items
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
    // Add top-level Models menu
    context.addMenuItem({
      id: 'models',
      label: 'Models',
      url: '/bb-admin/models',
      icon: 'Cpu',
      position: 25
    });

    // Add submenus
    context.addSubmenuItem('models', {
      label: 'Library',
      url: '/bb-admin/models/library'
    });

    context.addSubmenuItem('models', {
      label: 'My Models',
      url: '/bb-admin/models/my-models'
    });

    context.addSubmenuItem('models', {
      label: 'Settings',
      url: '/bb-admin/models/settings'
    });
  }, 10);
}

module.exports = { load };
