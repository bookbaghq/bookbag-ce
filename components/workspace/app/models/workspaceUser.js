class WorkspaceUser {

    id(db){
        db.integer().primary().auto();
    }

    Workspace(db){
        db.belongsTo("Workspace", "workspace_id");
        db.integer().notNullable();
    }

    user_id(db){
        db.integer().notNullable();
    }

    role(db){
        // owner | admin | member
        db.string().notNullable().default("member");
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

module.exports = WorkspaceUser;


