const master = require('mastercontroller');

var promptTemplatesVM = {
    "promptTemplates": {
        key: "promptTemplates",
        transform: function(value) {
            const list = Array.isArray(value.templates) ? value.templates : [];
            return list.map(function(t){
                return { id: t.id, name: t.name, template: t.template };
            });
        }
    }
};

module.exports = promptTemplatesVM;
