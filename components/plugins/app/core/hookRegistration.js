/**
 * Hook Registration Service
 * Central registry for all hooks in the system
 * This service is registered with master and accessible to all controllers
 * Similar to WordPress's plugin API with add_action, do_action
 */

class HookRegistration {
  constructor() {
    // Map of hook name -> array of callbacks with priorities
    this.hooks = new Map();

    // Registry of known hook names (for documentation/debugging)
    this.registeredHooks = new Set();

    console.log('🔌 Hook Registration Service initialized');
  }

  /**
   * Register a hook name (for documentation purposes)
   * @param {string} hookName - Name of the hook
   * @param {string} description - Description of what the hook does
   */
  registerHook(hookName, description = '') {
    this.registeredHooks.add(hookName);
    console.log(`  Registered hook: ${hookName}${description ? ' - ' + description : ''}`);
  }

  /**
   * Add a callback function to a hook
   * WordPress equivalent: add_action($hook, $callback, $priority)
   * @param {string} hookName - Name of the hook
   * @param {Function} callback - Function to call when hook fires
   * @param {number} priority - Execution priority (lower runs first)
   */
  addAction(hookName, callback, priority = 10) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    this.hooks.get(hookName).push({ callback, priority });

    // Keep sorted by priority (low to high)
    this.hooks.get(hookName).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a specific callback from a hook
   * WordPress equivalent: remove_action($hook, $callback)
   * @param {string} hookName - Name of the hook
   * @param {Function} callback - The exact function to remove
   */
  removeAction(hookName, callback) {
    if (!this.hooks.has(hookName)) return;

    const list = this.hooks.get(hookName);
    const index = list.findIndex(h => h.callback === callback);

    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  /**
   * Execute all callbacks registered for a hook
   * WordPress equivalent: do_action($hook, $args)
   * @param {string} hookName - Name of the hook to fire
   * @param {Object} context - Context object passed to all callbacks
   * @returns {Promise<void>}
   */
  async doAction(hookName, context = {}) {
    const list = this.hooks.get(hookName) || [];

    for (const { callback } of list) {
      try {
        // Allow async handlers
        await callback(context);
      } catch (error) {
        console.error(`Error in action hook '${hookName}':`, error);
      }
    }
  }

  /**
   * Check if a hook has any registered callbacks
   * WordPress equivalent: has_action($hook)
   * @param {string} hookName - Name of the hook
   * @returns {boolean}
   */
  hasAction(hookName) {
    return this.hooks.has(hookName) && this.hooks.get(hookName).length > 0;
  }

  /**
   * Get count of callbacks for a hook
   * @param {string} hookName - Name of the hook
   * @returns {number}
   */
  actionCount(hookName) {
    return this.hooks.has(hookName) ? this.hooks.get(hookName).length : 0;
  }

  /**
   * Get all registered hook names
   * @returns {string[]}
   */
  getRegisteredHooks() {
    return Array.from(this.registeredHooks);
  }

  /**
   * Get all active hook names (hooks with callbacks)
   * @returns {string[]}
   */
  getActiveHooks() {
    return Array.from(this.hooks.keys());
  }

  /**
   * Reset all hooks (useful for testing)
   */
  _resetHooks() {
    this.hooks.clear();
    console.log('⚠️  All hooks reset');
  }

  /**
   * Get hook statistics for debugging
   * @returns {Object}
   */
  getHookStats() {
    const stats = {
      registeredHooks: this.registeredHooks.size,
      activeHooks: this.hooks.size,
      totalCallbacks: 0,
      hooks: []
    };

    for (const [hookName, callbacks] of this.hooks.entries()) {
      stats.totalCallbacks += callbacks.length;
      stats.hooks.push({
        name: hookName,
        callbacks: callbacks.length,
        priorities: callbacks.map(c => c.priority)
      });
    }

    return stats;
  }
}

// Export singleton instance
module.exports = new HookRegistration();
