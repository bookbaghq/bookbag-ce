# Hooks Reference

Complete reference of all available hooks in BookBag.

## Table of Contents

- [Overview](#overview)
- [Sidebar Hooks](#sidebar-hooks)
- [Chat Hooks](#chat-hooks)
- [User Hooks](#user-hooks)
- [Model Hooks](#model-hooks)
- [RAG Hooks](#rag-hooks)
- [Workspace Hooks](#workspace-hooks)
- [Admin Hooks](#admin-hooks)
- [Creating Custom Hooks](#creating-custom-hooks)

## Overview

Hooks allow plugins to modify behavior at specific points in the application lifecycle.

### Hook Types

**Filters:** Modify data and return it
```javascript
hookService.addFilter('filter_name', (data, ...args) => {
  return modifiedData;
});
```

**Actions:** Execute code without returning data
```javascript
hookService.addAction('action_name', (data, ...args) => {
  // Perform action
});
```

### Hook Priority

Hooks execute in registration order. To control execution order, register plugins in desired sequence.

## Sidebar Hooks

### onAdminMenu

Called when building the admin sidebar menu.

**Hook Type:** Callback

**Usage:**
```javascript
sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
  // Add menu items
});
```

**Parameters:**
- `req` - Express request object with contexts
- `res` - Express response object
- `user` - Current user object
- `tenant` - Current tenant object
- `tenantId` - Current tenant ID

**Example:**
```javascript
sidebarHook.onAdminMenu(async ({ req, user }) => {
  if (user.role === 'administrator') {
    sidebarHook.add_menu_page({
      id: 'admin-tools',
      label: 'Admin Tools',
      icon: 'Settings',
      capability: 'administrator',
      priority: 90
    });
  }
});
```

### add_menu_page

Add a top-level menu item.

**Parameters:**
```javascript
{
  id: string,           // Unique identifier
  label: string,        // Display text
  icon: string,         // Lucide icon name
  capability: string,   // 'read' or 'administrator'
  priority: number      // Menu order (lower = higher)
}
```

**Example:**
```javascript
sidebarHook.add_menu_page({
  id: 'reports',
  label: 'Reports',
  icon: 'FileText',
  capability: 'read',
  priority: 30
});
```

### add_submenu_page

Add a submenu item.

**Parameters:**
```javascript
parentId: string,     // Parent menu ID
{
  id: string,         // Unique identifier
  label: string,      // Display text
  path: string,       // URL path
  capability: string, // Required permission
  priority: number    // Submenu order
}
```

**Example:**
```javascript
sidebarHook.add_submenu_page('reports', {
  id: 'reports-usage',
  label: 'Usage Report',
  path: 'bb-admin/reports/usage',
  capability: 'read',
  priority: 10
});
```

## Chat Hooks

### before_chat_create

Called before creating a new chat.

**Hook Type:** Filter

**Parameters:**
- `chatData` - Chat data to be created
- `user` - Current user object

**Returns:** Modified chat data

**Example:**
```javascript
hookService.addFilter('before_chat_create', (chatData, user) => {
  // Add custom field
  chatData.custom_field = 'value';

  // Validate
  if (!chatData.title) {
    chatData.title = `Chat by ${user.first_name}`;
  }

  return chatData;
});
```

### after_chat_create

Called after a chat is created.

**Hook Type:** Action

**Parameters:**
- `chat` - Created chat object
- `user` - Current user object

**Example:**
```javascript
hookService.addAction('after_chat_create', (chat, user) => {
  console.log(`User ${user.email} created chat: ${chat.title}`);

  // Send notification
  // Log to analytics
  // etc.
});
```

### before_message_send

Called before sending a message to LLM.

**Hook Type:** Filter

**Parameters:**
- `message` - Message object
- `chat` - Chat object
- `model` - Model object
- `user` - Current user object

**Returns:** Modified message

**Example:**
```javascript
hookService.addFilter('before_message_send', (message, chat, model, user) => {
  // Add context
  message.context = {
    user_id: user.id,
    chat_id: chat.id,
    timestamp: Date.now()
  };

  // Modify content
  message.content = message.content.trim();

  return message;
});
```

### after_message_receive

Called after receiving response from LLM.

**Hook Type:** Filter

**Parameters:**
- `response` - LLM response
- `message` - Original message
- `chat` - Chat object
- `model` - Model object

**Returns:** Modified response

**Example:**
```javascript
hookService.addFilter('after_message_receive', (response, message, chat, model) => {
  // Add metadata
  response.received_at = Date.now();
  response.model_name = model.name;

  // Post-process content
  response.content = response.content.trim();

  return response;
});
```

### chat_message

General message filter (both sending and receiving).

**Hook Type:** Filter

**Parameters:**
- `message` - Message object
- `direction` - 'outgoing' or 'incoming'

**Returns:** Modified message

**Example:**
```javascript
hookService.addFilter('chat_message', (message, direction) => {
  // Add timestamp
  message.processed_at = new Date().toISOString();

  // Add direction indicator
  message.direction = direction;

  return message;
});
```

### before_chat_delete

Called before deleting a chat.

**Hook Type:** Filter

**Parameters:**
- `chat` - Chat to be deleted
- `user` - Current user object

**Returns:** `false` to cancel deletion, or modified chat

**Example:**
```javascript
hookService.addFilter('before_chat_delete', (chat, user) => {
  // Prevent deletion of important chats
  if (chat.is_important) {
    console.warn('Cannot delete important chat');
    return false; // Cancel deletion
  }

  return chat; // Allow deletion
});
```

## User Hooks

### before_user_create

Called before creating a new user.

**Hook Type:** Filter

**Parameters:**
- `userData` - User data to be created

**Returns:** Modified user data

**Example:**
```javascript
hookService.addFilter('before_user_create', (userData) => {
  // Validate email domain
  if (!userData.email.endsWith('@company.com')) {
    throw new Error('Only company emails allowed');
  }

  // Set defaults
  userData.role = userData.role || 'subscriber';

  return userData;
});
```

### after_user_create

Called after a user is created.

**Hook Type:** Action

**Parameters:**
- `user` - Created user object

**Example:**
```javascript
hookService.addAction('after_user_create', (user) => {
  console.log(`New user registered: ${user.email}`);

  // Send welcome email
  // Create default workspace
  // Set up initial settings
});
```

### before_user_login

Called before user login.

**Hook Type:** Filter

**Parameters:**
- `credentials` - Login credentials (email, password)

**Returns:** Modified credentials or `false` to block login

**Example:**
```javascript
hookService.addFilter('before_user_login', (credentials) => {
  // Check IP whitelist
  const allowedIPs = ['192.168.1.1', '10.0.0.1'];
  if (!allowedIPs.includes(req.ip)) {
    return false; // Block login
  }

  return credentials;
});
```

### after_user_login

Called after successful login.

**Hook Type:** Action

**Parameters:**
- `user` - Logged in user object
- `session` - Session data

**Example:**
```javascript
hookService.addAction('after_user_login', (user, session) => {
  console.log(`User logged in: ${user.email}`);

  // Log login time
  // Update last_login field
  // Send notification
});
```

### user_profile_update

Called when user updates their profile.

**Hook Type:** Filter

**Parameters:**
- `updates` - Profile updates
- `user` - Current user object

**Returns:** Modified updates

**Example:**
```javascript
hookService.addFilter('user_profile_update', (updates, user) => {
  // Validate updates
  if (updates.email && updates.email !== user.email) {
    // Require email verification for email changes
    updates.email_verified = false;
  }

  return updates;
});
```

## Model Hooks

### before_model_request

Called before making request to LLM.

**Hook Type:** Filter

**Parameters:**
- `request` - Request payload
- `model` - Model object
- `user` - Current user object

**Returns:** Modified request

**Example:**
```javascript
hookService.addFilter('before_model_request', (request, model, user) => {
  // Add custom headers
  request.headers = {
    ...request.headers,
    'X-User-ID': user.id,
    'X-Timestamp': Date.now()
  };

  // Modify parameters
  if (model.provider === 'openai') {
    request.temperature = Math.min(request.temperature, 0.9);
  }

  return request;
});
```

### after_model_response

Called after receiving response from LLM.

**Hook Type:** Filter

**Parameters:**
- `response` - LLM response
- `model` - Model object
- `request` - Original request

**Returns:** Modified response

**Example:**
```javascript
hookService.addFilter('after_model_response', (response, model, request) => {
  // Log usage
  console.log(`Model ${model.name} used ${response.tokens} tokens`);

  // Post-process response
  response.processed = true;
  response.model_name = model.name;

  return response;
});
```

### model_error

Called when LLM request fails.

**Hook Type:** Action

**Parameters:**
- `error` - Error object
- `model` - Model object
- `request` - Request that failed

**Example:**
```javascript
hookService.addAction('model_error', (error, model, request) => {
  console.error(`Model ${model.name} error:`, error.message);

  // Log to error tracking service
  // Send alert
  // Record metrics
});
```

## RAG Hooks

### before_document_upload

Called before uploading a document.

**Hook Type:** Filter

**Parameters:**
- `file` - File object
- `user` - Current user object

**Returns:** Modified file object or `false` to block upload

**Example:**
```javascript
hookService.addFilter('before_document_upload', (file, user) => {
  // Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File too large');
  }

  // Check file type
  const allowedTypes = ['application/pdf', 'text/plain'];
  if (!allowedTypes.includes(file.mimetype)) {
    return false; // Block upload
  }

  return file;
});
```

### after_document_upload

Called after document is uploaded.

**Hook Type:** Action

**Parameters:**
- `document` - Uploaded document object
- `user` - Current user object

**Example:**
```javascript
hookService.addAction('after_document_upload', (document, user) => {
  console.log(`Document uploaded: ${document.filename}`);

  // Start processing
  // Send notification
  // Update quota
});
```

### before_document_process

Called before processing document (extracting text).

**Hook Type:** Filter

**Parameters:**
- `document` - Document to process

**Returns:** Modified document

**Example:**
```javascript
hookService.addFilter('before_document_process', (document) => {
  // Set processing options
  document.extract_images = true;
  document.ocr_enabled = true;

  return document;
});
```

### after_document_process

Called after document processing completes.

**Hook Type:** Action

**Parameters:**
- `document` - Processed document object
- `chunks` - Generated chunks array

**Example:**
```javascript
hookService.addAction('after_document_process', (document, chunks) => {
  console.log(`Document processed: ${chunks.length} chunks created`);

  // Index in search
  // Generate summary
  // Update status
});
```

### rag_chunk

Filter individual document chunks.

**Hook Type:** Filter

**Parameters:**
- `chunk` - Chunk object
- `document` - Parent document

**Returns:** Modified chunk

**Example:**
```javascript
hookService.addFilter('rag_chunk', (chunk, document) => {
  // Clean chunk text
  chunk.content = chunk.content.trim();

  // Add metadata
  chunk.document_name = document.filename;
  chunk.processed_at = Date.now();

  return chunk;
});
```

### rag_query

Filter RAG retrieval queries.

**Hook Type:** Filter

**Parameters:**
- `query` - Query object
- `user` - Current user object
- `chat` - Chat object (if applicable)

**Returns:** Modified query

**Example:**
```javascript
hookService.addFilter('rag_query', (query, user, chat) => {
  // Modify query text
  query.text = query.text.toLowerCase();

  // Add filters
  query.filters = {
    user_id: user.id,
    workspace_id: chat.workspace_id
  };

  // Adjust parameters
  query.top_k = 10;

  return query;
});
```

## Workspace Hooks

### before_workspace_create

Called before creating a workspace.

**Hook Type:** Filter

**Parameters:**
- `workspaceData` - Workspace data
- `user` - Current user object

**Returns:** Modified workspace data

**Example:**
```javascript
hookService.addFilter('before_workspace_create', (workspaceData, user) => {
  // Validate name
  if (!workspaceData.name || workspaceData.name.length < 3) {
    throw new Error('Workspace name must be at least 3 characters');
  }

  // Set creator as admin
  workspaceData.creator_id = user.id;

  return workspaceData;
});
```

### after_workspace_create

Called after workspace is created.

**Hook Type:** Action

**Parameters:**
- `workspace` - Created workspace object
- `user` - Creator user object

**Example:**
```javascript
hookService.addAction('after_workspace_create', (workspace, user) => {
  console.log(`Workspace created: ${workspace.name}`);

  // Create default documents folder
  // Set up initial settings
  // Send notifications
});
```

### workspace_member_add

Called when adding member to workspace.

**Hook Type:** Action

**Parameters:**
- `workspace` - Workspace object
- `member` - New member user object
- `role` - Member role ('admin' or 'member')

**Example:**
```javascript
hookService.addAction('workspace_member_add', (workspace, member, role) => {
  console.log(`Added ${member.email} to ${workspace.name} as ${role}`);

  // Send invitation email
  // Log audit event
});
```

### workspace_member_remove

Called when removing member from workspace.

**Hook Type:** Action

**Parameters:**
- `workspace` - Workspace object
- `member` - Removed member user object

**Example:**
```javascript
hookService.addAction('workspace_member_remove', (workspace, member) => {
  console.log(`Removed ${member.email} from ${workspace.name}`);

  // Clean up member's workspace data
  // Send notification
});
```

## Admin Hooks

### admin_settings_update

Called when admin settings are updated.

**Hook Type:** Filter

**Parameters:**
- `settings` - New settings object
- `oldSettings` - Previous settings object

**Returns:** Modified settings

**Example:**
```javascript
hookService.addFilter('admin_settings_update', (settings, oldSettings) => {
  // Validate settings
  if (settings.max_upload_size > 100 * 1024 * 1024) {
    settings.max_upload_size = 100 * 1024 * 1024; // Cap at 100MB
  }

  // Log changes
  console.log('Settings updated:', {
    old: oldSettings,
    new: settings
  });

  return settings;
});
```

### plugin_activated

Called when a plugin is activated.

**Hook Type:** Action

**Parameters:**
- `plugin` - Plugin object
- `user` - Admin user who activated it

**Example:**
```javascript
hookService.addAction('plugin_activated', (plugin, user) => {
  console.log(`Plugin activated: ${plugin.name}`);

  // Initialize plugin data
  // Run plugin setup
});
```

### plugin_deactivated

Called when a plugin is deactivated.

**Hook Type:** Action

**Parameters:**
- `plugin` - Plugin object
- `user` - Admin user who deactivated it

**Example:**
```javascript
hookService.addAction('plugin_deactivated', (plugin, user) => {
  console.log(`Plugin deactivated: ${plugin.name}`);

  // Cleanup plugin data (optional)
  // Log event
});
```

## Creating Custom Hooks

You can create custom hooks in your plugins for other plugins to use.

### Defining Hooks in Your Plugin

```javascript
function load(pluginAPI) {
  const { hookService } = pluginAPI;

  if (!hookService) return;

  // Your plugin logic
  const processData = (data) => {
    // Apply custom hook before processing
    data = hookService.applyFilters('my_plugin_before_process', data);

    // Process data
    const result = doProcessing(data);

    // Apply custom hook after processing
    const finalResult = hookService.applyFilters('my_plugin_after_process', result, data);

    // Fire action hook
    hookService.doAction('my_plugin_processed', finalResult);

    return finalResult;
  };
}
```

### Using Custom Hooks from Other Plugins

```javascript
function load(pluginAPI) {
  const { hookService } = pluginAPI;

  if (!hookService) return;

  // Hook into another plugin's custom hook
  hookService.addFilter('my_plugin_before_process', (data) => {
    // Modify data before my_plugin processes it
    data.custom_field = 'value';
    return data;
  });

  hookService.addAction('my_plugin_processed', (result) => {
    // React to my_plugin's processing completion
    console.log('my_plugin processed:', result);
  });
}
```

## Hook Execution Order

Hooks execute in the order they are registered. To control execution:

1. **Load order**: Plugins load in database order
2. **Priority system**: Not currently implemented (future feature)
3. **Conditional registration**: Register hooks based on conditions

```javascript
function load(pluginAPI) {
  const { hookService } = pluginAPI;

  // Register early-stage hooks first
  hookService.addFilter('before_chat_create', earlyHook);

  // Then register later-stage hooks
  hookService.addFilter('after_chat_create', laterHook);
}
```

## Best Practices

### 1. Always Return Data in Filters

```javascript
// Good
hookService.addFilter('my_filter', (data) => {
  data.modified = true;
  return data;
});

// Bad - data is lost!
hookService.addAction('my_filter', (data) => {
  data.modified = true;
  // No return!
});
```

### 2. Handle Missing Parameters

```javascript
hookService.addFilter('chat_message', (message, chat, user) => {
  // Check parameters exist
  if (!message || !chat) {
    return message;
  }

  // Proceed safely
  message.chat_id = chat.id;
  return message;
});
```

### 3. Avoid Heavy Operations

```javascript
// Bad - blocks execution
hookService.addFilter('chat_message', async (message) => {
  await heavyDatabaseQuery();
  return message;
});

// Good - defer to background
hookService.addAction('after_chat_create', (chat) => {
  // Schedule background task
  setTimeout(() => heavyDatabaseQuery(), 0);
});
```

### 4. Document Custom Hooks

```javascript
/**
 * Custom hook: my_plugin_data_processed
 *
 * Fires after data is processed by my plugin.
 *
 * @param {Object} result - Processed result
 * @param {Object} originalData - Original input data
 *
 * @example
 * hookService.addAction('my_plugin_data_processed', (result, originalData) => {
 *   console.log('Data processed:', result);
 * });
 */
```

## Debugging Hooks

```javascript
function load(pluginAPI) {
  const { hookService } = pluginAPI;

  // Add debug logging
  hookService.addFilter('chat_message', (message) => {
    console.log('[DEBUG] chat_message hook:', {
      content: message.content,
      timestamp: Date.now()
    });

    return message;
  });

  // Log when hook fires
  hookService.addAction('after_chat_create', (chat) => {
    console.log('[DEBUG] after_chat_create fired:', chat.id);
  });
}
```

## Related Documentation

- [Plugin Development Guide](PLUGIN_DEVELOPMENT.md)
- [Plugin API Reference](PLUGIN_API.md)
- [Developer Guide](../DEVELOPER_GUIDE.md)
