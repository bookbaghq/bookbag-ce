
//an example of using a slug
//router.route("/controller/action/:slug", "/controller/action", "get");

var master = require('mastercontroller')
var router = master.router.start(); // should get location from calling function

router.route("bb-user/api/profile/uploadAvatar", "api/profile#uploadAvatar", "post");
router.route("bb-user/api/profile/all", "api/profile#all", "get");
router.route("bb-user/api/profile/search", "api/profile#search", "get");
router.route("bb-user/api/myprofile", "api/profile#myprofile", "get");
router.route("bb-user/api/profile/:id", "api/profile#profile", "get");
router.route("bb-user/api/profile/save", "api/profile#save", "post");

router.route("bb-user/api/auth/currentuser", "api/auth#currentUser", "get");

router.route("bb-user/api/update", "api/user#update", "post");
router.route("bb-user/api/updateRoleUsers", "api/user#updateRoleUsers", "post");
router.route("bb-user/api/delete", "api/user#delete", "delete");
router.route("bb-user/api/create", "api/user#create", "post");

router.route("bb-user/api/auth/register", "api/credentials#register", "post");
router.route("bb-user/api/auth/login", "api/credentials#login", "post");
router.route("bb-user/api/auth/can-login", "api/credentials#canSignIn", "get");
router.route("bb-user/api/auth/forgetPassword", "api/credentials#resetPassword", "post");
router.route("bb-user/api/auth/changePassword", "api/credentials#changePassword", "post");
router.route("bb-user/api/auth/logout", "api/auth#logout", "get");

// Registration availability check
router.route("bb-user/api/auth/can-register", "api/credentials#canRegister", "get");

// Settings
router.route("bb-user/api/settings/get", "api/settings#get", "get");
router.route("bb-user/api/settings/save", "api/settings#save", "post");

