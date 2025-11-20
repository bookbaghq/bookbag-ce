# Authentication & Authorization Documentation

Complete guide to authentication and authorization in the User component.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [Authentication Flows](#authentication-flows)
- [Authorization](#authorization)
- [Session Management](#session-management)
- [Password Management](#password-management)
- [Security](#security)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)

---

## Overview

The User component provides two authentication modes:

1. **Session-Based Authentication** - Traditional email/password authentication with server-side sessions
2. **Temporary User Mode** - Anonymous access with client-side user ID storage

The system automatically switches between modes based on the `sign_in_enabled` setting.

---

## Authentication Methods

### 1. Session-Based Authentication

**When Used:**
- `sign_in_enabled = true` (default)
- Users must register and log in
- Full user profiles with roles

**Authentication Flow:**
1. User registers with email/password
2. Password hashed with bcrypt and stored
3. User logs in with credentials
4. Server validates password
5. Server generates session token
6. Token stored in database and httpOnly cookie
7. Client sends cookie with each request
8. Server validates token on each request

**Advantages:**
- Secure password storage
- User profiles and roles
- Full access control
- Audit trail

**Disadvantages:**
- Requires user registration
- More complex setup

---

### 2. Temporary User Mode

**When Used:**
- `sign_in_enabled = false`
- No login required
- Anonymous access to chat/features

**Authentication Flow:**
1. User visits site without logging in
2. Server generates 30-digit numeric ID
3. ID stored in cookie
4. User treated as authenticated subscriber
5. No database record created

**Advantages:**
- No registration required
- Instant access
- Simple implementation

**Disadvantages:**
- No persistent user data
- No password protection
- Limited features

---

## Authentication Flows

### Registration Flow

```
┌─────────────┐
│   Client    │
│  (Register) │
└──────┬──────┘
       │
       │ POST /bb-user/api/auth/register
       │ {email, password, first_name, last_name}
       ↓
┌──────────────────────┐
│ credentialsController│
│    (register)        │
└──────┬───────────────┘
       │
       │ 1. Check sign_up_enabled
       │ 2. Validate email format
       │ 3. Check email uniqueness
       ↓
┌──────────────────────┐
│  Create User Record  │
│                      │
│ User:                │
│  - email             │
│  - user_name         │
│  - first_name        │
│  - last_name         │
│  - role = 2          │
└──────┬───────────────┘
       │
       │ Save user
       ↓
┌──────────────────────┐
│  Generate Password   │
│     Security         │
│                      │
│ salt = bcrypt.genSalt│
│ hash = bcrypt.hash   │
└──────┬───────────────┘
       │
       │ Create auth record
       ↓
┌──────────────────────┐
│  Create Auth Record  │
│                      │
│ Auth:                │
│  - user_id           │
│  - password_salt     │
│  - password_hash     │
│  - login_counter = 1 │
└──────┬───────────────┘
       │
       │ Return user
       ↓
┌──────────────────────┐
│     Response         │
│  {success, user}     │
└──────────────────────┘
```

**Implementation:**
```javascript
// components/user/app/controllers/api/credentialsController.js

async register(obj) {
  // Check if sign-up is enabled
  const settings = this._userContext.Settings.single();
  if (settings && settings.sign_up_enabled === 0) {
    return this.returnJson({
      success: false,
      error: 'Sign-up is currently disabled'
    });
  }

  const { email, password, first_name, last_name, user_name } = obj.body;

  // Check if email exists (case-insensitive)
  const existingUser = this._userContext.User
    .where(u => u.email == $$, email.toLowerCase())
    .single();

  if (existingUser) {
    return this.returnJson({
      success: false,
      error: 'Email already exists'
    });
  }

  // Create user
  const user = new this._userContext.User();
  user.email = email.toLowerCase();
  user.user_name = user_name || email.split('@')[0];
  user.first_name = first_name || '';
  user.last_name = last_name || '';
  user.role = 2; // Subscriber
  user.created_at = Date.now().toString();
  user.updated_at = Date.now().toString();

  this._userContext.User.add(user);
  this._userContext.saveChanges();

  // Create auth record
  const bcrypt = require('bcrypt');
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const auth = new this._userContext.Auth();
  auth.user_id = user.id;
  auth.password_salt = salt;
  auth.password_hash = hash;
  auth.login_counter = 1;
  auth.created_at = Date.now().toString();
  auth.updated_at = Date.now().toString();

  this._userContext.Auth.add(auth);
  this._userContext.saveChanges();

  return this.returnJson({
    success: true,
    user: user
  });
}
```

---

### Login Flow

```
┌─────────────┐
│   Client    │
│   (Login)   │
└──────┬──────┘
       │
       │ POST /bb-user/api/auth/login
       │ {email, password}
       ↓
┌──────────────────────┐
│ credentialsController│
│      (login)         │
└──────┬───────────────┘
       │
       │ Call authService.authenticate()
       ↓
┌──────────────────────┐
│   authService        │
│   (authenticate)     │
└──────┬───────────────┘
       │
       │ 1. Find user by email (case-insensitive)
       │ 2. Load Auth record
       ↓
┌──────────────────────┐
│  Verify Password     │
│                      │
│ saltedHash =         │
│   bcrypt.hash(       │
│     password,        │
│     auth.salt        │
│   )                  │
│                      │
│ valid =              │
│   (hash === stored)  │
└──────┬───────────────┘
       │
       │ If valid
       ↓
┌──────────────────────┐
│  Generate Session    │
│      Token           │
│                      │
│ token = random(50)   │
│ auth.temp_access..   │
└──────┬───────────────┘
       │
       │ Set cookie
       ↓
┌──────────────────────┐
│   Set Cookie         │
│                      │
│ setCookie(           │
│   'login',           │
│   token,             │
│   {httpOnly: true}   │
│ )                    │
└──────┬───────────────┘
       │
       │ Return user
       ↓
┌──────────────────────┐
│     Response         │
│  {success, user}     │
└──────────────────────┘
```

**Implementation:**
```javascript
// components/user/app/service/authService.js

authenticate(email, password, userContext, req) {
  // Find user by email
  const user = userContext.User
    .where(u => u.email == $$, email.toLowerCase())
    .include('Auth')
    .single();

  if (!user || !user.Auth) {
    return { isValid: false };
  }

  const auth = user.Auth;

  // Hash password with stored salt
  const bcrypt = require('bcrypt');
  const saltedHash = bcrypt.hashSync(password, auth.password_salt);

  // Compare hashes
  if (auth.password_hash === saltedHash) {
    // Generate session token
    const tempAccessToken = this._generateRandomId(50);
    auth.temp_access_token = tempAccessToken;
    auth.login_counter = (auth.login_counter || 0) + 1;
    auth.updated_at = Date.now().toString();

    userContext.saveChanges();

    // Set cookie
    const master = require('mastercontroller');
    master.sessions.setCookie('login', tempAccessToken, req, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return { user: user, isValid: true };
  }

  return { isValid: false };
}
```

---

### Current User Flow

```
┌─────────────┐
│   Client    │
│  (Request)  │
└──────┬──────┘
       │
       │ GET /bb-user/api/auth/currentuser
       │ Cookie: login=token
       ↓
┌──────────────────────┐
│   authController     │
│   (currentUser)      │
└──────┬───────────────┘
       │
       │ Call authService.currentUser()
       ↓
┌──────────────────────┐
│   authService        │
│  (currentUser)       │
└──────┬───────────────┘
       │
       │ Check sign_in_enabled
       ↓
       ┌─────────────┐
       │ Enabled?    │
       └───┬─────┬───┘
           │     │
      YES  │     │  NO
           │     │
           ↓     ↓
    ┌──────┐   ┌──────────────────┐
    │ Get  │   │ Temp User Mode   │
    │Cookie│   │                  │
    └──┬───┘   │ Generate 30-digit│
       │       │ numeric ID       │
       │       │                  │
       ↓       │ Store in cookie  │
┌──────────────┐                  │
│ Find Auth by │ Return as        │
│   Token      │ authenticated    │
└──────┬───────┘ subscriber       │
       │       └──────────────────┘
       │ Load user
       ↓
┌──────────────────────┐
│  Build User Object   │
│                      │
│ {                    │
│   isAuthenticated,   │
│   isAdmin,           │
│   isSubscriber,      │
│   id,                │
│   email,             │
│   ...                │
│ }                    │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│     Response         │
│  {currentUser}       │
└──────────────────────┘
```

**Implementation:**
```javascript
// components/user/app/service/authService.js

currentUser(req, userContext) {
  const master = require('mastercontroller');

  // Check if sign-in is enabled
  const settings = userContext.Settings.take(1).toList()[0];
  const signInEnabled = settings && settings.sign_in_enabled !== 0;

  if (!signInEnabled) {
    // Temporary user mode
    let tempUserId = master.sessions.getCookie('temp_user_id', req);

    if (!tempUserId || tempUserId === -1) {
      // Generate 30-digit numeric ID
      tempUserId = this._generateNumericId(30);
      master.sessions.setCookie('temp_user_id', tempUserId, req, {
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      });
    }

    return {
      isAuthenticated: true,
      isAdmin: false,
      isSubscriber: true,
      id: String(tempUserId),
      isTemp: true
    };
  }

  // Session-based authentication
  const sessionToken = master.sessions.getCookie('login', req);

  if (!sessionToken) {
    return { isAuthenticated: false };
  }

  // Find auth by token
  const auth = userContext.Auth
    .where(a => a.temp_access_token == $$, sessionToken)
    .include('User')
    .single();

  if (!auth || !auth.User) {
    return { isAuthenticated: false };
  }

  const user = auth.User;

  return {
    isAuthenticated: true,
    isAdmin: user.role === 1,
    isSubscriber: user.role === 2,
    id: String(user.id),
    email: user.email,
    user_name: user.user_name,
    first_name: user.first_name,
    last_name: user.last_name
  };
}
```

---

### Logout Flow

```
┌─────────────┐
│   Client    │
│  (Logout)   │
└──────┬──────┘
       │
       │ GET /bb-user/api/auth/logout
       │ Cookie: login=token
       ↓
┌──────────────────────┐
│   authController     │
│     (logout)         │
└──────┬───────────────┘
       │
       │ Get session token from cookie
       ↓
┌──────────────────────┐
│  Find Auth by Token  │
└──────┬───────────────┘
       │
       │ Clear token
       ↓
┌──────────────────────┐
│  Clear Session Data  │
│                      │
│ auth.temp_access..   │
│   = null             │
│ auth.auth_token      │
│   = null             │
└──────┬───────────────┘
       │
       │ Save changes
       ↓
┌──────────────────────┐
│   Clear Cookie       │
│                      │
│ setCookie('login',   │
│   '', {maxAge: 0})   │
└──────┬───────────────┘
       │
       │ Return success
       ↓
┌──────────────────────┐
│     Response         │
│  {success: true}     │
└──────────────────────┘
```

---

## Authorization

### Role-Based Access Control

**Roles:**
- **Administrator (role = 1)**: Full system access
- **Subscriber (role = 2)**: Limited access to own data

**Permission Check:**
```javascript
function requireAdmin(req, userContext) {
  const AuthService = require('components/user/app/service/authService');
  const authService = new AuthService();

  const currentUser = authService.currentUser(req, userContext);

  if (!currentUser.isAuthenticated) {
    throw new Error('Unauthorized: Login required');
  }

  if (!currentUser.isAdmin) {
    throw new Error('Forbidden: Admin access required');
  }

  return currentUser;
}
```

**Usage in Controller:**
```javascript
class adminController {
  constructor(req) {
    this._userContext = req.userContext;
    const AuthService = require('components/user/app/service/authService');
    this.authService = new AuthService();
  }

  async deleteUser(obj) {
    // Check admin permission
    const currentUser = this.authService.currentUser(obj.request, this._userContext);

    if (!currentUser.isAdmin) {
      return this.returnJson({
        success: false,
        error: 'Forbidden: Admin access required'
      });
    }

    // Proceed with deletion
    const userId = obj.body.id;
    const user = this._userContext.User
      .where(u => u.id == $$, userId)
      .single();

    if (!user) {
      return this.returnJson({
        success: false,
        error: 'User not found'
      });
    }

    this._userContext.User.remove(user);
    this._userContext.saveChanges();

    return this.returnJson({ success: true });
  }
}
```

---

## Session Management

### Session Lifecycle

**1. Session Creation (Login)**
```javascript
// Generate token
const token = generateSecureToken(50);

// Store in database
auth.temp_access_token = token;
userContext.saveChanges();

// Store in cookie
setCookie('login', token, req, {
  httpOnly: true,    // Prevent JavaScript access
  secure: true,      // HTTPS only in production
  sameSite: 'None',  // Cross-origin support
  maxAge: 86400000   // 24 hours
});
```

**2. Session Validation (Each Request)**
```javascript
// Get token from cookie
const token = getCookie('login', req);

// Find auth record
const auth = userContext.Auth
  .where(a => a.temp_access_token == $$, token)
  .single();

if (!auth) {
  return { isAuthenticated: false };
}

// Session is valid
return { isAuthenticated: true, userId: auth.user_id };
```

**3. Session Termination (Logout)**
```javascript
// Clear database token
auth.temp_access_token = null;
userContext.saveChanges();

// Clear cookie
setCookie('login', '', req, { maxAge: 0 });
```

### Cookie Configuration

**Development:**
```javascript
{
  httpOnly: true,
  secure: false,    // HTTP allowed
  sameSite: 'Lax',
  maxAge: 86400000  // 24 hours
}
```

**Production:**
```javascript
{
  httpOnly: true,
  secure: true,     // HTTPS only
  sameSite: 'None', // Cross-origin
  maxAge: 86400000  // 24 hours
}
```

---

## Password Management

### Password Hashing

**bcrypt Configuration:**
- Salt rounds: 10
- Algorithm: bcrypt
- Separate salt storage

**Hash Generation:**
```javascript
const bcrypt = require('bcrypt');

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

auth.password_salt = salt;
auth.password_hash = hash;
```

**Verification:**
```javascript
const bcrypt = require('bcrypt');

const inputHash = bcrypt.hashSync(inputPassword, auth.password_salt);
const isValid = (inputHash === auth.password_hash);
```

---

### Password Reset Flow

```
1. User requests reset
   POST /bb-user/api/auth/forgetPassword
   {email}

2. Server generates reset token
   token = generateSecureToken(32)
   auth.password_reset_token = token
   auth.password_reset_sent_at = now()

3. Server sends email with token
   (Email implementation required)

4. User submits new password with token
   POST /bb-user/api/auth/resetPassword
   {token, newPassword}

5. Server validates token and expiry
   if (token === auth.password_reset_token &&
       now() - sent_at < 1 hour) {
     // Valid
   }

6. Server updates password
   salt = bcrypt.genSaltSync(10)
   hash = bcrypt.hashSync(newPassword, salt)
   auth.password_salt = salt
   auth.password_hash = hash
   auth.password_reset_token = null

7. Return success
```

---

### Change Password

**Requirements:**
- User must be authenticated
- Old password must be correct
- New password must meet requirements

**Implementation:**
```javascript
async changePassword(obj) {
  const { email, oldPassword, newPassword } = obj.body;

  // Find user and auth
  const user = this._userContext.User
    .where(u => u.email == $$, email.toLowerCase())
    .include('Auth')
    .single();

  if (!user || !user.Auth) {
    return this.returnJson({
      success: false,
      error: 'User not found'
    });
  }

  const auth = user.Auth;

  // Verify old password
  const bcrypt = require('bcrypt');
  const oldHash = bcrypt.hashSync(oldPassword, auth.password_salt);

  if (oldHash !== auth.password_hash) {
    return this.returnJson({
      success: false,
      error: 'Incorrect old password'
    });
  }

  // Generate new hash
  const newSalt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, newSalt);

  // Update auth
  auth.password_salt = newSalt;
  auth.password_hash = newHash;
  auth.updated_at = Date.now().toString();

  this._userContext.saveChanges();

  return this.returnJson({ success: true });
}
```

---

## Security

### Password Requirements

**Minimum Requirements:**
- Length: 8+ characters
- Uppercase: At least 1
- Lowercase: At least 1
- Numbers: At least 1
- Special chars: Recommended

**Validation Function:**
```javascript
function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}
```

---

### Session Security

**Best Practices:**
1. Use httpOnly cookies to prevent XSS
2. Use secure flag in production (HTTPS only)
3. Use sameSite=None for cross-origin with HTTPS
4. Expire sessions after inactivity
5. Regenerate tokens after privilege escalation
6. Clear sessions on logout
7. Use long, random tokens (50+ chars)
8. Store tokens securely in database

---

### Rate Limiting

**Prevent Brute Force Attacks:**

```javascript
const rateLimitMap = new Map();

function checkRateLimit(email, maxAttempts = 5, windowMs = 900000) {
  const key = email.toLowerCase();
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { attempts: 1, firstAttempt: now });
    return true;
  }

  const data = rateLimitMap.get(key);

  // Reset if window expired
  if (now - data.firstAttempt > windowMs) {
    rateLimitMap.set(key, { attempts: 1, firstAttempt: now });
    return true;
  }

  // Check if limit exceeded
  if (data.attempts >= maxAttempts) {
    return false; // Rate limit exceeded
  }

  // Increment attempts
  data.attempts++;
  return true;
}
```

---

## Implementation Examples

### Protect Route

```javascript
class protectedController {
  constructor(req) {
    this._userContext = req.userContext;
    const AuthService = require('components/user/app/service/authService');
    this.authService = new AuthService();
  }

  async protectedAction(obj) {
    // Get current user
    const currentUser = this.authService.currentUser(obj.request, this._userContext);

    // Check authentication
    if (!currentUser.isAuthenticated) {
      return this.returnJson({
        success: false,
        error: 'Unauthorized: Login required'
      });
    }

    // Check authorization
    if (!currentUser.isAdmin) {
      return this.returnJson({
        success: false,
        error: 'Forbidden: Insufficient permissions'
      });
    }

    // Proceed with protected action
    return this.returnJson({
      success: true,
      data: 'Protected data'
    });
  }
}
```

---

### Middleware Pattern

```javascript
function requireAuth(handler) {
  return async function(obj) {
    const AuthService = require('components/user/app/service/authService');
    const authService = new AuthService();

    const currentUser = authService.currentUser(obj.request, obj.userContext);

    if (!currentUser.isAuthenticated) {
      return this.returnJson({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Attach currentUser to request
    obj.request.currentUser = currentUser;

    // Call original handler
    return handler.call(this, obj);
  };
}

// Usage
class myController {
  async publicAction(obj) {
    return this.returnJson({ data: 'Public data' });
  }

  async privateAction(obj) {
    return requireAuth(async function(obj) {
      return this.returnJson({
        data: 'Private data',
        user: obj.request.currentUser
      });
    }).call(this, obj);
  }
}
```

---

## Best Practices

### 1. Never Trust Client Input

```javascript
// BAD
const userId = obj.body.userId;
const user = userContext.User.where(u => u.id == $$, userId).single();

// GOOD
const currentUser = authService.currentUser(obj.request, userContext);
if (!currentUser.isAuthenticated) {
  return this.returnJson({ error: 'Unauthorized' });
}
const userId = currentUser.id; // Use authenticated user's ID
const user = userContext.User.where(u => u.id == $$, userId).single();
```

---

### 2. Validate Permissions

```javascript
// BAD
async updateUser(obj) {
  const user = userContext.User.where(u => u.id == $$, obj.body.id).single();
  user.role = obj.body.role; // Anyone can make themselves admin!
  userContext.saveChanges();
}

// GOOD
async updateUser(obj) {
  const currentUser = authService.currentUser(obj.request, userContext);

  if (!currentUser.isAdmin) {
    return this.returnJson({ error: 'Forbidden' });
  }

  const user = userContext.User.where(u => u.id == $$, obj.body.id).single();
  user.role = obj.body.role;
  userContext.saveChanges();
}
```

---

### 3. Use HTTPS in Production

```javascript
// Cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: 86400000
};
```

---

### 4. Log Security Events

```javascript
function logSecurityEvent(event, details) {
  console.log(`[SECURITY] ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Usage
logSecurityEvent('LOGIN_FAILED', {
  email: email,
  ip: req.ip
});

logSecurityEvent('PASSWORD_CHANGED', {
  userId: user.id,
  ip: req.ip
});
```

---

### 5. Implement Account Lockout

```javascript
const lockoutMap = new Map();

function checkAccountLockout(email) {
  const key = email.toLowerCase();
  const lockout = lockoutMap.get(key);

  if (!lockout) return true;

  const now = Date.now();
  if (now - lockout.timestamp < 900000) { // 15 minutes
    return false; // Account is locked
  }

  // Lockout expired
  lockoutMap.delete(key);
  return true;
}

function recordFailedLogin(email) {
  const key = email.toLowerCase();
  const failures = lockoutMap.get(key) || { count: 0 };

  failures.count++;

  if (failures.count >= 5) {
    failures.timestamp = Date.now();
    lockoutMap.set(key, failures);
  }
}
```

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [API.md](./API.md) - API endpoints
- [DATABASE.md](./DATABASE.md) - Database schema

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
