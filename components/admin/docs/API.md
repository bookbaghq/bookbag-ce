# Admin API Documentation

Complete API reference for the Admin component.

## Base URL

All endpoints are prefixed with `/bb-admin/api/` or `/bb-layout/api/`

## Authentication

All endpoints require authentication via session cookies. The `authService.currentUser()` method is used to verify the authenticated user.

---

## Settings Endpoints

### Get Settings
**GET** `/admin/settings`

Retrieves the current admin settings. If no settings exist, creates default settings (singleton initialization).

**Request:**
```bash
GET /bb-admin/api/admin/settings
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "disable_client_side": false,
    "plugin_upload_max_file_size": 104857600,
    "created_at": "1699999999000",
    "updated_at": "1699999999999"
  }
}
```

**Example Usage (JavaScript):**
```javascript
const response = await fetch('/bb-admin/api/admin/settings', {
  credentials: 'include'
});
const data = await response.json();
console.log('Client side enabled:', !data.settings.disable_client_side);
```

**Notes:**
- Settings are stored as a singleton (only one record exists)
- If no settings exist, default values are automatically created
- Default `disable_client_side`: `false`
- Default `plugin_upload_max_file_size`: `104857600` (100 MB)

---

### Update Settings
**POST** `/admin/settings`

Updates admin settings. Only provided fields are updated.

**Request Body:**
```json
{
  "disable_client_side": true,
  "plugin_upload_max_file_size": 52428800
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "disable_client_side": true,
    "plugin_upload_max_file_size": 52428800,
    "created_at": "1699999999000",
    "updated_at": "1700000000000"
  }
}
```

**Example Usage (JavaScript):**
```javascript
// Disable client-side interface
const response = await fetch('/bb-admin/api/admin/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    disable_client_side: true
  })
});
const data = await response.json();
```

**Field Descriptions:**

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `disable_client_side` | Boolean | Disables `/bb-client` interface | `false` |
| `plugin_upload_max_file_size` | Integer | Max plugin file size (bytes) | `104857600` (100 MB) |

**Validation:**
- `plugin_upload_max_file_size` should be positive integer
- Recommended range: 1 MB (1048576) to 500 MB (524288000)

**Notes:**
- Partial updates supported (only send fields you want to change)
- `updated_at` timestamp is automatically updated
- Settings are applied immediately (no restart required)

---

## Sidebar Endpoints

### Get Sidebar Menu
**GET** `/layout/sidebar`

Retrieves the complete admin sidebar menu structure with all menu items and submenus. This endpoint fires the `HOOKS.ADMIN_MENU` hook to allow plugins to add menu items dynamically.

**Request:**
```bash
GET /bb-admin/api/layout/sidebar
```

**Response:**
```json
{
  "success": true,
  "menu": [
    {
      "id": "admin",
      "label": "Admin",
      "url": "/bb-admin",
      "icon": "Settings",
      "position": 1
    },
    {
      "id": "chats",
      "label": "Chats",
      "url": "/bb-admin/chats",
      "icon": "MessageSquare",
      "position": 10
    },
    {
      "id": "media",
      "label": "Media",
      "url": "/bb-admin/media",
      "icon": "Image",
      "position": 20
    },
    {
      "id": "models",
      "label": "Models",
      "url": "/bb-admin/models",
      "icon": "Cpu",
      "position": 25
    },
    {
      "id": "mail",
      "label": "Mail",
      "url": "/bb-admin/mail",
      "icon": "Mail",
      "position": 40
    },
    {
      "id": "workspace",
      "label": "Workspaces",
      "url": "/bb-admin/workspaces",
      "icon": "Users",
      "position": 50
    },
    {
      "id": "users",
      "label": "Users",
      "url": "/bb-admin/users",
      "icon": "User",
      "position": 60
    },
    {
      "id": "plugins",
      "label": "Plugins",
      "url": "/bb-admin/plugins",
      "icon": "Puzzle",
      "position": 70
    },
    {
      "id": "developer-tools",
      "label": "Developer Tools",
      "url": "/bb-admin/developer-tools",
      "icon": "Code",
      "position": 75
    },
    {
      "id": "rag-documents",
      "label": "Knowledge Base",
      "url": "/bb-admin/rag/documents",
      "icon": "Database",
      "position": 80
    }
  ],
  "submenu": {
    "developer-tools": [
      {
        "label": "Hooks Inspector",
        "url": "/bb-admin/developer-tools/hooks-inspector"
      }
    ],
    "rag-documents": [
      {
        "label": "Documents",
        "url": "/bb-admin/rag/documents"
      },
      {
        "label": "Settings",
        "url": "/bb-admin/rag/settings"
      }
    ]
  }
}
```

