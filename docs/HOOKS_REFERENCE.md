# Bookbag Hooks System Reference

**Version**: 2.0.0
**Last Updated**: November 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Hook Types](#hook-types)
4. [Available Hooks](#available-hooks)
   - [Core Lifecycle Hooks](#1-core-lifecycle-hooks)
   - [Admin Hooks](#2-admin-hooks)
   - [Chat/Pipeline Hooks](#3-chatpipeline-hooks)
   - [Frontend Client Hooks](#4-frontend-client-hooks)
   - [User & Auth Hooks](#5-user--auth-hooks)
   - [Database & Migration Hooks](#6-database--migration-hooks)
   - [API Lifecycle Hooks](#7-api-lifecycle-hooks)
   - [Scheduler / Cron Hooks](#8-scheduler--cron-hooks)
   - [Media & File System Hooks](#9-media--file-system-hooks)
   - [System/Developer Hooks](#10-systemdeveloper-hooks)
5. [Usage Guide](#usage-guide)
6. [Integration Points](#integration-points)
7. [Best Practices](#best-practices)
8. [Examples](#examples)
9. [Debugging](#debugging)
10. [Migration Guide](#migration-from-legacy-hooks)
11. [API Reference](#api-reference)

---

## Overview

The Bookbag Hooks System is a WordPress-style plugin architecture that allows developers to extend and modify Bookbag functionality without modifying core code. It provides **47 core hooks** across **10 categories**:

- **Core Lifecycle Hooks** (5): System initialization, startup, shutdown, rebuild, and environment configuration
- **Admin Hooks** (8): Admin panel customization, menu management, view rendering, and error handling
- **Chat/Pipeline Hooks** (5): Message processing, LLM integration, and response handling
- **Frontend Client Hooks** (8): Client UI customization, sidebars, menus, and route handling
- **User & Auth Hooks** (4): User registration, authentication, and account management
- **Database & Migration Hooks** (4): Database migrations, context registration, and schema management
- **API Lifecycle Hooks** (2): API request/response interceptors
- **Scheduler / Cron Hooks** (3): Scheduled job execution and management
- **Media & File System Hooks** (4): File upload, deletion, renaming, and storage management
- **System/Developer Hooks** (4): Plugin management, activation, and routing

---

## Core Concepts

### Actions vs Filters

**Actions** execute callbacks without returning a value:
```javascript
// Action: Do something when hook fires
hookService.addAction('bookbag_init', async (context) => {
  console.log('System initializing...');
}, 10);

// Fire the action
await hookService.doAction('bookbag_init', { environment: 'production' });
```

**Filters** modify data and return it:
```javascript
// Filter: Modify data as it passes through
hookService.addFilter('chat_before_message', async (data) => {
  // Add custom validation
  if (!data.userId) {
    data.cancelled = true;
  }
  return data;
}, 10);

// Apply filters and get modified data
const result = await hookService.applyFilters('chat_before_message', {
  userId: 123,
  message: 'Hello'
});
```

### Hook Priority

Hooks execute in priority order (lowest number first, default: 10):

```javascript
hookService.addAction('bookbag_init', callback1, 5);  // Runs first
hookService.addAction('bookbag_init', callback2, 10); // Runs second
hookService.addAction('bookbag_init', callback3, 20); // Runs third
```

---

## Hook Types

| Type | Method | Returns | Use Case |
|------|--------|---------|----------|
| **Action** | `doAction()` | void | Execute side effects (logging, notifications, etc.) |
| **Filter** | `applyFilters()` | modified value | Transform data (validation, enrichment, etc.) |

---

## Available Hooks

### 1. Core Lifecycle Hooks

#### `bookbag_init` (CORE_INIT)
**Type**: Action
**When**: Early in system initialization, before plugins are loaded
**Context**:
```javascript
{
  master: MasterController,
  environment: string // e.g., 'development', 'production'
}
```

**Use Cases**:
- Initialize database connections
- Load configuration
- Set up core services
- Register global middleware

**Example**:
```javascript
hookService.addAction(HOOKS.CORE_INIT, async (context) => {
  console.log(`System initializing in ${context.environment} mode`);
  // Initialize your plugin's core services
  await initializeDatabaseConnection();
}, 10);
```

---

#### `bookbag_ready` (CORE_READY)
**Type**: Action
**When**: After all plugins are loaded and system is ready
**Context**:
```javascript
{
  master: MasterController,
  pluginLoader: PluginLoader,
  loadedPlugins: string[] // Array of loaded plugin paths
}
```

**Use Cases**:
- Register routes
- Start background services
- Verify plugin dependencies
- Initialize inter-plugin communication

**Example**:
```javascript
hookService.addAction(HOOKS.CORE_READY, async (context) => {
  console.log(`System ready! ${context.loadedPlugins.length} plugins loaded`);
  // Start your plugin's services
  await startBackgroundWorkers();
}, 10);
```

---

#### `bookbag_shutdown` (CORE_SHUTDOWN)
**Type**: Action
**When**: Graceful shutdown (SIGTERM/SIGINT)
**Context**:
```javascript
{
  master: MasterController
}
```

**Use Cases**:
- Close database connections
- Save state
- Clean up resources
- Flush caches

**Example**:
```javascript
hookService.addAction(HOOKS.CORE_SHUTDOWN, async (context) => {
  console.log('Shutting down plugin gracefully...');
  await closeConnections();
  await saveState();
}, 10);
```

---

#### `bookbag_rebuild` (CORE_REBUILD)
**Type**: Action
**When**: Next.js rebuild is triggered
**Context**:
```javascript
{
  trigger: string, // Reason for rebuild
  timestamp: number
}
```

**Use Cases**:
- Regenerating symlinks
- Rebuilding plugin bundles
- Updating loader files
- Clearing build caches

**Example**:
```javascript
hookService.addAction(HOOKS.CORE_REBUILD, async (context) => {
  console.log(`Rebuild triggered: ${context.trigger}`);
  await regeneratePluginSymlinks();
  await rebuildClientBundles();
}, 10);
```

---

#### `bookbag_env_loaded` (CORE_ENV_LOADED)
**Type**: Action
**When**: Environment configs are loaded
**Context**:
```javascript
{
  environment: string,
  config: Object,
  envFile: string
}
```

**Use Cases**:
- Modifying runtime settings
- Environment-specific setup
- Validating configuration
- Setting up environment-based features

**Example**:
```javascript
hookService.addAction(HOOKS.CORE_ENV_LOADED, async (context) => {
  console.log(`Environment loaded: ${context.environment}`);
  if (context.environment === 'production') {
    await enableProductionFeatures();
  }
}, 10);
```

---

### 2. Admin Hooks

#### `admin_menu` (ADMIN_MENU)
**Type**: Action
**When**: Admin sidebar is being rendered
**Context**:
```javascript
{
  menu: Array,           // Array of menu items
  submenu: Object,       // Object of submenu arrays by parent ID
  context: {
    req: Request,
    res: Response,
    user: User,
    tenant: Tenant,
    tenantId: string
  },
  addMenuItem: (item) => void,          // Helper to add menu item
  addSubmenuItem: (parentId, item) => void  // Helper to add submenu item
}
```

**Use Cases**:
- Add custom admin pages
- Add settings pages
- Add plugin management pages
- Create navigation sections

**Example**:
```javascript
hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
  // Add a top-level menu item
  context.addMenuItem({
    id: 'my-plugin',
    label: 'My Plugin',
    url: '/bb-admin/my-plugin',
    icon: 'Settings',
    position: 100
  });

  // Add submenu items
  context.addSubmenuItem('my-plugin', {
    label: 'Settings',
    url: '/bb-admin/my-plugin/settings'
  });

  context.addSubmenuItem('my-plugin', {
    label: 'Analytics',
    url: '/bb-admin/my-plugin/analytics'
  });
}, 10);
```

---

#### `admin_view_render` (ADMIN_VIEW_RENDER)
**Type**: Filter
**When**: Before admin view is rendered
**Context**:
```javascript
{
  viewData: Object,      // View data being passed to template
  viewName: string,      // Name of the view
  user: User,
  req: Request
}
```

**Use Cases**:
- Inject content into admin pages
- Add notices/warnings
- Modify page data
- Add custom variables to views

**Example**:
```javascript
hookService.addFilter(HOOKS.ADMIN_VIEW_RENDER, async (data) => {
  // Add a warning banner to specific admin pages
  if (data.viewName === 'settings') {
    data.viewData.notices = data.viewData.notices || [];
    data.viewData.notices.push({
      type: 'warning',
      message: 'Plugin configuration required'
    });
  }
  return data;
}, 10);
```

---

#### `admin_register_view` (ADMIN_REGISTER_VIEW)
**Type**: Action
**When**: Admin views are being registered
**Context**:
```javascript
{
  viewRegistry: Object,  // View registry for adding new views
  router: Router,
  app: Express
}
```

**Use Cases**:
- Register custom admin pages dynamically
- Add custom routes
- Create dynamic admin interfaces

**Example**:
```javascript
hookService.addAction(HOOKS.ADMIN_REGISTER_VIEW, async (context) => {
  context.viewRegistry.register({
    path: '/bb-admin/my-custom-page',
    component: 'MyCustomPage',
    title: 'Custom Page',
    permissions: ['admin']
  });
}, 10);
```

---

#### `admin_enqueue` (ADMIN_ENQUEUE)
**Type**: Action
**When**: Admin page is loading
**Context**:
```javascript
{
  assets: Object,        // Asset queue
  page: string,          // Current admin page
  user: User
}
```

**Use Cases**:
- Add custom CSS/JS to admin panel
- Load external libraries
- Inject analytics scripts
- Add custom styling

**Example**:
```javascript
hookService.addAction(HOOKS.ADMIN_ENQUEUE, async (context) => {
  // Add custom stylesheet to all admin pages
  context.assets.addStyle({
    id: 'my-plugin-admin-css',
    src: '/plugins/my-plugin/assets/admin.css',
    version: '1.0.0'
  });

  // Add JavaScript only to specific pages
  if (context.page === 'settings') {
    context.assets.addScript({
      id: 'my-plugin-settings-js',
      src: '/plugins/my-plugin/assets/settings.js',
      version: '1.0.0'
    });
  }
}, 10);
```

---

#### `admin_toolbar` (ADMIN_TOOLBAR)
**Type**: Filter
**When**: Admin toolbar is being rendered
**Context**:
```javascript
{
  toolbarItems: Array,   // Toolbar items
  currentPage: string,
  user: User
}
```

**Use Cases**:
- Add toolbar buttons
- Add status indicators
- Add quick actions
- Add notification badges

**Example**:
```javascript
hookService.addFilter(HOOKS.ADMIN_TOOLBAR, async (data) => {
  // Add a quick action button to toolbar
  data.toolbarItems.push({
    id: 'quick-sync',
    label: 'Sync Data',
    icon: 'RefreshCw',
    action: '/api/admin/sync',
    position: 50
  });

  // Add status indicator
  data.toolbarItems.push({
    id: 'system-status',
    label: 'System OK',
    icon: 'CheckCircle',
    color: 'green',
    position: 100
  });

  return data;
}, 10);
```

---

#### `admin_settings_sections` (ADMIN_SETTINGS_SECTIONS)
**Type**: Action
**When**: Admin settings page is rendering sections
**Context**:
```javascript
{
  sections: Array,       // Settings sections
  addSection: (section) => void,  // Helper to add section
  user: User
}
```

**Use Cases**:
- Adding plugin configuration panels to settings pages
- Creating settings groups
- Adding preference sections

**Example**:
```javascript
hookService.addAction(HOOKS.ADMIN_SETTINGS_SECTIONS, async (context) => {
  context.addSection({
    id: 'my-plugin-settings',
    title: 'My Plugin Settings',
    description: 'Configure plugin behavior',
    icon: 'Settings',
    fields: [
      {
        id: 'api_key',
        label: 'API Key',
        type: 'text',
        required: true
      },
      {
        id: 'enable_feature',
        label: 'Enable Advanced Features',
        type: 'checkbox',
        default: false
      }
    ]
  });
}, 10);
```

---

#### `admin_error` (ADMIN_ERROR)
**Type**: Action
**When**: An error occurs in admin panel
**Context**:
```javascript
{
  error: Error,
  context: Object,       // Error context (page, action, etc.)
  userId: number,
  timestamp: number
}
```

**Use Cases**:
- Error logging
- Alerting
- Recovery actions
- User notifications

**Example**:
```javascript
hookService.addAction(HOOKS.ADMIN_ERROR, async (context) => {
  console.error(`Admin error for user ${context.userId}:`, context.error);

  // Log to external service
  await logToErrorTracking({
    error: context.error.message,
    stack: context.error.stack,
    user: context.userId,
    page: context.context.page,
    timestamp: context.timestamp
  });

  // Send notification if critical
  if (context.error.critical) {
    await notifyAdmins('Critical admin error occurred');
  }
}, 10);
```

---

#### `admin_login_render` (ADMIN_LOGIN_RENDER)
**Type**: Filter
**When**: Admin login page is being rendered
**Context**:
```javascript
{
  loginData: Object,     // Login page data
  branding: Object,      // Branding settings
  formFields: Array
}
```

**Use Cases**:
- Custom login UI
- SSO integration
- Branding customization
- Adding login methods

**Example**:
```javascript
hookService.addFilter(HOOKS.ADMIN_LOGIN_RENDER, async (data) => {
  // Add custom branding
  data.branding.logo = '/plugins/my-plugin/logo.png';
  data.branding.companyName = 'My Company';

  // Add SSO login option
  data.loginData.ssoEnabled = true;
  data.loginData.ssoProvider = 'Google';

  // Add additional form fields
  data.formFields.push({
    name: 'department',
    label: 'Department',
    type: 'select',
    options: ['Sales', 'Engineering', 'Support']
  });

  return data;
}, 10);
```

---

### 3. Chat/Pipeline Hooks

#### `chat_before_message` (CHAT_BEFORE_MESSAGE)
**Type**: Filter
**When**: Before user message is processed
**Context**:
```javascript
{
  message: string,
  userId: number,
  chatId: number,
  modelId: number,
  userMessageId: number,
  formData: Object,
  context: Object,
  cancelled: boolean  // Set to true to cancel processing
}
```

**Use Cases**:
- Message validation
- Content moderation
- Rate limiting
- Access control
- Message preprocessing

**Example**:
```javascript
hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
  // Moderate message content
  if (containsProfanity(data.formData.message)) {
    console.warn('Message blocked: profanity detected');
    data.cancelled = true;
    data.cancelReason = 'Content policy violation';
  }

  // Rate limiting
  const messageCount = await getUserMessageCount(data.userId, 60000); // last minute
  if (messageCount > 10) {
    data.cancelled = true;
    data.cancelReason = 'Rate limit exceeded';
  }

  return data;
}, 10);
```

---

#### `chat_after_message` (CHAT_AFTER_MESSAGE)
**Type**: Action
**When**: After user message is saved to database
**Context**:
```javascript
{
  message: Message,
  userId: number,
  chatId: number,
  messageId: number
}
```

**Use Cases**:
- Logging/analytics
- Triggering workflows
- Sending notifications
- Message indexing

**Example**:
```javascript
hookService.addAction(HOOKS.CHAT_AFTER_MESSAGE, async (context) => {
  console.log(`Message ${context.messageId} saved to chat ${context.chatId}`);

  // Log to analytics service
  await analytics.track('message_sent', {
    userId: context.userId,
    chatId: context.chatId,
    messageLength: context.message.content.length
  });

  // Trigger workflow if needed
  if (context.message.content.includes('@workflow')) {
    await triggerWorkflow(context.chatId, context.message);
  }
}, 10);
```

---

#### `llm_before_generate` (LLM_BEFORE_GENERATE)
**Type**: Filter
**When**: Before sending prompt to LLM
**Context**:
```javascript
{
  messageHistory: Array,    // The conversation history
  chatId: number,           // Chat ID
  workspaceId: number|null, // Workspace ID (if applicable)
  modelConfig: Object,      // Model configuration
  modelSettings: Object,    // Model settings
  userMessageId: number,    // The user's message ID
  baseUrl: string,          // Base URL for the request
  chatContext: Object,      // Chat database context
  currentUser: Object       // Current user object
}
```

**Use Cases**:
- **RAG injection** (add knowledge base context)
- Prompt modification
- Context enhancement
- System prompt injection
- Message history filtering

**Example**:
```javascript
hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, async (data) => {
  // Extract the user's question
  const lastMessage = data.messageHistory[data.messageHistory.length - 1];
  const userQuestion = lastMessage.content;

  // Search knowledge base
  const relevantDocs = await searchKnowledgeBase(userQuestion, {
    workspaceId: data.workspaceId,
    limit: 5
  });

  if (relevantDocs.length > 0) {
    // Inject RAG context as a system message
    data.messageHistory.unshift({
      role: 'system',
      content: `Use this context to answer the user's question:\n\n${relevantDocs.map(doc => doc.content).join('\n\n')}`
    });
  }

  // Add workspace-specific instructions
  if (data.workspaceId) {
    const workspace = await getWorkspace(data.workspaceId);
    if (workspace.customInstructions) {
      data.messageHistory.unshift({
        role: 'system',
        content: workspace.customInstructions
      });
    }
  }

  return data;
}, 10);
```

---

#### `llm_after_generate` (LLM_AFTER_GENERATE)
**Type**: Filter
**When**: After LLM returns response, before saving
**Context**:
```javascript
{
  response: string,
  prompt: string,
  model: Object,
  metadata: Object
}
```

**Use Cases**:
- **Content moderation** (filter LLM output)
- Response formatting
- Adding citations
- Response validation
- PII redaction

**Example**:
```javascript
hookService.addFilter(HOOKS.LLM_AFTER_GENERATE, async (data) => {
  // Moderate LLM response
  if (containsSensitiveInfo(data.response)) {
    data.response = redactSensitiveInfo(data.response);
  }

  // Add citations from RAG context
  if (data.metadata.ragSources) {
    const citations = data.metadata.ragSources
      .map((source, idx) => `[${idx + 1}] ${source.title}`)
      .join('\n');
    data.response += `\n\n**Sources:**\n${citations}`;
  }

  // Format code blocks
  data.response = formatCodeBlocks(data.response);

  return data;
}, 10);
```

---

#### `chat_response_final` (CHAT_RESPONSE_FINAL)
**Type**: Filter
**When**: Final chat response ready to send to client
**Context**:
```javascript
{
  response: string,
  chatId: number,
  messageId: number,
  metadata: Object
}
```

**Use Cases**:
- Final formatting
- Adding metadata
- Logging final output
- Response tracking

**Example**:
```javascript
hookService.addFilter(HOOKS.CHAT_RESPONSE_FINAL, async (data) => {
  // Add metadata
  data.metadata.generatedAt = Date.now();
  data.metadata.version = '1.0.0';

  // Log final response
  await logResponse({
    chatId: data.chatId,
    messageId: data.messageId,
    responseLength: data.response.length
  });

  // Track token usage
  if (data.metadata.tokens) {
    await trackTokenUsage(data.chatId, data.metadata.tokens);
  }

  return data;
}, 10);
```

---

### 4. Frontend Client Hooks

#### `client_sidebar` (CLIENT_SIDEBAR)
**Type**: Filter
**When**: Client sidebar is being rendered (DEPRECATED - use CLIENT_MENU)
**Context**:
```javascript
{
  menuItems: Array,
  currentUser: User
}
```

**Use Cases**:
- Add custom sidebar items (legacy)
- Modify navigation (legacy)
- Add widgets (legacy)

**Note**: This hook is deprecated. Use `CLIENT_MENU` for menu items and `CLIENT_SIDEBAR_LEFT`/`CLIENT_SIDEBAR_RIGHT` for sidebar components.

---

#### `client_sidebar_left` (CLIENT_SIDEBAR_LEFT)
**Type**: Action
**When**: Left sidebar components are being registered (before chat container)
**Context**:
```javascript
{
  chatId: number,
  workspaceId: number|null,
  userId: number,
  registerComponent: (component) => void
}
```

**Use Cases**:
- Knowledge base sidebar
- Document list
- Chat context panel
- Navigation drawer

**Example**:
```javascript
hookService.addAction(HOOKS.CLIENT_SIDEBAR_LEFT, async (context) => {
  context.registerComponent({
    id: 'knowledge-base-sidebar',
    component: 'KnowledgeBaseSidebar',
    title: 'Knowledge Base',
    icon: 'Book',
    position: 10,
    props: {
      workspaceId: context.workspaceId,
      chatId: context.chatId
    }
  });
}, 10);
```

---

#### `client_sidebar_right` (CLIENT_SIDEBAR_RIGHT)
**Type**: Action
**When**: Right sidebar components are being registered (after chat container)
**Context**:
```javascript
{
  chatId: number,
  workspaceId: number|null,
  userId: number,
  registerComponent: (component) => void
}
```

**Use Cases**:
- Settings panel
- Info panels
- Secondary actions
- Help sidebar

**Example**:
```javascript
hookService.addAction(HOOKS.CLIENT_SIDEBAR_RIGHT, async (context) => {
  context.registerComponent({
    id: 'chat-settings-panel',
    component: 'ChatSettingsPanel',
    title: 'Settings',
    icon: 'Settings',
    position: 20,
    props: {
      chatId: context.chatId
    },
    collapsible: true,
    defaultCollapsed: true
  });
}, 10);
```

---

#### `client_menu` (CLIENT_MENU)
**Type**: Filter
**When**: Client menu/navigation is being rendered
**Context**:
```javascript
{
  menuItems: Array,
  currentUser: User
}
```

**Use Cases**:
- Custom pages
- Tools
- Navigation items
- External links

**Example**:
```javascript
hookService.addFilter(HOOKS.CLIENT_MENU, async (data) => {
  // Add a custom page link
  data.menuItems.push({
    id: 'my-custom-page',
    label: 'My Tool',
    icon: 'Tool',
    url: '/bb-client/my-tool',
    position: 50
  });

  // Add external link
  data.menuItems.push({
    id: 'documentation',
    label: 'Docs',
    icon: 'Book',
    url: 'https://docs.example.com',
    external: true,
    position: 100
  });

  return data;
}, 10);
```

---

#### `client_toolbar` (CLIENT_TOOLBAR)
**Type**: Filter
**When**: Client toolbar/header is being rendered
**Context**:
```javascript
{
  toolbarItems: Array,
  currentChat: Chat
}
```

**Use Cases**:
- Adding buttons
- Status indicators
- Dropdowns
- Quick actions

**Example**:
```javascript
hookService.addFilter(HOOKS.CLIENT_TOOLBAR, async (data) => {
  // Add a toolbar action
  data.toolbarItems.push({
    id: 'export-chat',
    label: 'Export',
    icon: 'Download',
    action: 'export',
    position: 30
  });

  // Add a dropdown menu
  data.toolbarItems.push({
    id: 'tools-menu',
    label: 'Tools',
    icon: 'MoreVertical',
    type: 'dropdown',
    items: [
      { label: 'Tool 1', action: 'tool1' },
      { label: 'Tool 2', action: 'tool2' }
    ],
    position: 40
  });

  return data;
}, 10);
```

---

#### `client_widget_render` (CLIENT_WIDGET_RENDER)
**Type**: Action
**When**: Client UI is initializing
**Context**:
```javascript
{
  widgetRegistry: Object,
  userId: number,
  registerWidget: (widget) => void
}
```

**Use Cases**:
- Register custom UI widgets
- Add chat enhancements
- Floating panels
- Overlay components

**Example**:
```javascript
hookService.addAction(HOOKS.CLIENT_WIDGET_RENDER, async (context) => {
  context.registerWidget({
    id: 'quick-commands',
    component: 'QuickCommandsWidget',
    position: 'bottom-right',
    props: {
      userId: context.userId
    }
  });
}, 10);
```

---

#### `client_route_change` (CLIENT_ROUTE_CHANGE)
**Type**: Action
**When**: Next.js route changes
**Context**:
```javascript
{
  from: string,  // Previous route
  to: string,    // New route
  userId: number
}
```

**Use Cases**:
- Analytics tracking
- Cleanup
- Route-specific logic
- State management

**Example**:
```javascript
hookService.addAction(HOOKS.CLIENT_ROUTE_CHANGE, async (context) => {
  console.log(`Route changed: ${context.from} -> ${context.to}`);

  // Track page view
  await analytics.trackPageView({
    userId: context.userId,
    from: context.from,
    to: context.to,
    timestamp: Date.now()
  });

  // Cleanup previous route state
  if (context.from.startsWith('/chat/')) {
    await cleanupChatState(context.from);
  }
}, 10);
```

---

#### `client_assets_loaded` (CLIENT_ASSETS_LOADED)
**Type**: Action
**When**: Plugin assets (JS bundles) are loaded
**Context**:
```javascript
{
  pluginName: string,
  bundlePath: string,
  loadTime: number
}
```

**Use Cases**:
- Post-load initialization
- Feature detection
- Performance monitoring
- Asset verification

**Example**:
```javascript
hookService.addAction(HOOKS.CLIENT_ASSETS_LOADED, async (context) => {
  console.log(`Plugin ${context.pluginName} assets loaded in ${context.loadTime}ms`);

  // Track asset performance
  await performance.track('plugin_asset_load', {
    plugin: context.pluginName,
    loadTime: context.loadTime
  });

  // Initialize plugin features after load
  if (context.pluginName === 'my-plugin') {
    await initializePluginFeatures();
  }
}, 10);
```

---

### 5. User & Auth Hooks

#### `user_registered` (USER_REGISTERED)
**Type**: Action
**When**: A new user is registered
**Context**:
```javascript
{
  user: User,
  registrationData: Object,
  timestamp: number
}
```

**Use Cases**:
- Welcome emails
- Onboarding workflows
- Analytics tracking
- Default setup

**Example**:
```javascript
hookService.addAction(HOOKS.USER_REGISTERED, async (context) => {
  console.log(`New user registered: ${context.user.email}`);

  // Send welcome email
  await sendEmail({
    to: context.user.email,
    template: 'welcome',
    data: {
      name: context.user.name
    }
  });

  // Create default workspace
  await createDefaultWorkspace(context.user.id);

  // Track registration
  await analytics.track('user_registered', {
    userId: context.user.id,
    source: context.registrationData.source
  });
}, 10);
```

---

#### `user_logged_in` (USER_LOGGED_IN)
**Type**: Action
**When**: A user successfully logs in
**Context**:
```javascript
{
  user: User,
  session: Object,
  timestamp: number
}
```

**Use Cases**:
- Session tracking
- Audit logs
- Analytics
- Login notifications

**Example**:
```javascript
hookService.addAction(HOOKS.USER_LOGGED_IN, async (context) => {
  console.log(`User logged in: ${context.user.email}`);

  // Log to audit trail
  await auditLog.create({
    userId: context.user.id,
    action: 'login',
    timestamp: context.timestamp,
    ip: context.session.ip,
    userAgent: context.session.userAgent
  });

  // Track login
  await analytics.track('user_login', {
    userId: context.user.id
  });

  // Send login notification if enabled
  if (context.user.settings.loginNotifications) {
    await notifyUser(context.user.id, 'New login detected');
  }
}, 10);
```

---

#### `user_logged_out` (USER_LOGGED_OUT)
**Type**: Action
**When**: A user logs out
**Context**:
```javascript
{
  userId: number,
  sessionId: string,
  timestamp: number
}
```

**Use Cases**:
- Session cleanup
- Activity logs
- Analytics
- State cleanup

**Example**:
```javascript
hookService.addAction(HOOKS.USER_LOGGED_OUT, async (context) => {
  console.log(`User logged out: ${context.userId}`);

  // Clean up session data
  await cleanupUserSession(context.sessionId);

  // Log logout event
  await auditLog.create({
    userId: context.userId,
    action: 'logout',
    timestamp: context.timestamp
  });

  // Track logout
  await analytics.track('user_logout', {
    userId: context.userId
  });
}, 10);
```

---

#### `user_deleted` (USER_DELETED)
**Type**: Action
**When**: A user account is deleted
**Context**:
```javascript
{
  userId: number,
  userData: Object,
  deletedBy: number
}
```

**Use Cases**:
- Data cleanup
- Purging related records
- Notification
- Backup before deletion

**Example**:
```javascript
hookService.addAction(HOOKS.USER_DELETED, async (context) => {
  console.log(`User deleted: ${context.userId} by ${context.deletedBy}`);

  // Backup user data before deletion
  await backupUserData(context.userId, context.userData);

  // Clean up related records
  await deleteUserChats(context.userId);
  await deleteUserWorkspaces(context.userId);
  await deleteUserFiles(context.userId);

  // Log deletion
  await auditLog.create({
    userId: context.userId,
    action: 'account_deleted',
    deletedBy: context.deletedBy,
    timestamp: Date.now()
  });
}, 10);
```

---

### 6. Database & Migration Hooks

#### `migration_started` (MIGRATION_STARTED)
**Type**: Action
**When**: A migration starts executing
**Context**:
```javascript
{
  plugin: string,
  context: Object,
  migrationName: string
}
```

**Use Cases**:
- UI notification
- Logging start time
- Progress tracking
- Lock acquisition

**Example**:
```javascript
hookService.addAction(HOOKS.MIGRATION_STARTED, async (context) => {
  console.log(`Migration started: ${context.migrationName} (${context.plugin})`);

  // Log migration start
  await migrationLog.create({
    plugin: context.plugin,
    name: context.migrationName,
    status: 'running',
    startTime: Date.now()
  });

  // Send notification to admins
  await notifyAdmins(`Migration ${context.migrationName} started`);
}, 10);
```

---

#### `migration_completed` (MIGRATION_COMPLETED)
**Type**: Action
**When**: A migration completes successfully
**Context**:
```javascript
{
  plugin: string,
  context: Object,
  migrationName: string,
  duration: number
}
```

**Use Cases**:
- Logging success
- UI updates
- Post-migration tasks
- Performance tracking

**Example**:
```javascript
hookService.addAction(HOOKS.MIGRATION_COMPLETED, async (context) => {
  console.log(`Migration completed: ${context.migrationName} in ${context.duration}ms`);

  // Update migration log
  await migrationLog.update({
    plugin: context.plugin,
    name: context.migrationName,
    status: 'completed',
    duration: context.duration,
    endTime: Date.now()
  });

  // Track performance
  await performance.track('migration_duration', {
    migration: context.migrationName,
    duration: context.duration
  });
}, 10);
```

---

#### `migration_failed` (MIGRATION_FAILED)
**Type**: Action
**When**: A migration fails
**Context**:
```javascript
{
  plugin: string,
  context: Object,
  migrationName: string,
  error: Error
}
```

**Use Cases**:
- Error logging
- Rollback
- Alerting
- Recovery

**Example**:
```javascript
hookService.addAction(HOOKS.MIGRATION_FAILED, async (context) => {
  console.error(`Migration failed: ${context.migrationName}`, context.error);

  // Log error
  await migrationLog.update({
    plugin: context.plugin,
    name: context.migrationName,
    status: 'failed',
    error: context.error.message,
    endTime: Date.now()
  });

  // Alert admins
  await alertAdmins({
    type: 'migration_failed',
    migration: context.migrationName,
    error: context.error.message
  });

  // Attempt rollback if possible
  if (context.context.rollback) {
    await context.context.rollback();
  }
}, 10);
```

---

#### `context_registered` (CONTEXT_REGISTERED)
**Type**: Action
**When**: A new MasterRecord context is registered
**Context**:
```javascript
{
  contextName: string,
  models: Object,
  config: Object
}
```

**Use Cases**:
- Setup tasks
- Initialization
- Logging
- Context validation

**Example**:
```javascript
hookService.addAction(HOOKS.CONTEXT_REGISTERED, async (context) => {
  console.log(`Context registered: ${context.contextName}`);

  // Log context registration
  await log.info('context_registered', {
    name: context.contextName,
    models: Object.keys(context.models),
    timestamp: Date.now()
  });

  // Validate context configuration
  if (!context.config.database) {
    throw new Error(`Context ${context.contextName} missing database config`);
  }

  // Initialize context-specific features
  await initializeContextFeatures(context.contextName);
}, 10);
```

---

### 7. API Lifecycle Hooks

#### `api_request_received` (API_REQUEST_RECEIVED)
**Type**: Filter
**When**: Every API request is received
**Context**:
```javascript
{
  req: Request,
  res: Response,
  route: string,
  method: string
}
```

**Use Cases**:
- Authentication
- Rate limiting
- Request logging
- Request transformation

**Example**:
```javascript
hookService.addFilter(HOOKS.API_REQUEST_RECEIVED, async (data) => {
  console.log(`API request: ${data.method} ${data.route}`);

  // Rate limiting
  const userId = data.req.user?.id;
  if (userId) {
    const requestCount = await getRateLimitCount(userId);
    if (requestCount > 100) {
      data.res.status(429).json({ error: 'Rate limit exceeded' });
      data.cancelled = true;
      return data;
    }
    await incrementRateLimitCount(userId);
  }

  // Log request
  await apiLog.create({
    method: data.method,
    route: data.route,
    userId: userId,
    timestamp: Date.now(),
    ip: data.req.ip
  });

  return data;
}, 10);
```

---

#### `api_response_sent` (API_RESPONSE_SENT)
**Type**: Filter
**When**: Before sending API response
**Context**:
```javascript
{
  req: Request,
  res: Response,
  data: any,
  statusCode: number
}
```

**Use Cases**:
- Response transformation
- Sanitization
- Logging
- Adding headers

**Example**:
```javascript
hookService.addFilter(HOOKS.API_RESPONSE_SENT, async (data) => {
  // Add custom headers
  data.res.setHeader('X-API-Version', '1.0.0');
  data.res.setHeader('X-Response-Time', Date.now() - data.req.startTime);

  // Log response
  await apiLog.update({
    requestId: data.req.id,
    statusCode: data.statusCode,
    responseSize: JSON.stringify(data.data).length,
    duration: Date.now() - data.req.startTime
  });

  // Sanitize response if needed
  if (data.statusCode === 200 && data.data) {
    data.data = sanitizeResponse(data.data);
  }

  return data;
}, 10);
```

---

### 8. Scheduler / Cron Hooks

#### `bookbag_scheduled_job` (SCHEDULER_JOB)
**Type**: Action
**When**: A scheduled job runs
**Context**:
```javascript
{
  jobName: string,
  schedule: string,
  lastRun: number
}
```

**Use Cases**:
- Periodic tasks
- Maintenance
- Cleanup
- Data syncing

**Example**:
```javascript
hookService.addAction(HOOKS.SCHEDULER_JOB, async (context) => {
  if (context.jobName === 'cleanup_old_chats') {
    console.log('Running scheduled chat cleanup...');

    // Delete chats older than 90 days
    const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000);
    await deleteOldChats(cutoffDate);

    console.log('Chat cleanup completed');
  }
}, 10);
```

---

#### `bookbag_cron_failed` (SCHEDULER_JOB_FAILED)
**Type**: Action
**When**: A cron job fails
**Context**:
```javascript
{
  jobName: string,
  error: Error,
  attempt: number
}
```

**Use Cases**:
- Retry logic
- Error notifications
- Logging
- Alerting

**Example**:
```javascript
hookService.addAction(HOOKS.SCHEDULER_JOB_FAILED, async (context) => {
  console.error(`Scheduled job failed: ${context.jobName}`, context.error);

  // Log failure
  await jobLog.create({
    jobName: context.jobName,
    status: 'failed',
    error: context.error.message,
    attempt: context.attempt,
    timestamp: Date.now()
  });

  // Alert admins after multiple failures
  if (context.attempt >= 3) {
    await alertAdmins({
      type: 'cron_job_failed',
      job: context.jobName,
      attempts: context.attempt,
      error: context.error.message
    });
  }
}, 10);
```

---

#### `bookbag_cron_completed` (SCHEDULER_JOB_COMPLETED)
**Type**: Action
**When**: A cron job completes successfully
**Context**:
```javascript
{
  jobName: string,
  duration: number,
  result: any
}
```

**Use Cases**:
- Logging
- Metrics
- Chaining jobs
- Status updates

**Example**:
```javascript
hookService.addAction(HOOKS.SCHEDULER_JOB_COMPLETED, async (context) => {
  console.log(`Scheduled job completed: ${context.jobName} in ${context.duration}ms`);

  // Log completion
  await jobLog.create({
    jobName: context.jobName,
    status: 'completed',
    duration: context.duration,
    result: context.result,
    timestamp: Date.now()
  });

  // Track performance
  await performance.track('cron_job_duration', {
    job: context.jobName,
    duration: context.duration
  });

  // Chain dependent jobs
  if (context.jobName === 'data_sync' && context.result.success) {
    await triggerJob('generate_reports');
  }
}, 10);
```

---

### 9. Media & File System Hooks

#### `media_uploaded` (MEDIA_UPLOADED)
**Type**: Action
**When**: A file is uploaded
**Context**:
```javascript
{
  file: Object,      // File metadata
  userId: number,
  path: string,
  metadata: Object
}
```

**Use Cases**:
- Generating previews
- Creating embeddings
- Indexing for search
- Virus scanning

**Example**:
```javascript
hookService.addAction(HOOKS.MEDIA_UPLOADED, async (context) => {
  console.log(`File uploaded: ${context.file.name} by user ${context.userId}`);

  // Generate thumbnail for images
  if (context.file.mimeType.startsWith('image/')) {
    await generateThumbnail(context.path);
  }

  // Extract text content for searchable documents
  if (['pdf', 'docx', 'txt'].includes(context.file.extension)) {
    const textContent = await extractText(context.path);
    await indexDocument({
      fileId: context.file.id,
      content: textContent,
      userId: context.userId
    });
  }

  // Track upload
  await analytics.track('file_uploaded', {
    userId: context.userId,
    fileType: context.file.mimeType,
    fileSize: context.file.size
  });
}, 10);
```

---

#### `media_deleted` (MEDIA_DELETED)
**Type**: Action
**When**: A file is deleted
**Context**:
```javascript
{
  fileId: number,
  path: string,
  userId: number
}
```

**Use Cases**:
- Cleanup references
- Cache invalidation
- Search index updates
- Backup before deletion

**Example**:
```javascript
hookService.addAction(HOOKS.MEDIA_DELETED, async (context) => {
  console.log(`File deleted: ${context.fileId} by user ${context.userId}`);

  // Remove from search index
  await removeFromIndex(context.fileId);

  // Delete associated thumbnails
  await deleteThumbnails(context.fileId);

  // Clean up any embeddings
  await deleteEmbeddings(context.fileId);

  // Update storage usage
  await updateStorageUsage(context.userId);

  // Log deletion
  await auditLog.create({
    action: 'file_deleted',
    fileId: context.fileId,
    userId: context.userId,
    timestamp: Date.now()
  });
}, 10);
```

---

#### `media_renamed` (MEDIA_RENAMED)
**Type**: Action
**When**: A file is renamed
**Context**:
```javascript
{
  fileId: number,
  oldPath: string,
  newPath: string,
  userId: number
}
```

**Use Cases**:
- Updating references
- Search index updates
- Cache invalidation
- Link updates

**Example**:
```javascript
hookService.addAction(HOOKS.MEDIA_RENAMED, async (context) => {
  console.log(`File renamed: ${context.oldPath} -> ${context.newPath}`);

  // Update search index
  await updateIndexPath(context.fileId, context.newPath);

  // Update any references in chats
  await updateChatFileReferences(context.fileId, context.newPath);

  // Invalidate caches
  await cache.del(`file:${context.oldPath}`);

  // Log rename
  await auditLog.create({
    action: 'file_renamed',
    fileId: context.fileId,
    oldPath: context.oldPath,
    newPath: context.newPath,
    userId: context.userId,
    timestamp: Date.now()
  });
}, 10);
```

---

#### `storage_limit_reached` (STORAGE_LIMIT_REACHED)
**Type**: Action
**When**: Storage limit threshold is reached
**Context**:
```javascript
{
  currentUsage: number,
  limit: number,
  percentage: number
}
```

**Use Cases**:
- Admin notifications
- Cleanup suggestions
- User notifications
- Quota enforcement

**Example**:
```javascript
hookService.addAction(HOOKS.STORAGE_LIMIT_REACHED, async (context) => {
  console.warn(`Storage limit reached: ${context.percentage}% (${context.currentUsage}/${context.limit} bytes)`);

  // Alert admins
  await alertAdmins({
    type: 'storage_limit_reached',
    usage: context.currentUsage,
    limit: context.limit,
    percentage: context.percentage
  });

  // Suggest cleanup actions
  const oldFiles = await findOldFiles(90); // Files older than 90 days
  if (oldFiles.length > 0) {
    await notifyAdmins(`${oldFiles.length} old files can be cleaned up to free space`);
  }

  // If over limit, prevent new uploads
  if (context.percentage >= 100) {
    await disableUploads();
  }
}, 10);
```

---

### 10. System/Developer Hooks

#### `plugin_loaded` (PLUGIN_LOADED)
**Type**: Action
**When**: A plugin is successfully loaded
**Context**:
```javascript
{
  pluginName: string,
  pluginPath: string,
  pluginMetadata: Object
}
```

**Use Cases**:
- Plugin initialization tracking
- Dependency verification
- Load dependent plugins
- Version compatibility checks

**Example**:
```javascript
hookService.addAction(HOOKS.PLUGIN_LOADED, async (context) => {
  console.log(`Plugin loaded: ${context.pluginName} v${context.pluginMetadata.version}`);

  // Log plugin load
  await pluginLog.create({
    name: context.pluginName,
    version: context.pluginMetadata.version,
    path: context.pluginPath,
    status: 'loaded',
    timestamp: Date.now()
  });

  // Verify dependencies
  if (context.pluginMetadata.dependencies) {
    await verifyPluginDependencies(context.pluginName, context.pluginMetadata.dependencies);
  }
}, 10);
```

---

#### `plugin_activated` (PLUGIN_ACTIVATED)
**Type**: Action
**When**: A plugin is activated
**Context**:
```javascript
{
  pluginName: string,
  pluginMetadata: Object
}
```

**Use Cases**:
- Run setup tasks
- Database migrations
- Create default settings
- Initialize features

**Example**:
```javascript
hookService.addAction(HOOKS.PLUGIN_ACTIVATED, async (context) => {
  console.log(`Plugin activated: ${context.pluginName}`);

  // Run migrations
  if (context.pluginMetadata.migrations) {
    await runPluginMigrations(context.pluginName);
  }

  // Create default settings
  await createPluginSettings(context.pluginName, {
    enabled: true,
    configVersion: context.pluginMetadata.version
  });

  // Initialize features
  await initializePluginFeatures(context.pluginName);

  // Log activation
  await pluginLog.create({
    name: context.pluginName,
    action: 'activated',
    timestamp: Date.now()
  });
}, 10);
```

---

#### `plugin_deactivated` (PLUGIN_DEACTIVATED)
**Type**: Action
**When**: A plugin is deactivated
**Context**:
```javascript
{
  pluginName: string,
  pluginMetadata: Object
}
```

**Use Cases**:
- Cleanup
- Remove hooks
- Disable features
- Save state

**Example**:
```javascript
hookService.addAction(HOOKS.PLUGIN_DEACTIVATED, async (context) => {
  console.log(`Plugin deactivated: ${context.pluginName}`);

  // Remove all hooks registered by this plugin
  await removePluginHooks(context.pluginName);

  // Disable features
  await disablePluginFeatures(context.pluginName);

  // Clean up resources
  await cleanupPluginResources(context.pluginName);

  // Update settings
  await updatePluginSettings(context.pluginName, {
    enabled: false,
    deactivatedAt: Date.now()
  });

  // Log deactivation
  await pluginLog.create({
    name: context.pluginName,
    action: 'deactivated',
    timestamp: Date.now()
  });
}, 10);
```

---

#### `routes_registered` (ROUTES_REGISTERED)
**Type**: Action
**When**: Plugin routes are being registered
**Context**:
```javascript
{
  router: Router,
  app: Express
}
```

**Use Cases**:
- Register custom API endpoints
- Add custom web routes
- Add middleware
- Add route handlers

**Example**:
```javascript
hookService.addAction(HOOKS.ROUTES_REGISTERED, async (context) => {
  // Register custom API routes
  context.router.get('/api/my-plugin/status', async (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });

  context.router.post('/api/my-plugin/action', async (req, res) => {
    const result = await performAction(req.body);
    res.json(result);
  });

  // Register web routes
  context.app.get('/bb-client/my-plugin', (req, res) => {
    res.render('my-plugin/index');
  });

  console.log('My plugin routes registered');
}, 10);
```

---

## Usage Guide

### Basic Plugin Structure

```javascript
// bb-plugins/my-plugin/index.js
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Register hooks
  hookService.addAction(HOOKS.CORE_INIT, async (context) => {
    console.log('My plugin initializing...');
  });

  hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
    // Modify message data
    return data;
  });

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      url: '/bb-admin/my-plugin',
      icon: 'Settings'
    });
  });
}

module.exports = { load };
```

### Accessing Hooks in Plugins

Plugins receive the `pluginAPI` object with:
- `hookService`: Hook registration service
- `HOOKS`: Hook constants
- `pluginLoader`: Plugin loader instance
- `sidebarHook`: Legacy sidebar hook (for compatibility)

### Removing Hooks

```javascript
// Save callback reference
const myCallback = async (data) => { /* ... */ };

// Add hook
hookService.addAction(HOOKS.CORE_INIT, myCallback);

// Remove hook later
hookService.removeAction(HOOKS.CORE_INIT, myCallback);
```

### Hook Execution Order

Hooks execute callbacks in priority order (lowest to highest):

```javascript
// Priority 5 - runs first
hookService.addAction(HOOKS.CORE_INIT, earlyInit, 5);

// Priority 10 (default) - runs second
hookService.addAction(HOOKS.CORE_INIT, normalInit);

// Priority 20 - runs last
hookService.addAction(HOOKS.CORE_INIT, lateInit, 20);
```

---

## Integration Points

### Server Startup
**File**: `/config/initializers/config.js`
- Initializes hook system
- Fires `bookbag_init` (line 81)
- Loads plugins (line 92)
- Fires `bookbag_ready` (line 96)
- Registers shutdown handlers (line 107, 114)

### Admin Sidebar
**File**: `/components/admin/app/controllers/api/layout/sidebarController.js`
- Fires `admin_menu` hook (line 69)
- Allows plugins to add menu items

### Chat Pipeline
**File**: `/app/sockets/chatSocket.js`
- Integration points:
  - Line ~160: `chat_before_message` (before processing)
  - Line ~228: `chat_after_message` (after save)
  - Line ~460: `llm_before_generate` (before LLM call)
  - Line ~467: `llm_after_generate` (after LLM response)
  - Line ~575: `chat_response_final` (before client send)

### Plugin Loader
**File**: `/components/plugins/app/core/pluginLoader.js`
- Fires `plugin_loaded` hook (line 121)
- Passes HOOKS constants to plugins (line 111)

### Client UI
**Files**: Next.js app components
- `client_sidebar_left`, `client_sidebar_right` hooks for sidebar rendering
- `client_menu`, `client_toolbar` hooks for navigation
- `client_route_change` on route transitions
- `client_assets_loaded` when plugin bundles load

---

## Best Practices

### 1. Always Use Hook Constants
```javascript
// ✅ Good
hookService.addAction(HOOKS.CORE_INIT, callback);

// ❌ Bad
hookService.addAction('bookbag_init', callback);
```

### 2. Handle Errors Gracefully
```javascript
hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
  try {
    // Your logic
    return data;
  } catch (error) {
    console.error('Hook error:', error);
    return data; // Return original data on error
  }
});
```

### 3. Use Appropriate Priorities
- Core functionality: 1-5
- Normal plugins: 10 (default)
- UI modifications: 15-20
- Logging/analytics: 90-100

### 4. Validate Filter Returns
Always return the data object (or modified version) from filters:
```javascript
hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
  // Modify data
  data.validated = true;

  // Always return data
  return data;
});
```

### 5. Document Your Hooks
Always document which hooks your plugin uses:
```javascript
/**
 * My Plugin
 *
 * Hooks Used:
 * - bookbag_init (action): Initialize plugin
 * - chat_before_message (filter): Validate messages
 * - admin_menu (action): Add admin page
 */
function load(pluginAPI) {
  // ...
}
```

### 6. Clean Up on Deactivation
```javascript
let myHookCallback;

function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Store callback reference
  myHookCallback = async (context) => {
    // Do something
  };

  hookService.addAction(HOOKS.CORE_INIT, myHookCallback);

  // Listen for deactivation
  hookService.addAction(HOOKS.PLUGIN_DEACTIVATED, async (context) => {
    if (context.pluginName === 'my-plugin') {
      // Clean up
      hookService.removeAction(HOOKS.CORE_INIT, myHookCallback);
    }
  });
}
```

### 7. Avoid Blocking Operations
Use async/await and avoid blocking the event loop:
```javascript
// ✅ Good - async operation
hookService.addAction(HOOKS.CHAT_AFTER_MESSAGE, async (context) => {
  await logToDatabase(context.messageId);
});

// ❌ Bad - blocking operation
hookService.addAction(HOOKS.CHAT_AFTER_MESSAGE, (context) => {
  // This blocks the event loop
  syncLogToDatabase(context.messageId);
});
```

---

## Examples

### Example 1: RAG Plugin

```javascript
// bb-plugins/rag-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Inject RAG context before LLM generation
  hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, async (data) => {
    const userQuestion = data.messageHistory[data.messageHistory.length - 1].content;

    // Search knowledge base
    const relevantDocs = await searchKnowledgeBase(userQuestion, {
      workspaceId: data.workspaceId,
      limit: 5
    });

    if (relevantDocs.length > 0) {
      // Inject context
      data.messageHistory.unshift({
        role: 'system',
        content: `Knowledge Base Context:\n${relevantDocs.map(d => d.content).join('\n\n')}`
      });
    }

    return data;
  }, 10);
}

