 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        this.createTable(table.Setting);

        // Seed default system settings (singleton record)
        this.seed('Setting', {
            is_rag_active: true,
            is_mail_active: true,
            is_user_active: true,
            is_workspace_active: true,
            is_media_active: true,
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });
    }

    down(table){
        this.init(table);
        
        this.droptable(table.Setting);
    }
}
module.exports = Init;
        