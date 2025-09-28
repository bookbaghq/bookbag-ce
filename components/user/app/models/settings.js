class Settings {

    id(db){
        db.integer().primary().auto();
    }

    sign_up_enabled(db){
        db.boolean().default(true);
    }
    
    sign_in_enabled(db){
        db.boolean().default(true);
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

module.exports = Settings;