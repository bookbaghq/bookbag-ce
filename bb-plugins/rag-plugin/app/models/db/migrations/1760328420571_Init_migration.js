 
         
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
     
     this.seed('Settings', {
        disable_rag: 0,
        disable_rag_chat: 0,
        disable_rag_workspace: 0,
        created_at: Date.now().toString(),
        updated_at: Date.now().toString()
      });
    }

    down(table){
        this.init(table);

        this.droptable(table.Document);
        this.droptable(table.DocumentChunk);
        this.droptable(table.Settings);
    }
}
module.exports = Init;
        