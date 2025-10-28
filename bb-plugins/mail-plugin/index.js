/**
 * Mail Plugin
 * Registers Email Integration menu items
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

    // Add top-level Mail menu
    sidebarHook.add_menu_page({
      id: 'mail',
      label: 'Mail',
      icon: 'Mail',
      capability: 'read',
      priority: 40,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('mail', {
      id: 'settings',
      label: 'Settings',
      path: '/bb-admin/mail/settings',
      capability: 'read',
      priority: 5
    });

    sidebarHook.add_submenu_page('mail', {
      id: 'email-logs',
      label: 'Email Logs',
      path: '/bb-admin/mail/logs',
      capability: 'read',
      priority: 10
    });


  });

}

module.exports = { load };
