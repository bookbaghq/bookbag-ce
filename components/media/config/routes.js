var master = require('mastercontroller')
var router = master.router.start();

// Media Management API routes
// Upload a file
router.route("bb-media/api/media/upload", "api/media#uploadFile", "post");

// List all media files
router.route("bb-media/api/media/list", "api/media#listFiles", "get");

// Search media files
router.route("bb-media/api/media/search", "api/media#searchFiles", "get");

// Get storage statistics
router.route("bb-media/api/media/stats", "api/media#getStats", "get");

// Get storage usage with limit
router.route("bb-media/api/media/storage", "api/media#getStorageUsage", "get");

// Get media settings
router.route("bb-media/api/media/settings", "api/media#getSettings", "get");

// Update media settings
router.route("bb-media/api/media/settings", "api/media#updateSettings", "post");

// Delete a media file by ID (must come after other routes to avoid catching them)
router.route("bb-media/api/media/delete/:id", "api/media#deleteFile", "delete");