module.exports = { load };
```

### Example 2: Moderation Plugin

```javascript
// bb-plugins/moderation-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Moderate input messages
  hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
    if (await containsProfanity(data.formData.message)) {
      console.warn(`Blocked message from user ${data.userId}`);
      data.cancelled = true;
      data.cancelReason = 'Content policy violation';
    }
    return data;
  }, 5); // High priority

  // Moderate LLM output
  hookService.addFilter(HOOKS.LLM_AFTER_GENERATE, async (data) => {
    if (await containsSensitiveInfo(data.response)) {
      data.response = '[Content moderated]';
    }
    return data;
  }, 5); // High priority
}

module.exports = { load };
```

### Example 3: Analytics Plugin

```javascript
// bb-plugins/analytics-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Track user registration
  hookService.addAction(HOOKS.USER_REGISTERED, async (context) => {
    await analytics.track('user_registered', {
      userId: context.user.id,
      email: context.user.email,
      timestamp: context.timestamp
    });
  }, 100);

  // Log all messages
  hookService.addAction(HOOKS.CHAT_AFTER_MESSAGE, async (context) => {
    await analytics.track('message_sent', {
      userId: context.userId,
      chatId: context.chatId,
      messageLength: context.message.content.length,
      timestamp: Date.now()
    });
  }, 100); // Low priority (run last)

  // Track LLM usage
  hookService.addFilter(HOOKS.LLM_AFTER_GENERATE, async (data) => {
    await analytics.track('llm_generation', {
      model: data.model.name,
      tokens: data.metadata.tokens,
      responseLength: data.response.length,
      timestamp: Date.now()
    });
    return data;
  }, 100); // Low priority
}

