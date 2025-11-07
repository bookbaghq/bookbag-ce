/**
 * Mail Plugin
 * Registers Email Integration menu items
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
    // Add top-level Mail menu
    context.addMenuItem({
      id: 'mail',
      label: 'Mail',
      url: '/bb-admin/mail',
      icon: 'Mail',
      position: 40
    });

    // Add submenus
    context.addSubmenuItem('mail', {
      label: 'Settings',
      url: '/bb-admin/mail/settings'
    });

    context.addSubmenuItem('mail', {
      label: 'Email Logs',
      url: '/bb-admin/mail/logs'
    });
  }, 10);
}

module.exports = { load };
