# Admin Component Documentation

## Overview

The Admin component provides core administrative functionality for Bookbag CE, including system-wide settings management and dynamic sidebar generation using the hook system.

## Architecture

```
components/admin/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       ├── settingsController.js    # Settings CRUD operations
│   │       └── sidebarController.js     # Dynamic sidebar generation
│   ├── models/
│   │   ├── adminContext.js             # Database context
│   │   └── setting.js                  # Settings entity (singleton)
│   └── db/
│       └── migrations/                  # Database migrations
├── config/
│   ├── routes.js                       # API route definitions
│   └── initializers/
│       └── config.js                   # Component initialization
└── docs/                               # Documentation (you are here)
```

## Key Features

### 1. Settings Management
- Singleton settings record for system-wide configuration
- Plugin feature toggles (`disable_client_side`)
- Upload limits (`plugin_upload_max_file_size`)
- Automatic initialization on first access
- RESTful API for get/update operations

### 2. Dynamic Sidebar Generation
- Hook-based extensibility system
- Plugins can register menu items via `HOOKS.ADMIN_MENU`
- Hierarchical menu structure (top-level + submenus)
- Position-based ordering
- User context awareness
- Core menu items (hardcoded, always available)

### 3. Lightweight Design
- Minimal dependencies
- No service layer (logic in controllers)
- Single settings table (singleton pattern)
- Auto-loading via MasterController

## Data Flow

### Settings Retrieval Flow
```
1. Client → GET /api/admin/settings
2. settingsController#getSettings
3. Check if Setting record exists
4. If not, create default settings (singleton init)
5. Return settings object
```

### Settings Update Flow
```
1. Client → POST /api/admin/settings
2. settingsController#updateSettings
3. Get or create Setting record
4. Update fields if provided
5. Save changes
6. Return updated settings
```

### Sidebar Generation Flow
```
1. Client → GET /api/layout/sidebar
2. sidebarController#getSidebar
3. Initialize core menu items (Admin, Chats, Media, etc.)
4. Fire HOOKS.ADMIN_MENU hook
5. Plugins add/modify menu items via hook callbacks
6. Deduplicate menu items by ID
7. Sort by position
8. Return menu + submenu objects
```

## Database Schema

See [DATABASE.md](./DATABASE.md) for complete schema documentation.

### Setting Model (Singleton)
```javascript
{
  id: INTEGER,
  disable_client_side: BOOLEAN (default: false),
  plugin_upload_max_file_size: INTEGER (default: 104857600),
  created_at: STRING,
  updated_at: STRING
}
```

**Pattern:** Only one record exists at any time (singleton pattern).

## API Endpoints

See [API.md](./API.md) for complete API reference.

**Settings:**
- `GET /api/admin/settings` - Get settings
- `POST /api/admin/settings` - Update settings

**Sidebar:**
- `GET /api/layout/sidebar` - Get admin sidebar menu
- `GET /api/layout/sidebar/current` - Get current active menu item

## Sidebar Hook System

See [SIDEBAR.md](./SIDEBAR.md) for complete sidebar documentation.

**How Plugins Register Menu Items:**
```javascript
hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
  context.addMenuItem({
    id: 'my-plugin',
    label: 'My Plugin',
    url: '/bb-admin/my-plugin',
    icon: 'Puzzle',
    position: 80
  });

  context.addSubmenuItem('my-plugin', {
    label: 'Settings',
    url: '/bb-admin/my-plugin/settings'
  });
});
```

## Configuration

### Component Initialization
Location: `config/initializers/config.js`

Currently minimal - no custom initialization needed. Routes and controllers are auto-loaded by MasterController.

### Route Definitions
Location: `config/routes.js`

```javascript
// Settings API
router.route("api/admin/settings", "api/settings#getSettings", "get");
router.route("api/admin/settings", "api/settings#updateSettings", "post");

// Sidebar API
router.route("api/layout/sidebar", "api/sidebar#getSidebar", "get");
router.route("api/layout/sidebar/current", "api/sidebar#getCurrentMenuItem", "get");
```

## Dependencies

