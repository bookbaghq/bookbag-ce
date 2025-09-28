

class UserChat {

    id(db){
        db.integer().primary().auto();
    }

    user_id(db){
        db.string().notNullable();  
    }

    Chat(db){
         db.belongsTo("Chat", "chat_id");  // will have foreign key
    }

    is_favorite(db){
        db.boolean().default(false);
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

module.exports = UserChat;