    const master = require('mastercontroller');

    class authController{

  
        logout(obj){
            // Secure cookie deletion matching login settings
            const cookieOptions = {
                path: '/',
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 0
            };
            master.sessions.deleteCookie("login", obj.response, cookieOptions);
            return this.returnJson({ message: "logged out" });
        }

        currentUser(obj){
            // DEBUG: Log cookies
            const cookieHeader = obj.request?.headers?.cookie;
            console.log('🍪 DEBUG currentUser - Cookie header:', cookieHeader);

            // Prefer unified authService.currentUser to support temp-user mode
            try{
                const cu = obj.authService.currentUser(obj.request, obj.userContext);
                if(cu && cu.isTemp === true){
                    return this.returnJson({
                        isAuthenticated: true,
                        isSubscriber: !!cu.isSubscriber,
                        isAdmin: false,
                        id: cu.id,
                        role: "Subscriber",
                        isTemp: true
                    });
                }
            }catch(_){/* fallthrough to session-based flow */}

            // Fallback: check session cookie called login
            var ses = master.sessions.getCookie("login", obj.request);
            console.log('🍪 DEBUG currentUser - Login cookie value:', ses);

            if(ses === -1){
                console.log('❌ DEBUG currentUser - No login cookie found');
                return this.returnJson({
                    error: "Session not found",
                    isAuthenticated : false,
                    isSubscriber: false,
                    isAdmin: false,
                    id: "",
                    role: "",
                    isTemp: false
                });
            }
            else{
                var found = obj.authService.findByTempID(ses, obj.userContext);
                var res = {
                    isAuthenticated : false,
                    isSubscriber: false,
                    isAdmin: false,
                    id: "",
                    role: "",
                    isTemp: false
                }
                if(found){
                    res.role = found.user.role;
                    res.id = found.user.id;
                    res.isAuthenticated = true;
                    if(found.user.role === "Administrator"){
                        res.isAdmin = true;
                    }
                    if(found.user.role === "Administrator"){
                        res.isSubscriber = true;
                    }
                }
                return this.returnJson(res);
            }
        }
    
        findUserByID( userContext, auth, req){
            try{
                var user =  userContext.User.raw(`select * from User where auth_id = '${auth.id}'`).single();
                if(user === null){
                    return false;
                }else{
                    // var currentUserVM = {
                    //     propertyFilter: { include: ['auth_id', 'id'] }
                    //   }
                    //var userMapped =  req._mapper.mapObject(user, currentUserVM);
    
                    return {
                        user: {
                            auth_id : user.auth_id,
                            id:  user.id
                        },
                        auth: {
                            email : auth.email
                        }
                    }
                }
            }
            catch(error){
                console.log("Error")
            }
            
        }
    
        findAuthByEmail(email, context){
    
            var auth = context.Auth.raw(`select * from Auth where email = '${ email }'`).single();
            if(auth === null){
                return false;
            }else{
                return auth;
            }
            
        };
    
        findAuthByAuthResetToken(token, context){
    
            var auth = context.Auth.raw(`select * from Auth where password_reset_token = '${ token }'`).single();
            if(auth === null){
                return false;
            }else{
                return auth;
            }
            
        };
    
        findUserByAuthId(id, context){
    
            var user = context.User.raw(`select * from User where auth_id = '${ id }'`).single();
            if(user === null){
                return false;
            }else{
                return user;
            }
            
        };
        
}

module.exports = authController;