**Example Usage (React):**
```javascript
import { useEffect, useState } from 'react';

function AdminSidebar() {
  const [menu, setMenu] = useState([]);
  const [submenu, setSubmenu] = useState({});

  useEffect(() => {
    async function loadMenu() {
      const response = await fetch('/bb-admin/api/layout/sidebar', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setMenu(data.menu);
        setSubmenu(data.submenu);
      }
    }
    loadMenu();
  }, []);

  return (
    <nav>
      {menu.map(item => (
        <div key={item.id}>
          <a href={item.url}>
            <Icon name={item.icon} />
            {item.label}
          </a>
          {submenu[item.id] && (
            <ul>
              {submenu[item.id].map(sub => (
                <li key={sub.url}>
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

**Menu Item Structure:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Unique identifier for the menu item |
| `label` | String | Yes | Display text |
| `url` | String | Yes | Navigation URL |
| `icon` | String | Yes | Icon name (Lucide React icons) |
| `position` | Integer | Yes | Sort order (lower = higher in list) |

**Submenu Item Structure:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | String | Yes | Display text |
| `url` | String | Yes | Navigation URL |

**Behavior:**
- Core menu items are hardcoded (always present)
- Plugins can add menu items via `HOOKS.ADMIN_MENU` hook
- Menu items are deduplicated by `id`
- Menu items are sorted by `position` (ascending)
- Submenus are grouped by parent menu item `id`

**Icon Options:**
The system uses Lucide React icons. Common options:
- `Settings`, `User`, `Users`, `MessageSquare`, `Image`, `Cpu`
- `Mail`, `Puzzle`, `Code`, `Database`, `FileText`, `Key`
- `Shield`, `Bell`, `Calendar`, `Search`, `Plus`, `Edit`

---

### Get Current Menu Item
**GET** `/layout/sidebar/current?path=/bb-admin/chats`

Retrieves the currently active menu item based on the current URL path.

**Query Parameters:**
- `path` - Current URL path (e.g., `/bb-admin/chats`)

**Request:**
```bash
GET /bb-admin/api/layout/sidebar/current?path=/bb-admin/chats
```

**Response:**
```json
{
  "success": true,
  "current": {
    "id": "chats",
    "label": "Chats",
    "url": "/bb-admin/chats",
    "icon": "MessageSquare",
    "position": 10
  }
}
```

**Example Usage (React):**
```javascript
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function useCurrentMenuItem() {
  const pathname = usePathname();
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    async function loadCurrent() {
      const response = await fetch(
        `/bb-admin/api/layout/sidebar/current?path=${pathname}`,
        { credentials: 'include' }
      );
      const data = await response.json();
      if (data.success) {
        setCurrent(data.current);
      }
    }
    loadCurrent();
  }, [pathname]);

  return current;
}
```

**Behavior:**
- Matches the path against all menu items
- Returns the first menu item where `url` matches the path
- Returns `null` if no match found
- Used for highlighting active menu item in UI

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common Error Scenarios:**

### Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```
**HTTP Status:** 401
**Cause:** No valid session cookie
**Solution:** Ensure user is logged in

### Settings Not Found
```json
{
  "success": false,
  "error": "Settings not found"
}
```
**HTTP Status:** 404
**Cause:** Settings record doesn't exist (rare, as it auto-creates)
**Solution:** System will auto-create on next request

### Invalid Parameters
```json
{
  "success": false,
  "error": "Invalid parameter: plugin_upload_max_file_size must be positive"
}
```
**HTTP Status:** 400
**Cause:** Invalid request body
**Solution:** Check request body format and values

### Internal Server Error
```json
{
  "success": false,
  "error": "Failed to update settings"
}
```
**HTTP Status:** 500
**Cause:** Database error or unexpected exception
**Solution:** Check server logs

---

## Plugin Integration

Plugins can extend the admin interface by adding menu items via hooks.

### Adding Menu Items

**Location:** Plugin's `index.js` (during initialization)

```javascript
module.exports.init = async function(master, config) {
  const hookService = master.requestList.hookService;
  const HOOKS = master.requestList.hookConstants;

  // Register menu items
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add top-level menu item
    context.addMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      url: '/bb-admin/my-plugin',
      icon: 'Puzzle',
      position: 80
    });

    // Add submenu items
    context.addSubmenuItem('my-plugin', {
      label: 'Dashboard',
      url: '/bb-admin/my-plugin/dashboard'
    });

    context.addSubmenuItem('my-plugin', {
      label: 'Settings',
      url: '/bb-admin/my-plugin/settings'
    });
  });
};
```

**Context Methods:**

#### `addMenuItem(item)`
Adds a top-level menu item.

**Parameters:**
- `item.id` (String, required) - Unique identifier
- `item.label` (String, required) - Display text
- `item.url` (String, required) - Navigation URL
- `item.icon` (String, required) - Icon name
- `item.position` (Integer, required) - Sort order

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
Adds a submenu item under a parent menu item.

**Parameters:**
- `parentId` (String, required) - Parent menu item ID
- `item.label` (String, required) - Display text
- `item.url` (String, required) - Navigation URL

**Example:**
```javascript
context.addSubmenuItem('analytics', {
  label: 'Reports',
  url: '/bb-admin/analytics/reports'
});
```

### Position Guidelines

Use these position ranges for consistency:

| Range | Purpose | Examples |
|-------|---------|----------|
| 1-10 | Core admin functions | Admin (1) |
| 11-30 | Content management | Chats (10), Media (20), Models (25) |
| 31-60 | Communication & collaboration | Mail (40), Workspaces (50), Users (60) |
| 61-80 | System management | Plugins (70), Dev Tools (75) |
| 81-100 | Custom plugin features | RAG (80), Custom plugins |

