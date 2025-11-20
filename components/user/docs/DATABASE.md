# User Component Database Schema

Complete database schema documentation for the User component using MasterController ORM.

## Table of Contents

- [Overview](#overview)
- [Database File](#database-file)
- [Entity Relationships](#entity-relationships)
- [Tables](#tables)
  - [User](#user-table)
  - [Auth](#auth-table)
  - [Settings](#settings-table)
- [Queries](#queries)
- [Migrations](#migrations)
- [Data Integrity](#data-integrity)
- [Performance](#performance)
- [Security](#security)

---

## Overview

The User component uses three main tables:

1. **User** - Stores user profile information
2. **Auth** - Stores authentication credentials and session data
3. **Settings** - Singleton table for system-wide settings

The database is managed using MasterRecord ORM with SQLite as the backend.

---

## Database File

- **Development**: `components/user/db/development.sqlite3`
- **Production**: Configured via environment variables
- **Context Name**: `userContext`

---

## Entity Relationships

```
┌──────────────┐
│     User     │
│              │
│ id (PK)      │
│ email        │◄─────────────┐
│ user_name    │              │
│ first_name   │              │
│ last_name    │              │
│ role         │              │
│ created_at   │              │
│ updated_at   │              │
└──────────────┘              │
                              │ 1:1
                              │
                      ┌───────┴───────┐
                      │     Auth      │
                      │               │
                      │ id (PK)       │
                      │ user_id (FK)  │
                      │ password_hash │
                      │ password_salt │
                      │ auth_token    │
                      │ temp_access.. │
                      │ ...           │
                      └───────────────┘

┌──────────────────┐
│    Settings      │
│   (Singleton)    │
│                  │
│ id (PK)          │
│ sign_up_enabled  │
│ sign_in_enabled  │
│ created_at       │
│ updated_at       │
└──────────────────┘
```

**Relationships:**
- User **hasOne** Auth (via `user_id`)
- Auth **belongsTo** User (via `user_id`)
- Settings is a standalone singleton (no relationships)

---

## Tables

## User Table

Stores user profile and account information.

**Table Name:** `User`

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique user identifier |
| `first_name` | STRING | | User's first name |
| `last_name` | STRING | | User's last name |
| `user_name` | STRING | | Username (derived from email if not provided) |
| `email` | STRING | NOT NULL, UNIQUE | User's email address |
| `role` | INTEGER | NOT NULL | Role: 1=Administrator, 2=Subscriber |
| `created_at` | STRING | NOT NULL | ISO timestamp of creation |
| `updated_at` | STRING | NOT NULL | ISO timestamp of last update |

### Role Values

The `role` field uses integer values but has getter/setter methods that convert to/from strings:

**Integer to String (Getter):**
```javascript
1 → "Administrator"
2 → "Subscriber"
```

**String to Integer (Setter):**
```javascript
"administrator" → 1
"subscriber" → 2
```

### Model Definition

```javascript
class User extends MasterController.db.EntityClass {
  id;
  first_name;
  last_name;
  user_name;
  email;
  role; // Integer in DB, string in code
  created_at;
  updated_at;

  // Getter converts integer to string
  role(db) {
    db.integer().notNullable();

    db.get(function(value) {
      switch(value) {
        case 1: return "Administrator"
        case 2: return "Subscriber"
      }
    });

    // Setter converts string to integer
    db.set(function(value) {
      var val = value.toLowerCase();
      switch(val) {
        case "administrator": return 1
        case "subscriber": return 2
      }
    });
  }

  // Case-insensitive email lookup
  email(db) {
    db.string().notNullable();
    db.get(function(value) {
      return value && value.toLowerCase();
    });
    db.set(function(value) {
      return value && value.toLowerCase();
    });
  }
}
```

### Indexes

- Primary key: `id`
- Unique constraint: `email` (case-insensitive)

### Default Values

```javascript
{
  id: AUTO_INCREMENT,
  first_name: "",
  last_name: "",
  user_name: "user@example", // Derived from email if not provided
  email: "user@example.com",
  role: 2, // Subscriber by default
  created_at: "2024-01-15T10:30:45.123Z",
  updated_at: "2024-01-15T10:30:45.123Z"
}
```

---

## Auth Table

Stores authentication credentials and session information.

**Table Name:** `Auth`

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique auth record identifier |
| `user_id` | INTEGER | FOREIGN KEY (User.id) | Reference to User table |
| `login_counter` | INTEGER | NOT NULL, DEFAULT 1 | Number of login attempts/sessions |
| `auth_token` | STRING | | JWT auth token |
| `temp_access_token` | STRING | | Session token stored in cookie |
| `password_reset_token` | STRING | | Token for password reset |
| `password_salt` | STRING | NOT NULL | bcrypt salt for password hashing |
| `password_hash` | STRING | NOT NULL | bcrypt hash of password |
| `password_reset_sent_at` | STRING | | Timestamp when reset token was sent |
| `created_at` | STRING | NOT NULL | ISO timestamp of creation |
| `updated_at` | STRING | NOT NULL | ISO timestamp of last update |

### Model Definition

```javascript
class Auth extends MasterController.db.EntityClass {
  id;
  user_id; // Foreign key to User
  login_counter;
  auth_token;
  temp_access_token;
  password_reset_token;
  password_salt;
  password_hash;
  password_reset_sent_at;
  created_at;
  updated_at;
}
```

### Password Storage

**bcrypt Configuration:**
- **Salt Rounds**: 10 (hardcoded in salt generation)
- **Salt Generation**: `bcrypt.genSaltSync(10)`
- **Hash Generation**: `bcrypt.hashSync(password, salt)`

**Registration Example:**
```javascript
const bcrypt = require('bcrypt');

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

auth.password_salt = salt;
auth.password_hash = hash;
```

**Login Verification Example:**
```javascript
const bcrypt = require('bcrypt');

const saltedHash = bcrypt.hashSync(password, auth.password_salt);
const isValid = (auth.password_hash === saltedHash);
```

### Session Management

**Session Token:**
- Generated during login
- Stored in `temp_access_token` field
- Also stored in httpOnly cookie on client
- Validated on each authenticated request

**Token Generation:**
```javascript
const tempAccessToken = this._generateRandomId(50);
auth.temp_access_token = tempAccessToken;
```

### Indexes

- Primary key: `id`
- Foreign key: `user_id` references `User(id)`
- Consider adding index on `temp_access_token` for faster session lookups

---

## Settings Table

Singleton table storing system-wide settings for user management.

**Table Name:** `Settings`

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique settings identifier |
| `sign_up_enabled` | BOOLEAN | DEFAULT 1 (true) | Whether registration is allowed |
| `sign_in_enabled` | BOOLEAN | DEFAULT 1 (true) | Whether login is required |
| `created_at` | STRING | NOT NULL | ISO timestamp of creation |
| `updated_at` | STRING | NOT NULL | ISO timestamp of last update |

### Model Definition

```javascript
class Settings extends MasterController.db.EntityClass {
  id;
  sign_up_enabled;
  sign_in_enabled;
  created_at;
  updated_at;
}
```

### Singleton Pattern

**Only one Settings record should exist at any time.**

```javascript
// Get the singleton
let settings = userContext.Settings.single();

if (!settings) {
  // Create default settings if none exist
  settings = new Settings();
  settings.sign_up_enabled = true;
  settings.sign_in_enabled = true;
  settings.created_at = Date.now().toString();
  settings.updated_at = Date.now().toString();

  userContext.Settings.add(settings);
  userContext.saveChanges();
}
```

### Settings Behavior

**`sign_up_enabled = false`:**
- Registration endpoint returns error
- `/bb-user/api/auth/register` blocked
- `/bb-user/api/auth/can-register` returns `{canRegister: false}`

**`sign_in_enabled = false`:**
- Login not required
- System generates temporary user IDs
- Users can access chat without authentication
- Temporary user ID stored in cookie: `temp_user_id`

---

## Queries

### User Queries

**Find user by ID:**
```javascript
const user = userContext.User
  .where(u => u.id == $$, userId)
  .single();
```

**Find user by email (case-insensitive):**
```javascript
const user = userContext.User
  .where(u => u.email == $$, email.toLowerCase())
  .single();
```

**Get all users:**
```javascript
const users = userContext.User.toList();
```

**Get users by role:**
```javascript
const admins = userContext.User
  .where(u => u.role == $$, 1)
  .toList();

const subscribers = userContext.User
  .where(u => u.role == $$, 2)
  .toList();
```

**Search users by name or email:**
```javascript
const searchTerm = `%${query}%`;
const users = userContext.User
  .raw(`
    SELECT * FROM User
    WHERE first_name LIKE ?
       OR last_name LIKE ?
       OR email LIKE ?
       OR user_name LIKE ?
  `, searchTerm, searchTerm, searchTerm, searchTerm)
  .toList();
```

**Update user:**
```javascript
const user = userContext.User
  .where(u => u.id == $$, userId)
  .single();

user.first_name = "John";
user.last_name = "Doe";
user.updated_at = Date.now().toString();

userContext.saveChanges();
```

**Delete user:**
```javascript
const user = userContext.User
  .where(u => u.id == $$, userId)
  .single();

userContext.User.remove(user);
userContext.saveChanges();
```

---

### Auth Queries

**Find auth by user ID:**
```javascript
const auth = userContext.Auth
  .where(a => a.user_id == $$, userId)
  .single();
```

**Find auth by email (via User relationship):**
```javascript
const user = userContext.User
  .where(u => u.email == $$, email.toLowerCase())
  .include('Auth')
  .single();

const auth = user ? user.Auth : null;
```

**Find auth by session token:**
```javascript
const auth = userContext.Auth
  .where(a => a.temp_access_token == $$, sessionToken)
  .single();
```

**Update password:**
```javascript
const bcrypt = require('bcrypt');

const auth = userContext.Auth
  .where(a => a.user_id == $$, userId)
  .single();

const newSalt = bcrypt.genSaltSync(10);
const newHash = bcrypt.hashSync(newPassword, newSalt);

auth.password_salt = newSalt;
auth.password_hash = newHash;
auth.updated_at = Date.now().toString();

userContext.saveChanges();
```

**Generate password reset token:**
```javascript
const resetToken = Math.random().toString(36).substring(2, 15);

auth.password_reset_token = resetToken;
auth.password_reset_sent_at = Date.now().toString();
auth.updated_at = Date.now().toString();

userContext.saveChanges();
```

**Clear session:**
```javascript
auth.temp_access_token = null;
auth.auth_token = null;
auth.updated_at = Date.now().toString();

userContext.saveChanges();
```

---

### Settings Queries

**Get settings (singleton):**
```javascript
let settings = userContext.Settings.single();

if (!settings) {
  // Create default settings
  settings = new Settings();
  settings.sign_up_enabled = true;
  settings.sign_in_enabled = true;
  settings.created_at = Date.now().toString();
  settings.updated_at = Date.now().toString();

  userContext.Settings.add(settings);
  userContext.saveChanges();
}
```

**Update settings:**
```javascript
let settings = userContext.Settings.single();

if (!settings) {
  settings = new Settings();
  userContext.Settings.add(settings);
}

settings.sign_up_enabled = false;
settings.sign_in_enabled = true;
settings.updated_at = Date.now().toString();

userContext.saveChanges();
```

**Check if sign-up is enabled:**
```javascript
const settings = userContext.Settings.take(1).toList()[0];
const signUpEnabled = settings && settings.sign_up_enabled !== 0;
```

**Check if sign-in is enabled:**
```javascript
const settings = userContext.Settings.take(1).toList()[0];
const signInEnabled = settings && settings.sign_in_enabled !== 0;
```

---

## Migrations

Migrations are stored in: `components/user/app/models/db/migrations/`

### Initial Migration

**File:** `1759119178873_Init_migration.js`

Creates all three tables and seeds the default admin user.

```javascript
module.exports.up = async function(queryInterface, Sequelize) {
  // Create User table
  await queryInterface.createTable('User', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    first_name: {
      type: Sequelize.STRING
    },
    last_name: {
      type: Sequelize.STRING
    },
    user_name: {
      type: Sequelize.STRING
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    role: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2
    },
    created_at: {
      type: Sequelize.STRING,
      allowNull: false
    },
    updated_at: {
      type: Sequelize.STRING,
      allowNull: false
    }
  });

  // Create Auth table
  await queryInterface.createTable('Auth', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: Sequelize.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    login_counter: {
      type: Sequelize.INTEGER,
      defaultValue: 1
    },
    auth_token: {
      type: Sequelize.STRING
    },
    temp_access_token: {
      type: Sequelize.STRING
    },
    password_reset_token: {
      type: Sequelize.STRING
    },
    password_salt: {
      type: Sequelize.STRING,
      allowNull: false
    },
    password_hash: {
      type: Sequelize.STRING,
      allowNull: false
    },
    password_reset_sent_at: {
      type: Sequelize.STRING
    },
    created_at: {
      type: Sequelize.STRING,
      allowNull: false
    },
    updated_at: {
      type: Sequelize.STRING,
      allowNull: false
    }
  });

  // Create Settings table
  await queryInterface.createTable('Settings', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sign_up_enabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    sign_in_enabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: Sequelize.STRING,
      allowNull: false
    },
    updated_at: {
      type: Sequelize.STRING,
      allowNull: false
    }
  });

  // Seed default admin user
  this.seed('User', {
    user_name: 'admin',
    email: 'admin@bookbag.ai',
    role: 1,
    created_at: Date.now().toString(),
    updated_at: Date.now().toString()
  });

  // Seed admin auth (password: 'changeme')
  this.seed('Auth', {
    user_id: user.id,
    password_salt: "$2b$10$mzeICOcznq08FgarX1fXa.",
    password_hash: "$2b$10$mzeICOcznq08FgarX1fXa.FDqddogZdM4txUo8bXA1G3wox/OEMBa",
    login_counter: 1
  });

  // Seed default settings
  this.seed('Settings', {
    sign_up_enabled: true,
    sign_in_enabled: true,
    created_at: Date.now().toString(),
    updated_at: Date.now().toString()
  });
};

module.exports.down = async function(queryInterface, Sequelize) {
  await queryInterface.dropTable('Auth');
  await queryInterface.dropTable('User');
  await queryInterface.dropTable('Settings');
};
```

### Running Migrations

```bash
# Run all pending migrations
masterrecord update-database userContext

# Rollback last migration
masterrecord rollback-database userContext

# Generate new migration
masterrecord generate-migration userContext AddAvatarToUser
```

### Default Admin User

**Email:** `admin@bookbag.ai`
**Password:** `changeme`
**Role:** Administrator (1)

**IMPORTANT:** Change the default password immediately after first login.

---

## Data Integrity

### Referential Integrity

**User → Auth (One-to-One):**
- Each User has exactly one Auth record
- Auth.user_id references User.id
- ON DELETE CASCADE: Deleting a user also deletes their auth record

### Validation Rules

**User Table:**
```javascript
function validateUser(user) {
  // Email is required and must be unique
  if (!user.email || user.email.trim() === '') {
    throw new Error('Email is required');
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    throw new Error('Invalid email format');
  }

  // Role must be 1 or 2
  if (user.role !== 1 && user.role !== 2) {
    throw new Error('Invalid role value');
  }

  return true;
}
```

**Auth Table:**
```javascript
function validateAuth(auth) {
  // Password salt is required
  if (!auth.password_salt) {
    throw new Error('Password salt is required');
  }

  // Password hash is required
  if (!auth.password_hash) {
    throw new Error('Password hash is required');
  }

  // User ID must exist
  const user = userContext.User
    .where(u => u.id == $$, auth.user_id)
    .single();

  if (!user) {
    throw new Error('Invalid user_id');
  }

  return true;
}
```

### Unique Constraints

**Email uniqueness (case-insensitive):**
```javascript
const existingUser = userContext.User
  .where(u => u.email == $$, newEmail.toLowerCase())
  .single();

if (existingUser && existingUser.id !== currentUserId) {
  throw new Error('Email already exists');
}
```

---

## Performance

### Indexing Strategy

**Recommended Indexes:**

```sql
-- Primary keys (auto-created)
CREATE INDEX idx_user_pk ON User(id);
CREATE INDEX idx_auth_pk ON Auth(id);
CREATE INDEX idx_settings_pk ON Settings(id);

-- Foreign keys
CREATE INDEX idx_auth_user_id ON Auth(user_id);

-- Frequently queried fields
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_auth_temp_token ON Auth(temp_access_token);
CREATE INDEX idx_auth_reset_token ON Auth(password_reset_token);
```

### Query Optimization

**Slow Query (Avoid):**
```javascript
// Bad: Loads all users into memory
const users = userContext.User.toList();
const admin = users.find(u => u.email === 'admin@example.com');
```

**Fast Query (Use This):**
```javascript
// Good: Direct database query with index
const admin = userContext.User
  .where(u => u.email == $$, 'admin@example.com')
  .single();
```

### Caching Strategy

**Settings Caching (Singleton):**
```javascript
let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

function getSettings() {
  const now = Date.now();

  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }

  cachedSettings = userContext.Settings.single();
  cacheTimestamp = now;

  return cachedSettings;
}
```

---

## Security

### Password Security

**Hashing Strategy:**
- **Algorithm**: bcrypt
- **Rounds**: 10
- **Salt**: Unique per user, stored separately
- **Hash**: Computed from password + salt

**Never store plaintext passwords.**

**Password Validation:**
```javascript
function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, error: 'Minimum 8 characters' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber) {
    return {
      valid: false,
      error: 'Must contain uppercase, lowercase, and numbers'
    };
  }

  return { valid: true };
}
```

### SQL Injection Prevention

**Use parameterized queries:**

```javascript
// BAD - Vulnerable to SQL injection
const user = userContext.User
  .raw(`SELECT * FROM User WHERE email = '${email}'`)
  .single();

// GOOD - Parameterized query
const user = userContext.User
  .where(u => u.email == $$, email)
  .single();
```

### Session Security

**Session Token Requirements:**
- Random, unpredictable tokens (50+ characters)
- Stored in httpOnly cookies (prevent JavaScript access)
- Expire after inactivity
- Clear on logout

**Token Generation:**
```javascript
function generateSecureToken(length = 50) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters[randomIndex];
  }

  return token;
}
```

### Data Access Control

**Prevent unauthorized access:**
```javascript
function checkUserAccess(currentUser, targetUserId) {
  // Admins can access any user
  if (currentUser.role === 1) {
    return true;
  }

  // Subscribers can only access their own data
  if (currentUser.id === targetUserId) {
    return true;
  }

  throw new Error('Forbidden: Insufficient permissions');
}
```

---

## Backup & Recovery

### Backup Strategy

```bash
# SQLite backup
sqlite3 components/user/db/development.sqlite3 \
  ".backup components/user/db/backup_$(date +%Y%m%d).sqlite3"

# Verify backup
sqlite3 components/user/db/backup_20240115.sqlite3 \
  "SELECT COUNT(*) FROM User;"
```

### Export to JSON

```javascript
// Export all users
const users = userContext.User.toList();
const usersJSON = JSON.stringify(users, null, 2);
fs.writeFileSync('users_backup.json', usersJSON);

// Export settings
const settings = userContext.Settings.single();
const settingsJSON = JSON.stringify(settings, null, 2);
fs.writeFileSync('settings_backup.json', settingsJSON);
```

---

## Troubleshooting

### Common Issues

**Issue: Email already exists**
```javascript
// Solution: Check case-insensitive
const existingUser = userContext.User
  .where(u => u.email == $$, email.toLowerCase())
  .single();
```

**Issue: User has no Auth record**
```javascript
// Solution: Create Auth with User
const user = new User();
// ... set user fields

userContext.User.add(user);
userContext.saveChanges();

const auth = new Auth();
auth.user_id = user.id;
auth.password_salt = salt;
auth.password_hash = hash;
// ... set other fields

userContext.Auth.add(auth);
userContext.saveChanges();
```

**Issue: Settings not found**
```javascript
// Solution: Always check for null and create defaults
let settings = userContext.Settings.single();

if (!settings) {
  settings = new Settings();
  settings.sign_up_enabled = true;
  settings.sign_in_enabled = true;
  settings.created_at = Date.now().toString();
  settings.updated_at = Date.now().toString();

  userContext.Settings.add(settings);
  userContext.saveChanges();
}
```

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [API.md](./API.md) - API endpoints
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Authentication flows

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
