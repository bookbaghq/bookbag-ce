/**
 * Bookbag Core Hook Constants
 *
 * Minimal but Powerful Generic Hooks System
 * Inspired by WordPress hooks architecture
 *
 * This file defines the core set of hooks available in the Bookbag plugin system.
 * These hooks provide standardized integration points for plugins to extend functionality
 * without modifying core code.
 *
 * Hook Types:
 * - Actions: Execute callbacks at specific points (do_action)
 * - Filters: Modify data and pass it through (apply_filters)
 *
 * @version 1.0.0
 */

const HOOKS = {
  // ============================================================================
  // CORE LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Fired when Bookbag system is initializing (early in boot process)
   * Use for: Setting up core services, database connections, loading config
   * Type: Action
   */
  CORE_INIT: 'bookbag_init',

  /**
   * Fired when Bookbag is fully loaded and ready to accept requests
   * Use for: Plugin initialization, route registration, final setup
   * Type: Action
   */
  CORE_READY: 'bookbag_ready',

  /**
   * Fired when Bookbag is shutting down gracefully
   * Use for: Cleanup, closing connections, saving state
   * Type: Action
   */
  CORE_SHUTDOWN: 'bookbag_shutdown',

  /**
   * Fired when Next.js rebuild is triggered
   * Use for: Regenerating symlinks, loader files, plugin bundles
   * Type: Action
   */
  CORE_REBUILD: 'bookbag_rebuild',

  /**
   * Fired when environment configs are loaded
   * Use for: Modifying runtime settings, environment-specific setup
   * Type: Action
   */
  CORE_ENV_LOADED: 'bookbag_env_loaded',

  // ============================================================================
  // ADMIN HOOKS
  // ============================================================================

  /**
   * Register custom admin menu items and pages
   * Use for: Adding plugin settings pages, custom admin sections
   * Type: Action
   * Context: Admin sidebar rendering
   */
  ADMIN_MENU: 'admin_menu',

  /**
   * Modify the output of admin views before rendering
   * Use for: Injecting content, adding notices, modifying UI
   * Type: Filter
   * Context: Admin page render
   */
  ADMIN_VIEW_RENDER: 'admin_view_render',

  /**
   * Register custom admin views/pages programmatically
   * Use for: Creating dynamic admin pages, custom routes
   * Type: Action
   * Context: Admin route initialization
   */
  ADMIN_REGISTER_VIEW: 'admin_register_view',

  /**
   * Enqueue custom scripts/styles in admin panel
   * Use for: Adding custom CSS/JS to admin pages
   * Type: Action
   * Context: Admin page load
   */
  ADMIN_ENQUEUE: 'admin_enqueue',

  /**
   * Modify the admin toolbar/header content
   * Use for: Adding quick actions, status indicators, notifications
   * Type: Filter
   * Context: Admin toolbar render
   */
  ADMIN_TOOLBAR: 'admin_toolbar',

  /**
   * Register custom admin settings sections/panels
   * Use for: Adding plugin configuration panels to settings pages
   * Type: Action
   * Context: Admin settings page render
   */
  ADMIN_SETTINGS_SECTIONS: 'admin_settings_sections',

  /**
   * Fired when an error occurs in admin panel
   * Use for: Error logging, alerting, recovery
   * Type: Action
   * Passes: { error, context, userId, timestamp }
   */
  ADMIN_ERROR: 'admin_error',

  /**
   * Modify admin login page rendering
   * Use for: Custom login UI, SSO integration, branding
   * Type: Filter
   * Context: Login page render
   */
  ADMIN_LOGIN_RENDER: 'admin_login_render',

  // ============================================================================
  // CHAT/PIPELINE HOOKS
  // ============================================================================

  /**
   * Fired before a user message is processed
   * Use for: Message validation, preprocessing, moderation
   * Type: Filter
   * Passes: { message, userId, chatId, context }
   */
  CHAT_BEFORE_MESSAGE: 'chat_before_message',

  /**
   * Fired after a user message is saved to database
   * Use for: Logging, analytics, triggering workflows
   * Type: Action
   * Passes: { message, userId, chatId, messageId }
   */
  CHAT_AFTER_MESSAGE: 'chat_after_message',

  /**
   * Filter message history before sending to LLM
   * Use for: RAG context injection, prompt enhancement, message history modification
   * Type: Filter
   * Passes: {
   *   messageHistory: Array,  // The conversation history
   *   chatId: Number,         // Chat ID
   *   workspaceId: Number|null, // Workspace ID (if applicable)
   *   modelConfig: Object,    // Model configuration
   *   modelSettings: Object,  // Model settings
   *   userMessageId: Number,  // The user's message ID
   *   baseUrl: String,        // Base URL for the request
   *   chatContext: Object,    // Chat database context
   *   currentUser: Object     // Current user object
   * }
   * Returns: { messageHistory: Array } // Modified message history
   */
  LLM_BEFORE_GENERATE: 'llm_before_generate',

  /**
   * Fired after LLM returns response but before saving
   * Use for: Response filtering, content moderation, formatting
   * Type: Filter
   * Passes: { response, prompt, model, metadata }
   */
  LLM_AFTER_GENERATE: 'llm_after_generate',

  /**
   * Fired when final chat response is ready to send to client
   * Use for: Final formatting, adding metadata, logging
   * Type: Filter
   * Passes: { response, chatId, messageId, metadata }
   */
  CHAT_RESPONSE_FINAL: 'chat_response_final',

  // ============================================================================
  // FRONTEND CLIENT HOOKS
  // ============================================================================

  /**
   * Modify the client sidebar menu items (DEPRECATED - use CLIENT_MENU)
   * Use for: Adding custom navigation, widgets, actions
   * Type: Filter
   * Passes: { menuItems, currentUser }
   */
  CLIENT_SIDEBAR: 'client_sidebar',

  /**
   * Register left sidebar components (before chat container)
   * Use for: Knowledge base, document list, chat context
   * Type: Action
   * Context: Client chat interface - left side
   * Passes: { chatId, workspaceId, userId }
   */
  CLIENT_SIDEBAR_LEFT: 'client_sidebar_left',

  /**
   * Register right sidebar components (after chat container)
   * Use for: Settings, info panels, secondary actions
   * Type: Action
   * Context: Client chat interface - right side
   * Passes: { chatId, workspaceId, userId }
   */
  CLIENT_SIDEBAR_RIGHT: 'client_sidebar_right',

  /**
   * Register items in the client menu/navigation
   * Use for: Custom pages, tools, navigation items
   * Type: Filter
   * Passes: { menuItems, currentUser }
   */
  CLIENT_MENU: 'client_menu',

  /**
   * Modify the client toolbar/header
   * Use for: Adding buttons, status indicators, dropdowns
   * Type: Filter
   * Passes: { toolbarItems, currentChat }
   */
  CLIENT_TOOLBAR: 'client_toolbar',

  /**
   * Register custom widgets in client interface
   * Use for: Chat enhancements, custom UI components
   * Type: Action
   * Context: Client UI initialization
   */
  CLIENT_WIDGET_RENDER: 'client_widget_render',

  /**
   * Fired on Next.js route changes
   * Use for: Analytics tracking, cleanup, route-specific logic
   * Type: Action
   * Passes: { from, to, userId }
   */
  CLIENT_ROUTE_CHANGE: 'client_route_change',

  /**
   * Fired when plugin assets (JS bundles) are loaded
   * Use for: Post-load initialization, feature detection
   * Type: Action
   * Passes: { pluginName, bundlePath, loadTime }
   */
  CLIENT_ASSETS_LOADED: 'client_assets_loaded',

  // ============================================================================
  // USER & AUTH HOOKS
  // ============================================================================

  /**
   * Fired when a new user is registered
   * Use for: Welcome emails, onboarding, analytics
   * Type: Action
   * Passes: { user, registrationData, timestamp }
   */
  USER_REGISTERED: 'user_registered',

  /**
   * Fired when a user successfully logs in
   * Use for: Session tracking, audit logs, analytics
   * Type: Action
   * Passes: { user, session, timestamp }
   */
  USER_LOGGED_IN: 'user_logged_in',

  /**
   * Fired when a user logs out
   * Use for: Session cleanup, activity logs
   * Type: Action
   * Passes: { userId, sessionId, timestamp }
   */
  USER_LOGGED_OUT: 'user_logged_out',

  /**
   * Fired when a user account is deleted
   * Use for: Data cleanup, purging related records
   * Type: Action
   * Passes: { userId, userData, deletedBy }
   */
  USER_DELETED: 'user_deleted',

  // ============================================================================
  // DATABASE & MIGRATION HOOKS
  // ============================================================================

  /**
   * Fired when a migration starts executing
   * Use for: UI notification, logging start time
   * Type: Action
   * Passes: { plugin, context, migrationName }
   */
  MIGRATION_STARTED: 'migration_started',

  /**
   * Fired when a migration completes successfully
   * Use for: Logging success, UI updates, post-migration tasks
   * Type: Action
   * Passes: { plugin, context, migrationName, duration }
   */
  MIGRATION_COMPLETED: 'migration_completed',

  /**
   * Fired when a migration fails
   * Use for: Error logging, rollback, alerting
   * Type: Action
   * Passes: { plugin, context, migrationName, error }
   */
  MIGRATION_FAILED: 'migration_failed',

  /**
   * Fired when a new MasterRecord context is registered
   * Use for: Setup tasks, initialization, logging
   * Type: Action
   * Passes: { contextName, models, config }
   */
  CONTEXT_REGISTERED: 'context_registered',

  // ============================================================================
  // API LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Fired on every API request
   * Use for: Auth, rate-limiting, request logging
   * Type: Filter
   * Passes: { req, res, route, method }
   */
  API_REQUEST_RECEIVED: 'api_request_received',

  /**
   * Fired before sending API response
   * Use for: Response transformation, sanitization, logging
   * Type: Filter
   * Passes: { req, res, data, statusCode }
   */
  API_RESPONSE_SENT: 'api_response_sent',

  /**
   * Fired when external API session is created
   * Use for: Session tracking, analytics, initialization
   * Type: Action
   * Passes: { apiId, sessionId, apiKey }
   */
  API_SESSION_CREATED: 'api_session_created',

  /**
   * Fired when external API rate limit is exceeded
   * Use for: Logging, alerting, rate limit adjustments
   * Type: Action
   * Passes: { apiId, apiKey, currentCount, limit, window }
   */
  API_RATE_LIMIT_EXCEEDED: 'api_rate_limit_exceeded',

  /**
   * Fired before external API chat message is processed
   * Use for: Message validation, preprocessing, content filtering
   * Type: Filter
   * Passes: { message, sessionId, apiId, messageHistory }
   */
  API_CHAT_BEFORE_MESSAGE: 'api_chat_before_message',

  /**
   * Fired after external API chat response is generated
   * Use for: Response modification, logging, analytics
   * Type: Filter
   * Passes: { response, message, sessionId, apiId, tokens }
   */
  API_CHAT_AFTER_RESPONSE: 'api_chat_after_response',

  // ============================================================================
  // SCHEDULER / CRON HOOKS
  // ============================================================================

  /**
   * Fired when a scheduled job runs
   * Use for: Periodic tasks, maintenance, cleanup
   * Type: Action
   * Passes: { jobName, schedule, lastRun }
   */
  SCHEDULER_JOB: 'bookbag_scheduled_job',

  /**
   * Fired when a cron job fails
   * Use for: Retry logic, error notifications
   * Type: Action
   * Passes: { jobName, error, attempt }
   */
  SCHEDULER_JOB_FAILED: 'bookbag_cron_failed',

  /**
   * Fired when a cron job completes successfully
   * Use for: Logging, metrics, chaining jobs
   * Type: Action
   * Passes: { jobName, duration, result }
   */
  SCHEDULER_JOB_COMPLETED: 'bookbag_cron_completed',

  // ============================================================================
  // MEDIA & FILE SYSTEM HOOKS
  // ============================================================================

  /**
   * Fired when a file is uploaded
   * Use for: Generating previews, embeddings, indexing
   * Type: Action
   * Passes: { file, userId, path, metadata }
   */
  MEDIA_UPLOADED: 'media_uploaded',

  /**
   * Fired when a file is deleted
   * Use for: Cleanup references, cache invalidation
   * Type: Action
   * Passes: { fileId, path, userId }
   */
  MEDIA_DELETED: 'media_deleted',

  /**
   * Fired when a file is renamed
   * Use for: Updating references, search index updates
   * Type: Action
   * Passes: { fileId, oldPath, newPath, userId }
   */
  MEDIA_RENAMED: 'media_renamed',

  /**
   * Fired when storage limit threshold is reached
   * Use for: Admin notifications, cleanup suggestions
   * Type: Action
   * Passes: { currentUsage, limit, percentage }
   */
  STORAGE_LIMIT_REACHED: 'storage_limit_reached',

  // ============================================================================
  // SYSTEM/DEVELOPER HOOKS
  // ============================================================================

  /**
   * Fired when a plugin is successfully loaded
   * Use for: Plugin initialization, dependency checks
   * Type: Action
   * Passes: { pluginName, pluginPath, pluginMetadata }
   */
  PLUGIN_LOADED: 'plugin_loaded',

  /**
   * Fired when a plugin is activated
   * Use for: Setup tasks, database migrations, config initialization
   * Type: Action
   * Passes: { pluginName, pluginMetadata }
   */
  PLUGIN_ACTIVATED: 'plugin_activated',

  /**
   * Fired when a plugin is deactivated
   * Use for: Cleanup, removing hooks, disabling features
   * Type: Action
   * Passes: { pluginName, pluginMetadata }
   */
  PLUGIN_DEACTIVATED: 'plugin_deactivated',

  /**
   * Fired when plugin routes are being registered
   * Use for: Adding custom API endpoints, web routes
   * Type: Action
   * Passes: { router, app }
   */
  ROUTES_REGISTERED: 'routes_registered'
};