module.exports = { load };
```

### Example 4: Admin Dashboard Plugin

```javascript
// bb-plugins/dashboard-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Add admin menu items
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({
      id: 'dashboard',
      label: 'Dashboard',
      url: '/bb-admin/dashboard',
      icon: 'BarChart',
      position: 10
    });

    context.addSubmenuItem('dashboard', {
      label: 'Overview',
      url: '/bb-admin/dashboard/overview'
    });

    context.addSubmenuItem('dashboard', {
      label: 'Reports',
      url: '/bb-admin/dashboard/reports'
    });
  }, 10);

  // Register custom routes
  hookService.addAction(HOOKS.ROUTES_REGISTERED, async (context) => {
    context.router.get('/api/admin/dashboard/stats', async (req, res) => {
      const stats = await getDashboardStats();
      res.json(stats);
    });
  }, 10);
}

module.exports = { load };
```

### Example 5: File Processing Plugin

```javascript
// bb-plugins/file-processor-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Process uploaded files
  hookService.addAction(HOOKS.MEDIA_UPLOADED, async (context) => {
    console.log(`Processing file: ${context.file.name}`);

    // Extract text for PDFs
    if (context.file.extension === 'pdf') {
      const text = await extractPDFText(context.path);
      await saveExtractedText(context.file.id, text);
    }

    // Generate thumbnails for images
    if (context.file.mimeType.startsWith('image/')) {
      await generateThumbnail(context.path, {
        width: 200,
        height: 200
      });
    }
  }, 10);

  // Cleanup on file deletion
  hookService.addAction(HOOKS.MEDIA_DELETED, async (context) => {
    await deleteThumbnails(context.fileId);
    await deleteExtractedText(context.fileId);
  }, 10);
}

