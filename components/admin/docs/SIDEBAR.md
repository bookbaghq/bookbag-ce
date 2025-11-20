# Admin Sidebar System Documentation

Complete documentation for the dynamic admin sidebar generation system using the hook architecture.

## Overview

The admin sidebar is a dynamically generated navigation menu that allows plugins to register menu items and submenus via the `HOOKS.ADMIN_MENU` hook. The system provides:

- Core menu items (always present)
- Plugin-added menu items (via hooks)
- Hierarchical submenu structure
- Position-based sorting
- Automatic deduplication

## Architecture

### System Flow

```
1. Client requests sidebar (/api/layout/sidebar)
   ↓
2. sidebarController#getSidebar
   ↓
3. Initialize core menu items
   ↓
4. Create MenuContext object
   ↓
5. Fire HOOKS.ADMIN_MENU hook
   ↓
6. Plugins add menu items via context.addMenuItem()
   ↓
7. Plugins add submenu items via context.addSubmenuItem()
   ↓
8. Deduplicate menu items by ID
   ↓
9. Sort menu items by position
   ↓
10. Return { menu, submenu }
```

### Components

```
components/admin/
├── app/
│   └── controllers/
│       └── api/
│           └── sidebarController.js    # Sidebar generation logic
├── config/
│   └── routes.js                       # Sidebar API routes
└── docs/
    └── SIDEBAR.md                      # This file
```

---

## Core Menu Items

The admin component provides these hardcoded menu items that are always present:

### Menu Item Definitions

```javascript
const coreMenuItems = [
  {
    id: 'admin',
    label: 'Admin',
    url: '/bb-admin',
    icon: 'Settings',
    position: 1
  },
  {
    id: 'chats',
    label: 'Chats',
    url: '/bb-admin/chats',
    icon: 'MessageSquare',
    position: 10
  },
  {
    id: 'media',
    label: 'Media',
    url: '/bb-admin/media',
    icon: 'Image',
    position: 20
  },
  {
    id: 'models',
    label: 'Models',
    url: '/bb-admin/models',
    icon: 'Cpu',
    position: 25
  },
  {
    id: 'mail',
    label: 'Mail',
    url: '/bb-admin/mail',
    icon: 'Mail',
    position: 40
  },
  {
    id: 'workspace',
    label: 'Workspaces',
    url: '/bb-admin/workspaces',
    icon: 'Users',
    position: 50
  },
  {
    id: 'users',
    label: 'Users',
    url: '/bb-admin/users',
    icon: 'User',
    position: 60
  },
  {
    id: 'plugins',
    label: 'Plugins',
    url: '/bb-admin/plugins',
    icon: 'Puzzle',
    position: 70
  },
  {
    id: 'developer-tools',
    label: 'Developer Tools',
    url: '/bb-admin/developer-tools',
    icon: 'Code',
    position: 75
  }
];
```

### Position Ranges

| Range | Purpose | Core Items |
|-------|---------|------------|
| 1-10 | Core admin | Admin (1), Chats (10) |
| 11-30 | Content | Media (20), Models (25) |
| 31-60 | Communication | Mail (40), Workspaces (50), Users (60) |
| 61-80 | System | Plugins (70), Dev Tools (75) |
| 81-100 | Plugins | Available for plugin use |

---

## Hook System

### Hook Constant

```javascript
HOOKS.ADMIN_MENU
```

**Hook Type:** Action hook
**Fired By:** `sidebarController#getSidebar`
**Purpose:** Allows plugins to add menu items to the admin sidebar

### Hook Context

When the hook is fired, plugins receive a `MenuContext` object with these methods:

#### `addMenuItem(item)`

