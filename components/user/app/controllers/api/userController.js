
const master = require('mastercontroller');
const userEntity = require(`${master.root}/components/user/app/models/user`);
const bcrypt = require('bcryptjs');


class userController{

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this.beforeAction(["delete", "create", "update"], req.authService.validateIsAdmin);
    }

    // delete a user
    delete(obj){
        try{
            var user = obj.userContext.User.where(r => r.id == $$, obj.params.formData.id).single();
            obj.userContext.User.remove(user);
            obj.userContext.saveChanges();
            return this.returnJson({"data": true});
            
        }catch(error){
            return this.returnJson({"currentUser" : {
                isLoggedIn :false 
            }, error: error.message});
        } 
    }

          // create new user
    create(req){
        try{
            var user = new userEntity();
            var dateNow = Date.now().toString();
            user.created_at = dateNow;
            user.updated_at = dateNow;
            user.user_name = req.params.formData.username;
            user.role = req.params.formData.role;
            user.Auth.created_at = dateNow;
            user.Auth.updated_at = dateNow;
            user.first_name = req.params.formData.firstName;
            user.last_name = req.params.formData.lastName;
            user.email = req.params.formData.email;
            user.Auth.password_salt = bcrypt.genSaltSync(10);
            user.Auth.password_hash = bcrypt.hashSync(req.params.formData.password, user.Auth.password_salt); // combine the password given and password salt
            user.Auth.login_counter = 1;
            req.userContext.User.add(user);
            req.userContext.saveChanges();

            var validatedUser  = {
                user: {
                    auth_id : user.Auth.id,
                    id:  user.id
                },
                auth: {
                    email : user.Auth.email
                }
            }

            var accessToken = req.authService.accessToken(validatedUser);
            var refreshToken = req.authService.refreshToken(validatedUser);

            user.Auth.temp_access_token = refreshToken;
            req.userContext.saveChanges();

            master.sessions.setCookie("login", user.Auth.temp_access_token, req.response);
            
            // Send welcome email if requested (template-based, concise)
            try {
                const sendFlag = !!(req.params && req.params.formData && (req.params.formData.sendNotification === true || req.params.formData.sendNotification === 1 || req.params.formData.sendNotification === 'true'));
                if (sendFlag && user.email) {

                    const deliveryService = req.mailDeliveryService || master.mailDeliveryService;
                    if ( deliveryService) {
                        const fd = (req.params && req.params.formData) ? req.params.formData : {};
                        const templateData = fd.data || fd.templateData || {
                            firstName: user.first_name || '',
                            lastName: user.last_name || '',
                            username: user.user_name || ''
                        };
                        setImmediate(async () => {
                            await deliveryService.send(
                                req.mailContext,
                                { to: user.email },
                                { name: 'user_created', firstname: templateData.firstName, lastName: templateData.lastName },
                                { templateService: req.mailTemplateService }
                            );
                        });
                    }
                }
            } catch(errr) {
                console.log("error", errr)
            }
            
            return this.returnJson({
                accessToken: accessToken
            });
        }
        catch(error){
            var message = "Error could not register your account";
            if(typeof error === "object"){
                if(error.code === 'SQLITE_CONSTRAINT_UNIQUE'){
                    message = "Email already taken, please change email and or username";
                }
                else{
                    message = error.code;
                }
            }
             return this.returnJson({
                 error: message
             });
         }
        
    }

    // update a new user info
    update(req){
        try{
            var user = req.userContext.User.where(r => r.id == $$, req.params.formData.id).single();
            if(req.params.formData.password){
                user.Auth.password_hash = bcrypt.hashSync(req.params.formData.password, user.Auth.password_salt);
            }
            var dateNow = Date.now().toString();
            user.updated_at = dateNow;
            user.first_name = req.params.formData.firstName;
            user.last_name = req.params.formData.lastName;
            user.email = req.params.formData.email;
            user.role = req.params.formData.role;
            req.userContext.saveChanges();
            return this.returnJson({"data": true});
        }
       catch(error){
            return this.returnJson({"currentUser" : {
                isLoggedIn :false 
            }, error: error.message});
        } 
    }

    updateRoleUsers(req){
        try{
            const userList = req.params.formData.users;
            for (let i = 0; i < userList.length; i++) {
                var id = userList[i];
                var user = req.userContext.User.where(r => r.id == $$, id).single();
                var dateNow = Date.now().toString();
                user.updated_at = dateNow;
                user.role = req.params.formData.role;
            }
            req.userContext.saveChanges();
            return this.returnJson({"data": true});
        }
        catch(error){
            return this.returnJson({"currentUser" : {
                isLoggedIn :false 
            }, error: error.message});
        } 
    }

}

module.exports = userController;