# Hook System Architecture

## Overview

Bookbag has **two hook systems** that work together:

1. **Generic Hooks System** (NEW) - WordPress-style centralized hooks
2. **Specialized Hook Classes** (LEGACY) - Custom hook classes like `sidebarHook`

---

## Generic Hooks System (NEW)

### Architecture: Centralized Registry

**All hooks are managed in one place - no individual files needed!**

```
/components/plugins/app/core/
├── hookConstants.js         # ALL 21 hooks defined here
├── hookRegistration.js      # Central registry for actions & filters
├── hookInitializer.js       # Auto-registers all hooks
└── pluginLoader.js          # Loads plugins and provides hook access
```

### 21 Core Hooks (No Files Needed)

Hooks are defined as **constants** in `hookConstants.js`:

```javascript
const HOOKS = {
  // Core Lifecycle (3)
  CORE_INIT: 'bookbag_init',
  CORE_READY: 'bookbag_ready',
  CORE_SHUTDOWN: 'bookbag_shutdown',

  // Admin (5)
  ADMIN_MENU: 'admin_menu',
  ADMIN_VIEW_RENDER: 'admin_view_render',
  ADMIN_REGISTER_VIEW: 'admin_register_view',
  ADMIN_ENQUEUE: 'admin_enqueue',
  ADMIN_TOOLBAR: 'admin_toolbar',

  // Chat/Pipeline (5)
  CHAT_BEFORE_MESSAGE: 'chat_before_message',
  CHAT_AFTER_MESSAGE: 'chat_after_message',
  LLM_BEFORE_GENERATE: 'llm_before_generate',
  LLM_AFTER_GENERATE: 'llm_after_generate',
  CHAT_RESPONSE_FINAL: 'chat_response_final',

  // Frontend Client (3)
  CLIENT_SIDEBAR: 'client_sidebar',
  CLIENT_TOOLBAR: 'client_toolbar',
  CLIENT_WIDGET_RENDER: 'client_widget_render',

  // System/Developer (4)
  PLUGIN_LOADED: 'plugin_loaded',
  PLUGIN_ACTIVATED: 'plugin_activated',
  PLUGIN_DEACTIVATED: 'plugin_deactivated',
  ROUTES_REGISTERED: 'routes_registered'
};
```

### Usage

Plugins use hooks through the central registry:

```javascript
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Register any hook
  hookService.addAction(HOOKS.ADMIN_MENU, callback);
  hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, callback);
  // ... works for all 21 hooks!
}
```

### Why No Individual Files?

This is the **WordPress approach**:
- Hooks are **lightweight identifiers** (just strings)
- The **registry handles everything** (registration, execution, priorities)
- **No need for separate files** - hooks are data, not classes

**Benefits:**
- ✅ Easy to add new hooks (just add constant)
- ✅ Consistent API across all hooks
- ✅ Less code to maintain
- ✅ Plugins can use any hook without importing separate classes

---

## Specialized Hook Classes (LEGACY)

### Architecture: Custom Classes

Some hooks have **specialized classes** with custom APIs:

```
/components/plugins/app/hooks/
└── sidebarHook.js  # Custom API for admin sidebar
    ├── add_menu_page()
    ├── add_submenu_page()
    └── getAllMenus()
```

### Why They Exist

**These were built BEFORE the generic hooks system.**

They provide:
- Specialized APIs tailored to specific use cases
- Additional helper methods
- Backward compatibility for existing plugins

### Important: They Use Generic Hooks Internally!

Look at `sidebarHook.js` line 22:
```javascript
hookService.registerHook('admin_menu', 'Fires when building the admin sidebar menu');
```

And line 118:
```javascript
hookService.addAction('admin_menu', callback, 10);
```

**The specialized class is a WRAPPER around the generic hook system!**

---

## Comparison

### Generic Hook (New Way)

```javascript
// Plugin using generic admin_menu hook
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      url: '/bb-admin/my-plugin',
      icon: 'Settings'
    });
  });
}
```

### Specialized Hook (Legacy Way)