Adds a top-level menu item to the sidebar.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item.id` | String | Yes | Unique identifier for the menu item |
| `item.label` | String | Yes | Display text |
| `item.url` | String | Yes | Navigation URL |
| `item.icon` | String | Yes | Icon name (Lucide React) |
| `item.position` | Integer | Yes | Sort order (lower = higher) |

**Example:**
```javascript
context.addMenuItem({
  id: 'analytics',
  label: 'Analytics',
  url: '/bb-admin/analytics',
  icon: 'BarChart',
  position: 85
});
```

#### `addSubmenuItem(parentId, item)`

Adds a submenu item under an existing menu item.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parentId` | String | Yes | Parent menu item ID |
| `item.label` | String | Yes | Display text |
| `item.url` | String | Yes | Navigation URL |

**Example:**
```javascript
context.addSubmenuItem('analytics', {
  label: 'Reports',
  url: '/bb-admin/analytics/reports'
});
```

---

## Plugin Integration

### Basic Plugin Registration

**Location:** Plugin's `index.js` (during initialization)

```javascript
// bb-plugins/my-plugin/index.js
module.exports.init = async function(master, config) {
  const hookService = master.requestList.hookService;
  const HOOKS = master.requestList.hookConstants;

  // Register menu items
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add menu item
    context.addMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      url: '/bb-admin/my-plugin',
      icon: 'Puzzle',
      position: 80
    });
  });
};
```

### Plugin with Submenus

```javascript
// bb-plugins/analytics-plugin/index.js
module.exports.init = async function(master, config) {
  const hookService = master.requestList.hookService;
  const HOOKS = master.requestList.hookConstants;

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add main menu item
    context.addMenuItem({
      id: 'analytics',
      label: 'Analytics',
      url: '/bb-admin/analytics',
      icon: 'BarChart',
      position: 85
    });

    // Add submenu items
    context.addSubmenuItem('analytics', {
      label: 'Overview',
      url: '/bb-admin/analytics'
    });

    context.addSubmenuItem('analytics', {
      label: 'Reports',
      url: '/bb-admin/analytics/reports'
    });

    context.addSubmenuItem('analytics', {
      label: 'Settings',
      url: '/bb-admin/analytics/settings'
    });
  });
};
```

### Multiple Menu Items

```javascript
// bb-plugins/content-plugin/index.js
module.exports.init = async function(master, config) {
  const hookService = master.requestList.hookService;
  const HOOKS = master.requestList.hookConstants;

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add Pages menu
    context.addMenuItem({
      id: 'pages',
      label: 'Pages',
      url: '/bb-admin/pages',
      icon: 'FileText',
      position: 30
    });

    context.addSubmenuItem('pages', {
      label: 'All Pages',
      url: '/bb-admin/pages'
    });

    context.addSubmenuItem('pages', {
      label: 'Add New',
      url: '/bb-admin/pages/new'
    });

    // Add Posts menu
    context.addMenuItem({
      id: 'posts',
      label: 'Posts',
      url: '/bb-admin/posts',
      icon: 'Edit',
      position: 35
    });

    context.addSubmenuItem('posts', {
      label: 'All Posts',
      url: '/bb-admin/posts'
    });

    context.addSubmenuItem('posts', {
      label: 'Add New',
      url: '/bb-admin/posts/new'
    });
  });
};
```

### Conditional Menu Items

```javascript
// bb-plugins/premium-plugin/index.js
module.exports.init = async function(master, config) {
  const hookService = master.requestList.hookService;
  const HOOKS = master.requestList.hookConstants;

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Only add menu if premium features are enabled
    const premiumEnabled = config.premium === true;

    if (premiumEnabled) {
      context.addMenuItem({
        id: 'premium',
        label: 'Premium Features',
        url: '/bb-admin/premium',
        icon: 'Star',
        position: 90
      });
    }
  });
};
```

---

## MenuContext Implementation

### MenuContext Class

