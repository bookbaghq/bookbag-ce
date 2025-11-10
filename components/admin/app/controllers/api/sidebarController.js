/**
 * Sidebar Controller
 * Builds admin sidebar menu using the Generic Hooks System
 *
 * How it works:
 * 1. Fires the admin_menu hook (HOOKS.ADMIN_MENU)
 * 2. Plugins register callbacks to add menu items
 * 3. Returns sorted menu data to frontend
 *
 * Plugins add menu items via:
 * - context.addMenuItem({ id, label, url, icon, position })
 * - context.addSubmenuItem(parentId, { label, url })
 */

const master = require('mastercontroller');
const { HOOKS } = require('../../../../../components/plugins/app/core/hookConstants');

class sidebarController {
  returnJson(obj) { return obj; }

  /**
   * Get admin sidebar menu for current user
   * GET /admin/sidebar
   */
  async getSidebar(req, res) {
    try {
      // Build context with request info
      const context = {
        req,
        res,
        user: req.user || null,
        tenant: req.tenant || null,
        tenantId: req.tenantId || 'default'
      };

      // Initialize menu data
      const menu = [];
      const submenu = {};

      // Add core menu items (hardcoded - not plugin-dependent)
      // These are essential features that should always be available

      // Admin menu (position 1)
      menu.push({
        id: 'admin',
        label: 'Admin',
        url: '/bb-admin',
        icon: 'Settings',
        position: 1
      });
      submenu['admin'] = [
        {
          label: 'Dashboard',
          url: '/bb-admin'
        },
        {
          label: 'Settings',
          url: '/bb-admin/admin/settings'
        }
      ];

      // Chats menu (position 10)
      menu.push({
        id: 'chats',
        label: 'Chats',
        url: '/bb-admin/chats',
        icon: 'MessageSquare',
        position: 10
      });
      submenu['chats'] = [
        {
          label: 'Search',
          url: '/bb-admin/chats/search'
        },
        {
          label: 'Create',
          url: '/bb-admin/chats/create'
        },
        {
          label: 'Settings',
          url: '/bb-admin/chats/settings'
        }
      ];

      // Media menu (position 20)
      menu.push({
        id: 'media',
        label: 'Media',
        url: '/bb-admin/media',
        icon: 'Image',
        position: 20
      });
      submenu['media'] = [
        {
          label: 'Library',
          url: '/bb-admin/media'
        },
        {
          label: 'Settings',
          url: '/bb-admin/media/settings'
        }
      ];

      // Models menu (position 25)
      menu.push({
        id: 'models',
        label: 'Models',
        url: '/bb-admin/models',
        icon: 'Cpu',
        position: 25
      });
      submenu['models'] = [
        {
          label: 'Library',
          url: '/bb-admin/models/library'
        },
        {
          label: 'My Models',
          url: '/bb-admin/models/my-models'
        },
        {
          label: 'Settings',
          url: '/bb-admin/models/settings'
        }
      ];

      // Mail menu (position 40) - Core plugin
      menu.push({
        id: 'mail',
        label: 'Mail',
        url: '/bb-admin/mail',
        icon: 'Mail',
        position: 40
      });
      submenu['mail'] = [
        {
          label: 'Settings',
          url: '/bb-admin/mail/settings'
        },
        {
          label: 'Email Logs',
          url: '/bb-admin/mail/logs'
        }
      ];

      // Workspace menu (position 50) - Core plugin
      menu.push({
        id: 'workspace',
        label: 'Workspaces',
        url: '/bb-admin/workspaces',
        icon: 'Users',
        position: 50
      });
      submenu['workspace'] = [
        {
          label: 'All',
          url: '/bb-admin/workspaces'
        }
      ];

      // Users menu (position 60)
      menu.push({
        id: 'users',
        label: 'Users',
        url: '/bb-admin/users',
        icon: 'User',
        position: 60
      });
      submenu['users'] = [
        {
          label: 'Dashboard',
          url: '/bb-admin/users'
        },
        {
          label: 'All Users',
          url: '/bb-admin/users/all'
        },
        {
          label: 'Add New',
          url: '/bb-admin/users/add-new'
        },
        {
          label: 'Profile',
          url: '/bb-admin/users/profile'
        },
        {
          label: 'Settings',
          url: '/bb-admin/users/settings'
        }
      ];

      // Plugins menu (position 70) - Core plugin system
      menu.push({
        id: 'plugins',
        label: 'Plugins',
        url: '/bb-admin/plugins',
        icon: 'Puzzle',
        position: 70
      });
      submenu['plugins'] = [
        {
          label: 'Installed',
          url: '/bb-admin/plugins/installed'
        },
        {
          label: 'Add New',
          url: '/bb-admin/plugins/new'
        }
      ];

      // Fire admin_menu hook to allow plugins to add menu items via generic hook system
      // Plugins can modify menu/submenu objects directly in the hook callback
      const hookContext = {
        menu,
        submenu,
        context,
        // Helper methods for adding menu items
        addMenuItem: (item) => {
          menu.push(item);
        },
        addSubmenuItem: (parentId, item) => {
          if (!submenu[parentId]) {
            submenu[parentId] = [];
          }
          submenu[parentId].push(item);
        }
      };

      // Get hookService from master
      const hookService = master.requestList.hookService;
      if (hookService && hookService.hasAction(HOOKS.ADMIN_MENU)) {
        await hookService.doAction(HOOKS.ADMIN_MENU, hookContext);
      }

      // Deduplicate menu items by ID (in case plugins are loaded multiple times)
      const seenIds = new Set();
      const uniqueMenu = menu.filter(item => {
        if (seenIds.has(item.id)) {
          return false;
        }
        seenIds.add(item.id);
        return true;
      });

      // Sort menu by position (if specified)
      uniqueMenu.sort((a, b) => (a.position || 100) - (b.position || 100));

      return this.returnJson({
        success: true,
        menu: uniqueMenu,
        submenu,
        meta: {
          user: req.user ? {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          } : null,
          generated_at: Date.now()
        }
      });
    } catch (error) {
      console.error('Error building sidebar:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to build sidebar menu',
        menu: [],
        submenu: {}
      });
    }
  }

  /**
   * Get current active menu item based on current URL
   * GET /admin/sidebar/current?url=/bb-admin/rag
   */
  async getCurrentMenuItem(req, res) {
    try {
      const currentUrl = req.query.url;

      if (!currentUrl) {
        return res.status(400).json({
          success: false,
          error: 'URL parameter is required'
        });
      }

      // Build context
      const context = {
        req,
        res,
        user: req.user || null,
        tenant: req.tenant || null,
        tenantId: req.tenantId || 'default'
      };

      // Initialize menu data
      const menu = [];
      const submenu = {};

      // Build menu using hooks
      const hookContext = {
        menu,
        submenu,
        context,
        addMenuItem: (item) => menu.push(item),
        addSubmenuItem: (parentId, item) => {
          if (!submenu[parentId]) submenu[parentId] = [];
          submenu[parentId].push(item);
        }
      };

      const hookService = master.requestList.hookService;
      if (hookService && hookService.hasAction(HOOKS.ADMIN_MENU)) {
        await hookService.doAction(HOOKS.ADMIN_MENU, hookContext);
      }

      // Find matching menu item
      let currentItem = null;
      let currentParent = null;

      // Check top-level menu
      for (const item of menu) {
        if (currentUrl.startsWith(item.url) || currentUrl.includes(`page=${item.id}`)) {
          currentItem = item;
          currentParent = item;
          break;
        }
      }

      // Check submenus
      if (!currentItem) {
        for (const [parentId, subs] of Object.entries(submenu)) {
          for (const sub of subs) {
            if (currentUrl.startsWith(sub.url)) {
              currentItem = sub;
              currentParent = menu.find(m => m.id === parentId);
              break;
            }
          }
          if (currentItem) break;
        }
      }

      return res.json({
        success: true,
        currentItem,
        currentParent
      });
    } catch (error) {
      console.error('Error finding current menu item:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to find current menu item'
      });
    }
  }
}

module.exports = sidebarController;
