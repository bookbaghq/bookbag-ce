# Mail Component Documentation

## Overview

The Mail component provides email functionality for Bookbag CE, including SMTP configuration, template-based email sending, mail logging, and delivery tracking.

## Architecture

```
components/mail/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       ├── mailController.js           # Mail operations (logs, send, test)
│   │       └── mailSettingsController.js   # Settings & SMTP configuration
│   ├── models/
│   │   ├── mailContext.js                 # Database context
│   │   ├── mailSettings.js                # Mail settings entity (singleton)
│   │   ├── mailSmtpConnection.js          # SMTP config entity (singleton)
│   │   └── mailLog.js                     # Email log entity
│   ├── service/
│   │   ├── mailTemplateService.js         # Template rendering ({{var}} interpolation)
│   │   └── mailDeliveryService.js         # Email delivery (nodemailer)
│   └── db/
│       └── migrations/                     # Database migrations
├── config/
│   ├── routes.js                          # API route definitions
│   ├── mail-templates.json                # Email templates
│   └── initializers/
│       └── config.js                      # Component initialization
└── docs/                                  # Documentation (you are here)
```

## Key Features

### 1. SMTP Configuration
- Configurable SMTP server settings (host, port, secure, auth)
- Singleton SMTP connection record
- Support for TLS/SSL connections
- Backup SMTP server support (via `is_backup` flag)
- Active/inactive SMTP connection toggle

### 2. Template System
- 4 predefined email templates:
  - **user_created** - Welcome email for new users
  - **register** - User registration confirmation
  - **forgot_password** - Password reset email
  - **password_changed** - Password change notification
- Simple `{{variable}}` interpolation
- Support for HTML and plain text versions
- Dynamic subject line generation
- Custom template rendering via service layer

### 3. Mail Logging
- Track all sent/failed emails
- Store email metadata (to, subject, status, provider)
- Message ID tracking
- Status tracking: sent, failed, opened, clicked
- Pagination support for log viewing
- Log deletion capability

### 4. Email Sending
- Template-based sending
- Direct content sending (without template)
- Test email functionality
- Nodemailer integration
- Automatic logging of all send attempts
- Error handling and retry logic

## Data Flow

### Mail Sending Flow (Template-Based)
```
1. Client → POST /bb-mail/api/send
2. mailController#send
3. Validate request (to, template OR subject+html)
4. Get MailSettings singleton (from_name, from_email)
5. Get MailSmtpConnection singleton (SMTP config)
6. If template provided:
   → mailTemplateService.render(template, data)
   → Generate subject, html, text
7. mailDeliveryService.send(context, payload, templateSpec)
8. Create nodemailer transport with SMTP config
9. Send email via SMTP
10. Log result to MailLog (status: sent/failed)
11. Return response { success, messageId, status }
```

### Mail Sending Flow (Direct Content)
```
1. Client → POST /bb-mail/api/send
2. mailController#send
3. Validate request (to, subject, html)
4. Get MailSettings singleton (from_name, from_email)
5. Get MailSmtpConnection singleton (SMTP config)
6. mailDeliveryService.sendWithTemp(context, to, subject, html, text)
7. Create nodemailer transport with SMTP config
8. Send email via SMTP
9. Log result to MailLog (status: sent/failed)
10. Return response { success, messageId, status }
```

### Test Email Flow
```
1. Client → POST /bb-mail/api/send-test
2. mailController#sendTest
3. Get MailSettings singleton
4. Get MailSmtpConnection singleton
5. Create test email payload:
   → to: formData.to
   → subject: "Test Email from Bookbag CE"
   → html: Simple test message
6. mailDeliveryService.sendWithTemp(...)
7. Send via nodemailer
8. Log result to MailLog
9. Return response { success, messageId }
```

### Settings Retrieval Flow
```
1. Client → GET /bb-mail/api/settings
2. mailSettingsController#get
3. Get MailSettings singleton
4. If not exists:
   → Create default settings
   → Save to database
5. Return settings object
```

### SMTP Configuration Flow
```
1. Client → GET /bb-mail/api/smtp
2. mailSettingsController#listSmtp
3. Get MailSmtpConnection singleton
4. If not exists:
   → Create default SMTP config
   → Save to database
5. Return SMTP config (auth_pass masked)
```

## Database Schema

See [DATABASE.md](./DATABASE.md) for complete schema documentation.

### MailSettings Model (Singleton)
```javascript
{
  id: INTEGER,
  from_name: STRING (nullable),
  from_email: STRING (nullable),
  return_path_matches_from: BOOLEAN (default: false),
  weekly_summary_enabled: BOOLEAN (default: false),
  created_at: STRING,
  updated_at: STRING
}
```