```javascript
class MenuContext {
  constructor() {
    this.menuItems = [];
    this.submenuItems = {};
  }

  addMenuItem(item) {
    // Validate required fields
    if (!item.id || !item.label || !item.url || !item.icon || item.position === undefined) {
      throw new Error('Menu item missing required fields');
    }

    this.menuItems.push(item);
  }

  addSubmenuItem(parentId, item) {
    // Validate required fields
    if (!parentId || !item.label || !item.url) {
      throw new Error('Submenu item missing required fields');
    }

    // Initialize submenu array if needed
    if (!this.submenuItems[parentId]) {
      this.submenuItems[parentId] = [];
    }

    this.submenuItems[parentId].push(item);
  }

  getMenu() {
    // Deduplicate by ID
    const uniqueItems = new Map();
    for (const item of this.menuItems) {
      uniqueItems.set(item.id, item);
    }

    // Sort by position
    return Array.from(uniqueItems.values())
      .sort((a, b) => a.position - b.position);
  }

  getSubmenu() {
    return this.submenuItems;
  }
}
```

---

## Icon Support

The system uses Lucide React icons. Available icons include:

### Common Icons

| Category | Icons |
|----------|-------|
| **General** | Settings, Home, Info, Bell, Calendar |
| **Users** | User, Users, UserPlus, UserCheck, UserX |
| **Content** | FileText, File, Folder, Edit, Edit3 |
| **Media** | Image, Video, Music, Film, Camera |
| **Communication** | MessageSquare, Mail, Send, Phone, MessageCircle |
| **Data** | Database, Server, HardDrive, Cloud, Archive |
| **System** | Cpu, Monitor, Smartphone, Tablet, Watch |
| **Navigation** | Menu, ChevronRight, ChevronDown, ArrowRight, ArrowLeft |
| **Actions** | Plus, Minus, Check, X, Trash, Save |
| **Analytics** | BarChart, PieChart, LineChart, TrendingUp, Activity |
| **Tools** | Tool, Wrench, Settings, Sliders, Filter |
| **Plugins** | Puzzle, Package, Box, Grid, Layout |

### Using Icons

```javascript
// Basic icon
context.addMenuItem({
  icon: 'Settings'
});

// Content icons
icon: 'FileText'     // Documents
icon: 'Edit'         // Blog posts
icon: 'Image'        // Media library

// Data icons
icon: 'Database'     // Knowledge base
icon: 'Archive'      // Backups
icon: 'Server'       // Infrastructure

// Analytics icons
icon: 'BarChart'     // Analytics
icon: 'TrendingUp'   // Growth
icon: 'Activity'     // Activity logs

// Plugin icons
icon: 'Puzzle'       // Plugins/Extensions
icon: 'Package'      // Installed packages
icon: 'Box'          // Modules
```

---

## Best Practices

### 1. Choose Appropriate Positions

Follow the position guidelines to ensure logical menu organization:

```javascript
// Good: Plugin feature in plugin range
context.addMenuItem({
  id: 'my-feature',
  label: 'My Feature',
  position: 85  // In plugin range (81-100)
});

// Bad: Plugin feature in core range
context.addMenuItem({
  id: 'my-feature',
  label: 'My Feature',
  position: 5   // Conflicts with core items (1-10)
});
```

### 2. Use Unique IDs

Always use descriptive, unique IDs to avoid conflicts:

```javascript
// Good: Descriptive, unique ID
context.addMenuItem({
  id: 'rag-documents',
  label: 'Knowledge Base'
});

// Bad: Generic ID (likely to conflict)
context.addMenuItem({
  id: 'documents',
  label: 'Knowledge Base'
});
```

### 3. Keep Labels Concise

Menu labels should be short and clear:

```javascript
// Good: Concise labels
label: 'Analytics'
label: 'Reports'
label: 'Settings'

// Bad: Verbose labels
label: 'View Analytics Dashboard'
label: 'Generate New Reports'
label: 'Configure System Settings'
```

### 4. Group Related Submenus

Organize related functionality under submenus:

```javascript
// Good: Logical grouping
context.addMenuItem({
  id: 'content',
  label: 'Content'
});

context.addSubmenuItem('content', {
  label: 'Pages',
  url: '/bb-admin/content/pages'
});

context.addSubmenuItem('content', {
  label: 'Posts',
  url: '/bb-admin/content/posts'
});

context.addSubmenuItem('content', {
  label: 'Categories',
  url: '/bb-admin/content/categories'
});
```

