
var masterrecord = require('masterrecord');
const plugin = require("./plugin");

class pluginContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(plugin);
    }

}

module.exports = pluginContext;
