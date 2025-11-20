# Email Templates Documentation

Complete documentation for the Mail component's template system.

## Overview

The Mail component uses a simple template system for rendering dynamic email content. Templates are defined in `config/mail-templates.json` and rendered using `{{variable}}` interpolation.

## Architecture

**Template File:** `config/mail-templates.json`

**Service:** `app/service/mailTemplateService.js`

**Template Syntax:** Simple `{{variableName}}` replacement (no logic, no loops)

---

## Available Templates

### 1. user_created

**Purpose:** Welcome email sent when a new user is created

**Template Key:** `user_created`

**Variables:**
- `{{firstName}}` - User's first name
- `{{lastName}}` - User's last name
- `{{email}}` - User's email address

**Subject:**
```
Welcome, {{firstName}} {{lastName}}
```

**HTML Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Welcome to Bookbag CE!</h2>
  <p>Hi {{firstName}} {{lastName}},</p>
  <p>Your account has been successfully created. Your email is: <strong>{{email}}</strong></p>
  <p>Thank you for joining us!</p>
  <p>Best regards,<br>The Bookbag CE Team</p>
</div>
```

**Plain Text Body:**
```
Welcome to Bookbag CE!

Hi {{firstName}} {{lastName}},

Your account has been successfully created. Your email is: {{email}}

Thank you for joining us!

Best regards,
The Bookbag CE Team
```

**Usage Example:**
```javascript
POST /bb-mail/api/send
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

**Rendered Output:**
- Subject: "Welcome, John Doe"
- Body: "Hi John Doe, Your account has been successfully created. Your email is: john.doe@example.com..."

---

### 2. register

**Purpose:** User registration confirmation email

**Template Key:** `register`

**Variables:**
- `{{firstName}}` - User's first name
- `{{lastName}}` - User's last name
- `{{activationLink}}` - Account activation URL

**Subject:**
```
Confirm your registration
```

**HTML Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Confirm Your Registration</h2>
  <p>Hi {{firstName}} {{lastName}},</p>
  <p>Thank you for registering with Bookbag CE. Please click the button below to activate your account:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{activationLink}}"
       style="background-color: #4CAF50; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 4px; display: inline-block;">
      Activate Account
    </a>
  </div>
  <p>Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #666;">{{activationLink}}</p>
  <p>If you did not request this registration, please ignore this email.</p>
  <p>Best regards,<br>The Bookbag CE Team</p>
</div>
```

**Plain Text Body:**
```
Confirm Your Registration

Hi {{firstName}} {{lastName}},

Thank you for registering with Bookbag CE. Please click the link below to activate your account:

{{activationLink}}

If you did not request this registration, please ignore this email.

Best regards,
The Bookbag CE Team
```

**Usage Example:**
```javascript
POST /bb-mail/api/send
{
  "to": "jane.smith@example.com",
  "template": "register",
  "data": {
    "firstName": "Jane",
    "lastName": "Smith",
    "activationLink": "https://bookbag.example.com/activate?token=abc123xyz"
  }
}
```

**Rendered Output:**
- Subject: "Confirm your registration"
- Body: "Hi Jane Smith, Thank you for registering... [Activate Account Button]"

---

### 3. forgot_password

**Purpose:** Password reset request email

**Template Key:** `forgot_password`

**Variables:**
- `{{firstName}}` - User's first name
- `{{resetLink}}` - Password reset URL
- `{{expirationTime}}` - Link expiration time (e.g., "24 hours")

**Subject:**
```
Password Reset Request
```

**HTML Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Password Reset Request</h2>
  <p>Hi {{firstName}},</p>
  <p>We received a request to reset your password. Click the button below to create a new password:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{resetLink}}"
       style="background-color: #2196F3; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 4px; display: inline-block;">
      Reset Password
    </a>
  </div>
  <p>Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #666;">{{resetLink}}</p>
  <p><strong>This link will expire in {{expirationTime}}.</strong></p>
  <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
  <p>Best regards,<br>The Bookbag CE Team</p>
</div>
```

