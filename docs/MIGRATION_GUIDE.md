# Migration Guide

Guide for migrating between BookBag versions.

## Overview

This guide helps you upgrade BookBag to newer versions safely.

## General Migration Process

1. **Backup everything**:
   ```bash
   # Backup databases
   tar -czf bookbag-backup-$(date +%Y%m%d).tar.gz components/*/db/*.sqlite3
   
   # Backup configuration
   cp -r config config.backup
   
   # Backup uploads
   cp -r bb-storage bb-storage.backup
   ```

2. **Review changelog**:
   - Check [CHANGELOG.md](../CHANGELOG.md) for breaking changes
   - Note any required configuration updates

3. **Update code**:
   ```bash
   git fetch origin
   git checkout v1.x.x  # or main for latest
   ```

4. **Update dependencies**:
   ```bash
   npm install
   cd nextjs-app && npm install && cd ..
   ```

5. **Run migrations** (when available):
   ```bash
   # Future: npm run migrate
   ```

6. **Test thoroughly**:
   - Test in development environment first
   - Verify critical functionality
   - Check logs for errors

7. **Deploy to production**:
   ```bash
   pm2 restart bookbag
   # or your deployment method
   ```

## Version-Specific Migrations

### Migrating to v1.0.0

First stable release - no migration needed for new installations.

For beta users:
- Review and update configuration files
- Check plugin system changes
- Verify database schema matches

## Breaking Changes

Breaking changes will be documented here by version.

### Future Versions

Breaking changes will be clearly marked in CHANGELOG.md with migration paths.

## Database Migrations

### Current State (v1.0.0)

- Databases auto-create on first run
- Migrations run automatically
- No manual migration needed

### Future Versions

Migration system will be enhanced to support:
- Version tracking
- Rollback capability
- Data transformations

## Configuration Changes

### Environment Files

When upgrading:
1. Compare your config with new `.example` files
2. Add new required fields
3. Update deprecated settings

### JWT Secrets

JWT secrets should persist across versions. If regenerated, all users must log in again.

## Data Backup Best Practices

### What to Backup

- All SQLite databases (`components/*/db/*.sqlite3`)
- Configuration files (`config/`)
- Uploaded files (`bb-storage/`)
- Custom plugins (`bb-plugins/` if customized)

### Automated Backups

Set up automated backups:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"

# Create backup
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/bookbag-$DATE.tar.gz \
  components/*/db/*.sqlite3 \
  config/ \
  bb-storage/

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
```

Schedule with cron:
```bash
0 2 * * * /path/to/backup.sh
```

## Rollback Procedure

If upgrade fails:

1. **Stop application**:
   ```bash
   pm2 stop bookbag
   ```

2. **Restore from backup**:
   ```bash
   tar -xzf bookbag-backup-YYYYMMDD.tar.gz
   ```

3. **Revert code**:
   ```bash
   git checkout v0.x.x  # previous version
   ```

4. **Restart**:
   ```bash
   pm2 start bookbag
   ```

## Plugin Compatibility

### Checking Compatibility

Plugins may need updates between versions:
1. Check plugin documentation
2. Test in development
3. Update plugin code if needed

### Custom Plugins

If you've created custom plugins:
1. Review plugin API changes
2. Update hook registrations
3. Test thoroughly

## Common Migration Issues

### Database Schema Mismatch

**Problem**: Tables or columns don't match

**Solution**:
- Check migration logs
- Run migrations manually if needed
- Restore from backup if corrupted

### Configuration Errors

**Problem**: Application won't start after upgrade

**Solution**:
- Compare config with examples
- Check for deprecated settings
- Verify JSON syntax

### Dependency Conflicts

**Problem**: npm install fails after update

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Testing Migrations

Always test migrations in development:

1. **Clone production data** to development:
   ```bash
   cp production/components/*/db/*.sqlite3 development/components/*/db/
   ```

2. **Test migration process**

3. **Verify functionality**

4. **Only then apply to production**

## Downtime Considerations

### Zero-Downtime Upgrades

For minimal downtime:
1. Prepare new version on separate server
2. Test thoroughly
3. Switch traffic to new version
4. Keep old version available for rollback

### Maintenance Windows

For simpler upgrades:
1. Schedule maintenance window
2. Notify users
3. Perform upgrade
4. Monitor for issues

## Post-Migration Checklist

After upgrading:

- [ ] Application starts without errors
- [ ] Users can log in
- [ ] Chats work correctly
- [ ] File uploads function
- [ ] RAG documents accessible
- [ ] All models available
- [ ] Settings preserved
- [ ] Plugins working
- [ ] No console errors
- [ ] Performance acceptable

## Version Support Policy

- **Current version**: Full support
- **Previous minor version**: Security updates
- **Older versions**: Community support only

## Getting Help

If you encounter migration issues:

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
3. Ask in [GitHub Discussions](https://github.com/bookbaghq/bookbag-ce/discussions)
4. Include version numbers and error messages

## Contributing to This Guide

Found a migration issue? Help improve this guide:
1. Document the issue and solution
2. Submit a PR to update this guide
3. Help other users with similar issues

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
