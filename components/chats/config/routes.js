
//an example of using a slug
//router.route("/controller/action/:slug", "/controller/action", "get");

var master = require('mastercontroller')
var router = master.router.start(); // should get location from calling function

// Message API routes - Cleaned up to use proper service architecture  
// Only includes methods that actually exist in messageController
//router.route("bb-chat/api/message/sendUserStreaming", "api/message#sendMessageUserStreaming", "post");
//router.route("bb-chat/api/message/updateStreamingContent", "api/message#updateStreamingContent", "post");
router.route("bb-chat/api/message/getContextSize", "api/message#getContextSize", "post");

// DB-first approach routes for real ID management
router.route("bb-chat/api/message/createuser", "api/message#createUserMessage", "post");
// Removed HTTP streaming route in favor of WebSocket-based streaming
// router.route("bb-chat/api/message/startstreaming", "api/message#startAIStreaming", "post");

// Note: All model-related API routes are now handled in components/models/config/routes.js

// TPS (Tokens Per Second) API routes - Using dedicated TPSController and TPSService
router.route("bb-chat/api/tps/update", "api/tps#updateTps", "post");
router.route("bb-chat/api/tps/chat/:chatId", "api/tps#getChatTPSStats", "get");
router.route("bb-chat/api/tps/user/:userId", "api/tps#getUserTPSStats", "get");
router.route("bb-chat/api/tps/calculate", "api/tps#calculateTPS", "post");

// Note: The following routes have been removed as the methods no longer exist in messageController:
// - sendAI, testEndpoint, addData, getPage, getAllMessages, updateMessage, deleteMessage
// These should be implemented in appropriate controllers if needed

// Thinking API routes
router.route("bb-chat/api/thinking/create", "api/thinking#createThinkingSection", "post");
router.route("bb-chat/api/thinking/get/:messageId", "api/thinking#getThinkingSections", "get");
router.route("bb-chat/api/thinking/chat/:chatId", "api/thinking#getThinkingSectionsForChat", "get");
router.route("bb-chat/api/thinking/update/:thinkingId", "api/thinking#updateThinkingSection", "put");

// Chat API routes  
router.route("bb-chat/api/chat/create", "api/chat#createChat", "post");
router.route("bb-chat/api/chat/get", "api/chat#getChat", "get");
router.route("bb-chat/api/chat/edit", "api/chat#editChat", "put");

// New chat management API routes (must come BEFORE parameterized routes)
router.route("bb-chat/api/chat/recent", "api/chat#getRecentChats", "get");
router.route("bb-chat/api/chat/yesterday", "api/chat#getYesterdayChats", "get");
router.route("bb-chat/api/chat/sevendays", "api/chat#getSevenDayChats", "get");
router.route("bb-chat/api/chat/all", "api/chat#getAllChats", "get");
router.route("bb-chat/api/chat/admin-created", "api/chat#getAdminCreatedChats", "get");
router.route("bb-chat/api/chat/favorites", "api/chat#getFavoriteChats", "get");
router.route("bb-chat/api/chat/search", "api/chat#searchChats", "get");

// Favorites routes
router.route("bb-chat/api/favorites/toggle", "api/favorites#toggle", "post");
router.route("bb-chat/api/favorites/status", "api/favorites#getStatus", "get");
router.route("bb-chat/api/favorites/list", "api/favorites#getFavorites", "get");

// Admin chat management API routes (admin-only)
router.route("bb-chat/api/admin/chat/search", "api/adminChat#adminSearchChats", "get");
router.route("bb-chat/api/admin/chat/:chatId", "api/adminChat#adminGetChatById", "get");
router.route("bb-chat/api/admin/chat/:chatId", "api/adminChat#adminDeleteChat", "delete");
router.route("bb-chat/api/admin/chat/create", "api/adminChat#createChat", "post");

// Archive route (must come before parameterized GET route)
router.route("bb-chat/api/chat/:chatId/archive", "api/chat#archiveChat", "patch");

// Delete route (must come before parameterized GET route)
router.route("bb-chat/api/chat/:chatId", "api/chat#deleteChat", "delete");

// Parameterized route must come LAST to avoid catching specific routes
router.route("bb-chat/api/chat/:chatId", "api/chat#getChatById", "get");
