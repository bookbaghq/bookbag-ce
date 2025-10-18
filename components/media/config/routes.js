var master = require('mastercontroller')
var router = master.router.start();

// Media Management API routes
// Test endpoint
router.route("bb-media/api/media/test", "api/media#test", "get");

// Upload a file
router.route("bb-media/api/media/upload", "api/media#uploadFile", "post");

// Upload an image for vision/analysis
router.route("bb-media/api/media/upload-image", "api/media#uploadImage", "post");

// Analyze image with LLM
router.route("bb-media/api/media/analyze-image", "api/media#analyzeImage", "post");

// Save generated image from LLM (OpenAI/Grok)
router.route("bb-media/api/media/save-generated-image", "api/media#saveGeneratedImage", "post");

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

// Get unsent images for a chat (images with chat_id but no message_id)
router.route("bb-media/api/media/unsent-images/:chatId", "api/media#getUnsentImages", "get");

// Link images to a message (set message_id for images)
router.route("bb-media/api/media/link-images-to-message", "api/media#linkImagesToMessage", "post");

// Serve image by ID (must come before delete route)
router.route("bb-media/api/media/image/:id", "api/media#serveImage", "get");

// Delete a media file by ID (must come after other routes to avoid catching them)
router.route("bb-media/api/media/delete/:id", "api/media#deleteFile", "delete");
