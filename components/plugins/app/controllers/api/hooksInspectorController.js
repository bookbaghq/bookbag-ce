/**
 * Hooks Inspector Controller
 * API endpoints for viewing active hooks and their registrations
 *
 * WordPress Equivalent: Similar to Query Monitor plugin's Hooks & Actions tab
 */

const master = require('mastercontroller');
const { HOOKS, getHooksByCategory } = require('../../core/hookConstants');

class hooksInspectorController {

  constructor(req) {
    this._currentUser = req.authService.currentUser(req.request, req.userContext);
  }

  returnJson(obj) {
    return obj;
  }

  /**
   * Get comprehensive hook statistics and registrations
   * GET /api/plugins/hooks/stats
   */
  async getStats(req, res) {
    try {
      const hookService = master.requestList.hookService;

      if (!hookService) {
        return this.returnJson({
          success: false,
          error: 'Hook service not available'
        });
      }

      // Get all hook names from HOOKS constants
      const allHooks = Object.entries(HOOKS);

      const hooksByCategory = {
        lifecycle: [],
        admin: [],
        chat: [],
        client: [],
        user: [],
        database: [],
        api: [],
        scheduler: [],
        media: [],
        system: []
      };

      const stats = {
        totalHooks: allHooks.length,
        activeHooks: 0,
        totalCallbacks: 0,
        byCategory: {}
      };

      // Process each hook
      for (const [hookName, hookConstant] of allHooks) {
        const hasCallbacks = hookService.hasAction(hookConstant);
        const callbacks = hasCallbacks ? this._getHookCallbacks(hookService, hookConstant) : [];

        if (callbacks.length > 0) {
          stats.activeHooks++;
          stats.totalCallbacks += callbacks.length;
        }

        const hookInfo = {
          name: hookName,
          constant: hookConstant,
          hasCallbacks,
          callbackCount: callbacks.length,
          callbacks: callbacks.map(cb => ({
            plugin: cb.plugin || 'core',
            priority: cb.priority || 10,
            functionName: cb.functionName || 'anonymous'
          }))
        };

        // Categorize hooks
        const category = this._categorizeHook(hookName);
        if (hooksByCategory[category]) {
          hooksByCategory[category].push(hookInfo);
        }
      }

      // Calculate stats by category
      for (const [category, hooks] of Object.entries(hooksByCategory)) {
        stats.byCategory[category] = {
          total: hooks.length,
          active: hooks.filter(h => h.hasCallbacks).length,
          callbacks: hooks.reduce((sum, h) => sum + h.callbackCount, 0)
        };
      }

      return this.returnJson({
        success: true,
        stats,
        hooks: hooksByCategory,
        meta: {
          generated_at: Date.now(),
          hookServiceActive: !!hookService
        }
      });

    } catch (error) {
      console.error('Failed to fetch hook stats:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get details for a specific hook
   * GET /api/plugins/hooks/detail?hook=HOOKS.ADMIN_MENU
   */
  async getHookDetail(req, res) {
    try {
      const { hook } = req.params?.urlData || {};

      if (!hook) {
        return this.returnJson({
          success: false,
          error: 'Hook name is required'
        });
      }

      const hookService = master.requestList.hookService;

      if (!hookService) {
        return this.returnJson({
          success: false,
          error: 'Hook service not available'
        });
      }

      const hasCallbacks = hookService.hasAction(hook);
      const callbacks = hasCallbacks ? this._getHookCallbacks(hookService, hook) : [];

      return this.returnJson({
        success: true,
        hook: {
          constant: hook,
          hasCallbacks,
          callbackCount: callbacks.length,
          callbacks: callbacks.map(cb => ({
            plugin: cb.plugin || 'core',
            priority: cb.priority || 10,
            functionName: cb.functionName || 'anonymous',
            registeredAt: cb.registeredAt || null
          }))
        }
      });

    } catch (error) {
      console.error('Failed to fetch hook detail:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get list of all available hooks with their descriptions
   * GET /api/plugins/hooks/list
   */
  async listHooks(req, res) {
    try {
      const { category } = req.params?.urlData || {};

      let hooks = Object.entries(HOOKS).map(([name, constant]) => ({
        name,
        constant,
        category: this._categorizeHook(name)
      }));

      // Filter by category if specified
      if (category) {
        hooks = hooks.filter(h => h.category === category.toLowerCase());
      }

      return this.returnJson({
        success: true,
        hooks,
        count: hooks.length,
        categories: ['lifecycle', 'admin', 'chat', 'client', 'user', 'database', 'api', 'scheduler', 'media', 'system']
      });

    } catch (error) {
      console.error('Failed to list hooks:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Helper: Extract callback information from hook service
   * @private
   */
  _getHookCallbacks(hookService, hookConstant) {
    try {
      // Access internal hooks registry
      // Note: This depends on hookService implementation
      const hooks = hookService.hooks || {};
      const actions = hooks[hookConstant] || [];

      return actions.map((action, index) => {
        const callback = action.callback || action.fn || action;
        return {
          priority: action.priority || 10,
          plugin: action.plugin || this._inferPluginFromCallback(callback),
          functionName: callback.name || `callback_${index}`,
          registeredAt: action.registeredAt || null
        };
      });
    } catch (error) {
      console.error(`Error getting callbacks for ${hookConstant}:`, error);
      return [];
    }
  }

  /**
   * Helper: Infer plugin name from callback function
   * @private
   */
  _inferPluginFromCallback(callback) {
    try {
      const fnString = callback.toString();
      // Try to extract plugin name from function context or comments
      if (fnString.includes('rag-plugin') || fnString.includes('ragPlugin')) return 'rag-plugin';
      if (fnString.includes('admin-plugin') || fnString.includes('adminPlugin')) return 'admin-plugin';
      if (fnString.includes('tokens-plugin') || fnString.includes('tokensPlugin')) return 'tokens-plugin';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Helper: Categorize hook by its name prefix
   * @private
   */
  _categorizeHook(hookName) {
    const name = hookName.toLowerCase();

    if (name.includes('core') || name.includes('init') || name.includes('ready') || name.includes('shutdown') || name.includes('rebuild') || name.includes('env')) {
      return 'lifecycle';
    }
    if (name.includes('admin')) {
      return 'admin';
    }
    if (name.includes('chat') || name.includes('message') || name.includes('llm') || name.includes('stream') || name.includes('pipeline')) {
      return 'chat';
    }
    if (name.includes('client') || name.includes('render')) {
      return 'client';
    }
    if (name.includes('user') || name.includes('auth') || name.includes('login') || name.includes('logout') || name.includes('register')) {
      return 'user';
    }
    if (name.includes('migration') || name.includes('context') || name.includes('database') || name.includes('db')) {
      return 'database';
    }
    if (name.includes('api') || name.includes('request') || name.includes('response')) {
      return 'api';
    }
    if (name.includes('scheduler') || name.includes('cron') || name.includes('job')) {
      return 'scheduler';
    }
    if (name.includes('media') || name.includes('upload') || name.includes('storage') || name.includes('file')) {
      return 'media';
    }

    return 'system';
  }

}

module.exports = hooksInspectorController;