module.exports = { load };
```

### Example 6: Multi-Hook Integration Plugin

```javascript
// bb-plugins/comprehensive-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Core lifecycle
  hookService.addAction(HOOKS.CORE_INIT, async () => {
    console.log('Plugin initializing...');
    await initializeDatabase();
  }, 10);

  hookService.addAction(HOOKS.CORE_READY, async () => {
    console.log('Plugin ready');
    await startBackgroundJobs();
  }, 10);

  // Admin integration
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      url: '/bb-admin/my-plugin',
      icon: 'Box'
    });
  }, 10);

  // Chat pipeline
  hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, async (data) => {
    // Add custom context
    data.messageHistory.unshift({
      role: 'system',
      content: 'You are a helpful assistant with access to our knowledge base.'
    });
    return data;
  }, 10);

  // User events
  hookService.addAction(HOOKS.USER_REGISTERED, async (context) => {
    await sendWelcomeEmail(context.user.email);
  }, 10);

  // Scheduled tasks
  hookService.addAction(HOOKS.SCHEDULER_JOB, async (context) => {
    if (context.jobName === 'daily_cleanup') {
      await performDailyCleanup();
    }
  }, 10);
}

module.exports = { load };
```

---

## Debugging

### View Hook Statistics

```javascript
const hookService = master.requestList.hookService;
const stats = hookService.getHookStats();
console.log(JSON.stringify(stats, null, 2));
```

Output:
```json
{
  "registeredHooks": 47,
  "activeActions": 15,
  "activeFilters": 8,
  "totalActionCallbacks": 23,
  "totalFilterCallbacks": 12,
  "actions": [
    { "name": "bookbag_init", "callbacks": 3, "priorities": [5, 10, 10] },
    { "name": "admin_menu", "callbacks": 5, "priorities": [10, 10, 10, 15, 20] }
  ],
  "filters": [
    { "name": "chat_before_message", "callbacks": 3, "priorities": [5, 10, 15] },
    { "name": "llm_before_generate", "callbacks": 4, "priorities": [5, 10, 10, 20] }
  ]
}
```

### Check if Hook is Active

```javascript
if (hookService.hasAction('bookbag_init')) {
  console.log('bookbag_init hook has callbacks registered');
}

