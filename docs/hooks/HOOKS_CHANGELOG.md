# Bookbag Hooks Changelog

> **Purpose:** Track all hook additions, modifications, and removals across versions
> **Format:** Semantic versioning (MAJOR.MINOR.PATCH)

---

## Version 0.0.14 (November 5, 2024)

### 🎉 New Hooks Added (3)

#### 1. `CLIENT_SIDEBAR_LEFT`
- **Type:** Component Registration Hook
- **Category:** Client/Frontend
- **Purpose:** Register components that appear in the left sidebar of client pages
- **Usage Location:** Plugin `load()` method via `registerClientComponent()`
- **UI Location:** Left side of chat interface, before main content
- **Breaking Change:** No
- **Migration Required:** No

**Example:**
```javascript
registerClientComponent('MySidebar', 'pages/client/MySidebar.js', {
  usage: 'sidebar-left'
});
```

---

#### 2. `CLIENT_SIDEBAR_RIGHT`
- **Type:** Component Registration Hook
- **Category:** Client/Frontend
- **Purpose:** Register components that appear in the right sidebar of client pages
- **Usage Location:** Plugin `load()` method via `registerClientComponent()`
- **UI Location:** Right side of chat interface, after main content
- **Breaking Change:** No
- **Migration Required:** No

**Example:**
```javascript
registerClientComponent('MyRightSidebar', 'pages/client/MyRightSidebar.js', {
  usage: 'sidebar-right'
});
```

---

#### 3. `CLIENT_MENU`
- **Type:** Component Registration Hook
- **Category:** Client/Frontend
- **Purpose:** Register custom menu items in the client interface
- **Usage Location:** Plugin `load()` method via `registerClientComponent()`
- **UI Location:** Client menu bar
- **Breaking Change:** No
- **Migration Required:** No

**Example:**
```javascript
registerClientComponent('MyMenuItem', 'pages/client/MyMenuItem.js', {
  usage: 'client-menu',
  icon: 'settings',
  label: 'My Settings'
});
```

---

### 🔄 Modified Hooks (2)

#### 1. `PLUGIN_ACTIVATED`
- **Previous Behavior:** Not consistently triggered
- **New Behavior:** Now properly fires when plugin activation completes
- **Related Changes:**
  - WordPress-style activation system implemented
  - `activate()` method in plugins now properly triggers this hook
  - Hook receives `{ pluginName, pluginPath }` data
- **Breaking Change:** No
- **Migration Required:** No (backward compatible)

**Enhanced Example:**
```javascript
// In your plugin's activate() method
async function activate(pluginAPI) {
  // ... setup tasks

  // Hook now properly fires
  await pluginAPI.hookService.doAction(
    pluginAPI.HOOKS.PLUGIN_ACTIVATED,
    { pluginName: 'my-plugin', pluginPath: __dirname }
  );
}
```

---

#### 2. `PLUGIN_DEACTIVATED`
- **Previous Behavior:** Not consistently triggered
- **New Behavior:** Now properly fires when plugin deactivation completes
- **Related Changes:**
  - WordPress-style deactivation system implemented
  - `deactivate()` method in plugins now properly triggers this hook
  - Hook receives `{ pluginName, pluginPath }` data
- **Breaking Change:** No
- **Migration Required:** No (backward compatible)

**Enhanced Example:**
```javascript
// In your plugin's deactivate() method
async function deactivate(pluginAPI) {
  // ... cleanup tasks

  // Hook now properly fires
  await pluginAPI.hookService.doAction(
    pluginAPI.HOOKS.PLUGIN_DEACTIVATED,
    { pluginName: 'my-plugin', pluginPath: __dirname }
  );
}
```

---

### 🏗️ Infrastructure Changes

#### Plugin System Enhancements
1. **WordPress-Style Activation**
   - Plugins can now have `activate()` and `deactivate()` methods
   - API endpoints: `POST /api/plugins/activate`, `POST /api/plugins/deactivate`
   - Automatic npm install during activation