### MailSmtpConnection Model (Singleton)
```javascript
{
  id: INTEGER,
  host: STRING (required),
  port: INTEGER (default: 25),
  secure: BOOLEAN (default: false),
  auth_user: STRING (nullable),
  auth_pass: STRING (nullable),
  is_backup: BOOLEAN (default: false),
  is_active: BOOLEAN (default: true),
  created_at: STRING,
  updated_at: STRING
}
```

### MailLog Model
```javascript
{
  id: INTEGER,
  message_id: STRING (nullable),
  to_email: STRING (required),
  subject: STRING (nullable),
  status: STRING (nullable),  // sent, failed, opened, clicked
  provider: STRING (nullable),
  meta: STRING (nullable),    // JSON metadata
  created_at: STRING,
  updated_at: STRING
}
```

## API Endpoints

See [API.md](./API.md) for complete API reference.

**Mail Operations:**
- `GET /bb-mail/api/logs` - Get paginated mail logs
- `DELETE /bb-mail/api/logs/:id` - Delete a log entry
- `POST /bb-mail/api/send-test` - Send test email
- `POST /bb-mail/api/send` - Send email (template or direct)

**Settings & Configuration:**
- `GET /bb-mail/api/settings` - Get mail settings
- `POST /bb-mail/api/settings/save` - Update mail settings
- `GET /bb-mail/api/smtp` - Get SMTP configuration
- `POST /bb-mail/api/smtp/save` - Update SMTP configuration

## Template System

See [TEMPLATES.md](./TEMPLATES.md) for complete template documentation.

### Available Templates

**user_created**
- Purpose: Welcome email for new users
- Variables: `{{firstName}}`, `{{lastName}}`, `{{email}}`
- Subject: "Welcome, {{firstName}} {{lastName}}"

**register**
- Purpose: User registration confirmation
- Variables: `{{firstName}}`, `{{lastName}}`, `{{activationLink}}`
- Subject: "Confirm your registration"

**forgot_password**
- Purpose: Password reset request
- Variables: `{{firstName}}`, `{{resetLink}}`, `{{expirationTime}}`
- Subject: "Password Reset Request"

**password_changed**
- Purpose: Password change notification
- Variables: `{{firstName}}`, `{{changeTime}}`
- Subject: "Your password has been changed"

### Template Usage

```javascript
// Send email using template
POST /bb-mail/api/send
{
  "to": "user@example.com",
  "template": "user_created",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}

// Send email with direct content
POST /bb-mail/api/send
{
  "to": "user@example.com",
  "subject": "Custom Email",
  "html": "<p>Hello!</p>",
  "text": "Hello!"
}
```

## Configuration

### SMTP Settings

Configure SMTP server via API or database:

```javascript
POST /bb-mail/api/smtp/save
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth_user": "your-email@gmail.com",
  "auth_pass": "your-app-password",
  "is_active": true
}
```

**Common SMTP Providers:**

**Gmail:**
```javascript
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth_user": "your-email@gmail.com",
  "auth_pass": "app-specific-password"
}
```

**SendGrid:**
```javascript
{
  "host": "smtp.sendgrid.net",
  "port": 587,
  "secure": false,
  "auth_user": "apikey",
  "auth_pass": "your-sendgrid-api-key"
}
```

**Mailgun:**
```javascript
{
  "host": "smtp.mailgun.org",
  "port": 587,
  "secure": false,
  "auth_user": "postmaster@your-domain.com",
  "auth_pass": "your-mailgun-smtp-password"
}
```

**AWS SES:**
```javascript
{
  "host": "email-smtp.us-east-1.amazonaws.com",
  "port": 587,
  "secure": false,
  "auth_user": "your-aws-smtp-username",
  "auth_pass": "your-aws-smtp-password"
}
```

### Mail Settings

Configure sender details and features:

```javascript
POST /bb-mail/api/settings/save
{
  "from_name": "Bookbag CE",
  "from_email": "noreply@bookbag.example.com",
  "return_path_matches_from": true,
  "weekly_summary_enabled": false
}
```

## Dependencies

- **MasterController** - Core framework (routing, ORM, hooks)
- **nodemailer** - Email sending library
- **Auth Service** - Admin authentication (`validateIsAdmin`)
- None (no other external npm packages)

## Integration Points

### Services Provided

**mailTemplateService:**
- `render(templateKey, data)` - Render email template with data
- Used by mailDeliveryService for template-based emails

**mailDeliveryService:**
- `send(context, payload, templateSpec, services)` - Send email with template
- `sendWithTemp(context, to, subject, html, text)` - Send email directly
- Used by mailController for all email operations

### Hooks

**Fired Hooks:**
- None

**Listened Hooks:**
- None

### External Components

None. The mail component is self-contained.

## Best Practices

### 1. SMTP Configuration

