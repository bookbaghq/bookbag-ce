# Mail API Documentation

Complete API reference for the Mail component.

## Base URL

All mail API endpoints are prefixed with `/bb-mail/api/`

## Authentication

All endpoints require admin authentication via `authService.validateIsAdmin`.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response on Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bb-mail/api/logs` | Get paginated mail logs |
| DELETE | `/bb-mail/api/logs/:id` | Delete a log entry |
| POST | `/bb-mail/api/send-test` | Send test email |
| POST | `/bb-mail/api/send` | Send email (template or direct) |
| GET | `/bb-mail/api/settings` | Get mail settings |
| POST | `/bb-mail/api/settings/save` | Update mail settings |
| GET | `/bb-mail/api/smtp` | Get SMTP configuration |
| POST | `/bb-mail/api/smtp/save` | Update SMTP configuration |

---

## Mail Operations

### Get Mail Logs

Get paginated list of mail logs with optional filtering.

**Endpoint:** `GET /bb-mail/api/logs`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Page number |
| `limit` | Integer | No | 50 | Items per page |
| `status` | String | No | - | Filter by status (sent, failed, opened, clicked) |
| `to_email` | String | No | - | Filter by recipient email |
| `search` | String | No | - | Search in subject or to_email |

**Request Example:**
```http
GET /bb-mail/api/logs?page=1&limit=20&status=sent
```

**Success Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "message_id": "<abc123@bookbag.example.com>",
      "to_email": "user@example.com",
      "subject": "Welcome, John Doe",
      "status": "sent",
      "provider": "smtp",
      "meta": "{\"template\":\"user_created\",\"from\":\"noreply@bookbag.com\"}",
      "created_at": "1705320123456",
      "updated_at": "1705320123456"
    },
    {
      "id": 2,
      "message_id": "<def456@bookbag.example.com>",
      "to_email": "admin@example.com",
      "subject": "Test Email from Bookbag CE",
      "status": "sent",
      "provider": "smtp",
      "meta": "{\"test\":true}",
      "created_at": "1705320234567",
      "updated_at": "1705320234567"
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Database query failed"
}
```

**Notes:**
- Logs are ordered by `created_at` DESC (newest first)
- `meta` field contains JSON string with additional metadata
- Timestamps are in milliseconds since epoch
- Empty results return `logs: []` with `total: 0`

---

### Delete Mail Log

Delete a single mail log entry by ID.

**Endpoint:** `DELETE /bb-mail/api/logs/:id`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | Integer | Yes | Log entry ID |

**Request Example:**
```http
DELETE /bb-mail/api/logs/123
```

**Success Response:**
```json
{
  "success": true,
  "message": "Log deleted successfully"
}
```

**Error Response (Log Not Found):**
```json
{
  "success": false,
  "error": "Log not found"
}
```

**Error Response (Database Error):**
```json
{
  "success": false,
  "error": "Failed to delete log"
}
```

**Notes:**
- Permanently deletes the log entry (not soft delete)
- No undo functionality
- Returns success even if log doesn't exist (idempotent)

---

### Send Test Email

Send a test email to verify SMTP configuration.

**Endpoint:** `POST /bb-mail/api/send-test`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | String | Yes | Recipient email address |

**Request Example:**
```http
POST /bb-mail/api/send-test
Content-Type: application/json

{
  "to": "admin@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "messageId": "<abc123@bookbag.example.com>",
  "message": "Test email sent successfully"
}
```

**Error Response (Missing To):**
```json
{
  "success": false,
  "error": "Missing 'to' field"
}
```

**Error Response (Invalid Email):**
```json
{
  "success": false,
  "error": "Invalid email address"
}
```

**Error Response (SMTP Not Configured):**
```json
{
  "success": false,
  "error": "SMTP settings not configured"
}
```

**Error Response (Send Failed):**
```json
{
  "success": false,
  "error": "Failed to send email: SMTP connection timeout"
}
```

