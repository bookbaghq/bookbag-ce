/**
 * Plugin Management Plugin Routes
 * API endpoints for plugin page management and plugin CRUD operations
 *
 * TEMPORARILY COMMENTED OUT FOR DEBUGGING
 */

var master = require('mastercontroller');
var router = master.router.start();

// Plugin page API routes (deprecated - use views instead)
router.route("api/plugins/pages/check", "api/pluginPages#checkPage", "get");
router.route("api/plugins/pages/list", "api/pluginPages#listPages", "get");

// Plugin view API routes (WordPress-style admin views)
router.route("api/plugins/views/get", "api/pluginViews#getPluginView", "get");
router.route("api/plugins/views/list", "api/pluginViews#listViews", "get");

// Plugin component API routes (client-side components)
router.route("api/plugins/components/get", "api/pluginComponents#getComponent", "get");
router.route("api/plugins/components/list", "api/pluginComponents#listComponents", "get");

// Plugin management API routes (CRUD + activation with rebuild)
router.route("api/plugins/list", "api/pluginActivation#listPlugins", "get");
router.route("api/plugins/activate", "api/pluginActivation#activatePlugin", "post");
router.route("api/plugins/deactivate", "api/pluginActivation#deactivatePlugin", "post");
router.route("api/plugins/delete", "api/pluginActivation#deletePlugin", "delete");
