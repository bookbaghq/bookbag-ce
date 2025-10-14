# Bookbag Environment Configuration Guide

This document explains all configuration fields in the environment files (`env.development.json`, `env.production.json`, etc.).

---

## Server Configuration

```json
"server": {
    "hostname": "0.0.0.0",
    "httpPort": 8080,
    "requestTimeout": 60000
}
```

### hostname
- **What it does**: Specifies which network interface(s) the server binds to
- **Common values**:
  - `"0.0.0.0"` - **RECOMMENDED** - Binds to all network interfaces (IPv4). This allows:
    - Access via `localhost` (127.0.0.1)
    - Access via your machine's local IP address (e.g., 192.168.1.100)
    - Access from other devices on your network (phones, tablets, other computers)
    - Required for Docker containers to accept external connections
  - `"localhost"` or `"127.0.0.1"` - Only accessible from the same machine (localhost only)
  - `"192.168.1.100"` - Binds only to a specific network interface

**Why we use `0.0.0.0`**:
- Provides maximum flexibility for development and production
- Allows testing from mobile devices and other computers on your network
- Required for server deployments where the exact IP may not be known in advance
- Works seamlessly with reverse proxies (Nginx, Apache) and load balancers

### httpPort
- **What it does**: The TCP port number the backend server listens on
- **Default**: `8080`
- **Usage**: Backend API is accessible at `http://[hostname]:[httpPort]`
- **Note**: Port numbers below 1024 require root/admin privileges

### requestTimeout
- **What it does**: Maximum time (in milliseconds) the server waits for a request to complete
- **Default**: `60000` (60 seconds)
- **Why 60 seconds**: LLM streaming responses can take time, especially with large contexts or slower models
- **Recommendation**: Increase for very large RAG document retrievals or slow models

---

## Error Pages

```json
"error": {
    "404": "/public/404.html",
    "500": "/public/500.html"
}
```

### 404
- **What it does**: Path to the HTML page shown when a route/resource is not found
- **Default**: `/public/404.html`
- **Customize**: Create your own branded 404 page

### 500
- **What it does**: Path to the HTML page shown for internal server errors
- **Default**: `/public/500.html`
- **Customize**: Create your own branded error page

---

## Database Contexts

Bookbag uses a **multi-database architecture** where each domain (chats, users, models, etc.) has its own isolated database. This improves security, scalability, and separation of concerns.

### General Database Fields

Each context (`chatContext`, `userContext`, `modelContext`, etc.) has these fields:

- **connection**:
  - For SQLite: Path to the `.sqlite3` file (e.g., `/components/chats/db/development.sqlite3`)
  - For MySQL: Not used (use `host`, `port`, `database` instead - see production example)
- **password**: Database password (empty for SQLite, required for MySQL)
- **username**: Database username (empty for SQLite, required for MySQL)
- **type**: Database type - `"sqlite"` (development) or `"mysql"` (production)

### chatContext
```json
"chatContext": {
    "connection": "/components/chats/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
}
```
- **Purpose**: Stores all chat conversations, messages, and chat metadata
- **Tables**: Chat, Message, ChatSettings
- **Why separate**: Chat history can grow large; isolating it prevents performance impact on other domains

### userContext
```json
"userContext": {
    "connection": "/components/user/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
}
```
- **Purpose**: Stores user accounts, authentication, sessions, and permissions
- **Tables**: User, Session, Role, Permission
- **Why separate**: Security isolation - user credentials are kept in a separate database

### modelContext
```json
"modelContext": {
    "connection": "/components/models/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
}
```
- **Purpose**: Stores LLM model configurations, API keys, profiles, and settings
- **Tables**: Model, ModelProvider, Profiles, ModelOverrides, ProfileFieldRules
- **Why separate**: Model configs are reused across chats; centralizing them improves consistency

### mailContext
```json
"mailContext": {
    "connection": "/components/mail/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
}
```
- **Purpose**: Stores email templates, SMTP settings, and email logs
- **Tables**: EmailTemplate, EmailLog, SMTPConfig
- **Why separate**: Email functionality is independent and may have its own backup/retention policies

### workspaceContext
```json
"workspaceContext": {
    "connection": "/components/workspace/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
}
```
- **Purpose**: Stores workspace definitions, memberships, and workspace-specific settings
- **Tables**: Workspace, WorkspaceMember, WorkspaceChat
- **Why separate**: Workspaces provide multi-tenancy; isolating them enables per-workspace backups

### ragContext
```json
"ragContext": {
    "connection": "/components/rag/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
}
```
- **Purpose**: Stores RAG documents, embeddings, chunks, and knowledge base metadata
- **Tables**: Document, DocumentChunk, Settings (RAG settings like disable_rag flags)
- **Why separate**: RAG data (embeddings, chunks) can be very large; isolating prevents bloat in other DBs

