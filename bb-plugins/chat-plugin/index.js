/**
 * Chat Plugin
 * Registers Chat/Conversations menu items
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
    // Add top-level Chat menu
    context.addMenuItem({
      id: 'chats',
      label: 'Chats',
      url: '/bb-admin/chats',
      icon: 'MessageSquare',
      position: 10
    });

    // Add submenus
    context.addSubmenuItem('chats', {
      label: 'Search',
      url: '/bb-admin/chats/search'
    });

    context.addSubmenuItem('chats', {
      label: 'Create',
      url: '/bb-admin/chats/create'
    });

    context.addSubmenuItem('chats', {
      label: 'Settings',
      url: '/bb-admin/chats/settings'
    });
  }, 10);
}

module.exports = { load };
