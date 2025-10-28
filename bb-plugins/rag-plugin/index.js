/**
 * RAG Plugin
 * Registers RAG (Retrieval-Augmented Generation) menu items
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

    // Add top-level RAG menu
    sidebarHook.add_menu_page({
      id: 'rag',
      label: 'RAG',
      icon: 'Database',
      capability: 'read',
      priority: 30,
      render: null
    });

    // Add submenus
    sidebarHook.add_submenu_page('rag', {
      id: 'rag-index',
      label: 'Doucument',
      path: '/bb-admin/rag/documents',
      capability: 'read',
      priority: 5
    });

    sidebarHook.add_submenu_page('rag', {
      id: 'rag-settings',
      label: 'Settings',
      path: '/bb-admin/rag/settings',
      capability: 'read', // based on role read is everyone
      priority: 10
    });

  });

}

module.exports = { load };
