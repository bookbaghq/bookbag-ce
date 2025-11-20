/**
 * Migration History Controller
 * API endpoints for viewing plugin migration history and logs
 *
 * WordPress Equivalent: Similar to WP Site Health > Database Updates
 */

const master = require('mastercontroller');

class migrationHistoryController {

  constructor(req) {
    this._currentUser = req.authService.currentUser(req.request, req.userContext);
    this._pluginContext = req.pluginContext;
  }

  returnJson(obj) {
    return obj;
  }

  /**
   * Get migration history for all plugins or a specific plugin
   * GET /api/plugins/migrations/history
   * Query params: ?plugin=rag-plugin&status=failed&limit=50
   */
  async getHistory(req, res) {
    try {
      const { plugin, status, limit = 50 } = req.params?.urlData || {};

      const query = this._pluginContext.pluginMigrationLog.where();

      // Filter by plugin if specified
      if (plugin) {
        query.equal('plugin', plugin);
      }

      // Filter by status if specified
      if (status) {
        query.equal('status', status);
      }

      // Order by ran_at descending (newest first)
      query.orderBy('ran_at', 'DESC');

      // Limit results
      query.limit(parseInt(limit));

      const logs = await this._pluginContext.pluginMigrationLog.find(query);

      return this.returnJson({
        success: true,
        data: logs,
        count: logs.length
      });

    } catch (error) {
      console.error('Failed to fetch migration history:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get migration statistics
   * GET /api/plugins/migrations/stats
   */
  async getStats(req, res) {
    try {
      const allLogs = await this._pluginContext.pluginMigrationLog.findAll();

      const stats = {
        total: allLogs.length,
        success: allLogs.filter(log => log.status === 'success').length,
        failed: allLogs.filter(log => log.status === 'failed').length,
        byPlugin: {}
      };

      // Group by plugin
      allLogs.forEach(log => {
        if (!stats.byPlugin[log.plugin]) {
          stats.byPlugin[log.plugin] = {
            total: 0,
            success: 0,
            failed: 0,
            lastRun: null
          };
        }

        stats.byPlugin[log.plugin].total++;
        if (log.status === 'success') {
          stats.byPlugin[log.plugin].success++;
        } else if (log.status === 'failed') {
          stats.byPlugin[log.plugin].failed++;
        }

        // Track most recent run
        if (!stats.byPlugin[log.plugin].lastRun ||
            parseInt(log.ran_at) > parseInt(stats.byPlugin[log.plugin].lastRun)) {
          stats.byPlugin[log.plugin].lastRun = log.ran_at;
        }
      });

      return this.returnJson({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Failed to fetch migration stats:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get a specific migration log by ID
   * GET /api/plugins/migrations/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params?.urlData || {};

      if (!id) {
        return this.returnJson({
          success: false,
          error: 'Missing migration log ID'
        });
      }

      const log = await this._pluginContext.pluginMigrationLog.findById(parseInt(id));

      if (!log) {
        return this.returnJson({
          success: false,
          error: 'Migration log not found'
        });
      }

      return this.returnJson({
        success: true,
        data: log
      });

    } catch (error) {
      console.error('Failed to fetch migration log:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

}

module.exports = migrationHistoryController;
