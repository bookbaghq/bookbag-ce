/**
 * Hook Initializer
 *
 * Registers all core hooks with the hook registration system
 * This provides self-documentation and helps with debugging
 */

const { HOOKS } = require('./hookConstants');
const hookRegistration = require('./hookRegistration');

/**
 * Initialize and register all core hooks with descriptions
 */
function initializeCoreHooks() {
  console.log('🔌 Initializing Bookbag Core Hooks...');

  // ============================================================================
  // CORE LIFECYCLE HOOKS
  // ============================================================================

  hookRegistration.registerHook(
    HOOKS.CORE_INIT,
    'Fired when Bookbag system is initializing (early in boot process)'
  );

  hookRegistration.registerHook(
    HOOKS.CORE_READY,
    'Fired when Bookbag is fully loaded and ready to accept requests'
  );

  hookRegistration.registerHook(
    HOOKS.CORE_SHUTDOWN,
    'Fired when Bookbag is shutting down gracefully'
  );

  // ============================================================================
  // ADMIN HOOKS
  // ============================================================================

  hookRegistration.registerHook(
    HOOKS.ADMIN_MENU,
    'Register custom admin menu items and pages'
  );

  hookRegistration.registerHook(
    HOOKS.ADMIN_VIEW_RENDER,
    'Modify the output of admin views before rendering'
  );

  hookRegistration.registerHook(
    HOOKS.ADMIN_REGISTER_VIEW,
    'Register custom admin views/pages programmatically'
  );

  hookRegistration.registerHook(
    HOOKS.ADMIN_ENQUEUE,
    'Enqueue custom scripts/styles in admin panel'
  );

  hookRegistration.registerHook(
    HOOKS.ADMIN_TOOLBAR,
    'Modify the admin toolbar/header content'
  );

  // ============================================================================
  // CHAT/PIPELINE HOOKS
  // ============================================================================

  hookRegistration.registerHook(
    HOOKS.CHAT_BEFORE_MESSAGE,
    'Fired before a user message is processed (filter)'
  );

  hookRegistration.registerHook(
    HOOKS.CHAT_AFTER_MESSAGE,
    'Fired after a user message is saved to database (action)'
  );

  hookRegistration.registerHook(
    HOOKS.LLM_BEFORE_GENERATE,
    'Fired before sending prompt to LLM (filter)'
  );

  hookRegistration.registerHook(
    HOOKS.LLM_AFTER_GENERATE,
    'Fired after LLM returns response but before saving (filter)'
  );

  hookRegistration.registerHook(
    HOOKS.CHAT_RESPONSE_FINAL,
    'Fired when final chat response is ready to send to client (filter)'
  );

  // ============================================================================
  // FRONTEND CLIENT HOOKS
  // ============================================================================

  hookRegistration.registerHook(
    HOOKS.CLIENT_SIDEBAR,
    'Modify the client sidebar menu items (filter)'
  );

  hookRegistration.registerHook(
    HOOKS.CLIENT_TOOLBAR,
    'Modify the client toolbar/header (filter)'
  );

  hookRegistration.registerHook(
    HOOKS.CLIENT_WIDGET_RENDER,
    'Register custom widgets in client interface (action)'
  );

  // ============================================================================
  // SYSTEM/DEVELOPER HOOKS
  // ============================================================================

  hookRegistration.registerHook(
    HOOKS.PLUGIN_LOADED,
    'Fired when a plugin is successfully loaded (action)'
  );

  hookRegistration.registerHook(
    HOOKS.PLUGIN_ACTIVATED,
    'Fired when a plugin is activated (action)'
  );

  hookRegistration.registerHook(
    HOOKS.PLUGIN_DEACTIVATED,
    'Fired when a plugin is deactivated (action)'
  );

  hookRegistration.registerHook(
    HOOKS.ROUTES_REGISTERED,
    'Fired when plugin routes are being registered (action)'
  );

  console.log(`✓ Registered ${Object.keys(HOOKS).length} core hooks`);
}

/**
 * Export both the initializer and the hooks for convenience
 */
module.exports = {
  initializeCoreHooks,
  HOOKS,
  hookRegistration
};
