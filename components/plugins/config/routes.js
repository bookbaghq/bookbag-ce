
var master = require('mastercontroller')
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
router.route("api/plugins/active", "api/pluginActivation#getActivePluginBundles", "get");
router.route("api/plugins/readme", "api/pluginActivation#getPluginReadme", "get");
router.route("api/plugins/activate", "api/pluginActivation#activatePlugin", "post");
router.route("api/plugins/deactivate", "api/pluginActivation#deactivatePlugin", "post");
router.route("api/plugins/delete", "api/pluginActivation#deletePlugin", "delete");

// Plugin installation API routes (WordPress-style upload/install)
router.route("api/plugins/upload", "api/pluginInstallation#uploadPlugin", "post");
router.route("api/plugins/uninstall", "api/pluginInstallation#uninstallPlugin", "delete");
router.route("api/plugins/validate", "api/pluginInstallation#validatePlugin", "post");

// Plugin migration history API routes
router.route("api/plugins/migrations/history", "api/migrationHistory#getHistory", "get");
router.route("api/plugins/migrations/stats", "api/migrationHistory#getStats", "get");
router.route("api/plugins/migrations/:id", "api/migrationHistory#getById", "get");

// Hooks inspector API routes (Developer Tools)
router.route("api/plugins/hooks/stats", "api/hooksInspector#getStats", "get");
router.route("api/plugins/hooks/detail", "api/hooksInspector#getHookDetail", "get");
router.route("api/plugins/hooks/list", "api/hooksInspector#listHooks", "get");
