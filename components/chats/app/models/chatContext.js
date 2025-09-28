
var masterrecord = require('masterrecord');
const chat = require("./chat");
const messages = require("./messages");
const thinking = require("./thinking");
const userChat = require("./userchat");

class chatContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        this.dbset(chat);
        this.dbset(messages);
        this.dbset(thinking);
        this.dbset(userChat);

    }

}

module.exports = chatContext;
