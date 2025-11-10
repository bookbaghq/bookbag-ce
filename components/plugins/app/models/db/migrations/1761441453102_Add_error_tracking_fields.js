var masterrecord = require('masterrecord');

class AddErrorTrackingFields extends masterrecord.schema {
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);

        // Add WordPress-style error tracking fields to Plugin table
        this.addColumn('Plugin', 'last_error', 'VARCHAR');
        this.addColumn('Plugin', 'error_count', 'INTEGER', { default: 0 });
        this.addColumn('Plugin', 'last_loaded_at', 'VARCHAR');
        this.addColumn('Plugin', 'is_broken', 'INTEGER', { default: 0 });  // SQLite uses INTEGER for boolean

        console.log('✓ Added WordPress-style error tracking fields to Plugin table');
    }

    down(table){
        this.init(table);

        // Remove error tracking fields if rolling back
        this.removeColumn('Plugin', 'last_error');
        this.removeColumn('Plugin', 'error_count');
        this.removeColumn('Plugin', 'last_loaded_at');
        this.removeColumn('Plugin', 'is_broken');

        console.log('✓ Removed error tracking fields from Plugin table');
    }
}

module.exports = AddErrorTrackingFields;