2. **Self-Contained Plugins**
   - Each plugin can have its own `package.json`
   - Dependencies installed in plugin's `node_modules/`
   - Plugin-specific database locations supported
   - Plugin-specific environment configurations

3. **Dynamic Component Loading**
   - Client components loaded dynamically via API
   - No hardcoded imports required
   - New component: `DynamicPluginSidebar`
   - API endpoint: `GET /api/plugins/components/list?usage=sidebar-left`

4. **Enhanced MasterRecord**
   - Smart plugin path detection
   - Supports plugin-specific environment folders
   - Database paths resolve correctly for plugin isolation

---

### 📊 Hook Statistics

**Total Hooks:** 23
- System: 5
- User: 5
- Chat: 4
- Content: 3
- Plugin: 3
- Client/Frontend: 3 (NEW)

**Hook Categories:** 6 (added Client/Frontend category)

---

### 🔧 Files Modified

#### Core Files
- `components/plugins/app/core/hookConstants.js` - Added 3 new hook constants
- `components/plugins/app/core/pluginLoader.js` - Added activation/deactivation methods
- `components/plugins/config/routes.js` - Added activation/deactivation routes

#### New Files
- `components/plugins/app/controllers/api/pluginActivationController.js`
- `components/plugins/app/controllers/api/pluginComponentsController.js`
- `nextjs-app/app/bb-client/_components/DynamicPluginSidebar.js`

#### Documentation
- `docs/hooks/HOOKS_DIRECTORY.md` (NEW)
- `docs/hooks/HOOKS_CHANGELOG.md` (NEW)
- `docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md` (NEW)
- `docs/hooks/DYNAMIC_COMPONENT_LOADING.md` (NEW)

---

### 🔄 Deprecated Features

None in this version.

---

### ⚠️ Breaking Changes

None in this version.

---

## Version 0.0.1 (Initial Release)

### 🎉 Initial Hooks (18)

#### System Hooks (5)
- `SYSTEM_INIT` - System initialization
- `SYSTEM_READY` - System ready for use
- `SYSTEM_SHUTDOWN` - Before system shutdown
- `SYSTEM_ERROR` - System error occurred
- `CONFIG_LOADED` - Configuration loaded

#### User Hooks (5)
- `USER_REGISTERED` - New user registered
- `USER_LOGIN` - User logged in
- `USER_LOGOUT` - User logged out
- `USER_UPDATED` - User profile updated
- `USER_DELETED` - User being deleted

#### Chat Hooks (4)
- `CHAT_MESSAGE_SENT` - Chat message sent
- `CHAT_MESSAGE_RECEIVED` - Chat message received
- `CHAT_CREATED` - New chat created
- `CHAT_DELETED` - Chat being deleted

#### Content Hooks (3)
- `CONTENT_CREATED` - Content created
- `CONTENT_UPDATED` - Content updated
- `CONTENT_DELETED` - Content being deleted

#### Plugin Hooks (1)
- `PLUGIN_LOADED` - Plugin loaded

---

## Migration Guides

### Migrating from v0.0.1 to v0.0.14

#### 1. Hardcoded Client Components → Dynamic Loading

**Before (v0.0.1):**
```javascript
// In chat page
import { KnowledgeBaseSidebar } from '../../../plugins/rag-plugin/pages/client';

export default function ChatPage() {
  return (
    <div>
      <KnowledgeBaseSidebar chatId={chatId} />
      <ChatInterface />
    </div>
  );
}
```

**After (v0.0.14):**
```javascript
// In chat page
import { DynamicPluginSidebar } from '../_components/DynamicPluginSidebar';

export default function ChatPage() {
  return (
    <div className="flex">
      <DynamicPluginSidebar usage="sidebar-left" chatId={chatId} />
      <ChatInterface />
      <DynamicPluginSidebar usage="sidebar-right" chatId={chatId} />
    </div>
  );
}

// In plugin
function load(pluginAPI) {
  pluginAPI.registerClientComponent('KnowledgeBaseSidebar', 'pages/client/KnowledgeBaseSidebar.js', {
    usage: 'sidebar-left'
  });
}
```

