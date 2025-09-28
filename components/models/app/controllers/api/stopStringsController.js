const master = require('mastercontroller');
const stopStringsEntity = require(`${master.root}/components/models/app/models/stopStrings`);
const modelOverridesEntity = require(`${master.root}/components/models/app/models/modelOverrides`);

class stopStringsController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._modelContext = req.modelContext;
    }

    async add(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const modelId = parseInt(f.modelId, 10);
            const content = (f.content || '').toString().trim();
            
            if (!modelId || !content) {
                return this.returnJson({ success: false, error: 'modelId and content are required' });
            }

            // Ensure a ModelOverrides exists for the `stop_strings` field for this model
            const model = this._modelContext.Model.where(r => r.id == $$, modelId).single();
            if (!model) return this.returnJson({ success: false, error: 'Model not found' });

            const rule = this._modelContext.ProfileFieldRules
                        .where(r => r.profile_id == $$ && r.name == $$, model.profile_id, 'stop_strings')
                        .single();

            if (!rule) return this.returnJson({ success: false, error: 'Profile field rule for stop_strings not found' });


            var modelOverride = this._modelContext.ModelOverrides
            .where(r => r.model_id == $$ && r.profile_field_rule_id == $$, model.id, rule.id).single();


            if (!modelOverride) {
                var modOver = new modelOverridesEntity();
                modOver.Model = model.id;
                modOver.ProfileFieldRules = rule.id; // will set below
                modOver.value = 'stop_strings';
                modOver.created_at = Date.now().toString();
                modOver.updated_at = Date.now().toString();
                this._modelContext.ModelOverrides.add(modOver);
                this._modelContext.saveChanges();
                modelOverride = modOver;
            }

            // Create the StopString attached to ModelOverrides
            const s = new stopStringsEntity();
            s.content = content;
            s.ModelOverrides = modelOverride.id;
            s.created_at = Date.now().toString();
            s.updated_at = Date.now().toString();
            this._modelContext.StopStrings.add(s);
            this._modelContext.saveChanges();

            return this.returnJson({ success: true, stopString: { id: s.id, content: s.content, modelOverridesId: modelOverride.id, modelId: modelId } });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    async delete(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            if (!id) return this.returnJson({ success: false, error: 'id is required' });

            const s = this._modelContext.StopStrings.where(r => r.id == $$, id).single();
            if (!s) return this.returnJson({ success: false, error: 'Stop string not found' });

            this._modelContext.StopStrings.remove(s);
            this._modelContext.saveChanges();

            return this.returnJson({ success: true, id });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    returnJson(obj) { return obj; }
}

module.exports = stopStringsController;


