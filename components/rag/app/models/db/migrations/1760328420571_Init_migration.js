 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);

     this.createTable(table.Document);
     this.createTable(table.DocumentChunk);
     this.createTable(table.Settings);
    }

    down(table){
        this.init(table);

    this.droptable(table.Document);
    this.droptable(table.DocumentChunk);
    this.droptable(table.Settings);
    }
}
module.exports = Init;
        