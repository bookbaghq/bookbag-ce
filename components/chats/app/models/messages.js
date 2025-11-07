

class Messages {

    id(db){
        db.integer().primary().auto();
    }
    
    Chat(db){
        db.belongsTo("Chat", "chat_id");
    }

    Thinking(db){ 
        db.hasMany('thinking').nullable(); 
    }

    user_id(db){
        db.string().nullable(); 
    }

    role(db){
            db.integer().notNullable();
        
            db.get(function(value){
                switch(value) {
                    case 1:
                    return "Assistant"
                    break;
                    case 2:
                        return "User" 
                    break;
                    case 3:
                        return "System" 
                    break;
              }
            });

            db.set(function(value){
                var val = String(value || '').toLowerCase();
                switch(val) {
                    case "assistant":
                      return 1
                      break;
                    case "user" :
                        return 2
                      break;
                    case "system" :
                        return 3
                      break;
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

    content(db){
        db.string().notNullable();
    }

    model_id(db){ // connected to the modal table which has the model id that you have access too
        db.integer().notNullable();
    }

    token_count(db){ // -- Total tokens for this message interaction
        db.integer().notNullable();
    }

    meta(db){
        db.string();
    }

    max_tokens(db){
        db.integer().default(800);
    }

    tokens_per_seconds(db){
        db.integer().default(0);
    }

    generation_time_ms(db){
        db.integer().nullable();
    }

    start_time(db){
        db.string().nullable();
    }

    end_time(db){
        db.string().nullable();
    }

    is_edited(db){
       db.boolean().default(false);
    }

    original_content(db){
        db.string();
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

module.exports = Messages;