### Complete Plugin Example

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

---

## Settings Usage Examples

### Disable Client-Side Interface

```javascript
// Disable the /bb-client interface
async function disableClientSide() {
  const response = await fetch('/bb-admin/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      disable_client_side: true
    })
  });

  const data = await response.json();
  if (data.success) {
    console.log('Client-side interface disabled');
    // Redirect users away from /bb-client
    window.location.href = '/bb-admin';
  }
}
```

### Update Plugin Upload Limit

```javascript
// Set plugin upload limit to 50 MB
async function updateUploadLimit() {
  const limitInBytes = 50 * 1024 * 1024; // 50 MB

  const response = await fetch('/bb-admin/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      plugin_upload_max_file_size: limitInBytes
    })
  });

  const data = await response.json();
  if (data.success) {
    console.log(`Upload limit updated to ${limitInBytes} bytes`);
  }
}
```

### Check Current Settings

```javascript
// Display current settings
async function displaySettings() {
  const response = await fetch('/bb-admin/api/admin/settings', {
    credentials: 'include'
  });

  const data = await response.json();
  if (data.success) {
    const { settings } = data;
    console.log('Current Settings:');
    console.log(`- Client-side enabled: ${!settings.disable_client_side}`);
    console.log(`- Upload limit: ${settings.plugin_upload_max_file_size} bytes`);
    console.log(`- Upload limit (MB): ${settings.plugin_upload_max_file_size / (1024 * 1024)}`);
  }
}
```

---

## Rate Limiting

Currently, no rate limiting is enforced. Consider implementing rate limiting for production deployments.

**Recommendation:**
- Settings endpoints: 10 requests/minute per user
- Sidebar endpoints: 100 requests/minute per user

---

## Caching

**Current:** No caching implemented

**Recommendation:**
- Cache sidebar menu per user session (invalidate on plugin activation/deactivation)
- Cache settings in memory (invalidate on update)

**Example Cache Strategy:**
```javascript
// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getCachedSidebar(userId) {
  const cacheKey = `sidebar:${userId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  const data = await fetchSidebar();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

---

## Security Considerations

### 1. Authentication
All endpoints require authentication:
```javascript
const currentUser = authService.currentUser(req.request, req.userContext);
if (!currentUser) {
  return { success: false, error: 'Unauthorized' };
}
```

### 2. Authorization
**Current:** No role-based access control implemented.

**Recommendation:** Add admin role check:
```javascript
if (currentUser.role !== 'admin') {
  return { success: false, error: 'Forbidden: Admin access required' };
}
```

### 3. Input Validation
Settings controller should validate inputs:
```javascript
// Validate plugin_upload_max_file_size
if (plugin_upload_max_file_size) {
  if (plugin_upload_max_file_size < 1048576) { // 1 MB minimum
    return { success: false, error: 'Upload limit must be at least 1 MB' };
  }
  if (plugin_upload_max_file_size > 1073741824) { // 1 GB maximum
    return { success: false, error: 'Upload limit cannot exceed 1 GB' };
  }
}
```

### 4. CORS
Configure CORS appropriately:
```javascript
// Only allow same-origin requests
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS,
  credentials: true
}));
```

---

## Testing

### Unit Tests

```javascript
describe('Admin Settings API', () => {
  it('should return default settings if none exist', async () => {
    const response = await request(app)
      .get('/bb-admin/api/admin/settings')
      .set('Cookie', sessionCookie);

    expect(response.body.success).toBe(true);
    expect(response.body.settings.disable_client_side).toBe(false);
    expect(response.body.settings.plugin_upload_max_file_size).toBe(104857600);
  });

  it('should update settings', async () => {
    const response = await request(app)
      .post('/bb-admin/api/admin/settings')
      .set('Cookie', sessionCookie)
      .send({ disable_client_side: true });

    expect(response.body.success).toBe(true);
    expect(response.body.settings.disable_client_side).toBe(true);
  });

  it('should reject unauthenticated requests', async () => {
    const response = await request(app)
      .get('/bb-admin/api/admin/settings');

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Unauthorized');
  });
});

describe('Admin Sidebar API', () => {
  it('should return core menu items', async () => {
    const response = await request(app)
      .get('/bb-admin/api/layout/sidebar')
      .set('Cookie', sessionCookie);

    expect(response.body.success).toBe(true);
    expect(response.body.menu).toContainEqual(
      expect.objectContaining({ id: 'admin', label: 'Admin' })
    );
  });

  it('should include plugin menu items', async () => {
    // Register test plugin
    hookService.addAction(HOOKS.ADMIN_MENU, (context) => {
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

    expect(response.body.menu).toContainEqual(
      expect.objectContaining({ id: 'test-plugin', label: 'Test Plugin' })
    );
  });
});
```

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [DATABASE.md](./DATABASE.md) - Database schema
- [SIDEBAR.md](./SIDEBAR.md) - Sidebar system details
- [../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md](../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md) - Hook system
