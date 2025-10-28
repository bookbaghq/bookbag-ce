
var masterrecord = require('masterrecord');
const plugin = require("./Plugin");

class pluginContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(plugin);
    }

}

module.exports = pluginContext;
