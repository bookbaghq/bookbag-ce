
//an example of using a slug
//router.route("/controller/action/:slug", "/controller/action", "get");

var master = require('mastercontroller')
var router = master.router.start(); // should get location from calling function

// Workspace API
router.route("bb-workspace/api/workspace", "api/workspace#list", "get");
router.route("bb-workspace/api/workspace/get", "api/workspace#get", "get");
router.route("bb-workspace/api/workspace/create", "api/workspace#create", "post");
router.route("bb-workspace/api/workspace/update", "api/workspace#update", "post");
router.route("bb-workspace/api/workspace/delete", "api/workspace#remove", "post");
router.route("bb-workspace/api/workspace/assign-users", "api/workspace#assignUsers", "post");
router.route("bb-workspace/api/workspace/assign-models", "api/workspace#assignModels", "post");
router.route("bb-workspace/api/my", "api/workspace#my", "get");
router.route("bb-workspace/api/workspace/chats", "api/workspace#chats", "get");
router.route("bb-workspace/api/workspace/chat/create", "api/workspace#createChat", "post");
// Given a chatId, return the list of allowed model IDs for any workspace that contains this chat
router.route("bb-workspace/api/chat/allowed-models", "api/workspace#chatAllowedModels", "get");