### 5. Use Appropriate Icons

Choose icons that clearly represent the menu item's purpose:

```javascript
// Good: Icon matches purpose
context.addMenuItem({
  id: 'analytics',
  label: 'Analytics',
  icon: 'BarChart'  // Clearly represents analytics
});

// Bad: Icon doesn't match
context.addMenuItem({
  id: 'analytics',
  label: 'Analytics',
  icon: 'Mail'  // Confusing
});
```

---

## Advanced Usage

### Dynamic Submenus

Generate submenus dynamically based on data:

```javascript
hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
  // Add main menu
  context.addMenuItem({
    id: 'categories',
    label: 'Categories',
    url: '/bb-admin/categories',
    icon: 'Folder',
    position: 82
  });

  // Load categories from database
  const categories = await loadCategories();

  // Add submenu for each category
  for (const category of categories) {
    context.addSubmenuItem('categories', {
      label: category.name,
      url: `/bb-admin/categories/${category.id}`
    });
  }
});
```

### Permission-Based Menus

Show menu items based on user permissions:

```javascript
hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
  const currentUser = authService.currentUser();

  // Only admins see this menu
  if (currentUser && currentUser.role === 'admin') {
    context.addMenuItem({
      id: 'admin-tools',
      label: 'Admin Tools',
      url: '/bb-admin/admin-tools',
      icon: 'Tool',
      position: 95
    });
  }

  // All authenticated users see this
  if (currentUser) {
    context.addMenuItem({
      id: 'my-account',
      label: 'My Account',
      url: '/bb-admin/account',
      icon: 'User',
      position: 100
    });
  }
});
```

### Feature Flag Menus

Show menu items based on feature flags:

```javascript
hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
  const features = await getFeatureFlags();

  if (features.betaFeatures) {
    context.addMenuItem({
      id: 'beta',
      label: 'Beta Features',
      url: '/bb-admin/beta',
      icon: 'Zap',
      position: 99
    });
  }

  if (features.experimentalAI) {
    context.addSubmenuItem('beta', {
      label: 'Experimental AI',
      url: '/bb-admin/beta/ai'
    });
  }
});
```

---

## Testing

### Unit Tests

```javascript
describe('MenuContext', () => {
  it('should add menu item', () => {
    const context = new MenuContext();

    context.addMenuItem({
      id: 'test',
      label: 'Test',
      url: '/test',
      icon: 'Test',
      position: 50
    });

    const menu = context.getMenu();
    expect(menu).toHaveLength(1);
    expect(menu[0].id).toBe('test');
  });

  it('should deduplicate menu items by ID', () => {
    const context = new MenuContext();

    context.addMenuItem({
      id: 'test',
      label: 'Test 1',
      url: '/test1',
      icon: 'Test',
      position: 50
    });

    context.addMenuItem({
      id: 'test',
      label: 'Test 2',
      url: '/test2',
      icon: 'Test',
      position: 60
    });

    const menu = context.getMenu();
    expect(menu).toHaveLength(1);
    expect(menu[0].label).toBe('Test 2'); // Last one wins
  });

  it('should sort menu items by position', () => {
    const context = new MenuContext();

    context.addMenuItem({ id: 'c', label: 'C', url: '/c', icon: 'C', position: 30 });
    context.addMenuItem({ id: 'a', label: 'A', url: '/a', icon: 'A', position: 10 });
    context.addMenuItem({ id: 'b', label: 'B', url: '/b', icon: 'B', position: 20 });

    const menu = context.getMenu();
    expect(menu[0].id).toBe('a');
    expect(menu[1].id).toBe('b');
    expect(menu[2].id).toBe('c');
  });

  it('should add submenu items', () => {
    const context = new MenuContext();

    context.addMenuItem({
      id: 'parent',
      label: 'Parent',
      url: '/parent',
      icon: 'Parent',
      position: 10
    });

    context.addSubmenuItem('parent', {
      label: 'Child 1',
      url: '/parent/child1'
    });

    context.addSubmenuItem('parent', {
      label: 'Child 2',
      url: '/parent/child2'
    });

    const submenu = context.getSubmenu();
    expect(submenu['parent']).toHaveLength(2);
    expect(submenu['parent'][0].label).toBe('Child 1');
    expect(submenu['parent'][1].label).toBe('Child 2');
  });
});
```

