
//an example of using a slug
//router.route("/controller/action/:slug", "/controller/action", "get");

var master = require('mastercontroller')
var router = master.router.start(); // should get location from calling function

// Mail API routes
router.route("bb-mail/api/logs", "api/mail#logs", "get");
router.route("bb-mail/api/logs/:id", "api/mail#deleteLog", "delete");
router.route("bb-mail/api/send-test", "api/mail#sendTest", "post");
router.route("bb-mail/api/send", "api/mail#send", "post");
router.route("bb-mail/api/settings", "api/mailSettings#get", "get");
router.route("bb-mail/api/settings/save", "api/mailSettings#save", "post");
router.route("bb-mail/api/smtp", "api/mailSettings#listSmtp", "get");
router.route("bb-mail/api/smtp/save", "api/mailSettings#saveSmtp", "post");