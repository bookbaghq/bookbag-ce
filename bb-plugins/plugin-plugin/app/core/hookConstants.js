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
 * @param {string} category - 'lifecycle', 'admin', 'chat', 'client', or 'system'
 * @returns {Object} Object containing hooks for the specified category
 */
function getHooksByCategory(category) {
  switch (category.toLowerCase()) {
    case 'lifecycle':
      return {
        CORE_INIT: HOOKS.CORE_INIT,
        CORE_READY: HOOKS.CORE_READY,
        CORE_SHUTDOWN: HOOKS.CORE_SHUTDOWN
      };

    case 'admin':
      return {
        ADMIN_MENU: HOOKS.ADMIN_MENU,
        ADMIN_VIEW_RENDER: HOOKS.ADMIN_VIEW_RENDER,
        ADMIN_REGISTER_VIEW: HOOKS.ADMIN_REGISTER_VIEW,
        ADMIN_ENQUEUE: HOOKS.ADMIN_ENQUEUE,
        ADMIN_TOOLBAR: HOOKS.ADMIN_TOOLBAR
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
        CLIENT_WIDGET_RENDER: HOOKS.CLIENT_WIDGET_RENDER
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