### Integration Tests

```javascript
describe('Sidebar Hook Integration', () => {
  it('should fire ADMIN_MENU hook', async () => {
    let hookFired = false;

    hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
      hookFired = true;
    });

    const response = await request(app)
      .get('/bb-admin/api/layout/sidebar')
      .set('Cookie', sessionCookie);

    expect(hookFired).toBe(true);
    expect(response.body.success).toBe(true);
  });

  it('should include plugin menu items', async () => {
    // Register test plugin
    hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
      context.addMenuItem({
        id: 'test-plugin',
        label: 'Test Plugin',
        url: '/bb-admin/test',
        icon: 'Puzzle',
        position: 100
      });
    });

    const response = await request(app)
      .get('/bb-admin/api/layout/sidebar')
      .set('Cookie', sessionCookie);

    const testItem = response.body.menu.find(item => item.id === 'test-plugin');
    expect(testItem).toBeDefined();
    expect(testItem.label).toBe('Test Plugin');
  });

  it('should include plugin submenus', async () => {
    hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
      context.addMenuItem({
        id: 'test-plugin',
        label: 'Test Plugin',
        url: '/bb-admin/test',
        icon: 'Puzzle',
        position: 100
      });

      context.addSubmenuItem('test-plugin', {
        label: 'Settings',
        url: '/bb-admin/test/settings'
      });
    });

    const response = await request(app)
      .get('/bb-admin/api/layout/sidebar')
      .set('Cookie', sessionCookie);

    expect(response.body.submenu['test-plugin']).toHaveLength(1);
    expect(response.body.submenu['test-plugin'][0].label).toBe('Settings');
  });
});
```

---

## Troubleshooting

### Menu Items Not Appearing

**Problem:** Plugin menu items don't show in sidebar.

**Checklist:**
1. ✓ Hook registered in `index.js` during init?
2. ✓ Hook constant correct? (`HOOKS.ADMIN_MENU`)
3. ✓ Required fields provided? (id, label, url, icon, position)
4. ✓ Plugin activated?
5. ✓ Browser console errors?

**Debug:**
```javascript
// Add logging to hook handler
hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
  console.log('ADMIN_MENU hook fired');

  context.addMenuItem({
    id: 'my-plugin',
    label: 'My Plugin',
    url: '/bb-admin/my-plugin',
    icon: 'Puzzle',
    position: 80
  });

  console.log('Menu item added');
});
```

### Duplicate Menu Items

**Problem:** Same menu item appears multiple times.

**Causes:**
- Hook registered multiple times
- Plugin loaded multiple times

**Solution:**
```javascript
// Ensure hook is only registered once
let menuHookRegistered = false;

module.exports.init = async function(master, config) {
  if (menuHookRegistered) return;

  const hookService = master.requestList.hookService;
  const HOOKS = master.requestList.hookConstants;

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add menu items
  });

  menuHookRegistered = true;
};
```

### Menu Not Updating

**Problem:** Menu changes don't appear after plugin update.

**Solutions:**
1. Clear browser cache
2. Restart server
3. Check if hook is actually being fired:

```javascript
// In sidebarController.js
console.log('Firing ADMIN_MENU hook');
await hookService.doAction(HOOKS.ADMIN_MENU, menuContext);
console.log('Menu items:', menuContext.getMenu());
```

### Icon Not Displaying