- **MasterController** - Core framework (routing, ORM, hooks)
- **Plugins Component** - Hook system (`HOOKS.ADMIN_MENU`)
- **Auth Service** - User authentication and context
- None (no external npm packages)

## Integration Points

### Hooks

**Fired Hooks:**
- `HOOKS.ADMIN_MENU` - Sidebar generation (allows plugins to add menu items)

**Listened Hooks:**
- None

### Services Used

**Auth Service:**
- `authService.currentUser()` - Get authenticated user

### External Components

None. The admin component is self-contained.

## Core Menu Structure

The admin component provides these hardcoded menu items (always available):

```javascript
[
  { id: 'admin', label: 'Admin', url: '/bb-admin', icon: 'Settings', position: 1 },
  { id: 'chats', label: 'Chats', url: '/bb-admin/chats', icon: 'MessageSquare', position: 10 },
  { id: 'media', label: 'Media', url: '/bb-admin/media', icon: 'Image', position: 20 },
  { id: 'models', label: 'Models', url: '/bb-admin/models', icon: 'Cpu', position: 25 },
  { id: 'mail', label: 'Mail', url: '/bb-admin/mail', icon: 'Mail', position: 40 },
  { id: 'workspace', label: 'Workspaces', url: '/bb-admin/workspaces', icon: 'Users', position: 50 },
  { id: 'users', label: 'Users', url: '/bb-admin/users', icon: 'User', position: 60 },
  { id: 'plugins', label: 'Plugins', url: '/bb-admin/plugins', icon: 'Puzzle', position: 70 },
  { id: 'developer-tools', label: 'Developer Tools', url: '/bb-admin/developer-tools', icon: 'Code', position: 75 }
]
```

Plugins can add additional menu items at any position.

## Settings Available

### `disable_client_side`
**Type:** Boolean
**Default:** `false`
**Purpose:** Disables the client-side interface (`/bb-client`)

**Usage:**
```javascript
// Disable client-side
POST /api/admin/settings
{ "disable_client_side": true }

// Enable client-side
POST /api/admin/settings
{ "disable_client_side": false }
```

### `plugin_upload_max_file_size`
**Type:** Integer (bytes)
**Default:** `104857600` (100 MB)
**Purpose:** Maximum file size for plugin uploads

**Usage:**
```javascript
// Set to 50 MB
POST /api/admin/settings
{ "plugin_upload_max_file_size": 52428800 }

// Set to 200 MB
POST /api/admin/settings
{ "plugin_upload_max_file_size": 209715200 }
```

## Best Practices

### 1. Settings Management

Always check settings exist before reading:
```javascript
let setting = adminContext.Setting.single();
if (!setting) {
  // Initialize default settings
  setting = new Setting();
  // ... set defaults
  adminContext.Setting.add(setting);
  adminContext.saveChanges();
}
```

### 2. Sidebar Registration

Register menu items in plugin's `index.js`:
```javascript
// Good: Register during plugin initialization
module.exports.init = async function(master, config) {
  const hookService = master.requestList.hookService;

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({ ... });
  });
};

// Bad: Register in route handler
// This runs too late and won't be available
```

### 3. Position Values

Use consistent position ranges:
- 1-10: Core admin functions
- 11-30: Content management (chats, media, models)
- 31-60: Communication & collaboration (mail, workspace, users)
- 61-80: System management (plugins, dev tools)
- 81-100: Custom plugin features

### 4. Menu Item IDs

Use unique, descriptive IDs:
```javascript
// Good
{ id: 'rag-documents', label: 'RAG Documents', ... }

// Bad (too generic, might conflict)
{ id: 'documents', label: 'RAG Documents', ... }
```

## Security Considerations

### 1. Authentication Required

All endpoints require authentication:
```javascript
const currentUser = authService.currentUser(req.request, req.userContext);
if (!currentUser) {
  return { error: 'Unauthorized' };
}
```

### 2. Admin-Only Access

Currently no explicit admin check - relies on frontend routing protection.

**TODO:** Add role-based access control:
```javascript
if (currentUser.role !== 'admin') {
  return { error: 'Forbidden' };
}
```

### 3. Input Validation