**Plain Text Body:**
```
Password Reset Request

Hi {{firstName}},

We received a request to reset your password. Click the link below to create a new password:

{{resetLink}}

This link will expire in {{expirationTime}}.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The Bookbag CE Team
```

**Usage Example:**
```javascript
POST /bb-mail/api/send
{
  "to": "bob.wilson@example.com",
  "template": "forgot_password",
  "data": {
    "firstName": "Bob",
    "resetLink": "https://bookbag.example.com/reset-password?token=def456uvw",
    "expirationTime": "24 hours"
  }
}
```

**Rendered Output:**
- Subject: "Password Reset Request"
- Body: "Hi Bob, We received a request to reset your password... [Reset Password Button]... This link will expire in 24 hours."

---

### 4. password_changed

**Purpose:** Password change confirmation email

**Template Key:** `password_changed`

**Variables:**
- `{{firstName}}` - User's first name
- `{{changeTime}}` - Time when password was changed

**Subject:**
```
Your password has been changed
```

**HTML Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Password Changed Successfully</h2>
  <p>Hi {{firstName}},</p>
  <p>Your password has been successfully changed at {{changeTime}}.</p>
  <p>If you made this change, no further action is required.</p>
  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107;
              padding: 12px; margin: 20px 0;">
    <strong>⚠ Security Alert</strong>
    <p style="margin: 8px 0 0 0;">
      If you did not make this change, please contact our support team immediately
      and secure your account.
    </p>
  </div>
  <p>Best regards,<br>The Bookbag CE Team</p>
</div>
```

**Plain Text Body:**
```
Password Changed Successfully

Hi {{firstName}},

Your password has been successfully changed at {{changeTime}}.

If you made this change, no further action is required.

⚠ SECURITY ALERT: If you did not make this change, please contact our support team immediately and secure your account.

Best regards,
The Bookbag CE Team
```

**Usage Example:**
```javascript
POST /bb-mail/api/send
{
  "to": "alice.brown@example.com",
  "template": "password_changed",
  "data": {
    "firstName": "Alice",
    "changeTime": "January 15, 2024 at 3:45 PM"
  }
}
```

**Rendered Output:**
- Subject: "Your password has been changed"
- Body: "Hi Alice, Your password has been successfully changed at January 15, 2024 at 3:45 PM..."

---

## Template Service

### Service Location

**File:** `app/service/mailTemplateService.js`

### Service API

#### `render(templateKey, data)`

Renders an email template with provided data.

**Parameters:**
- `templateKey` (String) - Template identifier (e.g., 'user_created')
- `data` (Object) - Key-value pairs for variable substitution

**Returns:**
```javascript
{
  subject: String,  // Rendered subject line
  html: String,     // Rendered HTML body
  text: String      // Rendered plain text body (optional)
}
```

**Example:**
```javascript
const mailTemplateService = new MailTemplateService();

const rendered = mailTemplateService.render('user_created', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com'
});