Always test SMTP configuration before production use:
```javascript
// Test SMTP settings
POST /bb-mail/api/send-test
{
  "to": "admin@example.com"
}
```

### 2. Template Usage

Use templates for consistency:
```javascript
// Good: Use template for standardized emails
POST /bb-mail/api/send
{
  "to": "user@example.com",
  "template": "user_created",
  "data": { "firstName": "John", "lastName": "Doe" }
}

// Bad: Inline HTML for standard emails (inconsistent)
POST /bb-mail/api/send
{
  "to": "user@example.com",
  "subject": "Welcome",
  "html": "<p>Welcome John Doe!</p>"
}
```

### 3. Error Handling

Check mail logs for delivery failures:
```javascript
GET /bb-mail/api/logs?status=failed
```

### 4. Security

- **Never expose SMTP credentials** in client-side code
- **Use app-specific passwords** for Gmail/Google Workspace
- **Enable TLS/SSL** for secure connections (`secure: true` for port 465)
- **Validate email addresses** before sending
- **Sanitize template data** to prevent injection attacks

### 5. Rate Limiting

Implement rate limiting to prevent spam:
```javascript
// TODO: Add rate limiting middleware
app.post('/bb-mail/api/send', rateLimiter({
  windowMs: 60000, // 1 minute
  max: 10 // 10 emails per minute
}), mailController.send);
```

## Security Considerations

### 1. Authentication Required

All endpoints require admin authentication:
```javascript
this.beforeAction([], req.authService.validateIsAdmin);
```

**Result:** Only authenticated admin users can send emails or modify settings.

### 2. SMTP Credential Protection

SMTP passwords are masked in API responses:
```javascript
// API returns
{
  "auth_pass": "••••••••"
}
```

### 3. Input Validation

**Current Implementation:**
- Basic validation in controllers (to, subject, template)

**TODO:** Add comprehensive validation:
```javascript
// Validate email format
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  return { success: false, error: 'Invalid email address' };
}

// Sanitize HTML content
if (html) {
  html = sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'a'],
    allowedAttributes: { 'a': ['href'] }
  });
}
```

### 4. Template Injection Prevention

Template system uses simple string replacement (no code execution):
```javascript
// Safe: Only replaces {{var}} with data[var]
str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
  return data[key] || '';
});
```

## Performance Considerations

### 1. Email Sending

Nodemailer sends emails synchronously - consider async queue for bulk emails:
```javascript
// Current: Synchronous sending
const result = await transport.sendMail(mailOptions);

// Better: Use job queue for bulk emails
await emailQueue.add({ to, subject, html }, { delay: 1000 });
```

### 2. Mail Log Cleanup

MailLog table can grow large - implement periodic cleanup:
```javascript
// Delete logs older than 90 days
const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
const oldLogs = mailContext.MailLog
  .where(ml => ml.created_at < $$, cutoff)
  .toList();

oldLogs.forEach(log => mailContext.MailLog.remove(log));
mailContext.saveChanges();
```

### 3. SMTP Connection Pooling

Nodemailer supports connection pooling for better performance:
```javascript
const transport = nodemailer.createTransport({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  // ... other SMTP config
});
```

## Testing

### Unit Testing Mail Controller

```javascript
describe('mailController', () => {
  it('should send test email', async () => {
    const controller = new mailController(mockReq);
    const result = await controller.sendTest({
      params: { formData: { to: 'test@example.com' } }
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should send email with template', async () => {
    const controller = new mailController(mockReq);
    const result = await controller.send({
      params: {
        formData: {
          to: 'user@example.com',
          template: 'user_created',
          data: { firstName: 'John', lastName: 'Doe' }
        }
      }
    });

    expect(result.success).toBe(true);
  });

  it('should get paginated logs', async () => {
    const controller = new mailController(mockReq);
    const result = await controller.logs({
      params: { page: 1, limit: 10 }
    });

    expect(result.success).toBe(true);
    expect(result.logs).toBeInstanceOf(Array);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});
```

### Integration Testing Template Service

```javascript
describe('mailTemplateService', () => {
  it('should render user_created template', () => {
    const service = new MailTemplateService();
    const result = service.render('user_created', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    });

    expect(result.subject).toBe('Welcome, John Doe');
    expect(result.html).toContain('John');
    expect(result.html).toContain('Doe');
  });

  it('should handle missing variables gracefully', () => {
    const service = new MailTemplateService();
    const result = service.render('user_created', {
      firstName: 'John'
      // lastName missing
    });

    expect(result.subject).toBe('Welcome, John ');
    expect(result.html).toBeDefined();
  });
});
```

### Testing SMTP Configuration

