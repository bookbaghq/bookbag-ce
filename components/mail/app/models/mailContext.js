
var masterrecord = require('masterrecord');
const MailSettings = require("./mailSettings");
const MailSmtpConnection = require("./mailSmtpConnection");
const MailLog = require("./mailLog");

class mailContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(MailSettings);
        this.dbset(MailSmtpConnection);
        this.dbset(MailLog);
    }
}

module.exports = mailContext;
