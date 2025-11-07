# Troubleshooting Guide

Common issues and solutions for BookBag.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Runtime Errors](#runtime-errors)
- [Database Issues](#database-issues)
- [Chat & LLM Issues](#chat--llm-issues)
- [RAG/Document Issues](#ragdocument-issues)
- [Authentication Issues](#authentication-issues)
- [Performance Issues](#performance-issues)

## Installation Issues

### npm install fails

**Problem**: Dependencies fail to install

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try with legacy peer deps
npm install --legacy-peer-deps
```

### Port already in use

**Problem**: `EADDRINUSE: address already in use`

**Solutions**:
```bash
# Find process using port 8080
lsof -ti:8080

# Kill the process
lsof -ti:8080 | xargs kill -9

# Or use different port
HTTP_PORT=8081 npm run dev
```

### Permission denied errors

**Problem**: Cannot access files/directories

**Solutions**:
```bash
# Fix permissions on storage
chmod -R 755 bb-storage

# Fix database permissions
chmod -R 755 components/*/db/
```

## Runtime Errors

### Cannot find module errors

**Problem**: `Error: Cannot find module 'X'`

**Solutions**:
```bash
# Reinstall dependencies
npm install

# Check if module exists in package.json
cat package.json | grep "module-name"

# Clear require cache and restart
rm -rf node_modules/.cache
```

### Database table not found

**Problem**: `Error: no such table: TableName`

**Solutions**:
1. Check if migration ran
2. Delete database and restart (recreates tables)
3. Check model/context registration

```bash
# Remove database (⚠️ loses data)
rm components/admin/db/development.sqlite3

# Restart server to recreate
npm run dev
```

### JWT errors

**Problem**: Invalid token, authentication fails

**Solutions**:
1. Clear browser cookies
2. Regenerate JWT secrets
3. Check secrets in config file

```bash
# Regenerate secrets
npm run init-jwt:dev
```

## Database Issues

### Database locked

**Problem**: `Error: SQLITE_BUSY: database is locked`

**Solutions**:
1. Close other connections
2. Restart application
3. Check for zombie processes

```bash
# Find processes
ps aux | grep node

# Kill zombie processes
pkill -9 node
```

### Database corruption

**Problem**: Database file corrupted

**Solutions**:
```bash
# Backup database
cp components/*/db/*.sqlite3 backup/

# Try to recover with SQLite
sqlite3 database.sqlite3 ".recover" | sqlite3 recovered.sqlite3

# If recovery fails, restore from backup or reinitialize
```

### Migration errors

**Problem**: Migrations fail to run

**Solutions**:
1. Check migration files for syntax errors
2. Verify database permissions
3. Check for foreign key conflicts

## Chat & LLM Issues

### Chat not sending messages

**Problem**: Messages don't send or get stuck

**Solutions**:
1. Check WebSocket connection in browser console
2. Verify model is published
3. Check API key configuration
4. Review error logs

```bash
# Check server logs for errors
tail -f logs/error.log

# Test API key
curl -X GET http://localhost:8080/bb-models/api/models
```

### Streaming not working

**Problem**: Messages appear all at once, no streaming

**Solutions**:
1. Check WebSocket connection
2. Verify Socket.IO is running
3. Check proxy configuration (if using nginx)
4. Review browser console for errors

### Model errors

**Problem**: Model returns errors or no response

**Solutions**:
1. Verify API key is valid
2. Check model is published
3. Verify provider endpoint is correct
4. Check rate limits
5. Review error messages in UI

## RAG/Document Issues

### Documents won't upload

**Problem**: Upload fails or times out

**Solutions**:
1. Check file size limits
2. Verify file type is supported
3. Check storage permissions
4. Review server logs

```bash
# Check storage space
df -h

# Verify permissions
ls -la bb-storage/media/
```

### RAG not returning context

**Problem**: Documents uploaded but not used in responses

**Solutions**:
1. Verify RAG is enabled in settings
2. Check document was processed (chunks created)
3. Verify embedding generation succeeded
4. Check grounding mode setting

```bash
# Check document chunks in database
sqlite3 components/rag/db/development.sqlite3 \
  "SELECT COUNT(*) FROM DocumentChunk;"
```

### Embedding errors

**Problem**: Embedding generation fails

**Solutions**:
1. Check disk space
2. Verify model files downloaded
3. Review memory usage
4. Check logs for specific errors

## Authentication Issues

### Cannot login

**Problem**: Login fails with valid credentials

**Solutions**:
1. Check if user exists in database
2. Verify password was set correctly
3. Clear browser cookies
4. Check session configuration

```bash
# Check user in database
sqlite3 components/user/db/development.sqlite3 \
  "SELECT * FROM User WHERE email='user@example.com';"
```

### Session expires immediately

**Problem**: Logged out right after login

**Solutions**:
1. Check session timeout configuration
2. Verify cookie settings
3. Check for clock skew
4. Review session store

### Password reset not working

**Problem**: Reset email not sent

**Solutions**:
1. Configure SMTP settings
2. Check email logs
3. Verify email service is enabled
4. Test SMTP connection

## Performance Issues

### Slow response times

**Problem**: Application responds slowly

**Solutions**:
1. Check CPU/memory usage
2. Review database query performance
3. Check for long-running processes
4. Monitor network latency

```bash
# Check resource usage
top
htop

# Monitor Node.js process
pm2 monit
```

### High memory usage

**Problem**: Memory consumption grows over time

**Solutions**:
1. Restart application
2. Check for memory leaks
3. Reduce concurrent connections
4. Enable memory profiling

```bash
# Restart with PM2
pm2 restart bookbag

# Check memory
pm2 info bookbag
```

### Database growing too large

**Problem**: Database files become very large

**Solutions**:
1. Archive old chats
2. Clean up deleted records
3. Vacuum database
4. Implement data retention policy

```bash
# Vacuum database
sqlite3 database.sqlite3 "VACUUM;"

# Check database size
du -h components/*/db/*.sqlite3
```

## Network Issues

### CORS errors

**Problem**: Cross-origin requests blocked

**Solutions**:
1. Configure CORS in `config/initializers/cors.json`
2. Add frontend URL to allowed origins
3. Enable credentials if needed

### WebSocket connection fails

**Problem**: Real-time updates not working

**Solutions**:
1. Check firewall rules
2. Verify proxy configuration
3. Check Socket.IO logs
4. Test WebSocket connection

## Frontend Issues

### Build fails

**Problem**: Next.js build errors

**Solutions**:
```bash
# Clear Next.js cache
cd nextjs-app
rm -rf .next

# Rebuild
npm run build
```

### Page not found (404)

**Problem**: Routes not working

**Solutions**:
1. Check file structure in app/
2. Verify route configuration
3. Clear Next.js cache
4. Check middleware

### Hydration errors

**Problem**: React hydration mismatch

**Solutions**:
1. Check for server/client rendering differences
2. Avoid using browser APIs during SSR
3. Use `'use client'` directive when needed

## Getting More Help

If your issue isn't covered here:

1. **Check logs**: Server and browser console logs
2. **Search issues**: [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
3. **Community help**: [GitHub Discussions](https://github.com/bookbaghq/bookbag-ce/discussions)
4. **Documentation**: Review relevant docs in `docs/`

## Reporting Bugs

When reporting an issue, include:

- BookBag version
- Operating system and version
- Node.js version
- Steps to reproduce
- Error messages and stack traces
- Screenshots if applicable
- Relevant configuration (without secrets)

See [CONTRIBUTING.md](../CONTRIBUTING.md) for bug report guidelines.
