# Bookbag Plugin System Documentation

Welcome to the Bookbag Plugin System documentation. This system provides a WordPress-inspired extensibility framework that enables dynamic feature additions without modifying core code.

**Version:** 1.0.0
**Last Updated:** 2025

---

## Documentation Index

### 1. [Architecture Documentation](./ARCHITECTURE.md)
**For:** Developers, Architects
**Purpose:** Technical deep-dive into system architecture

**Topics Covered:**
- Core design principles
- System architecture diagram
- Core components (Plugin Loader, Hook System, Runtime Loading)
- Plugin lifecycle
- Data flow examples
- Performance & security considerations
- Directory structure

---

### 2. [Business Overview](./BUSINESS_OVERVIEW.md)
**For:** Product Managers, Business Stakeholders
**Purpose:** Business-level understanding of the plugin system

**Topics Covered:**
- What is the plugin system?
- Key business benefits
- Current available plugins
- Use case scenarios
- Plugin lifecycle management
- Integration points
- Roadmap & future features
- FAQ

---

## Quick Start

### For Business Users (Activating Plugins)

1. **Navigate to Admin Panel**
   ```
   http://your-bookbag-instance/bb-admin/plugins/installed
   ```

2. **View Available Plugins**
   - See list of all plugins (active and inactive)
   - Read plugin descriptions

3. **Activate a Plugin**
   - Click "Activate" button
   - Wait for setup to complete
   - Plugin features now available

### For Developers (Creating Plugins)

1. **Create Plugin Directory**
   ```bash
   mkdir -p /path/to/bookbag-ce/bb-plugins/my-plugin
   ```

2. **Create plugin.json**
   ```json
   {
     "name": "My Plugin",
     "slug": "my-plugin",
     "version": "1.0.0",
     "description": "My awesome plugin",
     "author": "Your Name",
     "entry": "index.js"
   }
   ```

3. **Create Entry File (index.js)**
   ```javascript
   module.exports = {
     load(pluginAPI) {
       const { hookService, HOOKS } = pluginAPI;

       // Register hooks
       hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, async (data) => {
         // Modify data
         return data;
       });
     }
   };
   ```

4. **Register in Database**
   ```sql
   INSERT INTO Plugin (name, label, is_active, file_path)
   VALUES ('my-plugin', 'My Plugin', 1, 'my-plugin/index.js');
   ```

5. **Restart Server**
   ```bash
   node server.js
   ```

---

## System Overview

### What Problems Does It Solve?

1. **Extensibility Without Forking**
   - Add features without modifying core code
   - Maintain clean separation of concerns
   - Enable third-party contributions

2. **Rapid Feature Development**
   - Develop features independently
   - Deploy without full system rebuild
   - Enable/disable features on demand

3. **Customization at Scale**
   - Client-specific features
   - Multi-tenant customization
   - A/B testing capabilities

### Key Features

#### Hook System (WordPress-inspired)
- **Actions**: Execute callbacks at specific points
- **Filters**: Modify data through callback chains
- **Priorities**: Control execution order

#### Dynamic UI Integration
- Automatic Next.js registry generation
- Seamless frontend component loading
- Zero manual import management

#### Database-Driven Activation
- Plugin state stored in database
- Activate/deactivate without code changes
- Per-tenant activation (future)

---

## Available Plugins

### Core Plugins

| Plugin | Purpose | Status |
|--------|---------|--------|
| **RAG Plugin** | Document-based context injection | Active |
| **Media Plugin** | Media asset management | Active |
| **Tokens Plugin** | LLM token usage tracking | Active |

### Plugin Capabilities

#### RAG Plugin
- Upload documents (PDF, TXT, DOCX)
- Automatic chunking & embedding
- Real-time context injection into chats
- Configurable similarity thresholds

#### Media Plugin
- Image, video, audio uploads
- Organized library with tags
- Direct media insertion in chats
- Storage analytics

#### Tokens Plugin
- Per-user/workspace token tracking
- Usage limits and alerts
- Cost estimation
- Usage analytics dashboard

---

## Integration Points

### Backend Hooks

#### Chat Pipeline
```javascript
// Before user message is processed
CHAT_BEFORE_MESSAGE

// After message saved to database
CHAT_AFTER_MESSAGE

// Before sending to LLM (RAG injection point)
LLM_BEFORE_GENERATE

// After LLM generates response
LLM_AFTER_GENERATE

// Final response before client
CHAT_RESPONSE_FINAL
```

#### Admin Interface
```javascript
// Register admin menu items
ADMIN_MENU

// Register admin pages
ADMIN_REGISTER_VIEW

// Modify admin views
ADMIN_VIEW_RENDER
```

### Frontend Components

#### Client Sidebars
- Left sidebar: Knowledge base, documents
- Right sidebar: Settings, info panels

#### Admin Views
- Settings pages
- Management interfaces
- Dashboard widgets

---

## Development Workflow

### 1. Plugin Creation
```
Create directory → Write code → Create manifest → Test locally
```

### 2. Testing
```
Activate plugin → Test functionality → Check logs → Debug issues
```

### 3. Deployment
```
Commit to repo → Deploy to server → Restart backend → Rebuild frontend
```

### 4. Maintenance
```
Monitor performance → Fix bugs → Update version → Deploy updates
```

---

## Architecture Highlights

### Plugin Loader
- Queries active plugins from database
- Loads and executes plugin files
- Provides pluginAPI to plugins
- Manages lifecycle (activate/deactivate)

### Hook Service
- Singleton service for hook registration
- Supports both actions and filters
- Priority-based execution order
- Error isolation

