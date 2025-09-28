const master = require('mastercontroller');
const userListVM = require(`${master.root}/components/user/app/vm/userList`)
const bcrypt = require('bcryptjs');

class profileController{

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        // Only guard admin endpoints (listing/searching users or fetching arbitrary profiles)
        this.beforeAction([ "uploadAvatar", "profile", "all", "search"], req.authService.validateIsAdmin);
    }

    // get all profiles
    all(obj){
        try{
               // get 10 posts
            var take = obj.params.query.page * obj.params.query.size;
            var skip = take - obj.params.query.size;

            var users = obj.userContext.User.take(take).skip(skip).orderByDescending(r => r.created_at).toList();

            var reqList = obj._mapper({"userList": { "users": users }}, userListVM );
            return this.returnJson(reqList);
            
        }catch(error){
            return this.returnJson({"currentUser" : {
                isLoggedIn :false 
            }, error: error.message});
        } 
    }

    // get specific user info
    profile(obj){
        try{

            var user = obj.userContext.User.where(r => r.id == $$, obj.params.id).single();
            return this.returnJson({"data": true, "user": {
                "email" : user.email,
                "firstName": user.first_name,
                "lastName": user.last_name,
                "userName": user.user_name,
                "id": user.id,
                "role": user.role
            }});
            
        }catch(error){
            return this.returnJson({"currentUser" : {
                isLoggedIn :false 
            }, error: error.message});
        } 
    }

    // get my personal profile
    myprofile(obj){
        try{

            var user = obj.userContext.User.where(r => r.id == $$, this._currentUser.id).single();
            return this.returnJson({"data": true, "user": {
                "email" : user.email,
                "firstName": user.first_name,
                "lastName": user.last_name,
                "userName": user.user_name,
                "id": user.id,
                "role": user.role
            }});
        }catch(error){
            return this.returnJson({"currentUser" : {
                isLoggedIn :false 
            }, error: error.message});
        } 
    }

    // Save my profile (non-admin can update their own name/email). Role updates require admin.
    save(obj){
        try{
            const body = obj.params?.formData || obj.params || obj.body || {};
            const targetId = parseInt(body.id || this._currentUser.id);
            if (!targetId) return this.returnJson({ success:false, error: 'User id required' });
            const user = obj.userContext.User.where(r => r.id == $$, targetId).single();
            if (!user) return this.returnJson({ success:false, error: 'User not found' });

            // Only allow role change if current user is admin
            const isAdmin = (this._currentUser && String(this._currentUser.role || '').toLowerCase() === 'administrator');

            if (typeof body.firstName !== 'undefined') user.first_name = body.firstName || '';
            if (typeof body.lastName !== 'undefined') user.last_name = body.lastName || '';
            // Email validation (required and format + uniqueness)
            if (typeof body.email !== 'undefined') {
                const email = String(body.email || '').trim();
                if (!email) {
                    return this.returnJson({ success:false, error: 'Email is required' });
                }
                const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
                if (!emailOk) {
                    return this.returnJson({ success:false, error: 'Email must be a valid email address' });
                }
                try {
                    // Check if another user already has this email
                    const existing = obj.userContext.User.where(u => u.email == $$, email).single();
                    if (existing && existing.id !== user.id) {
                        return this.returnJson({ success:false, error: 'Email already taken, please choose another' });
                    }
                } catch (_) { /* no existing user with that email */ }
                user.email = email;
            }
            // Allow user to change own password
            let passwordChanged = false;
            if (typeof body.password !== 'undefined' && body.password) {
                if (!user.Auth || !user.Auth.password_salt) {
                    user.Auth = user.Auth || {};
                    user.Auth.password_salt = bcrypt.genSaltSync(10);
                }
                user.Auth.password_hash = bcrypt.hashSync(String(body.password), user.Auth.password_salt);
                user.Auth.updated_at = Date.now().toString();
                passwordChanged = true;
            }
            if (typeof body.role !== 'undefined') {
                if (isAdmin) user.role = body.role;
            }
            user.updated_at = Date.now().toString();
            obj.userContext.saveChanges();

            // If password changed, send notification email via template
            if (passwordChanged) {
                try {
                    const deliveryService = obj.mailDeliveryService || master.mailDeliveryService;
                    const templateService = obj.mailTemplateService || master.mailTemplateService;
                    if (deliveryService && templateService) {
                        setImmediate(async () => {
                            await deliveryService.send(
                                obj.mailContext,
                                { to: user.email },
                                { name: 'password_changed' },
                                { templateService }
                            );
                        });
                    }
                } catch (_) {}
            }

            return this.returnJson({ success:true });
        }catch(error){
            return this.returnJson({ success:false, error: error?.message || 'Failed to save profile' });
        }
    }

    // fuzzy search users (admin)
    search(obj){
        try{
            const q = (obj.params.query.q || '').toLowerCase().trim();
            const limit = parseInt(obj.params.limit) || 20;

            if (!q || q.length < 2){
                return this.returnJson({ success: true, users: [], total: 0 });
            }

            // Basic fuzzy-ish search (LIKE) on user_name, first/last name, email
            // ORM is in-memory-esque; filter mapping accordingly
            const allUsers = obj.userContext.User
                .orderByDescending(r => r.created_at)
                .toList();

            const matches = [];
            for (const u of allUsers){
                const first = String(u.first_name || '').toLowerCase();
                const last = String(u.last_name || '').toLowerCase();
                const userName = String(u.user_name || '').toLowerCase();
                const email = String(u.email || '').toLowerCase();

                if (
                    userName.includes(q) ||
                    email.includes(q) ||
                    (`${first} ${last}`.trim()).includes(q) ||
                    first.includes(q) ||
                    last.includes(q)
                ){
                    matches.push({
                        id: u.id,
                        userName: u.user_name,
                        email: u.email,
                        firstName: u.first_name,
                        lastName: u.last_name
                    });
                }
                if (matches.length >= limit) break;
            }

            return this.returnJson({ success: true, users: matches, total: matches.length });
        }
        catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }




}

module.exports = profileController;