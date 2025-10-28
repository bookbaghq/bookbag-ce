# Hook System Quick Reference

## Common Tasks

### Add a Menu Item

```javascript
const { onAdminMenu, add_menu_page } = require('./bb-hooks/src/core/admin/sidebarRegistration.js');

onAdminMenu(async ({ user, tenantId }) => {
  add_menu_page({
    id: 'my-menu',
    label: 'My Menu',
    path: '/admin/my-menu',
    icon: 'Star',
    capability: 'manage_options',
    priority: 50
  });
});
```

### Add a Submenu Item

```javascript
add_submenu_page('my-menu', {
  id: 'my-submenu',
  label: 'Settings',
  path: '/admin/my-menu/settings',
  capability: 'manage_options',
  priority: 10
});
```

### Remove a Menu Item

```javascript
const { onAdminMenu, remove_menu_page } = require('./bb-hooks/src/core/admin/sidebarRegistration.js');

onAdminMenu(async () => {
  remove_menu_page('unwanted-menu');
}, 999); // High priority
```

### Check if Plugin is Enabled

```javascript
const MasterRecord = require('masterrecord');

async function isPluginEnabled(tenantId) {
  try {
    const Setting = MasterRecord('Setting', tenantId);
    const setting = await Setting.findOne({ where: { name: 'my-plugin' } });
    return setting && setting.is_active;
  } catch (error) {
    return true;
  }
}
```

### Create a Complete Plugin

```javascript
// bb-hooks/src/plugins/myPlugin.js

const { onAdminMenu, add_menu_page, add_submenu_page } = require('../core/admin/sidebarRegistration.js');
const MasterRecord = require('masterrecord');

async function isMyPluginEnabled(tenantId) {
  try {
    const Setting = MasterRecord('Setting', tenantId);
    const setting = await Setting.findOne({ where: { name: 'my-plugin' } });
    return setting && setting.is_active;
  } catch (error) {
    return true;
  }
}

function initMyPlugin() {
  onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
    const enabled = await isMyPluginEnabled(tenantId || 'default');
    if (!enabled) return;

    add_menu_page({
      id: 'my-plugin',
      label: 'My Plugin',
      path: '/admin/my-plugin',
      icon: 'Star',
      capability: 'manage_options',
      priority: 50
    });

    add_submenu_page('my-plugin', {
      id: 'my-plugin-settings',
      label: 'Settings',
      path: '/admin/my-plugin/settings',
      capability: 'manage_options',
      priority: 10
    });
  }, 10);
}

module.exports = { initMyPlugin, isMyPluginEnabled };
```

## API Cheat Sheet

### Hook Functions

```javascript
// Core hooks
addAction(name, fn, priority)     // Register callback
removeAction(name, fn)             // Remove callback
doAction(name, context)            // Execute callbacks
hasAction(name)                    // Check if hook has callbacks
```

### Menu Functions

```javascript
// WordPress-style aliases
add_menu_page(options)                  // Add top-level menu
add_submenu_page(parentId, options)     // Add submenu
remove_menu_page(id)                    // Remove menu
remove_submenu_page(parentId, id)       // Remove submenu
get_menu_snapshot()                     // Get current menu
```

### Menu Options

```javascript
{
  id: 'unique-id',              // Required: Unique identifier
  label: 'Display Name',        // Required: What users see
  path: '/admin/path',          // Required: URL path
  icon: 'IconName',             // Optional: Lucide icon name
  capability: 'permission',     // Optional: Required capability
  priority: 10                  // Optional: Display order
}
```

### Settings API Endpoints

```
GET    /api/settings/list           # Get all settings
GET    /api/settings/:name          # Get one setting
POST   /api/settings/:name/toggle   # Toggle setting
PUT    /api/settings/:name          # Update setting
POST   /api/settings                # Create/update setting
DELETE /api/settings/:name          # Delete setting
```

## Common Capabilities

