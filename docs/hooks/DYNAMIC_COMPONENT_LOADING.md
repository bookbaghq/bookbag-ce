# Dynamic Component Loading System

> **Version:** 0.0.14
> **Last Updated:** November 5, 2024
> **Status:** Production Ready

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Component Registration](#component-registration)
- [DynamicPluginSidebar Component](#dynamicpluginsidebar-component)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Dynamic Component Loading system allows plugins to register client-side React components that are automatically discovered and loaded at runtime. This eliminates hardcoded imports and enables true plugin extensibility for the frontend.

### Key Benefits

- ✅ **No hardcoded imports** - Components loaded dynamically via API
- ✅ **Plugin isolation** - Each plugin manages its own components
- ✅ **Multiple positions** - sidebar-left, sidebar-right, client-menu
- ✅ **Hot reload friendly** - Works with Next.js development mode
- ✅ **Type safe** - Full TypeScript support
- ✅ **Error resilient** - Failed component loads don't break the page

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Page (Next.js)                     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      <DynamicPluginSidebar usage="sidebar-left" />   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                   │
│                           │ 1. Fetch components              │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   GET /api/plugins/components/list?usage=sidebar-left │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────│───────────────────────────────────┘
                            │
                            │ 2. Return component list
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         pluginComponentsController.js                 │  │
│  │  • Queries pluginLoader for registered components    │  │
│  │  • Filters by usage type                             │  │
│  │  • Returns component metadata                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                   │
│                           │ 3. Get components from loader    │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         pluginLoader.js                               │  │
│  │  • Maintains registeredClientComponents Map          │  │
│  │  • getClientComponentsByUsage(usage)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                   │
│                           │ 4. Components registered by plugins
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Plugin (bb-plugins/rag-plugin/index.js)      │  │
│  │  • load() method calls registerClientComponent()    │  │
│  │  • Provides: name, path, metadata                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 5. Component info returned
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Client Page (Next.js)                     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      DynamicPluginSidebar                             │  │
│  │  • Receives: [{ name, importPath, metadata }]        │  │
│  │  • Dynamically imports each component                │  │
│  │  • Renders all components in order                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Step 1: Plugin Registers Component

In plugin's `load()` method:

```javascript
// bb-plugins/rag-plugin/index.js
function load(pluginAPI) {
  const { registerClientComponent } = pluginAPI;

  registerClientComponent('KnowledgeBaseSidebar', 'pages/client/KnowledgeBaseSidebar.js', {
    description: 'Document management sidebar',
    usage: 'sidebar-left',
    features: ['document-list', 'upload', 'settings']
  });
}
```

### Step 2: PluginLoader Stores Registration

```javascript
// components/plugins/app/core/pluginLoader.js
registerClientComponent(name, importPath, metadata) {
  this.registeredClientComponents.set(name, {
    importPath,
    metadata,
    plugin: currentPlugin
  });
}
```

### Step 3: Frontend Queries Components

```javascript
// nextjs-app/app/bb-client/_components/DynamicPluginSidebar.js
const response = await fetch(
  `${backendUrl}/api/plugins/components/list?usage=sidebar-left`
);
const data = await response.json();
// data.components = [{ name, importPath, metadata }]
```

### Step 4: Components Dynamically Imported

```javascript
// From nextjs-app/app/bb-client/_components/, go up 3 levels to nextjs-app/
const Component = await import(`../../../${comp.importPath}`);
// importPath format: plugins/rag-plugin/pages/client/KnowledgeBaseSidebar
```

### Step 5: Components Rendered

```javascript
<Component chatId={chatId} {...props} />
```

---

## Component Registration

### Registration in Plugin

```javascript
function load(pluginAPI) {
  const {
    registerView,              // For admin views
    registerClientComponent,   // For client components
    hookService,
    HOOKS
  } = pluginAPI;

  // Register client component
  registerClientComponent(
    'ComponentName',          // Unique name
    'pages/client/path.js',  // Import path (relative to plugin)
    {
      description: 'What it does',
      usage: 'sidebar-left',  // Required: where to render
      features: ['list'],      // Optional: feature list
      icon: 'document',        // Optional: icon name
      label: 'Documents'       // Optional: display label
    }
  );
}
```

### Usage Types

| Usage Type | Location | Purpose |
|-----------|----------|---------|
| `sidebar-left` | Left of main content | Navigation, tools, context |
| `sidebar-right` | Right of main content | Supplementary info, actions |
| `client-menu` | Top menu bar | Navigation items |

---

## DynamicPluginSidebar Component

### Component API

```typescript
interface DynamicPluginSidebarProps {
  usage: 'sidebar-left' | 'sidebar-right' | 'client-menu';
  chatId?: string;
  [key: string]: any;  // Additional props passed to loaded components
}
```

### Implementation

```javascript
// nextjs-app/app/bb-client/_components/DynamicPluginSidebar.js
'use client';

import { useState, useEffect } from 'react';

export function DynamicPluginSidebar({ usage, chatId, ...props }) {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [LoadedComponents, setLoadedComponents] = useState([]);

  useEffect(() => {
    async function loadSidebarComponents() {
      try {
        setLoading(true);
        setError(null);

        // Fetch component list from backend
        const backendUrl = api.ApiConfig.main;
        const response = await fetch(`${backendUrl}/api/plugins/components/list?usage=${usage}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch components: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to load components');
        }

        setComponents(data.components || []);

        // Dynamically import each component
        const loadedComps = await Promise.all(
          (data.components || []).map(async (comp) => {
            try {
              const componentModule = await import(`../../${comp.importPath}`);
              const Component = componentModule.default || componentModule[comp.name];
              return { name: comp.name, Component, metadata: comp.metadata };
            } catch (err) {
              console.error(`Error loading component ${comp.name}:`, err);
              return null;
            }
          })
        );

        setLoadedComponents(loadedComps.filter(Boolean));
      } catch (err) {
        console.error('Error loading sidebar components:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSidebarComponents();
  }, [usage]);

  if (loading) return null;
  if (error) {
    console.warn(`Sidebar ${usage} loading error:`, error);
    return null;
  }
  if (LoadedComponents.length === 0) return null;

  return (
    <>
      {LoadedComponents.map(({ name, Component, metadata }) => (
        <Component key={name} chatId={chatId} {...props} />
      ))}
    </>
  );
}
```

---

## API Endpoints

### List Components

**Endpoint:** `GET /api/plugins/components/list`

**Query Parameters:**
- `usage` (optional) - Filter by usage type (sidebar-left, sidebar-right, client-menu)

**Response:**
```json
{
  "success": true,
  "components": [
    {
      "name": "KnowledgeBaseSidebar",
      "importPath": "plugins/rag-plugin/pages/client/KnowledgeBaseSidebar.js",
      "metadata": {
        "description": "Document management sidebar",
        "usage": "sidebar-left",
        "features": ["document-list", "upload"]
      }
    }
  ],
  "count": 1,
  "usage": "sidebar-left"
}
```

---

### Get Single Component

**Endpoint:** `GET /api/plugins/components/get`

**Query Parameters:**
- `name` (required) - Component name

**Response:**
```json
{
  "success": true,
  "component": {
    "name": "KnowledgeBaseSidebar",
    "importPath": "plugins/rag-plugin/pages/client/KnowledgeBaseSidebar.js",
    "metadata": {
      "description": "Document management sidebar",
      "usage": "sidebar-left"
    }
  }
}
```

---

## Usage Examples

### Example 1: Chat Page with Sidebars

```javascript
// nextjs-app/app/bb-client/[chatId]/page.js
import { DynamicPluginSidebar } from '../_components/DynamicPluginSidebar';
import { ModernChatInterface } from '../_components/ModernChatInterface';

