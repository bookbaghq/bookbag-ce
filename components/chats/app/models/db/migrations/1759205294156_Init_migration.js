 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        
     this.createTable(table.Chat);
     this.createTable(table.Messages);
     this.createTable(table.Thinking);
     this.createTable(table.UserChat);
    }

    down(table){
        this.init(table);
        
    this.droptable(table.Chat);
    this.droptable(table.Messages);
    this.droptable(table.Thinking);
    this.droptable(table.UserChat);
    }
}
module.exports = Init;
        