```javascript
// Plugin using specialized sidebarHook
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  sidebarHook.add_menu_page({
    id: 'my-plugin',
    label: 'My Plugin',
    path: '/bb-admin/my-plugin',
    icon: 'Settings'
  });
}
```

**Both work! They both use the same underlying system.**

---

## Should We Keep Both?

**Yes! Here's the strategy:**

### Keep Specialized Classes For:
1. **Backward compatibility** - existing plugins depend on them
2. **Convenience APIs** - some specialized methods are nice to have
3. **Complex functionality** - like URL generation in sidebarHook

### Use Generic Hooks For:
1. **New plugins** - simpler, more consistent API
2. **Custom hooks** - create your own without classes
3. **Cross-cutting concerns** - like logging, analytics

---

## Migration Path

### Existing Plugins (No Changes Needed)
```javascript
// Still works!
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;
  sidebarHook.add_menu_page({ label: 'Old Plugin' });
}
```

### New Plugins (Recommended)
```javascript
// Modern approach
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({ label: 'New Plugin' });
  });
}
```

### Hybrid Approach (Use Both)
```javascript
// Use what fits best
function load(pluginAPI) {
  const { hookService, HOOKS, sidebarHook } = pluginAPI;

  // Use specialized API for menus (convenience)
  sidebarHook.add_menu_page({ label: 'My Plugin' });

  // Use generic hooks for everything else (power)
  hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, validateMessage);
  hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, injectRAG);
}
```

---

## Creating New Hooks

### Option 1: Generic Hook (Recommended)

Just add to `hookConstants.js`:

```javascript
const HOOKS = {
  // ... existing hooks
  MY_CUSTOM_HOOK: 'my_custom_hook'
};
```

Then use anywhere:
```javascript
hookService.addAction(HOOKS.MY_CUSTOM_HOOK, callback);
await hookService.doAction(HOOKS.MY_CUSTOM_HOOK, data);
```

**Done! No files needed.**

### Option 2: Specialized Hook Class (Only If Needed)

Create `/hooks/mySpecialHook.js`:

```javascript
class MySpecialHook {
  constructor() {
    this.name = 'mySpecialHook';
    hookService.registerHook('my_special_hook', 'Description');
  }

  // Custom methods
  doSomethingSpecial() {
    hookService.doAction('my_special_hook', { ... });
  }
}

module.exports = new MySpecialHook();
```

**Only create specialized classes when you need:**
- Complex state management
- Many helper methods
- Custom business logic
- Backward compatibility

---

## Summary

| Feature | Generic Hooks | Specialized Classes |
|---------|--------------|-------------------|
| **Files Needed** | 0 (just constants) | 1 per hook |
| **API** | Consistent across all hooks | Custom per hook |
| **Use Cases** | General-purpose | Specific features |
| **Maintenance** | Low | Higher |
| **Flexibility** | High | Lower |
| **Learning Curve** | Easy | Moderate |
| **Recommended For** | New plugins | Legacy support |

---

## Conclusion

**Both systems work together harmoniously:**

1. **Generic Hooks** provide the foundation (21 core hooks, centralized registry)
2. **Specialized Classes** provide convenience APIs (built on top of generic hooks)
3. **Plugins can use either or both** depending on their needs

**For new development, prefer generic hooks** - they're simpler, more powerful, and easier to maintain.

**Keep specialized classes for backward compatibility and when their custom APIs provide real value.**

---

## File Structure

```
components/plugins/app/
├── core/                       # Generic Hooks System (NEW)
│   ├── hookConstants.js        # 21 hooks defined here
│   ├── hookRegistration.js    # Central registry
│   ├── hookInitializer.js     # Auto-registration
│   └── pluginLoader.js         # Plugin loading
│
└── hooks/                      # Specialized Classes (LEGACY)
    └── sidebarHook.js          # Sidebar-specific API
                                # (Uses generic hooks internally!)
```

**No confusion needed!** The generic system doesn't use individual files - that's by design and it's actually better than having 21 separate files.