if (hookService.hasFilter('chat_before_message')) {
  console.log('chat_before_message filter has callbacks registered');
}
```

### Debug Hook Execution

```javascript
// Add debug logging to a hook
hookService.addAction(HOOKS.CORE_INIT, async (context) => {
  console.log('[DEBUG] CORE_INIT fired with context:', context);
}, 1); // Run first with priority 1
```

### List All Available Hooks

```javascript
const { HOOKS, getAllHooks, getHooksByCategory } = require('./components/plugins/app/core/hookConstants');

// Get all hook names
const allHooks = getAllHooks();
console.log('Available hooks:', allHooks);

// Get hooks by category
const adminHooks = getHooksByCategory('admin');
console.log('Admin hooks:', adminHooks);
```

---

## Migration from Legacy Hooks

If you're migrating from the old sidebarHook system:

### Before (Legacy):
```javascript
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  sidebarHook.add_menu_page({
    label: 'My Plugin',
    url: '/bb-admin/my-plugin'
  });
}
```

### After (Generic Hooks):
```javascript
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      url: '/bb-admin/my-plugin',
      icon: 'Settings'
    });
  });
}
```

### Client Sidebar Migration

### Before:
```javascript
// Using deprecated CLIENT_SIDEBAR
hookService.addFilter(HOOKS.CLIENT_SIDEBAR, async (data) => {
  data.menuItems.push({ label: 'My Tool', url: '/tool' });
  return data;
});
```

### After:
```javascript
// Use CLIENT_MENU for navigation
hookService.addFilter(HOOKS.CLIENT_MENU, async (data) => {
  data.menuItems.push({
    id: 'my-tool',
    label: 'My Tool',
    url: '/tool',
    icon: 'Tool'
  });
  return data;
});