**Problem:** Icon doesn't show or shows as blank.

**Causes:**
- Invalid icon name
- Icon not available in Lucide React

**Solution:**
```javascript
// Use valid Lucide React icon name
icon: 'Settings'  // ✓ Valid
icon: 'setting'   // ✗ Invalid (case matters)
icon: 'gear'      // ✗ Invalid (not in Lucide)

// Check available icons: https://lucide.dev/icons/
```

---

## Performance Considerations

### Caching

The sidebar is generated on each request. Consider caching:

```javascript
// In sidebarController.js
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getSidebar(req, res) {
  const currentUser = authService.currentUser(req.request, req.userContext);
  const cacheKey = `sidebar:${currentUser.id}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Generate sidebar
  const menuContext = new MenuContext();
  // ... add menu items ...
  await hookService.doAction(HOOKS.ADMIN_MENU, menuContext);

  const result = {
    success: true,
    menu: menuContext.getMenu(),
    submenu: menuContext.getSubmenu()
  };

  // Cache result
  cache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}

// Invalidate cache on plugin activation/deactivation
function invalidateSidebarCache() {
  cache.clear();
}
```

### Lazy Loading

For large numbers of submenus, consider lazy loading:

```javascript
// Don't load all submenus upfront
context.addMenuItem({
  id: 'categories',
  label: 'Categories',
  url: '/bb-admin/categories',
  icon: 'Folder',
  position: 82,
  hasSubmenu: true  // Flag for lazy loading
});

// Load submenu on demand
app.get('/api/layout/sidebar/submenu/:parentId', async (req, res) => {
  const parentId = req.params.parentId;

  if (parentId === 'categories') {
    const categories = await loadCategories();
    const submenuItems = categories.map(cat => ({
      label: cat.name,
      url: `/bb-admin/categories/${cat.id}`
    }));

    return res.json({ success: true, items: submenuItems });
  }
});
```

---

## Security Considerations

### 1. Validate Menu Items

```javascript
function validateMenuItem(item) {
  // Check required fields
  if (!item.id || typeof item.id !== 'string') {
    throw new Error('Invalid menu item ID');
  }

  // Sanitize URL
  if (!item.url || !item.url.startsWith('/bb-admin')) {
    throw new Error('Invalid menu item URL');
  }

  // Validate position
  if (typeof item.position !== 'number' || item.position < 1 || item.position > 100) {
    throw new Error('Invalid menu item position');
  }

  return true;
}
```

### 2. Sanitize URLs

```javascript
function sanitizeUrl(url) {
  // Ensure URL starts with /bb-admin
  if (!url.startsWith('/bb-admin')) {
    throw new Error('Menu URLs must start with /bb-admin');
  }

  // Remove any malicious characters
  const sanitized = url.replace(/[<>'"]/g, '');

  return sanitized;
}
```

### 3. Check Permissions

```javascript
hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
  const currentUser = authService.currentUser();

  // Only show sensitive menu to admins
  if (currentUser.role === 'admin') {
    context.addMenuItem({
      id: 'system-logs',
      label: 'System Logs',
      url: '/bb-admin/system-logs',
      icon: 'FileText',
      position: 98
    });
  }
});
```

---

## Future Enhancements

1. **Badge Support** - Show notification counts on menu items
2. **Icon Customization** - Allow SVG icons in addition to Lucide
3. **Menu Groups** - Visual separators between menu sections
4. **Collapsible Submenus** - Expand/collapse submenus client-side
5. **Search** - Filter menu items by keyword
6. **Favorites** - Pin frequently used menu items
7. **Recent Items** - Show recently visited pages
8. **Keyboard Navigation** - Navigate menu with keyboard shortcuts
9. **Custom Ordering** - Allow users to reorder menu items
10. **Menu Profiles** - Different menu layouts for different user roles

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [API.md](./API.md) - API reference
- [DATABASE.md](./DATABASE.md) - Database schema
- [../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md](../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md) - Hook system overview