**Test Email Content:**
```
Subject: Test Email from Bookbag CE
Body: This is a test email from Bookbag CE to verify your email configuration.
```

**Notes:**
- Uses current MailSettings and MailSmtpConnection
- Creates a MailLog entry with `meta: { test: true }`
- Validates email format before sending
- Returns SMTP error messages for debugging

---

### Send Email

Send an email using a template or direct content.

**Endpoint:** `POST /bb-mail/api/send`

**Request Body (Template-Based):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | String | Yes | Recipient email address |
| `template` | String | Yes* | Template key (user_created, register, forgot_password, password_changed) |
| `data` | Object | No | Template variables (e.g., { firstName: "John" }) |

**Request Body (Direct Content):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | String | Yes | Recipient email address |
| `subject` | String | Yes* | Email subject line |
| `html` | String | Yes* | HTML email content |
| `text` | String | No | Plain text email content |

**\*Note:** Either provide `template` OR `subject + html`

**Request Example (Template-Based):**
```http
POST /bb-mail/api/send
Content-Type: application/json

{
  "to": "john.doe@example.com",
  "template": "user_created",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

**Request Example (Direct Content):**
```http
POST /bb-mail/api/send
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Custom Notification",
  "html": "<p>Hello! This is a custom email.</p>",
  "text": "Hello! This is a custom email."
}
```

**Success Response:**
```json
{
  "success": true,
  "messageId": "<xyz789@bookbag.example.com>",
  "status": "sent",
  "message": "Email sent successfully"
}
```

**Error Response (Missing Required Fields):**
```json
{
  "success": false,
  "error": "Missing required field: to"
}
```

**Error Response (Invalid Template):**
```json
{
  "success": false,
  "error": "Template 'invalid_template' not found"
}
```

**Error Response (Missing Content):**
```json
{
  "success": false,
  "error": "Must provide either 'template' or 'subject + html'"
}
```

**Error Response (Send Failed):**
```json
{
  "success": false,
  "error": "Failed to send email: Recipient address rejected",
  "status": "failed"
}
```

**Notes:**
- Uses MailSettings for `from_name` and `from_email`
- Uses MailSmtpConnection for SMTP configuration
- Creates a MailLog entry for every send attempt
- Template variables use `{{variableName}}` syntax
- Missing template variables are replaced with empty string
- HTML content is not sanitized (admin-only endpoint)

---

## Settings Management

### Get Mail Settings

Get current mail settings (singleton).

**Endpoint:** `GET /bb-mail/api/settings`

**Request Example:**
```http
GET /bb-mail/api/settings
```

**Success Response:**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "from_name": "Bookbag CE",
    "from_email": "noreply@bookbag.example.com",
    "return_path_matches_from": true,
    "weekly_summary_enabled": false,
    "created_at": "1705320000000",
    "updated_at": "1705320123456"
  }
}
```

**Success Response (No Settings Exist):**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "from_name": null,
    "from_email": null,
    "return_path_matches_from": false,
    "weekly_summary_enabled": false,
    "created_at": "1705320234567",
    "updated_at": "1705320234567"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to retrieve settings"
}
```

**Notes:**
- Automatically creates default settings if none exist
- Only one settings record exists (singleton pattern)
- `from_name` and `from_email` can be null
- Timestamps are in milliseconds since epoch

---

### Update Mail Settings

Update mail settings.

**Endpoint:** `POST /bb-mail/api/settings/save`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from_name` | String | No | Sender display name |
| `from_email` | String | No | Sender email address |
| `return_path_matches_from` | Boolean | No | Return-Path header matches from_email |
| `weekly_summary_enabled` | Boolean | No | Enable weekly email summary |

**Request Example:**
```http
POST /bb-mail/api/settings/save
Content-Type: application/json

{
  "from_name": "Bookbag CE Notifications",
  "from_email": "noreply@bookbag.example.com",
  "return_path_matches_from": true,
  "weekly_summary_enabled": false
}
```

