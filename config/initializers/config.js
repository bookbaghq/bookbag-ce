
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
var ragContext = require(`${master.root}/components/rag/app/models/ragContext`);
var pluginContext = require(`${master.root}/components/plugins/app/models/pluginContext`);
var adminContext = require(`${master.root}/components/admin/app/models/adminContext`);

const MailTemplateService = require(`${master.root}/components/mail/app/service/mailTemplateService`);
const MailDeliveryService = require(`${master.root}/components/mail/app/service/mailDeliveryService`);
const templateConfigPath = path.join(master.root, 'components', 'mail', 'config', 'mail-templates.json');
const hookService = require(`${master.root}/components/plugins/app/core/hookRegistration.js`);
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
master.addSingleton("ragContext", ragContext);
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

master.component("components", "user");
master.component("components", "chats");
master.component("components", "models");
master.component("components", "mail");
master.component("components", "workspace");
master.component("components", "media");
master.component("components", "rag");
master.component("components", "plugins");
master.component("components", "admin");



// register these apps to have access to them in the controller.
// example: master.register("mainContext", { anyobject : "name"});

// require as many components you need
// example: master.component("components", "auth");