Settings controller should validate inputs:
```javascript
// Current: No validation
{ "plugin_upload_max_file_size": -1 }  // Invalid but accepted

// Better: Add validation
if (plugin_upload_max_file_size < 0 || plugin_upload_max_file_size > 1073741824) {
  return { error: 'Invalid file size limit' };
}
```

## Performance Considerations

### 1. Singleton Settings

Single database record - no performance concerns.

### 2. Sidebar Generation

Generated on each request - consider caching:
```javascript
// Current: Generate on every request
app.get('/api/layout/sidebar', sidebarController.getSidebar);

// Better: Add cache layer
const cache = new Map();
app.get('/api/layout/sidebar', (req, res) => {
  const cacheKey = `sidebar:${req.user.id}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const result = sidebarController.getSidebar(req, res);
  cache.set(cacheKey, result);
  return result;
});
```

### 3. Hook System Overhead

Minimal - hooks fire once per sidebar request.

## Testing

### Unit Testing Settings Controller

```javascript
describe('settingsController', () => {
  it('should create default settings if none exist', async () => {
    const controller = new settingsController(mockReq);
    const result = await controller.getSettings({});

    expect(result.success).toBe(true);
    expect(result.settings.disable_client_side).toBe(false);
    expect(result.settings.plugin_upload_max_file_size).toBe(104857600);
  });

  it('should update settings', async () => {
    const controller = new settingsController(mockReq);
    const result = await controller.updateSettings({
      params: { formData: { disable_client_side: true } }
    });

    expect(result.success).toBe(true);
    expect(result.settings.disable_client_side).toBe(true);
  });
});
```

### Integration Testing Sidebar

```javascript
describe('sidebarController', () => {
  it('should include core menu items', async () => {
    const controller = new sidebarController(mockReq);
    const result = await controller.getSidebar(mockReq, mockRes);

    expect(result.success).toBe(true);
    expect(result.menu).toContainEqual(
      expect.objectContaining({ id: 'admin', label: 'Admin' })
    );
  });

  it('should allow plugins to add menu items via hooks', async () => {
    // Register test plugin
    hookService.addAction(HOOKS.ADMIN_MENU, (context) => {
      context.addMenuItem({ id: 'test', label: 'Test', url: '/test', position: 100 });
    });

    const controller = new sidebarController(mockReq);
    const result = await controller.getSidebar(mockReq, mockRes);

    expect(result.menu).toContainEqual(
      expect.objectContaining({ id: 'test', label: 'Test' })
    );
  });
});
```

## Troubleshooting

### Settings Not Persisting

**Problem:** Settings revert after restart.

**Solution:** Check database file permissions:
```bash
ls -la components/admin/db/development.sqlite3
# Should be writable by the application user
```

### Menu Items Not Appearing

**Problem:** Plugin menu items don't show in sidebar.

**Checklist:**
1. Is the plugin active?
2. Is the hook registered in `index.js` during init?
3. Is the hook constant correct? (`HOOKS.ADMIN_MENU`)
4. Check browser console for JavaScript errors
5. Verify `hookService.hasAction(HOOKS.ADMIN_MENU)` returns true

### Duplicate Menu Items

**Problem:** Same menu item appears multiple times.

**Solution:** The sidebar controller deduplicates by ID. Ensure your plugin uses a unique ID:
```javascript
// This will be deduplicated automatically
{ id: 'my-plugin', label: 'My Plugin', ... }
```

## Future Enhancements

1. **Role-Based Menu Filtering** - Show different menus based on user role
2. **Settings Categories** - Group related settings
3. **Settings Validation** - Input validation and constraints
4. **Settings History** - Track changes to settings over time
5. **Settings UI Generator** - Auto-generate admin UI from settings schema
6. **Menu Item Permissions** - Fine-grained access control per menu item
7. **Menu Icons** - Support custom icon SVGs
8. **Menu Badges** - Show notification counts on menu items
9. **Collapsible Submenus** - Client-side submenu expansion
10. **Search Functionality** - Filter menu items by keyword

## Related Documentation

- [API.md](./API.md) - Complete API reference
- [DATABASE.md](./DATABASE.md) - Database schema
- [SIDEBAR.md](./SIDEBAR.md) - Sidebar system
- [../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md](../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md) - Hook system overview
