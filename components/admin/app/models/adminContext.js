
var masterrecord = require('masterrecord');
const settings = require('./setting');


class adminContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(settings);
    }

}

module.exports = adminContext;