console.log(rendered.subject); // "Welcome, John Doe"
console.log(rendered.html);    // "<div>Hi John Doe...</div>"
console.log(rendered.text);    // "Hi John Doe..."
```

---

## Template Syntax

### Variable Interpolation

Templates use `{{variableName}}` syntax for variable substitution.

**Template:**
```
Hello {{firstName}} {{lastName}}!
```

**Data:**
```javascript
{
  firstName: 'John',
  lastName: 'Doe'
}
```

**Result:**
```
Hello John Doe!
```

### Missing Variables

Missing variables are replaced with empty string.

**Template:**
```
Hello {{firstName}} {{middleName}} {{lastName}}!
```

**Data:**
```javascript
{
  firstName: 'John',
  lastName: 'Doe'
  // middleName is missing
}
```

**Result:**
```
Hello John  Doe!
```
*(Note: extra space between "John" and "Doe")*

### Special Characters

Variables are converted to strings and inserted as-is (no escaping).

**Template:**
```
<p>{{message}}</p>
```

**Data:**
```javascript
{
  message: '<script>alert("XSS")</script>'
}
```

**Result:**
```
<p><script>alert("XSS")</script></p>
```

**⚠ Security Warning:** Template variables are NOT sanitized. Only use trusted data sources.

---

## Implementation Details

### Template Loading

Templates are loaded from `config/mail-templates.json` when the service is initialized.

```javascript
class MailTemplateService {
  constructor() {
    const templatePath = path.join(__dirname, '../../config/mail-templates.json');
    this.templates = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
  }
}
```

### Interpolation Algorithm

Simple regex-based replacement:

```javascript
_interpolate(str, data) {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const val = data && Object.prototype.hasOwnProperty.call(data, key)
      ? data[key]
      : '';
    return (val == null) ? '' : String(val);
  });
}
```

**Pattern Breakdown:**
- `\{\{` - Opening braces (literal)
- `\s*` - Optional whitespace
- `(\w+)` - Variable name (alphanumeric + underscore)
- `\s*` - Optional whitespace
- `\}\}` - Closing braces (literal)

**Whitespace Handling:**
```javascript
// All valid:
{{firstName}}
{{ firstName }}
{{  firstName  }}
```

---

## Adding New Templates

### 1. Edit Template File

Add new template to `config/mail-templates.json`:

```json
{
  "user_created": { ... },
  "register": { ... },
  "forgot_password": { ... },
  "password_changed": { ... },
  "new_template": {
    "subject": "{{subjectVariable}}",
    "html": "<div>{{htmlVariable}}</div>",
    "text": "{{textVariable}}"
  }
}
```

### 2. Define Template Structure

Each template must have:
- `subject` (String, required) - Email subject with `{{variables}}`
- `html` (String, required) - HTML email body
- `text` (String, optional) - Plain text fallback

**Example:**
```json
{
  "invoice": {
    "subject": "Invoice #{{invoiceNumber}} - {{amount}}",
    "html": "<div><h2>Invoice #{{invoiceNumber}}</h2><p>Amount: {{amount}}</p></div>",
    "text": "Invoice #{{invoiceNumber}}\nAmount: {{amount}}"
  }
}
```

### 3. Use New Template

```javascript
POST /bb-mail/api/send
{
  "to": "customer@example.com",
  "template": "invoice",
  "data": {
    "invoiceNumber": "12345",
    "amount": "$99.99"
  }
}
```

---

## Best Practices

### 1. Variable Naming

Use descriptive, camelCase variable names:

**Good:**
```
{{firstName}}, {{activationLink}}, {{expirationTime}}
```

**Bad:**
```
{{fn}}, {{link}}, {{time}}
```

### 2. Provide All Variables

Always provide all variables used in template:

**Good:**
```javascript
{
  "template": "user_created",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

**Bad:**
```javascript
{
  "template": "user_created",
  "data": {
    "firstName": "John"
    // Missing: lastName, email
  }
}
// Result: "Welcome, John !" (missing last name)
```

### 3. HTML Email Design

Follow email HTML best practices:
- Use inline styles (no external CSS)
- Use tables for layout (better email client support)
- Max width: 600px
- Test on multiple email clients
- Provide alt text for images

**Example:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding: 20px; background-color: #f5f5f5;">
        <h2 style="margin: 0 0 16px 0;">{{title}}</h2>
        <p style="margin: 0;">{{content}}</p>
      </td>
    </tr>
  </table>
</div>
```

### 4. Plain Text Fallback

Always provide plain text version for email clients that don't support HTML:

```json
{
  "template": {
    "subject": "Subject",
    "html": "<div>HTML content</div>",
    "text": "Plain text content"
  }
}
```

### 5. Button Links

Use descriptive text and provide fallback URL:

**Good:**
```html
<a href="{{activationLink}}" style="...">Activate Account</a>
<p>Or copy this link: {{activationLink}}</p>
```

**Bad:**
```html
<a href="{{activationLink}}">Click here</a>
```

---

## Security Considerations

### 1. No Sanitization

**Current Implementation:** Variables are inserted as-is without sanitization.

**Risk:** XSS attacks if user-controlled data is used in templates.

**Mitigation:**
- Only use trusted data sources
- Validate/sanitize data before passing to templates
- Consider adding HTML escaping for user input

**Example:**
```javascript
function sanitizeData(data) {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    // Escape HTML entities
    sanitized[key] = String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  return sanitized;
}

// Usage
const sanitizedData = sanitizeData(userData);
mailTemplateService.render('user_created', sanitizedData);
```

### 2. Template Injection

**Risk:** Malicious templates could execute code.

**Mitigation:**
- Template file is not user-modifiable (stored in codebase)
- Admin-only access to mail API
- No template evaluation/execution (only string replacement)

### 3. Link Validation

**Risk:** Malicious links in `{{activationLink}}`, `{{resetLink}}`, etc.

**Mitigation:**
```javascript
function validateLink(url) {
  // Only allow HTTPS links to your domain
  const allowedDomain = 'bookbag.example.com';
  const parsed = new URL(url);

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS links allowed');
  }

  if (parsed.hostname !== allowedDomain) {
    throw new Error(`Links must point to ${allowedDomain}`);
  }

  return url;
}

