class WorkspaceModel {

    id(db){
        db.integer().primary().auto();
    }

    Workspace(db){
        db.belongsTo("Workspace", "workspace_id");
        db.integer().notNullable();
    }

    model_id(db){
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

module.exports = WorkspaceModel;


