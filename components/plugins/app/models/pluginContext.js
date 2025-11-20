
var masterrecord = require('masterrecord');
const path = require('path');
const plugin = require("./plugin");
const pluginMigrationLog = require("./pluginMigrationLog");

class pluginContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(plugin);
        this.dbset(pluginMigrationLog);
    }

}

module.exports = pluginContext;
