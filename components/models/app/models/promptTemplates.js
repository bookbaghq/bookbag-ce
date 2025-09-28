class PromptTemplates {

    id(db){
        db.integer().primary().auto();
    }

    name(db){
        db.string().notNullable();
    }

    template(db){
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

module.exports = PromptTemplates;