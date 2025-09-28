class Auth {

    id(db){
        db.integer().primary().auto();
    }

    User(db){
        db.belongsTo("User", "user_id");
        db.integer().nullable();
    }

    login_counter(db){
        db.integer().notNullable().default(1);
    }

    auth_token(db){
        db.string();
    }

    temp_access_token(db){
        db.string();
    }

    password_reset_token(db){
        db.string();
    }

    password_salt(db){
        db.string().notNullable();
    }
    
    password_hash(db){
        db.string().notNullable();
    }

    password_reset_sent_at(db){
        db.time();
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

module.exports = Auth;