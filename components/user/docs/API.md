# User Component API Reference

Complete API documentation for the User component authentication, user management, and profile endpoints.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [User Management](#user-management-endpoints)
  - [Profile Management](#profile-management-endpoints)
  - [Settings](#settings-endpoints)
- [Error Codes](#error-codes)

---

## Overview

The User component API provides endpoints for:
- User registration and authentication
- Session management
- User CRUD operations
- Profile management
- Role-based authorization
- System settings

All endpoints follow RESTful conventions and return JSON responses.

---

## Base URL

```
http://localhost:8080/bb-user/api
```

In production, replace `localhost:8080` with your domain.

---

## Authentication

Most endpoints require authentication via session cookies. After successful login, the server sets an httpOnly cookie that is automatically sent with subsequent requests.

**Cookie Name:** `login` (or custom name based on configuration)

**Cookie Properties:**
- httpOnly: true
- secure: true (in production)
- sameSite: 'None' (for cross-origin, with HTTPS)
- maxAge: 24 hours (configurable)

**Temporary User Mode:**
When sign-in is disabled, the system generates a temporary user ID stored in a cookie, allowing anonymous access.

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

---

## Endpoints

## Authentication Endpoints

### 1. Register New User

Create a new user account.

**Endpoint:** `POST /bb-user/api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "user_name": "johndoe"
}
```

**Required Fields:**
- `email` (string) - Must be unique and valid email format
- `password` (string) - Minimum 8 characters recommended

**Optional Fields:**
- `first_name` (string)
- `last_name` (string)
- `user_name` (string) - If not provided, derived from email

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_name": "johndoe",
    "role": "Subscriber",
    "created_at": "1731234567890",
    "updated_at": "1731234567890"
  },
  "message": "Registration successful"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Errors:**
- `400` - Email already exists
- `400` - Sign-up is disabled
- `400` - Invalid email format
- `400` - Missing required fields

---

### 2. Login

Authenticate user and create session.

**Endpoint:** `POST /bb-user/api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_name": "johndoe",
    "role": "Subscriber"
  },
  "message": "Login successful"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

**Note:** Use `-c cookies.txt` to save the session cookie for subsequent requests.

**Errors:**
- `401` - Invalid email or password
- `400` - Missing email or password
- `400` - Sign-in is disabled

---

### 3. Logout

End user session and clear cookies.

**Endpoint:** `GET /bb-user/api/auth/logout`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8080/bb-user/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

---

### 4. Get Current User

Get information about the currently authenticated user.

**Endpoint:** `GET /bb-user/api/auth/currentuser`

**Authentication:** Optional (returns temporary user if not authenticated)

**Response (Authenticated):**
```json
{
  "isAuthenticated": true,
  "isAdmin": false,
  "isSubscriber": true,
  "id": "123",
  "email": "user@example.com",
  "user_name": "johndoe",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (Temporary User):**
```json
{
  "isAuthenticated": true,
  "isAdmin": false,
  "isSubscriber": true,
  "id": "123456789012345678901234567890",
  "isTemp": true
}
```

**Response (Not Authenticated):**
```json
{
  "isAuthenticated": false
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8080/bb-user/api/auth/currentuser \
  -b cookies.txt
```

---

### 5. Change Password

Change password for authenticated user.

**Endpoint:** `POST /bb-user/api/auth/changePassword`

**Authentication:** Required

**Request Body:**
```json
{
  "email": "user@example.com",
  "oldPassword": "currentPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/auth/changePassword \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "user@example.com",
    "oldPassword": "currentPassword123",
    "newPassword": "newSecurePassword456"
  }'
```

**Errors:**
- `401` - Old password is incorrect
- `400` - Missing required fields
- `404` - User not found

---

### 6. Forget Password (Request Reset)

Request password reset token (to be sent via email).

**Endpoint:** `POST /bb-user/api/auth/forgetPassword`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset token sent to email",
  "token": "abc123def456ghi789"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/auth/forgetPassword \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Note:** In production, the token should be sent via email and not returned in the response.

**Errors:**
- `404` - Email not found
- `400` - Missing email

---

### 7. Reset Password (With Token)

Reset password using token from forget password request.

**Endpoint:** `POST /bb-user/api/auth/resetPassword`

**Request Body:**
```json
{
  "token": "abc123def456ghi789",
  "newPassword": "newSecurePassword789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/auth/resetPassword \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123def456ghi789",
    "newPassword": "newSecurePassword789"
  }'
```

**Errors:**
- `400` - Invalid or expired token
- `400` - Missing token or new password

---

### 8. Check Login Availability

Check if login is currently enabled.

**Endpoint:** `GET /bb-user/api/auth/can-login`

**Response:**
```json
{
  "canLogin": true
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8080/bb-user/api/auth/can-login
```

---

### 9. Check Registration Availability

Check if registration is currently enabled.

**Endpoint:** `GET /bb-user/api/auth/can-register`

**Response:**
```json
{
  "canRegister": true
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8080/bb-user/api/auth/can-register
```

---

## User Management Endpoints

### 10. Create User (Admin)

Create a new user (admin only).

**Endpoint:** `POST /bb-user/api/create`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "first_name": "Jane",
  "last_name": "Smith",
  "user_name": "janesmith",
  "role": 2
}
```

**Role Values:**
- `1` - Administrator
- `2` - Subscriber (default)

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "456",
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "user_name": "janesmith",
    "role": "Subscriber",
    "created_at": "1731234567890",
    "updated_at": "1731234567890"
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": 2
  }'
```

**Errors:**
- `403` - Not authorized (not admin)
- `400` - Email already exists
- `400` - Missing required fields

---

### 11. Update User (Admin)

Update user information (admin only).

**Endpoint:** `POST /bb-user/api/update`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "id": "456",
  "email": "updatedemail@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "user_name": "janedoe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "456",
    "email": "updatedemail@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "user_name": "janedoe",
    "role": "Subscriber",
    "updated_at": "1731234678901"
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/update \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "id": "456",
    "first_name": "Jane",
    "last_name": "Doe"
  }'
```

**Errors:**
- `403` - Not authorized
- `404` - User not found
- `400` - Missing user ID

---

### 12. Update User Roles (Admin)

Update roles for one or more users (admin only).

**Endpoint:** `POST /bb-user/api/updateRoleUsers`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "userIds": ["123", "456", "789"],
  "role": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Roles updated successfully",
  "updatedCount": 3
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/updateRoleUsers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "userIds": ["123", "456"],
    "role": 1
  }'
```

**Errors:**
- `403` - Not authorized
- `400` - Invalid role value
- `400` - Missing userIds or role

---

### 13. Delete User (Admin)

Delete a user (admin only).

**Endpoint:** `DELETE /bb-user/api/delete`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "id": "456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**curl Example:**
```bash
curl -X DELETE http://localhost:8080/bb-user/api/delete \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "id": "456"
  }'
```

**Errors:**
- `403` - Not authorized
- `404` - User not found
- `400` - Cannot delete own account
- `400` - Missing user ID

---

## Profile Management Endpoints

### 14. Get My Profile

Get current user's profile.

**Endpoint:** `GET /bb-user/api/myprofile`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_name": "johndoe",
    "role": "Subscriber",
    "avatar_url": "/uploads/avatars/123.jpg",
    "created_at": "1731234567890",
    "updated_at": "1731234678901"
  }
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8080/bb-user/api/myprofile \
  -b cookies.txt
```

**Errors:**
- `401` - Not authenticated

---

### 15. Get Profile by ID

Get a specific user's profile.

**Endpoint:** `GET /bb-user/api/profile/:id`

**Authentication:** Required

**URL Parameters:**
- `id` (string) - User ID

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "456",
    "email": "other@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "user_name": "janesmith",
    "role": "Subscriber",
    "avatar_url": "/uploads/avatars/456.jpg"
  }
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8080/bb-user/api/profile/456 \
  -b cookies.txt
```

**Errors:**
- `404` - Profile not found
- `401` - Not authenticated

---

### 16. Get All Profiles

Get list of all user profiles.

**Endpoint:** `GET /bb-user/api/profile/all`

**Authentication:** Required (typically admin)

**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "id": "123",
      "email": "user1@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "user_name": "johndoe",
      "role": "Subscriber"
    },
    {
      "id": "456",
      "email": "user2@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "user_name": "janesmith",
      "role": "Administrator"
    }
  ],
  "count": 2
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8080/bb-user/api/profile/all \
  -b cookies.txt
