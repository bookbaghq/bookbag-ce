

class User {

    id(db){
        db.integer().primary().auto();
    }

    Auth(db){
        db.hasOne("auth").nullable();
    }

    first_name(db){
        db.string();
    }

    last_name(db){
        db.string();
    }

    user_name(db){
        db.string().notNullable().unique();
    }

    email(db){
        db.string().notNullable().unique();
    }

    role(db){
            db.integer().notNullable();
        
            db.get(function(value){
                switch(value) {
                    case 1:
                    return "Administrator" // somebody who has access to all the administration features within a single site
                    break;
                    case 2:
                        return "Subscriber" // somebody who has access to their own profile and chat
                    break;
              }
            });

            db.set(function(value){
                var val = value.toLowerCase();
                switch(val) {
                    case "administrator":
                      return 1
                      break;
                    case "subscriber":
                        return 2
                      break;
                  }
            });
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

module.exports = User;