### mediaContext
```json
"mediaContext": {
    "connection": "/components/media/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
}
```
- **Purpose**: Stores metadata about uploaded media files (images, videos, attachments)
- **Tables**: Media, MediaMetadata
- **Why separate**: Media file metadata is independent of chat/user data

---

## Storage Configuration

### mediaStorage
```json
"mediaStorage": {
    "path": "/bb-storage/media"
}
```
- **What it does**: File system path where uploaded media files are stored
- **Default**: `/bb-storage/media` (relative to project root)
- **Organization**: Files are organized by user/tenant ID (e.g., `/bb-storage/media/1/file.pdf`)
- **Production**: Use absolute paths or mount points for production (e.g., `/var/bookbag/storage/media`)

---

## JWT Authentication

```json
"jwtAPI": {
    "ACCESS_TOKEN_SECRET": "(ADD_ACCESS_TOKEN_SECRET)",
    "REFRESH_TOKEN_SECRET": "(ADD_REFRESH_TOKEN_SECRET)"
}
```

### ACCESS_TOKEN_SECRET
- **What it does**: Secret key used to sign and verify JWT access tokens
- **Auto-generated**: The `npm run init-jwt` script generates a secure random secret on first deployment
- **Security**: Keep this secret! Anyone with this key can forge authentication tokens
- **Length**: 64+ character random string

### REFRESH_TOKEN_SECRET
- **What it does**: Secret key used to sign and verify JWT refresh tokens
- **Auto-generated**: Generated automatically with `npm run init-jwt`
- **Purpose**: Refresh tokens allow users to obtain new access tokens without re-authenticating
- **Security**: Keep this secret and rotate periodically for maximum security

**IMPORTANT**: Never commit actual secrets to version control. The `(ADD_ACCESS_TOKEN_SECRET)` placeholder is replaced during deployment.

---

## LLM Provider Base URLs

### openai
```json
"openai": {
    "baseUrl": "https://api.openai.com/v1"
}
```
- **What it does**: Base URL for OpenAI API requests
- **Default**: `https://api.openai.com/v1`
- **Customize**: Change to use OpenAI-compatible APIs (e.g., Azure OpenAI: `https://YOUR_RESOURCE.openai.azure.com`)

### grok
```json
"grok": {
    "baseUrl": "https://api.x.ai/v1"
}
```
- **What it does**: Base URL for Grok (X.AI) API requests
- **Default**: `https://api.x.ai/v1`
- **Usage**: Used when Grok models are selected in the model library

---

## MySQL Configuration Example (Production)

For production deployments with MySQL, your context configuration looks like this:

```json
"chatContext": {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "your_mysql_password",
    "database": "Chat",
    "type": "mysql"
}
```

**Key differences from SQLite**:
- Use `host`, `port`, `user`, `database` instead of `connection`
- Must create databases manually: `CREATE DATABASE IF NOT EXISTS Chat;`
- Requires MySQL 8.0+ for best compatibility
- See `README.md` for MySQL setup instructions

---

## Environment-Specific Files

- **env.development.json**: Local development with SQLite (zero config)
- **env.production.json**: Production deployment with MySQL (scalable)
- **env.test.json**: Testing environment (isolated from dev/prod)

**Switching environments**: Set the `master` environment variable
```bash
# Development (default)
npm run dev

# Production
master=production npm start

# Test
master=test npm test
```

---

## Security Best Practices

1. **Never commit secrets**: Use placeholder values in version control
2. **Rotate JWT secrets**: Periodically regenerate secrets for production
3. **Use strong passwords**: For MySQL, use 16+ character passwords
4. **Firewall rules**: In production, restrict MySQL to localhost or trusted IPs
5. **File permissions**: Ensure SQLite files and JWT secrets are not world-readable
6. **HTTPS in production**: Always use HTTPS (SSL/TLS) for production deployments
7. **Backup databases**: Regular backups of all context databases

---

## Troubleshooting

### Server won't start
- Check if port 8080 is already in use: `lsof -i :8080` (Unix) or `netstat -ano | findstr :8080` (Windows)
- Verify hostname is correct (use `0.0.0.0` for maximum compatibility)

### Can't access from other devices
- Ensure hostname is `0.0.0.0`, not `localhost`
- Check firewall rules allow incoming connections on port 8080
- Verify devices are on the same network

### Database connection errors
- For SQLite: Ensure file paths exist and are writable
- For MySQL: Verify credentials, ensure MySQL is running, and databases exist

### JWT token errors
- Run `npm run init-jwt` to generate secrets if missing
- Ensure secrets are not empty or placeholder values

---

## Additional Resources

- **Deployment Guide**: `DEPLOYMENT.md`
- **Database Migrations**: Run `masterrecord update-database-all` after environment changes
- **CORS Configuration**: `config/initializers/cors.json` (auto-configured by deploy script)
