
var masterrecord = require('masterrecord');
const path = require('path');
const plugin = require("./plugin");

class pluginContext extends masterrecord.context{
    constructor() {
        super();

        // Use absolute path to plugin's environment folder
        // __dirname is .../bb-plugins/plugin-plugin/app/models
        // We need .../bb-plugins/plugin-plugin/config/environments
        const pluginEnvPath = path.join(__dirname, '../../config/environments');
        this.env(pluginEnvPath);

        this.dbset(plugin);
    }

}

module.exports = pluginContext;
