
const master = require('mastercontroller');


class settingsController{

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        //this.beforeAction([ "uploadAvatar", "profile", "all"], req.authService.validateIsAdmin);

    }


    // GET current settings
    get(obj){
        try{
            let s = obj.userContext.Settings.take(1).toList()[0];
            if(!s){
                s = new (require(`${master.root}/components/user/app/models/settings`))();
                const now = Date.now().toString();
                s.created_at = now; s.updated_at = now;
                s.sign_up_enabled = 1;
                s.sign_in_enabled = 1;
                obj.userContext.Settings.add(s);
                obj.userContext.saveChanges();
            }
            return this.returnJson({ success: true, settings: {
                allow_register: !!s.allow_register,
                sign_up_enabled: typeof s.sign_up_enabled === 'undefined' ? true : !!s.sign_up_enabled,
                sign_in_enabled: typeof s.sign_in_enabled === 'undefined' ? true : !!s.sign_in_enabled,
            }});
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    // POST save settings flags
    save(obj){
        try{
            const body = obj.params.formData || obj.params || {};
            let s = obj.userContext.Settings.take(1).toList()[0];
            if(!s){
                s = new (require(`${master.root}/components/user/app/models/settings`))();
                s.created_at = Date.now().toString();
                obj.userContext.Settings.add(s);
            }
            if(typeof body.sign_up_enabled !== 'undefined') {
                s.sign_up_enabled = !!body.sign_up_enabled;
            }
            if(typeof body.sign_in_enabled !== 'undefined') {
                s.sign_in_enabled = !!body.sign_in_enabled;
            }
            if(typeof body.allow_register !== 'undefined') {
                s.allow_register = !!body.allow_register;
            }
            s.updated_at = Date.now().toString();
            obj.userContext.saveChanges();
            return this.returnJson({ success: true });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }



}

module.exports = settingsController;