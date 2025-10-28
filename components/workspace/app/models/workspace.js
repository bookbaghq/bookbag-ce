class Workspace {

    id(db){
        db.integer().primary().auto();
    }

    name(db){
        db.string().notNullable();
    }

    description(db){
        db.string();
    }

    Users(db) { 
         db.hasMany('WorkspaceUser', 'user_id'); 
    }

    Chats(db){
        db.hasMany('WorkspaceChat', 'chat_id'); 
    }

    Models(db){
        db.hasMany('WorkspaceModel', 'model_id'); 
    }

    created_at(db){
        db.string().notNullable();
        db.get(function(value){
            if(!value){
                return Date.now();
            }else{
                return value;
            }
        });
    }

    updated_at(db){
        db.string().notNullable();
        db.get(function(value){
            if(!value){
                return Date.now();
            }else{
                return value;
            }
        });
    }

}

module.exports = Workspace;


