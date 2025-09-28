
//an example of using a slug
//router.route("/controller/action/:slug", "/controller/action", "get");

var master = require('mastercontroller')
var router = master.router.start(); // should get location from calling function

// Models API routes - Using modelsController with ModelService
router.route("bb-models/api/models", "api/models#getModels", "get");
router.route("bb-models/api/models/publish", "api/models#setPublished", "post");
// Published models list used by chat UI
router.route("bb-models/api/models/published", "api/models#getPublishedModels", "get");
router.route("bb-models/api/models/get", "api/models#getModelById", "get");
router.route("bb-models/api/models/update", "api/models#updateModel", "post");
router.route("bb-models/api/models/defaults", "api/models#getModelDefaults", "get");
router.route("bb-models/api/models/cpu", "api/models#getCpuInfo", "get");
router.route("bb-models/api/models/create-vllm", "api/models#createServerModel", "post");
router.route("bb-models/api/model/delete", "api/models#deleteModel", "post");

router.route("bb-models/api/prompt-templates/list", "api/promptTemplates#list", "get");

router.route("bb-models/api/stopstrings/add", "api/stopStrings#add", "post");
router.route("bb-models/api/stopstrings/delete", "api/stopStrings#delete", "post");

// StartThinkingStrings management
router.route("bb-models/api/thinking-strings/list", "api/thinking#list", "get");
router.route("bb-models/api/thinking-strings/add", "api/thinking#add", "post");
router.route("bb-models/api/thinking-strings/delete", "api/thinking#delete", "post");

router.route("bb-models/api/oa/models", "api/oa#list", "get");
router.route("bb-models/api/oa/install", "api/oa#install", "post");
router.route("bb-models/api/grok/models", "api/grok#list", "get");
router.route("bb-models/api/grok/install", "api/grok#install", "post");

router.route("bb-models/api/profiles/fields", "api/profiles#fields", "get");
router.route("bb-models/api/profiles/overrides/save", "api/profiles#saveOverrides", "post");
router.route("bb-models/api/profiles/overrides/reset", "api/profiles#resetOverrides", "post");
router.route("bb-models/api/profiles/list", "api/profiles#list", "get");
router.route("bb-models/api/profiles/create", "api/profiles#create", "post");
router.route("bb-models/api/profiles/update", "api/profiles#update", "post");
router.route("bb-models/api/profiles/delete", "api/profiles#delete", "post");

// Profile Field Rules management
router.route("bb-models/api/pfrules/list", "api/profileFieldRules#list", "get");
router.route("bb-models/api/pfrules/create", "api/profileFieldRules#create", "post");
router.route("bb-models/api/pfrules/update", "api/profileFieldRules#update", "post");
router.route("bb-models/api/pfrules/delete", "api/profileFieldRules#delete", "post");
router.route("bb-models/api/pfrules/types", "api/profileFieldRules#types", "get");
router.route("bb-models/api/pfrules/by-profile", "api/profileFieldRules#listByProfile", "get");
router.route("bb-models/api/pfrules/all", "api/profileFieldRules#listAll", "get");

// Models Settings API routes
router.route("bb-models/api/settings/get", "api/settings#get", "get");
router.route("bb-models/api/settings/save", "api/settings#save", "post");

// Hugging Face routes removed
