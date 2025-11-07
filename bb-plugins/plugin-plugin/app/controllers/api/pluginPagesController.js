const master = require('mastercontroller');
const path = require('path');
const fs = require('fs');
const url = require('url');

/**
 * Plugin Pages Controller
 * Provides API endpoints for querying and loading plugin pages
 */
class pluginPagesController {
  returnJson(obj) {
    return obj;
  }

  /**
   * Check if a plugin provides a page for a given route
   * GET /api/plugins/pages/check?route=/bb-admin/rag/settings
   *
   * Returns:
   * {
   *   exists: true,
   *   pluginName: 'rag-plugin',
   *   componentPath: 'pages/admin/rag/settings/page.js',
   *   fullPath: '/absolute/path/to/plugin/page.js'
   * }
   */
  async checkPage(req, res) {
    try {
      // MasterController passes the actual HTTP request in req.request
      const httpRequest = req.request;
      const parsedUrl = url.parse(httpRequest.url, true);
      const queryParams = parsedUrl.query;

      const route = queryParams.route;

      if (!route) {
        return this.returnJson({
          success: false,
          error: 'Missing route parameter'
        });
      }

      // Get pluginLoader from master
      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available'
        });
      }

      // Check if plugin provides this page
      const pageInfo = pluginLoader.getPluginPage(route);

      if (!pageInfo) {
        return this.returnJson({
          success: true,
          exists: false,
          route
        });
      }

      // Check if file actually exists
      const fileExists = fs.existsSync(pageInfo.fullPath);

      return this.returnJson({
        success: true,
        exists: fileExists,
        route,
        pluginName: pageInfo.pluginName,
        componentPath: pageInfo.componentPath,
        fullPath: pageInfo.fullPath
      });
    } catch (error) {
      console.error('Error checking plugin page:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all registered plugin pages
   * GET /api/plugins/pages/list
   *
   * Returns:
   * {
   *   success: true,
   *   pages: [
   *     { route: '/bb-admin/rag/settings', pluginName: 'rag-plugin', ... },
   *     ...
   *   ]
   * }
   */
  async listPages(req, res) {
    try {
      // Get pluginLoader from master
      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available'
        });
      }

      const registeredPages = pluginLoader.getRegisteredPages();
      const pages = [];

      // Convert Map to array
      for (const [route, pageInfo] of registeredPages) {
        pages.push({
          route,
          pluginName: pageInfo.pluginName,
          componentPath: pageInfo.componentPath,
          fullPath: pageInfo.fullPath,
          exists: fs.existsSync(pageInfo.fullPath)
        });
      }

      return this.returnJson({
        success: true,
        count: pages.length,
        pages
      });
    } catch (error) {
      console.error('Error listing plugin pages:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = pluginPagesController;
