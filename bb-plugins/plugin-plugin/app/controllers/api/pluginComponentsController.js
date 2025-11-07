/**
 * Plugin Components Controller
 * API endpoints for querying registered plugin client components
 *
 * WordPress Equivalent: Similar to dynamic widget/sidebar registration
 */

const master = require('mastercontroller');

class pluginComponentsController {
  returnJson(obj) {
    return obj;
  }

  /**
   * Get client components by usage type
   * GET /api/plugins/components/list?usage=sidebar-left
   */
  async listComponents(req, res) {
    try {
      const usage = req.query?.usage || req.request?.url?.split('usage=')[1]?.split('&')[0];

      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available'
        });
      }

      let components;
      if (usage) {
        // Filter by usage type
        components = pluginLoader.getClientComponentsByUsage(usage);
      } else {
        // Return all components
        const componentsMap = pluginLoader.getRegisteredClientComponents();
        components = Array.from(componentsMap.entries()).map(([name, info]) => ({
          name,
          ...info
        }));
      }

      return this.returnJson({
        success: true,
        components,
        count: components.length,
        usage: usage || 'all'
      });
    } catch (error) {
      console.error('Error listing plugin components:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get a specific client component by name
   * GET /api/plugins/components/get?name=KnowledgeBaseSidebar
   */
  async getComponent(req, res) {
    try {
      const name = req.query?.name || req.request?.url?.split('name=')[1]?.split('&')[0];

      if (!name) {
        return this.returnJson({
          success: false,
          error: 'Missing name parameter'
        });
      }

      const pluginLoader = master.requestList.pluginLoader;

      if (!pluginLoader) {
        return this.returnJson({
          success: false,
          error: 'Plugin loader not available'
        });
      }

      const component = pluginLoader.getClientComponent(name);

      if (!component) {
        return this.returnJson({
          success: false,
          error: `Component not found: ${name}`,
          name
        });
      }

      return this.returnJson({
        success: true,
        component: {
          name,
          ...component
        }
      });
    } catch (error) {
      console.error('Error getting plugin component:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = pluginComponentsController;