// Use CLIENT_SIDEBAR_LEFT for sidebar components
hookService.addAction(HOOKS.CLIENT_SIDEBAR_LEFT, async (context) => {
  context.registerComponent({
    id: 'my-sidebar',
    component: 'MySidebar',
    title: 'My Tool'
  });
});
```

---

## API Reference

### HookService Methods

| Method | Description |
|--------|-------------|
| `addAction(hookName, callback, priority)` | Register action hook |
| `addFilter(hookName, callback, priority)` | Register filter hook |
| `removeAction(hookName, callback)` | Remove action hook |
| `removeFilter(hookName, callback)` | Remove filter hook |
| `doAction(hookName, context)` | Fire action hook |
| `applyFilters(hookName, value, ...args)` | Apply filters |
| `hasAction(hookName)` | Check if action has callbacks |
| `hasFilter(hookName)` | Check if filter has callbacks |
| `getHookStats()` | Get hook statistics |

### Hook Constants Module

```javascript
const {
  HOOKS,              // Object with all hook constants
  getAllHooks,        // Function to get all hook names
  getHooksByCategory, // Function to get hooks by category
  isValidHook        // Function to validate hook name
} = require('./components/plugins/app/core/hookConstants');
```

### Available Categories

- `lifecycle` - Core lifecycle hooks
- `admin` - Admin panel hooks
- `chat` or `pipeline` - Chat/LLM hooks
- `client` or `frontend` - Client UI hooks
- `user` or `auth` - User/auth hooks
- `database` or `migration` - Database hooks
- `api` - API lifecycle hooks
- `scheduler` or `cron` - Scheduler hooks
- `media` or `files` - Media/file hooks
- `system` or `developer` - System hooks

---

## Summary

The Bookbag Hooks System provides **47 powerful integration points** across **10 categories**, allowing plugins to:

- Extend core functionality without modifying code
- Hook into chat pipeline for RAG, moderation, and enhancement
- Customize admin and client interfaces
- Track user activities and events
- Manage files and media
- Schedule background tasks
- Monitor API requests and responses
- Handle database migrations
- Respond to system lifecycle events

This comprehensive hook system enables a modular, extensible architecture that supports complex plugin ecosystems while maintaining clean separation of concerns.

---

## Support

For questions or issues with the hooks system:
- **Documentation**: `/docs/hooks/`
- **Examples**: `/bb-plugins/`
- **Source Code**: `/components/plugins/app/core/`
- **Hook Constants**: `/components/plugins/app/core/hookConstants.js`

---

**Built for the Bookbag Community**
