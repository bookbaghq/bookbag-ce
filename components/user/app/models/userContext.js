
var masterrecord = require('masterrecord');
const user = require("./user");
const auth = require("./auth");
const settings = require("./settings");

class userContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(user);
        this.dbset(auth);
        this.dbset(settings);

    }

}

module.exports = userContext;
