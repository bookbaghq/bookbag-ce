
var masterrecord = require('masterrecord');
const model = require("./model");
const settings = require("./settings");
const StopStrings = require("./stopStrings");
const profiles = require("./profiles");
const profileFieldRules = require("./profileFieldRules");
const modelOverrides = require("./modelOverrides");
const startThinkingStrings = require("./startThinkingStrings");
const promptTemplates = require("./promptTemplates");

class modelContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(model);
        this.dbset(settings);
        this.dbset(StopStrings);
        this.dbset(profiles);
        this.dbset(profileFieldRules);
        this.dbset(modelOverrides);
        this.dbset(startThinkingStrings);
        this.dbset(promptTemplates);
    }

}

module.exports = modelContext;