### Runtime Plugin Loading
- PayloadCMS/Keystone-style dynamic loading
- Precompiled plugin bundles loaded at runtime
- No Next.js rebuild required
- Instant plugin activation/deactivation

---

## File Structure

```
components/plugins/
├── docs/                           # This documentation
│   ├── README.md                   # This file
│   ├── ARCHITECTURE.md             # Technical architecture
│   └── BUSINESS_OVERVIEW.md        # Business documentation
├── app/
│   ├── core/                       # Core plugin system
│   │   ├── pluginLoader.js         # Main loader
│   │   ├── hookRegistration.js    # Hook service
│   │   ├── hookConstants.js       # Hook definitions
│   │   └── pluginDiscovery.js     # Plugin discovery
│   ├── controllers/                # API controllers
│   └── models/                     # Database models
└── config/                         # Configuration

bb-plugins/                         # Plugin directory
├── rag-plugin/                     # RAG plugin
│   └── dist/                      # Precompiled bundles
├── media-plugin/                   # Media plugin
│   └── dist/                      # Precompiled bundles
└── tokens-plugin/                  # Tokens plugin
    └── dist/                      # Precompiled bundles

nextjs-app/lib/                     # Frontend utilities
└── pluginLoader.js                 # Runtime plugin loader
```

---

## Common Tasks

### View Active Plugins
```bash
# Via API
curl http://localhost:8080/api/plugins/list

# Via Database
sqlite3 components/plugins/db/development.sqlite3 \
  "SELECT name, is_active FROM Plugin;"
```

### Activate a Plugin
```bash
curl -X POST http://localhost:8080/api/plugins/activate \
  -H "Content-Type: application/json" \
  -d '{"name": "rag-plugin"}'
```

### Deactivate a Plugin
```bash
curl -X POST http://localhost:8080/api/plugins/deactivate \
  -H "Content-Type: application/json" \
  -d '{"name": "rag-plugin"}'
```

### View Registered Hooks
```javascript
const pluginLoader = require('./components/plugins/app/core/pluginLoader');
const stats = pluginLoader.hookService.getHookStats();
console.log(stats);
```

---

## Best Practices

### Plugin Development
1. ✅ Use specific hooks, not global
2. ✅ Handle errors gracefully
3. ✅ Implement activate/deactivate methods
4. ✅ Document your plugin well
5. ✅ Test before deploying

### Hook Usage
1. ✅ Use appropriate priority (10 is default)
2. ✅ Return modified data in filters
3. ✅ Avoid heavy operations in high-frequency hooks
4. ✅ Use async/await properly

### Security
1. ✅ Review plugin code before installing
2. ✅ Only install from trusted sources
3. ✅ Test in staging first
4. ✅ Monitor system after activation
5. ✅ Backup database before changes

---

## Troubleshooting

### Plugin Not Loading
**Check:**
- Plugin marked as active in database
- file_path correct
- Entry file exists
- load() method exists
- Server restarted

**Solution:**
```bash
# Check database
sqlite3 components/plugins/db/development.sqlite3 \
  "SELECT * FROM Plugin WHERE name='my-plugin';"

# Check file exists
ls -la bb-plugins/my-plugin/index.js

# Check server logs
tail -f logs/server.log
```

### Hook Not Firing
**Check:**
- Hook name matches HOOKS constant
- Callback registered before hook fires
- Priority not too low/high
- No errors in callback

**Solution:**
```javascript
// Enable debug logging
console.log('Hook stats:', hookService.getHookStats());
console.log('Has filter:', hookService.hasFilter('llm_before_generate'));
```

### Frontend Component Not Rendering
**Check:**
- Component registered via registerView()
- Plugin bundle built (dist/ folder exists)
- Plugin active in database
- Browser console for errors

**Solution:**
```bash
# Rebuild plugin bundle
./bin/bookbag.js build-plugin <plugin-name>

# Check plugin loader in browser console
# Should see: [PluginLoader] Loading plugin: <plugin-name>
```

---

## Performance Tips

1. **Use Caching**: Cache expensive operations
2. **Async Operations**: Use async/await for I/O
3. **Specific Hooks**: Don't subscribe to unused hooks
4. **Efficient Queries**: Optimize database queries
5. **Monitor Performance**: Track plugin overhead

---

## Support

### Getting Help
- **Documentation**: Read Architecture and Business docs
- **GitHub Issues**: Report bugs
- **Discord**: #plugins channel
- **Email**: support@bookbag.com

### Contributing
- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Discussions
- **Code Contributions**: Pull Requests
- **Plugin Submissions**: Plugin marketplace (coming soon)

---

## Version History

### v1.0.0 (Current)
- Initial plugin system release
- WordPress-inspired hooks API
- Database-driven activation
- Next.js registry generation
- RAG, Media, Tokens plugins

### Future Versions
- v1.1.0: Plugin marketplace
- v1.2.0: Per-workspace activation
- v1.3.0: Plugin sandboxing
- v2.0.0: Third-party developer API

---

## License

Bookbag Plugin System is part of Bookbag CE.
See main LICENSE file for details.

---

## Credits

**Inspiration:** WordPress Plugin API
**Developed by:** Bookbag Engineering Team
**Contributors:** See GitHub contributors list

---

**Need More Info?**
- [Architecture Documentation](./ARCHITECTURE.md) - Technical deep-dive
- [Business Overview](./BUSINESS_OVERVIEW.md) - Business perspective
- GitHub: https://github.com/bookbaghq/bookbag-ce
