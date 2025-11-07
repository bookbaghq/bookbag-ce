/**
 * Hook Registration Service
 * Central registry for all hooks in the system
 * This service is registered with master and accessible to all controllers
 * Similar to WordPress's plugin API with add_action, do_action, add_filter, apply_filters
 *
 * HOOK TYPES:
 * - Actions: Execute callbacks without returning a value (do_action)
 * - Filters: Pass data through callbacks and return modified value (apply_filters)
 */

class HookRegistration {
  constructor() {
    // Map of action hook name -> array of callbacks with priorities
    this.actions = new Map();

    // Map of filter hook name -> array of callbacks with priorities
    this.filters = new Map();

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
   * Add a callback function to an action hook
   * WordPress equivalent: add_action($hook, $callback, $priority)
   * @param {string} hookName - Name of the hook
   * @param {Function} callback - Function to call when hook fires
   * @param {number} priority - Execution priority (lower runs first)
   */
  addAction(hookName, callback, priority = 10) {
    if (!this.actions.has(hookName)) {
      this.actions.set(hookName, []);
    }

    this.actions.get(hookName).push({ callback, priority });

    // Keep sorted by priority (low to high)
    this.actions.get(hookName).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a specific callback from an action hook
   * WordPress equivalent: remove_action($hook, $callback)
   * @param {string} hookName - Name of the hook
   * @param {Function} callback - The exact function to remove
   */
  removeAction(hookName, callback) {
    if (!this.actions.has(hookName)) return;

    const list = this.actions.get(hookName);
    const index = list.findIndex(h => h.callback === callback);

    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  /**
   * Execute all callbacks registered for an action hook
   * WordPress equivalent: do_action($hook, $args)
   * @param {string} hookName - Name of the hook to fire
   * @param {Object} context - Context object passed to all callbacks
   * @returns {Promise<void>}
   */
  async doAction(hookName, context = {}) {
    const list = this.actions.get(hookName) || [];

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
   * Check if an action hook has any registered callbacks
   * WordPress equivalent: has_action($hook)
   * @param {string} hookName - Name of the hook
   * @returns {boolean}
   */
  hasAction(hookName) {
    return this.actions.has(hookName) && this.actions.get(hookName).length > 0;
  }

  /**
   * Get count of callbacks for an action hook
   * @param {string} hookName - Name of the hook
   * @returns {number}
   */
  actionCount(hookName) {
    return this.actions.has(hookName) ? this.actions.get(hookName).length : 0;
  }

  // ============================================================================
  // FILTER METHODS
  // ============================================================================

  /**
   * Add a callback function to a filter hook
   * WordPress equivalent: add_filter($hook, $callback, $priority)
   * @param {string} hookName - Name of the filter hook
   * @param {Function} callback - Function that receives and returns modified value
   * @param {number} priority - Execution priority (lower runs first)
   */
  addFilter(hookName, callback, priority = 10) {
    if (!this.filters.has(hookName)) {
      this.filters.set(hookName, []);
    }

    this.filters.get(hookName).push({ callback, priority });

    // Keep sorted by priority (low to high)
    this.filters.get(hookName).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a specific callback from a filter hook
   * WordPress equivalent: remove_filter($hook, $callback)
   * @param {string} hookName - Name of the filter hook
   * @param {Function} callback - The exact function to remove
   */
  removeFilter(hookName, callback) {
    if (!this.filters.has(hookName)) return;

    const list = this.filters.get(hookName);
    const index = list.findIndex(h => h.callback === callback);

    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  /**
   * Apply filters to a value and return the modified result
   * WordPress equivalent: apply_filters($hook, $value, $args)
   * @param {string} hookName - Name of the filter hook to apply
   * @param {*} value - The value to be filtered
   * @param {...*} args - Additional arguments passed to filter callbacks
   * @returns {Promise<*>} The filtered value
   */
  async applyFilters(hookName, value, ...args) {
    const list = this.filters.get(hookName) || [];
    let filteredValue = value;

    for (const { callback } of list) {
      try {
        // Pass current filtered value and any additional args
        // Allow async filter callbacks
        filteredValue = await callback(filteredValue, ...args);
      } catch (error) {
        console.error(`Error in filter hook '${hookName}':`, error);
        // On error, return the last valid value (don't break the chain)
      }
    }

    return filteredValue;
  }

  /**
   * Check if a filter hook has any registered callbacks
   * WordPress equivalent: has_filter($hook)
   * @param {string} hookName - Name of the filter hook
   * @returns {boolean}
   */
  hasFilter(hookName) {
    return this.filters.has(hookName) && this.filters.get(hookName).length > 0;
  }

  /**
   * Get count of callbacks for a filter hook
   * @param {string} hookName - Name of the filter hook
   * @returns {number}
   */
  filterCount(hookName) {
    return this.filters.has(hookName) ? this.filters.get(hookName).length : 0;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get all registered hook names
   * @returns {string[]}
   */
  getRegisteredHooks() {
    return Array.from(this.registeredHooks);
  }

  /**
   * Get all active hook names (actions and filters with callbacks)
   * @returns {Object} Object with actions and filters arrays
   */
  getActiveHooks() {
    return {
      actions: Array.from(this.actions.keys()),
      filters: Array.from(this.filters.keys())
    };
  }

  /**
   * Reset all hooks (useful for testing)
   */
  _resetHooks() {
    this.actions.clear();
    this.filters.clear();
    console.log('⚠️  All hooks reset');
  }

  /**
   * Get hook statistics for debugging
   * @returns {Object}
   */
  getHookStats() {
    const stats = {
      registeredHooks: this.registeredHooks.size,
      activeActions: this.actions.size,
      activeFilters: this.filters.size,
      totalActionCallbacks: 0,
      totalFilterCallbacks: 0,
      actions: [],
      filters: []
    };

    for (const [hookName, callbacks] of this.actions.entries()) {
      stats.totalActionCallbacks += callbacks.length;
      stats.actions.push({
        name: hookName,
        callbacks: callbacks.length,
        priorities: callbacks.map(c => c.priority)
      });
    }

    for (const [hookName, callbacks] of this.filters.entries()) {
      stats.totalFilterCallbacks += callbacks.length;
      stats.filters.push({
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
