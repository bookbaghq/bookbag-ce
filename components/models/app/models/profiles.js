class Profiles {

    id(db){
        db.integer().primary().auto();
    }

    name(db){
        db.string().notNullable(); //e.g. "OpenAI or huggingaface - Default"
    }

    Model(db){
        db.hasOne("Model").nullable();
    }
    
    ProfileFieldRules(db){
        db.hasMany("ProfileFieldRules").nullable();
    }

    description(db){
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

module.exports = Profiles;