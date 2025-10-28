/**
 * Sidebar Hook System
 *
 * Manages the admin sidebar menu system
 * Controllers access this via: pluginLoader.sidebarHook.getMenu()
 *
 * WordPress-style API for plugins:
 * - add_menu_page() - Add top-level menu
 * - add_submenu_page() - Add submenu
 * - onAdminMenu() - Register callback for admin_menu hook
 */

const hookService = require('../core/hookRegistration');

class SidebarHook {
  constructor() {
    this.name = 'sidebarHook'; // Used by pluginLoader.hook(sidebarHook)
    this.currentMenu = [];
    this.currentSubmenu = {};

    // Register the admin_menu hook
    hookService.registerHook('admin_menu', 'Fires when building the admin sidebar menu');
    console.log('  ✓ Sidebar hook initialized');
  }

  /**
   * Reset menu data (called before firing hooks)
   * @private
   */
  _resetMenu() {
    this.currentMenu = [];
    this.currentSubmenu = {};
  }

  /**
   * Add a top-level menu page
   * WordPress equivalent: add_menu_page()
   *
   * @param {Object} menuItem - Menu item configuration
   */
  add_menu_page(menuItem) {
    const {
      id,
      label,
      path,
      icon = null,
      capability = 'read',
      priority = 10,
      render = null
    } = menuItem;

    if (!id || !label) {
      console.warn('add_menu_page: id and label are required');
      return;
    }

    // If no path provided, WordPress will auto-generate: admin.php?page={id}
    this.currentMenu.push({
      id,
      label,
      path: path || null, // null = auto-generate URL later using id as slug
      icon,
      capability,
      priority,
      render
    });

    // Sort menu by priority
    this.currentMenu.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add a submenu page
   * WordPress equivalent: add_submenu_page()
   *
   * @param {string} parentId - Parent menu ID
   * @param {Object} menuItem - Submenu item configuration
   */
  add_submenu_page(parentId, menuItem) {
    const {
      id,
      label,
      path,
      capability = 'read',
      priority = 10
    } = menuItem;

    if (!parentId || !id || !label) {
      console.warn('add_submenu_page: parentId, id, and label are required');
      return;
    }

    if (!this.currentSubmenu[parentId]) {
      this.currentSubmenu[parentId] = [];
    }

    // If no path provided, WordPress will auto-generate: admin.php?page={parent}&subpage={id}
    // Store null to indicate auto-generation needed later
    this.currentSubmenu[parentId].push({
      id,
      label,
      path: path || null, // null = auto-generate URL later
      capability,
      priority
    });

    // Sort submenu by priority
    this.currentSubmenu[parentId].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register a callback for the admin_menu hook
   * WordPress equivalent: add_action('admin_menu', callback)
   *
   * @param {Function} callback - Function to call when admin_menu fires
   */
  onAdminMenu(callback) {
    hookService.addAction('admin_menu', callback, 10);
  }

  /**
   * Check if user has capability
   * @param {Object} user - User object
   * @param {string} capability - Required capability
   * @returns {boolean}
   */
  userHasCapability(user, capability) {
    if (!user) return false;
    if (!capability || capability === 'read') return true;

    // Admin and super_admin have all capabilities
    if (user.role === 'admin' || user.role === 'super_admin') return true;

    // Check specific capabilities
    if (user.capabilities && Array.isArray(user.capabilities)) {
      return user.capabilities.includes(capability);
    }

    return false;
  }

  /**
   * Filter menu items by user capabilities
   * @param {Array} menuItems - Menu items to filter
   * @param {Object} user - User object
   * @returns {Array} Filtered menu items
   */
  filterByCapability(menuItems, user) {
    return menuItems.filter(item => this.userHasCapability(user, item.capability));
  }

  /**
   * Generate WordPress-style URL from slug
   * WordPress URL Generation Logic:
   * - If slug ends with .php → /bb-admin/{slug}
   * - If custom slug with parent → /bb-admin/admin.php?page={parent}&subpage={slug}
   * - If custom slug without parent → /bb-admin/admin.php?page={slug}
   *
   * @param {string} slug - Menu slug (or id if no path provided)
   * @param {string} parentSlug - Parent menu slug (for submenus)
   * @returns {string} Generated URL
   */
  generateUrl(slug, parentSlug = null) {
    // Case 1: Full path like "edit.php" - use directly
    if (slug.endsWith('.php')) {
      return `/bb-admin/${slug}`;
    }

    // Case 2: Custom submenu slug - use admin.php?page={parent}&subpage={slug}
    if (parentSlug) {
      return `/bb-admin/admin.php?page=${parentSlug}&subpage=${slug}`;
    }

    // Case 3: Custom top-level slug - use admin.php?page={slug}
    return `/bb-admin/admin.php?page=${slug}`;
  }

  /**
   * Add URLs to menu items
   * WordPress-style URL generation:
   * - If path is provided, use it as-is
   * - If path is null/undefined, use id as slug and generate WordPress URL
   *
   * @param {Array} menuItems - Menu items
   * @param {Object} submenuItems - Submenu items
   * @returns {Object} Menu with URLs
   */
  addUrls(menuItems, submenuItems) {
    // Helper to normalize path - ensures leading slash
    const normalizePath = (path) => {
      if (!path) return path;
      // If it doesn't start with '/' and doesn't end with '.php', add leading '/'
      if (!path.startsWith('/') && !path.endsWith('.php')) {
        return '/' + path;
      }
      return path;
    };

    // Process top-level menu items
    const menu = menuItems.map(item => {
      // Use path if provided, otherwise use id as slug
      const slug = item.path || item.id;
      const normalizedPath = normalizePath(item.path);
      return {
        ...item,
        slug,
        url: normalizedPath || this.generateUrl(slug),
        originalPath: item.path
      };
    });

    // Process submenus
    const submenu = {};
    for (const [parentId, subs] of Object.entries(submenuItems)) {
      const parent = menuItems.find(m => m.id === parentId);
      const parentSlug = parent ? (parent.path || parent.id) : parentId;

      submenu[parentId] = subs.map(item => {
        // If path is provided, use it directly as slug
        // If path is null, use id as slug (WordPress auto-generation)
        const slug = item.path ? item.path : item.id;

        // Generate URL
        let url;
        if (item.path) {
          // Path was explicitly provided - normalize it (add leading slash if missing)
          url = normalizePath(item.path);
        } else {
          // No path provided - auto-generate WordPress-style URL
          url = this.generateUrl(item.id, parentSlug);
        }

        return {
          ...item,
          slug,
          url,
          originalPath: item.path
        };
      });
    }

    return { menu, submenu };
  }

  /**
   * Get menu data (fires hooks and returns filtered menu)
   * Used by controllers: pluginLoader.sidebarHook.getMenu(context)
   *
   * @param {Object} context - Request context (user, tenant, etc.)
   * @returns {Promise<Array>} Menu items with URLs
   */
  async getMenu(context = {}) {
    // Reset and build menu
    this._resetMenu();
    await hookService.doAction('admin_menu', context);

    // Filter by user capabilities (commented out - no user in context yet)
    // const filteredMenu = this.filterByCapability(this.currentMenu, context.user);
    const filteredMenu = this.currentMenu;

    // Filter submenu (only show if parent is visible)
    const filteredSubmenu = {};
    for (const [parentId, items] of Object.entries(this.currentSubmenu)) {
      if (filteredMenu.find(m => m.id === parentId)) {
        // Skip capability filtering since no user context
        // const filtered = this.filterByCapability(items, context.user);
        const filtered = items;
        if (filtered.length > 0) {
          filteredSubmenu[parentId] = filtered;
        }
      }
    }

    // Add URLs
    const withUrls = this.addUrls(filteredMenu, filteredSubmenu);

    return withUrls.menu;
  }

  /**
   * Get submenu data
   * Used by controllers: pluginLoader.sidebarHook.getSubMenu(context)
   *
   * @param {Object} context - Request context (user, tenant, etc.)
   * @returns {Promise<Object>} Submenu items with URLs
   */
  async getSubMenu(context = {}) {
    // Reset and build menu
    this._resetMenu();
    await hookService.doAction('admin_menu', context);

    // Filter by user capabilities
    //cconst filteredMenu = this.filterByCapability(this.currentMenu, context.user);

    // Filter submenu
    const filteredSubmenu = {};
    for (const [parentId, items] of Object.entries(this.currentSubmenu)) {
      if (this.currentMenu.find(m => m.id === parentId)) {
        const filtered = this.filterByCapability(items, context.user);
        if (filtered.length > 0) {
          filteredSubmenu[parentId] = filtered;
        }
      }
    }

    // Add URLs
    const withUrls = this.addUrls(this.currentMenu, filteredSubmenu);

    return withUrls.submenu;
  }

  /**
   * Get all menu data (menu and submenu)
   * Used by controllers: pluginLoader.sidebarHook.getAllMenus(context)
   *
   * @param {Object} context - Request context (user, tenant, etc.)
   * @returns {Promise<Object>} Object with menu and submenu arrays
   */
  async getAllMenus(context = {}) {
    // Reset and build menu
    this._resetMenu();
    await hookService.doAction('admin_menu', context);

    // Filter by user capabilities (commented out - no user in context yet)
    // const filteredMenu = this.filterByCapability(this.currentMenu, context.user);
    // Use all menus for now
    const filteredMenu = this.currentMenu;

    // Filter submenu
    const filteredSubmenu = {};
    for (const [parentId, items] of Object.entries(this.currentSubmenu)) {
      if (filteredMenu.find(m => m.id === parentId)) {
        // Skip capability filtering for submenus too since no user context
        // const filtered = this.filterByCapability(items, context.user);
        const filtered = items;
        if (filtered.length > 0) {
          filteredSubmenu[parentId] = filtered;
        }
      }
    }

    // Add URLs
    const withUrls = this.addUrls(filteredMenu, filteredSubmenu);

    return {
      menu: withUrls.menu,
      submenu: withUrls.submenu
    };
  }
}

// Create singleton instance
const sidebarHook = new SidebarHook();

// Export instance and also expose the methods for plugin use
module.exports = sidebarHook;

// Also export the WordPress-style API for plugins to use
module.exports.add_menu_page = sidebarHook.add_menu_page.bind(sidebarHook);
module.exports.add_submenu_page = sidebarHook.add_submenu_page.bind(sidebarHook);
module.exports.onAdminMenu = sidebarHook.onAdminMenu.bind(sidebarHook);
