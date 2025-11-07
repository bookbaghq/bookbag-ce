/**
 * Tokens Plugin
 * Registers Token Analytics menu items
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
    // Add top-level Tokens menu
    context.addMenuItem({
      id: 'tokens',
      label: 'Tokens',
      url: '/bb-admin/tokens',
      icon: 'Activity',
      position: 35
    });

    // Add submenus
    context.addSubmenuItem('tokens', {
      label: 'Analytics',
      url: '/bb-admin/tokens/analytics'
    });
  }, 10);
}

module.exports = { load };
