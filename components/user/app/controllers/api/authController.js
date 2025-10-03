    const master = require('mastercontroller');

    class authController{

  
        logout(obj){
            // Align cookie attributes with how they were set during login
            try{
                const origin = (obj.request && obj.request.headers && obj.request.headers.origin) ? String(obj.request.headers.origin) : '';
                const isHttps = origin.startsWith('https://');
                const cookieOptions = {
                    path: '/',
                    httpOnly: true,
                    // Use same attributes as setCookie so browsers will delete it
                    secure: !!isHttps,
                    sameSite: isHttps ? 'None' : 'Lax'
                };
                // Explicitly set maxAge to 0 and also set an expired date for broad compatibility
                master.sessions.deleteCookie("login", obj.response, { ...cookieOptions, maxAge: 0, expires: new Date(0).toUTCString() });
            }catch(_){
                // Fallback delete
                master.sessions.deleteCookie("login", obj.response, { path: '/' });
            }
            return this.returnJson({ message: "logged out" });
        }

        currentUser(obj){
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

            if(ses === -1){
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