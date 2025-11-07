

class Chat {

    id(db){
        db.integer().primary().auto();
    }

    session_id(db){
        db.string().unique().notNullable();
    }

    Messages(db){
        db.hasMany("messages");
    }

    Users(db) { 
         db.hasMany('UserChat', 'chat_id'); 
    }

    // disbale 
    disable_chat_creation(db){
        db.boolean().default(false);
    }

    created_by(db){
        db.string().notNullable().default(3);
        db.get(function(value){
            switch(value) {
                case 1:
                    return 'API';
                break;
                case 2:
                    return 'Admin';
                break;
                case 3:
                    return 'User';
                break;
                case 4:
                    return 'Workspace';
                break;
                default:
                    return 'Unknown';
                break;
            }

        });
        db.set(function(value){
          
            switch(value) {
                case 'API':
                    return 1;
                break;
                case 'Admin':
                    return 2;
                break;
                case 'User':
                    return 3;
                break;
                case 'Workspace':
                    return 4;
                break;
                default:
                    return 'Unknown';
                break;
            }
        });
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