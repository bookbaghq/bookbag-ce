# Database Schema Documentation

Database schema for the Admin component using MasterController ORM.

## Overview

The Admin component uses a lightweight database design with a single table implementing the Singleton pattern. All settings are stored in one record.

## Database File

- **Development**: `components/admin/db/development.sqlite3`
- **Production**: Configured via environment variables

## Tables

### `setting`

Stores system-wide admin settings. **Only one record exists at any time (singleton pattern).**

**Columns:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER | Auto | Primary key (auto-increment) |
| `disable_client_side` | BOOLEAN | `false` | Disables the `/bb-client` interface |
| `plugin_upload_max_file_size` | INTEGER | `104857600` | Max plugin file size in bytes (100 MB) |
| `created_at` | STRING | Now | Creation timestamp (ISO string) |
| `updated_at` | STRING | Now | Last update timestamp (ISO string) |

**Indexes:**
- Primary: `id`

**Constraints:**
- Singleton: Only one record should exist
- `plugin_upload_max_file_size` should be positive

**Default Values:**
```javascript
{
  id: 1,
  disable_client_side: false,
  plugin_upload_max_file_size: 104857600, // 100 MB
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

---

## Entity Model

The `Setting` model is defined in `app/models/setting.js`.

### Model Definition

```javascript
class Setting extends MasterController.db.EntityClass {
  id;
  disable_client_side;
  plugin_upload_max_file_size;
  created_at;
  updated_at;
}
```

### Model Schema

```javascript
adminContext.Setting.dbSet({
  tableName: 'setting',
  columns: [
    ['id', 'INTEGER', 'PRIMARY KEY', 'AUTOINCREMENT'],
    ['disable_client_side', 'BOOLEAN', 'DEFAULT', 0],
    ['plugin_upload_max_file_size', 'INTEGER', 'DEFAULT', 104857600],
    ['created_at', 'STRING'],
    ['updated_at', 'STRING']
  ]
});
```

---

## Singleton Pattern

The `Setting` model implements the Singleton pattern to ensure only one settings record exists.

### Accessing the Singleton

```javascript
// Get the single settings record
let setting = adminContext.Setting.single();

if (!setting) {
  // Initialize default settings if none exist
  setting = new Setting();
  setting.disable_client_side = false;
  setting.plugin_upload_max_file_size = 104857600; // 100 MB
  setting.created_at = new Date().toISOString();
  setting.updated_at = new Date().toISOString();

  adminContext.Setting.add(setting);
  adminContext.saveChanges();
}
```

### Updating the Singleton

```javascript
// Get singleton
let setting = adminContext.Setting.single();

if (!setting) {
  // Create if doesn't exist
  setting = new Setting();
  setting.disable_client_side = false;
  setting.plugin_upload_max_file_size = 104857600;
  setting.created_at = new Date().toISOString();
  setting.updated_at = new Date().toISOString();
  adminContext.Setting.add(setting);
} else {
  // Update existing
  if (formData.disable_client_side !== undefined) {
    setting.disable_client_side = formData.disable_client_side;
  }

  if (formData.plugin_upload_max_file_size !== undefined) {
    setting.plugin_upload_max_file_size = formData.plugin_upload_max_file_size;
  }

  setting.updated_at = new Date().toISOString();
}

adminContext.saveChanges();
```

---

## Queries

### Get Settings

```javascript
// Get the single settings record
const setting = adminContext.Setting.single();
```

**Returns:**
- `Setting` object if exists
- `null` if no settings exist

**Example:**
```javascript
const setting = adminContext.Setting.single();

if (setting) {
  console.log('Client-side enabled:', !setting.disable_client_side);
  console.log('Upload limit:', setting.plugin_upload_max_file_size);
} else {
  console.log('No settings found, will create defaults');
}
```

### Update Settings

```javascript
// Get singleton
let setting = adminContext.Setting.single();

// Create if doesn't exist
if (!setting) {
  setting = new Setting();
  adminContext.Setting.add(setting);
}

