 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        
        this.createTable(table.User);
        this.createTable(table.Auth);
        this.createTable(table.Settings);

        this.seed('User', {
            user_name: 'admin',
            email: 'admin@bookbag.work',
            role: 1,
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });

        const user = this.context.User.where(u => u.email == $$, "admin@bookbag.work").single();

        if (user && user.id) {
            this.seed('Auth', {
                user_id: user.id,
                password_salt: "$2b$10$mzeICOcznq08FgarX1fXa.",
                password_hash: '$2b$10$mzeICOcznq08FgarX1fXa.FDqddogZdM4txUo8bXA1G3wox/OEMBa',
                login_counter: 1,
                created_at: Date.now().toString(),
                updated_at: Date.now().toString()
            });
         }
    }

    down(table){
        this.init(table);
        
        this.droptable(table.User);
        this.droptable(table.Auth);
        this.droptable(table.Settings);
    }
}
module.exports = Init;
        