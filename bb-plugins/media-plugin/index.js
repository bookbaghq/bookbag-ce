/**
 * Media Plugin
 * Registers Media Library menu items
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
    // Add top-level Media menu
    context.addMenuItem({
      id: 'media',
      label: 'Media',
      url: '/bb-admin/media',
      icon: 'Image',
      position: 20
    });

    // Add submenus
    context.addSubmenuItem('media', {
      label: 'Library',
      url: '/bb-admin/media'
    });

    context.addSubmenuItem('media', {
      label: 'Settings',
      url: '/bb-admin/media/settings'
    });
  }, 10);
}

module.exports = { load };
