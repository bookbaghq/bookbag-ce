 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        
     this.createTable(table.MediaFile);
     this.createTable(table.MediaSettings);
    }

    down(table){
        this.init(table);
        
    this.droptable(table.MediaFile);
    this.droptable(table.MediaSettings);
    }
}
module.exports = Init;
        