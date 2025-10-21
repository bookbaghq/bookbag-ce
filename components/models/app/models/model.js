

class Model {

    id(db){
        db.integer().primary().auto();
    }

    name(db){
        db.string().notNullable();
    }

    Profile(db){
        db.belongsTo("Profiles", "profile_id");
        db.integer().notNullable();
    }

    ModelOverrides(db){
        db.hasMany("ModelOverrides").nullable();
    }

    server_url(db){
         db.string().nullable();
    }

    StartThinkingStrings(db){
        db.hasMany("StartThinkingStrings").nullable();
    }

    description(db){
        db.string();
    }

    api_key(db){
        db.string().nullable();
    }
    
    auto_trim_on(db){
        db.boolean().default(false);
        db.get(function(value){
            if(value === 1){
                return true
            }
            return false;
        });
         db.set(function(value){
            if(value === false){
                return 0
            }
            if(value === true){
                return 1
            }
            return 0;
        }); 
    }

    context_size(db){
        db.integer().notNullable().default(2048);
    }

    prompt_template(db){
        db.string().nullable();
    }

    system_prompt(db){
        db.string().nullable();
    }

    provider(db){
        db.string().nullable().default('openai');
    }

    grounding_mode(db){
        db.string().nullable().default('strict');
    }

    is_published(db){
        db.boolean().default(false);
        db.get(function(value){
            if(value === 1){
                return true
            }
            return false;
        });

        db.set(function(value){
            if(value === false){
                return 0
            }
            if(value === true){
                return 1
            }
            return 0;
        });
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

module.exports = Model;