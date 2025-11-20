/**
 * API Component Initializer
 * Registers admin menu items via the generic hook system
 */

const master = require('mastercontroller');
const { HOOKS } = require('../../../plugins/app/core/hookConstants');

// Register admin menu items for API Management
const hookService = master.requestList.hookService;

if (hookService) {
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add API Management menu item (position 30 - between Models and Mail)
    context.addMenuItem({
      id: 'api',
      label: 'API Management',
      url: '/bb-admin/api',
      icon: 'Key',
      position: 30
    });

    // Add submenu items for API Management
    context.addSubmenuItem('api', {
      label: 'API Keys',
      url: '/bb-admin/api/keys'
    });

    context.addSubmenuItem('api', {
      label: 'Sessions',
      url: '/bb-admin/api/sessions'
    });

    context.addSubmenuItem('api', {
      label: 'Settings',
      url: '/bb-admin/api/settings'
    });
  });

  console.log('[API Component] Admin menu items registered');
}

module.exports = {};
