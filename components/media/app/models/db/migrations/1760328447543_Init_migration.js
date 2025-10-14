 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        
     this.createTable(table.MediaFile);
     this.createTable(table.MediaSettings);

     this.seed('MediaSettings', {
        storage_limit_mb: 1024,
        storage_enabled: 1,
        created_at: Date.now().toString(),
        updated_at: Date.now().toString()
      });

    }

    down(table){
        this.init(table);
        
    this.droptable(table.MediaFile);
    this.droptable(table.MediaSettings);
    }
}
module.exports = Init;
        