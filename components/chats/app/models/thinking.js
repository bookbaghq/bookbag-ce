

// this gest created by the thinking process of the LLm if a stop word is reached that is equal to thinking.
// TODO: create stop words that trigger thinking capabilities.
class Thinking {

    id(db){
        db.integer().primary().auto();
    }
    
    Messages(db){
        db.belongsTo("Messages", "messages_id");
        db.integer().nullable();
    }

    section_id(db){
        db.integer().notNullable();
    }

    thinking_tokens_used(db){
        db.integer().notNullable();
    }

    content(db){
        db.string().notNullable();;
    }

    start_time(db){
        db.integer().notNullable();
    }

    end_time(db){
        db.integer().notNullable();
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

module.exports = Thinking;