```javascript
describe('mailSettingsController', () => {
  it('should save SMTP settings', async () => {
    const controller = new mailSettingsController(mockReq);
    const result = await controller.saveSmtp({
      params: {
        formData: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          auth_user: 'user@example.com',
          auth_pass: 'password123'
        }
      }
    });

    expect(result.success).toBe(true);
  });

  it('should mask password in response', async () => {
    const controller = new mailSettingsController(mockReq);
    const result = await controller.listSmtp({});

    expect(result.success).toBe(true);
    if (result.smtp.auth_pass) {
      expect(result.smtp.auth_pass).toMatch(/^•+$/);
    }
  });
});
```

## Troubleshooting

### Emails Not Sending

**Problem:** Emails fail to send.

**Checklist:**
1. Is SMTP configuration correct?
2. Are SMTP credentials valid?
3. Is the SMTP server accessible (firewall, network)?
4. Check mail logs: `GET /bb-mail/api/logs?status=failed`
5. Check SMTP server logs
6. Test SMTP settings: `POST /bb-mail/api/send-test`

**Common Errors:**

**ECONNREFUSED:**
```
Error: connect ECONNREFUSED 127.0.0.1:587
```
**Solution:** Check host/port, ensure SMTP server is running.

**Authentication Failed:**
```
Error: Invalid login: 535 Authentication credentials invalid
```
**Solution:** Verify auth_user and auth_pass are correct.

**TLS/SSL Error:**
```
Error: self signed certificate in certificate chain
```
**Solution:** Use `secure: false` for STARTTLS (port 587) or `secure: true` for SSL (port 465).

### Template Variables Not Rendering

**Problem:** Template shows `{{variable}}` instead of actual value.

**Cause:** Variable name mismatch or missing data.

**Solution:**
```javascript
// Check template variables
const template = mailTemplateService.templates['user_created'];
console.log('Template requires:', template.subject.match(/\{\{(\w+)\}\}/g));

// Ensure data matches
POST /bb-mail/api/send
{
  "template": "user_created",
  "data": {
    "firstName": "John",  // Must match {{firstName}}
    "lastName": "Doe",    // Must match {{lastName}}
    "email": "john@example.com"
  }
}
```

### SMTP Connection Timeout

**Problem:** Emails take too long to send or timeout.

**Solutions:**

1. **Increase Timeout:**
```javascript
const transport = nodemailer.createTransport({
  // ... SMTP config
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000     // 5 seconds
});
```

2. **Use Backup SMTP:**
```javascript
POST /bb-mail/api/smtp/save
{
  "host": "backup-smtp.example.com",
  "is_backup": true,
  "is_active": true
}
```

### Gmail App-Specific Password Required

**Problem:** Gmail authentication fails with regular password.

**Solution:** Enable 2FA and create app-specific password:

1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate App Password for "Mail"
4. Use app password in `auth_pass` field

```javascript
POST /bb-mail/api/smtp/save
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth_user": "your-email@gmail.com",
  "auth_pass": "xxxx xxxx xxxx xxxx"  // 16-character app password
}
```

### Mail Logs Growing Too Large

**Problem:** MailLog table consuming too much space.

**Solution:** Implement periodic cleanup:

```javascript
// Delete logs older than 90 days
DELETE FROM maillog WHERE created_at < ?
```

Or programmatically:
```javascript
const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000);
const oldLogs = mailContext.MailLog
  .where(ml => ml.created_at < $$, String(cutoffDate))
  .toList();

oldLogs.forEach(log => {
  mailContext.MailLog.remove(log);
});
mailContext.saveChanges();
```

## Future Enhancements

1. **Email Queue System** - Bull/BullMQ for async email processing
2. **Template Editor** - Web-based template editing UI
3. **Bounce Handling** - Track and handle bounced emails
4. **Email Analytics** - Open rates, click tracking, engagement metrics
5. **Attachment Support** - Send files with emails
6. **HTML Email Builder** - Drag-and-drop email designer
7. **Multi-Language Templates** - i18n support for templates
8. **Email Scheduling** - Send emails at specific times
9. **Bulk Email Sending** - Send to multiple recipients efficiently
10. **Webhook Support** - Receive delivery status updates from providers
11. **A/B Testing** - Test different email variations
12. **Unsubscribe Management** - Handle unsubscribe requests
13. **DKIM/SPF Support** - Email authentication for better deliverability
14. **Rate Limiting** - Prevent spam and abuse
15. **Email Preview** - Preview emails before sending

## Related Documentation

- [API.md](./API.md) - Complete API reference
- [DATABASE.md](./DATABASE.md) - Database schema
- [TEMPLATES.md](./TEMPLATES.md) - Email templates
- [../../docs/plugins/PLUGIN_API.md](../../docs/plugins/PLUGIN_API.md) - Plugin system (if extending mail functionality)