// Usage
data.activationLink = validateLink(data.activationLink);
```

---

## Testing Templates

### Visual Testing

```javascript
// Test template rendering
const mailTemplateService = new MailTemplateService();

const rendered = mailTemplateService.render('user_created', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com'
});

// Save to file for visual inspection
fs.writeFileSync('test.html', rendered.html);
// Open test.html in browser
```

### Unit Testing

```javascript
describe('MailTemplateService', () => {
  let service;

  beforeEach(() => {
    service = new MailTemplateService();
  });

  it('should render user_created template', () => {
    const rendered = service.render('user_created', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    });

    expect(rendered.subject).toBe('Welcome, John Doe');
    expect(rendered.html).toContain('John Doe');
    expect(rendered.html).toContain('john@example.com');
    expect(rendered.text).toContain('John Doe');
  });

  it('should handle missing variables gracefully', () => {
    const rendered = service.render('user_created', {
      firstName: 'John'
      // lastName and email missing
    });

    expect(rendered.subject).toBe('Welcome, John ');
    expect(rendered.html).not.toContain('undefined');
  });

  it('should throw error for non-existent template', () => {
    expect(() => {
      service.render('non_existent_template', {});
    }).toThrow();
  });
});
```

### Email Client Testing

Test rendered emails on multiple email clients:
- Gmail (Web, iOS, Android)
- Outlook (Desktop, Web)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- ProtonMail

**Tools:**
- [Litmus](https://www.litmus.com/) - Email testing platform
- [Email on Acid](https://www.emailonacid.com/) - Email client testing
- [Mailtrap](https://mailtrap.io/) - Email testing sandbox

---

## Troubleshooting

### Template Not Found

**Problem:** `Template 'xyz' not found`

**Causes:**
1. Template key doesn't exist in `mail-templates.json`
2. JSON syntax error in template file
3. Template file not loaded

**Solution:**
```javascript
// Check available templates
const service = new MailTemplateService();
console.log(Object.keys(service.templates));
// ['user_created', 'register', 'forgot_password', 'password_changed']

// Verify template exists
if (!service.templates['user_created']) {
  console.error('Template not found!');
}
```

### Variables Not Rendering

**Problem:** Email shows `{{firstName}}` instead of actual name

**Causes:**
1. Variable name mismatch (case-sensitive)
2. Data not provided
3. Template syntax error

**Solution:**
```javascript
// Check variable names match
const template = service.templates['user_created'];
const variables = template.subject.match(/\{\{(\w+)\}\}/g);
console.log('Required variables:', variables);
// ['{{firstName}}', '{{lastName}}']