```
manage_options       # Site settings
manage_rag           # RAG management
upload_files         # Media upload
manage_mail          # Email management
send_mail            # Send emails
list_users           # View users
create_users         # Create users
manage_workspaces    # Workspace management
view_analytics       # View analytics
```

## Icon Names (Lucide Icons)

```
Database     # Data/storage
Image        # Media/images
Mail         # Email
Users        # Groups/teams
User         # Individual user
Settings     # Configuration
Star         # Favorite/featured
Bell         # Notifications
BarChart     # Analytics
Cog          # System settings
Home         # Dashboard
FileText     # Documents
Search       # Search/find
Plus         # Add/create
Trash        # Delete
Edit         # Edit/modify
```

## Priority Guide

```
1-10      # Critical/main navigation
11-30     # Core features
31-50     # Standard plugins
51-80     # Optional features
81-98     # Less important items
99        # Last items
999       # Cleanup/removal hooks
```

## Context Object (admin_menu hook)

```javascript
{
  req,        // Express request
  res,        // Express response
  user,       // Current user object
  tenant,     // Tenant object
  tenantId    // Tenant ID string
}
```

## User Object

```javascript
{
  id,           // User ID
  email,        // Email address
  role,         // User role (e.g., 'admin', 'user')
  capabilities  // Array of capability strings
}
```

## Typical Plugin Workflow

1. Create plugin file: `bb-hooks/src/plugins/myPlugin.js`
2. Register with `onAdminMenu()` hook
3. Check if plugin is enabled
4. Register menu items with `add_menu_page()` and `add_submenu_page()`
5. Add to `bb-hooks/src/plugins/index.js`
6. Add default settings to settingsController.js
7. Test in UI at `/bb-admin/settings/manage`

## File Locations

```
bb-hooks/src/core/hooks.js                    # Hook system
bb-hooks/src/core/admin/menuRegistry.js       # Menu registry
bb-hooks/src/core/admin/sidebarRegistration.js            # WordPress-style API
bb-hooks/src/core/admin/middleware.js         # Express middleware
bb-hooks/src/plugins/                         # Your plugins here
bb-hooks/src/plugins/index.js                 # Plugin bootstrap

components/settings/                     # Settings component
components/settings/app/models/Setting.js
components/settings/app/controllers/api/settingsController.js
components/settings/config/routes.js

nextjs-app/app/bb-admin/settings/manage/page.js  # UI
```

## Testing Checklist

- [ ] Plugin file created
- [ ] Registered in plugins/index.js
- [ ] Default settings added
- [ ] Menu appears for admin user
- [ ] Menu hidden when plugin disabled
- [ ] Capabilities work correctly
- [ ] Submenus show under parent
- [ ] Priority order is correct
- [ ] Icons display properly
- [ ] Paths are correct

## Common Errors

**Menu not showing**
- Check plugin is enabled in Settings
- Verify user has capability
- Check console for errors

**Settings not saving**
- Verify database connection
- Check MasterRecord initialization
- Look for migration errors

**Wrong priority order**
- Lower numbers display first
- Use 999 for removal hooks

**Capability denied**
- Check user.capabilities array
- Verify capability name matches
- Remember: admin bypasses checks

## Quick Debugging

```javascript
// Log all registered hooks
const { getRegisteredHooks } = require('./bb-hooks/src/core/hooks.js');
console.log('Hooks:', getRegisteredHooks());

// Log menu snapshot
const { get_menu_snapshot } = require('./bb-hooks/src/core/admin/sidebarRegistration.js');
console.log('Menu:', get_menu_snapshot());

// Check action count
const { actionCount } = require('./bb-hooks/src/core/hooks.js');
console.log('admin_menu callbacks:', actionCount('admin_menu'));
```

## Pro Tips

1. Use low priority (1-10) for main navigation
2. Check plugin status before registering menus
3. Use high priority (999) for removal hooks
4. Set `capability: null` for public items
5. Always provide icon for better UX
6. Group related items with submenus
7. Test with different user roles
8. Default to enabled if check fails
9. Log errors but don't break app
10. Document your plugin's capabilities
