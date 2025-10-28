/**
 * Chat Plugin
 * Registers Chat/Conversations menu items
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


    // Add top-level Chat menu
    sidebarHook.add_menu_page({
      id: 'chats',
      label: 'Chats',
      icon: 'MessageSquare',
      capability: 'read',
      priority: 10,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('chats', {
      id: 'chats-search',
      label: 'Search',
      path: 'bb-admin/chats/search',
      capability: 'read',
      priority: 5
    });

    sidebarHook.add_submenu_page('chats', {
      id: 'chats-new',
      label: 'Create',
      path: 'bb-admin/chats/create',
      capability: 'read',
      priority: 10
    });

  });

}

module.exports = { load };
