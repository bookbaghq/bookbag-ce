# Configuration Guide

Complete reference for configuring BookBag.

## Configuration Files

BookBag uses JSON configuration files located in `config/environments/`:

- `env.development.json` - Development environment
- `env.production.json` - Production environment

Select environment using the `master` variable:
```bash
master=production node server.js
```

## Environment Configuration Structure

### Server Configuration

```json
{
  "server": {
    "hostname": "0.0.0.0",    // Bind address
    "httpPort": 8080,          // Backend API port
    "requestTimeout": 60000    // Request timeout (ms)
  }
}
```

### Database Contexts

Each component has its own database:

```json
{
  "chatContext": {
    "connection": "/components/chats/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
  },
  "userContext": { /* ... */ },
  "modelContext": { /* ... */ },
  "ragContext": { /* ... */ },
  "workspaceContext": { /* ... */ },
  "mediaContext": { /* ... */ },
  "adminContext": { /* ... */ },
  "pluginContext": { /* ... */ }
}
```

### JWT Configuration

```json
{
  "jwtAPI": {
    "ACCESS_TOKEN_SECRET": "your-secret-here",
    "REFRESH_TOKEN_SECRET": "your-refresh-secret-here"
  }
}
```

**Important**: Secrets are auto-generated on first run. Never commit actual secrets to version control.

### LLM Provider Configuration

```json
{
  "openai": {
    "baseUrl": "https://api.openai.com/v1"
  },
  "grok": {
    "baseUrl": "https://api.x.ai/v1"
  }
}
```

### Media Storage

```json
{
  "mediaStorage": {
    "path": "/bb-storage/media"
  }
}
```

## Environment Variables

Additional configuration via environment variables:

```bash
# Node environment
NODE_ENV=development|production

# Master environment selector
master=development|production

# Override ports
HTTP_PORT=8080
```

## Frontend Configuration

Frontend configuration in `nextjs-app/apiConfig.json`:

```json
{
  "ApiConfig": {
    "main": "http://localhost:8080",
    "socket": "http://localhost:8080"
  }
}
```

## Production Configuration

### Security Settings

1. **Use strong JWT secrets** - Generate with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Enable HTTPS** - Configure reverse proxy

3. **Set secure session cookies**

4. **Configure CORS** - Edit `config/initializers/cors.json`

### Performance Settings

1. **Increase timeout** for large file uploads
2. **Configure connection pooling** (future feature)
3. **Enable caching** (future feature)

### Database Settings

1. **Regular backups** - Automate database backups
2. **Set proper permissions** - chmod 600 for database files
3. **Monitor size** - RAG databases grow with documents

## CORS Configuration

Edit `config/initializers/cors.json`:

```json
{
  "origin": ["http://localhost:3000"],
  "credentials": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}
```

For production with custom domain:
```json
{
  "origin": ["https://bookbag.yourdomain.com"],
  "credentials": true
}
```

## Email Configuration (SMTP)

Configure via admin UI or directly in database.

Required settings:
- SMTP host
- SMTP port
- Username
- Password
- From address
- From name

## RAG Configuration

Configure via admin UI at `/bb-admin/rag/settings`:

- **Disable RAG globally** - Turn off RAG system
- **Disable RAG for chats** - Chat-level documents only
- **Disable RAG for workspaces** - Workspace-level documents only
- **Grounding mode** - Strict (context-only) or Soft (general knowledge)

## Model Configuration

Models are configured via the admin UI:

- **API Keys** - Stored per provider
- **System Prompts** - Default prompts per model
- **Model Settings** - Temperature, max tokens, etc.
- **Profiles** - Reusable setting templates

## Plugin Configuration

Plugins are managed via database and UI:

- Enable/disable plugins
- Set plugin priority
- Configure plugin-specific settings

## Logging Configuration

Logging configuration (future enhancement):

```json
{
  "logging": {
    "level": "info",
    "format": "json",
    "output": "console"
  }
}
```

## Troubleshooting Configuration Issues

### Configuration not loading
- Check file permissions
- Verify JSON syntax
- Check `master` environment variable

### Database connection errors
- Verify paths are correct
- Check file permissions
- Ensure directories exist

### Port conflicts
- Change ports in configuration
- Use environment variables to override

## Configuration Best Practices

1. **Never commit secrets** - Use `.gitignore`
2. **Use environment variables** - For sensitive data
3. **Document custom settings** - Team knowledge
4. **Test configuration changes** - In development first
5. **Backup before changes** - Configuration and data
6. **Use version control** - Track configuration changes (excluding secrets)

## Next Steps

- Review [SECURITY.md](../SECURITY.md) for security configuration
- See [INSTALL.md](INSTALL.md) for initial setup
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