```

---

### 17. Search Profiles

Search for user profiles by criteria.

**Endpoint:** `GET /bb-user/api/profile/search`

**Authentication:** Required

**Query Parameters:**
- `query` (string) - Search term
- `role` (integer) - Filter by role (1 or 2)
- `limit` (integer) - Max results (default: 20)
- `offset` (integer) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "id": "123",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "user_name": "johndoe",
      "role": "Subscriber"
    }
  ],
  "count": 1,
  "total": 50
}
```

**curl Example:**
```bash
curl -X GET "http://localhost:8080/bb-user/api/profile/search?query=john&limit=10" \
  -b cookies.txt
```

---

### 18. Update Profile

Update current user's profile.

**Endpoint:** `POST /bb-user/api/profile/save`

**Authentication:** Required

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "newemail@example.com",
  "user_name": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "123",
    "email": "newemail@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_name": "johndoe",
    "updated_at": "1731234789012"
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/profile/save \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Errors:**
- `401` - Not authenticated
- `400` - Email already in use
- `400` - Invalid data

---

### 19. Upload Avatar

Upload profile picture for current user.

**Endpoint:** `POST /bb-user/api/profile/uploadAvatar`

**Authentication:** Required

**Request Type:** `multipart/form-data`

**Form Data:**
- `avatar` (file) - Image file (JPG, PNG, GIF)