**Success Response:**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "from_name": "Bookbag CE Notifications",
    "from_email": "noreply@bookbag.example.com",
    "return_path_matches_from": true,
    "weekly_summary_enabled": false,
    "created_at": "1705320000000",
    "updated_at": "1705320345678"
  }
}
```

**Error Response (Invalid Email Format):**
```json
{
  "success": false,
  "error": "Invalid email format for from_email"
}
```

**Error Response (Save Failed):**
```json
{
  "success": false,
  "error": "Failed to save settings"
}
```

**Notes:**
- Only provided fields are updated (partial update)
- Creates settings record if none exists
- `updated_at` is automatically set to current timestamp
- Email format validation is recommended but not currently implemented

---

### Get SMTP Configuration

Get SMTP server configuration (singleton).

**Endpoint:** `GET /bb-mail/api/smtp`

**Request Example:**
```http
GET /bb-mail/api/smtp
```

**Success Response:**
```json
{
  "success": true,
  "smtp": {
    "id": 1,
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth_user": "noreply@bookbag.example.com",
    "auth_pass": "••••••••",
    "is_backup": false,
    "is_active": true,
    "created_at": "1705320000000",
    "updated_at": "1705320123456"
  }
}
```

**Success Response (No SMTP Configured):**
```json
{
  "success": true,
  "smtp": {
    "id": 1,
    "host": "localhost",
    "port": 25,
    "secure": false,
    "auth_user": null,
    "auth_pass": null,
    "is_backup": false,
    "is_active": true,
    "created_at": "1705320234567",
    "updated_at": "1705320234567"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to retrieve SMTP configuration"
}
```

**Notes:**
- Password (`auth_pass`) is masked with `••••••••` in response
- Automatically creates default SMTP config if none exists
- Default config: localhost:25, no auth, not secure
- Only one SMTP record exists (singleton pattern)

---

### Update SMTP Configuration

Update SMTP server configuration.

**Endpoint:** `POST /bb-mail/api/smtp/save`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `host` | String | Yes | SMTP server hostname |
| `port` | Integer | No | SMTP server port (default: 25) |
| `secure` | Boolean | No | Use SSL/TLS (default: false) |
| `auth_user` | String | No | SMTP username |
| `auth_pass` | String | No | SMTP password |
| `is_backup` | Boolean | No | Mark as backup SMTP (default: false) |
| `is_active` | Boolean | No | Enable/disable SMTP (default: true) |

**Request Example:**
```http
POST /bb-mail/api/smtp/save
Content-Type: application/json

{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth_user": "noreply@bookbag.example.com",
  "auth_pass": "xxxx xxxx xxxx xxxx",
  "is_active": true
}
```

**Success Response:**
```json
{
  "success": true,
  "smtp": {
    "id": 1,
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth_user": "noreply@bookbag.example.com",
    "auth_pass": "••••••••",
    "is_backup": false,
    "is_active": true,
    "created_at": "1705320000000",
    "updated_at": "1705320456789"
  }
}
```

**Error Response (Missing Host):**
```json
{
  "success": false,
  "error": "Missing required field: host"
}
```

**Error Response (Invalid Port):**
```json
{
  "success": false,
  "error": "Port must be between 1 and 65535"
}
```

**Error Response (Save Failed):**
```json
{
  "success": false,
  "error": "Failed to save SMTP configuration"
}
```

**Common SMTP Configurations:**

**Gmail:**
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth_user": "your-email@gmail.com",
  "auth_pass": "app-specific-password"
}
```

**Gmail (SSL):**
```json
{
  "host": "smtp.gmail.com",
  "port": 465,
  "secure": true,
  "auth_user": "your-email@gmail.com",
  "auth_pass": "app-specific-password"
}
```

**SendGrid:**
```json
{
  "host": "smtp.sendgrid.net",
  "port": 587,
  "secure": false,
  "auth_user": "apikey",
  "auth_pass": "your-sendgrid-api-key"
}
```

**Mailgun:**
```json
{
  "host": "smtp.mailgun.org",
  "port": 587,
  "secure": false,
  "auth_user": "postmaster@your-domain.com",
  "auth_pass": "your-mailgun-smtp-password"
}
```

**AWS SES:**
```json
{
  "host": "email-smtp.us-east-1.amazonaws.com",
  "port": 587,
  "secure": false,
  "auth_user": "your-aws-smtp-username",
  "auth_pass": "your-aws-smtp-password"
}
```

**Office 365:**
```json
{
  "host": "smtp.office365.com",
  "port": 587,
  "secure": false,
  "auth_user": "your-email@yourdomain.com",
  "auth_pass": "your-password"
}
```

**Notes:**
- Password is stored in plain text (consider encryption)
- Use `secure: false` for STARTTLS (port 587)
- Use `secure: true` for SSL (port 465)
- Only provided fields are updated (partial update)
- `updated_at` is automatically set to current timestamp
- Test configuration with `/bb-mail/api/send-test` after saving

---

## Response Format

All API responses follow a consistent format.

### Success Response Structure

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response Structure

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid input or missing required fields |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Resource not found (log entry, template) |
| 500 | Internal Server Error | Server-side error (database, SMTP failure) |

**Note:** Current implementation always returns 200 OK with `success: false` for errors. Consider using proper HTTP status codes in future versions.

---

## Rate Limiting

**Current Implementation:** None

**Recommended:** Implement rate limiting to prevent abuse:
- 10 emails per minute per user
- 100 emails per hour per user
- 1000 emails per day per tenant

---

## Pagination

Pagination is used for log listing endpoints.

**Query Parameters:**
- `page` - Page number (1-indexed)
- `limit` - Items per page (default: 50, max: 100)

**Response Fields:**
- `total` - Total number of items
- `page` - Current page number
- `limit` - Items per page
- `totalPages` - Total number of pages

**Example:**
```http
GET /bb-mail/api/logs?page=2&limit=20

Response:
{
  "success": true,
  "logs": [...],
  "total": 147,
  "page": 2,
  "limit": 20,
  "totalPages": 8
}
```

---

## Filtering and Search

### Mail Logs Filtering

**Status Filter:**
```http
GET /bb-mail/api/logs?status=failed
```
Returns only logs with `status = "failed"`

**Email Filter:**
```http
GET /bb-mail/api/logs?to_email=user@example.com
```
Returns only logs sent to `user@example.com`

**Search:**
```http
GET /bb-mail/api/logs?search=password
```
Returns logs where `subject` or `to_email` contains "password"

**Combined Filters:**
```http
GET /bb-mail/api/logs?status=sent&page=1&limit=10&search=welcome
```

---

## Error Handling

### Common Errors

**Database Connection Error:**
```json
{
  "success": false,
  "error": "Database connection failed"
}
```

**SMTP Connection Error:**
```json
{
  "success": false,
  "error": "SMTP connection timeout"
}
```

**Template Not Found:**
```json
{
  "success": false,
  "error": "Template 'custom_template' not found"
}
```

**Invalid Email Address:**
```json
{
  "success": false,
  "error": "Invalid email address format"
}
```

### Error Recovery

**Retry Strategy:**
- Transient errors (network timeout) - Retry up to 3 times with exponential backoff
- Permanent errors (invalid credentials) - Do not retry, return error immediately

**Logging:**
- All errors are logged to console
- Failed send attempts are logged to MailLog with `status: "failed"`

---

## Security Best Practices

### 1. Authentication

Always include admin authentication token:
```http
Authorization: Bearer <admin_token>
```

### 2. SMTP Credentials

- Never expose SMTP password in responses (masked with `••••••••`)
- Consider encrypting `auth_pass` in database
- Use app-specific passwords for Gmail/Google Workspace
- Rotate SMTP credentials regularly

### 3. Input Validation

Validate all inputs before processing:
- Email format validation
- Port range validation (1-65535)
- Template key validation
- HTML content sanitization (if accepting user input)

### 4. Rate Limiting

Implement rate limiting to prevent:
- Spam attacks
- Credential stuffing
- Resource exhaustion

### 5. Logging

Log all mail operations:
- Successful sends
- Failed sends
- Configuration changes
- Authentication failures

---

## Testing

### Testing SMTP Configuration

```bash
# Test SMTP settings
curl -X POST http://localhost:8080/bb-mail/api/send-test \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"to": "admin@example.com"}'
```

### Sending Template Email

```bash
# Send user_created template
curl -X POST http://localhost:8080/bb-mail/api/send \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "template": "user_created",
    "data": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    }
  }'
```

### Sending Direct Content Email

```bash
# Send custom email
curl -X POST http://localhost:8080/bb-mail/api/send \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Custom Subject",
    "html": "<p>Hello from Bookbag CE!</p>",
    "text": "Hello from Bookbag CE!"
  }'
```

### Getting Mail Logs

```bash
# Get all logs
curl -X GET http://localhost:8080/bb-mail/api/logs \
  -H "Authorization: Bearer <admin_token>"

# Get failed emails
curl -X GET "http://localhost:8080/bb-mail/api/logs?status=failed" \
  -H "Authorization: Bearer <admin_token>"

# Search logs
curl -X GET "http://localhost:8080/bb-mail/api/logs?search=john" \
  -H "Authorization: Bearer <admin_token>"
```

### Updating Settings

```bash
# Update mail settings
curl -X POST http://localhost:8080/bb-mail/api/settings/save \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "from_name": "Bookbag CE",
    "from_email": "noreply@bookbag.example.com"
  }'

# Update SMTP settings
curl -X POST http://localhost:8080/bb-mail/api/smtp/save \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth_user": "user@gmail.com",
    "auth_pass": "app-password"
  }'
```

---

## Integration Examples

### JavaScript (Fetch API)

```javascript
// Send template email
async function sendTemplateEmail(to, template, data) {
  const response = await fetch('http://localhost:8080/bb-mail/api/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, template, data })
  });

  const result = await response.json();

  if (result.success) {
    console.log('Email sent:', result.messageId);
  } else {
    console.error('Failed to send email:', result.error);
  }

  return result;
}

// Usage
await sendTemplateEmail(
  'user@example.com',
  'user_created',
  { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' }
);
```

### Node.js (Axios)

```javascript
const axios = require('axios');

// Send direct content email
async function sendCustomEmail(to, subject, html, text) {
  try {
    const response = await axios.post('http://localhost:8080/bb-mail/api/send', {
      to,
      subject,
      html,
      text
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Email send error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
await sendCustomEmail(
  'user@example.com',
  'Welcome!',
  '<p>Welcome to Bookbag CE!</p>',
  'Welcome to Bookbag CE!'
);
```

### Python (Requests)

```python
import requests

# Get mail logs
def get_mail_logs(page=1, limit=50, status=None):
    params = {'page': page, 'limit': limit}
    if status:
        params['status'] = status

    response = requests.get(
        'http://localhost:8080/bb-mail/api/logs',
        params=params,
        headers={'Authorization': f'Bearer {admin_token}'}
    )

    return response.json()

# Usage
logs = get_mail_logs(page=1, limit=20, status='failed')
print(f"Found {logs['total']} failed emails")
```

---

## WebSocket Support

**Current Implementation:** None

**Future Enhancement:** Consider adding WebSocket support for:
- Real-time mail log updates
- Send progress notifications
- SMTP connection status

---

## Changelog

### Version 1.0.0
- Initial API implementation
- Mail sending (template and direct)
- Mail logging
- SMTP configuration
- Settings management

### Future Versions
- Add attachment support
- Add CC/BCC support
- Add email scheduling
- Add bounce handling
- Add open/click tracking
- Add email analytics

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [DATABASE.md](./DATABASE.md) - Database schema
- [TEMPLATES.md](./TEMPLATES.md) - Email templates
- [../../docs/plugins/PLUGIN_API.md](../../docs/plugins/PLUGIN_API.md) - Plugin system
