# Admin Sidebar Menu Flow - WordPress Style

Complete guide to how the admin sidebar menu system works, from plugin registration to frontend rendering.

## 🎯 Complete Flow Diagram

```
Frontend Loads Admin Page
         ↓
    GET /admin/sidebar
         ↓
┌────────────────────────────────────┐
│ Sidebar Controller                  │
│ (settings/app/controllers/admin/   │
│  sidebarController.js)              │
└────────────────────────────────────┘
         ↓
  Calls fireAdminMenuHook(context)
         ↓
┌────────────────────────────────────┐
│ Hook System                         │
│ do_action('admin_menu', context)    │
└────────────────────────────────────┘
         ↓
    Loops through all registered
    plugin callbacks (in priority order)
         ↓
┌──────────────┬──────────────┬──────────────┐
│ RAG Plugin   │ Media Plugin │ Mail Plugin  │
│ Checks DB    │ Checks DB    │ Checks DB    │
│ if active    │ if active    │ if active    │
│ ↓            │ ↓            │ ↓            │
│ add_menu_    │ add_menu_    │ add_menu_    │
│ page()       │ page()       │ page()       │
└──────────────┴──────────────┴──────────────┘
         ↓
┌────────────────────────────────────┐
│ Menu Registry (dataLayer.js)       │
│ Collects all menu items             │
│ Stores in memory:                   │
│   menu[] = [{id,label,path,...}]   │
│   submenu[] = {parent: [...]}      │
└────────────────────────────────────┘
         ↓
  Returns snapshot to Sidebar Controller
         ↓
  Filter by user capabilities
         ↓
  Generate WordPress-style URLs
         ↓
  Return JSON to frontend
         ↓
┌────────────────────────────────────┐
│ Frontend React Component            │
│ Renders sidebar menu                │
└────────────────────────────────────┘
```

## 🔧 Step-by-Step Breakdown

### Step 1: Frontend Requests Menu

**Frontend code:**
```javascript
// In your admin layout/sidebar component
useEffect(() => {
  async function fetchMenu() {
    const response = await fetch('http://localhost:8080/admin/sidebar', {
      credentials: 'include'
    });

    const data = await response.json();
    setMenu(data.menu);
    setSubmenu(data.submenu);
  }

  fetchMenu();
}, []);
```

**Request:**
```
GET /admin/sidebar
Headers:
  Cookie: session=...
```

---

### Step 2: Sidebar Controller Handles Request

**File:** `components/settings/app/controllers/admin/sidebarController.js`

```javascript
async getSidebar(req, res) {
  // 1. Build context from request
  const context = {
    req,
    res,
    user: req.user,
    tenant: req.tenant,
    tenantId: req.tenantId || 'default'
  };

  // 2. Fire admin_menu hook
  const snapshot = await fireAdminMenuHook(context);

  // 3. Filter by user capabilities
  const filteredMenu = getFilteredMenu(snapshot, req.user);

  // 4. Generate URLs
  const menuWithUrls = this.buildMenuWithUrls(
    filteredMenu.menu,
    filteredMenu.submenu
  );

  // 5. Return to frontend
  return res.json({
    success: true,
    menu: menuWithUrls.menu,
    submenu: menuWithUrls.submenu
  });
}
```

---

### Step 3: Hook System Fires admin_menu

**File:** `components/bb-plugins/core/admin/sidebar/registration.js`

```javascript
export async function fireAdminMenuHook(context = {}) {
  // Reset menu (clean slate for this request)
  const { _resetMenu } = await import('./dataLayer.js');
  _resetMenu();

  // Fire the admin_menu action
  // This calls ALL registered callbacks in priority order
  await doAction('admin_menu', context);

  // Return the built menu snapshot
  return buildMenuSnapshot();
}
```

**What `doAction` does:**
```javascript
// From hooks.js
export async function doAction(name, context = {}) {
  const list = hooks.get(name) || []; // Get all 'admin_menu' hooks

  // Execute each callback in priority order (low to high)
  for (const { fn } of list) {
    await fn(context);  // ← Plugin callback runs here!
  }
}
```

---

### Step 4: Each Plugin Callback Executes

**Example:** `components/bb-plugins/rag-plugin/ragPlugin.js`

```javascript
// This was registered when plugin loaded:
onAdminMenu(async ({ req, user, tenantId }) => {
  // Check if plugin is active in database
  const enabled = await isRagEnabled(tenantId || 'default');
  if (!enabled) return; // Skip if disabled

  // Register menu item
  add_menu_page({
    id: 'rag',
    label: 'RAG Knowledge Base',
    path: 'rag',  // ← This becomes the slug!
    icon: 'Database',
    capability: 'manage_rag',
    priority: 30
  });

  // Register submenus
  add_submenu_page('rag', {
    id: 'rag-index',
    label: 'Index Management',
    path: 'rag-index',
    capability: 'manage_rag',
    priority: 5
  });
}, 10); // Priority 10
```

---

