/**
 * API Component Routes
 * Routes for API key management, sessions, and external access
 */

var master = require('mastercontroller');
var router = master.router.start();

// API Management routes (Admin)
router.route("api/api/list", "api/api#list", "get");
router.route("api/api/:id", "api/api#get", "get");
router.route("api/api", "api/api#create", "post");
router.route("api/api/:id", "api/api#update", "put");
router.route("api/api/:id", "api/api#delete", "delete");
router.route("api/api/:id/toggle", "api/api#toggle", "post");
router.route("api/api/:id/regenerate", "api/api#regenerate", "post");

// Session Management routes (Admin)
router.route("api/api/sessions/list", "api/session#list", "get");
router.route("api/api/sessions/:id", "api/session#get", "get");
router.route("api/api/sessions/:id", "api/session#delete", "delete");
router.route("api/api/sessions/:api_id/clear", "api/session#clearByApi", "post");

// Settings routes (Admin)
router.route("api/api/settings", "api/settings#get", "get");
router.route("api/api/settings", "api/settings#update", "post");

// External API routes (Public)
router.route("api/external/:api_key/chat", "api/external#chat", "post");
router.route("api/external/:api_key/session/:session_id", "api/external#getSession", "get");
router.route("api/external/:api_key/session/:session_id/clear", "api/external#clearSession", "post");
