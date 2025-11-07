/**
 * Settings Component Routes
 * API endpoints for managing plugin/feature settings
 */

var master = require('mastercontroller');
var router = master.router.start();

// Settings API routes
router.route("api/admin/settings", "api/settings#getSettings", "get");
router.route("api/admin/settings", "api/settings#updateSettings", "post");

// Admin Sidebar API routes
router.route("api/layout/sidebar", "api/sidebar#getSidebar", "get");
router.route("api/layout/sidebar/current", "api/sidebar#getCurrentMenuItem", "get");