// Update fields
setting.disable_client_side = true;
setting.plugin_upload_max_file_size = 52428800; // 50 MB
setting.updated_at = new Date().toISOString();

// Save changes
adminContext.saveChanges();
```

### Check if Settings Exist

```javascript
const settingsExist = adminContext.Setting.single() !== null;
```

---

## Migrations

Migrations are stored in: `app/models/db/migrations/`

### Initial Migration

Creates the `setting` table with default schema.

**Migration File:** `[timestamp]_Init_migration.js`

```javascript
module.exports.up = async function(queryInterface, Sequelize) {
  await queryInterface.createTable('setting', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    disable_client_side: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    plugin_upload_max_file_size: {
      type: Sequelize.INTEGER,
      defaultValue: 104857600
    },
    created_at: {
      type: Sequelize.STRING
    },
    updated_at: {
      type: Sequelize.STRING
    }
  });
};

module.exports.down = async function(queryInterface, Sequelize) {
  await queryInterface.dropTable('setting');
};
```

### Running Migrations

```bash
# Run all pending migrations
masterrecord update-database adminContext

# Rollback last migration
masterrecord rollback-database adminContext

# Generate new migration
masterrecord generate-migration adminContext AddNewSettingField
```

---

## Field Details

### `disable_client_side`

**Type:** Boolean
**Default:** `false`
**Purpose:** Controls access to the `/bb-client` interface

**Values:**
- `false` (0) - Client-side interface is enabled
- `true` (1) - Client-side interface is disabled

**Usage:**
```javascript
// Disable client-side
setting.disable_client_side = true;
adminContext.saveChanges();

// Check status
if (setting.disable_client_side) {
  console.log('Client-side interface is disabled');
  // Redirect users, hide links, etc.
}
```

**Implementation Note:**
The frontend should check this setting on routes/pages and redirect users away from `/bb-client` when disabled.

---

### `plugin_upload_max_file_size`

**Type:** Integer (bytes)
**Default:** `104857600` (100 MB)
**Purpose:** Maximum file size for plugin uploads

**Common Values:**
```javascript
// 10 MB
setting.plugin_upload_max_file_size = 10 * 1024 * 1024; // 10485760

// 50 MB
setting.plugin_upload_max_file_size = 50 * 1024 * 1024; // 52428800

// 100 MB (default)
setting.plugin_upload_max_file_size = 100 * 1024 * 1024; // 104857600

// 200 MB
setting.plugin_upload_max_file_size = 200 * 1024 * 1024; // 209715200

// 500 MB
setting.plugin_upload_max_file_size = 500 * 1024 * 1024; // 524288000

// 1 GB
setting.plugin_upload_max_file_size = 1 * 1024 * 1024 * 1024; // 1073741824
```

**Validation:**
```javascript
// Minimum: 1 MB
if (plugin_upload_max_file_size < 1048576) {
  throw new Error('Upload limit must be at least 1 MB');
}

// Maximum: 1 GB
if (plugin_upload_max_file_size > 1073741824) {
  throw new Error('Upload limit cannot exceed 1 GB');
}
```

**Usage:**
```javascript
// Get upload limit in MB
const limitMB = setting.plugin_upload_max_file_size / (1024 * 1024);
console.log(`Plugin upload limit: ${limitMB} MB`);

// Check if file exceeds limit
if (file.size > setting.plugin_upload_max_file_size) {
  console.error(`File too large: ${file.size} bytes (limit: ${setting.plugin_upload_max_file_size})`);
}
```

---

### `created_at` / `updated_at`

**Type:** String (ISO 8601 timestamp)
**Format:** `YYYY-MM-DDTHH:mm:ss.sssZ`
**Example:** `"2024-01-15T10:30:45.123Z"`

**Usage:**
```javascript
// Set timestamps
setting.created_at = new Date().toISOString();
setting.updated_at = new Date().toISOString();

// Parse timestamps
const createdDate = new Date(setting.created_at);
const updatedDate = new Date(setting.updated_at);