### Step 5: Menu Registry Collects Items

**File:** `components/bb-plugins/core/admin/sidebar/dataLayer.js`

```javascript
const menu = [];      // Stores top-level menus
const submenu = {};   // Stores submenus

export function addMenuPage({ id, label, path, icon, capability, priority }) {
  menu.push({ id, label, path, icon, capability, priority });
  menu.sort((a, b) => a.priority - b.priority);
}

export function addSubmenuPage(parentId, { id, label, path, capability, priority }) {
  if (!submenu[parentId]) submenu[parentId] = [];
  submenu[parentId].push({ id, label, path, capability, priority });
  submenu[parentId].sort((a, b) => a.priority - b.priority);
}
```

**After all plugins run, menu looks like:**
```javascript
menu = [
  { id: 'rag', label: 'RAG Knowledge Base', path: 'rag', priority: 30, ... },
  { id: 'media', label: 'Media Library', path: 'media', priority: 20, ... },
  ...
]

submenu = {
  'rag': [
    { id: 'rag-index', label: 'Index Management', path: 'rag-index', ... },
    { id: 'rag-sources', label: 'Knowledge Sources', path: 'rag-sources', ... }
  ]
}
```

---

### Step 6: Filter by User Capabilities

**File:** `components/bb-plugins/core/admin/sidebar/registration.js`

```javascript
export function getFilteredMenu(snapshot, user) {
  const filteredMenu = filterMenuByCapability(snapshot.menu, user);
  const filteredSubmenu = {};

  for (const [parentId, subs] of Object.entries(snapshot.submenu)) {
    const filtered = filterMenuByCapability(subs, user);
    if (filtered.length > 0) {
      filteredSubmenu[parentId] = filtered;
    }
  }

  return { menu: filteredMenu, submenu: filteredSubmenu };
}

function filterMenuByCapability(items, user) {
  return items.filter(item => {
    if (!item.capability) return true; // No capability required
    if (user.role === 'admin') return true; // Admins see everything
    return (user.capabilities || []).includes(item.capability);
  });
}
```

---

### Step 7: Generate WordPress-Style URLs

**File:** `components/settings/app/controllers/admin/sidebarController.js`

```javascript
generateUrl(slug, parentSlug = null) {
  // If slug is a full path (ends with .php), use it directly
  if (slug.endsWith('.php')) {
    return `/bb-admin/${slug}`;
  }

  // Custom plugin pages use admin.php?page={slug} format
  if (parentSlug) {
    return `/bb-admin/admin.php?page=${parentSlug}&subpage=${slug}`;
  }

  return `/bb-admin/admin.php?page=${slug}`;
}
```

**URL Generation Examples:**

| Plugin Slug | Generated URL |
|-------------|--------------|
| `'rag'` | `/bb-admin/admin.php?page=rag` |
| `'media'` | `/bb-admin/admin.php?page=media` |
| `'rag-index'` (submenu of `rag`) | `/bb-admin/admin.php?page=rag&subpage=rag-index` |
| `'edit.php'` | `/bb-admin/edit.php` |

**After URL generation:**
```javascript
menu = [
  {
    id: 'rag',
    label: 'RAG Knowledge Base',
    slug: 'rag',
    url: '/bb-admin/admin.php?page=rag',  // ← Generated!
    icon: 'Database',
    ...
  },
  ...
]
```

---

### Step 8: Return JSON to Frontend

**Response:**
```json
{
  "success": true,
  "menu": [
    {
      "id": "rag",
      "label": "RAG Knowledge Base",
      "slug": "rag",
      "url": "/bb-admin/admin.php?page=rag",
      "icon": "Database",
      "capability": "manage_rag",
      "priority": 30
    },
    {
      "id": "media",
      "label": "Media Library",
      "slug": "media",
      "url": "/bb-admin/admin.php?page=media",
      "icon": "Image",
      "capability": "upload_files",
      "priority": 20
    }
  ],
  "submenu": {
    "rag": [
      {
        "id": "rag-index",
        "label": "Index Management",
        "slug": "rag-index",
        "url": "/bb-admin/admin.php?page=rag&subpage=rag-index",
        "capability": "manage_rag",
        "priority": 5
      }
    ]
  },
  "meta": {
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "role": "admin"
    },
    "generated_at": 1698432000000
  }
}
```

---

### Step 9: Frontend Renders Menu

**Example React Component:**
```javascript
function AdminSidebar() {
  const [menu, setMenu] = useState([]);
  const [submenu, setSubmenu] = useState({});
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    async function fetchMenu() {
      const response = await fetch('http://localhost:8080/admin/sidebar', {
        credentials: 'include'
      });

      const data = await response.json();
      setMenu(data.menu);
      setSubmenu(data.submenu);
    }

    fetchMenu();
  }, []);

  return (
    <nav className="admin-sidebar">
      {menu.map(item => (
        <div key={item.id}>
          <a
            href={item.url}
            className={activeItem === item.id ? 'active' : ''}
          >
            <Icon name={item.icon} />
            {item.label}
          </a>

          {/* Render submenus if they exist */}
          {submenu[item.id] && (
            <ul className="submenu">
              {submenu[item.id].map(sub => (
                <li key={sub.id}>
                  <a href={sub.url}>{sub.label}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
```

