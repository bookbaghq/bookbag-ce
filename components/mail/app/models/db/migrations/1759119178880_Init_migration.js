 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        
     this.createTable(table.MailSettings);
     this.createTable(table.MailSmtpConnection);
     this.createTable(table.MailLog);
    }

    down(table){
        this.init(table);
        
    this.droptable(table.MailSettings);
    this.droptable(table.MailSmtpConnection);
    this.droptable(table.MailLog);
    }
}
module.exports = Init;
        