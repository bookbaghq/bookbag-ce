const master = require('mastercontroller');

class profilesController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._modelContext = req.modelContext;
    }

    // Resolve profile fields for a model: rules + overrides
    async fields(obj) {
        try {
            const qp = obj?.params?.query || obj?.request?.query || {};
            const modelId = parseInt(qp.modelId || qp.id, 10);
            if (!modelId) return this.returnJson({ success: false, error: 'modelId is required' });

            const model = this._modelContext.Model.where(r => r.id == $$, modelId).single();
            if (!model) return this.returnJson({ success: false, error: 'Model not found' });

            const profileId = model.profile_id || model.Profiles?.id;
            if (!profileId) return this.returnJson({ success: true, fields: [] });

            let profileRules = this._modelContext.ProfileFieldRules
                .where(r => r.profile_id == $$, profileId)
                .orderBy(r => r.display_order)
                .toList();
            // Exclude any rows that also have a model_id (should not happen, but safe-guard)
            profileRules = (profileRules || []).filter(r => !r.model_id);

            let modelSpecificRules = this._modelContext.ProfileFieldRules
                .where(r => r.model_id == $$, modelId)
                .orderBy(r => r.display_order)
                .toList();

            // Deduplicate by name: model-specific should override inherited if same name
            const seenNames = new Set((modelSpecificRules || []).map(r => String(r.name).toLowerCase()));
            const merged = [
                ...(modelSpecificRules || []),
                ...(profileRules || []).filter(r => !seenNames.has(String(r.name).toLowerCase()))
            ];
            const rules = merged;

            const overrides = this._modelContext.ModelOverrides
                .where(o => o.model_id == $$, modelId)
                .toList();

            const fields = rules.map(rule => {
                const ov = overrides.find(o => o.profile_field_rule_id == rule.id);
                const defVal = rule.default_value;
                const effVal = (ov && typeof ov.value !== 'undefined' && ov.value !== null) ? ov.value : defVal;
                return {
                    fieldRuleId: rule.id,
                    name: rule.name,
                    label: rule.label,
                    fieldType: rule.field_type,
                    range: rule.range,
                    defaultValue: defVal,
                    overrideValue: ov ? ov.value : null,
                    effectiveValue: effVal,
                    description: rule.description || '',
                    displayOrder: rule.display_order || 0
                }
            });

            return this.returnJson({ success: true, fields });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // List, create, update, delete Profiles
    async list(obj) {
        try {
            const list = this._modelContext.Profiles.orderBy(p => p.created_at).toList();
            return this.returnJson({ success: true, profiles: list.map(p => ({ id: p.id, name: p.name, description: p.description || '' })) });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    async create(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const name = (f.name || '').toString().trim();
            const description = (f.description || '').toString();
            if (!name) return this.returnJson({ success: false, error: 'name is required' });
            const Entity = require('../../models/profiles');
            const p = new Entity();
            p.name = name;
            p.description = description;
            // model_type removed
            p.created_at = Date.now().toString();
            p.updated_at = Date.now().toString();
                     this._modelContext.saveChanges();
            this._modelContext.Profiles.add(p);
            this._modelContext.saveChanges();
            return this.returnJson({ success: true, id: p.id });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    async update(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            if (!id) return this.returnJson({ success: false, error: 'id is required' });
            const p = this._modelContext.Profiles.where(r => r.id == $$, id).single();
            if (!p) return this.returnJson({ success: false, error: 'Profile not found' });
            if (typeof f.name !== 'undefined') p.name = String(f.name);
            if (typeof f.description !== 'undefined') p.description = String(f.description);
            // model_type removed
            p.updated_at = Date.now().toString();
            this._modelContext.saveChanges();
            return this.returnJson({ success: true });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    async delete(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            if (!id) return this.returnJson({ success: false, error: 'id is required' });
            const p = this._modelContext.Profiles.where(r => r.id == $$, id).single();
            if (!p) return this.returnJson({ success: false, error: 'Profile not found' });
            // Prevent deletion if any model references this profile
            const anyModel = this._modelContext.Model.where(m => m.profile_id == $$, id).single();
            if (anyModel) return this.returnJson({ success: false, error: 'Cannot delete profile in use by a model' });
            this._modelContext.Profiles.remove(p);
            this._modelContext.saveChanges();
            return this.returnJson({ success: true });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // Save overrides for a model (array of {fieldRuleId, value})
    async saveOverrides(obj) {
        try {
            const form = obj?.params?.formData || obj?.params || {};
            const modelId = parseInt(form.modelId, 10);
            const items = Array.isArray(form.overrides) ? form.overrides : [];
            if (!modelId) return this.returnJson({ success: false, error: 'modelId is required' });

            const model = this._modelContext.Model.where(r => r.id == $$, modelId).single();
            if (!model) return this.returnJson({ success: false, error: 'Model not found' });

            for (const it of items) {
                const frId = parseInt(it.fieldRuleId, 10);
                if (!frId) continue;
                const rule = this._modelContext.ProfileFieldRules.where(r => r.id == $$, frId).single();
                // Determine if value is cleared (null/empty) or set
                const rawValue = it.value;
                // if the values are different from default that means values have changed
                if(rule.default_value !== rawValue){

                    const existing = this._modelContext.ModelOverrides
                    .where(o => o.model_id == $$ && o.profile_field_rule_id == $$, modelId, frId)
                    .single();

                    if (existing) {
                        existing.value = String(rawValue);
                        existing.updated_at = Date.now().toString();
                    } else {
                        const e = new (require('../../models/modelOverrides'))();
                        e.Model = modelId;
                        e.ProfileFieldRules = frId;
                        e.value = String(rawValue);
                        e.created_at = Date.now().toString();
                        e.updated_at = Date.now().toString();
                        this._modelContext.ModelOverrides.add(e);
                    }
                }
            }
            this._modelContext.saveChanges();
            return this.returnJson({ success: true });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // Reset overrides (all for a model or subset of fieldRuleIds)
    async resetOverrides(obj) {
        try {
            const form = obj?.params?.formData || obj?.params || {};
            const modelId = parseInt(form.modelId, 10);
            if (!modelId) return this.returnJson({ success: false, error: 'modelId is required' });
            const ids = Array.isArray(form.fieldRuleIds) ? form.fieldRuleIds.map(x => parseInt(x, 10)).filter(Boolean) : null;

            let list = this._modelContext.ModelOverrides.where(o => o.model_id == $$, modelId).toList();
            if (Array.isArray(ids) && ids.length > 0) {
                list = list.filter(o => ids.includes(o.profile_field_rule_id));
            }
            for (const o of list) {
                // Remove StopStrings linked to this override (if any)
                try {
                    const attachedStopStrings = (o.StopStrings && Array.isArray(o.StopStrings))
                        ? o.StopStrings
                        : this._modelContext.StopStrings.where(s => s.model_overrides_id == $$, o.id).toList();
                    for (const s of attachedStopStrings) {
                        this._modelContext.StopStrings.remove(s);
                    }
                } catch (_) {}
                this._modelContext.ModelOverrides.remove(o);
            }
            this._modelContext.saveChanges();
            return this.returnJson({ success: true });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    returnJson(obj) { return obj; }
}

module.exports = profilesController;


