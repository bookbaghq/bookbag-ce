

class Chat {

    id(db){
        db.integer().primary().auto();
    }

    session_id(db){
        db.string().unique();
    }

    Messages(db){
        db.hasMany("messages");
    }

    Users(db) { 
         db.hasMany('UserChat', 'chat_id'); 
    }

    is_admin_created(db){
        db.boolean().default(false);
    }

    total_token_count(db){
        // the total token amount of the whole session
        // if the session count gets to big create a new session or trucate the messages
       db.integer().notNullable().default(0)
    }

    title(db){
        db.string().notNullable();
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

    is_archived(db){
        db.boolean().default(false);
    }

    archived_at(db){
        db.string();
        db.get(function(value){
            if(!value){
                return Date.now();
            }else{
                return value;
            }
        });
    }

    is_deleted(db){
       db.boolean().default(false);
    }

    deleted_at(db){
        db.string();
        db.get(function(value){
            if(!value){
                return Date.now();
            }else{
                return value;
            }
        });
    }

}

module.exports = Chat;