**Response:**
```json
{
  "success": true,
  "avatar_url": "/uploads/avatars/123.jpg",
  "message": "Avatar uploaded successfully"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/profile/uploadAvatar \
  -b cookies.txt \
  -F "avatar=@/path/to/image.jpg"
```

**Errors:**
- `401` - Not authenticated
- `400` - No file uploaded
- `400` - Invalid file type
- `413` - File too large

---

## Settings Endpoints

### 20. Get Settings

Get user system settings (admin only).

**Endpoint:** `GET /bb-user/api/settings/get`

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "success": true,
  "settings": {
    "id": "1",
    "sign_up_enabled": true,
    "sign_in_enabled": true,
    "created_at": "1731234567890",
    "updated_at": "1731234789012"
  }
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8080/bb-user/api/settings/get \
  -b cookies.txt
```

**Errors:**
- `403` - Not authorized (not admin)

---

### 21. Update Settings

Update user system settings (admin only).

**Endpoint:** `POST /bb-user/api/settings/save`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "sign_up_enabled": false,
  "sign_in_enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "id": "1",
    "sign_up_enabled": false,
    "sign_in_enabled": true,
    "updated_at": "1731234890123"
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8080/bb-user/api/settings/save \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "sign_up_enabled": false,
    "sign_in_enabled": true
  }'
```

**Errors:**
- `403` - Not authorized
- `400` - Invalid settings values

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 413 | Payload Too Large | File upload too large |
| 500 | Internal Server Error | Server error |

### Application Error Codes

| Code | Description |
|------|-------------|
| `EMAIL_EXISTS` | Email address already registered |
| `USER_NOT_FOUND` | User does not exist |
| `INVALID_CREDENTIALS` | Incorrect email or password |
| `INVALID_TOKEN` | Invalid or expired token |
| `SIGNUP_DISABLED` | Registration is currently disabled |
| `SIGNIN_DISABLED` | Login is currently disabled |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `INVALID_ROLE` | Invalid role value provided |
| `MISSING_FIELDS` | Required fields not provided |
| `INVALID_EMAIL` | Email format is invalid |
| `WEAK_PASSWORD` | Password does not meet requirements |
| `CANNOT_DELETE_SELF` | Cannot delete your own account |
| `INVALID_FILE_TYPE` | Unsupported file type |
| `FILE_TOO_LARGE` | File exceeds size limit |

---

## Rate Limiting

To prevent abuse, consider implementing rate limiting on authentication endpoints:

- **Login:** 5 attempts per 15 minutes per IP
- **Registration:** 3 accounts per hour per IP
- **Password Reset:** 3 requests per hour per email

---

## Pagination

For endpoints that return lists (profiles, search results), use pagination:

**Query Parameters:**
- `limit` (integer) - Items per page (default: 20, max: 100)
- `offset` (integer) - Number of items to skip (default: 0)

**Response Format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Validate input on both client and server**
3. **Use strong passwords** (minimum 8 characters, mixed case, numbers, special chars)
4. **Implement rate limiting** on authentication endpoints
5. **Log authentication attempts** for security auditing
6. **Use secure session cookies** (httpOnly, secure, sameSite)
7. **Implement CSRF protection** for state-changing operations
8. **Never expose sensitive data** in responses (password hashes, salts, tokens)
9. **Sanitize user input** to prevent XSS and SQL injection
10. **Implement account lockout** after failed login attempts

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [DATABASE.md](./DATABASE.md) - Database schema
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Authentication flows

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
