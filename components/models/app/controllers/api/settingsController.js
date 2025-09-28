const master = require('mastercontroller');
const settingEntity = require('../../models/settings');

class settingsController{

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._modelContext = req.modelContext;
    }

    async get(obj){
        try{
            // Return first settings row if exists
            var settings = this._modelContext.Settings.single();
            if(!settings){
                return this.returnJson({ success: true, settings: null });
            }
            return this.returnJson({
                success: true,
                settings: {
                    id: settings.id,
                    openai_api_key: settings.openai_api_key,
                    grok_api_key: settings.grok_api_key
                }
            });
        }catch(error){
            return this.returnJson({ success:false, error: error.message});
        }
    }

    async save(obj){
        try{
            const form = obj.params.formData || {};
            const dateNow = Date.now().toString();

            var settings = this._modelContext.Settings.where(r => r.id === $$, 1).single();
            if(!settings){
                var entity = new settingEntity();
                entity.created_at = dateNow;
                entity.updated_at = dateNow;
                if(typeof form.openai_api_key === 'string'){
                    entity.openai_api_key = form.openai_api_key;
                }
                if(typeof form.grok_api_key === 'string'){
                    entity.grok_api_key = form.grok_api_key;
                }
                this._modelContext.Settings.add(entity);
                this._modelContext.saveChanges();
            }else{
                if(typeof form.openai_api_key === 'string'){
                    settings.openai_api_key = form.openai_api_key;
                }
                if(typeof form.grok_api_key === 'string'){
                    settings.grok_api_key = form.grok_api_key;
                }

                settings.updated_at = dateNow;
                this._modelContext.saveChanges();
            }

            return this.returnJson({ success: true });
        }catch(error){
            return this.returnJson({ success:false, error: error.message});
        }
    }

    returnJson(obj) {
        return obj;
    }
}

module.exports = settingsController;