// Check when last updated
const timeSinceUpdate = Date.now() - new Date(setting.updated_at).getTime();
console.log(`Settings last updated ${timeSinceUpdate}ms ago`);
```

---

## Relationships

The `setting` table has **no relationships** to other tables. It is a standalone singleton.

---

## Performance Optimization

### Indexing Strategy

Since only one record exists, indexing is minimal:
- Primary key on `id` (auto-created)
- No additional indexes needed

### Query Optimization

```javascript
// Fast: Direct singleton access (no WHERE clause)
const setting = adminContext.Setting.single();

// Avoid: Full table scan (unnecessary)
const settings = adminContext.Setting.toList();
```

### Caching Strategy

Recommended caching pattern:

```javascript
// In-memory cache
let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

function getSettings() {
  const now = Date.now();

  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }

  // Cache miss or expired
  cachedSettings = adminContext.Setting.single();
  cacheTimestamp = now;

  return cachedSettings;
}

function invalidateCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}

// Use in controller
const settings = getSettings();

// After update
setting.disable_client_side = true;
adminContext.saveChanges();
invalidateCache();
```

---

## Data Integrity

### Singleton Enforcement

Ensure only one record exists:

```javascript
// Check for duplicates
const allSettings = adminContext.Setting.toList();

if (allSettings.length > 1) {
  console.error('CRITICAL: Multiple settings records detected!');

  // Keep only the first record
  for (let i = 1; i < allSettings.length; i++) {
    adminContext.Setting.remove(allSettings[i]);
  }

  adminContext.saveChanges();
}
```

### Data Validation

```javascript
function validateSettings(setting) {
  // Validate disable_client_side
  if (typeof setting.disable_client_side !== 'boolean') {
    throw new Error('disable_client_side must be boolean');
  }

  // Validate plugin_upload_max_file_size
  if (typeof setting.plugin_upload_max_file_size !== 'number') {
    throw new Error('plugin_upload_max_file_size must be number');
  }

  if (setting.plugin_upload_max_file_size < 1048576) {
    throw new Error('plugin_upload_max_file_size must be at least 1 MB');
  }

  if (setting.plugin_upload_max_file_size > 1073741824) {
    throw new Error('plugin_upload_max_file_size cannot exceed 1 GB');
  }

  return true;
}
```

---

## Backup & Recovery

### Backup Strategy

```bash
# SQLite backup
sqlite3 components/admin/db/development.sqlite3 \
  ".backup components/admin/db/backup_$(date +%Y%m%d).sqlite3"

# Verify backup
sqlite3 components/admin/db/backup_20240115.sqlite3 \
  "SELECT * FROM setting;"
```

### Export Settings

```javascript
// Export to JSON
const setting = adminContext.Setting.single();
const settingsJSON = JSON.stringify(setting, null, 2);
fs.writeFileSync('settings_backup.json', settingsJSON);
```

### Import Settings

```javascript
// Import from JSON
const settingsJSON = fs.readFileSync('settings_backup.json', 'utf-8');
const data = JSON.parse(settingsJSON);

let setting = adminContext.Setting.single();
if (!setting) {
  setting = new Setting();
  adminContext.Setting.add(setting);
}

setting.disable_client_side = data.disable_client_side;
setting.plugin_upload_max_file_size = data.plugin_upload_max_file_size;
setting.updated_at = new Date().toISOString();

