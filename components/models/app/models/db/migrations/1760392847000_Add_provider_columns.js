var masterrecord = require('masterrecord');

class Add_provider_columns extends masterrecord.schema {
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);

        // Add provider column to identify the API provider
        this.addColumn(table.Model, 'provider', (col) => {
            col.string().nullable().default('openai');
        });

        // Add grounding_mode column to control RAG behavior
        this.addColumn(table.Model, 'grounding_mode', (col) => {
            col.string().nullable().default('strict');
        });
    }

    down(table){
        this.init(table);

        this.dropColumn(table.Model, 'provider');
        this.dropColumn(table.Model, 'grounding_mode');
    }
}

module.exports = Add_provider_columns;
