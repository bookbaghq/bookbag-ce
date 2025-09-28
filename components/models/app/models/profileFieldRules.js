class ProfileFieldRules {

    id(db){
        db.integer().primary().auto();
    }

    Profile(db){
        db.belongsTo("Profiles", "profile_id");
        db.integer().nullable().unique();
    }

    // this will be used to add new rules for a specific model. 
    Model(db){
        db.belongsTo("Model", "model_id");
        db.integer().nullable();
    }

    name(db){
        db.string().notNullable().unique(); //e.g. "temperature"
    }

    label(db){
        db.string().notNullable(); 
    }

    field_type(db){
        db.string().notNullable(); // e.g. "string", "integer", "boolean"
    }
    
    default_value(db){
        db.string(); // e.g. "0.7"
    }

    range(db){
        db.string().notNullable(); // e.g. this is for values that have raanges limits like integers or floats, e.g. "0.0-1.0" or "1-100"
    }

    description(db){
        db.string(); // e.g. "Temperature controls the randomness of the model's output. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic."
    }

    display_order(db){
        db.integer().default(0); // e.g. "1"
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

module.exports = ProfileFieldRules;