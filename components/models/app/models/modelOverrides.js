

class ModelOverrides {

    id(db){
        db.integer().primary().auto();
    }

    Model(db){
        db.belongsTo("Model", "model_id");
        db.integer().notNullable();
    }

    ProfileFieldRules(db){
        db.belongsTo("ProfileFieldRules", "profile_field_rule_id");
        db.integer().notNullable();
    }

    StopStrings(db){
        db.hasMany("StopStrings").nullable();
    }

    value(db){
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

}

module.exports = ModelOverrides;