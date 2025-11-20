var masterrecord = require('masterrecord');
var Api = require('./Api');
var ApiSession = require('./ApiSession');
var ApiSettings = require('./ApiSettings');

class apiContext extends masterrecord.context {
    constructor() {
        super();

        // Set environment path for this component (relative path from root)
        this.env("components/api/config/environments");

        // Register models
        this.dbset(Api);
        this.dbset(ApiSession);
        this.dbset(ApiSettings);
    }
}

module.exports = apiContext;