export default function ChatPage({ params }) {
  const chatId = params.chatId;

  return (
    <div className="flex h-screen">
      {/* Left sidebar - loads all sidebar-left components */}
      <DynamicPluginSidebar
        usage="sidebar-left"
        chatId={chatId}
        isWorkspaceCreated={true}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <ModernChatInterface chatId={chatId} />
      </div>

      {/* Right sidebar - loads all sidebar-right components */}
      <DynamicPluginSidebar
        usage="sidebar-right"
        chatId={chatId}
      />
    </div>
  );
}
```

---

### Example 2: RAG Plugin Sidebar Component

```javascript
// bb-plugins/rag-plugin/pages/client/KnowledgeBaseSidebar.js
'use client';

import { useState, useEffect } from 'react';

export default function KnowledgeBaseSidebar({ chatId, isWorkspaceCreated }) {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    async function loadDocuments() {
      const backendUrl = api.ApiConfig.main;
      const response = await fetch(`${backendUrl}/bb-rag/api/rag/list?tenantId=default`);
      const data = await response.json();
      setDocuments(data.documents || []);
    }
    loadDocuments();
  }, [chatId]);

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Knowledge Base</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {documents.map(doc => (
          <div key={doc.id} className="mb-2 p-2 bg-white rounded shadow-sm">
            {doc.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Example 3: Multiple Plugins with Sidebars

```javascript
// Plugin 1: RAG Plugin
function load(pluginAPI) {
  pluginAPI.registerClientComponent('KnowledgeBaseSidebar', 'pages/client/KnowledgeBaseSidebar.js', {
    usage: 'sidebar-left',
    order: 1
  });
}

// Plugin 2: Workspace Plugin
function load(pluginAPI) {
  pluginAPI.registerClientComponent('WorkspaceSidebar', 'pages/client/WorkspaceSidebar.js', {
    usage: 'sidebar-left',
    order: 2
  });
}

// Plugin 3: Notifications Plugin
function load(pluginAPI) {
  pluginAPI.registerClientComponent('NotificationsSidebar', 'pages/client/NotificationsSidebar.js', {
    usage: 'sidebar-right',
    order: 1
  });
}
```

**Result:**
```
┌────────────────┬─────────────────────┬──────────────────┐
│ Knowledge Base │    Chat Interface    │  Notifications  │
│ Workspace      │                     │                 │
│  (Plugin 1&2)  │                     │   (Plugin 3)    │
└────────────────┴─────────────────────┴──────────────────┘
```

---

## Best Practices

### ✅ DO

1. **Use 'use client' directive**
```javascript
'use client';

export default function MyComponent() {
  // Component code
}
```

2. **Handle loading states**
```javascript
export default function MyComponent({ chatId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  if (loading) return <div>Loading...</div>;
  if (!data) return null;

  return <div>{/* Component UI */}</div>;
}
```

3. **Export as default**
```javascript
// ✅ Good
export default function MyComponent() { }

// ❌ Bad
export function MyComponent() { }
```

4. **Provide descriptive metadata**
```javascript
registerClientComponent('MyComponent', 'pages/client/MyComponent.js', {
  description: 'Clear description of what it does',
  usage: 'sidebar-left',
  features: ['feature-1', 'feature-2'],
  icon: 'icon-name',
  label: 'Display Label'
});
```

---

### ❌ DON'T

1. **Don't use server-side only APIs**
```javascript
// ❌ Bad - fs is Node.js only
import fs from 'fs';

// ✅ Good - Use fetch to call backend API
const response = await fetch('/api/data');
```

2. **Don't forget error boundaries**
```javascript
// ❌ Bad - Errors crash entire page
export default function MyComponent() {
  const data = JSON.parse(localStorage.getItem('data'));
  return <div>{data.value}</div>;
}

// ✅ Good - Handle errors gracefully
export default function MyComponent() {
  try {
    const data = JSON.parse(localStorage.getItem('data') || '{}');
    return <div>{data?.value || 'No data'}</div>;
  } catch (error) {
    console.error('Error:', error);
    return <div>Error loading component</div>;
  }
}
```

3. **Don't block rendering**
```javascript
// ❌ Bad - Synchronous data loading
export default function MyComponent() {
  const data = fetchDataSync(); // Blocks
  return <div>{data}</div>;
}

// ✅ Good - Async with loading state
export default function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      const result = await fetchData();
      setData(result);
    }
    load();
  }, []);

  return <div>{data}</div>;
}
```

---

## Troubleshooting

### Issue: Component not loading

**Symptom:**
```
Error loading component MyComponent: Cannot find module
```

**Solution:**
```javascript
// Check import path is relative to plugin root
registerClientComponent(
  'MyComponent',
  'pages/client/MyComponent.js',  // ✅ Correct
  // NOT: '/pages/client/MyComponent.js'  // ❌ Wrong
  { usage: 'sidebar-left' }
);
```

---

### Issue: Component renders but crashes

**Symptom:**
```
Unhandled Runtime Error
Error: Cannot read property 'x' of undefined
```

**Solution:**
```javascript
// Add null checks and error boundaries
export default function MyComponent({ chatId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/data?chatId=${chatId}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      }
    }
    if (chatId) load();
  }, [chatId]);

  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>Loading...</div>;

  return <div>{data.value}</div>;
}
```

---

### Issue: Component not appearing

**Symptom:** No error, but component doesn't show up

**Checklist:**
1. ✅ Plugin is active
2. ✅ Component registered in `load()` method
3. ✅ `usage` matches DynamicPluginSidebar usage
4. ✅ Component export is default export
5. ✅ Import path is correct
6. ✅ Backend server is running

**Debug:**
```javascript
// Check component registration
curl http://localhost:8080/api/plugins/components/list?usage=sidebar-left

// Should return your component
```

---

## Performance Considerations

### Lazy Loading

Components are loaded lazily only when needed:

```javascript
// Component only imported when DynamicPluginSidebar renders
const Component = await import(`../../${comp.importPath}`);
```

### Caching

Consider implementing component caching:

```javascript
const componentCache = new Map();

async function loadComponent(path) {
  if (componentCache.has(path)) {
    return componentCache.get(path);
  }
  const module = await import(`../../${path}`);
  componentCache.set(path, module);
  return module;
}
```

---

## Related Documentation

- [Hooks Directory](./HOOKS_DIRECTORY.md)
- [Plugin Activation System](./PLUGIN_ACTIVATION_SYSTEM.md)
- [Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)

---

**Last Updated:** November 5, 2024
**Questions?** File an issue at [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
