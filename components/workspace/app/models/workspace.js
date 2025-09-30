class Workspace {

    id(db){
        db.integer().primary().auto();
    }

    name(db){
        db.string().notNullable();
    }

    description(db){
        db.string();
    }

    Users(db) { 
         db.hasMany('WorkspaceUser', 'user_id'); 
    }

    Chats(db){
        db.hasMany('WorkspaceChat', 'chat_id'); 
    }

    Models(db){
        db.hasMany('WorkspaceModel', 'model_id'); 
    }

    Profile(db){
        // Reuse global Profiles entity (registered in context)
        db.belongsTo("Profiles", "profile_id");
        db.integer().nullable();
    }

    ModelOverrides(db){
        // Use global ModelOverrides with workspace_id
        db.hasMany("ModelOverrides").nullable();
    }

    prompt_template(db){
        db.string().nullable().default(`{{#system}}{"role":"system","content":"{{system}}"},{{/system}}
            {{#history}}
            {"role":"{{role}}","content":"{{content}}"},
            {{/history}}
            {"role":"user","content":"{{user}}"}`);
    }

    system_prompt(db){
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

module.exports = Workspace;