// Ensure data matches
const data = {
  firstName: 'John',  // Must match exactly
  lastName: 'Doe'     // Case-sensitive
};
```

### HTML Not Rendering

**Problem:** Email shows HTML code instead of formatted content

**Causes:**
1. Email client doesn't support HTML
2. Plain text mode enabled
3. HTML syntax error

**Solution:**
- Always provide plain text fallback (`text` field)
- Test HTML in multiple email clients
- Validate HTML syntax
- Use inline styles (no external CSS)

---

## Future Enhancements

### 1. Advanced Template Engine

Replace simple interpolation with a full template engine:

**Option A: Handlebars**
```handlebars
<div>
  <h2>{{title}}</h2>
  {{#if showButton}}
    <a href="{{buttonLink}}">{{buttonText}}</a>
  {{/if}}
  <ul>
  {{#each items}}
    <li>{{this}}</li>
  {{/each}}
  </ul>
</div>
```

**Option B: EJS**
```ejs
<div>
  <h2><%= title %></h2>
  <% if (showButton) { %>
    <a href="<%= buttonLink %>"><%= buttonText %></a>
  <% } %>
  <ul>
  <% items.forEach(item => { %>
    <li><%= item %></li>
  <% }); %>
  </ul>
</div>
```

### 2. Template Versioning

Track template changes over time:
```json
{
  "user_created": {
    "v1": { "subject": "...", "html": "..." },
    "v2": { "subject": "...", "html": "..." },
    "current": "v2"
  }
}
```

### 3. Localization/i18n

Support multiple languages:
```json
{
  "user_created": {
    "en": {
      "subject": "Welcome, {{firstName}}",
      "html": "<p>Hi {{firstName}}...</p>"
    },
    "es": {
      "subject": "Bienvenido, {{firstName}}",
      "html": "<p>Hola {{firstName}}...</p>"
    }
  }
}
```

### 4. Template Editor UI

Web-based template editor with:
- Live preview
- Variable picker
- HTML/CSS editor
- Email client testing
- Template history

### 5. Dynamic Template Storage

Store templates in database instead of JSON file:
```sql
CREATE TABLE email_templates (
  id INTEGER PRIMARY KEY,
  key STRING UNIQUE,
  subject STRING,
  html STRING,
  text STRING,
  created_at STRING,
  updated_at STRING
);
```

### 6. Template Validation

Validate templates on load:
```javascript
function validateTemplate(template) {
  // Check required fields
  if (!template.subject || !template.html) {
    throw new Error('Template must have subject and html');
  }

  // Check for undefined variables
  const usedVars = new Set();
  const subjectVars = (template.subject.match(/\{\{(\w+)\}\}/g) || []);
  const htmlVars = (template.html.match(/\{\{(\w+)\}\}/g) || []);

  subjectVars.concat(htmlVars).forEach(v => {
    usedVars.add(v.replace(/[{}]/g, ''));
  });

  return Array.from(usedVars);
}
```

### 7. Template Inheritance

Base templates with overrides:
```json
{
  "_base": {
    "header": "<div>{{header}}</div>",
    "footer": "<div>{{footer}}</div>"
  },
  "user_created": {
    "extends": "_base",
    "body": "<p>Welcome {{firstName}}</p>"
  }
}
```

### 8. Attachment Support

Include attachments in templates:
```json
{
  "invoice": {
    "subject": "Invoice {{invoiceNumber}}",
    "html": "<p>See attached invoice.</p>",
    "attachments": [
      {
        "filename": "invoice-{{invoiceNumber}}.pdf",
        "path": "/path/to/invoice.pdf"
      }
    ]
  }
}
```

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [API.md](./API.md) - API reference
- [DATABASE.md](./DATABASE.md) - Database schema
- [../../docs/plugins/PLUGIN_API.md](../../docs/plugins/PLUGIN_API.md) - Plugin system
