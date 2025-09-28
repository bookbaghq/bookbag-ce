class Settings {

    id(db){
        db.integer().primary().auto();
    }

    openai_api_key(db){
        db.string().nullable();
    }

    grok_api_key(db){
        db.string().nullable();
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