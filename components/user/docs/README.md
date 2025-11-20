# User Component Documentation

Comprehensive user management, authentication, and authorization system for Bookbag CE.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Security](#security)
- [Related Documentation](#related-documentation)

---

## Overview

The User component provides complete user management, authentication, and role-based authorization for Bookbag CE. It handles user registration, login, password management, profile management, and session tracking with full database integration.

**Component Path:** `components/user/`
**API Prefix:** `/bb-user/api/`
**Database Context:** `userContext`
**Storage Location:** `db/development.sqlite3`

---

## Key Features

### Authentication
- **User Registration** - Create new user accounts with email/password
- **User Login** - Session-based authentication with bcrypt password hashing
- **Logout** - Secure session termination
- **Password Reset** - Secure password reset with token-based verification
- **Change Password** - Allow users to update their passwords
- **Session Management** - Cookie-based session tracking
- **Temporary Users** - Support for anonymous users when sign-in is disabled

### Authorization
- **Role-Based Access** - Administrator and Subscriber roles
- **Permission Checks** - Validate user roles before actions
- **Protected Routes** - Middleware for securing endpoints

### User Management
- **Create Users** - Admin can create new users
- **Update Users** - Modify user information
- **Delete Users** - Remove users from system
- **Update Roles** - Assign roles to users
- **Profile Management** - Users can manage their profiles
- **Avatar Upload** - Support for user profile pictures

### Profile Features
- **View Profile** - Get user profile by ID
- **My Profile** - Current user's profile
- **All Profiles** - List all user profiles
- **Search Profiles** - Search users by criteria
- **Update Profile** - Modify profile information

### Settings
- **Sign-up Control** - Enable/disable user registration
- **Sign-in Control** - Enable/disable user login
- **Registration Availability** - Check if registration is allowed
- **Login Availability** - Check if login is allowed

---

## Architecture

### Component Structure

```
components/user/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       ├── authController.js          # Authentication logic
│   │       ├── credentialsController.js   # Login/register/password
│   │       ├── userController.js          # User CRUD operations
│   │       ├── profileController.js       # Profile management
│   │       └── settingsController.js      # System settings
│   ├── models/
│   │   ├── userContext.js                 # Database context
│   │   ├── user.js                        # User entity model
│   │   ├── auth.js                        # Auth entity model
│   │   ├── settings.js                    # Settings entity model
│   │   └── db/
│   │       └── migrations/
│   │           └── 1759119178873_Init_migration.js
│   ├── service/
│   │   └── authService.js                 # Authentication service
│   └── vm/
│       ├── currentUserVM.js               # Current user view model
│       └── userList.js                    # User list view model
├── config/
│   ├── routes.js                          # Route definitions
│   └── environments/
│       ├── env.development.json
│       └── env.production.json
└── db/
    └── development.sqlite3                # SQLite database
```

### Authentication Flow

```
┌─────────────┐
│   Client    │
│  (Login)    │
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│ credentialsController│ ← Validate credentials
│     (login)          │ ← Hash password with bcrypt
└──────┬───────────────┘ ← Compare with stored hash
       │
       ↓
┌──────────────────────┐
│   authService        │ ← Authenticate user
│  (authenticate)      │ ← Find user by email
└──────┬───────────────┘ ← Verify password
       │
       ↓
┌──────────────────────┐
│  Create Session      │ ← Generate temp token
│  (setCookie)         │ ← Set login cookie
└──────┬───────────────┘ ← Store in database
       │
       ↓
┌──────────────────────┐
│   Response           │
│  { success, user }   │
└──────────────────────┘
```

### Authorization Flow

```
┌─────────────┐
│   Request   │
│ (w/ cookie) │
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│  authService         │ ← Get cookie from request
│  (currentUser)       │ ← Find auth by token
└──────┬───────────────┘ ← Load user record
       │
       ↓
┌──────────────────────┐
│  Build User Object   │ ← isAuthenticated
│                      │ ← isAdmin / isSubscriber
└──────┬───────────────┘ ← User ID
       │
       ↓
┌──────────────────────┐
│  Attach to Request   │
│  req.currentUser     │
└──────────────────────┘
```

---

## Quick Start

### Register a New User

```javascript
// Frontend - Register
const response = await fetch('/bb-user/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123',
    first_name: 'John',
    last_name: 'Doe'
  })
});

const data = await response.json();
console.log('User created:', data.user);
```

### Login

```javascript
// Frontend - Login
const response = await fetch('/bb-user/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123'
  })
});

const data = await response.json();
// Cookie automatically set by server
console.log('Logged in:', data.user);
```

### Get Current User

```javascript
// Frontend - Get current user
const response = await fetch('/bb-user/api/auth/currentuser');
const data = await response.json();

console.log('Current user:', data);
// {
//   isAuthenticated: true,
//   isAdmin: false,
//   isSubscriber: true,
//   id: "123"
// }
```

### Logout

```javascript
// Frontend - Logout
const response = await fetch('/bb-user/api/auth/logout');
const data = await response.json();
console.log('Logged out:', data.success);
```

---

## Core Concepts

### User Roles

Users can have one of two roles:

**1. Administrator (role = 1)**
- Full access to all system features
- Can create, update, and delete users
- Can manage system settings
- Can access admin interface

**2. Subscriber (role = 2)**
- Access to own profile and chat
- Can update own profile
- Cannot access admin features

Role values are stored as integers in the database but converted to strings ("Administrator", "Subscriber") via getter/setter methods.

### Authentication Methods

#### 1. Session-Based Authentication (Default)

When sign-in is enabled:
- User logs in with email/password
- Server creates session with unique token
- Token stored in httpOnly cookie
- Token stored in `auth.temp_access_token` field
- Each request validates token against database

#### 2. Temporary User Mode

When sign-in is disabled:
- System generates numeric user ID (30 digits)
- ID stored in cookie for persistence
- User treated as authenticated subscriber
- No database record required
- Useful for anonymous chat access

### Password Security

**Hashing Strategy:**
- Algorithm: bcrypt
- Rounds: 10 (hardcoded in salt)
- Salt: Stored separately in `auth.password_salt`
- Hash: Stored in `auth.password_hash`

**Registration Flow:**
```javascript
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

auth.password_salt = salt;
auth.password_hash = hash;
```

**Login Flow:**
```javascript
const saltedHash = bcrypt.hashSync(password, auth.password_salt);
if (auth.password_hash === saltedHash) {
  // Authentication successful
}
```

### Settings Control

**Sign-up Control:**
- `sign_up_enabled`: true/false
- When false, registration endpoint returns error
- Check availability: `GET /bb-user/api/auth/can-register`

**Sign-in Control:**
- `sign_in_enabled`: true/false
- When false, system uses temporary user mode
- Check availability: `GET /bb-user/api/auth/can-login`

---

## Usage Examples

### Backend - Controller Access

```javascript
class myController {
  constructor(req) {
    this._userContext = req.userContext;
    const AuthService = require('path/to/authService');
    this.authService = new AuthService();
  }

  async myMethod(obj) {
    // Get current user
    const currentUser = this.authService.currentUser(obj.request, this._userContext);

    if (currentUser.isAdmin) {
      // Admin-only logic
    }

    // Get user by email
    const user = this.authService.findAuthByEmail('user@example.com', this._userContext);

    // Create new user
    const newUser = new this._userContext.User();
    newUser.email = 'newuser@example.com';
    newUser.user_name = 'newuser';
    newUser.role = 2; // Subscriber
    newUser.created_at = Date.now().toString();
    newUser.updated_at = Date.now().toString();

    this._userContext.User.add(newUser);
    this._userContext.saveChanges();
  }
}
```

### Service - Authenticate User

```javascript
const AuthService = require('components/user/app/service/authService');
const authService = new AuthService();

// Authenticate with email/password
const result = authService.authenticate(
  'user@example.com',
  'password123',
  userContext,
  req
);

if (result.isValid) {
  console.log('User authenticated:', result.user);
} else {
  console.log('Authentication failed');
}
```

### Change Password

```javascript
// Frontend
const response = await fetch('/bb-user/api/auth/changePassword', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    oldPassword: 'oldPass123',
    newPassword: 'newPass456'
  })
});

const data = await response.json();
console.log('Password changed:', data.success);
```

### Reset Password

```javascript
// Step 1: Request reset token
const response1 = await fetch('/bb-user/api/auth/forgetPassword', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

// Server sends email with reset token

// Step 2: Reset with token
const response2 = await fetch('/bb-user/api/auth/resetPassword', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'reset-token-from-email',
    newPassword: 'newSecurePass789'
  })
});
```

### Profile Management

```javascript
// Get my profile
const profileResponse = await fetch('/bb-user/api/myprofile');
const myProfile = await profileResponse.json();

// Update profile
const updateResponse = await fetch('/bb-user/api/profile/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com'
  })
});

// Upload avatar
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const avatarResponse = await fetch('/bb-user/api/profile/uploadAvatar', {
  method: 'POST',
  body: formData
});
```

---

## Configuration

### Environment Variables

```javascript
// config/environments/env.development.json
{
  "jwtAPI": {
    "ACCESS_TOKEN_SECRET": "your-access-token-secret",
    "REFRESH_TOKEN_SECRET": "your-refresh-token-secret"
  }
}
```

### Default Credentials

**Admin User:**
- Email: `admin@bookbag.ai`
- Password: `changeme` (change immediately!)
- Role: Administrator
- Created by initial migration

### Settings Management

```javascript
// Get settings
GET /bb-user/api/settings/get

// Response:
{
  "success": true,
  "settings": {
    "sign_up_enabled": true,
    "sign_in_enabled": true
  }
}
```

```javascript
// Update settings
POST /bb-user/api/settings/save
{
  "sign_up_enabled": false,
  "sign_in_enabled": true
}
```

---

## Security

### Password Requirements

**Recommendations:**
- Minimum 8 characters
- Mix of uppercase and lowercase
- Include numbers and special characters
- No common dictionary words

**Implementation:**
```javascript
function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber) {
    return { valid: false, error: 'Password must contain uppercase, lowercase, and numbers' };
  }

  return { valid: true };
}
```

### Session Security

**Cookie Configuration:**
- httpOnly: true (prevents JavaScript access)
- secure: true (HTTPS only in production)
- sameSite: 'None' (for cross-origin, with HTTPS)
- maxAge: 24 hours (configurable)

### SQL Injection Prevention

**Use parameterized queries:**
```javascript
// BAD - Vulnerable to SQL injection
const user = userContext.User.raw(`select * from User where email = '${email}'`).single();

// GOOD - Use MasterRecord ORM methods
const user = userContext.User.where(u => u.email == $$, email).single();
```

### Rate Limiting

Implement rate limiting on authentication endpoints to prevent brute force attacks.

---

## Related Documentation

- [API.md](./API.md) - Complete API reference
- [DATABASE.md](./DATABASE.md) - Database schema and queries
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Authentication flows and security

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