---

## 🎨 URL Generation Deep Dive

### WordPress Logic

WordPress uses this pattern in `wp-admin/menu.php`:

```php
// Core page (has .php extension)
$menu[5] = array( 'Posts', 'edit_posts', 'edit.php', ... );
// URL: /wp-admin/edit.php

// Plugin page (no .php)
$menu[26] = array( 'My Plugin', 'manage_options', 'my-plugin-slug', ... );
// URL: /wp-admin/admin.php?page=my-plugin-slug
```

### BookBag Implementation

```javascript
generateUrl(slug, parentSlug = null) {
  // Rule 1: Full path (e.g., 'edit.php')
  if (slug.endsWith('.php')) {
    return `/bb-admin/${slug}`;
  }

  // Rule 2: Submenu under parent
  if (parentSlug) {
    return `/bb-admin/admin.php?page=${parentSlug}&subpage=${slug}`;
  }

  // Rule 3: Top-level custom page
  return `/bb-admin/admin.php?page=${slug}`;
}
```

**Examples:**

| Input | Output |
|-------|--------|
| `generateUrl('dashboard.php')` | `/bb-admin/dashboard.php` |
| `generateUrl('rag')` | `/bb-admin/admin.php?page=rag` |
| `generateUrl('settings', 'rag')` | `/bb-admin/admin.php?page=rag&subpage=settings` |

---

## 🔍 Determining Active Menu Item

The sidebar controller also provides an endpoint to determine which menu item is currently active:

```javascript
GET /admin/sidebar/current?url=/bb-admin/admin.php?page=rag
```

**Response:**
```json
{
  "success": true,
  "currentItem": {
    "id": "rag",
    "label": "RAG Knowledge Base",
    "url": "/bb-admin/admin.php?page=rag"
  },
  "currentParent": {
    "id": "rag",
    "label": "RAG Knowledge Base"
  }
}
```

**Frontend usage:**
```javascript
const currentUrl = window.location.pathname + window.location.search;

const response = await fetch(
  `http://localhost:8080/admin/sidebar/current?url=${encodeURIComponent(currentUrl)}`,
  { credentials: 'include' }
);

const { currentItem, currentParent } = await response.json();

// Highlight active menu item
setActiveItem(currentItem.id);
setActiveParent(currentParent?.id);
```

---

## 📋 Complete API Reference

### GET /admin/sidebar

**Description:** Get complete admin sidebar menu for current user

**Authentication:** Required (via session cookie)

**Response:**
```javascript
{
  success: boolean,
  menu: Array<MenuItem>,
  submenu: Object<parentId, Array<MenuItem>>,
  meta: {
    user: { id, email, role },
    generated_at: timestamp
  }
}
```

**MenuItem:**
```javascript
{
  id: string,
  label: string,
  slug: string,
  url: string,        // ← WordPress-style URL
  icon: string,
  capability: string | null,
  priority: number,
  originalPath: string
}
```

### GET /admin/sidebar/current?url={url}

**Description:** Get current active menu item based on URL

**Parameters:**
- `url` (required): Current page URL

**Response:**
```javascript
{
  success: boolean,
  currentItem: MenuItem | null,
  currentParent: MenuItem | null
}
```

---

## 🎯 Key Takeaways

1. **Database-Driven:** Plugins stored in DB, loaded dynamically
2. **Hook-Based:** Plugins register menus via `onAdminMenu` hook
3. **Per-Request:** Menu built fresh each request with current context
4. **Capability-Filtered:** Users only see menus they have permission for
5. **URL Generation:** WordPress-style URLs generated automatically from slugs
6. **Frontend-Agnostic:** API returns JSON, works with any frontend framework

---

## 🚀 Quick Start for Frontend Developers

```javascript
// 1. Fetch menu on component mount
const response = await fetch('http://localhost:8080/admin/sidebar', {
  credentials: 'include'
});

const { menu, submenu } = await response.json();

// 2. Render top-level items
menu.map(item => (
  <a href={item.url}>{item.label}</a>
));

// 3. Render submenus
submenu[parentId]?.map(sub => (
  <a href={sub.url}>{sub.label}</a>
));

// 4. Determine active item
const currentUrl = window.location.href;
const activeResponse = await fetch(
  `http://localhost:8080/admin/sidebar/current?url=${currentUrl}`
);

const { currentItem } = await activeResponse.json();

// 5. Highlight active item
if (item.id === currentItem?.id) {
  className += ' active';
}
```

---

## 📚 Related Documentation

- [Plugin System Overview](./README.md)
- [Hook System Reference](../../docs/hooks/README.md)
- [Quick Reference Guide](../../docs/hooks/QUICK_REFERENCE.md)