/**
 * Get all available hooks as an array
 * @returns {string[]} Array of all hook names
 */
function getAllHooks() {
  return Object.values(HOOKS);
}

/**
 * Get hooks by category
 * @param {string} category - 'lifecycle', 'admin', 'chat', 'client', 'user', 'database', 'api', 'scheduler', 'media', or 'system'
 * @returns {Object} Object containing hooks for the specified category
 */
function getHooksByCategory(category) {
  switch (category.toLowerCase()) {
    case 'lifecycle':
      return {
        CORE_INIT: HOOKS.CORE_INIT,
        CORE_READY: HOOKS.CORE_READY,
        CORE_SHUTDOWN: HOOKS.CORE_SHUTDOWN,
        CORE_REBUILD: HOOKS.CORE_REBUILD,
        CORE_ENV_LOADED: HOOKS.CORE_ENV_LOADED
      };

    case 'admin':
      return {
        ADMIN_MENU: HOOKS.ADMIN_MENU,
        ADMIN_VIEW_RENDER: HOOKS.ADMIN_VIEW_RENDER,
        ADMIN_REGISTER_VIEW: HOOKS.ADMIN_REGISTER_VIEW,
        ADMIN_ENQUEUE: HOOKS.ADMIN_ENQUEUE,
        ADMIN_TOOLBAR: HOOKS.ADMIN_TOOLBAR,
        ADMIN_SETTINGS_SECTIONS: HOOKS.ADMIN_SETTINGS_SECTIONS,
        ADMIN_ERROR: HOOKS.ADMIN_ERROR,
        ADMIN_LOGIN_RENDER: HOOKS.ADMIN_LOGIN_RENDER
      };

    case 'chat':
    case 'pipeline':
      return {
        CHAT_BEFORE_MESSAGE: HOOKS.CHAT_BEFORE_MESSAGE,
        CHAT_AFTER_MESSAGE: HOOKS.CHAT_AFTER_MESSAGE,
        LLM_BEFORE_GENERATE: HOOKS.LLM_BEFORE_GENERATE,
        LLM_AFTER_GENERATE: HOOKS.LLM_AFTER_GENERATE,
        CHAT_RESPONSE_FINAL: HOOKS.CHAT_RESPONSE_FINAL
      };

    case 'client':
    case 'frontend':
      return {
        CLIENT_SIDEBAR: HOOKS.CLIENT_SIDEBAR,
        CLIENT_SIDEBAR_LEFT: HOOKS.CLIENT_SIDEBAR_LEFT,
        CLIENT_SIDEBAR_RIGHT: HOOKS.CLIENT_SIDEBAR_RIGHT,
        CLIENT_MENU: HOOKS.CLIENT_MENU,
        CLIENT_TOOLBAR: HOOKS.CLIENT_TOOLBAR,
        CLIENT_WIDGET_RENDER: HOOKS.CLIENT_WIDGET_RENDER,
        CLIENT_ROUTE_CHANGE: HOOKS.CLIENT_ROUTE_CHANGE,
        CLIENT_ASSETS_LOADED: HOOKS.CLIENT_ASSETS_LOADED
      };

    case 'user':
    case 'auth':
      return {
        USER_REGISTERED: HOOKS.USER_REGISTERED,
        USER_LOGGED_IN: HOOKS.USER_LOGGED_IN,
        USER_LOGGED_OUT: HOOKS.USER_LOGGED_OUT,
        USER_DELETED: HOOKS.USER_DELETED
      };

    case 'database':
    case 'migration':
      return {
        MIGRATION_STARTED: HOOKS.MIGRATION_STARTED,
        MIGRATION_COMPLETED: HOOKS.MIGRATION_COMPLETED,
        MIGRATION_FAILED: HOOKS.MIGRATION_FAILED,
        CONTEXT_REGISTERED: HOOKS.CONTEXT_REGISTERED
      };

    case 'api':
      return {
        API_REQUEST_RECEIVED: HOOKS.API_REQUEST_RECEIVED,
        API_RESPONSE_SENT: HOOKS.API_RESPONSE_SENT,
        API_SESSION_CREATED: HOOKS.API_SESSION_CREATED,
        API_RATE_LIMIT_EXCEEDED: HOOKS.API_RATE_LIMIT_EXCEEDED,
        API_CHAT_BEFORE_MESSAGE: HOOKS.API_CHAT_BEFORE_MESSAGE,
        API_CHAT_AFTER_RESPONSE: HOOKS.API_CHAT_AFTER_RESPONSE
      };

    case 'scheduler':
    case 'cron':
      return {
        SCHEDULER_JOB: HOOKS.SCHEDULER_JOB,
        SCHEDULER_JOB_FAILED: HOOKS.SCHEDULER_JOB_FAILED,
        SCHEDULER_JOB_COMPLETED: HOOKS.SCHEDULER_JOB_COMPLETED
      };

    case 'media':
    case 'files':
      return {
        MEDIA_UPLOADED: HOOKS.MEDIA_UPLOADED,
        MEDIA_DELETED: HOOKS.MEDIA_DELETED,
        MEDIA_RENAMED: HOOKS.MEDIA_RENAMED,
        STORAGE_LIMIT_REACHED: HOOKS.STORAGE_LIMIT_REACHED
      };

    case 'system':
    case 'developer':
      return {
        PLUGIN_LOADED: HOOKS.PLUGIN_LOADED,
        PLUGIN_ACTIVATED: HOOKS.PLUGIN_ACTIVATED,
        PLUGIN_DEACTIVATED: HOOKS.PLUGIN_DEACTIVATED,
        ROUTES_REGISTERED: HOOKS.ROUTES_REGISTERED
      };

    default:
      throw new Error(`Unknown hook category: ${category}`);
  }
}

/**
 * Check if a hook name is valid
 * @param {string} hookName - The hook name to validate
 * @returns {boolean} True if hook is valid
 */
function isValidHook(hookName) {
  return getAllHooks().includes(hookName);
}

module.exports = {
  HOOKS,
  getAllHooks,
  getHooksByCategory,
  isValidHook
};
