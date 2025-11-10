
var master = require('mastercontroller');
var mimes = require('./mime.json');
var request = require('./request.json');
var cors = require('./cors.json');
const mapObject = require('object-mapper');
const path = require('path');

var _viewService = require(`${master.root}/app/service/viewService`);

var userContext = require(`${master.root}/components/user/app/models/userContext`);
var chatContext = require(`${master.root}/components/chats/app/models/chatContext`);
var modelContext = require(`${master.root}/components/models/app/models/modelContext`);
var mailContext = require(`${master.root}/components/mail/app/models/mailContext`);
var workspaceContext = require(`${master.root}/components/workspace/app/models/workspaceContext`);
var mediaContext = require(`${master.root}/components/media/app/models/mediaContext`);
var pluginContext = require(`${master.root}/components/plugins/app/models/pluginContext`);
var adminContext = require(`${master.root}/components/admin/app/models/adminContext`);

// mail services
const MailTemplateService = require(`${master.root}/components/mail/app/service/mailTemplateService`);
const MailDeliveryService = require(`${master.root}/components/mail/app/service/mailDeliveryService`);
const templateConfigPath = path.join(master.root, 'components', 'mail', 'config', 'mail-templates.json');

// hook services
const hookService = require(`${master.root}/components/plugins/app/core/hookRegistration.js`);
const { initializeCoreHooks, HOOKS } = require(`${master.root}/components/plugins/app/core/hookInitializer.js`);
const pluginLoader = require(`${master.root}/components/plugins/app/core/pluginLoader.js`);

// initlaizing the tools we need for Master to run properly
master.serverSettings(master.env.server);
master.request.init(request);
master.error.init(master.env.error);
master.router.addMimeList(mimes);

// Initialize Socket.IO via MasterSocket (auto-loads CORS from config/initializers/cors.json)
master.socket.init();
master.sessions.init();
master.cors.init(cors);
master.startMVC("config");


master.extendView("viewService", _viewService); // extends view controller


// register auth context
master.addSingleton("userContext", userContext);
master.addSingleton("chatContext", chatContext);
master.addSingleton("modelContext", modelContext);
master.addSingleton("mailContext", mailContext);
master.addSingleton("workspaceContext", workspaceContext);
master.addSingleton("mediaContext", mediaContext);
master.addSingleton("pluginContext", pluginContext);
master.addSingleton("adminContext", adminContext);
master.register("_mapper", mapObject);

// Initialize and register mail services so controllers can use them
const templateService = new MailTemplateService(templateConfigPath);
const deliveryService = new MailDeliveryService(mailContext);

// Register instances (not constructors)
master.register('mailTemplateService', templateService);
master.register('mailDeliveryService', deliveryService);
master.register('hookService', hookService);
master.register('pluginLoader', pluginLoader);

master.component("components", "user");
master.component("components", "chats");
master.component("components", "models");
master.component("components", "mail");
master.component("components", "workspace");
master.component("components", "media");
master.component("components", "plugins");
// master.component("components", "rag"); // Now loaded as a plugin
master.component("components", "admin");

// ============================================================================
// BOOKBAG HOOK SYSTEM INITIALIZATION
// ============================================================================

// Initialize core hooks (register all hook names)
initializeCoreHooks();

// Fire bookbag_init hook - early initialization phase
hookService.doAction(HOOKS.CORE_INIT, {
  master,
  environment: process.env.master
});

// Load all active plugins from database
// Plugins can register their hooks during this phase
pluginLoader.loadActivePlugins();

// After plugins are loaded, regenerate Next.js loader
// This ensures the loader.js file has the latest component registrations
(async () => {
  try {
    const loaderGenerator = require(`${master.root}/components/plugins/app/core/loaderGenerator.js`);

    // Get all registered client components
    const registeredComponents = pluginLoader.getRegisteredClientComponents();

    // Generate loader.js file for Next.js static imports
    console.log('📝 Generating Next.js plugin loader...');
    const result = await loaderGenerator.generateLoader(registeredComponents);

    if (result.success) {
      console.log(`✓ Plugin loader generated with ${result.componentCount} component(s)`);
    } else {
      console.error('✗ Failed to generate plugin loader:', result.error);
    }
  } catch (error) {
    console.error('✗ Error generating plugin loader:', error.message);
  }
})();

// Fire bookbag_ready hook - system fully loaded and ready
hookService.doAction(HOOKS.CORE_READY, {
  master,
  pluginLoader,
  loadedPlugins: pluginLoader.getLoadedPlugins()
});

hookService.doAction(HOOKS.CORE_SHUTDOWN, { master });
hookService.doAction(HOOKS.CORE_SHUTDOWN, { master });

// ============================================================================
// STATIC FILE SERVING FOR PLUGIN FILES
// ============================================================================
// Serve /bb-plugins directory statically so dynamic imports can access plugin files
const fs = require('fs');
const url = require('url');

master.loaded(() => {
  const originalEmit = master.server.emit;

  master.server.emit = function(event, req, res) {
    if (event === 'request') {
      const parsedUrl = url.parse(req.url);

      // Check if request is for bb-plugins directory
      if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/bb-plugins/')) {
        const filePath = path.join(master.root, parsedUrl.pathname);

        // Security: Ensure the resolved path is still within bb-plugins
        const resolvedPath = path.resolve(filePath);
        const pluginsDir = path.resolve(master.root, 'bb-plugins');

        if (resolvedPath.startsWith(pluginsDir)) {
          fs.readFile(resolvedPath, (err, data) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('File not found');
            } else {
              // Determine MIME type
              const ext = path.extname(resolvedPath);
              let contentType = 'text/plain';

              if (ext === '.js') contentType = 'application/javascript';
              else if (ext === '.json') contentType = 'application/json';
              else if (ext === '.css') contentType = 'text/css';
              else if (ext === '.html') contentType = 'text/html';

              res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Cross-Origin-Resource-Policy': 'cross-origin'
              });
              res.end(data);
            }
          });
          return; // Don't call original emit
        }
      }
    }

    // For all other requests, call original emit
    originalEmit.apply(this, arguments);
  };

  // CRITICAL: Return true so master.router.load() gets called
  return true;
});
