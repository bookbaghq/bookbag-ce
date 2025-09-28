class StartThinkingStrings {

    id(db){
        db.integer().primary().auto();
    }

    start_word(db){
        db.string().nullable();
    }

    end_word(db){
        db.string().notNullable();
    }

    Model(db){
        db.belongsTo("Model", "model_id");
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

module.exports = StartThinkingStrings;