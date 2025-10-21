const master = require('mastercontroller');
const bcrypt = require('bcryptjs');
const userEntity = require(`${master.root}/components/user/app/models/user`);
const authEntity = require(`${master.root}/components/user/app/models/auth`);

class credentialsController{


    resetPassword(obj){
        try{
            const body = obj.params?.formData || obj.params || obj.body || {};
            const email = String(body.email || '').trim();
            if (!email) return this.returnJson({ success:false, error: 'Email is required' });
            // Find user by email, but don't throw if not found
            let user = null;
            try { 
                user = obj.userContext.User.where(r => r.email == $$, email).single();
            } catch (_) { user = null; }
            
            if (user) {
                const token = obj.authService.generateRandomKey('sha256');
                user.Auth.password_reset_token = token;
                user.Auth.password_reset_sent_at = Date.now().toString();
                obj.userContext.saveChanges();
                // Send reset email (fire-and-forget) using template 'forgot_password'
                try {
                    const deliveryService = obj.mailDeliveryService || master.mailDeliveryService;
                    const templateService = obj.mailTemplateService || master.mailTemplateService;
                    const origin = (obj.request && obj.request.headers && obj.request.headers.origin) ? obj.request.headers.origin : '';
                    const resetLink = origin ? `${origin}/bb-auth/resetPassword?token=${encodeURIComponent(String(token))}` : `/bb-auth/resetPassword?token=${encodeURIComponent(String(token))}`;
                    if (deliveryService && templateService) {
                        setImmediate(async () => {
                            await deliveryService.send(
                                obj.mailContext,
                                { to: user.email },
                                { name: 'forgot_password', resetLink },
                                { templateService }
                            );
                        });
                    }
                } catch (_) {}
            }
            // Always success; do not reveal existence
            return this.returnJson({ success: true });
        }
        catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    changePassword(obj){
        try{
            const body = obj.params?.formData || obj.params || obj.body || {};
            const token = String(body.token || '').trim();
            const newPassword = String(body.password || '');
            if (!token || !newPassword) return this.returnJson({ success:false, error: 'Token and password are required' });

            // Find Auth by token directly
            let auth = null;
            try {
                auth = obj.userContext.Auth.where(a => a.password_reset_token == $$, token).single();
            } catch (_) { auth = null; }
            if (!auth) {
                return this.returnJson({ success:false, error: 'Invalid or expired token' });
            }

            // Enforce token age < 24 hours
            try {
                const sentAtMs = parseInt(auth.password_reset_sent_at || '0', 10);
                const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
                if (!Number.isFinite(sentAtMs) || (Date.now() - sentAtMs) > MAX_AGE_MS) {
                    return this.returnJson({ success:false, error: 'Reset link has expired. Please request a new link.' });
                }
            } catch (_) {
                return this.returnJson({ success:false, error: 'Reset link has expired. Please request a new link.' });
            }

            // Update password on Auth only
            if (!auth.password_salt) auth.password_salt = bcrypt.genSaltSync(10);
            auth.password_hash = bcrypt.hashSync(newPassword, auth.password_salt);
            auth.password_reset_token = "";
            auth.password_reset_sent_at = "";
            auth.updated_at = Date.now().toString();
            obj.userContext.saveChanges();
            return this.returnJson({ success: true });
        }
        catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

   // create new user
    register(req){
        try{
            // Guard: block registration if sign_up_enabled = 0/false
            try {
                const s = req.userContext.Settings.toList()[0];
                const signUpEnabled = typeof s?.sign_up_enabled === 'undefined' ? true : !!s.sign_up_enabled;
                if (!signUpEnabled) {
                    return this.returnJson({
                        error: "Registration is currently disabled",
                        sign_up_enabled: false
                    });
                }
            } catch (_) {}
            var user = new userEntity();
            var dateNow = Date.now().toString();
            user.created_at = dateNow;
            user.updated_at = dateNow;
            user.role = "Subscriber";
            user.user_name = req.authService.generateUserName(req.userContext.User);
            user.Auth = new authEntity();
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

            // Send welcome email (non-blocking) using template 'register'
            try {
                const deliveryService = req.mailDeliveryService || master.mailDeliveryService;
                const templateService = req.mailTemplateService || master.mailTemplateService;
                if (deliveryService && templateService) {
                    setImmediate(async () => {
                        try {
                            await deliveryService.send(
                                req.mailContext,
                                { to: user.email },
                                { name: 'register', firstName: user.first_name || '', lastName: user.last_name || '' },
                                { templateService }
                            );
                        } catch (_) {}
                    });
                }
            } catch (_) {}

            // Dynamic cookie options that work for any domain/IP
            const protocol = req.request?.headers?.['x-forwarded-proto'] ||
                           (req.request?.connection?.encrypted ? 'https' : 'http');
            const isSecure = protocol === 'https';

            const cookieOptions = {
                path: '/',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                secure: isSecure,
                sameSite: isSecure ? 'none' : 'lax'
                // domain not set - allows cookie to work with any domain/IP
            };
            console.log('🍪 DEBUG register - Protocol:', protocol);
            console.log('🍪 DEBUG register - Setting cookie with options:', JSON.stringify(cookieOptions, null, 2));
            master.sessions.setCookie("login", user.Auth.temp_access_token, req.response, cookieOptions);
        }
        catch(error){
            var message = "Error could not register your account";
            if(typeof error === "object"){
                if(error.code === 'SQLITE_CONSTRAINT_UNIQUE'){
                    message = "Email already taken, please log in to your account";
                }
                else{
                    message = error.code;
                }
            }
                return this.returnJson({
                    error: message
                });
        }


        return this.returnJson({
            accessToken: accessToken
        });
        
    }

    // GET: check if registration is enabled; create settings row if missing
    canRegister(obj){
        try{
            let s = obj.userContext.Settings.take(1).toList()[0];
            if (!s) {
                const SettingsEntity = require(`${master.root}/components/user/app/models/settings`);
                s = new SettingsEntity();
                const now = Date.now().toString();
                s.created_at = now;
                s.updated_at = now;
                s.sign_up_enabled = true;
                s.sign_in_enabled = true;
                obj.userContext.Settings.add(s);
                obj.userContext.saveChanges();
            }
            const signUpEnabled = s?.sign_up_enabled === 0 ? false : true;
            return this.returnJson({ success: true, sign_up_enabled: signUpEnabled });
        }catch(error){
            return this.returnJson({ success: false, error: error.message, sign_up_enabled: true });
        }
    }

    login(req){
        console.log("asdsa")
        // get email and password and find in db
        //var kk = req.authService();
        try{
            // Guard: block login if sign_in_enabled = 0/false
            try {
                const s = req.userContext.Settings.take(1).toList()[0];
                const signInEnabled = s?.sign_in_enabled === 0 ? false : true;
                if (!signInEnabled) {
                    return this.returnJson({
                        error: "Sign-in is currently disabled",
                        sign_in_enabled: false
                    });
                }
            } catch (_) {}
            
            // Normalize email to be case-insensitive for authentication
            const email = String(req.params?.formData?.email || '').trim();
            const normalizedEmail = email.toLowerCase();
            var authObj = req.authService.authenticate(normalizedEmail, req.params.formData.password, req.userContext, req);

            if(authObj.isvalid === false){
                // return view with message not user
                return this.returnJson({
                    error: "Password or and Email is incorrect"
                });
            }
            else{

                var validatedUser  = {
                    user: {
                        auth_id : authObj.user.Auth.id,
                        id:  authObj.user.id
                    },
                    auth: {
                        email : authObj.user.email
                    }
                }

                var accessToken = req.authService.accessToken(validatedUser);
                var refreshToken = req.authService.refreshToken(validatedUser);


                authObj.user.Auth.login_counter = authObj.user.Auth.login_counter + 1;
                authObj.user.Auth.temp_access_token = refreshToken;
                req.userContext.saveChanges();

                // Dynamic cookie options that work for any domain/IP
                const protocol = req.request?.headers?.['x-forwarded-proto'] ||
                               (req.request?.connection?.encrypted ? 'https' : 'http');
                const isSecure = protocol === 'https';

                const cookieOptions = {
                    path: '/',
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000,
                    secure: isSecure,
                    sameSite: isSecure ? 'none' : 'lax'
                    // domain not set - allows cookie to work with any domain/IP
                };
                console.log('🍪 DEBUG login - Protocol:', protocol);
                console.log('🍪 DEBUG login - Setting cookie with options:', JSON.stringify(cookieOptions, null, 2));
                console.log('🍪 DEBUG login - Token to set:', refreshToken);
                master.sessions.setCookie("login", refreshToken, req.response, cookieOptions);

                return this.returnJson({
                    accessToken: accessToken
                });
            }
        }
        catch(error){
            return this.returnJson({
                error: error.message
            });
        }
    }

    // GET: check if sign-in is enabled; create settings row if missing
    canSignIn(obj){
        try{
            let s = obj.userContext.Settings.take(1).toList()[0];
            if (!s) {
                const SettingsEntity = require(`${master.root}/components/user/app/models/settings`);
                s = new SettingsEntity();
                const now = Date.now().toString();
                s.created_at = now;
                s.updated_at = now;
                s.sign_up_enabled = true;
                s.sign_in_enabled = true;
                obj.userContext.Settings.add(s);
                obj.userContext.saveChanges();
            }
            const signInEnabled = s?.sign_in_enabled === 0 ? false : true;
            return this.returnJson({ success: true, sign_in_enabled: signInEnabled });
        }catch(error){
            return this.returnJson({ success: false, error: error.message, sign_in_enabled: true });
        }
    }


}

module.exports = credentialsController;