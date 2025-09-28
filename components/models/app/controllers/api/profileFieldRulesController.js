const master = require('mastercontroller');

class profileFieldRulesController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._modelContext = req.modelContext;
    }

    // List profile-inherited and model-specific rules for a given model
    async list(obj) {
        try {
            const qp = obj?.params?.query || obj?.request?.query || {};
            const modelId = parseInt(qp.modelId || qp.id, 10);
            if (!modelId) return this.returnJson({ success: false, error: 'modelId is required' });

            const model = this._modelContext.Model.where(r => r.id == $$, modelId).single();
            if (!model) return this.returnJson({ success: false, error: 'Model not found' });

            const profileId = model.profile_id || model.Profiles?.id || null;

            let inherited = profileId ? this._modelContext.ProfileFieldRules
                .where(r => r.profile_id == $$, profileId)
                .orderBy(r => r.display_order)
                .toList() : [];
            // Filter out any rules that were created as model-specific but accidentally retained profile_id
            inherited = (inherited || []).filter(r => !r.model_id);

            const custom = this._modelContext.ProfileFieldRules
                .where(r => r.model_id == $$, modelId)
                .orderBy(r => r.display_order)
                .toList();

            const mapRule = (rule, editable) => ({
                id: rule.id,
                name: rule.name,
                label: rule.label,
                field_type: rule.field_type,
                default_value: rule.default_value,
                range: rule.range,
                description: rule.description || '',
                editable
            });

            return this.returnJson({
                success: true,
                inherited: (inherited || []).map(r => mapRule(r, false)),
                custom: (custom || []).map(r => mapRule(r, true))
            });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // Create a new model-specific rule
    async create(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const modelId = parseInt(f.modelId, 10);
            const profileId = parseInt(f.profileId, 10);
            if (!modelId && !profileId) return this.returnJson({ success: false, error: 'modelId or profileId is required' });
            if (modelId && profileId) return this.returnJson({ success: false, error: 'Provide only modelId or profileId' });

            let model = null;
            let profile = null;
            if (modelId) {
                model = this._modelContext.Model.where(r => r.id == $$, modelId).single();
                if (!model) return this.returnJson({ success: false, error: 'Model not found' });
            }
            if (profileId) {
                profile = this._modelContext.Profiles.where(r => r.id == $$, profileId).single();
                if (!profile) return this.returnJson({ success: false, error: 'Profile not found' });
            }

            const name = (f.name || '').toString().trim();
            const label = (f.label || '').toString().trim();
            let field_type = (f.field_type || '').toString().trim();
            const field_type_lc = field_type.toLowerCase();
            if (field_type_lc === 'bool') field_type = 'boolean';
            const default_value = (typeof f.default_value === 'undefined' || f.default_value === null) ? '' : String(f.default_value);
            let range = (f.range || '').toString();
            const description = (f.description || '').toString();

            if (!name || !label || !field_type) {
                return this.returnJson({ success: false, error: 'name, label and field_type are required' });
            }

            if (field_type.toLowerCase() === 'range') {
                const s = String(range || '').trim();
                const m = s.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
                if (!m) {
                    return this.returnJson({ success: false, error: 'range must be in format "min-max"' });
                }
                const min = Number(m[1]);
                const max = Number(m[2]);
                if (!Number.isFinite(min) || !Number.isFinite(max)) {
                    return this.returnJson({ success: false, error: 'range min and max must be numbers' });
                }
                range = `${min}-${max}`;
            }

            const RuleEntity = require('../../models/profileFieldRules');
            const rule = new RuleEntity();
            if (modelId) {
                // Do NOT assign profile_id to model-specific rules to avoid duplication in inherited lists
                rule.Model = modelId;
            }
            if (profileId) { rule.Profile = profileId; }
            rule.name = name;
            rule.label = label;
            rule.field_type = field_type;
            rule.default_value = default_value;
            rule.range = range;
            rule.description = description;
            rule.created_at = Date.now().toString();
            rule.updated_at = Date.now().toString();
            this._modelContext.ProfileFieldRules.add(rule);
            this._modelContext.saveChanges();

            return this.returnJson({ success: true, id: rule.id });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // Update a model-specific rule
    async update(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            const modelId = parseInt(f.modelId, 10);
            const profileId = parseInt(f.profileId, 10);
            if (!id) return this.returnJson({ success: false, error: 'id is required' });
            if (!modelId && !profileId) return this.returnJson({ success: false, error: 'modelId or profileId is required' });
            if (modelId && profileId) return this.returnJson({ success: false, error: 'Provide only modelId or profileId' });

            const rule = this._modelContext.ProfileFieldRules.where(r => r.id == $$, id).single();
            if (!rule) return this.returnJson({ success: false, error: 'Rule not found' });
            if (modelId) {
                if (parseInt(rule.model_id, 10) !== modelId) return this.returnJson({ success: false, error: 'Cannot edit inherited rule' });
            }
            if (profileId) {
                if (parseInt(rule.profile_id, 10) !== profileId) return this.returnJson({ success: false, error: 'Rule does not belong to this profile' });
            }

            const assign = (prop, val) => { if (typeof val !== 'undefined') rule[prop] = String(val); };
            assign('name', f.name);
            assign('label', f.label);
            assign('field_type', f.field_type);
            assign('default_value', f.default_value);
            assign('range', f.range);
            assign('description', f.description);
            rule.updated_at = Date.now().toString();
            this._modelContext.saveChanges();

            return this.returnJson({ success: true });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // Delete a model-specific rule (and any related overrides)
    async delete(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            const modelId = parseInt(f.modelId, 10);
            const profileId = parseInt(f.profileId, 10);
            if (!id) return this.returnJson({ success: false, error: 'id is required' });
            if (!modelId && !profileId) return this.returnJson({ success: false, error: 'modelId or profileId is required' });
            if (modelId && profileId) return this.returnJson({ success: false, error: 'Provide only modelId or profileId' });

            const rule = this._modelContext.ProfileFieldRules.where(r => r.id == $$, id).single();
            if (!rule) return this.returnJson({ success: false, error: 'Rule not found' });
            if (modelId) {
                if (parseInt(rule.model_id, 10) !== modelId) return this.returnJson({ success: false, error: 'Cannot delete inherited rule' });
            }
            if (profileId) {
                if (parseInt(rule.profile_id, 10) !== profileId) return this.returnJson({ success: false, error: 'Rule does not belong to this profile' });
            }

            // Remove any overrides for this rule for this model
            try {
                let overrides = [];
                if (modelId) {
                    overrides = this._modelContext.ModelOverrides
                        .where(o => o.model_id == $$ && o.profile_field_rule_id == $$, modelId, id)
                        .toList();
                } else {
                    overrides = this._modelContext.ModelOverrides
                        .where(o => o.profile_field_rule_id == $$, id)
                        .toList();
                }
                for (const o of overrides) {
                    // cascade: remove StopStrings attached to these overrides
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
            } catch (_) {}

            this._modelContext.ProfileFieldRules.remove(rule);
            this._modelContext.saveChanges();
            return this.returnJson({ success: true });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // List rules for a given profile (editable here)
    async listByProfile(obj) {
        try {
            const qp = obj?.params?.query || obj?.request?.query || {};
            const profileId = parseInt(qp.profileId || qp.id, 10);
            if (!profileId) return this.returnJson({ success: false, error: 'profileId is required' });
            const rules = this._modelContext.ProfileFieldRules
                .where(r => r.profile_id == $$, profileId)
                .orderBy(r => r.display_order)
                .toList();

            const mapped = (rules || []).map(rule => ({
                id: rule.id,
                name: rule.name,
                label: rule.label,
                field_type: rule.field_type,
                default_value: rule.default_value,
                range: rule.range,
                description: rule.description || ''
            }));
            return this.returnJson({ success: true, rules: mapped });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // List all rules across profiles (and model-specific for context)
    async listAll(obj) {
        try {
            const rules = this._modelContext.ProfileFieldRules.orderBy(r => r.created_at).toList();
            const mapped = (rules || []).map(rule => ({
                id: rule.id,
                name: rule.name,
                label: rule.label,
                field_type: rule.field_type,
                default_value: rule.default_value,
                range: rule.range,
                description: rule.description || '',
                profile_id: rule.profile_id || null,
                profile_name: rule.Profile?.name || '',
                model_id: rule.model_id || null
            }));
            return this.returnJson({ success: true, rules: mapped });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    // Field types supported by UI/backend
    async types() {
        try {
            const types = [
                'string', 'text', 'float', 'number', 'boolean', 'json', 'range'
            ];
            return this.returnJson({ success: true, types });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    returnJson(obj) { return obj; }
}

module.exports = profileFieldRulesController;


