/**
 * Media Plugin
 * Registers Media Library menu items
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


    // Add top-level Media menu
    sidebarHook.add_menu_page({
      id: 'media',
      label: 'Media',
      icon: 'Image',
      capability: 'read',
      priority: 20,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('media', {
      id: 'media-library',
      label: 'Library',
      path: '/bb-admin/media',
      capability: 'read',
      priority: 5
    });


    sidebarHook.add_submenu_page('media', {
      id: 'media-settings',
      label: 'Settings',
      path: '/bb-admin/media/settings',
      capability: 'read',
      priority: 15
    });
  });

}

module.exports = { load };
