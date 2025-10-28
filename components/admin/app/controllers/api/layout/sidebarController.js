/**
 * Sidebar Controller
 * Builds admin sidebar menu using the pluginLoader API
 *
 * Controller access pattern:
 * - pluginLoader.sidebarHook.getMenu(context)
 * - pluginLoader.sidebarHook.getSubMenu(context)
 * - pluginLoader.sidebarHook.getAllMenus(context)
 */

const master = require('mastercontroller');

class SidebarController {
  /**
   * Get admin sidebar menu for current user
   * GET /admin/sidebar
   */
  async getSidebar(req, res) {
    try {
      // Get pluginLoader from request or master
      const pluginLoader = req.pluginLoader || master.pluginLoader;

      if (!pluginLoader) {
        console.error('Plugin loader not available');
        return res.status(500).json({
          success: false,
          error: 'Plugin system not initialized',
          menu: [],
          submenu: {}
        });
      }

      // Build context with request info
      const context = {
        req,
        res,
        user: req.user || null,
        tenant: req.tenant || null,
        tenantId: req.tenantId || 'default'
      };

      // Get all menu data via pluginLoader
      const { menu, submenu } = await pluginLoader.sidebarHook.getAllMenus(context);

      return this.returnJson({
        success: true,
        menu,
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
      // Get pluginLoader from request or master
      const pluginLoader = req.pluginLoader || master.pluginLoader;

      if (!pluginLoader) {
        console.error('Plugin loader not available');
        return res.status(500).json({
          success: false,
          error: 'Plugin system not initialized'
        });
      }

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

      // Get all menu data
      const { menu, submenu } = await pluginLoader.sidebarHook.getAllMenus(context);

      // Find matching menu item
      let currentItem = null;
      let currentParent = null;

      // Check top-level menu
      for (const item of menu) {
        if (currentUrl.startsWith(item.url) || currentUrl.includes(`page=${item.slug}`)) {
          currentItem = item;
          currentParent = item;
          break;
        }
      }

      // Check submenus
      if (!currentItem) {
        for (const [parentId, subs] of Object.entries(submenu)) {
          for (const sub of subs) {
            if (currentUrl.startsWith(sub.url) || currentUrl.includes(`subpage=${sub.slug}`)) {
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

module.exports = SidebarController;
