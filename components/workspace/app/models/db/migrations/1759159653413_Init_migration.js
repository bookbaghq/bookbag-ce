 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        
     this.createTable(table.Workspace);
     this.createTable(table.WorkspaceUser);
     this.createTable(table.WorkspaceModel);
     this.createTable(table.WorkspaceChat);
    }

    down(table){
        this.init(table);
        
    this.droptable(table.Workspace);
    this.droptable(table.WorkspaceUser);
    this.droptable(table.WorkspaceModel);
    this.droptable(table.WorkspaceChat);
    }
}
module.exports = Init;
        