---

#### 2. Plugin Activation

**Before (v0.0.1):**
```javascript
// Manual activation, no built-in system
// Had to manually run npm install
// Had to manually run migrations
```

**After (v0.0.14):**
```javascript
// In plugin
async function activate(pluginAPI) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  // 1. Install dependencies
  await execAsync('npm install', { cwd: __dirname });

  // 2. Run migrations
  await execAsync('masterrecord update-database rag');

  // 3. Fire activation hook
  await pluginAPI.hookService.doAction(
    pluginAPI.HOOKS.PLUGIN_ACTIVATED,
    { pluginName: 'my-plugin' }
  );

  return { success: true };
}

module.exports = { load, activate, deactivate };
```

**API Activation:**
```bash
curl -X POST http://localhost:8080/api/plugins/activate \
  -H "Content-Type: application/json" \
  -d '{"name":"rag-plugin"}'
```

---

## Future Roadmap

### Planned for v0.0.15
- `ADMIN_SIDEBAR_LEFT` - Admin sidebar components
- `ADMIN_SIDEBAR_RIGHT` - Admin sidebar components
- `ADMIN_MENU` - Admin menu items
- `PLUGIN_UPDATED` - Plugin version updates
- `PLUGIN_INSTALLED` - Plugin first installation

### Planned for v0.1.0
- `WORKSPACE_CREATED` - Workspace creation
- `WORKSPACE_UPDATED` - Workspace modification
- `WORKSPACE_DELETED` - Workspace deletion
- `FILE_UPLOADED` - File upload events
- `FILE_PROCESSED` - File processing completion

### Under Consideration
- `SOCKET_CONNECTED` - WebSocket connection
- `SOCKET_DISCONNECTED` - WebSocket disconnection
- `API_REQUEST` - API request filter
- `API_RESPONSE` - API response filter
- `THEME_CHANGED` - Theme switching
- `LANGUAGE_CHANGED` - Language/locale changes

---

## Hook Deprecation Policy

When a hook needs to be deprecated:

1. **Deprecation Notice** (1 version)
   - Add deprecation warning to documentation
   - Console warning when hook is used
   - Suggest alternative hook

2. **Deprecation Period** (2 versions)
   - Hook still works but logs warnings
   - Migration guide published

3. **Removal** (3rd version)
   - Hook removed from constants
   - Documentation archived
   - Breaking change noted in changelog

**Example Timeline:**
- v0.0.15: Deprecation announced
- v0.0.16-17: Deprecation warnings
- v0.0.18: Complete removal

---

## Contributing

### Adding a New Hook

1. **Update `hookConstants.js`**
```javascript
const HOOKS = {
  // ... existing hooks
  NEW_HOOK_NAME: 'new_hook_name',
};
```

2. **Update Hook Categories**
```javascript
function getHooksByCategory() {
  return {
    // ... existing categories
    'new-category': [HOOKS.NEW_HOOK_NAME],
  };
}
```

3. **Document in This File**
- Add to current version section
- Include: Type, Category, Purpose, Example
- Update hook statistics
- Add migration guide if needed

4. **Update HOOKS_DIRECTORY.md**
- Add full hook reference
- Include usage examples
- Update table of contents
- Update version history

5. **Test Hook**
- Create test plugin using the hook
- Verify hook fires correctly
- Test with multiple listeners
- Verify data format

6. **Create PR**
- Reference this changelog
- Include test results
- Update version number

---

## Questions or Issues?

- **Documentation Issues:** File at GitHub Issues
- **Hook Requests:** Create feature request
- **Hook Bugs:** Report with example code

---

**Last Updated:** November 5, 2024
**Maintained By:** Bookbag Development Team
