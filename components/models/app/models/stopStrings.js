class StopStrings {

    id(db){
        db.integer().primary().auto();
    }

    content(db){
        db.string().notNullable();
    }

    ModelOverrides(db){
        db.belongsTo("ModelOverrides", "model_overrides_id");
        db.integer().nullable();
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

module.exports = StopStrings;