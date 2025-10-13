
var masterrecord = require('masterrecord');
const MediaFile = require("./MediaFile");
const MediaSettings = require("./MediaSettings");

class mediaContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(MediaFile);
        this.dbset(MediaSettings);
    }
}

module.exports = mediaContext;
