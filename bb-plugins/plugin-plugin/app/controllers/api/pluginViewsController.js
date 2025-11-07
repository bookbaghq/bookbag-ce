/**
 * Plugin Views Controller
 * API endpoints for querying registered plugin admin views
 *
 * WordPress Equivalent: Similar to admin.php?page= resolution
 */

const master = require('mastercontroller');

class pluginViewsController {
  returnJson(obj) {
    return obj;
  }

  /**
   * Get view information by slug
   * GET /api/plugins/views/get?slug=rag-settings
   */
  async getPluginView(req, res) {
    try {
      // Sanitize input - ensure we're receiving request object, not a string path from base class
      // This prevents conflict with MasterAction.getView(location, data)
      const slug =
        typeof req === 'string'
          ? req
          : req.query?.slug || req.request?.url?.split('slug=')[1]?.split('&')[0];

      if (!slug || typeof slug !== 'string') {
        return this.returnJson({
          success: false,
          error: 'Missing or invalid slug parameter'
        });
      }

      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available'
        });
      }

      const viewInfo = pluginLoader.getView(slug);

      if (!viewInfo) {
        return this.returnJson({
          success: false,
          error: `View not found: ${slug}`,
          slug
        });
      }

      return this.returnJson({
        success: true,
        view: viewInfo
      });
    } catch (error) {
      console.error('Error getting plugin view:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List all registered views
   * GET /api/plugins/views/list
   */
  async listViews(req, res) {
    try {
      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available'
        });
      }

      const views = pluginLoader.getRegisteredViews();
      const viewsArray = Array.from(views.values());

      return this.returnJson({
        success: true,
        views: viewsArray,
        count: viewsArray.length
      });
    } catch (error) {
      console.error('Error listing plugin views:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = pluginViewsController;
