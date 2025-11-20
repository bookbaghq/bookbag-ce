# Database Schema Documentation

Database schema for the Mail component using MasterController ORM.

## Overview

The Mail component uses three tables:
- **MailSettings** - Singleton for global mail settings
- **MailSmtpConnection** - Singleton for SMTP configuration
- **MailLog** - Log of all sent/failed emails

## Database File

- **Development**: `components/mail/db/development.sqlite3`
- **Production**: Configured via environment variables

## Tables

### `mailsettings`

Stores global mail settings. **Only one record exists at any time (singleton pattern).**

**Columns:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER | Auto | Primary key (auto-increment) |
| `from_name` | STRING | `null` | Sender display name |
| `from_email` | STRING | `null` | Sender email address |
| `return_path_matches_from` | BOOLEAN | `false` | Return-Path header matches from_email |
| `weekly_summary_enabled` | BOOLEAN | `false` | Enable weekly email summary |
| `created_at` | STRING | Now | Creation timestamp (ISO string) |
| `updated_at` | STRING | Now | Last update timestamp (ISO string) |

**Indexes:**
- Primary: `id`

**Constraints:**
- Singleton: Only one record should exist
- `from_email` should be valid email format (validation recommended)

**Default Values:**
```javascript
{
  id: 1,
  from_name: null,
  from_email: null,
  return_path_matches_from: false,
  weekly_summary_enabled: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

---

### `mailsmtpconnection`

Stores SMTP server configuration. **Only one record exists at any time (singleton pattern).**

**Columns:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER | Auto | Primary key (auto-increment) |
| `host` | STRING | `'localhost'` | SMTP server hostname |
| `port` | INTEGER | `25` | SMTP server port |
| `secure` | BOOLEAN | `false` | Use SSL/TLS (true for port 465) |
| `auth_user` | STRING | `null` | SMTP username |
| `auth_pass` | STRING | `null` | SMTP password (plain text) |
| `is_backup` | BOOLEAN | `false` | Mark as backup SMTP server |
| `is_active` | BOOLEAN | `true` | Enable/disable SMTP connection |
| `created_at` | STRING | Now | Creation timestamp (ISO string) |
| `updated_at` | STRING | Now | Last update timestamp (ISO string) |

**Indexes:**
- Primary: `id`

**Constraints:**
- Singleton: Only one record should exist
- `port` should be between 1 and 65535
- `host` is required (not nullable)

**Default Values:**
```javascript
{
  id: 1,
  host: 'localhost',
  port: 25,
  secure: false,
  auth_user: null,
  auth_pass: null,
  is_backup: false,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
```

**Security Note:** `auth_pass` is stored in plain text. Consider encrypting in production.

---

### `maillog`

Stores log of all email send attempts (successful and failed).

**Columns:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER | Auto | Primary key (auto-increment) |
| `message_id` | STRING | `null` | SMTP message ID (e.g., `<abc@example.com>`) |
| `to_email` | STRING | Required | Recipient email address |
| `subject` | STRING | `null` | Email subject line |
| `status` | STRING | `null` | Email status: sent, failed, opened, clicked |
| `provider` | STRING | `null` | Email provider: smtp, sendgrid, etc. |
| `meta` | STRING | `null` | JSON metadata (template, from, error details) |
| `created_at` | STRING | Now | Creation timestamp (ISO string) |
| `updated_at` | STRING | Now | Last update timestamp (ISO string) |

**Indexes:**
- Primary: `id`
- Index: `status`, `to_email`, `created_at`

**Constraints:**
- `to_email` is required (not nullable)
- `status` should be one of: sent, failed, opened, clicked

**Meta JSON Structure:**
```json
{
  "template": "user_created",
  "from": "noreply@bookbag.com",
  "test": true,
  "error": "SMTP connection timeout",
  "data": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Status Values:**
- `sent` - Email sent successfully
- `failed` - Email failed to send
- `opened` - Email opened by recipient (future)
- `clicked` - Link clicked in email (future)

---

## Entity Models

### MailSettings Model

**File:** `app/models/mailSettings.js`

**Model Definition:**
```javascript
class MailSettings extends masterrecord.entity {
    id(db){
        db.integer().primary().auto();
    }
    from_name(db){
        db.string().nullable();
    }
    from_email(db){
        db.string().nullable();
    }
    return_path_matches_from(db){
        db.boolean().default(false);
    }
    weekly_summary_enabled(db){
        db.boolean().default(false);
    }
    created_at(db){
        db.string().notNullable();
    }
    updated_at(db){
        db.string().notNullable();
    }
}
```

**Model Registration:**
```javascript
mailContext.dbset(MailSettings);
```

---

### MailSmtpConnection Model

**File:** `app/models/mailSmtpConnection.js`

**Model Definition:**
```javascript
class MailSmtpConnection extends masterrecord.entity {
    id(db){
        db.integer().primary().auto();
    }
    host(db){
        db.string().notNullable();
    }
    port(db){
        db.integer().notNullable().default(25);
    }
    secure(db){
        db.boolean().default(false);
    }
    auth_user(db){
        db.string().nullable();
    }
    auth_pass(db){
        db.string().nullable();
    }
    is_backup(db){
        db.boolean().default(false);
    }
    is_active(db){
        db.boolean().default(true);
    }
    created_at(db){
        db.string().notNullable();
    }
    updated_at(db){
        db.string().notNullable();
    }
}
```

**Model Registration:**
```javascript
mailContext.dbset(MailSmtpConnection);
```

---

### MailLog Model

**File:** `app/models/mailLog.js`

**Model Definition:**
```javascript
class MailLog extends masterrecord.entity {
    id(db){
        db.integer().primary().auto();
    }
    message_id(db){
        db.string().nullable();
    }
    to_email(db){
        db.string().notNullable();
    }
    subject(db){
        db.string().nullable();
    }
    status(db){
        db.string().nullable();
    }
    provider(db){
        db.string().nullable();
    }
    meta(db){
        db.string().nullable();
    }
    created_at(db){
        db.string().notNullable();
    }
    updated_at(db){
        db.string().notNullable();
    }
}
```

**Model Registration:**
```javascript
mailContext.dbset(MailLog);
```

---

## Database Context

**File:** `app/models/mailContext.js`

```javascript
const masterrecord = require('masterrecord');
const MailSettings = require('./mailSettings');
const MailSmtpConnection = require('./mailSmtpConnection');
const MailLog = require('./mailLog');

class mailContext extends masterrecord.context {
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(MailSettings);
        this.dbset(MailSmtpConnection);
        this.dbset(MailLog);
    }
}

module.exports = mailContext;
```

---

## Singleton Pattern

MailSettings and MailSmtpConnection use the Singleton pattern to ensure only one settings record exists.

### Accessing Singletons

```javascript
// Get mail settings singleton
let settings = mailContext.MailSettings.single();

if (!settings) {
  // Initialize default settings if none exist
  settings = new MailSettings();
  settings.from_name = null;
  settings.from_email = null;
  settings.return_path_matches_from = false;
  settings.weekly_summary_enabled = false;
  settings.created_at = new Date().toISOString();
  settings.updated_at = new Date().toISOString();

  mailContext.MailSettings.add(settings);
  mailContext.saveChanges();
}
```

```javascript
// Get SMTP connection singleton
let smtp = mailContext.MailSmtpConnection.single();

if (!smtp) {
  // Initialize default SMTP config if none exist
  smtp = new MailSmtpConnection();
  smtp.host = 'localhost';
  smtp.port = 25;
  smtp.secure = false;
  smtp.auth_user = null;
  smtp.auth_pass = null;
  smtp.is_backup = false;
  smtp.is_active = true;
  smtp.created_at = new Date().toISOString();
  smtp.updated_at = new Date().toISOString();

  mailContext.MailSmtpConnection.add(smtp);
  mailContext.saveChanges();
}
```

### Updating Singletons

```javascript
// Update mail settings
let settings = mailContext.MailSettings.single();

if (!settings) {
  settings = new MailSettings();
  mailContext.MailSettings.add(settings);
}

settings.from_name = 'Bookbag CE';
settings.from_email = 'noreply@bookbag.example.com';
settings.return_path_matches_from = true;
settings.updated_at = new Date().toISOString();

mailContext.saveChanges();
```

```javascript
// Update SMTP configuration
let smtp = mailContext.MailSmtpConnection.single();

if (!smtp) {
  smtp = new MailSmtpConnection();
  mailContext.MailSmtpConnection.add(smtp);
}

smtp.host = 'smtp.gmail.com';
smtp.port = 587;
smtp.secure = false;
smtp.auth_user = 'user@gmail.com';
smtp.auth_pass = 'app-password';
smtp.is_active = true;
smtp.updated_at = new Date().toISOString();

mailContext.saveChanges();
```

---

## Queries

### Common Queries

#### Get Mail Settings
```javascript
const settings = mailContext.MailSettings.single();
```

**Returns:**
- `MailSettings` object if exists
- `null` if no settings exist

#### Get SMTP Configuration
```javascript
const smtp = mailContext.MailSmtpConnection.single();
```

**Returns:**
- `MailSmtpConnection` object if exists
- `null` if no SMTP config exists

#### Get All Mail Logs
```javascript
const logs = mailContext.MailLog
  .orderByDescending(ml => ml.created_at)
  .toList();
```

#### Get Failed Emails
```javascript
const failedLogs = mailContext.MailLog
  .where(ml => ml.status == $$, 'failed')
  .orderByDescending(ml => ml.created_at)
  .toList();
```

#### Get Logs for Specific Email
```javascript
const userLogs = mailContext.MailLog
  .where(ml => ml.to_email == $$, 'user@example.com')
  .orderByDescending(ml => ml.created_at)
  .toList();
```

#### Get Paginated Logs
```javascript
const page = 1;
const limit = 50;
const offset = (page - 1) * limit;

const logs = mailContext.MailLog
  .orderByDescending(ml => ml.created_at)
  .skip(offset)
  .take(limit)
  .toList();

const total = mailContext.MailLog.count();
```

#### Search Logs
```javascript
const searchTerm = 'password';

const logs = mailContext.MailLog
  .where(ml =>
    ml.subject.includes($$) || ml.to_email.includes($$),
    searchTerm, searchTerm
  )
  .orderByDescending(ml => ml.created_at)
  .toList();
```

#### Delete Old Logs
```javascript
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

const oldLogs = mailContext.MailLog
  .where(ml => ml.created_at < $$, cutoffDate.toISOString())
  .toList();

oldLogs.forEach(log => {
  mailContext.MailLog.remove(log);
});

mailContext.saveChanges();
```

---

## Migrations

Migrations are stored in: `app/models/db/migrations/`

### Initial Migration

Creates all three tables with proper schema.

**Migration File:** `[timestamp]_Init_migration.js`

```javascript
module.exports.up = async function(queryInterface, Sequelize) {
  // Create mailsettings table
  await queryInterface.createTable('mailsettings', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    from_name: {
      type: Sequelize.STRING,
      allowNull: true
    },
    from_email: {
      type: Sequelize.STRING,
      allowNull: true
    },
    return_path_matches_from: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    weekly_summary_enabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
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

  // Create mailsmtpconnection table
  await queryInterface.createTable('mailsmtpconnection', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    host: {
      type: Sequelize.STRING,
      allowNull: false
    },
    port: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 25
    },
    secure: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    auth_user: {
      type: Sequelize.STRING,
      allowNull: true
    },
    auth_pass: {
      type: Sequelize.STRING,
      allowNull: true
    },
    is_backup: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    is_active: {
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

  // Create maillog table
  await queryInterface.createTable('maillog', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    message_id: {
      type: Sequelize.STRING,
      allowNull: true
    },
    to_email: {
      type: Sequelize.STRING,
      allowNull: false
    },
    subject: {
      type: Sequelize.STRING,
      allowNull: true
    },
    status: {
      type: Sequelize.STRING,
      allowNull: true
    },
    provider: {
      type: Sequelize.STRING,
      allowNull: true
    },
    meta: {
      type: Sequelize.STRING,
      allowNull: true
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

  // Create indexes
  await queryInterface.addIndex('maillog', ['status']);
  await queryInterface.addIndex('maillog', ['to_email']);
  await queryInterface.addIndex('maillog', ['created_at']);
};

module.exports.down = async function(queryInterface, Sequelize) {
  await queryInterface.dropTable('maillog');
  await queryInterface.dropTable('mailsmtpconnection');
  await queryInterface.dropTable('mailsettings');
};
```

### Running Migrations

```bash
# Run all pending migrations
masterrecord update-database mailContext

# Rollback last migration
masterrecord rollback-database mailContext

# Generate new migration
masterrecord generate-migration mailContext AddNewField
```

---

## Field Details

### MailSettings Fields

#### `from_name`
**Type:** String (nullable)
**Default:** `null`
**Purpose:** Sender display name shown in email clients

**Example:**
```javascript
settings.from_name = 'Bookbag CE Notifications';
// Email shows: From: Bookbag CE Notifications <noreply@bookbag.com>
```

#### `from_email`
**Type:** String (nullable)
**Default:** `null`
**Purpose:** Sender email address

**Example:**
```javascript
settings.from_email = 'noreply@bookbag.example.com';
// Email shows: From: noreply@bookbag.example.com
```

#### `return_path_matches_from`
**Type:** Boolean
**Default:** `false`
**Purpose:** Set Return-Path header to match from_email

**Usage:**
```javascript
// When true: Return-Path: noreply@bookbag.example.com
// When false: Return-Path: (SMTP server default)
settings.return_path_matches_from = true;
```

#### `weekly_summary_enabled`
**Type:** Boolean
**Default:** `false`
**Purpose:** Enable weekly email summary feature

**Usage:**
```javascript
// Enable weekly summaries
settings.weekly_summary_enabled = true;
// TODO: Implement weekly summary cron job
```

---

### MailSmtpConnection Fields

#### `host`
**Type:** String (required)
**Default:** `'localhost'`
**Purpose:** SMTP server hostname

**Common Values:**
```javascript
// Gmail
smtp.host = 'smtp.gmail.com';

// SendGrid
smtp.host = 'smtp.sendgrid.net';

// Mailgun
smtp.host = 'smtp.mailgun.org';

// AWS SES
smtp.host = 'email-smtp.us-east-1.amazonaws.com';
```

#### `port`
**Type:** Integer (required)
**Default:** `25`
**Purpose:** SMTP server port

**Common Ports:**
```javascript
// SMTP (no encryption)
smtp.port = 25;

// SMTP with STARTTLS
smtp.port = 587;

// SMTP with SSL/TLS
smtp.port = 465;

// Alternative SMTP (some ISPs)
smtp.port = 2525;
```

#### `secure`
**Type:** Boolean
**Default:** `false`
**Purpose:** Use SSL/TLS connection

**Usage:**
```javascript
// For port 587 (STARTTLS)
smtp.port = 587;
smtp.secure = false;

// For port 465 (SSL/TLS)
smtp.port = 465;
smtp.secure = true;
```

#### `auth_user` and `auth_pass`
**Type:** String (nullable)
**Default:** `null`
**Purpose:** SMTP authentication credentials

**Usage:**
```javascript
// Gmail with app password
smtp.auth_user = 'your-email@gmail.com';
smtp.auth_pass = 'xxxx xxxx xxxx xxxx';

// SendGrid with API key
smtp.auth_user = 'apikey';
smtp.auth_pass = 'SG.xxxxxxxxxxxxxx';
```

**Security Warning:** Passwords are stored in plain text. Consider encrypting.

#### `is_backup`
**Type:** Boolean
**Default:** `false`
**Purpose:** Mark as backup SMTP server (future enhancement)

**Usage:**
```javascript
// Primary SMTP
smtp.is_backup = false;

// Backup SMTP (for failover)
smtp.is_backup = true;
```

#### `is_active`
**Type:** Boolean
**Default:** `true`
**Purpose:** Enable/disable SMTP connection

**Usage:**
```javascript
// Active SMTP (send emails)
smtp.is_active = true;

// Disabled SMTP (no emails sent)
smtp.is_active = false;
```

---

### MailLog Fields

#### `message_id`
**Type:** String (nullable)
**Default:** `null`
**Purpose:** SMTP message ID returned by mail server

**Example:**
```javascript
log.message_id = '<abc123.def456@bookbag.example.com>';
```

#### `to_email`
**Type:** String (required)
**Purpose:** Recipient email address

**Example:**
```javascript
log.to_email = 'user@example.com';
```

#### `subject`
**Type:** String (nullable)
**Purpose:** Email subject line

**Example:**
```javascript
log.subject = 'Welcome, John Doe';
```

#### `status`
**Type:** String (nullable)
**Default:** `null`
**Purpose:** Email delivery status

**Valid Values:**
- `'sent'` - Email sent successfully
- `'failed'` - Email failed to send
- `'opened'` - Email opened (future)
- `'clicked'` - Link clicked (future)

**Example:**
```javascript
log.status = 'sent'; // Success
log.status = 'failed'; // Failed
```

#### `provider`
**Type:** String (nullable)
**Default:** `null`
**Purpose:** Email provider used

**Example:**
```javascript
log.provider = 'smtp'; // Direct SMTP
log.provider = 'sendgrid'; // SendGrid API (future)
log.provider = 'mailgun'; // Mailgun API (future)
```

#### `meta`
**Type:** String (nullable - JSON)
**Default:** `null`
**Purpose:** Additional metadata about the email

**Example:**
```javascript
log.meta = JSON.stringify({
  template: 'user_created',
  from: 'noreply@bookbag.com',
  test: true,
  data: {
    firstName: 'John',
    lastName: 'Doe'
  }
});
```

**For Failed Emails:**
```javascript
log.meta = JSON.stringify({
  error: 'SMTP connection timeout',
  errorCode: 'ETIMEDOUT',
  template: 'register'
});
```

---

## Relationships

**Current:** No relationships between tables (all independent).

**Future Enhancement:** Consider adding foreign keys:
- `maillog.settings_id` → `mailsettings.id`
- `maillog.smtp_id` → `mailsmtpconnection.id`

---

## Performance Optimization

### Indexing Strategy

**Current Indexes:**
- `maillog.status` - Fast filtering by status (sent/failed)
- `maillog.to_email` - Fast filtering by recipient
- `maillog.created_at` - Fast ordering by date

**Recommended Additional Indexes:**
```sql
CREATE INDEX idx_maillog_status_created ON maillog(status, created_at);
CREATE INDEX idx_maillog_subject ON maillog(subject);
```

### Query Optimization

```javascript
// Fast: Uses index
const failedLogs = mailContext.MailLog
  .where(ml => ml.status == $$, 'failed')
  .orderByDescending(ml => ml.created_at)
  .take(10)
  .toList();

// Slow: Full table scan on meta (JSON string)
const testLogs = mailContext.MailLog
  .where(ml => ml.meta.includes($$), '"test":true')
  .toList();
```

### Caching Strategy

Cache singleton settings to avoid repeated database queries:

```javascript
// In-memory cache
let cachedSettings = null;
let cachedSmtp = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

function getSettings() {
  const now = Date.now();

  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }

  cachedSettings = mailContext.MailSettings.single();
  cacheTimestamp = now;

  return cachedSettings;
}

function getSmtp() {
  const now = Date.now();

  if (cachedSmtp && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSmtp;
  }

  cachedSmtp = mailContext.MailSmtpConnection.single();
  cacheTimestamp = now;

  return cachedSmtp;
}

function invalidateCache() {
  cachedSettings = null;
  cachedSmtp = null;
  cacheTimestamp = 0;
}
```

---

## Data Integrity

### Singleton Enforcement

Ensure only one settings/SMTP record exists:

```javascript
// Check for duplicates
const allSettings = mailContext.MailSettings.toList();

if (allSettings.length > 1) {
  console.error('CRITICAL: Multiple settings records detected!');

  // Keep only the first record
  for (let i = 1; i < allSettings.length; i++) {
    mailContext.MailSettings.remove(allSettings[i]);
  }

  mailContext.saveChanges();
}
```

### Data Validation

```javascript
function validateSettings(settings) {
  // Validate from_email format
  if (settings.from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.from_email)) {
    throw new Error('Invalid from_email format');
  }

  return true;
}

function validateSmtp(smtp) {
  // Validate host
  if (!smtp.host || smtp.host.trim() === '') {
    throw new Error('SMTP host is required');
  }

  // Validate port
  if (smtp.port < 1 || smtp.port > 65535) {
    throw new Error('SMTP port must be between 1 and 65535');
  }

  // Validate secure flag matches port
  if (smtp.port === 465 && !smtp.secure) {
    console.warn('Port 465 usually requires secure: true');
  }

  return true;
}
```

---

## Backup & Recovery

### Backup Strategy

```bash
# SQLite backup
sqlite3 components/mail/db/development.sqlite3 \
  ".backup components/mail/db/backup_$(date +%Y%m%d).sqlite3"

# Verify backup
sqlite3 components/mail/db/backup_20240115.sqlite3 \
  "SELECT * FROM mailsettings;"
```

### Export Data

```javascript
// Export settings to JSON
const settings = mailContext.MailSettings.single();
const smtp = mailContext.MailSmtpConnection.single();

const backup = {
  settings: settings,
  smtp: {
    ...smtp,
    auth_pass: '***REDACTED***' // Never export passwords
  }
};

fs.writeFileSync('mail_backup.json', JSON.stringify(backup, null, 2));
```

### Import Data

```javascript
// Import settings from JSON
const backup = JSON.parse(fs.readFileSync('mail_backup.json', 'utf-8'));

let settings = mailContext.MailSettings.single();
if (!settings) {
  settings = new MailSettings();
  mailContext.MailSettings.add(settings);
}

settings.from_name = backup.settings.from_name;
settings.from_email = backup.settings.from_email;
settings.return_path_matches_from = backup.settings.return_path_matches_from;
settings.weekly_summary_enabled = backup.settings.weekly_summary_enabled;
settings.updated_at = new Date().toISOString();

mailContext.saveChanges();
```

---

## Security

### Password Encryption

**Current:** Passwords stored in plain text

**Recommendation:** Encrypt auth_pass before storage

```javascript
const crypto = require('crypto');

// Encryption key (store in environment variable)
const ENCRYPTION_KEY = process.env.MAIL_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Usage
smtp.auth_pass = encrypt('my-password');
mailContext.saveChanges();

// When sending email
const password = decrypt(smtp.auth_pass);
```

### Input Sanitization

```javascript
function sanitizeMailSettings(formData) {
  const sanitized = {};

  if ('from_name' in formData) {
    sanitized.from_name = String(formData.from_name).trim();
  }

  if ('from_email' in formData) {
    const email = String(formData.from_email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }
    sanitized.from_email = email;
  }

  if ('return_path_matches_from' in formData) {
    sanitized.return_path_matches_from = Boolean(formData.return_path_matches_from);
  }

  if ('weekly_summary_enabled' in formData) {
    sanitized.weekly_summary_enabled = Boolean(formData.weekly_summary_enabled);
  }

  return sanitized;
}
```

---

## Troubleshooting

### Settings Not Persisting

**Problem:** Settings revert after restart.

**Solutions:**
```bash
# Check file permissions
ls -la components/mail/db/development.sqlite3

# Make writable
chmod 644 components/mail/db/development.sqlite3

# Check parent directory
chmod 755 components/mail/db/
```

### Multiple Settings Records

**Problem:** More than one settings/SMTP record exists.

**Solution:**
```javascript
// Delete duplicates
const allSettings = mailContext.MailSettings.toList();

if (allSettings.length > 1) {
  console.warn(`Found ${allSettings.length} settings records, keeping first`);

  for (let i = 1; i < allSettings.length; i++) {
    mailContext.MailSettings.remove(allSettings[i]);
  }

  mailContext.saveChanges();
}
```

### Database Locked

**Problem:** `database is locked` error.

**Solutions:**
```bash
# Check for locking processes
lsof components/mail/db/development.sqlite3

# Kill locking process if safe
kill -9 <PID>
```

---

## Testing

### Unit Tests

```javascript
describe('Mail Database', () => {
  it('should enforce MailSettings singleton', () => {
    const settings1 = mailContext.MailSettings.single();
    const settings2 = mailContext.MailSettings.single();

    expect(settings1).toBe(settings2);
    expect(settings1.id).toBe(settings2.id);
  });

  it('should create default SMTP config', () => {
    let smtp = mailContext.MailSmtpConnection.single();

    if (!smtp) {
      smtp = new MailSmtpConnection();
      smtp.host = 'localhost';
      smtp.port = 25;
      smtp.secure = false;
      smtp.created_at = new Date().toISOString();
      smtp.updated_at = new Date().toISOString();

      mailContext.MailSmtpConnection.add(smtp);
      mailContext.saveChanges();
    }

    const saved = mailContext.MailSmtpConnection.single();
    expect(saved).not.toBeNull();
    expect(saved.host).toBe('localhost');
    expect(saved.port).toBe(25);
  });

  it('should log email send attempts', () => {
    const log = new MailLog();
    log.to_email = 'test@example.com';
    log.subject = 'Test Email';
    log.status = 'sent';
    log.provider = 'smtp';
    log.created_at = new Date().toISOString();
    log.updated_at = new Date().toISOString();

    mailContext.MailLog.add(log);
    mailContext.saveChanges();

    const saved = mailContext.MailLog
      .where(ml => ml.to_email == $$, 'test@example.com')
      .single();

    expect(saved).not.toBeNull();
    expect(saved.status).toBe('sent');
  });
});
```

---

## Future Enhancements

1. **Password Encryption** - Encrypt SMTP passwords at rest
2. **Multiple SMTP Servers** - Support primary/backup SMTP failover
3. **Email Templates in Database** - Store templates in database instead of JSON file
4. **Bounce Tracking** - Track bounced emails
5. **Open/Click Tracking** - Track email opens and link clicks
6. **Email Attachments** - Add attachment table
7. **Email Queue** - Queue table for scheduled/bulk emails
8. **Delivery Analytics** - Stats table for email analytics
9. **Unsubscribe Management** - Unsubscribe table and logic
10. **DKIM/SPF Settings** - Store DKIM keys and SPF records

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [API.md](./API.md) - API reference
- [TEMPLATES.md](./TEMPLATES.md) - Email templates
- [../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md](../../docs/hooks/PLUGIN_ACTIVATION_SYSTEM.md) - Hook system