adminContext.saveChanges();
```

---

## Security

### Input Sanitization

```javascript
function sanitizeSettings(formData) {
  const sanitized = {};

  // Sanitize boolean
  if ('disable_client_side' in formData) {
    sanitized.disable_client_side = Boolean(formData.disable_client_side);
  }

  // Sanitize integer
  if ('plugin_upload_max_file_size' in formData) {
    const size = parseInt(formData.plugin_upload_max_file_size, 10);

    if (isNaN(size)) {
      throw new Error('Invalid file size');
    }

    sanitized.plugin_upload_max_file_size = size;
  }

  return sanitized;
}
```

### Access Control

```javascript
// Check user is admin before allowing settings access
function requireAdmin(currentUser) {
  if (!currentUser) {
    throw new Error('Unauthorized');
  }

  if (currentUser.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
}

// In controller
requireAdmin(currentUser);
const setting = adminContext.Setting.single();
```

---

## Troubleshooting

### Settings Not Persisting

**Problem:** Settings revert after restart.

**Causes:**
1. Database file not writable
2. Changes not saved with `adminContext.saveChanges()`
3. Database file deleted on restart

**Solutions:**
```bash
# Check file permissions
ls -la components/admin/db/development.sqlite3

# Make writable
chmod 644 components/admin/db/development.sqlite3

# Check parent directory is writable
ls -la components/admin/db/
chmod 755 components/admin/db/
```

```javascript
// Always call saveChanges()
setting.disable_client_side = true;
adminContext.saveChanges(); // REQUIRED
```

---

### Multiple Settings Records

**Problem:** More than one settings record exists.

**Solution:**
```javascript
// Delete duplicates
const allSettings = adminContext.Setting.toList();

if (allSettings.length > 1) {
  console.warn(`Found ${allSettings.length} settings records, keeping first`);

  // Remove duplicates
  for (let i = 1; i < allSettings.length; i++) {
    adminContext.Setting.remove(allSettings[i]);
  }

  adminContext.saveChanges();
}
```

---

### Database Locked

**Problem:** `database is locked` error.

**Causes:**
- Multiple processes accessing database
- Long-running transaction

**Solutions:**
```javascript
// Use transactions properly
try {
  adminContext.beginTransaction();

  const setting = adminContext.Setting.single();
  setting.disable_client_side = true;
  adminContext.saveChanges();

  adminContext.commit();
} catch (error) {
  adminContext.rollback();
  throw error;
}
```

```bash
# Check for locking processes
lsof components/admin/db/development.sqlite3

# Kill locking process if safe
kill -9 <PID>
```

---

## Testing

### Unit Tests

```javascript
describe('Setting Model', () => {
  it('should enforce singleton pattern', () => {
    const setting1 = adminContext.Setting.single();
    const setting2 = adminContext.Setting.single();

    expect(setting1).toBe(setting2);
    expect(setting1.id).toBe(setting2.id);
  });

  it('should create default settings if none exist', () => {
    // Clear all settings
    const allSettings = adminContext.Setting.toList();
    allSettings.forEach(s => adminContext.Setting.remove(s));
    adminContext.saveChanges();

    // Should be null
    expect(adminContext.Setting.single()).toBeNull();

    // Create defaults
    const setting = new Setting();
    setting.disable_client_side = false;
    setting.plugin_upload_max_file_size = 104857600;
    setting.created_at = new Date().toISOString();
    setting.updated_at = new Date().toISOString();

    adminContext.Setting.add(setting);
    adminContext.saveChanges();

    // Should now exist
    const saved = adminContext.Setting.single();
    expect(saved).not.toBeNull();
    expect(saved.disable_client_side).toBe(false);
    expect(saved.plugin_upload_max_file_size).toBe(104857600);
  });

  it('should update settings', () => {
    const setting = adminContext.Setting.single();

    setting.disable_client_side = true;
    setting.plugin_upload_max_file_size = 52428800;
    setting.updated_at = new Date().toISOString();

    adminContext.saveChanges();

    const updated = adminContext.Setting.single();
    expect(updated.disable_client_side).toBe(true);
    expect(updated.plugin_upload_max_file_size).toBe(52428800);
  });
});
```

---

## Future Enhancements

1. **Settings Categories** - Group related settings
2. **Settings History** - Track changes over time
3. **Settings Validation Schema** - JSON Schema validation
4. **Settings Export/Import** - Bulk settings management
5. **Settings Presets** - Pre-configured setting templates
6. **Settings Audit Log** - Track who changed what and when
7. **Settings Encryption** - Encrypt sensitive settings at rest
8. **Settings Versioning** - Roll back to previous settings
9. **Settings API** - RESTful API for programmatic access
10. **Settings UI Generator** - Auto-generate admin UI from schema

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [API.md](./API.md) - API reference
- [SIDEBAR.md](./SIDEBAR.md) - Sidebar system
- [../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md](../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md) - Hook system
